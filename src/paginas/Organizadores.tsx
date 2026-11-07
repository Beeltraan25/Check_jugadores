/**
 * Comparativa de organizadores: junta todos sus torneos y ordena del que juega más rápido
 * al más lento (minutos por hoyo de media de todas sus partidas). Sin nombres de jugadores.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Cabecera, Seccion } from '../componentes/basicos';
import { estiloDe } from '../componentes/estilos';
import { useDatos } from '../datos/DatosProvider';
import type { Partida } from '../datos/tipos';
import { csvOrganizadores, descargarCsv } from '../lib/exportar';
import {
  OBJETIVO_MIN_HOYO,
  SIN_ORGANIZADOR,
  compararOrganizadores,
  estadoDeRitmo,
  textoDuracion,
  textoRitmo,
  type ResumenOrganizador,
} from '../lib/informes';
import { clasificarRetraso, textoRetraso } from '../lib/ritmo';
import { fechaLarga } from '../lib/textos';

/** Con menos partidas medidas que esto, la comparación es poco fiable. */
const MINIMO_PARTIDAS_FIABLE = 10;

export function Organizadores() {
  const { torneos, cargarPartidasDeVarios, revision } = useDatos();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [incluirAbiertos, setIncluirAbiertos] = useState(true);
  const [partidas, setPartidas] = useState<Partida[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const elegidos = useMemo(
    () =>
      torneos.filter(
        (t) => (!desde || t.fecha >= desde) && (!hasta || t.fecha <= hasta) && (incluirAbiertos || t.cerrado_en),
      ),
    [torneos, desde, hasta, incluirAbiertos],
  );
  const clave = elegidos.map((t) => t.id).join(',');

  useEffect(() => {
    let vigente = true;
    setPartidas(null);
    cargarPartidasDeVarios(elegidos.map((t) => t.id))
      .then((p) => vigente && (setPartidas(p), setError(null)))
      .catch((e: Error) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
    // `clave` resume la lista de torneos elegidos; `revision` recarga si llegan datos nuevos.
  }, [clave, revision, cargarPartidasDeVarios]);

  const ranking = useMemo(() => {
    if (!partidas) return [];
    return compararOrganizadores(elegidos.map((torneo) => ({ torneo, partidas: partidas.filter((p) => p.torneo_id === torneo.id) })));
  }, [partidas, elegidos]);

  const conDatos = ranking.filter((o) => o.minutosPorHoyo !== null);
  const masRapido = conDatos[0];
  const masLento = conDatos.length > 1 ? conDatos[conDatos.length - 1] : undefined;
  const sinOrganizador = elegidos.filter((t) => !t.organizador.trim()).length;

  return (
    <div className="min-h-dvh pb-10">
      <Cabecera titulo="Comparar organizadores" volverA="/torneos" />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <header className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Informe de ritmo por organizador · sin nombres</p>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">¿Qué organizador juega más rápido?</h1>
          <p className="text-sm text-slate-600">
            {elegidos.length} torneos
            {desde || hasta ? ` (${desde ? `desde ${desde}` : ''}${desde && hasta ? ' ' : ''}${hasta ? `hasta ${hasta}` : ''})` : ''} ·
            objetivo {textoRitmo(OBJETIVO_MIN_HOYO)}
          </p>
        </header>

        <div className="no-imprimir flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-700">
            Desde
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-1 block h-11 rounded-lg border border-slate-300 px-3" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Hasta
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="mt-1 block h-11 rounded-lg border border-slate-300 px-3" />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={incluirAbiertos} onChange={(e) => setIncluirAbiertos(e.target.checked)} className="h-5 w-5" />
            Incluir torneos abiertos
          </label>
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} className="min-h-11 rounded-xl bg-campo-700 px-4 font-bold text-white hover:bg-campo-800">
              🖨 Imprimir / PDF
            </button>
            <button
              type="button"
              disabled={!ranking.length}
              onClick={() => void descargarCsv(`organizadores_${new Date().toISOString().slice(0, 10)}.csv`, csvOrganizadores(ranking))}
              className="min-h-11 rounded-xl border-2 border-campo-700 bg-white px-4 font-bold text-campo-800 hover:bg-campo-50 disabled:opacity-40"
            >
              ⬇ Excel
            </button>
          </div>
        </div>

        {sinOrganizador > 0 && (
          <p className="no-imprimir rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            {sinOrganizador === 1 ? 'Hay 1 torneo' : `Hay ${sinOrganizador} torneos`} sin organizador: salen juntos como «{SIN_ORGANIZADOR}».
            Puedes indicarlo en <Link to="/torneos" className="font-semibold underline">Torneos</Link> o en su informe.
          </p>
        )}

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">No se pudieron cargar los datos: {error}</p>}
        {!partidas && !error && <p className="text-slate-500">Cargando torneos…</p>}

        {partidas && conDatos.length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-center text-slate-500">Aún no hay vistas suficientes en estos torneos para comparar.</p>
        )}

        {masRapido && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Destacado titulo="Más rápido" organizador={masRapido} tono="border-emerald-300 bg-emerald-50 text-emerald-950" />
            {masLento && <Destacado titulo="Más lento" organizador={masLento} tono="border-red-300 bg-red-50 text-red-950" />}
          </div>
        )}

        {ranking.length > 0 && (
          <Seccion titulo="Ranking (del más rápido al más lento)">
            <ol className="space-y-3">
              {ranking.map((o, i) => (
                <FilaOrganizador key={o.nombre} o={o} puesto={o.minutosPorHoyo === null ? null : i + 1} />
              ))}
            </ol>
          </Seccion>
        )}

        <p className="text-xs text-slate-500">
          <strong>Cómo se compara:</strong> para cada partida se calcula su ritmo real (minutos por hoyo) con la última vista del
          Marshal; el ritmo de un organizador es la media de todas sus partidas, de todos sus torneos. «% en rojo» son las partidas
          que en algún momento fueron 15 min o más tarde. Con menos de {MINIMO_PARTIDAS_FIABLE} partidas medidas el resultado es
          orientativo.
        </p>
      </main>
    </div>
  );
}

function Destacado({ titulo, organizador, tono }: { titulo: string; organizador: ResumenOrganizador; tono: string }) {
  return (
    <div className={`salto-evitar rounded-2xl border-2 p-4 ${tono}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-80">{titulo}</p>
      <p className="text-xl font-black">{organizador.nombre}</p>
      <p className="cifras text-sm">
        {textoRitmo(organizador.minutosPorHoyo)} · vuelta de {textoDuracion(organizador.duracionMedia)} · {organizador.torneos.length}{' '}
        {organizador.torneos.length === 1 ? 'torneo' : 'torneos'}
      </p>
    </div>
  );
}

function FilaOrganizador({ o, puesto }: { o: ResumenOrganizador; puesto: number | null }) {
  const colorRitmo = estiloDe(estadoDeRitmo(o.minutosPorHoyo)).texto;
  return (
    <li className="salto-evitar rounded-xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="cifras w-8 text-2xl font-black text-slate-400">{puesto ?? '–'}</span>
        <span className="min-w-0 flex-1 text-lg font-bold text-slate-900">{o.nombre}</span>
        {o.partidasConRitmo < MINIMO_PARTIDAS_FIABLE && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Pocos datos</span>
        )}
      </div>
      <dl className="cifras mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4 lg:grid-cols-7">
        <Medida etiqueta="Ritmo medio" valor={textoRitmo(o.minutosPorHoyo)} color={colorRitmo} />
        <Medida etiqueta="Vuelta media" valor={textoDuracion(o.duracionMedia)} color={colorRitmo} />
        <Medida
          etiqueta="Retraso final medio"
          valor={o.retrasoMedioFinal === null ? '—' : textoRetraso(o.retrasoMedioFinal)}
          color={o.retrasoMedioFinal === null ? undefined : estiloDe(clasificarRetraso(o.retrasoMedioFinal)).texto}
        />
        <Medida etiqueta="% en rojo" valor={o.porcentajeRojo === null ? '—' : `${Math.round(o.porcentajeRojo)} %`} />
        <Medida etiqueta="Torneos" valor={String(o.torneos.length)} />
        <Medida etiqueta="Partidas (medidas)" valor={`${o.numPartidas} (${o.partidasConRitmo})`} />
        <Medida etiqueta="Avisadas" valor={String(o.avisadas)} />
      </dl>
      <details className="mt-2">
        <summary className="no-imprimir cursor-pointer text-sm font-semibold text-campo-700">Ver sus torneos</summary>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {o.torneos.map(({ torneo, resumen }) => (
            <li key={torneo.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
              <span>
                <strong>{torneo.nombre}</strong> · {fechaLarga(torneo.fecha)} · {resumen.numPartidas} partidas
              </span>
              <span className="cifras flex items-center gap-3">
                <span className={`font-semibold ${estiloDe(estadoDeRitmo(resumen.minutosPorHoyo)).texto}`}>
                  {textoRitmo(resumen.minutosPorHoyo)}
                </span>
                <Link to={`/torneos/${torneo.id}/ritmo`} className="no-imprimir font-semibold text-campo-700 underline">
                  Informe
                </Link>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

function Medida({ etiqueta, valor, color = 'text-slate-900' }: { etiqueta: string; valor: string; color?: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</dt>
      <dd className={`font-bold ${color}`}>{valor}</dd>
    </div>
  );
}
