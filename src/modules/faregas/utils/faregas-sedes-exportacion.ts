import type { Sede } from '../services/faregas-config.api';
import {
  exportarExcel,
  type ExcelColumn,
  type ExcelCellValue
} from './exportar-excel';

/**
 * Columnas del catálogo de sedes.
 *
 * Se mantiene el detalle operativo que FAREGAS necesita (código, dirección,
 * teléfono, correo, empresa y tarifas) porque son datos reales de `fg_planta`.
 * El maestro DMS de categorías es una lista distinta y no se mezcla aquí.
 */
export const COLUMNAS_SEDES: ExcelColumn[] = [
  { key: 'codigo', header: 'CÓDIGO', width: 14, format: 'text' },
  { key: 'nombre', header: 'NOMBRE', width: 26 },
  { key: 'direccion', header: 'DIRECCIÓN', width: 60 },
  { key: 'telefono', header: 'TELÉFONO', width: 22, format: 'text' },
  { key: 'correo', header: 'CORREO', width: 30 },
  { key: 'empresa', header: 'EMPRESA', width: 34 },
  { key: 'tarifas', header: 'TARIFAS', width: 12 },
  { key: 'estado', header: 'ESTADO', width: 14 }
];

export const mapearSedesParaExcel = (
  sedes: Sede[]
): Array<Record<string, ExcelCellValue>> => sedes.map((sede) => ({
  codigo: String(sede.key ?? ''),
  nombre: sede.nombre,
  // NULL del maestro se escribe como celda vacía, no como cadena "null".
  direccion: sede.direccion ?? null,
  telefono: sede.telefono ?? null,
  correo: sede.correo ?? null,
  empresa: sede.empresa_nombre ?? null,
  tarifas: Number(sede.total_tarifas || 0),
  estado: sede.activo ? 'ACTIVA' : 'INACTIVA'
}));

export const exportarSedesCatalogo = (sedes: Sede[]) => {
  exportarExcel('faregas_sedes', 'Sedes', COLUMNAS_SEDES, mapearSedesParaExcel(sedes));
};
