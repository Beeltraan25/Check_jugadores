import { describe, expect, it } from 'vitest';
import { interpretarHorario } from './importar';
import { construirLineas, type TrozoTexto } from './lineasPdf';

/** Trozo de texto en (x, y) con un ancho aproximado según su longitud. */
const t = (x: number, y: number, str: string, alto = 8): TrozoTexto => ({ str, x, y, alto, ancho: str.length * 4.6 });

/**
 * Reproduce la estructura de un horario real de salida a tiro: cabecera con la fecha de
 * impresión y la del torneo, y DOS columnas de partidas en paralelo ("TEE: n (nº) hora" y
 * los jugadores debajo). Los nombres son inventados.
 */
function horarioDosColumnas(): TrozoTexto[] {
  const trozos: TrozoTexto[] = [
    t(65, 813, 'CAMPO DE PRUEBA', 12),
    t(442, 816, 'Fecha Listado:', 9),
    t(510, 816, '31/10/2026', 9),
    t(448, 804, 'Hora Listado:', 9),
    t(510, 804, '16:12:35', 9),
    // Título ancho que cruza las dos columnas (como en el PDF real).
    { ...t(65, 791, 'TORNEO COPA EMPRESAS 01.11.2026', 16), ancho: 308 },
    t(14, 765, 'INDIVIDUAL - Stableford', 9),
    t(388, 765, 'FECHA: 01/11/2026 CODIGO: 123456', 9),
    t(14, 747, 'HORARIO DE SALIDA', 12),
  ];
  const bloques: [number, string, string, string, string[]][] = [
    // [columna x, tee, nº, hora, jugadores]
    [14, '1', '(01)', '09:30', ['ALONSO PEREZ, ANA', 'BRAVO GIL, LUIS', 'CANO RUIZ, EVA']],
    [294, '1', '(02)', '09:40', ['DURAN SOTO, PABLO', 'ESTEBAN MORA, LUZ', 'FUENTES DIAZ, RAUL', 'GARRIDO PAZ, NURIA']],
    [14, '2', '(03)', '09:30', ['HIDALGO LEON, JAVIER', 'IBARRA SANZ CORDERO', 'JIMENEZ ROS, MARTA', 'LORENZO VELA, DIEGO']],
    [294, '10', '(04)', '09:30', ['MARIN CRUZ, SARA', 'Navas Peña, Andrés', 'ORTIZ,BEATRIZ', 'PRADO DE LA TORRE VILLALBA']],
  ];
  let y = 692;
  for (let i = 0; i < bloques.length; i += 2) {
    for (const [x, tee, num, hora, jugadores] of bloques.slice(i, i + 2)) {
      trozos.push(
        { ...t(x, y + 15, '_'.repeat(52), 9), ancho: 262 },
        t(x, y, `TEE: ${tee}`, 9),
        t(x + 36, y + 2, num),
        t(x + 57, y, hora, 9),
      );
      jugadores.forEach((j, k) => trozos.push(t(x + 86, y + 2 - k * 8.6, j)));
    }
    y -= 41; // el 4º jugador queda a la altura del subrayado del bloque siguiente (como en el PDF real)
  }
  return trozos;
}

describe('construirLineas', () => {
  it('lee por separado las dos columnas de partidas', () => {
    const lineas = construirLineas(horarioDosColumnas());
    // Ninguna línea mezcla dos horas de salida (izquierda y derecha).
    expect(lineas.filter((l) => (l.match(/\b\d{2}:\d{2}\b(?!:)/g) ?? []).length > 1)).toEqual([]);
  });

  it('una sola columna (tabla con columnas Hora, Jugador, Club…) no se parte', () => {
    const trozos = [0, 1, 2].flatMap((i) => [
      t(20, 700 - i * 12, `09:${i}0`),
      t(60, 700 - i * 12, `APELLIDO${'ABC'[i]} UNO, NOMBRE`),
      t(300, 700 - i * 12, 'INDEPENDIENTE'),
    ]);
    expect(construirLineas(trozos)).toHaveLength(3);
  });
});

describe('horario de salida a tiro en dos columnas', () => {
  const r = interpretarHorario(construirLineas(horarioDosColumnas()));

  it('saca nombre y fecha del torneo (no la del listado)', () => {
    expect(r.nombre).toBe('Torneo Copa Empresas');
    expect(r.fecha).toBe('2026-11-01');
  });

  it('saca cada partida con su tee, su hora y sus jugadores', () => {
    expect(r.partidas.map((p) => [p.hora, p.hoyoSalida, p.jugadores.length])).toEqual([
      ['09:30', 1, 3],
      ['09:30', 2, 4],
      ['09:30', 10, 4],
      ['09:40', 1, 4],
    ]);
  });

  it('acepta nombres sin coma o cortados y no confunde la hora de impresión', () => {
    const todos = r.partidas.flatMap((p) => p.jugadores);
    expect(todos).toContain('Ibarra Sanz Cordero');
    expect(todos).toContain('Prado de la Torre Villalba');
    expect(todos).toContain('Lorenzo Vela, Diego'); // 4º jugador, junto al subrayado
    expect(todos).toContain('Ortiz, Beatriz');
    expect(todos).toContain('Navas Peña, Andrés');
    expect(r.partidas.some((p) => p.hora === '16:12')).toBe(false);
  });
});
