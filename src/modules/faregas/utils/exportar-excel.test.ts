// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { crearExcelVariasHojasBytes, type ExcelSheetDefinition } from './exportar-excel';

const obtenerXmlHoja = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const fileSize = view.getUint32(offset + 18, true);
    const nameSize = view.getUint16(offset + 26, true);
    const extraSize = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameSize));
    const contentStart = nameStart + nameSize + extraSize;
    if (name === 'xl/worksheets/sheet1.xml') {
      return decoder.decode(bytes.subarray(contentStart, contentStart + fileSize));
    }
    offset = contentStart + fileSize;
  }
  throw new Error('No se encontró sheet1.xml en el XLSX generado.');
};

const hojaConNota: ExcelSheetDefinition = {
  name: 'Usuarios FAREGAS',
  title: 'Usuarios FAREGAS',
  metadata: [
    ['Exportado', '17/11/2026'],
    ['Registros', 1],
    ['Estado', 'ACTIVOS'],
    ['Búsqueda', 'Todos'],
  ],
  note: 'Listado administrativo',
  headerRow: 9,
  columns: [
    { key: 'username', header: 'Username' },
    { key: 'password', header: 'Contraseña temporal' },
  ],
  rows: [{ username: 'usuario', password: '' }],
};

describe('serialización XLSX compatible con Excel', () => {
  it('escribe las filas de sheet1.xml en orden ascendente sin referencias duplicadas', () => {
    const xml = obtenerXmlHoja(crearExcelVariasHojasBytes([hojaConNota]));
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    expect(document.getElementsByTagName('parsererror').length).toBe(0);

    const indices = [...xml.matchAll(/<row r="(\d+)"/g)].map((match) => Number(match[1]));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(new Set(indices).size).toBe(indices.length);
    expect(indices.slice(0, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('elimina caracteres no permitidos por XML 1.0 y conserva texto escapado y emojis', () => {
    const sheet: ExcelSheetDefinition = {
      name: 'Clientes',
      columns: [{ key: 'nombre', header: 'Nombre' }],
      rows: [{ nombre: 'Ana\u0000 & <ok>\u000b 🚗' }],
    };
    const xml = obtenerXmlHoja(crearExcelVariasHojasBytes([sheet]));
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    expect(document.getElementsByTagName('parsererror').length).toBe(0);
    expect(xml).toContain('Ana &amp; &lt;ok&gt; 🚗');
    expect(xml).not.toMatch(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/);
  });
});
