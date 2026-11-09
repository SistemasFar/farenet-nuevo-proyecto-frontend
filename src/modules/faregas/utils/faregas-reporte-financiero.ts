import type { ReporteFinancieroResponse } from '../services/faregas-dashboard.api';
import { exportarExcelVariasHojas, type ExcelCellValue, type ExcelColumn, type ExcelSheetDefinition } from './exportar-excel';

type Row = Record<string, any>;
const numero = (value: unknown) => Number(value || 0);
const moneda = (value: unknown) => Number(numero(value).toFixed(2));
const estado = (value: unknown) => String(value || '').trim().toUpperCase();
const esVerdadero = (value: unknown) => value === true || value === 't' || value === 1 || value === '1';
const textoUnico = (values: unknown[], separator = ', ') => [...new Set(values
  .map((value) => String(value ?? '').trim()).filter(Boolean))].join(separator);

const columnas = (...entries: Array<[string, string, number?, ExcelColumn['format']?]>): ExcelColumn[] =>
  entries.map(([key, header, width, format]) => ({ key, header, width, format }));

const prepararSubtotal = (linea: Row, cantidad: number) => {
  const precio = numero(linea.precio_unitario);
  return moneda(cantidad * precio);
};

/** Conserva ceros iniciales y elimina únicamente etiquetas documentarias. */
export function limpiarDocumentoCliente(tipo: unknown, valor: unknown): string {
  const numeroDocumento = String(valor ?? '').trim();
  if (numeroDocumento) return numeroDocumento.replace(/^\s*(?:DNI|RUC|CE|C\.E\.|PASAPORTE)\s*[:.-]?\s*/i, '').trim();
  return String(tipo ?? '').trim().replace(/^\s*(?:DNI|RUC|CE|C\.E\.|PASAPORTE)\s*[:.-]?\s*/i, '').trim();
}

const fechaLima = (value: unknown): string => {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

/** Serial Excel 1900 para que la celda sea una fecha real y filtrable. */
export function fechaExcel(value: unknown): number | '' {
  const date = fechaLima(value);
  if (!date) return '';
  const [year, month, day] = date.split('-').map(Number);
  return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86_400_000);
}

export function horaEmisionCertificado(
  linea: Row,
  doc?: Row
): string {
  const estadoCert = estado(linea.certificado_estado || doc?.certificado_estado);
  if (!linea.certificado_id && !linea.numero_certificado) return '';
  if (estadoCert !== 'EMITIDO' && estadoCert !== 'ANULADO') return 'NO EMITIDO';

  // FASE 3: única fuente confiable = fecha_hora_emision (timestamptz).
  const rawHora = (linea as any).fecha_hora_emision ?? (doc as any)?.fecha_hora_emision;
  if (rawHora) return formatearHoraLima(rawHora);
  return 'SIN REGISTRO';
}

/** Formatea un timestamptz a HH:mm:ss en America/Lima (solo si es timestamp real, nunca DATE). */
export function formatearHoraLima(raw: unknown): string {
  const texto = String(raw || '').trim();
  if (!texto) return 'SIN REGISTRO';
  // PostgreSQL devuelve timestamptz como ISO con offset o naive con segundos.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(texto)) {
    if (!/Z$|[+-]\d{2}:?\d{2}$/.test(texto)) {
      // Naive: ya está en hora de negocio (sin conversión adicional).
      const m = texto.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
      if (m) return `${m[1]}:${m[2]}:${m[3] || '00'}`;
    }
    const fechaHora = new Date(texto);
    if (!Number.isNaN(fechaHora.getTime())) {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).formatToParts(fechaHora);
      const part = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value || '';
      return `${part('hour')}:${part('minute')}:${part('second')}`;
    }
  }
  // DATE (fecha_hora_emision nunca es DATE; defensa): no inventar.
  return 'SIN REGISTRO';
}

/** Clasificación de pagos compartida (Datos + Consolidado). Sin inventar. */
export function clasificarMediosPago(
  pagos: Row[],
  importeNeto: number,
  importePagado: number
): { tipoPago: string; formaPago: string } {
  const confirmados = pagos.filter(pagoConfirmado);
  if (!confirmados.length) {
    if (importeNeto <= 0 && importePagado <= 0) return { tipoPago: 'NO APLICA', formaPago: 'NO APLICA' };
    if (importeNeto > 0) return { tipoPago: 'SIN PAGO', formaPago: 'SIN PAGO' };
    return { tipoPago: 'SIN IDENTIFICAR', formaPago: 'SIN IDENTIFICAR' };
  }
  const tipos = [...new Set(confirmados.map((p) => {
    const t = estado(p.tipocontado_key || p.medio_pago);
    if (t.includes('EFECTIVO')) return 'EFECTIVO';
    if (t.includes('BANCO') || t.includes('TRANSFER') || t.includes('DEPOS')) return 'BANCO';
    if (t.includes('TARJETA')) return 'TARJETA';
    return 'SIN IDENTIFICAR';
  }))];
  const formas = [...new Set(confirmados.map((p) => {
    const f = estado(p.tipo_tarjeta || p.tarjeta_key || p.modalidad_tarjeta);
    const t = estado(p.tipocontado_key || p.medio_pago);
    if (t.includes('EFECTIVO')) return 'EFECTIVO';
    if (f) return f.replaceAll('_', ' ');
    if (t.includes('BANCO')) return 'BANCO';
    return 'SIN IDENTIFICAR';
  }))];
  return { tipoPago: tipos.join(' + ') || 'SIN IDENTIFICAR', formaPago: formas.join(' + ') || 'SIN IDENTIFICAR' };
}

const codigoComprobante = (doc: Row) => doc.nro_comprobante
  || [doc.serie, doc.numero == null ? '' : String(doc.numero).padStart(8, '0')].filter(Boolean).join('-');
const tipoComprobante = (doc: Row) => {
  const raw = estado(doc.tipo_comprobante);
  if (raw === '1' || raw === 'FACTURA') return 'Factura';
  if (raw === '2' || raw === 'BOLETA') return 'Boleta';
  return raw ? String(doc.tipo_comprobante) : '';
};
const pagoConfirmado = (pago: Row) => ['CAN', 'CONFIRMADO', 'PAGADO'].includes(estado(pago.estado));
const normalizarEtiquetaPago = (value: unknown) => String(value || '').trim().toUpperCase().replaceAll('_', ' ');
const tipoPago = (pago: Row) => {
  const tipo = normalizarEtiquetaPago(pago.tipocontado_key || pago.medio_pago);
  if (tipo.includes('EFECTIVO')) return 'EFECTIVO';
  if (tipo.includes('BANCO') || tipo.includes('TRANSFER') || tipo.includes('DEPOS')) return 'BANCO';
  if (tipo.includes('TARJETA')) return 'TARJETA';
  return 'SIN IDENTIFICAR';
};
const formaPago = (pago: Row) => {
  const tipo = tipoPago(pago);
  const forma = normalizarEtiquetaPago(pago.tipo_tarjeta || pago.tarjeta_key || pago.modalidad_tarjeta);
  if (tipo === 'EFECTIVO') return 'EFECTIVO';
  if (tipo === 'BANCO') return forma || 'BANCO';
  if (tipo === 'TARJETA') return forma || 'SIN IDENTIFICAR';
  return forma || 'SIN IDENTIFICAR';
};
const cantidadLinea = (linea: Row) => numero(linea.cantidad) || 1;
const descripcionLinea = (linea: Row) => {
  const cantidad = cantidadLinea(linea);
  const codigo = String(linea.codigo_producto || linea.codigo_sku_snapshot || '').trim();
  const producto = String(linea.producto || linea.descripcion_snapshot || linea.categoria || 'Ítem comercial').trim();
  const precio = moneda(linea.precio_unitario);
  return `${cantidad} × ${producto}${codigo ? ` [${codigo}]` : ''} — S/ ${precio.toFixed(2)}`;
};
const esDuplicado = (lineas: Row[]) => lineas.some((linea) => Boolean(linea.duplicado_id)
  || estado(linea.tipo_item).includes('DUPLICADO')
  || estado(linea.codigo_producto || linea.codigo_sku_snapshot).includes('DUPLICADO')
  || estado(linea.producto).includes('DUPLICADO'));
const tipoOperacion = (lineas: Row[], ventaDirecta: boolean) => {
  if (esDuplicado(lineas)) return 'DUPLICADO DE CERTIFICADO';
  const tieneCertificado = lineas.some((linea) => Boolean(linea.certificado_id || linea.numero_certificado));
  const tieneProducto = lineas.some((linea) => estado(linea.tipo_item) === 'PRODUCTO'
    || (!linea.certificado_id && !linea.numero_certificado && !linea.duplicado_id));
  if (tieneCertificado && tieneProducto) return 'CERTIFICADO + PRODUCTOS';
  if (tieneCertificado) return 'CERTIFICADO';
  if (ventaDirecta || tieneProducto) return 'VENTA DE PRODUCTOS';
  return 'OPERACIÓN COMERCIAL';
};
const etiquetaDescuento = (descuentos: Row[]) => textoUnico(descuentos.map((item) => {
  const tipo = estado(item.tipo_descuento);
  const nombre = String(item.nombre_descuento || '').trim();
  if (tipo.includes('CORTES')) return nombre || 'CORTESÍA';
  return nombre || String(item.codigo || '').trim();
}));
const documentoFiscalInvalido = (doc: Row) => esVerdadero(doc.baja_aceptada)
  || esVerdadero(doc.nota_anulacion_total_aceptada)
  || (estado(doc.estado) === 'ANULADO' && esVerdadero(doc.aceptada_sunat));
const estadoFiscal = (doc: Row) => {
  if (documentoFiscalInvalido(doc)) return 'Anulado fiscalmente';
  if (estado(doc.estado) === 'ACEPTADO' && esVerdadero(doc.aceptada_sunat)) return 'Aceptado SUNAT';
  if (estado(doc.estado) === 'PENDIENTE_SUNAT') return 'Pendiente SUNAT';
  if (estado(doc.estado) === 'RECHAZADO') return 'Rechazado';
  if (estado(doc.estado) === 'ERROR') return 'Error técnico';
  return String(doc.estado || 'Pendiente de confirmación');
};

export function construirFilasReporteFinanciero(data: ReporteFinancieroResponse): Array<Record<string, ExcelCellValue>> {
  const operaciones = data.operaciones.map((row) => ({ ...row, key: `OP-${row.id}`, idOperacion: `OP-${row.id}` }));
  const directasPorId = new Map<string, Row>();
  data.ventasDirectas.forEach((row) => {
    const key = String(row.id);
    const actual = directasPorId.get(key) || { ...row, detalles: [] };
    if (row.detalle_id) actual.detalles.push(row);
    directasPorId.set(key, actual);
  });
  const directas: Row[] = [...directasPorId.values()].map((row) => ({
    ...row, key: `VD-${row.id}`, idOperacion: `VD-${row.id}`,
    nombre_cliente_snapshot: row.cliente_nombre,
    tipo_documento_cliente_snapshot: row.cliente_tipo_documento,
    documento_cliente_snapshot: row.cliente_nro_documento
  }));
  const ventas: Row[] = [...operaciones, ...directas];

  const lineasPorVenta = new Map<string, Row[]>();
  data.lineas.forEach((linea) => {
    const key = `OP-${linea.operacion_id}`;
    lineasPorVenta.set(key, [...(lineasPorVenta.get(key) || []), linea]);
  });
  directas.forEach((venta) => lineasPorVenta.set(venta.key, (venta.detalles || []).map((detalle: Row) => ({
    ...detalle, producto: detalle.producto, importe_total: detalle.importe_detalle,
    certificado_estado: null, numero_chip: detalle.numero_chip, tipo_item: 'PRODUCTO'
  }))));

  const docsPorVenta = new Map<string, Row[]>();
  data.comprobantes.forEach((doc) => {
    const key = doc.operacion_id ? `OP-${doc.operacion_id}` : doc.venta_id ? `VD-${doc.venta_id}` : '';
    if (key) docsPorVenta.set(key, [...(docsPorVenta.get(key) || []), doc]);
  });
  const ordenesPorVenta = new Map<string, Row[]>();
  data.ordenes.forEach((orden) => {
    const key = orden.operacion_id ? `OP-${orden.operacion_id}` : orden.venta_id ? `VD-${orden.venta_id}` : '';
    if (key) ordenesPorVenta.set(key, [...(ordenesPorVenta.get(key) || []), orden]);
  });
  const pagosPorOrden = new Map<string, Row[]>();
  data.pagos.forEach((pago) => pagosPorOrden.set(String(pago.orden_pago_id), [...(pagosPorOrden.get(String(pago.orden_pago_id)) || []), pago]));

    const descuentosPorVenta = new Map<string, Row[]>();
    const operacionPorCertificado = new Map<string, string>();
    data.lineas.forEach((linea) => linea.certificado_id && operacionPorCertificado.set(String(linea.certificado_id), `OP-${linea.operacion_id}`));
    const ordenPorId = new Map(data.ordenes.map((orden) => [String(orden.id), orden]));
    const docPorId = new Map(data.comprobantes.map((doc) => [String(doc.id), doc]));
    data.descuentos.filter((item) => estado(item.estado) === 'APLICADO').forEach((item) => {
      const orden = item.orden_pago_id ? ordenPorId.get(String(item.orden_pago_id)) : undefined;
      const doc = item.facturacion_id
        ? docPorId.get(String(item.facturacion_id))
        : undefined;
      const key = orden?.operacion_id ? `OP-${orden.operacion_id}` : orden?.venta_id ? `VD-${orden.venta_id}`
        : doc?.operacion_id ? `OP-${doc.operacion_id}` : doc?.venta_id ? `VD-${doc.venta_id}`
          : operacionPorCertificado.get(String(item.certificado_id)) || '';
      if (key) descuentosPorVenta.set(key, [...(descuentosPorVenta.get(key) || []), item]);
    });

  const filas: Array<Record<string, ExcelCellValue>> = [];
  for (const venta of ventas) {
    if (['ANULADO', 'ANULADA', 'CANCELADO'].includes(estado(venta.estado))) continue;
    const todasLasLineas = lineasPorVenta.get(venta.key) || [];
    const lineasVigentes = todasLasLineas.filter((linea) => estado(linea.certificado_estado) !== 'ANULADO');
    if (todasLasLineas.length && !lineasVigentes.length) continue;
    const docsOriginales = docsPorVenta.get(venta.key) || [];
    const docsVigentes = docsOriginales.filter((doc) => !documentoFiscalInvalido(doc));
    if (docsOriginales.length && !docsVigentes.length) continue;

    const idsCertificados = new Set(lineasVigentes.map((linea) => String(linea.certificado_id || '')).filter(Boolean));
    const descuentos = (descuentosPorVenta.get(venta.key) || []).filter((item) =>
      !item.certificado_id || !idsCertificados.size || idsCertificados.has(String(item.certificado_id))
    );
    const descuento = moneda(descuentos.reduce((sum, item) => sum + numero(item.importe_descuento), 0));
    const totalBase = todasLasLineas.length
      ? moneda(lineasVigentes.reduce((sum, linea) => sum + numero(linea.importe_total), 0))
      : moneda(venta.importe_total);
    const subtotalLineas = todasLasLineas.length
      ? moneda(lineasVigentes.reduce((sum, linea) => sum + (cantidadLinea(linea) * numero(linea.precio_unitario)), 0))
      : totalBase;
    const importeBruto = moneda(totalBase + descuento);
    const notaCreditoParcial = moneda(docsVigentes.reduce((sum, doc) => sum + numero(doc.nota_credito_parcial_total), 0));
    const importeNeto = moneda(Math.max(0, totalBase - notaCreditoParcial));
    const ordenes = ordenesPorVenta.get(venta.key) || [];
    const pagos = ordenes.flatMap((orden) => pagosPorOrden.get(String(orden.id)) || []).filter(pagoConfirmado);
    const importePagado = moneda(pagos.reduce((sum, pago) => sum + numero(pago.importe), 0));
    const sinImporteExigible = importeNeto <= 0 && importePagado <= 0;
    // Mismo criterio que Datos (sin inventar; CON_PAGO real o NO APLICA/SIN PAGO).
    const { tipoPago: tipoPagoCons, formaPago: formaPagoCons } = clasificarMediosPago(pagos, importeNeto, importePagado);
    const tiposPago = tipoPagoCons;
    const formasPago = formaPagoCons;
    const saldoPendiente = moneda(Math.max(0, importeNeto - importePagado));
    const docCliente = docsVigentes.map((doc) => limpiarDocumentoCliente(doc.tipo_documento_cliente, doc.nro_documento)).find(Boolean);
    const productosAdicionales = lineasVigentes.filter((linea) => estado(linea.tipo_item) === 'PRODUCTO'
      || (!linea.certificado_id && !linea.numero_certificado && !linea.duplicado_id));
    const preciosUnitarios = [...new Set(lineasVigentes.map((linea) => moneda(linea.precio_unitario)))];
    // Hora por certificado: si hay varios, se conserva cada una (unión por línea).
    // Si no hay hora real, SIN REGISTRO / NO EMITIDO (nunca fecha_modificacion).
    const horasCertificados = textoUnico(
      lineasVigentes
        .filter((linea) => linea.certificado_id || linea.numero_certificado)
        .map((linea) => horaEmisionCertificado(linea, docsVigentes[0])),
      ' | '
    ) || '';

    // TOTAL DE VENTAS VIGENTES: excluir anulación/NC pendientes o confirmadas.
    // Importe histórico cobrado se conserva en su columna; no se falsifica.
    const tienePendienteAnulacion = docsVigentes.some((doc) => {
      const est = String((doc as any).estado_solicitud_anulacion || '').toUpperCase();
      return Boolean((doc as any).documento_anulacion) && est !== 'RECHAZADO'
        && !(esVerdadero((doc as any).aceptada_anulacion_sunat) && (doc as any).fecha_anulacion_confirmacion);
    });
    const anulacionConfirmadaF = docsVigentes.some((doc) => esVerdadero((doc as any).aceptada_anulacion_sunat) && (doc as any).fecha_anulacion_confirmacion);
    const ncTotalAceptada = docsVigentes.some((doc) => esVerdadero((doc as any).nota_anulacion_total_aceptada) || documentoFiscalInvalido(doc));
    const ncPendiente = docsVigentes.some((doc) => {
      const est = String((doc as any).estado_nota_credito || '').toUpperCase();
      return est === 'PENDIENTE' || est === 'PENDIENTE_SUNAT';
    }) || docsVigentes.some((doc) => String((doc as any).estado_nota_credito || '').toUpperCase() === 'PENDIENTE');
    const certificadoAnulado = lineasVigentes.some((linea) => estado(linea.certificado_estado) === 'ANULADO');
    const excluido = anulacionConfirmadaF || ncTotalAceptada || certificadoAnulado || tienePendienteAnulacion || ncPendiente;
    const motivoExclusion = anulacionConfirmadaF ? 'ANULADO'
      : ncTotalAceptada ? 'NC TOTAL ACEPTADA'
      : certificadoAnulado ? 'ANULADO'
      : tienePendienteAnulacion ? 'ANULACIÓN PENDIENTE'
      : ncPendiente ? 'NOTA DE CRÉDITO PENDIENTE' : '';
    const importeConsiderado = excluido ? 0 : moneda(importeNeto);

    const anulacionNcRegistrada = ((): string => {
      // Marca administrativa (no fiscal): Sí si hay solicitud vigente o NC vigente.
      const haySolicitudActiva = docsVigentes.some((doc) => Boolean((doc as any).documento_anulacion)
        && String((doc as any).estado_solicitud_anulacion || '').toUpperCase() !== 'RECHAZADO');
      const hayNcVigente = docsVigentes.some((doc) => Number((doc as any).cantidad_notas_credito || 0) > 0
        || Boolean((doc as any).notas_credito)
        || ['PENDIENTE', 'ACEPTADO', 'ACEPTADA', 'CONFIRMADO'].includes(String((doc as any).estado_nota_credito || '').toUpperCase()));
      return haySolicitudActiva || hayNcVigente ? 'Sí' : 'No';
    })();
    filas.push({
      fecha: fechaExcel(docsVigentes.find((doc) => doc.fecha_documento)?.fecha_documento || venta.fecha_creacion),
      horaEmisionCertificadoC: horaCertificados,
      sede: venta.planta_nombre || venta.planta_key || '', operacion: venta.idOperacion, placa: venta.placa || '',
      cliente: textoUnico(docsVigentes.map((doc) => doc.nombre_razon_social)) || venta.nombre_cliente_snapshot || '',
      documento: docCliente || limpiarDocumentoCliente(venta.tipo_documento_cliente_snapshot, venta.documento_cliente_snapshot),
      tipoOperacion: tipoOperacion(lineasVigentes, venta.key.startsWith('VD-')),
      servicio: textoUnico(lineasVigentes.map((linea) => linea.producto || linea.tipo_certificado_clave || linea.categoria)) || 'Operación comercial',
      descripcionEmitido: textoUnico(lineasVigentes.map(descripcionLinea), '; '),
      tipoCertificado: textoUnico(lineasVigentes.map((linea) => linea.duplicado_tipo_nombre || linea.tipo_certificado_clave)),
      certificado: textoUnico(lineasVigentes.map((linea) => linea.numero_certificado)),
      chip: textoUnico(lineasVigentes.map((linea) => linea.numero_chip)),
      productoAdicional: textoUnico(productosAdicionales.map((linea) => linea.producto || linea.descripcion_snapshot || linea.codigo_producto)),
      cantidad: moneda(lineasVigentes.reduce((sum, linea) => sum + cantidadLinea(linea), 0)),
      tipoComprobante: textoUnico(docsVigentes.map(tipoComprobante)) || 'Sin comprobante',
      comprobante: textoUnico(docsVigentes.map(codigoComprobante).filter(Boolean)) || 'Sin comprobante',
      usuarioEmisorComprobante: textoUnico(docsVigentes.map((doc) => (doc.usuario_emisor || (doc as any).usuario_emisor_creacion || (doc as any).usuario_creacion || (doc as any).usuariocreacion_username) ?? (doc as any).usuario_emisor_comprobante).filter(Boolean)) || 'SIN REGISTRO',
      usuarioEmisorCertificado: textoUnico(lineasVigentes.map((linea) => (linea as any).usuario_creacion_certificado || (linea as any).usuario_creacion || (linea as any).cert_usuario).filter(Boolean)) || 'SIN REGISTRO',
      tieneSolicitudAnulacion: docsVigentes.some((doc) => Boolean((doc as any).documento_anulacion)) ? 'SÍ' : 'NO',
      anulado: anulacionNcRegistrada,
      estadoSolicitudAnulacion: (() => {
        const docs = docsVigentes.filter((doc) => (doc as any).documento_anulacion);
        if (!docs.length) return 'SIN SOLICITUD';
        if (docs.some((doc) => esVerdadero((doc as any).aceptada_anulacion_sunat) && (doc as any).fecha_anulacion_confirmacion)) return 'ACEPTADA';
        const est = String(docs[0]?.estado_solicitud_anulacion || '').toUpperCase();
        if (est === 'RECHAZADO') return 'RECHAZADA';
        if (est === 'PENDIENTE' || (docE => docE.estado === 'PENDIENTE_SUNAT')(docs[0])) return 'PENDIENTE';
        return est || 'PENDIENTE';
      })(),
      documentoAnulacion: textoUnico(docsVigentes.map((doc) => (doc as any).documento_anulacion).filter(Boolean)),
      fechaSolicitudAnulacion: (() => { const v = docsVigentes.map((d) => (d as any).fecha_anulacion_solicitud).find(Boolean); return v ? fechaLima(v) : ''; })(),
      estadoAnulacionFiscal: (() => {
        if (docsVigentes.some((doc) => esVerdadero((doc as any).aceptada_anulacion_sunat) && (doc as any).fecha_anulacion_confirmacion)) return 'ANULADO';
        if (docsVigentes.some((doc) => String((doc as any).estado_solicitud_anulacion || '').toUpperCase() === 'RECHAZADO')) return 'RECHAZADA';
        if (docsVigentes.some((doc) => (doc as any).documento_anulacion)) return 'PENDIENTE';
        return 'SIN SOLICITUD';
      })(),
      fechaConfirmacionAnulacion: (() => { const v = docsVigentes.map((d) => (d as any).fecha_anulacion_confirmacion).find(Boolean); return v ? fechaLima(v) : ''; })(),
      motivoAnulacion: textoUnico(docsVigentes.map((doc) => (doc as any).motivo_anulacion).filter(Boolean)),
      tieneNotaCredito: textoUnico(docsVigentes.map((doc) => (doc as any).notas_credito).filter(Boolean)) ? 'SÍ' : (docsVigentes.some((doc) => Number((doc as any).cantidad_notas_credito || 0) > 0) ? 'SÍ' : 'NO'),
      numeroNotaCredito: textoUnico(docsVigentes.map((doc) => (doc as any).notas_credito).filter(Boolean)),
      motivoNotaCredito: textoUnico(docsVigentes.map((doc) => (doc as any).motivo_nota_credito).filter(Boolean)),
      estadoNotaCredito: textoUnico(docsVigentes.map((doc) => (doc as any).estado_nota_credito).filter(Boolean)),
      fechaEmisionNotaCredito: textoUnico(docsVigentes.map((doc) => (doc as any).fecha_emision_nota_credito ? fechaLima((doc as any).fecha_emision_nota_credito) : '').filter(Boolean)),
      importeNotaCredito: (() => { const v = docsVigentes.reduce((s, d) => s + Number((d as any).importe_nota_credito || 0), 0); return v ? moneda(v) : ''; })(),
      tipoAfectacionNotaCredito: (() => {
        const det = docsVigentes.map((d) => String((d as any).tipo_afectacion_nota_credito || '')).filter(Boolean).join(',');
        if (!det) return '';
        if (/TOTAL/i.test(det)) return 'TOTAL';
        if (/PARCIAL/i.test(det)) return 'PARCIAL';
        if (/CORRECCION|CORRECCIÓN/i.test(det)) return 'CORRECCIÓN';
        return det;
      })(),
      tipoPago: tiposPago, formaPago: formasPago, cortesiaDescuento: etiquetaDescuento(descuentos),
       importeBruto, descuento, importeNeto, importeConsiderado, motivoExclusion, importePagado, saldoPendiente,
       estadoCertificado: textoUnico(lineasVigentes.map((linea) => linea.certificado_estado)) || '-',
       estadoComprobante: textoUnico(docsVigentes.map(estadoFiscal)) || 'Sin comprobante'
    });
  }

  filas.sort((a, b) => numero(a.fecha) - numero(b.fecha) || String(a.operacion).localeCompare(String(b.operacion)));
  const totales = filas.reduce<{ bruto: number; descuento: number; neto: number; considerado: number; pagado: number; saldo: number }>((acc, row) => ({
    bruto: acc.bruto + numero(row.importeBruto),
    descuento: acc.descuento + numero(row.descuento), neto: acc.neto + numero(row.importeNeto),
    considerado: acc.considerado + numero(row.importeConsiderado),
    pagado: acc.pagado + numero(row.importePagado), saldo: acc.saldo + numero(row.saldoPendiente)
  }), { bruto: 0, descuento: 0, neto: 0, considerado: 0, pagado: 0, saldo: 0 });
  const excluidos = filas.filter((r) => numero(r.importeConsiderado) === 0 && numero(r.importeNeto) > 0).length;
  const pagadoExcluido = moneda(filas.filter((r) => String(r.motivoExclusion).startsWith('pagado excluido:')).reduce((s, r) => s + numero(r.importePagado), 0));
  filas.push({
    fecha: '', horaEmisionCertificadoC: '', sede: 'TOTAL VENTAS VIGENTES', operacion: '', placa: '', cliente: '', documento: '', tipoOperacion: '', servicio: '',
    descripcionEmitido: '', tipoCertificado: '', certificado: '', chip: '', productoAdicional: '', cantidad: '',
    tipoComprobante: '', comprobante: '', usuarioEmisorComprobante: '', usuarioEmisorCertificado: '', tieneSolicitudAnulacion: '', anulado: '', estadoSolicitudAnulacion: '', documentoAnulacion: '', fechaSolicitudAnulacion: '', estadoAnulacionFiscal: '', fechaConfirmacionAnulacion: '', motivoAnulacion: '', tieneNotaCredito: '', numeroNotaCredito: '', motivoNotaCredito: '', estadoNotaCredito: '', fechaEmisionNotaCredito: '', importeNotaCredito: '', tipoAfectacionNotaCredito: '', tipoPago: '', formaPago: '', cortesiaDescuento: '', importeBruto: moneda(totales.bruto),
    descuento: moneda(totales.descuento), importeNeto: moneda(totales.neto), importeConsiderado: moneda(totales.considerado), motivoExclusion: excluidos ? `${excluidos} op(s) exclificadas` : '', importePagado: moneda(totales.pagado),
    saldoPendiente: moneda(totales.saldo), estadoCertificado: '', estadoComprobante: ''
  });
  filas.push({
    fecha: '', horaEmisionCertificadoC: '', sede: 'TOTAL PAGADO HISTÓRICO', operacion: '', placa: '', cliente: '', documento: '', tipoOperacion: '', servicio: '',
    descripcionEmitido: '', tipoCertificado: '', certificado: '', chip: '', productoAdicional: '', cantidad: '',
    tipoComprobante: '', comprobante: '', usuarioEmisorComprobante: '', usuarioEmisorCertificado: '', tieneSolicitudAnulacion: '', anulado: '', estadoSolicitudAnulacion: '', documentoAnulacion: '', fechaSolicitudAnulacion: '', estadoAnulacionFiscal: '', fechaConfirmacionAnulacion: '', motivoAnulacion: '', tieneNotaCredito: '', numeroNotaCredito: '', motivoNotaCredito: '', estadoNotaCredito: '', fechaEmisionNotaCredito: '', importeNotaCredito: '', tipoAfectacionNotaCredito: '', tipoPago: '', formaPago: '', cortesiaDescuento: '', importeBruto: '',
    descuento: '', importeNeto: '', importeConsiderado: '', motivoExclusion: pagadoExcluido ? `pagado excluido: S/ ${pagadoExcluido.toFixed(2)}` : '', importePagado: moneda(totales.pagado),
    saldoPendiente: '', estadoCertificado: '', estadoComprobante: ''
  });
  return filas;
}

export function construirHojasReporteFinanciero(data: ReporteFinancieroResponse): ExcelSheetDefinition[] {
  const sedes = (data.sedes || []).map((sede) => sede.planta_nombre || sede.planta_key).filter(Boolean);
  return [{
    name: 'Financiero Consolidado', title: 'REPORTE FINANCIERO CONSOLIDADO',
    metadata: [['Fecha desde', data.metadatos.desde], ['Fecha hasta', data.metadatos.hasta],
      ['Sede', sedes.length ? textoUnico(sedes) : data.metadatos.plantas.join(', ')], ['Generado por', data.metadatos.usuarioExportador || 'Usuario']],
    headerRow: 7, totalsRow: true,
    columns: columnas(
      ['fecha', 'Fecha de emisión / operación', 21, 'date'], ['horaEmisionCertificadoC', 'Hora de emisión del certificado', 18, 'text'], ['sede', 'Sede', 20],
      ['placa', 'Placa', 13, 'text'], ['cliente', 'Cliente / razón social', 30], ['documento', 'Documento del cliente', 20, 'text'],
      ['tipoOperacion', 'Tipo de operación', 26], ['servicio', 'Servicio / producto vendido', 36],
      ['descripcionEmitido', 'Descripción de lo emitido', 55], ['tipoCertificado', 'Tipo de certificado', 24],
      ['certificado', 'Código del certificado', 22, 'text'], ['chip', 'Código del chip', 20, 'text'],
      ['productoAdicional', 'Producto adicional', 32], ['cantidad', 'Cantidad', 12, 'decimal2'],
      ['importeBruto', 'Importe bruto original (S/)', 23, 'currency'], ['cortesiaDescuento', 'Cortesía / Descuento', 28],
      ['descuento', 'Importe descontado (S/)', 23, 'currency'], ['importeNeto', 'Importe neto (S/)', 19, 'currency'],
      ['importeConsiderado', 'Importe considerado en total (S/)', 22, 'currency'], ['motivoExclusion', 'Motivo de exclusión del total', 24],
      ['tipoComprobante', 'Tipo de comprobante', 20], ['comprobante', 'Código del comprobante', 22, 'text'],       ['usuarioEmisorCertificado', 'Usuario emisor del certificado', 22, 'text'], ['usuarioEmisorComprobante', 'Usuario emisor del comprobante', 22, 'text'],
      ['tieneSolicitudAnulacion', '¿Tiene solicitud de anulación?', 18], ['anulado', 'ANULACIÓN / NC REGISTRADA', 18], ['estadoSolicitudAnulacion', 'Estado de solicitud de anulación', 22], ['documentoAnulacion', 'Documento de anulación', 20], ['fechaSolicitudAnulacion', 'Fecha de solicitud de anulación', 22, 'text'], ['estadoAnulacionFiscal', 'Estado de anulación fiscal', 20], ['fechaConfirmacionAnulacion', 'Fecha de confirmación de anulación', 22, 'text'], ['motivoAnulacion', 'Motivo de anulación', 30],
      ['tieneNotaCredito', '¿Tiene nota de crédito?', 18], ['numeroNotaCredito', 'Número de nota de crédito', 22], ['motivoNotaCredito', 'Motivo de nota de crédito', 26], ['estadoNotaCredito', 'Estado de nota de crédito', 22], ['fechaEmisionNotaCredito', 'Fecha de emisión de nota de crédito', 22, 'text'], ['importeNotaCredito', 'Importe de nota de crédito (S/)', 22, 'currency'], ['tipoAfectacionNotaCredito', 'Tipo de afectación (TOTAL/PARCIAL/CORRECCIÓN)', 24],
      ['tipoPago', 'Tipo de pago', 20], ['formaPago', 'Forma de pago', 20], ['importePagado', 'Importe pagado (S/)', 20, 'currency'],
      ['saldoPendiente', 'Saldo pendiente (S/)', 21, 'currency'],
      ['estadoCertificado', 'Estado del certificado', 21], ['estadoComprobante', 'Estado técnico / fiscal', 25]
    ), rows: construirFilasReporteFinanciero(data)
  }];
}

export function exportarReporteFinanciero(data: ReporteFinancieroResponse) {
  if (!data?.operaciones || !data?.comprobantes) throw new Error('El servidor no devolvió datos financieros.');
  exportarExcelVariasHojas(`faregas_reporte_financiero_${data.metadatos.desde}_${data.metadatos.hasta}`, construirHojasReporteFinanciero(data));
}