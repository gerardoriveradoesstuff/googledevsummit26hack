import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BellIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CubeIcon,
  InboxIcon,
  MapPinIcon,
  PencilSquareIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { codigoCaja, esHoy, fechaLocal, fechaMarca, horaCorta, svgCodigo128 } from '@/lib/labels';

type Linea = {
  nombre: string;
  unidad: string;
  cantidad: number;
  copias: number;
};

type Pedido = {
  numero: number;
  cliente: string;
  direccion: string;
  fecha_esperada: string;
  cerrado_por: string;
  recibido_en: string;
  procesado?: boolean;
  procesado_en?: string | null;
  lineas: Linea[];
};

type Cuenta = {
  id: number;
  nombre: string;
  direccion: string;
  direccion_extra?: string;
  usuario: string;
  contrasena: string;
  url: string;
};

const PUERTA = 'https://demo.ouwap.com/api';
const PORTAL_URL = 'https://demo.ouwap.com/portal';

function sugerirUsuario(nombre: string): string {
  const partes = nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (partes.length === 0) return '';
  const tomar = (palabra: string, n: number) => palabra.slice(0, n);
  if (partes.length === 1) return tomar(partes[0], 6);
  if (partes.length === 2) return tomar(partes[0], 3) + tomar(partes[1], 3);
  return partes
    .slice(0, 3)
    .map((palabra) => tomar(palabra, 2))
    .join('');
}

function nuevaContrasena(): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const letra = () => letras[Math.floor(Math.random() * letras.length)];
  return String(2 + Math.floor(Math.random() * 8)) + letra() + letra();
}

async function leer<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
  });
  const data = (await res.json()) as T & { status?: string; message?: string };
  if (!res.ok || data.status === 'error') {
    throw new Error(data.message || 'No se pudo hablar con la puerta');
  }
  return data;
}

export default function Panel({ vista = 'pedidos' }: { vista?: 'pedidos' | 'cuentas' }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [elegido, setElegido] = useState<number | null>(null);
  const [pestana, setPestana] = useState<'nuevos' | 'procesados'>('nuevos');
  const [banner, setBanner] = useState<Pedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [usuarioEditado, setUsuarioEditado] = useState(false);
  const [contrasenaEditada, setContrasenaEditada] = useState(false);
  const [cuentaNueva, setCuentaNueva] = useState<Cuenta | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [porCompartir, setPorCompartir] = useState<Cuenta | null>(null);
  const [porEliminar, setPorEliminar] = useState<Cuenta | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const vistos = useRef<Set<number> | null>(null);
  const procesadosLocales = useRef<Set<number>>(new Set());
  const marcasLocales = useRef<Record<number, string>>(leerMarcas());

  const cargar = useCallback(async () => {
    try {
      const data = await leer<{ pedidos: Pedido[] }>(`${PUERTA}/v1/pedidos.php`);
      const lista = (data.pedidos ?? []).map((item) => {
        const local = marcasLocales.current[item.numero];
        const procesado = Boolean(item.procesado) || Boolean(local) || procesadosLocales.current.has(item.numero);
        return { ...item, procesado, procesado_en: item.procesado_en || local || null };
      });
      setPedidos(lista);
      const ya = vistos.current;
      if (ya === null) {
        vistos.current = new Set(lista.map((p) => p.numero));
      } else {
        const nuevos = lista.filter((p) => !ya.has(p.numero));
        if (nuevos.length > 0) {
          setBanner(nuevos[0]);
          setPestana('nuevos');
          setElegido(nuevos[0].numero);
          nuevos.forEach((p) => ya.add(p.numero));
        }
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sin conexión');
    }
  }, []);

  const cargarCuentas = useCallback(async () => {
    try {
      const data = await leer<{ cuentas: Cuenta[] }>(`${PUERTA}/v1/cuentas.php`);
      setCuentas(data.cuentas ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las cuentas');
    }
  }, []);

  useEffect(() => {
    if (vista !== 'pedidos') return;
    void cargar();
    const id = window.setInterval(() => {
      void cargar();
    }, 4000);
    return () => window.clearInterval(id);
  }, [cargar, vista]);

  useEffect(() => {
    if (vista === 'cuentas') void cargarCuentas();
  }, [cargarCuentas, vista]);

  const pedido = pedidos.find((p) => p.numero === elegido) ?? null;
  const visibles = pedidos.filter((item) => (pestana === 'procesados' ? item.procesado : !item.procesado));

  function elegirPestana(siguiente: 'nuevos' | 'procesados') {
    setPestana(siguiente);
    if (pedido && Boolean(pedido.procesado) !== (siguiente === 'procesados')) {
      setElegido(null);
    }
  }

  function marcarProcesado(numero: number) {
    procesadosLocales.current.add(numero);
    const marca = marcasLocales.current[numero] || marcaAhora();
    marcasLocales.current[numero] = marca;
    guardarMarcas(marcasLocales.current);
    const antes = pedidos.filter((item) => !item.procesado);
    const idx = antes.findIndex((item) => item.numero === numero);
    const restantes = antes.filter((item) => item.numero !== numero);
    const siguiente = restantes[idx] ?? restantes[restantes.length - 1] ?? null;
    setPedidos((lista) =>
      lista.map((item) =>
        item.numero === numero ? { ...item, procesado: true, procesado_en: item.procesado_en || marca } : item,
      ),
    );
    setPestana('nuevos');
    setElegido(siguiente?.numero ?? null);
    void leer(`${PUERTA}/v1/pedidos.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero }),
    }).catch(() => undefined);
  }

  async function crearCuenta(event: React.FormEvent, extras: string[] = []) {
    event.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const data = await leer<{ cuenta: Cuenta }>(`${PUERTA}/v1/cuentas.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, direccion, extras, usuario, contrasena }),
      });
      setCuentaNueva(data.cuenta);
      setNombre('');
      setDireccion('');
      setUsuario('');
      setContrasena('');
      setUsuarioEditado(false);
      setContrasenaEditada(false);
      await cargarCuentas();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la cuenta');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarCuenta() {
    if (!porEliminar || eliminando) return;
    setEliminando(true);
    setError(null);
    try {
      await leer(`${PUERTA}/v1/cuentas.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'eliminar', id: porEliminar.id }),
      });
      setCuentaNueva((actual) => (actual?.id === porEliminar.id ? null : actual));
      setPorEliminar(null);
      await cargarCuentas();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la cuenta');
    } finally {
      setEliminando(false);
    }
  }

  if (vista === 'cuentas') {
    return (
      <VistaCuentas
        cuentas={cuentas}
        nombre={nombre}
        direccion={direccion}
        usuario={usuario}
        contrasena={contrasena}
        usuarioEditado={usuarioEditado}
        contrasenaEditada={contrasenaEditada}
        cuentaNueva={cuentaNueva}
        guardando={guardando}
        error={error}
        onAbrir={() => {
          setNombre('');
          setDireccion('');
          setUsuario('');
          setContrasena('');
          setUsuarioEditado(false);
          setContrasenaEditada(false);
        }}
        onNombre={setNombre}
        onAutogenerar={() => {
          setUsuario(sugerirUsuario(nombre));
          setContrasena(nuevaContrasena());
          setUsuarioEditado(false);
          setContrasenaEditada(false);
        }}
        onDireccion={setDireccion}
        onUsuario={(value) => {
          setUsuarioEditado(true);
          setUsuario(value);
        }}
        onContrasena={(value) => {
          setContrasenaEditada(true);
          setContrasena(value);
        }}
        onEditarUsuario={() => setUsuarioEditado(true)}
        onEditarContrasena={() => setContrasenaEditada(true)}
        onCrear={crearCuenta}
        porCompartir={porCompartir}
        onCompartir={setPorCompartir}
        onCerrarCompartir={() => setPorCompartir(null)}
        porEliminar={porEliminar}
        eliminando={eliminando}
        onPedirEliminar={setPorEliminar}
        onCancelarEliminar={() => {
          if (!eliminando) setPorEliminar(null);
        }}
        onConfirmarEliminar={() => {
          void eliminarCuenta();
        }}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center gap-3 bg-hoja px-5 py-4 text-white">
        <InboxIcon className="h-7 w-7" aria-hidden="true" />
        <h1 className="text-xl font-bold">Distribuidora de Productos</h1>
        <a href="/cuentas" className="ml-auto text-sm font-semibold text-white/90 underline">
          Cuentas
        </a>
        <a href="/portal" className="text-sm font-semibold text-white/90 underline">
          Portal
        </a>
      </header>

      {banner && (
        <button
          type="button"
          className="flex items-center gap-3 bg-ambar px-5 py-3 text-left font-semibold text-tinta"
          onClick={() => {
            setPestana('nuevos');
            setElegido(banner.numero);
            setBanner(null);
          }}
        >
          <BellIcon className="h-6 w-6" aria-hidden="true" />
          Pedido nuevo {banner.numero} · {banner.cliente}
        </button>
      )}

      {error && (
        <p className="bg-white px-5 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[22rem_1fr]">
        <aside className="flex min-h-0 flex-col border-r border-hoja/15 bg-white">
          <div className="flex shrink-0 gap-2 p-3">
            <button
              type="button"
              className={`flex-1 rounded-full px-3 py-2 text-sm font-bold ${
                pestana === 'nuevos' ? 'bg-hoja text-white' : 'border border-hoja text-hoja'
              }`}
              onClick={() => elegirPestana('nuevos')}
            >
              Nuevos pedidos
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full px-3 py-2 text-sm font-bold ${
                pestana === 'procesados' ? 'bg-hoja text-white' : 'border border-hoja text-hoja'
              }`}
              onClick={() => elegirPestana('procesados')}
            >
              Procesados
            </button>
          </div>
          {visibles.length === 0 && (
            <p className="p-5 text-sm text-tinta/70">
              {pestana === 'procesados' ? 'No hay pedidos procesados.' : 'Todavía no llega ningún pedido.'}
            </p>
          )}
          <ul className="min-h-0 flex-1 overflow-auto">
            {visibles.map((item) => {
              const activo = item.numero === elegido;
              const hoy = esHoy(item.fecha_esperada);
              return (
                <li key={item.numero}>
                  <button
                    type="button"
                    className={`flex w-full items-start gap-3 px-4 py-4 text-left ${
                      activo ? 'bg-fondo' : 'bg-white'
                    }`}
                    onClick={() => setElegido(item.numero)}
                  >
                    <InboxIcon className="mt-1 h-6 w-6 shrink-0 text-hoja" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-bold">{item.cliente}</span>
                      <span className="block text-sm text-tinta/70">
                        Pedido {item.numero} · {horaCorta(item.recibido_en)}
                      </span>
                      {item.procesado && (
                        <span className="mt-1 block text-sm font-semibold text-hoja">
                          Orden procesada{item.procesado_en ? ` · ${fechaMarca(item.procesado_en)}` : ''}
                        </span>
                      )}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        hoy ? 'bg-hoja text-white' : 'border border-hoja text-hoja'
                      }`}
                    >
                      {hoy ? 'Para hoy' : 'Para mañana'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <main className="relative flex min-h-0 min-w-0 flex-col">
          {pedido ? (
            <Detalle pedido={pedido} onProcesado={marcarProcesado} />
          ) : (
            <p className="p-5 text-sm text-tinta/70">Elige un pedido para verlo aquí.</p>
          )}
        </main>
      </div>
    </div>
  );
}

function CampoConLapiz({
  id,
  etiqueta,
  valor,
  editando,
  onEditar,
  onChange,
  accion,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  editando: boolean;
  onEditar: () => void;
  onChange: (value: string) => void;
  accion?: { texto: string; onClick: () => void };
}) {
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editando) campo.current?.focus();
  }, [editando]);

  return (
    <>
      <label className="mt-4 block text-sm font-semibold" htmlFor={id}>
        {etiqueta}
        {accion && (
          <>
            {' '}
            <button type="button" className="font-semibold text-hoja" onClick={accion.onClick}>
              ({accion.texto})
            </button>
          </>
        )}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          ref={campo}
          id={id}
          className="w-full rounded-lg border border-hoja/30 bg-fondo px-3 py-3 font-mono read-only:text-tinta"
          value={valor}
          readOnly={!editando}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <button
          type="button"
          className="rounded-xl p-2 text-hoja"
          aria-label={`Editar ${etiqueta}`}
          onClick={onEditar}
        >
          <PencilSquareIcon className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}

function VistaCuentas({
  cuentas,
  nombre,
  direccion,
  usuario,
  contrasena,
  usuarioEditado,
  contrasenaEditada,
  cuentaNueva,
  guardando,
  error,
  onAbrir,
  onNombre,
  onAutogenerar,
  onDireccion,
  onUsuario,
  onContrasena,
  onEditarUsuario,
  onEditarContrasena,
  onCrear,
  porCompartir,
  onCompartir,
  onCerrarCompartir,
  porEliminar,
  eliminando,
  onPedirEliminar,
  onCancelarEliminar,
  onConfirmarEliminar,
}: {
  cuentas: Cuenta[];
  nombre: string;
  direccion: string;
  usuario: string;
  contrasena: string;
  usuarioEditado: boolean;
  contrasenaEditada: boolean;
  cuentaNueva: Cuenta | null;
  guardando: boolean;
  error: string | null;
  onAbrir: () => void;
  onNombre: (value: string) => void;
  onAutogenerar: () => void;
  onDireccion: (value: string) => void;
  onUsuario: (value: string) => void;
  onContrasena: (value: string) => void;
  onEditarUsuario: () => void;
  onEditarContrasena: () => void;
  onCrear: (event: React.FormEvent, extras: string[]) => void;
  porCompartir: Cuenta | null;
  onCompartir: (cuenta: Cuenta) => void;
  onCerrarCompartir: () => void;
  porEliminar: Cuenta | null;
  eliminando: boolean;
  onPedirEliminar: (cuenta: Cuenta) => void;
  onCancelarEliminar: () => void;
  onConfirmarEliminar: () => void;
}) {
  const [extras, setExtras] = useState<string[]>([]);
  const [formulario, setFormulario] = useState(false);
  useEffect(() => {
    setExtras([]);
    setFormulario(false);
  }, [cuentaNueva?.id]);
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-3 bg-hoja px-5 py-4 text-white">
        <InboxIcon className="h-7 w-7" aria-hidden="true" />
        <h1 className="text-xl font-bold">Cuentas</h1>
        <a href="/" className="ml-auto text-sm font-semibold text-white/90 underline">
          Pedidos
        </a>
        <a href="/portal" className="text-sm font-semibold text-white/90 underline">
          Portal
        </a>
      </header>
      {error && (
        <p className="bg-white px-5 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      <div className="mx-auto w-full max-w-lg p-5">
        {!formulario ? (
          <button
            type="button"
            className="rounded-full bg-hoja px-5 py-3 font-bold text-white"
            onClick={() => {
              onAbrir();
              setFormulario(true);
            }}
          >
            Crear cuenta
          </button>
        ) : (
        <form
          onSubmit={(evento) => {
            onCrear(
              evento,
              extras.map((linea) => linea.trim()).filter(Boolean),
            );
          }}
          className="rounded-2xl bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-bold">Nueva cuenta</h2>
          <label className="mt-4 block text-sm font-semibold" htmlFor="nombre">
            Compañía
          </label>
          <input
            id="nombre"
            className="mt-1 w-full rounded-lg border border-hoja/30 px-3 py-3"
            value={nombre}
            onChange={(e) => onNombre(e.target.value)}
            required
          />
          <CampoConLapiz
            id="usuario"
            etiqueta="Usuario"
            valor={usuario}
            editando={usuarioEditado}
            onEditar={onEditarUsuario}
            onChange={onUsuario}
            accion={{ texto: 'autogenerar', onClick: onAutogenerar }}
          />
          <CampoConLapiz
            id="contrasena"
            etiqueta="Contraseña"
            valor={contrasena}
            editando={contrasenaEditada}
            onEditar={onEditarContrasena}
            onChange={onContrasena}
          />
          <p className="mt-4 text-sm font-semibold">
            Dirección{' '}
            <button
              type="button"
              className="font-semibold text-hoja"
              onClick={() => setExtras((lista) => ['', ...lista])}
            >
              (adicionar otra)
            </button>
          </p>
          {extras.map((linea, indice) => (
            <input
              key={indice}
              className="mt-1 w-full rounded-lg border border-hoja/30 px-3 py-3"
              value={linea}
              aria-label={`Dirección adicional ${indice + 1}`}
              onChange={(evento) =>
                setExtras((lista) => lista.map((actual, i) => (i === indice ? evento.target.value : actual)))
              }
            />
          ))}
          <input
            id="direccion"
            className="mt-1 w-full rounded-lg border border-hoja/30 px-3 py-3"
            value={direccion}
            onChange={(e) => onDireccion(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={guardando}
            className="mt-5 rounded-full bg-hoja px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : 'Crear cuenta'}
          </button>
        </form>
        )}

        <ul className="mt-5 space-y-3">
          {cuentas.map((cuenta) => (
            <li key={cuenta.id}>
              <TarjetaCuenta
                cuenta={cuenta}
                reciente={cuenta.id === cuentaNueva?.id}
                onCompartir={onCompartir}
                onPedirEliminar={onPedirEliminar}
              />
            </li>
          ))}
        </ul>
      </div>
      {porCompartir && <VentanaCompartir cuenta={porCompartir} onCerrar={onCerrarCompartir} />}
      {porEliminar && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-tinta/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg" role="dialog" aria-modal="true">
            <h2 className="text-lg font-bold">Eliminar cuenta</h2>
            <p className="mt-2 text-sm">
              Se elimina la cuenta de {porEliminar.nombre}. El usuario y la contraseña dejan de servir.
            </p>
            {error && (
              <p className="mt-3 text-sm text-red-800" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="px-4 py-2 font-semibold" onClick={onCancelarEliminar} disabled={eliminando}>
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-full bg-hoja px-5 py-2 font-bold text-white disabled:opacity-60"
                onClick={onConfirmarEliminar}
                disabled={eliminando}
              >
                {eliminando ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TarjetaCuenta({
  cuenta,
  reciente = false,
  onCompartir,
  onPedirEliminar,
}: {
  cuenta: Cuenta;
  reciente?: boolean;
  onCompartir: (cuenta: Cuenta) => void;
  onPedirEliminar: (cuenta: Cuenta) => void;
}) {
  return (
    <article className="relative rounded-2xl bg-white p-4 shadow-sm">
      <button
        type="button"
        className="absolute right-3 top-3 inline-flex items-center gap-1 text-sm font-semibold text-hoja"
        onClick={() => onPedirEliminar(cuenta)}
      >
        <TrashIcon className="h-5 w-5" aria-hidden="true" />
        Eliminar
      </button>
      {reciente && (
        <p className="mb-2 flex items-center gap-2 pr-28 font-bold text-hoja">
          <CheckCircleIcon className="h-6 w-6" aria-hidden="true" />
          Cuenta creada
        </p>
      )}
      <p className="pr-28 font-bold">{cuenta.nombre}</p>
      <p className="pr-28 text-sm">{cuenta.direccion}</p>
      {cuenta.direccion_extra
        ?.split('\n')
        .map((linea) => linea.trim())
        .filter(Boolean)
        .map((linea) => (
          <p key={linea} className="pr-28 text-sm">
            {linea}
          </p>
        ))}
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="w-28 font-semibold">Usuario</dt>
          <dd className="font-mono text-base">{cuenta.usuario}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 font-semibold">Contraseña</dt>
          <dd className="font-mono text-base tracking-widest">{cuenta.contrasena}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 font-semibold">Portal</dt>
          <dd className="break-all">{cuenta.url || PORTAL_URL}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="mt-4 rounded-full bg-hoja px-4 py-2 text-sm font-bold text-white"
        onClick={() => onCompartir(cuenta)}
      >
        Compartir contraseña
      </button>
    </article>
  );
}

function VentanaCompartir({ cuenta, onCerrar }: { cuenta: Cuenta; onCerrar: () => void }) {
  const [avisoCorreo, setAvisoCorreo] = useState(false);
  const url = cuenta.url || PORTAL_URL;
  const texto = [
    'Distribuidora de Productos',
    `Portal: ${url}`,
    `Usuario: ${cuenta.usuario}`,
    `Contraseña: ${cuenta.contrasena}`,
  ].join('\n');

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-tinta/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg" role="dialog" aria-modal="true">
        <h2 className="text-lg font-bold">Compartir contraseña</h2>
        <p className="mt-3 break-all text-sm">{url}</p>
        <p className="mt-2 font-mono text-sm">
          {cuenta.usuario} · {cuenta.contrasena}
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <a
            className="rounded-full bg-hoja px-5 py-3 text-center font-bold text-white"
            href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <button
            type="button"
            className="rounded-full border border-hoja px-5 py-3 font-bold text-hoja"
            onClick={() => setAvisoCorreo(true)}
          >
            Correo electrónico
          </button>
          {avisoCorreo && <p className="text-sm text-tinta/70">El correo queda para el siguiente paso.</p>}
          <button type="button" className="px-4 py-2 font-semibold" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

const CLAVE_MARCAS = 'distribuidora_procesado_en';

function leerMarcas(): Record<number, string> {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_MARCAS) || '{}') as Record<string, string>;
    return Object.fromEntries(Object.entries(guardado).map(([numero, marca]) => [Number(numero), marca]));
  } catch {
    return {};
  }
}

function guardarMarcas(marcas: Record<number, string>) {
  localStorage.setItem(CLAVE_MARCAS, JSON.stringify(marcas));
}

function marcaAhora(): string {
  const ahora = new Date();
  const dos = (valor: number) => String(valor).padStart(2, '0');
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())} ${dos(ahora.getHours())}:${dos(ahora.getMinutes())}:${dos(ahora.getSeconds())}`;
}

function totalLabels(pedido: Pedido): number {
  return pedido.lineas.reduce((suma, linea) => suma + linea.copias, 0);
}

function escaparHtml(valor: string): string {
  return valor.replace(/[&<>"]/g, (caracter) => {
    if (caracter === '&') return '&amp;';
    if (caracter === '<') return '&lt;';
    if (caracter === '>') return '&gt;';
    return '&quot;';
  });
}

function imprimirEtiquetas(pedido: Pedido): string {
  const hojas = pedido.lineas.flatMap((linea, indiceLinea) =>
    Array.from({ length: Math.max(0, linea.copias) }, (_, indice) => ({
      linea,
      n: indice + 1,
      total: linea.copias,
      codigo: codigoCaja(pedido.numero, indiceLinea + 1, indice + 1),
    })),
  );
  if (hojas.length === 0) return 'No hay labels para imprimir';
  const impresa = new Date().toLocaleDateString('es-MX');
  const cuerpo = hojas
    .map(
      ({ linea, n, total, codigo }) => `<article>
        <div class="cabeza">
          <p class="marca"><svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="6" fill="#1F6B3A"/><path d="M16 6c2 4 2 8 0 12 4-1 8-1 10 2-4 1-8 4-10 8-2-4-6-7-10-8 2-3 6-3 10-2-2-4-2-8 0-12z" fill="#E7F3EA"/></svg>Distribuidora de Productos</p>
          <p class="pedido">Pedido ${pedido.numero}</p>
        </div>
        <p class="fecha">${impresa}</p>
        <p class="producto">${escaparHtml(linea.nombre)}</p>
        <p class="copia">${n} de ${total}</p>
        <div class="pie">
          <div>
            <p class="cliente">${escaparHtml(pedido.cliente)}</p>
            <p class="dir">${escaparHtml(pedido.direccion)}</p>
          </div>
          <div class="codigo"><p>${escaparHtml(codigo)}</p>${svgCodigo128(codigo)}</div>
        </div>
      </article>`,
    )
    .join('');
  const ventana = window.open('', '_blank', 'width=480,height=360');
  if (!ventana) return 'El navegador bloqueó la impresión';
  ventana.document.write(`<!doctype html><html><head><title>Labels</title><style>
    @page { size: 4in 2.5in; margin: 0.12in; }
    body { margin: 0; font-family: Arial, sans-serif; color: #14241A; }
    article { width: 3.76in; height: 2.26in; page-break-after: always; }
    .cabeza { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .marca { display: flex; align-items: center; gap: 6px; margin: 0; font-weight: 700; font-size: 14px; color: #1F6B3A; }
    .logo { width: 16px; height: 16px; flex: none; }
    .pedido { margin: 0; font-size: 13px; font-weight: 700; white-space: nowrap; }
    .fecha { margin: 8px 0 0; text-align: right; font-size: 13px; }
    .producto { margin: 14px 0 0; font-size: 22px; font-weight: 700; }
    .copia { margin: 6px 0 0; font-size: 26px; font-weight: 700; }
    .pie { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; margin-top: 8px; }
    .cliente, .dir { max-width: 2.15in; margin: 0; font-size: 12px; }
    .dir { margin-top: 4px; }
    .codigo { text-align: right; }
    .codigo svg { display: block; width: 1.45in; height: auto; margin-left: auto; }
    .codigo p { margin: 0 0 2px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; }
  </style></head><body>${cuerpo}</body></html>`);
  ventana.document.close();
  ventana.focus();
  ventana.print();
  return `Se enviaron ${hojas.length} labels`;
}

function Detalle({ pedido, onProcesado }: { pedido: Pedido; onProcesado: (numero: number) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [impresion, setImpresion] = useState(0);
  const [cierre, setCierre] = useState(0);
  const [lista, setLista] = useState(false);
  const [mandarLabel, setMandarLabel] = useState(false);
  const [avisoPrint, setAvisoPrint] = useState<string | null>(null);
  const terminar = useRef(onProcesado);
  terminar.current = onProcesado;

  useEffect(() => {
    setAbierto(false);
    setImpresion(0);
    setCierre(0);
    setLista(false);
    setAvisoPrint(null);
  }, [pedido.numero]);

  useEffect(() => {
    if (!abierto) return;
    let marco = 0;
    let avisado = false;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const transcurrido = ahora - inicio;
      if (transcurrido < 5000) {
        setImpresion(transcurrido / 5000);
        marco = window.requestAnimationFrame(paso);
        return;
      }
      setImpresion(1);
      setLista(true);
      const resto = transcurrido - 5000;
      if (resto < 3000) {
        setCierre(resto / 3000);
        marco = window.requestAnimationFrame(paso);
        return;
      }
      setCierre(1);
      if (!avisado) {
        avisado = true;
        terminar.current(pedido.numero);
      }
    };
    marco = window.requestAnimationFrame(paso);
    return () => window.cancelAnimationFrame(marco);
  }, [abierto, pedido.numero]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 p-5 pb-0">
        <EncabezadoPedido
          pedido={pedido}
          mandarLabel={mandarLabel}
          onMandarLabel={setMandarLabel}
          onProcesar={() => {
            setAvisoPrint(mandarLabel ? imprimirEtiquetas(pedido) : null);
            setAbierto(true);
          }}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-5">
        <table className="w-full overflow-hidden rounded-2xl bg-white text-left">
          <thead className="bg-fondo text-sm">
            <tr>
              <th className="px-4 py-3">Cantidad</th>
              <th className="px-4 py-3">Unidad</th>
              <th className="px-4 py-3">Producto</th>
            </tr>
          </thead>
          <tbody>
            {pedido.lineas.map((linea) => (
              <tr key={`${linea.nombre}-${linea.unidad}`} className="border-t border-fondo">
                <td className="px-4 py-4 text-2xl font-bold">{linea.cantidad}</td>
                <td className="px-4 py-4">{linea.unidad}</td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center gap-2">
                    <CubeIcon className="h-5 w-5 text-hoja" aria-hidden="true" />
                    {linea.nombre}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {abierto && (
        <div className="entra-derecha absolute inset-0 z-10 flex flex-col bg-hoja text-white">
          <div className="relative flex flex-1 items-center justify-center overflow-hidden border-b border-white/30">
            <div className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${impresion * 100}%` }} />
            <p className="relative text-4xl font-bold">Imprimiendo</p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center">
            {lista && (
              <>
                <p className="text-4xl font-bold">Orden procesada</p>
                {avisoPrint && <p className="mt-3 text-lg">{avisoPrint}</p>}
                <div className="relative mt-8 h-16 w-64 overflow-hidden rounded-2xl border-2 border-white">
                  <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${cierre * 100}%` }} />
                  <p className="relative flex h-full items-center justify-center text-xl font-bold">Terminar</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EncabezadoPedido({
  pedido,
  mandarLabel,
  onMandarLabel,
  onProcesar,
}: {
  pedido: Pedido;
  mandarLabel?: boolean;
  onMandarLabel?: (activo: boolean) => void;
  onProcesar?: () => void;
}) {
  const hoy = esHoy(pedido.fecha_esperada);
  return (
    <header className="flex overflow-hidden rounded-2xl bg-white">
      <div className="min-w-0 flex-1 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-hoja">Pedido {pedido.numero}</p>
          {onProcesar && (
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="h-5 w-5 accent-hoja"
                checked={mandarLabel ?? false}
                onChange={(evento) => onMandarLabel?.(evento.target.checked)}
              />
              Label
            </label>
          )}
        </div>
        <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
          <UserIcon className="h-7 w-7 shrink-0 text-hoja" aria-hidden="true" />
          {pedido.cliente}
        </h2>
        <p className="mt-3 flex items-start gap-2">
          <MapPinIcon className="mt-0.5 h-6 w-6 shrink-0 text-hoja" aria-hidden="true" />
          {pedido.direccion}
        </p>
        <p className="mt-2 flex items-center gap-2">
          <CalendarDaysIcon className="h-6 w-6 text-hoja" aria-hidden="true" />
          <span className={hoy ? 'font-bold text-hoja' : 'font-bold'}>
            {hoy ? 'Para hoy' : 'Para mañana'} · {fechaLocal(pedido.fecha_esperada)}
          </span>
        </p>
      </div>
      {onProcesar && (
        <div className="flex w-36 shrink-0 flex-col self-stretch text-white">
          <button
            type="button"
            className="flex flex-1 flex-col items-center justify-center bg-hoja px-3"
            onClick={onProcesar}
          >
            <span className="text-lg font-bold leading-none">Procesar</span>
            <span className="mt-[5px] text-lg font-bold leading-none">orden</span>
          </button>
          <div className="flex flex-1 flex-col items-center justify-center border-t border-white/30 bg-hoja">
            <span className="text-3xl font-bold leading-none">{totalLabels(pedido)}</span>
            <span className="mt-[5px] text-sm font-bold leading-none">labels</span>
          </div>
        </div>
      )}
    </header>
  );
}

