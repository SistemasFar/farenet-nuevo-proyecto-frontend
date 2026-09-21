import { describe, expect, it } from 'vitest';
import { validarDatosFacturacionBasica, validarFormularioFormatoDinamico } from './faregas-wizard.validation';

describe('formulario dinámico del certificado', () => {
  it('valida únicamente las variables requeridas por el formato', () => {
    const campos = [
      { key: 'taller.nombre', label: 'Nombre del Taller', grupo: 'Taller', tipo: 'text' as const, requerido: true, valor: '' },
      { key: 'inspeccion.observaciones', label: 'Observaciones', grupo: 'Inspección', tipo: 'text' as const, requerido: false, valor: '' },
      { key: 'personalizado.codigo', label: 'Código especial', grupo: 'Personalizadas', tipo: 'text' as const, requerido: true, valor: '' },
    ];

    expect(validarFormularioFormatoDinamico(campos, {
      'taller.nombre': 'TALLER PRUEBA',
      'personalizado.codigo': '',
    })).toEqual(['Complete código especial.']);
  });

  it('permite continuar cuando todas las variables obligatorias tienen valor', () => {
    const campos = [
      { key: 'taller.nombre', label: 'Nombre del Taller', grupo: 'Taller', tipo: 'text' as const, requerido: true, valor: '' },
    ];

    expect(validarFormularioFormatoDinamico(campos, { 'taller.nombre': 'TALLER PRUEBA' })).toEqual([]);
  });
});

describe('datos básicos de facturación', () => {
  const facturacionValida = {
    tipoDocFac: 'BOLETA',
    nroDocFac: '74045612',
    razonSocialFac: 'GRACE IBARRA',
    direccionFac: 'AV. PRINCIPAL 123',
    emailFac: 'grace@example.com',
    telefonoFac: '987654321',
  };

  it('exige el correo electrónico de facturación', () => {
    expect(validarDatosFacturacionBasica({ ...facturacionValida, emailFac: '' }))
      .toContain('Complete el correo electrónico de facturación.');
  });

  it('rechaza un correo electrónico incompleto', () => {
    expect(validarDatosFacturacionBasica({ ...facturacionValida, emailFac: 'grace@' }))
      .toContain('El correo de facturación no tiene un formato válido.');
  });

  it('exige el teléfono de facturación', () => {
    expect(validarDatosFacturacionBasica({ ...facturacionValida, telefonoFac: '' }))
      .toContain('Complete el teléfono de facturación.');
  });

  it('acepta los datos cuando el correo tiene un formato válido', () => {
    expect(validarDatosFacturacionBasica(facturacionValida)).toEqual([]);
  });
});
