/**
 * Asistente para colocar los hoyos sobre TU mapa: haz clic en el tee y en el green de cada
 * hoyo, en orden, y copia el código generado en src/config/campo.ts.
 */
import { useState } from 'react';
import { Cabecera } from '../componentes/basicos';
import { MapaCampo } from '../componentes/MapaCampo';
import { HOYOS, type Punto } from '../config/campo';

const TOTAL_PASOS = HOYOS.length * 2;

function generarCodigo(puntos: Punto[]): string {
  const filas = HOYOS.map((h, i) => {
    const tee = puntos[i * 2];
    const green = puntos[i * 2 + 1];
    return `  { numero: ${h.numero}, par: ${h.par}, tee: { x: ${tee.x}, y: ${tee.y} }, green: { x: ${green.x}, y: ${green.y} } },`;
  });
  return `export const HOYOS: HoyoCampo[] = [\n${filas.join('\n')}\n];\n`;
}

function Marca({ punto, texto, tenue = false }: { punto: Punto; texto: string; tenue?: boolean }) {
  return (
    <span
      className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-md px-1 text-[10px] font-bold leading-4 ${
        tenue ? 'bg-white/70 text-slate-500' : 'bg-yellow-300 text-slate-900 shadow'
      }`}
      style={{ left: `${punto.x}%`, top: `${punto.y}%` }}
    >
      {texto}
    </span>
  );
}

export function Calibrar() {
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [verActuales, setVerActuales] = useState(true);
  const [copiado, setCopiado] = useState(false);

  const paso = puntos.length;
  const terminado = paso === TOTAL_PASOS;
  const hoyo = HOYOS[Math.floor(paso / 2)];
  const codigo = terminado ? generarCodigo(puntos) : null;

  const copiar = async () => {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="min-h-dvh">
      <Cabecera titulo="Calibrar el mapa del campo" volverA="/" />
      <main className="mx-auto max-w-[1400px] space-y-4 px-4 py-4">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="min-w-0 flex-1 text-lg">
            {terminado ? (
              <strong>¡Listo! Copia el código de abajo en src/config/campo.ts.</strong>
            ) : (
              <>
                Paso {paso + 1} de {TOTAL_PASOS}: haz clic en el{' '}
                <strong className="rounded bg-yellow-300 px-1.5">
                  {paso % 2 === 0 ? 'TEE' : 'GREEN'} del hoyo {hoyo.numero}
                </strong>
              </>
            )}
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={verActuales} onChange={(e) => setVerActuales(e.target.checked)} className="h-4 w-4" />
            Ver posiciones actuales
          </label>
          <button
            type="button"
            disabled={paso === 0}
            onClick={() => {
              setPuntos((p) => p.slice(0, -1));
              setCopiado(false);
            }}
            className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-40"
          >
            Deshacer último
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <MapaCampo
            partidas={[]}
            ahora={new Date()}
            altoMaximo="100dvh - 240px"
            onClicMapa={(p) => !terminado && setPuntos((actuales) => [...actuales, p])}
          >
            {verActuales &&
              HOYOS.flatMap((h) => [
                <Marca key={`t${h.numero}`} punto={h.tee} texto={`${h.numero}T`} tenue />,
                <Marca key={`g${h.numero}`} punto={h.green} texto={`${h.numero}G`} tenue />,
              ])}
            {puntos.map((p, i) => (
              <Marca key={i} punto={p} texto={`${HOYOS[Math.floor(i / 2)].numero}${i % 2 === 0 ? 'T' : 'G'}`} />
            ))}
          </MapaCampo>
        </div>

        {codigo && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void copiar()}
              className="min-h-11 rounded-xl bg-campo-700 px-5 font-bold text-white shadow hover:bg-campo-800"
            >
              {copiado ? 'Copiado ✓' : 'Copiar código'}
            </button>
            <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">{codigo}</pre>
          </div>
        )}
      </main>
    </div>
  );
}
