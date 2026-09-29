import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Estado estándar de un listado paginado de FAREGAS.
 *
 * Centraliza las reglas que el resto de la aplicación cumple a mano:
 *  - `page` arranca en 1 y `pageSize` en 10.
 *  - Cualquier cambio de filtro vuelve a la página 1.
 *  - Un listado marcado como `transaccional` abre en HOY -> HOY, y "limpiar"
 *    restaura HOY -> HOY (nunca "todo el histórico").
 *
 * `cargar` recibe los parámetros ya resueltos y debe devolver el sobre del
 * backend ({ items, total, page, limit, totalPages }).
 */

const hoyLocal = () => {
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, '0');
  const d = String(ahora.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export interface ResumenVacio {
  items: never[];
  total: 0;
  page: 1;
  limit: 10;
  totalPages: 0;
}

type Params = Record<string, string | number | null | undefined>;

interface Opciones<T> {
  /** Transaccionales: abren en HOY -> HOY. Catálogos: false. */
  transaccional?: boolean;
  pageSizePorDefecto?: number;
  cargar: (params: Params) => Promise<T[] | ResumenPaginado<T>>;
  /** Filtros iniciales propios del listado (búsqueda, estado, etc.). */
  filtrosIniciales?: Record<string, string>;
}

interface ResumenPaginado<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useListadoPaginado<T>({
  transaccional = false,
  pageSizePorDefecto = 10,
  cargar,
  filtrosIniciales = {}
}: Opciones<T>) {
  const hoy = hoyLocal();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizePorDefecto);
  const [resumen, setResumen] = useState<ResumenPaginado<T>>({
    items: [], total: 0, page: 1, limit: pageSizePorDefecto, totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rangoError, setRangoError] = useState('');
  const [filtros, setFiltros] = useState<Record<string, string>>(() => ({
    ...filtrosIniciales,
    ...(transaccional ? { fechaDesde: hoy, fechaHasta: hoy } : {})
  }));

  // Ref para que cambiar de callback no dispare bucles de request.
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;
  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  const refrescar = useCallback(async (pagina: number, tamanho: number) => {
    const actuales = filtrosRef.current;
    // Validación de rango: no se consulta y no se intercambian fechas.
    const desde = String(actuales.fechaDesde || '');
    const hasta = String(actuales.fechaHasta || '');
    if (desde && hasta && desde > hasta) {
      setRangoError('La fecha Desde no puede ser posterior a la fecha Hasta.');
      setLoading(false);
      return;
    }
    setRangoError('');
    setLoading(true);
    setError('');
    try {
      const respuesta = await cargarRef.current({
        page: pagina,
        pageSize: tamanho,
        ...actuales
      });
      if (Array.isArray(respuesta)) {
        // El backend aún no devuelve el sobre: se calcula en cliente.
        setResumen({
          items: respuesta,
          total: respuesta.length,
          page: pagina,
          limit: tamanho,
          totalPages: Math.ceil(respuesta.length / tamanho) || 0
        });
      } else {
        setResumen(respuesta);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el listado.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refrescar(page, pageSize);
  }, [page, pageSize, refrescar]);

  /** Cambiar un filtro SIEMPRE vuelve a la página 1. */
  const setFiltro = useCallback((campo: string, valor: string) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
    setPage(1);
  }, []);

  const aplicarFiltros = useCallback((nuevos?: Record<string, string>) => {
    if (nuevos) setFiltros((prev) => ({ ...prev, ...nuevos }));
    setPage(1);
  }, []);

  /** "Limpiar" restaura los filtros propios y, si es transaccional, HOY -> HOY. */
  const limpiarFiltros = useCallback(() => {
    setFiltros({
      ...filtrosIniciales,
      ...(transaccional ? { fechaDesde: hoy, fechaHasta: hoy } : {})
    });
    setPage(1);
  }, [filtrosIniciales, transaccional, hoy]);

  const cambiarPageSize = useCallback((nuevo: number) => {
    setPageSize(nuevo);
    setPage(1);
  }, []);

  return {
    page,
    pageSize,
    resumen,
    items: resumen.items,
    loading,
    error,
    rangoError,
    filtros,
    setFiltro,
    aplicarFiltros,
    limpiarFiltros,
    cambiarPageSize,
    irAPagina: setPage,
    refrescar: () => refrescar(page, pageSize)
  };
}
