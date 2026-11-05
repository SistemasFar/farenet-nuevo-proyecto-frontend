import { describe, expect, it } from 'vitest';
import { construirResumenMensualFacturacion } from './faregas-resumen-mensual-facturacion';

describe('resumen mensual de facturación', () => {
  it('genera las hojas DMS, agrupa estados reales y separa DEMO de aceptación', () => {
    const cabeceras = [
      { id_documento: 'F-1', tipo_comprobante: 'FACTURA', serie: 'F001', numero: 1, fecha_emision: '2026-10-01', fecha_documento: '2026-10-01', estado_tecnico: 'ACEPTADO', aceptada_sunat: true, entorno_facturador: 'PRODUCCION', empresa_emisora: 'Faregas', ruc_emisor: '20123456789' },
      { id_documento: 'F-1', tipo_comprobante: 'FACTURA', serie: 'F001', numero: 1, estado_tecnico: 'ACEPTADO', aceptada_sunat: true },
      { id_documento: 'F-2', tipo_comprobante: 'FACTURA', serie: 'F001', numero: 2, fecha_emision: '2026-10-02', estado_tecnico: 'ACEPTADO', aceptada_sunat: true, entorno_facturador: 'DEMO' },
      { id_documento: 'F-3', tipo_comprobante: 'BOLETA', serie: 'B001', numero: 3, fecha_emision: '2026-10-03', estado_tecnico: 'PENDIENTE_SUNAT' },
      { id_documento: 'F-4', tipo_comprobante: 'FACTURA', serie: 'F001', numero: 4, fecha_emision: '2026-10-04', estado_tecnico: 'RECHAZADO', sunat_responsecode: 'R', sunat_description: 'Rechazado' },
      { id_documento: 'F-5', tipo_comprobante: 'FACTURA', serie: 'F001', numero: 5, fecha_emision: '2026-10-05', estado_tecnico: 'ERROR', error_detalle: 'Error real' },
      { id_documento: 'F-6', tipo_comprobante: 'FACTURA', serie: 'F001', numero: 6, estado_tecnico: 'ANULADO' }
    ];
    const sheets = construirResumenMensualFacturacion({ cabeceras }, '2026-10', new Date('2026-11-05T12:00:00Z'));
    const totals = sheets[0];
    const row = totals.rows.find((entry) => entry.tipo === 'FACTURA')!;
    expect(sheets.map((sheet) => sheet.name)).toEqual(['Totales', 'Errores']);
    expect(totals.columns).toHaveLength(8);
    expect(sheets[1].columns).toHaveLength(9);
    expect(row).toMatchObject({ documentos: 5, aceptados: 1, pendientes: 0, errores: 1, rechazados: 1, efectividad: 20 });
    expect(sheets[1].rows).toHaveLength(2);
    expect(sheets[1].rows.some((entry) => entry.observaciones === 'Error real')).toBe(true);
    expect(totals.headerRow).toBe(7);
  });

  it('mantiene encabezado de errores sin datos cuando no existen errores', () => {
    const [, errors] = construirResumenMensualFacturacion({ cabeceras: [] }, '2026-10');
    expect(errors.columns).toHaveLength(9);
    expect(errors.rows).toHaveLength(0);
  });
});
