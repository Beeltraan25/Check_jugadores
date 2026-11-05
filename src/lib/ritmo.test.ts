import { describe, expect, it } from 'vitest';
import {
  clasificarRetraso,
  duracionVueltaMin,
  evaluarRitmo,
  minutoInicioHoyo,
  posicionEsperada,
  textoRetraso,
  ventanaIdeal,
} from './ritmo';

/** Fecha fija de prueba a una hora local concreta. */
const a = (hora: string) => new Date(`2026-05-10T${hora}`);
const salidaTee1 = { horaSalida: a('10:00:00'), hoyoSalida: 1 };
const salidaTee10 = { horaSalida: a('10:00:00'), hoyoSalida: 10 };

describe('minutoInicioHoyo', () => {
  it('saliendo por el 1, cada hoyo empieza 15 min después del anterior', () => {
    expect(minutoInicioHoyo(1, 1)).toBe(0);
    expect(minutoInicioHoyo(2, 1)).toBe(15);
    expect(minutoInicioHoyo(18, 1)).toBe(255);
  });

  it('saliendo por el 10, el hoyo 1 es el décimo que juegan', () => {
    expect(minutoInicioHoyo(10, 10)).toBe(0);
    expect(minutoInicioHoyo(18, 10)).toBe(120);
    expect(minutoInicioHoyo(1, 10)).toBe(135);
    expect(minutoInicioHoyo(9, 10)).toBe(255);
  });

  it('rechaza hoyos que no existen', () => {
    expect(() => minutoInicioHoyo(19, 1)).toThrow(RangeError);
  });
});

describe('ventanaIdeal', () => {
  it('el green del hoyo 1 va de 10:11:15 a 10:15 (terminan el hoyo a las 10:15)', () => {
    const v = ventanaIdeal(salidaTee1, 1, 'green');
    expect(v.desde).toEqual(a('10:11:15'));
    expect(v.hasta).toEqual(a('10:15:00'));
  });

  it('el tee del hoyo 2 empieza a las 10:15', () => {
    expect(ventanaIdeal(salidaTee1, 2, 'tee').desde).toEqual(a('10:15:00'));
  });
});

describe('evaluarRitmo', () => {
  it('en el green del 1 a las 10:15 van en tiempo', () => {
    const r = evaluarRitmo(salidaTee1, 1, 'green', a('10:15:00'));
    expect(r.retrasoMin).toBe(0);
    expect(r.estado).toBe('en_tiempo');
  });

  it('todavía en el tee del 1 a las 10:10 van 6 min tarde → atención', () => {
    const r = evaluarRitmo(salidaTee1, 1, 'tee', a('10:10:00'));
    expect(r.retrasoMin).toBe(6.3);
    expect(r.estado).toBe('aviso');
  });

  it('hasta 5 min tarde sigue en verde', () => {
    const r = evaluarRitmo(salidaTee1, 1, 'green', a('10:20:00'));
    expect(r.retrasoMin).toBe(5);
    expect(r.estado).toBe('en_tiempo');
  });

  it('de 6 a 14 min tarde es ámbar y desde 15 es rojo', () => {
    expect(evaluarRitmo(salidaTee1, 1, 'green', a('10:21:00')).estado).toBe('aviso');
    expect(evaluarRitmo(salidaTee1, 1, 'green', a('10:29:00')).estado).toBe('aviso');
    expect(evaluarRitmo(salidaTee1, 1, 'green', a('10:30:00')).estado).toBe('retrasado');
  });

  it('llegar al hoyo 3 a las 10:20 es ir 10 min adelantados', () => {
    const r = evaluarRitmo(salidaTee1, 3, 'tee', a('10:20:00'));
    expect(r.retrasoMin).toBe(-10);
    expect(r.estado).toBe('adelantado');
  });

  it('saliendo por el 10, el green del hoyo 1 debería ser a las 12:30', () => {
    expect(evaluarRitmo(salidaTee10, 1, 'green', a('12:30:00')).retrasoMin).toBe(0);
    expect(evaluarRitmo(salidaTee10, 1, 'green', a('12:45:00')).estado).toBe('retrasado');
  });

  it('salida a tiro por el tee 4: el hoyo 3 es el último que juegan', () => {
    const salidaTee4 = { horaSalida: a('09:30:00'), hoyoSalida: 4 };
    expect(minutoInicioHoyo(3, 4)).toBe(255);
    expect(evaluarRitmo(salidaTee4, 3, 'green', a('14:00:00')).retrasoMin).toBe(0);
  });

  it('nunca devuelve -0', () => {
    const r = evaluarRitmo(salidaTee1, 1, 'segundo_golpe', a('10:03:43'));
    expect(Object.is(r.retrasoMin, -0)).toBe(false);
  });
});

describe('clasificarRetraso', () => {
  it('verde hasta 5, ámbar hasta 14, rojo desde 15 (en minutos enteros)', () => {
    expect(clasificarRetraso(-6)).toBe('adelantado');
    expect(clasificarRetraso(-5)).toBe('en_tiempo');
    expect(clasificarRetraso(5)).toBe('en_tiempo');
    expect(clasificarRetraso(5.4)).toBe('en_tiempo');
    expect(clasificarRetraso(5.5)).toBe('aviso');
    expect(clasificarRetraso(14)).toBe('aviso');
    expect(clasificarRetraso(14.4)).toBe('aviso');
    expect(clasificarRetraso(14.5)).toBe('retrasado');
    expect(clasificarRetraso(15)).toBe('retrasado');
  });
});

describe('posicionEsperada', () => {
  it('antes de la hora de salida', () => {
    expect(posicionEsperada(salidaTee1, a('09:55:00')).fase).toBe('antes_de_salir');
  });

  it('a las 10:35 deberían estar en el 2º golpe del hoyo 3', () => {
    expect(posicionEsperada(salidaTee1, a('10:35:00'))).toEqual({
      fase: 'jugando',
      hoyo: 3,
      posicion: 'segundo_golpe',
    });
  });

  it('saliendo por el 10, a las 12:12 deberían estar en el green del 18', () => {
    expect(posicionEsperada(salidaTee10, a('12:12:00'))).toEqual({
      fase: 'jugando',
      hoyo: 18,
      posicion: 'green',
    });
  });

  it('tras 4 h 30 min la vuelta está terminada', () => {
    expect(duracionVueltaMin()).toBe(270);
    expect(posicionEsperada(salidaTee1, a('14:30:00')).fase).toBe('terminado');
    expect(posicionEsperada(salidaTee10, a('14:31:00'))).toMatchObject({ fase: 'terminado', hoyo: 9 });
  });
});

describe('textoRetraso', () => {
  it('formatea con signo', () => {
    expect(textoRetraso(6.3)).toBe('+6 min');
    expect(textoRetraso(-4)).toBe('−4 min');
    expect(textoRetraso(0.2)).toBe('0 min');
  });
});
