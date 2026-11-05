import { Link } from 'react-router';
import { modoDatos } from '../datos/DatosProvider';
import { reiniciarDemo } from '../datos/demo';
import { cerrarSesion } from '../datos/sesion';
import { MAPA } from '../config/campo';
import { duracionVueltaMin, CONFIG_RITMO } from '../lib/ritmo';

export function Inicio() {
  const vuelta = duracionVueltaMin();
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center gap-8 px-4 py-10">
      <header className="text-center">
        <img src="/icono.svg" alt="" className="mx-auto mb-4 h-16 w-16" />
        <h1 className="text-3xl font-black tracking-tight text-campo-900 sm:text-4xl">Ritmo de juego</h1>
        <p className="mt-2 text-slate-600">
          {MAPA.nombre} · {CONFIG_RITMO.minutosPorHoyo[0]} min por hoyo · vuelta ideal de {Math.floor(vuelta / 60)} h{' '}
          {vuelta % 60 ? `${vuelta % 60} min` : ''}
        </p>
      </header>

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

      {modoDatos === 'demo' ? (
        <aside className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-bold">Modo demo (sin base de datos)</p>
          <p className="mt-1">
            Los datos son de prueba y se guardan en este navegador. Abre <strong>/marshal</strong> y <strong>/oficina</strong> en dos
            pestañas para ver la sincronización en tiempo real. Para usarlo entre varios dispositivos, configura Supabase (ver README).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                reiniciarDemo();
                window.location.reload();
              }}
              className="min-h-10 rounded-lg bg-amber-200 px-3 font-semibold hover:bg-amber-300"
            >
              Generar datos de prueba nuevos
            </button>
            <Link to="/calibrar" className="inline-flex min-h-10 items-center rounded-lg px-3 font-semibold hover:bg-amber-100">
              Calibrar el mapa del campo
            </Link>
          </div>
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
