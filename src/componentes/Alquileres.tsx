/** Asignar carro eléctrico o buggy (con su número) a cada jugador. */
import { useEffect, useRef, useState } from 'react';
import { useDatos } from '../datos/DatosProvider';
import { NOMBRE_ALQUILER, type Jugador, type Partida, type TipoAlquiler } from '../datos/tipos';
import { nuevoId } from '../lib/ids';
import { avisoAlquilerOcupado } from '../lib/partidas';

export interface ValorAlquiler {
  tipo: TipoAlquiler | null;
  numero: string;
}

const OPCIONES: { tipo: TipoAlquiler | null; texto: string }[] = [
  { tipo: null, texto: 'Nada' },
  { tipo: 'carro_electrico', texto: 'Carro' },
  { tipo: 'buggy', texto: 'Buggy' },
];

/** Selector controlado: [Nada | Carro | Buggy] + campo numérico del nº. */
export function SelectorAlquiler({
  valor,
  onCambiar,
  onSalirNumero,
  etiqueta,
  aviso,
}: {
  valor: ValorAlquiler;
  onCambiar: (valor: ValorAlquiler) => void;
  onSalirNumero?: () => void;
  etiqueta: string;
  /** Aviso bajo el selector (p. ej. buggy ya asignado a otra partida). */
  aviso?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label={`Alquiler de ${etiqueta}`} className="inline-flex rounded-xl bg-slate-100 p-1">
        {OPCIONES.map((o) => (
          <button
            key={o.texto}
            type="button"
            role="radio"
            aria-checked={valor.tipo === o.tipo}
            onClick={() => onCambiar({ ...valor, tipo: o.tipo })}
            className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition ${
              valor.tipo === o.tipo ? 'bg-campo-700 text-white shadow' : 'text-slate-600 hover:bg-white'
            }`}
          >
            {o.texto}
          </button>
        ))}
      </div>
      {valor.tipo && (
        <label className="inline-flex items-center gap-1 text-sm font-medium text-slate-600">
          Nº
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={valor.numero}
            onChange={(e) => onCambiar({ ...valor, numero: e.target.value })}
            onBlur={onSalirNumero}
            placeholder="—"
            aria-label={`Número de ${NOMBRE_ALQUILER[valor.tipo].toLowerCase()} de ${etiqueta}`}
            className="cifras h-10 w-20 rounded-lg border border-slate-300 bg-white px-2 text-center text-base font-semibold text-slate-900 focus:border-campo-600 focus:outline-none focus:ring-2 focus:ring-campo-200"
          />
        </label>
      )}
      {aviso && <p className="w-full text-xs font-semibold text-amber-700">⚠ {aviso}</p>}
    </div>
  );
}

export const numeroValido = (texto: string) => {
  const n = Number.parseInt(texto, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function FilaJugador({ partida, jugador }: { partida: Partida; jugador: Jugador }) {
  const { ejecutar, partidas } = useDatos();
  const guardado = jugador.alquiler;
  const [valor, setValor] = useState<ValorAlquiler>({
    tipo: guardado?.tipo ?? null,
    numero: guardado?.numero?.toString() ?? '',
  });
  const editandoNumero = useRef(false);
  const temporizador = useRef<number | undefined>(undefined);

  // Si otro dispositivo cambia el alquiler, se refleja aquí (salvo mientras se escribe el nº).
  useEffect(() => {
    if (editandoNumero.current) return;
    setValor({ tipo: guardado?.tipo ?? null, numero: guardado?.numero?.toString() ?? '' });
  }, [guardado?.tipo, guardado?.numero]);

  const guardar = (nuevo: ValorAlquiler) => {
    editandoNumero.current = false;
    const numero = numeroValido(nuevo.numero);
    if (nuevo.tipo === (guardado?.tipo ?? null) && numero === (guardado?.numero ?? null)) return;
    void ejecutar({
      tipo: 'asignar_alquiler',
      partidaId: partida.id,
      jugadorId: jugador.id,
      alquiler: nuevo.tipo
        ? { id: guardado?.id ?? nuevoId(), partida_id: partida.id, jugador_id: jugador.id, tipo: nuevo.tipo, numero }
        : null,
    });
  };

  return (
    <li className="flex flex-col gap-2 py-3 @lg:flex-row @lg:items-center @lg:justify-between">
      <span className="font-semibold text-slate-800">{jugador.nombre}</span>
      <SelectorAlquiler
        etiqueta={jugador.nombre}
        aviso={avisoAlquilerOcupado(partidas, valor.tipo, numeroValido(valor.numero), partida.id)}
        valor={valor}
        onCambiar={(nuevo) => {
          setValor(nuevo);
          window.clearTimeout(temporizador.current);
          if (nuevo.tipo !== valor.tipo) {
            guardar(nuevo);
          } else {
            // Escribiendo el nº: se guarda al salir del campo o tras 1 s sin teclear.
            editandoNumero.current = true;
            temporizador.current = window.setTimeout(() => guardar(nuevo), 1000);
          }
        }}
        onSalirNumero={() => {
          window.clearTimeout(temporizador.current);
          guardar(valor);
        }}
      />
    </li>
  );
}

export function EditorAlquileres({ partida }: { partida: Partida }) {
  if (partida.jugadores.length === 0) return <p className="text-sm text-slate-500">Esta partida no tiene jugadores.</p>;
  return (
    <ul className="@container divide-y divide-slate-100">
      {partida.jugadores.map((j) => (
        <FilaJugador key={j.id} partida={partida} jugador={j} />
      ))}
    </ul>
  );
}

/** Resumen compacto: "Buggy 7 · Carro 12". */
export function ResumenAlquileres({ partida }: { partida: Partida }) {
  const alquileres = partida.jugadores.flatMap((j) => (j.alquiler ? [j.alquiler] : []));
  if (alquileres.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {alquileres.map((a) => (
        <span
          key={a.id}
          className={`cifras rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
            a.tipo === 'buggy' ? 'bg-sky-100 text-sky-900' : 'bg-violet-100 text-violet-900'
          }`}
        >
          {a.tipo === 'buggy' ? 'Buggy' : 'Carro'} {a.numero ?? '¿?'}
        </span>
      ))}
    </span>
  );
}
