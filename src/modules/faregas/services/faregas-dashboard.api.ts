import { faregasFetch } from './faregas-http-client';

export interface KpiValor {
  actual: number;
  anterior: number;
  delta: number;
  porcentaje: number;
  tooltip: string;
}

export interface SerieDiariaItem {
  fecha: string;
  venta: number;
  operaciones: number;
}

export interface SerieCertificadoItem {
  fecha: string;
  total: number;
  emitidos: number;
  borradores: number;
  anulados: number;
}

export interface DistribucionCertificadoItem {
  tipo: string;
  cantidad: number;
  emitidos: number;
  pendientes: number;
  anulados: number;
  porcentaje: number;
  totalSoles: number;
}

export interface DistribucionPagoItem {
  medio: string;
  total: number;
  cantidad: number;
  porcentaje: number;
}

export interface AlertaInconsistencia {
  tipo: string;
  mensaje: string;
  ordenId: number;
  plantaKey: string;
  saldo: number;
}

export interface DashboardResumenResponse {
  rango: {
    desde: string;
    hasta: string;
    inicioActual: string;
    finActual: string;
  };
  plantasConsultadas: string[];
  kpis: {
    ventaOperativaGenerada: KpiValor;
    ventaPagada: KpiValor;
    ventaBruta: KpiValor;
    ventaNeta: KpiValor;
    totalCobrado: KpiValor;
    saldoPendiente: KpiValor;
    cantidadOperaciones: KpiValor;
    ticketPromedio: KpiValor;
    ventaOperativaCertificados: KpiValor;
    ventaBrutaCertificados: KpiValor;
    ventaNetaCertificados: KpiValor;
    ticketPromedioCertificados: KpiValor;
    certificadosEmitidos: KpiValor;
    certificadosPendientes: KpiValor;
    certificadosAnulados: KpiValor;
    productosVendidos: KpiValor;
    montoDescontado: KpiValor;
    facturasAceptadas: KpiValor;
    boletasAceptadas: KpiValor;
    comprobantesRechazadosOError: KpiValor;
  };
  serieDiaria: SerieDiariaItem[];
  serieCertificados: SerieCertificadoItem[];
  distribucionCertificados: DistribucionCertificadoItem[];
  distribucionProductos?: ProductoDetalleItem[];
  distribucionPagos: DistribucionPagoItem[];
  alertas: AlertaInconsistencia[];
}

export interface SedeDetalleItem {
  plantaKey: string;
  plantaNombre: string;
  cantidadOperaciones: number;
  ventaOperativa: number;
  certificadosEmitidos: number;
  certificadosPendientes: number;
  totalCobrado: number;
  saldoPendiente: number;
  ticketPromedio: number;
}

export interface CertificadoDetalleItem {
  id: number;
  numeroCertificado: string | null;
  tipoCertificado: string;
  estado: string;
  plantaKey: string;
  plantaNombre: string;
  usuarioCreacion: string;
  fechaCreacion: string;
  fechaEmision: string | null;
  importeTotal: number;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
}

export interface ProductoDetalleItem {
  id?: number;
  sku: string;
  descripcion: string;
  unidad: string;
  unidadesVendidas: number;
  totalSoles: number;
  operaciones: number;
  precioPromedio: number;
}

export interface ComprobanteDetalleItem {
  id: number;
  tipoComprobante: string;
  serie: string;
  numero: number;
  nroComprobante: string;
  documentoCliente: string;
  cliente: string;
  condicionPago: string;
  medioPago: string | null;
  estado: string;
  baseImponible: number;
  igv: number;
  importeTotal: number;
  fechaDocumento: string;
  fechaCreacion: string;
  cuotasCantidad: number;
  cuotasImporteProgramado: number;
  proximoVencimiento: string | null;
  plantaKey: string;
  plantaNombre: string;
}

export interface PagoDetalleItem {
  id: number;
  ordenPagoId: number;
  importe: number;
  medioPago: string;
  tarjetaTipo: string | null;
  banco: string | null;
  nroOperacion: string | null;
  fechaCreacion: string;
  estado: string;
  registradoPor: string;
  plantaKey: string;
  plantaNombre: string;
}

export interface DescuentoDetalleItem {
  id: number;
  cupon: string;
  campana: string;
  tipo: string | null;
  importeOriginal: number;
  importeDescuento: number;
  importeFinal: number;
  estado: string;
  fechaAplicacion: string;
  certificadoId: number | null;
  ordenPagoId: number | null;
  facturacionId: number | null;
  plantaKey: string;
  plantaNombre: string;
}

export interface UsuarioDetalleItem {
  username: string;
  nombre: string;
  totalOperaciones: number;
  totalVendido: number;
  certificadosGenerados: number;
  productosVendidos: number;
  ticketPromedio: number;
  ultimaOperacion: string;
}

export interface PaginadoResponse<T> {
  items: T[];
  total: number;
  pagina: number;
  limite: number;
}

export interface DashboardExportacionResponse {
  metadatos: {
    rango: string;
    fechaGeneracion: string;
    usuarioExportador: string;
    sedesIncluidas: string;
  };
  hojas: {
    resumen: DashboardResumenResponse;
    sedes: SedeDetalleItem[];
    certificados: CertificadoDetalleItem[];
    ventasProductos: ProductoDetalleItem[];
    comprobantes: ComprobanteDetalleItem[];
    pagos: PagoDetalleItem[];
    descuentos: DescuentoDetalleItem[];
    usuarios: UsuarioDetalleItem[];
  };
}

export interface FiltrosDashboard {
  alcance?: 'GLOBAL' | 'SEDE';
  plantaKey?: string;
  plantas?: string[];
  desde?: string;
  hasta?: string;
  tipoCertificado?: string;
  productoId?: number;
  estado?: string;
  usuario?: string;
  medioPago?: string;
  tipoComprobante?: string;
  pagina?: number;
  limite?: number;
}

export interface DashboardRequestOptions {
  signal?: AbortSignal;
}

function construirQueryString(params: Record<string, unknown>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) query.set(key, value.join(','));
      } else {
        query.set(key, String(value));
      }
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export const faregasDashboardApi = {
  obtenerResumen: async (filtros: FiltrosDashboard, options: DashboardRequestOptions = {}): Promise<DashboardResumenResponse> => {
    const qs = construirQueryString(filtros as Record<string, unknown>);
    const res = await faregasFetch(`/dashboard/resumen${qs}`, { signal: options.signal });
    return res.data;
  },

  obtenerSedes: async (filtros: FiltrosDashboard, options: DashboardRequestOptions = {}): Promise<SedeDetalleItem[]> => {
    const qs = construirQueryString(filtros as Record<string, unknown>);
    const res = await faregasFetch(`/dashboard/sedes${qs}`, { signal: options.signal });
    return res.data;
  },

  obtenerCertificados: async (filtros: FiltrosDashboard, options: DashboardRequestOptions = {}): Promise<PaginadoResponse<CertificadoDetalleItem>> => {
    const qs = construirQueryString(filtros as Record<string, unknown>);
    const res = await faregasFetch(`/dashboard/detalle/certificados${qs}`, { signal: options.signal });
    return res.data;
  },

  obtenerProductos: async (filtros: FiltrosDashboard, options: DashboardRequestOptions = {}): Promise<PaginadoResponse<ProductoDetalleItem>> => {
    const qs = construirQueryString(filtros as Record<string, unknown>);
    const res = await faregasFetch(`/dashboard/detalle/productos${qs}`, { signal: options.signal });
    return res.data;
  },

  obtenerComprobantes: async (filtros: FiltrosDashboard, options: DashboardRequestOptions = {}): Promise<PaginadoResponse<ComprobanteDetalleItem>> => {
    const qs = construirQueryString(filtros as Record<string, unknown>);
    const res = await faregasFetch(`/dashboard/detalle/comprobantes${qs}`, { signal: options.signal });
    return res.data;
  },

  obtenerPagos: async (filtros: FiltrosDashboard, options: DashboardRequestOptions = {}): Promise<PaginadoResponse<PagoDetalleItem>> => {
    const qs = construirQueryString(filtros as Record<string, unknown>);
    const res = await faregasFetch(`/dashboard/detalle/pagos${qs}`, { signal: options.signal });
    return res.data;
  },

  obtenerDescuentos: async (filtros: FiltrosDashboard, options: DashboardRequestOptions = {}): Promise<PaginadoResponse<DescuentoDetalleItem>> => {
    const qs = construirQueryString(filtros as Record<string, unknown>);
    const res = await faregasFetch(`/dashboard/detalle/descuentos${qs}`, { signal: options.signal });
    return res.data;
  },

  obtenerUsuarios: async (filtros: FiltrosDashboard, options: DashboardRequestOptions = {}): Promise<UsuarioDetalleItem[]> => {
    const qs = construirQueryString(filtros as Record<string, unknown>);
    const res = await faregasFetch(`/dashboard/detalle/usuarios${qs}`, { signal: options.signal });
    return res.data;
  },

  obtenerExportacion: async (filtros: FiltrosDashboard): Promise<DashboardExportacionResponse> => {
    const qs = construirQueryString(filtros as Record<string, unknown>);
    const res = await faregasFetch(`/dashboard/exportacion${qs}`);
    return res.data;
  }
};
