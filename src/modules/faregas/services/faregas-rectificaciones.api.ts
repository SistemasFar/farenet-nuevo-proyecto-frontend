import { faregasFetchWithStatus as fetchWithToken, faregasFetchBlob } from './faregas-http-client';

export type DatosPropuestosRectificacion = Record<string, unknown>;

export interface DiferenciaRectificacion {
  campo: string;
  valorOriginal: unknown;
  valorPropuesto: unknown;
}

export interface VersionCertificadoRectificacion {
  id: number;
  certificadoId: number;
  solicitudId: number | null;
  numeroVersion: number;
  estadoVersion: string;
  esVigente: boolean;
  fechaEmisionOriginal: string | null;
  fechaVersion: string;
  fechaAplicacionOficial: string | null;
  usuarioCreacion: string;
  usuarioAprobacion: string | null;
  motivo: string;
  diferencias: DiferenciaRectificacion[];
  enlacePdfOriginal: string | null;
  enlacePdfVersion: string | null;
  metadatos?: Record<string, unknown> | null;
}

export interface SolicitudRectificacion {
  id: number;
  tipoOperacion: 'RECTIFICAR_CERTIFICADO';
  certificadoId: number | null;
  facturacionId: number | null;
  empresaKey: string;
  plantaKey: string;
  usuarioSolicitante: string;
  motivo: string;
  observaciones: string | null;
  estado: string;
  usuarioDecision: string | null;
  fechaSolicitud: string;
  fechaDecision: string | null;
  justificacionDecision: string | null;
  datosOriginalesCertificado: Record<string, unknown> | null;
  datosPropuestos: DatosPropuestosRectificacion | null;
  fechaEmisionOriginal: string | null;
  resultadoTecnico: Record<string, unknown> | null;
  usuarioEjecucion: string | null;
  fechaEjecucion: string | null;
  autorizacionAutoejecucion: boolean;
  version: number;
  numeroCertificado?: string | null;
  fechaEmision?: string | null;
}

export interface ContextoRectificacion {
  certificado: {
    id: number;
    numeroCertificado: string | null;
    tipoCertificado: string;
    tipoNombre: string | null;
    estado: string;
    fechaEmision: string | null;
    empresaKey: string;
    empresaNombre: string | null;
    plantaKey: string;
    plantaNombre: string | null;
    observaciones: string | null;
  };
  comprobanteAsociado: Record<string, unknown> | null;
  snapshotTecnico: Record<string, unknown>;
  datosActuales: Record<string, unknown>;
  camposRectificables: string[];
  permiteRectificar: boolean;
  motivosBloqueo: string[];
  rectificacionActiva: {
    id: number;
    estado: string;
    usuarioSolicitante: string;
    fechaSolicitud: string;
  } | null;
  permisos: {
    solicitar: boolean;
    aprobar: boolean;
    ejecutar: boolean;
    rectificarDirectamente: boolean;
    verHistorial: boolean;
  };
  versiones: VersionCertificadoRectificacion[];
  gestionExterna: {
    aplicaLocalmente: boolean;
    nota: string;
  };
}

export interface PrevisualizacionRectificacion {
  html: string;
  tipo: string;
  diferencias: DiferenciaRectificacion[];
  advertencias: string[];
  datosPropuestos: DatosPropuestosRectificacion;
  fechaEmisionOriginal: string | null;
  numeroCertificado: string | null;
}

export interface HistorialRectificacion {
  certificadoId: number;
  versiones: VersionCertificadoRectificacion[];
  solicitudes: SolicitudRectificacion[];
  eventos: Array<{
    id: number;
    solicitudId: number;
    tipoEvento: string;
    estadoAnterior: string | null;
    estadoNuevo: string;
    usuario: string;
    detalle: string | null;
    metadatos: Record<string, unknown> | null;
    fecha: string | null;
  }>;
}

const descargarBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = filename;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
};

export const faregasRectificacionesApi = {
  obtenerContexto: (certificadoId: number) =>
    fetchWithToken(`/certificados/${certificadoId}/rectificacion/contexto`),

  obtenerHistorial: (certificadoId: number) =>
    fetchWithToken(`/certificados/${certificadoId}/rectificacion/historial`),

  previsualizar: (certificadoId: number, datosPropuestos: DatosPropuestosRectificacion) =>
    fetchWithToken(`/certificados/${certificadoId}/rectificacion/previsualizacion`, {
      method: 'POST',
      body: JSON.stringify({ datosPropuestos })
    }),

  crearSolicitud: (certificadoId: number, payload: {
    motivo: string;
    observaciones?: string | null;
    datosPropuestos: DatosPropuestosRectificacion;
    idempotenciaClave: string;
  }) => fetchWithToken(`/certificados/${certificadoId}/rectificacion`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  ejecutarDirecta: (certificadoId: number, payload: {
    motivo: string;
    observaciones?: string | null;
    datosPropuestos: DatosPropuestosRectificacion;
    idempotenciaClave: string;
  }) => fetchWithToken(`/certificados/${certificadoId}/rectificacion/directa`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  ejecutarSolicitud: (solicitudId: number, payload: {
    version?: number;
    idempotenciaEjecucion?: string;
  }) => fetchWithToken(`/solicitudes-operacion/${solicitudId}/ejecutar-rectificacion`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  descargarPdfVersion: async (certificadoId: number, versionId: number, filename?: string) => {
    const blob = await faregasFetchBlob(`/certificados/${certificadoId}/rectificacion/versiones/${versionId}/pdf`);
    descargarBlob(blob, filename || `CERTIFICADO-${certificadoId}-v${versionId}.pdf`);
  }
};
