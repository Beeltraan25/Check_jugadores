/** Campo "Organizador" con sugerencias de los ya usados, y editor para torneos guardados. */
import { useId, useState } from 'react';
import { useDatos } from '../datos/DatosProvider';
import type { Torneo } from '../datos/tipos';

/** Organizadores ya usados, sin repetir, para sugerirlos y que se escriban siempre igual. */
function useOrganizadores(): string[] {
  const { torneos } = useDatos();
  const vistos = new Map<string, string>();
  for (const t of torneos) {
    const nombre = t.organizador.trim();
    if (nombre && !vistos.has(nombre.toLowerCase())) vistos.set(nombre.toLowerCase(), nombre);
  }
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

export function CampoOrganizador({
  valor,
  onCambiar,
  className = '',
}: {
  valor: string;
  onCambiar: (valor: string) => void;
  className?: string;
}) {
  const idLista = useId();
  const organizadores = useOrganizadores();
  return (
    <label className={`text-sm font-semibold text-slate-700 ${className}`}>
      Organizador
      <input
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        list={idLista}
        placeholder="Ej.: Green Events, Empresa X…"
        autoComplete="off"
        className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3"
      />
      <datalist id={idLista}>
        {organizadores.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </label>
  );
}

/** Muestra el organizador de un torneo y permite cambiarlo. */
export function EditorOrganizador({ torneo }: { torneo: Torneo }) {
  const { ejecutar } = useDatos();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(torneo.organizador);

  if (!editando) {
    return (
      <p className="text-sm text-slate-600">
        Organizador: <strong className="text-slate-900">{torneo.organizador || 'sin indicar'}</strong>{' '}
        <button
          type="button"
          onClick={() => {
            setValor(torneo.organizador);
            setEditando(true);
          }}
          className="no-imprimir ml-1 rounded px-1.5 font-semibold text-campo-700 hover:bg-campo-50"
        >
          {torneo.organizador ? 'Cambiar' : 'Indicar'}
        </button>
      </p>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar({ tipo: 'actualizar_torneo', torneoId: torneo.id, cambios: { organizador: valor.trim() } });
        setEditando(false);
      }}
    >
      <CampoOrganizador valor={valor} onCambiar={setValor} className="min-w-56 flex-1" />
      <button type="submit" className="min-h-11 rounded-lg bg-campo-700 px-4 font-bold text-white hover:bg-campo-800">
        Guardar
      </button>
      <button type="button" onClick={() => setEditando(false)} className="min-h-11 rounded-lg px-3 font-semibold text-slate-600 hover:bg-slate-100">
        Cancelar
      </button>
    </form>
  );
}
