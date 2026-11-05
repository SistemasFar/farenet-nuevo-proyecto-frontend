import type { DocumentosEmitidosExtendidoResponse } from '../services/faregas-dashboard.api';
import { exportarExcelVariasHojas, type ExcelCellValue, type ExcelColumn, type ExcelSheetDefinition } from './exportar-excel';

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
    return {
      issuerKey: issuerKeyFor(doc),
      docId: String(doc.id_documento || ''), fuenteFecha: doc.fecha_emision_fuente || '', tipo: doc.tipo_comprobante || '', numeroDocumento: serial(doc), fechaEmision: doc.fecha_emision ? fechaLocal(doc.fecha_emision) : '',
      fechaDocumento: doc.fecha_documento ? fechaLocal(doc.fecha_documento) : '', fechaVencimiento: doc.fecha_vencimiento ? fechaLocal(doc.fecha_vencimiento) : '',
      tipoDocCliente: doc.tipo_documento || '', numeroDocCliente: doc.numero_documento || '', cliente: doc.cliente || '',
      subtotal: decimal(doc.base_imponible), descuentos: decimal(doc.descuento), igv: decimal(doc.igv), total: decimal(doc.importe_total), moneda: doc.moneda || '',
      fechaReferencia: fechaLocal(doc.fecha_referencia) || extra('fecha_referencia') || '', tipoReferencia: doc.tipo_referencia || extra('tipo_referencia') || '', numeroReferencia: doc.referencia_afectada || extra('numero_referencia') || '',
      usuario: doc.usuario_emisor || '', estado: [doc.estado || '', doc.entorno_facturador ? `ENTORNO: ${doc.entorno_facturador}` : 'ENTORNO NO INFORMADO', doc.proveedor ? `PROVEEDOR: ${doc.proveedor}` : '', doc.aceptada_sunat === true && String(doc.entorno_facturador).toUpperCase() === 'PRODUCCION' ? 'SUNAT: ACEPTADO PRODUCCIÓN' : doc.sunat_responsecode ? `SUNAT: ${doc.sunat_responsecode}` : 'SUNAT: SIN ACEPTACIÓN VERIFICABLE'].filter(Boolean).join(' | '), anulado: doc.estado === 'ANULADO' ? 'Sí' : 'No',
      documentoAnulacion: doc.documento_anulacion || '', fechaAnulacion: doc.fecha_anulacion || '', motivoAnulacion: doc.motivo_anulacion || motivoFiscal,
      origen: doc.origen_peticion || '', metodoPago: doc.medios_pago || '', montoPago: doc.monto_pagado === null || doc.monto_pagado === undefined ? '' : decimal(doc.monto_pagado),
      referenciaPago: doc.referencia_pago || '', detraccionPorcentaje: extra('detraccion_porcentaje'), detraccionNeto: extra('detraccion_neto'), detraccionImporte: extra('detraccion_importe'),
      tieneNC: doc.notas_credito ? 'Sí' : 'No', cantidadNC: doc.cantidad_notas_credito ?? 0, tieneND: doc.notas_debito ? 'Sí' : 'No', cantidadND: doc.cantidad_notas_debito ?? 0,
      items: relatedLines.length, codigoItem: uniqueLine?.codigo_producto || '', descripcion: uniqueLine?.producto || '', unidad: uniqueLine?.unidad || '',
      cantidad: uniqueLine ? numero(uniqueLine.cantidad) : '', codigoAfectacion: uniqueLine?.codigo_afectacion_igv || '', valorUnitario: uniqueLine ? decimal(uniqueLine.precio_unitario) : '',
      valorReferencia: uniqueLine?.valor_referencial_unitario == null ? '' : decimal(uniqueLine.valor_referencial_unitario), subtotalItem: uniqueLine?.base_imponible == null ? '' : decimal(uniqueLine.base_imponible), descuentosItem: '', rc: '', totalItem: uniqueLine?.importe_total == null ? '' : decimal(uniqueLine.importe_total),
      ejecutivo: extra('ejecutivo'), marca: extra('marca') || doc.marca_vehiculo || '', modelo: extra('modelo') || doc.modelo_vehiculo || '', motor: extra('motor') || doc.motor_vehiculo || '', certificado: doc.certificados || '',
      ordenTrabajo: '', placa: doc.placas || '', referenciaPagoExtra: doc.referencia_pago || '', telefono: doc.telefono_cliente || extra('telefono') || '',
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
    tipoProducto: line.tipo_producto || '',
    codigoProducto: line.codigo_producto || '',
    producto: line.producto || '',
    unidad: line.unidad || '',
    cantidad: numero(line.cantidad),
    precioUnitario: decimal(line.precio_unitario),
    base: line.base_imponible === null ? '' : decimal(line.base_imponible),
    igv: line.igv === null ? '' : decimal(line.igv),
    totalLinea: decimal(line.importe_total),
    certificado: line.certificado || '',
    placa: line.placa || ''
  }));

  const headerSpecs: Array<[string, string]> = [
    ['tipo','TIPO DE DOCUMENTO'],['numeroDocumento','NÚMERO DE DOCUMENTO'],['fechaEmision','FECHA DE EMISIÓN'],['fechaDocumento','FECHA DEL DOCUMENTO'],['fechaVencimiento','FECHA DE VENCIMIENTO'],
    ['tipoDocCliente','TIPO DOC. IDENTIDAD CLIENTE'],['numeroDocCliente','NÚMERO DOC. IDENTIDAD CLIENTE'],['cliente','APELLIDOS Y NOMBRES DENOMINACIÓN O RAZÓN SOCIAL'],['subtotal','SUBTOTAL'],['descuentos','DESCUENTOS'],['igv','IGV'],['total','IMPORTE TOTAL'],['moneda','MONEDA'],
    ['fechaReferencia','FECHA DE REF. DEL COMPROBANTE DE PAGO O DOCUMENTO MODIFICADO'],['tipoReferencia','TIPO DE REF. DEL COMPROBANTE DE PAGO O DOCUMENTO MODIFICADO'],['numeroReferencia','NÚMERO DE DOCUMENTO DE REF. DEL COMPROBANTE DE PAGO O DOCUMENTO MODIFICADO'],['usuario','USUARIO EMISOR'],['estado','ESTADO'],['anulado','ANULADO'],['documentoAnulacion','NRO. DOCUMENTO ANULACIÓN'],['fechaAnulacion','FECHA DE ANULACIÓN'],['motivoAnulacion','MOTIVO DE ANULACIÓN / RECHAZO'],['origen','ORIGEN PETICIÓN'],['metodoPago','MÉTODO DE PAGO'],['montoPago','MONTO PAGO'],['referenciaPago','REFERENCIA DE PAGO'],['detraccionPorcentaje','DETRACCIÓN (%)'],['detraccionNeto','DETRACCIÓN / IMPORTE NETO'],['detraccionImporte','DETRACCIÓN / IMPORTE'],['tieneNC','TIENE NOTA DE CRÉDITO?'],['cantidadNC','# NOTAS DE CRÉDITO'],['tieneND','TIENE NOTA DE DÉBITO?'],['cantidadND','# NOTAS DE DÉBITO'],['items','ITEMS'],['codigoItem','CÓDIGO DE ITEM'],['descripcion','DESCRIPCIÓN'],['unidad','UNIDAD'],['cantidad','CANTIDAD'],['codigoAfectacion','CÓDIGO AFECT. IGV'],['valorUnitario','VALOR UNITARIO'],['valorReferencia','VALOR REF. UNITARIO'],['subtotalItem','SUBTOTAL'],['descuentosItem','DESCUENTOS'],['rc','RC'],['totalItem','TOTAL ITEM'],['ejecutivo','Ejecutivo (FT ,BV)'],['marca','Marca Vehículo (BV ,FT)'],['modelo','Modelo Vehículo (FT ,BV)'],['motor','Motor Vehículo (FT ,BV)'],['certificado','Numero Certificado (BV ,NC ,ND ,FT)'],['ordenTrabajo','Orden Trabajo (ND ,NC ,FT ,BV)'],['placa','Placa (FT ,BV)'],['referenciaPagoExtra','Referencia de pago (ND ,BV ,FT ,NC)'],['telefono','Teléfono (ND ,FT ,BV ,NC)'],['tipoDescuento','Tipo Descuento (BV ,FT)'],['tipoVehiculo','Tipo Vehículo (BV ,FT)']
  ];
  const columnasCabecera = headerSpecs.map(([key, header]) => ({ key, header, width: Math.max(16, Math.min(header.length + 2, 42)), ...(['subtotal','descuentos','igv','total','montoPago','detraccionNeto','detraccionImporte','valorUnitario','valorReferencia','subtotalItem','descuentosItem','rc','totalItem'].includes(key) ? { format: 'decimal2' as const } : {}) }));

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
    const traceRows = issuerDocs.map((doc) => ({ id: doc.id_documento || '', ruc: doc.ruc_emisor || '', comprobante: serial(doc), tipo: doc.tipo_comprobante || '',
      fecha: doc.fecha_emision ? fechaLocal(doc.fecha_emision) : '', fechaAceptacion: doc.fecha_aceptacion ? fechaLocal(doc.fecha_aceptacion) : '',
      fuente: doc.fecha_emision_fuente || '', sede: doc.sede || doc.planta_key || '' }));
    const common: Pick<ExcelSheetDefinition, 'title' | 'metadata' | 'headerRow' | 'groupHeaders'> = {
      title: 'Registro de comprobantes electrónicos emitidos - Extendido - Campos Extra',
      metadata: [['Empresa', [issuerDocs[0]?.ruc_emisor || '', issuerDocs[0]?.empresa_emisora || ''].filter(Boolean).join(' - ')], ['Fecha de Emisión / Inicio', desde], ['Fecha de Emisión / Fin', hasta], ['Fecha Reporte', new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })]], headerRow: 7, groupHeaders: [
      { header: 'CLIENTE', start: 6, end: 8 }, { header: 'DOCUMENTO DE REFERENCIA', start: 14, end: 16 }, { header: 'INFORMACIÓN DE ANULACIÓN', start: 19, end: 22 },
      { header: 'INFORMACIÓN DE PAGO', start: 24, end: 25 }, { header: 'DETRACCIÓN', start: 27, end: 29 }, { header: 'NOTAS DE CRÉDITO RELACIONADAS', start: 30, end: 31 },
      { header: 'NOTAS DE DÉBITO RELACIONADAS', start: 32, end: 33 }, { header: 'ITEMS', start: 34, end: 45 }
    ]
    };
    sheets.push({ name: `Datos${suffix}`.slice(0, 31), columns: columnasCabecera, rows: docRows, ...common });
    sheets.push({ name: (issuerGroups.size > 1 ? `Líneas_${issuerKey}` : 'Líneas de productos').slice(0, 31), columns: columnas(
      ['documento', 'Documentos asociados', 26], ['documentIds', 'ID(s) documento FAREGAS', 24, 'text'], ['idDetalle', 'ID línea comercial', 18], ['operacion', 'ID de operación', 16],
      ['venta', 'ID de venta', 14], ['sede', 'Sede', 24], ['tipoProducto', 'Tipo de producto', 26], ['codigoProducto', 'Código de producto', 22, 'text'],
      ['producto', 'Producto o servicio', 38], ['unidad', 'Unidad', 14], ['cantidad', 'Cantidad', 14], ['precioUnitario', 'Precio unitario', 18, 'decimal2'],
      ['base', 'Base imponible', 18, 'decimal2'], ['igv', 'IGV', 14, 'decimal2'], ['totalLinea', 'Total de línea', 18, 'decimal2'],
      ['certificado', 'Certificado relacionado', 26], ['placa', 'Placa', 18]
    ), rows: lineRows });
    sheets.push({ name: `Trazabilidad${suffix}`.slice(0, 31), columns: columnas(
      ['id', 'ID DOCUMENTO FAREGAS', 24, 'text'], ['ruc', 'RUC EMISOR', 16, 'text'], ['comprobante', 'NÚMERO DOCUMENTO', 24, 'text'],
      ['tipo', 'TIPO', 22], ['fecha', 'FECHA DE EMISIÓN REGISTRADA', 28], ['fechaAceptacion', 'FECHA DE ACEPTACIÓN', 24], ['fuente', 'FUENTE / NOTA DE FECHA', 44], ['sede', 'SEDE', 24]
    ), rows: traceRows });
  }
  return sheets;
}

export function exportarDocumentosEmitidosExtendido(data: DocumentosEmitidosExtendidoResponse, desde: string, hasta: string) {
  if (!Array.isArray(data?.cabeceras) || !Array.isArray(data?.lineas)) throw new Error('El servidor no devolvió los documentos emitidos.');
  exportarExcelVariasHojas(`faregas_documentos_emitidos_extendido_${desde}_${hasta}`, construirHojasDocumentosEmitidosExtendido(data, desde, hasta));
}
