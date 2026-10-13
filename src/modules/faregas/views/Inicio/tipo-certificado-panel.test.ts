import { describe, expect, it } from 'vitest';
import { nombreTipoCertificadoPanel } from './tipo-certificado-panel';

describe('nombre del tipo de certificado en el panel', () => {
  it.each([
    ['GLP_ANUAL', 'INICIAL', 'Certificado Inicial GLP'],
    ['GLP_ANUAL', 'ANUAL', 'Certificado Anual GLP'],
    ['GNV_ANUAL', 'INICIAL', 'Certificado Inicial GNV'],
    ['GNV_ANUAL', 'ANUAL', 'Certificado Anual GNV'],
  ])('combina %s y %s sin depender del id', (tipoCertificadoClave, modalidad, esperado) => {
    expect(nombreTipoCertificadoPanel({
      tipoCertificadoClave,
      modalidad,
      conceptoVehicular: 'Certificado Anual',
    })).toBe(esperado);
  });

  it('conserva el nombre real para conformidad y otros flujos', () => {
    expect(nombreTipoCertificadoPanel({
      tipoCertificadoClave: 'CONFORMIDAD',
      modalidad: null,
      conceptoVehicular: 'Certificado de Conformidad de Modificación',
    })).toBe('Certificado de Conformidad de Modificación');
  });
});
