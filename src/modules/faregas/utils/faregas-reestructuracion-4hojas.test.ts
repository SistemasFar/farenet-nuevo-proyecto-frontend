import { describe, expect, it } from 'vitest';
import fixtureData from './__fixtures__/data_11nov.json';
import { construirHojasUnificadas } from './faregas-documentos-emitidos-extendido';
import { crearExcelVariasHojasBytes } from './exportar-excel';

describe('FAREGAS — Reestructuración de 4 hojas del reporte financiero extendido', () => {
  const { extendido, consolidado } = fixtureData as any;
  const unificadas = construirHojasUnificadas(extendido, consolidado, '2026-11-11', '2026-11-11');
  const nombresHojas = unificadas.map((h) => h.name);

  it('1. El archivo XLSX exportado contiene exactamente 4 hojas', () => {
    expect(unificadas).toHaveLength(4);
  });

  it('2. Los nombres de las 4 hojas son los especificados: Datos, Líneas de productos, Historial, Consolidado_Datos', () => {
    expect(nombresHojas).toEqual(['Datos', 'Líneas de productos', 'Historial', 'Consolidado_Datos']);
  });

  it('3. La hoja Trazabilidad no existe en el archivo generado', () => {
    expect(nombresHojas).not.toContain('Trazabilidad');
  });

  it('4. En Líneas de productos se eliminaron las 4 columnas de IDs y quedan 13 columnas', () => {
    const hojaLineas = unificadas.find((h) => h.name === 'Líneas de productos')!;
    expect(hojaLineas.columns).toHaveLength(13);
    const colKeys = hojaLineas.columns.map((c) => c.key);
    expect(colKeys).not.toContain('documentIds');
    expect(colKeys).not.toContain('idDetalle');
    expect(colKeys).not.toContain('operacion');
    expect(colKeys).not.toContain('venta');
    expect(colKeys).toContain('documento');
  });

  it('5. En Líneas de productos el tipo de producto está clasificado como COMPLEMENTARIO DUPLICADO o COMPLEMENTARIO VENTA DE PRODUCTO según corresponda', () => {
    const hojaLineas = unificadas.find((h) => h.name === 'Líneas de productos')!;
    const porDoc = new Map(hojaLineas.rows.map((r: any) => [r.documento, r]));

    // Duplicados
    expect(porDoc.get('FFF1-30')?.tipoProducto).toBe('COMPLEMENTARIO DUPLICADO');
    expect(porDoc.get('BBB1-311')?.tipoProducto).toBe('COMPLEMENTARIO DUPLICADO');

    // Chips
    expect(porDoc.get('BBB1-309')?.tipoProducto).toBe('COMPLEMENTARIO VENTA DE PRODUCTO');
    expect(porDoc.get('BBB1-310')?.tipoProducto).toBe('COMPLEMENTARIO VENTA DE PRODUCTO');

    // Certificados regulares
    expect(porDoc.get('BBB1-306')?.tipoProducto).toBe('GLP');
    expect(porDoc.get('BBB1-307')?.tipoProducto).toBe('GLP');
    expect(porDoc.get('BBB1-308')?.tipoProducto).toBe('GNV');
  });

  it('6. En Datos el tipo de certificado no contiene COMPLEMENTARIO genérico', () => {
    const hojaDatos = unificadas.find((h) => h.name === 'Datos')!;
    const porDoc = new Map(hojaDatos.rows.map((r: any) => [r.numeroDocumento, r]));

    expect(porDoc.get('FFF1-30')?.tipoCertificado).toBe('COMPLEMENTARIO DUPLICADO');
    expect(porDoc.get('BBB1-311')?.tipoCertificado).toBe('COMPLEMENTARIO DUPLICADO');
    expect(porDoc.get('BBB1-309')?.tipoCertificado).toBe('COMPLEMENTARIO VENTA DE PRODUCTO');
    expect(porDoc.get('BBB1-310')?.tipoCertificado).toBe('COMPLEMENTARIO VENTA DE PRODUCTO');
    expect(porDoc.get('BBB1-306')?.tipoCertificado).toBe('GLP');
    expect(porDoc.get('BBB1-307')?.tipoCertificado).toBe('GLP');
    expect(porDoc.get('BBB1-308')?.tipoCertificado).toBe('GNV');

    // Ninguna celda tiene "COMPLEMENTARIO" a secas
    for (const r of hojaDatos.rows) {
      expect(r.tipoCertificado).not.toBe('COMPLEMENTARIO');
    }
  });

  it('7. La hoja Historial contiene todas las operaciones sin filtrar (incluyendo cortesías, anulaciones y NCs) y no tiene filas de sumatorias', () => {
    const hojaHistorial = unificadas.find((h) => h.name === 'Historial')!;
    expect(hojaHistorial.columns).toHaveLength(46);
    expect(hojaHistorial.totalsRow).toBe(false);

    // Contiene las 7 operaciones de 11/11/2026
    expect(hojaHistorial.rows).toHaveLength(7);
    const comprobantesHist = hojaHistorial.rows.map((r: any) => r.comprobante);
    expect(comprobantesHist.some((c: string) => c.includes('308'))).toBe(true); // Cortesía incluida

    // No tiene filas de sumatorias
    expect(hojaHistorial.rows.some((r: any) => r.sede === 'TOTAL VENTAS VIGENTES')).toBe(false);
    expect(hojaHistorial.rows.some((r: any) => r.sede === 'TOTAL PAGADO')).toBe(false);
  });

  it('8. La hoja Consolidado_Datos solo contiene operaciones vigentes con importe mayor a 0 y no contiene cortesías, anulaciones ni NCs', () => {
    const hojaConsolidado = unificadas.find((h) => h.name === 'Consolidado_Datos')!;
    expect(hojaConsolidado.columns).toHaveLength(46);
    expect(hojaConsolidado.totalsRow).toBe(true);

    // Filas de datos (sin las 2 filas de sumatorias)
    const filasDatos = hojaConsolidado.rows.filter((r: any) => r.sede !== 'TOTAL VENTAS VIGENTES' && r.sede !== 'TOTAL PAGADO');

    // Exactamente 6 operaciones vigentes (la cortesía BBB1-308 fue excluida)
    expect(filasDatos).toHaveLength(6);
    const comprobantesCons = filasDatos.map((r: any) => r.comprobante);
    expect(comprobantesCons).not.toContain('BBB1-308');

    // Todas con importe mayor a 0 y sin cortesías
    for (const r of filasDatos) {
      expect(Number(r.importeNeto)).toBeGreaterThan(0);
      expect(Number(r.importeConsiderado)).toBeGreaterThan(0);
      expect(r.cortesiaDescuento).not.toBe('CORTESÍA');
      expect(r.motivoExclusion).toBe('');
    }
  });

  it('9. En Consolidado_Datos las sumatorias finales coinciden exactamente con la suma de las filas visibles (S/ 600.00)', () => {
    const hojaConsolidado = unificadas.find((h) => h.name === 'Consolidado_Datos')!;
    const filasDatos = hojaConsolidado.rows.filter((r: any) => r.sede !== 'TOTAL VENTAS VIGENTES' && r.sede !== 'TOTAL PAGADO');

    const sumaImporteNeto = filasDatos.reduce((s: number, r: any) => s + Number(r.importeNeto), 0);
    const sumaImportePagado = filasDatos.reduce((s: number, r: any) => s + Number(r.importePagado), 0);

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

  it('10. Genera archivo XLSX binario válido con las 4 hojas', async () => {
    const bytes = await crearExcelVariasHojasBytes(unificadas);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(5000);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4B);
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
  });
});
