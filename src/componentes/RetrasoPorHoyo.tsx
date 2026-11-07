/** Rejilla de los 18 hoyos con el retraso medio de las vistas en cada uno (dónde se atasca el campo). */
import { clasificarRetraso, textoRetraso } from '../lib/ritmo';
import { estiloDe } from './estilos';

export function RetrasoPorHoyo({ porHoyo }: { porHoyo: { hoyo: number; vistas: number; retrasoMedio: number | null }[] }) {
  if (porHoyo.every((h) => h.vistas === 0)) return <p className="text-sm text-slate-500">Sin vistas todavía.</p>;
  return (
    <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-9">
      {porHoyo.map(({ hoyo, vistas, retrasoMedio }) => {
        const estilo = retrasoMedio === null ? null : estiloDe(clasificarRetraso(retrasoMedio));
        return (
          <li
            key={hoyo}
            className={`rounded-lg border px-2 py-1.5 text-center ${estilo ? estilo.suave : 'border-slate-100 bg-slate-50 text-slate-400'}`}
          >
            <span className="block text-xs font-semibold">Hoyo {hoyo}</span>
            <span className="cifras block text-base font-black">{retrasoMedio === null ? '—' : textoRetraso(retrasoMedio)}</span>
            <span className="block text-[10px] opacity-75">{vistas === 1 ? '1 vista' : `${vistas} vistas`}</span>
          </li>
        );
      })}
    </ul>
  );
}
