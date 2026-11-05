/**
 * Proveedor de datos para toda la app (React Context).
 *
 * Flujo en tiempo real:
 *   Marshal pulsa "Green" → ejecutar(op) → cola local → Supabase (INSERT)
 *   → Supabase Realtime avisa a todos los dispositivos conectados → cada uno recarga el día
 *   → la oficina ve el pin moverse en el mapa al instante.
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
import { useAhora } from '../hooks/useAhora';
import { fechaLocal } from '../lib/hora';
import { crearRepositorioDemo } from './demo';
import { aplicarOperacion, type Operacion } from './operaciones';
import type { EstadoConexion, Repositorio } from './repositorio';
import { crearRepositorioSupabase, supabase } from './supabase';
import type { Partida } from './tipos';

let repositorio: Repositorio | null = null;

/** Se crea al primer uso (tras iniciar sesión), así la cola no intenta enviar sin sesión. */
function obtenerRepositorio(): Repositorio {
  repositorio ??= supabase ? crearRepositorioSupabase() : crearRepositorioDemo();
  return repositorio;
}

export const modoDatos: 'demo' | 'supabase' = supabase ? 'supabase' : 'demo';

interface ContextoDatos {
  /** Partidas de hoy, con los cambios aún no enviados ya aplicados. */
  partidas: Partida[];
  fecha: string;
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
  const fecha = fechaLocal(useAhora(60_000));
  const [servidor, setServidor] = useState<Partida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [version, refrescar] = useReducer((n: number) => n + 1, 0);
  const ultimaPeticion = useRef(0);

  const cargar = useCallback(async () => {
    const peticion = ++ultimaPeticion.current;
    const inicio = Date.now();
    try {
      const datos = await repo.cargarDia(fecha);
      if (peticion !== ultimaPeticion.current) return; // llegó una respuesta más nueva
      repo.confirmarHasta(inicio);
      setServidor(datos);
      setErrorCarga(null);
    } catch (error) {
      if (peticion === ultimaPeticion.current) setErrorCarga((error as Error).message);
    } finally {
      if (peticion === ultimaPeticion.current) setCargando(false);
    }
  }, [repo, fecha]);

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

  const partidas = useMemo(
    () => repo.operacionesLocales().reduce(aplicarOperacion, servidor).filter((p) => p.fecha === fecha),
    // `version` no se usa dentro, pero cambia cuando cambia la cola local y obliga a recalcular
    [repo, servidor, fecha, version],
  );

  const valor: ContextoDatos = {
    partidas,
    fecha,
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
