/** Alta de una partida nueva (hora de salida, tee, jugadores y alquileres). */
import { useState, type FormEvent } from 'react';
import { useDatos } from '../datos/DatosProvider';
import type { Jugador, Partida, Torneo } from '../datos/tipos';
import { combinarFechaHora } from '../lib/hora';
import { nuevoId } from '../lib/ids';
import { avisoAlquilerOcupado } from '../lib/partidas';
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

/** Alta de una partida dentro del torneo indicado. */
export function FormularioPartida({ torneo, onCerrar }: { torneo: Torneo; onCerrar: () => void }) {
  const { ejecutar, partidas } = useDatos();
  const fecha = torneo.fecha;
  const [hora, setHora] = useState(proximaSalida);
  const [hoyoSalida, setHoyoSalida] = useState(1);
  const [nombre, setNombre] = useState('');
  const [filas, setFilas] = useState<FilaFormulario[]>([filaVacia(), filaVacia()]);
  const [error, setError] = useState<string | null>(null);

  const cambiarFila = (i: number, cambio: Partial<FilaFormulario>) =>
    setFilas((actuales) => actuales.map((f, k) => (k === i ? { ...f, ...cambio } : f)));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const conNombre = filas.filter((f) => f.nombre.trim());
    if (conNombre.length === 0) {
      setError('Añade al menos un jugador.');
      return;
    }
    const partidaId = nuevoId();
    const jugadores: Jugador[] = conNombre.map((f, orden) => {
      const jugadorId = nuevoId();
      return {
        id: jugadorId,
        partida_id: partidaId,
        nombre: f.nombre.trim(),
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
          Nueva partida
        </h2>
        <p className="mb-4 text-sm text-slate-500">{torneo.nombre}</p>

        <div className="grid gap-4 sm:grid-cols-3">
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
          <label className="block text-sm font-semibold text-slate-700">
            Nombre (opcional)
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej.: Torneo socios"
              className="mt-1 h-12 w-full rounded-xl border border-slate-300 px-3"
            />
          </label>
        </div>

        <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">Jugadores y alquileres</h3>
        <ul className="space-y-3">
          {filas.map((fila, i) => (
            <li key={i} className="rounded-xl border border-slate-200 p-3">
              <div className="flex gap-2">
                <input
                  value={fila.nombre}
                  onChange={(e) => cambiarFila(i, { nombre: e.target.value })}
                  placeholder={`Jugador ${i + 1}`}
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

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="min-h-12 rounded-xl px-5 font-semibold text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button type="submit" className="min-h-12 rounded-xl bg-campo-700 px-6 font-bold text-white shadow hover:bg-campo-800">
            Crear partida
          </button>
        </div>
      </form>
    </div>
  );
}
