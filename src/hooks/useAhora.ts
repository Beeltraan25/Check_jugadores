import { useEffect, useRef, useState } from 'react';

/** Hora actual que se refresca cada `cadaMs` (para relojes y estados que dependen del tiempo). */
export function useAhora(cadaMs = 15_000): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), cadaMs);
    return () => window.clearInterval(id);
  }, [cadaMs]);
  return ahora;
}

/** true durante unos segundos cada vez que `valor` cambia (no en el primer render). */
export function useRecienCambiado(valor: unknown, duracionMs = 4000): boolean {
  const anterior = useRef(valor);
  const [activo, setActivo] = useState(false);
  useEffect(() => {
    if (anterior.current === valor) return;
    anterior.current = valor;
    setActivo(true);
    const id = window.setTimeout(() => setActivo(false), duracionMs);
    return () => window.clearTimeout(id);
  }, [valor, duracionMs]);
  return activo;
}
