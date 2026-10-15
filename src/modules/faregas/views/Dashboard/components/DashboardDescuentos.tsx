import React from 'react';
import type { DescuentoDetalleItem, PaginadoResponse } from '../../services/faregas-dashboard.api';

interface DashboardDescuentosProps {
  data: PaginadoResponse<DescuentoDetalleItem> | null;
  cargando: boolean;
}

export const DashboardDescuentos: React.FC<DashboardDescuentosProps> = ({ data, cargando }) => {
  if (cargando) {
    return <div className="bg-white rounded-xl p-8 text-center text-slate-400 text-xs">Cargando descuentos...</div>;
  }

  const items = data?.items || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Descuentos y Cupones Aplicados</h3>
          <p className="text-xs text-slate-500">Histórico de cupones y campañas comerciales efectivas</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Cupón / Código</th>
              <th className="py-2.5 px-3">Campaña</th>
              <th className="py-2.5 px-3">Sede</th>
              <th className="py-2.5 px-3">Estado</th>
              <th className="py-2.5 px-3 text-right">Imp. Original</th>
              <th className="py-2.5 px-3 text-right">Descuento</th>
              <th className="py-2.5 px-3 text-right">Imp. Final</th>
              <th className="py-2.5 px-3">Fecha Aplicación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No hay descuentos aplicados en este período.
                </td>
              </tr>
            ) : (
              items.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{d.cupon}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{d.campana}</td>
                  <td className="py-2.5 px-3 text-slate-700">{d.plantaNombre}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {d.estado}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500">S/ {d.importeOriginal.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-600">- S/ {d.importeDescuento.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800">S/ {d.importeFinal.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-slate-500">{new Date(d.fechaAplicacion).toLocaleDateString('es-PE')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
