import React from 'react';
import type { PagoDetalleItem, PaginadoResponse } from '../../../services/faregas-dashboard.api';

interface DashboardPagosProps {
  data: PaginadoResponse<PagoDetalleItem> | null;
  cargando: boolean;
  pagina: number;
  onCambiarPagina: (p: number) => void;
}

export const DashboardPagos: React.FC<DashboardPagosProps> = ({
  data,
  cargando,
  pagina,
  onCambiarPagina
}) => {
  if (cargando) {
    return <div className="bg-white rounded-xl p-8 text-center text-slate-400 text-sm">Cargando pagos...</div>;
  }

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPaginas = Math.ceil(total / (data?.limite || 20));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Cobros y Medios de Pago</h3>
          <p className="text-sm text-slate-500">Pagos reales registrados en caja / tesorería</p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-full">
          Total: {total}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs">
            <tr>
              <th className="py-2.5 px-3">ID Pago</th>
              <th className="py-2.5 px-3">Orden</th>
              <th className="py-2.5 px-3">Medio de Pago</th>
              <th className="py-2.5 px-3">Banco / Operación</th>
              <th className="py-2.5 px-3 text-right">Importe S/.</th>
              <th className="py-2.5 px-3">Sede</th>
              <th className="py-2.5 px-3">Registrado Por</th>
              <th className="py-2.5 px-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No hay pagos registrados en este período.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">#{p.id}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">Orden #{p.ordenPagoId}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                      {p.medioPago}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {p.banco && <span className="font-semibold">{p.banco} </span>}
                    {p.nroOperacion && <span className="text-slate-400 font-mono text-xs">• Op: {p.nroOperacion}</span>}
                    {!p.banco && !p.nroOperacion && <span className="text-slate-400">-</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                    S/ {p.importe.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{p.plantaNombre}</td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono text-xs">{p.registradoPor}</td>
                  <td className="py-2.5 px-3 text-slate-500">{new Date(p.fechaCreacion).toLocaleDateString('es-PE')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Página {pagina} de {totalPaginas}</span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={() => onCambiarPagina(pagina - 1)}
              className="px-2.5 py-1 rounded border border-slate-200 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => onCambiarPagina(pagina + 1)}
              className="px-2.5 py-1 rounded border border-slate-200 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
