import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MaestrosPagoResponse } from '@/types/maestros';
import { PagoStep } from './components/NuevoCertificado/PagoStep';
import { redistribuirImportesCuotas, resolverCuotasCredito, sumarImportesPEN, validarPasoPago } from './faregas-wizard.validation';

const maestrosPago: MaestrosPagoResponse['data'] = {
  formasPago: [],
  tarjetas: [{ key: 'visa', nombre: 'VISA' }],
  entidadesFinancieras: [],
  cuentasCorrientes: [],
};

const renderPago = (
  condicionPago: 'CONTADO' | 'CREDITO',
  pagoTab: 'EFECTIVO' | 'TARJETA' | 'BANCO' = 'EFECTIVO',
  tipoComprobante = 'FACTURA',
  descuento = 0,
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
      descuento={descuento}
      condicionPago={condicionPago}
      onCondicionPagoChange={() => undefined}
      fechaInicioCredito="2026-10-14"
      fechaVencimientoCredito="2026-11-14"
      cuotasCredito={condicionPago === 'CREDITO' ? [{ numeroCuota: 1, fechaPago: '2026-11-14', importe: '100.00' }] : []}
      onFechaInicioCreditoChange={() => undefined}
      onFechaVencimientoCreditoChange={() => undefined}
      maestrosPago={maestrosPago}
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
    expect(html).toContain('Total a financiar:');
    expect(html).not.toContain('EFECTIVO');
    expect(html).not.toContain('TARJETA');
    expect(html).not.toContain('BANCO');
    expect(html).not.toContain('AGREGAR PAGO');
    expect(html).not.toContain('Pagos Registrados');
    expect(html).not.toContain('Descuento certificado:');
    expect(html).not.toContain('Monto fijo');
    expect(html).toContain('Total a financiar:');
  });

  it('oculta el selector en crédito y bloquea un borrador legado con descuento', () => {
    const html = renderPago('CREDITO', 'EFECTIVO', 'FACTURA', 20);
    expect(html).toContain('CRÉDITO no admite descuentos ni cortesías');
    expect(html).not.toContain('Total a financiar:');
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA', condicionPago: 'CREDITO', pagos: [], precioTotal: 70,
      fechaInicioCredito: '2026-10-14', fechaVencimientoCredito: '2026-11-14',
      cuotas: [{ numeroCuota: 1, fechaPago: '2026-11-14', importe: '70.00' }],
      descuentoActivo: true,
    }).pagos).toContain('CRÉDITO no admite descuentos ni cortesías');
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA', condicionPago: 'CONTADO', pagos: [{ importe: 90 }], precioTotal: 90,
      descuentoActivo: true,
    })).toEqual({});
  });

  it('mantiene los controles y la validación de pago completo en CONTADO', () => {
    const html = renderPago('CONTADO');
    expect(html).toContain('EFECTIVO');
    expect(html).toContain('TARJETA');
    expect(html).toContain('BANCO');
    expect(html).toContain('AGREGAR PAGO');
    expect(html).toContain('Pagos Registrados');
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA', condicionPago: 'CONTADO', pagos: [], precioTotal: 100,
    }).pagos).toContain('El pago debe completar S/ 100.00');
  });

  it('muestra el descuento y el total de certificado con dos decimales exactos', () => {
    const html = renderToStaticMarkup(
      <PagoStep
        pagoTab="EFECTIVO" setPagoTab={() => undefined}
        formPago={{ importe: '', tarjetaKey: '', entidadFinancieraKey: '' }} setFormPago={() => undefined}
        pagosAgregados={[]} handleAgregarPago={() => undefined} eliminarPago={() => undefined}
        totalPagar={70} tarifaOriginal={90} descuento={20}
        tipoComprobante="FACTURA" condicionPago="CONTADO" onCondicionPagoChange={() => undefined}
        fechaInicioCredito="" fechaVencimientoCredito=""
        onFechaInicioCreditoChange={() => undefined} onFechaVencimientoCreditoChange={() => undefined}
      />
    );
    expect(html).toContain('S/ 90.00');
    expect(html).toContain('- S/ 20.00');
    expect(html).toContain('S/ 70.00');
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
        maestrosPago={maestrosPago}
      />
    );
    expect(html).toContain('MARCA / MEDIO');
    expect(html).toContain('MODALIDAD DE TARJETA');
    expect(html).toContain('DÉBITO');
    expect(html).toContain('CRÉDITO');
  });

  it('muestra únicamente la cuenta y el CCI autorizados para FAREGAS', () => {
    const html = renderToStaticMarkup(
      <PagoStep
        pagoTab="BANCO"
        setPagoTab={() => undefined}
      formPago={{ importe: '', tarjetaKey: '', entidadFinancieraKey: '', cuentaCorrienteKey: '' }}
        setFormPago={() => undefined}
        pagosAgregados={[]}
        handleAgregarPago={() => undefined}
        eliminarPago={() => undefined}
        totalPagar={80}
        tipoComprobante="BOLETA"
        condicionPago="CONTADO"
        onCondicionPagoChange={() => undefined}
        fechaInicioCredito=""
        fechaVencimientoCredito=""
        cuotasCredito={[]}
        onFechaInicioCreditoChange={() => undefined}
        onFechaVencimientoCreditoChange={() => undefined}
        maestrosPago={{
          formasPago: [],
          tarjetas: [],
          entidadesFinancieras: [{ key: '6', nombre: 'BBVA CONTINENTAL' }],
          cuentasCorrientes: [{
            key: 'FG_BBVA_00020564',
            nombre: '0011-0397-0100020564',
            entidadfinanciera_key: '6',
          }],
          cuentaFaregas: {
            numero: '0100020564',
            numeroCompleto: '0011-0397-0100020564',
            cci: '011-397-000100020564-79',
            entidad: 'BBVA CONTINENTAL',
          },
        }}
      />
    );
    expect(html).toContain('CUENTA FAREGAS');
    expect(html).toContain('0100020564');
    expect(html).toContain('011-397-000100020564-79');
    expect(html).not.toContain('0011-0397-01-00027895');
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

  it('al retirar un descuento de S/ 20 sobre S/ 90, el crédito se recalcula sobre S/ 90.00', () => {
    expect(resolverCuotasCredito({
      condicionPago: 'CREDITO', pagos: [], precioTotal: 90,
      fechaVencimientoCredito: '2026-12-18', cuotas: [],
    })).toEqual([{ numeroCuota: 1, fechaPago: '2026-12-18', importe: '90.00' }]);
  });

  it('no convierte cobros de caja en un pago inicial de crédito puro', () => {
    const cuotas = resolverCuotasCredito({
      condicionPago: 'CREDITO', pagos: [{ importe: '30' }], precioTotal: 90,
      fechaVencimientoCredito: '2026-11-07', cuotas: [],
    });
    expect(cuotas).toEqual([]);
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA', condicionPago: 'CREDITO', pagos: [{ importe: '30' }], precioTotal: 90,
      fechaInicioCredito: '2026-10-15', fechaVencimientoCredito: '2026-11-07', cuotas,
    }).pagos).toContain('crédito puro no admite cobros iniciales');
  });

  it('financia el total neto después del descuento en cuotas de exactamente S/ 70.00', () => {
    const cuotas = resolverCuotasCredito({
      condicionPago: 'CREDITO', pagos: [], precioTotal: 70,
      fechaVencimientoCredito: '2026-11-07', cuotas: [],
    });
    expect(cuotas).toEqual([{ numeroCuota: 1, fechaPago: '2026-11-07', importe: '70.00' }]);
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA', condicionPago: 'CREDITO', pagos: [], precioTotal: 70,
      fechaInicioCredito: '2026-10-15', fechaVencimientoCredito: '2026-11-07', cuotas,
    })).toEqual({});
  });

  it('valida la suma de cuotas en centavos y rechaza precisión adicional', () => {
    const base = {
      tipoComprobante: 'FACTURA', condicionPago: 'CREDITO' as const, pagos: [], precioTotal: 70,
      fechaInicioCredito: '2026-10-15', fechaVencimientoCredito: '2027-02-18',
    };
    expect(validarPasoPago({
      ...base,
      cuotas: [
        { numeroCuota: 1, fechaPago: '2026-12-18', importe: '23.33' },
        { numeroCuota: 2, fechaPago: '2027-01-18', importe: '23.33' },
        { numeroCuota: 3, fechaPago: '2027-02-18', importe: '23.34' },
      ],
    })).toEqual({});
    expect(validarPasoPago({
      ...base,
      cuotas: [{ numeroCuota: 1, fechaPago: '2027-02-18', importe: '70.005' }],
    }).cuotas).toContain('máximo dos decimales');
  });

  it('redistribuye las cuotas al cambiar el descuento y conserva sus vencimientos', () => {
    const previas = [
      { numeroCuota: 1, fechaPago: '2026-11-20', importe: '45.00' },
      { numeroCuota: 2, fechaPago: '2026-12-20', importe: '45.00' },
    ];
    const recalculadas = redistribuirImportesCuotas(70, previas);
    expect(recalculadas).toEqual([
      { numeroCuota: 1, fechaPago: '2026-11-20', importe: '35.00' },
      { numeroCuota: 2, fechaPago: '2026-12-20', importe: '35.00' },
    ]);
    expect(sumarImportesPEN(...recalculadas.map(cuota => cuota.importe))).toBe(70);
  });

  it('reparte centavos sin pérdida en tres cuotas al actualizar un descuento', () => {
    const recalculadas = redistribuirImportesCuotas(70, [
      { numeroCuota: 1, fechaPago: '2026-11-20', importe: '30.00' },
      { numeroCuota: 2, fechaPago: '2026-12-20', importe: '30.00' },
      { numeroCuota: 3, fechaPago: '2027-01-20', importe: '30.00' },
    ]);
    expect(recalculadas.map(cuota => cuota.importe)).toEqual(['23.33', '23.33', '23.34']);
    expect(sumarImportesPEN(...recalculadas.map(cuota => cuota.importe))).toBe(70);
  });

  it('bloquea crédito que tiene pagos de caja preexistentes sin alterarlos', () => {
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA', condicionPago: 'CREDITO', pagos: [{ importe: '90' }], precioTotal: 90,
      fechaInicioCredito: '2026-10-15', fechaVencimientoCredito: '2026-11-07', cuotas: [],
    }).pagos).toContain('crédito puro no admite cobros iniciales');
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
