// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  abrirPdfNotaCreditoNubefact,
  abrirPdfNubefact,
  descargarCertificadoFaregas,
  descargarPdfNubefact,
  mostrarCargaComprobanteNubefact,
  asegurarCentradoHtml,
} from './faregas-comprobante-visor.service';
import * as httpClient from './faregas-http-client';
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
    vi.mocked(Swal.fire).mockResolvedValue({
      isConfirmed: false,
      isDenied: false,
      isDismissed: false,
    });
  });

  it('muestra una espera visible en la pestaña mientras se genera el comprobante', () => {
    const documento = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
    };
    const ventana = {
      closed: false,
      document: documento,
    } as unknown as Window;

    mostrarCargaComprobanteNubefact(ventana);

    expect(documento.open).toHaveBeenCalledOnce();
    expect(documento.write).toHaveBeenCalledWith(expect.stringContaining('Generando comprobante'));
    expect(documento.write).toHaveBeenCalledWith(expect.stringContaining('No cierre esta página'));
    expect(documento.write).toHaveBeenCalledWith(expect.stringContaining('class="carrito"'));
    expect(documento.write).toHaveBeenCalledWith(expect.stringContaining('fill="#0b57d0"'));
    expect(documento.write).not.toHaveBeenCalledWith(expect.stringContaining('🚗'));
    expect(documento.close).toHaveBeenCalledOnce();
  });

  it('abre exclusivamente el PDF oficial de NubeFact', async () => {
    const mockBlob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
    const spyFetchBlob = vi.spyOn(httpClient, 'faregasFetchBlob').mockResolvedValue(mockBlob);

    const mockVentana = {
      location: { href: '' },
      closed: false,
      opener: null,
      close: vi.fn(),
    } as unknown as Window;

    const res = await abrirPdfNubefact(123, {
      ventanaPrevia: mockVentana,
    });

    expect(spyFetchBlob).toHaveBeenCalledWith('/certificados/borradores/123/facturacion/pdf-nubefact');
    expect(mockVentana.location.href).toBe('blob:http://localhost/test-blob');
    expect(res).toBe(true);
  });

  it('cierra la ventana e informa si el PDF de NubeFact no está disponible', async () => {
    vi.spyOn(httpClient, 'faregasFetchBlob').mockRejectedValue(new Error('PDF_NUBEFACT_NO_DISPONIBLE'));

    const mockVentana = {
      location: { href: '' },
      closed: false,
      opener: null,
      close: vi.fn(),
    } as unknown as Window;

    const res = await abrirPdfNubefact(456, {
      ventanaPrevia: mockVentana,
    });

    expect(res).toBe(false);
    expect(mockVentana.close).toHaveBeenCalled();
    expect(mockVentana.location.href).toBe('');
    expect(Swal.fire).toHaveBeenCalledWith(
      'No se pudo abrir',
      'PDF_NUBEFACT_NO_DISPONIBLE',
      'error',
    );
  });

  it('abre la nota de crédito persistida sin invocar un endpoint de emisión', async () => {
    const mockBlob = new Blob(['%PDF-1.4 nota'], { type: 'application/pdf' });
    const spyFetchBlob = vi.spyOn(httpClient, 'faregasFetchBlob').mockResolvedValue(mockBlob);
    const mockVentana = {
      location: { href: '' },
      closed: false,
      opener: null,
      close: vi.fn(),
    } as unknown as Window;

    const resultado = await abrirPdfNotaCreditoNubefact(347, 8, { ventanaPrevia: mockVentana });

    expect(spyFetchBlob).toHaveBeenCalledOnce();
    expect(spyFetchBlob).toHaveBeenCalledWith(
      '/certificados/borradores/347/facturacion/notas/credito/8/pdf',
    );
    expect(String(spyFetchBlob.mock.calls[0]?.[0])).not.toContain('/emitir');
    expect(mockVentana.location.href).toBe('blob:http://localhost/test-blob');
    expect(resultado).toBe(true);
  });

  it.each([
    ['PDF NubeFact', descargarPdfNubefact, '/certificados/borradores/91/facturacion/pdf-nubefact', 'COMPROBANTE-NUBEFACT-91.pdf'],
    ['certificado', descargarCertificadoFaregas, '/certificados/borradores/91/certificado/pdf', 'CERTIFICADO-FAREGAS-91.pdf'],
  ])('descarga automáticamente %s', async (_nombre, descargar, endpoint, filename) => {
    const mockBlob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
    const spyFetchBlob = vi.spyOn(httpClient, 'faregasFetchBlob').mockResolvedValue(mockBlob);
    const click = vi.fn();
    const remove = vi.fn();
    const enlacesCreados: HTMLAnchorElement[] = [];
    const createElementOriginal = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName.toLowerCase() === 'a') {
        const enlaceCreado = { href: '', download: '', style: {}, click, remove } as unknown as HTMLAnchorElement;
        enlacesCreados.push(enlaceCreado);
        return enlaceCreado;
      }
      return createElementOriginal(tagName);
    }) as typeof document.createElement);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

    const resultado = await descargar(91);

    expect(spyFetchBlob).toHaveBeenCalledWith(endpoint);
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(enlacesCreados).toHaveLength(1);
    expect(enlacesCreados[0]?.download).toBe(filename);
    expect(resultado).toBe(true);
  });

  describe('asegurarCentradoHtml', () => {
    it('devuelve cadena vacía si el valor es falsy', () => {
      expect(asegurarCentradoHtml(null)).toBe('');
      expect(asegurarCentradoHtml(undefined)).toBe('');
      expect(asegurarCentradoHtml('')).toBe('');
    });

    it('no duplica la regla si el HTML ya cuenta con @media screen y margen horizontal auto', () => {
      const htmlConCentrado = `<!DOCTYPE html><html><head><style>
        @media screen { html { width: 100%; } body { margin-left: auto; margin-right: auto; } }
      </style></head><body><h1>Doc</h1></body></html>`;

      const resultado = asegurarCentradoHtml(htmlConCentrado);
      expect(resultado).toBe(htmlConCentrado);
      expect(resultado.match(/@media\s+screen/g)).toHaveLength(1);
    });

    it('inyecta centrado horizontal en pantalla para documentos sin @media screen (como snapshot histórico)', () => {
      const htmlHistorico = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Certificado DG-39-000428</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    html { width: 210mm; min-height: 297mm; background: #fff; }
    body { margin: 0; width: 210mm; min-height: 297mm; }
  </style>
</head>
<body><h1>Certificado Emitido</h1></body>
</html>`;

      const resultado = asegurarCentradoHtml(htmlHistorico);
      expect(resultado).toContain('@media screen');
      expect(resultado).toContain('margin-left: auto !important');
      expect(resultado).toContain('margin-right: auto !important');
      expect(resultado).toContain('width: 100% !important');
      expect(resultado).toContain('@page { size: A4 portrait; margin: 0; }');
      expect(resultado).toContain('<h1>Certificado Emitido</h1>');
    });
  });
});
