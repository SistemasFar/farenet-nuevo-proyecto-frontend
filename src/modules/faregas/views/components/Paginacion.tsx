/**
 * Paginación estándar de FAREGAS.
 *
 * No lleva lógica de negocio: sólo presenta el sobre que devuelve el backend
 * ({ items, total, page, limit, totalPages }) y avisa del cambio de página.
 * El patrón visual replica el del Panel Principal para que todos los listados
 * se vean igual.
 */
export interface ResumenPaginacion {
  page: number;
  limit: number;
  totalPages: number;
  total: number;
}

interface Props {
  resumen: ResumenPaginacion | null | undefined;
  onCambioPagina: (page: number) => void;
  onCambioPageSize?: (pageSize: number) => void;
  etiqueta?: string;
  /** Si se omite, el selector de tamaño no se pinta. */
  opcionesPageSize?: number[];
  deshabilitado?: boolean;
}

const OPCIONES_POR_DEFECTO = [10, 20, 50];

export function Paginacion({
  resumen,
  onCambioPagina,
  onCambioPageSize,
  etiqueta = 'registros',
  opcionesPageSize,
  deshabilitado = false
}: Props) {
  const page = Math.max(1, Number(resumen?.page || 1));
  const limit = Math.max(1, Number(resumen?.limit || 10));
  const total = Math.max(0, Number(resumen?.total || 0));
  const totalPages = Math.max(0, Number(resumen?.totalPages || 0));

  const hayAnterior = page > 1;
  const haySiguiente = totalPages > 0 && page < totalPages;
  const desde = total === 0 ? 0 : (page - 1) * limit + 1;
  const hasta = total === 0 ? 0 : Math.min(page * limit, total);

  const claseBoton =
    'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex flex-col items-center gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-600">
          Mostrando <b className="text-slate-800">{desde}</b> a <b className="text-slate-800">{hasta}</b> de{' '}
          <b className="text-slate-800">{total}</b> {etiqueta}
          {total === 1 ? '' : 's'}
        </span>
        {onCambioPageSize && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            Registros por página
            <select
              value={limit}
              disabled={deshabilitado}
              onChange={(e) => onCambioPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700"
            >
              {(opcionesPageSize || OPCIONES_POR_DEFECTO).map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onCambioPagina(page - 1)}
          disabled={!hayAnterior || deshabilitado}
          className={claseBoton}
        >
          ANTERIOR
        </button>
        <span className="text-xs font-bold text-slate-700">
          Página {totalPages === 0 ? 0 : page} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onCambioPagina(page + 1)}
          disabled={!haySiguiente || deshabilitado}
          className={claseBoton}
        >
          SIGUIENTE
        </button>
      </div>
    </div>
  );
}
