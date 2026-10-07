import { describe, expect, it } from 'vitest';
import { mostrarPrecioVentaFiscal, obtenerProductoFiscalChip } from './chips-producto-fiscal';

const productos = [
  { id: 2335, codigoSku: 'CHIP + PORTA CHIP - COLINA', descripcion: 'CHIP + PORTA CHIP', precioVenta: 180 },
  { id: 25, codigoSku: 'CHIP + PORTA CHIP - SURCO', descripcion: 'CHIP + PORTA CHIP', precioVenta: 180 },
  { id: 2337, codigoSku: 'CHIP + PORTA CHIP - SURQUILLO', descripcion: 'CHIP + PORTA CHIP', precioVenta: 180 }
];

describe('mapping fiscal de tipos de chip', () => {
  it('resuelve el producto correspondiente a cada sede por su FK explícita', () => {
    expect(obtenerProductoFiscalChip(productos, 2335)?.codigoSku).toContain('COLINA');
    expect(obtenerProductoFiscalChip(productos, 25)?.codigoSku).toContain('SURCO');
    expect(obtenerProductoFiscalChip(productos, 2337)?.codigoSku).toContain('SURQUILLO');
  });

  it('muestra P. venta y no inventa precio cuando falta mapping', () => {
    expect(mostrarPrecioVentaFiscal(obtenerProductoFiscalChip(productos, 2337))).toBe('S/ 180.00');
    expect(mostrarPrecioVentaFiscal(obtenerProductoFiscalChip(productos, null))).toBe('—');
  });
});
