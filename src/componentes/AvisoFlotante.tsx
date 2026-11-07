import { useDatos } from '../datos/DatosProvider';

/** Muestra errores de carga o de guardado en una franja inferior. */
export function AvisoFlotante() {
  const { aviso, descartarAviso, errorCarga, conexion } = useDatos();
  const mensaje =
    aviso ?? (errorCarga ? `No se pudieron cargar los datos (${conexion === 'sin_conexion' ? 'sin conexión' : errorCarga}).` : null);
  if (!mensaje) return null;
  return (
    <div
      role="alert"
      style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      className="no-imprimir fixed inset-x-3 z-50 mx-auto flex max-w-lg items-start gap-3 rounded-xl bg-red-700 p-4 text-white shadow-xl"
    >
      <p className="flex-1 text-sm">{mensaje}</p>
      {aviso && (
        <button onClick={descartarAviso} className="rounded-lg px-2 text-sm font-semibold hover:bg-white/10">
          Cerrar
        </button>
      )}
    </div>
  );
}
