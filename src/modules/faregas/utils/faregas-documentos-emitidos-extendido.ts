import type { DocumentosEmitidosExtendidoResponse, ReporteFinancieroResponse } from '../services/faregas-dashboard.api';
import { exportarExcelVariasHojas, type ExcelCellValue, type ExcelColumn, type ExcelSheetDefinition } from './exportar-excel';
import {
  construirHojaConsolidado,
  construirHojaAnulados,
  construirHojaNotasCredito,
  construirHojaHistorial,
  construirHojasReporteFinanciero
} from './faregas-reporte-financiero';

// FUSIÓN SIN PÉRDIDA: este módulo es el único generador de descarga.
// Re-exporta el consolidado para que la vista llame una sola función.
export {
  construirHojaConsolidado,
  construirHojaAnulados,
  construirHojaNotasCredito,
  construirHojaHistorial,
  construirHojasReporteFinanciero
};

const numero = (value: unknown) => Number(value || 0);
const decimal = (value: unknown) => Number(numero(value).toFixed(2));
const fechaLocal = (value: unknown) => {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toLocaleString('es-PE', { timeZone: 'America/Lima' });
};
const columnas = (...items: Array<[string, string, number?, ExcelColumn['format']?]>): ExcelColumn[] => items.map(([key, header, width, format]) => ({ key, header, width, format }));
const esVerdaderoLocal = (v: unknown) => v === true || v === 't' || v === 1 || v === '1';
const limpiarDoc = (v: unknown) => String(v ?? '').trim().replace(/^\s*(?:DNI|RUC|CE|C\.E\.|PASAPORTE)\s*[:.-]?\s*/i, '').trim();
const serial = (doc: Record<string, any>) => doc.serie && doc.numero ? `${doc.serie}-${doc.numero}` : `${doc.serie || ''}${doc.numero ? `-${doc.numero}` : ''}`;

const datosDinamicos = (input: unknown): Record<string, ExcelCellValue> => {
  let value: unknown = input;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return {}; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const salida: Record<string, ExcelCellValue> = {};
  const bloqueadas = /token|secret|password|credential|authorization|header|request|url|pdf|xml|cdr|qr|hash|base64/i;
  const recorrer = (obj: Record<string, unknown>, prefijo = '') => {
    Object.entries(obj).forEach(([key, raw]) => {
      if (bloqueadas.test(key)) return;
      const nombre = prefijo ? `${prefijo}.${key}` : key;
      if (raw === null || raw === undefined) return;
      if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') salida[nombre] = raw;
      else if (Array.isArray(raw)) {
        const primitivos = raw.filter((item) => ['string', 'number', 'boolean'].includes(typeof item));
        if (primitivos.length) salida[nombre] = primitivos.join(', ');
        raw.forEach((item, index) => {
          if (item && typeof item === 'object' && !Array.isArray(item)) recorrer(item as Record<string, unknown>, `${nombre}[${index + 1}]`);
        });
      } else if (typeof raw === 'object') recorrer(raw as Record<string, unknown>, nombre);
    });
  };
  recorrer(value as Record<string, unknown>);
  return salida;
};

export const MAPA_TARJETAS: Record<string, string> = {
  '3': 'VISA',
  '4': 'MASTERCARD',
  '5': 'CUPONIDAD',
  '6': 'PAGO WEB',
  '7': 'YAPE',
  '8': 'PLIN'
};

/**
 * Clasificación de pagos (criterio único Datos + Consolidado).
 * Devuelve TIPO (EFECTIVO/TARJETA/BANCO/CRÉDITO) y FORMA (EFECTIVO/CUPONIDAD/
 * MASTERCARD/PAGO WEB/PLIN/VISA/YAPE/BANCO/N CUOTAS) sin inventar.
 */
export function clasificarPagos(
  pagos: Array<Record<string, any>>,
  importeNeto: number,
  importePagado: number,
  creditoInfo?: { esCredito?: boolean; cuotasCount?: number; esCortesia?: boolean }
): { tipoPago: string; formaPago: string } {
  if (creditoInfo?.esCortesia) {
    return { tipoPago: 'CORTESÍA', formaPago: 'CORTESÍA' };
  }
  if (creditoInfo?.esCredito) {
    const cuotas = Number(creditoInfo.cuotasCount || 0);
    const forma = cuotas > 1 ? `${cuotas} CUOTAS` : '1 CUOTA';
    return { tipoPago: 'CRÉDITO', formaPago: forma };
  }
  const confirmar = pagos.filter((p) => ['CAN', 'CONFIRMADO', 'PAGADO'].includes(String(p?.estado || '').toUpperCase()));
  if (!confirmar.length) {
    if (importeNeto <= 0 && importePagado <= 0) return { tipoPago: 'NO APLICA', formaPago: 'NO APLICA' };
    if (importeNeto > 0) return { tipoPago: 'SIN PAGO', formaPago: 'SIN PAGO' };
    return { tipoPago: 'SIN IDENTIFICAR', formaPago: 'SIN IDENTIFICAR' };
  }
  const tipos = [...new Set(confirmar.map((p) => {
    const t = String(p.tipocontado_key || p.medio_pago || '').trim().toUpperCase();
    if (t.includes('EFECTIVO')) return 'EFECTIVO';
    if (t.includes('BANCO') || t.includes('TRANSFER') || t.includes('DEPOS')) return 'BANCO';
    if (t.includes('TARJETA')) return 'TARJETA';
    if (t === '') return 'SIN IDENTIFICAR';
    return 'SIN IDENTIFICAR';
  }))];
  const formas = [...new Set(confirmar.map((p) => {
    const rawF = String(p.tipo_tarjeta || p.tarjeta_key || p.modalidad_tarjeta || '').trim().toUpperCase();
    const f = MAPA_TARJETAS[rawF] || rawF;
    const t = String(p.tipocontado_key || p.medio_pago || '').trim().toUpperCase();
    if (t.includes('EFECTIVO')) return 'EFECTIVO';
    if (t.includes('BANCO') && !f) return 'BANCO';
    if (f) return f;
    if (t.includes('BANCO')) return 'BANCO';
    if (t.includes('TARJETA')) return 'SIN IDENTIFICAR';
    return 'SIN IDENTIFICAR';
  }))];
  return { tipoPago: tipos.join(' + ') || 'SIN IDENTIFICAR', formaPago: formas.join(' + ') || 'SIN IDENTIFICAR' };
}

export function horaEmisionExtendida(doc: Record<string, any>): string {
  const estadoCert = String((doc as any).certificado_estado || '').toUpperCase();
  if (estadoCert === 'BORRADOR') return 'NO EMITIDO';
  if (estadoCert && !['EMITIDO', 'ANULADO'].includes(estadoCert)) return 'NO EMITIDO';
  if (!doc.certificado_id && !(doc as any).certificados) return '';
  // FASE 3: única fuente confiable = fecha_hora_emision (timestamptz).
  const rawHora = (doc as any).fecha_hora_emision ?? (doc as any).hora_emision_certificado;
  if (!rawHora) return 'SIN REGISTRO';
  const texto = String(rawHora).trim();
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(texto) && !/Z$|[+-]\d{2}:?\d{2}$/.test(texto)) {
    const m = texto.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) return `${m[1]}:${m[2]}:${m[3] || '00'}`;
  }
  const fh = new Date(texto);
  if (!Number.isNaN(fh.getTime())) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(fh);
    const part = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value || '';
    return `${part('hour')}:${part('minute')}:${part('second')}`;
  }
  return 'SIN REGISTRO';
}

export function horaEmisionComprobanteExtendida(doc: Record<string, any>): string {
  const estadoComp = String((doc as any).estado || '').toUpperCase();
  if (estadoComp === 'BORRADOR') return 'NO EMITIDO';
  const rawHora = (doc as any).fecha_hora_emision_comprobante ?? (doc as any).hora_emision_comprobante;
  if (!rawHora) return 'SIN REGISTRO';
  const texto = String(rawHora).trim();
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(texto) && !/Z$|[+-]\d{2}:?\d{2}$/.test(texto)) {
    const m = texto.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) return `${m[1]}:${m[2]}:${m[3] || '00'}`;
  }
  const fh = new Date(texto);
  if (!Number.isNaN(fh.getTime())) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(fh);
    const part = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value || '';
    return `${part('hour')}:${part('minute')}:${part('second')}`;
  }
  return 'SIN REGISTRO';
}

export function resolverTipoProductoLinea(line: Record<string, any>): string {
  const raw = String(line.tipo_producto || '').trim();
  if (raw === 'COMPLEMENTARIO DUPLICADO' || raw === 'COMPLEMENTARIO VENTA DE PRODUCTO') return raw;
  if (line.duplicado_id || /DUPLICADO/i.test(String(line.producto || line.codigo_producto || ''))) {
    return 'COMPLEMENTARIO DUPLICADO';
  }
  if (/CHIP/i.test(String(line.producto || line.codigo_producto || '')) || (!line.certificado && !line.placa && !line.operacion_id && line.venta_id)) {
    return 'COMPLEMENTARIO VENTA DE PRODUCTO';
  }
  if (raw && !raw.startsWith('COMPLEMENTARIO')) return raw;
  return 'COMPLEMENTARIO VENTA DE PRODUCTO';
}

export function resolverUnidadMedidaSunatLine(line: Record<string, any>): string {
  const desc = String(line.producto || line.descripcion || line.codigo_producto || line.codigoProducto || '').trim().toUpperCase();
  const tipoProd = String(line.tipo_producto || line.tipoProducto || '').trim().toUpperCase();
  const unidadOriginal = String(line.unidad || '').trim().toUpperCase();

  // 1. Duplicados de certificados -> ZZ (cobro de servicio)
  if (line.duplicado_id || /DUPLICADO/i.test(tipoProd) || /DUPLICADO/i.test(desc)) {
    return 'ZZ';
  }

  // 2. CHIP y PORTA CHIP vendidos como bienes físicos -> NIU
  if (/PORTA\s*CHIP/i.test(desc) || /PORTACHIP/i.test(desc) || /\bCHIP\b/i.test(desc) || /CHIP/i.test(desc)) {
    return 'NIU';
  }

  // 3. Certificados anuales GLP / GNV / Conformidad / Servicios / Inspecciones -> ZZ
  if (
    line.certificado_id ||
    line.certificado ||
    /GLP/i.test(tipoProd) ||
    /GNV/i.test(tipoProd) ||
    /CONFORMIDAD/i.test(tipoProd) ||
    /CERTIFIC/i.test(tipoProd) ||
    /INSPECC/i.test(tipoProd) ||
    /SERVICIO/i.test(tipoProd) ||
    /GLP/i.test(desc) ||
    /GNV/i.test(desc) ||
    /CONFORMIDAD/i.test(desc) ||
    /CERTIFIC/i.test(desc) ||
    /INSPECC/i.test(desc) ||
    /SERVICIO/i.test(desc) ||
    /ANUAL/i.test(desc)
  ) {
    return 'ZZ';
  }

  // 4. Bienes físicos u otros: respetar unidad física existente si no es ZZ, de lo contrario NIU
  if (unidadOriginal && unidadOriginal !== 'ZZ') {
    return unidadOriginal;
  }
  return 'NIU';
}

export function resolverTipoCertificadoDoc(doc: Record<string, any>): string {
  const raw = String(doc.tipos_producto || '').trim();
  if (raw === 'COMPLEMENTARIO DUPLICADO' || raw === 'COMPLEMENTARIO VENTA DE PRODUCTO') return raw;
  if (raw && raw !== 'COMPLEMENTARIO') return raw;
  if (doc.duplicado_id || /DUPLICADO/i.test(String(doc.certificados || doc.tipo_comprobante || ''))) {
    return 'COMPLEMENTARIO DUPLICADO';
  }
  if (!doc.certificados || /CHIP/i.test(String(doc.descripcion || doc.producto || ''))) {
    return 'COMPLEMENTARIO VENTA DE PRODUCTO';
  }
  return raw || 'COMPLEMENTARIO VENTA DE PRODUCTO';
}

export function indicadorAnulacionComprobante(doc: Record<string, any>): boolean {
  if (!doc) return false;
  const estados = [String((doc as any).estado_solicitud_anulacion || '').toUpperCase(),
    String((doc as any).estado_nota_credito || '').toUpperCase()];
  const activos = ['PENDIENTE', 'PENDIENTE_SUNAT', 'ACEPTADO', 'ACEPTADA', 'CONFIRMADO', 'EN_TRAMITE', 'EN TRAMITE', 'PROCESO', 'VIGENTE', 'EMITIDO', 'VALIDO'];
  if ((doc as any).documento_anulacion && !estados.includes('RECHAZADO')) return true;
  if (estados.some((e) => activos.includes(e))) return true;
  if (Number((doc as any).cantidad_notas_credito || 0) > 0) return true;
  if (Boolean((doc as any).notas_credito)) return true;
  return false;
}

export function construirHojasDocumentosEmitidosExtendido(data: DocumentosEmitidosExtendidoResponse, desde = '', hasta = ''): ExcelSheetDefinition[] {
  const knownRucs = [...new Set(data.cabeceras.map((doc) => String(doc.ruc_emisor || '')).filter(Boolean))];
  const issuerByCompany = new Map<string, Set<string>>();
  data.cabeceras.forEach((doc) => {
    if (doc.ruc_emisor && doc.empresa_emisora) issuerByCompany.set(doc.empresa_emisora, new Set([...(issuerByCompany.get(doc.empresa_emisora) || []), String(doc.ruc_emisor)]));
  });
  const issuerKeyFor = (doc: Record<string, any>) => {
    if (doc.ruc_emisor) return String(doc.ruc_emisor);
    const matches = [...(issuerByCompany.get(String(doc.empresa_emisora || '')) || [])];
    if (matches.length === 1) return matches[0];
    if (!doc.empresa_emisora && knownRucs.length === 1) return knownRucs[0];
    return String(doc.empresa_emisora || 'EMISOR_NO_INFORMADO');
  };
  const cabeceras = data.cabeceras.map((doc) => {
    const fields = datosDinamicos(doc.campos_dinamicos);
    const extra = (key: string): ExcelCellValue => Object.entries(fields).find(([name]) => name.toLowerCase().includes(key.toLowerCase()))?.[1] ?? '';
    const relatedLines = data.lineas.filter((line) => String(line.documentos_asociados || '').split(', ').includes(serial(doc)));
    const uniqueLine = relatedLines.length === 1 ? relatedLines[0] : undefined;
    const estadoTecnico = String(doc.estado || '');
    const motivoFiscal = /ANUL|ERROR|RECHAZ/i.test(estadoTecnico) ? doc.sunat_soap_error || doc.sunat_description || '' : '';
    const esPendiente = String((doc as any).estado_solicitud_anulacion || '').toUpperCase() === 'PENDIENTE' || (doc as any).aceptada_anulacion_sunat == null && estadoTecnico === 'PENDIENTE_SUNAT';
    const esRechazada = String((doc as any).estado_solicitud_anulacion || '').toUpperCase() === 'RECHAZADO';
    const anulacionConfirmada = esVerdaderoLocal((doc as any).aceptada_anulacion_sunat) && (doc as any).fecha_anulacion_confirmacion;
    const estadoAnulacionUI = anulacionConfirmada ? 'ANULADO' : esPendiente && doc.documento_anulacion ? 'SOLICITUD PENDIENTE' : esRechazada ? 'RECHAZADA' : doc.documento_anulacion ? String((doc as any).estado_solicitud_anulacion || 'PENDIENTE') : 'SIN SOLICITUD';
    const esCreditoDoc = String((doc as any).condicion_pago || '').toUpperCase() === 'CREDITO';
    const cuotasDoc = Number((doc as any).cuotas_count || (doc as any).max_cuota || 0);
    const formaPagoCredito = cuotasDoc > 1 ? `${cuotasDoc} CUOTAS` : '1 CUOTA';
    const rawForma = String((doc as any).forma_pago || '').trim();
    const formaNormalizada = rawForma.split(' + ').map((item) => MAPA_TARJETAS[item.trim()] || item.trim()).join(' + ');
    const esCortesiaDoc = Boolean(
      (doc as any).es_cortesia
      || String((doc as any).tipo_pago || '').toUpperCase() === 'CORTESÍA'
      || String((doc as any).tipo_pago || '').toUpperCase() === 'CORTESIA'
      || String((doc as any).forma_pago || '').toUpperCase() === 'CORTESÍA'
      || String((doc as any).forma_pago || '').toUpperCase() === 'CORTESIA'
      || (Number(doc.importe_total || 0) === 0 && JSON.stringify(doc.campos_dinamicos || '').includes('1002'))
    );
    const tipoPagoExtendido = esCortesiaDoc ? 'CORTESÍA' : esCreditoDoc ? 'CRÉDITO' : ((doc as any).tipo_pago || '');
    const formaPagoExtendido = esCortesiaDoc ? 'CORTESÍA' : esCreditoDoc ? formaPagoCredito : (formaNormalizada || '');
    const montoPagoExtendido = ((): string | number => {
      if (esCortesiaDoc) return 'S/ 0.00';
      if ((doc as any).desglose_pagos) return (doc as any).desglose_pagos;
      if (doc.monto_pagado === null || doc.monto_pagado === undefined) return 'S/ 0.00';
      const m = decimal(doc.monto_pagado);
      return m > 0 ? m : 'S/ 0.00';
    })();
    return {
      issuerKey: issuerKeyFor(doc),
      docId: String(doc.id_documento || ''), fuenteFecha: doc.fecha_emision_fuente || '', tipo: doc.tipo_comprobante || '', numeroDocumento: serial(doc), fechaEmision: doc.fecha_emision ? fechaLocal(doc.fecha_emision) : '',
      horaEmisionCertificado: horaEmisionExtendida(doc as any),
      horaEmisionComprobante: horaEmisionComprobanteExtendida(doc as any),
      fechaEmisionCertificado: (doc as any).fecha_emision_certificado ? fechaLocal((doc as any).fecha_emision_certificado) : '',
      fechaDocumento: doc.fecha_documento ? fechaLocal(doc.fecha_documento) : '', fechaVencimiento: doc.fecha_vencimiento ? fechaLocal(doc.fecha_vencimiento) : '',
      tipoDocCliente: doc.tipo_documento || '', numeroDocCliente: doc.numero_documento ? limpiarDoc(doc.numero_documento) : '', cliente: doc.cliente || '',
      subtotal: decimal(doc.base_imponible), descuentos: decimal(doc.descuento), igv: decimal(doc.igv), total: decimal(doc.importe_total), moneda: doc.moneda || '',
      fechaReferencia: fechaLocal(doc.fecha_referencia) || extra('fecha_referencia') || '', tipoReferencia: doc.tipo_referencia || extra('tipo_referencia') || '', numeroReferencia: doc.referencia_afectada || extra('numero_referencia') || '',
      usuario: doc.usuario_emisor || (doc as any).usuario_creacion || '', tieneSolicitudAnulacion: (doc as any).documento_anulacion ? 'SÍ' : 'NO', estadoSolicitudAnulacion: estadoAnulacionUI, estado: [doc.estado || '', doc.entorno_facturador ? `ENTORNO: ${doc.entorno_facturador}` : 'ENTORNO NO INFORMADO', doc.proveedor ? `PROVEEDOR: ${doc.proveedor}` : '', doc.aceptada_sunat === true && String(doc.entorno_facturador).toUpperCase() === 'PRODUCCION' ? 'SUNAT: ACEPTADO PRODUCCIÓN' : doc.sunat_responsecode ? `SUNAT: ${doc.sunat_responsecode}` : 'SUNAT: SIN ACEPTACIÓN VERIFICABLE'].filter(Boolean).join(' | '), anulado: indicadorAnulacionComprobante(doc as any) ? 'Sí' : 'No',
      documentoAnulacion: doc.documento_anulacion || '', fechaAnulacionSolicitud: (doc as any).fecha_anulacion_solicitud ? fechaLocal((doc as any).fecha_anulacion_solicitud) : (doc as any).fecha_anulacion ? fechaLocal((doc as any).fecha_anulacion) : '', estadoAnulacionFiscal: anulacionConfirmada ? 'ANULADO' : esRechazada ? 'RECHAZADA' : doc.documento_anulacion ? 'PENDIENTE' : 'SIN SOLICITUD', fechaAnulacionConfirmada: (doc as any).fecha_anulacion_confirmacion ? fechaLocal((doc as any).fecha_anulacion_confirmacion) : '', ticketAnulacion: (doc as any).ticket_anulacion || '', motivoAnulacion: doc.motivo_anulacion || motivoFiscal,
      origen: doc.origen_peticion || '', tipoPago: tipoPagoExtendido, formaPago: formaPagoExtendido, montoPago: montoPagoExtendido,
      referenciaPago: doc.referencia_pago || '', detraccionPorcentaje: extra('detraccion_porcentaje'), detraccionNeto: extra('detraccion_neto'), detraccionImporte: extra('detraccion_importe'),
      tieneNC: doc.notas_credito ? 'Sí' : 'No', cantidadNC: doc.cantidad_notas_credito ?? 0, tieneND: doc.notas_debito ? 'Sí' : 'No', cantidadND: doc.cantidad_notas_debito ?? 0,
      items: relatedLines.length, codigoItem: uniqueLine?.codigo_producto || '', descripcion: uniqueLine?.producto || '', unidad: uniqueLine ? resolverUnidadMedidaSunatLine(uniqueLine) : '',
      cantidad: uniqueLine ? numero(uniqueLine.cantidad) : '', codigoAfectacion: uniqueLine?.codigo_afectacion_igv || '', valorUnitario: uniqueLine ? decimal(uniqueLine.precio_unitario) : '',
      valorReferencia: uniqueLine?.valor_referencial_unitario == null ? '' : decimal(uniqueLine.valor_referencial_unitario), subtotalItem: uniqueLine?.base_imponible == null ? '' : decimal(uniqueLine.base_imponible), descuentosItem: '', rc: '', totalItem: uniqueLine?.importe_total == null ? '' : decimal(uniqueLine.importe_total),
      ejecutivo: extra('ejecutivo'), marca: extra('marca') || doc.marca_vehiculo || '', modelo: extra('modelo') || doc.modelo_vehiculo || '', motor: extra('motor') || doc.motor_vehiculo || '', certificado: doc.certificados || '',
      ordenTrabajo: '', placa: doc.placas || '', referenciaPagoExtra: doc.referencia_pago || '', telefono: doc.telefono_cliente || extra('telefono') || '',
      tipoCertificado: resolverTipoCertificadoDoc(doc as any), empresaEmisora: doc.empresa_emisora || '', rucEmisor: doc.ruc_emisor || '',
      tipoDescuento: doc.tipo_descuento || extra('tipo_descuento'), tipoVehiculo: extra('tipo_vehiculo') || doc.tipo_vehiculo || ''
    };
  });

  const lineas = data.lineas.map((line) => ({
    documento: line.documentos_asociados || '',
    documentIds: line.documentos_ids || '',
    idDetalle: line.id_detalle,
    operacion: line.operacion_id || '',
    venta: line.venta_id || '',
    sede: line.sede || line.planta_key || '',
    tipoProducto: resolverTipoProductoLinea(line),
    codigoProducto: line.codigo_producto || '',
    producto: line.producto || '',
    unidad: resolverUnidadMedidaSunatLine(line),
    cantidad: numero(line.cantidad),
    precioUnitario: decimal(line.precio_unitario),
    base: line.base_imponible === null ? '' : decimal(line.base_imponible),
    igv: line.igv === null ? '' : decimal(line.igv),
    totalLinea: decimal(line.importe_total),
    certificado: line.certificado || '',
    placa: line.placa || ''
  }));

  const headerSpecs: Array<[string, string]> = [
    // A. IDENTIFICACIÓN DEL DOCUMENTO
    ['tipo','TIPO DE DOCUMENTO'],['numeroDocumento','NÚMERO DE DOCUMENTO'],['fechaEmision','FECHA DE EMISIÓN'],['fechaEmisionCertificado','FECHA DE EMISIÓN DEL CERTIFICADO'],['horaEmisionCertificado','HORA DE EMISIÓN DEL CERTIFICADO'],['horaEmisionComprobante','HORA DE EMISIÓN DEL COMPROBANTE'],['usuario','USUARIO EMISOR DEL COMPROBANTE'],['estado','ESTADO'],['empresaEmisora','EMPRESA EMISORA'],['rucEmisor','RUC EMISOR'],
    // B. CLIENTE Y EMISOR (cont.)
    ['tipoDocCliente','TIPO DOC. IDENTIDAD CLIENTE'],['numeroDocCliente','NÚMERO DOC. IDENTIDAD CLIENTE'],['cliente','APELLIDOS Y NOMBRES DENOMINACIÓN O RAZÓN SOCIAL'],
    // C. CERTIFICADO / VEHÍCULO
    ['certificado','Numero Certificado (BV ,NC ,ND ,FT)'],['tipoCertificado','TIPO DE CERTIFICADO'],['placa','Placa (FT ,BV)'],['marca','Marca Vehículo (BV ,FT)'],['modelo','Modelo Vehículo (FT ,BV)'],['motor','Motor Vehículo (FT ,BV)'],['tipoVehiculo','Tipo Vehículo (BV ,FT)'],
    // D. IMPORTES Y DESCUENTOS
    ['subtotal','SUBTOTAL'],['descuentos','DESCUENTOS'],['igv','IGV'],['total','IMPORTE TOTAL'],['moneda','MONEDA'],['fechaDocumento','FECHA DEL DOCUMENTO'],['fechaVencimiento','FECHA DE VENCIMIENTO'],
    // E. PAGOS
    ['tipoPago','TIPO DE PAGO'],['formaPago','FORMA DE PAGO'],['montoPago','MONTO PAGO'],['referenciaPago','REFERENCIA DE PAGO'],['origen','ORIGEN PETICIÓN'],['detraccionPorcentaje','DETRACCIÓN (%)'],['detraccionNeto','DETRACCIÓN / IMPORTE NETO'],['detraccionImporte','DETRACCIÓN / IMPORTE'],['referenciaPagoExtra','Referencia de pago (ND ,BV ,FT ,NC)'],
    // F. ANULACIONES Y NOTAS DE CRÉDITO
    ['estadoSolicitudAnulacion','ESTADO DE SOLICITUD DE ANULACIÓN'],['tieneSolicitudAnulacion','¿TIENE SOLICITUD DE ANULACIÓN?'],['documentoAnulacion','NRO. DOCUMENTO ANULACIÓN'],['fechaAnulacionSolicitud','FECHA DE SOLICITUD DE ANULACIÓN'],['estadoAnulacionFiscal','ESTADO DE ANULACIÓN FISCAL'],['fechaAnulacionConfirmada','FECHA DE ANULACIÓN CONFIRMADA'],['ticketAnulacion','TICKET SUNAT ANULACIÓN'],['anulado','ANULACIÓN / NC REGISTRADA'],['motivoAnulacion','MOTIVO DE ANULACIÓN / RECHAZO'],['tieneNC','TIENE NOTA DE CRÉDITO?'],['cantidadNC','# NOTAS DE CRÉDITO'],['tieneND','TIENE NOTA DE DÉBITO?'],['cantidadND','# NOTAS DE DÉBITO'],['fechaReferencia','FECHA DE REF. DEL COMPROBANTE DE PAGO O DOCUMENTO MODIFICADO'],['tipoReferencia','TIPO DE REF. DEL COMPROBANTE DE PAGO O DOCUMENTO MODIFICADO'],['numeroReferencia','NÚMERO DE DOCUMENTO DE REF. DEL COMPROBANTE DE PAGO O DOCUMENTO MODIFICADO'],
    // G. PRODUCTOS Y DETALLE FISCAL
    ['items','ITEMS'],['codigoItem','CÓDIGO DE ITEM'],['descripcion','DESCRIPCIÓN'],['unidad','UNIDAD'],['cantidad','CANTIDAD'],['codigoAfectacion','CÓDIGO AFECT. IGV'],['valorUnitario','VALOR UNITARIO'],['valorReferencia','VALOR REF. UNITARIO'],['subtotalItem','SUBTOTAL'],['descuentosItem','DESCUENTOS'],['rc','RC'],['totalItem','TOTAL ITEM'],['ejecutivo','Ejecutivo (FT ,BV)'],['ordenTrabajo','Orden Trabajo (ND ,NC ,FT ,BV)'],['telefono','Teléfono (ND ,FT ,BV ,NC)'],['tipoDescuento','Tipo Descuento (BV ,FT)']
  ];
  const columnasCabecera = headerSpecs.map(([key, header]) => ({ key, header, width: Math.max(16, Math.min(header.length + 2, 42)), ...(['subtotal','descuentos','igv','total','montoPago','detraccionNeto','detraccionImporte','valorUnitario','valorReferencia','subtotalItem','descuentosItem','rc','totalItem'].includes(key) ? { format: 'decimal2' as const } : {}) }));
  // Agrupación visual por bloques (1-indexed, encadenada sin huecos).
  const groupHeaders = [
    { header: 'A. IDENTIFICACIÓN DEL DOCUMENTO', start: 1, end: 10 },
    { header: 'B. CLIENTE Y EMISOR', start: 11, end: 13 },
    { header: 'C. CERTIFICADO / VEHÍCULO', start: 14, end: 20 },
    { header: 'D. IMPORTES Y DESCUENTOS', start: 21, end: 27 },
    { header: 'E. PAGOS', start: 28, end: 36 },
    { header: 'F. ANULACIONES Y NOTAS DE CRÉDITO', start: 37, end: 58 },
    { header: 'G. PRODUCTOS Y DETALLE FISCAL', start: 59, end: headerSpecs.length }
  ];

  const issuerGroups = new Map<string, typeof data.cabeceras>();
  data.cabeceras.forEach((doc) => {
    const key = issuerKeyFor(doc);
    issuerGroups.set(key, [...(issuerGroups.get(key) || []), doc]);
  });
  if (!issuerGroups.size) issuerGroups.set('EMISOR_NO_INFORMADO', []);
  const sheets: ExcelSheetDefinition[] = [];
  for (const [issuerKey, issuerDocs] of issuerGroups) {
    const documentIds = new Set(issuerDocs.map((doc) => String(doc.id_documento || '')));
    const docRows = cabeceras.filter((row) => row.issuerKey === issuerKey);
    const lineRows = lineas.filter((row) => {
      const linkedIds = String(row.documentIds || '').split(', ').filter(Boolean);
      if (linkedIds.length) return linkedIds.some((id) => documentIds.has(id));
      return issuerGroups.size === 1 && issuerDocs.some((doc) => String(row.documento || '').split(', ').includes(serial(doc)));
    });
    const suffix = issuerGroups.size > 1 ? `_${issuerKey}` : '';
    const common: Pick<ExcelSheetDefinition, 'title' | 'metadata' | 'headerRow' | 'groupHeaders'> = {
      title: 'Registro de comprobantes electrónicos emitidos - Extendido - Campos Extra',
      metadata: [['Empresa', [issuerDocs[0]?.ruc_emisor || '', issuerDocs[0]?.empresa_emisora || ''].filter(Boolean).join(' - ')], ['Fecha de Emisión / Inicio', desde], ['Fecha de Emisión / Fin', hasta], ['Fecha Reporte', new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })]], headerRow: 7, groupHeaders
    };
    sheets.push({ name: `Datos${suffix}`.slice(0, 31), columns: columnasCabecera, rows: docRows, ...common });
    sheets.push({ name: (issuerGroups.size > 1 ? `Líneas_${issuerKey}` : 'Líneas de productos').slice(0, 31), columns: columnas(
      ['documento', 'Documentos asociados', 26],
      ['sede', 'Sede', 24], ['tipoProducto', 'Tipo de producto', 26], ['codigoProducto', 'Código de producto', 22, 'text'],
      ['producto', 'Producto o servicio', 38], ['unidad', 'Unidad', 14], ['cantidad', 'Cantidad', 14], ['precioUnitario', 'Precio unitario', 18, 'decimal2'],
      ['base', 'Base imponible', 18, 'decimal2'], ['igv', 'IGV', 14, 'decimal2'], ['totalLinea', 'Total de línea', 18, 'decimal2'],
      ['certificado', 'Certificado relacionado', 26], ['placa', 'Placa', 18]
    ), rows: lineRows });
  }
  return sheets;
}

/**
 * REESTRUCTURACIÓN DEFINITIVA EN 5 HOJAS:
 * 1. Datos (o Datos_<emisor>)
 * 2. Líneas de productos (13 columnas sin IDs técnicos)
 * 3. Consolidado_Datos (ingresos comerciales vigentes + cortesías con neto 0)
 * 4. Anulados (operaciones con anulación activa, baja fiscal o certificado anulado)
 * 5. Notas de credito (operaciones con incidencias de nota de crédito)
 */
export function construirHojasUnificadas(
  extendido: DocumentosEmitidosExtendidoResponse,
  consolidado: ReporteFinancieroResponse | null,
  desde = '', hasta = ''
): ExcelSheetDefinition[] {
  const hojasExtendido = construirHojasDocumentosEmitidosExtendido(extendido, desde, hasta);
  if (!consolidado || !Array.isArray((consolidado as any).operaciones) || !Array.isArray((consolidado as any).comprobantes)) {
    return hojasExtendido;
  }
  const hojaConsolidado = construirHojaConsolidado(consolidado, 'Consolidado_Datos');
  const hojaAnulados = construirHojaAnulados(consolidado, 'Anulados');
  const hojaNotasCredito = construirHojaNotasCredito(consolidado, 'Notas de credito');
  return [...hojasExtendido, hojaConsolidado, hojaAnulados, hojaNotasCredito];
}

export function exportarDocumentosEmitidosExtendido(data: DocumentosEmitidosExtendidoResponse, desde: string, hasta: string, consolidado?: ReporteFinancieroResponse | null) {
  if (!Array.isArray(data?.cabeceras) || !Array.isArray(data?.lineas)) throw new Error('El servidor no devolvió los documentos emitidos.');
  const hojas = consolidado
    ? construirHojasUnificadas(data, consolidado, desde, hasta)
    : construirHojasDocumentosEmitidosExtendido(data, desde, hasta);
  exportarExcelVariasHojas(`faregas_documentos_emitidos_extendido_${desde}_${hasta}`, hojas);
}
