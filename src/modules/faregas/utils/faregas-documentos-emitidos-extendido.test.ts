import { describe, expect, it } from 'vitest';
import type { DocumentosEmitidosExtendidoResponse, ReporteFinancieroResponse } from '../services/faregas-dashboard.api';
import { construirHojasDocumentosEmitidosExtendido, construirHojasUnificadas } from './faregas-documentos-emitidos-extendido';

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
    expect(cabeceras.columns).toHaveLength(68);
    expect(cabeceras.rows).toHaveLength(2);
    expect(cabeceras.rows[0]).toMatchObject({ numeroDocumento: 'F001-20', total: 118, descuentos: 5, montoPago: 118, items: 2, descripcion: '' });
    expect(cabeceras.columns.map((c) => c.key)).not.toContain('metodoPago');
    expect(cabeceras.columns.map((c) => c.header)).not.toContain('MÉTODO DE PAGO');
    expect(cabeceras.columns.map((c) => c.key)).toContain('horaEmisionComprobante');
    expect(cabeceras.columns.map((c) => c.header)).toContain('HORA DE EMISIÓN DEL COMPROBANTE');
    expect(lineas.columns).toHaveLength(13);
    const lineKeys = lineas.columns.map((c) => c.key);
    expect(lineKeys).not.toContain('documentIds');
    expect(lineKeys).not.toContain('idDetalle');
    expect(lineKeys).not.toContain('operacion');
    expect(lineKeys).not.toContain('venta');
    expect(lineas.rows).toHaveLength(2);
    expect(lineas.rows[0]).toMatchObject({ documento: 'F001-20', totalLinea: 118 });
    expect(cabeceras.title).toContain('Registro de comprobantes');
    expect(cabeceras.headerRow).toBe(7);
    expect(cabeceras.groupHeaders).toHaveLength(7);
  });

  it('mantiene referencias y la ausencia de datos del modelo sin rellenarlos', () => {
    const [cabeceras] = construirHojasDocumentosEmitidosExtendido(sample);
    expect(cabeceras.rows[1]).toMatchObject({ tipo: 'NOTA DE CRÉDITO', numeroReferencia: 'Afecta F001-20 (Facturación 20)' });
    expect(cabeceras.rows[1].fechaVencimiento).toBe('');
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
    expect(sheets).toHaveLength(4);
    expect(sheets[0].name).toBe('Datos_20111111111');
    expect(sheets[0].rows).toHaveLength(1);
    expect(sheets[1].rows).toHaveLength(1);
    expect(sheets[2].name).toBe('Datos_20222222222');
    expect(sheets[3].rows).toHaveLength(1);
  });

  it('FUSIÓN: incluye hoja consolidada sin perder columnas extendido', () => {
    const consolidado = {
      metadatos: { desde: '2026-10-01', hasta: '2026-10-31', fechaGeneracion: '2026-10-31T12:00:00Z', usuarioExportador: 'test', plantas: ['ATE'], razonSocialEmisor: '', rucEmisor: '' },
      operaciones: [], lineas: [], ventasDirectas: [], comprobantes: [], ordenes: [], pagos: [], descuentos: [], ajustes: []
    } as unknown as ReporteFinancieroResponse;
    const unificadas = construirHojasUnificadas(sample, consolidado, '2026-10-01', '2026-10-31');
    expect(unificadas.some((h) => h.name.includes('Consolidado'))).toBe(true);
    expect(unificadas.find((h) => h.name === 'Datos')?.columns).toHaveLength(68);
    // Horas: certificado y comprobante con hora explícita → HH:mm:ss
    const conHora = {
      ...sample,
      cabeceras: [{
        ...sample.cabeceras[0],
        fecha_hora_emision: '2026-10-08T13:15:32Z',
        fecha_hora_emision_comprobante: '2026-10-08T14:20:10Z'
      }]
    };
    const [cab] = construirHojasDocumentosEmitidosExtendido(conHora);
    expect(cab.rows[0]).toMatchObject({
      horaEmisionCertificado: '08:15:32',
      horaEmisionComprobante: '09:20:10'
    });
  });

  it('FUSIÓN COMPLETA: genera las 4 hojas XLSX válidas sin columnas prohibidas y con bytes XLSX', async () => {
    const { crearExcelVariasHojasBytes } = await import('./exportar-excel');
    const consolidadoCompleto: ReporteFinancieroResponse = {
      metadatos: { desde: '2026-10-01', hasta: '2026-10-31', fechaGeneracion: '2026-10-31T12:00:00Z', usuarioExportador: 'tester', plantas: ['ATE'], razonSocialEmisor: 'FAREGAS SAC', rucEmisor: '20123456789' },
      sedes: [{ planta_key: 'ATE', planta_nombre: 'ATE' }],
      operaciones: [
        { id: 10, planta_key: 'ATE', planta_nombre: 'ATE', fecha_creacion: '2026-10-08T10:00:00Z', estado: 'FACTURADO', placa: 'ABC123', importe_total: 100, nombre_cliente_snapshot: 'CLIENTE 1', tipo_documento_cliente_snapshot: 'DNI', documento_cliente_snapshot: '08123456' },
        { id: 20, planta_key: 'ATE', planta_nombre: 'ATE', fecha_creacion: '2026-10-09T10:00:00Z', estado: 'FACTURADO', placa: 'XYZ789', importe_total: 50, nombre_cliente_snapshot: 'CLIENTE 2', tipo_documento_cliente_snapshot: 'RUC', documento_cliente_snapshot: '20500000001' }
      ],
      lineas: [
        // 1. Certificado vendido
        { id: 101, operacion_id: 10, tipo_item: 'SERVICIO', certificado_id: 501, codigo_producto: 'GNV-01', producto: 'CERTIFICADO GNV ANUAL', cantidad: 1, precio_unitario: 100, importe_total: 100, numero_certificado: 'DG-41-000501', tipo_certificado_clave: 'GNV_ANUAL', certificado_estado: 'EMITIDO', numero_chip: 'CHIP999' },
        // 2. Duplicado vendido
        { id: 201, operacion_id: 20, tipo_item: 'DUPLICADO', duplicado_id: 701, duplicado_tipo_nombre: 'DUPLICADO GLP', duplicado_precio: 50, codigo_producto: 'DUP-01', producto: 'DUPLICADO DE CERTIFICADO', cantidad: 1, precio_unitario: 50, importe_total: 50, numero_certificado: 'DG-41-000501', tipo_certificado_clave: 'GLP_ANUAL', certificado_estado: 'EMITIDO' }
      ],
      // 3. Venta independiente de inventario (venta directa)
      ventasDirectas: [
        { id: 30, planta_key: 'ATE', planta_nombre: 'ATE', creado_en: '2026-10-10T12:00:00Z', estado: 'PAGADA', cliente_nombre: 'CLIENTE DIRECTO', cliente_tipo_documento: 'DNI', cliente_nro_documento: '12345678', importe_total: 30, base_imponible: 25.42, igv: 4.58, detalle_id: 301, producto: 'CHIP ADICIONAL', codigo_producto: 'CHIP-AD', cantidad: 1, precio_unitario: 30, importe_detalle: 30 }
      ],
      comprobantes: [
        { id: 1, operacion_id: 10, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 1, nro_comprobante: 'BBB1-00000001', fecha_documento: '2026-10-08', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 100 },
        { id: 2, operacion_id: 20, tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 1, nro_comprobante: 'FFF1-00000001', fecha_documento: '2026-10-09', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 50 },
        { id: 3, venta_id: 30, tipo_comprobante: 'BOLETA', serie: 'BBB1', numero: 2, nro_comprobante: 'BBB1-00000002', fecha_documento: '2026-10-10', estado: 'ACEPTADO', aceptada_sunat: true, importe_total: 30 }
      ],
      ordenes: [
        { id: 11, operacion_id: 10, importe_total: 100 },
        { id: 21, operacion_id: 20, importe_total: 50 },
        { id: 31, venta_id: 30, importe_total: 30 }
      ],
      pagos: [
        { id: 111, orden_pago_id: 11, estado: 'CAN', tipocontado_key: 'EFECTIVO', importe: 100 },
        { id: 211, orden_pago_id: 21, estado: 'CAN', tipocontado_key: 'TARJETA', tipo_tarjeta: 'VISA', importe: 50 },
        { id: 311, orden_pago_id: 31, estado: 'CAN', tipocontado_key: 'TARJETA', tipo_tarjeta: 'YAPE', importe: 30 }
      ],
      descuentos: [],
      ajustes: []
    };

    const unificadas = construirHojasUnificadas(sample, consolidadoCompleto, '2026-10-01', '2026-10-31');
    const nombresHojas = unificadas.map((h) => h.name);

    // 1. Las cinco hojas deben existir exactamente en este orden:
    // Datos, Líneas de productos, Consolidado_Datos, Anulados, Notas de credito
    // Historial y Trazabilidad fueron eliminadas
    expect(nombresHojas).toEqual(['Datos', 'Líneas de productos', 'Consolidado_Datos', 'Anulados', 'Notas de credito']);
    expect(nombresHojas).not.toContain('Trazabilidad');
    expect(nombresHojas).not.toContain('Historial');

    // 2. Líneas de productos tiene 13 columnas y no contiene IDs técnicos
    const hojaLineas = unificadas.find((h) => h.name === 'Líneas de productos')!;
    expect(hojaLineas.columns).toHaveLength(13);
    const lineCols = hojaLineas.columns.map((c) => c.key);
    expect(lineCols).not.toContain('documentIds');
    expect(lineCols).not.toContain('idDetalle');
    expect(lineCols).not.toContain('operacion');
    expect(lineCols).not.toContain('venta');

    // 3. Anulados y Notas de credito existen y no tienen filas de sumatorias
    const hojaAnulados = unificadas.find((h) => h.name === 'Anulados')!;
    expect(hojaAnulados.totalsRow).toBe(false);
    expect(hojaAnulados.rows.some((r) => r.sede === 'TOTAL VENTAS VIGENTES')).toBe(false);
    expect(hojaAnulados.rows.some((r) => r.sede === 'TOTAL PAGADO')).toBe(false);

    const hojaNotasCredito = unificadas.find((h) => h.name === 'Notas de credito')!;
    expect(hojaNotasCredito.totalsRow).toBe(false);

    // 4. Consolidado_Datos NO reincorpora "Precio unitario" ni "Subtotal registrado"
    const hojaConsolidado = unificadas.find((h) => h.name === 'Consolidado_Datos')!;
    const keysColumnas = hojaConsolidado.columns.map((c) => c.key);
    const headersColumnas = hojaConsolidado.columns.map((c) => c.header.toLowerCase());

    expect(keysColumnas).not.toContain('precioUnitario');
    expect(keysColumnas).not.toContain('subtotalRegistrado');
    expect(headersColumnas.some((h) => h.includes('precio unitario'))).toBe(false);
    expect(headersColumnas.some((h) => h.includes('subtotal registrado'))).toBe(false);
    expect(hojaConsolidado.totalsRow).toBe(true);

    // 5. Generación real de bytes XLSX
    const bytes = await crearExcelVariasHojasBytes(unificadas);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);
    // Verificación de firma ZIP (PK.. -> 0x50, 0x4B, 0x03, 0x04)
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4B);
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
  });

  it('clasifica facturas a crédito con N cuotas en hoja Datos (Fase 3)', () => {
    const dataCredito: DocumentosEmitidosExtendidoResponse = {
      cabeceras: [
        // Factura 2 cuotas (caso FFF1-23)
        {
          id_documento: 'F-1044', fecha_emision: '2026-11-10T05:00:00Z', empresa_emisora: 'I.T.V. CAMBRIDGE S.A.C.',
          ruc_emisor: '20600444531', sede: 'SURCO', tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 23,
          cliente: 'ELDER', tipo_documento: 'RUC', numero_documento: '20552103816', moneda: 'PEN',
          base_imponible: 152.54, igv: 27.46, importe_total: 180, estado: 'ACEPTADO', proveedor: 'NUBEFACT',
          aceptada_sunat: true, condicion_pago: 'CREDITO', cuotas_count: 2, max_cuota: 2,
          tipo_pago: 'CRÉDITO', forma_pago: '2 CUOTAS'
        },
        // Factura 1 cuota
        {
          id_documento: 'F-593', fecha_emision: '2026-11-10T05:00:00Z', empresa_emisora: 'I.T.V. CAMBRIDGE S.A.C.',
          ruc_emisor: '20600444531', sede: 'SURCO', tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 7,
          cliente: 'CLIENTE 1C', tipo_documento: 'RUC', numero_documento: '20552103816', moneda: 'PEN',
          base_imponible: 76.27, igv: 13.73, importe_total: 90, estado: 'ACEPTADO', proveedor: 'NUBEFACT',
          aceptada_sunat: true, condicion_pago: 'CREDITO', cuotas_count: 1, max_cuota: 1
        },
        // Factura 3 cuotas
        {
          id_documento: 'F-630', fecha_emision: '2026-11-10T05:00:00Z', empresa_emisora: 'I.T.V. CAMBRIDGE S.A.C.',
          ruc_emisor: '20600444531', sede: 'SURCO', tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 11,
          cliente: 'CLIENTE 3C', tipo_documento: 'RUC', numero_documento: '20552103816', moneda: 'PEN',
          base_imponible: 76.27, igv: 13.73, importe_total: 90, estado: 'ACEPTADO', proveedor: 'NUBEFACT',
          aceptada_sunat: true, condicion_pago: 'CREDITO', cuotas_count: 3, max_cuota: 3
        }
      ],
      lineas: []
    };

    const [datos] = construirHojasDocumentosEmitidosExtendido(dataCredito, '2026-11-01', '2026-11-30');
    expect(datos.rows).toHaveLength(3);

    // Caso FFF1-23 / F-1044: 2 cuotas
    expect(datos.rows[0]).toMatchObject({
      numeroDocumento: 'FFF1-23',
      tipoPago: 'CRÉDITO',
      formaPago: '2 CUOTAS',
      total: 180
    });

    // Caso 1 cuota: 1 CUOTA
    expect(datos.rows[1]).toMatchObject({
      numeroDocumento: 'FFF1-7',
      tipoPago: 'CRÉDITO',
      formaPago: '1 CUOTA',
      total: 90
    });

    // Caso 3 cuotas: 3 CUOTAS
    expect(datos.rows[2]).toMatchObject({
      numeroDocumento: 'FFF1-11',
      tipoPago: 'CRÉDITO',
      formaPago: '3 CUOTAS',
      total: 90
    });
  });

  it('clasifica FFF1-26 con TARJETA / PLIN y no muestra código 8 ni MÉTODO DE PAGO', () => {
    const dataTarjeta: DocumentosEmitidosExtendidoResponse = {
      cabeceras: [
        {
          id_documento: 'F-1055', fecha_emision: '2026-11-10T05:00:00Z', empresa_emisora: 'I.T.V. CAMBRIDGE S.A.C.',
          ruc_emisor: '20600444531', sede: 'SURCO', tipo_comprobante: 'FACTURA', serie: 'FFF1', numero: 26,
          cliente: 'HIMAN', tipo_documento: 'RUC', numero_documento: '10310424710', moneda: 'PEN',
          base_imponible: 84.75, igv: 15.25, importe_total: 100, estado: 'ACEPTADO', proveedor: 'NUBEFACT',
          aceptada_sunat: true, condicion_pago: 'CONTADO', tipo_pago: 'TARJETA', forma_pago: '8',
          monto_pagado: 100, referencia_pago: '1235'
        }
      ],
      lineas: []
    };

    const [datos] = construirHojasDocumentosEmitidosExtendido(dataTarjeta, '2026-11-01', '2026-11-30');
    expect(datos.columns.map((c) => c.key)).not.toContain('metodoPago');
    expect(datos.columns.map((c) => c.header)).not.toContain('MÉTODO DE PAGO');

    const fila26 = datos.rows[0];
    expect(fila26).toMatchObject({
      numeroDocumento: 'FFF1-26',
      tipoPago: 'TARJETA',
      formaPago: 'PLIN',
      montoPago: 100,
      referenciaPago: '1235'
    });
    expect(fila26.formaPago).not.toBe('8');
  });

  it('verifica las horas independientes de certificado y comprobante para los casos del 11/11/2026', () => {
    const dataCasos11: DocumentosEmitidosExtendidoResponse = {
      cabeceras: [
        {
          id_documento: 'F-1076', serie: 'BBB1', numero: 306, tipo_comprobante: 'BOLETA',
          certificado_id: 782, certificados: '000782',
          fecha_hora_emision: '2026-11-11T14:49:30.544Z',
          fecha_hora_emision_comprobante: '2026-11-11T14:49:30.435Z',
          estado: 'ACEPTADO', certificado_estado: 'EMITIDO'
        },
        {
          id_documento: 'F-1078', serie: 'BBB1', numero: 307, tipo_comprobante: 'BOLETA',
          certificado_id: 783, certificados: '000783',
          fecha_hora_emision: '2026-11-11T14:51:06.958Z',
          fecha_hora_emision_comprobante: '2026-11-11T14:51:06.874Z',
          estado: 'ACEPTADO', certificado_estado: 'EMITIDO'
        },
        {
          id_documento: 'F-1081', serie: 'BBB1', numero: 308, tipo_comprobante: 'BOLETA',
          certificado_id: 785, certificados: '000785',
          fecha_hora_emision: '2026-11-11T16:14:55.317Z',
          fecha_hora_emision_comprobante: '2026-11-11T16:14:55.230Z',
          estado: 'ACEPTADO', certificado_estado: 'EMITIDO'
        },
        {
          id_documento: 'F-1086', serie: 'FFF1', numero: 30, tipo_comprobante: 'FACTURA',
          certificado_id: null, certificados: '000684-DUP',
          fecha_hora_emision: null,
          fecha_hora_emision_comprobante: '2026-11-11T16:17:50.114Z',
          estado: 'ACEPTADO'
        },
        {
          id_documento: 'F-1085', serie: 'BBB1', numero: 309, tipo_comprobante: 'BOLETA',
          certificado_id: null, certificados: null,
          fecha_hora_emision: null,
          fecha_hora_emision_comprobante: '2026-11-11T16:17:12.863Z',
          estado: 'ACEPTADO'
        }
      ],
      lineas: []
    };

    const [datos] = construirHojasDocumentosEmitidosExtendido(dataCasos11, '2026-11-11', '2026-11-11');
    const porDoc = new Map(datos.rows.map((r) => [r.numeroDocumento, r]));

    // BBB1-306
    expect(porDoc.get('BBB1-306')).toMatchObject({
      horaEmisionCertificado: '09:49:30',
      horaEmisionComprobante: '09:49:30'
    });

    // BBB1-307
    expect(porDoc.get('BBB1-307')).toMatchObject({
      horaEmisionCertificado: '09:51:06',
      horaEmisionComprobante: '09:51:06'
    });

    // BBB1-308
    expect(porDoc.get('BBB1-308')).toMatchObject({
      horaEmisionCertificado: '11:14:55',
      horaEmisionComprobante: '11:14:55'
    });

    // FFF1-30: duplicado, certificado histórico sin hora registrada, comprobante emitido a las 11:17:50
    expect(porDoc.get('FFF1-30')).toMatchObject({
      horaEmisionCertificado: 'SIN REGISTRO',
      horaEmisionComprobante: '11:17:50'
    });

    // BBB1-309: venta de chip (sin certificado), comprobante emitido a las 11:17:12
    expect(porDoc.get('BBB1-309')).toMatchObject({
      horaEmisionCertificado: '',
      horaEmisionComprobante: '11:17:12'
    });
  });
});
