import { describe, it, expect } from 'vitest';
import {
  esComprobanteOperable,
  esComprobanteYaEmitido,
  esComprobanteFiscalBloqueado
} from './faregas-emision';
import type { FacturacionFaregas } from '../../types/faregas-api';

describe('faregas-emision: validaciones tributarias DEMO vs PRODUCCION', () => {
  it('1. DEMO: comprobante generado con hash y PDF es operable aunque estado sea PENDIENTE_SUNAT o BORRADOR', () => {
    const facturacionDemo: FacturacionFaregas = {
      id: 1023,
      nroComprobante: 'FFF1-00000021',
      serie: 'FFF1',
      numero: 21,
      estado: 'BORRADOR',
      entornoFacturador: 'DEMO',
      codigoHash: 'cFKB3AS7rEVgdh2CuRmCEv3lybrx0InLyBmBUCPDLhM=',
      enlacePdf: 'https://www.nubefact.com/cpe/6bfae40b-2470-479d-909d-156bb2f5344f.pdf',
    } as unknown as FacturacionFaregas;

    expect(esComprobanteOperable(facturacionDemo)).toBe(true);
    expect(esComprobanteYaEmitido(facturacionDemo)).toBe(true);
    expect(esComprobanteFiscalBloqueado(facturacionDemo)).toBe(true);
  });

  it('2. DEMO: comprobante incompleto sin artefactos ni hash NO es operable', () => {
    const facturacionIncompleta: FacturacionFaregas = {
      id: 1024,
      nroComprobante: 'FFF1-00000022',
      serie: 'FFF1',
      numero: 22,
      estado: 'BORRADOR',
      entornoFacturador: 'DEMO',
      codigoHash: null,
      enlacePdf: null,
    } as unknown as FacturacionFaregas;

    expect(esComprobanteOperable(facturacionIncompleta)).toBe(false);
  });

  it('3. DEMO: comprobante rechazado NO es operable', () => {
    const facturacionRechazada: FacturacionFaregas = {
      id: 1025,
      nroComprobante: 'FFF1-00000023',
      serie: 'FFF1',
      numero: 23,
      estado: 'RECHAZADO',
      entornoFacturador: 'DEMO',
      codigoHash: 'HASH123',
      enlacePdf: 'https://nubefact.com/123.pdf',
    } as unknown as FacturacionFaregas;

    expect(esComprobanteOperable(facturacionRechazada)).toBe(false);
  });

  it('4. PRODUCCION: comprobante aceptado con CDR es operable', () => {
    const facturacionProd: FacturacionFaregas = {
      id: 1026,
      nroComprobante: 'F001-00000100',
      serie: 'F001',
      numero: 100,
      estado: 'ACEPTADO',
      aceptadaSunat: true,
      entornoFacturador: 'PRODUCCION',
    } as unknown as FacturacionFaregas;

    expect(esComprobanteOperable(facturacionProd)).toBe(true);
  });

  it('5. PRODUCCION: comprobante pendiente SUNAT NO es operable', () => {
    const facturacionProdPendiente: FacturacionFaregas = {
      id: 1027,
      nroComprobante: 'F001-00000101',
      serie: 'F001',
      numero: 101,
      estado: 'PENDIENTE_SUNAT',
      aceptadaSunat: false,
      entornoFacturador: 'PRODUCCION',
      codigoHash: 'HASHPROD',
      enlacePdf: 'https://nubefact.com/prod.pdf',
    } as unknown as FacturacionFaregas;

    expect(esComprobanteOperable(facturacionProdPendiente)).toBe(false);
  });

  it('6. CREDITO DEMO: factura a crédito con cuotas y comprobante emitido es operable y bloqueada para edición', () => {
    const facturacionCredito: FacturacionFaregas = {
      id: 1023,
      nroComprobante: 'FFF1-00000021',
      serie: 'FFF1',
      numero: 21,
      estado: 'BORRADOR',
      entornoFacturador: 'DEMO',
      condicionPago: 'CREDITO',
      codigoHash: 'cFKB3AS7rEVgdh2CuRmCEv3lybrx0InLyBmBUCPDLhM=',
      enlacePdf: 'https://www.nubefact.com/cpe/6bfae40b-2470-479d-909d-156bb2f5344f.pdf',
      cuotas: [
        { id: 87, numeroCuota: 1, fechaPago: '2026-12-16', importe: 45, estado: 'PENDIENTE' },
        { id: 88, numeroCuota: 2, fechaPago: '2027-01-21', importe: 45, estado: 'PENDIENTE' }
      ]
    } as unknown as FacturacionFaregas;

    expect(esComprobanteOperable(facturacionCredito)).toBe(true);
    expect(esComprobanteYaEmitido(facturacionCredito)).toBe(true);
    expect(esComprobanteFiscalBloqueado(facturacionCredito)).toBe(true);
  });
});
