import type { ProductoFiscalChipOpcion } from '../../services/faregas-chips.api';

export const obtenerProductoFiscalChip = (
  productos: ProductoFiscalChipOpcion[],
  productoFacturacionId?: number | null
) => productos.find((producto) => producto.id === Number(productoFacturacionId)) || null;

export const mostrarPrecioVentaFiscal = (producto: ProductoFiscalChipOpcion | null) =>
  producto ? `S/ ${Number(producto.precioVenta).toFixed(2)}` : '—';
