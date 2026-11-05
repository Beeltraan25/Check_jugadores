/**
 * Mapa del campo con un pin por partida en el último sitio donde se la vio.
 * Los pines se colocan en % sobre la imagen, así encajan en cualquier tamaño de pantalla.
 */
import { useState, type MouseEvent, type ReactNode } from 'react';
import { MAPA, puntoEnMapa, type Punto } from '../config/campo';
import type { Partida } from '../datos/tipos';
import { haceCuanto, hhmm, minutosEntre } from '../lib/hora';
import { etiquetaPartida, resumirPartida, salidaDe, tituloPartida } from '../lib/partidas';
import { CONFIG_RITMO, NOMBRE_POSICION, posicionEsperada, textoRetraso } from '../lib/ritmo';
import { ESTADO_UI, estiloDe } from './estilos';

/** Pasados estos minutos sin ver a una partida, su pin se dibuja más apagado. */
const MINUTOS_DATO_ANTIGUO = 30;

interface Props {
  partidas: Partida[];
  ahora: Date;
  seleccionada?: string | null;
  onSeleccionar?: (id: string) => void;
  /** Clic en un punto vacío del mapa (lo usa la pantalla de calibración). */
  onClicMapa?: (punto: Punto) => void;
  /** Alto máximo del mapa (CSS), p. ej. 'calc(100dvh - 260px)' para que quepa entero en pantalla. */
  altoMaximo?: string;
  /** Elementos extra dibujados encima del mapa. */
  children?: ReactNode;
}

export function MapaCampo({ partidas, ahora, seleccionada, onSeleccionar, onClicMapa, altoMaximo, children }: Props) {
  // Proporción ancho/alto de la imagen (se lee al cargarla) para limitar el alto sin deformarla.
  const [relacion, setRelacion] = useState(10 / 7);
  // Agrupa por punto para apilar los pines que coinciden en el mismo sitio.
  const apilados = new Map<string, number>();
  const marcadores = partidas.flatMap((partida) => {
    const resumen = resumirPartida(partida, ahora);
    if (resumen.fase === 'terminada' || !resumen.ultimo) return [];
    const { hoyo, posicion } = resumen.ultimo;
    const clave = `${hoyo}-${posicion}`;
    const nivel = apilados.get(clave) ?? 0;
    apilados.set(clave, nivel + 1);
    return [{ partida, ultimo: resumen.ultimo, punto: puntoEnMapa(hoyo, posicion), nivel }];
  });

  const partidaSel = partidas.find((p) => p.id === seleccionada);
  const esperada = partidaSel && !partidaSel.terminada_en ? posicionEsperada(salidaDe(partidaSel), ahora) : null;
  const puntoEsperado = esperada?.fase === 'jugando' ? puntoEnMapa(esperada.hoyo, esperada.posicion) : null;

  const clicMapa = (e: MouseEvent<HTMLDivElement>) => {
    if (!onClicMapa) return;
    const caja = e.currentTarget.getBoundingClientRect();
    onClicMapa({
      x: Math.round(((e.clientX - caja.left) / caja.width) * 1000) / 10,
      y: Math.round(((e.clientY - caja.top) / caja.height) * 1000) / 10,
    });
  };

  return (
    <div
      className={`relative mx-auto w-full select-none overflow-hidden rounded-xl bg-campo-100 ${onClicMapa ? 'cursor-crosshair' : ''}`}
      style={altoMaximo ? { width: `min(100%, calc((${altoMaximo}) * ${relacion}))` } : undefined}
      onClick={clicMapa}
    >
      <img
        src={MAPA.url}
        alt={`Mapa de ${MAPA.nombre}`}
        className="block h-auto w-full"
        draggable={false}
        onLoad={(e) => {
          const { naturalWidth, naturalHeight } = e.currentTarget;
          if (naturalWidth && naturalHeight) setRelacion(naturalWidth / naturalHeight);
        }}
      />

      {puntoEsperado && (
        <div
          className="pointer-events-none absolute z-10 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-dashed border-campo-900 bg-white/40"
          style={{ left: `${puntoEsperado.x}%`, top: `${puntoEsperado.y}%` }}
          title="Donde debería estar según su hora de salida"
        />
      )}

      {marcadores.map(({ partida, ultimo, punto, nivel }) => {
        const estilo = estiloDe(ultimo.estado);
        const activo = partida.id === seleccionada;
        const antiguo = minutosEntre(ultimo.visto_en, ahora) > MINUTOS_DATO_ANTIGUO;
        // Pines en el mismo punto: se alternan arriba/abajo; junto a un borde, todos hacia dentro.
        const cercaArriba = punto.y < 14;
        const cercaAbajo = punto.y > 88;
        const haciaAbajo = cercaArriba || (!cercaAbajo && nivel % 2 === 1);
        const paso = cercaArriba || cercaAbajo ? nivel : Math.floor(nivel / 2);
        const desplazamiento = `${8 + paso * 34}px`;
        return (
          <div
            key={partida.id}
            className={`absolute hover:z-40 ${activo ? 'z-30' : 'z-20'}`}
            style={{ left: `${punto.x}%`, top: `${punto.y}%` }}
          >
            <span
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ background: estilo.color }}
              aria-hidden
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSeleccionar?.(partida.id);
              }}
              title={`${tituloPartida(partida)} · salida ${etiquetaPartida(partida)}\nVistos en el hoyo ${ultimo.hoyo} (${NOMBRE_POSICION[ultimo.posicion]}) a las ${hhmm(ultimo.visto_en)}, ${haceCuanto(ultimo.visto_en, ahora)}\n${estilo.etiqueta} · ${textoRetraso(ultimo.retraso_min)}`}
              className={`absolute flex -translate-x-1/2 flex-col items-center whitespace-nowrap rounded-lg border-2 px-1.5 py-0.5 text-white shadow-md transition-transform hover:scale-110 ${
                activo ? 'pulso scale-110 border-yellow-300' : 'border-white'
              } ${antiguo && !activo ? 'opacity-60' : ''}`}
              style={{ background: estilo.color, ...(haciaAbajo ? { top: desplazamiento } : { bottom: desplazamiento }) }}
            >
              <span className="cifras text-[11px] font-bold leading-tight sm:text-xs">{hhmm(partida.hora_salida)}</span>
              <span className="cifras text-[9px] leading-tight opacity-95 sm:text-[10px]">
                H{ultimo.hoyo} · {hhmm(ultimo.visto_en)}
              </span>
            </button>
          </div>
        );
      })}

      {children}
    </div>
  );
}

export function LeyendaMapa() {
  const { limiteVerde, limiteRojo } = CONFIG_RITMO;
  const elementos = [
    { color: ESTADO_UI.en_tiempo.color, texto: `En tiempo (hasta +${limiteVerde} min)` },
    { color: ESTADO_UI.aviso.color, texto: `Atención (+${limiteVerde + 1} a +${limiteRojo - 1} min)` },
    { color: ESTADO_UI.retrasado.color, texto: `Retrasado (desde +${limiteRojo} min)` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
      {elementos.map((e) => (
        <span key={e.texto} className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: e.color }} />
          {e.texto}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full border-2 border-dashed border-campo-900" />
        Donde debería estar (partida seleccionada)
      </span>
      <span>Pin apagado = sin ver hace más de {MINUTOS_DATO_ANTIGUO} min</span>
    </div>
  );
}
