import React from 'react';

interface SerieDuplicadoItem {
  fecha: string;
  emitidos: number;
}

interface DashboardDuplicadosEvolucionProps {
  serie: SerieDuplicadoItem[];
}

export const DashboardDuplicadosEvolucion: React.FC<DashboardDuplicadosEvolucionProps> = ({ serie }) => {
  if (!serie || serie.length === 0) return null;

  const maximo = Math.max(...serie.map((item) => item.emitidos), 1);
  const puntos = serie.map((item, index) => {
    const x = serie.length > 1 ? (index / (serie.length - 1)) * 600 : 300;
    const y = 140 - (item.emitidos / maximo) * 110;
    return `${x},${y}`;
  }).join(' ');

  const totalPeriodo = serie.reduce((sum, item) => sum + item.emitidos, 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Evolución Diaria de Duplicados Emitidos</h3>
          <p className="text-xs text-slate-500">
            Conteo de duplicados generados según su fecha real de disponibilidad con comprobante legal.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-cyan-800">
            Total en el período: {totalPeriodo}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto pt-2">
        <svg
          viewBox="0 0 600 160"
          className="h-32 w-full min-w-[500px]"
          role="img"
          aria-label="Evolución diaria de duplicados emitidos"
        >
          <line x1="0" y1="140" x2="600" y2="140" stroke="#e2e8f0" />
          <line x1="0" y1="85" x2="600" y2="85" stroke="#f1f5f9" strokeDasharray="3,3" />
          <line x1="0" y1="30" x2="600" y2="30" stroke="#f1f5f9" strokeDasharray="3,3" />
          <polyline points={puntos} fill="none" stroke="#0891b2" strokeWidth="2.5" />
          {serie.map((item, index) => {
            const x = serie.length > 1 ? (index / (serie.length - 1)) * 600 : 300;
            const y = 140 - (item.emitidos / maximo) * 110;
            return (
              <g key={item.fecha}>
                <circle cx={x} cy={y} r="4" fill="#0891b2">
                  <title>{`${item.fecha}: ${item.emitidos} duplicados`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
        <div className="flex min-w-[500px] justify-between px-1 text-xs text-slate-400">
          <span>{serie[0]?.fecha}</span>
          <span>{serie[Math.floor(serie.length / 2)]?.fecha}</span>
          <span>{serie[serie.length - 1]?.fecha}</span>
        </div>
      </div>
    </section>
  );
};
