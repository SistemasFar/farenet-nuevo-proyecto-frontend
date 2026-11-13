import { describe, expect, it } from 'vitest';
import fixtureData from './__fixtures__/data_11nov.json';
import { construirHojasUnificadas, resolverUnidadMedidaSunatLine } from './faregas-documentos-emitidos-extendido';
import { crearExcelVariasHojasBytes } from './exportar-excel';

describe('FAREGAS — Estructura definitiva de 5 hojas del reporte financiero extendido', () => {
  const { extendido, consolidado } = fixtureData as any;
  const unificadas = construirHojasUnificadas(extendido, consolidado, '2026-11-11', '2026-11-11');
  const nombresHojas = unificadas.map((h) => h.name);

  it('1. El archivo XLSX exportado contiene exactamente 5 hojas', () => {
    expect(unificadas).toHaveLength(5);
  });

  it('2. Los nombres y orden de las 5 hojas son exactamente: Datos, Líneas de productos, Consolidado_Datos, Anulados, Notas de credito', () => {
    expect(nombresHojas).toEqual([
      'Datos',
      'Líneas de productos',
      'Consolidado_Datos',
      'Anulados',
      'Notas de credito'
    ]);
  });

  it('3. Las hojas Historial y Trazabilidad no existen en el archivo generado', () => {
    expect(nombresHojas).not.toContain('Historial');
    expect(nombresHojas).not.toContain('Trazabilidad');
  });

  it('4. CAMBIO 1 — Unidades de medida SUNAT: Certificados y duplicados tienen unidad ZZ; CHIPs físicos tienen NIU', () => {
    const hojaLineas = unificadas.find((h) => h.name === 'Líneas de productos')!;
    const porDoc = new Map(hojaLineas.rows.map((r: any) => [r.documento, r]));

    // Certificados anuales GLP/GNV -> ZZ
    expect(porDoc.get('BBB1-306')?.unidad).toBe('ZZ');
    expect(porDoc.get('BBB1-307')?.unidad).toBe('ZZ');
    expect(porDoc.get('BBB1-308')?.unidad).toBe('ZZ');

    // Duplicados (cobro de servicio) -> ZZ
    expect(porDoc.get('FFF1-30')?.unidad).toBe('ZZ');
    expect(porDoc.get('BBB1-311')?.unidad).toBe('ZZ');

    // CHIPs físicos -> NIU
    expect(porDoc.get('BBB1-309')?.unidad).toBe('NIU');
    expect(porDoc.get('BBB1-310')?.unidad).toBe('NIU');

    // Validación directa de la función normalizadora
    expect(resolverUnidadMedidaSunatLine({ tipo_producto: 'GLP', producto: 'CERTIFICACIÓN ANUAL GLP' })).toBe('ZZ');
    expect(resolverUnidadMedidaSunatLine({ tipo_producto: 'GNV', producto: 'CERTIFICACIÓN ANUAL GNV' })).toBe('ZZ');
    expect(resolverUnidadMedidaSunatLine({ duplicado_id: 1, producto: 'DUPLICADO DE CERTIFICADO' })).toBe('ZZ');
    expect(resolverUnidadMedidaSunatLine({ tipo_producto: 'PRODUCTO', producto: 'CHIP GNV' })).toBe('NIU');
    expect(resolverUnidadMedidaSunatLine({ tipo_producto: 'PRODUCTO', producto: 'PORTA CHIP' })).toBe('NIU');
  });

  it('5. En Líneas de productos se eliminaron las 4 columnas de IDs y quedan 13 columnas', () => {
    const hojaLineas = unificadas.find((h) => h.name === 'Líneas de productos')!;
    expect(hojaLineas.columns).toHaveLength(13);
    const colKeys = hojaLineas.columns.map((c) => c.key);
    expect(colKeys).not.toContain('documentIds');
    expect(colKeys).not.toContain('idDetalle');
    expect(colKeys).not.toContain('operacion');
    expect(colKeys).not.toContain('venta');
    expect(colKeys).toContain('documento');
    expect(colKeys).toContain('unidad');
  });

  it('6. CAMBIO 2 — Consolidado_Datos: Incluye cortesías (bruto real, descuento real, neto 0, considerado 0, pagado S/ 0.00)', () => {
    const hojaConsolidado = unificadas.find((h) => h.name === 'Consolidado_Datos')!;
    const filasDatos = hojaConsolidado.rows.filter((r: any) => r.sede !== 'TOTAL VENTAS VIGENTES' && r.sede !== 'TOTAL PAGADO');

    // Debe contener las 7 operaciones (6 ventas normales + 1 cortesía)
    expect(filasDatos).toHaveLength(7);

    // Buscar la cortesía BBB1-308
    const cortesia = filasDatos.find((r: any) => String(r.comprobante).includes('308'));
    expect(cortesia).toBeDefined();
    expect(cortesia?.tipoPago).toBe('CORTESÍA');
    expect(cortesia?.formaPago).toBe('CORTESÍA');
    expect(cortesia?.cortesiaDescuento).toBe('CORTESÍA');
    expect(cortesia?.motivoExclusion).toBe('CORTESÍA');

    // Valores monetarios de la cortesía
    expect(Number(cortesia?.importeBruto)).toBe(350);
    expect(Number(cortesia?.descuento)).toBe(350);
    expect(Number(cortesia?.importeNeto)).toBe(0);
    expect(Number(cortesia?.importeConsiderado)).toBe(0);
    expect(Number(cortesia?.saldoPendiente)).toBe(0);
    expect(cortesia?.importePagado).toBe('S/ 0.00');
  });

  it('7. CAMBIO 2 y 6 — Totales en Consolidado_Datos: No se inflan con las cortesías (neto y pagado totalizan exactamente S/ 600.00)', () => {
    const hojaConsolidado = unificadas.find((h) => h.name === 'Consolidado_Datos')!;
    const filasDatos = hojaConsolidado.rows.filter((r: any) => r.sede !== 'TOTAL VENTAS VIGENTES' && r.sede !== 'TOTAL PAGADO');

    const sumaImporteNeto = filasDatos.reduce((s: number, r: any) => s + Number(r.importeNeto), 0);
    const sumaImportePagado = filasDatos.reduce((s: number, r: any) => s + Number(r.importePagadoNumerico ?? r.importePagado), 0);

    const filaTotalVentas = hojaConsolidado.rows.find((r: any) => r.sede === 'TOTAL VENTAS VIGENTES');
    const filaTotalPagado = hojaConsolidado.rows.find((r: any) => r.sede === 'TOTAL PAGADO');

    expect(filaTotalVentas).toBeDefined();
    expect(filaTotalPagado).toBeDefined();

    expect(filaTotalVentas?.importeNeto).toBe(600);
    expect(filaTotalVentas?.importeConsiderado).toBe(600);
    expect(filaTotalVentas?.importePagado).toBe(600);
    expect(filaTotalPagado?.importePagado).toBe(600);

    expect(sumaImporteNeto).toBe(600);
    expect(sumaImportePagado).toBe(600);
  });

  it('8. CAMBIO 3 y 4 — Hojas Anulados y Notas de credito creadas con estructura correcta y totalsRow = false', () => {
    const hojaAnulados = unificadas.find((h) => h.name === 'Anulados')!;
    expect(hojaAnulados).toBeDefined();
    expect(hojaAnulados.title).toContain('ANULACIÓN');
    expect(hojaAnulados.totalsRow).toBe(false);

    const hojaNC = unificadas.find((h) => h.name === 'Notas de credito')!;
    expect(hojaNC).toBeDefined();
    expect(hojaNC.title).toContain('NOTA DE CRÉDITO');
    expect(hojaNC.totalsRow).toBe(false);

    // Ambas hojas tienen las columnas financieras estándar
    expect(hojaAnulados.columns.some((c) => c.key === 'comprobante')).toBe(true);
    expect(hojaAnulados.columns.some((c) => c.key === 'importePagado')).toBe(true);
    expect(hojaAnulados.columns.some((c) => c.key === 'autorizadorAnulacion')).toBe(true);
    expect(hojaNC.columns.some((c) => c.key === 'comprobante')).toBe(true);
    expect(hojaNC.columns.some((c) => c.key === 'numeroNotaCredito')).toBe(true);
    expect(hojaNC.columns.some((c) => c.key === 'tipoAfectacionNotaCredito')).toBe(true);
    expect(hojaNC.columns.some((c) => c.key === 'autorizadorNotaCredito')).toBe(true);
  });

  it('9. CAMBIO 5 — Desglose de pagos y columna auxiliar oculta importePagadoNumerico', () => {
    const hojaConsolidado = unificadas.find((h) => h.name === 'Consolidado_Datos')!;
    const colOculta = hojaConsolidado.columns.find((c) => c.key === 'importePagadoNumerico');

    expect(colOculta).toBeDefined();
    expect(colOculta?.hidden).toBe(true);

    const colPagado = hojaConsolidado.columns.find((c) => c.key === 'importePagado');
    expect(colPagado).toBeDefined();
  });

  it('10. Una nota de crédito rechazada sale de Consolidado_Datos y aparece en Notas de credito con su estado real', () => {
    const consolidadoConNcRechazada = structuredClone(consolidado);
    const comprobante = consolidadoConNcRechazada.comprobantes.find((doc: Record<string, unknown>) => doc.operacion_id);
    expect(comprobante).toBeDefined();
    Object.assign(comprobante, {
      notas_credito: 'FFF1-2',
      cantidad_notas_credito: 1,
      motivo_nota_credito: '03',
      estado_nota_credito: 'RECHAZADO',
      fecha_emision_nota_credito: '2026-11-13T14:27:37.994Z',
      fecha_hora_emision_nota_credito: '2026-11-13T14:27:37.994Z',
      usuario_autorizador_nota_credito: 'GRACE IBARRA',
      importe_nota_credito: comprobante.importe_total,
      tipo_afectacion_nota_credito: 'CORRECCIÓN'
    });

    const hojas = construirHojasUnificadas(extendido, consolidadoConNcRechazada, '2026-11-11', '2026-11-11');
    const hojaConsolidado = hojas.find((h) => h.name === 'Consolidado_Datos')!;
    const hojaNotasCredito = hojas.find((h) => h.name === 'Notas de credito')!;

    expect(hojaConsolidado.rows.some((row) => row.numeroNotaCredito === 'FFF1-2')).toBe(false);
    const incidencia = hojaNotasCredito.rows.find((row) => row.numeroNotaCredito === 'FFF1-2');
    expect(incidencia).toBeDefined();
    expect(incidencia?.estadoNotaCredito).toBe('RECHAZADO');
    expect(incidencia?.motivoNotaCredito).toBe('03');
    expect(incidencia?.horaEmisionNotaCreditoC).toBe('09:27:37');
    expect(incidencia?.autorizadorNotaCredito).toBe('GRACE IBARRA');
    expect(hojaNotasCredito.columns[0]).toMatchObject({
      key: 'fechaNotaCreditoC',
      header: 'Fecha de emisión de la nota de crédito'
    });
    expect(hojaNotasCredito.columns[1]).toMatchObject({
      key: 'horaEmisionNotaCreditoC',
      header: 'Hora de emisión de la nota de crédito'
    });
    expect(hojaNotasCredito.columns.some((columna) => columna.key === 'horaEmisionComprobanteC')).toBe(false);
    expect(hojaNotasCredito.columns.some((columna) => columna.key === 'horaEmisionCertificadoC')).toBe(false);
  });

  it('11. Genera archivo XLSX binario válido con las 5 hojas', async () => {
    const bytes = await crearExcelVariasHojasBytes(unificadas);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(5000);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4B);
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
  });
});
