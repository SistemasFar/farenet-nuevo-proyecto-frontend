import { describe, expect, it } from 'vitest';
import { combinarVinculacionProducto } from './faregas-productos-vinculacion';

describe('vinculación explícita de productos fiscales de chips', () => {
  it('muestra la sede y el uso operativo de chips sin crear una tarifa falsa', () => {
    const resultado = combinarVinculacionProducto(undefined, ['SURQUILLO'], ['VENTA DE CHIPS']);
    expect(resultado.sedesActivas).toEqual(['SURQUILLO']);
    expect(resultado.servicios).toEqual(['VENTA DE CHIPS']);
  });

  it('combina relaciones de certificados y chips sin duplicarlas', () => {
    const resultado = combinarVinculacionProducto(
      { sedesActivas: ['SURCO'], servicios: ['CERTIFICADO GNV'] },
      ['SURCO'],
      ['VENTA DE CHIPS']
    );
    expect(resultado.sedesActivas).toEqual(['SURCO']);
    expect(resultado.servicios).toEqual(['CERTIFICADO GNV', 'VENTA DE CHIPS']);
  });
});
