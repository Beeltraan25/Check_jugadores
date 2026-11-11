/**
 * Alta de una partida nueva (hora de salida, tee, jugadores y alquileres).
 * Pensada para apuntar rápido: se elige el nº de jugadores con un toque y los nombres son
 * opcionales (si se dejan en blanco quedan como "Jugador 1", "Jugador 2"…).
 */
import { useState, type FormEvent } from 'react';
import { useDatos } from '../datos/DatosProvider';
import type { Jugador, Partida, Torneo } from '../datos/tipos';
import { combinarFechaHora } from '../lib/hora';
import { nuevoId } from '../lib/ids';
import { avisoAlquilerOcupado } from '../lib/partidas';
import { esSalidas } from '../lib/jornadas';
import { SelectorAlquiler, numeroValido, type ValorAlquiler } from './Alquileres';

const MAX_JUGADORES = 4;

/** Próxima hora "redonda" (múltiplo de 10 min) en formato HH:MM. */
function proximaSalida(): string {
  const d = new Date(Date.now() + 10 * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 10) * 10, 0, 0);
  return d.toTimeString().slice(0, 5);
}

interface FilaFormulario {
  nombre: string;
  alquiler: ValorAlquiler;
}

const filaVacia = (): FilaFormulario => ({ nombre: '', alquiler: { tipo: null, numero: '' } });

/** Hora actual en formato HH:MM (para apuntar una salida en el momento en que sale). */
const horaActual = () => new Date().toTimeString().slice(0, 5);

/** Alta de una partida dentro del torneo indicado. */
export function FormularioPartida({ torneo, onCerrar }: { torneo: Torneo; onCerrar: () => void }) {
  const { ejecutar, partidas } = useDatos();
  const fecha = torneo.fecha;
  const salidas = esSalidas(torneo);
  // Salidas normales: se apunta cuando la partida sale (hora actual). Torneo: próxima hora redonda.
  const [hora, setHora] = useState(salidas ? horaActual : proximaSalida);
  const [hoyoSalida, setHoyoSalida] = useState(1);
  const [nombre, setNombre] = useState('');
  // En el juego normal lo habitual son partidas de 4; en un torneo se suele rellenar a mano.
  const [filas, setFilas] = useState<FilaFormulario[]>(() => Array.from({ length: salidas ? 4 : 2 }, filaVacia));
  const [error, setError] = useState<string | null>(null);

  const cambiarFila = (i: number, cambio: Partial<FilaFormulario>) =>
    setFilas((actuales) => actuales.map((f, k) => (k === i ? { ...f, ...cambio } : f)));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (filas.length === 0) {
      setError('Indica cuántos jugadores salen.');
      return;
    }
    const partidaId = nuevoId();
    const jugadores: Jugador[] = filas.map((f, orden) => {
      const jugadorId = nuevoId();
      return {
        id: jugadorId,
        partida_id: partidaId,
        nombre: f.nombre.trim() || `Jugador ${orden + 1}`,
        orden,
        alquiler: f.alquiler.tipo
          ? { id: nuevoId(), partida_id: partidaId, jugador_id: jugadorId, tipo: f.alquiler.tipo, numero: numeroValido(f.alquiler.numero) }
          : null,
      };
    });
    const partida: Partida = {
      id: partidaId,
      torneo_id: torneo.id,
      fecha,
      hora_salida: combinarFechaHora(fecha, hora),
      hoyo_salida: hoyoSalida,
      nombre: nombre.trim(),
      observaciones: '',
      revision_iniciada_en: null,
      terminada_en: null,
      jugadores,
      avistamientos: [],
    };
    void ejecutar({ tipo: 'crear_partida', partida });
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onCerrar}>
      <form
        onSubmit={enviar}
        onClick={(e) => e.stopPropagation()}
        className="margen-inferior-seguro max-h-[92dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-2xl bg-white px-5 pt-5 shadow-2xl sm:rounded-2xl"
        aria-labelledby="titulo-nueva-partida"
      >
        <h2 id="titulo-nueva-partida" className="text-xl font-bold text-slate-900">
          {salidas ? 'Nueva salida' : 'Nueva partida'}
        </h2>
        <p className="mb-4 text-sm text-slate-500">{torneo.nombre}</p>

        <div className={`grid gap-4 ${salidas ? 'grid-cols-2' : 'sm:grid-cols-3'}`}>
          <label className="block text-sm font-semibold text-slate-700">
            Hora de salida
            <input
              type="time"
              required
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="cifras mt-1 h-12 w-full rounded-xl border border-slate-300 px-3 text-lg"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Sale por el tee
            {/* Del 1 al 18: en las salidas a tiro cada partida empieza en un hoyo distinto. */}
            <select
              value={hoyoSalida}
              onChange={(e) => setHoyoSalida(Number(e.target.value))}
              className="mt-1 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg font-bold"
            >
              {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>
                  Tee {h}
                </option>
              ))}
            </select>
          </label>
          <label className={`block text-sm font-semibold text-slate-700 ${salidas ? 'hidden' : ''}`}>
            Nombre (opcional)
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej.: Torneo socios"
              className="mt-1 h-12 w-full rounded-xl border border-slate-300 px-3"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Jugadores</h3>
          <div role="radiogroup" aria-label="Número de jugadores" className="inline-flex rounded-xl bg-slate-100 p-1">
            {Array.from({ length: MAX_JUGADORES }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={filas.length === n}
                onClick={() =>
                  setFilas((actuales) => Array.from({ length: n }, (_, k) => actuales[k] ?? filaVacia()))
                }
                className={`min-h-11 min-w-11 rounded-lg px-3 text-lg font-bold ${
                  filas.length === n ? 'bg-campo-700 text-white shadow' : 'text-slate-600 hover:bg-white'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-2 text-xs text-slate-500">Los nombres son opcionales.</p>
        <ul className="space-y-3">
          {filas.map((fila, i) => (
            <li key={i} className="rounded-xl border border-slate-200 p-3">
              <div className="flex gap-2">
                <input
                  value={fila.nombre}
                  onChange={(e) => cambiarFila(i, { nombre: e.target.value })}
                  placeholder={`Jugador ${i + 1} (nombre opcional)`}
                  aria-label={`Nombre del jugador ${i + 1}`}
                  className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3"
                />
                {filas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setFilas((actuales) => actuales.filter((_, k) => k !== i))}
                    className="h-11 rounded-lg px-3 text-slate-500 hover:bg-slate-100"
                    aria-label={`Quitar jugador ${i + 1}`}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="mt-2">
                <SelectorAlquiler
                  etiqueta={fila.nombre || `jugador ${i + 1}`}
                  aviso={avisoAlquilerOcupado(partidas, fila.alquiler.tipo, numeroValido(fila.alquiler.numero))}
                  valor={fila.alquiler}
                  onCambiar={(alquiler) => cambiarFila(i, { alquiler })}
                />
              </div>
            </li>
          ))}
        </ul>
        {filas.length < MAX_JUGADORES && (
          <button
            type="button"
            onClick={() => setFilas((actuales) => [...actuales, filaVacia()])}
            className="mt-3 min-h-11 rounded-lg px-3 font-semibold text-campo-700 hover:bg-campo-50"
          >
            + Añadir jugador
          </button>
        )}

        {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

        {/* Botones siempre a la vista, aunque la lista de jugadores sea larga */}
        <div className="sticky bottom-0 -mx-5 mt-4 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
          <button type="button" onClick={onCerrar} className="min-h-12 rounded-xl px-5 font-semibold text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button type="submit" className="min-h-12 rounded-xl bg-campo-700 px-6 font-bold text-white shadow hover:bg-campo-800">
            {salidas ? 'Apuntar salida' : 'Crear partida'}
          </button>
        </div>
      </form>
    </div>
  );
}
