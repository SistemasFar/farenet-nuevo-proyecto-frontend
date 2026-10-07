import type { ProductoInventariable } from '../../services/faregas-chips.api';

export const esProductoCantidad = (producto?: Pick<ProductoInventariable, 'tipo'> | null) => producto?.tipo === 'CANTIDAD';

export const etiquetaControlInventario = (tipo: string) => tipo === 'CANTIDAD'
  ? 'Cantidad'
  : tipo === 'CHIP_SERIALIZADO' ? 'Serializado' : tipo;

export const puedeTransferirProducto = (producto?: Pick<ProductoInventariable, 'tipo'> | null) => !esProductoCantidad(producto);

export const entradaVentaCantidad = (productoInventariableId: number, cantidad: number) => {
  if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error('CANTIDAD_INVALIDA');
  return { productoInventariableId, cantidad };
};
