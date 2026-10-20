import { faregasFetch, faregasFetchBlob } from './faregas-http-client';
import { descargarBlobComoArchivo } from './faregas-comprobante-visor.service';

export interface ClienteDuplicado {
  tipoDocumento: string;
  nroDocumento: string;
  nombreRazonSocial: string;
  direccion: string;
  email: string;
  telefono: string;
}

export interface CandidatoDuplicado {
  certificadoId: number;
  numeroCertificado: string;
  numeroDuplicado?: number | null;
  placa: string;
  tipoCertificadoClave: string;
  modalidad: 'INICIAL' | 'ANUAL';
  tipoNombre: string;
  fechaEmision: string;
  fechaLimiteDuplicado: string;
  vigente: boolean;
  anulacionAceptada: boolean;
  duplicable: boolean;
  duplicadosEmitidosCount?: number;
  motivoNoDisponible: string | null;
  plantaKey: string;
  plantaNombre: string;
  cliente: ClienteDuplicado;
}

export interface TipoDuplicado {
  valor: string;
  clave: string;
  modalidad: 'INICIAL' | 'ANUAL';
  nombre: string;
}

export interface PagoDuplicadoItem {
  id?: number;
  tipo: 'EFECTIVO' | 'TARJETA' | 'BANCO';
  importe: number;
  tarjetaKey?: string;
  modalidadTarjeta?: 'DEBITO' | 'CREDITO';
  nroOperacion?: string;
  entidadFinancieraKey?: string;
  cuentaCorrienteKey?: string;
  fechaDeposito?: string;
}

export interface SolicitudDuplicado {
  id: number;
  certificadoOriginalId: number;
  operacionId: number;
  facturacionId: number | null;
  numeroCertificado: string;
  placa: string;
  tipoNombre: string;
  fechaEmision: string;
  fechaLimiteDuplicado: string;
  precio: number;
  estado: 'PENDIENTE_PAGO' | 'PENDIENTE_COMPROBANTE' | 'DISPONIBLE' | 'ANULADO';
  operacionEstado: string;
  facturacionEstado: string | null;
  nroComprobante: string | null;
  tipoComprobante: 'BOLETA' | 'FACTURA' | null;
  fechaSolicitud: string | null;
  fechaDisponible: string | null;
  solicitadoPor: string | null;
  enlacePdf?: string | null;
  enlacePdfFaregas?: string | null;
  pagos?: PagoDuplicadoItem[];
}

export interface VistaDuplicado {
  html: string;
  numeroCertificado: string;
}

export interface HistorialDuplicadosResponse {
  items: SolicitudDuplicado[];
  paginacion: {
    pagina: number;
    porPagina: number;
    total: number;
    totalPaginas: number;
  };
}

export interface ProcesarDuplicadoRequest {
  pagos: Array<{
    tipo: 'EFECTIVO' | 'TARJETA' | 'BANCO';
    importe: number;
    tarjetaKey?: string;
    modalidadTarjeta?: 'DEBITO' | 'CREDITO';
    nroOperacion?: string;
    entidadFinancieraKey?: string;
    cuentaCorrienteKey?: string;
    fechaDeposito?: string;
  }>;
  facturacion: {
    tipoComprobante: 'BOLETA' | 'FACTURA';
    tipoDocumentoCliente: 'DNI' | 'RUC' | 'CARNETEXTRANJERIA';
    nroDocumento: string;
    nombreRazonSocial: string;
    direccion: string;
    email: string | null;
    telefono: string | null;
    condicionPago: 'CONTADO';
    cuotas: [];
    medioPago: string;
  };
}

export const faregasDuplicadosApi = {
  listarTipos: async (): Promise<TipoDuplicado[]> => {
    const response = await faregasFetch('/duplicados/tipos') as { ok: true; data: TipoDuplicado[] };
    return response.data;
  },

  buscar: async (placa: string, tipo = 'TODOS'): Promise<CandidatoDuplicado[]> => {
    const params = new URLSearchParams({ placa, tipo });
    const response = await faregasFetch(`/duplicados/buscar?${params.toString()}`) as { ok: true; data: CandidatoDuplicado[] };
    return response.data;
  },

  listarHistorial: async (filtros: { desde?: string; hasta?: string; pagina?: number } = {}): Promise<HistorialDuplicadosResponse> => {
    const params = new URLSearchParams();
    if (filtros.desde) params.set('desde', filtros.desde);
    if (filtros.hasta) params.set('hasta', filtros.hasta);
    params.set('pagina', String(filtros.pagina || 1));
    const response = await faregasFetch(`/duplicados/historial?${params.toString()}`) as { ok: true; data: HistorialDuplicadosResponse };
    return response.data;
  },

  crear: async (certificadoId: number): Promise<SolicitudDuplicado> => {
    const response = await faregasFetch('/duplicados', {
      method: 'POST',
      body: JSON.stringify({ certificadoId }),
    }) as { ok: true; data: SolicitudDuplicado };
    return response.data;
  },

  obtener: async (duplicadoId: number): Promise<SolicitudDuplicado> => {
    const response = await faregasFetch(`/duplicados/${duplicadoId}`) as { ok: true; data: SolicitudDuplicado };
    return response.data;
  },

  procesar: async (duplicadoId: number, payload: ProcesarDuplicadoRequest): Promise<SolicitudDuplicado> => {
    const response = await faregasFetch(`/duplicados/${duplicadoId}/procesar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as { ok: true; data: SolicitudDuplicado };
    return response.data;
  },

  obtenerVista: async (duplicadoId: number): Promise<VistaDuplicado> => {
    const response = await faregasFetch(`/duplicados/${duplicadoId}/vista`) as { ok: true; data: VistaDuplicado };
    return response.data;
  },

  descargarCertificado: async (duplicadoId: number, numeroCertificado: string): Promise<void> => {
    const blob = await faregasFetchBlob(`/duplicados/${duplicadoId}/pdf`);
    descargarBlobComoArchivo(blob, `DUPLICADO-${numeroCertificado || duplicadoId}.pdf`);
  },

  descargarComprobante: async (duplicadoId: number): Promise<void> => {
    const blob = await faregasFetchBlob(`/duplicados/${duplicadoId}/comprobante/pdf`);
    descargarBlobComoArchivo(blob, `COMPROBANTE-DUPLICADO-${duplicadoId}.pdf`);
  },
};
