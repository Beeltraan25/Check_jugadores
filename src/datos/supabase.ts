/**
 * Implementación con Supabase (PostgreSQL + Realtime).
 *
 * - Lectura: una sola consulta trae las partidas del torneo con jugadores, alquileres y avistamientos.
 * - Tiempo real: un canal escucha los cambios de las 5 tablas; ante cualquier cambio la app
 *   vuelve a leer el torneo (son pocas filas, y así nunca hay datos a medio actualizar).
 * - Escritura con cola offline (outbox): cada cambio se guarda primero en el dispositivo y se
 *   envía en orden. Si no hay cobertura, se queda en la cola y se reintenta solo.
 */
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { normalizarPartidas, type Operacion } from './operaciones';
import { crearEmisor, type EstadoConexion, type EventoRepositorio, type Repositorio, type TorneoConResumen } from './repositorio';
import type { Alquiler, Avistamiento, Partida, Torneo } from './tipos';
import { nuevoId } from '../lib/ids';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Cliente de Supabase, o null si no hay credenciales (entonces la app usa el modo demo). */
export const supabase = url && clave ? createClient(url, clave) : null;

const TABLAS = ['torneos', 'partidas', 'jugadores', 'alquileres', 'avistamientos'] as const;
const CLAVE_COLA = 'ritmo-golf:cola';
const REINTENTO_MS = 20_000;

/** Fallo de red, del servidor o sesión caducada: la operación se queda en la cola para reintentarla. */
class ErrorDeRed extends Error {}

type Respuesta = { error: PostgrestError | null; status: number };

async function comprobar(peticion: PromiseLike<Respuesta>): Promise<void> {
  const { error, status } = await peticion;
  if (!error) return;
  const reintentable = status === 0 || status === 401 || status === 408 || status === 429 || status >= 500 || !navigator.onLine;
  throw reintentable ? new ErrorDeRed(error.message) : new Error(error.message);
}

// --- Filas tal y como llegan de la consulta anidada -------------------------------

type FilaAlquiler = Alquiler;
interface FilaJugador {
  id: string;
  partida_id: string;
  nombre: string;
  orden: number;
  /** PostgREST devuelve objeto (relación 1 a 1 por el UNIQUE) o array, según la versión. */
  alquileres: FilaAlquiler | FilaAlquiler[] | null;
}
interface FilaPartida extends Omit<Partida, 'jugadores' | 'avistamientos'> {
  jugadores: FilaJugador[] | null;
  avistamientos: (Omit<Avistamiento, 'retraso_min'> & { retraso_min: number | string })[] | null;
}

/** Postgres devuelve "…+00:00" y el navegador "…Z": se igualan para poder ordenar textos. */
const iso = (fecha: string | null) => (fecha ? new Date(fecha).toISOString() : null);

function desdeFila(f: FilaPartida): Partida {
  return {
    id: f.id,
    torneo_id: f.torneo_id,
    fecha: f.fecha,
    hora_salida: iso(f.hora_salida)!,
    hoyo_salida: f.hoyo_salida,
    nombre: f.nombre ?? '',
    observaciones: f.observaciones ?? '',
    revision_iniciada_en: iso(f.revision_iniciada_en),
    terminada_en: iso(f.terminada_en),
    jugadores: (f.jugadores ?? []).map((j) => ({
      id: j.id,
      partida_id: j.partida_id,
      nombre: j.nombre,
      orden: j.orden,
      alquiler: (Array.isArray(j.alquileres) ? j.alquileres[0] : j.alquileres) ?? null,
    })),
    avistamientos: (f.avistamientos ?? []).map((a) => ({
      ...a,
      revision_iniciada_en: iso(a.revision_iniciada_en),
      visto_en: iso(a.visto_en)!,
      retraso_min: Number(a.retraso_min),
    })),
  };
}

function torneoDesdeFila(f: Torneo & { partidas?: { count: number }[] }): TorneoConResumen {
  return {
    id: f.id,
    nombre: f.nombre,
    fecha: f.fecha,
    notas: f.notas ?? '',
    creado_en: iso(f.creado_en)!,
    cerrado_en: iso(f.cerrado_en),
    num_partidas: f.partidas?.[0]?.count ?? 0,
  };
}

// --- Envío de cada operación a la base de datos --------------------------------------

/** Inserta partidas con sus jugadores y alquileres (sin duplicar si ya existen). */
async function insertarPartidas(partidas: Partida[]): Promise<void> {
  const db = supabase!;
  if (partidas.length === 0) return;
  const filasPartidas = partidas.map(({ jugadores: _j, avistamientos: _a, ...p }) => p);
  await comprobar(db.from('partidas').upsert(filasPartidas, { onConflict: 'id', ignoreDuplicates: true }));
  const jugadores = partidas.flatMap((p) => p.jugadores);
  if (jugadores.length) {
    const filas = jugadores.map(({ alquiler: _alquiler, ...j }) => j);
    await comprobar(db.from('jugadores').upsert(filas, { onConflict: 'id', ignoreDuplicates: true }));
  }
  const alquileres = jugadores.flatMap((j) => (j.alquiler ? [j.alquiler] : []));
  if (alquileres.length) await comprobar(db.from('alquileres').upsert(alquileres, { onConflict: 'jugador_id' }));
}

async function enviar(op: Operacion): Promise<void> {
  const db = supabase!;
  switch (op.tipo) {
    case 'crear_torneo': {
      const { id, nombre, fecha, notas, creado_en, cerrado_en } = op.torneo;
      await comprobar(
        db.from('torneos').upsert({ id, nombre, fecha, notas, creado_en, cerrado_en }, { onConflict: 'id', ignoreDuplicates: true }),
      );
      return insertarPartidas(op.partidas);
    }
    case 'actualizar_torneo':
      return comprobar(db.from('torneos').update(op.cambios).eq('id', op.torneoId));
    case 'eliminar_torneo':
      return comprobar(db.from('torneos').delete().eq('id', op.torneoId));
    case 'crear_partida':
      return insertarPartidas([op.partida]);
    case 'eliminar_partida':
      return comprobar(db.from('partidas').delete().eq('id', op.partidaId));
    case 'iniciar_revision':
      return comprobar(db.from('partidas').update({ revision_iniciada_en: op.cuando }).eq('id', op.partidaId));
    case 'registrar_avistamiento':
      await comprobar(db.from('avistamientos').upsert(op.avistamiento, { onConflict: 'id', ignoreDuplicates: true }));
      return comprobar(db.from('partidas').update({ revision_iniciada_en: null }).eq('id', op.avistamiento.partida_id));
    case 'eliminar_avistamiento':
      return comprobar(db.from('avistamientos').delete().eq('id', op.avistamientoId));
    case 'guardar_observaciones':
      return comprobar(db.from('partidas').update({ observaciones: op.texto }).eq('id', op.partidaId));
    case 'asignar_alquiler':
      if (!op.alquiler) return comprobar(db.from('alquileres').delete().eq('jugador_id', op.jugadorId));
      return comprobar(db.from('alquileres').upsert(op.alquiler, { onConflict: 'jugador_id' }));
    case 'terminar_partida':
      return comprobar(
        db.from('partidas').update({ terminada_en: op.cuando, revision_iniciada_en: null }).eq('id', op.partidaId),
      );
  }
}

// --- Repositorio ---------------------------------------------------------------------

interface EntradaCola {
  id: string;
  op: Operacion;
  /** Cuándo se envió con éxito (null = pendiente). Se borra al confirmarse con una recarga. */
  enviadaEn: number | null;
}

function leerCola(): EntradaCola[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_COLA) ?? '[]') as EntradaCola[];
  } catch {
    return [];
  }
}

export function crearRepositorioSupabase(): Repositorio {
  if (!supabase) throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
  const db = supabase;
  const emisor = crearEmisor<EventoRepositorio>();
  const recargas = new Set<() => void>();
  let cola = leerCola();
  let conexion: EstadoConexion = navigator.onLine ? 'conectando' : 'sin_conexion';
  let enviando = false;

  const guardarCola = () => {
    try {
      localStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
    } catch {
      /* sin almacenamiento: la cola vive solo en memoria */
    }
    emisor.emitir({ tipo: 'estado' });
  };

  const cambiarConexion = (nueva: EstadoConexion) => {
    if (nueva === conexion) return;
    conexion = nueva;
    emisor.emitir({ tipo: 'estado' });
  };

  async function vaciarCola() {
    if (enviando) return;
    enviando = true;
    let enviadas = 0;
    try {
      for (let entrada = cola.find((e) => e.enviadaEn === null); entrada; entrada = cola.find((e) => e.enviadaEn === null)) {
        try {
          await enviar(entrada.op);
          entrada.enviadaEn = Date.now();
          enviadas++;
        } catch (error) {
          if (error instanceof ErrorDeRed) {
            cambiarConexion('sin_conexion');
            break; // se reintenta más tarde, sin perder el orden
          }
          // Error de datos o permisos: reintentar no lo arreglaría. Se descarta y se avisa.
          cola = cola.filter((e) => e !== entrada);
          emisor.emitir({ tipo: 'error', mensaje: `No se pudo guardar un cambio: ${(error as Error).message}` });
        }
        guardarCola();
      }
    } finally {
      enviando = false;
    }
    if (enviadas > 0) recargas.forEach((r) => r());
  }

  window.addEventListener('online', () => void vaciarCola());
  window.addEventListener('offline', () => cambiarConexion('sin_conexion'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void vaciarCola();
  });
  window.setInterval(() => {
    if (cola.some((e) => e.enviadaEn === null)) void vaciarCola();
  }, REINTENTO_MS);
  void vaciarCola();

  return {
    modo: 'supabase',

    async listarTorneos() {
      const { data, error } = await db
        .from('torneos')
        .select('*, partidas(count)')
        .order('fecha', { ascending: false })
        .order('creado_en', { ascending: false });
      if (error) throw new Error(error.message);
      return (data as (Torneo & { partidas: { count: number }[] })[]).map(torneoDesdeFila);
    },

    async cargarTorneo(torneoId) {
      const { data, error } = await db
        .from('partidas')
        .select('*, jugadores(*, alquileres(*)), avistamientos(*)')
        .eq('torneo_id', torneoId);
      if (error) throw new Error(error.message);
      return normalizarPartidas((data as FilaPartida[]).map(desdeFila));
    },

    suscribir(alCambiar) {
      recargas.add(alCambiar);
      const canal = db.channel(`ritmo-de-juego-${nuevoId()}`);
      for (const tabla of TABLAS) {
        canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, () => alCambiar());
      }
      canal.subscribe((estado) => {
        if (estado === 'SUBSCRIBED') {
          cambiarConexion('en_directo');
          alCambiar(); // al (re)conectar se recarga por si se perdió algún cambio
          void vaciarCola();
        } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
          cambiarConexion('sin_conexion');
        }
      });
      return () => {
        recargas.delete(alCambiar);
        void db.removeChannel(canal);
      };
    },

    async ejecutar(op) {
      cola = [...cola, { id: nuevoId(), op, enviadaEn: null }];
      guardarCola();
      await vaciarCola();
    },

    operacionesLocales: () => cola.map((e) => e.op),
    pendientes: () => cola.filter((e) => e.enviadaEn === null).length,

    confirmarHasta(instante) {
      const antes = cola.length;
      cola = cola.filter((e) => e.enviadaEn === null || e.enviadaEn >= instante);
      if (cola.length !== antes) guardarCola();
    },

    alCambiarEstado: (oyente) => emisor.escuchar(oyente),
    conexion: () => conexion,
  };
}
