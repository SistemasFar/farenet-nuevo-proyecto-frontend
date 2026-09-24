import { describe, expect, it, vi } from 'vitest';
import type { FacturacionFaregas } from '../../types/faregas-api';
import {
  esComprobanteOperable,
  esComprobanteYaEmitido,
  indicePasoVisual,
  ejecutarEmisionCombinada,
} from './faregas-emision';

const facturacion = (
  estado: FacturacionFaregas['estado'],
  overrides: Partial<FacturacionFaregas> = {},
): FacturacionFaregas => ({
  id: 1,
  certificadoId: 10,
  tipoComprobante: 'BOLETA',
  tipoDocumentoCliente: 'DNI',
  nroDocumento: '74045612',
  nombreRazonSocial: 'CLIENTE PRUEBA',
  direccion: 'AV. PRINCIPAL 123',
  email: null,
  telefono: null,
  condicionPago: 'CONTADO',
  fechaVencimiento: null,
  medioPago: 'EFECTIVO',
  cuotas: [],
  baseImponible: 76.27,
  igv: 13.73,
  importeTotal: 90,
  estado,
  serie: 'BBB1',
  numero: 1,
  nroComprobante: 'BBB1-1',
  proveedor: 'NUBEFACT',
  plantaKey: 'LIMA',
  empresaKey: 'FAREGAS',
  rucEmisor: '20500000000',
  razonSocialEmisor: 'FAREGAS',
  entornoFacturador: 'DEMO',
  codigoUnico: 'uuid',
  aceptadaSunat: estado === 'ACEPTADO' ? true : null,
  sunatDescription: null,
  enlacePdf: 'https://example.test/comprobante.pdf',
  enlaceXml: null,
  enlaceCdr: null,
  intentos: 0,
  ...overrides,
});

describe('orquestación de comprobante y certificado', () => {
  it('guarda y emite Nubefact antes de validar y emitir el certificado', async () => {
    const secuencia: string[] = [];
    const emitida = facturacion('PENDIENTE_SUNAT');
    const emitirComprobante = vi.fn(async () => {
      secuencia.push('comprobante');
      return emitida;
    });
    const validarCertificado = vi.fn(async () => {
      secuencia.push('validacion');
      return { valido: true, modoFacturacion: 'NUBEFACT' as const };
    });
    const emitirCertificado = vi.fn(async () => {
      secuencia.push('certificado');
      return { numero_certificado: 'DG-39-1000026' };
    });
    const marcarPasoVerificacion = vi.fn(async () => {
      secuencia.push('paso');
    });

    const resultado = await ejecutarEmisionCombinada(10, facturacion('BORRADOR'), {
      emitirComprobante,
      validarCertificado,
      emitirCertificado,
      marcarPasoVerificacion,
    });

    expect(secuencia).toEqual(['comprobante', 'paso', 'validacion', 'certificado']);
    expect(resultado.facturacion).toBe(emitida);
    expect(resultado.certificado).toEqual({ numero_certificado: 'DG-39-1000026' });
    expect(emitirCertificado).toHaveBeenCalledWith(10);
  });

  it('no llama la emisión del certificado si Nubefact falla', async () => {
    const emitirComprobante = vi.fn(async () => {
      throw new Error('NUBEFACT_RECHAZADO');
    });
    const validarCertificado = vi.fn();
    const emitirCertificado = vi.fn();

    await expect(ejecutarEmisionCombinada(10, facturacion('BORRADOR'), {
      emitirComprobante,
      validarCertificado,
      emitirCertificado,
    })).rejects.toThrow('NUBEFACT_RECHAZADO');

    expect(validarCertificado).not.toHaveBeenCalled();
    expect(emitirCertificado).not.toHaveBeenCalled();
  });

  it('omite Nubefact cuando el comprobante ya fue emitido y continúa sólo con el certificado', async () => {
    const emitirComprobante = vi.fn();
    const validarCertificado = vi.fn(async () => ({ valido: true, modoFacturacion: 'NUBEFACT' as const }));
    const emitirCertificado = vi.fn(async () => ({ numero_certificado: 'DG-39-1000027' }));

    await ejecutarEmisionCombinada(10, facturacion('ACEPTADO', { entornoFacturador: 'PRODUCCION' }), {
      emitirComprobante,
      validarCertificado,
      emitirCertificado,
    });

    expect(emitirComprobante).not.toHaveBeenCalled();
    expect(validarCertificado).toHaveBeenCalledTimes(1);
    expect(emitirCertificado).toHaveBeenCalledTimes(1);
  });

  it('permite reintentar sólo el certificado después de un error posterior a Nubefact', async () => {
    const emitirComprobante = vi.fn(async () => facturacion('PENDIENTE_SUNAT'));
    const validarCertificado = vi.fn(async () => ({ valido: true, modoFacturacion: 'NUBEFACT' as const }));
    const emitirCertificado = vi.fn()
      .mockRejectedValueOnce(new Error('RANGO_AGOTADO'))
      .mockResolvedValueOnce({ numero_certificado: 'DG-39-1000028' });

    await expect(ejecutarEmisionCombinada(10, facturacion('BORRADOR'), {
      emitirComprobante,
      validarCertificado,
      emitirCertificado,
    })).rejects.toMatchObject({ comprobanteEmitido: true });

    await ejecutarEmisionCombinada(10, facturacion('PENDIENTE_SUNAT'), {
      emitirComprobante,
      validarCertificado,
      emitirCertificado,
    });

    expect(emitirComprobante).toHaveBeenCalledTimes(1);
    expect(emitirCertificado).toHaveBeenCalledTimes(2);
  });

  it('no emite el certificado cuando la validación posterior a Nubefact no es válida', async () => {
    const emitirComprobante = vi.fn(async () => facturacion('ACEPTADO', { entornoFacturador: 'PRODUCCION' }));
    const validarCertificado = vi.fn(async () => ({ valido: false, errores: [{ mensaje: 'Falta un campo' }] }));
    const emitirCertificado = vi.fn();

    await expect(ejecutarEmisionCombinada(10, facturacion('BORRADOR'), {
      emitirComprobante,
      validarCertificado,
      emitirCertificado,
    })).rejects.toThrow('Falta un campo');

    expect(emitirCertificado).not.toHaveBeenCalled();
  });
});

describe('regla de comprobante operable', () => {
  it('conserva la regla DEMO y producción', () => {
    expect(esComprobanteOperable(facturacion('PENDIENTE_SUNAT'))).toBe(true);
    expect(esComprobanteOperable(facturacion('ACEPTADO', { entornoFacturador: 'PRODUCCION' }))).toBe(true);
    expect(esComprobanteOperable(facturacion('ACEPTADO', { entornoFacturador: 'PRODUCCION', aceptadaSunat: false }))).toBe(false);
    expect(esComprobanteOperable(facturacion('PENDIENTE_SUNAT'), 'SIMULACION')).toBe(true);
  });

  it('identifica los estados que ya fueron persistidos por Nubefact', () => {
    expect(esComprobanteYaEmitido(facturacion('ACEPTADO'))).toBe(true);
    expect(esComprobanteYaEmitido(facturacion('PENDIENTE_SUNAT'))).toBe(true);
    expect(esComprobanteYaEmitido(facturacion('PENDIENTE'))).toBe(false);
    expect(esComprobanteYaEmitido(null)).toBe(false);
  });
});

describe('stepper visual del wizard', () => {
  it('mapea FACTURACION y VERIFICACION_EMISION al mismo paso final', () => {
    expect(indicePasoVisual('FACTURACION')).toBe(4);
    expect(indicePasoVisual('VERIFICACION_EMISION')).toBe(4);
    expect(indicePasoVisual('PREVISUALIZACION')).toBe(3);
  });
});
