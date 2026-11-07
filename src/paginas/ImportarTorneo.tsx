/**
 * Importar un torneo desde el PDF del horario de salidas:
 *   1. Se elige el PDF (o se pega el texto).
 *   2. La app propone las partidas (hora, tee y jugadores) y se pueden corregir.
 *   3. Se guarda el torneo con todas sus partidas y pasa a ser el torneo en uso.
 */
import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { Cabecera, Seccion } from '../componentes/basicos';
import { useDatos } from '../datos/DatosProvider';
import type { Partida, Torneo } from '../datos/tipos';
import { combinarFechaHora, fechaLocal } from '../lib/hora';
import { nuevoId } from '../lib/ids';
import { interpretarHorario, type PartidaImportada } from '../lib/importar';
import { leerLineasPdf } from '../lib/pdf';
import { CampoOrganizador } from '../componentes/Organizador';

const MAX_JUGADORES = 4;

interface Fila extends PartidaImportada {
  clave: string;
}

const conClave = (p: PartidaImportada): Fila => ({ ...p, clave: nuevoId(), jugadores: [...p.jugadores] });

export function ImportarTorneo() {
  const { ejecutar, elegirTorneo } = useDatos();
  const navegar = useNavigate();
  const [nombre, setNombre] = useState('');
  const [organizador, setOrganizador] = useState('');
  const [fecha, setFecha] = useState(fechaLocal());
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [ignoradas, setIgnoradas] = useState<string[]>([]);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textoPegado, setTextoPegado] = useState('');

  const procesarLineas = (lineas: string[], nombreArchivo?: string) => {
    const r = interpretarHorario(lineas);
    setFilas(r.partidas.map(conClave));
    setIgnoradas(r.ignoradas);
    if (r.fecha) setFecha(r.fecha);
    setNombre((actual) => actual || r.nombre || nombreArchivo?.replace(/\.pdf$/i, '') || '');
    if (r.partidas.length === 0) {
      setError('No he encontrado horas de salida. Revisa que el PDF tenga texto (no una foto escaneada) o pega el texto abajo.');
    }
  };

  const elegirArchivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError(null);
    setLeyendo(true);
    try {
      procesarLineas(await leerLineasPdf(archivo), archivo.name);
    } catch (err) {
      setError(`No se pudo leer el PDF: ${(err as Error).message}`);
    } finally {
      setLeyendo(false);
      e.target.value = '';
    }
  };

  const cambiarFila = (clave: string, cambio: Partial<Fila>) =>
    setFilas((actuales) => actuales?.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)) ?? null);

  const cambiarJugador = (fila: Fila, i: number, valor: string) => {
    const jugadores = [...fila.jugadores];
    jugadores[i] = valor;
    cambiarFila(fila.clave, { jugadores });
  };

  const filasValidas = (filas ?? []).filter((f) => /^\d{2}:\d{2}$/.test(f.hora));
  const totalJugadores = filasValidas.reduce((n, f) => n + f.jugadores.filter((j) => j.trim()).length, 0);

  const guardar = () => {
    if (!filasValidas.length) return;
    const torneo: Torneo = {
      id: nuevoId(),
      nombre: nombre.trim() || `Torneo ${fecha}`,
      organizador: organizador.trim(),
      fecha,
      notas: '',
      creado_en: new Date().toISOString(),
      cerrado_en: null,
    };
    const partidas: Partida[] = filasValidas.map((f) => {
      const partidaId = nuevoId();
      return {
        id: partidaId,
        torneo_id: torneo.id,
        fecha,
        hora_salida: combinarFechaHora(fecha, f.hora),
        hoyo_salida: f.hoyoSalida,
        nombre: '',
        observaciones: '',
        revision_iniciada_en: null,
        terminada_en: null,
        avistamientos: [],
        jugadores: f.jugadores
          .map((j) => j.trim())
          .filter(Boolean)
          .map((nombreJugador, orden) => ({ id: nuevoId(), partida_id: partidaId, nombre: nombreJugador, orden, alquiler: null })),
      };
    });
    void ejecutar({ tipo: 'crear_torneo', torneo, partidas });
    elegirTorneo(torneo.id);
    navegar('/oficina');
  };

  return (
    <div className="min-h-dvh pb-28">
      <Cabecera titulo="Importar torneo" volverA="/torneos" />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        <Seccion titulo="1. Horario de salidas">
          <div className="space-y-4">
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-campo-600 bg-campo-50 p-6 text-center hover:bg-campo-100">
              <span className="text-lg font-bold text-campo-900">{leyendo ? 'Leyendo el PDF…' : '📄 Elegir el PDF del torneo'}</span>
              <span className="text-sm text-campo-800">Horario de salidas con horas, tee y jugadores</span>
              <input type="file" accept="application/pdf,.pdf" onChange={(e) => void elegirArchivo(e)} className="sr-only" />
            </label>
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-slate-600">¿El PDF no se lee bien? Pega el texto aquí</summary>
              <textarea
                value={textoPegado}
                onChange={(e) => setTextoPegado(e.target.value)}
                rows={6}
                placeholder={'08:00  1  GARCIA LOPEZ, JUAN\n08:00  1  MARTIN RUIZ, ANA\n08:10  1  …'}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  procesarLineas(textoPegado.split(/\r?\n/));
                }}
                className="mt-2 min-h-10 rounded-lg bg-slate-800 px-4 font-semibold text-white"
              >
                Interpretar texto
              </button>
            </details>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
          </div>
        </Seccion>

        {filas && (
          <>
            <Seccion titulo="2. Datos del torneo">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label className="text-sm font-semibold text-slate-700">
                  Nombre del torneo
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
                  />
                </label>
                <CampoOrganizador valor={organizador} onCambiar={setOrganizador} />
                <label className="text-sm font-semibold text-slate-700">
                  Fecha
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
                  />
                </label>
              </div>
            </Seccion>

            <Seccion
              titulo={`3. Revisa las partidas (${filasValidas.length} partidas · ${totalJugadores} jugadores)`}
              extra={
                <button
                  type="button"
                  onClick={() => setFilas((f) => [...(f ?? []), conClave({ hora: f?.at(-1)?.hora ?? '08:00', hoyoSalida: 1, jugadores: [] })])}
                  className="min-h-9 rounded-lg px-3 text-sm font-semibold text-campo-700 hover:bg-campo-50"
                >
                  + Partida
                </button>
              }
            >
              <ul className="divide-y divide-slate-100">
                {filas.map((f) => (
                  <li key={f.clave} className="flex flex-wrap items-start gap-2 py-3">
                    <input
                      type="time"
                      value={f.hora}
                      onChange={(e) => cambiarFila(f.clave, { hora: e.target.value })}
                      aria-label="Hora de salida"
                      className="cifras h-10 w-32 rounded-lg border border-slate-300 px-2 font-bold"
                    />
                    <select
                      value={f.hoyoSalida}
                      onChange={(e) => cambiarFila(f.clave, { hoyoSalida: Number(e.target.value) })}
                      aria-label="Tee de salida"
                      className="h-10 rounded-lg border border-slate-300 px-2 text-sm font-semibold"
                    >
                      {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h}>
                          Tee {h}
                        </option>
                      ))}
                    </select>
                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {Array.from({ length: Math.max(MAX_JUGADORES, f.jugadores.length) }, (_, i) => (
                        <input
                          key={i}
                          value={f.jugadores[i] ?? ''}
                          onChange={(e) => cambiarJugador(f, i, e.target.value)}
                          placeholder={`Jugador ${i + 1}`}
                          aria-label={`Jugador ${i + 1} de las ${f.hora}`}
                          className="h-10 min-w-0 rounded-lg border border-slate-300 px-2 text-sm"
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFilas((actuales) => actuales?.filter((x) => x.clave !== f.clave) ?? null)}
                      className="h-10 rounded-lg px-3 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Quitar la partida de las ${f.hora}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              {ignoradas.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-amber-800">
                    ⚠ {ignoradas.length} {ignoradas.length === 1 ? 'línea parece' : 'líneas parecen'} un jugador sin partida: revísalas
                  </summary>
                  <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                    {ignoradas.join('\n')}
                  </pre>
                </details>
              )}
            </Seccion>
          </>
        )}
      </main>

      {filas && filasValidas.length > 0 && (
        <div className="margen-inferior-seguro fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              <strong>{filasValidas.length}</strong> partidas · <strong>{totalJugadores}</strong> jugadores
            </p>
            <button
              type="button"
              onClick={guardar}
              className="min-h-12 rounded-xl bg-campo-700 px-6 font-bold text-white shadow hover:bg-campo-800"
            >
              Guardar torneo y usarlo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
