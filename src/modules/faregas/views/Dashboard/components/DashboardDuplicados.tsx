import React from 'react';
import type { DuplicadoDetalleItem, PaginadoResponse } from '../../../services/faregas-dashboard.api';

interface DashboardDuplicadosProps {
  data: PaginadoResponse<DuplicadoDetalleItem> | null;
  cargando: boolean;
  pagina: number;
  onCambiarPagina: (p: number) => void;
}

export const DashboardDuplicados: React.FC<DashboardDuplicadosProps> = ({
  data,
  cargando,
  pagina,
  onCambiarPagina
}) => {
  if (cargando) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
        Cargando historial de duplicados...
      </div>
    );
  }

  const items = data?.items || [];
  const total = data?.total || 0;
  const limite = data?.limite || 20;
  const totalPaginas = Math.ceil(total / limite);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Historial de duplicados emitidos</h3>
          <p className="text-sm text-slate-500">
            Registro cronológico oficial de certificados duplicados emitidos y facturados
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          Total: {total}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-3 py-2.5">Fecha Emisión</th>
              <th className="px-3 py-2.5">Sede</th>
              <th className="px-3 py-2.5">Placa</th>
              <th className="px-3 py-2.5">Certificado Original</th>
              <th className="px-3 py-2.5 text-center">N.º Duplicado</th>
              <th className="px-3 py-2.5">Tipo Certificado</th>
              <th className="px-3 py-2.5 text-right">Importe Facturado</th>
              <th className="px-3 py-2.5">Comprobante</th>
              <th className="px-3 py-2.5">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  No hay duplicados emitidos en este período.
                </td>
              </tr>
            ) : (
              items.map((d) => (
                <tr key={d.id} className="transition hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-slate-600">
                    <div>
                      {d.fechaEmisionDuplicado
                        ? new Date(d.fechaEmisionDuplicado).toLocaleDateString('es-PE', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })
                        : '—'}
                    </div>
                    {d.fechaEmisionDuplicado && (
                      <div className="text-xs text-slate-400">
                        {new Date(d.fechaEmisionDuplicado).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">
                    <div>{d.plantaNombre}</div>
                    <div className="font-mono text-xs text-slate-400">Key: {d.plantaKey}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-800">
                      {d.placa || 'SIN PLACA'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-blue-700">
                    {d.numeroCertificadoOriginal || `ID #${d.certificadoOriginalId}`}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                      Duplicado #{d.numeroDuplicado}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-slate-700">{d.tipoCertificado}</span>
                    <div className="text-xs text-slate-400">{d.tipoNombre}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                    S/ {d.importe.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {d.numeroComprobante ? (
                      <div>
                        <span className="font-semibold text-slate-700">{d.numeroComprobante}</span>
                        <div className="text-slate-400">{d.tipoComprobante}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        d.estado === 'DISPONIBLE'
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {d.estado}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs text-slate-600">
          <div>
            Página <span className="font-bold text-slate-800">{pagina}</span> de{' '}
            <span className="font-bold text-slate-800">{totalPaginas}</span> ({total} duplicados)
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={() => onCambiarPagina(pagina - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium transition hover:bg-slate-50 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => onCambiarPagina(pagina + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium transition hover:bg-slate-50 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
