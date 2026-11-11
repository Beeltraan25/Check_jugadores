/**
 * Ronda de revisión del Marshal: se empieza UNA vez y vale para todas las partidas.
 * Mientras está en marcha, al tocar la posición de cualquier partida se apunta la hora en
 * ese momento, y cada vista queda guardada con la hora de inicio de la ronda.
 * Se guarda en el propio dispositivo (cada Marshal lleva su ronda) y va ligada al torneo o
 * a las salidas en uso: al cambiar de torneo, la ronda no se arrastra.
 */
import { useCallback, useEffect, useState } from 'react';

const CLAVE = 'ritmo-golf:ronda';
const EVENTO = 'ritmo-golf:ronda-cambiada';

interface RondaGuardada {
  jornadaId: string;
  inicio: string;
}

function leer(): RondaGuardada | null {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as RondaGuardada | null;
  } catch {
    return null;
  }
}

function escribir(ronda: RondaGuardada | null) {
  try {
    if (ronda) localStorage.setItem(CLAVE, JSON.stringify(ronda));
    else localStorage.removeItem(CLAVE);
  } catch {
    /* sin almacenamiento: la ronda dura mientras la pantalla esté abierta */
  }
  window.dispatchEvent(new Event(EVENTO));
}

export interface Ronda {
  /** Hora (ISO) a la que empezó la ronda en curso, o null si no hay ronda. */
  inicio: string | null;
  empezar: () => void;
  terminar: () => void;
}

export function useRonda(jornadaId: string | null | undefined): Ronda {
  const [guardada, setGuardada] = useState(leer);

  useEffect(() => {
    const recargar = () => setGuardada(leer());
    window.addEventListener(EVENTO, recargar);
    window.addEventListener('storage', recargar);
    return () => {
      window.removeEventListener(EVENTO, recargar);
      window.removeEventListener('storage', recargar);
    };
  }, []);

  const empezar = useCallback(() => {
    if (jornadaId) escribir({ jornadaId, inicio: new Date().toISOString() });
  }, [jornadaId]);
  const terminar = useCallback(() => escribir(null), []);

  return {
    inicio: guardada && guardada.jornadaId === jornadaId ? guardada.inicio : null,
    empezar,
    terminar,
  };
}
