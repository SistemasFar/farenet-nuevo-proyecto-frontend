import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  faregasSolicitudesOperacionApi,
  etiquetaEstadoFiscal,
  etiquetaEstadoSolicitud,
  etiquetaEstadoSolicitudDetallado,
  etiquetaTipoSolicitud,
  type SolicitudOperacion,
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
    const spy = vi.spyOn(httpClient, 'faregasFetch').mockResolvedValue(mockRes);

    const res = await faregasSolicitudesOperacionApi.crear(payload);
    expect(spy).toHaveBeenCalledWith('/solicitudes-operacion', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(res.creada).toBe(true);
  });

  it('lista solicitudes con filtros de búsqueda', async () => {
    const mockLista = { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    const spy = vi.spyOn(httpClient, 'faregasFetch').mockResolvedValue(mockLista);

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

  it('autoaprueba una autorización fiscal con confirmación de autoejecución', async () => {
    const spy = vi.spyOn(httpClient, 'faregasFetch').mockResolvedValue({ data: { id: 1, estado: 'APROBADA' } });
    await faregasSolicitudesOperacionApi.aprobar(1, 1, 'Excepción fiscal sustentada', true, true);
    expect(spy).toHaveBeenCalledWith('/solicitudes-operacion/1/aprobar', {
      method: 'POST',
      body: JSON.stringify({
        version: 1,
        justificacion: 'Excepción fiscal sustentada',
        confirmarAutoaprobacion: true,
        confirmarAutoejecucion: true,
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

  it('ejecuta la anulación total enviando la confirmación de autoejecución', async () => {
    const spy = vi.spyOn(httpClient, 'faregasFetch').mockResolvedValue({
      data: { id: 8, estado: 'REQUIERE_INTERVENCION' },
      resultadoFiscal: { estado: 'ACEPTADO' },
      resultadoTecnico: { estado: 'BLOQUEADO_NORMATIVA' },
      completada: false,
      requiereIntervencion: true,
      yaCompletada: false,
    });
    const res = await faregasSolicitudesOperacionApi.ejecutarAnulacionTotal(8, {
      version: 3,
      justificacion: 'Autoejecución excepcional autorizada',
      confirmarAutoejecucion: true,
    });
    expect(spy).toHaveBeenCalledWith('/solicitudes-operacion/8/ejecutar-anulacion-total', {
      method: 'POST',
      body: JSON.stringify({
        version: 3,
        justificacion: 'Autoejecución excepcional autorizada',
        confirmarAutoejecucion: true,
      }),
    });
    expect(res.requiereIntervencion).toBe(true);
    expect(res.resultadoFiscal).toEqual({ estado: 'ACEPTADO' });
  });

  it('aprueba y ejecuta la anulación total en una sola llamada al endpoint unificado', async () => {
    const spy = vi.spyOn(httpClient, 'faregasFetch').mockResolvedValue({
      data: { id: 18, estado: 'REQUIERE_INTERVENCION' },
      aprobada: true,
      ejecucionIniciada: true,
      ejecucionFallida: false,
      codigoError: null,
      mensajeError: null,
      resultadoFiscal: { estado: 'ACEPTADO', resuelto: true, tipoOperacion: 'COMUNICACION_BAJA' },
      resultadoTecnico: { estado: 'BLOQUEADO_NORMATIVA', resuelto: false },
      completada: false,
      requiereIntervencion: true,
      yaCompletada: false,
    });
    const res = await faregasSolicitudesOperacionApi.aprobarYEjecutarAnulacionTotal(18, {
      version: 2,
      justificacion: 'Solicitud conforme',
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('/solicitudes-operacion/18/aprobar-y-ejecutar-anulacion-total', {
      method: 'POST',
      body: JSON.stringify({ version: 2, justificacion: 'Solicitud conforme' }),
    });
    expect(res.aprobada).toBe(true);
    expect(res.ejecucionIniciada).toBe(true);
    expect(res.completada).toBe(false);
    expect(res.requiereIntervencion).toBe(true);
  });

  it('envía las confirmaciones excepcionales en la acción unificada', async () => {
    const spy = vi.spyOn(httpClient, 'faregasFetch').mockResolvedValue({
      data: { id: 18, estado: 'REQUIERE_INTERVENCION' },
      aprobada: true,
      ejecucionIniciada: true,
      ejecucionFallida: false,
      completada: false,
      requiereIntervencion: true,
    });
    await faregasSolicitudesOperacionApi.aprobarYEjecutarAnulacionTotal(18, {
      version: 3,
      justificacion: 'Autoejecución excepcional autorizada',
      confirmarAutoaprobacion: true,
      confirmarAutoejecucion: true,
    });
    expect(spy).toHaveBeenCalledWith('/solicitudes-operacion/18/aprobar-y-ejecutar-anulacion-total', {
      method: 'POST',
      body: JSON.stringify({
        version: 3,
        justificacion: 'Autoejecución excepcional autorizada',
        confirmarAutoaprobacion: true,
        confirmarAutoejecucion: true,
      }),
    });
  });

  it('formatea el estado fiscal sin confundir una solicitud aprobada con una anulada', () => {
    expect(etiquetaEstadoFiscal('PENDIENTE_SUNAT')).toBe('Pendiente de SUNAT');
    expect(etiquetaEstadoFiscal('ACEPTADO')).toBe('Aceptado por SUNAT');
    expect(etiquetaEstadoFiscal('ANULADO')).toBe('Anulado');
    expect(etiquetaEstadoFiscal('BAJA_FISCAL_PENDIENTE')).toBe('Baja fiscal pendiente de confirmación');
    expect(etiquetaEstadoFiscal('BAJA_RECHAZADA')).toBe('Baja rechazada');
    expect(etiquetaEstadoFiscal(null)).toBe('Sin información');
  });

  it('formatea etiquetas de estado y tipo de solicitud', () => {
    expect(etiquetaEstadoSolicitud('PENDIENTE_APROBACION')).toBe('Pendiente de aprobación');
    expect(etiquetaEstadoSolicitud('APROBADA')).toBe('Aprobada — pendiente de ejecución');
    expect(etiquetaTipoSolicitud('ANULAR_CERTIFICADO')).toBe('Anular certificado');
    expect(etiquetaTipoSolicitud('RECTIFICAR_AMBOS')).toBe('Rectificar certificado y comprobante');
  });

  it('distingue baja pendiente, rechazada y completada en la solicitud', () => {
    const base = { tipoOperacion: 'ANULAR_AMBOS' } as SolicitudOperacion;
    expect(etiquetaEstadoSolicitudDetallado({
      ...base,
      estado: 'EN_EJECUCION',
      resultadoFiscal: { estado: 'BAJA_FISCAL_PENDIENTE' },
    })).toBe('Baja fiscal pendiente de confirmación');
    expect(etiquetaEstadoSolicitudDetallado({
      ...base,
      estado: 'ERROR',
      resultadoFiscal: { estado: 'BAJA_RECHAZADA' },
    })).toBe('Baja rechazada');
    expect(etiquetaEstadoSolicitudDetallado({
      ...base,
      estado: 'COMPLETADA',
      resultadoFiscal: { estado: 'BAJA_ACEPTADA' },
    })).toBe('Anulación completada');
  });

  it('distingue cola, bloqueo y resultado incierto de una nota automática', () => {
    const base = { tipoOperacion: 'EMITIR_NOTA_CREDITO', estado: 'APROBADA' } as SolicitudOperacion;
    expect(etiquetaEstadoSolicitudDetallado({
      ...base,
      resultadoFiscal: { estado: 'AUTORIZADA_EN_COLA' },
    })).toBe('Nota autorizada — en cola');
    expect(etiquetaEstadoSolicitudDetallado({
      ...base,
      estado: 'ERROR',
      resultadoFiscal: { estado: 'BLOQUEADA' },
    })).toBe('Emisión bloqueada');
    expect(etiquetaEstadoSolicitudDetallado({
      ...base,
      estado: 'EN_EJECUCION',
      resultadoFiscal: { estado: 'RESULTADO_INCIERTO' },
    })).toBe('Resultado incierto — pendiente de consulta');
  });

  it('sincroniza la anulación total mediante reanudación idempotente', async () => {
    const spy = vi.spyOn(httpClient, 'faregasFetch').mockResolvedValue({
      data: { id: 18, estado: 'EN_EJECUCION' },
      resultadoFiscal: { estado: 'BAJA_FISCAL_PENDIENTE' },
      resultadoTecnico: { estado: 'BLOQUEADO_POR_FISCAL' },
      completada: false,
      requiereIntervencion: false,
      yaCompletada: false,
    });
    await faregasSolicitudesOperacionApi.sincronizarAnulacionTotal(18, 4);
    expect(spy).toHaveBeenCalledWith('/solicitudes-operacion/18/ejecutar-anulacion-total', {
      method: 'POST',
      body: JSON.stringify({ version: 4, soloSincronizar: true }),
    });
  });
});
