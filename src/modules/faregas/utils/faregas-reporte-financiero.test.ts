import { describe, expect, it } from 'vitest';
import type { ReporteFinancieroResponse } from '../services/faregas-dashboard.api';
import { crearExcelVariasHojasBytes } from './exportar-excel';
import { construirFilasReporteFinanciero, construirHojasReporteFinanciero, limpiarDocumentoCliente } from './faregas-reporte-financiero';

const fixture = (): ReporteFinancieroResponse => ({
  metadatos: { desde: '2026-10-08', hasta: '2026-11-06', fechaGeneracion: '2026-11-06T12:00:00Z', usuarioExportador: 'tester', plantas: ['98'], razonSocialEmisor: '', rucEmisor: '' },
  sedes: [{ planta_key: '98', planta_nombre: 'SURCO' }],
  operaciones: [
    { id: 1, planta_key: '98', planta_nombre: 'SURCO', fecha_creacion: '2026-10-10T15:00:00Z', estado: 'FACTURADO', placa: 'ABC123', importe_total: 80, nombre_cliente_snapshot: 'GRACE', tipo_documento_cliente_snapshot: 'DNI', documento_cliente_snapshot: 'DNI 074045612' },
    { id: 2, planta_key: '98', fecha_creacion: '2026-10-11T15:00:00Z', estado: 'FACTURADO', importe_total: 90 },
    { id: 3, planta_key: '98', fecha_creacion: '2026-10-12T15:00:00Z', estado: 'FACTURADO', importe_total: 100 },
    { id: 4, planta_key: '98', fecha_creacion: '2026-10-13T15:00:00Z', estado: 'FACTURADO', importe_total: 100 },
    { id: 5, planta_key: '98', fecha_creacion: '2026-10-14T15:00:00Z', estado: 'FACTURADO', importe_total: 100 },
    { id: 6, planta_key: '98', fecha_creacion: '2026-10-15T15:00:00Z', estado: 'FACTURADO', importe_total: 50 }
  ],
  lineas: [
    { id: 11, operacion_id: 1, tipo_item: 'SERVICIO', certificado_id: 101, codigo_producto: 'GNV-ANUAL', producto: 'CERTIFICADO GNV ANUAL', cantidad: 1, precio_unitario: 80, importe_total: 80, numero_certificado: 'DG-41-000400', tipo_certificado_clave: 'GNV_ANUAL', certificado_estado: 'EMITIDO', numero_chip: 'CHIP001' },
    { id: 21, operacion_id: 2, tipo_item: 'SERVICIO', certificado_id: 102, producto: 'CERTIFICADO GLP', cantidad: 1, precio_unitario: 90, importe_total: 90, numero_certificado: 'DG-41-000401', certificado_estado: 'ANULADO' },
    { id: 31, operacion_id: 3, tipo_item: 'SERVICIO', certificado_id: 103, producto: 'CERTIFICADO GLP', cantidad: 1, precio_unitario: 100, importe_total: 100, certificado_estado: 'EMITIDO' },
    { id: 41, operacion_id: 4, tipo_item: 'SERVICIO', certificado_id: 104, producto: 'CERTIFICADO GLP', cantidad: 1, precio_unitario: 100, importe_total: 100, certificado_estado: 'EMITIDO' },
    { id: 51, operacion_id: 5, tipo_item: 'SERVICIO', certificado_id: 105, producto: 'SERVICIO A', cantidad: 1, precio_unitario: 60, importe_total: 60, certificado_estado: 'EMITIDO', numero_certificado: 'DG-41-000405', tipo_certificado_clave: 'GLP_INICIAL' },
    { id: 52, operacion_id: 5, tipo_item: 'PRODUCTO', codigo_producto: 'CHIP-PORTA', producto: 'CHIP + PORTACHIP', cantidad: 1, precio_unitario: 40, importe_total: 40, numero_chip: 'CHIP002' },
    { id: 61, operacion_id: 6, tipo_item: 'SERVICIO', certificado_id: 106, producto: 'CERTIFICADO GNV', cantidad: 1, precio_unitario: 50, importe_total: 50, certificado_estado: 'EMITIDO' }
  ],
  ventasDirectas: [],
  comprobantes: [
    { id: 201, operacion_id: 1, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 257, nro_comprobante: 'BBB1-00000257', fecha_documento: '2026-10-10', nombre_razon_social: 'GRACE', tipo_documento_cliente: 'DNI', nro_documento: 'DNI 074045612', estado: 'ACEPTADO', aceptada_sunat: true },
    { id: 203, operacion_id: 3, tipo_comprobante: 'FACTURA', nro_comprobante: 'FFF1-00000010', estado: 'ANULADO', aceptada_sunat: true, baja_aceptada: true },
    { id: 204, operacion_id: 4, tipo_comprobante: 'BOLETA', nro_comprobante: 'BBB1-00000260', estado: 'ACEPTADO', aceptada_sunat: true, nota_anulacion_total_aceptada: true },
    { id: 205, operacion_id: 5, tipo_comprobante: 'FACTURA', nro_comprobante: 'FFF1-00000011', estado: 'ACEPTADO', aceptada_sunat: true, nota_credito_parcial_total: 20 },
    { id: 206, operacion_id: 6, tipo_comprobante: 'BOLETA', nro_comprobante: 'BBB1-00000262', estado: 'PENDIENTE_SUNAT', aceptada_sunat: false }
  ],
  ordenes: [{ id: 301, operacion_id: 1, importe_total: 80 }],
  pagos: [
    { id: 401, orden_pago_id: 301, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 30 },
    { id: 402, orden_pago_id: 301, estado: 'CAN', tipocontado_key: 'TARJETA', tipo_tarjeta: 'YAPE', importe: 50 }
  ],
  descuentos: [{ id: 501, orden_pago_id: 301, estado: 'APLICADO', nombre_descuento: 'Convenio Surco', tipo_descuento: 'CONVENIO', importe_descuento: 10 }],
  ajustes: []
});

describe('Reporte financiero consolidado', () => {
  const filaOperacion1ConPago = (tipo: string, forma?: string, importe = 80) => {
    const data = fixture();
    data.pagos = [{ id: 900, orden_pago_id: 301, estado: 'CAN', tipocontado_key: tipo, tipo_tarjeta: forma, importe }];
    return construirFilasReporteFinanciero(data).find((item) => item.operacion === 'OP-1')!;
  };

  it('limpia prefijos y conserva ceros iniciales', () => {
    expect(limpiarDocumentoCliente('DNI', 'DNI 074045612')).toBe('074045612');
    expect(limpiarDocumentoCliente('RUC', '020521536463')).toBe('020521536463');
  });

  it('consolida pagos, productos y descuentos sin duplicar la venta', () => {
    const rows = construirFilasReporteFinanciero(fixture());
    const row = rows.find((item) => item.operacion === 'OP-1')!;
    expect(rows.filter((item) => item.operacion === 'OP-1')).toHaveLength(1);
    expect(row.tipoPago).toBe('EFECTIVO + TARJETA');
    expect(row.formaPago).toBe('EFECTIVO + YAPE');
    expect(row.tipoComprobante).toBe('Boleta');
    expect(row.comprobante).toBe('BBB1-00000257');
    expect(row.certificado).toBe('DG-41-000400');
    expect(row.chip).toBe('CHIP001');
    expect(row.cortesiaDescuento).toBe('Convenio Surco');
    expect(row.documento).toBe('074045612');
    expect(row.importeBruto).toBe(90);
    expect(row.descuento).toBe(10);
    expect(row.importeNeto).toBe(80);
    expect(row.importePagado).toBe(80);
    expect(row.saldoPendiente).toBe(0);
    expect(row.tipoOperacion).toBe('CERTIFICADO');
    expect(row.tipoCertificado).toBe('GNV_ANUAL');
    expect(row.descripcionEmitido).toContain('1 × CERTIFICADO GNV ANUAL [GNV-ANUAL]');
  });

  it('excluye anulaciones definitivas, conserva pendientes y descuenta una NC parcial', () => {
    const rows = construirFilasReporteFinanciero(fixture());
    expect(rows.some((item) => item.operacion === 'OP-2')).toBe(false);
    expect(rows.some((item) => item.operacion === 'OP-3')).toBe(false);
    expect(rows.some((item) => item.operacion === 'OP-4')).toBe(false);
    expect(rows.find((item) => item.operacion === 'OP-5')).toMatchObject({ importeNeto: 80, importePagado: 0, saldoPendiente: 80 });
    expect(rows.find((item) => item.operacion === 'OP-6')?.estadoComprobante).toBe('Pendiente SUNAT');
    expect(rows.filter((item) => item.operacion === 'OP-5')).toHaveLength(1);
  });

  it('genera exactamente una hoja con autofiltro, fecha Excel y totales coherentes', () => {
    const data = fixture();
    const sheets = construirHojasReporteFinanciero(data);
    expect(sheets).toHaveLength(1);
    expect(sheets[0].name).toBe('Financiero Consolidado');
    expect(sheets[0].rows.at(-2)).toMatchObject({ sede: 'TOTAL VENTAS VIGENTES', importeNeto: 210, importePagado: 80, saldoPendiente: 130 });
    expect(typeof sheets[0].rows[0].fecha).toBe('number');
    const xmlZip = new TextDecoder().decode(crearExcelVariasHojasBytes(sheets));
    expect((xmlZip.match(/<sheet name=/g) || [])).toHaveLength(1);
    expect(xmlZip).toContain('<autoFilter ref="A7:AS');
    expect(xmlZip).toContain('REPORTE FINANCIERO CONSOLIDADO');
  });

  it('muestra una boleta con su código completo', () => {
    const row = construirFilasReporteFinanciero(fixture()).find((item) => item.operacion === 'OP-1')!;
    expect([row.tipoComprobante, row.comprobante]).toEqual(['Boleta', 'BBB1-00000257']);
  });

  it('muestra una factura con su código completo', () => {
    const row = construirFilasReporteFinanciero(fixture()).find((item) => item.operacion === 'OP-5')!;
    expect([row.tipoComprobante, row.comprobante]).toEqual(['Factura', 'FFF1-00000011']);
  });

  it('muestra efectivo cuando es el único medio confirmado', () => {
    const data = fixture(); data.pagos = data.pagos.slice(0, 1);
    expect(construirFilasReporteFinanciero(data).find((item) => item.operacion === 'OP-1')).toMatchObject({ tipoPago: 'EFECTIVO', formaPago: 'EFECTIVO', importePagado: 30 });
  });

  it('combina pagos divididos sin duplicar la operación', () => {
    const rows = construirFilasReporteFinanciero(fixture());
    expect(rows.filter((item) => item.operacion === 'OP-1')).toMatchObject([{ tipoPago: 'EFECTIVO + TARJETA', formaPago: 'EFECTIVO + YAPE', importePagado: 80 }]);
  });

  it('usa el código comercial del certificado', () => {
    expect(construirFilasReporteFinanciero(fixture()).find((item) => item.operacion === 'OP-1')?.certificado).toBe('DG-41-000400');
  });

  it('usa el serial real del chip asociado', () => {
    expect(construirFilasReporteFinanciero(fixture()).find((item) => item.operacion === 'OP-1')?.chip).toBe('CHIP001');
  });

  it('muestra el nombre real de un descuento normal', () => {
    expect(construirFilasReporteFinanciero(fixture()).find((item) => item.operacion === 'OP-1')?.cortesiaDescuento).toBe('Convenio Surco');
  });

  it('muestra CORTESÍA sólo cuando el tipo configurado lo indica', () => {
    const data = fixture(); data.descuentos[0].tipo_descuento = 'CORTESIA'; data.descuentos[0].nombre_descuento = '';
    expect(construirFilasReporteFinanciero(data).find((item) => item.operacion === 'OP-1')?.cortesiaDescuento).toBe('CORTESÍA');
  });

  it('no inventa etiqueta cuando no existe descuento', () => {
    const data = fixture(); data.descuentos = [];
    expect(construirFilasReporteFinanciero(data).find((item) => item.operacion === 'OP-1')?.cortesiaDescuento).toBe('');
  });

  it('excluye un certificado anulado', () => {
    expect(construirFilasReporteFinanciero(fixture()).some((item) => item.operacion === 'OP-2')).toBe(false);
  });

  it('excluye una baja fiscal aceptada', () => {
    expect(construirFilasReporteFinanciero(fixture()).some((item) => item.operacion === 'OP-3')).toBe(false);
  });

  it('excluye una nota de crédito total aceptada', () => {
    expect(construirFilasReporteFinanciero(fixture()).some((item) => item.operacion === 'OP-4')).toBe(false);
  });

  it('conserva una nota parcial sin convertirla en venta ni inventar cobros', () => {
    expect(construirFilasReporteFinanciero(fixture()).find((item) => item.operacion === 'OP-5')).toMatchObject({
      importeNeto: 80, importePagado: 0, saldoPendiente: 80
    });
  });

  it('no excluye por un estado fiscal pendiente', () => {
    expect(construirFilasReporteFinanciero(fixture()).find((item) => item.operacion === 'OP-6')?.estadoComprobante).toBe('Pendiente SUNAT');
  });

  it('consolida múltiples productos en una fila y suma una sola vez', () => {
    const rows = construirFilasReporteFinanciero(fixture()).filter((item) => item.operacion === 'OP-5');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tipoOperacion: 'CERTIFICADO + PRODUCTOS', servicio: 'SERVICIO A, CHIP + PORTACHIP',
      productoAdicional: 'CHIP + PORTACHIP', cantidad: 2, importePagado: 0
    });
    expect(rows[0].descripcionEmitido).toContain('CHIP + PORTACHIP [CHIP-PORTA]');
  });

  it.each(['VISA', 'MASTERCARD', 'YAPE', 'PLIN', 'CUPONIDAD', 'PAGO WEB'])(
    'separa TARJETA de la forma %s', (forma) => {
      expect(filaOperacion1ConPago('TARJETA', forma)).toMatchObject({ tipoPago: 'TARJETA', formaPago: forma, importePagado: 80 });
    }
  );

  it('separa BANCO / BANCO', () => {
    expect(filaOperacion1ConPago('BANCO')).toMatchObject({ tipoPago: 'BANCO', formaPago: 'BANCO', importePagado: 80 });
  });

  it('muestra sólo el importe efectivamente pagado en un pago parcial', () => {
    expect(filaOperacion1ConPago('EFECTIVO', undefined, 60)).toMatchObject({ importePagado: 60, saldoPendiente: 20 });
  });

  it('muestra cero y medios sin identificar cuando no hay pagos confirmados', () => {
    const data = fixture(); data.pagos = [];
    expect(construirFilasReporteFinanciero(data).find((item) => item.operacion === 'OP-1')).toMatchObject({
      tipoPago: 'SIN PAGO', formaPago: 'SIN PAGO', importePagado: 0
    });
  });

  it('usa NO APLICA para una cortesía del 100 % sin importe exigible', () => {
    const data = fixture();
    const operacion = data.operaciones.find((item) => item.id === 6)!;
    const linea = data.lineas.find((item) => item.operacion_id === 6)!;
    operacion.importe_total = 0; linea.precio_unitario = 0; linea.importe_total = 0;
    data.ordenes.push({ id: 302, operacion_id: 6, importe_total: 0 });
    data.descuentos.push({ id: 502, orden_pago_id: 302, estado: 'APLICADO', nombre_descuento: 'DESCUENTO CERTIFICADO TALLER', tipo_descuento: 'CONVENIO', importe_descuento: 350 });
    expect(construirFilasReporteFinanciero(data).find((item) => item.operacion === 'OP-6')).toMatchObject({
      importeBruto: 350, descuento: 350, importeNeto: 0, importePagado: 0, saldoPendiente: 0,
      tipoPago: 'NO APLICA', formaPago: 'NO APLICA', cortesiaDescuento: 'DESCUENTO CERTIFICADO TALLER'
    });
  });

  it('identifica expresamente un duplicado con su certificado original', () => {
    const data = fixture();
    data.operaciones.push({ id: 7, planta_key: '98', fecha_creacion: '2026-10-16T15:00:00Z', estado: 'PAGADO', importe_total: 50 });
    data.lineas.push({ id: 71, operacion_id: 7, tipo_item: 'SERVICIO', duplicado_id: 9, duplicado_tipo_nombre: 'Certificado anual GLP', producto: 'DUPLICADO DE CERTIFICADO', cantidad: 1, precio_unitario: 50, importe_total: 50, numero_certificado: 'DG-41-000400', certificado_estado: 'DISPONIBLE' });
    expect(construirFilasReporteFinanciero(data).find((item) => item.operacion === 'OP-7')).toMatchObject({
      tipoOperacion: 'DUPLICADO DE CERTIFICADO', tipoCertificado: 'Certificado anual GLP', certificado: 'DG-41-000400'
    });
  });

  it('clasifica una venta directa de producto físico sin crear certificados', () => {
    const data = fixture();
    data.ventasDirectas.push({ id: 8, planta_key: '98', planta_nombre: 'SURCO', creado_en: '2026-10-17T15:00:00Z', estado: 'PAGADO', importe_total: 180, cliente_nombre: 'CLIENTE', detalle_id: 81, tipo_item: 'PRODUCTO', codigo_producto: 'CHIP-PORTA', producto: 'CHIP + PORTA CHIP', cantidad: 1, precio_unitario: 180, importe_detalle: 180, numero_chip: 'CHIP13' });
    expect(construirFilasReporteFinanciero(data).find((item) => item.operacion === 'VD-8')).toMatchObject({
      tipoOperacion: 'VENTA DE PRODUCTOS', servicio: 'CHIP + PORTA CHIP', productoAdicional: 'CHIP + PORTA CHIP', chip: 'CHIP13', importeNeto: 180, saldoPendiente: 180
    });
  });

  it('elimina los IDs internos y la columna anterior de medio de pago', () => {
    const headers = construirHojasReporteFinanciero(fixture())[0].columns.map((column) => column.header);
    expect(headers).not.toContain('Número / ID de operación');
    expect(headers).not.toContain('Medio de pago');
    expect(headers).toEqual(expect.arrayContaining([
      'Tipo de operación', 'Descripción de lo emitido', 'Producto adicional', 'Importe bruto original (S/)',
      'Importe neto (S/)', 'Tipo de pago', 'Forma de pago', 'Importe pagado (S/)', 'Saldo pendiente (S/)'
    ]));
  });
});
