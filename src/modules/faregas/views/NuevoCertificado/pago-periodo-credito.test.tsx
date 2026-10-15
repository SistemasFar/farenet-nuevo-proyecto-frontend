import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PagoStep } from './components/NuevoCertificado/PagoStep';
import { resolverCuotasCredito, validarPasoPago } from './faregas-wizard.validation';

const renderPago = (
  condicionPago: 'CONTADO' | 'CREDITO',
  pagoTab: 'EFECTIVO' | 'TARJETA' = 'EFECTIVO',
  tipoComprobante = 'FACTURA',
) =>
  renderToStaticMarkup(
    <PagoStep
      pagoTab={pagoTab}
      tipoComprobante={tipoComprobante}
      setPagoTab={() => undefined}
      formPago={{ importe: '', tarjetaKey: '', entidadFinancieraKey: '' }}
      setFormPago={() => undefined}
      pagosAgregados={[]}
      handleAgregarPago={() => undefined}
      eliminarPago={() => undefined}
      totalPagar={100}
      condicionPago={condicionPago}
      onCondicionPagoChange={() => undefined}
      fechaInicioCredito="2026-10-14"
      fechaVencimientoCredito="2026-11-14"
      cuotasCredito={condicionPago === 'CREDITO' ? [{ numeroCuota: 1, fechaPago: '2026-11-14', importe: '100.00' }] : []}
      onFechaInicioCreditoChange={() => undefined}
      onFechaVencimientoCreditoChange={() => undefined}
      maestrosPago={{ tarjetas: [{ key: 'visa', nombre: 'VISA' }] } as any}
    />
  );

describe('paso compartido de Pago Faregas', () => {
  it('oculta por completo el período cuando la condición es CONTADO', () => {
    expect(renderPago('CONTADO')).not.toContain('PERÍODO DEL CRÉDITO');
  });

  it('muestra inicio y vencimiento cuando la condición es CRÉDITO', () => {
    const html = renderPago('CREDITO');
    expect(html).toContain('PERÍODO DEL CRÉDITO');
    expect(html).toContain('FECHA DE INICIO');
    expect(html).toContain('FECHA DE VENCIMIENTO');
    expect(html).toContain('PLAN DE CUOTAS');
    expect(html).toContain('001');
  });

  it('no muestra ni solicita últimos cuatro dígitos para tarjeta', () => {
    const html = renderPago('CONTADO', 'TARJETA');
    expect(html).not.toContain('ÚLTIMOS 4 DÍGITOS');
    expect(html).not.toContain('digitosTarjeta');
  });

  it('distingue marca de modalidad para una tarjeta física', () => {
    const html = renderToStaticMarkup(
      <PagoStep
        pagoTab="TARJETA"
        setPagoTab={() => undefined}
        formPago={{ importe: '', tarjetaKey: 'visa', modalidadTarjeta: '', entidadFinancieraKey: '' }}
        setFormPago={() => undefined}
        pagosAgregados={[]}
        handleAgregarPago={() => undefined}
        eliminarPago={() => undefined}
        totalPagar={100}
        tipoComprobante="BOLETA"
        condicionPago="CONTADO"
        onCondicionPagoChange={() => undefined}
        fechaInicioCredito=""
        fechaVencimientoCredito=""
      cuotasCredito={[]}
        onFechaInicioCreditoChange={() => undefined}
        onFechaVencimientoCreditoChange={() => undefined}
        maestrosPago={{ tarjetas: [{ key: 'visa', nombre: 'VISA' }] } as any}
      />
    );
    expect(html).toContain('MARCA / MEDIO');
    expect(html).toContain('MODALIDAD DE TARJETA');
    expect(html).toContain('DÉBITO');
    expect(html).toContain('CRÉDITO');
  });

  it('bloquea visualmente crédito cuando el comprobante es boleta', () => {
    const html = renderPago('CONTADO', 'EFECTIVO', 'BOLETA');
    expect(html).toContain('La boleta sólo admite condición de pago CONTADO.');
    expect(html).not.toContain('CRÉDITO — el saldo se distribuirá en cuotas');
    expect(validarPasoPago({
      tipoComprobante: 'BOLETA', condicionPago: 'CREDITO', pagos: [], precioTotal: 100,
    }).pagos).toContain('sólo admite');
  });

  it('bloquea crédito sin período o con vencimiento anterior al inicio', () => {
    expect(validarPasoPago({
      condicionPago: 'CREDITO', pagos: [], precioTotal: 100,
      fechaInicioCredito: '', fechaVencimientoCredito: '',
    })).toMatchObject({ fechaInicioCredito: expect.any(String), fechaVencimientoCredito: expect.any(String) });

    expect(validarPasoPago({
      condicionPago: 'CREDITO', pagos: [], precioTotal: 100,
      fechaInicioCredito: '2026-10-14', fechaVencimientoCredito: '2026-10-13',
    }).fechaVencimientoCredito).toContain('no puede ser anterior');
  });

  it('genera cuota 001 por todo el saldo cuando no existe pago inicial', () => {
    expect(resolverCuotasCredito({
      condicionPago: 'CREDITO', pagos: [], precioTotal: 90,
      fechaVencimientoCredito: '2026-11-07', cuotas: [],
    })).toEqual([{ numeroCuota: 1, fechaPago: '2026-11-07', importe: '90.00' }]);
  });

  it('genera la cuota sólo por el saldo después de un pago inicial', () => {
    const cuotas = resolverCuotasCredito({
      condicionPago: 'CREDITO', pagos: [{ importe: '30' }], precioTotal: 90,
      fechaVencimientoCredito: '2026-11-07', cuotas: [],
    });
    expect(cuotas[0].importe).toBe('60.00');
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA', condicionPago: 'CREDITO', pagos: [{ importe: '30' }], precioTotal: 90,
      fechaInicioCredito: '2026-10-15', fechaVencimientoCredito: '2026-11-07', cuotas,
    })).toEqual({});
  });

  it('bloquea crédito pagado por completo con una instrucción clara', () => {
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA', condicionPago: 'CREDITO', pagos: [{ importe: '90' }], precioTotal: 90,
      fechaInicioCredito: '2026-10-15', fechaVencimientoCredito: '2026-11-07', cuotas: [],
    }).pagos).toBe('Una venta a crédito debe conservar un saldo pendiente. Cambie la condición a CONTADO o reduzca el pago inicial.');
  });

  it('impide continuar si las cuotas no suman el saldo o están fuera del período', () => {
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA', condicionPago: 'CREDITO', pagos: [], precioTotal: 90,
      fechaInicioCredito: '2026-10-15', fechaVencimientoCredito: '2026-11-07',
      cuotas: [{ numeroCuota: 1, fechaPago: '2026-11-07', importe: '40' }],
    }).cuotas).toContain('S/ 90.00');
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA', condicionPago: 'CREDITO', pagos: [], precioTotal: 90,
      fechaInicioCredito: '2026-10-15', fechaVencimientoCredito: '2026-11-07',
      cuotas: [{ numeroCuota: 1, fechaPago: '2026-11-08', importe: '90' }],
    }).cuotas).toContain('no puede superar');
  });
});
