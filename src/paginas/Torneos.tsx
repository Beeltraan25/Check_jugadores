/** Lista de torneos guardados: elegir el que se usa, ver su informe, cerrarlo o borrarlo. */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Cabecera } from '../componentes/basicos';
import { modoDatos, useDatos } from '../datos/DatosProvider';
import { torneoDeEjemplo } from '../datos/demo';
import type { Torneo } from '../datos/tipos';
import { fechaLocal } from '../lib/hora';
import { nuevoId } from '../lib/ids';
import { fechaLarga } from '../lib/textos';
import { CampoOrganizador } from '../componentes/Organizador';

export function Torneos() {
  const { torneos, torneo: enUso, elegirTorneo, numPartidas, ejecutar, cargando } = useDatos();
  const navegar = useNavigate();
  const [creandoVacio, setCreandoVacio] = useState(false);

  const usar = (t: Torneo, destino: string) => {
    elegirTorneo(t.id);
    navegar(destino);
  };

  const eliminar = (t: Torneo) => {
    const n = numPartidas(t.id);
    const ok = window.confirm(
      `¿Eliminar "${t.nombre}" (${fechaLarga(t.fecha)})?\n\nSe borrarán sus ${n} partidas con todos sus avistamientos, alquileres y observaciones. No se puede deshacer.`,
    );
    if (ok) void ejecutar({ tipo: 'eliminar_torneo', torneoId: t.id });
  };

  return (
    <div className="min-h-dvh">
      <Cabecera titulo="Torneos" volverA="/" />
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-5">
        <div className="flex flex-wrap gap-2">
          <Link
            to="/torneos/importar"
            className="inline-flex min-h-12 items-center rounded-xl bg-campo-700 px-5 font-bold text-white shadow hover:bg-campo-800"
          >
            📄 Importar horario (PDF)
          </Link>
          <button
            type="button"
            onClick={() => setCreandoVacio((v) => !v)}
            className="min-h-12 rounded-xl border-2 border-campo-700 bg-white px-5 font-bold text-campo-800 hover:bg-campo-50"
          >
            + Torneo vacío
          </button>
          <Link
            to="/organizadores"
            className="inline-flex min-h-12 items-center rounded-xl border-2 border-slate-300 bg-white px-5 font-bold text-slate-800 hover:bg-slate-50"
          >
            🏁 Comparar organizadores
          </Link>
          {modoDatos === 'demo' && (
            <button
              type="button"
              onClick={() => {
                const op = torneoDeEjemplo(new Date());
                void ejecutar(op);
                if (op.tipo === 'crear_torneo') elegirTorneo(op.torneo.id);
              }}
              className="min-h-12 rounded-xl px-4 font-semibold text-slate-600 hover:bg-slate-100"
            >
              Crear torneo de ejemplo
            </button>
          )}
        </div>

        {creandoVacio && (
          <FormularioTorneoVacio
            onCreado={(t) => {
              setCreandoVacio(false);
              usar(t, '/oficina');
            }}
          />
        )}

        {cargando && torneos.length === 0 && <p className="text-center text-slate-500">Cargando…</p>}
        {!cargando && torneos.length === 0 && (
          <p className="rounded-2xl bg-white p-8 text-center text-slate-500">
            Todavía no hay torneos. Importa el PDF con el horario de salidas o crea uno vacío.
          </p>
        )}

        <ul className="space-y-3">
          {torneos.map((t) => {
            const esElEnUso = t.id === enUso?.id;
            return (
              <li
                key={t.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm ${esElEnUso ? 'border-campo-600 ring-2 ring-campo-200' : 'border-slate-200'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-900">{t.nombre}</h2>
                    <p className="text-sm text-slate-600">{fechaLarga(t.fecha)}</p>
                    <p className="text-sm text-slate-500">
                      {t.organizador ? (
                        <>
                          Organiza <strong className="text-slate-700">{t.organizador}</strong> ·{' '}
                        </>
                      ) : (
                        <span className="text-amber-700">Sin organizador · </span>
                      )}
                      {numPartidas(t.id)} partidas
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {esElEnUso && (
                      <span className="rounded-full bg-campo-700 px-2.5 py-0.5 text-xs font-bold text-white">En uso</span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        t.cerrado_en ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {t.cerrado_en ? 'Cerrado' : 'Abierto'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!esElEnUso && (
                    <button
                      type="button"
                      onClick={() => usar(t, '/oficina')}
                      className="min-h-10 rounded-lg bg-campo-700 px-3 text-sm font-bold text-white hover:bg-campo-800"
                    >
                      Usar este torneo
                    </button>
                  )}
                  <Link
                    to={`/torneos/${t.id}`}
                    className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50"
                  >
                    Informe con nombres
                  </Link>
                  <Link
                    to={`/torneos/${t.id}/ritmo`}
                    className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50"
                  >
                    Informe de ritmo (sin nombres)
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      void ejecutar({
                        tipo: 'actualizar_torneo',
                        torneoId: t.id,
                        cambios: { cerrado_en: t.cerrado_en ? null : new Date().toISOString() },
                      })
                    }
                    className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50"
                  >
                    {t.cerrado_en ? 'Reabrir' : 'Cerrar torneo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminar(t)}
                    className="min-h-10 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="text-center text-xs text-slate-500">
          Cada torneo guarda sus partidas, jugadores, alquileres, avistamientos y observaciones. Los dispositivos usan el torneo
          abierto más reciente salvo que elijas otro.
        </p>
      </main>
    </div>
  );
}

function FormularioTorneoVacio({ onCreado }: { onCreado: (t: Torneo) => void }) {
  const { ejecutar } = useDatos();
  const [nombre, setNombre] = useState('');
  const [organizador, setOrganizador] = useState('');
  const [fecha, setFecha] = useState(fechaLocal());

  const crear = (e: FormEvent) => {
    e.preventDefault();
    const torneo: Torneo = {
      id: nuevoId(),
      nombre: nombre.trim() || `Jornada ${fecha}`,
      organizador: organizador.trim(),
      fecha,
      notas: '',
      creado_en: new Date().toISOString(),
      cerrado_en: null,
    };
    void ejecutar({ tipo: 'crear_torneo', torneo, partidas: [] });
    onCreado(torneo);
  };

  return (
    <form onSubmit={crear} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto_auto]">
      <label className="text-sm font-semibold text-slate-700">
        Nombre
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej.: Torneo social de otoño"
          className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
        />
      </label>
      <CampoOrganizador valor={organizador} onCambiar={setOrganizador} />
      <label className="text-sm font-semibold text-slate-700">
        Fecha
        <input
          type="date"
          required
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
        />
      </label>
      <button type="submit" className="min-h-11 self-end rounded-lg bg-campo-700 px-5 font-bold text-white hover:bg-campo-800">
        Crear
      </button>
    </form>
  );
}
