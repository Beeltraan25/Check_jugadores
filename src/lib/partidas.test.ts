import { describe, expect, it } from 'vitest';
import type { Avistamiento, Partida } from '../datos/tipos';
import { compararUrgencia, minutosSinVer } from './partidas';

const a = (hhmm: string) => new Date(`2026-11-11T${hhmm}:00`);

function partida(id: string, salida: string, vistas: [string, number][] = []): Partida {
  return {
    id,
    torneo_id: 't',
    fecha: '2026-11-11',
    hora_salida: a(salida).toISOString(),
    hoyo_salida: 1,
    nombre: '',
    observaciones: '',
    revision_iniciada_en: null,
    terminada_en: null,
    jugadores: [],
    avistamientos: vistas.map(
      ([hora, retraso], i): Avistamiento => ({
        id: `${id}-${i}`,
        partida_id: id,
        hoyo: 3,
        posicion: 'tee',
        revision_iniciada_en: null,
        visto_en: a(hora).toISOString(),
        retraso_min: retraso,
        estado: retraso >= 15 ? 'retrasado' : retraso > 5 ? 'aviso' : 'en_tiempo',
        marshal: null,
      }),
    ),
  };
}

describe('orden "más urgentes" del Marshal', () => {
  const ahora = a('12:00');
  const roja = partida('roja', '10:00', [['11:50', 18]]);
  const muyRoja = partida('muyRoja', '10:10', [['11:55', 25]]);
  const vistaHacePoco = partida('reciente', '10:20', [['11:55', 2]]);
  const sinVerHaceMucho = partida('olvidada', '10:30', [['10:50', 0]]);
  const nuncaVista = partida('nunca', '11:00');
  const porSalir = partida('porSalir', '12:30');

  it('primero las rojas (la más retrasada antes), luego las que llevan más sin ver, al final las que no han salido', () => {
    const orden = [porSalir, vistaHacePoco, nuncaVista, roja, sinVerHaceMucho, muyRoja]
      .sort((x, y) => compararUrgencia(x, y, ahora))
      .map((p) => p.id);
    expect(orden).toEqual(['muyRoja', 'roja', 'olvidada', 'nunca', 'reciente', 'porSalir']);
  });

  it('cuenta el tiempo sin ver desde la última vista o desde la salida', () => {
    expect(minutosSinVer(sinVerHaceMucho, ahora)).toBe(70);
    expect(minutosSinVer(nuncaVista, ahora)).toBe(60);
  });
});
