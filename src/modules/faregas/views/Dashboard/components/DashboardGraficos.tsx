import React from 'react';
import type { SerieDiariaItem, DistribucionCertificadoItem, DistribucionPagoItem } from '../../services/faregas-dashboard.api';

interface DashboardGraficosProps {
  serieDiaria: SerieDiariaItem[];
  distribucionCertificados: DistribucionCertificadoItem[];
  distribucionPagos: DistribucionPagoItem[];
}

export const DashboardGraficos: React.FC<DashboardGraficosProps> = ({
  serieDiaria,
  distribucionCertificados,
  distribucionPagos
}) => {
  // Gráfico de evolución temporal (SVG nativo responsivo)
  const maxVenta = Math.max(...serieDiaria.map(s => s.venta), 100);
  const puntosSvg = serieDiaria.map((s, index) => {
    const x = serieDiaria.length > 1 ? (index / (serieDiaria.length - 1)) * 500 : 250;
    const y = 160 - (s.venta / maxVenta) * 130;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Evolución diaria de ventas (2 columnas en pantallas grandes) */}
      <div className="md:col-span-2 lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <h3 className="text-sm font-bold text-slate-800">Evolución de Ventas por Día</h3>
          <span className="text-xs text-slate-500">Monto total diario (S/.)</span>
        </div>

        {serieDiaria.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
            Sin operaciones registradas en el período
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg viewBox="0 0 500 180" className="w-full h-44 overflow-visible">
              <defs>
                <linearGradient id="gradVenta" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Ejes */}
              <line x1="0" y1="160" x2="500" y2="160" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="0" y1="95" x2="500" y2="95" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />

              {/* Área y línea */}
              {serieDiaria.length > 1 && (
                <polygon
                  fill="url(#gradVenta)"
                  points={`0,160 ${puntosSvg} 500,160`}
                />
              )}
              <polyline
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2.5"
                points={puntosSvg}
              />

              {/* Nodos interactivos */}
              {serieDiaria.map((s, index) => {
                const x = serieDiaria.length > 1 ? (index / (serieDiaria.length - 1)) * 500 : 250;
                const y = 160 - (s.venta / maxVenta) * 130;
                return (
                  <g key={s.fecha}>
                    <circle cx={x} cy={y} r="3.5" fill="#1d4ed8" className="hover:r-5 transition-all cursor-pointer">
                      <title>{`${s.fecha}: S/ ${s.venta.toFixed(2)} (${s.operaciones} ops)`}</title>
                    </circle>
                  </g>
                );
              })}
            </svg>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
              <span>{serieDiaria[0]?.fecha}</span>
              <span>{serieDiaria[Math.floor(serieDiaria.length / 2)]?.fecha}</span>
              <span>{serieDiaria[serieDiaria.length - 1]?.fecha}</span>
            </div>
          </div>
        )}
      </div>

      {/* Distribución por Medio de Pago (1 columna) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <h3 className="text-sm font-bold text-slate-800">Medios de Pago</h3>
          <span className="text-xs text-slate-500">% Recaudación</span>
        </div>

        {distribucionPagos.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
            Sin pagos en el período
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {distribucionPagos.map((p) => (
              <div key={p.medio} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">{p.medio}</span>
                  <span className="text-slate-500 font-medium">
                    S/ {p.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })} ({p.porcentaje}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(p.porcentaje, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Distribución por Tipo de Certificado (1 columna) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <h3 className="text-sm font-bold text-slate-800">Tipos de Certificado</h3>
          <span className="text-xs text-slate-500">% Emisiones</span>
        </div>

        {distribucionCertificados.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-slate-400 text-xs">
            Sin certificados en el período
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {distribucionCertificados.map((c) => (
              <div key={c.tipo} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">{c.tipo}</span>
                  <span className="text-slate-500 font-medium">
                    {c.cantidad} ({c.porcentaje}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(c.porcentaje, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
