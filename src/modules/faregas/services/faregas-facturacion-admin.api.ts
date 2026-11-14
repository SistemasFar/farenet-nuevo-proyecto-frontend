import { faregasFetch } from './faregas-http-client';

const request = async <T>(path: string): Promise<T> => {
  return faregasFetch(`/certificados${path}`) as Promise<T>;
};

export interface DocumentoFacturacionAdmin {
  id: number;
  certificadoId: number | null;
  operacionId: number | null;
  origen: 'CERTIFICADO' | 'VENTA_CHIP' | 'OPERACION';
  plantaKey: string;
  plantaNombre: string;
  empresaKey: string;
  empresaNombre: string;
  tipoComprobante: string;
  nroComprobante: string | null;
  nroDocumento: string;
  cliente: string;
  placa: string | null;
  importeTotal: number;
  estado: string;
  aceptadaSunat: boolean | null;
  mensajeSunat: string | null;
  enlacePdf: string | null;
  enlaceXml: string | null;
  enlaceCdr: string | null;
  entornoFacturador: string | null;
  anulacionId: number | null;
  estadoAnulacion: string | null;
  motivoAnulacion: string | null;
  descripcionAnulacion: string | null;
  aceptadaAnulacionSunat: boolean | null;
  ticketAnulacionSunat: string | null;
  fechaSolicitudAnulacion: string | null;
  intentos: number;
  fechaUltimoIntento: string | null;
  fechaCreacion: string;
  sujetoDetraccion?: boolean;
  detraccionCodigo?: string | null;
  detraccionDescripcion?: string | null;
  detraccionPorcentaje?: number | null;
  detraccionBase?: number | null;
  detraccionMonto?: number | null;
  detraccionNeto?: number | null;
  detraccionEstadoDeposito?: 'PENDIENTE' | 'DEPOSITADO' | 'NO_APLICA' | string | null;
  detraccionConstanciaNro?: string | null;
  detraccionConstanciaFecha?: string | null;
  detraccionMotivoExclusion?: string | null;
}

export interface OperacionFacturacionAdmin {
  operacion?: string;
  numero_intento: number;
  estado: string;
  http_status: number | null;
  error: string | null;
  usuario_creacion?: string;
  fecha_creacion: string;
  fecha_finalizacion: string | null;
}

export interface FiltrosFacturacionAdmin {
  texto?: string;
  empresaKey?: string;
  plantaKey?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  pagina?: number;
  limite?: number;
}

export const faregasFacturacionAdminApi = {
  listar: async (filtros: FiltrosFacturacionAdmin) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    return request<{ ok: true; data: {
      documentos: DocumentoFacturacionAdmin[];
      total: number;
      pagina: number;
      limite: number;
      // Alias del sobre estándar de paginación de FAREGAS. El backend los
      // devuelve junto a `pagina`/`limite` para que el componente <Paginacion>
      // sea el mismo en toda la aplicación. `total` viene del COUNT con los
      // MISMOS filtros que el SELECT, así que ya es el total filtrado.
      page: number;
      limit: number;
      totalPages: number;
      plantas: Array<{ key: string; nombre: string; empresaKey: string }>;
      empresas: Array<{ key: string; nombre: string }>;
    } }>(`/facturacion/admin/documentos?${params.toString()}`);
  },
  obtenerDetalle: (id: number) => request<{ ok: true; data: {
    documento: DocumentoFacturacionAdmin;
    intentos: OperacionFacturacionAdmin[];
    operaciones: OperacionFacturacionAdmin[];
  } }>(`/facturacion/admin/documentos/${id}`),
  registrarConstanciaDetraccion: (id: number, data: { constanciaNro: string; constanciaFecha: string }) => {
    return faregasFetch(`/certificados/facturacion/admin/documentos/${id}/detraccion-constancia`, {
      method: 'POST',
      body: JSON.stringify(data)
    }) as Promise<{ ok: boolean; data: DocumentoFacturacionAdmin; message: string }>;
  }
};
