import { Extension, Mark, Node, mergeAttributes, type Extensions } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { BackgroundColor, Color, FontFamily, FontSize, LineHeight, TextStyle } from '@tiptap/extension-text-style';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';

export interface CertificateDocumentShell {
  lang: string;
  headHtml: string;
  documentCss: string;
  bodyAttributes: Record<string, string>;
}

export interface FaregasVariableAttributes {
  key: string;
  label: string;
  fallback: string;
  source: string;
  class?: string | null;
  style?: string | null;
}

export interface CustomCertificateVariable {
  key: string;
  label: string;
  grupo: 'Personalizadas';
  tipo: 'text';
  demo: string;
}

const customVariableSlug = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/^\{\{\s*|\s*\}\}$/g, '')
  .replace(/^personalizado\./, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 60);

export const createCustomCertificateVariable = (value: string): CustomCertificateVariable | null => {
  const label = value.replace(/^\{\{\s*|\s*\}\}$/g, '').trim();
  const slug = customVariableSlug(label);
  if (!label || !slug) return null;
  const key = `personalizado.${slug}`;
  return { key, label, grupo: 'Personalizadas', tipo: 'text', demo: `{{${key}}}` };
};

export const isHtmlCertificateVersionEditable = (version: { estado: string; motor: string }, formatoProtegido: boolean) =>
  version.estado === 'BORRADOR' && version.motor === 'HTML_DINAMICO' && !formatoProtegido;

const BLOCKED_ELEMENTS = 'script, iframe, object, embed, applet, form, input, button, textarea, select';
const URL_ATTRIBUTES = new Set(['href', 'src', 'xlink:href', 'formaction']);
const SAFE_URL = /^(?:https?:|data:image\/(?:png|jpeg|jpg|webp);base64,|\/|\.\/|\.\.\/|#)/i;

const cleanCss = (css: string) => css
  .replace(/@import[^;]+;?/gi, '')
  .replace(/expression\s*\([^)]*\)/gi, '')
  .replace(/url\s*\(\s*(['"]?)\s*javascript:[^)]+\)/gi, '');

const cleanElementAttributes = (element: Element) => {
  [...element.attributes].forEach((attribute) => {
    const name = attribute.name.toLowerCase();
    const value = attribute.value.trim();
    if (name.startsWith('on') || name === 'srcdoc' || name === 'contenteditable' || name === 'draggable' || name.startsWith('data-pm-')) {
      element.removeAttribute(attribute.name);
      return;
    }
    if (URL_ATTRIBUTES.has(name) && value && !SAFE_URL.test(value)) {
      element.removeAttribute(attribute.name);
      return;
    }
    if (name === 'style') element.setAttribute(attribute.name, cleanCss(value));
  });
};

export const sanitizeCertificateHtml = (rawHtml = '') => {
  const parser = new DOMParser();
  const document = parser.parseFromString(rawHtml || '<!DOCTYPE html><html><head></head><body></body></html>', 'text/html');
  document.querySelectorAll(BLOCKED_ELEMENTS).forEach((element) => element.remove());
  document.querySelectorAll('meta[http-equiv="refresh"], link[rel="import"]').forEach((element) => element.remove());
  document.querySelectorAll('*').forEach(cleanElementAttributes);
  document.querySelectorAll('style').forEach((style) => { style.textContent = cleanCss(style.textContent || ''); });
  return `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
};

const replaceTextPlaceholders = (document: Document) => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.parentElement?.closest('[data-faregas-var], style, script')) continue;
    if (/\{\{\s*[^{}]+?\s*\}\}/.test(node.data)) textNodes.push(node);
  }

  textNodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    const regex = /\{\{\s*([^{}]+?)\s*\}\}/g;
    let cursor = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(node.data)) !== null) {
      if (match.index > cursor) fragment.append(document.createTextNode(node.data.slice(cursor, match.index)));
      const key = match[1].trim();
      const span = document.createElement('span');
      span.setAttribute('data-faregas-var', key);
      span.setAttribute('data-faregas-label', key);
      span.setAttribute('data-faregas-fallback', '');
      span.setAttribute('data-faregas-source', 'LEGACY');
      span.textContent = match[0];
      fragment.append(span);
      cursor = regex.lastIndex;
    }
    if (cursor < node.data.length) fragment.append(document.createTextNode(node.data.slice(cursor)));
    node.replaceWith(fragment);
  });
};

export const normalizeCertificateDocument = (rawHtml = '') => {
  const parser = new DOMParser();
  const document = parser.parseFromString(sanitizeCertificateHtml(rawHtml), 'text/html');

  document.querySelectorAll<HTMLElement>('[data-faregas-slot]').forEach((element) => {
    const key = element.getAttribute('data-faregas-slot')?.trim();
    if (key && !element.hasAttribute('data-faregas-var')) element.setAttribute('data-faregas-var', key);
    element.removeAttribute('data-faregas-slot');
  });
  replaceTextPlaceholders(document);
  document.querySelectorAll<HTMLElement>('[data-faregas-var]').forEach((originalElement) => {
    let element = originalElement;
    if (element.tagName !== 'SPAN') {
      const span = document.createElement('span');
      ['data-faregas-var', 'data-faregas-label', 'data-faregas-fallback', 'data-faregas-source'].forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (value !== null) span.setAttribute(attribute, value);
        element.removeAttribute(attribute);
      });
      while (element.firstChild) span.append(element.firstChild);
      element.append(span);
      element = span;
    }
    const key = element.getAttribute('data-faregas-var')?.trim() || '';
    const text = (element.textContent || '').trim();
    element.setAttribute('data-faregas-var', key);
    if (!element.hasAttribute('data-faregas-label')) element.setAttribute('data-faregas-label', key);
    if (!element.hasAttribute('data-faregas-source')) element.setAttribute('data-faregas-source', 'LEGACY');
    if (!element.hasAttribute('data-faregas-fallback')) {
      element.setAttribute('data-faregas-fallback', text === `{{${key}}}` ? '' : text);
    }
  });
  return `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
};

export const parseCertificateDocument = (rawHtml = ''): { bodyHtml: string; shell: CertificateDocumentShell } => {
  const parser = new DOMParser();
  const document = parser.parseFromString(normalizeCertificateDocument(rawHtml), 'text/html');
  const bodyAttributes: Record<string, string> = {};
  [...document.body.attributes].forEach((attribute) => { bodyAttributes[attribute.name] = attribute.value; });
  return {
    bodyHtml: document.body.innerHTML || '<p></p>',
    shell: {
      lang: document.documentElement.lang || 'es',
      headHtml: document.head.innerHTML,
      documentCss: [...document.head.querySelectorAll('style')].map((style) => style.textContent || '').join('\n'),
      bodyAttributes
    }
  };
};

export const serializeCertificateDocument = (bodyHtml: string, shell: CertificateDocumentShell) => {
  const parser = new DOMParser();
  const document = parser.parseFromString('<!DOCTYPE html><html><head></head><body></body></html>', 'text/html');
  document.documentElement.lang = shell.lang || 'es';
  document.head.innerHTML = shell.headHtml;
  Object.entries(shell.bodyAttributes).forEach(([name, value]) => document.body.setAttribute(name, value));
  document.body.innerHTML = bodyHtml;

  document.querySelectorAll('[data-faregas-editable-slot], [data-active-slot]').forEach((element) => {
    element.removeAttribute('data-faregas-editable-slot');
    element.removeAttribute('data-active-slot');
  });
  document.querySelectorAll<HTMLElement>('[data-faregas-var]').forEach((element) => {
    const key = element.getAttribute('data-faregas-var')?.trim() || '';
    const text = (element.textContent || '').trim();
    element.setAttribute('data-faregas-var', key);
    if (!element.hasAttribute('data-faregas-label')) element.setAttribute('data-faregas-label', key);
    if (!element.hasAttribute('data-faregas-source')) element.setAttribute('data-faregas-source', 'FORM');
    if (!element.hasAttribute('data-faregas-fallback')) {
      element.setAttribute('data-faregas-fallback', text === `{{${key}}}` ? '' : text);
    }
  });
  return sanitizeCertificateHtml(`<!DOCTYPE html>\n${document.documentElement.outerHTML}`);
};

export const collectCertificateVariables = (html: string) => {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');
  return [...new Set([...document.querySelectorAll('[data-faregas-var]')]
    .map((element) => element.getAttribute('data-faregas-var')?.trim())
    .filter((key): key is string => Boolean(key)))];
};

export const sanitizePastedHtml = (html: string) => parseCertificateDocument(html).bodyHtml;

export const FaregasVariable = Mark.create({
  name: 'faregasVariable',
  inclusive: false,
  addAttributes() {
    return {
      key: { default: '', parseHTML: (element) => element.getAttribute('data-faregas-var') || '' },
      label: { default: '', parseHTML: (element) => element.getAttribute('data-faregas-label') || element.getAttribute('data-faregas-var') || '' },
      fallback: { default: '', parseHTML: (element) => element.getAttribute('data-faregas-fallback') || '' },
      source: { default: 'FORM', parseHTML: (element) => element.getAttribute('data-faregas-source') || 'LEGACY' },
      class: { default: null, parseHTML: (element) => element.getAttribute('class') },
      style: { default: null, parseHTML: (element) => element.getAttribute('style') }
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-faregas-var]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const { key, label, fallback, source, ...documentAttributes } = HTMLAttributes as FaregasVariableAttributes;
    return ['span', mergeAttributes(documentAttributes, {
      'data-faregas-var': key,
      'data-faregas-label': label,
      'data-faregas-fallback': fallback,
      'data-faregas-source': source
    }), 0];
  }
});

const LayoutBlock = Node.create({
  name: 'layoutBlock',
  group: 'block',
  content: 'block*',
  defining: true,
  addAttributes() {
    return {
      tagName: { default: 'div', parseHTML: (element) => element.tagName.toLowerCase() },
      class: { default: null, parseHTML: (element) => element.getAttribute('class') },
      style: { default: null, parseHTML: (element) => element.getAttribute('style') },
      id: { default: null, parseHTML: (element) => element.getAttribute('id') }
    };
  },
  parseHTML() {
    return [{ tag: 'main' }, { tag: 'section' }, { tag: 'article' }, { tag: 'div' }];
  },
  renderHTML({ HTMLAttributes }) {
    const tagName = ['main', 'section', 'article', 'div'].includes(HTMLAttributes.tagName) ? HTMLAttributes.tagName : 'div';
    const attributes = { ...HTMLAttributes };
    delete attributes.tagName;
    return [tagName, attributes, 0];
  }
});

const PersistedAttributes = Extension.create({
  name: 'persistedDocumentAttributes',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList', 'listItem', 'table', 'tableRow', 'tableHeader'],
      attributes: {
        class: { default: null, parseHTML: (element) => element.getAttribute('class') },
        style: { default: null, parseHTML: (element) => element.getAttribute('style') },
        id: { default: null, parseHTML: (element) => element.getAttribute('id') }
      }
    }];
  }
});

const FaregasTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: { default: null, parseHTML: (element) => element.getAttribute('class') },
      style: { default: null, parseHTML: (element) => element.getAttribute('style') },
      verticalAlign: {
        default: null,
        parseHTML: (element) => element.style.verticalAlign || null,
        renderHTML: (attributes) => attributes.verticalAlign ? { style: `vertical-align: ${attributes.verticalAlign}` } : {}
      }
    };
  }
});

export const createCertificateDesignerExtensions = (): Extensions => [
  StarterKit,
  LayoutBlock,
  PersistedAttributes,
  FaregasVariable,
  TextStyle,
  Color,
  BackgroundColor,
  FontSize,
  FontFamily,
  LineHeight,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  FaregasTableCell,
  Image.configure({ allowBase64: true })
];
