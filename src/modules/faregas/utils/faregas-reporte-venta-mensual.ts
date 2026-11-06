import type { FiltrosDashboard, ReporteFinancieroResponse } from '../services/faregas-dashboard.api';
import type { DashboardExportacionResponse } from '../services/faregas-dashboard.api';
import { exportarExcelVariasHojas, type ExcelColumn, type ExcelSheetDefinition } from './exportar-excel';

type Row = Record<string, any>;
const n = (value: unknown) => Number(value || 0);
const money = (value: unknown) => Number(n(value).toFixed(2));
const dateCell = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const limaDate = date.toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
  return new Date(`${limaDate}T00:00:00Z`).getTime() / 86400000 + 25569;
};
const cols = (...items: Array<[string, string, number?, ExcelColumn['format']?]>): ExcelColumn[] =>
  items.map(([key, header, width, format]) => ({ key, header, width, format }));
const saleKey = (row: Row) => row.operacion_id ? `OP-${row.operacion_id}` : row.venta_id ? `VD-${row.venta_id}` : '';
const isPaid = (payment: Row) => String(payment.estado || '').toUpperCase() === 'CAN';
const hasFiscalReceipt = (doc: Row) => {
  const state = String(doc.estado || '').toUpperCase();
  const accepted = doc.aceptada_sunat === true || doc.aceptada_sunat === 't';
  if (state === 'ACEPTADO' && accepted) return true;
  return String(doc.entorno_facturador || '').toUpperCase() === 'DEMO'
    && String(doc.proveedor || '').toUpperCase() === 'NUBEFACT'
    && state === 'PENDIENTE_SUNAT'
    && Boolean(doc.nro_comprobante && doc.serie && doc.numero)
    && Boolean(doc.enlace_pdf || doc.enlace_xml);
};

export function construirHojaReporteVentaMensual(data: ReporteFinancieroResponse, periodo: string, dashboard?: DashboardExportacionResponse): ExcelSheetDefinition {
  const certificatesById = new Map((dashboard?.hojas.certificados || []).map((certificate) => [String(certificate.id), certificate]));
  const sales: Row[] = [
    ...data.operaciones.map((row) => ({ ...row, key: `OP-${row.id}`, direct: false })),
    ...[...new Map(data.ventasDirectas.map((row) => [String(row.id), row])).values()].map((row) => ({ ...row, key: `VD-${row.id}`, direct: true,
      fecha_creacion: row.fecha_creacion, planta_key: row.planta_key, planta_nombre: row.planta_nombre,
      nombre_cliente_snapshot: row.cliente_nombre, tipo_documento_cliente_snapshot: row.cliente_tipo_documento,
      documento_cliente_snapshot: row.cliente_nro_documento, usuario_creacion: row.usuario_creacion }))
  ];
  const linesBySale = new Map<string, Row[]>();
  data.lineas.forEach((line) => linesBySale.set(`OP-${line.operacion_id}`, [...(linesBySale.get(`OP-${line.operacion_id}`) || []), line]));
  data.ventasDirectas.filter((line) => line.detalle_id).forEach((line) => linesBySale.set(`VD-${line.id}`,
    [...(linesBySale.get(`VD-${line.id}`) || []), { ...line, tipo_item: 'PRODUCTO', cantidad: line.cantidad,
      importe_total: line.importe_detalle, precio_unitario: line.precio_unitario, descripcion_snapshot: line.producto,
      codigo_sku_snapshot: line.codigo_producto, categoria: line.categoria }]));

  const docsBySale = new Map<string, Row[]>();
  data.comprobantes.forEach((doc) => { const key = saleKey(doc); if (key) docsBySale.set(key, [...(docsBySale.get(key) || []), doc]); });
  const ordersBySale = new Map<string, Row[]>();
  data.ordenes.forEach((order) => { const key = saleKey(order); if (key) ordersBySale.set(key, [...(ordersBySale.get(key) || []), order]); });
  const paymentsByOrder = new Map<string, Row[]>();
  data.pagos.forEach((payment) => paymentsByOrder.set(String(payment.orden_pago_id), [...(paymentsByOrder.get(String(payment.orden_pago_id)) || []), payment]));
  const saleByOrder = new Map(data.ordenes.map((order) => [String(order.id), saleKey(order)]));
  const saleByDocument = new Map(data.comprobantes.map((doc) => [String(doc.id), saleKey(doc)]));
  const saleByCertificate = new Map(data.lineas.filter((line) => line.certificado_id).map((line) => [String(line.certificado_id), `OP-${line.operacion_id}`]));
  const discountsBySale = new Map<string, Row[]>();
  data.descuentos.filter((discount) => String(discount.estado || '').toUpperCase() === 'APLICADO').forEach((discount) => {
    const sale = (discount.orden_pago_id && saleByOrder.get(String(discount.orden_pago_id)))
      || (discount.facturacion_id && saleByDocument.get(String(discount.facturacion_id)))
      || (discount.certificado_id && saleByCertificate.get(String(discount.certificado_id)));
    if (sale) discountsBySale.set(sale, [...(discountsBySale.get(sale) || []), discount]);
  });

  const rows: Row[] = [];
  let totalVentas = 0;
  for (const sale of sales) {
    const key = sale.key;
    const lines = linesBySale.get(key) || [null];
    const docs = docsBySale.get(key) || [];
    const orders = ordersBySale.get(key) || [];
    const discounts = discountsBySale.get(key) || [];
    const payments = orders.flatMap((order) => paymentsByOrder.get(String(order.id)) || []).filter(isPaid);
    const paymentMethods = payments.map((payment) =>
      `${payment.tipocontado_key || 'Medio no informado'}: S/ ${money(payment.importe).toFixed(2)}`
    ).join('; ');
    const state = String(sale.estado || '');
    const saleConfirmed = sale.comprobante_operable === true || docs.some(hasFiscalReceipt);
    const saleTotal = n(sale.importe_total);
    if (saleConfirmed) totalVentas += lines.reduce((sum, line) => sum + (line ? n(line.importe_total) : saleTotal), 0);
    lines.forEach((line, index) => {
      const itemName = line ? (line.producto || line.descripcion_snapshot || line.codigo_sku_snapshot || '') : '';
      const service = line?.tipo_item === 'SERVICIO' ? itemName : line?.categoria || line?.tipo_item || itemName;
      const certificate = line?.certificado_id ? certificatesById.get(String(line.certificado_id)) : undefined;
      const discountNote = discounts.length
        ? `Descuento aplicado: S/ ${money(discounts.reduce((sum, discount) => sum + n(discount.importe_descuento), 0)).toFixed(2)}`
        : '';
      const client = docs.map((doc) => doc.nombre_razon_social).find(Boolean) || sale.nombre_cliente_snapshot || '';
      const identity = docs.map((doc) => [doc.tipo_documento_cliente, doc.nro_documento].filter(Boolean).join(' ')).find(Boolean)
        || [sale.tipo_documento_cliente_snapshot, sale.documento_cliente_snapshot].filter(Boolean).join(' ');
      rows.push({
        sede: sale.planta_nombre || sale.planta_key || '', fecha: dateCell(docs[0]?.fecha_documento || sale.fecha_creacion), placa: certificate?.placa || '', servicio: service,
        certificado: certificate?.tipoCertificado || (line?.certificado_id ? `ID ${line.certificado_id}` : ''),
        certificadoFinalF: certificate?.numeroCertificado || '', certificadoFinalG: '',
        cantidad: line?.cantidad ?? 1, estado: state, observacion: [sale.direct ? 'Venta directa de producto' : '', index === 0 ? discountNote : ''].filter(Boolean).join('; '),
        documento: index === 0 ? docs.map((doc) => doc.tipo_comprobante).filter(Boolean).join(', ') : '',
        comprobante: index === 0 ? docs.map((doc) => doc.nro_comprobante || [doc.serie, doc.numero].filter(Boolean).join('-')).filter(Boolean).join(', ') : '',
        total: line ? money(line.importe_total) : saleTotal, formaPago: index === 0 ? paymentMethods : '', cliente: client, documentoCliente: identity,
        telefono: '', usuario: sale.usuario_creacion || ''
      });
    });
  }

  rows.push({ sede: 'TOTAL CON COMPROBANTE OPERABLE', total: money(totalVentas) });
  return {
    name: 'REPORTE DE VENTA', title: `REPORTE DE VENTA MENSUAL — ${periodo}`, totalsRow: true,
    headerRow: 8, numberColumnsRow: false,
    metadata: [['Período consultado', periodo], ['Origen', 'Operaciones comerciales y ventas directas relacionadas a líneas, comprobantes, órdenes y pagos de FAREGAS'],
      ['Certificado final (F/G)', 'Se usa el número real del certificado relacionado en F cuando está disponible. El modelo consultado repite el encabezado; no se halló una segunda numeración en el Dashboard ni en la fuente financiera, por eso G queda vacío.'],
      ['Datos no disponibles en esta fuente', 'Placa se completa cuando el Dashboard devuelve el certificado en el período. Teléfono no está expuesto por los endpoints utilizados; queda en blanco.'],
      ['Fecha Emisión', 'Se muestra fecha del comprobante si existe; en su ausencia, fecha de creación de la operación.'],
      ['Total', 'Solo incluye ventas con comprobante fiscal operable según la definición del Dashboard: aceptación SUNAT en producción o generación completa en DEMO. El importe se muestra por línea real y no se repite por cada pago o comprobante.']],
    columns: cols(['sede', 'Sede', 18], ['fecha', 'Fecha Emisión', 20, 'date'], ['placa', 'PLACA', 14, 'text'], ['servicio', 'SERVICIO', 30],
      ['certificado', 'Certificado', 20, 'text'], ['certificadoFinalF', 'N° de Certificado Final', 24, 'text'],
      ['certificadoFinalG', 'N° de Certificado Final', 24, 'text'], ['cantidad', 'Q Certificados', 14], ['estado', 'Estado', 18],
      ['observacion', 'Observación', 28], ['documento', 'Documento Emitido BOL/FACT', 22], ['comprobante', 'Número de Comprobante', 22, 'text'],
      ['total', 'Total', 16, 'currency'], ['formaPago', 'Forma de Pago', 32], ['cliente', 'Nombre de Cliente / Razón Social', 34],
      ['documentoCliente', 'RUC / DNI', 20, 'text'], ['telefono', 'Teléfono', 16, 'text'], ['usuario', 'Usuario Registra', 20, 'text']),
    rows
  };
}

function hojaMetasProyecciones(dashboard: DashboardExportacionResponse, filtros: FiltrosDashboard): ExcelSheetDefinition {
  const year = Number((filtros.desde || '').slice(0, 4));
  const month = Number((filtros.desde || '').slice(5, 7));
  const monthEnd = new Date(Date.UTC(year, month, 0));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const currentMonth = today.slice(0, 7) === `${year}-${String(month).padStart(2, '0')}`;
  const cutoff = currentMonth ? today : (filtros.hasta || monthEnd.toISOString().slice(0, 10));
  const businessDays = (end: string) => {
    const endDate = new Date(`${end}T12:00:00Z`);
    let count = 0;
    for (let day = 1; day <= endDate.getUTCDate(); day += 1) {
      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      if (weekday !== 0 && weekday !== 6) count += 1;
    }
    return count;
  };
  const elapsed = businessDays(cutoff);
  const totalDays = businessDays(`${year}-${String(month).padStart(2, '0')}-${String(monthEnd.getUTCDate()).padStart(2, '0')}`);
  const rows = dashboard.hojas.sedes.map((s) => {
    const sales = n(s.ventaOperativa);
    const projection = elapsed > 0 ? money(sales / elapsed * totalDays) : null;
    return { sede: s.plantaNombre, ventas: money(sales), meta: 'Sin meta configurada', cumplimiento: 'Sin meta configurada',
      diasTranscurridos: elapsed, diasMes: totalDays, proyeccion: projection, cumplimientoProyectado: 'Sin meta configurada' };
  });
  rows.push({ sede: 'TOTAL GENERAL', ventas: money(rows.reduce((sum, row) => sum + Number(row.ventas || 0), 0)), meta: 'Sin meta configurada',
    cumplimiento: 'Sin meta configurada', diasTranscurridos: elapsed, diasMes: totalDays,
    proyeccion: money(rows.reduce((sum, row) => sum + Number(row.proyeccion || 0), 0)), cumplimientoProyectado: 'Sin meta configurada' });
  return { name: 'METAS Y PROYECCIONES', title: `METAS Y PROYECCIONES — ${year}-${String(month).padStart(2, '0')}`, totalsRow: true,
    metadata: [['Fecha de corte', cutoff], ['Criterio de días comerciales', 'Lunes a viernes, sin calendario laboral configurado; criterio aproximado, no representa una política de ventas confirmada.'],
      ['Meta mensual', 'No se encontró configuración de metas comerciales por sede/período; se deja sin meta.'],
      ['Proyección', 'Ventas acumuladas / días comerciales transcurridos × días comerciales del mes.']],
    columns: cols(['sede', 'SEDE', 28], ['ventas', 'Ventas acumuladas (S/)', 22, 'currency'], ['meta', 'Meta mensual', 22], ['cumplimiento', 'Cumplimiento', 20],
      ['diasTranscurridos', 'Días comerciales transcurridos', 28], ['diasMes', 'Días comerciales del mes', 24],
      ['proyeccion', 'Proyección cierre (S/)', 22, 'currency'], ['cumplimientoProyectado', 'Cumplimiento proyectado', 25]), rows };
}

export function construirHojasReporteVentaMensual(data: ReporteFinancieroResponse, filtros: FiltrosDashboard, dashboard: DashboardExportacionResponse): ExcelSheetDefinition[] {
  const periodo = `${filtros.desde || ''} a ${filtros.hasta || ''}`;
  return [
    construirHojaReporteVentaMensual(data, periodo, dashboard), hojaMetasProyecciones(dashboard, filtros)
  ];
}

export function exportarReporteVentaMensual(data: ReporteFinancieroResponse, filtros: FiltrosDashboard, dashboard: DashboardExportacionResponse) {
  exportarExcelVariasHojas(`faregas_venta_mensual_${filtros.alcance || 'SEDE'}_${filtros.desde || ''}`,
    construirHojasReporteVentaMensual(data, filtros, dashboard));
}
