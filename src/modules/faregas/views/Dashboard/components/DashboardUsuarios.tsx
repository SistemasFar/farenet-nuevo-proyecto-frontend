import React from 'react';
import type { UsuarioDetalleItem } from '../../services/faregas-dashboard.api';

interface DashboardUsuariosProps {
  usuarios: UsuarioDetalleItem[];
  cargando: boolean;
}

export const DashboardUsuarios: React.FC<DashboardUsuariosProps> = ({ usuarios, cargando }) => {
  if (cargando) {
    return <div className="bg-white rounded-xl p-8 text-center text-slate-400 text-xs">Cargando usuarios...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Rendimiento por Usuario / Cajero</h3>
          <p className="text-xs text-slate-500">Operaciones, venta generada y emisión por usuario registrador</p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-full">
          {usuarios.length} Usuarios Activos
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Usuario / Nombre</th>
              <th className="py-2.5 px-3 text-right">Operaciones</th>
              <th className="py-2.5 px-3 text-right">Certificados</th>
              <th className="py-2.5 px-3 text-right">Productos</th>
              <th className="py-2.5 px-3 text-right">Venta Total S/.</th>
              <th className="py-2.5 px-3 text-right">Ticket Promedio</th>
              <th className="py-2.5 px-3">Última Operación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No hay operaciones de usuarios en este período.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.username} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    <div>{u.nombre}</div>
                    <div className="text-[10px] text-slate-400 font-mono">@{u.username}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-700">{u.totalOperaciones}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{u.certificadosGenerados}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{u.productosVendidos}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                    S/ {u.totalVendido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">S/ {u.ticketPromedio.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {u.ultimaOperacion ? new Date(u.ultimaOperacion).toLocaleString('es-PE') : '-'}
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
