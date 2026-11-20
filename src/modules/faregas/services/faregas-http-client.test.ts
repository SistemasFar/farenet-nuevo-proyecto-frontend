// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { faregasFetchBlob, faregasFetchWithStatus, leerErrorFaregas } from './faregas-http-client';

describe('faregasFetchBlob', () => {
  beforeEach(() => {
    sessionStorage.setItem('faregasAccessToken', 'token-prueba');
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('descarga el PDF protegido enviando el token de la sesión FAREGAS', async () => {
    const pdf = new Blob(['%PDF'], { type: 'application/pdf' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => pdf,
    });
    vi.stubGlobal('fetch', fetchMock);

    const blob = await faregasFetchBlob('/certificados/borradores/528/facturacion/pdf');

    expect(blob.type).toBe('application/pdf');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/faregas/certificados/borradores/528/facturacion/pdf'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-prueba' }),
      }),
    );
  });

  it('propaga el mensaje seguro del backend cuando el usuario no tiene acceso', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: 'No tiene acceso a la planta del certificado.',
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })));

    await expect(faregasFetchBlob('/certificados/borradores/999/facturacion/pdf'))
      .rejects.toThrow('No tiene acceso a la planta del certificado.');
  });

  it('expone el estado HTTP y el motivo del backend para errores del wizard', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: 'Para GLP INICIAL solo se aceptan GASOLINA o DIESEL como combustible original.',
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })));

    await expect(faregasFetchWithStatus('/certificados/borradores/821/vehiculo', { method: 'PUT' }))
      .rejects.toMatchObject({
        status: 400,
        message: 'Para GLP INICIAL solo se aceptan GASOLINA o DIESEL como combustible original.',
      });
  });

  it('muestra un estado claro cuando el backend devuelve una respuesta no JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('proxy failure', { status: 502 })));
    await expect(faregasFetchWithStatus('/certificados/borradores/821/vehiculo'))
      .rejects.toMatchObject({ status: 502, message: expect.stringContaining('HTTP 502') });
  });

  it.each([401, 403, 409, 422])('conserva el estado y el mensaje HTTP %i del backend', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: `Error controlado ${status}`,
      codigo: `CASO_${status}`,
    }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })));

    await expect(faregasFetchWithStatus('/certificados/borradores/821/vehiculo'))
      .rejects.toMatchObject({ status, message: `Error controlado ${status}`, codigo: `CASO_${status}` });
  });
});

describe('avisos compartidos de FAREGAS', () => {
  const respuesta = (status: number, data: unknown, headers?: HeadersInit) =>
    new Response(JSON.stringify(data), { status, headers });

  it('conserva la causa y explica cómo revisar los permisos de sede', async () => {
    const error = await leerErrorFaregas(respuesta(403, {
      message: 'No tienes acceso a la sede de este certificado.', code: 'PLANTA_NO_AUTORIZADA',
    }));
    expect(error.message).toContain('No tienes acceso a la sede de este certificado.');
    expect(error.message).toContain('Verifica la sede activa');
    expect(error.codigo).toBe('PLANTA_NO_AUTORIZADA');
  });

  it('incluye validaciones por campo sin alterar los detalles que usan los formularios', async () => {
    const detalles = { errores: [{ campo: 'placa', mensaje: 'La placa es obligatoria.' }] };
    const error = await leerErrorFaregas(respuesta(422, { message: 'Revisa los datos del vehículo.', detalles }));
    expect(error.detalles).toEqual(detalles);
    expect(error.message).toContain('La placa es obligatoria.');
  });

  it('explica el motivo fiscal confirmado de la nota', async () => {
    const error = await leerErrorFaregas(respuesta(422, {
      codigo: 'NUBEFACT_NOTA_NO_ACEPTADA',
      message: 'NubeFact rechazó la nota.',
      detalles: { contingencia: {
        descripcion: 'El proveedor comunicó un rechazo fiscal.',
        mensajeOriginalNormalizado: 'El documento referenciado no está registrado.',
      } },
    }));
    expect(error.message).toContain('El documento referenciado no está registrado.');
    expect(error.message).toContain('Abre el historial de la nota');
  });

  it('muestra la referencia de soporte sin publicar un error interno de PostgreSQL', async () => {
    const error = await leerErrorFaregas(respuesta(500, { message: 'relation persona does not exist' }, {
      'X-FAREGAS-Referencia': 'prueba-123',
    }));
    expect(error.referencia).toBe('prueba-123');
    expect(error.message).toContain('Referencia prueba-123');
    expect(error.message).not.toContain('persona');
  });
});
