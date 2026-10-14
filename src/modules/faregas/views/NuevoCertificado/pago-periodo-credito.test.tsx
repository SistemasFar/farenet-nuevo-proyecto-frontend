import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PagoStep } from './components/NuevoCertificado/PagoStep';
import { validarPasoPago } from './faregas-wizard.validation';

const renderPago = (condicionPago: 'CONTADO' | 'CREDITO', pagoTab: 'EFECTIVO' | 'TARJETA' = 'EFECTIVO') =>
  renderToStaticMarkup(
    <PagoStep
      pagoTab={pagoTab}
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
  });

  it('no muestra ni solicita últimos cuatro dígitos para tarjeta', () => {
    const html = renderPago('CONTADO', 'TARJETA');
    expect(html).not.toContain('ÚLTIMOS 4 DÍGITOS');
    expect(html).not.toContain('digitosTarjeta');
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
});
