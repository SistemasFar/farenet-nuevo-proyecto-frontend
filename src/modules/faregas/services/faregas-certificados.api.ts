import { faregasFetchWithStatus as fetchWithToken } from './faregas-http-client';
import type {
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
  VehiculoBorradorFaregasRequest,
} from '../types/faregas-api';

export const faregasCertificadosApi = {
  obtenerTipos: () => fetchWithToken('/certificados/tipos'),
  obtenerVehiculo: (placa: string) => fetchWithToken(`/clientes/vehiculo/${encodeURIComponent(placa)}`),
  obtenerBorradores: (page = 1, pageSize = 10) => fetchWithToken(`/certificados/borradores?page=${page}&pageSize=${pageSize}`),
  crearBorrador: (data: CrearBorradorFaregasRequest) => fetchWithToken('/certificados/borradores', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  actualizarBorrador: (id: number, data: ActualizarBorradorFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  guardarVehiculoBorrador: (id: number, data: VehiculoBorradorFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/vehiculo`, {
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
  obtenerGnv: (id: number) => fetchWithToken(`/certificados/borradores/${id}/gnv`),
  obtenerGlp: (id: number) => fetchWithToken(`/certificados/borradores/${id}/glp`),
  obtenerConformidad: (id: number) => fetchWithToken(`/certificados/borradores/${id}/conformidad`),
  obtenerPagos: (id: number) => fetchWithToken(`/certificados/borradores/${id}/pagos`),
  guardarPagos: (id: number, data: GuardarPagosFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/pagos`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  obtenerFacturacion: (id: number) => fetchWithToken(`/certificados/borradores/${id}/facturacion`),
  guardarFacturacion: (id: number, data: GuardarFacturacionFaregasRequest) => fetchWithToken(`/certificados/borradores/${id}/facturacion`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  emitirFacturacion: (id: number) => fetchWithToken(`/certificados/borradores/${id}/facturacion/emitir`, {
    method: 'POST'
  }),
  validarEmision: (id: number) => fetchWithToken(`/certificados/borradores/${id}/validar-emision`),
  emitirCertificado: (id: number) => fetchWithToken(`/certificados/borradores/${id}/emitir`, { method: 'POST' }),
  obtenerPrevisualizacion: (id: number) => fetchWithToken(`/certificados/borradores/${id}/previsualizacion`)
};
