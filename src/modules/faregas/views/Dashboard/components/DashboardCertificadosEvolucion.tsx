import React from 'react';
import type { SerieCertificadoItem } from '../../../services/faregas-dashboard.api';

interface DashboardCertificadosEvolucionProps {
  serie: SerieCertificadoItem[];
}

export const DashboardCertificadosEvolucion: React.FC<DashboardCertificadosEvolucionProps> = ({ serie }) => {
  const maximo = Math.max(...serie.map((item) => item.total), 1);
  const puntos = (campo: 'emitidos' | 'borradores' | 'anulados') => serie.map((item, index) => {
    const x = serie.length > 1 ? (index / (serie.length - 1)) * 600 : 300;
    const y = 160 - (item[campo] / maximo) * 130;
    return `${x},${y}`;
  }).join(' ');

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Evolución de Certificados</h3>
          <p className="text-xs text-slate-500">Registros diarios por estado durante el período.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          <span className="text-emerald-700">● Emitidos</span>
          <span className="text-amber-700">● Borradores</span>
          <span className="text-rose-700">● Anulados</span>
        </div>
      </div>

      {serie.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-400">Sin certificados en el período.</div>
      ) : (
        <div className="overflow-x-auto pt-2">
          <svg viewBox="0 0 600 180" className="h-36 w-full min-w-[520px]" role="img" aria-label="Evolución diaria de certificados por estado">
            <line x1="0" y1="160" x2="600" y2="160" stroke="#e2e8f0" />
            <line x1="0" y1="95" x2="600" y2="95" stroke="#f1f5f9" strokeDasharray="3,3" />
            <line x1="0" y1="30" x2="600" y2="30" stroke="#f1f5f9" strokeDasharray="3,3" />
            <polyline points={puntos('emitidos')} fill="none" stroke="#059669" strokeWidth="2.5" />
            <polyline points={puntos('borradores')} fill="none" stroke="#d97706" strokeWidth="2.5" />
            <polyline points={puntos('anulados')} fill="none" stroke="#e11d48" strokeWidth="2.5" />
            {serie.map((item, index) => {
              const x = serie.length > 1 ? (index / (serie.length - 1)) * 600 : 300;
              return (
                <g key={item.fecha}>
                  <circle cx={x} cy={160 - (item.emitidos / maximo) * 130} r="3" fill="#059669"><title>{`${item.fecha}: ${item.emitidos} emitidos`}</title></circle>
                  <circle cx={x} cy={160 - (item.borradores / maximo) * 130} r="3" fill="#d97706"><title>{`${item.fecha}: ${item.borradores} borradores`}</title></circle>
                  <circle cx={x} cy={160 - (item.anulados / maximo) * 130} r="3" fill="#e11d48"><title>{`${item.fecha}: ${item.anulados} anulados`}</title></circle>
                </g>
              );
            })}
          </svg>
          <div className="flex min-w-[520px] justify-between px-1 text-xs text-slate-400">
            <span>{serie[0]?.fecha}</span>
            <span>{serie[Math.floor(serie.length / 2)]?.fecha}</span>
            <span>{serie[serie.length - 1]?.fecha}</span>
          </div>
        </div>
      )}
    </section>
  );
};
