import type { SerieMaestro } from '../services/faregas-series.api';
import {
  exportarExcel,
  type ExcelColumn,
  type ExcelCellValue
} from './exportar-excel';

/**
 * Las 14 columnas del maestro DMS de Series, en el mismo orden y con el mismo
 * nombre que el Excel de origen. Ninguna se omite ni se reagrupa.
 *
 * `serie`, `numero` y `codigo_local_dms` van como texto para conservar ceros a
 * la izquierda. Los booleanos se exportan como SÍ/NO y un NULL del maestro se
 * escribe como celda vacía.
 */
export const COLUMNAS_SERIES_DMS: ExcelColumn[] = [
  { key: 'nombre', header: 'Nombre', width: 10, format: 'text' },
  { key: 'autogenerada', header: 'Autogenerada', width: 14 },
  { key: 'ultimo_numero', header: 'Último Número Generado', width: 22 },
  { key: 'activo', header: 'Activo', width: 10 },
  { key: 'tipo_documento', header: 'Tipo de Documento', width: 18, format: 'text' },
  { key: 'numero', header: 'Número', width: 12, format: 'text' },
  { key: 'tipo_documento_referencia', header: 'Tipo de Documento de Referencia', width: 28, format: 'text' },
  { key: 'codigo_local_dms', header: 'Código del Local', width: 16, format: 'text' },
  { key: 'nombre_local_dms', header: 'Nombre del Local', width: 32 },
  { key: 'telefono_local_dms', header: 'Teléfono del Local', width: 18, format: 'text' },
  { key: 'correo_local_dms', header: 'Correo del Local', width: 30 },
  { key: 'direccion_comercial_dms', header: 'Dirección Comercial', width: 55 },
  { key: 'serie_pos', header: 'Serie para POS', width: 15 },
  { key: 'serie_contingencia', header: 'Serie de Contingencia', width: 20 }
];

const siNo = (value: boolean | null | undefined) => (value === true ? 'Sí' : 'No');

/**
 * `numero` usa la representación del DMS (E30/C30/D30), sin modificar la
 * serie operativa interna (F030/FC30/FD30) que consumen los comprobantes.
 */
export const mapearSeriesParaExcel = (
  series: SerieMaestro[]
): Array<Record<string, ExcelCellValue>> => series.map((item) => ({
  nombre: item.nombre_dms ?? null,
  autogenerada: siNo(item.autogenerada),
  ultimo_numero: Number(item.ultimo_numero || 0),
  activo: siNo(item.activo),
  tipo_documento: item.tipo_documento ?? null,
  numero: String(item.numero_dms ?? item.serie ?? ''),
  tipo_documento_referencia: item.tipo_documento_referencia ?? null,
  codigo_local_dms: item.codigo_local_dms ?? null,
  nombre_local_dms: item.nombre_local_dms ?? null,
  telefono_local_dms: item.telefono_local_dms ?? null,
  correo_local_dms: item.correo_local_dms ?? null,
  direccion_comercial_dms: item.direccion_comercial_dms ?? null,
  serie_pos: siNo(item.serie_pos),
  serie_contingencia: siNo(item.contingencia)
}));

export const exportarSeriesMaestro = (series: SerieMaestro[]) => {
  exportarExcel('faregas_series_dms', 'Series', COLUMNAS_SERIES_DMS, mapearSeriesParaExcel(series));
};
