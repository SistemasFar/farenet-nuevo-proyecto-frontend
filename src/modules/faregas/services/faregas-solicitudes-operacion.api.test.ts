import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  faregasSolicitudesOperacionApi,
  etiquetaEstadoSolicitud,
  etiquetaTipoSolicitud,
} from './faregas-solicitudes-operacion.api';
import * as httpClient from './faregas-http-client';

describe('faregas-solicitudes-operacion.api', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('obtiene contexto de certificado correctamente', async () => {
    const mockContexto = {
      certificado: { id: 10, numero: '001', tipo: 'INICIAL_GNV', estado: 'EMITIDO', fechaEmision: null, placa: 'ABC-123' },
      comprobante: null,
      empresa: { key: 'farenet', nombre: 'Farenet' },
      planta: { key: 'ate', nombre: 'Ate' },
      tiposDisponibles: ['ANULAR_AMBOS'],
    };
    const spy = vi.spyOn(httpClient, 'faregasFetch').mockResolvedValue({ data: mockContexto });

    const res = await faregasSolicitudesOperacionApi.contexto(10);
    expect(spy).toHaveBeenCalledWith('/solicitudes-operacion/certificados/10/contexto');
    expect(res).toEqual(mockContexto);
  });

  it('crea una solicitud enviando payload JSON', async () => {
    const payload = {
      certificadoId: 10,
      tipoOperacion: 'ANULAR_AMBOS' as const,
      motivo: 'Error de digitación en la placa',
      idempotenciaClave: 'idem-123',
    };
    const mockRes = { data: { id: 1, ...payload, estado: 'PENDIENTE_APROBACION' as const }, creada: true };
    const spy = vi.spyOn(httpClient, 'faregasFetch').mockResolvedValue(mockRes as any);

    const res = await faregasSolicitudesOperacionApi.crear(payload);
    expect(spy).toHaveBeenCalledWith('/solicitudes-operacion', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(res.creada).toBe(true);
  });

  it('lista solicitudes con filtros de búsqueda', async () => {
    const mockLista = { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    const spy = vi.spyOn(httpClient, 'faregasFetch').mockResolvedValue(mockLista as any);

    const res = await faregasSolicitudesOperacionApi.listar({ estado: 'PENDIENTE_APROBACION', plantaKey: 'ate' });
    expect(spy).toHaveBeenCalledWith('/solicitudes-operacion?estado=PENDIENTE_APROBACION&plantaKey=ate');
    expect(res.total).toBe(0);
  });

  it('aprueba enviando version y justificacion', async () => {
    const spy = vi.spyOn(httpClient, 'faregasFetch').mockResolvedValue({ data: { id: 1, estado: 'APROBADA' } });
    const res = await faregasSolicitudesOperacionApi.aprobar(1, 1, 'Aprobado conforme');
    expect(spy).toHaveBeenCalledWith('/solicitudes-operacion/1/aprobar', {
      method: 'POST',
      body: JSON.stringify({ version: 1, justificacion: 'Aprobado conforme' }),
    });
    expect(res.estado).toBe('APROBADA');
  });

  it('autoaprueba enviando la confirmación explícita', async () => {
    const spy = vi.spyOn(httpClient, 'faregasFetch').mockResolvedValue({ data: { id: 1, estado: 'APROBADA' } });
    await faregasSolicitudesOperacionApi.aprobar(1, 1, 'Contingencia sustentada', true);
    expect(spy).toHaveBeenCalledWith('/solicitudes-operacion/1/aprobar', {
      method: 'POST',
      body: JSON.stringify({
        version: 1,
        justificacion: 'Contingencia sustentada',
        confirmarAutoaprobacion: true,
      }),
    });
  });

  it('rechaza enviando version y justificacion obligatoria', async () => {
    const spy = vi.spyOn(httpClient, 'faregasFetch').mockResolvedValue({ data: { id: 1, estado: 'RECHAZADA' } });
    const res = await faregasSolicitudesOperacionApi.rechazar(1, 1, 'No procede por vencimiento');
    expect(spy).toHaveBeenCalledWith('/solicitudes-operacion/1/rechazar', {
      method: 'POST',
      body: JSON.stringify({ version: 1, justificacion: 'No procede por vencimiento' }),
    });
    expect(res.estado).toBe('RECHAZADA');
  });

  it('cancela enviando version y comentario', async () => {
    const spy = vi.spyOn(httpClient, 'faregasFetch').mockResolvedValue({ data: { id: 1, estado: 'CANCELADA' } });
    const res = await faregasSolicitudesOperacionApi.cancelar(1, 1, 'Desistimiento');
    expect(spy).toHaveBeenCalledWith('/solicitudes-operacion/1/cancelar', {
      method: 'POST',
      body: JSON.stringify({ version: 1, comentario: 'Desistimiento' }),
    });
    expect(res.estado).toBe('CANCELADA');
  });

  it('no expone ejecutores parciales en el cliente público del Paso A', () => {
    expect(faregasSolicitudesOperacionApi).not.toHaveProperty('ejecutarAnulacionCertificado');
    expect(faregasSolicitudesOperacionApi).not.toHaveProperty('ejecutarRectificacionCertificado');
  });

  it('formatea etiquetas de rectificacion de certificado', () => {
    expect(etiquetaTipoSolicitud('RECTIFICAR_CERTIFICADO')).toBe('Rectificar certificado');
    expect(etiquetaTipoSolicitud('RECTIFICAR_COMPROBANTE')).toBe('Rectificar comprobante');
  });

  it('formatea etiquetas de estado y tipo de solicitud', () => {
    expect(etiquetaEstadoSolicitud('PENDIENTE_APROBACION')).toBe('Pendiente de aprobación');
    expect(etiquetaEstadoSolicitud('APROBADA')).toBe('Aprobada — pendiente de ejecución');
    expect(etiquetaTipoSolicitud('ANULAR_CERTIFICADO')).toBe('Anular certificado');
    expect(etiquetaTipoSolicitud('RECTIFICAR_AMBOS')).toBe('Rectificar certificado y comprobante');
  });
});
