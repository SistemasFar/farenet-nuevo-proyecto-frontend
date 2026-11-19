import { describe, it, expect } from 'vitest';
import { evaluarSpotWizard, validarPasoPago, resolverCuotasCredito } from './faregas-wizard.validation';

const servicioSpot037 = { sujetoDetraccion: true, codigoSpot: '037', porcentajeSpot: 12 };

describe('FAREGAS — SPOT Detracciones (SUNAT RS 183-2004) en Wizard de Pagos', () => {

  it('1. Caso BOLETA de S/ 1,260.00: No aplica SPOT y exige pago íntegro de S/ 1,260.00', () => {
    const evaluacion = evaluarSpotWizard({
      tipoComprobante: 'BOLETA',
      total: 1260.00,
    });

    expect(evaluacion.aplica).toBe(false);
    expect(evaluacion.montoDetraccion).toBe(0);
    expect(evaluacion.netoCobrar).toBe(1260.00);
    expect(evaluacion.motivoExclusion).toBe('BOLETA_VENTA_CONSUMIDOR_FINAL_NO_SUJETA');

    // Validación si cliente paga neto 1109 -> Falta pagar 151
    const erroresIncompleto = validarPasoPago({
      tipoComprobante: 'BOLETA',
      condicionPago: 'CONTADO',
      pagos: [{ importe: 1109.00 }],
      precioTotal: 1260.00,
    });
    expect(erroresIncompleto.pagos).toContain('El pago debe completar S/ 1260.00. Saldo pendiente: S/ 151.00.');

    // Validación si cliente paga 1260 completo -> Pasa limpio
    const erroresCompleto = validarPasoPago({
      tipoComprobante: 'BOLETA',
      condicionPago: 'CONTADO',
      pagos: [{ importe: 1260.00 }],
      precioTotal: 1260.00,
    });
    expect(erroresCompleto.pagos).toBeUndefined();
  });

  it('2. Caso FACTURA de S/ 1,260.00: Aplica SPOT 12%, detracción S/ 151.00 y neto S/ 1,109.00', () => {
    const evaluacion = evaluarSpotWizard({
      tipoComprobante: 'FACTURA',
      total: 1260.00,
      servicio: servicioSpot037,
    });

    expect(evaluacion.aplica).toBe(true);
    expect(evaluacion.porcentaje).toBe(12);
    expect(evaluacion.codigoSpot).toBe('037');
    // Math.round(1260 * 0.12) = 151.00
    expect(evaluacion.montoDetraccion).toBe(151.00);
    // 1260 - 151 = 1109.00
    expect(evaluacion.netoCobrar).toBe(1109.00);

    // Validación: Pagar el neto de S/ 1,109.00 completa la operación ordinaria sin exigir 1,260.00
    const erroresNeto = validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CONTADO',
      pagos: [{ importe: 1109.00 }],
      precioTotal: 1260.00,
      spotServicio: servicioSpot037,
    });
    expect(erroresNeto.pagos).toBeUndefined();

    // Si paga menos de 1109, por ejemplo 1000 -> Falta pagar 109
    const erroresMenor = validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CONTADO',
      pagos: [{ importe: 1000.00 }],
      precioTotal: 1260.00,
      spotServicio: servicioSpot037,
    });
    expect(erroresMenor.pagos).toContain('Saldo pendiente: S/ 109.00.');
  });

  it('3. Caso FACTURA a CRÉDITO puro con SPOT: financia el neto sin pago inicial', () => {
    const cuotasResueltas = resolverCuotasCredito({
      condicionPago: 'CREDITO',
      tipoComprobante: 'FACTURA',
      pagos: [],
      precioTotal: 1260.00,
      fechaVencimientoCredito: '2026-12-31',
      spotServicio: servicioSpot037,
    });

    // El neto luego de SPOT se financia completo; el pago en caja sigue en cero.
    expect(cuotasResueltas).toHaveLength(1);
    expect(cuotasResueltas[0].importe).toBe('1109.00');

    const errores = validarPasoPago({
      condicionPago: 'CREDITO',
      tipoComprobante: 'FACTURA',
      pagos: [],
      precioTotal: 1260.00,
      fechaInicioCredito: '2026-11-13',
      fechaVencimientoCredito: '2026-12-31',
      cuotas: cuotasResueltas,
      spotServicio: servicioSpot037,
    });
    expect(errores.pagos).toBeUndefined();
    expect(errores.cuotas).toBeUndefined();
    expect(resolverCuotasCredito({
      condicionPago: 'CREDITO', tipoComprobante: 'FACTURA', pagos: [{ importe: 109 }],
      precioTotal: 1260, fechaVencimientoCredito: '2026-12-31', spotServicio: servicioSpot037,
    })).toEqual([]);
  });

  it('4. Factura <= S/ 700.00 (Caso S/ 500.00): No aplica SPOT', () => {
    const evaluacion = evaluarSpotWizard({
      tipoComprobante: 'FACTURA',
      total: 500.00,
    });
    expect(evaluacion.aplica).toBe(false);
    expect(evaluacion.montoDetraccion).toBe(0);
    expect(evaluacion.netoCobrar).toBe(500.00);
    expect(evaluacion.motivoExclusion).toBe('BAJO_UMBRAL_COMERCIAL');
  });

  it('5. Operación de CORTESÍA (Total 0): No aplica SPOT', () => {
    const evaluacion = evaluarSpotWizard({
      tipoComprobante: 'FACTURA',
      total: 0,
      esCortesia: true,
    });
    expect(evaluacion.aplica).toBe(false);
    expect(evaluacion.montoDetraccion).toBe(0);
    expect(evaluacion.netoCobrar).toBe(0);
  });

});

