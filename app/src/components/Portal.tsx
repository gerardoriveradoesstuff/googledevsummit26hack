import { useMemo, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

const PUERTA = 'https://demo.ouwap.com/api';

type Producto = { nombre: string; unidad: string };

const CATEGORIAS: { id: string; nombre: string; productos: Producto[] }[] = [
  {
    id: 'hojas',
    nombre: 'Hojas',
    productos: [
      { nombre: 'Lechuga romana', unidad: 'caja' },
      { nombre: 'Repollo', unidad: 'caja' },
      { nombre: 'Cilantro', unidad: 'caja' },
      { nombre: 'Espinaca', unidad: 'caja' },
    ],
  },
  {
    id: 'chiles',
    nombre: 'Chiles',
    productos: [
      { nombre: 'Jalapeño', unidad: 'caja' },
      { nombre: 'Serrano', unidad: 'caja' },
      { nombre: 'Habanero', unidad: 'caja' },
      { nombre: 'Poblano', unidad: 'caja' },
    ],
  },
  {
    id: 'verduras',
    nombre: 'Verduras',
    productos: [
      { nombre: 'Tomate', unidad: 'caja' },
      { nombre: 'Pimentón', unidad: 'caja' },
      { nombre: 'Pepino', unidad: 'caja' },
      { nombre: 'Calabacín', unidad: 'caja' },
    ],
  },
  {
    id: 'raices',
    nombre: 'Raíces',
    productos: [
      { nombre: 'Cebolla blanca', unidad: 'caja' },
      { nombre: 'Cebolla morada', unidad: 'caja' },
      { nombre: 'Papa', unidad: 'caja' },
      { nombre: 'Ajo', unidad: 'caja' },
      { nombre: 'Zanahoria', unidad: 'caja' },
    ],
  },
  {
    id: 'frutas',
    nombre: 'Frutas',
    productos: [
      { nombre: 'Limón', unidad: 'caja' },
      { nombre: 'Lima', unidad: 'caja' },
      { nombre: 'Piña', unidad: 'caja' },
      { nombre: 'Naranja', unidad: 'caja' },
    ],
  },
];

const IZQUIERDA = ['hojas', 'chiles'];
const DERECHA = ['raices', 'frutas'];

function fechaIso(manana: boolean): string {
  const fecha = new Date();
  if (manana) fecha.setDate(fecha.getDate() + 1);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export default function Portal() {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [nombre, setNombre] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function conectar(event: React.FormEvent) {
    event.preventDefault();
    setEntrando(true);
    setError(null);
    try {
      const res = await fetch(`${PUERTA}/v1/portal.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contrasena }),
      });
      const data = (await res.json()) as { status?: string; message?: string; cliente?: { nombre: string } };
      if (!res.ok || data.status === 'error' || !data.cliente?.nombre) {
        throw new Error(data.message || 'Usuario o contraseña incorrectos');
      }
      setNombre(data.cliente.nombre);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar');
    } finally {
      setEntrando(false);
    }
  }

  if (nombre) {
    return (
      <SalaPedido
        nombre={nombre}
        usuario={usuario}
        contrasena={contrasena}
        onSalir={() => setNombre(null)}
      />
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <img src="/favicon.svg" alt="" className="mx-auto h-16 w-16" />
        <h1 className="mt-4 text-2xl font-bold text-hoja">Distribuidora de Productos</h1>
        <form onSubmit={conectar} className="mt-8 rounded-2xl bg-white p-6 text-left shadow-sm">
          <label className="block text-sm font-semibold" htmlFor="usuario">
            Usuario
          </label>
          <input
            id="usuario"
            className="mt-1 w-full rounded-lg border border-hoja/30 px-3 py-3"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            required
          />
          <label className="mt-4 block text-sm font-semibold" htmlFor="contrasena">
            Contraseña
          </label>
          <input
            id="contrasena"
            type="password"
            className="mt-1 w-full rounded-lg border border-hoja/30 px-3 py-3"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && (
            <p className="mt-3 text-sm text-red-800" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={entrando}
            className="mt-5 w-full rounded-full bg-hoja px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            {entrando ? 'Conectando…' : 'Conectar'}
          </button>
        </form>
      </div>
    </div>
  );
}

function SalaPedido({
  nombre,
  usuario,
  contrasena,
  onSalir,
}: {
  nombre: string;
  usuario: string;
  contrasena: string;
  onSalir: () => void;
}) {
  const [categoriaId, setCategoriaId] = useState('verduras');
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [fase, setFase] = useState<'sala' | 'revision' | 'procesando' | 'exito'>('sala');
  const [paraManana, setParaManana] = useState(false);
  const [numero, setNumero] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const categoria = CATEGORIAS.find((item) => item.id === categoriaId) ?? CATEGORIAS[2];
  const lineas = useMemo(
    () =>
      CATEGORIAS.flatMap((grupo) =>
        grupo.productos
          .filter((producto) => (cantidades[producto.nombre] ?? 0) > 0)
          .map((producto) => ({
            nombre: producto.nombre,
            unidad: producto.unidad,
            cantidad: cantidades[producto.nombre] ?? 0,
          })),
      ),
    [cantidades],
  );

  function sumar(nombreProducto: string) {
    setCantidades((actual) => ({ ...actual, [nombreProducto]: (actual[nombreProducto] ?? 0) + 1 }));
  }

  async function enviar() {
    setFase('procesando');
    setError(null);
    try {
      const res = await fetch(`${PUERTA}/v1/mensajes.php`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario,
          contrasena,
          fecha_esperada: fechaIso(paraManana),
          cerrado_por: nombre,
          lineas,
        }),
      });
      const data = (await res.json()) as { status?: string; message?: string; numero?: number };
      if (!res.ok || data.status === 'error' || !data.numero) {
        throw new Error(data.message || 'La puerta no contestó');
      }
      setNumero(data.numero);
      setFase('exito');
      setCantidades({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La puerta no contestó');
      setFase('revision');
    }
  }

  if (fase === 'procesando') {
    return (
      <div className="flex min-h-full items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-hoja/20 border-t-hoja" />
          <p className="mt-4 font-semibold">Procesando el pedido</p>
        </div>
      </div>
    );
  }

  if (fase === 'exito') {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-white px-6 text-center">
        <p className="text-3xl font-bold">Su orden ya fue puesta.</p>
        <p className="mt-3 text-xl">El número de su pedido es {numero}.</p>
        <p className="mt-2 text-lg">Gracias por su pedido.</p>
        <button
          type="button"
          className="mt-8 rounded-full bg-hoja px-6 py-3 font-bold text-white"
          onClick={() => setFase('sala')}
        >
          Listo
        </button>
      </div>
    );
  }

  if (fase === 'revision') {
    return (
      <div className="flex min-h-full flex-col bg-white">
        <div className="flex-1 overflow-auto p-5">
          <h1 className="text-2xl font-bold">Revisar pedido</h1>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className={`rounded-full px-4 py-2 font-bold ${paraManana ? 'border border-hoja text-hoja' : 'bg-hoja text-white'}`}
              onClick={() => setParaManana(false)}
            >
              Hoy
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 font-bold ${paraManana ? 'bg-hoja text-white' : 'border border-hoja text-hoja'}`}
              onClick={() => setParaManana(true)}
            >
              Mañana
            </button>
          </div>
          <ul className="mt-6 space-y-3">
            {lineas.map((linea) => (
              <li key={linea.nombre} className="flex gap-4 text-lg">
                <span className="w-16 font-bold">{linea.cantidad}</span>
                <span className="w-20">{linea.unidad}</span>
                <span>{linea.nombre}</span>
              </li>
            ))}
          </ul>
          {error && <p className="mt-4 text-red-800">{error}</p>}
        </div>
        <div className="flex gap-3 p-4">
          <button type="button" className="flex-1 rounded-2xl border border-tinta/20 py-4 font-bold" onClick={() => setFase('sala')}>
            Cancelar
          </button>
          <button type="button" className="flex-1 rounded-2xl bg-hoja py-4 font-bold text-white" onClick={() => void enviar()}>
            Enviar pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-fondo p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="font-bold text-hoja">{nombre}</p>
        <button type="button" className="text-sm font-semibold underline" onClick={onSalir}>
          Salir
        </button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[8.5rem_1fr_8.5rem] grid-rows-[5.5rem_1fr_auto] gap-2">
        <BotonCategoria
          nombre="Verduras"
          activo={categoriaId === 'verduras'}
          className="col-span-3"
          onClick={() => setCategoriaId('verduras')}
        />
        <div className="flex flex-col gap-2">
          {IZQUIERDA.map((id) => {
            const item = CATEGORIAS.find((categoriaItem) => categoriaItem.id === id);
            if (!item) return null;
            return (
              <BotonCategoria
                key={id}
                nombre={item.nombre}
                activo={categoriaId === id}
                className="flex-1"
                onClick={() => setCategoriaId(id)}
              />
            );
          })}
        </div>
        <section className="min-h-0 overflow-auto rounded-2xl bg-white p-3">
          <ul className="space-y-2">
            {categoria.productos.map((producto) => {
              const cantidad = cantidades[producto.nombre] ?? 0;
              return (
                <li key={producto.nombre} className="flex min-h-[4.5rem] items-center gap-3 rounded-xl bg-fondo px-3">
                  <span className="flex-1 text-lg font-bold">{producto.nombre}</span>
                  <span className="w-10 text-center text-2xl font-bold">{cantidad > 0 ? cantidad : ''}</span>
                  <button
                    type="button"
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-hoja text-white"
                    aria-label={`Sumar ${producto.nombre}`}
                    onClick={() => sumar(producto.nombre)}
                  >
                    <PlusIcon className="h-8 w-8" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <div className="flex flex-col gap-2">
          {DERECHA.map((id) => {
            const item = CATEGORIAS.find((categoriaItem) => categoriaItem.id === id);
            if (!item) return null;
            return (
              <BotonCategoria
                key={id}
                nombre={item.nombre}
                activo={categoriaId === id}
                className="flex-1"
                onClick={() => setCategoriaId(id)}
              />
            );
          })}
        </div>
        <button
          type="button"
          disabled={lineas.length === 0}
          className="col-span-3 rounded-2xl bg-hoja py-4 text-xl font-bold text-white disabled:opacity-40"
          onClick={() => {
            setError(null);
            setFase('revision');
          }}
        >
          Enviar pedido
        </button>
      </div>
    </div>
  );
}

function BotonCategoria({
  nombre,
  activo,
  className,
  onClick,
}: {
  nombre: string;
  activo: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rounded-2xl px-3 text-lg font-bold ${className ?? ''} ${
        activo ? 'bg-hoja text-white' : 'border-2 border-hoja bg-white text-hoja'
      }`}
      onClick={onClick}
    >
      {nombre}
    </button>
  );
}
