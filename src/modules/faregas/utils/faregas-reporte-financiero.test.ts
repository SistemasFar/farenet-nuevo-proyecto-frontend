import { describe, expect, it, vi } from 'vitest';
import type { ReporteFinancieroResponse } from '../services/faregas-dashboard.api';
import { construirHojasReporteFinanciero, exportarReporteFinanciero } from './faregas-reporte-financiero';
import { exportarDocumentosEmitidosExtendido } from './faregas-documentos-emitidos-extendido';
import { exportarResumenMensualFacturacion } from './faregas-resumen-mensual-facturacion';
import { exportarRegistroVentasTributario } from './faregas-registro-ventas-tributario';

const fixture: ReporteFinancieroResponse = {
  metadatos: { desde: '2026-10-01', hasta: '2026-10-31', fechaGeneracion: '2026-11-01T12:00:00Z', usuarioExportador: 'test', plantas: ['ATE'], razonSocialEmisor: 'Faregas', rucEmisor: '20123456789' },
  operaciones: [
    { id: 1, planta_key: 'ATE', planta_nombre: 'Ate', fecha_creacion: '2026-10-01T12:00:00Z', estado: 'PAGADO', base_imponible: 90, igv: 16.2, importe_total: 106.2, comprobante_operable: true, nombre_cliente_snapshot: 'Cliente 1', tipo_documento_cliente_snapshot: 'DNI', documento_cliente_snapshot: '11111111' },
    { id: 2, planta_key: 'ATE', planta_nombre: 'Ate', fecha_creacion: '2026-10-02T12:00:00Z', estado: 'PENDIENTE_PAGO', base_imponible: 100, igv: 18, importe_total: 118, comprobante_operable: false, nombre_cliente_snapshot: 'Cliente 2', tipo_documento_cliente_snapshot: 'DNI', documento_cliente_snapshot: '22222222' },
    { id: 3, planta_key: 'ATE', planta_nombre: 'Ate', fecha_creacion: '2026-10-03T12:00:00Z', estado: 'PAGADO', base_imponible: 50, igv: 9, importe_total: 59, comprobante_operable: true, nombre_cliente_snapshot: 'Cliente duplicado', tipo_documento_cliente_snapshot: 'DNI', documento_cliente_snapshot: '33333333' }
  ],
  lineas: [
    { id: 101, operacion_id: 1, tipo_item: 'SERVICIO', servicio_id: 1, certificado_id: 1001, categoria: 'GLP', codigo_producto: 'GLP01', producto: 'Certificado GLP', cantidad: 1, precio_unitario: 106.2, base_imponible: 90, igv: 16.2, importe_total: 106.2 },
    { id: 102, operacion_id: 2, tipo_item: 'SERVICIO', servicio_id: 2, certificado_id: 1002, categoria: 'DUPLICADOS', codigo_producto: 'DUP01', producto: 'Duplicado', cantidad: 1, precio_unitario: 118, base_imponible: 100, igv: 18, importe_total: 118 },
    { id: 103, operacion_id: 3, tipo_item: 'PRODUCTO', producto_facturacion_id: 7, categoria: 'Chips', codigo_producto: 'CHIP01', producto: 'Chip FAREGAS', cantidad: 1, precio_unitario: 59, base_imponible: 50, igv: 9, importe_total: 59 }
  ],
  ventasDirectas: [{ id: 5, planta_key: 'ATE', planta_nombre: 'Ate', fecha_creacion: '2026-10-04T12:00:00Z', estado: 'COMPLETADO', base_imponible: 100, igv: 18, importe_total: 118, cliente_nombre: 'Cliente chip', cliente_tipo_documento: 'DNI', cliente_nro_documento: '44444444', detalle_id: 501, cantidad: 1, precio_unitario: 118, importe_detalle: 118, codigo_producto: 'PORTA01', producto: 'Porta chips', categoria: 'Accesorios' }],
  comprobantes: [
    { id: 201, operacion_id: 1, tipo_comprobante: 'BOLETA', serie: 'B001', numero: 1, fecha_documento: '2026-10-01', nombre_razon_social: 'Cliente 1', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 106.2, en_periodo_emision: true, ruc_emisor: '20123456789', razon_social_emisor: 'Faregas' },
    { id: 205, operacion_id: 3, tipo_comprobante: 'FACTURA', serie: 'F001', numero: 5, fecha_documento: '2026-10-03', nombre_razon_social: 'Cliente duplicado', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 59, en_periodo_emision: true, ruc_emisor: '20123456789', razon_social_emisor: 'Faregas' },
    { id: 206, venta_id: 5, tipo_comprobante: 'BOLETA', serie: 'B002', numero: 7, fecha_documento: '2026-10-04', nombre_razon_social: 'Cliente chip', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 118, en_periodo_emision: true, ruc_emisor: '20123456789', razon_social_emisor: 'Faregas' }
  ],
  ordenes: [
    { id: 301, operacion_id: 1, importe_total: 106.2, en_periodo_orden: true }, { id: 302, operacion_id: 2, importe_total: 118, en_periodo_orden: true },
    { id: 303, operacion_id: 3, importe_total: 59, en_periodo_orden: true }, { id: 305, venta_id: 5, importe_total: 118, en_periodo_orden: true }
  ],
  pagos: [
    { id: 401, orden_pago_id: 301, operacion_id: 1, importe: 50, estado: 'CAN', tipocontado_key: 'efectivo', fechacreacion: '2026-10-01T13:00:00Z', en_periodo: true },
    { id: 402, orden_pago_id: 301, operacion_id: 1, importe: 56.2, estado: 'CAN', tipocontado_key: 'tarjeta', fechacreacion: '2026-10-01T13:05:00Z', en_periodo: true },
    { id: 403, orden_pago_id: 302, operacion_id: 2, importe: 25, estado: 'CAN', tipocontado_key: 'efectivo', fechacreacion: '2026-10-02T13:00:00Z', en_periodo: true },
    { id: 407, orden_pago_id: 302, importe: 12, estado: 'CAN', tipocontado_key: 'banco', fechacreacion: '2026-11-02T13:00:00Z', en_periodo: false },
    { id: 405, orden_pago_id: 305, importe: 118, estado: 'CAN', tipocontado_key: 'banco', fechacreacion: '2026-10-04T13:00:00Z', en_periodo: true }
  ],
  descuentos: [{ id: 601, orden_pago_id: 301, certificado_id: 1001, importe_original: 118, importe_descuento: 11.8, importe_final: 106.2, estado: 'APLICADO', codigo: 'CAMP10', tipo_descuento: 'PROMOCION', tipo_calculo: 'PORCENTAJE', valor_descuento: 10 }],
  ajustes: [{ id: 701, tipo: 'NOTA DE CRÉDITO', facturacion_id: 201, operacion_id: 1, serie: 'BC01', numero: 1, estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 10, ruc_emisor: '20123456789', razon_social_emisor: 'Faregas' }]
};

async function verificarDescargaXlsx(descargar: () => void, hojasEsperadas: string[], prefijoArchivo: string) {
  const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
  let capturedBlob: Blob | undefined;
  vi.stubGlobal('document', { createElement: () => anchor, body: { appendChild: vi.fn() } });
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn((blob: Blob) => { capturedBlob = blob; return 'blob:reporte-financiero'; }),
    revokeObjectURL: vi.fn()
  });
  vi.stubGlobal('window', { setTimeout: vi.fn() });
  try {
    descargar();
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.download).toMatch(new RegExp(`^${prefijoArchivo}.*\\.xlsx$`));
    expect(capturedBlob?.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const bytes = new Uint8Array(await capturedBlob!.arrayBuffer());
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const decoder = new TextDecoder();
    const zipEntries = new Map<string, string>();
    for (let offset = 0; offset + 30 < bytes.length && new DataView(bytes.buffer).getUint32(offset, true) === 0x04034b50;) {
      const view = new DataView(bytes.buffer);
      const size = view.getUint32(offset + 18, true);
      const nameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      const nameStart = offset + 30;
      const contentStart = nameStart + nameLength + extraLength;
      const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));
      zipEntries.set(name, decoder.decode(bytes.slice(contentStart, contentStart + size)));
      offset = contentStart + size;
    }
    const workbook = zipEntries.get('xl/workbook.xml') || '';
    for (const sheet of hojasEsperadas) expect(workbook).toContain(`name="${sheet}"`);
    return { workbook, zipEntries };
  } finally {
    vi.unstubAllGlobals();
  }
}

function readInlineOrNumericCell(sheetXml: string, rowNumber: number, column: string) {
  const row = sheetXml.match(new RegExp(`<row r="${rowNumber}">([\\s\\S]*?)</row>`))?.[1] || '';
  const cell = row.match(new RegExp(`<c r="${column}${rowNumber}"[^>]*>([\\s\\S]*?)</c>`))?.[1] || '';
  const inline = cell.match(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/)?.[1];
  if (inline !== undefined) return inline.replaceAll('&apos;', "'").replaceAll('&quot;', '"').replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&');
  return cell.match(/<v>([\s\S]*?)<\/v>/)?.[1];
}

describe('Reporte financiero consolidado', () => {
  it('crea y dispara la descarga de un XLSX válido con las cuatro hojas previstas', async () => {
    const { zipEntries } = await verificarDescargaXlsx(
      () => exportarReporteFinanciero(fixture),
      ['Resumen Financiero', 'Ventas y Comprobantes', 'Detalle de Pagos', 'Conciliación y Alertas'],
      'faregas_reporte_financiero_2026-10-01_2026-10-31_'
    );
    expect(zipEntries.get('xl/worksheets/sheet3.xml')).toContain('ID de pago');
    const summaryXml = zipEntries.get('xl/worksheets/sheet1.xml') || '';
    const summaryRows = construirHojasReporteFinanciero(fixture)[0].rows;
    const collectedIndex = summaryRows.findIndex((row) => row.indicador === 'Total cobrado (pagos CAN por fecha de pago)');
    expect(readInlineOrNumericCell(summaryXml, collectedIndex + 2, 'A')).toBe('Total cobrado (pagos CAN por fecha de pago)');
    expect(readInlineOrNumericCell(summaryXml, collectedIndex + 2, 'B')).toBe('249.2');
  });

  it('descarga documentos extendidos, resumen mensual y registro tributario como XLSX con sus hojas', async () => {
    await verificarDescargaXlsx(
      () => exportarReporteFinanciero({
        metadatos: { desde: '2026-01-01', hasta: '2026-01-31', fechaGeneracion: '2026-11-05T12:00:00Z', usuarioExportador: 'test', plantas: ['98'], razonSocialEmisor: '', rucEmisor: '' },
        operaciones: [], lineas: [], ventasDirectas: [], comprobantes: [], ordenes: [], pagos: [], descuentos: [], ajustes: []
      }),
      ['Resumen Financiero', 'Ventas y Comprobantes', 'Detalle de Pagos', 'Conciliación y Alertas'],
      'faregas_reporte_financiero_2026-01-01_2026-01-31_'
    );
    await verificarDescargaXlsx(
      () => exportarDocumentosEmitidosExtendido({ cabeceras: [], lineas: [] }, '2026-11-01', '2026-11-30'),
      ['Documentos emitidos', 'Líneas de productos'],
      'faregas_documentos_emitidos_extendido_2026-11-01_2026-11-30_'
    );
    await verificarDescargaXlsx(
      () => exportarResumenMensualFacturacion({ cabeceras: [], metadatos: { empresasEmisoras: [], rucEmisores: [] } }, '2026-11'),
      ['Resumen mensual', 'Documentos'],
      'faregas_resumen_mensual_facturacion_2026-11_'
    );
    await verificarDescargaXlsx(
      () => exportarRegistroVentasTributario({ documentos: [] }, '2026-11'),
      ['Registro de ventas', 'Campos y limitaciones'],
      'faregas_revision_ventas_tributario_2026-11_'
    );
  });

  it('conserva el pago dividido en su detalle y suma una sola vez por operación', () => {
    const sheets = construirHojasReporteFinanciero(fixture);
    const summary = sheets[0].rows;
    expect(summary.find((row) => row.indicador === 'Total cobrado (pagos CAN por fecha de pago)')?.valor).toBe(249.2);
    expect(summary.find((row) => row.indicador === 'Venta bruta confirmada (sin borradores)')?.valor).toBe(413);
    expect(summary.find((row) => row.indicador === 'Venta comercial neta (antes de notas fiscales)')?.valor).toBe(401.2);
    expect(summary.find((row) => row.indicador === 'Total aceptado SUNAT neto de NC/ND aceptadas')?.valor).toBe(273.2);
    expect(summary.find((row) => row.indicador === 'Base imponible')?.valor).toBe(340);
    expect(summary.find((row) => row.indicador === 'IGV')?.valor).toBe(61.2);
    expect(summary.find((row) => row.indicador === 'Saldo pendiente según saldo almacenado en orden')?.valor).toBe(140);
    expect(summary.find((row) => row.indicador === 'Operaciones con comprobante operable (métrica Dashboard; puede incluir DEMO)')?.valor).toBe(165.2);
    expect(summary.find((row) => row.indicador === 'Operaciones con comprobante operable netas de NC/ND aceptadas (métrica Dashboard)')?.valor).toBe(155.2);
    expect(summary.find((row) => row.indicador === 'Base imponible de operaciones emitidas (Dashboard comparable)')?.valor).toBe(140);
    expect(summary.find((row) => row.indicador === 'IGV de operaciones emitidas (Dashboard comparable)')?.valor).toBe(25.2);
    expect(summary.find((row) => row.indicador === 'Descuentos aplicados en operaciones emitidas (Dashboard comparable)')?.valor).toBe(11.8);
    expect(summary.find((row) => row.indicador === 'Cobranza de operaciones / certificados (comparable con Dashboard)')?.valor).toBe(131.2);
    expect(summary.find((row) => row.indicador === 'Saldo de operaciones / certificados (comparable con Dashboard)')?.valor).toBe(140);
    expect(sheets[2].rows).toHaveLength(4);
    const saleRows = sheets[1].rows;
    const firstOperation = saleRows.filter((row) => row.idOperacion === 'OP-1');
    expect(firstOperation).toHaveLength(1);
    expect(firstOperation[0].cobrado).toBe(106.2);
    expect(saleRows.find((row) => row.idOperacion === 'OP-2')?.cobrado).toBe(25);
    expect(saleRows.find((row) => row.idOperacion === 'OP-2')?.medioPago).toBe('efectivo');
  });

  it('incluye descuentos, duplicados y productos con nombres y categorías del catálogo', () => {
    const sheets = construirHojasReporteFinanciero(fixture);
    const rows = sheets[1].rows;
    expect(rows.find((row) => row.idOperacion === 'OP-1')).toMatchObject({ descuento: 11.8, descuentoPct: '10', codigoDescuento: 'CAMP10', importeDespues: 106.2 });
    expect(rows.find((row) => row.producto === 'Duplicado')?.tipoProducto).toBe('DUPLICADOS');
    expect(rows.find((row) => row.producto === 'Porta chips')?.tipoProducto).toBe('Accesorios');
  });

  it('mantiene estado técnico separado del estado fiscal y no toma un envío DEMO como aceptación SUNAT', () => {
    const pendingDemo = { ...fixture.comprobantes[0], estado: 'PENDIENTE_SUNAT', aceptada_sunat: false, entorno_facturador: 'DEMO', proveedor: 'NUBEFACT', nro_comprobante: 'B001-1', enlace_pdf: 'pdf' };
    const sheets = construirHojasReporteFinanciero({ ...fixture, comprobantes: [pendingDemo], ajustes: [] });
    expect(sheets[1].rows[0]).toMatchObject({ estadoTecnico: 'PENDIENTE_SUNAT', estadoFiscal: 'GENERADO EN DEMO; SIN ACEPTACIÓN SUNAT' });
    expect(sheets[0].rows.find((row) => row.indicador === 'Total aceptado SUNAT neto de NC/ND aceptadas')?.valor).toBe(0);
    expect(sheets[0].rows.find((row) => row.indicador === 'Importe comprobantes DEMO (no se suman a aceptación SUNAT)')?.valor).toBe(106.2);
  });

  it('no trata estado ACEPTADO con ambiente DEMO como aceptación de producción', () => {
    const acceptedDemo = { ...fixture.comprobantes[0], estado: 'ACEPTADO', aceptada_sunat: true, entorno_facturador: 'DEMO' };
    const sheets = construirHojasReporteFinanciero({ ...fixture, comprobantes: [acceptedDemo], ajustes: [] });
    expect(sheets[1].rows[0].estadoFiscal).toBe('ESTADO ACEPTADO EN DEMO; NO ACREDITA ACEPTACIÓN SUNAT');
    expect(sheets[0].rows.find((row) => row.indicador === 'Total aceptado SUNAT neto de NC/ND aceptadas')?.valor).toBe(0);
    expect(sheets[0].rows.find((row) => row.indicador === 'Comprobantes Con estado ACEPTADO en DEMO (sin aceptación de producción)')?.valor).toBe(1);
  });

  it('separa estado local ACEPTADO cuando falta la confirmación SUNAT', () => {
    const unconfirmed = { ...fixture.comprobantes[0], estado: 'ACEPTADO', aceptada_sunat: false, entorno_facturador: 'PRODUCCION' };
    const sheets = construirHojasReporteFinanciero({ ...fixture, comprobantes: [unconfirmed], ajustes: [] });
    expect(sheets[1].rows[0].estadoFiscal).toBe('ESTADO LOCAL ACEPTADO; SIN CONFIRMACIÓN SUNAT');
    expect(sheets[0].rows.find((row) => row.indicador === 'Total aceptado SUNAT neto de NC/ND aceptadas')?.valor).toBe(0);
    expect(sheets[0].rows.find((row) => row.indicador === 'Comprobantes Con estado local ACEPTADO sin confirmación SUNAT')?.valor).toBe(1);
  });

  it('no considera anulada una factura por una solicitud de anulación pendiente', () => {
    const pendingCancellation = { id: 702, tipo: 'ANULACIÓN', facturacion_id: 201, estado: 'PENDIENTE', aceptada_sunat: false, importe_total: 0 };
    const sheets = construirHojasReporteFinanciero({ ...fixture, ajustes: [pendingCancellation] });
    expect(sheets[1].rows[0].estadoFiscal).toBe('ACEPTADO SUNAT');
    expect(sheets[0].rows.find((row) => row.indicador === 'Comprobantes Anulados con confirmación SUNAT')?.valor).toBe(0);
    expect(sheets[3].rows.some((row) => row.tipo === 'ANULACIÓN' && row.detalle === 'PENDIENTE')).toBe(true);
  });

  it('no suma saldo pendiente ni genera alerta de pago parcial para órdenes de importe cero', () => {
    const freeOrder = { id: 306, operacion_id: 3, importe_total: 0, saldo_pendiente: 80, en_periodo_orden: true };
    const sheets = construirHojasReporteFinanciero({ ...fixture, ordenes: [...fixture.ordenes, freeOrder] });
    expect(sheets[0].rows.find((row) => row.indicador === 'Saldo pendiente según saldo almacenado en orden')?.valor).toBe(140);
    expect(sheets[3].rows.some((row) => row.tipo === 'Pago parcial' && row.registro === 'Orden 306')).toBe(false);
  });

  it('cuenta el total facturado por fecha de emisión aunque conserve documentos ligados a ventas del período', () => {
    const outsideEmissionMonth = { ...fixture.comprobantes[0], en_periodo_emision: false };
    const sheets = construirHojasReporteFinanciero({ ...fixture, comprobantes: [outsideEmissionMonth], ajustes: [] });
    expect(sheets[1].rows[0].tipoComprobante).toBe('BOLETA');
    expect(sheets[0].rows.find((row) => row.indicador === 'Total aceptado SUNAT neto de NC/ND aceptadas')?.valor).toBe(0);
    expect(sheets[0].rows.find((row) => row.indicador === 'Criterio del período')?.valor).toContain('fecha de emisión');
  });

  it('detecta operación sin comprobante, pago parcial y nota de crédito', () => {
    const sheets = construirHojasReporteFinanciero(fixture);
    const alerts = sheets[3].rows;
    expect(alerts.some((row) => row.tipo === 'Comprobante sin emisión' && row.registro === 'Orden 302')).toBe(true);
    expect(alerts.some((row) => row.tipo === 'Pago parcial' && row.registro === 'Orden 302')).toBe(true);
    expect(alerts.some((row) => row.tipo === 'NOTA DE CRÉDITO')).toBe(true);
  });

  it('incluye comprobante relacionado a venta directa de chips sin mezclar operaciones', () => {
    const sheets = construirHojasReporteFinanciero(fixture);
    const direct = sheets[1].rows.find((row) => row.idOperacion === 'VD-5');
    expect(direct).toMatchObject({ tipoComprobante: 'BOLETA', serieNumero: 'B002-7', cobrado: 118, saldo: 0 });
  });

  it('excluye borradores de ventas confirmadas y los informa por separado', () => {
    const data = { ...fixture, operaciones: fixture.operaciones.map((sale) => sale.id === 2 ? { ...sale, estado: 'BORRADOR' } : sale) };
    const sheets = construirHojasReporteFinanciero(data);
    const summary = sheets[0].rows;
    expect(summary.find((row) => row.indicador === 'Venta comercial neta (antes de notas fiscales)')?.valor).toBe(283.2);
    expect(summary.find((row) => row.indicador === 'Operaciones BORRADOR excluidas de ventas confirmadas')?.valor).toBe(1);
    expect(summary.find((row) => row.indicador === 'Importe comercial de operaciones BORRADOR (referencial)')?.valor).toBe(118);
    expect(sheets[1].rows.find((row) => row.idOperacion === 'OP-2')?.estadoComercial).toBe('BORRADOR');
  });

  it('usa cliente y documento del comprobante vinculado si el snapshot de la operación está vacío', () => {
    const data = {
      ...fixture,
      operaciones: fixture.operaciones.map((sale) => sale.id === 2 ? { ...sale, nombre_cliente_snapshot: '', tipo_documento_cliente_snapshot: '', documento_cliente_snapshot: '' } : sale),
      comprobantes: [...fixture.comprobantes, { id: 207, operacion_id: 2, tipo_comprobante: 'BOLETA', fecha_documento: '2026-10-02', nombre_razon_social: 'Cliente Fiscal', tipo_documento_cliente: 'DNI', nro_documento: '99999999', estado: 'PENDIENTE_SUNAT', importe_total: 118, en_periodo_emision: true }]
    };
    const row = construirHojasReporteFinanciero(data)[1].rows.find((sale) => sale.idOperacion === 'OP-2');
    expect(row).toMatchObject({ cliente: 'Cliente Fiscal', documento: 'DNI 99999999' });
  });

  it('identifica duplicados desde SKU snapshot y reporta descuento sin origen verificable', () => {
    const data = {
      ...fixture,
      lineas: [{ ...fixture.lineas[0], categoria: '', codigo_producto: 'DUPLICADO_CERTIFICADO', producto: 'Duplicado - certificado', importe_total: 106.2 }],
      descuentos: [{ ...fixture.descuentos[0], id: 999, certificado_id: null, tipo_descuento: null, nombre_descuento: null, codigo: null, descuento_id: null, descuento_cliente_id: null }]
    };
    const sheets = construirHojasReporteFinanciero(data);
    expect(sheets[1].rows.find((sale) => String(sale.producto || '').includes('Duplicado'))?.tipoProducto).toBe('Duplicados');
    expect(sheets[3].rows.some((row) => row.tipo === 'Descuento: origen no identificado' && row.registro === 'Descuento 999')).toBe(true);
  });

  it('desglosa las sedes autorizadas y obtiene la empresa emisora desde los documentos', () => {
    const data = {
      ...fixture,
      sedes: [{ planta_key: 'ATE', planta_nombre: 'Ate' }, { planta_key: 'SURCO', planta_nombre: 'Surco' }],
      comprobantes: fixture.comprobantes.map((doc) => ({ ...doc, planta_key: 'ATE' })),
      pagos: fixture.pagos.map((payment) => ({ ...payment, planta_key: 'ATE' }))
    };
    const rows = construirHojasReporteFinanciero(data)[0].rows;
    expect(rows.find((row) => row.indicador === 'Sede Ate — ventas comerciales no borrador')?.valor).toBe(4);
    expect(rows.find((row) => row.indicador === 'Sede Ate — importe comercial')?.valor).toBe(401.2);
    expect(rows.find((row) => row.indicador === 'Sede Ate — comprobantes por fecha de emisión')?.valor).toBe(3);
    expect(rows.find((row) => row.indicador === 'Sede Ate — cobros CAN en período')?.valor).toBe(249.2);
    expect(rows.find((row) => row.indicador === 'Sede Surco — ventas comerciales no borrador')?.valor).toBe(0);
    expect(rows.find((row) => row.indicador === 'Emisor 20123456789 — Faregas — total fiscal neto')?.valor).toBe(273.2);
  });

  it('no asigna fecha de creación como fecha de emisión fiscal', () => {
    const docWithoutIssueDate = { ...fixture.comprobantes[0], id: 208, fecha_documento: null, en_periodo_emision: false };
    const sheets = construirHojasReporteFinanciero({ ...fixture, comprobantes: [...fixture.comprobantes, docWithoutIssueDate] });
    expect(sheets[0].rows.find((row) => row.indicador === 'Comprobantes con fecha de emisión en período')?.valor).toBe(3);
    expect(sheets[0].rows.find((row) => row.indicador === 'Comprobantes vinculados sin fecha de emisión')?.valor).toBe(1);
    expect(sheets[1].rows.find((row) => row.idOperacion === 'OP-1')?.fechaEmision).toContain('SIN FECHA DE EMISIÓN');
    expect(sheets[3].rows.some((row) => row.tipo === 'Comprobante sin fecha de emisión' && String(row.registro).includes('B001-1'))).toBe(true);
  });

  it('conserva importe posterior cero en una línea con descuento del 100 por ciento', () => {
    const line = { ...fixture.lineas[0], precio_unitario: 0, base_imponible: 0, igv: 0, importe_total: 0 };
    const discount = { ...fixture.descuentos[0], importe_original: 106.2, importe_descuento: 106.2, importe_final: 0, tipo_calculo: 'PORCENTAJE', valor_descuento: 100 };
    const row = construirHojasReporteFinanciero({ ...fixture, lineas: [line], descuentos: [discount] })[1].rows.find((sale) => sale.idOperacion === 'OP-1');
    expect(row).toMatchObject({ importeAntes: 106.2, descuento: 106.2, descuentoPct: '100', importeDespues: 0, total: 0 });
  });
});
