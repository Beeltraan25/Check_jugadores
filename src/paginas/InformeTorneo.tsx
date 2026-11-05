/**
 * Informe de un torneo: todo lo que se registró (partidas, jugadores, alquileres,
 * avistamientos y observaciones), resumen del ritmo y exportación a Excel (CSV).
 */
import { Link, useNavigate, useParams } from 'react-router';
import { ResumenAlquileres } from '../componentes/Alquileres';
import { Cabecera, EstadoBadge, Seccion } from '../componentes/basicos';
import { estiloDe } from '../componentes/estilos';
import { HistorialAvistamientos } from '../componentes/Historial';
import { useDatos, usePartidasDeTorneo } from '../datos/DatosProvider';
import type { Partida } from '../datos/tipos';
import { hhmm } from '../lib/hora';
import { csvAvistamientos, csvPartidas, descargarCsv, nombreArchivo } from '../lib/exportar';
import { etiquetaPartida, nombresJugadores } from '../lib/partidas';
import { CONFIG_RITMO, NOMBRE_POSICION, clasificarRetraso, textoRetraso } from '../lib/ritmo';
import { fechaLarga } from '../lib/textos';

const peorRetraso = (p: Partida) => (p.avistamientos.length ? Math.max(...p.avistamientos.map((a) => a.retraso_min)) : null);

export function InformeTorneo() {
  const { id } = useParams();
  const { torneos, torneo: enUso, elegirTorneo } = useDatos();
  const navegar = useNavigate();
  const torneo = torneos.find((t) => t.id === id) ?? null;
  const { partidas, cargando } = usePartidasDeTorneo(torneo?.id);

  if (!torneo) {
    return (
      <div className="min-h-dvh">
        <Cabecera titulo="Informe" volverA="/torneos" />
        <p className="p-8 text-center text-slate-500">
          Este torneo no existe.{' '}
          <Link to="/torneos" className="font-semibold text-campo-700 underline">
            Ver torneos
          </Link>
        </p>
      </div>
    );
  }

  const jugadores = partidas.flatMap((p) => p.jugadores);
  const avistamientos = partidas.flatMap((p) => p.avistamientos);
  const conDatos = partidas.filter((p) => p.avistamientos.length);
  const retrasoMedio = conDatos.length
    ? conDatos.reduce((s, p) => s + p.avistamientos.at(-1)!.retraso_min, 0) / conDatos.length
    : null;
  const enRojo = partidas.filter((p) => p.avistamientos.some((a) => a.estado === 'retrasado')).length;
  const buggies = jugadores.filter((j) => j.alquiler?.tipo === 'buggy').length;
  const carros = jugadores.filter((j) => j.alquiler?.tipo === 'carro_electrico').length;

  // Retraso medio por hoyo: ayuda a ver en qué hoyos se atasca el campo.
  const porHoyo = Array.from({ length: CONFIG_RITMO.minutosPorHoyo.length }, (_, i) => {
    const delHoyo = avistamientos.filter((a) => a.hoyo === i + 1);
    return {
      hoyo: i + 1,
      n: delHoyo.length,
      media: delHoyo.length ? delHoyo.reduce((s, a) => s + a.retraso_min, 0) / delHoyo.length : null,
    };
  });

  return (
    <div className="min-h-dvh pb-10">
      <Cabecera titulo={torneo.nombre} volverA="/torneos" />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-slate-800">{fechaLarga(torneo.fecha)}</p>
            <p className="text-sm text-slate-500">
              {torneo.cerrado_en ? `Cerrado a las ${hhmm(torneo.cerrado_en)}` : 'Abierto'}
              {torneo.id === enUso?.id && ' · en uso en este dispositivo'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {torneo.id !== enUso?.id && (
              <button
                type="button"
                onClick={() => {
                  elegirTorneo(torneo.id);
                  navegar('/oficina');
                }}
                className="min-h-11 rounded-xl bg-campo-700 px-4 font-bold text-white hover:bg-campo-800"
              >
                Usar este torneo
              </button>
            )}
            <button
              type="button"
              disabled={!partidas.length}
              onClick={() => descargarCsv(nombreArchivo(torneo, 'partidas'), csvPartidas(torneo, partidas))}
              className="min-h-11 rounded-xl border-2 border-campo-700 bg-white px-4 font-bold text-campo-800 hover:bg-campo-50 disabled:opacity-40"
            >
              ⬇ Excel: partidas
            </button>
            <button
              type="button"
              disabled={!avistamientos.length}
              onClick={() => descargarCsv(nombreArchivo(torneo, 'tiempos'), csvAvistamientos(torneo, partidas))}
              className="min-h-11 rounded-xl border-2 border-campo-700 bg-white px-4 font-bold text-campo-800 hover:bg-campo-50 disabled:opacity-40"
            >
              ⬇ Excel: tiempos
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Dato titulo="Partidas" valor={partidas.length} />
          <Dato titulo="Jugadores" valor={jugadores.length} />
          <Dato titulo="Avistamientos" valor={avistamientos.length} />
          <Dato
            titulo="Retraso medio"
            valor={retrasoMedio === null ? '—' : textoRetraso(retrasoMedio)}
            color={retrasoMedio !== null && retrasoMedio > CONFIG_RITMO.tolerancia ? 'text-red-700' : 'text-emerald-700'}
          />
          <Dato titulo="Llegaron a rojo" valor={enRojo} color={enRojo ? 'text-red-700' : 'text-slate-900'} />
          <Dato titulo="Buggies · carros" valor={`${buggies} · ${carros}`} />
        </div>

        <Seccion titulo="Retraso medio por hoyo">
          {avistamientos.length === 0 ? (
            <p className="text-sm text-slate-500">Sin avistamientos todavía.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-9">
              {porHoyo.map(({ hoyo, n, media }) => {
                // Se clasifica el valor redondeado para que color y número cuadren.
                const estilo = media === null ? null : estiloDe(clasificarRetraso(Math.round(media)));
                return (
                  <li
                    key={hoyo}
                    className={`rounded-lg border px-2 py-1.5 text-center ${estilo ? estilo.suave : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                  >
                    <span className="block text-xs font-semibold">Hoyo {hoyo}</span>
                    <span className="cifras block text-base font-black">{media === null ? '—' : textoRetraso(media)}</span>
                    <span className="block text-[10px] opacity-75">{n === 1 ? '1 vista' : `${n} vistas`}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Seccion>

        <Seccion titulo="Partidas">
          {cargando ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : partidas.length === 0 ? (
            <p className="text-sm text-slate-500">Este torneo no tiene partidas.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {partidas.map((p) => {
                const ultimo = p.avistamientos.at(-1);
                const peor = peorRetraso(p);
                return (
                  <li key={p.id}>
                    <details className="group py-3">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="cifras w-24 text-lg font-bold text-slate-900">{etiquetaPartida(p)}</span>
                        <span className="min-w-0 flex-1 text-sm text-slate-700">
                          {nombresJugadores(p)}
                          <span className="mt-1 flex flex-wrap gap-1">
                            <ResumenAlquileres partida={p} />
                          </span>
                        </span>
                        <span className="text-xs text-slate-500">
                          {p.avistamientos.length === 1 ? '1 vista' : `${p.avistamientos.length} vistas`}
                          {ultimo && ` · última H${ultimo.hoyo} ${NOMBRE_POSICION[ultimo.posicion]} ${hhmm(ultimo.visto_en)}`}
                        </span>
                        {peor !== null ? (
                          <span title="Peor momento de la vuelta">
                            <EstadoBadge estado={clasificarRetraso(peor)} retraso={peor} />
                          </span>
                        ) : (
                          <EstadoBadge estado={null} />
                        )}
                        <span className="text-slate-400 transition group-open:rotate-90" aria-hidden>
                          ›
                        </span>
                      </summary>
                      <div className="mt-3 grid gap-4 rounded-xl bg-slate-50 p-3 md:grid-cols-2">
                        <div>
                          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Avistamientos</h3>
                          <HistorialAvistamientos partida={p} />
                        </div>
                        <div>
                          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Observaciones</h3>
                          <p className="whitespace-pre-wrap text-sm text-slate-700">{p.observaciones || 'Sin observaciones.'}</p>
                          {p.terminada_en && (
                            <p className="mt-2 text-sm text-slate-500">Terminada a las {hhmm(p.terminada_en)}.</p>
                          )}
                        </div>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </Seccion>
      </main>
    </div>
  );
}

function Dato({ titulo, valor, color = 'text-slate-900' }: { titulo: string; valor: number | string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</span>
      <span className={`cifras block text-2xl font-black ${color}`}>{valor}</span>
    </div>
  );
}
