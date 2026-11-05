import type { ResumenMensualFacturacionResponse } from '../services/faregas-dashboard.api';
import { exportarExcelVariasHojas, type ExcelSheetDefinition } from './exportar-excel';

type Doc = Record<string, any>;
const clase = (doc: Doc) => String(doc.tipo_comprobante || 'SIN TIPO').trim();
const fechaCelda = (value: unknown) => {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
};
const estado = (doc: Doc) => {
  const tecnico = String(doc.estado_tecnico || '').toUpperCase();
  const demo = /DEMO|PRUEBA|TEST/i.test(`${doc.entorno_facturador || ''} ${doc.proveedor || ''}`);
  if (tecnico === 'ANULADO') return 'ANULADO';
  if (demo) return 'DEMO';
  if ((doc.aceptada_sunat === true || doc.aceptada_sunat === 't') && String(doc.entorno_facturador || '').toUpperCase() === 'PRODUCCION') return 'ACEPTADO';
  if (tecnico.includes('RECHAZ')) return 'RECHAZADO';
  if (tecnico.includes('ERROR')) return 'ERROR';
  if (/PEND|ENVIAD|REGISTRAD|EMITID/i.test(tecnico)) return 'PENDIENTE';
  if (doc.sunat_responsecode) return 'ERROR';
  return 'OTRO';
};
const columnasTotales = [
  { key: 'tipo', header: 'TIPO DE DOCUMENTO', width: 38 }, { key: 'documentos', header: '# DOCUMENTOS', width: 18 },
  { key: 'aceptados', header: 'ACEPTADOS', width: 16 }, { key: 'pendientes', header: 'PENDIENTES', width: 16 },
  { key: 'errores', header: 'ERRORES', width: 14 }, { key: 'rechazados', header: 'RECHAZADOS', width: 16 },
  { key: 'efectividad', header: 'EFECTIVIDAD', width: 16 }, { key: 'ultima', header: 'ÚLTIMA EMISIÓN', width: 24 }
];
const columnasErrores = [
  { key: 'tipo', header: 'TIPO DE DOCUMENTO', width: 32 }, { key: 'estado', header: 'ESTADO', width: 18 },
  { key: 'id', header: 'ID DOCUMENTO', width: 20 }, { key: 'numero', header: 'NÚMERO DE DOCUMENTO', width: 24 },
  { key: 'emision', header: 'FECHA DE EMISIÓN', width: 22 }, { key: 'documento', header: 'FECHA DEL DOCUMENTO', width: 22 },
  { key: 'origen', header: 'ORIGEN PETICIÓN', width: 24 }, { key: 'codigo', header: 'CÓDIGO DE ERROR', width: 20 }, { key: 'observaciones', header: 'OBSERVACIONES', width: 60 }
];

export function construirResumenMensualFacturacion(data: ResumenMensualFacturacionResponse, periodo: string, ahora = new Date()): ExcelSheetDefinition[] {
  const unique = new Map<string, Doc>();
  (data.cabeceras || []).forEach((doc, index) => {
    const id = String(doc.id_documento ?? `${clase(doc)}-${doc.serie}-${doc.numero}-${index}`);
    if (!unique.has(id)) unique.set(id, doc);
  });
  const docs = [...unique.values()];
  const knownIssuers = [...new Set(docs.map((doc) => String(doc.ruc_emisor || doc.empresa_emisora || '')).filter(Boolean))];
  const empresas = new Map<string, Doc[]>();
  docs.forEach((doc) => {
    const issuer = String(doc.ruc_emisor || doc.empresa_emisora || (knownIssuers.length === 1 ? knownIssuers[0] : 'EMISOR_NO_INFORMADO'));
    empresas.set(issuer, [...(empresas.get(issuer) || []), doc]);
  });
  if (!empresas.size) empresas.set('EMISOR_NO_INFORMADO', []);
  const sheets: ExcelSheetDefinition[] = [];
  for (const [issuerKey, issuerDocs] of empresas) {
    const tipoMap = new Map<string, Doc[]>();
    issuerDocs.forEach((doc) => tipoMap.set(clase(doc), [...(tipoMap.get(clase(doc)) || []), doc]));
    const totals = [...tipoMap.entries()].map(([tipo, group]) => {
      const accepted = group.filter((doc) => estado(doc) === 'ACEPTADO').length;
      return { tipo, documentos: group.length, aceptados: accepted, pendientes: group.filter((doc) => estado(doc) === 'PENDIENTE').length,
        errores: group.filter((doc) => estado(doc) === 'ERROR').length, rechazados: group.filter((doc) => estado(doc) === 'RECHAZADO').length,
        efectividad: group.length ? Number((accepted * 100 / group.length).toFixed(2)) : 0,
        ultima: group.map((doc) => fechaCelda(doc.fecha_emision)).filter(Boolean).sort().at(-1) || '' };
    }).sort((a, b) => a.tipo.localeCompare(b.tipo));
    const errores = issuerDocs.filter((doc) => ['ERROR', 'RECHAZADO'].includes(estado(doc))).map((doc) => ({
      tipo: clase(doc), estado: estado(doc), id: doc.id_documento || '', numero: [doc.serie, doc.numero].filter(Boolean).join('-'),
      emision: fechaCelda(doc.fecha_emision), documento: fechaCelda(doc.fecha_documento), origen: doc.origen_peticion || '',
      codigo: doc.sunat_responsecode || '', observaciones: [doc.error_detalle || doc.sunat_description || '', doc.clase_documento === 'NOTA DE CRÉDITO' && doc.fecha_aceptacion ? `Fecha de aceptación (no es fecha de emisión): ${fechaCelda(doc.fecha_aceptacion)}` : ''].filter(Boolean).join(' | ')
    }));
    const first = issuerDocs[0] || {};
    const suffix = empresas.size > 1 ? `_${issuerKey}` : '';
    const metadata: Array<[string, string]> = [
      ['Empresa', [first.ruc_emisor || '', first.empresa_emisora || data.metadatos?.empresasEmisoras?.[0] || ''].filter(Boolean).join(' - ')],
      ['Fecha de Inicio', `${periodo}-01`],
      ['Fecha de Fin', (() => { const [year, month] = periodo.split('-').map(Number); return `${periodo}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`; })()],
      ['Fecha Reporte', ahora.toLocaleString('es-PE', { timeZone: 'America/Lima' })]
    ];
    sheets.push({ name: `Totales${suffix}`.slice(0, 31), title: 'Documento excel con el resumen del mes', metadata, note: 'EFECTIVIDAD = aceptados SUNAT en PRODUCCIÓN / # DOCUMENTOS. ANULADOS, DEMO y otros estados solo se incluyen en # DOCUMENTOS. NC se filtran por aceptación; su fecha de emisión no está almacenada.', headerRow: 7, columns: columnasTotales, rows: totals });
    sheets.push({ name: `Errores${suffix}`.slice(0, 31), headerRow: 1, columns: columnasErrores, rows: errores });
  }
  return sheets;
}

export function exportarResumenMensualFacturacion(data: ResumenMensualFacturacionResponse, periodo: string) {
  if (!Array.isArray(data?.cabeceras)) throw new Error('El servidor no devolvió los documentos del período.');
  exportarExcelVariasHojas(`faregas_resumen_mensual_facturacion_${periodo}`, construirResumenMensualFacturacion(data, periodo));
}
