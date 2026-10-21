import React from 'react';
import type { DashboardResumenResponse, KpiValor } from '../../../services/faregas-dashboard.api';
import { KpiInfoPopover } from './KpiInfoPopover';

export type DashboardKpiKey = keyof DashboardResumenResponse['kpis'];

interface KpiDefinition {
  titulo: string;
  moneda?: boolean;
  borde: string;
  descripcion: string;
  formula: string;
  fuente: string;
}

const DEFINICIONES_KPI: Record<DashboardKpiKey, KpiDefinition> = {
  ventaOperativaGenerada: { titulo: 'Venta Operativa', moneda: true, borde: 'border-blue-700', descripcion: 'Importe de operaciones que cuentan con un comprobante emitido correctamente.', formula: 'Suma del importe total de esas operaciones.', fuente: 'fg_operacion_comercial y fg_facturacion.' },
  ventaPagada: { titulo: 'Venta Pagada', moneda: true, borde: 'border-indigo-600', descripcion: 'Importe de operaciones comerciales marcadas como pagadas o facturadas.', formula: 'Suma de operaciones en estado PAGADO o FACTURADO.', fuente: 'fg_operacion_comercial.' },
  ventaBruta: { titulo: 'Venta Bruta', moneda: true, borde: 'border-slate-600', descripcion: 'Es el valor de las ventas antes de descontar los beneficios comerciales aplicados al cliente.', formula: 'Venta Operativa + descuentos APLICADOS.', fuente: 'fg_operacion_comercial y fg_descuentocomprobante.' },
  ventaNeta: { titulo: 'Venta Neta', moneda: true, borde: 'border-cyan-600', descripcion: 'Es la venta final después de considerar las notas de crédito y débito aceptadas.', formula: 'Venta Operativa − notas de crédito + notas de débito aceptadas.', fuente: 'fg_operacion_comercial, fg_credito y fg_debito.' },
  totalCobrado: { titulo: 'Total Cobrado', moneda: true, borde: 'border-emerald-600', descripcion: 'Dinero efectivamente registrado como cobrado durante el período.', formula: 'Suma de pagos con estado CAN.', fuente: 'fg_pago y fg_orden_pago.' },
  saldoPendiente: { titulo: 'Saldo Pendiente', moneda: true, borde: 'border-amber-500', descripcion: 'Importe que todavía queda por cobrar en órdenes vigentes.', formula: 'Suma de saldos positivos de órdenes no anuladas.', fuente: 'fg_orden_pago.' },
  cantidadOperaciones: { titulo: 'Operaciones', borde: 'border-slate-500', descripcion: 'Cantidad de operaciones con comprobante emitido correctamente.', formula: 'Conteo de operaciones comerciales válidas.', fuente: 'fg_operacion_comercial y fg_facturacion.' },
  ticketPromedio: { titulo: 'Ticket Promedio', moneda: true, borde: 'border-sky-500', descripcion: 'Importe promedio facturado por cada operación válida.', formula: 'Venta Operativa ÷ número de operaciones.', fuente: 'fg_operacion_comercial y fg_facturacion.' },
  ventaOperativaCertificados: { titulo: 'Venta Operativa Cert.', moneda: true, borde: 'border-blue-700', descripcion: 'Importe vendido exclusivamente por servicios de certificados con comprobante emitido correctamente. No incluye productos como chips o papeles.', formula: 'Suma de líneas SERVICIO vinculadas a certificados.', fuente: 'fg_operacion_detalle, fg_certificado y fg_facturacion.' },
  ventaBrutaCertificados: { titulo: 'Venta Bruta Cert.', moneda: true, borde: 'border-slate-600', descripcion: 'Valor de los certificados antes de restar los descuentos comerciales aplicados.', formula: 'Venta Operativa de certificados + descuentos APLICADOS a certificados.', fuente: 'fg_operacion_detalle y fg_descuentocomprobante.' },
  ventaNetaCertificados: { titulo: 'Venta Neta Cert.', moneda: true, borde: 'border-cyan-600', descripcion: 'Venta final atribuible a certificados después de notas de crédito y débito aceptadas.', formula: 'Venta Operativa de certificados − notas de crédito + notas de débito.', fuente: 'fg_operacion_detalle, fg_credito y fg_debito.' },
  ticketPromedioCertificados: { titulo: 'Ticket Prom. Cert.', moneda: true, borde: 'border-sky-500', descripcion: 'Importe promedio vendido por cada certificado incluido en un comprobante emitido correctamente.', formula: 'Venta Operativa de certificados ÷ certificados facturados.', fuente: 'fg_operacion_detalle, fg_certificado y fg_facturacion.' },
  certificadosEmitidos: { titulo: 'Cert. Emitidos', borde: 'border-teal-600', descripcion: 'Certificados oficiales emitidos durante el período.', formula: 'Conteo de certificados en estado EMITIDO.', fuente: 'fg_certificado.' },
  certificadosPendientes: { titulo: 'Cert. Borrador', borde: 'border-amber-500', descripcion: 'Certificados todavía pendientes de completar o emitir.', formula: 'Conteo de certificados en estado BORRADOR.', fuente: 'fg_certificado.' },
  certificadosAnulados: { titulo: 'Cert. Anulados', borde: 'border-rose-500', descripcion: 'Certificados anulados durante el período consultado.', formula: 'Conteo de certificados en estado ANULADO.', fuente: 'fg_certificado.' },
  duplicadosEmitidos: { titulo: 'Cert. Duplicados', borde: 'border-cyan-600', descripcion: 'Cantidad de duplicados emitidos en estado DISPONIBLE con comprobante operable. No incrementan los certificados originales emitidos.', formula: 'Conteo de duplicados en estado DISPONIBLE con comprobante emitido exitosamente.', fuente: 'fg_certificado_duplicado y fg_facturacion.' },
  ventaDuplicados: { titulo: 'Venta Duplicados', moneda: true, borde: 'border-blue-600', descripcion: 'Importe correspondiente a los duplicados facturados durante el período seleccionado. Esta cantidad ya forma parte de la venta general y no se suma nuevamente.', formula: 'Suma de operaciones comerciales de duplicados con comprobante emitido.', fuente: 'fg_operacion_comercial y fg_certificado_duplicado.' },
  totalCobradoDuplicados: { titulo: 'Cobrado Duplicados', moneda: true, borde: 'border-emerald-600', descripcion: 'Monto total efectivamente cobrado por duplicados de certificados durante el período. Ya está incluido en el Total Cobrado general.', formula: 'Suma de pagos CAN de órdenes de duplicados.', fuente: 'fg_pago y fg_orden_pago.' },
  saldoPendienteDuplicados: { titulo: 'Saldo Duplicados', moneda: true, borde: 'border-amber-500', descripcion: 'Saldo pendiente por cobrar en órdenes vigentes de duplicados. Ya forma parte del saldo pendiente general.', formula: 'Suma de saldos de órdenes de duplicados no anuladas.', fuente: 'fg_orden_pago y fg_certificado_duplicado.' },
  ticketPromedioDuplicados: { titulo: 'Ticket Prom. Duplicados', moneda: true, borde: 'border-sky-500', descripcion: 'Importe promedio facturado por cada duplicado emitido.', formula: 'Venta de duplicados ÷ cantidad de operaciones de duplicados.', fuente: 'fg_operacion_comercial y fg_certificado_duplicado.' },
  productosVendidos: { titulo: 'Productos Vendidos', borde: 'border-violet-500', descripcion: 'Unidades de productos facturados en operaciones válidas.', formula: 'Suma de cantidades de líneas con tipo PRODUCTO.', fuente: 'fg_operacion_detalle, fg_operacion_comercial y fg_facturacion.' },
  montoDescontado: { titulo: 'Monto Descontado', moneda: true, borde: 'border-fuchsia-500', descripcion: 'Beneficio comercial aplicado realmente a las operaciones.', formula: 'Suma de descuentos con estado APLICADO.', fuente: 'fg_descuentocomprobante.' },
  facturasAceptadas: { titulo: 'Facturas Emitidas', borde: 'border-blue-600', descripcion: 'Facturas emitidas correctamente en producción o generadas completamente en DEMO.', formula: 'Conteo de facturas que cumplen la política de emisión exitosa.', fuente: 'fg_facturacion.' },
  boletasAceptadas: { titulo: 'Boletas Emitidas', borde: 'border-blue-500', descripcion: 'Boletas emitidas correctamente en producción o generadas completamente en DEMO.', formula: 'Conteo de boletas que cumplen la política de emisión exitosa.', fuente: 'fg_facturacion.' },
  comprobantesRechazadosOError: { titulo: 'Comprob. con Error', borde: 'border-rose-500', descripcion: 'Comprobantes que recibieron un rechazo fiscal o un error técnico.', formula: 'Conteo de comprobantes en estado RECHAZADO o ERROR.', fuente: 'fg_facturacion.' }
};

const TODAS_LAS_CLAVES = Object.keys(DEFINICIONES_KPI) as DashboardKpiKey[];

interface DashboardKpisProps {
  data: DashboardResumenResponse | null;
  cargando: boolean;
  visibles?: DashboardKpiKey[];
  titulo?: string;
  descripcion?: string;
}

const KpiCard: React.FC<{ definicion: KpiDefinition; kpi?: KpiValor }> = ({ definicion, kpi }) => {
  const actual = kpi?.actual ?? 0;
  const delta = kpi?.delta ?? 0;
  const porcentaje = kpi?.porcentaje ?? 0;
  const valor = definicion.moneda
    ? `S/ ${actual.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : actual.toLocaleString('es-PE');

  return (
    <article className={`group/kpi min-w-0 rounded-xl border border-slate-200 border-l-4 ${definicion.borde} bg-white p-3 shadow-sm transition hover:shadow-md`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{definicion.titulo}</span>
        <KpiInfoPopover
          titulo={definicion.titulo}
          descripcion={definicion.descripcion}
          formula={definicion.formula}
          fuente={definicion.fuente}
          filtros="Período, alcance y sede. El tipo de certificado solo afecta métricas atribuibles a certificados."
        />
      </div>
      <div className="mt-2 truncate text-xl font-bold leading-tight text-slate-900" title={valor}>{valor}</div>
      <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2 text-xs">
        <span className={`rounded px-1.5 py-0.5 font-semibold ${delta > 0 ? 'bg-emerald-50 text-emerald-700' : delta < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
          {delta > 0 ? '+' : ''}{porcentaje}%
        </span>
        <span className="text-slate-400">vs. período anterior</span>
      </div>
    </article>
  );
};

export const DashboardKpis: React.FC<DashboardKpisProps> = ({ data, cargando, visibles = TODAS_LAS_CLAVES, titulo, descripcion }) => (
  <section className="space-y-2">
    {(titulo || descripcion) && (
      <div>
        {titulo && <h2 className="text-sm font-bold text-slate-800">{titulo}</h2>}
        {descripcion && <p className="mt-0.5 text-xs text-slate-500">{descripcion}</p>}
      </div>
    )}
    <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${visibles.length === 3
      ? 'xl:grid-cols-3'
      : visibles.length === 4
        ? 'xl:grid-cols-4'
        : 'xl:grid-cols-3 2xl:grid-cols-6'
    }`}>
      {visibles.map((clave) => cargando ? (
        <div key={clave} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
      ) : (
        <KpiCard key={clave} definicion={DEFINICIONES_KPI[clave]} kpi={data?.kpis[clave]} />
      ))}
    </div>
  </section>
);
