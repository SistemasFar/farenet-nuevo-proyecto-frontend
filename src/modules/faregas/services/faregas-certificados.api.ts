import { faregasFetchWithStatus as fetchWithToken } from './faregas-http-client';
import type {
  GuardarTallerFaregasRequest,
  ActualizarBorradorFaregasRequest,
  ActualizarTitularFaregasRequest,
  CrearBorradorFaregasRequest,
  CrearTitularFaregasRequest,
  GuardarComponentesGlpFaregasRequest,
  GuardarConformidadFaregasRequest,
  GuardarFacturacionFaregasRequest,
  GuardarGlpFaregasRequest,
  GuardarGnvFaregasRequest,
  GuardarPagosFaregasRequest,
  GuardarVerificacionesFaregasRequest,
  PasoBorradorFaregas,
  VehiculoBorradorFaregasRequest,
} from '../types/faregas-api';

export const faregasCertificadosApi = {
  obtenerCorrelativos: (plantaKey?: string, tipo?: string) => {
    const params = new URLSearchParams();
    if (plantaKey) params.append('plantaKey', plantaKey);
    if (tipo) params.append('tipo', tipo);
    return fetchWithToken(`/certificados/correlativos?${params.toString()}`);
  },
  obtenerRangoActivo: (plantaKey: string, tipo: string) => fetchWithToken(`/certificados/correlativos/${plantaKey}/${tipo}`),
  crearRangoCorrelativo: (data: { plantaKey: string; tipoCertificadoClave: string; nroInicio: number; nroMaximo: number }) => fetchWithToken('/certificados/correlativos', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  actualizarRangoCorrelativo: (id: number, data: { nroInicio: number; nroMaximo: number }) => fetchWithToken(`/certificados/correlativos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  cerrarRangoCorrelativo: (id: number) => fetchWithToken(`/certificados/correlativos/${id}/cerrar`, {
    method: 'PATCH'
  }),
  sugerirSiguienteRangoCorrelativo: async (params: {
    tipo: string;
    plantaKey: string;
    modalidad: string;
    ignorarRangoId?: number | null;
  }): Promise<{ nroInicio: number; nroMaximo: number; tamano: number }> => {
    const query = new URLSearchParams({
      tipo: params.tipo,
      plantaKey: params.plantaKey,
      modalidad: params.modalidad
    });
    if (params.ignorarRangoId) query.set('ignorarRangoId', String(params.ignorarRangoId));
    const response = await fetchWithToken(`/certificados/correlativos-plan/siguiente?${query.toString()}`);
    return response.data;
  },
  auditarCorrelativos: async () => fetchWithToken('/certificados/correlativos-plan/auditoria'),
  obtenerPlanCorrelativos: async () => fetchWithToken('/certificados/correlativos-plan/plan'),
  normalizarCorrelativos: async () => fetchWithToken('/certificados/correlativos-plan/aplicar', { method: 'POST' }),
  obtenerTipos: () => fetchWithToken('/certificados/tipos'),
  obtenerVehiculo: (placa: string, excludeCertificadoId?: number | null, tipoCertificado?: string) => {
    const params = new URLSearchParams();
    if (excludeCertificadoId) params.set('excludeCertificadoId', String(excludeCertificadoId));
    if (tipoCertificado) params.set('tipoCertificado', tipoCertificado);
    const query = params.size > 0 ? `?${params.toString()}` : '';
    return fetchWithToken(`/clientes/vehiculo/${encodeURIComponent(placa)}${query}`);
  },
  obtenerBorradores: (page = 1, pageSize = 10, search = '', fechaDesde = '', fechaHasta = '', estado = '') => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search,
      fechaDesde,
      fechaHasta,
      estado,
    });
    return fetchWithToken(`/certificados/borradores?${params.toString()}`);
  },
  crearBorrador: (data: CrearBorradorFaregasRequest) => fetchWithToken('/certificados/borradores', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  actualizarBorrador: (id: number, data: ActualizarBorradorFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  actualizarPasoBorrador: (id: number, pasoActual: PasoBorradorFaregas) => fetchWithToken(`/certificados/borradores/${id}/paso`, {
    method: 'PATCH',
    body: JSON.stringify({ pasoActual })
  }),
  anularBorrador: (id: number) => fetchWithToken(`/certificados/borradores/${id}/anular`, {
    method: 'PATCH'
  }),
  guardarTaller: (id: number, data: GuardarTallerFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/snapshot`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  guardarVehiculoBorrador: (id: number, data: VehiculoBorradorFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/vehiculo`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  confirmarVehiculoBorrador: (id: number, data: VehiculoBorradorFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/vehiculo/confirmar`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  crearTitular: (id: number, data: CrearTitularFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/titulares`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  actualizarTitular: (id: number, titularId: number, data: ActualizarTitularFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/titulares/${titularId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  eliminarTitular: (id: number, titularId: number) => fetchWithToken(`/certificados/borradores/${id}/titulares/${titularId}`, {
    method: 'DELETE'
  }),
  obtenerCatalogoVerificaciones: () => fetchWithToken('/certificados/catalogos/verificaciones'),
  obtenerTalleres: () => fetchWithToken('/certificados/talleres'),
  guardarGnv: (id: number, data: GuardarGnvFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/gnv`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  guardarVerificacionesGnv: (id: number, data: GuardarVerificacionesFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/gnv/verificaciones`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  guardarComponentesGnv: (id: number, data: Record<string, unknown>) => fetchWithToken(`/certificados/borradores/${id}/gnv/componentes`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  guardarGlp: (id: number, data: GuardarGlpFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/glp`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  guardarComponentesGlp: (id: number, data: GuardarComponentesGlpFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/glp/componentes`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  guardarVerificacionesGlp: (id: number, data: GuardarVerificacionesFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/glp/verificaciones`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  guardarConformidad: (id: number, data: GuardarConformidadFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/conformidad`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  obtenerBorradorCompleto: (id: number) => fetchWithToken(`/certificados/borradores/${id}`),
  obtenerChipBorrador: (id: number) => fetchWithToken(`/certificados/borradores/${id}/chip`),
  seleccionarChipBorrador: (id: number, numeroChip: string) => fetchWithToken(`/certificados/borradores/${id}/chip`, {
    method: 'PUT',
    body: JSON.stringify({ numeroChip })
  }),
  obtenerGnv: (id: number) => fetchWithToken(`/certificados/borradores/${id}/gnv`),
  obtenerGlp: (id: number) => fetchWithToken(`/certificados/borradores/${id}/glp`),
  obtenerConformidad: (id: number) => fetchWithToken(`/certificados/borradores/${id}/conformidad`),
  obtenerPagos: (id: number) => fetchWithToken(`/certificados/borradores/${id}/pagos`),
  guardarPagos: (id: number, data: GuardarPagosFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/pagos`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  obtenerFacturacion: (id: number) => fetchWithToken(`/certificados/borradores/${id}/facturacion`),
  preflightFacturacion: (id: number) => fetchWithToken(`/certificados/borradores/${id}/facturacion/preflight`),
  guardarFacturacion: (id: number, data: GuardarFacturacionFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/facturacion`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  emitirFacturacion: (id: number) => fetchWithToken(`/certificados/borradores/${id}/facturacion/emitir`, {
    method: 'POST'
  }),
  obtenerDocumentosElectronicos: (id: number) => fetchWithToken(`/certificados/borradores/${id}/facturacion/documentos`),
  consultarFacturacionElectronica: (id: number) => fetchWithToken(`/certificados/borradores/${id}/facturacion/consultar`, { method: 'POST' }),
  emitirNotaElectronica: (id: number, data: {
    tipo: 'CREDITO' | 'DEBITO'; motivoCodigo: string; sustento: string;
    baseImponible: number; igv: number; importeTotal: number;
  }) => fetchWithToken(`/certificados/borradores/${id}/facturacion/notas`, {
    method: 'POST', body: JSON.stringify(data)
  }),
  reintentarNotaElectronica: (id: number, tipo: 'CREDITO' | 'DEBITO', notaId: number) => fetchWithToken(`/certificados/borradores/${id}/facturacion/notas/${tipo}/${notaId}/emitir`, { method: 'POST' }),
  generarAnulacionElectronica: (id: number, data: {
    tipoDocumento: 'FACTURACION' | 'CREDITO' | 'DEBITO'; documentoId?: number; motivo: string;
  }) => fetchWithToken(`/certificados/borradores/${id}/facturacion/anulaciones`, {
    method: 'POST', body: JSON.stringify(data)
  }),
  consultarAnulacionElectronica: (id: number, anulacionId: number) => fetchWithToken(`/certificados/borradores/${id}/facturacion/anulaciones/${anulacionId}/consultar`, { method: 'POST' }),
  validarEmision: (id: number) => fetchWithToken(`/certificados/borradores/${id}/validar-emision`),
  emitirCertificado: (id: number) => fetchWithToken(`/certificados/borradores/${id}/emitir`, { method: 'POST' }),
  obtenerPrevisualizacion: (id: number) => fetchWithToken(`/certificados/borradores/${id}/previsualizacion`),
  obtenerOperacionesDisponibles: (plantaKey: string) => fetchWithToken(`/certificados/operaciones-disponibles?plantaKey=${plantaKey}`)
};
