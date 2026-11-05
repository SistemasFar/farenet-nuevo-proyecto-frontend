import type { RegistroVentasTributarioResponse } from '../services/faregas-dashboard.api';
import { exportarExcelVariasHojas, type ExcelCellValue, type ExcelColumn, type ExcelSheetDefinition } from './exportar-excel';

type Doc = Record<string, any>;
const n = (value: unknown): ExcelCellValue => value === null || value === undefined || value === '' ? '' : Number.isFinite(Number(value)) ? Number(value) : '';
const esNC = (doc: Doc) => String(doc.clase_documento || doc.tipo_comprobante || '').toUpperCase().includes('NOTA DE CRÉDITO');
const conSigno = (doc: Doc, value: unknown): ExcelCellValue => { const parsed = n(value); return typeof parsed !== 'number' ? parsed : esNC(doc) ? -Math.abs(parsed) : parsed; };
function buscarCampoFiscal(input: unknown, nombres: string[]): unknown {
  let value = input;
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return undefined; } }
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  for (const nombre of nombres) if (Object.hasOwn(record, nombre) && record[nombre] !== null && record[nombre] !== undefined && record[nombre] !== '') return record[nombre];
  for (const child of Object.values(record)) { const found = buscarCampoFiscal(child, nombres); if (found !== undefined) return found; }
  return undefined;
}
const fecha = (value: unknown) => {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : '';
};
const estadoRegistro = (doc: Doc) => {
  const entorno = String(doc.entorno_facturador || '').toUpperCase();
  const fechaAceptacion = doc.clase_documento === 'NOTA DE CRÉDITO' && doc.fecha_aceptacion ? `PERÍODO SEGÚN ACEPTACIÓN ${fecha(doc.fecha_aceptacion)}; FECHA EMISIÓN NO DISPONIBLE` : '';
  const fiscal = (value: string) => [value, fechaAceptacion].filter(Boolean).join(' | ');
  if (entorno === 'DEMO') return fiscal(`DEMO - ${doc.estado_tecnico || 'SIN ESTADO TÉCNICO'} - NO ES ACEPTACIÓN DE PRODUCCIÓN`);
  if ((doc.aceptada_sunat === true || doc.aceptada_sunat === 't') && entorno === 'PRODUCCION') return fiscal('ACEPTADO SUNAT EN PRODUCCIÓN');
  if (doc.aceptada_sunat === true || doc.aceptada_sunat === 't') return fiscal('ACEPTACIÓN REGISTRADA - ENTORNO NO VERIFICADO');
  return fiscal([`TÉCNICO: ${doc.estado_tecnico || 'SIN ESTADO'}`, `FISCAL: ${doc.sunat_responsecode || 'SIN ACEPTACIÓN VERIFICABLE'}`].join(' | '));
};
const spec: Array<[string, string, number, ExcelColumn['format']?]> = [
  ['periodo','PERÍODO',14],['correlativo','NÚMERO CORRELATIVO O CÓDIGO ÚNICO DE LA OPERACIÓN',30,'text'],['secuencia','SECUENCIA',14,'text'],['fechaEmision','FECHA DE EMISIÓN DEL COMPROBANTE DE PAGO O DOCUMENTO',28],
  ['fechaVencimiento','FECHA DE VENCIMIENTO O FECHA DE PAGO',28],['tipo','TIPO DE COMPROBANTE DE PAGO O DOCUMENTO',32],['serie','SERIE DE COMPROBANTE DE PAGO O DOCUMENTO',26,'text'],['numero','NÚMERO DE COMPROBANTE DE PAGO O DOCUMENTO',28,'text'],
  ['ticket','PARA EFECTOS DEL REGISTRO DE TICKETS O CINTAS EMITIDOS POR MÁQUINAS REGISTRADORAS',48],['tipoDocumento','TIPO DOC. IDENTIDAD CLIENTE',24],['numeroDocumento','NÚMERO DOC. IDENTIDAD CLIENTE',26,'text'],['cliente','APELLIDOS Y NOMBRES DENOMINACION O RAZÓN SOCIAL CLIENTE',46],
  ['exportacion','VALOR FACTURADO DE LA EXPORTACIÓN',24,'decimal2'],['base','BASE IMPONIBLE DE LA OPERACIÓN GRAVADA',26,'decimal2'],['descuentoBase','DESCUENTO DE LA BASE IMPONIBLE',26,'decimal2'],['igv','IMPUESTO GENERAL A LAS VENTAS Y/O IMPUESTO DE PROMOCIÓN MUNICIPAL',42,'decimal2'],['descuentoIgv','DESCUENTO DEL IMPUESTO GENERAL A LAS VENTAS Y/O IMPUESTO DE PROMOCIÓN MUNICIPAL',48,'decimal2'],
  ['exonerado','IMPORTE TOTAL DE LA OPERACIÓN EXONERADA',32,'decimal2'],['inafecto','IMPORTE TOTAL DE LA OPERACIÓN INAFECTA',30,'decimal2'],['isc','IMPUESTO SELECTIVO AL CONSUMO',26,'decimal2'],['baseArroz','BASE IMPONIBLE DE LA OPERACIÓN GRAVADA VENTAS ARROZ PILADO',44,'decimal2'],['igvArroz','IMPUESTO A LAS VENTAS ARROZ PILADO',30,'decimal2'],['bolsas','IMPUESTO AL CONSUMO DE BOLSAS DE PLÁSTICO',34,'decimal2'],['otrosTributos','OTROS TRIBUTOS Y CARGOS QUE NO FORMAN PARTE DE LA BASE IMPONIBLE',44,'decimal2'],
  ['total','IMPORTE TOTAL DEL COMPROBANTE DE PAGO',32,'decimal2'],['moneda','MONEDA',14],['tipoCambio','TIPO DE CAMBIO',18,'decimal2'],['fechaReferencia','FECHA DE REF. DEL COMPROBANTE DE PAGO O DOCUMENTO MODIFICADO',40],['tipoReferencia','TIPO DE REF. DEL COMPROBANTE DE PAGO O DOCUMENTO MODIFICADO',44],['serieReferencia','SERIE DE REF. DEL COMPROBANTE DE PAGO O DOCUMENTO MODIFICADO',40,'text'],['numeroReferencia','NÚMERO DE REF. DEL COMPROBANTE DE PAGO O DOCUMENTO MODIFICADO',42,'text'],
  ['contrato','IDENTIFICACIÓN DEL CONTRATO O PROYECTO (JOINT VENTURES)',42],['errorTipoCambio','ERROR 1: INCONSISTENCIA EN EL TIPO DE CAMBIO',40],['medioPago','INDICADOR DE COMPROBANTES DE PAGO CANCELADOS CON MEDIOS DE PAGO',42],['estado','ESTADO',22]
];

export function construirHojasRegistroVentasTributario(data: RegistroVentasTributarioResponse, periodo: string): ExcelSheetDefinition[] {
  const unique = new Map<string, Doc>();
  (data.documentos || []).forEach((doc, index) => {
    const id = String(doc.id_documento ?? `${doc.tipo_comprobante}-${doc.serie}-${doc.numero}-${index}`);
    if (!unique.has(id)) unique.set(id, doc);
  });
  const knownIssuers = [...new Set([...unique.values()].map((doc) => String(doc.ruc_emisor || doc.empresa_emisora || '')).filter(Boolean))];
  const groups = new Map<string, Doc[]>();
  [...unique.values()].forEach((doc) => { const key = String(doc.ruc_emisor || doc.empresa_emisora || (knownIssuers.length === 1 ? knownIssuers[0] : 'EMISOR_NO_INFORMADO')); groups.set(key, [...(groups.get(key) || []), doc]); });
  if (!groups.size) groups.set('EMISOR_NO_INFORMADO', []);
  return [...groups.entries()].map(([issuer, docs]) => {
    const rows = docs.map((doc) => {
      const fiscal = doc.datos_fiscales;
      const amount = (keys: string[]) => conSigno(doc, buscarCampoFiscal(fiscal, keys));
      return {
        periodo: periodo.replace('-', ''), secuencia: '', fechaEmision: fecha(doc.fecha_emision), fechaVencimiento: fecha(doc.fecha_vencimiento),
        tipo: doc.tipo_comprobante || '', serie: doc.serie || '', numero: doc.numero ?? '', correlativo: doc.codigo_unico || doc.id_documento || '', ticket: '', tipoDocumento: doc.tipo_documento || '', numeroDocumento: doc.numero_documento || '', cliente: doc.cliente || '',
        exportacion: amount(['valor_exportacion', 'total_exportacion']), base: conSigno(doc, doc.base_imponible), descuentoBase: amount(['descuento_base_imponible', 'descuento_base']), igv: conSigno(doc, doc.igv), descuentoIgv: amount(['descuento_igv']),
        exonerado: amount(['total_exonerada', 'operaciones_exoneradas']), inafecto: amount(['total_inafecta', 'operaciones_inafectas']), isc: amount(['isc', 'total_isc']), baseArroz: amount(['base_imponible_arroz_pilado']),
        igvArroz: amount(['igv_arroz_pilado']), bolsas: amount(['impuesto_bolsas_plastico']), otrosTributos: amount(['total_otros_tributos', 'otros_tributos']), total: conSigno(doc, doc.importe_total), moneda: doc.moneda || '',
        tipoCambio: amount(['tipo_de_cambio', 'tipo_cambio']), fechaReferencia: fecha(doc.fecha_referencia), tipoReferencia: doc.tipo_referencia || '', serieReferencia: doc.serie_afectada || '', numeroReferencia: doc.numero_afectado || '',
        contrato: '', errorTipoCambio: '', medioPago: '', estado: estadoRegistro(doc)
      };
    });
    const columns: ExcelColumn[] = spec.map(([key, header, width, format]) => ({ key, header, width, ...(format ? { format } : {}) }));
    const first = docs[0] || {};
    const suffix = groups.size > 1 ? `_${issuer}` : '';
    const currencies = [...new Set(docs.map((doc) => doc.moneda).filter(Boolean))];
    return { name: `Hoja1${suffix}`.slice(0, 31), title: 'Registro Verificación Ventas - PLE', metadata: [
      ['Razón Social', [first.ruc_emisor || '', first.empresa_emisora || ''].filter(Boolean).join(' - ')], ['Mes', `${periodo.slice(5)} - ${periodo.slice(0, 4)}`], ['Expresado en', currencies.join(', ')]
    ], headerRow: 7, numberColumnsRow: true, columns, rows };
  });
}

export function exportarRegistroVentasTributario(data: RegistroVentasTributarioResponse, periodo: string) {
  if (!Array.isArray(data?.documentos)) throw new Error('El servidor no devolvió documentos para el registro tributario.');
  exportarExcelVariasHojas(`faregas_revision_ventas_tributario_${periodo}`, construirHojasRegistroVentasTributario(data, periodo));
}
