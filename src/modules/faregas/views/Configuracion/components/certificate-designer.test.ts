// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  applyCertificatePageMargins,
  canCreateEditableHtmlDraft,
  getCertificatePageMargins,
  isHtmlCertificateVersionEditable,
  parseCertificateDocument,
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

  it('ofrece crear un borrador editable desde una versión vigente no protegida', () => {
    expect(canCreateEditableHtmlDraft({ estado: 'VIGENTE', motor: 'HTML_DINAMICO' }, false)).toBe(true);
    expect(canCreateEditableHtmlDraft({ estado: 'BORRADOR', motor: 'HTML_DINAMICO' }, false)).toBe(false);
    expect(canCreateEditableHtmlDraft({ estado: 'VIGENTE', motor: 'HTML_DINAMICO' }, true)).toBe(false);
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

  it('detecta los márgenes existentes de la plantilla para no cambiarla al abrir', () => {
    const margins = getCertificatePageMargins(undefined, '.documento-certificado { padding: 17mm 18mm 15mm; }');
    expect(margins).toEqual({ top: 17, right: 18, bottom: 15, left: 18 });
  });

  it('guarda los cuatro márgenes como una regla final que también usa el render', () => {
    const original = parseCertificateDocument('<!DOCTYPE html><html><head><style>.documento-certificado { padding: 10mm; }</style></head><body><main class="documento-certificado">Contenido</main></body></html>');
    const updated = applyCertificatePageMargins(original.shell, { top: 12, right: 22, bottom: 14, left: 24 });
    const html = serializeCertificateDocument(original.bodyHtml, updated);
    const document = new DOMParser().parseFromString(html, 'text/html');
    const style = document.querySelector('#faregas-page-margins');

    expect(style?.textContent).toContain('padding: 12mm 22mm 14mm 24mm !important');
    expect(document.querySelectorAll('#faregas-page-margins')).toHaveLength(1);
  });

  it('actualiza la misma regla de márgenes sin duplicarla', () => {
    const shell = {
      lang: 'es',
      headHtml: '<style id="faregas-page-margins">.documento-certificado { padding: 10mm; }</style>',
      documentCss: '.documento-certificado { padding: 10mm; }',
      bodyAttributes: {}
    };
    const once = applyCertificatePageMargins(shell, { top: 20, right: 20, bottom: 20, left: 20 });
    const twice = applyCertificatePageMargins(once, { top: 25, right: 25, bottom: 25, left: 25 });
    const document = new DOMParser().parseFromString(`<!DOCTYPE html><html><head>${twice.headHtml}</head><body></body></html>`, 'text/html');

    expect(document.querySelectorAll('#faregas-page-margins')).toHaveLength(1);
    expect(document.querySelector('#faregas-page-margins')?.textContent).toContain('padding: 25mm 25mm 25mm 25mm !important');
  });
});
