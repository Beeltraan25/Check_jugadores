import { describe, expect, it } from 'vitest';
import type { Partida, Torneo } from '../datos/tipos';
import { aCsv, csvAvistamientos, csvPartidas, nombreArchivo } from './exportar';

const torneo: Torneo = {
  id: 't1',
  nombre: 'Torneo de Otoño',
  organizador: '',
  fecha: '2026-11-15',
  notas: '',
  creado_en: '2026-11-01T10:00:00.000Z',
  cerrado_en: null,
};

const partida: Partida = {
  id: 'p1',
  torneo_id: 't1',
  fecha: '2026-11-15',
  hora_salida: new Date('2026-11-15T10:00:00').toISOString(),
  hoyo_salida: 1,
  nombre: '',
  observaciones: 'Avisados; juego "lento"',
  revision_iniciada_en: null,
  terminada_en: null,
  jugadores: [
    {
      id: 'j1',
      partida_id: 'p1',
      nombre: 'Garcia, Juan',
      orden: 0,
      alquiler: { id: 'a', partida_id: 'p1', jugador_id: 'j1', tipo: 'buggy', numero: 7 },
    },
  ],
  avistamientos: [
    {
      id: 'v1',
      partida_id: 'p1',
      hoyo: 1,
      posicion: 'green',
      revision_iniciada_en: null,
      visto_en: new Date('2026-11-15T10:19:00').toISOString(),
      retraso_min: 4.5,
      estado: 'aviso',
      marshal: 'Marshal Juan',
    },
  ],
};

describe('exportar a CSV', () => {
  it('escapa punto y coma, comillas y usa coma decimal', () => {
    expect(aCsv([['a;b', 'di "hola"', 4.5, null]])).toBe('"a;b";"di ""hola""";4,5;');
  });

  it('una fila por partida con su resumen', () => {
    const [cabecera, fila] = csvPartidas(torneo, [partida]).split('\r\n');
    expect(cabecera.split(';')[0]).toBe('Torneo');
    expect(fila).toContain('10:00');
    expect(fila).toContain('Garcia, Juan: Buggy 7');
    expect(fila).toContain('Atención');
    expect(fila).toContain('"Avisados; juego ""lento"""');
  });

  it('una fila por avistamiento', () => {
    const lineas = csvAvistamientos(torneo, [partida]).split('\r\n');
    expect(lineas).toHaveLength(2);
    expect(lineas[1]).toContain('Green;');
    expect(lineas[1]).toContain('10:19;4,5;Atención;Marshal Juan');
  });

  it('nombre de archivo sin tildes ni espacios', () => {
    expect(nombreArchivo(torneo, 'tiempos')).toBe('2026-11-15_torneo-de-otono_tiempos.csv');
  });
});
