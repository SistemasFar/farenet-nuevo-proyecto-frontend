import type { ReporteFinancieroResponse } from '../services/faregas-dashboard.api';
import { exportarExcelVariasHojas, type ExcelCellValue, type ExcelColumn, type ExcelSheetDefinition } from './exportar-excel';

const n = (value: unknown) => Number(value || 0);
const money = (value: unknown) => Number(n(value).toFixed(2));
const fecha = (value: unknown) => value ? new Date(String(value)).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : '';
const cols = (...entries: Array<[string, string, number?, ExcelColumn['format']?]>): ExcelColumn[] => entries.map(([key, header, width, format]) => ({ key, header, width, format }));
const nombreDocumento = (doc: Record<string, any>) => doc.nro_comprobante || [doc.serie, doc.numero].filter(Boolean).join('-');
const pagoValido = (pago: Record<string, any>) => String(pago.estado || '').toUpperCase() === 'CAN';
const operacionBorrador = (sale: Record<string, any>) => String(sale.estado || '').toUpperCase() === 'BORRADOR';
const sunatFlag = (row: Record<string, any>) => row.aceptada_sunat === true || row.aceptada_sunat === 't';
const aceptadoSunat = (doc: Record<string, any>) => String(doc.estado || '').toUpperCase() === 'ACEPTADO'
  && !ambienteDemo(doc) && sunatFlag(doc);
const ambienteDemo = (doc: Record<string, any>) => String(doc.entorno_facturador || '').toUpperCase() === 'DEMO';
const esComprobanteOperableDashboard = (doc: Record<string, any>) => {
  const estado = String(doc.estado || '').toUpperCase();
  if (estado === 'ACEPTADO' && (doc.aceptada_sunat === true || doc.aceptada_sunat === 't')) return true;
  return String(doc.entorno_facturador || '').toUpperCase() === 'DEMO'
    && String(doc.proveedor || '').toUpperCase() === 'NUBEFACT'
    && estado === 'PENDIENTE_SUNAT'
    && Boolean(doc.nro_comprobante && doc.serie && doc.numero)
    && Boolean(doc.enlace_pdf || doc.enlace_xml);
};
const estadoFiscalDocumento = (doc: Record<string, any>, estaAnulado = false) => {
  const estado = String(doc.estado || '').toUpperCase();
  if (estaAnulado || (estado === 'ANULADO' && sunatFlag(doc))) return 'ANULADO ACEPTADO SUNAT';
  if (estado === 'ANULADO') return 'ANULADO LOCAL; SIN CONFIRMACIÓN SUNAT';
  if (estado === 'ACEPTADO' && ambienteDemo(doc)) return 'ESTADO ACEPTADO EN DEMO; NO ACREDITA ACEPTACIÓN SUNAT';
  if (estado === 'ACEPTADO' && !aceptadoSunat(doc)) return 'ESTADO LOCAL ACEPTADO; SIN CONFIRMACIÓN SUNAT';
  if (estado === 'RECHAZADO') return 'RECHAZADO SUNAT';
  if (estado === 'ERROR') return 'ERROR TÉCNICO';
  if (aceptadoSunat(doc)) return 'ACEPTADO SUNAT';
  if (esComprobanteOperableDashboard(doc)) return 'GENERADO EN DEMO; SIN ACEPTACIÓN SUNAT';
  return 'PENDIENTE DE CONFIRMACIÓN FISCAL';
};

export function construirHojasReporteFinanciero(data: ReporteFinancieroResponse): ExcelSheetDefinition[] {
  const operaciones = data.operaciones.map((row) => ({ ...row, key: `OP-${row.id}`, idOperacion: `OP-${row.id}`, direct: false }));
  const ventasDirectasPorId = new Map<string, Record<string, any>>();
  data.ventasDirectas.forEach((row) => ventasDirectasPorId.set(String(row.id), row));
  const ventasDirectas = [...ventasDirectasPorId.values()].map((row) => ({
    ...row, key: `VD-${row.id}`, idOperacion: `VD-${row.id}`, direct: true,
    nombre_cliente_snapshot: row.cliente_nombre, tipo_documento_cliente_snapshot: row.cliente_tipo_documento,
    documento_cliente_snapshot: row.cliente_nro_documento
  }));
  const allSales: Array<Record<string, any>> = [...operaciones, ...ventasDirectas];
  const saleStateByKey = new Map(allSales.map((sale) => [sale.key, String(sale.estado || '').toUpperCase()]));
  const ordersById = new Map(data.ordenes.map((order) => [String(order.id), order]));
  const orderIdsBySale = new Map<string, string[]>();
  data.ordenes.forEach((order) => {
    const key = order.operacion_id ? `OP-${order.operacion_id}` : order.venta_id ? `VD-${order.venta_id}` : '';
    if (key) orderIdsBySale.set(key, [...(orderIdsBySale.get(key) || []), String(order.id)]);
  });
  const docsBySale = new Map<string, Record<string, any>[]>();
  data.comprobantes.forEach((doc) => {
    const key = doc.operacion_id ? `OP-${doc.operacion_id}` : doc.venta_id ? `VD-${doc.venta_id}` : '';
    if (key) docsBySale.set(key, [...(docsBySale.get(key) || []), doc]);
  });
  const anulados = new Set(data.ajustes.filter((row) => row.tipo === 'ANULACIÓN' && String(row.estado).toUpperCase() === 'ACEPTADO' && sunatFlag(row)).map((row) => String(row.facturacion_id)));
  const paymentsByOrder = new Map<string, Record<string, any>[]>();
  data.pagos.forEach((payment) => paymentsByOrder.set(String(payment.orden_pago_id), [...(paymentsByOrder.get(String(payment.orden_pago_id)) || []), payment]));
  const paidByOrder = new Map([...paymentsByOrder].map(([id, rows]) => [id, money(rows.filter(pagoValido).reduce((sum, row) => sum + n(row.importe), 0))]));
  const paidInPeriodByOrder = new Map([...paymentsByOrder].map(([id, rows]) => [id, money(rows.filter((row) => pagoValido(row) && row.en_periodo !== false).reduce((sum, row) => sum + n(row.importe), 0))]));
  const saldoByOrder = new Map(data.ordenes.map((order) => [String(order.id), n(order.importe_total) <= 0 ? 0 : money(order.saldo_pendiente ?? Math.max(0, n(order.importe_total) - (paidByOrder.get(String(order.id)) || 0)))]));
  const descuentosPorVenta = new Map<string, Record<string, any>[]>();
  const operationByCertificate = new Map(data.lineas.filter((line) => line.certificado_id).map((line) => [String(line.certificado_id), `OP-${line.operacion_id}`]));
  data.descuentos.forEach((discount) => {
    if (String(discount.estado || '').toUpperCase() !== 'APLICADO') return;
    const order = discount.orden_pago_id ? ordersById.get(String(discount.orden_pago_id)) : undefined;
    const invoice = discount.facturacion_id ? data.comprobantes.find((doc) => String(doc.id) === String(discount.facturacion_id)) : undefined;
    const key = order?.operacion_id ? `OP-${order.operacion_id}` : order?.venta_id ? `VD-${order.venta_id}` : invoice?.operacion_id ? `OP-${invoice.operacion_id}` : invoice?.venta_id ? `VD-${invoice.venta_id}` : operationByCertificate.get(String(discount.certificado_id)) || '';
    if (key) descuentosPorVenta.set(key, [...(descuentosPorVenta.get(key) || []), discount]);
  });

  const operationLines = data.lineas.map((row) => ({
    ...row, saleKey: `OP-${row.operacion_id}`, grossLine: n(row.precio_unitario) * n(row.cantidad),
    categoria: row.categoria || (String(row.codigo_producto || row.codigo_sku_snapshot || '').toUpperCase() === 'DUPLICADO_CERTIFICADO' ? 'Duplicados' : row.categoria)
  }));
  const directLines = data.ventasDirectas.filter((row) => row.detalle_id).map((row) => ({
    ...row, saleKey: `VD-${row.id}`, tipo_item: 'PRODUCTO', cantidad: row.cantidad,
    precio_unitario: row.precio_unitario, importe_total: row.importe_detalle,
    base_imponible: null, igv: null, producto: row.producto, codigo_producto: row.codigo_producto,
    grossLine: n(row.precio_unitario) * n(row.cantidad)
  }));
  const lines: Array<Record<string, any>> = [...operationLines, ...directLines];
  const lineGroups = new Map<string, Array<Record<string, any>>>();
  lines.forEach((line) => lineGroups.set(line.saleKey, [...(lineGroups.get(line.saleKey) || []), line]));

  const salesRows: Array<Record<string, ExcelCellValue>> = [];
  for (const sale of allSales) {
    const saleLines = lineGroups.get(sale.key) || [null];
    const orders = (orderIdsBySale.get(sale.key) || []).map((id) => ordersById.get(id)).filter(Boolean) as Record<string, any>[];
    const payments = orders.flatMap((order) => paymentsByOrder.get(String(order.id)) || []);
    const docs = docsBySale.get(sale.key) || [];
    const discounts = descuentosPorVenta.get(sale.key) || [];
    saleLines.forEach((line, index) => {
      const matchingLineDiscounts = line?.certificado_id
        ? discounts.filter((discount) => String(discount.certificado_id) === String(line.certificado_id)) : [];
      const lineDiscounts = matchingLineDiscounts.length ? matchingLineDiscounts
        : (!line && index === 0 ? discounts : []);
      const discountValue = money(lineDiscounts.reduce((sum, discount) => sum + n(discount.importe_descuento), 0));
      const gross = line ? n(line.grossLine) + discountValue : n(sale.importe_total) + (index === 0 ? discounts.reduce((sum, discount) => sum + n(discount.importe_descuento), 0) : 0);
      const net = line ? n(line.importe_total) : n(sale.importe_total);
      const subtotalAfterDiscount = Math.max(0, gross - discountValue);
      const paymentsInPeriod = payments.filter((payment) => pagoValido(payment) && payment.en_periodo !== false);
      const paymentMethods = [...new Set(paymentsInPeriod.map((p) => p.tipocontado_key).filter(Boolean))].join(', ');
      const fiscalClients = [...new Set(docs.map((doc) => doc.nombre_razon_social).filter(Boolean))];
      const fiscalDocuments = [...new Set(docs.map((doc) => [doc.tipo_documento_cliente, doc.nro_documento].filter(Boolean).join(' ')).filter(Boolean))];
      salesRows.push({
        idOperacion: sale.idOperacion, idOrden: index === 0 ? orders.map((order) => order.id).join(', ') : '',
        fechaVenta: fecha(sale.fecha_creacion), estadoComercial: sale.estado || '', sede: sale.planta_nombre || sale.planta_key,
        tipoProducto: line?.categoria || line?.tipo_item || 'Sin clasificación de catálogo',
        producto: line?.producto || 'Operación sin detalle comercial', codigoProducto: line?.codigo_producto || '',
        cantidad: line?.cantidad ?? 1, precioUnitario: money(line?.precio_unitario ?? sale.importe_total),
        importeAntes: money(gross),
        tipoDescuento: lineDiscounts.map((d) => [d.tipo_descuento || d.nombre_descuento || d.codigo || 'Origen no identificado', d.tipo_calculo].filter(Boolean).join(' / ')).join(', '),
        codigoDescuento: lineDiscounts.map((d) => d.codigo || '').filter(Boolean).join(', '),
        descuento: discountValue, descuentoPct: lineDiscounts.some((d) => d.tipo_calculo === 'PORCENTAJE') ? lineDiscounts.filter((d) => d.tipo_calculo === 'PORCENTAJE').map((d) => n(d.valor_descuento)).join(', ') : '',
        importeDespues: money(line ? line.importe_total : subtotalAfterDiscount), base: money(line?.base_imponible ?? (index === 0 ? sale.base_imponible : 0)),
        igv: money(line?.igv ?? (index === 0 ? sale.igv : 0)), total: money(net),
        tipoComprobante: index === 0 ? docs.map((doc) => doc.tipo_comprobante).join(', ') : '',
        serieNumero: index === 0 ? docs.map(nombreDocumento).filter(Boolean).join(', ') : '',
        fechaEmision: index === 0 ? docs.map((doc) => fecha(doc.fecha_documento) || 'SIN FECHA DE EMISIÓN').join(', ') : '',
        ambienteFacturacion: index === 0 ? docs.map((doc) => doc.entorno_facturador || 'NO INFORMADO').join(', ') : '',
        empresaEmisora: index === 0 ? docs.map((doc) => doc.razon_social_emisor || '').filter(Boolean).join(', ') : '',
        rucEmisor: index === 0 ? docs.map((doc) => doc.ruc_emisor || '').filter(Boolean).join(', ') : '',
        cliente: fiscalClients.join(', ') || sale.nombre_cliente_snapshot || '', documento: fiscalDocuments.join(', ') || [sale.tipo_documento_cliente_snapshot, sale.documento_cliente_snapshot].filter(Boolean).join(' '),
        estadoTecnico: index === 0 ? docs.map((doc) => doc.estado || '').join(', ') || 'Sin comprobante' : '',
        estadoFiscal: index === 0 ? docs.map((doc) => estadoFiscalDocumento(doc, anulados.has(String(doc.id)))).join(', ') || 'Sin comprobante vinculado' : '',
        medioPago: index === 0 ? paymentMethods : '', cobrado: index === 0 ? money(orders.reduce((sum, order) => sum + (paidInPeriodByOrder.get(String(order.id)) || 0), 0)) : '',
        saldo: index === 0 ? money(orders.reduce((sum, order) => sum + (saldoByOrder.get(String(order.id)) || 0), 0)) : ''
      });
    });
  }

  const salesAmounts: Array<Record<string, any>> = allSales.map((sale) => ({
    ...sale,
    discounts: descuentosPorVenta.get(sale.key) || [],
    lines: lineGroups.get(sale.key) || []
  }));
  const confirmedSalesAmounts = salesAmounts.filter((sale) => !operacionBorrador(sale));
  const draftSalesAmounts = salesAmounts.filter((sale) => operacionBorrador(sale));
  const gross = money(confirmedSalesAmounts.reduce((sum, sale) => sum + (sale.lines.length ? sale.lines.reduce((lineSum: number, line: Record<string, any>) => lineSum + n(line.grossLine), 0) : n(sale.importe_total)) + sale.discounts.reduce((discountSum: number, discount: Record<string, any>) => discountSum + n(discount.importe_descuento), 0), 0));
  const discountTotal = money(confirmedSalesAmounts.reduce((sum, sale) => sum + sale.discounts.reduce((discountSum: number, discount: Record<string, any>) => discountSum + n(discount.importe_descuento), 0), 0));
  const draftTotal = money(draftSalesAmounts.reduce((sum, sale) => sum + n(sale.importe_total), 0));
  const net = money(confirmedSalesAmounts.reduce((sum, sale) => sum + (sale.lines.length ? sale.lines.reduce((lineSum: number, line: Record<string, any>) => lineSum + n(line.importe_total), 0) : n(sale.importe_total)), 0));
  const base = money(confirmedSalesAmounts.reduce((sum, sale) => sum + (sale.lines.length
    ? sale.lines.reduce((lineSum: number, line: Record<string, any>, index: number) => lineSum + n(line.base_imponible ?? (index === 0 ? sale.base_imponible : 0)), 0)
    : n(sale.base_imponible)), 0));
  const igv = money(confirmedSalesAmounts.reduce((sum, sale) => sum + (sale.lines.length
    ? sale.lines.reduce((lineSum: number, line: Record<string, any>, index: number) => lineSum + n(line.igv ?? (index === 0 ? sale.igv : 0)), 0)
    : n(sale.igv)), 0));
  const comprobantesEnPeriodoEmision = data.comprobantes.filter((doc) => doc.en_periodo_emision === true);
  const fiscalStatus = (doc: Record<string, any>) => {
    if (anulados.has(String(doc.id)) || (String(doc.estado || '').toUpperCase() === 'ANULADO' && sunatFlag(doc))) return 'ANULADO';
    if (String(doc.estado || '').toUpperCase() === 'ANULADO') return 'ANULADO_NO_CONFIRMADO';
    if (String(doc.estado || '').toUpperCase() === 'ACEPTADO' && ambienteDemo(doc)) return 'ACEPTADO_DEMO';
    if (aceptadoSunat(doc)) return 'ACEPTADO';
    const estado = String(doc.estado || '').toUpperCase();
    if (estado === 'ACEPTADO') return 'ACEPTADO_NO_CONFIRMADO';
    if (estado === 'RECHAZADO') return 'RECHAZADO';
    if (estado === 'ERROR') return 'ERROR';
    return 'PENDIENTE';
  };
  const acceptedDocs = comprobantesEnPeriodoEmision.filter((doc) => fiscalStatus(doc) === 'ACEPTADO');
  const creditNotes = data.ajustes.filter((row) => row.tipo === 'NOTA DE CRÉDITO' && aceptadoSunat(row));
  const debitNotes = data.ajustes.filter((row) => row.tipo === 'NOTA DE DÉBITO' && aceptadoSunat(row));
  const billed = money(acceptedDocs.reduce((sum, doc) => sum + n(doc.importe_total), 0) - creditNotes.reduce((sum, row) => sum + n(row.importe_total), 0) + debitNotes.reduce((sum, row) => sum + n(row.importe_total), 0));
  const collected = money(data.pagos.filter((row) => row.en_periodo !== false && pagoValido(row)).reduce((sum, row) => sum + n(row.importe), 0));
  const orderIsDraft = (order: Record<string, any>) => saleStateByKey.get(order.operacion_id ? `OP-${order.operacion_id}` : `VD-${order.venta_id}`) === 'BORRADOR';
  const outstanding = money(data.ordenes.filter((order) => order.en_periodo_orden !== false && !orderIsDraft(order)).reduce((sum, order) => sum + (saldoByOrder.get(String(order.id)) || 0), 0));
  const dashboardOperations = data.operaciones.filter((sale) => sale.comprobante_operable === true && !operacionBorrador(sale));
  const dashboardComparableSales = money(dashboardOperations.reduce((sum, sale) => sum + n(sale.importe_total), 0));
  const dashboardSaleIds = new Set(dashboardOperations.map((sale) => String(sale.id)));
  const dashboardLinesBySale = new Map<string, Record<string, any>[]>();
  data.lineas.filter((line) => dashboardSaleIds.has(String(line.operacion_id))).forEach((line) => dashboardLinesBySale.set(String(line.operacion_id), [...(dashboardLinesBySale.get(String(line.operacion_id)) || []), line]));
  const dashboardComparableBase = money(dashboardOperations.reduce((sum, sale) => {
    const saleLines = dashboardLinesBySale.get(String(sale.id));
    return sum + (saleLines?.length ? saleLines.reduce((lineSum, line) => lineSum + n(line.base_imponible), 0) : n(sale.base_imponible));
  }, 0));
  const dashboardComparableIgv = money(dashboardOperations.reduce((sum, sale) => {
    const saleLines = dashboardLinesBySale.get(String(sale.id));
    return sum + (saleLines?.length ? saleLines.reduce((lineSum, line) => lineSum + n(line.igv), 0) : n(sale.igv));
  }, 0));
  const dashboardComparableDiscounts = money(dashboardOperations.reduce((sum, sale) => sum + (descuentosPorVenta.get(`OP-${sale.id}`) || []).reduce((discountSum, discount) => discountSum + n(discount.importe_descuento), 0), 0));
  const dashboardCredits = creditNotes.filter((note) => note.operacion_id && dashboardSaleIds.has(String(note.operacion_id))).reduce((sum, note) => sum + n(note.importe_total), 0);
  const dashboardDebits = debitNotes.filter((note) => note.operacion_id && dashboardSaleIds.has(String(note.operacion_id))).reduce((sum, note) => sum + n(note.importe_total), 0);
  const dashboardComparableNet = money(dashboardComparableSales - dashboardCredits + dashboardDebits);
  const dashboardComparableCollections = money(data.pagos.filter((payment) => payment.en_periodo !== false && pagoValido(payment) && (payment.operacion_id || payment.certificado_id)).reduce((sum, payment) => sum + n(payment.importe), 0));
  const dashboardComparableOutstanding = money(data.ordenes.filter((order) => order.en_periodo_orden !== false && !orderIsDraft(order) && (order.operacion_id || order.certificado_id)).reduce((sum, order) => sum + (saldoByOrder.get(String(order.id)) || 0), 0));
  const categoryTotals = new Map<string, number>();
  const confirmedSaleKeys = new Set(confirmedSalesAmounts.map((sale) => sale.key));
  lines.filter((line) => confirmedSaleKeys.has(String(line.saleKey))).forEach((line) => categoryTotals.set(String(line.categoria || 'Sin categoría de catálogo'), money((categoryTotals.get(String(line.categoria || 'Sin categoría de catálogo')) || 0) + n(line.importe_total))));
  const authorizedSites = new Map((data.sedes || []).map((site) => [String(site.planta_key), String(site.planta_nombre || site.planta_key)]));
  const siteKeys = new Set([...authorizedSites.keys(), ...allSales.map((sale) => String(sale.planta_key || ''))].filter(Boolean));
  const siteTotals = [...siteKeys].map((siteKey) => {
    const sales = confirmedSalesAmounts.filter((sale) => String(sale.planta_key) === siteKey);
    const payments = data.pagos.filter((payment) => String(payment.planta_key || '') === siteKey && payment.en_periodo !== false && pagoValido(payment));
    const docs = comprobantesEnPeriodoEmision.filter((doc) => String(doc.planta_key || '') === siteKey);
    return { siteKey, name: authorizedSites.get(siteKey) || sales[0]?.planta_nombre || siteKey, sales, payments, docs };
  });
  const paymentRows = data.pagos.filter((payment) => payment.en_periodo !== false).map((payment) => ({
    id: payment.id, orden: payment.orden_pago_id, fecha: fecha(payment.fechacreacion), sede: payment.planta_nombre || payment.planta_key,
    medio: payment.tipocontado_key || '', banco: payment.entidad_financiera || '', tarjeta: payment.tipo_tarjeta || '',
    operacion: payment.nrooperacionbanco || payment.nrooperaciontarjeta || '', importe: money(payment.importe),
    estado: payment.estado, usuario: payment.usuariocreacion_username || ''
  }));
  const alerts: Array<Record<string, ExcelCellValue>> = [];
  data.descuentos.filter((discount) => String(discount.estado || '').toUpperCase() === 'APLICADO' && !(discount.tipo_descuento || discount.nombre_descuento || discount.codigo))
    .forEach((discount) => alerts.push({ tipo: 'Descuento: origen no identificado', registro: `Descuento ${discount.id}`, importe: money(discount.importe_descuento), detalle: 'No se encontró tipo, campaña o relación verificable al descuento comercial.' }));
  salesAmounts.forEach((sale) => sale.discounts.filter((discount: Record<string, any>) => {
    const saleLines = lineGroups.get(sale.key) || [];
    return saleLines.length > 0 && (!discount.certificado_id || !saleLines.some((line) => String(line.certificado_id || '') === String(discount.certificado_id)));
  }).forEach((discount: Record<string, any>) => alerts.push({ tipo: 'Descuento sin asignación a línea', registro: `Descuento ${discount.id} / ${sale.idOperacion}`, importe: money(discount.importe_descuento), detalle: 'El descuento está vinculado a la venta, pero no a un producto específico; no se distribuye entre líneas.' })));
  data.ordenes.forEach((order) => {
    const key = order.operacion_id ? `OP-${order.operacion_id}` : `VD-${order.venta_id}`;
    if (orderIsDraft(order)) return;
    const docList = docsBySale.get(key) || [];
    const paid = paidByOrder.get(String(order.id)) || 0;
    if (!docList.length) alerts.push({ tipo: 'Comprobante sin emisión', registro: `Orden ${order.id}`, importe: money(order.importe_total), detalle: `Operación vinculada: ${key}` });
    if (n(order.importe_total) > 0.01 && paid > 0 && paid < n(order.importe_total)) alerts.push({ tipo: 'Pago parcial', registro: `Orden ${order.id}`, importe: money(n(order.importe_total) - paid), detalle: `Pagado ${money(paid)} de ${money(order.importe_total)}` });
    if (paid > n(order.importe_total) + 0.01) alerts.push({ tipo: 'Diferencia de importes', registro: `Orden ${order.id}`, importe: money(paid - n(order.importe_total)), detalle: `Pagos asociados superan el total de la orden` });
    if (docList.length && Math.abs(docList.reduce((sum, doc) => sum + n(doc.importe_total), 0) - n(order.importe_total)) > 0.01) alerts.push({ tipo: 'Diferencia de importes', registro: `Orden ${order.id}`, importe: money(docList.reduce((sum, doc) => sum + n(doc.importe_total), 0) - n(order.importe_total)), detalle: `Comparación entre comprobantes vinculados y orden` });
  });
  data.comprobantes.forEach((doc) => {
    const key = doc.operacion_id ? `OP-${doc.operacion_id}` : `VD-${doc.venta_id}`;
    const linkedOrders = orderIdsBySale.get(key) || [];
    if (!linkedOrders.some((id) => (paidByOrder.get(id) || 0) > 0)) alerts.push({ tipo: 'Comprobante sin pago asociado', registro: `${doc.tipo_comprobante} ${nombreDocumento(doc)}`, importe: money(doc.importe_total), detalle: `Operación vinculada: ${key}` });
    if (String(doc.estado).toUpperCase() === 'ANULADO' || anulados.has(String(doc.id))) alerts.push({ tipo: 'Documento anulado o con solicitud de anulación', registro: `${doc.tipo_comprobante} ${nombreDocumento(doc)}`, importe: money(doc.importe_total), detalle: `Estado del documento: ${doc.estado}; anulación SUNAT confirmada: ${anulados.has(String(doc.id))}` });
    if (!doc.fecha_documento) alerts.push({ tipo: 'Comprobante sin fecha de emisión', registro: `${doc.tipo_comprobante} ${nombreDocumento(doc)}`, importe: money(doc.importe_total), detalle: 'Se conserva el documento, pero no se asigna al período fiscal por fecha de creación.' });
  });
  data.pagos.filter(pagoValido).forEach((payment) => {
    const order = ordersById.get(String(payment.orden_pago_id));
    if (order && orderIsDraft(order)) return;
    const key = order?.operacion_id ? `OP-${order.operacion_id}` : `VD-${order?.venta_id}`;
    if (order && !(docsBySale.get(key) || []).length) alerts.push({ tipo: 'Pago sin comprobante', registro: `Pago ${payment.id} / Orden ${order.id}`, importe: money(payment.importe), detalle: 'Vínculo por orden de pago' });
  });
  data.ajustes.forEach((item) => alerts.push({ tipo: item.tipo, registro: `${item.serie || ''}-${item.numero || item.id}`, importe: money(item.importe_total), detalle: item.estado }));
  data.descuentos.filter((discount) => !discount.orden_pago_id && !discount.facturacion_id && !operationByCertificate.has(String(discount.certificado_id))).forEach((discount) => alerts.push({ tipo: 'Descuento sin asociación comercial', registro: `Descuento ${discount.id}`, importe: money(discount.importe_descuento), detalle: `Certificado relacionado: ${discount.certificado_id || 'no informado'}` }));
  const statusLabels: Array<[string, string]> = [['ACEPTADO', 'Aceptados SUNAT'], ['ACEPTADO_DEMO', 'Con estado ACEPTADO en DEMO (sin aceptación de producción)'], ['ACEPTADO_NO_CONFIRMADO', 'Con estado local ACEPTADO sin confirmación SUNAT'], ['PENDIENTE', 'Pendientes de confirmación fiscal'], ['RECHAZADO', 'Rechazados'], ['ERROR', 'Con error técnico'], ['ANULADO', 'Anulados con confirmación SUNAT'], ['ANULADO_NO_CONFIRMADO', 'Con estado anulado sin confirmación SUNAT']];
  const fiscalSummaryRows = statusLabels.flatMap(([status, label]) => {
    const docs = comprobantesEnPeriodoEmision.filter((doc) => fiscalStatus(doc) === status);
    return [
      { indicador: `Comprobantes ${label}`, valor: docs.length, unidad: 'documentos' },
      { indicador: `Importe comprobantes ${label}`, valor: money(docs.reduce((sum, doc) => sum + n(doc.importe_total), 0)), unidad: 'S/' }
    ];
  });
  const demoDocs = comprobantesEnPeriodoEmision.filter(ambienteDemo);
  const siteSummaryRows = siteTotals.flatMap((site) => [
    { indicador: `Sede ${site.name} — ventas comerciales no borrador`, valor: site.sales.length, unidad: 'operaciones' },
    { indicador: `Sede ${site.name} — importe comercial`, valor: money(site.sales.reduce((sum, sale) => sum + n(sale.importe_total), 0)), unidad: 'S/' },
    { indicador: `Sede ${site.name} — comprobantes por fecha de emisión`, valor: site.docs.length, unidad: 'documentos' },
    { indicador: `Sede ${site.name} — cobros CAN en período`, valor: money(site.payments.reduce((sum, payment) => sum + n(payment.importe), 0)), unidad: 'S/' }
  ]);
  const issuerKey = (row: Record<string, any>) => `${row.ruc_emisor || 'SIN RUC'} — ${row.razon_social_emisor || 'SIN RAZÓN SOCIAL'}`;
  const issuerKeys = [...new Set([...comprobantesEnPeriodoEmision, ...creditNotes, ...debitNotes].map(issuerKey))];
  const issuerSummaryRows = issuerKeys.flatMap((issuer) => {
    const docs = comprobantesEnPeriodoEmision.filter((doc) => issuerKey(doc) === issuer);
    const credits = creditNotes.filter((row) => issuerKey(row) === issuer).reduce((sum, row) => sum + n(row.importe_total), 0);
    const debits = debitNotes.filter((row) => issuerKey(row) === issuer).reduce((sum, row) => sum + n(row.importe_total), 0);
    const accepted = docs.filter((doc) => fiscalStatus(doc) === 'ACEPTADO');
    return [
      { indicador: `Emisor ${issuer} — documentos aceptados SUNAT`, valor: accepted.length, unidad: 'documentos' },
      { indicador: `Emisor ${issuer} — total fiscal neto`, valor: money(accepted.reduce((sum, doc) => sum + n(doc.importe_total), 0) - credits + debits), unidad: 'S/' }
    ];
  });

  return [
    { name: 'Resumen Financiero', columns: cols(['indicador', 'Indicador', 32], ['valor', 'Valor', 24], ['unidad', 'Unidad', 14]), rows: [
      { indicador: 'Empresa emisora', valor: 'Identificada en cada comprobante; ver desglose por emisor.', unidad: '' },
      { indicador: 'RUC emisor', valor: 'Identificado en cada comprobante; ver desglose por emisor.', unidad: '' },
      { indicador: 'Período', valor: `${data.metadatos.desde} a ${data.metadatos.hasta}`, unidad: '' },
      { indicador: 'Criterio del período', valor: 'Venta por fecha de operación (borradores separados); fiscal por fecha de emisión (fecha_documento), no fecha de creación; cobros por fecha del pago; descuentos por aplicación; notas por registro.', unidad: '' },
      { indicador: 'Sede / alcance', valor: data.metadatos.plantas.join(', '), unidad: '' },
      { indicador: 'Fecha de generación', valor: fecha(data.metadatos.fechaGeneracion), unidad: '' },
      { indicador: 'Venta bruta confirmada (sin borradores)', valor: gross, unidad: 'S/' }, { indicador: 'Descuentos comerciales trazables de ventas confirmadas', valor: discountTotal, unidad: 'S/' },
      { indicador: 'Operaciones BORRADOR excluidas de ventas confirmadas', valor: draftSalesAmounts.length, unidad: 'operaciones' },
      { indicador: 'Importe comercial de operaciones BORRADOR (referencial)', valor: draftTotal, unidad: 'S/' },
      { indicador: 'Descuentos aplicados en operaciones emitidas (Dashboard comparable)', valor: dashboardComparableDiscounts, unidad: 'S/' },
      { indicador: 'Venta comercial neta (antes de notas fiscales)', valor: net, unidad: 'S/' }, { indicador: 'Base imponible', valor: base, unidad: 'S/' },
      { indicador: 'IGV', valor: igv, unidad: 'S/' }, { indicador: 'Total aceptado SUNAT neto de NC/ND aceptadas', valor: billed, unidad: 'S/' },
      { indicador: 'Comprobantes con fecha de emisión en período', valor: comprobantesEnPeriodoEmision.length, unidad: 'documentos' },
      { indicador: 'Importe de comprobantes con fecha de emisión en período (todos los estados)', valor: money(comprobantesEnPeriodoEmision.reduce((sum, doc) => sum + n(doc.importe_total), 0)), unidad: 'S/' },
      ...fiscalSummaryRows,
      { indicador: 'Comprobantes DEMO (incluidos en estado correspondiente; no prueban aceptación SUNAT)', valor: demoDocs.length, unidad: 'documentos' },
      { indicador: 'Importe comprobantes DEMO (no se suman a aceptación SUNAT)', valor: money(demoDocs.reduce((sum, doc) => sum + n(doc.importe_total), 0)), unidad: 'S/' },
      { indicador: 'Comprobantes vinculados sin fecha de emisión', valor: data.comprobantes.filter((doc) => !doc.fecha_documento).length, unidad: 'documentos' },
      { indicador: 'Total cobrado (pagos CAN por fecha de pago)', valor: collected, unidad: 'S/' }, { indicador: 'Saldo pendiente según saldo almacenado en orden', valor: outstanding, unidad: 'S/' },
      { indicador: 'Operaciones con comprobante operable (métrica Dashboard; puede incluir DEMO)', valor: dashboardComparableSales, unidad: 'S/' },
      { indicador: 'Operaciones con comprobante operable netas de NC/ND aceptadas (métrica Dashboard)', valor: dashboardComparableNet, unidad: 'S/' },
      { indicador: 'Base imponible de operaciones emitidas (Dashboard comparable)', valor: dashboardComparableBase, unidad: 'S/' },
      { indicador: 'IGV de operaciones emitidas (Dashboard comparable)', valor: dashboardComparableIgv, unidad: 'S/' },
      { indicador: 'Cobranza de operaciones / certificados (comparable con Dashboard)', valor: dashboardComparableCollections, unidad: 'S/' },
      { indicador: 'Saldo de operaciones / certificados (comparable con Dashboard)', valor: dashboardComparableOutstanding, unidad: 'S/' },
      { indicador: 'Facturas', valor: comprobantesEnPeriodoEmision.filter((doc) => doc.tipo_comprobante === 'FACTURA').length, unidad: 'documentos' },
      { indicador: 'Boletas', valor: comprobantesEnPeriodoEmision.filter((doc) => doc.tipo_comprobante === 'BOLETA').length, unidad: 'documentos' },
      { indicador: 'Notas de crédito', valor: data.ajustes.filter((row) => row.tipo === 'NOTA DE CRÉDITO').length, unidad: 'documentos' },
      { indicador: 'Notas de débito', valor: data.ajustes.filter((row) => row.tipo === 'NOTA DE DÉBITO').length, unidad: 'documentos' },
      ...siteSummaryRows,
      ...issuerSummaryRows,
      ...[...categoryTotals].map(([category, amount]) => ({ indicador: `Venta categoría: ${category}`, valor: amount, unidad: 'S/' }))
    ] },
    { name: 'Ventas y Comprobantes', columns: cols(
      ['idOperacion', 'ID de operación', 16, 'text'], ['idOrden', 'ID de orden de pago', 18, 'text'], ['fechaVenta', 'Fecha comercial', 22], ['estadoComercial', 'Estado comercial', 18], ['sede', 'Sede', 24],
      ['tipoProducto', 'Tipo de producto', 24], ['producto', 'Producto o servicio', 35], ['codigoProducto', 'Código del producto', 20, 'text'],
      ['cantidad', 'Cantidad', 12], ['precioUnitario', 'Precio unitario (S/)', 18, 'decimal2'], ['importeAntes', 'Importe antes del descuento (S/)', 22, 'decimal2'],
      ['tipoDescuento', 'Tipo de descuento', 18], ['codigoDescuento', 'Código de campaña o descuento', 26], ['descuento', 'Descuento (S/)', 16, 'decimal2'],
      ['descuentoPct', 'Descuento %', 14, 'decimal2'], ['importeDespues', 'Importe después del descuento (S/)', 24, 'decimal2'],
      ['base', 'Base imponible (S/)', 18, 'decimal2'], ['igv', 'IGV (S/)', 14, 'decimal2'], ['total', 'Total (S/)', 16, 'decimal2'],
      ['tipoComprobante', 'Tipo de comprobante', 22], ['serieNumero', 'Serie y número', 25], ['fechaEmision', 'Fecha de emisión', 22], ['ambienteFacturacion', 'Ambiente de facturación', 22], ['empresaEmisora', 'Empresa emisora', 32], ['rucEmisor', 'RUC emisor', 14, 'text'],
      ['cliente', 'Cliente', 32], ['documento', 'Documento cliente', 22, 'text'], ['estadoTecnico', 'Estado técnico', 20], ['estadoFiscal', 'Estado fiscal', 32], ['medioPago', 'Medio de pago consolidado en período', 30],
      ['cobrado', 'Cobrado en período (S/)', 18, 'decimal2'], ['saldo', 'Saldo según orden (S/)', 18, 'decimal2']
    ), rows: salesRows },
    { name: 'Detalle de Pagos', columns: cols(['id', 'ID de pago', 14], ['orden', 'Orden asociada', 16], ['fecha', 'Fecha de cobro', 22], ['sede', 'Sede', 24], ['medio', 'Medio de pago', 20], ['banco', 'Banco', 20], ['tarjeta', 'Tipo de tarjeta', 20], ['operacion', 'Número de operación', 24, 'text'], ['importe', 'Importe (S/)', 16, 'decimal2'], ['estado', 'Estado', 16], ['usuario', 'Usuario', 20]), rows: paymentRows },
    { name: 'Conciliación y Alertas', columns: cols(['tipo', 'Alerta', 32], ['registro', 'Registro asociado', 28], ['importe', 'Importe (S/)', 18, 'decimal2'], ['detalle', 'Detalle', 50]), rows: alerts }
  ];
}

export function exportarReporteFinanciero(data: ReporteFinancieroResponse) {
  if (!data?.operaciones || !data?.comprobantes) throw new Error('El servidor no devolvió datos financieros.');
  const range = `${data.metadatos.desde}_${data.metadatos.hasta}`;
  exportarExcelVariasHojas(`faregas_reporte_financiero_${range}`, construirHojasReporteFinanciero(data));
}
