/**
 * Exportación de un torneo a CSV para abrirlo en Excel (separador ";" y coma decimal,
 * que es lo que espera Excel en español).
 */
import { NOMBRE_ALQUILER, type Partida, type Torneo } from '../datos/tipos';
import { hhmm } from './hora';
import { NOMBRE_POSICION } from './ritmo';
import { ESTADO_TEXTO } from './textos';
import type { ResumenOrganizador, ResumenRitmoTorneo } from './informes';

type Celda = string | number | null | undefined;

function celda(valor: Celda): string {
  if (valor === null || valor === undefined) return '';
  const texto = typeof valor === 'number' ? String(valor).replace('.', ',') : valor;
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function aCsv(filas: Celda[][]): string {
  return filas.map((f) => f.map(celda).join(';')).join('\r\n');
}

const alquileresDe = (p: Partida) =>
  p.jugadores
    .flatMap((j) => (j.alquiler ? [`${j.nombre}: ${NOMBRE_ALQUILER[j.alquiler.tipo]} ${j.alquiler.numero ?? '¿?'}`] : []))
    .join(' | ');

/** Una fila por partida, con su resumen. */
export function csvPartidas(torneo: Torneo, partidas: Partida[]): string {
  const cabecera = [
    'Torneo', 'Fecha', 'Hora salida', 'Tee', 'Partida', 'Jugadores', 'Alquileres', 'Nº avistamientos',
    'Último hoyo', 'Última posición', 'Última hora', 'Último retraso (min)', 'Último estado',
    'Peor retraso (min)', 'Terminada', 'Observaciones',
  ];
  const filas = partidas.map((p) => {
    const ultimo = p.avistamientos.at(-1);
    const peor = p.avistamientos.length ? Math.max(...p.avistamientos.map((a) => a.retraso_min)) : null;
    return [
      torneo.nombre,
      torneo.fecha,
      hhmm(p.hora_salida),
      p.hoyo_salida,
      p.nombre,
      p.jugadores.map((j) => j.nombre).join(' | '),
      alquileresDe(p),
      p.avistamientos.length,
      ultimo?.hoyo,
      ultimo ? NOMBRE_POSICION[ultimo.posicion] : '',
      ultimo ? hhmm(ultimo.visto_en) : '',
      ultimo?.retraso_min,
      ultimo ? ESTADO_TEXTO[ultimo.estado] : 'Sin ver',
      peor,
      p.terminada_en ? hhmm(p.terminada_en) : '',
      p.observaciones,
    ];
  });
  return aCsv([cabecera, ...filas]);
}

/** Una fila por cada vez que se vio a una partida (el detalle completo de tiempos). */
export function csvAvistamientos(torneo: Torneo, partidas: Partida[]): string {
  const cabecera = [
    'Torneo', 'Fecha', 'Hora salida', 'Tee', 'Jugadores', 'Hoyo', 'Posición', 'Revisión desde', 'Visto a las',
    'Retraso (min)', 'Estado', 'Marshal',
  ];
  const filas = partidas.flatMap((p) =>
    p.avistamientos.map((a) => [
      torneo.nombre,
      torneo.fecha,
      hhmm(p.hora_salida),
      p.hoyo_salida,
      p.jugadores.map((j) => j.nombre).join(' | '),
      a.hoyo,
      NOMBRE_POSICION[a.posicion],
      a.revision_iniciada_en ? hhmm(a.revision_iniciada_en) : '',
      hhmm(a.visto_en),
      a.retraso_min,
      ESTADO_TEXTO[a.estado],
      a.marshal,
    ]),
  );
  return aCsv([cabecera, ...filas]);
}

/** Nombre de archivo seguro: "Torneo de otoño" → "2026-11-15_torneo-de-otono". */
export function nombreArchivo(torneo: Torneo, sufijo: string): string {
  const base = torneo.nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${torneo.fecha}_${base || 'torneo'}_${sufijo}.csv`;
}

/**
 * Guarda un CSV (con BOM para que Excel lea bien las tildes).
 * En móvil y tablet abre el menú Compartir (correo, WhatsApp, Archivos…): en iPhone/iPad las
 * descargas dentro de la app instalada no funcionan bien. En el ordenador, se descarga.
 */
export async function descargarCsv(nombre: string, contenido: string) {
  const blob = new Blob(['\uFEFF', contenido], { type: 'text/csv;charset=utf-8' });
  const archivo = new File([blob], nombre, { type: 'text/csv' });
  const tactil = window.matchMedia('(pointer: coarse)').matches;
  if (tactil && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre });
      return;
    } catch (error) {
      if ((error as Error).name === 'AbortError') return; // el usuario cerró el menú
      // Si compartir falla por otro motivo, se descarga como en el ordenador.
    }
  }
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Informes de ritmo SIN NOMBRES -------------------------------------------------

const unDecimal = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);
const siNo = (v: boolean) => (v ? 'Sí' : 'No');

/** Una fila por partida, sin nombres de jugadores. */
export function csvRitmoPartidas(torneo: Torneo, resumen: ResumenRitmoTorneo): string {
  const cabecera = [
    'Torneo', 'Organizador', 'Fecha', 'Partida', 'Hora salida', 'Tee', 'Jugadores', 'Buggies', 'Carros', 'Vistas',
    'Ritmo (min/hoyo)', 'Duración vuelta (min)', 'Duración real', 'Retraso medio (min)', 'Peor retraso (min)',
    'Retraso final (min)', 'Evolución (min)', 'Estado final', 'Llegó a rojo', 'Avisada', 'Observaciones',
  ];
  const filas = resumen.partidas.map((p) => [
    torneo.nombre,
    torneo.organizador,
    torneo.fecha,
    p.etiqueta,
    hhmm(p.horaSalida),
    p.hoyoSalida,
    p.jugadores,
    p.buggies,
    p.carros,
    p.vistas.length,
    unDecimal(p.minutosPorHoyo),
    p.duracionMin === null ? null : Math.round(p.duracionMin),
    p.duracionMin === null ? '' : p.duracionReal ? 'Real' : 'Estimada',
    unDecimal(p.retrasoMedio),
    unDecimal(p.peorRetraso),
    unDecimal(p.retrasoFinal),
    unDecimal(p.evolucion),
    p.estadoFinal ? ESTADO_TEXTO[p.estadoFinal] : 'Sin ver',
    siNo(p.llegoARojo),
    siNo(p.avisada),
    p.observaciones,
  ]);
  return aCsv([cabecera, ...filas]);
}

/** Una fila por cada vista del Marshal, sin nombres. */
export function csvRitmoVistas(torneo: Torneo, resumen: ResumenRitmoTorneo): string {
  const cabecera = [
    'Torneo', 'Organizador', 'Fecha', 'Partida', 'Hora salida', 'Tee', 'Hoyo', 'Posición', 'Revisión desde',
    'Visto a las', 'Retraso (min)', 'Estado',
  ];
  const filas = resumen.partidas.flatMap((p) =>
    p.vistas.map((v) => [
      torneo.nombre,
      torneo.organizador,
      torneo.fecha,
      p.etiqueta,
      hhmm(p.horaSalida),
      p.hoyoSalida,
      v.hoyo,
      NOMBRE_POSICION[v.posicion],
      v.revision_iniciada_en ? hhmm(v.revision_iniciada_en) : '',
      hhmm(v.visto_en),
      v.retraso_min,
      ESTADO_TEXTO[v.estado],
    ]),
  );
  return aCsv([cabecera, ...filas]);
}

/** Ranking de organizadores (del más rápido al más lento). */
export function csvOrganizadores(resumenes: ResumenOrganizador[]): string {
  const cabecera = [
    'Puesto', 'Organizador', 'Torneos', 'Partidas', 'Partidas con ritmo', 'Ritmo medio (min/hoyo)',
    'Duración media (min)', 'Retraso final medio (min)', '% partidas en rojo', 'Partidas avisadas',
  ];
  // El puesto es solo entre organizadores: el juego normal va como referencia, sin puesto.
  const organizadores = resumenes.filter((o) => !o.referencia);
  const filas = resumenes.map((o) => [
    o.referencia ? 'Referencia' : o.minutosPorHoyo === null ? '' : organizadores.indexOf(o) + 1,
    o.nombre,
    o.torneos.length,
    o.numPartidas,
    o.partidasConRitmo,
    unDecimal(o.minutosPorHoyo),
    o.duracionMedia === null ? null : Math.round(o.duracionMedia),
    unDecimal(o.retrasoMedioFinal),
    o.porcentajeRojo === null ? null : Math.round(o.porcentajeRojo),
    o.avisadas,
  ]);
  return aCsv([cabecera, ...filas]);
}
