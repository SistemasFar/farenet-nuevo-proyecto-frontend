import React from 'react';
import type { ComprobanteDetalleItem, PaginadoResponse } from '../../../services/faregas-dashboard.api';

interface DashboardFacturacionProps {
  data: PaginadoResponse<ComprobanteDetalleItem> | null;
  cargando: boolean;
  pagina: number;
  onCambiarPagina: (p: number) => void;
}

export const DashboardFacturacion: React.FC<DashboardFacturacionProps> = ({
  data,
  cargando,
  pagina,
  onCambiarPagina
}) => {
  if (cargando) {
    return <div className="bg-white rounded-xl p-8 text-center text-slate-400 text-sm">Cargando comprobantes...</div>;
  }

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPaginas = Math.ceil(total / (data?.limite || 20));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Comprobantes Fiscales</h3>
          <p className="text-sm text-slate-500">Facturas, Boletas y Notas de Crédito emitidas ante SUNAT</p>
        </div>
        <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-full">
          Total: {total}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs">
            <tr>
              <th className="py-2.5 px-3">Comprobante</th>
              <th className="py-2.5 px-3">Cliente</th>
              <th className="py-2.5 px-3">Condición</th>
              <th className="py-2.5 px-3">Sede</th>
              <th className="py-2.5 px-3">Estado SUNAT</th>
              <th className="py-2.5 px-3 text-right">Base Imp.</th>
              <th className="py-2.5 px-3 text-right">IGV</th>
              <th className="py-2.5 px-3 text-right">Total S/.</th>
              <th className="py-2.5 px-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  No hay comprobantes en este período.
                </td>
              </tr>
            ) : (
              items.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-800 font-mono">{f.nroComprobante || `${f.serie}-${f.numero}`}</span>
                    <div className="text-xs text-slate-400">{f.tipoComprobante}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-800">{f.cliente}</div>
                    <div className="text-xs text-slate-400 font-mono">{f.documentoCliente}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                      {f.condicionPago || 'CONTADO'}
                    </span>
                    {f.condicionPago === 'CREDITO' && f.cuotasCantidad > 0 && (
                      <div className="mt-1 text-xs text-slate-500">
                        <div>{f.cuotasCantidad} cuota{f.cuotasCantidad === 1 ? '' : 's'} · S/ {f.cuotasImporteProgramado.toFixed(2)}</div>
                        {f.proximoVencimiento && (
                          <div>Próx. venc.: {new Date(f.proximoVencimiento).toLocaleDateString('es-PE')}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{f.plantaNombre}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        f.estado === 'ACEPTADO'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : f.estado === 'RECHAZADO' || f.estado === 'ERROR'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {f.estado}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">S/ {f.baseImponible.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">S/ {f.igv.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800">S/ {f.importeTotal.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-slate-500">{new Date(f.fechaCreacion).toLocaleDateString('es-PE')}</td>
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
