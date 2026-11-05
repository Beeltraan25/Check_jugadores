import { describe, expect, it } from 'vitest';
import { aplicarOperacion } from './operaciones';
import type { Avistamiento, Partida } from './tipos';

const partida: Partida = {
  id: 'p1',
  fecha: '2026-05-10',
  hora_salida: '2026-05-10T08:00:00.000Z',
  hoyo_salida: 1,
  nombre: '',
  observaciones: '',
  revision_iniciada_en: '2026-05-10T08:20:00.000Z',
  terminada_en: null,
  jugadores: [{ id: 'j1', partida_id: 'p1', nombre: 'Ana Ruiz', orden: 0, alquiler: null }],
  avistamientos: [],
};

const avistamiento: Avistamiento = {
  id: 'a1',
  partida_id: 'p1',
  hoyo: 2,
  posicion: 'green',
  revision_iniciada_en: '2026-05-10T08:20:00.000Z',
  visto_en: '2026-05-10T08:25:00.000Z',
  retraso_min: -5,
  estado: 'adelantado',
  marshal: 'Marshal',
};

describe('aplicarOperacion', () => {
  it('registrar un avistamiento lo añade y cierra la revisión', () => {
    const [p] = aplicarOperacion([partida], { tipo: 'registrar_avistamiento', avistamiento });
    expect(p.avistamientos).toHaveLength(1);
    expect(p.revision_iniciada_en).toBeNull();
  });

  it('es idempotente: aplicar dos veces la misma operación no duplica', () => {
    const op = { tipo: 'registrar_avistamiento', avistamiento } as const;
    const una = aplicarOperacion([partida], op);
    const dos = aplicarOperacion(una, op);
    expect(dos[0].avistamientos).toHaveLength(1);

    const crear = { tipo: 'crear_partida', partida } as const;
    expect(aplicarOperacion(aplicarOperacion([], crear), crear)).toHaveLength(1);
  });

  it('asigna y quita un buggy a un jugador', () => {
    const conBuggy = aplicarOperacion([partida], {
      tipo: 'asignar_alquiler',
      partidaId: 'p1',
      jugadorId: 'j1',
      alquiler: { id: 'b1', partida_id: 'p1', jugador_id: 'j1', tipo: 'buggy', numero: 7 },
    });
    expect(conBuggy[0].jugadores[0].alquiler?.numero).toBe(7);

    const sinBuggy = aplicarOperacion(conBuggy, { tipo: 'asignar_alquiler', partidaId: 'p1', jugadorId: 'j1', alquiler: null });
    expect(sinBuggy[0].jugadores[0].alquiler).toBeNull();
  });

  it('no toca el array original (inmutable)', () => {
    const original = [partida];
    aplicarOperacion(original, { tipo: 'guardar_observaciones', partidaId: 'p1', texto: 'Buscando bola' });
    expect(original[0].observaciones).toBe('');
  });
});
