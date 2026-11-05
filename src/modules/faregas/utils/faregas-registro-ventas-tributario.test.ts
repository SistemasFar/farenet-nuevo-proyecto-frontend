import { describe, expect, it } from 'vitest';
import { construirHojasRegistroVentasTributario } from './faregas-registro-ventas-tributario';

describe('registro tributario de revisión', () => {
  it('genera las 35 columnas, signos de NC y deja vacías clasificaciones sin fuente', () => {
    const data = { documentos: [
      { id_documento: 'F-1', tipo_comprobante: 'FACTURA', fecha_emision: '2026-11-02', fecha_vencimiento: '2026-12-02', serie: 'F001', numero: 15, cliente: 'Cliente', tipo_documento: 'RUC', numero_documento: '20111111111', base_imponible: '100', igv: '18', importe_total: '118', moneda: 'sol', datos_fiscales: { total_gravada: 100 }, estado_tecnico: 'PENDIENTE_SUNAT', aceptada_sunat: false, empresa_emisora: 'Faregas', ruc_emisor: '20123456789' },
      { id_documento: 'C-2', tipo_comprobante: 'NOTA DE CRÉDITO', clase_documento: 'NOTA DE CRÉDITO', fecha_emision: null, fecha_aceptacion: '2026-11-05', serie: 'FC01', numero: 2, serie_afectada: 'F001', numero_afectado: '15', base_imponible: 10, igv: 1.8, importe_total: 11.8, datos_fiscales: {}, estado_tecnico: 'ACEPTADO', aceptada_sunat: true, empresa_emisora: 'Faregas', ruc_emisor: '20123456789' }
    ] };
    const [registro] = construirHojasRegistroVentasTributario(data, '2026-11');
    expect(registro.name).toBe('Hoja1');
    expect(registro.columns).toHaveLength(35);
    expect(registro.rows).toHaveLength(2);
    expect(registro.rows[0]).toMatchObject({ periodo: '202611', correlativo: 'F-1', base: 100, igv: 18, fechaVencimiento: '2026-12-02', exportacion: '', secuencia: '' });
    expect(registro.rows[1]).toMatchObject({ serie: 'FC01', fechaEmision: '', base: -10, igv: -1.8, total: -11.8, serieReferencia: 'F001', numeroReferencia: '15' });
    expect(registro.rows[1].estado).toContain('PERÍODO SEGÚN ACEPTACIÓN 2026-11-05');
    expect(registro.headerRow).toBe(7);
    expect(registro.numberColumnsRow).toBe(true);
  });

  it('separa RUC distintos en hojas distintas y no usa datos ajenos como moneda', () => {
    const sheets = construirHojasRegistroVentasTributario({ documentos: [
      { id_documento: '1', ruc_emisor: '20111111111', moneda: 'PEN' }, { id_documento: '2', ruc_emisor: '20222222222', moneda: 'USD' }
    ] }, '2026-10');
    expect(sheets).toHaveLength(2);
    expect(sheets[0].rows[0].moneda).toBe('PEN');
    expect(sheets[1].rows[0].moneda).toBe('USD');
  });
});
