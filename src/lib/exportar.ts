/**
 * Exportación de un torneo a CSV para abrirlo en Excel (separador ";" y coma decimal,
 * que es lo que espera Excel en español).
 */
import { NOMBRE_ALQUILER, type Partida, type Torneo } from '../datos/tipos';
import { hhmm } from './hora';
import { NOMBRE_POSICION } from './ritmo';
import { ESTADO_TEXTO } from './textos';

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

/** Descarga un CSV en el navegador (con BOM para que Excel lea bien las tildes). */
export function descargarCsv(nombre: string, contenido: string) {
  const blob = new Blob(['﻿', contenido], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
