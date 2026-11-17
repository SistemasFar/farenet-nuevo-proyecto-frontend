// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { faregasFetchBlob, faregasFetchWithStatus } from './faregas-http-client';

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

  it.each([401, 403, 409, 422, 500])('conserva el estado y el mensaje HTTP %i del backend', async (status) => {
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
