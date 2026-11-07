import { describe, expect, it } from 'vitest';
import type { Avistamiento, Partida, Torneo } from '../datos/tipos';
import {
  anonimizarTexto,
  compararOrganizadores,
  conclusionTorneo,
  minutosIdealesHasta,
  resumirRitmoTorneo,
  ritmoDePartida,
  textoDuracion,
  textoRitmo,
} from './informes';

const hora = (hhmm: string) => new Date(`2026-11-01T${hhmm}:00`).toISOString();

let contador = 0;
function vista(hhmm: string, hoyo: number, posicion: Avistamiento['posicion'], retraso: number): Avistamiento {
  return {
    id: `v${contador++}`,
    partida_id: 'p',
    hoyo,
    posicion,
    revision_iniciada_en: null,
    visto_en: hora(hhmm),
    retraso_min: retraso,
    estado: retraso >= 15 ? 'retrasado' : retraso > 5 ? 'aviso' : 'en_tiempo',
    marshal: 'Marshal',
  };
}

function partida(id: string, salida: string, vistas: Avistamiento[], extra: Partial<Partida> = {}): Partida {
  return {
    id,
    torneo_id: 't',
    fecha: '2026-11-01',
    hora_salida: hora(salida),
    hoyo_salida: 1,
    nombre: '',
    observaciones: '',
    revision_iniciada_en: null,
    terminada_en: null,
    jugadores: [
      { id: `${id}-1`, partida_id: id, nombre: 'Garcia Lopez, Juan', orden: 0, alquiler: { id: 'a', partida_id: id, jugador_id: `${id}-1`, tipo: 'buggy', numero: 3 } },
      { id: `${id}-2`, partida_id: id, nombre: 'Ana Ruiz', orden: 1, alquiler: null },
    ],
    avistamientos: vistas.map((v) => ({ ...v, partida_id: id })),
    ...extra,
  };
}

const torneo = (id: string, organizador: string): Torneo => ({
  id,
  nombre: `Torneo ${id}`,
  organizador,
  fecha: '2026-11-01',
  notas: '',
  creado_en: hora('08:00'),
  cerrado_en: null,
});

describe('minutosIdealesHasta', () => {
  it('3er golpe del hoyo 5 saliendo por el 1: 4 hoyos + la mitad del tramo = 69,4 min', () => {
    expect(minutosIdealesHasta({ hoyo: 5, posicion: 'tercer_golpe' }, 1)).toBeCloseTo(69.375);
  });
  it('saliendo por el 10, el hoyo 1 es el décimo', () => {
    expect(minutosIdealesHasta({ hoyo: 1, posicion: 'tee' }, 10)).toBeCloseTo(135 + 1.875);
  });
});

describe('ritmoDePartida', () => {
  it('calcula el ritmo real con la última vista y la duración estimada', () => {
    // Salida 09:00, vistos en el 3er golpe del hoyo 5 a las 10:20 (80 min): 15 × 80 / 69,375 = 17,3
    const r = ritmoDePartida(partida('p1', '09:00', [vista('09:40', 3, 'tee', 2), vista('10:20', 5, 'tercer_golpe', 8)]), 1);
    expect(r.etiqueta).toBe('Partida 01');
    expect(r.minutosPorHoyo).toBeCloseTo(17.3, 1);
    expect(r.duracionMin).toBeCloseTo(311.4, 0);
    expect(r.duracionReal).toBe(false);
    expect(r.evolucion).toBe(6);
    expect(r.estadoFinal).toBe('aviso');
    expect(r.buggies).toBe(1);
  });

  it('con una sola vista muy al principio no se estima el ritmo (poca muestra)', () => {
    const r = ritmoDePartida(partida('p1', '09:00', [vista('09:10', 1, 'green', 0)]), 1);
    expect(r.minutosPorHoyo).toBeNull();
    expect(r.duracionMin).toBeNull();
  });

  it('si se marcó terminada, la duración es la real', () => {
    const r = ritmoDePartida(
      partida('p1', '09:00', [vista('12:00', 13, 'tee', 0)], { terminada_en: hora('13:50') }),
      1,
    );
    expect(r.duracionMin).toBe(290);
    expect(r.duracionReal).toBe(true);
  });

  it('quita los nombres de las observaciones y detecta si se les avisó', () => {
    const r = ritmoDePartida(
      partida('p1', '09:00', [], { observaciones: '10:20 Avisados por juego lento. Juan García buscando bola; Ruiz esperando.' }),
      1,
    );
    expect(r.observaciones).not.toMatch(/Juan|Garc|Ruiz/);
    expect(r.observaciones).toContain('[jugador] buscando bola');
    expect(r.avisada).toBe(true);
  });
});

describe('anonimizarTexto', () => {
  it('cambia nombres y apellidos por [jugador], sin tocar el resto', () => {
    expect(anonimizarTexto('Laborda y De la Fuente dejan pasar', ['LABORDA MOREU, RAMON', 'De la Fuente, Ana'])).toBe(
      '[jugador] y De la [jugador] dejan pasar',
    );
    expect(anonimizarTexto('Problema con el buggy', ['Ana Ruiz'])).toBe('Problema con el buggy');
  });
});

describe('resumirRitmoTorneo', () => {
  const partidas = [
    partida('rapida', '09:00', [vista('10:00', 5, 'tee', -3)]),
    partida('lenta', '09:10', [vista('10:40', 5, 'tee', 22)], { observaciones: 'Avisados por juego lento' }),
    partida('sinver', '09:20', []),
  ];
  const r = resumirRitmoTorneo(partidas);

  it('numera por hora de salida y cuenta verdes, ámbar y rojos', () => {
    expect(r.partidas.map((p) => p.etiqueta)).toEqual(['Partida 01', 'Partida 02', 'Partida 03']);
    expect([r.enVerde, r.enAmbar, r.enRojo]).toEqual([1, 0, 1]);
    expect(r.partidasVistas).toBe(2);
    expect(r.avisadas).toBe(1);
    expect(r.llegaronARojo).toBe(1);
  });

  it('ordena las más rápidas y las más lentas', () => {
    expect(r.masRapidas[0].id).toBe('rapida');
    expect(r.masLentas[0].id).toBe('lenta');
  });

  it('escribe una conclusión', () => {
    const frases = conclusionTorneo(r).join(' ');
    expect(frases).toMatch(/min\/hoyo/);
    expect(frases).toMatch(/1 en verde, 0 en ámbar y 1 en rojo/);
  });
});

describe('compararOrganizadores', () => {
  it('agrupa por organizador (aunque se escriba distinto) y ordena del más rápido al más lento', () => {
    const datos = [
      { torneo: torneo('a', 'Green Events'), partidas: [partida('a1', '09:00', [vista('10:15', 5, 'tee', 10)])] },
      { torneo: torneo('b', 'green events '), partidas: [partida('b1', '09:00', [vista('10:10', 5, 'tee', 6)])] },
      { torneo: torneo('c', 'Empresa Rápida'), partidas: [partida('c1', '09:00', [vista('10:00', 5, 'tee', 0)])] },
      { torneo: torneo('d', ''), partidas: [partida('d1', '09:00', [])] },
    ];
    const ranking = compararOrganizadores(datos);
    expect(ranking.map((o) => o.nombre)).toEqual(['Empresa Rápida', 'Green Events', 'Sin organizador']);
    expect(ranking[1].torneos).toHaveLength(2);
    expect(ranking[1].numPartidas).toBe(2);
    expect(ranking[0].minutosPorHoyo!).toBeLessThan(ranking[1].minutosPorHoyo!);
    expect(ranking[2].minutosPorHoyo).toBeNull();
  });
});

describe('formatos', () => {
  it('duración y ritmo', () => {
    expect(textoDuracion(291)).toBe('4 h 51 min');
    expect(textoDuracion(null)).toBe('—');
    expect(textoRitmo(16.27)).toBe('16,3 min/hoyo');
  });
});
