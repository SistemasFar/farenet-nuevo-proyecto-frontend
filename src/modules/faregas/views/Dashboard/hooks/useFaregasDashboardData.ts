import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  faregasDashboardApi,
  type CertificadoDetalleItem,
  type ComprobanteDetalleItem,
  type DashboardResumenResponse,
  type DescuentoDetalleItem,
  type FiltrosDashboard,
  type PagoDetalleItem,
  type PaginadoResponse,
  type ProductoDetalleItem,
  type SedeDetalleItem,
  type UsuarioDetalleItem
} from '../../../services/faregas-dashboard.api';
import { validarRangoFechasDashboard } from '../../../utils/faregas-dashboard-fechas';

export type DashboardTabId = 'resumen' | 'ventas' | 'certificados' | 'cobranza';
export type DashboardPageKey = 'certificados' | 'comprobantes' | 'pagos';

interface DashboardPages {
  certificados: number;
  comprobantes: number;
  pagos: number;
}

const PAGINAS_INICIALES: DashboardPages = {
  certificados: 1,
  comprobantes: 1,
  pagos: 1
};

function esCancelacion(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
    || error instanceof Error && error.name === 'AbortError';
}

export function useFaregasDashboardData(filtros: FiltrosDashboard, tabActiva: DashboardTabId) {
  const [resumen, setResumen] = useState<DashboardResumenResponse | null>(null);
  const [sedes, setSedes] = useState<SedeDetalleItem[]>([]);
  const [certificados, setCertificados] = useState<PaginadoResponse<CertificadoDetalleItem> | null>(null);
  const [ventas, setVentas] = useState<PaginadoResponse<ProductoDetalleItem> | null>(null);
  const [comprobantes, setComprobantes] = useState<PaginadoResponse<ComprobanteDetalleItem> | null>(null);
  const [pagos, setPagos] = useState<PaginadoResponse<PagoDetalleItem> | null>(null);
  const [descuentos, setDescuentos] = useState<PaginadoResponse<DescuentoDetalleItem> | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioDetalleItem[]>([]);
  const [paginas, setPaginas] = useState<DashboardPages>(PAGINAS_INICIALES);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const firmasPestanas = useRef<Partial<Record<DashboardTabId, string>>>({});
  const firmaResumen = useRef('');
  const firmaSedes = useRef('');
  const abortController = useRef<AbortController | null>(null);
  const requestId = useRef(0);

  const filtrosBase = useMemo<FiltrosDashboard>(() => ({
    alcance: filtros.alcance,
    plantaKey: filtros.plantaKey,
    plantas: filtros.plantas,
    desde: filtros.desde,
    hasta: filtros.hasta,
    tipoCertificado: filtros.tipoCertificado,
    productoId: filtros.productoId,
    estado: filtros.estado,
    usuario: filtros.usuario,
    medioPago: filtros.medioPago,
    tipoComprobante: filtros.tipoComprobante
  }), [
    filtros.alcance,
    filtros.plantaKey,
    filtros.plantas,
    filtros.desde,
    filtros.hasta,
    filtros.tipoCertificado,
    filtros.productoId,
    filtros.estado,
    filtros.usuario,
    filtros.medioPago,
    filtros.tipoComprobante
  ]);

  const firmaFiltros = useMemo(() => JSON.stringify(filtrosBase), [filtrosBase]);

  const cargarTab = useCallback(async (forzar = false) => {
    const validacion = validarRangoFechasDashboard(filtrosBase.desde || '', filtrosBase.hasta || '');
    if (!validacion.valido) {
      setErrorMsg(validacion.mensaje || 'El período máximo permitido es de un mes.');
      setCargando(false);
      return;
    }

    if (forzar) firmasPestanas.current = {};

    const paginaFirma = tabActiva === 'certificados'
      ? paginas.certificados
      : tabActiva === 'cobranza'
        ? `${paginas.comprobantes}-${paginas.pagos}`
        : 1;
    const firmaPestana = `${firmaFiltros}|${paginaFirma}`;

    if (!forzar && firmasPestanas.current[tabActiva] === firmaPestana) return;

    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    const idActual = ++requestId.current;
    const options = { signal: controller.signal };
    const necesitaResumen = forzar || firmaResumen.current !== firmaFiltros;
    const necesitaSedes = forzar || firmaSedes.current !== firmaFiltros;

    setCargando(true);
    setErrorMsg(null);

    try {
      const solicitudResumen = necesitaResumen
        ? faregasDashboardApi.obtenerResumen(filtrosBase, options)
        : Promise.resolve(null);

      if (tabActiva === 'resumen') {
        const [nuevoResumen, nuevasSedes] = await Promise.all([
          solicitudResumen,
          necesitaSedes ? faregasDashboardApi.obtenerSedes(filtrosBase, options) : Promise.resolve(null)
        ]);
        if (idActual !== requestId.current) return;
        if (nuevoResumen) setResumen(nuevoResumen);
        if (nuevasSedes) setSedes(nuevasSedes);
        if (necesitaSedes) firmaSedes.current = firmaFiltros;
      } else if (tabActiva === 'ventas') {
        const [nuevoResumen, nuevasVentas, nuevasSedes, nuevosUsuarios] = await Promise.all([
          solicitudResumen,
          faregasDashboardApi.obtenerProductos({ ...filtrosBase, pagina: 1, limite: 5000 }, options),
          necesitaSedes ? faregasDashboardApi.obtenerSedes(filtrosBase, options) : Promise.resolve(null),
          faregasDashboardApi.obtenerUsuarios(filtrosBase, options)
        ]);
        if (idActual !== requestId.current) return;
        if (nuevoResumen) setResumen(nuevoResumen);
        setVentas(nuevasVentas);
        if (nuevasSedes) setSedes(nuevasSedes);
        setUsuarios(nuevosUsuarios);
        if (necesitaSedes) firmaSedes.current = firmaFiltros;
      } else if (tabActiva === 'certificados') {
        const [nuevoResumen, nuevosCertificados, nuevasSedes] = await Promise.all([
          solicitudResumen,
          faregasDashboardApi.obtenerCertificados({ ...filtrosBase, pagina: paginas.certificados, limite: 20 }, options),
          necesitaSedes ? faregasDashboardApi.obtenerSedes(filtrosBase, options) : Promise.resolve(null)
        ]);
        if (idActual !== requestId.current) return;
        if (nuevoResumen) setResumen(nuevoResumen);
        setCertificados(nuevosCertificados);
        if (nuevasSedes) setSedes(nuevasSedes);
        if (necesitaSedes) firmaSedes.current = firmaFiltros;
      } else {
        const [nuevoResumen, nuevosComprobantes, nuevosPagos, nuevosDescuentos] = await Promise.all([
          solicitudResumen,
          faregasDashboardApi.obtenerComprobantes({ ...filtrosBase, pagina: paginas.comprobantes, limite: 20 }, options),
          faregasDashboardApi.obtenerPagos({ ...filtrosBase, pagina: paginas.pagos, limite: 20 }, options),
          faregasDashboardApi.obtenerDescuentos({ ...filtrosBase, pagina: 1, limite: 20 }, options)
        ]);
        if (idActual !== requestId.current) return;
        if (nuevoResumen) setResumen(nuevoResumen);
        setComprobantes(nuevosComprobantes);
        setPagos(nuevosPagos);
        setDescuentos(nuevosDescuentos);
      }

      if (necesitaResumen) firmaResumen.current = firmaFiltros;
      firmasPestanas.current[tabActiva] = firmaPestana;
    } catch (error: unknown) {
      if (esCancelacion(error)) return;
      console.error('Error cargando datos del dashboard:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Error al cargar las métricas del dashboard.');
    } finally {
      if (idActual === requestId.current) setCargando(false);
    }
  }, [filtrosBase, firmaFiltros, paginas, tabActiva]);

  useEffect(() => {
    const timer = window.setTimeout(() => void cargarTab(false), 0);
    return () => window.clearTimeout(timer);
  }, [cargarTab]);

  useEffect(() => () => abortController.current?.abort(), []);

  const cambiarPagina = useCallback((clave: DashboardPageKey, pagina: number) => {
    setPaginas((actuales) => ({ ...actuales, [clave]: Math.max(1, pagina) }));
  }, []);

  const reiniciarPaginas = useCallback(() => setPaginas(PAGINAS_INICIALES), []);

  return {
    resumen,
    sedes,
    certificados,
    ventas,
    comprobantes,
    pagos,
    descuentos,
    usuarios,
    paginas,
    cargando,
    errorMsg,
    recargar: () => cargarTab(true),
    cambiarPagina,
    reiniciarPaginas
  };
}
