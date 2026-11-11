export type ExcelCellValue = string | number | boolean | null | undefined;

export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
  format?: 'text' | 'decimal2' | 'date' | 'currency';
  hidden?: boolean;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
  crc: number;
  offset: number;
}

const encoder = new TextEncoder();

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[index] = crc >>> 0;
  }
  return table;
})();

const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const concat = (...parts: Uint8Array[]) => {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
};

const header = (size: number, values: Array<[number, number, number]>) => {
  const result = new Uint8Array(size);
  const view = new DataView(result.buffer);
  for (const [offset, value, bytes] of values) {
    if (bytes === 2) view.setUint16(offset, value, true);
    else view.setUint32(offset, value, true);
  }
  return result;
};

const zip = (files: Array<{ name: string; content: string }>) => {
  const now = new Date();
  const dosTime = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | ((now.getSeconds() / 2) & 0x1f);
  const dosDate = (((now.getFullYear() - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0x0f) << 5) | (now.getDate() & 0x1f);
  const localParts: Uint8Array[] = [];
  const entries: ZipEntry[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const localHeader = header(30, [
      [0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2],
      [10, dosTime, 2], [12, dosDate, 2], [14, crc, 4], [18, data.length, 4],
      [22, data.length, 4], [26, name.length, 2], [28, 0, 2]
    ]);
    const localFile = concat(localHeader, name, data);
    localParts.push(localFile);
    entries.push({ name: file.name, data, crc, offset });
    offset += localFile.length;
  }

  const centralParts = entries.map((entry) => {
    const name = encoder.encode(entry.name);
    const centralHeader = header(46, [
      [0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2],
      [12, dosTime, 2], [14, dosDate, 2], [16, entry.crc, 4], [20, entry.data.length, 4],
      [24, entry.data.length, 4], [28, name.length, 2], [30, 0, 2], [32, 0, 2],
      [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, entry.offset, 4]
    ]);
    return concat(centralHeader, name);
  });
  const centralDirectory = concat(...centralParts);
  const end = header(22, [
    [0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, entries.length, 2],
    [10, entries.length, 2], [12, centralDirectory.length, 4], [16, offset, 4], [20, 0, 2]
  ]);
  return concat(...localParts, centralDirectory, end);
};

const xmlEscape = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const columnName = (index: number) => {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
};

const cellXml = (value: ExcelCellValue, reference: string, styleIndex = 0) => {
  const style = styleIndex > 0 ? ` s="${styleIndex}"` : '';
  if (value === null || value === undefined) return `<c r="${reference}"${style}/>`;
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${reference}"${style}><v>${value}</v></c>`;
  if (typeof value === 'boolean') return `<c r="${reference}"${style} t="b"><v>${value ? 1 : 0}</v></c>`;
  return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
};

const safeFileName = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9_-]+/g, '_')
  .replace(/^_+|_+$/g, '') || 'exportacion';

const safeSheetName = (value: string) => ['\\', '/', '?', '*', '[', ']', ':']
  .reduce((result, character) => result.replaceAll(character, ' '), value)
  .slice(0, 31) || 'Datos';

export interface ExcelSheetDefinition {
  name: string;
  columns: ExcelColumn[];
  rows: Array<Record<string, ExcelCellValue>>;
  title?: string;
  metadata?: Array<[string, ExcelCellValue]>;
  groupHeaders?: Array<{ header: string; start: number; end: number }>;
  headerRow?: number;
  numberColumnsRow?: boolean;
  note?: string;
  totalsRow?: boolean;
}

function generarWorksheetXml(sheet: ExcelSheetDefinition) {
  const { columns, rows } = sheet;
  const lastColumn = columnName(Math.max(columns.length - 1, 0));
  const groupRow = sheet.groupHeaders?.length ? (sheet.headerRow || 7) - 1 : 0;
  const headerRowIndex = sheet.headerRow || (groupRow ? 7 : sheet.title ? 6 : 1);
  const dataStart = headerRowIndex + (sheet.numberColumnsRow ? 2 : 1);
  const lastRow = Math.max(rows.length + dataStart - 1, headerRowIndex);
  const filterLastRow = Math.max(headerRowIndex, lastRow - (sheet.totalsRow && rows.length ? 1 : 0));
  const columnDefinitions = columns.map((column, index) => {
    const width = Math.min(Math.max(column.width || column.header.length + 2, 10), 60);
    const hiddenAttr = column.hidden ? ' hidden="1"' : '';
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"${hiddenAttr}/>`;
  }).join('');
  const preamble: string[] = [];
  if (sheet.title) preamble.push(`<row r="1">${cellXml(sheet.title, 'A1', 1)}</row>`);
  (sheet.metadata || []).forEach(([label, value], index) => {
    const row = index + 2;
    preamble.push(`<row r="${row}">${cellXml(label, `A${row}`, 1)}${cellXml(value, `B${row}`)}</row>`);
  });
  const headerRow = columns.map((column, index) => cellXml(column.header, `${columnName(index)}${headerRowIndex}`, 1)).join('');
  const sequenceRow = sheet.numberColumnsRow
    ? `<row r="${headerRowIndex + 1}">${columns.map((_, index) => cellXml(index + 1, `${columnName(index)}${headerRowIndex + 1}`, 2)).join('')}</row>` : '';
  const dataRows = rows.map((row, rowIndex) => {
    const cells = columns.map((column, columnIndex) => {
      const isTotal = Boolean(sheet.totalsRow && rowIndex === rows.length - 1);
      const baseStyle = column.format === 'text' ? 2 : column.format === 'decimal2' ? 3 : column.format === 'date' ? 4 : column.format === 'currency' ? 5 : 0;
      const styleIndex = isTotal
        ? (column.format === 'currency' ? 9 : column.format === 'decimal2' ? 7 : column.format === 'date' ? 8 : 6)
        : baseStyle;
      return cellXml(row[column.key], `${columnName(columnIndex)}${rowIndex + dataStart}`, styleIndex);
    }).join('');
    return `<row r="${rowIndex + dataStart}">${cells}</row>`;
  }).join('');
  const merges = [
    ...(sheet.groupHeaders?.filter((group) => group.end > group.start).map((group) => `<mergeCell ref="${columnName(group.start - 1)}${groupRow}:${columnName(group.end - 1)}${groupRow}"/>`) || []),
    ...(sheet.note ? [`<mergeCell ref="A6:${lastColumn}6"/>`] : []),
    ...(sheet.title ? [`<mergeCell ref="A1:${lastColumn}1"/>`] : [])
  ];
  const occupiedRows = new Set([...preamble.map((_, index) => index + 1), groupRow, sheet.note ? 6 : 0, headerRowIndex, ...(sheet.numberColumnsRow ? [headerRowIndex + 1] : [])].filter(Boolean));
  const blankRows = Array.from({ length: headerRowIndex - 1 }, (_, index) => index + 1)
    .filter((row) => !occupiedRows.has(row)).map((row) => `<row r="${row}"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRowIndex}" topLeftCell="A${dataStart}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${columnDefinitions}</cols>
  <sheetData>${preamble.join('')}${blankRows}${sheet.note ? `<row r="6">${cellXml(sheet.note, 'A6')}</row>` : ''}${groupRow ? `<row r="${groupRow}">${sheet.groupHeaders!.map((group) => cellXml(group.header, `${columnName(group.start - 1)}${groupRow}`, 1)).join('')}</row>` : ''}<row r="${headerRowIndex}">${headerRow}</row>${sequenceRow}${dataRows}</sheetData>
  <autoFilter ref="A${headerRowIndex}:${lastColumn}${filterLastRow}"/>${merges.length ? `<mergeCells count="${merges.length}">${merges.join('')}</mergeCells>` : ''}
</worksheet>`;
}

export function crearExcelBytes(
  sheetName: string,
  columns: ExcelColumn[],
  rows: Array<Record<string, ExcelCellValue>>
) {
  const worksheet = generarWorksheetXml({ name: sheetName, columns, rows });
  const sheet = safeSheetName(sheetName);
  const files = [
    { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: '_rels/.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(sheet)}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF052A79"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>` },
    { name: 'xl/worksheets/sheet1.xml', content: worksheet }
  ];
  return zip(files);
}

export function crearExcelVariasHojasBytes(sheets: ExcelSheetDefinition[]) {
  const listaHojas = sheets.length > 0 ? sheets : [{ name: 'Datos', columns: [], rows: [] }];

  const contentTypesOverrides = listaHojas.map((_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join('');

  const workbookSheetsXml = listaHojas.map((s, index) =>
    `<sheet name="${xmlEscape(safeSheetName(s.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
  ).join('');

  const workbookRelsXml = [
    ...listaHojas.map((_, index) =>
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    ),
    `<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
  ].join('');

  const files = [
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${contentTypesOverrides}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheetsXml}</sheets></workbook>`
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRelsXml}</Relationships>`
    },
    {
      name: 'xl/styles.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;S/&quot; #,##0.00"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF052A79"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top style="thin"><color rgb="FF64748B"/></top><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="10"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="4" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/><xf numFmtId="14" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/><xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/></cellXfs></styleSheet>`
    },
    ...listaHojas.map((s, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      content: generarWorksheetXml(s)
    }))
  ];

  return zip(files);
}

export function exportarExcel(
  fileName: string,
  sheetName: string,
  columns: ExcelColumn[],
  rows: Array<Record<string, ExcelCellValue>>
) {
  const bytes = crearExcelBytes(sheetName, columns, rows);
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `${safeFileName(fileName)}_${date}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportarExcelVariasHojas(
  fileName: string,
  sheets: ExcelSheetDefinition[]
) {
  const bytes = crearExcelVariasHojasBytes(sheets);
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `${safeFileName(fileName)}_${date}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
