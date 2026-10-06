// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  isHtmlCertificateVersionEditable,
  scopeCertificateDocumentCss,
  serializeCertificateDocument
} from './certificate-designer';

describe('versionado oficial protegido', () => {
  it('permite editar sólo un BORRADOR HTML protegido cuando existe permiso administrativo', () => {
    const borrador = { estado: 'BORRADOR', motor: 'HTML_DINAMICO' };
    expect(isHtmlCertificateVersionEditable(borrador, true, true)).toBe(true);
    expect(isHtmlCertificateVersionEditable(borrador, true, false)).toBe(false);
  });

  it('nunca permite editar destructivamente una versión VIGENTE o RETIRADA', () => {
    expect(isHtmlCertificateVersionEditable({ estado: 'VIGENTE', motor: 'HTML_DINAMICO' }, true, true)).toBe(false);
    expect(isHtmlCertificateVersionEditable({ estado: 'RETIRADA', motor: 'HTML_DINAMICO' }, true, true)).toBe(false);
  });

  it('conserva la edición normal de borradores HTML no protegidos', () => {
    expect(isHtmlCertificateVersionEditable({ estado: 'BORRADOR', motor: 'HTML_DINAMICO' }, false)).toBe(true);
    expect(isHtmlCertificateVersionEditable({ estado: 'BORRADOR', motor: 'DOCX_DINAMICO' }, false)).toBe(false);
  });

  it('elimina el párrafo vacío que ProseMirror agrega fuera del certificado', () => {
    const html = serializeCertificateDocument(
      '<div class="documento-certificado"><p>Contenido</p></div><p></p>',
      { lang: 'es', headHtml: '', documentCss: '', bodyAttributes: {} }
    );

    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.body.children).toHaveLength(1);
    expect(document.body.firstElementChild?.classList.contains('documento-certificado')).toBe(true);
  });
});

describe('estilos documentales dentro del lienzo', () => {
  it('aplica las reglas de body al contenedor aislado del certificado', () => {
    const css = 'body { padding: 20px; font-family: Arial; } body .title { text-align: center; }';
    const scoped = scopeCertificateDocumentCss(css);

    expect(scoped).toContain(':scope { padding: 20px; font-family: Arial; }');
    expect(scoped).toContain(':scope .title { text-align: center; }');
    expect(scoped).not.toMatch(/(^|[},])\s*body(?=\s*(?:[,{.#[:]))/i);
  });
});
