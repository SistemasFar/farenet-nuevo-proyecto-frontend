import { describe, expect, it } from 'vitest';
import { entradaVentaCantidad, esProductoCantidad, etiquetaControlInventario, puedeTransferirProducto } from './inventario-control';

describe('control de inventario por producto', () => {
  it('mantiene CHIP como serializado', () => {
    expect(esProductoCantidad({ tipo: 'CHIP_SERIALIZADO' })).toBe(false);
    expect(etiquetaControlInventario('CHIP_SERIALIZADO')).toBe('Serializado');
    expect(puedeTransferirProducto({ tipo: 'CHIP_SERIALIZADO' })).toBe(true);
  });

  it('identifica hojas como cantidad y oculta transferencia', () => {
    expect(esProductoCantidad({ tipo: 'CANTIDAD' })).toBe(true);
    expect(etiquetaControlInventario('CANTIDAD')).toBe('Cantidad');
    expect(puedeTransferirProducto({ tipo: 'CANTIDAD' })).toBe(false);
  });

  it('construye venta por cantidad sin seriales', () => {
    expect(entradaVentaCantidad(35, 2)).toEqual({ productoInventariableId: 35, cantidad: 2 });
    expect(() => entradaVentaCantidad(35, 0)).toThrow('CANTIDAD_INVALIDA');
    expect(() => entradaVentaCantidad(35, 1.5)).toThrow('CANTIDAD_INVALIDA');
  });
});
