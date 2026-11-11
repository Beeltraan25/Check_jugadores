/**
 * Corregir la hora de salida o el tee de una partida ya creada (salió más tarde, se apuntó
 * mal…). Al guardar, los retrasos de todas sus vistas se recalculan solos.
 */
import { useState, type FormEvent } from 'react';
import { useDatos } from '../datos/DatosProvider';
import type { Partida } from '../datos/tipos';
import { combinarFechaHora } from '../lib/hora';

const horaLocal = (iso: string) => new Date(iso).toTimeString().slice(0, 5);

export function EditorSalida({ partida }: { partida: Partida }) {
  const { ejecutar } = useDatos();
  const [abierto, setAbierto] = useState(false);
  const [hora, setHora] = useState(() => horaLocal(partida.hora_salida));
  const [tee, setTee] = useState(partida.hoyo_salida);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => {
          setHora(horaLocal(partida.hora_salida));
          setTee(partida.hoyo_salida);
          setAbierto(true);
        }}
        className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Corregir hora o tee
      </button>
    );
  }

  const guardar = (e: FormEvent) => {
    e.preventDefault();
    void ejecutar({
      tipo: 'actualizar_partida',
      partidaId: partida.id,
      cambios: { hora_salida: combinarFechaHora(partida.fecha, hora), hoyo_salida: tee },
    });
    setAbierto(false);
  };

  return (
    <form onSubmit={guardar} className="flex w-full flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <label className="text-sm font-semibold text-slate-700">
        Hora de salida
        <input
          type="time"
          required
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          className="cifras mt-1 block h-11 rounded-lg border border-slate-300 bg-white px-3 text-lg"
        />
      </label>
      <label className="text-sm font-semibold text-slate-700">
        Tee
        <select
          value={tee}
          onChange={(e) => setTee(Number(e.target.value))}
          className="mt-1 block h-11 rounded-lg border border-slate-300 bg-white px-3 text-lg font-bold"
        >
          {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="min-h-11 rounded-lg bg-campo-700 px-4 font-bold text-white hover:bg-campo-800">
        Guardar
      </button>
      <button type="button" onClick={() => setAbierto(false)} className="min-h-11 rounded-lg px-3 font-semibold text-slate-600 hover:bg-slate-100">
        Cancelar
      </button>
      <p className="w-full text-xs text-slate-500">Los retrasos de las vistas ya registradas se recalculan con la nueva salida.</p>
    </form>
  );
}
