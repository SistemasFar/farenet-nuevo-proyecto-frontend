import React from 'react';
import type { FiltrosDashboard } from '../../services/faregas-dashboard.api';
import type { PlantaAsignada } from '@/types/auth';

interface DashboardFiltrosProps {
  filtros: FiltrosDashboard;
  onCambiarFiltros: (nuevos: Partial<FiltrosDashboard>) => void;
  onActualizar: () => void;
  onExportar: () => void;
  exportando: boolean;
  plantasDisponibles: PlantaAsignada[];
  plantaActivaNombre: string;
  puedeVerGlobal: boolean;
}

export const DashboardFiltros: React.FC<DashboardFiltrosProps> = ({
  filtros,
  onCambiarFiltros,
  onActualizar,
  onExportar,
  exportando,
  plantasDisponibles,
  plantaActivaNombre,
  puedeVerGlobal
}) => {
  const aplicarRangoPredefinido = (tipo: string) => {
    const hoy = new Date();
    const formato = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dia}`;
    };

    let dDesde = new Date();
    let dHasta = new Date();

    if (tipo === 'HOY') {
      // hoy
    } else if (tipo === 'AYER') {
      dDesde.setDate(dDesde.getDate() - 1);
      dHasta.setDate(dHasta.getDate() - 1);
    } else if (tipo === '7D') {
      dDesde.setDate(dDesde.getDate() - 6);
    } else if (tipo === '30D') {
      dDesde.setDate(dDesde.getDate() - 29);
    } else if (tipo === 'MES_ACTUAL') {
      dDesde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    } else if (tipo === 'MES_ANTERIOR') {
      dDesde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      dHasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    }

    onCambiarFiltros({
      desde: formato(dDesde),
      hasta: formato(dHasta)
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Filtros de Análisis</h2>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Zona Horaria: <strong className="text-slate-700">America/Lima (UTC-5)</strong></span>
              <span>•</span>
              {filtros.alcance === 'SEDE' ? (
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                  SEDE ACTIVA: {plantaActivaNombre}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                  ALCANCE GLOBAL ({plantasDisponibles.length} sedes autorizadas)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex flex-wrap items-center gap-2">
          {puedeVerGlobal && (
            <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 text-xs font-medium">
              <button
                type="button"
                onClick={() => onCambiarFiltros({ alcance: 'GLOBAL', plantaKey: undefined })}
                className={`px-3 py-1.5 rounded-md transition ${
                  filtros.alcance === 'GLOBAL'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Global Multi-Sede
              </button>
              <button
                type="button"
                onClick={() => onCambiarFiltros({ alcance: 'SEDE' })}
                className={`px-3 py-1.5 rounded-md transition ${
                  filtros.alcance === 'SEDE'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Sede
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onActualizar}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>

          <button
            type="button"
            onClick={onExportar}
            disabled={exportando}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exportando ? 'Generando Excel...' : '↓ Exportar Excel'}
          </button>
        </div>
      </div>

      {/* Botones de atajo temporal */}
      <div className="flex flex-wrap items-center gap-1.5 pt-3 pb-3 text-xs border-b border-slate-100">
        <span className="text-slate-400 font-medium mr-1">Rango rápido:</span>
        {[
          { id: 'HOY', label: 'Hoy' },
          { id: 'AYER', label: 'Ayer' },
          { id: '7D', label: 'Últimos 7 días' },
          { id: '30D', label: 'Últimos 30 días' },
          { id: 'MES_ACTUAL', label: 'Mes actual' },
          { id: 'MES_ANTERIOR', label: 'Mes anterior' }
        ].map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => aplicarRangoPredefinido(btn.id)}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition text-xs font-medium"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Selectores de fecha y filtros de negocio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Desde (00:00:00)</label>
          <input
            type="date"
            value={filtros.desde || ''}
            onChange={(e) => onCambiarFiltros({ desde: e.target.value })}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Hasta (23:59:59)</label>
          <input
            type="date"
            value={filtros.hasta || ''}
            onChange={(e) => onCambiarFiltros({ hasta: e.target.value })}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {filtros.alcance === 'GLOBAL' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Filtrar Sede</label>
            <select
              value={filtros.plantaKey || ''}
              onChange={(e) => onCambiarFiltros({ plantaKey: e.target.value || undefined })}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
            >
              <option value="">Todas las sedes autorizadas</option>
              {plantasDisponibles.map((p) => (
                <option key={p.key} value={p.key}>{p.nombre}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Sede de Sesión</label>
            <input
              type="text"
              readOnly
              value={plantaActivaNombre}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-medium cursor-not-allowed"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Certificado</label>
          <select
            value={filtros.tipoCertificado || ''}
            onChange={(e) => onCambiarFiltros({ tipoCertificado: e.target.value || undefined })}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
          >
            <option value="">Todos los tipos</option>
            <option value="GLP_ANUAL">GLP Anual</option>
            <option value="GLP_INICIAL">GLP Inicial</option>
            <option value="GNV_ANUAL">GNV Anual</option>
            <option value="GNV_INICIAL">GNV Inicial</option>
            <option value="CONFORMIDAD">Conformidad</option>
          </select>
        </div>
      </div>
    </div>
  );
};
