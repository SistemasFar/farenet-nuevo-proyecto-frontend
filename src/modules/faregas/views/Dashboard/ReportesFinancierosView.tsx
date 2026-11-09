import React, { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { MainLayoutContext } from './MainLayout';
import { faregasDashboardApi, type FiltrosDashboard } from '../../services/faregas-dashboard.api';
import { exportarDocumentosEmitidosExtendido } from '../../utils/faregas-documentos-emitidos-extendido';
import { exportarResumenDashboard } from '../../utils/faregas-resumen-dashboard';
import { exportarResumenMensualFacturacion } from '../../utils/faregas-resumen-mensual-facturacion';
import { obtenerFechaHoyLima, validarRangoFechasDashboard } from '../../utils/faregas-dashboard-fechas';
import { resolverPermisosDashboard } from './dashboard-config';

const REPORTES = [
  { id: 'documentos', nombre: 'Documentos emitidos — Extendido', disponible: true },
  { id: 'resumen', nombre: 'Resumen mensual de facturación', disponible: true },
  { id: 'dashboard', nombre: 'Resumen Dashboard', disponible: true }
] as const;

export const ReportesFinancierosView: React.FC = () => {
  const navigate = useNavigate();
  const context = useOutletContext<MainLayoutContext>();
  const perfilId = context.user?.perfilId || (context.user as any)?.perfil_id;
  const { puedeVerGlobal, puedeExportar } = resolverPermisosDashboard(context.permisos, perfilId);
  const hoyLima = obtenerFechaHoyLima();
  const [desde, setDesde] = useState(hoyLima);
  const [hasta, setHasta] = useState(hoyLima);
  const [plantaKey, setPlantaKey] = useState('');
  const [reporte, setReporte] = useState<string>(REPORTES[0].id);
  const [exportando, setExportando] = useState(false);
  const [tipoExportacion, setTipoExportacion] = useState<'documentos' | 'resumen' | 'dashboard' | null>(null);
  const reporteSeleccionado = useMemo(() => REPORTES.find((item) => item.id === reporte), [reporte]);
  const validacionRango = useMemo(() => validarRangoFechasDashboard(desde, hasta), [desde, hasta]);
  const rangoValido = validacionRango.valido;
  const mensajeRango = rangoValido ? '' : (validacionRango.mensaje || 'El rango de fechas no es válido. Selecciona un rango de máximo 30 días calendario (inclusivos).');
  const habilitado = Boolean(reporteSeleccionado?.disponible && puedeExportar && rangoValido);

  const filtrosPeriodo = (): FiltrosDashboard => ({
    alcance: puedeVerGlobal ? 'GLOBAL' : 'SEDE', desde, hasta,
    ...(plantaKey ? { plantaKey } : {})
  });

  const descargarResumenDashboard = async () => {
    const filtros = filtrosPeriodo();
    if (!rangoValido) { window.alert(mensajeRango); return; }
    setTipoExportacion('dashboard');
    try {
      const datos = await faregasDashboardApi.obtenerExportacion(filtros);
      exportarResumenDashboard(datos, filtros);
    } catch (error) {
      window.alert(`No se pudo exportar el Resumen Dashboard: ${error instanceof Error ? error.message : 'Error inesperado.'}`);
    } finally { setTipoExportacion(null); }
  };

  const descargarDocumentosEmitidos = async () => {
    const filtros: FiltrosDashboard = {
      alcance: puedeVerGlobal ? 'GLOBAL' : 'SEDE', desde, hasta,
      ...(plantaKey ? { plantaKey } : {})
    };
    if (!rangoValido) { window.alert(mensajeRango); return; }
    setTipoExportacion('documentos');
    try {
      const [extendido, consolidado] = await Promise.all([
        faregasDashboardApi.obtenerDocumentosEmitidosExtendido(filtros),
        faregasDashboardApi.obtenerReporteFinanciero(filtros)
      ]);
      exportarDocumentosEmitidosExtendido(extendido, desde, hasta, consolidado);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error inesperado al exportar documentos.';
      window.alert(`No se pudo exportar documentos emitidos: ${mensaje}`);
    } finally {
      setTipoExportacion(null);
    }
  };

  const descargarResumenMensual = async () => {
    const filtros: FiltrosDashboard = { alcance: puedeVerGlobal ? 'GLOBAL' : 'SEDE', desde, hasta, ...(plantaKey ? { plantaKey } : {}) };
    if (!rangoValido) { window.alert(mensajeRango); return; }
    setTipoExportacion('resumen');
    try {
      const datos = await faregasDashboardApi.obtenerResumenMensualFacturacion(filtros);
      const periodo = desde.slice(0, 7) === hasta.slice(0, 7) ? desde.slice(0, 7) : `${desde} a ${hasta}`;
      exportarResumenMensualFacturacion(datos as any, periodo);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error inesperado al exportar el resumen mensual.';
      window.alert(`No se pudo exportar el resumen mensual: ${mensaje}`);
    } finally { setTipoExportacion(null); }
  };

  const descargarReporteSeleccionado = () => {
    if (reporte === 'resumen') return void descargarResumenMensual();
    if (reporte === 'dashboard') return void descargarResumenDashboard();
    return void descargarDocumentosEmitidos();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <header className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <button type="button" onClick={() => navigate('/faregas/dashboard')} className="mb-3 text-sm font-semibold text-blue-700 hover:text-blue-900">← Volver al Dashboard</button>
        <h1 className="text-2xl font-bold text-slate-900">Reportes financieros</h1>
        <p className="mt-1 text-sm text-slate-500">Selecciona el rango de fechas (máximo 30 días calendario), la sede y el reporte que necesitas.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Filtros del reporte">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold text-slate-700">Fecha desde
            <input type="date" value={desde} max={hasta || undefined} onChange={(event) => setDesde(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-semibold text-slate-700">Fecha hasta
            <input type="date" value={hasta} min={desde || undefined} onChange={(event) => setHasta(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-semibold text-slate-700">Sede
            <select value={plantaKey} onChange={(event) => setPlantaKey(event.target.value)} disabled={!puedeVerGlobal} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal disabled:bg-slate-100">
              {puedeVerGlobal ? <option value="">Todas las sedes autorizadas</option> : <option value={context.plantaKey}>{context.plantaNombre}</option>}
              {context.plantasDisponibles.map((planta) => <option key={planta.key} value={planta.key}>{planta.nombre}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">Reporte
            <select value={reporte} onChange={(event) => setReporte(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
              {REPORTES.map((item) => <option key={item.id} value={item.id}>{item.nombre}{!item.disponible ? ' — Próximamente' : ''}</option>)}
            </select>
          </label>
        </div>
        {!rangoValido && mensajeRango && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{mensajeRango}{validacionRango.fechaMaximaPermitida ? ` Fecha máxima permitida: ${validacionRango.fechaMaximaPermitida}.` : ''}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <button type="button" disabled={!habilitado || exportando || Boolean(tipoExportacion)} onClick={descargarReporteSeleccionado} className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${habilitado && !exportando && !tipoExportacion ? 'bg-emerald-700 hover:bg-emerald-800' : 'cursor-not-allowed bg-slate-300'}`}>
            {exportando || tipoExportacion ? 'Generando Excel…' : 'Descargar reporte'}
          </button>
          {reporteSeleccionado && !reporteSeleccionado.disponible && <span className="text-sm font-medium text-amber-700">Próximamente</span>}
          {reporteSeleccionado?.disponible && !puedeExportar && <span className="text-sm text-slate-500">No tienes permiso para exportar este reporte.</span>}
          {reporteSeleccionado?.disponible && puedeExportar && <span className="text-sm text-slate-500">{reporte === 'documentos' ? 'Reporte unificado: incluye todo el detalle de Documentos emitidos — Extendido (65 columnas fiscales/comerciales) + Auditoría financiera (consolidado: sede, cliente, certificado, chip, pagos, saldos, estados y totales). Sin pérdida de información de ninguno de los dos reportes. Para NC la fecha de emisión queda vacía; el período se filtra por fecha de aceptación y se muestra aparte.' : reporte === 'resumen' ? 'Efectividad = aceptados SUNAT en producción / documentos del período. DEMO y estados adicionales no se clasifican como aceptados; NC se filtran por aceptación, sin sustituir su fecha de emisión. Si el rango es parcial (no mes completo), se muestra como período personalizado.' : 'Incluye las métricas y tablas de Resumen General, Ventas y Productos, Certificados, y Cobranza y Facturación con las definiciones actuales del Dashboard.'}</span>}
        </div>
      </section>
    </div>
  );
};
