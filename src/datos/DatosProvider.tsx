/**
 * Proveedor de datos para toda la app (React Context).
 *
 * Flujo en tiempo real:
 *   Marshal pulsa "Green" → ejecutar(op) → cola local → Supabase (INSERT)
 *   → Supabase Realtime avisa a todos los dispositivos conectados → cada uno recarga el torneo
 *   → la oficina ve el pin moverse en el mapa al instante.
 *
 * Torneo "en uso": por defecto, el torneo abierto más reciente. Cada dispositivo puede elegir
 * otro (se recuerda en el propio dispositivo).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { crearRepositorioDemo } from './demo';
import { aplicarOperacion, type Estado, type Operacion } from './operaciones';
import type { EstadoConexion, Repositorio } from './repositorio';
import { crearRepositorioSupabase, supabase } from './supabase';
import type { Partida, Torneo } from './tipos';

let repositorio: Repositorio | null = null;

/** Se crea al primer uso (tras iniciar sesión), así la cola no intenta enviar sin sesión. */
function obtenerRepositorio(): Repositorio {
  repositorio ??= supabase ? crearRepositorioSupabase() : crearRepositorioDemo();
  return repositorio;
}

export const modoDatos: 'demo' | 'supabase' = supabase ? 'supabase' : 'demo';

const CLAVE_TORNEO = 'ritmo-golf:torneo-en-uso';

function leerTorneoElegido(): string | null {
  try {
    return localStorage.getItem(CLAVE_TORNEO);
  } catch {
    return null;
  }
}

function guardarTorneoElegido(id: string | null) {
  try {
    if (id) localStorage.setItem(CLAVE_TORNEO, id);
    else localStorage.removeItem(CLAVE_TORNEO);
  } catch {
    /* nada */
  }
}

/** Torneo que se usa si el dispositivo no ha elegido otro: el abierto más reciente. */
function torneoPorDefecto(torneos: Torneo[]): Torneo | null {
  return torneos.find((t) => !t.cerrado_en) ?? torneos[0] ?? null;
}

function resolverTorneo(torneos: Torneo[], elegido: string | null): Torneo | null {
  return torneos.find((t) => t.id === elegido) ?? torneoPorDefecto(torneos);
}

interface ContextoDatos {
  /** Todos los torneos, del más reciente al más antiguo. */
  torneos: Torneo[];
  /** Nº de partidas de cada torneo. */
  numPartidas: (torneoId: string) => number;
  /** Torneo en uso en este dispositivo (null si no hay ninguno). */
  torneo: Torneo | null;
  elegirTorneo: (id: string) => void;
  /** Partidas del torneo en uso, con los cambios aún no enviados ya aplicados. */
  partidas: Partida[];
  /** Lee las partidas de cualquier torneo (para los informes de torneos pasados). */
  cargarPartidasDe: (torneoId: string) => Promise<Partida[]>;
  /** Sube cada vez que llegan datos nuevos (para que los informes se refresquen). */
  revision: number;
  cargando: boolean;
  /** Error al leer los datos (p. ej. sin conexión al abrir la app). */
  errorCarga: string | null;
  /** Aviso puntual (p. ej. un cambio rechazado por la base de datos). */
  aviso: string | null;
  descartarAviso: () => void;
  conexion: EstadoConexion;
  /** Cambios guardados en este dispositivo esperando conexión. */
  pendientes: number;
  usuario: string;
  ejecutar: (op: Operacion) => Promise<void>;
}

const Contexto = createContext<ContextoDatos | null>(null);

export function DatosProvider({ usuario, children }: { usuario: string; children: ReactNode }) {
  const repo = obtenerRepositorio();
  const [servidor, setServidor] = useState<Estado & { torneoCargado: string | null }>({
    torneos: [],
    partidas: [],
    torneoCargado: null,
  });
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [elegido, setElegido] = useState<string | null>(leerTorneoElegido);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [version, refrescar] = useReducer((n: number) => n + 1, 0);
  const [revision, marcarRevision] = useReducer((n: number) => n + 1, 0);
  const ultimaPeticion = useRef(0);
  const elegidoRef = useRef(elegido);
  elegidoRef.current = elegido;

  const cargar = useCallback(async () => {
    const peticion = ++ultimaPeticion.current;
    const inicio = Date.now();
    try {
      const lista = await repo.listarTorneos();
      const torneos = lista.map(({ num_partidas: _n, ...t }) => t);
      // Se decide qué torneo cargar teniendo en cuenta también los creados sin conexión.
      const conLocales = repo.operacionesLocales().reduce(aplicarOperacion, { torneos, partidas: [] }).torneos;
      const torneo = resolverTorneo(conLocales, elegidoRef.current);
      const partidas = torneo ? await repo.cargarTorneo(torneo.id) : [];
      if (peticion !== ultimaPeticion.current) return; // llegó una respuesta más nueva
      repo.confirmarHasta(inicio);
      setServidor({ torneos, partidas, torneoCargado: torneo?.id ?? null });
      setConteos(Object.fromEntries(lista.map((t) => [t.id, t.num_partidas])));
      setErrorCarga(null);
      marcarRevision();
    } catch (error) {
      if (peticion === ultimaPeticion.current) setErrorCarga((error as Error).message);
    } finally {
      if (peticion === ultimaPeticion.current) setCargando(false);
    }
  }, [repo]);

  useEffect(() => {
    void cargar();
    let temporizador: number | undefined;
    // Varios cambios seguidos (p. ej. crear partida + jugadores) se agrupan en una sola recarga.
    const recargarPronto = () => {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => void cargar(), 150);
    };
    const dejarDeEscuchar = repo.suscribir(recargarPronto);
    const dejarEstado = repo.alCambiarEstado((evento) => {
      if (evento.tipo === 'error') setAviso(evento.mensaje);
      refrescar();
    });
    window.addEventListener('focus', recargarPronto);
    return () => {
      window.clearTimeout(temporizador);
      dejarDeEscuchar();
      dejarEstado();
      window.removeEventListener('focus', recargarPronto);
    };
  }, [repo, cargar]);

  const vista = useMemo(
    () => repo.operacionesLocales().reduce(aplicarOperacion, { torneos: servidor.torneos, partidas: servidor.partidas }),
    // `version` no se usa dentro, pero cambia cuando cambia la cola local y obliga a recalcular
    [repo, servidor, version],
  );

  const torneo = resolverTorneo(vista.torneos, elegido);
  const torneoId = torneo?.id ?? null;

  // Si cambia el torneo en uso (elegido aquí, creado o borrado), se cargan sus partidas.
  useEffect(() => {
    if (!cargando && torneoId !== servidor.torneoCargado) void cargar();
  }, [torneoId, servidor.torneoCargado, cargando, cargar]);

  const partidas = useMemo(() => vista.partidas.filter((p) => p.torneo_id === torneoId), [vista, torneoId]);

  const cargarPartidasDe = useCallback(
    async (id: string) => {
      const desdeServidor = await repo.cargarTorneo(id);
      return repo
        .operacionesLocales()
        .reduce(aplicarOperacion, { torneos: [], partidas: desdeServidor })
        .partidas.filter((p) => p.torneo_id === id);
    },
    [repo],
  );

  const valor: ContextoDatos = {
    torneos: vista.torneos,
    numPartidas: (id) => (id === torneoId ? partidas.length : (conteos[id] ?? 0)),
    torneo,
    elegirTorneo: (id) => {
      guardarTorneoElegido(id);
      setElegido(id);
    },
    partidas,
    cargarPartidasDe,
    revision,
    cargando,
    errorCarga,
    aviso,
    descartarAviso: () => setAviso(null),
    conexion: repo.conexion(),
    pendientes: repo.pendientes(),
    usuario,
    ejecutar: (op) => repo.ejecutar(op),
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDatos(): ContextoDatos {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useDatos debe usarse dentro de <DatosProvider>');
  return contexto;
}

export function usePartida(id: string | undefined): Partida | null {
  const { partidas } = useDatos();
  return partidas.find((p) => p.id === id) ?? null;
}

/** Partidas de un torneo cualquiera: las del torneo en uso al momento, o leídas aparte. */
export function usePartidasDeTorneo(torneoId: string | undefined): { partidas: Partida[]; cargando: boolean } {
  const { torneo, partidas, cargarPartidasDe, revision } = useDatos();
  const esElEnUso = !!torneoId && torneoId === torneo?.id;
  const [otras, setOtras] = useState<{ id: string; partidas: Partida[] } | null>(null);

  useEffect(() => {
    if (!torneoId || esElEnUso) return;
    let vigente = true;
    void cargarPartidasDe(torneoId)
      .then((p) => vigente && setOtras({ id: torneoId, partidas: p }))
      .catch(() => vigente && setOtras({ id: torneoId, partidas: [] }));
    return () => {
      vigente = false;
    };
  }, [torneoId, esElEnUso, cargarPartidasDe, revision]);

  if (esElEnUso) return { partidas, cargando: false };
  if (otras && otras.id === torneoId) return { partidas: otras.partidas, cargando: false };
  return { partidas: [], cargando: true };
}
