import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Estado estándar de un listado paginado de FAREGAS.
 *
 * Centraliza las reglas que el resto de la aplicación cumple a mano:
 *  - `page` arranca en 1 y `pageSize` en 10.
 *  - Un listado marcado como `transaccional` abre en HOY -> HOY, y "limpiar"
 *    restaura HOY -> HOY (nunca "todo el histórico").
 *  - El backend es quien filtra: no hay filtrado en memoria sobre la página.
 *
 * DISTINCIÓN IMPORTANTE entre los dos estados de filtro:
 *
 *  - `filtros` es lo que el usuario VE en los campos. `setFiltro` sólo edita
 *    ese borrador; no dispara ninguna consulta.
 *  - `aplicados` es lo que se pidió al backend. Sólo cambia al pulsar "Buscar"
 *    (`aplicarFiltros`) o "Limpiar" (`limpiarFiltros`).
 *
 * Antes esta distinción no existía: el efecto que recarga dependía de
 * `[page, pageSize]` y `aplicarFiltros`/`limpiarFiltros` sólo hacían
 * `setPage(1)`. Como `setPage(1)` sobre la página 1 es un no-op de React, los
 * botones BUSCAR y LIMPIAR no recargaban nada: la tabla seguía mostrando los
 * datos del rango anterior.
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

  const iniciales = {
    ...filtrosIniciales,
    ...(transaccional ? { fechaDesde: hoy, fechaHasta: hoy } : {})
  };
  // Lo que el usuario ve en los campos (borrador).
  const [filtros, setFiltros] = useState<Record<string, string>>(() => ({ ...iniciales }));
  // Lo que realmente se consulta al backend.
  const [aplicados, setAplicados] = useState<Record<string, string>>(() => ({ ...iniciales }));

  // Ref para que cambiar de callback no dispare bucles de request.
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;
  const aplicadosRef = useRef(aplicados);
  aplicadosRef.current = aplicados;
  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  const refrescar = useCallback(async (pagina: number, tamanho: number) => {
    const actuales = aplicadosRef.current;
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

  // Depende de `aplicados`: por eso BUSCAR y LIMPIAR sí consultan aunque ya
  // estemos en la página 1 (donde `setPage(1)` no produce ningún cambio).
  useEffect(() => {
    void refrescar(page, pageSize);
  }, [page, pageSize, aplicados, refrescar]);

  /** Edita un campo del formulario. NO consulta: eso es "Buscar". */
  const setFiltro = useCallback((campo: string, valor: string) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  /** "Buscar": manda los filtros al backend y vuelve a la página 1. */
  const aplicarFiltros = useCallback((nuevos?: Record<string, string>) => {
    const base = nuevos
      ? { ...filtrosRef.current, ...nuevos }
      : { ...filtrosRef.current };
    setFiltros(base);
    setAplicados(base);
    setPage(1);
  }, []);

  /** "Limpiar" restaura los filtros propios y, si es transaccional, HOY -> HOY. */
  const limpiarFiltros = useCallback(() => {
    const base = { ...iniciales };
    setFiltros(base);
    setAplicados(base);
    setPage(1);
    // `iniciales` cambia de identidad en cada render; se compara por valor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
