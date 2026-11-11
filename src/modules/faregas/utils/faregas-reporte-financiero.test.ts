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
    expect(row.importePagado).toBe('S/ 30.00 + S/ 50.00');
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
    expect(rows.find((item) => item.operacion === 'OP-5')).toMatchObject({ importeNeto: 80, importePagado: 'S/ 0.00', saldoPendiente: 80 });
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
    expect(xmlZip).toContain('<autoFilter ref="A7:AU');
    expect(xmlZip).toContain('REPORTE FINANCIERO CONSOLIDADO');
    expect(sheets[0].columns.map((c) => c.key)).toContain('horaEmisionComprobanteC');
    expect(sheets[0].columns.map((c) => c.header)).toContain('Hora de emisión del comprobante');
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
    expect(rows.filter((item) => item.operacion === 'OP-1')).toMatchObject([{ tipoPago: 'EFECTIVO + TARJETA', formaPago: 'EFECTIVO + YAPE', importePagado: 'S/ 30.00 + S/ 50.00' }]);
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
      importeNeto: 80, importePagado: 'S/ 0.00', saldoPendiente: 80
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
      productoAdicional: 'CHIP + PORTACHIP', cantidad: 2, importePagado: 'S/ 0.00'
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
      tipoPago: 'SIN PAGO', formaPago: 'SIN PAGO', importePagado: 'S/ 0.00'
    });
  });

  it('usa CORTESÍA cuando existe la modalidad persistida y no hay importe exigible', () => {
    const data = fixture();
    const operacion = data.operaciones.find((item) => item.id === 6)!;
    const linea = data.lineas.find((item) => item.operacion_id === 6)!;
    operacion.importe_total = 0; linea.precio_unitario = 0; linea.importe_total = 0;
    data.ordenes.push({ id: 302, operacion_id: 6, importe_total: 0 });
    data.descuentos.push({ id: 502, orden_pago_id: 302, estado: 'APLICADO', codigo: 'CORTESIA_FAREGAS', nombre_descuento: 'CORTESÍA FAREGAS', tipo_descuento: 'CORTESIA', importe_descuento: 350 });
    expect(construirFilasReporteFinanciero(data).find((item) => item.operacion === 'OP-6')).toMatchObject({
      importeBruto: 350, descuento: 350, importeNeto: 0, importePagado: 'S/ 0.00', saldoPendiente: 0,
      tipoPago: 'CORTESÍA', formaPago: 'CORTESÍA', cortesiaDescuento: 'CORTESÍA'
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

  describe('Facturación a crédito y cronograma de cuotas (Fase 3)', () => {
    it('clasifica una factura a crédito pendiente con 2 cuotas como CRÉDITO y 2 CUOTAS (caso FFF1-00000023)', () => {
      const data = fixture();
      // Factura crédito 180 con 2 cuotas de 90
      data.operaciones.push({
        id: 608, planta_key: '98', planta_nombre: 'SURCO', fecha_creacion: '2026-11-10T17:26:55Z', estado: 'FACTURADO', placa: 'ABC123', importe_total: 180
      });
      data.lineas.push({
        id: 6081, operacion_id: 608, tipo_item: 'SERVICIO', certificado_id: 770, producto: 'CERTIFICADO ANUAL GNV — VEHÍCULO PESADO', cantidad: 1, precio_unitario: 180, importe_total: 180, numero_certificado: 'DG-22-0000429', certificado_estado: 'EMITIDO'
      });
      data.comprobantes.push({
        id: 1044, operacion_id: 608, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 23, nro_comprobante: 'FFF1-00000023', fecha_documento: '2026-11-10', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 180, condicion_pago: 'CREDITO', cuotas_count: 2, max_cuota: 2
      });
      data.ordenes.push({
        id: 606, operacion_id: 608, certificado_id: 770, importe_total: 180, importe_pagado: 0, saldo_pendiente: 180, formapago_key: 'credito'
      });
      // Sin pagos confirmados en fg_pago
      const fila = construirFilasReporteFinanciero(data).find((item) => item.operacion === 'OP-608')!;
      expect(fila).toBeDefined();
      expect(fila.tipoPago).toBe('CRÉDITO');
      expect(fila.formaPago).toBe('2 CUOTAS');
      expect(fila.importeBruto).toBe(180);
      expect(fila.importeNeto).toBe(180);
      expect(fila.importeConsiderado).toBe(180);
      expect(fila.importePagado).toBe('S/ 0.00');
      expect(fila.saldoPendiente).toBe(180);
      expect(fila.comprobante).toBe('FFF1-00000023');
    });

    it('clasifica crédito con 1 cuota y con 3 cuotas según registros reales', () => {
      const data1 = fixture();
      data1.operaciones.push({ id: 701, planta_key: '98', fecha_creacion: '2026-11-10T10:00:00Z', estado: 'FACTURADO', importe_total: 90 });
      data1.lineas.push({ id: 7011, operacion_id: 701, tipo_item: 'SERVICIO', cantidad: 1, precio_unitario: 90, importe_total: 90, certificado_id: 801, certificado_estado: 'EMITIDO' });
      data1.comprobantes.push({ id: 1051, operacion_id: 701, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 24, nro_comprobante: 'FFF1-00000024', fecha_documento: '2026-11-10', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 90, condicion_pago: 'CREDITO', cuotas_count: 1 });
      data1.ordenes.push({ id: 7010, operacion_id: 701, importe_total: 90, formapago_key: 'credito' });
      const fila1 = construirFilasReporteFinanciero(data1).find((item) => item.operacion === 'OP-701')!;
      expect(fila1.tipoPago).toBe('CRÉDITO');
      expect(fila1.formaPago).toBe('1 CUOTA');

      const data3 = fixture();
      data3.operaciones.push({ id: 703, planta_key: '98', fecha_creacion: '2026-11-10T10:00:00Z', estado: 'FACTURADO', importe_total: 90 });
      data3.lineas.push({ id: 7031, operacion_id: 703, tipo_item: 'SERVICIO', cantidad: 1, precio_unitario: 90, importe_total: 90, certificado_id: 803, certificado_estado: 'EMITIDO' });
      data3.comprobantes.push({ id: 1053, operacion_id: 703, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 25, nro_comprobante: 'FFF1-00000025', fecha_documento: '2026-11-10', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 90, condicion_pago: 'CREDITO', cuotas_count: 3 });
      data3.ordenes.push({ id: 7030, operacion_id: 703, importe_total: 90, formapago_key: 'credito' });
      const fila3 = construirFilasReporteFinanciero(data3).find((item) => item.operacion === 'OP-703')!;
      expect(fila3.tipoPago).toBe('CRÉDITO');
      expect(fila3.formaPago).toBe('3 CUOTAS');
    });

    it('conserva modalidad CRÉDITO y N CUOTAS cuando existen abonos parciales o pago total', () => {
      const data = fixture();
      data.operaciones.push({ id: 800, planta_key: '98', fecha_creacion: '2026-11-10T10:00:00Z', estado: 'FACTURADO', importe_total: 180 });
      data.lineas.push({ id: 8001, operacion_id: 800, tipo_item: 'SERVICIO', cantidad: 1, precio_unitario: 180, importe_total: 180, certificado_id: 900, certificado_estado: 'EMITIDO' });
      data.comprobantes.push({ id: 1060, operacion_id: 800, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 26, nro_comprobante: 'FFF1-00000026', fecha_documento: '2026-11-10', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 180, condicion_pago: 'CREDITO', cuotas_count: 2 });
      data.ordenes.push({ id: 8000, operacion_id: 800, importe_total: 180, formapago_key: 'credito' });
      // Abono parcial de 90
      data.pagos.push({ id: 8001, orden_pago_id: 8000, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 90 });
      const filaParcial = construirFilasReporteFinanciero(data).find((item) => item.operacion === 'OP-800')!;
      expect(filaParcial.tipoPago).toBe('CRÉDITO');
      expect(filaParcial.formaPago).toBe('2 CUOTAS');
      expect(filaParcial.importePagado).toBe(90);
      expect(filaParcial.saldoPendiente).toBe(90);

      // Pago completo de la segunda cuota (pagos mixtos: EFECTIVO 90 + BANCO 90)
      data.pagos.push({ id: 8002, orden_pago_id: 8000, estado: 'CAN', tipocontado_key: 'BANCO', importe: 90 });
      const filaTotal = construirFilasReporteFinanciero(data).find((item) => item.operacion === 'OP-800')!;
      expect(filaTotal.tipoPago).toBe('CRÉDITO');
      expect(filaTotal.formaPago).toBe('2 CUOTAS');
      expect(filaTotal.importePagado).toBe('S/ 90.00 + S/ 90.00');
      expect((filaTotal as any).importePagadoNumerico).toBe(180);
      expect(filaTotal.saldoPendiente).toBe(0);
    });

    it('no duplica filas ni ventas vigentes por número de cuotas en totales', () => {
      const data = fixture();
      data.operaciones.push({ id: 900, planta_key: '98', fecha_creacion: '2026-11-10T10:00:00Z', estado: 'FACTURADO', importe_total: 180 });
      data.lineas.push({ id: 9001, operacion_id: 900, tipo_item: 'SERVICIO', cantidad: 1, precio_unitario: 180, importe_total: 180, certificado_id: 999, certificado_estado: 'EMITIDO' });
      data.comprobantes.push({ id: 1070, operacion_id: 900, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 27, nro_comprobante: 'FFF1-00000027', fecha_documento: '2026-11-10', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 180, condicion_pago: 'CREDITO', cuotas_count: 2 });
      data.ordenes.push({ id: 9000, operacion_id: 900, importe_total: 180, formapago_key: 'credito' });

      const filas = construirFilasReporteFinanciero(data);
      const totalVentasRow = filas.find((f) => f.sede === 'TOTAL VENTAS VIGENTES')!;
      // FFF1-27 aporta exactamente 180 al total, no 360 (2 cuotas de 180) ni dos filas
      const countOp900 = filas.filter((f) => f.operacion === 'OP-900').length;
      expect(countOp900).toBe(1);
      expect(totalVentasRow.importeNeto).toBe(210 + 180);
    });
  });

  describe('Corrección crítica de Consolidado_Datos y confirmación comercial de ventas', () => {
    it('excluye definitivamente un certificado en BORRADOR sin comprobante (ej. caso OC 604)', () => {
      const data = fixture();
      data.operaciones.push({ id: 604, planta_key: '98', fecha_creacion: '2026-11-10T15:00:00Z', estado: 'PENDIENTE_PAGO', importe_total: 180 });
      data.lineas.push({ id: 6041, operacion_id: 604, tipo_item: 'SERVICIO', certificado_id: 760, certificado_estado: 'BORRADOR', cantidad: 1, precio_unitario: 180, importe_total: 180 });
      data.ordenes.push({ id: 602, operacion_id: 604, importe_total: 180, importe_pagado: 0, saldo_pendiente: 180 });
      // Sin comprobante ni pagos

      const filas = construirFilasReporteFinanciero(data);
      expect(filas.some((f) => f.operacion === 'OP-604')).toBe(false);
      const totalRow = filas.find((f) => f.sede === 'TOTAL VENTAS VIGENTES')!;
      expect(totalRow.importeNeto).toBe(210); // No suma los 180
      expect(totalRow.saldoPendiente).toBe(130); // No suma al saldo
    });

    it('excluye definitivamente un borrador con orden de pago pendiente (no suma a ventas ni saldos)', () => {
      const data = fixture();
      data.operaciones.push({ id: 999, planta_key: '98', fecha_creacion: '2026-11-10T11:00:00Z', estado: 'BORRADOR', importe_total: 100 });
      data.lineas.push({ id: 9991, operacion_id: 999, tipo_item: 'SERVICIO', certificado_id: 999, certificado_estado: 'BORRADOR', cantidad: 1, precio_unitario: 100, importe_total: 100 });
      data.ordenes.push({ id: 9990, operacion_id: 999, importe_total: 100, importe_pagado: 0, saldo_pendiente: 100 });

      const filas = construirFilasReporteFinanciero(data);
      expect(filas.some((f) => f.operacion === 'OP-999')).toBe(false);
    });

    it('incluye un certificado emitido con comprobante válido', () => {
      const data = fixture();
      data.operaciones.push({ id: 606, planta_key: '98', fecha_creacion: '2026-11-10T16:00:00Z', estado: 'FACTURADO', importe_total: 90 });
      data.lineas.push({ id: 6061, operacion_id: 606, tipo_item: 'SERVICIO', certificado_id: 768, numero_certificado: 'DG-39-000428', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 90, importe_total: 90 });
      data.comprobantes.push({ id: 1035, operacion_id: 606, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 22, nro_comprobante: 'FFF1-00000022', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 90 });
      data.ordenes.push({ id: 604, operacion_id: 606, importe_total: 90, importe_pagado: 90 });
      data.pagos.push({ id: 1888, orden_pago_id: 604, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 90 });

      const filas = construirFilasReporteFinanciero(data);
      const fila = filas.find((f) => f.operacion === 'OP-606');
      expect(fila).toBeDefined();
      expect(fila?.importeConsiderado).toBe(90);
      expect(fila?.comprobante).toBe('FFF1-00000022');
    });

    it('excluye un certificado emitido sin comprobante fiscal válido ni pagos (inconsistencia administrativa, ej. caso OC 603)', () => {
      const data = fixture();
      data.operaciones.push({ id: 603, planta_key: '98', fecha_creacion: '2026-11-10T14:40:00Z', estado: 'PENDIENTE_PAGO', importe_total: 90 });
      data.lineas.push({ id: 6031, operacion_id: 603, tipo_item: 'SERVICIO', certificado_id: 759, numero_certificado: 'DG-41-000425', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 90, importe_total: 90 });
      data.ordenes.push({ id: 601, operacion_id: 603, importe_total: 90, importe_pagado: 0, saldo_pendiente: 90 });
      // Sin comprobante fiscal válido en data.comprobantes (f.estado era BORRADOR) ni pagos

      const filas = construirFilasReporteFinanciero(data);
      expect(filas.some((f) => f.operacion === 'OP-603')).toBe(false);
      const totalRow = filas.find((f) => f.sede === 'TOTAL VENTAS VIGENTES')!;
      expect(totalRow.importeNeto).toBe(210); // No suma
    });

    it('factura a crédito pendiente: aporta a ventas vigentes, 0 a pagado histórico, y saldo completo', () => {
      const data = fixture();
      data.operaciones.push({ id: 610, planta_key: '98', fecha_creacion: '2026-11-10T19:00:00Z', estado: 'FACTURADO', importe_total: 90 });
      data.lineas.push({ id: 6101, operacion_id: 610, tipo_item: 'SERVICIO', certificado_id: 772, numero_certificado: 'DG-39-000431', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 90, importe_total: 90 });
      data.comprobantes.push({ id: 1051, operacion_id: 610, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 25, nro_comprobante: 'FFF1-00000025', estado: 'ACEPTADO', aceptada_sunat: true, condicion_pago: 'CREDITO', cuotas_count: 2, importe_total: 90 });
      data.ordenes.push({ id: 608, operacion_id: 610, importe_total: 90, formapago_key: 'credito' });

      const filas = construirFilasReporteFinanciero(data);
      const fila = filas.find((f) => f.operacion === 'OP-610')!;
      expect(fila.importeConsiderado).toBe(90);
      expect(fila.importePagado).toBe('S/ 0.00');
      expect(fila.saldoPendiente).toBe(90);
      expect(fila.tipoPago).toBe('CRÉDITO');
      expect(fila.formaPago).toBe('2 CUOTAS');
    });

    it('factura a crédito parcialmente pagada: refleja abonos reales y saldo restante', () => {
      const data = fixture();
      data.operaciones.push({ id: 610, planta_key: '98', fecha_creacion: '2026-11-10T19:00:00Z', estado: 'FACTURADO', importe_total: 90 });
      data.lineas.push({ id: 6101, operacion_id: 610, tipo_item: 'SERVICIO', certificado_id: 772, numero_certificado: 'DG-39-000431', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 90, importe_total: 90 });
      data.comprobantes.push({ id: 1051, operacion_id: 610, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 25, nro_comprobante: 'FFF1-00000025', estado: 'ACEPTADO', aceptada_sunat: true, condicion_pago: 'CREDITO', cuotas_count: 2, importe_total: 90 });
      data.ordenes.push({ id: 608, operacion_id: 610, importe_total: 90, formapago_key: 'credito' });
      data.pagos.push({ id: 1890, orden_pago_id: 608, estado: 'CAN', tipocontado_key: 'BANCO', importe: 45 });

      const filas = construirFilasReporteFinanciero(data);
      const fila = filas.find((f) => f.operacion === 'OP-610')!;
      expect(fila.importeConsiderado).toBe(90);
      expect(fila.importePagado).toBe(45);
      expect(fila.saldoPendiente).toBe(45);
    });

    it('anulación pendiente: visible en consolidado, importe considerado 0, motivo ANULACIÓN PENDIENTE, conserva cobro histórico', () => {
      const data = fixture();
      data.operaciones.push({ id: 612, planta_key: '98', fecha_creacion: '2026-11-10T20:33:00Z', estado: 'PAGADO', importe_total: 100 });
      data.lineas.push({ id: 6121, operacion_id: 612, tipo_item: 'SERVICIO', certificado_id: 767, numero_certificado: 'DG-39-000433', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 100, importe_total: 100 });
      data.comprobantes.push({
        id: 1059, operacion_id: 612, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 302, nro_comprobante: 'BBB1-00000302',
        estado: 'PENDIENTE_SUNAT', importe_total: 100,
        documento_anulacion: 'FGAF-1059', estado_solicitud_anulacion: 'PENDIENTE', fecha_anulacion_solicitud: '2026-11-10T20:45:00Z'
      });
      data.ordenes.push({ id: 610, operacion_id: 612, importe_total: 100, importe_pagado: 100 });
      data.pagos.push({ id: 1894, orden_pago_id: 610, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 100 });

      const filas = construirFilasReporteFinanciero(data);
      const fila = filas.find((f) => f.operacion === 'OP-612')!;
      expect(fila).toBeDefined();
      expect(fila.importeBruto).toBe(100);
      expect(fila.importeNeto).toBe(100);
      expect(fila.importeConsiderado).toBe(0);
      expect(fila.motivoExclusion).toBe('ANULACIÓN PENDIENTE');
      expect(fila.importePagado).toBe(100);
      expect(fila.saldoPendiente).toBe(0);

      // En fila de totales: el cobro de la operación excluida figura en motivo
      const totalPagadoRow = filas.find((f) => f.sede === 'TOTAL PAGADO')!;
      expect(totalPagadoRow.motivoExclusion).toContain('excluido de op(s) no vigentes: S/ 100.00');
    });

    it('anulación aceptada: visible, importe considerado 0, motivo ANULACIÓN ACEPTADA', () => {
      const data = fixture();
      data.operaciones.push({ id: 700, planta_key: '98', fecha_creacion: '2026-11-10T12:00:00Z', estado: 'PAGADO', importe_total: 80 });
      data.lineas.push({ id: 7001, operacion_id: 700, tipo_item: 'SERVICIO', certificado_id: 800, numero_certificado: 'DG-41-000500', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 80, importe_total: 80 });
      data.comprobantes.push({
        id: 1100, operacion_id: 700, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 400, nro_comprobante: 'BBB1-00000400',
        estado: 'ACEPTADO', importe_total: 80,
        documento_anulacion: 'FGAF-1100', estado_solicitud_anulacion: 'ACEPTADO', aceptada_anulacion_sunat: true, fecha_anulacion_confirmacion: '2026-11-10T14:00:00Z'
      });

      const filas = construirFilasReporteFinanciero(data);
      const fila = filas.find((f) => f.operacion === 'OP-700')!;
      expect(fila).toBeDefined();
      expect(fila.importeConsiderado).toBe(0);
      expect(fila.motivoExclusion).toBe('ANULACIÓN ACEPTADA');
    });

    it('anulación rechazada: conserva importe considerado vigente', () => {
      const data = fixture();
      data.operaciones.push({ id: 710, planta_key: '98', fecha_creacion: '2026-11-10T12:00:00Z', estado: 'PAGADO', importe_total: 80 });
      data.lineas.push({ id: 7101, operacion_id: 710, tipo_item: 'SERVICIO', certificado_id: 810, numero_certificado: 'DG-41-000510', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 80, importe_total: 80 });
      data.comprobantes.push({
        id: 1110, operacion_id: 710, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 410, nro_comprobante: 'BBB1-00000410',
        estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 80,
        documento_anulacion: 'FGAF-1110', estado_solicitud_anulacion: 'RECHAZADO'
      });

      const filas = construirFilasReporteFinanciero(data);
      const fila = filas.find((f) => f.operacion === 'OP-710')!;
      expect(fila.importeConsiderado).toBe(80);
      expect(fila.motivoExclusion).toBe('');
    });

    it('NC total pendiente: importe considerado 0, motivo NC TOTAL PENDIENTE', () => {
      const data = fixture();
      data.operaciones.push({ id: 720, planta_key: '98', fecha_creacion: '2026-11-10T12:00:00Z', estado: 'PAGADO', importe_total: 80 });
      data.lineas.push({ id: 7201, operacion_id: 720, tipo_item: 'SERVICIO', certificado_id: 820, numero_certificado: 'DG-41-000520', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 80, importe_total: 80 });
      data.comprobantes.push({
        id: 1120, operacion_id: 720, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 420, nro_comprobante: 'BBB1-00000420',
        estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 80,
        notas_credito: 'FC01-00000001', cantidad_notas_credito: 1, estado_nota_credito: 'PENDIENTE', tipo_afectacion_nota_credito: 'TOTAL'
      });

      const filas = construirFilasReporteFinanciero(data);
      const fila = filas.find((f) => f.operacion === 'OP-720')!;
      expect(fila.importeConsiderado).toBe(0);
      expect(fila.motivoExclusion).toBe('NC TOTAL PENDIENTE');
    });

    it('NC parcial aceptada: reduce únicamente el importe afectado y no resta dos veces', () => {
      const data = fixture();
      data.operaciones.push({ id: 730, planta_key: '98', fecha_creacion: '2026-11-10T12:00:00Z', estado: 'PAGADO', importe_total: 100 });
      data.lineas.push({ id: 7301, operacion_id: 730, tipo_item: 'SERVICIO', certificado_id: 830, numero_certificado: 'DG-41-000530', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 100, importe_total: 100 });
      data.comprobantes.push({
        id: 1130, operacion_id: 730, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 430, nro_comprobante: 'FFF1-00000430',
        estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 100,
        notas_credito: 'FC01-00000002', cantidad_notas_credito: 1, estado_nota_credito: 'ACEPTADO',
        tipo_afectacion_nota_credito: 'PARCIAL', nota_credito_parcial_total: 30
      });

      const filas = construirFilasReporteFinanciero(data);
      const fila = filas.find((f) => f.operacion === 'OP-730')!;
      expect(fila.importeBruto).toBe(100);
      expect(fila.importeNeto).toBe(70);
      expect(fila.importeConsiderado).toBe(70);
    });

    it('operación con anulación pendiente y NC simultáneas aplica prioridad determinista sin restar dos veces', () => {
      const data = fixture();
      data.operaciones.push({ id: 740, planta_key: '98', fecha_creacion: '2026-11-10T12:00:00Z', estado: 'PAGADO', importe_total: 100 });
      data.lineas.push({ id: 7401, operacion_id: 740, tipo_item: 'SERVICIO', certificado_id: 840, numero_certificado: 'DG-41-000540', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 100, importe_total: 100 });
      data.comprobantes.push({
        id: 1140, operacion_id: 740, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 440, nro_comprobante: 'BBB1-00000440',
        estado: 'PENDIENTE_SUNAT', importe_total: 100,
        documento_anulacion: 'FGAF-1140', estado_solicitud_anulacion: 'PENDIENTE',
        notas_credito: 'BC01-00000001', cantidad_notas_credito: 1, estado_nota_credito: 'PENDIENTE', tipo_afectacion_nota_credito: 'TOTAL'
      });

      const filas = construirFilasReporteFinanciero(data);
      const fila = filas.find((f) => f.operacion === 'OP-740')!;
      expect(fila.importeConsiderado).toBe(0);
      expect(fila.motivoExclusion).toBe('ANULACIÓN PENDIENTE'); // Prioridad: anulación pendiente evaluada antes que NC
    });

    it('reconcilia exactamente el caso real del 10/11/2026: 10 operaciones confirmadas, ventas originales 940, vigentes 840, pagado 670, saldo 270', () => {
      const data: ReporteFinancieroResponse = {
        metadatos: { desde: '2026-11-10', hasta: '2026-11-10', fechaGeneracion: '2026-11-10T23:59:00Z', usuarioExportador: 'admin', plantas: ['98'], razonSocialEmisor: '', rucEmisor: '' },
        sedes: [{ planta_key: '98', planta_nombre: 'SURCO' }],
        operaciones: [
          { id: 602, planta_key: '98', planta_nombre: 'SURCO', fecha_creacion: '2026-11-10T14:37:00Z', estado: 'PAGADO', importe_total: 80 },
          { id: 603, planta_key: '98', planta_nombre: 'SURCO', fecha_creacion: '2026-11-10T14:40:00Z', estado: 'PENDIENTE_PAGO', importe_total: 90 }, // Inconsistencia sin comprobante
          { id: 604, planta_key: '98', planta_nombre: 'SURCO', fecha_creacion: '2026-11-10T15:25:00Z', estado: 'PENDIENTE_PAGO', importe_total: 180 }, // Borrador cert 760
          { id: 605, planta_key: '98', planta_nombre: 'SURCO', fecha_creacion: '2026-11-10T16:28:00Z', estado: 'PAGADO', importe_total: 80 },
          { id: 606, planta_key: '98', planta_nombre: 'SURCO', fecha_creacion: '2026-11-10T16:40:00Z', estado: 'FACTURADO', importe_total: 90 },
          { id: 607, planta_key: '98', planta_nombre: 'SURCO', fecha_creacion: '2026-11-10T17:15:00Z', estado: 'PAGADO', importe_total: 80 },
          { id: 608, planta_key: '98', planta_nombre: 'SURCO', fecha_creacion: '2026-11-10T17:26:00Z', estado: 'FACTURADO', importe_total: 180 },
          { id: 609, planta_key: '98', planta_nombre: 'SURCO', fecha_creacion: '2026-11-10T18:00:00Z', estado: 'FACTURADO', importe_total: 90 },
          { id: 610, planta_key: '98', planta_nombre: 'SURCO', fecha_creacion: '2026-11-10T19:00:00Z', estado: 'FACTURADO', importe_total: 90 },
          { id: 611, planta_key: '98', planta_nombre: 'SURCO', fecha_creacion: '2026-11-10T20:29:00Z', estado: 'FACTURADO', importe_total: 100 },
          { id: 612, planta_key: '98', planta_nombre: 'SURCO', fecha_creacion: '2026-11-10T20:33:00Z', estado: 'PAGADO', importe_total: 100 },
          { id: 613, planta_key: '98', planta_nombre: 'SURCO', fecha_creacion: '2026-11-10T20:40:00Z', estado: 'PAGADO', importe_total: 50 }
        ],
        lineas: [
          { id: 559, operacion_id: 602, tipo_item: 'SERVICIO', certificado_id: 758, numero_certificado: 'DG-41-000424', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 80, importe_total: 80 },
          { id: 560, operacion_id: 603, tipo_item: 'SERVICIO', certificado_id: 759, numero_certificado: 'DG-41-000425', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 90, importe_total: 90 },
          { id: 561, operacion_id: 604, tipo_item: 'SERVICIO', certificado_id: 760, numero_certificado: null, certificado_estado: 'BORRADOR', cantidad: 1, precio_unitario: 180, importe_total: 180 },
          { id: 562, operacion_id: 605, tipo_item: 'SERVICIO', certificado_id: 765, numero_certificado: 'DG-22-0000426', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 80, importe_total: 80 },
          { id: 563, operacion_id: 606, tipo_item: 'SERVICIO', certificado_id: 768, numero_certificado: 'DG-39-000428', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 90, importe_total: 90 },
          { id: 564, operacion_id: 607, tipo_item: 'SERVICIO', certificado_id: 769, numero_certificado: 'DG-41-000427', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 80, importe_total: 80 },
          { id: 565, operacion_id: 608, tipo_item: 'SERVICIO', certificado_id: 770, numero_certificado: 'DG-22-0000429', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 180, importe_total: 180 },
          { id: 566, operacion_id: 609, tipo_item: 'SERVICIO', certificado_id: 771, numero_certificado: 'DG-41-000430', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 90, importe_total: 90 },
          { id: 567, operacion_id: 610, tipo_item: 'SERVICIO', certificado_id: 772, numero_certificado: 'DG-39-000431', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 90, importe_total: 90 },
          { id: 568, operacion_id: 611, tipo_item: 'SERVICIO', certificado_id: 773, numero_certificado: 'DG-39-000432', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 100, importe_total: 100 },
          { id: 569, operacion_id: 612, tipo_item: 'SERVICIO', certificado_id: 767, numero_certificado: 'DG-39-000433', certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 100, importe_total: 100 },
          { id: 570, operacion_id: 613, tipo_item: 'SERVICIO', duplicado_id: 21, duplicado_tipo_nombre: 'Certificado GLP', numero_certificado: 'DG-41-000427', certificado_estado: 'DISPONIBLE', cantidad: 1, precio_unitario: 50, importe_total: 50 }
        ],
        ventasDirectas: [],
        comprobantes: [
          { id: 1019, operacion_id: 602, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 298, nro_comprobante: 'BBB1-00000298', estado: 'PENDIENTE_SUNAT', importe_total: 80 },
          { id: 1033, operacion_id: 605, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 299, nro_comprobante: 'BBB1-00000299', estado: 'PENDIENTE_SUNAT', importe_total: 80 },
          { id: 1035, operacion_id: 606, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 22, nro_comprobante: 'FFF1-00000022', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 90 },
          { id: 1038, operacion_id: 607, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 300, nro_comprobante: 'BBB1-00000300', estado: 'PENDIENTE_SUNAT', importe_total: 80 },
          { id: 1044, operacion_id: 608, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 23, nro_comprobante: 'FFF1-00000023', estado: 'ACEPTADO', aceptada_sunat: true, condicion_pago: 'CREDITO', cuotas_count: 2, importe_total: 180 },
          { id: 1048, operacion_id: 609, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 24, nro_comprobante: 'FFF1-00000024', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 90 },
          { id: 1051, operacion_id: 610, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 25, nro_comprobante: 'FFF1-00000025', estado: 'ACEPTADO', aceptada_sunat: true, condicion_pago: 'CREDITO', cuotas_count: 2, importe_total: 90 },
          { id: 1055, operacion_id: 611, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 26, nro_comprobante: 'FFF1-00000026', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 100 },
          { id: 1059, operacion_id: 612, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 302, nro_comprobante: 'BBB1-00000302', estado: 'PENDIENTE_SUNAT', importe_total: 100, documento_anulacion: 'FGAF-1059', estado_solicitud_anulacion: 'PENDIENTE' },
          { id: 1058, operacion_id: 613, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 301, nro_comprobante: 'BBB1-00000301', estado: 'PENDIENTE_SUNAT', importe_total: 50 }
        ],
        ordenes: [
          { id: 600, operacion_id: 602, importe_total: 80, importe_pagado: 80 },
          { id: 601, operacion_id: 603, importe_total: 90, importe_pagado: 0, saldo_pendiente: 90 },
          { id: 602, operacion_id: 604, importe_total: 180, importe_pagado: 0, saldo_pendiente: 180 },
          { id: 603, operacion_id: 605, importe_total: 80, importe_pagado: 80 },
          { id: 604, operacion_id: 606, importe_total: 90, importe_pagado: 90 },
          { id: 605, operacion_id: 607, importe_total: 80, importe_pagado: 80 },
          { id: 606, operacion_id: 608, importe_total: 180, importe_pagado: 0, saldo_pendiente: 180, formapago_key: 'credito' },
          { id: 607, operacion_id: 609, importe_total: 90, importe_pagado: 90 },
          { id: 608, operacion_id: 610, importe_total: 90, importe_pagado: 0, saldo_pendiente: 90, formapago_key: 'credito' },
          { id: 609, operacion_id: 611, importe_total: 100, importe_pagado: 100 },
          { id: 610, operacion_id: 612, importe_total: 100, importe_pagado: 100 },
          { id: 611, operacion_id: 613, importe_total: 50, importe_pagado: 50 }
        ],
        pagos: [
          { id: 1878, orden_pago_id: 600, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 80 },
          { id: 1885, orden_pago_id: 603, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 80 },
          { id: 1887, orden_pago_id: 604, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 90 },
          { id: 1889, orden_pago_id: 605, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 80 },
          { id: 1890, orden_pago_id: 607, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 90 },
          { id: 1891, orden_pago_id: 609, estado: 'CAN', tipocontado_key: 'TARJETA', tipo_tarjeta: 'PLIN', importe: 100 },
          { id: 1894, orden_pago_id: 610, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 100 },
          { id: 1892, orden_pago_id: 611, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 50 }
        ],
        descuentos: [],
        ajustes: []
      };

      const filas = construirFilasReporteFinanciero(data);
      // Solo 10 filas de operaciones + 2 filas de totales = 12 filas
      expect(filas).toHaveLength(12);

      // Exclusión verificada:
      expect(filas.some((f) => f.operacion === 'OP-603')).toBe(false);
      expect(filas.some((f) => f.operacion === 'OP-604')).toBe(false);

      // Fila TOTAL VENTAS VIGENTES
      const filaVigentes = filas.find((f) => f.sede === 'TOTAL VENTAS VIGENTES')!;
      expect(filaVigentes.importeBruto).toBe(940);
      expect(filaVigentes.importeNeto).toBe(940); // TOTAL VENTAS ORIGINALES CONFIRMADAS
      expect(filaVigentes.importeConsiderado).toBe(840); // TOTAL VENTAS VIGENTES
      expect(filaVigentes.saldoPendiente).toBe(270); // SALDO PENDIENTE DE VENTAS VIGENTES (180 + 90)

      // Fila TOTAL PAGADO: suma únicamente pagos de operaciones vigentes (570, excluyendo los 100 de anulación pendiente)
      const filaPagado = filas.find((f) => f.sede === 'TOTAL PAGADO')!;
      expect(filaPagado.importePagado).toBe(570); // Pagos vigentes (670 - 100 = 570)
      expect(filaPagado.motivoExclusion).toContain('excluido de op(s) no vigentes: S/ 100.00');

      // Conciliación matemática al centavo:
      // Ventas vigentes (840) = Total Pagado Vigente (570) + Saldo Vigente (270)
      expect(Number(filaPagado.importePagado) + Number(filaVigentes.saldoPendiente)).toBe(Number(filaVigentes.importeConsiderado));
    });

    it('cumple el caso real del 10/11/2026: TOTAL VENTAS VIGENTES 1,160.00, TOTAL PAGADO 800.00, SALDO PENDIENTE 360.00 con anulaciones pendientes FGAF-1059 y FGAF-1066', () => {
      const data: ReporteFinancieroResponse = {
        metadatos: { desde: '2026-11-10', hasta: '2026-11-10', fechaGeneracion: '2026-11-10T23:59:00Z', usuarioExportador: 'admin', plantas: ['98'], razonSocialEmisor: '', rucEmisor: '' },
        sedes: [{ planta_key: '98', planta_nombre: 'SURCO' }],
        operaciones: [
          { id: 602, planta_key: '98', fecha_creacion: '2026-11-10T14:37:00Z', estado: 'PAGADO', importe_total: 80 },
          { id: 603, planta_key: '98', fecha_creacion: '2026-11-10T14:40:00Z', estado: 'PENDIENTE_PAGO', importe_total: 90 }, // borrador fact
          { id: 604, planta_key: '98', fecha_creacion: '2026-11-10T15:25:00Z', estado: 'PENDIENTE_PAGO', importe_total: 180 }, // borrador cert
          { id: 605, planta_key: '98', fecha_creacion: '2026-11-10T16:28:00Z', estado: 'PAGADO', importe_total: 80 },
          { id: 606, planta_key: '98', fecha_creacion: '2026-11-10T16:40:00Z', estado: 'FACTURADO', importe_total: 90 },
          { id: 607, planta_key: '98', fecha_creacion: '2026-11-10T17:15:00Z', estado: 'PAGADO', importe_total: 80 },
          { id: 608, planta_key: '98', fecha_creacion: '2026-11-10T17:26:00Z', estado: 'FACTURADO', importe_total: 180 }, // crédito 180
          { id: 609, planta_key: '98', fecha_creacion: '2026-11-10T18:00:00Z', estado: 'FACTURADO', importe_total: 90 },
          { id: 610, planta_key: '98', fecha_creacion: '2026-11-10T19:00:00Z', estado: 'FACTURADO', importe_total: 90 }, // crédito 90
          { id: 611, planta_key: '98', fecha_creacion: '2026-11-10T20:29:00Z', estado: 'FACTURADO', importe_total: 100 },
          { id: 612, planta_key: '98', fecha_creacion: '2026-11-10T20:33:00Z', estado: 'PAGADO', importe_total: 100 }, // FGAF-1059 anulación pendiente (100)
          { id: 613, planta_key: '98', fecha_creacion: '2026-11-10T20:40:00Z', estado: 'PAGADO', importe_total: 50 },
          { id: 614, planta_key: '98', fecha_creacion: '2026-11-10T21:00:00Z', estado: 'PAGADO', importe_total: 0 }, // cortesía 100%
          { id: 615, planta_key: '98', fecha_creacion: '2026-11-10T21:10:00Z', estado: 'FACTURADO', importe_total: 90 }, // crédito 90
          { id: 616, planta_key: '98', fecha_creacion: '2026-11-10T21:20:00Z', estado: 'FACTURADO', importe_total: 80 }, // FGAF-1066 anulación pendiente (80)
          { id: 617, planta_key: '98', fecha_creacion: '2026-11-10T21:30:00Z', estado: 'PAGADO', importe_total: 180 },
          { id: 618, planta_key: '98', fecha_creacion: '2026-11-10T21:40:00Z', estado: 'FACTURADO', importe_total: 50 }
        ],
        lineas: [
          { id: 559, operacion_id: 602, tipo_item: 'SERVICIO', certificado_id: 758, certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 80, importe_total: 80 },
          { id: 560, operacion_id: 603, tipo_item: 'SERVICIO', certificado_id: 759, certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 90, importe_total: 90 },
          { id: 561, operacion_id: 604, tipo_item: 'SERVICIO', certificado_id: 760, certificado_estado: 'BORRADOR', cantidad: 1, precio_unitario: 180, importe_total: 180 },
          { id: 562, operacion_id: 605, tipo_item: 'SERVICIO', certificado_id: 765, certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 80, importe_total: 80 },
          { id: 563, operacion_id: 606, tipo_item: 'SERVICIO', certificado_id: 768, certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 90, importe_total: 90 },
          { id: 564, operacion_id: 607, tipo_item: 'SERVICIO', certificado_id: 769, certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 80, importe_total: 80 },
          { id: 565, operacion_id: 608, tipo_item: 'SERVICIO', certificado_id: 770, certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 180, importe_total: 180 },
          { id: 566, operacion_id: 609, tipo_item: 'SERVICIO', certificado_id: 771, certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 90, importe_total: 90 },
          { id: 567, operacion_id: 610, tipo_item: 'SERVICIO', certificado_id: 772, certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 90, importe_total: 90 },
          { id: 568, operacion_id: 611, tipo_item: 'SERVICIO', certificado_id: 773, certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 100, importe_total: 100 },
          { id: 569, operacion_id: 612, tipo_item: 'SERVICIO', certificado_id: 767, certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 100, importe_total: 100 },
          { id: 570, operacion_id: 613, tipo_item: 'SERVICIO', duplicado_id: 21, duplicado_tipo_nombre: 'Certificado GLP', certificado_estado: 'DISPONIBLE', cantidad: 1, precio_unitario: 50, importe_total: 50 },
          { id: 571, operacion_id: 614, tipo_item: 'SERVICIO', certificado_id: 774, certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 0, importe_total: 0 },
          { id: 572, operacion_id: 615, tipo_item: 'SERVICIO', certificado_id: 775, certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 90, importe_total: 90 },
          { id: 573, operacion_id: 616, tipo_item: 'SERVICIO', certificado_id: 776, certificado_estado: 'EMITIDO', cantidad: 1, precio_unitario: 80, importe_total: 80 },
          { id: 574, operacion_id: 617, tipo_item: 'PRODUCTO', cantidad: 1, precio_unitario: 180, importe_total: 180 },
          { id: 575, operacion_id: 618, tipo_item: 'PRODUCTO', cantidad: 1, precio_unitario: 50, importe_total: 50 }
        ],
        ventasDirectas: [],
        comprobantes: [
          { id: 1019, operacion_id: 602, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 298, estado: 'PENDIENTE_SUNAT', importe_total: 80 },
          { id: 1033, operacion_id: 605, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 299, estado: 'PENDIENTE_SUNAT', importe_total: 80 },
          { id: 1035, operacion_id: 606, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 22, estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 90 },
          { id: 1038, operacion_id: 607, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 300, estado: 'PENDIENTE_SUNAT', importe_total: 80 },
          { id: 1044, operacion_id: 608, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 23, estado: 'ACEPTADO', aceptada_sunat: true, condicion_pago: 'CREDITO', cuotas_count: 2, importe_total: 180 },
          { id: 1048, operacion_id: 609, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 24, estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 90 },
          { id: 1051, operacion_id: 610, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 25, estado: 'ACEPTADO', aceptada_sunat: true, condicion_pago: 'CREDITO', cuotas_count: 2, importe_total: 90 },
          { id: 1055, operacion_id: 611, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 26, estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 100 },
          { id: 1059, operacion_id: 612, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 302, estado: 'PENDIENTE_SUNAT', importe_total: 100, documento_anulacion: 'FGAF-1059', estado_solicitud_anulacion: 'PENDIENTE' },
          { id: 1058, operacion_id: 613, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 301, estado: 'PENDIENTE_SUNAT', importe_total: 50 },
          { id: 1061, operacion_id: 614, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 303, estado: 'PENDIENTE_SUNAT', importe_total: 0 },
          { id: 1063, operacion_id: 615, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 27, estado: 'ACEPTADO', aceptada_sunat: true, condicion_pago: 'CREDITO', cuotas_count: 2, importe_total: 90 },
          { id: 1066, operacion_id: 616, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 28, estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 80, documento_anulacion: 'FGAF-1066', estado_solicitud_anulacion: 'PENDIENTE' },
          { id: 1069, operacion_id: 617, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 304, estado: 'PENDIENTE_SUNAT', importe_total: 180 },
          { id: 1070, operacion_id: 618, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 29, estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 50 }
        ],
        ordenes: [
          { id: 600, operacion_id: 602, importe_total: 80, importe_pagado: 80 },
          { id: 601, operacion_id: 603, importe_total: 90, importe_pagado: 0, saldo_pendiente: 90 },
          { id: 602, operacion_id: 604, importe_total: 180, importe_pagado: 0, saldo_pendiente: 180 },
          { id: 603, operacion_id: 605, importe_total: 80, importe_pagado: 80 },
          { id: 604, operacion_id: 606, importe_total: 90, importe_pagado: 90 },
          { id: 605, operacion_id: 607, importe_total: 80, importe_pagado: 80 },
          { id: 606, operacion_id: 608, importe_total: 180, importe_pagado: 0, saldo_pendiente: 180, formapago_key: 'credito' },
          { id: 607, operacion_id: 609, importe_total: 90, importe_pagado: 90 },
          { id: 608, operacion_id: 610, importe_total: 90, importe_pagado: 0, saldo_pendiente: 90, formapago_key: 'credito' },
          { id: 609, operacion_id: 611, importe_total: 100, importe_pagado: 100 },
          { id: 610, operacion_id: 612, importe_total: 100, importe_pagado: 100 },
          { id: 611, operacion_id: 613, importe_total: 50, importe_pagado: 50 },
          { id: 612, operacion_id: 614, importe_total: 0, importe_pagado: 0, saldo_pendiente: 0 },
          { id: 613, operacion_id: 615, importe_total: 90, importe_pagado: 0, saldo_pendiente: 90, formapago_key: 'credito' },
          { id: 614, operacion_id: 616, importe_total: 80, importe_pagado: 80 },
          { id: 615, operacion_id: 617, importe_total: 180, importe_pagado: 180 },
          { id: 616, operacion_id: 618, importe_total: 50, importe_pagado: 50 }
        ],
        pagos: [
          { id: 1878, orden_pago_id: 600, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 80 },
          { id: 1885, orden_pago_id: 603, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 80 },
          { id: 1887, orden_pago_id: 604, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 90 },
          { id: 1889, orden_pago_id: 605, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 80 },
          { id: 1890, orden_pago_id: 607, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 90 },
          { id: 1891, orden_pago_id: 609, estado: 'CAN', tipocontado_key: 'TARJETA', tipo_tarjeta: 'PLIN', importe: 100 },
          { id: 1894, orden_pago_id: 610, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 100 },
          { id: 1892, orden_pago_id: 611, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 50 },
          { id: 1895, orden_pago_id: 614, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 80 },
          { id: 1896, orden_pago_id: 615, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 180 },
          { id: 1897, orden_pago_id: 616, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 50 }
        ],
        descuentos: [],
        ajustes: []
      };

      const filas = construirFilasReporteFinanciero(data);
      const filaVigentes = filas.find((f) => f.sede === 'TOTAL VENTAS VIGENTES')!;
      const filaPagado = filas.find((f) => f.sede === 'TOTAL PAGADO')!;

      // RESULTADOS EXACTOS EXIGIDOS:
      expect(filaVigentes.importeConsiderado).toBe(1160); // TOTAL VENTAS VIGENTES: S/ 1,160.00
      expect(filaPagado.importePagado).toBe(800);         // TOTAL PAGADO: S/ 800.00 (980 - 100 [FGAF-1059] - 80 [FGAF-1066])
      expect(filaVigentes.saldoPendiente).toBe(360);      // SALDO PENDIENTE: S/ 360.00 (180 + 90 + 90)

      // Conciliación perfecta: 800 + 360 = 1,160
      expect(Number(filaPagado.importePagado) + Number(filaVigentes.saldoPendiente)).toBe(Number(filaVigentes.importeConsiderado));
    });
  });
});
