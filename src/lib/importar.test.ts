import { describe, expect, it } from 'vitest';
import { detectarFecha, formatearNombre, interpretarHorario } from './importar';

describe('interpretarHorario', () => {
  it('formato federación: un jugador por línea, misma hora = misma partida', () => {
    const r = interpretarHorario([
      'CLUB DE GOLF',
      'TORNEO SOCIAL DE OTOÑO',
      'Fecha: 15/11/2026',
      'HORARIO DE SALIDAS',
      'Hora   Tee   Jugador   Licencia   Hcp   Club',
      '08:00   1   GARCIA LOPEZ, JUAN   CM12345678   12,4   INDEPENDIENTE',
      '08:00   1   MARTIN RUIZ, ANA   CM87654321   18,0   LA HERRERIA',
      '08:00   1   DE LA FUENTE, PEDRO   CM11112222   9,1   INDEPENDIENTE',
      '08:10   1   PEREZ GIL, LUIS   CM33334444   22,3   RCG LA PUERTA',
      '08:10   1   NUÑEZ DEL RIO, MARIA JOSE   CM55556666   15,2   INDEPENDIENTE',
      '08:00   10   SANCHEZ,EVA   CM9999   5,5   INDEPENDIENTE',
      'Página 1 de 1',
    ]);
    expect(r.nombre).toBe('Torneo Social de Otoño');
    expect(r.fecha).toBe('2026-11-15');
    expect(r.partidas).toEqual([
      { hora: '08:00', hoyoSalida: 1, jugadores: ['Garcia Lopez, Juan', 'Martin Ruiz, Ana', 'De la Fuente, Pedro'] },
      { hora: '08:10', hoyoSalida: 1, jugadores: ['Perez Gil, Luis', 'Nuñez del Rio, Maria Jose'] },
      { hora: '08:00', hoyoSalida: 10, jugadores: ['Sanchez, Eva'] },
    ]);
  });

  it('varios jugadores en la misma línea y "Tee 10" escrito', () => {
    const r = interpretarHorario([
      'Torneo Benéfico Primavera - 3 de mayo de 2026',
      '08:30 Tee 1   Pérez, Luis   Gómez, Eva   Ruiz, Pablo   Sanz, Marta',
      '08:40 Tee 1   López, Ana   Díaz, Jorge',
      '08:30 Tee 10   Moreno, Raúl   Castro, Nuria   Gil, Diego',
    ]);
    expect(r.nombre).toBe('Torneo Benéfico Primavera');
    expect(r.fecha).toBe('2026-05-03');
    expect(r.partidas.map((p) => [p.hora, p.hoyoSalida, p.jugadores.length])).toEqual([
      ['08:30', 1, 4],
      ['08:40', 1, 2],
      ['08:30', 10, 3],
    ]);
    expect(r.partidas[0].jugadores[0]).toBe('Pérez, Luis');
  });

  it('cabeceras "SALIDAS POR EL TEE 10" y hora solo en el primer jugador', () => {
    const r = interpretarHorario([
      'SALIDAS POR EL TEE 1',
      '09:00   Juan García   12.4',
      '        Ana Martín   18',
      '        Luis Pérez   9',
      '09:10   Eva Sánchez   20',
      'SALIDAS POR EL TEE 10',
      '09:00   Pablo Ruiz   7',
      '        Marta Gil   11',
    ]);
    expect(r.partidas).toEqual([
      { hora: '09:00', hoyoSalida: 1, jugadores: ['Juan García', 'Ana Martín', 'Luis Pérez'] },
      { hora: '09:10', hoyoSalida: 1, jugadores: ['Eva Sánchez'] },
      { hora: '09:00', hoyoSalida: 10, jugadores: ['Pablo Ruiz', 'Marta Gil'] },
    ]);
  });

  it('quita los huecos vacíos del horario y guarda lo que no entiende', () => {
    const r = interpretarHorario([
      '10:00   1   ALONSO, JAVIER',
      '10:10   1',
      '10:20   1   BLANCO, LUCIA',
      '10:30   1   CRUZ, DAVID',
      'Texto suelto que no es nada 123',
    ]);
    // (ALONSO, BLANCO y CRUZ tienen hueco; una sexta persona sin hora sí se avisaría)
    expect(r.partidas.map((p) => p.hora)).toEqual(['10:00', '10:20', '10:30']);
    expect(r.ignoradas).toEqual([]); // "Texto suelto…" no parece un jugador: no se avisa
  });

  it('una partida nunca pasa de 4 jugadores aunque repitan hora', () => {
    const nombres = ['ALONSO, ANA', 'BLANCO, LUIS', 'CRUZ, EVA', 'DIAZ, PEDRO', 'ESTEBAN, LUZ'];
    const r = interpretarHorario(nombres.map((n) => `08:00   1   ${n}`));
    expect(r.partidas.map((p) => p.jugadores.length)).toEqual([4, 1]);
  });
});

describe('títulos y avisos', () => {
  it('respeta los números romanos del título', () => {
    expect(interpretarHorario(['XXV TORNEO SOCIAL', '08:00  1  RUIZ, ANA']).nombre).toBe('XXV Torneo Social');
  });

  it('avisa de un posible jugador que no cabe en ninguna partida', () => {
    const lineas = ['08:00  1  A1, ANA', 'B1, LUIS', 'C1, EVA', 'D1, PEDRO', 'E1, LUZ', 'FERRER, MARIO'];
    const r = interpretarHorario(lineas.map((l) => l.replace(/[A-E]1/, (x) => ({ A1: 'ALBA', B1: 'BAEZ', C1: 'CANO', D1: 'DURO', E1: 'EGEA' })[x]!)));
    expect(r.partidas[0].jugadores).toHaveLength(5);
    expect(r.ignoradas).toEqual(['FERRER, MARIO']);
  });
});

describe('detectarFecha', () => {
  it('reconoce varios formatos', () => {
    expect(detectarFecha('Día 5/11/26')).toBe('2026-11-05');
    expect(detectarFecha('Sábado, 21 de noviembre de 2026')).toBe('2026-11-21');
    expect(detectarFecha('sin fecha')).toBeNull();
  });
});

describe('formatearNombre', () => {
  it('pasa a mayúscula inicial respetando partículas', () => {
    expect(formatearNombre('GARCIA DE LA TORRE, MARIA')).toBe('Garcia de la Torre, Maria');
    expect(formatearNombre("O'NEILL-SMITH,  JOHN")).toBe("O'Neill-Smith, John");
    expect(formatearNombre('Ana Ruiz')).toBe('Ana Ruiz');
  });
});
