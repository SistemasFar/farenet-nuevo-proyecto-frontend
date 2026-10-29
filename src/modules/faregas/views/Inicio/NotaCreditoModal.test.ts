import { describe, expect, it } from 'vitest';
import {
  construirSolicitudNotaCredito,
  motivoRequiereSolicitud,
} from './NotaCreditoModal';

describe('NotaCreditoModal - construcción segura de la solicitud', () => {
  it('exige solicitud administrativa para los motivos 01 y 02', () => {
    expect(motivoRequiereSolicitud('01')).toBe(true);
    expect(motivoRequiereSolicitud('02')).toBe(true);
    expect(motivoRequiereSolicitud('03')).toBe(false);
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

  it('envía el motivo 03 sólo con la línea y descripción corregida', () => {
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
      solicitudId: undefined,
      itemIndice: 1,
      descripcionCorregida: 'CERTIFICADO ANUAL GLP CORREGIDO',
    });
  });
});
