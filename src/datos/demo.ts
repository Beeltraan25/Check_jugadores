/**
 * MODO DEMO: funciona sin Supabase. Guarda los datos en el navegador (localStorage) y
 * sincroniza las pestañas abiertas con BroadcastChannel, así puedes abrir /marshal y
 * /oficina en dos pestañas y ver el "tiempo real" sin configurar nada.
 * (Solo sincroniza pestañas del MISMO navegador; entre dispositivos hace falta Supabase.)
 */
import { evaluarRitmo, posicionEsperada, duracionVueltaMin } from '../lib/ritmo';
import { nuevoId } from '../lib/ids';
import { fechaLocal } from '../lib/hora';
import { aplicarOperacion, normalizarPartidas, ordenarTorneos, type Estado, type Operacion } from './operaciones';
import { crearEmisor, type EventoRepositorio, type Repositorio } from './repositorio';
import type { Avistamiento, Jugador, Partida, TipoAlquiler, Torneo } from './tipos';

const CLAVE_DATOS = 'ritmo-golf:demo:v2';
const CLAVE_SEMBRADO = 'ritmo-golf:demo:v2:sembrado';
const CANAL = 'ritmo-golf-demo';

let memoria: Estado | null = null;

function leer(): Estado {
  try {
    const crudo = localStorage.getItem(CLAVE_DATOS);
    if (crudo) return JSON.parse(crudo) as Estado;
  } catch {
    /* almacenamiento bloqueado: seguimos en memoria */
  }
  return memoria ?? { torneos: [], partidas: [] };
}

function escribir(estado: Estado) {
  memoria = estado;
  try {
    localStorage.setItem(CLAVE_DATOS, JSON.stringify(estado));
  } catch {
    /* sin almacenamiento: solo en memoria */
  }
}

/** La primera vez que se abre la demo se crea un torneo de ejemplo. */
function sembrarSiHaceFalta() {
  try {
    if (localStorage.getItem(CLAVE_SEMBRADO) === '1') return;
    localStorage.setItem(CLAVE_SEMBRADO, '1');
  } catch {
    if (memoria) return;
  }
  escribir(aplicarOperacion(leer(), torneoDeEjemplo(new Date())));
}

export function crearRepositorioDemo(): Repositorio {
  const emisor = crearEmisor<EventoRepositorio>();
  const recargas = new Set<() => void>();
  const canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CANAL) : null;
  canal?.addEventListener('message', () => recargas.forEach((r) => r()));
  sembrarSiHaceFalta();

  return {
    modo: 'demo',
    async listarTorneos() {
      const { torneos, partidas } = leer();
      return ordenarTorneos(torneos).map((t) => ({
        ...t,
        num_partidas: partidas.filter((p) => p.torneo_id === t.id).length,
      }));
    },
    async cargarTorneo(torneoId) {
      return normalizarPartidas(leer().partidas.filter((p) => p.torneo_id === torneoId));
    },
    suscribir(alCambiar) {
      recargas.add(alCambiar);
      return () => {
        recargas.delete(alCambiar);
      };
    },
    async ejecutar(op: Operacion) {
      escribir(aplicarOperacion(leer(), op));
      recargas.forEach((r) => r());
      canal?.postMessage('cambio');
    },
    operacionesLocales: () => [],
    pendientes: () => 0,
    confirmarHasta: () => {},
    alCambiarEstado: (oyente) => emisor.escuchar(oyente),
    conexion: () => 'demo',
  };
}

/** Operación que crea un torneo de ejemplo para hoy con partidas alrededor de la hora actual. */
export function torneoDeEjemplo(ahora: Date): Operacion {
  const fecha = fechaLocal(ahora);
  const torneo: Torneo = {
    id: nuevoId(),
    nombre: 'Torneo de ejemplo',
    fecha,
    notas: 'Datos inventados para probar la app.',
    creado_en: ahora.toISOString(),
    cerrado_en: null,
  };
  return { tipo: 'crear_torneo', torneo, partidas: generarPartidasDemo(torneo.id, fecha, ahora) };
}

// ---------------------------------------------------------------------------
// Datos de prueba: partidas cada 15 min alrededor de la hora actual, con
// avistamientos coherentes con la lógica de ritmo (unas van bien y otras lentas).
// ---------------------------------------------------------------------------

const NOMBRES = ['Javier', 'Lucía', 'Carlos', 'Marta', 'Pablo', 'Elena', 'Andrés', 'Carmen', 'Miguel', 'Laura', 'Jorge', 'Paula', 'Diego', 'Sara', 'Álvaro', 'Beatriz', 'Fernando', 'Isabel', 'Raúl', 'Nuria'];
const APELLIDOS = ['García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Fernández', 'Ruiz', 'Díaz', 'Moreno', 'Álvarez', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Serrano', 'Molina', 'Ortega', 'Delgado', 'Castro', 'Rubio'];
const NOTAS_LENTAS = ['Avisados por juego lento.', 'Jugador buscando bola en el bosque.', 'Han dejado pasar a la partida de detrás.', 'Esperando en el tee, el green estaba ocupado.'];

function generarPartidasDemo(torneoId: string, fecha: string, ahora: Date): Partida[] {

  let semilla = Number(fecha.replaceAll('-', '')) % 2147483647;
  const azar = () => {
    semilla = (semilla * 16807) % 2147483647;
    return (semilla - 1) / 2147483646;
  };
  const elegir = <T,>(lista: T[]) => lista[Math.floor(azar() * lista.length)];

  const intervalo = 15;
  const vuelta = duracionVueltaMin();
  const primera = new Date(ahora.getTime() - (vuelta + 15) * 60_000);
  primera.setMinutes(Math.ceil(primera.getMinutes() / intervalo) * intervalo, 0, 0);

  const partidas: Partida[] = [];
  let numeroBuggy = 1;
  let numeroCarro = 1;

  for (let salida = primera; salida.getTime() < ahora.getTime() + 35 * 60_000; salida = new Date(salida.getTime() + intervalo * 60_000)) {
    const i = partidas.length;
    const partidaId = nuevoId();
    const hoyoSalida = i % 6 === 4 ? 10 : 1;

    const jugadores: Jugador[] = Array.from({ length: 2 + Math.floor(azar() * 3) }, (_, orden) => {
      const jugadorId = nuevoId();
      const r = azar();
      const tipo: TipoAlquiler | null = r < 0.25 ? 'buggy' : r < 0.45 ? 'carro_electrico' : null;
      return {
        id: jugadorId,
        partida_id: partidaId,
        nombre: `${elegir(NOMBRES)} ${elegir(APELLIDOS)}`,
        orden,
        alquiler: tipo
          ? { id: nuevoId(), partida_id: partidaId, jugador_id: jugadorId, tipo, numero: tipo === 'buggy' ? numeroBuggy++ : numeroCarro++ }
          : null,
      };
    });

    // Cuánto se retrasa esta partida respecto al ritmo ideal (min): la mitad van bien,
    // unas cuantas en ámbar y alguna en rojo (el retraso crece a lo largo de la vuelta).
    const tipoRitmo = azar();
    const retrasoReal = tipoRitmo < 0.5 ? -2 + azar() * 5 : tipoRitmo < 0.8 ? 5 + azar() * 4 : 10 + azar() * 6;

    const avistamientos: Avistamiento[] = [];
    const minutosJugados = (ahora.getTime() - salida.getTime()) / 60_000;
    const duracionReal = vuelta + retrasoReal * 1.6;
    // Una de cada ocho partidas en juego se queda "sin ver" para que se vea ese estado.
    if (minutosJugados > 10 && azar() > 0.12) {
      // El último avistamiento es reciente (hace 2–22 min) y los anteriores, cada 35–75 min hacia atrás.
      const ultimoMomento = Math.min(minutosJugados, duracionReal) - 2 - azar() * 20;
      const momentos: number[] = [];
      for (let m = ultimoMomento; m > 5; m -= 35 + azar() * 40) momentos.unshift(m);
      for (const minuto of momentos) {
        const visto = new Date(salida.getTime() + minuto * 60_000);
        const progreso = minuto / vuelta;
        const salidaEfectiva = new Date(salida.getTime() + retrasoReal * progreso * 60_000 * 1.6);
        const donde = posicionEsperada({ horaSalida: salidaEfectiva, hoyoSalida }, visto);
        if (donde.fase !== 'jugando') continue;
        const resultado = evaluarRitmo({ horaSalida: salida, hoyoSalida }, donde.hoyo, donde.posicion, visto);
        avistamientos.push({
          id: nuevoId(),
          partida_id: partidaId,
          hoyo: donde.hoyo,
          posicion: donde.posicion,
          revision_iniciada_en: new Date(visto.getTime() - (1 + azar() * 3) * 60_000).toISOString(),
          visto_en: visto.toISOString(),
          retraso_min: resultado.retrasoMin,
          estado: resultado.estado,
          marshal: 'Marshal (demo)',
        });
      }
    }

    const finPrevisto = salida.getTime() + duracionReal * 60_000;
    const ultimo = avistamientos.at(-1);
    const enJuego = minutosJugados > 0 && finPrevisto > ahora.getTime();
    partidas.push({
      id: partidaId,
      torneo_id: torneoId,
      fecha,
      hora_salida: salida.toISOString(),
      hoyo_salida: hoyoSalida,
      nombre: '',
      observaciones: ultimo && ultimo.retraso_min > 5 ? elegir(NOTAS_LENTAS) : '',
      // Una partida con el Marshal revisándola ahora mismo.
      revision_iniciada_en: enJuego && i % 7 === 5 ? new Date(ahora.getTime() - 2 * 60_000).toISOString() : null,
      terminada_en: finPrevisto < ahora.getTime() ? new Date(finPrevisto).toISOString() : null,
      jugadores,
      avistamientos,
    });
  }
  return partidas;
}
