// Thin client for the Distribuidora PHP API ("la puerta"). The MCP server NEVER talks to MySQL.
// Endpoints used (all JSON):
//   GET  /v1/pedidos.php                -> { status, pedidos: Pedido[] }
//   POST /v1/pedidos.php {numero}       -> marks an order processed
//   GET  /v1/cuentas.php                -> { status, cuentas: Cuenta[] }
//   POST /v1/mensajes.php {usuario, contrasena, fecha_esperada, cerrado_por, lineas[]} -> { status, numero }
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addDays, isoDate, isoDateTime } from './dates.js';

export type Linea = { nombre: string; unidad: string; cantidad: number; copias: number };
export type Pedido = {
  numero: number;
  cliente: string;
  direccion: string;
  fecha_esperada: string;
  cerrado_por: string;
  recibido_en: string;
  procesado: boolean;
  procesado_en: string | null;
  lineas: Linea[];
};
export type Cuenta = {
  id: number;
  nombre: string;
  direccion: string;
  direccion_extra: string;
  usuario: string;
  contrasena: string;
  url?: string;
};
export type Mensaje = {
  usuario: string;
  contrasena: string;
  fecha_esperada: string;
  cerrado_por: string;
  lineas: { nombre: string; unidad: string; cantidad: number }[];
};

export interface DistribuidoraApi {
  readonly mode: 'http' | 'mock';
  listOrders(): Promise<Pedido[]>;
  listAccounts(): Promise<Cuenta[]>;
  sendOrderMessage(msg: Mensaje): Promise<number>;
  markProcessed(numero: number): Promise<void>;
}

/** Same rule as api/lib/labels.php: one label per unit, rounded up. */
export function copiasLabel(cantidad: number): number {
  return cantidad <= 0 ? 0 : Math.ceil(cantidad - 1e-9);
}

export class HttpApi implements DistribuidoraApi {
  readonly mode = 'http' as const;
  constructor(private readonly baseUrl: string) {}

  private async call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: init?.method ?? 'GET',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (e) {
      throw new Error(`Could not reach the Distribuidora API at ${url} (${(e as Error).message}).`);
    }
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Distribuidora API returned non-JSON (HTTP ${res.status}) from ${url}.`);
    }
    if (!res.ok || data?.status === 'error') {
      throw new Error(`Distribuidora API error (HTTP ${res.status}): ${data?.message ?? 'unknown error'}`);
    }
    return data as T;
  }

  async listOrders() {
    const data = await this.call<{ pedidos: Pedido[] }>('/v1/pedidos.php');
    return data.pedidos.map((p) => ({ ...p, numero: Number(p.numero), lineas: p.lineas.map((l) => ({ ...l, cantidad: Number(l.cantidad) })) }));
  }
  async listAccounts() {
    return (await this.call<{ cuentas: Cuenta[] }>('/v1/cuentas.php')).cuentas;
  }
  async sendOrderMessage(msg: Mensaje) {
    return Number((await this.call<{ numero: number }>('/v1/mensajes.php', { method: 'POST', body: msg })).numero);
  }
  async markProcessed(numero: number) {
    await this.call('/v1/pedidos.php', { method: 'POST', body: { numero } });
  }
}

type FixturePedido = {
  cliente: string;
  fecha_offset: number;
  recibido_dia: number;
  recibido_hora: string;
  minutos_atras?: number;
  cerrado_por: string;
  procesado: boolean;
  procesado_hora: string;
  lineas: { nombre: string; unidad: string; cantidad: number }[];
};

/** In-memory stand-in for the PHP API, built from fixtures/seed-data.json (same data as database/seed.sql). */
export class MockApi implements DistribuidoraApi {
  readonly mode = 'mock' as const;
  private cuentas: Cuenta[];
  private pedidos: Pedido[];

  constructor(fixturePath = fileURLToPath(new URL('../fixtures/seed-data.json', import.meta.url))) {
    const raw = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      clientes: Omit<Cuenta, 'id'>[];
      pedidos: FixturePedido[];
    };
    this.cuentas = raw.clientes.map((c, i) => ({ ...c, id: i + 1 }));
    const today = isoDate();
    const now = Date.now();
    this.pedidos = raw.pedidos.map((p, i) => {
      const c = this.cuentas.find((x) => x.usuario === p.cliente)!;
      const recibido = p.recibido_dia === 0
        ? isoDateTime(new Date(now - (p.minutos_atras ?? 1) * 60_000))
        : `${addDays(today, p.recibido_dia)} ${p.recibido_hora}`;
      return {
        numero: i + 1,
        cliente: c.nombre,
        direccion: c.direccion,
        fecha_esperada: addDays(today, p.fecha_offset),
        cerrado_por: p.cerrado_por,
        recibido_en: recibido,
        procesado: p.procesado,
        procesado_en: p.procesado
          ? (p.recibido_dia === 0 ? isoDateTime(new Date(now - 3 * 60_000)) : `${addDays(today, p.fecha_offset)} ${p.procesado_hora}`)
          : null,
        lineas: p.lineas.map((l) => ({ ...l, copias: copiasLabel(l.cantidad) })),
      };
    });
  }

  async listOrders() {
    return structuredClone(this.pedidos).sort((a, b) => b.numero - a.numero);
  }
  async listAccounts() {
    return structuredClone(this.cuentas).sort((a, b) => b.id - a.id);
  }
  async sendOrderMessage(msg: Mensaje) {
    const c = this.cuentas.find((x) => x.usuario === msg.usuario);
    if (!c || c.contrasena !== msg.contrasena) throw new Error('Distribuidora API error (HTTP 401): Usuario o contraseña incorrectos');
    const numero = Math.max(0, ...this.pedidos.map((p) => p.numero)) + 1;
    this.pedidos.push({
      numero, cliente: c.nombre, direccion: c.direccion, fecha_esperada: msg.fecha_esperada,
      cerrado_por: msg.cerrado_por, recibido_en: isoDateTime(), procesado: false, procesado_en: null,
      lineas: msg.lineas.map((l) => ({ ...l, unidad: l.unidad || 'unidad', copias: copiasLabel(l.cantidad) })),
    });
    return numero;
  }
  async markProcessed(numero: number) {
    const p = this.pedidos.find((x) => x.numero === numero);
    if (!p) throw new Error('Distribuidora API error (HTTP 404): Pedido no encontrado');
    p.procesado = true;
    p.procesado_en ??= isoDateTime();
  }
}

export function apiFromEnv(): DistribuidoraApi {
  if (process.env.MOCK === '1' || process.env.MOCK === 'true') return new MockApi();
  return new HttpApi(process.env.DISTRIBUIDORA_API_URL || 'http://127.0.0.1:8084');
}
