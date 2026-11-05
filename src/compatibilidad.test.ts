/**
 * Vigila que el código de la app no use cosas que rompen Safari en iPhone/iPad antiguos
 * (la app debe funcionar desde iOS 15.4). Si algo de esto falla, toda la app deja de cargar.
 */
import { describe, expect, it } from 'vitest';

// Texto de todos los archivos de la app (sin los tests).
const fuentes = import.meta.glob(['./**/*.ts', './**/*.tsx', '!./**/*.test.ts', '!./**/*.test.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const conPatron = (patron: RegExp) =>
  Object.entries(fuentes)
    .filter(([, texto]) => patron.test(texto))
    .map(([ruta]) => ruta);

describe('compatibilidad con Safari (iOS 15.4+)', () => {
  it('lee el código de la app', () => {
    expect(Object.keys(fuentes).length).toBeGreaterThan(20);
  });

  it('sin expresiones regulares con lookbehind (?<= o (?<! (Safari < 16.4 no las entiende)', () => {
    expect(conPatron(/\(\?<[=!]/)).toEqual([]);
  });

  it('sin funciones de JavaScript posteriores a iOS 15.4', () => {
    expect(
      conPatron(
        /\.(findLast|findLastIndex|toSorted|toReversed|toSpliced)\(|Object\.groupBy|Array\.fromAsync|Promise\.withResolvers|structuredClone\(/,
      ),
    ).toEqual([]);
  });
});
