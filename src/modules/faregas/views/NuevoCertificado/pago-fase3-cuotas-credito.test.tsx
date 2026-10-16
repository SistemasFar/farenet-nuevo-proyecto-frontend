import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PagoStep } from './components/NuevoCertificado/PagoStep';
import { resolverCuotasCredito, validarPasoPago } from './faregas-wizard.validation';
import {
  distribuirCuotasAutomaticas,
  generarFechasDistribuidas,
  GestorCuotasCredito
} from '../components/GestorCuotasCredito';

describe('FAREGAS - Fase 3: Pruebas Exhaustivas de Cuotas y Crédito', () => {

  // ---------------------------------------------------------------------------
  // 1. Una cuota de S/ 90.00
  // ---------------------------------------------------------------------------
  it('1. Caso 1 cuota: distribuye S/ 90.00 en 1 cuota única y valida correctamente', () => {
    const cuotas = distribuirCuotasAutomaticas(90.00, 1, '2026-05-01', '2026-05-30');
    expect(cuotas).toHaveLength(1);
    expect(cuotas[0].numeroCuota).toBe(1);
    expect(cuotas[0].importe).toBe('90.00');
    expect(cuotas[0].fechaPago).toBe('2026-05-30');

    const errores = validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CREDITO',
      pagos: [],
      precioTotal: 90.00,
      fechaInicioCredito: '2026-05-01',
      fechaVencimientoCredito: '2026-05-30',
      cuotas,
    });
    expect(errores).toEqual({});

    const html = renderToStaticMarkup(
      <PagoStep
        pagoTab="EFECTIVO"
        setPagoTab={() => undefined}
        formPago={{ importe: '', tarjetaKey: '', entidadFinancieraKey: '' }}
        setFormPago={() => undefined}
        pagosAgregados={[]}
        handleAgregarPago={() => undefined}
        eliminarPago={() => undefined}
        totalPagar={90}
        tipoComprobante="FACTURA"
        condicionPago="CREDITO"
        onCondicionPagoChange={() => undefined}
        fechaInicioCredito="2026-05-01"
        fechaVencimientoCredito="2026-05-30"
        cuotasCredito={cuotas}
        onCuotasCreditoChange={() => undefined}
        onFechaInicioCreditoChange={() => undefined}
        onFechaVencimientoCreditoChange={() => undefined}
      />
    );
    expect(html).toContain('001');
    expect(html).toContain('90.00');
    expect(html).toContain('cuadran exactamente con el saldo financiado');
  });

  // ---------------------------------------------------------------------------
  // 2. Dos cuotas de S/ 45.00
  // ---------------------------------------------------------------------------
  it('2. Caso 2 cuotas: distribuye S/ 90.00 en dos cuotas iguales de S/ 45.00', () => {
    const cuotas = distribuirCuotasAutomaticas(90.00, 2, '2026-05-01', '2026-05-30');
    expect(cuotas).toHaveLength(2);
    expect(cuotas[0].numeroCuota).toBe(1);
    expect(cuotas[0].importe).toBe('45.00');
    expect(cuotas[1].numeroCuota).toBe(2);
    expect(cuotas[1].importe).toBe('45.00');
    expect(cuotas[1].fechaPago).toBe('2026-05-30');

    const errores = validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CREDITO',
      pagos: [],
      precioTotal: 90.00,
      fechaInicioCredito: '2026-05-01',
      fechaVencimientoCredito: '2026-05-30',
      cuotas,
    });
    expect(errores).toEqual({});
  });

  // ---------------------------------------------------------------------------
  // 3. Tres cuotas de S/ 30.00 y absorción de residuos de centavos
  // ---------------------------------------------------------------------------
  it('3. Caso 3 cuotas: distribuye S/ 90.00 en 3 de S/ 30.00 y absorbe residuos en última cuota', () => {
    const cuotas = distribuirCuotasAutomaticas(90.00, 3, '2026-05-01', '2026-05-30');
    expect(cuotas).toHaveLength(3);
    expect(cuotas[0].importe).toBe('30.00');
    expect(cuotas[1].importe).toBe('30.00');
    expect(cuotas[2].importe).toBe('30.00');

    const sumaExacta = cuotas.reduce((acc, c) => acc + Number(c.importe), 0);
    expect(sumaExacta).toBe(90.00);

    // Verificación de absorción de centavos en la última cuota (S/ 100.00 en 3 cuotas)
    const cuotasConResiduo = distribuirCuotasAutomaticas(100.00, 3, '2026-05-01', '2026-05-30');
    expect(cuotasConResiduo[0].importe).toBe('33.33');
    expect(cuotasConResiduo[1].importe).toBe('33.33');
    expect(cuotasConResiduo[2].importe).toBe('33.34');
    const sumaConResiduo = cuotasConResiduo.reduce((acc, c) => acc + Number(c.importe), 0);
    expect(sumaConResiduo).toBe(100.00);
  });

  // ---------------------------------------------------------------------------
  // 4. Crédito parcial: inicial S/ 30.00 y dos cuotas de S/ 30.00
  // ---------------------------------------------------------------------------
  it('4. Crédito parcial: inicial de S/ 30.00 deja saldo de S/ 60.00 distribuible en cuotas', () => {
    const pagos = [{ id: 101, importe: '30.00', tipo: 'EFECTIVO' as const }];
    const totalPagar = 90.00;
    const pagado = pagos.reduce((s, p) => s + Number(p.importe), 0);
    const saldoAFinanciar = totalPagar - pagado; // 60.00

    expect(saldoAFinanciar).toBe(60.00);

    const cuotas = distribuirCuotasAutomaticas(saldoAFinanciar, 2, '2026-05-01', '2026-05-30');
    expect(cuotas).toHaveLength(2);
    expect(cuotas[0].importe).toBe('30.00');
    expect(cuotas[1].importe).toBe('30.00');

    const errores = validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CREDITO',
      pagos,
      precioTotal: totalPagar,
      fechaInicioCredito: '2026-05-01',
      fechaVencimientoCredito: '2026-05-30',
      cuotas,
    });
    expect(errores).toEqual({});
  });

  // ---------------------------------------------------------------------------
  // 5. Cambio de crédito a contado
  // ---------------------------------------------------------------------------
  it('5. Cambio de crédito a contado exige pago total completo y no cuotas', () => {
    // Si la condición es CONTADO y no se ha pagado, debe arrojar error
    const erroresIncompleto = validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CONTADO',
      pagos: [{ importe: '50.00' }],
      precioTotal: 90.00,
      cuotas: [],
    });
    expect(erroresIncompleto.pagos).toContain('El pago debe completar S/ 90.00');

    // Con pago completo al contado
    const erroresCompleto = validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CONTADO',
      pagos: [{ importe: '90.00' }],
      precioTotal: 90.00,
      cuotas: [],
    });
    expect(erroresCompleto).toEqual({});
  });

  // ---------------------------------------------------------------------------
  // 6. Recuperación del borrador
  // ---------------------------------------------------------------------------
  it('6. Recuperación de borrador conserva cuotas personalizadas sin sobreescribirlas', () => {
    const cuotasGuardadas = [
      { numeroCuota: 1, fechaPago: '2026-05-01', importe: '500.00' },
      { numeroCuota: 2, fechaPago: '2026-05-15', importe: '500.00' },
      { numeroCuota: 3, fechaPago: '2026-05-30', importe: '524.00' },
    ];

    const resueltas = resolverCuotasCredito({
      condicionPago: 'CREDITO',
      pagos: [],
      precioTotal: 1524.00,
      fechaVencimientoCredito: '2026-05-30',
      cuotas: cuotasGuardadas,
    });

    expect(resueltas).toHaveLength(3);
    expect(resueltas[0].importe).toBe('500.00');
    expect(resueltas[0].fechaPago).toBe('2026-05-01');
    expect(resueltas[1].importe).toBe('500.00');
    expect(resueltas[1].fechaPago).toBe('2026-05-15');
    expect(resueltas[2].importe).toBe('524.00');
    expect(resueltas[2].fechaPago).toBe('2026-05-30');
  });

  // ---------------------------------------------------------------------------
  // 7. Cuotas con importes incorrectos y validaciones defensivas
  // ---------------------------------------------------------------------------
  it('7. Rechaza cuotas descuadradas, con monto <= 0, fecha fuera de período o más de 3 cuotas', () => {
    // A. Cuotas que no cuadran con el saldo
    const cuotasDescuadradas = [
      { numeroCuota: 1, fechaPago: '2026-05-15', importe: '40.00' },
      { numeroCuota: 2, fechaPago: '2026-05-30', importe: '40.00' }, // Suma 80 vs saldo 90
    ];
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CREDITO',
      pagos: [],
      precioTotal: 90.00,
      fechaInicioCredito: '2026-05-01',
      fechaVencimientoCredito: '2026-05-30',
      cuotas: cuotasDescuadradas,
    }).cuotas).toContain('Las cuotas deben sumar el saldo financiado de S/ 90.00');

    // B. Cuota con importe cero o negativo
    const cuotaCero = [
      { numeroCuota: 1, fechaPago: '2026-05-30', importe: '0.00' }
    ];
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CREDITO',
      pagos: [],
      precioTotal: 90.00,
      fechaInicioCredito: '2026-05-01',
      fechaVencimientoCredito: '2026-05-30',
      cuotas: cuotaCero,
    }).cuotas).toContain('Cada cuota debe tener un monto mayor a cero');

    // C. Cuota con fecha posterior al vencimiento general
    const cuotaVencida = [
      { numeroCuota: 1, fechaPago: '2026-06-05', importe: '90.00' }
    ];
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CREDITO',
      pagos: [],
      precioTotal: 90.00,
      fechaInicioCredito: '2026-05-01',
      fechaVencimientoCredito: '2026-05-30',
      cuotas: cuotaVencida,
    }).cuotas).toContain('no puede superar el vencimiento general');

    // D. Más de 3 cuotas
    const cuatroCuotas = [
      { numeroCuota: 1, fechaPago: '2026-05-10', importe: '22.50' },
      { numeroCuota: 2, fechaPago: '2026-05-15', importe: '22.50' },
      { numeroCuota: 3, fechaPago: '2026-05-20', importe: '22.50' },
      { numeroCuota: 4, fechaPago: '2026-05-30', importe: '22.50' },
    ];
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CREDITO',
      pagos: [],
      precioTotal: 90.00,
      fechaInicioCredito: '2026-05-01',
      fechaVencimientoCredito: '2026-05-30',
      cuotas: cuatroCuotas,
    }).cuotas).toContain('El crédito permite como máximo 3 cuotas');
  });

  // ---------------------------------------------------------------------------
  // 8. Pago completo existente (caso Borrador #598)
  // ---------------------------------------------------------------------------
  it('8. Pago completo existente: advierte que no existe saldo financiable y protege pagos confirmados', () => {
    // Si la orden ya está pagada al 100%, seleccionar crédito debe ser bloqueado con instrucción clara
    const errores = validarPasoPago({
      tipoComprobante: 'FACTURA',
      condicionPago: 'CREDITO',
      pagos: [{ id: 1612, importe: '90.00', tipo: 'EFECTIVO' as const }],
      precioTotal: 90.00,
      fechaInicioCredito: '2026-05-01',
      fechaVencimientoCredito: '2026-05-30',
      cuotas: [],
    });
    expect(errores.pagos).toBe(
      'Una venta a crédito debe conservar un saldo pendiente. Cambie la condición a CONTADO o reduzca el pago inicial.'
    );

    // En UI muestra advertencia de pago completo confirmado
    const html = renderToStaticMarkup(
      <PagoStep
        pagoTab="EFECTIVO"
        setPagoTab={() => undefined}
        formPago={{ importe: '', tarjetaKey: '', entidadFinancieraKey: '' }}
        setFormPago={() => undefined}
        pagosAgregados={[{ id: 1612, tipo: 'EFECTIVO', importe: '90.00' }]}
        handleAgregarPago={() => undefined}
        eliminarPago={() => undefined}
        totalPagar={90}
        tipoComprobante="FACTURA"
        condicionPago="CREDITO"
        onCondicionPagoChange={() => undefined}
        fechaInicioCredito="2026-05-01"
        fechaVencimientoCredito="2026-05-30"
        cuotasCredito={[]}
        onCuotasCreditoChange={() => undefined}
        onFechaInicioCreditoChange={() => undefined}
        onFechaVencimientoCreditoChange={() => undefined}
      />
    );
    expect(html).toContain('Pago Completo Confirmado');
    expect(html).toContain('CONFIRMADO');
    expect(html).toContain('No existe saldo pendiente para financiar al crédito');
  });

});
