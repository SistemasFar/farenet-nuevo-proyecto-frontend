import React from 'react';
import type { AlertaInconsistencia } from '../../../services/faregas-dashboard.api';

interface DashboardAlertasProps {
  alertas: AlertaInconsistencia[];
}

export const DashboardAlertas: React.FC<DashboardAlertasProps> = ({ alertas }) => {
  if (alertas.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950" aria-labelledby="dashboard-alertas-title">
      <div className="flex items-start gap-3">
        <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="min-w-0 flex-1">
          <h2 id="dashboard-alertas-title" className="text-sm font-bold">
            Auditoría analítica ({alertas.length})
          </h2>
          <p className="mt-0.5 text-xs text-amber-800">
            Situaciones que requieren revisión administrativa; el dashboard no modifica los registros.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {alertas.map((alerta, index) => (
              <li key={`${alerta.tipo}-${alerta.ordenId}-${index}`} className="rounded-lg border border-amber-200 bg-white/60 px-3 py-2">
                <span className="font-semibold">Orden #{alerta.ordenId}</span>
                <span className="text-amber-800"> · {alerta.mensaje}</span>
                <span className="ml-2 text-xs text-amber-700">
                  Sede {alerta.plantaKey} · Saldo S/ {alerta.saldo.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
