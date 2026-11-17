import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PagoStep } from './components/NuevoCertificado/PagoStep';
import { evaluarSpotWizard, validarPasoPago } from './faregas-wizard.validation';
import { construirFilasReporteFinancieroBase } from '../../utils/faregas-reporte-financiero';

const servicioSujeto = { sujetoDetraccion: true, codigoSpot: '037', porcentajeSpot: 12 };

function renderPago(
  tipoComprobante: 'BOLETA' | 'FACTURA',
  pagosAgregados: Array<{ id: number; tipo: 'EFECTIVO'; importe: string; tarjetaKey: string; entidadFinancieraKey: string }> = [],
  opciones: { total?: number; spotServicio?: typeof servicioSujeto | { sujetoDetraccion?: boolean | null }; tipoItemSpot?: 'PRODUCTO' | 'SERVICIO' | 'MIXTO' } = {},
) {
  return renderToStaticMarkup(
    <PagoStep
      pagoTab="EFECTIVO" setPagoTab={() => undefined}
      formPago={{ importe: '', tarjetaKey: '', entidadFinancieraKey: '' }} setFormPago={() => undefined}
      pagosAgregados={pagosAgregados} handleAgregarPago={() => undefined} eliminarPago={() => undefined}
      totalPagar={opciones.total ?? 1260} tipoComprobante={tipoComprobante}
      spotServicio={opciones.spotServicio ?? servicioSujeto}
      spotProducto={opciones.tipoItemSpot === 'PRODUCTO' ? opciones.spotServicio : undefined}
      tipoItemSpot={opciones.tipoItemSpot ?? 'SERVICIO'}
      condicionPago="CONTADO" onCondicionPagoChange={() => undefined}
      fechaInicioCredito="" fechaVencimientoCredito=""
      onFechaInicioCreditoChange={() => undefined} onFechaVencimientoCreditoChange={() => undefined}
      onDescuentoChange={() => undefined}
    />
  );
}

describe('wizard real de pagos — SPOT', () => {
  it('trata una venta de producto explícitamente no sujeta como factura ordinaria', () => {
    const resultado = evaluarSpotWizard({
      tipoComprobante: 'FACTURA', total: 1080, tipoItem: 'PRODUCTO',
      servicio: { sujetoDetraccion: false },
    });
    expect(resultado.aplica).toBe(false);
    expect(resultado.montoDetraccion).toBe(0);
    expect(resultado.netoCobrar).toBe(1080);
    expect(resultado.motivoExclusion).toBe('BIEN_MUEBLE_NO_SUJETO_A_SPOT');
  });

  it('avisa si el producto no está clasificado y separa códigos de bienes de los códigos de servicios', () => {
    const pendiente = evaluarSpotWizard({ tipoComprobante: 'FACTURA', total: 1080, tipoItem: 'PRODUCTO' });
    expect(pendiente.motivoExclusion).toBe('CLASIFICACION_SPOT_NO_VERIFICADA');
    const codigoServicio = evaluarSpotWizard({
      tipoComprobante: 'FACTURA', total: 1080, tipoItem: 'PRODUCTO',
      servicio: { sujetoDetraccion: true, codigoSpot: '037', porcentajeSpot: 12 },
    });
    expect(codigoServicio.aplica).toBe(false);
    expect(codigoServicio.motivoExclusion).toBe('CLASIFICACION_SPOT_NO_RECONOCIDA');
  });

  it('muestra por qué una factura de chips de S/ 1,080 no lleva SPOT cuando el catálogo dice no sujeto', () => {
    const html = renderPago('FACTURA', [], {
      total: 1080, tipoItemSpot: 'PRODUCTO', spotServicio: { sujetoDetraccion: false },
    });
    expect(html).toContain('El importe cumple el umbral comercial');
    expect(html).toContain('el producto está configurado como no sujeto a detracción');
    expect(html).not.toContain('Detracción SPOT (');
  });

  it('muestra total fiscal S/ 1,260, código 037 al 12%, detracción S/ 151 y neto S/ 1,109', () => {
    const html = renderPago('FACTURA');
    expect(html).toContain('Total comprobante:');
    expect(html).toContain('S/ 1260.00');
    expect(html).toContain('Detracción SPOT (12%)');
    expect(html).toContain('Código SPOT 037');
    expect(html).toContain('S/ 151.00');
    expect(html).toContain('Neto a pagar ordinario:');
    expect(html).toContain('S/ 1109.00');
    expect(html).toContain('PENDIENTE — constancia no registrada');
  });

  it('conserva el pago previo de S/ 1,260 y muestra la inconsistencia contra el neto', () => {
    const html = renderPago('FACTURA', [{ id: 1, tipo: 'EFECTIVO', importe: '1260.00', tarjetaKey: '', entidadFinancieraKey: '' }]);
    expect(html).toContain('Pago registrado excede el neto ordinario en S/ 151.00');
    expect(html).toContain('Pagado en caja:');
    expect(html).toContain('S/ 1260.00');
  });

  it('mantiene la boleta ordinaria sin detracción y explica la identificación sobre S/ 700', () => {
    const html = renderPago('BOLETA');
    expect(html).not.toContain('Detracción SPOT (12%)');
    expect(html).toContain('no se aplica detracción por este comprobante');
    expect(html).toContain('datos de identificación del comprador');
  });

  it('bloquea confirmación desde S/ 700 inclusive si la clasificación SPOT está pendiente', () => {
    expect(evaluarSpotWizard({ tipoComprobante: 'FACTURA', total: 1260 }).motivoExclusion)
      .toBe('CLASIFICACION_SPOT_NO_VERIFICADA');
    expect(evaluarSpotWizard({ tipoComprobante: 'FACTURA', total: 700 }).requiereRevision).toBe(true);
    expect(validarPasoPago({
      tipoComprobante: 'FACTURA', condicionPago: 'CONTADO', pagos: [{ importe: 700 }], precioTotal: 700,
    }).pagos).toMatch(/clasificación SPOT/i);
  });

  it('evalúa desde S/ 700 y conserva el límite legal estricto para servicios', () => {
    const inferior = evaluarSpotWizard({ tipoComprobante: 'FACTURA', total: 699, servicio: servicioSujeto });
    expect(inferior.aplica).toBe(false);
    expect(inferior.estadoEvaluacionSpot).toBe('BAJO_UMBRAL_COMERCIAL');
    const limite = evaluarSpotWizard({ tipoComprobante: 'FACTURA', total: 700, servicio: servicioSujeto });
    expect(limite.aplica).toBe(false);
    expect(limite.estadoEvaluacionSpot).toBe('CLASIFICADA_SIN_UMBRAL_LEGAL');
    expect(evaluarSpotWizard({ tipoComprobante: 'FACTURA', total: 701, servicio: servicioSujeto }).montoDetraccion).toBe(84);
    expect(evaluarSpotWizard({
      tipoComprobante: 'FACTURA', total: 1260,
      servicio: { sujetoDetraccion: false, codigoSpot: null, porcentajeSpot: null },
    }).aplica).toBe(false);
  });

  it('usa el umbral configurable del backend sin ocultar la aplicación legal por encima de S/ 700', () => {
    const umbralComercialMayor = evaluarSpotWizard({
      tipoComprobante: 'FACTURA', total: 800, servicio: servicioSujeto, umbralComercial: 1000,
    });
    expect(umbralComercialMayor.aplica).toBe(true);
    expect(umbralComercialMayor.umbralComercialAlcanzado).toBe(false);
    expect(umbralComercialMayor.montoDetraccion).toBe(96);

    const umbralComercialMenor = evaluarSpotWizard({
      tipoComprobante: 'FACTURA', total: 650, servicio: servicioSujeto, umbralComercial: 600,
    });
    expect(umbralComercialMenor.aplica).toBe(false);
    expect(umbralComercialMenor.umbralComercialAlcanzado).toBe(true);
    expect(umbralComercialMenor.estadoEvaluacionSpot).toBe('CLASIFICADA_SIN_UMBRAL_LEGAL');
  });

  it('bloquea una factura mixta antes del pago si la base sujeta no puede determinarse por concepto', () => {
    const resultado = evaluarSpotWizard({
      tipoComprobante: 'FACTURA', total: 1260, tipoItem: 'MIXTO', servicio: servicioSujeto,
    });
    expect(resultado.requiereRevision).toBe(true);
    expect(resultado.motivoExclusion).toBe('CONCEPTOS_MIXTOS_REQUIEREN_REVISION');
    expect(renderPago('FACTURA', [], { tipoItemSpot: 'MIXTO' })).toContain('combina productos y servicios');
  });

  it('acepta el neto pagado y rechaza el pago completo anterior cuando existe detracción', () => {
    const base = {
      tipoComprobante: 'FACTURA', condicionPago: 'CONTADO', precioTotal: 1260,
      spotServicio: servicioSujeto, pagos: [{ importe: 1109 }],
    };
    expect(validarPasoPago(base)).toEqual({});
    expect(validarPasoPago({ ...base, pagos: [{ importe: 1260 }] }).pagos).toMatch(/debe completar S\/ 1109.00/i);
    expect(validarPasoPago({ ...base, pagos: [{ importe: 500 }, { importe: 609 }] })).toEqual({});
  });

  it('exporta al Excel los importes y estado SPOT persistidos en el comprobante', () => {
    const filas = construirFilasReporteFinancieroBase({
      metadatos: { desde: '2026-11-01', hasta: '2026-11-30', fechaGeneracion: '2026-11-16', usuarioExportador: '', plantas: [], razonSocialEmisor: '', rucEmisor: '' },
      operaciones: [{ id: 1, estado: 'PAGADO', importe_total: 1260 }],
      lineas: [{ operacion_id: 1, tipo_item: 'SERVICIO', importe_total: 1260, producto: 'Servicio SPOT' }],
      comprobantes: [{ operacion_id: 1, tipo_comprobante: 'FACTURA', estado: 'ACEPTADO', aceptada_sunat: true, sujeto_detraccion: true, detraccion_codigo: '037', detraccion_descripcion: 'Demás servicios gravados con el IGV', detraccion_porcentaje: 12, detraccion_base: 1260, detraccion_monto: 151, detraccion_neto: 1109, detraccion_estado_deposito: 'PENDIENTE' }],
      ventasDirectas: [], ordenes: [], pagos: [], descuentos: [], ajustes: [],
    } as any);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({
      detraccionSujeto: 'SÍ', detraccionCodigo: '037', detraccionPorcentaje: 12,
      detraccionBase: 1260, detraccionMonto: 151, detraccionNeto: 1109,
      detraccionEstadoDeposito: 'PENDIENTE',
    });
  });
});
