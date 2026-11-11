import { describe, expect, it } from 'vitest';
import { crearExcelVariasHojasBytes, type ExcelSheetDefinition } from './exportar-excel';
import { construirHojasDocumentosEmitidosExtendido } from './faregas-documentos-emitidos-extendido';
import { construirResumenMensualFacturacion } from './faregas-resumen-mensual-facturacion';
import { construirHojasRegistroVentasTributario } from './faregas-registro-ventas-tributario';

function unzipStored(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = new Map<string, string>();
  let offset = 0;
  while (offset + 30 < bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameSize = view.getUint16(offset + 26, true);
    const extraSize = view.getUint16(offset + 28, true);
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameSize));
    const start = offset + 30 + nameSize + extraSize;
    entries.set(name, decoder.decode(bytes.subarray(start, start + size)));
    offset = start + size;
  }
  expect(view.getUint32(offset, true)).toBe(0x02014b50);
  expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
  return entries;
}
const cellCount = (xml: string, row: number) => {
  const body = xml.match(new RegExp(`<row r="${row}">(.*?)</row>`))?.[1] || '';
  return (body.match(/<c /g) || []).length;
};
const build = (sheets: ExcelSheetDefinition[]) => unzipStored(crearExcelVariasHojasBytes(sheets));

describe('XLSX de reportes financieros FAREGAS', () => {
  it('genera paquetes XLSX estructuralmente válidos con hojas y encabezados modelo', () => {
    const legacy = build([{ name: 'Consolidado', columns: [{ key: 'id', header: 'ID' }], rows: [{ id: 'F-1' }] }]);
    expect(legacy.get('xl/worksheets/sheet1.xml')).toContain('<row r="1"><c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">ID</t>');
    expect(legacy.get('xl/worksheets/sheet1.xml')).toContain('<row r="2"><c r="A2" t="inlineStr"><is><t xml:space="preserve">F-1</t>');

    const docs = build(construirHojasDocumentosEmitidosExtendido({ cabeceras: [], lineas: [] }, '2026-11-01', '2026-11-30'));
    expect(docs.get('xl/workbook.xml')).toContain('name="Datos"');
    expect(docs.get('xl/workbook.xml')).toContain('name="Líneas de productos"');
    expect(docs.get('xl/workbook.xml')).not.toContain('name="Trazabilidad"');
    expect(cellCount(docs.get('xl/worksheets/sheet1.xml') || '', 7)).toBeGreaterThanOrEqual(56);
    expect(docs.get('xl/worksheets/sheet1.xml')).toContain('TIPO DE DOCUMENTO');

    const summary = build(construirResumenMensualFacturacion({ cabeceras: [] }, '2026-11'));
    expect(summary.get('xl/workbook.xml')).toContain('name="Totales"');
    expect(summary.get('xl/workbook.xml')).toContain('name="Errores"');
    expect(cellCount(summary.get('xl/worksheets/sheet1.xml') || '', 7)).toBe(8);
    expect(cellCount(summary.get('xl/worksheets/sheet2.xml') || '', 1)).toBe(9);

    const ple = build(construirHojasRegistroVentasTributario({ documentos: [] }, '2026-11'));
    expect(ple.get('xl/workbook.xml')).toContain('name="Hoja1"');
    expect(cellCount(ple.get('xl/worksheets/sheet1.xml') || '', 7)).toBe(35);
    expect(cellCount(ple.get('xl/worksheets/sheet1.xml') || '', 8)).toBe(35);
  });
});
