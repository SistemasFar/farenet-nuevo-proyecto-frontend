import { faregasFetch } from './faregas-http-client';

export type TipoSolicitudOperacion =
  | 'ANULAR_CERTIFICADO'
  | 'ANULAR_COMPROBANTE'
  | 'ANULAR_AMBOS'
  | 'RECTIFICAR_CERTIFICADO'
  | 'RECTIFICAR_COMPROBANTE'
  | 'RECTIFICAR_AMBOS';

export type EstadoSolicitudOperacion =
  | 'PENDIENTE_APROBACION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'CANCELADA'
  | 'EN_EJECUCION'
  | 'COMPLETADA'
  | 'ERROR'
  | 'REQUIERE_INTERVENCION';

export interface ContextoSolicitudOperacion {
  certificado: {
    id: number;
    numero: string | null;
    tipo: string;
    estado: string | null;
    fechaEmision: string | null;
    placa: string | null;
  };
  comprobante: {
    id: number;
    tipo: string;
    numero: string | null;
    estado: string;
    fechaEmision: string | null;
    importeTotal: number | null;
    moneda: string | null;
    tipoDocumentoCliente: string | null;
    numeroDocumentoCliente: string | null;
    nombreRazonSocial: string | null;
    direccionCliente: string | null;
    descripcionServicio: string | null;
    serie: string | null;
    correlativo: number | null;
    proveedor: string | null;
    entorno: string | null;
    aceptadaSunat: boolean | null;
    sunatCodigo: string | null;
    sunatDescripcion: string | null;
  } | null;
  empresa: { key: string; nombre: string };
  planta: { key: string; nombre: string };
  tiposDisponibles: TipoSolicitudOperacion[];
  camposRectificables?: string[];
  camposRectificablesPorTipo?: Partial<Record<TipoSolicitudOperacion, string[]>>;
  datosTecnicosActuales?: Record<string, unknown> | null;
  datosFiscalesActuales?: Record<string, unknown> | null;
  comprobanteRestriccion?: {
    disponible: boolean;
    codigo: string | null;
    motivo: string | null;
  };
}

export interface SolicitudOperacion {
  id: number;
  tipoOperacion: TipoSolicitudOperacion;
  certificadoId: number | null;
  facturacionId: number | null;
  empresaKey: string;
  empresaNombre: string | null;
  plantaKey: string;
  plantaNombre: string | null;
  usuarioSolicitante: string;
  motivo: string;
  observaciones: string | null;
  estado: EstadoSolicitudOperacion;
  usuarioDecision: string | null;
  fechaSolicitud: string;
  fechaDecision: string | null;
  justificacionDecision: string | null;
  datosOriginalesCertificado: Record<string, unknown> | null;
  datosOriginalesComprobante: Record<string, unknown> | null;
  datosPropuestos: Record<string, unknown> | null;
  fechaEmisionOriginal: string | null;
  resultadoTecnico: Record<string, unknown> | null;
  resultadoFiscal: Record<string, unknown> | null;
  version: number;
  numeroCertificado: string | null;
  tipoCertificado: string | null;
  nroComprobante: string | null;
  placa: string | null;
  diferencias?: Array<{
    campo: string;
    valorOriginal: unknown;
    valorPropuesto: unknown;
  }> | null;
  numeroVersion?: number;
}

export interface EventoSolicitudOperacion {
  id: number;
  solicitudId: number;
  tipoEvento: string;
  estadoAnterior: EstadoSolicitudOperacion | null;
  estadoPosterior: EstadoSolicitudOperacion;
  usuarioResponsable: string;
  fechaEvento: string;
  comentario: string | null;
  metadatos: Record<string, unknown> | null;
}

export interface FiltrosSolicitudOperacion {
  page?: number;
  pageSize?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  plantaKey?: string;
  tipoOperacion?: TipoSolicitudOperacion | '';
  estado?: EstadoSolicitudOperacion | '';
  usuarioSolicitante?: string;
}

const queryString = (filtros: FiltrosSolicitudOperacion) => {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') params.set(clave, String(valor));
  });
  return params.toString();
};

export const faregasSolicitudesOperacionApi = {
  contexto: async (certificadoId: number): Promise<ContextoSolicitudOperacion> => {
    const respuesta = await faregasFetch(`/solicitudes-operacion/certificados/${certificadoId}/contexto`);
    return respuesta.data;
  },
  crear: async (payload: {
    certificadoId: number;
    tipoOperacion: TipoSolicitudOperacion;
    motivo: string;
    observaciones?: string;
    datosPropuestos?: Record<string, unknown>;
    idempotenciaClave: string;
  }): Promise<{ data: SolicitudOperacion; creada: boolean }> => faregasFetch('/solicitudes-operacion', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  listar: async (filtros: FiltrosSolicitudOperacion = {}): Promise<{
    data: SolicitudOperacion[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> => faregasFetch(`/solicitudes-operacion?${queryString(filtros)}`),
  obtener: async (id: number): Promise<SolicitudOperacion> => {
    const respuesta = await faregasFetch(`/solicitudes-operacion/${id}`);
    return respuesta.data;
  },
  aprobar: async (
    id: number,
    version: number,
    justificacion?: string,
    confirmarAutoaprobacion = false,
  ): Promise<SolicitudOperacion> => {
    const respuesta = await faregasFetch(`/solicitudes-operacion/${id}/aprobar`, {
      method: 'POST',
      body: JSON.stringify({
        version,
        justificacion,
        ...(confirmarAutoaprobacion ? { confirmarAutoaprobacion: true } : {}),
      }),
    });
    return respuesta.data;
  },
  rechazar: async (id: number, version: number, justificacion: string): Promise<SolicitudOperacion> => {
    const respuesta = await faregasFetch(`/solicitudes-operacion/${id}/rechazar`, {
      method: 'POST', body: JSON.stringify({ version, justificacion }),
    });
    return respuesta.data;
  },
  cancelar: async (id: number, version: number, comentario: string): Promise<SolicitudOperacion> => {
    const respuesta = await faregasFetch(`/solicitudes-operacion/${id}/cancelar`, {
      method: 'POST', body: JSON.stringify({ version, comentario }),
    });
    return respuesta.data;
  },
  historial: async (id: number): Promise<EventoSolicitudOperacion[]> => {
    const respuesta = await faregasFetch(`/solicitudes-operacion/${id}/eventos`);
    return respuesta.data;
  },
};

export const etiquetaEstadoSolicitud = (estado: EstadoSolicitudOperacion) => ({
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  APROBADA: 'Aprobada — pendiente de ejecución',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
  EN_EJECUCION: 'En ejecución',
  COMPLETADA: 'Completada',
  ERROR: 'Error',
  REQUIERE_INTERVENCION: 'Requiere intervención',
}[estado] || estado);

export const etiquetaTipoSolicitud = (tipo: TipoSolicitudOperacion) => ({
  ANULAR_CERTIFICADO: 'Anular certificado',
  ANULAR_COMPROBANTE: 'Anular comprobante',
  ANULAR_AMBOS: 'Anular certificado y comprobante',
  RECTIFICAR_CERTIFICADO: 'Rectificar certificado',
  RECTIFICAR_COMPROBANTE: 'Rectificar comprobante',
  RECTIFICAR_AMBOS: 'Rectificar certificado y comprobante',
}[tipo] || tipo);
