import { useState } from 'react';
import { Cabecera } from '../componentes/basicos';
import { TarjetaPartida } from '../componentes/TarjetaPartida';
import { AvisoFechaTorneo, SinTorneo, TituloTorneo } from '../componentes/SinTorneo';
import { useDatos } from '../datos/DatosProvider';
import { useAhora } from '../hooks/useAhora';
import { normalizarBusqueda, resumirPartida, textoBusqueda } from '../lib/partidas';

/** Lista de partidas en juego para el Marshal (pensada para móvil/tablet). */
export function MarshalLista() {
  const { partidas, cargando, torneo } = useDatos();
  const ahora = useAhora(15_000);
  const [busqueda, setBusqueda] = useState('');
  const [verTerminadas, setVerTerminadas] = useState(false);

  const filtro = normalizarBusqueda(busqueda);
  const visibles = partidas
    .map((p) => ({ p, fase: resumirPartida(p, ahora).fase }))
    .filter(({ fase }) => verTerminadas || fase !== 'terminada')
    .filter(({ p }) => !filtro || textoBusqueda(p).includes(filtro))
    // Primero las que están jugando, luego las que van a salir y al final las terminadas.
    .sort((a, b) => ORDEN_FASE[a.fase] - ORDEN_FASE[b.fase]);

  return (
    <div className="min-h-dvh">
      <Cabecera titulo={<TituloTorneo seccion="Marshal" nombre={torneo?.nombre} />} volverA="/" />
      <AvisoFechaTorneo torneo={torneo} />
      <main className="mx-auto max-w-3xl space-y-3 px-3 py-4">
        {!torneo && !cargando && <SinTorneo />}
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
              <TarjetaPartida partida={p} ahora={ahora} to={`/marshal/${p.id}`} />
            </li>
          ))}
        </ul>
        <label className="flex items-center justify-center gap-2 py-2 text-sm text-slate-600">
          <input type="checkbox" checked={verTerminadas} onChange={(e) => setVerTerminadas(e.target.checked)} className="h-5 w-5" />
          Mostrar partidas terminadas
        </label>
      </main>
    </div>
  );
}

const ORDEN_FASE = { en_juego: 0, pendiente: 1, terminada: 2 } as const;
