/**
 * Informe de ritmo de un torneo SIN NOMBRES de jugadores: para enviar al organizador o
 * archivar. Cada partida se identifica por su número, hora de salida y tee.
 * Incluye todas las vistas del Marshal, las observaciones (con los nombres quitados),
 * el ritmo real, la duración de la vuelta y una conclusión. Se puede imprimir o guardar en PDF.
 */
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Cabecera, EstadoBadge, Seccion } from '../componentes/basicos';
import { estiloDe } from '../componentes/estilos';
import { EditorOrganizador } from '../componentes/Organizador';
import { RetrasoPorHoyo } from '../componentes/RetrasoPorHoyo';
import { useDatos, usePartidasDeTorneo } from '../datos/DatosProvider';
import { csvRitmoPartidas, csvRitmoVistas, descargarCsv, nombreArchivo } from '../lib/exportar';
import { hhmm } from '../lib/hora';
import {
  OBJETIVO_MIN_HOYO,
  conclusionTorneo,
  estadoDeRitmo,
  resumirRitmoTorneo,
  textoDuracion,
  textoRitmo,
  type RitmoPartida,
} from '../lib/informes';
import { NOMBRE_POSICION, clasificarRetraso, duracionVueltaMin, textoRetraso } from '../lib/ritmo';
import { fechaLarga } from '../lib/textos';

const textoMin = (n: number | null) => (n === null ? '—' : textoRetraso(n));

function textoEvolucion(n: number | null): string {
  if (n === null) return '—';
  const r = Math.round(n);
  if (r > 0) return `perdió ${r} min`;
  if (r < 0) return `recuperó ${-r} min`;
  return 'igual';
}

export function InformeRitmo() {
  const { id } = useParams();
  const { torneos } = useDatos();
  const torneo = torneos.find((t) => t.id === id) ?? null;
  const { partidas, cargando } = usePartidasDeTorneo(torneo?.id);

  if (!torneo) {
    return (
      <div className="min-h-dvh">
        <Cabecera titulo="Informe de ritmo" volverA="/torneos" />
        <p className="p-8 text-center text-slate-500">
          Este torneo no existe.{' '}
          <Link to="/torneos" className="font-semibold text-campo-700 underline">
            Ver torneos
          </Link>
        </p>
      </div>
    );
  }

  const r = resumirRitmoTorneo(partidas);
  const colorRitmo = estiloDe(estadoDeRitmo(r.minutosPorHoyo)).texto;

  return (
    <div className="min-h-dvh pb-10">
      <Cabecera titulo="Informe de ritmo" volverA={`/torneos/${torneo.id}`} />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <header className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Informe de ritmo · sin nombres de jugadores</p>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{torneo.nombre}</h1>
          <p className="font-semibold text-slate-700">{fechaLarga(torneo.fecha)}</p>
          <EditorOrganizador torneo={torneo} />
          <p className="text-sm text-slate-500">
            Objetivo: {textoRitmo(OBJETIVO_MIN_HOYO)} · vuelta de {textoDuracion(duracionVueltaMin())}.
          </p>
        </header>

        <div className="no-imprimir flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-11 rounded-xl bg-campo-700 px-4 font-bold text-white hover:bg-campo-800"
          >
            🖨 Imprimir / guardar PDF
          </button>
          <button
            type="button"
            disabled={!r.numPartidas}
            onClick={() => void descargarCsv(nombreArchivo(torneo, 'ritmo-partidas'), csvRitmoPartidas(torneo, r))}
            className="min-h-11 rounded-xl border-2 border-campo-700 bg-white px-4 font-bold text-campo-800 hover:bg-campo-50 disabled:opacity-40"
          >
            ⬇ Excel: partidas
          </button>
          <button
            type="button"
            disabled={!r.vistas}
            onClick={() => void descargarCsv(nombreArchivo(torneo, 'ritmo-vistas'), csvRitmoVistas(torneo, r))}
            className="min-h-11 rounded-xl border-2 border-campo-700 bg-white px-4 font-bold text-campo-800 hover:bg-campo-50 disabled:opacity-40"
          >
            ⬇ Excel: todas las vistas
          </button>
          <Link
            to="/organizadores"
            className="inline-flex min-h-11 items-center rounded-xl px-3 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Comparar organizadores ›
          </Link>
        </div>

        {cargando ? (
          <p className="text-slate-500">Cargando…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              <Dato titulo="Partidas" valor={r.numPartidas} detalle={`${r.partidasVistas} con vistas`} />
              <Dato titulo="Jugadores" valor={r.jugadores} />
              <Dato titulo="Vistas" valor={r.vistas} />
              <Dato titulo="Ritmo medio" valor={textoRitmo(r.minutosPorHoyo).replace(' min/hoyo', '')} detalle="min por hoyo" color={colorRitmo} />
              <Dato titulo="Duración media" valor={textoDuracion(r.duracionMedia)} color={colorRitmo} />
              <Dato
                titulo="Retraso final"
                valor={textoMin(r.retrasoMedioFinal)}
                detalle="medio"
                color={r.retrasoMedioFinal === null ? undefined : estiloDe(clasificarRetraso(r.retrasoMedioFinal)).texto}
              />
              <Dato titulo="Verde · ámbar · rojo" valor={`${r.enVerde} · ${r.enAmbar} · ${r.enRojo}`} detalle="al final" />
              <Dato titulo="Avisadas" valor={r.avisadas} detalle={`${r.llegaronARojo} llegaron a rojo`} />
            </div>

            <Seccion titulo="Conclusión">
              <ul className="list-disc space-y-1 pl-5 text-slate-800">
                {conclusionTorneo(r).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </Seccion>

            <Seccion titulo="Retraso medio por hoyo">
              <RetrasoPorHoyo porHoyo={r.porHoyo} />
            </Seccion>

            {r.masLentas.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <Seccion titulo="Partidas más lentas">
                  <ListaCorta partidas={r.masLentas} />
                </Seccion>
                <Seccion titulo="Partidas más rápidas">
                  <ListaCorta partidas={r.masRapidas} />
                </Seccion>
              </div>
            )}

            <Seccion titulo="Todas las partidas">
              <div className="tabla-informe-contenedor -mx-4 overflow-x-auto px-4">
                <table className="tabla-informe w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <Th>Partida</Th>
                      <Th>Salida</Th>
                      <Th>Tee</Th>
                      <Th>Jug.</Th>
                      <Th>Vistas</Th>
                      <Th>Ritmo</Th>
                      <Th>Duración</Th>
                      <Th>Retraso medio</Th>
                      <Th>Peor</Th>
                      <Th>Evolución</Th>
                      <Th>Al final</Th>
                    </tr>
                  </thead>
                  <tbody className="cifras divide-y divide-slate-100">
                    {r.partidas.map((p) => (
                      <tr key={p.id} className={p.vistas.length ? '' : 'text-slate-400'}>
                        <td className="whitespace-nowrap py-2 pr-3 font-bold">{p.etiqueta}</td>
                        <td className="py-2 pr-3">{hhmm(p.horaSalida)}</td>
                        <td className="py-2 pr-3">{p.hoyoSalida}</td>
                        <td className="py-2 pr-3">{p.jugadores}</td>
                        <td className="py-2 pr-3">{p.vistas.length}</td>
                        <td className={`py-2 pr-3 font-semibold ${estiloDe(estadoDeRitmo(p.minutosPorHoyo)).texto}`}>
                          {textoRitmo(p.minutosPorHoyo).replace(' min/hoyo', '')}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3">
                          {textoDuracion(p.duracionMin)}
                          {p.duracionMin !== null && !p.duracionReal && <span className="text-slate-400"> (est.)</span>}
                        </td>
                        <td className="py-2 pr-3">{textoMin(p.retrasoMedio)}</td>
                        <td className="py-2 pr-3">{textoMin(p.peorRetraso)}</td>
                        <td className="py-2 pr-3">{textoEvolucion(p.evolucion)}</td>
                        <td className="py-2">
                          <EstadoBadge estado={p.estadoFinal} retraso={p.retrasoFinal ?? undefined} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Ritmo en minutos por hoyo. Duración: real si la partida se marcó como terminada; si no, estimada con su ritmo (est.).
              </p>
            </Seccion>

            <Seccion titulo="Detalle de cada partida: vistas y observaciones">
              <div className="grid items-start gap-3 md:grid-cols-2">
                {r.partidas.map((p) => (
                  <DetallePartida key={p.id} p={p} />
                ))}
              </div>
            </Seccion>

            <p className="text-xs text-slate-500">
              <strong>Cómo se calcula:</strong> en cada vista se compara el tiempo que llevaban jugando con el que deberían llevar
              para estar en ese punto del campo a {textoRitmo(OBJETIVO_MIN_HOYO)}. Con la última vista se calcula el ritmo de la
              partida y la duración de su vuelta. Colores del retraso: verde hasta +5 min, ámbar de +6 a +14 y rojo desde +15.
              Los nombres que aparecían en las observaciones se han cambiado por «[jugador]».
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="py-2 pr-3 font-semibold">{children}</th>;
}

function Dato({ titulo, valor, detalle, color = 'text-slate-900' }: { titulo: string; valor: number | string; detalle?: string; color?: string }) {
  return (
    <div className="salto-evitar rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{titulo}</span>
      <span className={`cifras block text-xl font-black ${color}`}>{valor}</span>
      {detalle && <span className="block text-[11px] text-slate-500">{detalle}</span>}
    </div>
  );
}

function ListaCorta({ partidas }: { partidas: RitmoPartida[] }) {
  return (
    <ol className="divide-y divide-slate-100">
      {partidas.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
          <span>
            <strong>{p.etiqueta}</strong> · salida {hhmm(p.horaSalida)} · tee {p.hoyoSalida}
          </span>
          <span className={`cifras font-bold ${estiloDe(estadoDeRitmo(p.minutosPorHoyo)).texto}`}>
            {textoRitmo(p.minutosPorHoyo)} · {textoDuracion(p.duracionMin)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function DetallePartida({ p }: { p: RitmoPartida }) {
  return (
    <article className="salto-evitar rounded-xl border border-slate-200 p-3">
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold text-slate-900">
          {p.etiqueta} · {hhmm(p.horaSalida)} · tee {p.hoyoSalida}
        </h3>
        <span className="text-xs text-slate-500">
          {p.jugadores} jug.{p.buggies ? ` · ${p.buggies} en buggy` : ''}
          {p.carros ? ` · ${p.carros} con carro` : ''} · {textoRitmo(p.minutosPorHoyo)}
        </span>
      </header>
      {p.vistas.length === 0 ? (
        <p className="text-sm text-slate-500">Sin vistas del Marshal.</p>
      ) : (
        <ol className="cifras divide-y divide-slate-100 text-sm">
          {p.vistas.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5">
              <span className="w-11 font-bold">{hhmm(v.visto_en)}</span>
              <span className="min-w-0 flex-1">
                Hoyo {v.hoyo} · {NOMBRE_POSICION[v.posicion]}
                {v.revision_iniciada_en && (
                  <span className="text-xs text-slate-500"> · ronda desde las {hhmm(v.revision_iniciada_en)}</span>
                )}
              </span>
              <EstadoBadge estado={v.estado} retraso={v.retraso_min} />
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
        <span className="font-semibold">Observaciones: </span>
        {p.observaciones || 'ninguna.'}
      </p>
      {p.duracionReal && p.duracionMin !== null && (
        <p className="mt-1 text-xs text-slate-500">Vuelta terminada en {textoDuracion(p.duracionMin)}.</p>
      )}
    </article>
  );
}
