import { describe, expect, it } from 'vitest';
import type { Torneo } from '../datos/tipos';
import { esSalidas, idSalidasDelDia, jornadaDeSalidas, resolverJornada, torneosAbiertosDelDia, torneosRepetidos } from './jornadas';

const torneo = (id: string, fecha: string, cerrado = false): Torneo => ({
  id,
  nombre: id,
  organizador: '',
  fecha,
  notas: '',
  creado_en: `${fecha}T08:00:00.000Z`,
  cerrado_en: cerrado ? `${fecha}T18:00:00.000Z` : null,
});

const HOY = '2026-11-11';
const salidasHoy = jornadaDeSalidas(HOY);
const salidasAyer = jornadaDeSalidas('2026-11-10');

describe('salidas normales', () => {
  it('el identificador depende solo de la fecha y tiene forma de UUID', () => {
    expect(idSalidasDelDia(HOY)).toBe('5a11da50-0000-4000-8000-000020261111');
    expect(idSalidasDelDia(HOY)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(jornadaDeSalidas(HOY)).toEqual(jornadaDeSalidas(HOY)); // dos dispositivos crean lo mismo
  });

  it('distingue salidas normales de torneos', () => {
    expect(esSalidas(salidasHoy)).toBe(true);
    expect(esSalidas(torneo('3f2b0c1e-1111-4222-8333-444455556666', HOY))).toBe(false);
    expect(salidasHoy.nombre).toBe('Salidas del miércoles, 11 de noviembre');
  });
});

describe('resolverJornada (qué se usa en un dispositivo)', () => {
  const copa = torneo('copa', HOY);
  const antiguo = torneo('antiguo', '2026-11-01');

  it('respeta lo que eligió el dispositivo', () => {
    expect(resolverJornada([copa, salidasHoy], salidasHoy.id, HOY)?.id).toBe(salidasHoy.id);
    expect(resolverJornada([copa, salidasHoy], 'copa', HOY)?.id).toBe('copa');
  });

  it('las salidas de ayer ya no se usan aunque se hubieran elegido', () => {
    expect(resolverJornada([salidasHoy, salidasAyer], salidasAyer.id, HOY)?.id).toBe(salidasHoy.id);
  });

  it('por defecto: torneo abierto de hoy; si no, las salidas de hoy; si no, el torneo abierto más reciente', () => {
    expect(resolverJornada([copa, salidasHoy, antiguo], null, HOY)?.id).toBe('copa');
    expect(resolverJornada([salidasHoy, antiguo], null, HOY)?.id).toBe(salidasHoy.id);
    expect(resolverJornada([salidasAyer, antiguo], null, HOY)?.id).toBe('antiguo');
  });

  it('si todo está cerrado, el torneo más reciente; sin nada, null', () => {
    expect(resolverJornada([salidasAyer, torneo('cerrado', '2026-11-05', true)], null, HOY)?.id).toBe('cerrado');
    expect(resolverJornada([], null, HOY)).toBeNull();
  });
});

describe('torneos repetidos', () => {
  const tgea = { ...torneo('a', HOY), nombre: 'Torneo Tgea 14 11 2026' };
  const otro = { ...torneo('b', HOY), nombre: 'Copa Corporate' };
  const tgeaAyer = { ...torneo('c', '2026-11-10'), nombre: 'Torneo Tgea 14 11 2026' };

  it('detecta el mismo nombre y fecha aunque cambien mayúsculas, tildes o espacios', () => {
    const lista = [tgea, otro, tgeaAyer, salidasHoy];
    expect(torneosRepetidos(lista, '  torneo  TGEA 14 11 2026 ', HOY)).toEqual([tgea]);
    expect(torneosRepetidos([{ ...otro, nombre: 'Copa Él' }], 'copa el', HOY)).toHaveLength(1);
    expect(torneosRepetidos(lista, 'Otro torneo', HOY)).toEqual([]);
  });

  it('lista solo los torneos abiertos del día (sin salidas normales)', () => {
    const cerrado = { ...torneo('d', HOY, true), nombre: 'Cerrado' };
    expect(torneosAbiertosDelDia([tgea, otro, tgeaAyer, salidasHoy, cerrado], HOY)).toEqual([tgea, otro]);
  });
});
