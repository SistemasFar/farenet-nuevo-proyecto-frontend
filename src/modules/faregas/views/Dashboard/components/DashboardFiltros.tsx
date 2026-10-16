import React from 'react';
import type { FiltrosDashboard } from '../../../services/faregas-dashboard.api';
import type { PlantaAsignada } from '@/types/auth';
import { validarRangoFechasDashboard, obtenerRangoRapido } from '../../../utils/faregas-dashboard-fechas';

interface DashboardFiltrosProps {
  filtros: FiltrosDashboard;
  onCambiarFiltros: (nuevos: Partial<FiltrosDashboard>) => void;
  onActualizar: () => void;
  onExportar: () => void;
  exportando: boolean;
  cargando: boolean;
  plantasDisponibles: PlantaAsignada[];
  plantaActivaNombre: string;
  puedeVerGlobal: boolean;
  puedeExportar: boolean;
  tiposCertificadoDisponibles?: string[];
}

export const DashboardFiltros: React.FC<DashboardFiltrosProps> = ({
  filtros,
  onCambiarFiltros,
  onActualizar,
  onExportar,
  exportando,
  cargando,
  plantasDisponibles,
  plantaActivaNombre,
  puedeVerGlobal,
  puedeExportar,
  tiposCertificadoDisponibles = ['GLP', 'GNV', 'CONFORMIDAD', 'COMPLEMENTARIOS']
}) => {
  const validacionRango = validarRangoFechasDashboard(filtros.desde || '', filtros.hasta || '');
  const esRangoValido = validacionRango.valido;

  const aplicarRangoPredefinido = (tipo: 'HOY' | 'AYER' | '7D' | '30D' | 'MES_ACTUAL' | 'MES_ANTERIOR') => {
    const { desde, hasta } = obtenerRangoRapido(tipo);
    onCambiarFiltros({
      desde,
      hasta
    });
  };
  const rangosRapidos: Array<{ id: Parameters<typeof aplicarRangoPredefinido>[0]; label: string }> = [
    { id: 'HOY', label: 'Hoy' },
    { id: 'AYER', label: 'Ayer' },
    { id: '7D', label: 'Últimos 7 días' },
    { id: '30D', label: 'Últimos 30 días' },
    { id: 'MES_ACTUAL', label: 'Mes actual' },
    { id: 'MES_ANTERIOR', label: 'Mes anterior' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-3 py-2.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Filtros de Análisis</h2>
            <div className="text-sm text-slate-500 flex flex-wrap items-center gap-2">
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
            <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 text-sm font-medium">
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
            disabled={cargando || !esRangoValido}
            title={!esRangoValido ? (validacionRango.mensaje || 'Período no permitido') : 'Actualizar métricas'}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-white text-sm font-semibold rounded-lg shadow-sm transition ${
              cargando || !esRangoValido
                ? 'bg-slate-400 cursor-not-allowed opacity-60'
                : 'bg-slate-800 hover:bg-slate-900'
            }`}
          >
            <svg className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>

          {puedeExportar && (
            <button
              type="button"
              onClick={onExportar}
              disabled={exportando || !esRangoValido}
              title={!esRangoValido ? (validacionRango.mensaje || 'Período no permitido') : 'Exportar reporte consolidado'}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-white text-sm font-semibold rounded-lg shadow-sm transition ${
                exportando || !esRangoValido
                  ? 'bg-emerald-300 cursor-not-allowed opacity-60'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exportando ? 'Generando Excel...' : '↓ Exportar Excel'}
            </button>
          )}
        </div>
      </div>

      {/* Botones de atajo temporal */}
      <div className="flex flex-wrap items-center gap-1.5 py-2 text-sm border-b border-slate-100">
        <span className="text-slate-400 font-medium mr-1">Rango rápido:</span>
        {rangosRapidos.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => aplicarRangoPredefinido(btn.id)}
            className="px-2.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition text-sm font-medium"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Selectores de fecha y filtros de negocio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Desde (00:00:00)</label>
          <input
            type="date"
            value={filtros.desde || ''}
            onChange={(e) => onCambiarFiltros({ desde: e.target.value })}
            className={`w-full px-3 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-1 ${
              !esRangoValido
                ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:ring-rose-500'
                : 'border-slate-300 focus:ring-blue-600'
            }`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Hasta (23:59:59)</label>
          <input
            type="date"
            value={filtros.hasta || ''}
            onChange={(e) => onCambiarFiltros({ hasta: e.target.value })}
            className={`w-full px-3 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-1 ${
              !esRangoValido
                ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:ring-rose-500'
                : 'border-slate-300 focus:ring-blue-600'
            }`}
          />
        </div>

        {filtros.alcance === 'GLOBAL' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Filtrar Sede</label>
            <select
              value={filtros.plantaKey || ''}
              onChange={(e) => onCambiarFiltros({ plantaKey: e.target.value || undefined })}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
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
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-medium cursor-not-allowed"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Certificado</label>
          <select
            value={filtros.tipoCertificado || ''}
            onChange={(e) => onCambiarFiltros({ tipoCertificado: e.target.value || undefined })}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
          >
            <option value="">Todos los tipos</option>
            {tiposCertificadoDisponibles.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo.replaceAll('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerta visible cuando el rango de fechas es inválido */}
      {!esRangoValido && (
        <div
          role="alert"
          className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2 text-xs font-semibold"
        >
          <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{validacionRango.mensaje || 'El período máximo permitido es de un mes. Selecciona un rango de fechas más corto.'}</span>
        </div>
      )}
    </div>
  );
};
