import { describe, expect, it } from 'vitest';
import { esGlpInicial, normalizarCategoriaRecuperada, normalizarCombustibleRecuperado, normalizarValorRecuperadoConOpciones } from './normalizar-recuperacion-vehiculo';

describe('normalización de valores recuperados', () => {
  it('deja vacío un combustible no permitido en GLP inicial y devuelve una advertencia específica', () => {
    const resultado = normalizarCombustibleRecuperado('GLP', true);
    expect(resultado.valor).toBe('');
    expect(resultado.valorOriginal).toBe('GLP');
    expect(resultado.compatible).toBe(false);
    expect(resultado.advertencia).toContain('GASOLINA o DIESEL');
    expect(resultado.advertencia).toContain('"GLP"');
  });

  it.each(['GASOLINA', 'DIESEL', ' gasolina '])('conserva el combustible permitido %s', (valor) => {
    const resultado = normalizarCombustibleRecuperado(valor, true);
    expect(resultado.compatible).toBe(true);
    expect(resultado.valor).toBe(valor.trim().toUpperCase());
    expect(resultado.advertencia).toBeNull();
  });

  it('no cambia el combustible recuperado en otros tipos de trámite', () => {
    expect(normalizarCombustibleRecuperado('GNV', false).valor).toBe('GNV');
  });

  it('compara opciones ignorando mayúsculas y espacios exteriores', () => {
    expect(normalizarValorRecuperadoConOpciones(' diesel ', ['GASOLINA', 'DIESEL'], 'combustible').valor)
      .toBe('DIESEL');
  });

  it('reconoce GLP inicial por clave o por modalidad', () => {
    expect(esGlpInicial('GLP_INICIAL', '')).toBe(true);
    expect(esGlpInicial('GLP_ANUAL', 'INICIAL')).toBe(true);
    expect(esGlpInicial('GLP_ANUAL', 'ANUAL')).toBe(false);
  });

  it('normaliza una categoría conocida por clave o nombre y deja en blanco una ajena al catálogo', () => {
    const catalogo = [{ key: 'M1', nombre: 'VEHÍCULO LIVIANO' }];
    expect(normalizarCategoriaRecuperada('m1', catalogo).valor).toBe('M1');
    expect(normalizarCategoriaRecuperada('vehículo liviano', catalogo).valor).toBe('M1');
    const desconocida = normalizarCategoriaRecuperada('CATEGORÍA EXTERNA', catalogo);
    expect(desconocida.valor).toBe('');
    expect(desconocida.advertencia).toContain('no existe en las opciones locales');
  });
});
