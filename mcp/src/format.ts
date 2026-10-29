// Human-readable, pre-aggregated text for tool results (what Gemini reads and relays).
import type { Cuenta, Pedido } from './api.js';
import { prettyDate, prettyDateTime } from './dates.js';

export function qty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

export function status(p: Pedido): string {
  return p.procesado ? `PROCESSED ${prettyDateTime(p.procesado_en)}`.trim() : 'NEW (not processed yet)';
}

export function lineText(l: Pedido['lineas'][number]): string {
  return `${qty(l.cantidad)} ${l.unidad} ${l.nombre} (${l.copias} label${l.copias === 1 ? '' : 's'})`;
}

export function labels(p: Pedido): number {
  return p.lineas.reduce((s, l) => s + l.copias, 0);
}

/** Compact one-order block for lists. */
export function orderSummary(p: Pedido): string {
  return [
    `Order #${p.numero} · ${p.cliente} · expected ${prettyDate(p.fecha_esperada)} · ${status(p)}`,
    `  Received ${prettyDateTime(p.recibido_en)}${p.cerrado_por ? ` (closed by ${p.cerrado_por})` : ''} · ${p.lineas.length} items, ${labels(p)} labels`,
    `  Items: ${p.lineas.map((l) => `${qty(l.cantidad)} ${l.unidad} ${l.nombre}`).join('; ')}`,
  ].join('\n');
}

/** Full detail for one order. */
export function orderDetail(p: Pedido): string {
  return [
    `Order #${p.numero} for ${p.cliente}`,
    `Status: ${status(p)}`,
    `Expected delivery: ${prettyDate(p.fecha_esperada)} [${p.fecha_esperada}]`,
    `Deliver to: ${p.direccion}`,
    `Received: ${prettyDateTime(p.recibido_en)}${p.cerrado_por ? `, closed by ${p.cerrado_por}` : ''}`,
    '',
    `Line items (${p.lineas.length}):`,
    ...p.lineas.map((l) => `  - ${lineText(l)}`),
    '',
    `Total labels to print: ${labels(p)} (one per unit, rounded up)`,
  ].join('\n');
}

export function clientSummary(c: Cuenta, orders: Pedido[]): string {
  const mine = orders.filter((p) => p.cliente === c.nombre);
  const open = mine.filter((p) => !p.procesado);
  const last = mine.reduce<Pedido | null>((a, p) => (!a || p.recibido_en > a.recibido_en ? p : a), null);
  const extra = (c.direccion_extra || '').split('\n').map((s) => s.trim()).filter(Boolean);
  return [
    `${c.nombre} (account "${c.usuario}")`,
    `  Address: ${c.direccion}${extra.length ? ` — notes: ${extra.join('; ')}` : ''}`,
    `  Orders: ${mine.length} total, ${open.length} not processed` +
      (last ? ` · last order #${last.numero} received ${prettyDateTime(last.recibido_en)}, expected ${prettyDate(last.fecha_esperada)}` : ' · no orders yet'),
  ].join('\n');
}
