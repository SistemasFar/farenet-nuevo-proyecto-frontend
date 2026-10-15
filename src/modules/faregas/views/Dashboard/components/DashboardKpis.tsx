import React from 'react';
import type { DashboardResumenResponse, KpiValor } from '../../services/faregas-dashboard.api';

interface DashboardKpisProps {
  data: DashboardResumenResponse | null;
  cargando: boolean;
}

const KpiCard: React.FC<{
  titulo: string;
  kpi?: KpiValor;
  esMoneda?: boolean;
  colorBorder?: string;
  colorIcon?: string;
  svgIcon: React.ReactNode;
}> = ({ titulo, kpi, esMoneda = false, colorBorder = 'border-blue-500', svgIcon }) => {
  const actual = kpi?.actual ?? 0;
  const delta = kpi?.delta ?? 0;
  const pct = kpi?.porcentaje ?? 0;
  const tooltip = kpi?.tooltip || '';

  const valorFormateado = esMoneda
    ? `S/ ${actual.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : actual.toLocaleString('es-PE');

  const esPositivo = delta > 0;
  const esNeutro = delta === 0;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 ${colorBorder} p-4 flex flex-col justify-between hover:shadow-md transition`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{titulo}</span>
        <div className="p-1.5 rounded-lg bg-slate-50 text-slate-600">{svgIcon}</div>
      </div>

      <div className="mb-2">
        <div className="text-2xl font-black text-slate-800 tracking-tight">{valorFormateado}</div>
      </div>

      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
              esNeutro
                ? 'bg-slate-100 text-slate-600'
                : esPositivo
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {esPositivo ? `+${pct}%` : `${pct}%`}
          </span>
          <span className="text-slate-400 text-[11px]">vs periodo ant.</span>
        </div>

        {tooltip && (
          <span title={tooltip} className="cursor-help text-slate-400 hover:text-slate-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
};

export const DashboardKpis: React.FC<DashboardKpisProps> = ({ data, cargando }) => {
  if (cargando) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 animate-pulse h-28" />
        ))}
      </div>
    );
  }

  const k = data?.kpis;

  return (
    <div className="mb-6 space-y-4">
      {/* Grupo 1: Financiero y Caja */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ingresos y Cobranza</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            titulo="Venta Operativa"
            kpi={k?.ventaOperativaGenerada}
            esMoneda={true}
            colorBorder="border-blue-700"
            svgIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <KpiCard
            titulo="Venta Pagada"
            kpi={k?.ventaPagada}
            esMoneda={true}
            colorBorder="border-indigo-600"
            svgIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <KpiCard
            titulo="Venta Bruta"
            kpi={k?.ventaBruta}
            esMoneda={true}
            colorBorder="border-slate-600"
            svgIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          />
          <KpiCard
            titulo="Venta Neta"
            kpi={k?.ventaNeta}
            esMoneda={true}
            colorBorder="border-cyan-600"
            svgIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
          />
          <KpiCard
            titulo="Total Cobrado"
            kpi={k?.totalCobrado}
            esMoneda={true}
            colorBorder="border-emerald-600"
            svgIcon={<svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
          />
          <KpiCard
            titulo="Saldo Pendiente"
            kpi={k?.saldoPendiente}
            esMoneda={true}
            colorBorder="border-amber-500"
            svgIcon={<svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>
      </div>

      {/* Grupo 2: Operativo y Fiscal */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Operaciones y Comprobantes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            titulo="Operaciones"
            kpi={k?.cantidadOperaciones}
            colorBorder="border-slate-500"
            svgIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          />
          <KpiCard
            titulo="Ticket Promedio"
            kpi={k?.ticketPromedio}
            esMoneda={true}
            colorBorder="border-sky-500"
            svgIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
          />
          <KpiCard
            titulo="Cert. Emitidos"
            kpi={k?.certificadosEmitidos}
            colorBorder="border-teal-600"
            svgIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
          />
          <KpiCard
            titulo="Facturas Aceptadas"
            kpi={k?.facturasAceptadas}
            colorBorder="border-blue-600"
            svgIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <KpiCard
            titulo="Boletas Aceptadas"
            kpi={k?.boletasAceptadas}
            colorBorder="border-blue-500"
            svgIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
          />
          <KpiCard
            titulo="Comprob. con Error"
            kpi={k?.comprobantesRechazadosOError}
            colorBorder="border-rose-500"
            svgIcon={<svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          />
        </div>
      </div>
    </div>
  );
};
