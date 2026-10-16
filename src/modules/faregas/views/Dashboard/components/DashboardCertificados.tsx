import React from 'react';
import type { CertificadoDetalleItem, PaginadoResponse } from '../../../services/faregas-dashboard.api';

interface DashboardCertificadosProps {
  data: PaginadoResponse<CertificadoDetalleItem> | null;
  cargando: boolean;
  pagina: number;
  onCambiarPagina: (p: number) => void;
}

export const DashboardCertificados: React.FC<DashboardCertificadosProps> = ({
  data,
  cargando,
  pagina,
  onCambiarPagina
}) => {
  if (cargando) {
    return <div className="bg-white rounded-xl p-8 text-center text-slate-400 text-sm">Cargando certificados...</div>;
  }

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPaginas = Math.ceil(total / (data?.limite || 20));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Certificados Registrados</h3>
          <p className="text-sm text-slate-500">Listado oficial de certificados GLP, GNV y Conformidad</p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-full">
          Total: {total}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs">
            <tr>
              <th className="py-2.5 px-3">ID / Certificado</th>
              <th className="py-2.5 px-3">Tipo</th>
              <th className="py-2.5 px-3">Placa / Vehículo</th>
              <th className="py-2.5 px-3">Sede</th>
              <th className="py-2.5 px-3">Estado</th>
              <th className="py-2.5 px-3 text-right">Total S/.</th>
              <th className="py-2.5 px-3">Fecha Creación</th>
              <th className="py-2.5 px-3">Usuario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No hay certificados registrados en este período.
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    <div>#{c.id}</div>
                    {c.numeroCertificado && (
                      <div className="text-xs text-blue-700 font-mono">{c.numeroCertificado}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-700">{c.tipoCertificado}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                      {c.placa || 'SIN PLACA'}
                    </span>
                    {c.marca && <div className="text-xs text-slate-400">{c.marca} {c.modelo}</div>}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{c.plantaNombre}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        c.estado === 'EMITIDO'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : c.estado === 'ANULADO'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                    S/ {c.importeTotal.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {new Date(c.fechaCreacion).toLocaleDateString('es-PE')}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono text-xs">
                    {c.usuarioCreacion}
                  </td>
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
