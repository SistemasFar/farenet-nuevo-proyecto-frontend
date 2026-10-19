// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { abrirComprobanteFaregas, descargarCertificadoFaregas, descargarComprobanteFaregas, descargarPdfNubefact } from './faregas-comprobante-visor.service';
import * as httpClient from './faregas-http-client';
import { faregasCertificadosApi } from './faregas-certificados.api';
import Swal from 'sweetalert2';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(),
    close: vi.fn(),
    showLoading: vi.fn(),
    DismissReason: { cancel: 'cancel' },
  },
}));

describe('faregas-comprobante-visor.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test-blob');
    globalThis.URL.revokeObjectURL = vi.fn();
    (Swal.fire as any).mockResolvedValue({ isConfirmed: false });
  });

  it('abre la representacion impresa FAREGAS y nunca nubefact de forma automatica', async () => {
    const mockBlob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
    const spyFetchBlob = vi.spyOn(httpClient, 'faregasFetchBlob').mockResolvedValue(mockBlob);

    const mockVentana = {
      location: { href: '' },
      closed: false,
      opener: null,
      close: vi.fn(),
    } as unknown as Window;

    const res = await abrirComprobanteFaregas(123, {
      ventanaPrevia: mockVentana,
      facturacion: {
        enlacePdf: 'https://nubefact.com/cpe/original.pdf',
        enlacePdfFaregas: '/uploads/faregas-123.pdf',
      } as any,
    });

    expect(spyFetchBlob).toHaveBeenCalledWith('/certificados/borradores/123/facturacion/pdf');
    expect(mockVentana.location.href).toBe('blob:http://localhost/test-blob');
    expect(mockVentana.location.href).not.toContain('nubefact.com');
    expect(res).toBe(true);
  });

  it('no hace fallback silencioso a NubeFact si la representacion FAREGAS falla', async () => {
    vi.spyOn(httpClient, 'faregasFetchBlob').mockRejectedValue(new Error('PDF_NOT_FOUND'));

    const mockVentana = {
      location: { href: '' },
      closed: false,
      opener: null,
      close: vi.fn(),
    } as unknown as Window;

    (Swal.fire as any).mockResolvedValue({ isConfirmed: false, isDenied: true });

    const res = await abrirComprobanteFaregas(456, {
      ventanaPrevia: mockVentana,
      facturacion: {
        enlacePdf: 'https://nubefact.com/cpe/backup.pdf',
      } as any,
    });

    expect(res).toBe(false);
    expect(mockVentana.close).toHaveBeenCalled();
    expect(mockVentana.location.href).toBe(''); // Never set to Nubefact!
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Representación FAREGAS no disponible',
        confirmButtonText: 'REGENERAR REPRESENTACIÓN',
        cancelButtonText: 'VER PDF NUBEFACT',
      })
    );
  });

  it('permite regenerar la representacion FAREGAS si el usuario lo confirma', async () => {
    const mockBlob = new Blob(['%PDF-1.4 regenerated'], { type: 'application/pdf' });
    vi.spyOn(httpClient, 'faregasFetchBlob')
      .mockRejectedValueOnce(new Error('NOT_READY_YET'))
      .mockResolvedValueOnce(mockBlob);

    const spyRegenerar = vi.spyOn(faregasCertificadosApi, 'regenerarPdfFaregas').mockResolvedValue({ ok: true } as any);

    const mockVentana = {
      location: { href: '' },
      closed: false,
      opener: null,
      close: vi.fn(),
    } as unknown as Window;

    (Swal.fire as any).mockImplementation((opts: any) => {
      if (opts?.title === 'Representación FAREGAS no disponible') {
        return Promise.resolve({ isConfirmed: true });
      }
      return Promise.resolve(undefined);
    });

    const mockVentanaRetry = {
      location: { href: '' },
      closed: false,
      opener: null,
      close: vi.fn(),
    } as unknown as Window;

    (globalThis as any).window = {
      open: vi.fn().mockReturnValue(mockVentanaRetry),
    };

    const onRegenerado = vi.fn();
    const res = await abrirComprobanteFaregas(789, {
      ventanaPrevia: mockVentana,
      facturacion: { enlacePdf: 'https://nubefact.com/cpe/789.pdf' } as any,
      onRegenerado,
    });

    expect(spyRegenerar).toHaveBeenCalledWith(789);
    expect(onRegenerado).toHaveBeenCalled();
    expect(mockVentanaRetry.location.href).toBe('blob:http://localhost/test-blob');
    expect(res).toBe(true);
  });

  it.each([
    ['comprobante FAREGAS', descargarComprobanteFaregas, '/certificados/borradores/91/facturacion/pdf', 'COMPROBANTE-FAREGAS-91.pdf'],
    ['PDF NubeFact', descargarPdfNubefact, '/certificados/borradores/91/facturacion/pdf-nubefact', 'COMPROBANTE-NUBEFACT-91.pdf'],
    ['certificado', descargarCertificadoFaregas, '/certificados/borradores/91/certificado/pdf', 'CERTIFICADO-FAREGAS-91.pdf'],
  ])('descarga automáticamente %s', async (_nombre, descargar, endpoint, filename) => {
    const mockBlob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
    const spyFetchBlob = vi.spyOn(httpClient, 'faregasFetchBlob').mockResolvedValue(mockBlob);
    const click = vi.fn();
    const remove = vi.fn();
    const createElementOriginal = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName.toLowerCase() === 'a') {
        return { href: '', download: '', style: {}, click, remove } as unknown as HTMLAnchorElement;
      }
      return createElementOriginal(tagName);
    }) as typeof document.createElement);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

    const resultado = await descargar(91);

    expect(spyFetchBlob).toHaveBeenCalledWith(endpoint);
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    const enlace = (document.createElement as any).mock.results[0].value as HTMLAnchorElement;
    expect(enlace.download).toBe(filename);
    expect(resultado).toBe(true);
  });
});
