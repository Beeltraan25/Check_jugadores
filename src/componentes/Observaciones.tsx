/** Campo libre de observaciones con guardado automático y frases rápidas. */
import { useEffect, useRef, useState } from 'react';
import { useDatos } from '../datos/DatosProvider';
import type { Partida } from '../datos/tipos';
import { hhmm } from '../lib/hora';

const FRASES_RAPIDAS = [
  'Avisados por juego lento',
  'Buscando bola',
  'Dejan pasar',
  'Esperando green ocupado',
  'Problema con el buggy',
];

const ESPERA_GUARDADO_MS = 800;

export function EditorObservaciones({ partida }: { partida: Partida }) {
  const { ejecutar } = useDatos();
  const [texto, setTexto] = useState(partida.observaciones);
  const [sinGuardar, setSinGuardar] = useState(false);
  const temporizador = useRef<number | undefined>(undefined);
  const pendiente = useRef<string | null>(null);

  // Cambios llegados de otro dispositivo (solo si aquí no hay nada a medio escribir).
  useEffect(() => {
    if (pendiente.current === null) setTexto(partida.observaciones);
  }, [partida.observaciones]);

  const guardarAhora = () => {
    window.clearTimeout(temporizador.current);
    if (pendiente.current === null) return;
    const valor = pendiente.current;
    pendiente.current = null;
    setSinGuardar(false);
    if (valor !== partida.observaciones) {
      void ejecutar({ tipo: 'guardar_observaciones', partidaId: partida.id, texto: valor });
    }
  };

  const cambiar = (valor: string) => {
    setTexto(valor);
    setSinGuardar(true);
    pendiente.current = valor;
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(guardarAhora, ESPERA_GUARDADO_MS);
  };

  // Al salir de la pantalla no se pierde lo escrito.
  const guardarRef = useRef(guardarAhora);
  guardarRef.current = guardarAhora;
  useEffect(() => () => guardarRef.current(), []);

  const anadirFrase = (frase: string) => {
    const linea = `${hhmm(new Date())} ${frase}.`;
    cambiar(texto.trim() ? `${texto.trimEnd()}\n${linea}` : linea);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {FRASES_RAPIDAS.map((frase) => (
          <button
            key={frase}
            type="button"
            onClick={() => anadirFrase(frase)}
            className="min-h-10 rounded-full border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:border-campo-600 hover:bg-campo-50"
          >
            + {frase}
          </button>
        ))}
      </div>
      <textarea
        value={texto}
        onChange={(e) => cambiar(e.target.value)}
        onBlur={guardarAhora}
        rows={4}
        placeholder="Ej.: Jugador buscando bola en el bosque del 7"
        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 focus:border-campo-600 focus:outline-none focus:ring-2 focus:ring-campo-200"
      />
      <p className="text-xs text-slate-500" aria-live="polite">
        {sinGuardar ? 'Guardando…' : 'Guardado automáticamente'}
      </p>
    </div>
  );
}
