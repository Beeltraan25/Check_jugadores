import { Link } from 'react-router';
import { modoDatos, useDatos } from '../datos/DatosProvider';
import { cerrarSesion } from '../datos/sesion';
import { MAPA } from '../config/campo';
import { duracionVueltaMin, CONFIG_RITMO } from '../lib/ritmo';
import { fechaLarga } from '../lib/textos';
import { fechaLocal } from '../lib/hora';
import { esSalidas, tipoDeJornada } from '../lib/jornadas';
import { InstalarApp } from '../componentes/InstalarApp';

export function Inicio() {
  const { torneo, torneos, numPartidas, abrirSalidasDeHoy, elegirTorneo } = useDatos();
  const hoy = fechaLocal();
  const enSalidasDeHoy = !!torneo && esSalidas(torneo) && torneo.fecha === hoy;
  const torneosDeHoy = torneos.filter((t) => !esSalidas(t) && t.fecha === hoy && !t.cerrado_en);
  const vuelta = duracionVueltaMin();
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center gap-6 px-4 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <header className="text-center">
        <img src="/icono.svg" alt="" className="mx-auto mb-4 h-16 w-16" />
        <h1 className="text-3xl font-black tracking-tight text-campo-900 sm:text-4xl">Ritmo de juego</h1>
        <p className="mt-2 text-slate-600">
          {MAPA.nombre} · {CONFIG_RITMO.minutosPorHoyo[0]} min por hoyo · vuelta ideal de {Math.floor(vuelta / 60)} h{' '}
          {vuelta % 60 ? `${vuelta % 60} min` : ''}
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">En uso ahora</p>
            {torneo ? (
              <>
                <p className="text-lg font-bold text-slate-900">{torneo.nombre}</p>
                <p className="text-sm text-slate-600">
                  <span
                    className={`mr-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${
                      esSalidas(torneo) ? 'bg-sky-100 text-sky-900' : 'bg-campo-100 text-campo-900'
                    }`}
                  >
                    {tipoDeJornada(torneo)}
                  </span>
                  {fechaLarga(torneo.fecha)} · {numPartidas(torneo.id)} partidas{torneo.cerrado_en ? ' · cerrado' : ''}
                </p>
              </>
            ) : (
              <p className="text-lg font-bold text-slate-900">Nada todavía</p>
            )}
          </div>
          <Link to="/torneos" className="rounded-lg bg-campo-50 px-3 py-2 text-sm font-bold text-campo-800 hover:bg-campo-100">
            Torneos, salidas e informes ›
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {!enSalidasDeHoy && (
            <button
              type="button"
              onClick={() => abrirSalidasDeHoy()}
              className="min-h-11 rounded-xl border-2 border-sky-700 bg-white px-4 font-bold text-sky-900 hover:bg-sky-50"
            >
              Usar las salidas normales de hoy
            </button>
          )}
          {torneosDeHoy
            .filter((t) => t.id !== torneo?.id)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => elegirTorneo(t.id)}
                className="min-h-11 rounded-xl border-2 border-campo-700 bg-white px-4 font-bold text-campo-800 hover:bg-campo-50"
              >
                Usar el torneo de hoy: {t.nombre}
              </button>
            ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/marshal"
          className="group rounded-3xl bg-campo-800 p-6 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          <span className="text-4xl" aria-hidden>
            ⛳
          </span>
          <h2 className="mt-3 text-2xl font-bold">Marshal</h2>
          <p className="mt-1 text-campo-100">En el campo (móvil o tablet): revisar partidas, registrar dónde están, alquileres y observaciones.</p>
        </Link>
        <Link
          to="/oficina"
          className="group rounded-3xl border-2 border-campo-800 bg-white p-6 text-campo-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          <span className="text-4xl" aria-hidden>
            🖥️
          </span>
          <h2 className="mt-3 text-2xl font-bold">Caddy Master</h2>
          <p className="mt-1 text-slate-600">En la oficina: mapa del campo en directo, estado de todas las partidas y alta de salidas.</p>
        </Link>
      </div>

      <InstalarApp />

      {modoDatos === 'demo' ? (
        <aside className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-bold">Modo demo (sin base de datos)</p>
          <p className="mt-1">
            Los datos se guardan solo en este navegador. Abre <strong>/marshal</strong> y <strong>/oficina</strong> en dos pestañas
            para ver la sincronización en tiempo real. Para usarlo entre el móvil del Marshal y el ordenador de la oficina, conecta
            Supabase (ver README).
          </p>
          <Link to="/calibrar" className="mt-2 inline-flex min-h-10 items-center font-semibold underline">
            Calibrar el mapa del campo
          </Link>
        </aside>
      ) : (
        <div className="flex justify-center gap-4 text-sm">
          <Link to="/calibrar" className="font-semibold text-campo-700 hover:underline">
            Calibrar el mapa
          </Link>
          <button type="button" onClick={() => void cerrarSesion()} className="font-semibold text-slate-500 hover:underline">
            Cerrar sesión
          </button>
        </div>
      )}
    </main>
  );
}
