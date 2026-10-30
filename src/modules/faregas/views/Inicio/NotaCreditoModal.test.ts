import { describe, expect, it } from 'vitest';
import {
  construirSolicitudNotaCredito,
  contextoPermiteEmitirNota,
  motivoRequiereSolicitud,
} from './NotaCreditoModal';

describe('NotaCreditoModal - construcción segura de la solicitud', () => {
  it('exige solicitud administrativa para todos los motivos 01, 02 y 03', () => {
    expect(motivoRequiereSolicitud('01')).toBe(true);
    expect(motivoRequiereSolicitud('02')).toBe(true);
    expect(motivoRequiereSolicitud('03')).toBe(true);
  });

  it('no confunde el permiso efectivo con la existencia de una solicitud aprobada', () => {
    expect(contextoPermiteEmitirNota({ puedeEmitir: true })).toBe(true);
    expect(contextoPermiteEmitirNota({ puedeEmitir: false })).toBe(false);
    expect(contextoPermiteEmitirNota(null)).toBe(false);
  });

  it('envía el motivo 01 con la solicitud aprobada y sin importes fiscales', () => {
    const payload = construirSolicitudNotaCredito({
      motivoCodigo: '01',
      sustento: 'Solicitud administrativa aprobada',
      solicitudId: 42,
      itemIndice: null,
      descripcionCorregida: '',
    });

    expect(payload).toEqual({
      tipo: 'CREDITO',
      motivoCodigo: '01',
      sustento: 'Solicitud administrativa aprobada',
      solicitudId: 42,
      itemIndice: undefined,
      descripcionCorregida: undefined,
    });
    expect(payload).not.toHaveProperty('baseImponible');
    expect(payload).not.toHaveProperty('igv');
    expect(payload).not.toHaveProperty('importeTotal');
  });

  it('envía el motivo 03 con solicitud aprobada y línea y descripción corregida', () => {
    const payload = construirSolicitudNotaCredito({
      motivoCodigo: '03',
      sustento: 'texto que no debe enviarse',
      solicitudId: 42,
      itemIndice: 1,
      descripcionCorregida: '  CERTIFICADO ANUAL GLP CORREGIDO  ',
    });

    expect(payload).toEqual({
      tipo: 'CREDITO',
      motivoCodigo: '03',
      sustento: 'CERTIFICADO ANUAL GLP CORREGIDO',
      solicitudId: 42,
      itemIndice: 1,
      descripcionCorregida: 'CERTIFICADO ANUAL GLP CORREGIDO',
    });
    expect(payload).not.toHaveProperty('baseImponible');
    expect(payload).not.toHaveProperty('igv');
    expect(payload).not.toHaveProperty('importeTotal');
  });
});
