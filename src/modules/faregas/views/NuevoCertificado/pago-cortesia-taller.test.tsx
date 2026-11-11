import { describe, it, expect } from 'vitest';
import { validarPasoPago } from './faregas-wizard.validation';
import { clasificarPagos, construirHojasDocumentosEmitidosExtendido } from '../../utils/faregas-documentos-emitidos-extendido';
import { clasificarMediosPago, construirHojasReporteFinanciero } from '../../utils/faregas-reporte-financiero';

describe('FAREGAS — Modalidad CORTESÍA para todos los certificados', () => {
  it('1. validarPasoPago: admite operación gratuita de cortesía con totalPagado = 0 y precioTotal = 0', () => {
    const errores = validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CONTADO',
      pagos: [],
      precioTotal: 0,
      esCortesia: true,
    });
    expect(errores).toEqual({});
  });

  it('2. validarPasoPago: rechaza cortesía si se intenta ingresar pagos monetarios', () => {
    const errores = validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CONTADO',
      pagos: [{ tipo: 'efectivo', importe: 50 }],
      precioTotal: 0,
      esCortesia: true,
    });
    expect(errores.pagos).toContain('no admite pagos');
  });

  it('3. validarPasoPago: rechaza cortesía si la condición de pago es CRÉDITO', () => {
    const errores = validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CREDITO',
      pagos: [],
      precioTotal: 0,
      fechaInicioCredito: '2026-11-10',
      fechaVencimientoCredito: '2026-12-10',
      cuotas: [{ numeroCuota: 1, fechaPago: '2026-12-10', importe: 0 }],
      esCortesia: true,
    });
    expect(errores.pagos).toContain('no admite condición a crédito');
  });

  it('4. clasificarPagos (Hoja Datos): clasifica operación como CORTESÍA / CORTESÍA', () => {
    const res = clasificarPagos([], 0, 0, { esCortesia: true });
    expect(res.tipoPago).toBe('CORTESÍA');
    expect(res.formaPago).toBe('CORTESÍA');
  });

  it('5. clasificarMediosPago (Hoja Consolidado_Datos): clasifica operación como CORTESÍA / CORTESÍA', () => {
    const res = clasificarMediosPago([], 0, 0, { esCortesia: true });
    expect(res.tipoPago).toBe('CORTESÍA');
    expect(res.formaPago).toBe('CORTESÍA');
  });

  it('6. construirHojasDocumentosEmitidosExtendido: Hoja Datos muestra TIPO=CORTESÍA, FORMA=CORTESÍA, MONTO=0', () => {
    const dataMock: any = {
      cabeceras: [
        {
          id_documento: 'F-999',
          tipo_comprobante: 'FACTURA',
          serie: 'FFF1',
          numero: 99,
          fecha_documento: '2026-11-10',
          ruc_emisor: '20100000001',
          empresa_emisora: 'FAREGAS SAC',
          base_imponible: 0,
          igv: 0,
          importe_total: 0,
          descuento: 350,
          tipo_descuento: 'CONVENIO',
          condicion_pago: 'CONTADO',
          es_cortesia: true,
          monto_pagado: 0,
          referencia_pago: '',
        }
      ],
      lineas: []
    };

    const hojas = construirHojasDocumentosEmitidosExtendido(dataMock, '2026-11-10', '2026-11-10');
    const hojaDatos = hojas.find((h) => h.name.startsWith('Datos'));
    expect(hojaDatos).toBeDefined();
    const fila = hojaDatos!.rows[0];
    expect(fila.tipoPago).toBe('CORTESÍA');
    expect(fila.formaPago).toBe('CORTESÍA');
    expect(fila.montoPago).toBe(0);
  });

  it('7. construirHojasReporteFinanciero: Hoja Consolidado_Datos muestra Tipo/Forma CORTESÍA, pagado=0, saldo=0 e importeConsiderado=0', () => {
    const reporteMock: any = {
      metadatos: {
        desde: '2026-11-10',
        hasta: '2026-11-10',
        plantas: ['SURQUILLO'],
        usuarioExportador: 'Tester'
      },
      ventasDirectas: [],
      operaciones: [
        {
          id: 500,
          key: 'OP-500',
          idOperacion: 500,
          planta_key: 'SURQUILLO',
          planta_nombre: 'Surquillo',
          estado: 'FACTURADO',
          fecha_creacion: '2026-11-10',
          importe_total: 0,
        }
      ],
      lineas: [
        {
          operacion_id: 500,
          tipo_item: 'SERVICIO',
          producto: 'CERTIFICACION DE TALLER',
          tipo_certificado_clave: 'TALLER_0423',
          cantidad: 1,
          precio_unitario: 350,
          importe_total: 0,
          certificado_id: 888,
          numero_certificado: 'DT-01-0001',
          certificado_estado: 'EMITIDO',
        }
      ],
      comprobantes: [
        {
          id: 777,
          operacion_id: 500,
          tipo_comprobante: 'FACTURA',
          serie: 'FFF1',
          numero: 100,
          fecha_documento: '2026-11-10',
          estado: 'ACEPTADO',
          condicion_pago: 'CONTADO',
          base_imponible: 0,
          igv: 0,
          importe_total: 0,
          es_cortesia: true,
        }
      ],
      ordenes: [
        {
          id: 600,
          operacion_id: 500,
          importe_total: 0,
          importe_pagado: 0,
          saldo_pendiente: 0,
          estado: 'PAGADO',
          formapago_key: 'contado',
        }
      ],
      pagos: [],
      descuentos: [
        {
          operacion_id: 500,
          certificado_id: 888,
          codigo: 'CORTESIA_FAREGAS',
          nombre_descuento: 'CORTESÍA FAREGAS',
          tipo_descuento: 'PROMOCION',
          importe_descuento: 350,
          estado: 'APLICADO',
        }
      ]
    };

    const hojas = construirHojasReporteFinanciero(reporteMock);
    const hojaConsolidado = hojas.find((h) => h.name.includes('Consolidado'));
    expect(hojaConsolidado).toBeDefined();

    // La primera fila corresponde a la operación comercial emitida
    const filaOp = hojaConsolidado!.rows[0];
    expect(filaOp.tipoPago).toBe('CORTESÍA');
    expect(filaOp.formaPago).toBe('CORTESÍA');
    expect(filaOp.importePagado).toBe(0);
    expect(filaOp.saldoPendiente).toBe(0);
    expect(filaOp.importeConsiderado).toBe(0);
    expect(filaOp.cortesiaDescuento).toBe('CORTESÍA');
    expect(filaOp.motivoExclusion).toBe('CORTESÍA');
  });

  it('8. no clasifica como cortesía un descuento ordinario del 100 %', () => {
    const reporteMock: any = {
      metadatos: { desde: '2026-11-10', hasta: '2026-11-10', plantas: ['SURCO'], usuarioExportador: 'Tester' },
      ventasDirectas: [],
      operaciones: [{ id: 1, key: 'OP-1', planta_key: 'SURCO', importe_total: 0, estado: 'FACTURADO' }],
      lineas: [{ operacion_id: 1, importe_total: 0, precio_unitario: 80, cantidad: 1 }],
      comprobantes: [{ id: 1, operacion_id: 1, importe_total: 0, condicion_pago: 'CONTADO' }],
      ordenes: [{ id: 1, operacion_id: 1, importe_total: 0, importe_pagado: 0, saldo_pendiente: 0 }],
      pagos: [],
      descuentos: [{ operacion_id: 1, codigo: 'PROMO_100', importe_descuento: 80 }]
    };
    const fila = construirHojasReporteFinanciero(reporteMock)[0].rows[0];
    expect(fila.cortesiaDescuento).not.toBe('CORTESÍA');
  });
});
