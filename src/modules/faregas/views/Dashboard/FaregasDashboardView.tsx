import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { MainLayoutContext } from './MainLayout';
import { faregasDashboardApi, type FiltrosDashboard } from '../../services/faregas-dashboard.api';
import { exportarDashboardExcel } from '../../utils/faregas-dashboard-exportacion';
import { obtenerRangoRapido, validarRangoFechasDashboard } from '../../utils/faregas-dashboard-fechas';
import { CertificadosTab } from './components/CertificadosTab';
import { CobranzaFacturacionTab } from './components/CobranzaFacturacionTab';
import { DashboardFiltros } from './components/DashboardFiltros';
import { ResumenGeneralTab } from './components/ResumenGeneralTab';
import { VentasProductosTab } from './components/VentasProductosTab';
import { DASHBOARD_TAB_CONFIG, resolverPermisosDashboard } from './dashboard-config';
import { useFaregasDashboardData, type DashboardTabId } from './hooks/useFaregasDashboardData';

export const FaregasDashboardView: React.FC = () => {
  const context = useOutletContext<MainLayoutContext>();
  const user = context?.user;
  const permisos = context?.permisos || [];
  const plantaActiva = context?.plantaSeleccionada;
  const plantasDisponibles = context?.plantasDisponibles || [];

  const { puedeVerGlobal, puedeExportar } = resolverPermisosDashboard(permisos, user?.perfilId);
  const [tabActiva, setTabActiva] = useState<DashboardTabId>('resumen');
  const [exportando, setExportando] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosDashboard>(() => {
    const { desde, hasta } = obtenerRangoRapido('30D');
    return { alcance: puedeVerGlobal ? 'GLOBAL' : 'SEDE', desde, hasta };
  });

  const dashboard = useFaregasDashboardData(filtros, tabActiva);

  const handleCambiarFiltros = (nuevos: Partial<FiltrosDashboard>) => {
    dashboard.reiniciarPaginas();
    setFiltros((actuales) => ({ ...actuales, ...nuevos }));
  };

  const handleExportarExcel = async () => {
    if (!puedeExportar) {
      alert('No tiene permiso DASHBOARD_EXPORTAR para descargar el reporte.');
      return;
    }

    const validacion = validarRangoFechasDashboard(filtros.desde || '', filtros.hasta || '');
    if (!validacion.valido) {
      alert(validacion.mensaje || 'El período máximo permitido es de un mes. Selecciona un rango de fechas más corto.');
      return;
    }

    setExportando(true);
    try {
      const reporte = await faregasDashboardApi.obtenerExportacion(filtros);
      exportarDashboardExcel(reporte, filtros);
    } catch (error: unknown) {
      console.error('Error al exportar reporte Excel multi-hoja:', error);
      const mensaje = error instanceof Error ? error.message : 'Error inesperado al exportar Excel.';
      alert(`No se pudo exportar el reporte: ${mensaje}`);
    } finally {
      setExportando(false);
    }
  };

  const conteos: Partial<Record<DashboardTabId, number | undefined>> = {
    ventas: dashboard.ventas?.total,
    certificados: dashboard.certificados?.total,
    cobranza: dashboard.comprobantes?.total
  };
  const tabs = DASHBOARD_TAB_CONFIG.map((tab) => ({ ...tab, count: conteos[tab.id] }));

  return (
    <div className="space-y-4 pb-6 font-sans text-sm">
      <header className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            Módulo FAREGAS
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs font-medium text-slate-500">
            {filtros.alcance === 'GLOBAL' ? 'Consolidado Multisede' : `Sede: ${plantaActiva?.nombre || 'Sede Actual'}`}
          </span>
        </div>
        <h1 className="mt-1 text-xl font-bold text-slate-900">Dashboard Operativo y Financiero</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Métricas consolidadas de operación, certificados, productos, facturación y cobranza.
        </p>
      </header>

      {dashboard.errorMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800" role="alert">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1 text-sm"><span className="font-bold">Error en la carga:</span> {dashboard.errorMsg}</div>
        </div>
      )}

      <DashboardFiltros
        filtros={filtros}
        onCambiarFiltros={handleCambiarFiltros}
        onActualizar={() => void dashboard.recargar()}
        onExportar={() => void handleExportarExcel()}
        exportando={exportando}
        plantasDisponibles={plantasDisponibles}
        plantaActivaNombre={plantaActiva?.nombre || 'Sede Actual'}
        puedeVerGlobal={puedeVerGlobal}
        puedeExportar={puedeExportar}
        cargando={dashboard.cargando}
        tiposCertificadoDisponibles={dashboard.resumen?.distribucionCertificados.map((item) => item.tipo)}
      />

      <nav className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Secciones del dashboard">
        {tabs.map((tab) => {
          const activa = tabActiva === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabActiva(tab.id)}
              aria-current={activa ? 'page' : undefined}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${activa
                ? 'border-blue-700 bg-blue-700 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold">{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${activa ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {tab.count}
                  </span>
                )}
              </span>
              <span className={`mt-0.5 block text-xs ${activa ? 'text-blue-100' : 'text-slate-500'}`}>{tab.descripcion}</span>
            </button>
          );
        })}
      </nav>

      {tabActiva === 'resumen' && (
        <ResumenGeneralTab resumen={dashboard.resumen} sedes={dashboard.sedes} cargando={dashboard.cargando} />
      )}
      {tabActiva === 'ventas' && (
        <VentasProductosTab
          resumen={dashboard.resumen}
          ventas={dashboard.ventas}
          sedes={dashboard.sedes}
          usuarios={dashboard.usuarios}
          cargando={dashboard.cargando}
          productoIdSeleccionado={filtros.productoId}
          onSeleccionarProducto={(id) => handleCambiarFiltros({
            productoId: filtros.productoId === id ? undefined : id
          })}
        />
      )}
      {tabActiva === 'certificados' && (
        <CertificadosTab
          resumen={dashboard.resumen}
          certificados={dashboard.certificados}
          duplicados={dashboard.duplicados}
          sedes={dashboard.sedes}
          cargando={dashboard.cargando}
          tipoCertificadoSeleccionado={filtros.tipoCertificado}
          tipoDuplicadoSeleccionado={filtros.tipoDuplicado}
          onSeleccionarTipoCertificado={(tipo) => handleCambiarFiltros({
            tipoCertificado: filtros.tipoCertificado === tipo ? undefined : tipo
          })}
          onSeleccionarTipoDuplicado={(tipo) => handleCambiarFiltros({
            tipoDuplicado: filtros.tipoDuplicado === tipo ? undefined : tipo
          })}
          paginaCertificados={dashboard.paginas.certificados}
          paginaDuplicados={dashboard.paginas.duplicados}
          onCambiarPaginaCertificados={(pagina) => dashboard.cambiarPagina('certificados', pagina)}
          onCambiarPaginaDuplicados={(pagina) => dashboard.cambiarPagina('duplicados', pagina)}
        />
      )}
      {tabActiva === 'cobranza' && (
        <CobranzaFacturacionTab
          resumen={dashboard.resumen}
          comprobantes={dashboard.comprobantes}
          pagos={dashboard.pagos}
          descuentos={dashboard.descuentos}
          cargando={dashboard.cargando}
          paginaComprobantes={dashboard.paginas.comprobantes}
          paginaPagos={dashboard.paginas.pagos}
          onCambiarPaginaComprobantes={(pagina) => dashboard.cambiarPagina('comprobantes', pagina)}
          onCambiarPaginaPagos={(pagina) => dashboard.cambiarPagina('pagos', pagina)}
        />
      )}
    </div>
  );
};
