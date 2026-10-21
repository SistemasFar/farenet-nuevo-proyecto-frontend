import type {
  DashboardExportacionResponse,
  DashboardResumenResponse,
  FiltrosDashboard
} from '../services/faregas-dashboard.api';
import {
  exportarExcelVariasHojas,
  type ExcelColumn,
  type ExcelSheetDefinition
} from './exportar-excel';

const moneda = (valor: number) => Number((valor || 0).toFixed(2));

const fechaTexto = (valor: string | null | undefined) => {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const columnas = (...items: Array<[string, string, number?, ExcelColumn['format']?]>): ExcelColumn[] =>
  items.map(([key, header, width, format]) => ({ key, header, width, format }));

const filasResumen = (
  resumen: DashboardResumenResponse,
  metadatos: DashboardExportacionResponse['metadatos']
) => {
  const definiciones: Array<{
    indicador: string;
    clave: keyof DashboardResumenResponse['kpis'];
    unidad: string;
  }> = [
    { indicador: 'Venta operativa', clave: 'ventaOperativaGenerada', unidad: 'S/' },
    { indicador: 'Venta pagada', clave: 'ventaPagada', unidad: 'S/' },
    { indicador: 'Venta bruta', clave: 'ventaBruta', unidad: 'S/' },
    { indicador: 'Venta neta', clave: 'ventaNeta', unidad: 'S/' },
    { indicador: 'Total cobrado', clave: 'totalCobrado', unidad: 'S/' },
    { indicador: 'Saldo pendiente', clave: 'saldoPendiente', unidad: 'S/' },
    { indicador: 'Operaciones', clave: 'cantidadOperaciones', unidad: 'cantidad' },
    { indicador: 'Ticket promedio', clave: 'ticketPromedio', unidad: 'S/' },
    { indicador: 'Certificados emitidos', clave: 'certificadosEmitidos', unidad: 'cantidad' },
    { indicador: 'Certificados pendientes', clave: 'certificadosPendientes', unidad: 'cantidad' },
    { indicador: 'Certificados anulados', clave: 'certificadosAnulados', unidad: 'cantidad' },
    { indicador: 'Certificados duplicados emitidos', clave: 'duplicadosEmitidos', unidad: 'cantidad' },
    { indicador: 'Venta de duplicados', clave: 'ventaDuplicados', unidad: 'S/' },
    { indicador: 'Total cobrado duplicados', clave: 'totalCobradoDuplicados', unidad: 'S/' },
    { indicador: 'Saldo pendiente duplicados', clave: 'saldoPendienteDuplicados', unidad: 'S/' },
    { indicador: 'Ticket promedio duplicados', clave: 'ticketPromedioDuplicados', unidad: 'S/' },
    { indicador: 'Productos vendidos', clave: 'productosVendidos', unidad: 'cantidad' },
    { indicador: 'Monto descontado', clave: 'montoDescontado', unidad: 'S/' },
    { indicador: 'Facturas emitidas', clave: 'facturasAceptadas', unidad: 'cantidad' },
    { indicador: 'Boletas emitidas', clave: 'boletasAceptadas', unidad: 'cantidad' },
    { indicador: 'Comprobantes con error', clave: 'comprobantesRechazadosOError', unidad: 'cantidad' }
  ];

  return [
    { indicador: 'Rango consultado', valor: metadatos.rango, anterior: '', variacion: '', unidad: '' },
    { indicador: 'Fecha de generación', valor: fechaTexto(metadatos.fechaGeneracion), anterior: '', variacion: '', unidad: '' },
    { indicador: 'Usuario exportador', valor: metadatos.usuarioExportador, anterior: '', variacion: '', unidad: '' },
    { indicador: 'Sedes incluidas', valor: metadatos.sedesIncluidas, anterior: '', variacion: '', unidad: '' },
    ...definiciones.map(({ indicador, clave, unidad }) => {
      const kpi = resumen.kpis?.[clave];
      const actual = kpi?.actual ?? 0;
      const anterior = kpi?.anterior ?? 0;
      const variacion = kpi?.porcentaje ?? 0;
      return {
        indicador,
        valor: unidad === 'S/' ? moneda(actual) : actual,
        anterior: unidad === 'S/' ? moneda(anterior) : anterior,
        variacion,
        unidad
      };
    })
  ];
};

export function construirHojasDashboard(reporte: DashboardExportacionResponse): ExcelSheetDefinition[] {
  const { metadatos, hojas: h } = reporte;
  return [
    {
      name: 'Resumen Ejecutivo',
      columns: columnas(
        ['indicador', 'Indicador', 30], ['valor', 'Valor', 24],
        ['anterior', 'Período anterior', 18], ['variacion', 'Variación %', 14], ['unidad', 'Unidad', 12]
      ),
      rows: filasResumen(h.resumen, metadatos)
    },
    {
      name: 'Sedes',
      columns: columnas(
        ['plantaKey', 'Código sede', 14, 'text'], ['plantaNombre', 'Sede', 28],
        ['operaciones', 'Operaciones', 14], ['venta', 'Venta operativa (S/)', 20, 'decimal2'],
        ['emitidos', 'Certificados emitidos', 20], ['pendientes', 'Certificados pendientes', 22],
        ['duplicados', 'Duplicados emitidos', 18], ['ventaDuplicados', 'Venta duplicados (S/)', 20, 'decimal2'],
        ['cobradoDuplicados', 'Cobrado duplicados (S/)', 20, 'decimal2'],
        ['cobrado', 'Total cobrado (S/)', 18, 'decimal2'], ['saldo', 'Saldo pendiente (S/)', 20, 'decimal2'],
        ['ticket', 'Ticket promedio (S/)', 20, 'decimal2']
      ),
      rows: h.sedes.map((s) => ({
        plantaKey: s.plantaKey, plantaNombre: s.plantaNombre, operaciones: s.cantidadOperaciones,
        venta: moneda(s.ventaOperativa), emitidos: s.certificadosEmitidos, pendientes: s.certificadosPendientes,
        duplicados: s.duplicadosEmitidos || 0, ventaDuplicados: moneda(s.ventaDuplicados || 0), cobradoDuplicados: moneda(s.totalCobradoDuplicados || 0),
        cobrado: moneda(s.totalCobrado), saldo: moneda(s.saldoPendiente), ticket: moneda(s.ticketPromedio)
      }))
    },
    {
      name: 'Certificados',
      columns: columnas(
        ['id', 'ID', 10], ['numero', 'N.º certificado', 18, 'text'], ['tipo', 'Tipo', 18],
        ['estado', 'Estado', 14], ['sede', 'Sede', 25], ['placa', 'Placa', 12, 'text'],
        ['marca', 'Marca', 18], ['modelo', 'Modelo', 18], ['importe', 'Importe (S/)', 15, 'decimal2'],
        ['fechaCreacion', 'Fecha creación', 20], ['fechaEmision', 'Fecha emisión', 20], ['usuario', 'Usuario', 18]
      ),
      rows: h.certificados.map((c) => ({
        id: c.id, numero: c.numeroCertificado || '', tipo: c.tipoCertificado, estado: c.estado,
        sede: c.plantaNombre, placa: c.placa || '', marca: c.marca || '', modelo: c.modelo || '',
        importe: moneda(c.importeTotal), fechaCreacion: fechaTexto(c.fechaCreacion),
        fechaEmision: fechaTexto(c.fechaEmision), usuario: c.usuarioCreacion
      }))
    },
    {
      name: 'Duplicados de Certificados',
      columns: columnas(
        ['id', 'ID', 10],
        ['numeroDuplicado', 'N.º duplicado', 16, 'text'],
        ['fechaEmision', 'Fecha emisión', 20],
        ['sede', 'Sede', 25],
        ['placa', 'Placa', 12, 'text'],
        ['certificadoOriginal', 'Certificado original', 20, 'text'],
        ['tipo', 'Tipo certificado', 18],
        ['modalidad', 'Modalidad', 14],
        ['importe', 'Importe facturado (S/)', 20, 'decimal2'],
        ['comprobante', 'Comprobante', 20, 'text'],
        ['tipoComprobante', 'Tipo comprobante', 18],
        ['estado', 'Estado', 14],
        ['solicitadoPor', 'Solicitado por', 18]
      ),
      rows: (h.duplicados || []).map((d) => ({
        id: d.id,
        numeroDuplicado: `Duplicado #${d.numeroDuplicado}`,
        fechaEmision: fechaTexto(d.fechaEmisionDuplicado),
        sede: d.plantaNombre,
        placa: d.placa || '',
        certificadoOriginal: d.numeroCertificadoOriginal || `ID #${d.certificadoOriginalId}`,
        tipo: d.tipoCertificado || d.tipoNombre,
        modalidad: d.modalidad || '',
        importe: moneda(d.importe),
        comprobante: d.numeroComprobante || '—',
        tipoComprobante: d.tipoComprobante || '',
        estado: d.estado,
        solicitadoPor: d.solicitadoPor
      }))
    },
    {
      name: 'Ventas por Producto',
      columns: columnas(
        ['sku', 'SKU', 16, 'text'], ['descripcion', 'Descripción', 36], ['unidad', 'Unidad', 12],
        ['unidades', 'Unidades vendidas', 18], ['total', 'Importe total (S/)', 18, 'decimal2'],
        ['operaciones', 'Operaciones', 14], ['precio', 'Precio promedio (S/)', 20, 'decimal2']
      ),
      rows: h.ventasProductos.map((p) => ({
        sku: p.sku, descripcion: p.descripcion, unidad: p.unidad, unidades: p.unidadesVendidas,
        total: moneda(p.totalSoles), operaciones: p.operaciones, precio: moneda(p.precioPromedio)
      }))
    },
    {
      name: 'Comprobantes Fiscales',
      columns: columnas(
        ['id', 'ID', 10], ['fecha', 'Fecha', 20], ['sede', 'Sede', 24], ['tipo', 'Tipo', 14],
        ['comprobante', 'Comprobante', 20, 'text'], ['documento', 'Documento cliente', 20, 'text'],
        ['cliente', 'Cliente', 36], ['condicion', 'Condición de pago', 18], ['medio', 'Medio de pago', 18],
        ['base', 'Base imponible (S/)', 20, 'decimal2'], ['igv', 'IGV (S/)', 14, 'decimal2'],
        ['total', 'Total (S/)', 15, 'decimal2'], ['estado', 'Estado', 18]
      ),
      rows: h.comprobantes.map((c) => ({
        id: c.id, fecha: fechaTexto(c.fechaDocumento || c.fechaCreacion), sede: c.plantaNombre,
        tipo: c.tipoComprobante, comprobante: c.nroComprobante || `${c.serie || ''}-${c.numero || ''}`,
        documento: c.documentoCliente || '', cliente: c.cliente || '', condicion: c.condicionPago,
        medio: c.medioPago || '', base: moneda(c.baseImponible), igv: moneda(c.igv),
        total: moneda(c.importeTotal), estado: c.estado
      }))
    },
    {
      name: 'Cobranzas y Pagos',
      columns: columnas(
        ['id', 'ID', 10], ['fecha', 'Fecha', 20], ['sede', 'Sede', 24], ['orden', 'Orden de pago', 16],
        ['medio', 'Medio de pago', 18], ['tarjeta', 'Tipo de tarjeta', 18], ['banco', 'Banco', 18],
        ['operacion', 'N.º operación', 20, 'text'], ['importe', 'Importe (S/)', 15, 'decimal2'],
        ['estado', 'Estado', 12], ['usuario', 'Registrado por', 18]
      ),
      rows: h.pagos.map((p) => ({
        id: p.id, fecha: fechaTexto(p.fechaCreacion), sede: p.plantaNombre, orden: p.ordenPagoId,
        medio: p.medioPago, tarjeta: p.tarjetaTipo || '', banco: p.banco || '', operacion: p.nroOperacion || '',
        importe: moneda(p.importe), estado: p.estado, usuario: p.registradoPor
      }))
    },
    {
      name: 'Descuentos Aplicados',
      columns: columnas(
        ['id', 'ID', 10], ['fecha', 'Fecha aplicación', 20], ['sede', 'Sede', 24],
        ['cupon', 'Cupón', 18, 'text'], ['campana', 'Campaña', 28], ['tipo', 'Tipo', 18],
        ['original', 'Importe original (S/)', 20, 'decimal2'], ['descuento', 'Descuento (S/)', 18, 'decimal2'],
        ['final', 'Importe final (S/)', 18, 'decimal2'], ['estado', 'Estado', 14],
        ['certificado', 'Certificado ID', 16], ['orden', 'Orden ID', 14], ['facturacion', 'Facturación ID', 16]
      ),
      rows: h.descuentos.map((d) => ({
        id: d.id, fecha: fechaTexto(d.fechaAplicacion), sede: d.plantaNombre, cupon: d.cupon || '',
        campana: d.campana, tipo: d.tipo || '', original: moneda(d.importeOriginal),
        descuento: moneda(d.importeDescuento), final: moneda(d.importeFinal), estado: d.estado,
        certificado: d.certificadoId, orden: d.ordenPagoId, facturacion: d.facturacionId
      }))
    },
    {
      name: 'Productividad Usuarios',
      columns: columnas(
        ['username', 'Usuario', 18, 'text'], ['nombre', 'Nombre', 32], ['operaciones', 'Operaciones', 14],
        ['vendido', 'Total vendido (S/)', 18, 'decimal2'], ['certificados', 'Certificados', 16],
        ['productos', 'Productos vendidos', 18], ['ticket', 'Ticket promedio (S/)', 20, 'decimal2'],
        ['ultima', 'Última operación', 20]
      ),
      rows: h.usuarios.map((u) => ({
        username: u.username, nombre: u.nombre, operaciones: u.totalOperaciones,
        vendido: moneda(u.totalVendido), certificados: u.certificadosGenerados,
        productos: u.productosVendidos, ticket: moneda(u.ticketPromedio), ultima: fechaTexto(u.ultimaOperacion)
      }))
    }
  ];
}

export function exportarDashboardExcel(
  reporte: DashboardExportacionResponse,
  filtros: FiltrosDashboard
) {
  if (!reporte?.hojas) throw new Error('El servidor no devolvió datos para exportar.');
  const nombre = `faregas_dashboard_${filtros.alcance || 'SEDE'}_${filtros.desde || 'inicio'}_${filtros.hasta || 'fin'}`;
  exportarExcelVariasHojas(nombre, construirHojasDashboard(reporte));
}
