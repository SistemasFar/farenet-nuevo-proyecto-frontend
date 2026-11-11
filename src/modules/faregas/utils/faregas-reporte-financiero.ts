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
  const rawHora = (linea as any).fecha_hora_emision ?? (linea as any).hora_emision_certificado ?? (doc as any)?.fecha_hora_emision ?? (doc as any)?.hora_emision_certificado;
  if (rawHora) return formatearHoraLima(rawHora);
  return 'SIN REGISTRO';
}

export function horaEmisionComprobante(doc: Row): string {
  const estadoComp = estado(doc.estado);
  if (estadoComp === 'BORRADOR') return 'NO EMITIDO';
  const rawHora = (doc as any).fecha_hora_emision_comprobante ?? (doc as any).hora_emision_comprobante;
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
export function formatearDesglosePagos(
  pagos: Row[],
  esCortesia: boolean
): { importePagadoTexto: string | number; importePagadoNumerico: number } {
  if (esCortesia) {
    return { importePagadoTexto: 'S/ 0.00', importePagadoNumerico: 0 };
  }
  const confirmados = pagos.filter(pagoConfirmado);
  if (!confirmados.length) {
    return { importePagadoTexto: 'S/ 0.00', importePagadoNumerico: 0 };
  }
  const totalNumerico = moneda(confirmados.reduce((sum, p) => sum + numero(p.importe), 0));
  if (confirmados.length === 1) {
    return {
      importePagadoTexto: moneda(confirmados[0].importe),
      importePagadoNumerico: totalNumerico
    };
  }
  const desgloseTexto = confirmados
    .map((p) => `S/ ${moneda(p.importe).toFixed(2)}`)
    .join(' + ');
  return {
    importePagadoTexto: desgloseTexto,
    importePagadoNumerico: totalNumerico
  };
}

export function clasificarMediosPago(
  pagos: Row[],
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

export function construirFilasReporteFinancieroBase(data: ReporteFinancieroResponse): Array<Record<string, ExcelCellValue>> {
  const operaciones = (data.operaciones || []).map((row) => ({ ...row, key: `OP-${row.id}`, idOperacion: `OP-${row.id}` }));
  const directasPorId = new Map<string, Row>();
  (data.ventasDirectas || []).forEach((row) => {
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
  (data.lineas || []).forEach((linea) => {
    const key = `OP-${linea.operacion_id}`;
    lineasPorVenta.set(key, [...(lineasPorVenta.get(key) || []), linea]);
  });
  directas.forEach((venta) => lineasPorVenta.set(venta.key, (venta.detalles || []).map((detalle: Row) => ({
    ...detalle, producto: detalle.producto, importe_total: detalle.importe_detalle,
    certificado_estado: null, numero_chip: detalle.numero_chip, tipo_item: 'PRODUCTO'
  }))));

  const docsPorVenta = new Map<string, Row[]>();
  (data.comprobantes || []).forEach((doc) => {
    const key = doc.operacion_id ? `OP-${doc.operacion_id}` : doc.venta_id ? `VD-${doc.venta_id}` : '';
    if (key) docsPorVenta.set(key, [...(docsPorVenta.get(key) || []), doc]);
  });
  const ordenesPorVenta = new Map<string, Row[]>();
  (data.ordenes || []).forEach((orden) => {
    const key = orden.operacion_id ? `OP-${orden.operacion_id}` : orden.venta_id ? `VD-${orden.venta_id}` : '';
    if (key) ordenesPorVenta.set(key, [...(ordenesPorVenta.get(key) || []), orden]);
  });
  const pagosPorOrden = new Map<string, Row[]>();
  (data.pagos || []).forEach((pago) => pagosPorOrden.set(String(pago.orden_pago_id), [...(pagosPorOrden.get(String(pago.orden_pago_id)) || []), pago]));

  const descuentosPorVenta = new Map<string, Row[]>();
  const operacionPorCertificado = new Map<string, string>();
  (data.lineas || []).forEach((linea) => linea.certificado_id && operacionPorCertificado.set(String(linea.certificado_id), `OP-${linea.operacion_id}`));
  const ordenPorId = new Map((data.ordenes || []).map((orden) => [String(orden.id), orden]));
  const docPorId = new Map((data.comprobantes || []).map((doc) => [String(doc.id), doc]));
  (data.descuentos || []).filter((item) => estado(item.estado) === 'APLICADO').forEach((item) => {
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
    if (['ANULADO', 'ANULADA', 'CANCELADO', 'BORRADOR'].includes(estado(venta.estado))) continue;
    const todasLasLineas = lineasPorVenta.get(venta.key) || [];
    const docsOriginales = docsPorVenta.get(venta.key) || [];
    const docsVigentes = docsOriginales.filter((doc) => !documentoFiscalInvalido(doc));
    if (docsOriginales.length && !docsVigentes.length) continue;

    const ordenes = ordenesPorVenta.get(venta.key) || [];
    const pagos = ordenes.flatMap((orden) => pagosPorOrden.get(String(orden.id)) || []).filter(pagoConfirmado);
    const importePagado = moneda(pagos.reduce((sum, pago) => sum + numero(pago.importe), 0));

    // REGLA FUNDAMENTAL DE CONFIRMACIÓN COMERCIAL (Excluir borradores y no confirmadas)
    const lineasConCert = todasLasLineas.filter((l) => Boolean(l.certificado_id || l.numero_certificado));
    const esDup = esDuplicado(todasLasLineas);

    if (lineasConCert.length > 0 && !esDup) {
      const estadosCert = lineasConCert.map((l) => estado(l.certificado_estado));
      const todosBorradores = estadosCert.every((e) => e === 'BORRADOR' || !e);
      if (todosBorradores) continue;

      const todosAnulados = estadosCert.every((e) => e === 'ANULADO');
      if (todosAnulados) continue;

      const tieneComprobanteValido = docsVigentes.length > 0;
      const tienePagoConfirmado = importePagado > 0;
      const ventaConfirmada = ['PAGADO', 'FACTURADO'].includes(estado(venta.estado));
      if (!tieneComprobanteValido && !tienePagoConfirmado && !ventaConfirmada) {
        continue;
      }
    } else if (esDup) {
      const tieneComprobanteValido = docsVigentes.length > 0;
      const tienePagoConfirmado = importePagado > 0;
      const confirmada = ['PAGADO', 'FACTURADO', 'EMITIDO', 'CONFIRMADO'].includes(estado(venta.estado))
        || tieneComprobanteValido || tienePagoConfirmado;
      if (!confirmada) continue;
    } else if (venta.key.startsWith('VD-')) {
      const tieneComprobanteValido = docsVigentes.length > 0;
      const tienePagoConfirmado = importePagado > 0;
      const confirmada = ['PAGADO', 'FACTURADO', 'EMITIDO', 'CONFIRMADO'].includes(estado(venta.estado))
        || tieneComprobanteValido || tienePagoConfirmado;
      if (!confirmada) continue;
    } else {
      const tieneComprobanteValido = docsVigentes.length > 0;
      const tienePagoConfirmado = importePagado > 0;
      const confirmada = ['PAGADO', 'FACTURADO', 'EMITIDO', 'CONFIRMADO'].includes(estado(venta.estado))
        || tieneComprobanteValido || tienePagoConfirmado;
      if (!confirmada) continue;
    }

    const lineasVigentes = todasLasLineas.filter((linea) => {
      const est = estado(linea.certificado_estado);
      return est !== 'ANULADO' && est !== 'BORRADOR';
    });
    if (todasLasLineas.length && !lineasVigentes.length) continue;

    const idsCertificados = new Set(lineasVigentes.map((linea) => String(linea.certificado_id || '')).filter(Boolean));
    const descuentos = (descuentosPorVenta.get(venta.key) || []).filter((item) =>
      !item.certificado_id || !idsCertificados.size || idsCertificados.has(String(item.certificado_id))
    );
    const descuento = moneda(descuentos.reduce((sum, item) => sum + numero(item.importe_descuento), 0));
    const totalBase = lineasVigentes.length
      ? moneda(lineasVigentes.reduce((sum, linea) => sum + numero(linea.importe_total), 0))
      : moneda(venta.importe_total);
    const importeBruto = moneda(totalBase + descuento);
    const notaCreditoParcial = moneda(docsVigentes.reduce((sum, doc) => sum + numero(doc.nota_credito_parcial_total), 0));
    const importeNeto = moneda(Math.max(0, totalBase - notaCreditoParcial));
    const docCredito = docsVigentes.find((doc) => estado(doc.condicion_pago) === 'CREDITO')
      || docsOriginales.find((doc) => estado(doc.condicion_pago) === 'CREDITO');
    const ordenCredito = ordenes.find((ord) => estado(ord.formapago_key).includes('CREDITO'));
    const esCredito = Boolean(docCredito || ordenCredito);
    const cuotasCount = docCredito ? Number(docCredito.cuotas_count || docCredito.max_cuota || 0) : 0;
    const esCortesiaVenta = Boolean(
      descuentos.some((d) => ['CORTESIA_FAREGAS', 'DESCUENTO_TALLER', 'D_CONVENIO_A88137BB742F4157'].includes(String(d.codigo || '').trim().toUpperCase())
        || Number((d as any).descuento_id || (d as any).descuentoId) === 17
        || String(d.nombre_descuento || '').trim().toUpperCase() === 'DESCUENTO CERTIFICADO TALLER'
        || Boolean(d.autorizaGratuidad))
      || docsVigentes.some((doc) => Boolean(
        (doc as any).es_cortesia
        || String((doc as any).tipo_pago || '').toUpperCase() === 'CORTESÍA'
        || String((doc as any).forma_pago || '').toUpperCase() === 'CORTESÍA'
        || (Number(doc.importe_total || 0) === 0 && JSON.stringify(doc.campos_dinamicos || '').includes('1002'))
      ))
    );
    let descuentoCalculado = descuento;
    let brutoCalculado = importeBruto;
    if (esCortesiaVenta) {
      if (descuentoCalculado === 0 && totalBase > 0) {
        descuentoCalculado = totalBase;
        brutoCalculado = totalBase;
      } else if (totalBase === 0 && descuentoCalculado > 0) {
        brutoCalculado = descuentoCalculado;
      } else if (totalBase === 0 && descuentoCalculado === 0) {
        const precioRef = lineasVigentes.reduce((sum, l) => sum + numero(l.precio_unitario || l.valor_unitario || l.valor_referencial_unitario), 0);
        if (precioRef > 0) {
          brutoCalculado = moneda(precioRef);
          descuentoCalculado = moneda(precioRef);
        }
      }
    }
    const { importePagadoTexto, importePagadoNumerico } = formatearDesglosePagos(pagos, esCortesiaVenta);
    const { tipoPago: tipoPagoCons, formaPago: formaPagoCons } = clasificarMediosPago(
      pagos,
      esCortesiaVenta ? 0 : importeNeto,
      importePagadoNumerico,
      { esCredito, cuotasCount, esCortesia: esCortesiaVenta }
    );
    const tiposPago = esCortesiaVenta ? 'CORTESÍA' : tipoPagoCons;
    const formasPago = esCortesiaVenta ? 'CORTESÍA' : formaPagoCons;
    const saldoPendiente = esCortesiaVenta ? 0 : moneda(Math.max(0, (esCortesiaVenta ? 0 : importeNeto) - importePagadoNumerico));
    const docCliente = docsVigentes.map((doc) => limpiarDocumentoCliente(doc.tipo_documento_cliente, doc.nro_documento)).find(Boolean);
    const productosAdicionales = lineasVigentes.filter((linea) => estado(linea.tipo_item) === 'PRODUCTO'
      || (!linea.certificado_id && !linea.numero_certificado && !linea.duplicado_id));
    const horasCertificados = textoUnico(
      lineasVigentes
        .filter((linea) => linea.certificado_id || linea.numero_certificado)
        .map((linea) => horaEmisionCertificado(linea, docsVigentes[0])),
      ' | '
    ) || '';

    const docsParaHora = docsVigentes.length > 0 ? docsVigentes : docsOriginales;
    const horasComprobantes = docsParaHora.length > 0
      ? (textoUnico(docsParaHora.map(horaEmisionComprobante), ' | ') || 'SIN REGISTRO')
      : '';

    const tienePendienteAnulacion = docsVigentes.some((doc) => {
      const est = String((doc as any).estado_solicitud_anulacion || '').toUpperCase();
      return Boolean((doc as any).documento_anulacion) && est !== 'RECHAZADO'
        && !(esVerdadero((doc as any).aceptada_anulacion_sunat) && (doc as any).fecha_anulacion_confirmacion);
    });
    const anulacionConfirmadaF = docsVigentes.some((doc) => esVerdadero((doc as any).aceptada_anulacion_sunat) && (doc as any).fecha_anulacion_confirmacion);
    const ncTotalAceptada = docsVigentes.some((doc) => esVerdadero((doc as any).nota_anulacion_total_aceptada) || documentoFiscalInvalido(doc));
    const ncTotalPendiente = docsVigentes.some((doc) => {
      const est = String((doc as any).estado_nota_credito || '').toUpperCase();
      const tipoAf = String((doc as any).tipo_afectacion_nota_credito || '').toUpperCase();
      return (est === 'PENDIENTE' || est === 'PENDIENTE_SUNAT') && (!tipoAf || tipoAf.includes('TOTAL'));
    });
    const certificadoAnulado = lineasVigentes.some((linea) => estado(linea.certificado_estado) === 'ANULADO');

    let motivoExclusion = '';
    let importeConsiderado = esCortesiaVenta ? 0 : moneda(importeNeto);

    if (esCortesiaVenta) {
      motivoExclusion = 'CORTESÍA';
      importeConsiderado = 0;
    } else if (anulacionConfirmadaF) {
      motivoExclusion = 'ANULACIÓN ACEPTADA';
      importeConsiderado = 0;
    } else if (tienePendienteAnulacion) {
      motivoExclusion = 'ANULACIÓN PENDIENTE';
      importeConsiderado = 0;
    } else if (ncTotalAceptada) {
      motivoExclusion = 'NC TOTAL ACEPTADA';
      importeConsiderado = 0;
    } else if (ncTotalPendiente) {
      motivoExclusion = 'NC TOTAL PENDIENTE';
      importeConsiderado = 0;
    } else if (certificadoAnulado) {
      motivoExclusion = 'CERTIFICADO ANULADO';
      importeConsiderado = 0;
    } else if (notaCreditoParcial > 0) {
      importeConsiderado = moneda(importeNeto);
      if (importeConsiderado === 0) {
        motivoExclusion = 'NC TOTAL ACEPTADA';
      }
    }

    const anulacionNcRegistrada = ((): string => {
      const haySolicitudActiva = docsVigentes.some((doc) => Boolean((doc as any).documento_anulacion)
        && String((doc as any).estado_solicitud_anulacion || '').toUpperCase() !== 'RECHAZADO');
      const hayNcVigente = docsVigentes.some((doc) => Number((doc as any).cantidad_notas_credito || 0) > 0
        || Boolean((doc as any).notas_credito)
        || ['PENDIENTE', 'ACEPTADO', 'ACEPTADA', 'CONFIRMADO'].includes(String((doc as any).estado_nota_credito || '').toUpperCase()));
      return haySolicitudActiva || hayNcVigente ? 'Sí' : 'No';
    })();

    const tipoCertificadoCalculado = ((): string => {
      const raw = textoUnico(lineasVigentes.map((linea) => linea.duplicado_tipo_nombre || linea.tipo_certificado_clave));
      if (raw && raw !== 'COMPLEMENTARIO') return raw;
      if (esDup) return 'COMPLEMENTARIO DUPLICADO';
      const esVentaProducto = venta.key.startsWith('VD-')
        || (lineasVigentes.length > 0 && lineasVigentes.every((l) => estado(l.tipo_item) === 'PRODUCTO' || (!l.certificado_id && !l.numero_certificado && !l.duplicado_id)));
      if (esVentaProducto) return 'COMPLEMENTARIO VENTA DE PRODUCTO';
      return raw || 'CERTIFICADO';
    })();

    filas.push({
      fecha: fechaExcel(docsVigentes.find((doc) => doc.fecha_documento)?.fecha_documento || venta.fecha_creacion),
      horaEmisionCertificadoC: horasCertificados,
      horaEmisionComprobanteC: horasComprobantes,
      sede: venta.planta_nombre || venta.planta_key || '', operacion: venta.idOperacion, placa: venta.placa || '',
      cliente: textoUnico(docsVigentes.map((doc) => doc.nombre_razon_social)) || venta.nombre_cliente_snapshot || '',
      documento: docCliente || limpiarDocumentoCliente(venta.tipo_documento_cliente_snapshot, venta.documento_cliente_snapshot),
      tipoOperacion: tipoOperacion(lineasVigentes, venta.key.startsWith('VD-')),
      servicio: textoUnico(lineasVigentes.map((linea) => linea.producto || linea.tipo_certificado_clave || linea.categoria)) || 'Operación comercial',
      descripcionEmitido: textoUnico(lineasVigentes.map(descripcionLinea), '; '),
      tipoCertificado: tipoCertificadoCalculado,
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
      tipoPago: tiposPago, formaPago: formasPago, cortesiaDescuento: esCortesiaVenta ? 'CORTESÍA' : etiquetaDescuento(descuentos),
      importeBruto: brutoCalculado,
      descuento: descuentoCalculado,
      importeNeto: esCortesiaVenta ? 0 : importeNeto,
      importeConsiderado: esCortesiaVenta ? 0 : importeConsiderado,
      motivoExclusion: esCortesiaVenta ? 'CORTESÍA' : motivoExclusion,
      importePagado: importePagadoTexto,
      importePagadoNumerico,
      saldoPendiente,
      estadoCertificado: textoUnico(lineasVigentes.map((linea) => linea.certificado_estado)) || '-',
      estadoComprobante: textoUnico(docsVigentes.map(estadoFiscal)) || 'Sin comprobante'
    });
  }

  filas.sort((a, b) => numero(a.fecha) - numero(b.fecha) || String(a.operacion).localeCompare(String(b.operacion)));
  return filas;
}

/**
 * REGLAS DE CONSOLIDADO_DATOS:
 * 1. Cortesías: DEBEN APARECER con neto S/ 0.00, pagado S/ 0.00, saldo S/ 0.00, importeConsiderado = 0 (no inflan ingresos).
 * 2. Exclusiones obligatorias:
 *    - Anulaciones activas o pendientes y bajas fiscales.
 *    - Certificados anulados.
 *    - Notas de crédito (totales o parciales) pendientes o emitidas.
 *    - Borradores.
 *    - Si una solicitud de anulación o NC fue RECHAZADA y no existe otra causa de exclusión, la venta original permanece.
 */
export function esVentaComercialVigente(row: Record<string, ExcelCellValue>): boolean {
  const esCortesia = String(row.cortesiaDescuento || '').toUpperCase().includes('CORTES')
    || String(row.tipoPago || '').toUpperCase().includes('CORTES')
    || String(row.formaPago || '').toUpperCase().includes('CORTES')
    || row.motivoExclusion === 'CORTESÍA';

  // 1. Certificado anulado
  const certAnulado = String(row.estadoCertificado || '').toUpperCase().includes('ANULADO')
    || row.motivoExclusion === 'CERTIFICADO ANULADO';
  if (certAnulado) return false;

  // 2. Solicitud de anulación o baja fiscal activa (salvo si está explícitamente RECHAZADA)
  if (row.tieneSolicitudAnulacion === 'SÍ' || Boolean(row.documentoAnulacion)) {
    const estSol = String(row.estadoSolicitudAnulacion || '').toUpperCase();
    const estFisc = String(row.estadoAnulacionFiscal || '').toUpperCase();
    const esRechazada = estSol === 'RECHAZADA' || estSol === 'RECHAZADO' || estFisc === 'RECHAZADA' || estFisc === 'RECHAZADO';
    if (!esRechazada) return false;
  }

  // 3. Nota de crédito (total o parcial, salvo si está explícitamente RECHAZADA)
  const tieneNC = row.tieneNotaCredito === 'SÍ'
    || Boolean(row.numeroNotaCredito)
    || Number(row.importeNotaCredito || 0) > 0
    || Boolean(row.tipoAfectacionNotaCredito)
    || Boolean(row.motivoExclusion && String(row.motivoExclusion).toUpperCase().includes('NC'));
  if (tieneNC) {
    const estNC = String(row.estadoNotaCredito || '').toUpperCase();
    const esRechazadaNC = estNC === 'RECHAZADA' || estNC === 'RECHAZADO';
    if (!esRechazadaNC) return false;
  }

  // 4. Motivo de exclusión activo (que no sea RECHAZADA ni CORTESÍA)
  if (row.motivoExclusion && !['RECHAZADA', 'RECHAZADO', 'CORTESÍA', 'CORTESIA'].includes(String(row.motivoExclusion).toUpperCase())) {
    return false;
  }

  // 5. Las cortesías son válidas con importe neto 0. El resto requiere importeNeto > 0.
  if (esCortesia) return true;
  if (Number(row.importeNeto || 0) <= 0) return false;

  return true;
}

export function construirFilasConsolidadoVigente(filasBase: Array<Record<string, ExcelCellValue>>): Array<Record<string, ExcelCellValue>> {
  const vigentes = filasBase.filter(esVentaComercialVigente).map((r) => {
    const esCortesia = String(r.cortesiaDescuento || '').toUpperCase().includes('CORTES')
      || String(r.tipoPago || '').toUpperCase().includes('CORTES')
      || String(r.formaPago || '').toUpperCase().includes('CORTES')
      || r.motivoExclusion === 'CORTESÍA';
    return {
      ...r,
      importeConsiderado: esCortesia ? 0 : r.importeNeto,
      motivoExclusion: esCortesia ? 'CORTESÍA' : ''
    };
  });

  const totales = vigentes.reduce<{ bruto: number; descuento: number; neto: number; pagado: number; saldo: number }>((acc, row) => ({
    bruto: acc.bruto + numero(row.importeBruto),
    descuento: acc.descuento + numero(row.descuento),
    neto: acc.neto + numero(row.importeNeto),
    pagado: acc.pagado + numero((row as any).importePagadoNumerico ?? row.importePagado),
    saldo: acc.saldo + numero(row.saldoPendiente)
  }), { bruto: 0, descuento: 0, neto: 0, pagado: 0, saldo: 0 });

  const filaTotalVentas: Record<string, ExcelCellValue> = {
    fecha: '', horaEmisionCertificadoC: '', horaEmisionComprobanteC: '',
    sede: 'TOTAL VENTAS VIGENTES', operacion: '', placa: '', cliente: '',
    documento: '', tipoOperacion: '', servicio: '', descripcionEmitido: '',
    tipoCertificado: '', certificado: '', chip: '', productoAdicional: '',
    cantidad: '', tipoComprobante: '', comprobante: '',
    usuarioEmisorComprobante: '', usuarioEmisorCertificado: '',
    tieneSolicitudAnulacion: '', anulado: '', estadoSolicitudAnulacion: '',
    documentoAnulacion: '', fechaSolicitudAnulacion: '', estadoAnulacionFiscal: '',
    fechaConfirmacionAnulacion: '', motivoAnulacion: '', tieneNotaCredito: '',
    numeroNotaCredito: '', motivoNotaCredito: '', estadoNotaCredito: '',
    fechaEmisionNotaCredito: '', importeNotaCredito: '', tipoAfectacionNotaCredito: '',
    tipoPago: '', formaPago: '', cortesiaDescuento: '',
    importeBruto: moneda(totales.bruto),
    descuento: moneda(totales.descuento),
    importeNeto: moneda(totales.neto),
    importeConsiderado: moneda(totales.neto),
    motivoExclusion: '',
    importePagado: moneda(totales.pagado),
    importePagadoNumerico: moneda(totales.pagado),
    saldoPendiente: moneda(totales.saldo),
    estadoCertificado: '', estadoComprobante: ''
  };

  const filaTotalPagado: Record<string, ExcelCellValue> = {
    fecha: '', horaEmisionCertificadoC: '', horaEmisionComprobanteC: '',
    sede: 'TOTAL PAGADO', operacion: '', placa: '', cliente: '',
    documento: '', tipoOperacion: '', servicio: '', descripcionEmitido: '',
    tipoCertificado: '', certificado: '', chip: '', productoAdicional: '',
    cantidad: '', tipoComprobante: '', comprobante: '',
    usuarioEmisorComprobante: '', usuarioEmisorCertificado: '',
    tieneSolicitudAnulacion: '', anulado: '', estadoSolicitudAnulacion: '',
    documentoAnulacion: '', fechaSolicitudAnulacion: '', estadoAnulacionFiscal: '',
    fechaConfirmacionAnulacion: '', motivoAnulacion: '', tieneNotaCredito: '',
    numeroNotaCredito: '', motivoNotaCredito: '', estadoNotaCredito: '',
    fechaEmisionNotaCredito: '', importeNotaCredito: '', tipoAfectacionNotaCredito: '',
    tipoPago: '', formaPago: '', cortesiaDescuento: '',
    importeBruto: '', descuento: '', importeNeto: '', importeConsiderado: '',
    motivoExclusion: '',
    importePagado: moneda(totales.pagado),
    importePagadoNumerico: moneda(totales.pagado),
    saldoPendiente: '', estadoCertificado: '', estadoComprobante: ''
  };

  return [...vigentes, filaTotalVentas, filaTotalPagado];
}

/**
 * REGLAS PARA HOJA ANULADOS:
 * - Operaciones con solicitud de anulación activa o pendiente.
 * - Operaciones con baja fiscal pendiente o confirmada.
 * - Certificado u operación anulada.
 * - NO incluir notas de crédito puras.
 * - NO incluir borradores ni solicitudes rechazadas sin anulación activa.
 */
export function esFilaAnulados(row: Record<string, ExcelCellValue>): boolean {
  const estCert = String(row.estadoCertificado || '').toUpperCase();
  const estComp = String(row.estadoComprobante || '').toUpperCase();
  if (estCert === 'BORRADOR' || estComp === 'BORRADOR') return false;

  const tieneSolAnulacion = row.tieneSolicitudAnulacion === 'SÍ' || Boolean(row.documentoAnulacion);
  const estSol = String(row.estadoSolicitudAnulacion || '').toUpperCase();
  const estFisc = String(row.estadoAnulacionFiscal || '').toUpperCase();
  const solRechazada = estSol === 'RECHAZADA' || estSol === 'RECHAZADO' || estFisc === 'RECHAZADA' || estFisc === 'RECHAZADO';

  if (tieneSolAnulacion && !solRechazada) {
    return true;
  }

  if (estFisc === 'ANULADO' || estFisc === 'PENDIENTE') {
    return true;
  }

  if (
    estCert.includes('ANULADO') ||
    estComp.includes('ANULADO') ||
    row.motivoExclusion === 'CERTIFICADO ANULADO' ||
    row.motivoExclusion === 'ANULACIÓN ACEPTADA' ||
    row.motivoExclusion === 'ANULACIÓN PENDIENTE'
  ) {
    return true;
  }

  return false;
}

/**
 * REGLAS PARA HOJA NOTAS DE CRÉDITO:
 * - Solicitudes de NC activas, pendientes o aprobadas.
 * - Notas de crédito en proceso o emitidas.
 * - Estados técnicos activos (error, incierto).
 * - NO incluir solicitudes de NC rechazadas.
 * - NO incluir borradores.
 */
export function esFilaNotasCredito(row: Record<string, ExcelCellValue>): boolean {
  const estCert = String(row.estadoCertificado || '').toUpperCase();
  const estComp = String(row.estadoComprobante || '').toUpperCase();
  if (estCert === 'BORRADOR' || estComp === 'BORRADOR') return false;

  const tieneNC = row.tieneNotaCredito === 'SÍ'
    || Boolean(row.numeroNotaCredito)
    || Number(row.importeNotaCredito || 0) > 0
    || Boolean(row.tipoAfectacionNotaCredito)
    || Boolean(row.motivoExclusion && String(row.motivoExclusion).toUpperCase().includes('NC'));

  if (!tieneNC) return false;

  const estNC = String(row.estadoNotaCredito || '').toUpperCase();
  if (estNC === 'RECHAZADA' || estNC === 'RECHAZADO') return false;

  return true;
}

export function construirHojaAnulados(
  data: ReporteFinancieroResponse,
  nombre = 'Anulados'
): ExcelSheetDefinition {
  const sedes = (data.sedes || []).map((sede) => sede.planta_nombre || sede.planta_key).filter(Boolean);
  const filasBase = construirFilasReporteFinancieroBase(data);
  const filasAnulados = filasBase.filter(esFilaAnulados);
  return {
    name: nombre.slice(0, 31),
    title: 'OPERACIONES CON ANULACIÓN O BAJA FISCAL',
    metadata: [
      ['Fecha desde', data.metadatos?.desde || ''],
      ['Fecha hasta', data.metadatos?.hasta || ''],
      ['Sede', sedes.length ? textoUnico(sedes) : (data.metadatos?.plantas || []).join(', ')],
      ['Generado por', data.metadatos?.usuarioExportador || 'Usuario']
    ],
    headerRow: 7,
    totalsRow: false,
    columns: obtenerColumnasReporteFinanciero(),
    rows: filasAnulados
  };
}

export function construirHojaNotasCredito(
  data: ReporteFinancieroResponse,
  nombre = 'Notas de credito'
): ExcelSheetDefinition {
  const sedes = (data.sedes || []).map((sede) => sede.planta_nombre || sede.planta_key).filter(Boolean);
  const filasBase = construirFilasReporteFinancieroBase(data);
  const filasNC = filasBase.filter(esFilaNotasCredito);
  return {
    name: nombre.slice(0, 31),
    title: 'OPERACIONES CON NOTA DE CRÉDITO',
    metadata: [
      ['Fecha desde', data.metadatos?.desde || ''],
      ['Fecha hasta', data.metadatos?.hasta || ''],
      ['Sede', sedes.length ? textoUnico(sedes) : (data.metadatos?.plantas || []).join(', ')],
      ['Generado por', data.metadatos?.usuarioExportador || 'Usuario']
    ],
    headerRow: 7,
    totalsRow: false,
    columns: obtenerColumnasReporteFinanciero(),
    rows: filasNC
  };
}

export function construirFilasReporteFinanciero(data: ReporteFinancieroResponse): Array<Record<string, ExcelCellValue>> {
  const filas = construirFilasReporteFinancieroBase(data);
  const totales = filas.reduce<{ bruto: number; descuento: number; neto: number; considerado: number; pagado: number; saldo: number }>((acc, row) => {
    const esVigente = numero(row.importeConsiderado) > 0;
    const pagoComputable = esVigente ? Math.min(numero((row as any).importePagadoNumerico ?? row.importePagado), numero(row.importeConsiderado)) : 0;
    return {
      bruto: acc.bruto + numero(row.importeBruto),
      descuento: acc.descuento + numero(row.descuento),
      neto: acc.neto + numero(row.importeNeto),
      considerado: acc.considerado + numero(row.importeConsiderado),
      pagado: acc.pagado + pagoComputable,
      saldo: acc.saldo + (esVigente ? numero(row.saldoPendiente) : 0)
    };
  }, { bruto: 0, descuento: 0, neto: 0, considerado: 0, pagado: 0, saldo: 0 });
  const excluidos = filas.filter((r) => numero(r.importeConsiderado) === 0 && numero(r.importeNeto) > 0).length;
  const pagadoExcluido = moneda(filas.filter((r) => numero(r.importeConsiderado) === 0).reduce((s, r) => s + numero((r as any).importePagadoNumerico ?? r.importePagado), 0));
  filas.push({
    fecha: '', horaEmisionCertificadoC: '', horaEmisionComprobanteC: '', sede: 'TOTAL VENTAS VIGENTES', operacion: '', placa: '', cliente: '', documento: '', tipoOperacion: '', servicio: '',
    descripcionEmitido: '', tipoCertificado: '', certificado: '', chip: '', productoAdicional: '', cantidad: '',
    tipoComprobante: '', comprobante: '', usuarioEmisorComprobante: '', usuarioEmisorCertificado: '', tieneSolicitudAnulacion: '', anulado: '', estadoSolicitudAnulacion: '', documentoAnulacion: '', fechaSolicitudAnulacion: '', estadoAnulacionFiscal: '', fechaConfirmacionAnulacion: '', motivoAnulacion: '', tieneNotaCredito: '', numeroNotaCredito: '', motivoNotaCredito: '', estadoNotaCredito: '', fechaEmisionNotaCredito: '', importeNotaCredito: '', tipoAfectacionNotaCredito: '', tipoPago: '', formaPago: '', cortesiaDescuento: '', importeBruto: moneda(totales.bruto),
    descuento: moneda(totales.descuento), importeNeto: moneda(totales.neto), importeConsiderado: moneda(totales.considerado), motivoExclusion: excluidos ? `${excluidos} op(s) excluida(s)` : '', importePagado: moneda(totales.pagado),
    importePagadoNumerico: moneda(totales.pagado),
    saldoPendiente: moneda(totales.saldo), estadoCertificado: '', estadoComprobante: ''
  });
  filas.push({
    fecha: '', horaEmisionCertificadoC: '', horaEmisionComprobanteC: '', sede: 'TOTAL PAGADO', operacion: '', placa: '', cliente: '', documento: '', tipoOperacion: '', servicio: '',
    descripcionEmitido: '', tipoCertificado: '', certificado: '', chip: '', productoAdicional: '', cantidad: '',
    tipoComprobante: '', comprobante: '', usuarioEmisorComprobante: '', usuarioEmisorCertificado: '', tieneSolicitudAnulacion: '', anulado: '', estadoSolicitudAnulacion: '', documentoAnulacion: '', fechaSolicitudAnulacion: '', estadoAnulacionFiscal: '', fechaConfirmacionAnulacion: '', motivoAnulacion: '', tieneNotaCredito: '', numeroNotaCredito: '', motivoNotaCredito: '', estadoNotaCredito: '', fechaEmisionNotaCredito: '', importeNotaCredito: '', tipoAfectacionNotaCredito: '', tipoPago: '', formaPago: '', cortesiaDescuento: '', importeBruto: '',
    descuento: '', importeNeto: '', importeConsiderado: '', motivoExclusion: pagadoExcluido ? `excluido de op(s) no vigentes: S/ ${pagadoExcluido.toFixed(2)}` : '', importePagado: moneda(totales.pagado),
    importePagadoNumerico: moneda(totales.pagado),
    saldoPendiente: '', estadoCertificado: '', estadoComprobante: ''
  });
  return filas;
}

export function obtenerColumnasReporteFinanciero(): ExcelColumn[] {
  const cols = columnas(
    ['fecha', 'Fecha de emisión / operación', 21, 'date'], ['horaEmisionCertificadoC', 'Hora de emisión del certificado', 18, 'text'], ['horaEmisionComprobanteC', 'Hora de emisión del comprobante', 18, 'text'], ['sede', 'Sede', 20],
    ['placa', 'Placa', 13, 'text'], ['cliente', 'Cliente / razón social', 30], ['documento', 'Documento del cliente', 20, 'text'],
    ['tipoOperacion', 'Tipo de operación', 26], ['servicio', 'Servicio / producto vendido', 36],
    ['descripcionEmitido', 'Descripción de lo emitido', 55], ['tipoCertificado', 'Tipo de certificado', 24],
    ['certificado', 'Código del certificado', 22, 'text'], ['chip', 'Código del chip', 20, 'text'],
    ['productoAdicional', 'Producto adicional', 32], ['cantidad', 'Cantidad', 12, 'decimal2'],
    ['importeBruto', 'Importe bruto original (S/)', 23, 'currency'], ['cortesiaDescuento', 'Cortesía / Descuento', 28],
    ['descuento', 'Importe descontado (S/)', 23, 'currency'], ['importeNeto', 'Importe neto (S/)', 19, 'currency'],
    ['importeConsiderado', 'Importe considerado en total (S/)', 22, 'currency'], ['motivoExclusion', 'Motivo de exclusión del total', 24],
    ['tipoComprobante', 'Tipo de comprobante', 20], ['comprobante', 'Código del comprobante', 22, 'text'], ['usuarioEmisorCertificado', 'Usuario emisor del certificado', 22, 'text'], ['usuarioEmisorComprobante', 'Usuario emisor del comprobante', 22, 'text'],
    ['tieneSolicitudAnulacion', '¿Tiene solicitud de anulación?', 18], ['anulado', 'ANULACIÓN / NC REGISTRADA', 18], ['estadoSolicitudAnulacion', 'Estado de solicitud de anulación', 22], ['documentoAnulacion', 'Documento de anulación', 20], ['fechaSolicitudAnulacion', 'Fecha de solicitud de anulación', 22, 'text'], ['estadoAnulacionFiscal', 'Estado de anulación fiscal', 20], ['fechaConfirmacionAnulacion', 'Fecha de confirmación de anulación', 22, 'text'], ['motivoAnulacion', 'Motivo de anulación', 30],
    ['tieneNotaCredito', '¿Tiene nota de crédito?', 18], ['numeroNotaCredito', 'Número de nota de crédito', 22], ['motivoNotaCredito', 'Motivo de nota de crédito', 26], ['estadoNotaCredito', 'Estado de nota de crédito', 22], ['fechaEmisionNotaCredito', 'Fecha de emisión de nota de crédito', 22, 'text'], ['importeNotaCredito', 'Importe de nota de crédito (S/)', 22, 'currency'], ['tipoAfectacionNotaCredito', 'Tipo de afectación (TOTAL/PARCIAL/CORRECCIÓN)', 24],
    ['tipoPago', 'Tipo de pago', 20], ['formaPago', 'Forma de pago', 20], ['importePagado', 'Importe pagado (S/)', 24],
    ['saldoPendiente', 'Saldo pendiente (S/)', 21, 'currency'],
    ['estadoCertificado', 'Estado del certificado', 21], ['estadoComprobante', 'Estado técnico / fiscal', 25]
  );
  cols.push({
    key: 'importePagadoNumerico',
    header: 'Importe pagado numérico',
    width: 15,
    format: 'currency',
    hidden: true
  });
  return cols;
}

/** @deprecated Sustituido por construirHojaAnulados. Mantenido por compatibilidad retroactiva. */
export function construirHojaHistorial(
  data: ReporteFinancieroResponse,
  nombre = 'Historial'
): ExcelSheetDefinition {
  return construirHojaAnulados(data, nombre);
}

export function construirHojaConsolidado(
  data: ReporteFinancieroResponse,
  nombre = 'Consolidado_Datos'
): ExcelSheetDefinition {
  const sedes = (data.sedes || []).map((sede) => sede.planta_nombre || sede.planta_key).filter(Boolean);
  const filasBase = construirFilasReporteFinancieroBase(data);
  const filasVigentes = construirFilasConsolidadoVigente(filasBase);
  return {
    name: nombre.slice(0, 31),
    title: 'REPORTE FINANCIERO CONSOLIDADO — INGRESOS VIGENTES',
    metadata: [
      ['Fecha desde', data.metadatos?.desde || ''],
      ['Fecha hasta', data.metadatos?.hasta || ''],
      ['Sede', sedes.length ? textoUnico(sedes) : (data.metadatos?.plantas || []).join(', ')],
      ['Generado por', data.metadatos?.usuarioExportador || 'Usuario']
    ],
    headerRow: 7,
    totalsRow: true,
    columns: obtenerColumnasReporteFinanciero(),
    rows: filasVigentes
  };
}

export function construirHojasReporteFinanciero(data: ReporteFinancieroResponse): ExcelSheetDefinition[] {
  const sedes = (data.sedes || []).map((sede) => sede.planta_nombre || sede.planta_key).filter(Boolean);
  return [{
    name: 'Financiero Consolidado', title: 'REPORTE FINANCIERO CONSOLIDADO',
    metadata: [['Fecha desde', data.metadatos.desde], ['Fecha hasta', data.metadatos.hasta],
      ['Sede', sedes.length ? textoUnico(sedes) : data.metadatos.plantas.join(', ')], ['Generado por', data.metadatos.usuarioExportador || 'Usuario']],
    headerRow: 7, totalsRow: true,
    columns: obtenerColumnasReporteFinanciero(),
    rows: construirFilasReporteFinanciero(data)
  }];
}

export function exportarReporteFinanciero(data: ReporteFinancieroResponse) {
  if (!data?.operaciones || !data?.comprobantes) throw new Error('El servidor no devolvió datos financieros.');
  exportarExcelVariasHojas(`faregas_reporte_financiero_${data.metadatos.desde}_${data.metadatos.hasta}`, construirHojasReporteFinanciero(data));
}
