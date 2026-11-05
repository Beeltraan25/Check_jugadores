/** Recuadro con un número del día (p. ej. "Retrasadas 3"). Si se puede pulsar, sirve de filtro. */
export function Indicador({
  titulo,
  valor,
  color = 'text-slate-900',
  activo = false,
  onClick,
}: {
  titulo: string;
  valor: number | string;
  color?: string;
  activo?: boolean;
  onClick?: () => void;
}) {
  const Elemento = onClick ? 'button' : 'div';
  return (
    <Elemento
      {...(onClick ? { type: 'button' as const, onClick, 'aria-pressed': activo } : {})}
      className={`min-w-0 rounded-xl border bg-white px-1.5 py-1.5 text-left sm:px-3 sm:py-2 shadow-sm transition ${
        activo ? 'border-campo-600 ring-2 ring-campo-200' : 'border-slate-200'
      } ${onClick ? 'hover:border-slate-300' : ''}`}
    >
      <span className="block truncate text-[10px] font-semibold tracking-tight text-slate-500 sm:text-xs sm:uppercase sm:tracking-wide">{titulo}</span>
      <span className={`cifras block text-xl font-black sm:text-2xl ${color}`}>{valor}</span>
    </Elemento>
  );
}
