import React from 'react';
import type { ProductoDetalleItem, PaginadoResponse } from '../../../services/faregas-dashboard.api';

interface DashboardVentasProps {
  data: PaginadoResponse<ProductoDetalleItem> | null;
  cargando: boolean;
}

export const DashboardVentas: React.FC<DashboardVentasProps> = ({ data, cargando }) => {
  if (cargando) {
    return <div className="bg-white rounded-xl p-8 text-center text-slate-400 text-sm">Cargando ventas...</div>;
  }

  const items = data?.items || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Ventas de Productos e Inventario</h3>
          <p className="text-sm text-slate-500">Chips y accesorios físicos comercializados</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs">
            <tr>
              <th className="py-2.5 px-3">SKU</th>
              <th className="py-2.5 px-3">Descripción</th>
              <th className="py-2.5 px-3">Unidad</th>
              <th className="py-2.5 px-3 text-right">Cant. Vendida</th>
              <th className="py-2.5 px-3 text-right">Precio Prom.</th>
              <th className="py-2.5 px-3 text-right">Total S/.</th>
              <th className="py-2.5 px-3 text-right">Operaciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No hay productos vendidos en este período.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id ? `prod-${p.id}` : p.sku} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{p.sku}</td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">{p.descripcion}</td>
                  <td className="py-2.5 px-3 text-slate-500">{p.unidad}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800">{p.unidadesVendidas}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">S/ {p.precioPromedio.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-blue-700">S/ {p.totalSoles.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{p.operaciones}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
