import { describe, expect, it } from 'vitest';
import type { DocumentosEmitidosExtendidoResponse } from '../services/faregas-dashboard.api';
import { construirHojasDocumentosEmitidosExtendido } from './faregas-documentos-emitidos-extendido';

const sample: DocumentosEmitidosExtendidoResponse = {
  cabeceras: [
    { id_documento: 'F-20', fecha_emision: '2026-10-08T05:00:00Z', empresa_emisora: 'FAREGAS', ruc_emisor: '20123456789', sede: 'ATE', tipo_comprobante: 'FACTURA', serie: 'F001', numero: 20, cliente: 'Cliente Uno', tipo_documento: 'RUC', numero_documento: '20999999991', moneda: 'PEN', base_imponible: 100, igv: 18, importe_total: 118, descuento: 5, estado: 'ACEPTADO', proveedor: 'NUBEFACT', aceptada_sunat: true, tipos_producto: 'GLP', certificados: 'GLP-2026-1', placas: 'ABC-123', orden_comercial: '300', medios_pago: 'Visa', monto_pagado: 118, notas_credito: 'FC01-4', referencia_afectada: '' },
    { id_documento: 'C-4', fecha_emision: null, fecha_aceptacion: '2026-10-09T05:00:00Z', fecha_emision_fuente: 'EMISIÓN NO REGISTRADA; PERÍODO SEGÚN ACEPTACIÓN', empresa_emisora: 'FAREGAS', sede: 'ATE', tipo_comprobante: 'NOTA DE CRÉDITO', serie: 'FC01', numero: 4, cliente: 'Cliente Uno', tipo_documento: 'RUC', numero_documento: '20999999991', moneda: 'PEN', base_imponible: 10, igv: 1.8, importe_total: 11.8, estado: 'ACEPTADO', proveedor: 'NUBEFACT', aceptada_sunat: true, referencia_afectada: 'Afecta F001-20 (Facturación 20)' }
  ],
  lineas: [
    { id_detalle: 1, operacion_id: 30, documentos_asociados: 'F001-20', sede: 'ATE', tipo_producto: 'GLP', codigo_producto: 'GLP-01', producto: 'Certificado GLP', unidad: 'NIU', cantidad: 1, precio_unitario: 100, base_imponible: 100, igv: 18, importe_total: 118, certificado: 'GLP-2026-1', placa: 'ABC-123' },
    { id_detalle: 2, operacion_id: 30, documentos_asociados: 'F001-20', sede: 'ATE', tipo_producto: 'Chips', codigo_producto: 'CH-01', producto: 'Chip', unidad: 'NIU', cantidad: 1, precio_unitario: 20, base_imponible: 20, igv: 3.6, importe_total: 23.6 }
  ]
};

describe('Documentos emitidos — Extendido', () => {
  it('conserva la estructura de 56 campos y un solo total por comprobante', () => {
    const [cabeceras, lineas] = construirHojasDocumentosEmitidosExtendido(sample, '2026-10-01', '2026-10-31');
    expect(cabeceras.name).toBe('Datos');
    expect(cabeceras.columns).toHaveLength(56);
    expect(cabeceras.rows).toHaveLength(2);
    expect(cabeceras.rows[0]).toMatchObject({ numeroDocumento: 'F001-20', total: 118, descuentos: 5, metodoPago: 'Visa', montoPago: 118, items: 2, descripcion: '' });
    expect(lineas.rows).toHaveLength(2);
    expect(lineas.rows[0]).toMatchObject({ documento: 'F001-20', totalLinea: 118 });
    expect(cabeceras.title).toContain('Registro de comprobantes');
    expect(cabeceras.headerRow).toBe(7);
    expect(cabeceras.groupHeaders).toHaveLength(8);
  });

  it('mantiene referencias y la ausencia de datos del modelo sin rellenarlos', () => {
    const [cabeceras] = construirHojasDocumentosEmitidosExtendido(sample);
    expect(cabeceras.rows[1]).toMatchObject({ tipo: 'NOTA DE CRÉDITO', numeroReferencia: 'Afecta F001-20 (Facturación 20)' });
    expect(cabeceras.rows[1].fechaVencimiento).toBe('');
    const trace = construirHojasDocumentosEmitidosExtendido(sample)[2];
    expect(trace.rows[1]).toMatchObject({ fecha: '', fechaAceptacion: expect.any(String), fuente: 'EMISIÓN NO REGISTRADA; PERÍODO SEGÚN ACEPTACIÓN' });
  });

  it('separa emisores distintos sin mezclar cabeceras ni líneas', () => {
    const sheets = construirHojasDocumentosEmitidosExtendido({
      cabeceras: [
        { id_documento: 'F-1', ruc_emisor: '20111111111', empresa_emisora: 'A', serie: 'F001', numero: 1, tipo_comprobante: 'FACTURA' },
        { id_documento: 'F-2', ruc_emisor: '20222222222', empresa_emisora: 'B', serie: 'F001', numero: 1, tipo_comprobante: 'FACTURA' }
      ],
      lineas: [
        { id_detalle: 1, documentos_ids: 'F-1', documentos_asociados: 'F001-1', producto: 'A', importe_total: 1 },
        { id_detalle: 2, documentos_ids: 'F-2', documentos_asociados: 'F001-1', producto: 'B', importe_total: 2 }
      ]
    });
    expect(sheets).toHaveLength(6);
    expect(sheets[0].name).toBe('Datos_20111111111');
    expect(sheets[0].rows).toHaveLength(1);
    expect(sheets[1].rows).toHaveLength(1);
    expect(sheets[3].name).toBe('Datos_20222222222');
    expect(sheets[4].rows).toHaveLength(1);
  });
});
