import React from 'react';
import type { SedeDetalleItem } from '../../../services/faregas-dashboard.api';

interface DashboardSedesProps {
  sedes: SedeDetalleItem[];
  cargando: boolean;
}

export const DashboardSedes: React.FC<DashboardSedesProps> = ({ sedes, cargando }) => {
  if (cargando) {
    return <div className="bg-white rounded-xl p-8 text-center text-slate-400 text-sm">Cargando sedes...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Comparativa y Ranking de Sedes</h3>
          <p className="text-sm text-slate-500">Rendimiento comercial y operativo por sede autorizada</p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-full">
          {sedes.length} Sedes
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs">
            <tr>
              <th className="py-2.5 px-3">Sede</th>
              <th className="py-2.5 px-3 text-right">Operaciones</th>
              <th className="py-2.5 px-3 text-right">Venta Operativa</th>
              <th className="py-2.5 px-3 text-right">Ticket Prom.</th>
              <th className="py-2.5 px-3 text-right">Cert. Emitidos</th>
              <th className="py-2.5 px-3 text-right">Cert. Pendientes</th>
              <th className="py-2.5 px-3 text-right">Cobrado</th>
              <th className="py-2.5 px-3 text-right">Saldo Pendiente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sedes.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No hay datos para las sedes autorizadas en este período.
                </td>
              </tr>
            ) : (
              sedes.map((s, index) => (
                <tr key={s.plantaKey} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-semibold text-slate-800 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <div>{s.plantaNombre}</div>
                      <div className="text-xs text-slate-400 font-mono">Key: {s.plantaKey}</div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-700">{s.cantidadOperaciones}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                    S/ {s.ventaOperativa.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">S/ {s.ticketPromedio.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{s.certificadosEmitidos}</td>
                  <td className="py-2.5 px-3 text-right text-amber-600">{s.certificadosPendientes}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-800">
                    S/ {s.totalCobrado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-rose-600">
                    S/ {s.saldoPendiente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
