// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import {
  collectCertificateVariables,
  createCustomCertificateVariable,
  createCertificateDesignerExtensions,
  isHtmlCertificateVersionEditable,
  normalizeCertificateDocument,
  parseCertificateDocument,
  sanitizeCertificateHtml,
  sanitizePastedHtml,
  serializeCertificateDocument
} from './certificate-designer';

const editors: Editor[] = [];
const createEditor = (content = '<p></p>') => {
  const editor = new Editor({ extensions: createCertificateDesignerExtensions(), content });
  editors.push(editor);
  return editor;
};

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
});

describe('Diseñador de certificados HTML', () => {
  it('crea una variable personalizada segura y lista para mostrarse entre llaves', () => {
    expect(createCustomCertificateVariable('Nombre del Inspector')).toEqual({
      key: 'personalizado.nombre_del_inspector',
      label: 'Nombre del Inspector',
      grupo: 'Personalizadas',
      tipo: 'text',
      demo: '{{personalizado.nombre_del_inspector}}'
    });
    expect(createCustomCertificateVariable('{{Fecha próxima revisión}}')?.key).toBe('personalizado.fecha_proxima_revision');
    expect(createCustomCertificateVariable('   ')).toBeNull();
  });

  it('permite escribir, borrar y conservar el contenido restante', () => {
    const editor = createEditor('<p>Certificado</p>');
    editor.commands.setTextSelection(12);
    editor.commands.insertContent(' anual');
    expect(editor.getText()).toBe('Certificado anual');
    editor.commands.deleteRange({ from: 12, to: 18 });
    expect(editor.getText()).toBe('Certificado');
  });

  it('deshace y rehace cambios de contenido', () => {
    const editor = createEditor('<p>Base</p>');
    editor.commands.setTextSelection(5);
    editor.commands.insertContent(' editable');
    expect(editor.getText()).toBe('Base editable');
    editor.commands.undo();
    expect(editor.getText()).toBe('Base');
    editor.commands.redo();
    expect(editor.getText()).toBe('Base editable');
  });

  it('aplica formato de texto y alineación', () => {
    const editor = createEditor('<p>Texto</p>');
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.chain().toggleBold().toggleItalic().toggleUnderline().setTextAlign('center').run();
    expect(editor.getHTML()).toContain('<strong><em><u>Texto</u></em></strong>');
    expect(editor.getHTML()).toContain('text-align: center');
  });

  it('marca texto como variable estructurada y conserva el fallback', () => {
    const editor = createEditor('<p>CHARING S.A.C.</p>');
    editor.commands.setTextSelection({ from: 1, to: 15 });
    editor.commands.setMark('faregasVariable', { key: 'taller.nombre', label: 'Nombre del Taller', fallback: 'CHARING S.A.C.', source: 'FORM' });
    expect(editor.getHTML()).toContain('data-faregas-var="taller.nombre"');
    expect(editor.getHTML()).toContain('data-faregas-fallback="CHARING S.A.C."');
    expect(editor.getText()).toBe('CHARING S.A.C.');
  });

  it('cambia solamente la asociación de una variable', () => {
    const editor = createEditor('<p><span data-faregas-var="taller.nombre" data-faregas-label="Nombre" data-faregas-fallback="CHARING S.A.C." data-faregas-source="FORM">CHARING S.A.C.</span></p>');
    editor.commands.setTextSelection(2);
    editor.chain().extendMarkRange('faregasVariable').setMark('faregasVariable', { key: 'empresa.razon_social', label: 'Razón Social Empresa', fallback: 'CHARING S.A.C.', source: 'FORM' }).run();
    expect(editor.getHTML()).toContain('data-faregas-var="empresa.razon_social"');
    expect(editor.getHTML()).not.toContain('data-faregas-var="taller.nombre"');
    expect(editor.getText()).toBe('CHARING S.A.C.');
  });

  it('quita la variable sin borrar su texto ni estilos', () => {
    const editor = createEditor('<p><strong><span data-faregas-var="taller.nombre" data-faregas-fallback="CHARING S.A.C.">CHARING S.A.C.</span></strong></p>');
    editor.commands.setTextSelection(2);
    editor.chain().extendMarkRange('faregasVariable').unsetMark('faregasVariable').run();
    expect(editor.getHTML()).not.toContain('data-faregas-var');
    expect(editor.getHTML()).toContain('<strong>CHARING S.A.C.</strong>');
  });

  it('inserta una variable en una posición vacía', () => {
    const editor = createEditor('<p></p>');
    editor.commands.setTextSelection(1);
    editor.chain().insertContent({ type: 'text', text: 'ABC-123', marks: [{ type: 'faregasVariable', attrs: { key: 'vehiculo.placa', label: 'Placa', fallback: 'ABC-123', source: 'FORM' } }] }).unsetMark('faregasVariable').run();
    expect(editor.getHTML()).toContain('data-faregas-var="vehiculo.placa"');
    expect(editor.getText()).toBe('ABC-123');
  });

  it('serializa y deserializa slots actuales y placeholders legacy', () => {
    const legacy = '<!DOCTYPE html><html><head><style>table{width:100%}</style></head><body><p>{{certificado.numero}}</p><span data-faregas-slot="taller.nombre">CHARING S.A.C.</span><table><tbody><tr><td data-faregas-var="empresa.telefono"></td></tr></tbody></table><img src="/assets/logo.png" alt="Logo"></body></html>';
    const parsed = parseCertificateDocument(legacy);
    expect(parsed.bodyHtml).toContain('data-faregas-var="certificado.numero"');
    expect(parsed.bodyHtml).toContain('data-faregas-var="taller.nombre"');
    const reopened = parseCertificateDocument(serializeCertificateDocument(parsed.bodyHtml, parsed.shell));
    expect(collectCertificateVariables(reopened.bodyHtml).sort()).toEqual(['certificado.numero', 'empresa.telefono', 'taller.nombre']);
    expect(reopened.shell.documentCss).toContain('table{width:100%}');
    expect(reopened.bodyHtml).toContain('src="/assets/logo.png"');
  });

  it('inserta tabla NxM y agrega o elimina filas y columnas', () => {
    const editor = createEditor();
    const tableDocument = () => new DOMParser().parseFromString(editor.getHTML(), 'text/html');
    editor.commands.insertTable({ rows: 2, cols: 3, withHeaderRow: false });
    expect(tableDocument().querySelectorAll('tr')).toHaveLength(2);
    expect(tableDocument().querySelector('tr')?.querySelectorAll('td')).toHaveLength(3);
    editor.commands.addRowAfter();
    expect(tableDocument().querySelectorAll('tr')).toHaveLength(3);
    editor.commands.deleteRow();
    expect(tableDocument().querySelectorAll('tr')).toHaveLength(2);
    editor.commands.addColumnAfter();
    expect(tableDocument().querySelector('tr')?.querySelectorAll('td')).toHaveLength(4);
    editor.commands.deleteColumn();
    expect(tableDocument().querySelector('tr')?.querySelectorAll('td')).toHaveLength(3);
  });

  it('elimina una tabla sin afectar el resto del documento', () => {
    const editor = createEditor('<p>Antes</p>');
    editor.commands.setTextSelection(6);
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });
    expect(editor.getHTML()).toContain('<table');
    editor.commands.deleteTable();
    expect(editor.getHTML()).not.toContain('<table');
    expect(editor.getText()).toContain('Antes');
  });

  it('elimina scripts, eventos y URLs ejecutables al pegar y guardar', () => {
    const unsafe = '<p onclick="alert(1)">Seguro<script>alert(2)</script><a href="javascript:alert(3)">enlace</a></p>';
    const saved = sanitizeCertificateHtml(unsafe);
    const pasted = sanitizePastedHtml(unsafe);
    expect(saved).not.toMatch(/script|onclick|javascript:/i);
    expect(pasted).not.toMatch(/script|onclick|javascript:/i);
    expect(normalizeCertificateDocument(saved)).toContain('Seguro');
  });

  it('solo permite editar borradores HTML no protegidos', () => {
    expect(isHtmlCertificateVersionEditable({ estado: 'BORRADOR', motor: 'HTML_DINAMICO' }, false)).toBe(true);
    expect(isHtmlCertificateVersionEditable({ estado: 'VIGENTE', motor: 'HTML_DINAMICO' }, false)).toBe(false);
    expect(isHtmlCertificateVersionEditable({ estado: 'BORRADOR', motor: 'HTML_DINAMICO' }, true)).toBe(false);
    expect(isHtmlCertificateVersionEditable({ estado: 'BORRADOR', motor: 'DOCX_DINAMICO' }, false)).toBe(false);
  });
});
