import { describe, expect, it } from 'vitest';
import { validarFormularioFormatoDinamico } from './faregas-wizard.validation';

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
