import { describe, expect, it } from 'vitest';
import {
  estadoCertificadoPanel,
  estadoComprobantePanel,
  MOTIVOS_NOTA_CREDITO,
} from './documentos-electronicos';

describe('estados independientes del panel FAREGAS', () => {
  it('conserva EMITIDO aunque la baja fiscal haya sido aceptada', () => {
    const item = { estado: 'EMITIDO', estadoFacturacion: 'ANULADO', estadoAnulacion: 'ACEPTADO' };
    expect(estadoCertificadoPanel(item)).toBe('EMITIDO');
    expect(estadoComprobantePanel(item)).toBe('Anulado');
  });

  it('distingue una baja pendiente del estado técnico', () => {
    const item = { estado: 'EMITIDO', estadoFacturacion: 'ACEPTADO', estadoAnulacion: 'PENDIENTE' };
    expect(estadoCertificadoPanel(item)).toBe('EMITIDO');
    expect(estadoComprobantePanel(item)).toBe('Baja pendiente');
  });

  it('muestra la nota de crédito aceptada como operación fiscal relacionada', () => {
    expect(estadoComprobantePanel({
      estadoFacturacion: 'ACEPTADO',
      estadoNotaCredito: 'ACEPTADO',
    })).toBe('Nota de crédito emitida');
  });

  it('mantiene los únicos tres motivos de crédito soportados por backend', () => {
    expect(MOTIVOS_NOTA_CREDITO.map((motivo) => motivo.codigo)).toEqual(['01', '02', '03']);
  });
});
