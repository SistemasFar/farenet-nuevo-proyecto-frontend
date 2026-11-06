import type { DashboardExportacionResponse, FiltrosDashboard } from '../services/faregas-dashboard.api';
import { exportarExcelVariasHojas, type ExcelColumn, type ExcelSheetDefinition } from './exportar-excel';

const n = (value: unknown) => Number(value || 0);
const money = (value: unknown) => Number(n(value).toFixed(2));
const dateText = (value: unknown) => value ? new Date(String(value)).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : '';
const cols = (...items: Array<[string, string, number?, ExcelColumn['format']?]>): ExcelColumn[] =>
  items.map(([key, header, width, format]) => ({ key, header, width, format }));

export function construirHojasResumenDashboard(data: DashboardExportacionResponse): ExcelSheetDefinition[] {
  const { metadatos, hojas: h } = data;
  const kpis = h.resumen.kpis;
  const labels: Record<string, string> = {
    ventaOperativaGenerada: 'Venta operativa', ventaPagada: 'Venta pagada', ventaBruta: 'Venta bruta', ventaNeta: 'Venta neta',
    totalCobrado: 'Total cobrado', saldoPendiente: 'Saldo pendiente', cantidadOperaciones: 'Operaciones', ticketPromedio: 'Ticket promedio',
    ventaOperativaCertificados: 'Venta operativa de certificados', ventaBrutaCertificados: 'Venta bruta de certificados',
    ventaNetaCertificados: 'Venta neta de certificados', ticketPromedioCertificados: 'Ticket promedio de certificados',
    certificadosEmitidos: 'Certificados emitidos', certificadosPendientes: 'Certificados borrador', certificadosAnulados: 'Certificados anulados',
    duplicadosEmitidos: 'Certificados duplicados emitidos', ventaDuplicados: 'Venta de duplicados', totalCobradoDuplicados: 'Cobrado por duplicados',
    saldoPendienteDuplicados: 'Saldo de duplicados', ticketPromedioDuplicados: 'Ticket promedio de duplicados', productosVendidos: 'Productos vendidos',
    montoDescontado: 'Monto descontado', facturasAceptadas: 'Facturas emitidas', boletasAceptadas: 'Boletas emitidas',
    comprobantesRechazadosOError: 'Comprobantes rechazados o con error'
  };
  const kpiRows = Object.entries(kpis).map(([key, value]) => ({ indicador: labels[key] || key, valor: value.actual, anterior: value.anterior, variacion: value.porcentaje, definicion: value.tooltip }));
  return [
    { name: 'Resumen General', title: 'Dashboard Operativo y Financiero — Resumen General', metadata: [['Período', metadatos.rango], ['Sedes incluidas', metadatos.sedesIncluidas], ['Generado', dateText(metadatos.fechaGeneracion)]], columns: cols(['indicador', 'Indicador', 32], ['valor', 'Período seleccionado', 20], ['anterior', 'Período anterior', 20], ['variacion', 'Variación %', 14], ['definicion', 'Definición del Dashboard', 80]), rows: kpiRows },
    { name: 'Evolución de Ventas', columns: cols(['tipo', 'Serie', 18], ['fecha', 'Fecha', 16, 'text'], ['total', 'Total', 14], ['emitidos', 'Emitidos', 14], ['borradores', 'Borradores', 14], ['anulados', 'Anulados', 14], ['venta', 'Venta diaria (S/)', 20, 'currency'], ['operaciones', 'Operaciones', 16]), rows: [
      ...h.resumen.serieDiaria.map((row) => ({ tipo: 'Ventas', fecha: row.fecha, venta: money(row.venta), operaciones: row.operaciones })),
      ...h.resumen.serieCertificados.map((row) => ({ tipo: 'Certificados', fecha: row.fecha, total: row.total, emitidos: row.emitidos, borradores: row.borradores, anulados: row.anulados })),
      ...(h.resumen.serieDuplicados || []).map((row) => ({ tipo: 'Duplicados', fecha: row.fecha, emitidos: row.emitidos }))
    ] },
    { name: 'Ventas por Producto', columns: cols(['sku', 'SKU', 18, 'text'], ['descripcion', 'Producto', 40], ['categoria', 'Categoría', 22], ['unidad', 'Unidad', 14], ['cantidad', 'Cantidad', 14], ['importe', 'Importe (S/)', 18, 'currency'], ['operaciones', 'Operaciones', 14], ['promedio', 'Precio promedio (S/)', 22, 'currency']), rows: h.ventasProductos.map((p) => ({ sku: p.sku, descripcion: p.descripcion, categoria: p.categoria || '', unidad: p.unidad, cantidad: p.unidadesVendidas, importe: money(p.totalSoles), operaciones: p.operaciones, promedio: money(p.precioPromedio) })) },
    { name: 'Tipos de Certificado', columns: cols(['tipo', 'Tipo', 24], ['cantidad', 'Cantidad', 14], ['emitidos', 'Emitidos', 14], ['pendientes', 'Borradores', 14], ['anulados', 'Anulados', 14], ['porcentaje', 'Porcentaje', 16], ['importe', 'Venta atribuida (S/)', 22, 'currency']), rows: h.resumen.distribucionCertificados.map((item) => ({ tipo: item.tipo, cantidad: item.cantidad, emitidos: item.emitidos, pendientes: item.pendientes, anulados: item.anulados, porcentaje: item.porcentaje, importe: money(item.totalSoles) })) },
    { name: 'Certificados y Duplicados', columns: cols(['grupo', 'Grupo', 20], ['id', 'ID', 12, 'text'], ['numero', 'Número', 22, 'text'], ['tipo', 'Tipo', 22], ['estado', 'Estado', 20], ['sede', 'Sede', 24], ['placa', 'Placa', 14, 'text'], ['importe', 'Importe (S/)', 18, 'currency'], ['fecha', 'Fecha', 22], ['usuario', 'Usuario / solicitante', 26]), rows: [
      ...h.certificados.map((c) => ({ grupo: 'Certificado', id: c.id, numero: c.numeroCertificado || '', tipo: c.tipoCertificado, estado: c.estado, sede: c.plantaNombre, placa: c.placa || '', importe: money(c.importeTotal), fecha: dateText(c.fechaEmision || c.fechaCreacion), usuario: c.usuarioCreacion })),
      ...(h.duplicados || []).map((d) => ({ grupo: 'Duplicado', id: d.id, numero: d.numeroDuplicado, tipo: d.tipoCertificado || d.tipoNombre, estado: d.estado, sede: d.plantaNombre, placa: d.placa || '', importe: money(d.importe), fecha: dateText(d.fechaEmisionDuplicado), usuario: d.solicitadoPor }))
    ] },
    { name: 'Medios de Pago', columns: cols(['medio', 'Medio', 28], ['cantidad', 'Pagos', 14], ['total', 'Total (S/)', 20, 'currency'], ['porcentaje', 'Porcentaje', 16]), rows: h.resumen.distribucionPagos.map((row) => ({ medio: row.medio, cantidad: row.cantidad, total: money(row.total), porcentaje: row.porcentaje })) },
    { name: 'Cobranza y Facturación', columns: cols(['grupo', 'Grupo', 24], ['indicador', 'Indicador', 34], ['valor', 'Valor (S/)', 22, 'currency'], ['estado', 'Estado', 22]), rows: [
      ...['totalCobrado', 'saldoPendiente', 'montoDescontado'].map((key) => ({ grupo: 'KPI', indicador: key, valor: money(kpis[key as keyof typeof kpis]?.actual), estado: 'Según definición del Dashboard' })),
      ...h.comprobantes.map((c) => ({ grupo: 'Comprobante', indicador: c.nroComprobante || `${c.serie || ''}-${c.numero || ''}`, valor: money(c.importeTotal), estado: `${c.tipoComprobante} — ${c.estado} — ${c.plantaNombre}` })),
      ...h.pagos.map((p) => ({ grupo: 'Pago', indicador: `Orden ${p.ordenPagoId} — ${p.medioPago}`, valor: money(p.importe), estado: `${p.estado} — ${p.plantaNombre} — ${dateText(p.fechaCreacion)}` })),
      ...h.descuentos.map((d) => ({ grupo: 'Descuento', indicador: `${d.campana} — ${d.cupon || ''}`, valor: money(d.importeDescuento), estado: `${d.estado} — ${d.plantaNombre} — ${dateText(d.fechaAplicacion)}` }))
    ] },
    { name: 'Ranking de Sedes', columns: cols(['sede', 'Sede', 28], ['operaciones', 'Operaciones', 14], ['venta', 'Venta operativa (S/)', 22, 'currency'], ['ticket', 'Ticket promedio (S/)', 22, 'currency'], ['emitidos', 'Certificados emitidos', 22], ['pendientes', 'Certificados pendientes', 24], ['duplicados', 'Duplicados emitidos', 20], ['ventaDup', 'Venta duplicados (S/)', 22, 'currency'], ['cobrado', 'Total cobrado (S/)', 20, 'currency'], ['saldo', 'Saldo pendiente (S/)', 22, 'currency']), rows: [...h.sedes].sort((a, b) => b.ventaOperativa - a.ventaOperativa).map((s) => ({ sede: s.plantaNombre, operaciones: s.cantidadOperaciones, venta: money(s.ventaOperativa), ticket: money(s.ticketPromedio), emitidos: s.certificadosEmitidos, pendientes: s.certificadosPendientes, duplicados: s.duplicadosEmitidos || 0, ventaDup: money(s.ventaDuplicados || 0), cobrado: money(s.totalCobrado), saldo: money(s.saldoPendiente) })) },
    { name: 'Usuarios y Alertas', columns: cols(['tipo', 'Tipo', 18], ['usuario', 'Usuario / sede', 28], ['operaciones', 'Operaciones', 16], ['importe', 'Importe (S/)', 20, 'currency'], ['detalle', 'Detalle', 70]), rows: [
      ...h.usuarios.map((u) => ({ tipo: 'Usuario', usuario: u.nombre || u.username, operaciones: u.totalOperaciones, importe: money(u.totalVendido), detalle: `Certificados: ${u.certificadosGenerados}; productos: ${u.productosVendidos}; última operación: ${dateText(u.ultimaOperacion)}` })),
      ...h.resumen.alertas.map((a) => ({ tipo: 'Alerta', usuario: a.plantaKey, operaciones: '', importe: money(a.saldo), detalle: `${a.tipo}: ${a.mensaje} (orden ${a.ordenId})` }))
    ] }
  ];
}

export function exportarResumenDashboard(data: DashboardExportacionResponse, filtros: FiltrosDashboard) {
  if (!data?.hojas?.resumen) throw new Error('El servidor no devolvió el resumen del Dashboard.');
  exportarExcelVariasHojas(`faregas_resumen_dashboard_${filtros.alcance || 'SEDE'}_${filtros.desde || ''}_${filtros.hasta || ''}`, construirHojasResumenDashboard(data));
}
