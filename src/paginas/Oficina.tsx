/**
 * Panel del Caddy Master (oficina): mapa del campo en el centro con un pin por partida,
 * indicadores del día, lista de partidas y ficha de la seleccionada. Todo en tiempo real.
 */
import { useEffect, useState } from 'react';
import { EditorAlquileres } from '../componentes/Alquileres';
import { Cabecera, EstadoBadge, Seccion } from '../componentes/basicos';
import { FormularioPartida } from '../componentes/FormularioPartida';
import { HistorialAvistamientos } from '../componentes/Historial';
import { LeyendaMapa, MapaCampo } from '../componentes/MapaCampo';
import { EditorObservaciones } from '../componentes/Observaciones';
import { RegistroAvistamiento } from '../componentes/RegistroAvistamiento';
import { TarjetaPartida } from '../componentes/TarjetaPartida';
import { useDatos } from '../datos/DatosProvider';
import type { Partida } from '../datos/tipos';
import { useAhora } from '../hooks/useAhora';
import { haceCuanto, hhmm } from '../lib/hora';
import {
  etiquetaPartida,
  nombresJugadores,
  normalizarBusqueda,
  resumirPartida,
  textoBusqueda,
  tituloPartida,
  type ResumenPartida,
} from '../lib/partidas';
import { NOMBRE_POSICION, textoRetraso } from '../lib/ritmo';

type Filtro = 'activas' | 'en_tiempo' | 'aviso' | 'retrasado' | 'sin_ver' | 'por_salir' | 'terminadas' | 'todas';

const CUMPLE: Record<Filtro, (r: ResumenPartida) => boolean> = {
  activas: (r) => r.fase !== 'terminada',
  en_tiempo: (r) => r.fase === 'en_juego' && (r.estado === 'en_tiempo' || r.estado === 'adelantado'),
  aviso: (r) => r.fase === 'en_juego' && r.estado === 'aviso',
  retrasado: (r) => r.fase === 'en_juego' && r.estado === 'retrasado',
  sin_ver: (r) => r.fase === 'en_juego' && r.estado === null,
  por_salir: (r) => r.fase === 'pendiente',
  terminadas: (r) => r.fase === 'terminada',
  todas: () => true,
};

const NOMBRE_FILTRO: Record<Filtro, string> = {
  activas: 'Activas',
  en_tiempo: 'En tiempo',
  aviso: 'Atención',
  retrasado: 'Retrasadas',
  sin_ver: 'Sin ver',
  por_salir: 'Por salir',
  terminadas: 'Terminadas',
  todas: 'Todas',
};

export function Oficina() {
  const { partidas, cargando } = useDatos();
  const ahora = useAhora(15_000);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('activas');
  const [busqueda, setBusqueda] = useState('');
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCreando(false);
        setSeleccionada(null);
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, []);

  const resumenes = partidas.map((p) => ({ p, r: resumirPartida(p, ahora) }));
  const cuenta = (f: Filtro) => resumenes.filter(({ r }) => CUMPLE[f](r)).length;
  const enJuegoConDatos = resumenes.filter(({ r }) => r.fase === 'en_juego' && r.ultimo);
  const retrasoMedio = enJuegoConDatos.length
    ? enJuegoConDatos.reduce((suma, { r }) => suma + r.ultimo!.retraso_min, 0) / enJuegoConDatos.length
    : null;

  const texto = normalizarBusqueda(busqueda);
  const lista = resumenes.filter(({ p, r }) => CUMPLE[filtro](r) && (!texto || textoBusqueda(p).includes(texto)));
  const partidaSel = partidas.find((p) => p.id === seleccionada) ?? null;

  const ultimosAvistamientos = partidas
    .flatMap((p) => p.avistamientos.map((a) => ({ a, p })))
    .sort((x, y) => y.a.visto_en.localeCompare(x.a.visto_en))
    .slice(0, 8);

  const alternarSeleccion = (id: string) => setSeleccionada((actual) => (actual === id ? null : id));

  return (
    <div className="min-h-dvh">
      <Cabecera
        volverA="/"
        titulo={
          <>
            Caddy Master <span className="font-medium text-campo-100">· Ritmo de juego</span>
          </>
        }
        acciones={
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="min-h-10 rounded-lg bg-yellow-300 px-4 text-sm font-bold text-campo-900 shadow hover:bg-yellow-200"
          >
            + Nueva partida
          </button>
        }
      />

      <div className="mx-auto max-w-[1800px] space-y-4 px-4 py-4">
        {/* Indicadores (también sirven de filtro para la lista) */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          <Indicador titulo="En juego" valor={cuenta('activas') - cuenta('por_salir')} activo={filtro === 'activas'} onClick={() => setFiltro('activas')} />
          <Indicador titulo="En tiempo" valor={cuenta('en_tiempo')} color="text-emerald-700" activo={filtro === 'en_tiempo'} onClick={() => setFiltro('en_tiempo')} />
          <Indicador titulo="Atención" valor={cuenta('aviso')} color="text-amber-600" activo={filtro === 'aviso'} onClick={() => setFiltro('aviso')} />
          <Indicador titulo="Retrasadas" valor={cuenta('retrasado')} color="text-red-700" activo={filtro === 'retrasado'} onClick={() => setFiltro('retrasado')} />
          <Indicador titulo="Sin ver" valor={cuenta('sin_ver')} color="text-slate-500" activo={filtro === 'sin_ver'} onClick={() => setFiltro('sin_ver')} />
          <Indicador titulo="Por salir" valor={cuenta('por_salir')} activo={filtro === 'por_salir'} onClick={() => setFiltro('por_salir')} />
          <Indicador titulo="Terminadas" valor={cuenta('terminadas')} activo={filtro === 'terminadas'} onClick={() => setFiltro('terminadas')} />
          <Indicador
            titulo="Retraso medio"
            valor={retrasoMedio === null ? '—' : textoRetraso(retrasoMedio)}
            color={retrasoMedio !== null && retrasoMedio > 2 ? 'text-red-700' : 'text-emerald-700'}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* Mapa (panel central) */}
          <section className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <MapaCampo
                partidas={partidas}
                ahora={ahora}
                seleccionada={seleccionada}
                onSeleccionar={alternarSeleccion}
                altoMaximo="100dvh - 300px"
              />
              <div className="mt-3">
                <LeyendaMapa />
              </div>
            </div>

            <Seccion titulo="Últimos avistamientos">
              {ultimosAvistamientos.length === 0 ? (
                <p className="text-sm text-slate-500">Aún no hay avistamientos hoy.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">
                  {ultimosAvistamientos.map(({ a, p }) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setSeleccionada(p.id)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="cifras w-11 font-bold">{hhmm(a.visto_en)}</span>
                        <span className="min-w-0 flex-1 truncate">
                          <strong>{etiquetaPartida(p)}</strong> · H{a.hoyo} {NOMBRE_POSICION[a.posicion]}
                          <span className="text-slate-500"> · {haceCuanto(a.visto_en, ahora)}</span>
                        </span>
                        <EstadoBadge estado={a.estado} retraso={a.retraso_min} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>
          </section>

          {/* Lista de partidas o ficha de la seleccionada */}
          <aside className="min-w-0 space-y-3 lg:sticky lg:top-[76px] lg:max-h-[calc(100dvh-92px)] lg:overflow-y-auto lg:pr-1">
            {partidaSel ? (
              <FichaOficina key={partidaSel.id} partida={partidaSel} ahora={ahora} onCerrar={() => setSeleccionada(null)} />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar jugador, hora, buggy 7…"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3"
                  />
                  <select
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value as Filtro)}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-2 text-sm font-semibold"
                    aria-label="Filtrar partidas"
                  >
                    {(Object.keys(NOMBRE_FILTRO) as Filtro[]).map((f) => (
                      <option key={f} value={f}>
                        {NOMBRE_FILTRO[f]}
                      </option>
                    ))}
                  </select>
                </div>
                {cargando && <p className="text-center text-sm text-slate-500">Cargando…</p>}
                {!cargando && lista.length === 0 && (
                  <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">No hay partidas con este filtro.</p>
                )}
                <ul className="space-y-2">
                  {lista.map(({ p }) => (
                    <li key={p.id}>
                      <TarjetaPartida partida={p} ahora={ahora} onClick={() => alternarSeleccion(p.id)} activa={p.id === seleccionada} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        </div>
      </div>

      {creando && <FormularioPartida onCerrar={() => setCreando(false)} />}
    </div>
  );
}

function Indicador({
  titulo,
  valor,
  color = 'text-slate-900',
  activo = false,
  onClick,
}: {
  titulo: string;
  valor: number | string;
  color?: string;
  activo?: boolean;
  onClick?: () => void;
}) {
  const Elemento = onClick ? 'button' : 'div';
  return (
    <Elemento
      {...(onClick ? { type: 'button' as const, onClick, 'aria-pressed': activo } : {})}
      className={`rounded-xl border bg-white px-3 py-2 text-left shadow-sm transition ${
        activo ? 'border-campo-600 ring-2 ring-campo-200' : 'border-slate-200'
      } ${onClick ? 'hover:border-slate-300' : ''}`}
    >
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</span>
      <span className={`cifras block text-2xl font-black ${color}`}>{valor}</span>
    </Elemento>
  );
}

function FichaOficina({ partida, ahora, onCerrar }: { partida: Partida; ahora: Date; onCerrar: () => void }) {
  const { ejecutar } = useDatos();
  const r = resumirPartida(partida, ahora);

  const eliminar = () => {
    if (window.confirm(`¿Eliminar la partida de las ${etiquetaPartida(partida)}? No se puede deshacer.`)) {
      void ejecutar({ tipo: 'eliminar_partida', partidaId: partida.id });
      onCerrar();
    }
  };

  return (
    <div className="space-y-3">
      <button type="button" onClick={onCerrar} className="min-h-10 rounded-lg px-2 text-sm font-semibold text-campo-700 hover:bg-campo-50">
        ← Todas las partidas
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="cifras text-3xl font-black text-slate-900">{etiquetaPartida(partida)}</h2>
            <p className="font-semibold text-slate-700">{tituloPartida(partida)}</p>
          </div>
          {r.fase === 'en_juego' ? (
            <EstadoBadge estado={r.estado} retraso={r.ultimo?.retraso_min} grande />
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              {r.fase === 'pendiente' ? 'Por salir' : 'Terminada'}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-600">{nombresJugadores(partida)}</p>
        {r.fase === 'en_juego' && r.esperada.fase === 'jugando' && (
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Ahora deberían estar en el <strong>hoyo {r.esperada.hoyo}</strong> ({NOMBRE_POSICION[r.esperada.posicion]}).
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void ejecutar({
                tipo: 'terminar_partida',
                partidaId: partida.id,
                cuando: partida.terminada_en ? null : new Date().toISOString(),
              })
            }
            className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50"
          >
            {partida.terminada_en ? 'Reabrir' : 'Marcar terminada'}
          </button>
          <button type="button" onClick={eliminar} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50">
            Eliminar
          </button>
        </div>
      </div>

      <Seccion titulo="Historial">
        <HistorialAvistamientos partida={partida} />
      </Seccion>
      <Seccion titulo="Alquileres">
        <EditorAlquileres partida={partida} />
      </Seccion>
      <Seccion titulo="Observaciones">
        <EditorObservaciones partida={partida} />
      </Seccion>
      {!partida.terminada_en && (
        <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-bold uppercase tracking-wide text-slate-500">
            Registrar posición desde la oficina
          </summary>
          <div className="mt-4">
            <RegistroAvistamiento partida={partida} />
          </div>
        </details>
      )}
    </div>
  );
}
