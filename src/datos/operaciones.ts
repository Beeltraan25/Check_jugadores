/**
 * Todo cambio que se hace en la app es una "operación". Así:
 *  - El modo demo guarda los datos aplicando estas operaciones en local.
 *  - Con Supabase, las operaciones van a una cola (outbox): si no hay cobertura en el campo
 *    se guardan en el móvil y se envían solas al volver la conexión. Mientras tanto,
 *    la pantalla ya las muestra aplicadas (con la misma función aplicarOperacion).
 *
 * Las operaciones son idempotentes (aplicarlas dos veces da lo mismo), por eso se pueden
 * reintentar sin miedo a duplicar datos.
 */
import type { Alquiler, Avistamiento, Partida } from './tipos';

export type Operacion =
  | { tipo: 'crear_partida'; partida: Partida }
  | { tipo: 'eliminar_partida'; partidaId: string }
  | { tipo: 'iniciar_revision'; partidaId: string; cuando: string | null }
  | { tipo: 'registrar_avistamiento'; avistamiento: Avistamiento }
  | { tipo: 'eliminar_avistamiento'; partidaId: string; avistamientoId: string }
  | { tipo: 'guardar_observaciones'; partidaId: string; texto: string }
  | { tipo: 'asignar_alquiler'; partidaId: string; jugadorId: string; alquiler: Alquiler | null }
  | { tipo: 'terminar_partida'; partidaId: string; cuando: string | null };

const porHoraSalida = (a: Partida, b: Partida) => a.hora_salida.localeCompare(b.hora_salida);
const porHoraVisto = (a: Avistamiento, b: Avistamiento) => a.visto_en.localeCompare(b.visto_en);

/** Ordena partidas por hora de salida, jugadores por orden y avistamientos por hora. */
export function normalizarPartidas(partidas: Partida[]): Partida[] {
  return [...partidas].sort(porHoraSalida).map((p) => ({
    ...p,
    jugadores: [...p.jugadores].sort((a, b) => a.orden - b.orden),
    avistamientos: [...p.avistamientos].sort(porHoraVisto),
  }));
}

export function aplicarOperacion(partidas: Partida[], op: Operacion): Partida[] {
  const editar = (id: string, cambio: (p: Partida) => Partida) =>
    partidas.map((p) => (p.id === id ? cambio(p) : p));

  switch (op.tipo) {
    case 'crear_partida':
      if (partidas.some((p) => p.id === op.partida.id)) return partidas;
      return [...partidas, op.partida].sort(porHoraSalida);

    case 'eliminar_partida':
      return partidas.filter((p) => p.id !== op.partidaId);

    case 'iniciar_revision':
      return editar(op.partidaId, (p) => ({ ...p, revision_iniciada_en: op.cuando }));

    case 'registrar_avistamiento': {
      const a = op.avistamiento;
      return editar(a.partida_id, (p) => ({
        ...p,
        revision_iniciada_en: null,
        avistamientos: [...p.avistamientos.filter((x) => x.id !== a.id), a].sort(porHoraVisto),
      }));
    }

    case 'eliminar_avistamiento':
      return editar(op.partidaId, (p) => ({
        ...p,
        avistamientos: p.avistamientos.filter((a) => a.id !== op.avistamientoId),
      }));

    case 'guardar_observaciones':
      return editar(op.partidaId, (p) => ({ ...p, observaciones: op.texto }));

    case 'asignar_alquiler':
      return editar(op.partidaId, (p) => ({
        ...p,
        jugadores: p.jugadores.map((j) => (j.id === op.jugadorId ? { ...j, alquiler: op.alquiler } : j)),
      }));

    case 'terminar_partida':
      return editar(op.partidaId, (p) => ({ ...p, terminada_en: op.cuando, revision_iniciada_en: null }));
  }
}
