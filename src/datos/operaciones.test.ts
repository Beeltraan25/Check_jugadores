import { describe, expect, it } from 'vitest';
import { aplicarOperacion, type Estado, type Operacion } from './operaciones';
import type { Avistamiento, Partida, Torneo } from './tipos';

const torneo: Torneo = {
  id: 't1',
  nombre: 'Torneo de otoño',
  fecha: '2026-05-10',
  notas: '',
  creado_en: '2026-05-01T10:00:00.000Z',
  cerrado_en: null,
};

const partida: Partida = {
  id: 'p1',
  torneo_id: 't1',
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

const inicial: Estado = { torneos: [torneo], partidas: [partida] };

describe('aplicarOperacion: partidas', () => {
  it('registrar un avistamiento lo añade y cierra la revisión', () => {
    const { partidas } = aplicarOperacion(inicial, { tipo: 'registrar_avistamiento', avistamiento });
    expect(partidas[0].avistamientos).toHaveLength(1);
    expect(partidas[0].revision_iniciada_en).toBeNull();
  });

  it('es idempotente: aplicar dos veces la misma operación no duplica', () => {
    const op = { tipo: 'registrar_avistamiento', avistamiento } as const;
    const dos = aplicarOperacion(aplicarOperacion(inicial, op), op);
    expect(dos.partidas[0].avistamientos).toHaveLength(1);

    const crear = { tipo: 'crear_partida', partida } as const;
    const vacio: Estado = { torneos: [], partidas: [] };
    expect(aplicarOperacion(aplicarOperacion(vacio, crear), crear).partidas).toHaveLength(1);
  });

  it('asigna y quita un buggy a un jugador', () => {
    const conBuggy = aplicarOperacion(inicial, {
      tipo: 'asignar_alquiler',
      partidaId: 'p1',
      jugadorId: 'j1',
      alquiler: { id: 'b1', partida_id: 'p1', jugador_id: 'j1', tipo: 'buggy', numero: 7 },
    });
    expect(conBuggy.partidas[0].jugadores[0].alquiler?.numero).toBe(7);

    const sinBuggy = aplicarOperacion(conBuggy, { tipo: 'asignar_alquiler', partidaId: 'p1', jugadorId: 'j1', alquiler: null });
    expect(sinBuggy.partidas[0].jugadores[0].alquiler).toBeNull();
  });

  it('no toca el estado original (inmutable)', () => {
    aplicarOperacion(inicial, { tipo: 'guardar_observaciones', partidaId: 'p1', texto: 'Buscando bola' });
    expect(inicial.partidas[0].observaciones).toBe('');
  });
});

describe('aplicarOperacion: torneos', () => {
  const nuevo: Torneo = { ...torneo, id: 't2', nombre: 'Torneo de invierno', fecha: '2026-12-01' };
  const partidaNueva: Partida = { ...partida, id: 'p2', torneo_id: 't2', avistamientos: [] };

  it('crear un torneo añade el torneo (el más reciente primero) y sus partidas, sin duplicar', () => {
    const op: Operacion = { tipo: 'crear_torneo', torneo: nuevo, partidas: [partidaNueva] };
    const una = aplicarOperacion(inicial, op);
    const dos = aplicarOperacion(una, op);
    expect(dos.torneos.map((t) => t.id)).toEqual(['t2', 't1']);
    expect(dos.partidas.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('cerrar un torneo guarda la hora de cierre', () => {
    const cerrado = aplicarOperacion(inicial, {
      tipo: 'actualizar_torneo',
      torneoId: 't1',
      cambios: { cerrado_en: '2026-05-10T14:00:00.000Z' },
    });
    expect(cerrado.torneos[0].cerrado_en).toBe('2026-05-10T14:00:00.000Z');
  });

  it('eliminar un torneo borra también sus partidas', () => {
    const conDos = aplicarOperacion(inicial, { tipo: 'crear_torneo', torneo: nuevo, partidas: [partidaNueva] });
    const sinPrimero = aplicarOperacion(conDos, { tipo: 'eliminar_torneo', torneoId: 't1' });
    expect(sinPrimero.torneos.map((t) => t.id)).toEqual(['t2']);
    expect(sinPrimero.partidas.map((p) => p.id)).toEqual(['p2']);
  });
});
