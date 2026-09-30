import type { ProductoFacturacion } from '../services/faregas-productos.api';
import {
  exportarExcel,
  type ExcelColumn,
  type ExcelCellValue
} from './exportar-excel';

export const COLUMNAS_PRODUCTOS_FISCALES: ExcelColumn[] = [
  { key: 'sku', header: 'SKU', width: 18, format: 'text' },
  { key: 'descripcion', header: 'DESCRIPCIÓN', width: 60 },
  { key: 'tipo', header: 'TIPO', width: 16 },
  { key: 'categoriaDms', header: 'CATEGORÍA DMS', width: 38 },
  { key: 'sedesFaregas', header: 'SEDE FAREGAS', width: 35 },
  { key: 'cuenta', header: 'CUENTA POR COBRAR', width: 30 },
  { key: 'activo', header: 'ACTIVO', width: 12 },
  { key: 'codigoBarras', header: 'CÓDIGO DE BARRAS', width: 22, format: 'text' },
  { key: 'unidad', header: 'UNIDAD', width: 12 },
  { key: 'precioUnitario', header: 'PRECIO UNITARIO', width: 18, format: 'decimal2' },
  { key: 'precioVenta', header: 'PRECIO DE VENTA UNITARIO', width: 24, format: 'decimal2' },
  { key: 'valorReferencial', header: 'VALOR REFERENCIAL UNITARIO', width: 25, format: 'decimal2' },
  { key: 'codigoSunat', header: 'CÓDIGO CLASIFICACIÓN SUNAT', width: 28, format: 'text' },
  { key: 'tipoIgv', header: 'TIPO DE AFECTACIÓN IGV', width: 23, format: 'text' },
  { key: 'codigoIsc', header: 'CÓDIGO AFECTACIÓN ISC', width: 22, format: 'text' },
  { key: 'porcentajeIsc', header: '% ISC', width: 12 },
  { key: 'pos', header: 'DISPONIBLE POS', width: 17 },
  { key: 'venta', header: 'ES PARA VENTA', width: 16 },
  { key: 'compra', header: 'ES PARA COMPRA', width: 17 },
  { key: 'icbper', header: 'TIENE ICBPER', width: 16 },
  { key: 'imagen', header: 'IMAGEN', width: 45 }
];

const siNo = (value: boolean) => value ? 'SÍ' : 'NO';
const nullable = <T extends ExcelCellValue>(value: T): T | null => value ?? null;

export const mapearProductosParaExcel = (
  productos: ProductoFacturacion[]
): Array<Record<string, ExcelCellValue>> => productos.map((producto) => ({
  sku: String(producto.codigo_sku || ''),
  descripcion: producto.descripcion,
  tipo: nullable(producto.tipo_producto),
  categoriaDms: nullable(producto.categoria_dms),
  sedesFaregas: producto.sedes_faregas?.length ? producto.sedes_faregas.join(' | ') : null,
  cuenta: nullable(producto.cuenta_por_cobrar),
  activo: siNo(producto.activo),
  codigoBarras: nullable(producto.codigo_barras),
  unidad: nullable(producto.unidad),
  precioUnitario: nullable(producto.precio_unitario),
  precioVenta: nullable(producto.precio_referencia),
  valorReferencial: nullable(producto.valor_referencial_unitario),
  codigoSunat: nullable(producto.codigo_clasificacion_sunat),
  tipoIgv: nullable(producto.tipo_afectacion_igv),
  codigoIsc: nullable(producto.codigo_afectacion_isc),
  porcentajeIsc: nullable(producto.porcentaje_isc),
  pos: siNo(producto.disponible_pos),
  venta: siNo(producto.es_para_venta),
  compra: siNo(producto.es_para_compra),
  icbper: siNo(producto.tiene_icbper),
  imagen: nullable(producto.imagen_url)
}));

export const exportarProductosFiscales = (productos: ProductoFacturacion[]) => {
  exportarExcel(
    'faregas_productos',
    'Productos',
    COLUMNAS_PRODUCTOS_FISCALES,
    mapearProductosParaExcel(productos)
  );
};
