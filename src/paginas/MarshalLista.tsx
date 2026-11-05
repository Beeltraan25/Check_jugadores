/**
 * Pantalla principal del Marshal: el mismo mapa del campo que ve el Caddy Master, con los
 * indicadores del torneo y la lista de partidas. Tocar un pin o una tarjeta abre su ficha.
 */
import { useState } from 'react';
import { Cabecera } from '../componentes/basicos';
import { Indicador } from '../componentes/Indicador';
import { LeyendaMapa, MapaCampo } from '../componentes/MapaCampo';
import { TarjetaPartida } from '../componentes/TarjetaPartida';
import { AvisoFechaTorneo, SinTorneo, TituloTorneo } from '../componentes/SinTorneo';
import { useDatos } from '../datos/DatosProvider';
import { useAhora } from '../hooks/useAhora';
import { normalizarBusqueda, resumirPartida, textoBusqueda, type ResumenPartida } from '../lib/partidas';

type Filtro = 'activas' | 'en_tiempo' | 'aviso' | 'retrasado';

const CUMPLE: Record<Filtro, (r: ResumenPartida) => boolean> = {
  activas: (r) => r.fase !== 'terminada',
  en_tiempo: (r) => r.fase === 'en_juego' && (r.estado === 'en_tiempo' || r.estado === 'adelantado'),
  aviso: (r) => r.fase === 'en_juego' && r.estado === 'aviso',
  retrasado: (r) => r.fase === 'en_juego' && r.estado === 'retrasado',
};

const ORDEN_FASE = { en_juego: 0, pendiente: 1, terminada: 2 } as const;

export function MarshalLista() {
  const { partidas, cargando, torneo } = useDatos();
  const ahora = useAhora(15_000);
  const [busqueda, setBusqueda] = useState('');
  const [verTerminadas, setVerTerminadas] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('activas');
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  const resumenes = partidas.map((p) => ({ p, r: resumirPartida(p, ahora) }));
  const cuenta = (f: Filtro) => resumenes.filter(({ r }) => CUMPLE[f](r)).length;
  const texto = normalizarBusqueda(busqueda);
  const visibles = resumenes
    .filter(({ r }) => (verTerminadas && filtro === 'activas') || CUMPLE[filtro](r))
    .filter(({ p }) => !texto || textoBusqueda(p).includes(texto))
    // Primero las que están jugando, luego las que van a salir y al final las terminadas.
    .sort((a, b) => ORDEN_FASE[a.r.fase] - ORDEN_FASE[b.r.fase]);
  const partidaSel = partidas.find((p) => p.id === seleccionada) ?? null;
  const elegirFiltro = (f: Filtro) => setFiltro((actual) => (actual === f ? 'activas' : f));

  return (
    <div className="min-h-dvh">
      <Cabecera titulo={<TituloTorneo seccion="Marshal" nombre={torneo?.nombre} />} volverA="/" />
      <AvisoFechaTorneo torneo={torneo} />
      {!torneo && !cargando ? (
        <div className="px-4 py-10">
          <SinTorneo />
        </div>
      ) : (
        <main className="mx-auto max-w-[1800px] space-y-3 px-3 py-3 sm:px-4">
          {/* Indicadores (también filtran la lista) */}
          <div className="grid grid-cols-4 gap-2">
            <Indicador titulo="En juego" valor={cuenta('activas')} activo={filtro === 'activas'} onClick={() => setFiltro('activas')} />
            <Indicador titulo="En tiempo" valor={cuenta('en_tiempo')} color="text-emerald-700" activo={filtro === 'en_tiempo'} onClick={() => elegirFiltro('en_tiempo')} />
            <Indicador titulo="Atención" valor={cuenta('aviso')} color="text-amber-600" activo={filtro === 'aviso'} onClick={() => elegirFiltro('aviso')} />
            <Indicador titulo="Retrasadas" valor={cuenta('retrasado')} color="text-red-700" activo={filtro === 'retrasado'} onClick={() => elegirFiltro('retrasado')} />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_400px]">
            {/* Mapa del campo, igual que en la oficina */}
            <section className="min-w-0 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
                <MapaCampo
                  partidas={partidas}
                  ahora={ahora}
                  seleccionada={seleccionada}
                  onSeleccionar={(id) => setSeleccionada((actual) => (actual === id ? null : id))}
                  altoMaximo="100dvh - 260px"
                />
                <div className="mt-2">
                  <LeyendaMapa />
                </div>
              </div>
              {partidaSel && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Partida seleccionada · toca para abrir la ficha
                  </p>
                  <TarjetaPartida partida={partidaSel} ahora={ahora} to={`/marshal/${partidaSel.id}`} activa />
                </div>
              )}
            </section>

            {/* Lista de partidas */}
            <aside className="min-w-0 space-y-2 lg:sticky lg:top-[76px] lg:max-h-[calc(100dvh-92px)] lg:overflow-y-auto lg:pr-1">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar jugador, hora o nº de buggy/carro"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base"
              />
              {cargando && <p className="text-center text-slate-500">Cargando partidas…</p>}
              {!cargando && visibles.length === 0 && (
                <p className="rounded-xl bg-white p-6 text-center text-slate-500">No hay partidas que mostrar.</p>
              )}
              <ul className="space-y-2">
                {visibles.map(({ p }) => (
                  <li key={p.id}>
                    <TarjetaPartida partida={p} ahora={ahora} to={`/marshal/${p.id}`} activa={p.id === seleccionada} />
                  </li>
                ))}
              </ul>
              <label className="flex items-center justify-center gap-2 py-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={verTerminadas}
                  onChange={(e) => setVerTerminadas(e.target.checked)}
                  className="h-5 w-5"
                />
                Mostrar partidas terminadas
              </label>
            </aside>
          </div>
        </main>
      )}
    </div>
  );
}
