// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { faregasFetchBlob } from './faregas-http-client';

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
});
