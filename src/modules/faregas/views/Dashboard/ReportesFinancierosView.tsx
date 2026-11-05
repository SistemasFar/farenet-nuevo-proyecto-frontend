import React, { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import type { MainLayoutContext } from './MainLayout';
import { faregasDashboardApi, type FiltrosDashboard } from '../../services/faregas-dashboard.api';
import { exportarDashboardExcel } from '../../utils/faregas-dashboard-exportacion';
import { exportarReporteFinanciero } from '../../utils/faregas-reporte-financiero';
import { exportarDocumentosEmitidosExtendido } from '../../utils/faregas-documentos-emitidos-extendido';
import { exportarResumenMensualFacturacion } from '../../utils/faregas-resumen-mensual-facturacion';
import { exportarRegistroVentasTributario } from '../../utils/faregas-registro-ventas-tributario';
import { validarRangoFechasDashboard } from '../../utils/faregas-dashboard-fechas';
import { resolverPermisosDashboard } from './dashboard-config';

const REPORTES = [
  { id: 'consolidado', nombre: 'Reporte financiero consolidado', disponible: true },
  { id: 'documentos', nombre: 'Documentos emitidos — Extendido', disponible: true },
  { id: 'resumen', nombre: 'Resumen mensual de facturación', disponible: true },
  { id: 'tributario', nombre: 'Registro de ventas tributario', disponible: true }
] as const;

export const ReportesFinancierosView: React.FC = () => {
  const navigate = useNavigate();
  const context = useOutletContext<MainLayoutContext>();
  const perfilId = context.user?.perfilId || (context.user as any)?.perfil_id;
  const { puedeVerGlobal, puedeExportar } = resolverPermisosDashboard(context.permisos, perfilId);
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [plantaKey, setPlantaKey] = useState('');
  const [reporte, setReporte] = useState<string>(REPORTES[0].id);
  const [exportando, setExportando] = useState(false);
  const [exportandoAnterior, setExportandoAnterior] = useState(false);
  const [tipoExportacion, setTipoExportacion] = useState<'consolidado' | 'documentos' | 'resumen' | 'tributario' | null>(null);
  const reporteSeleccionado = useMemo(() => REPORTES.find((item) => item.id === reporte), [reporte]);
  const habilitado = Boolean(reporteSeleccionado?.disponible && puedeExportar);

  const descargarConsolidado = async () => {
    const filtros: FiltrosDashboard = {
      alcance: puedeVerGlobal ? 'GLOBAL' : 'SEDE',
      desde: `${anio}-${String(mes).padStart(2, '0')}-01`,
      hasta: `${anio}-${String(mes).padStart(2, '0')}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`,
      ...(plantaKey ? { plantaKey } : {})
    };
    const validacion = validarRangoFechasDashboard(filtros.desde || '', filtros.hasta || '');
    if (!validacion.valido) {
      window.alert(validacion.mensaje || 'El período seleccionado no es válido para exportar.');
      return;
    }
    setExportando(true);
    try {
      const datos = await faregasDashboardApi.obtenerReporteFinanciero(filtros);
      exportarReporteFinanciero(datos);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error inesperado al exportar Excel.';
      window.alert(`No se pudo exportar el reporte: ${mensaje}`);
    } finally {
      setExportando(false);
    }
  };

  const descargarExportacionAnterior = async () => {
    const filtros: FiltrosDashboard = {
      alcance: puedeVerGlobal ? 'GLOBAL' : 'SEDE',
      desde: `${anio}-${String(mes).padStart(2, '0')}-01`,
      hasta: `${anio}-${String(mes).padStart(2, '0')}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`,
      ...(plantaKey ? { plantaKey } : {})
    };
    setExportandoAnterior(true);
    try {
      const datos = await faregasDashboardApi.obtenerExportacion(filtros);
      exportarDashboardExcel(datos, filtros);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error inesperado al exportar Excel.';
      window.alert(`No se pudo exportar la versión anterior: ${mensaje}`);
    } finally {
      setExportandoAnterior(false);
    }
  };

  const descargarDocumentosEmitidos = async () => {
    const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`;
    const filtros: FiltrosDashboard = {
      alcance: puedeVerGlobal ? 'GLOBAL' : 'SEDE', desde, hasta,
      ...(plantaKey ? { plantaKey } : {})
    };
    const validacion = validarRangoFechasDashboard(desde, hasta);
    if (!validacion.valido) {
      window.alert(validacion.mensaje || 'El período seleccionado no es válido para exportar.');
      return;
    }
    setTipoExportacion('documentos');
    try {
      const datos = await faregasDashboardApi.obtenerDocumentosEmitidosExtendido(filtros);
      exportarDocumentosEmitidosExtendido(datos, desde, hasta);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error inesperado al exportar documentos.';
      window.alert(`No se pudo exportar documentos emitidos: ${mensaje}`);
    } finally {
      setTipoExportacion(null);
    }
  };

  const descargarResumenMensual = async () => {
    const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`;
    const filtros: FiltrosDashboard = { alcance: puedeVerGlobal ? 'GLOBAL' : 'SEDE', desde, hasta, ...(plantaKey ? { plantaKey } : {}) };
    const validacion = validarRangoFechasDashboard(desde, hasta);
    if (!validacion.valido) { window.alert(validacion.mensaje || 'El período seleccionado no es válido para exportar.'); return; }
    setTipoExportacion('resumen');
    try {
      const datos = await faregasDashboardApi.obtenerResumenMensualFacturacion(filtros);
      exportarResumenMensualFacturacion(datos, `${anio}-${String(mes).padStart(2, '0')}`);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error inesperado al exportar el resumen mensual.';
      window.alert(`No se pudo exportar el resumen mensual: ${mensaje}`);
    } finally { setTipoExportacion(null); }
  };

  const descargarRegistroTributario = async () => {
    const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const hasta = `${anio}-${String(mes).padStart(2, '0')}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`;
    const filtros: FiltrosDashboard = { alcance: puedeVerGlobal ? 'GLOBAL' : 'SEDE', desde, hasta, ...(plantaKey ? { plantaKey } : {}) };
    const validacion = validarRangoFechasDashboard(desde, hasta);
    if (!validacion.valido) { window.alert(validacion.mensaje || 'El período seleccionado no es válido para exportar.'); return; }
    setTipoExportacion('tributario');
    try {
      const datos = await faregasDashboardApi.obtenerRegistroVentasTributario(filtros);
      exportarRegistroVentasTributario(datos, `${anio}-${String(mes).padStart(2, '0')}`);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error inesperado al exportar el registro tributario.';
      window.alert(`No se pudo exportar el registro de ventas: ${mensaje}`);
    } finally { setTipoExportacion(null); }
  };

  const descargarReporteSeleccionado = () => {
    if (reporte === 'documentos') return void descargarDocumentosEmitidos();
    if (reporte === 'resumen') return void descargarResumenMensual();
    if (reporte === 'tributario') return void descargarRegistroTributario();
    return void descargarConsolidado();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <header className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <button type="button" onClick={() => navigate('/faregas/dashboard')} className="mb-3 text-sm font-semibold text-blue-700 hover:text-blue-900">← Volver al Dashboard</button>
        <h1 className="text-2xl font-bold text-slate-900">Reportes financieros</h1>
        <p className="mt-1 text-sm text-slate-500">Selecciona el período, la sede y el reporte que necesitas.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Filtros del reporte">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold text-slate-700">Mes
            <select value={mes} onChange={(event) => setMes(Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
              {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(new Date(2024, value - 1, 1))}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">Año
            <select value={anio} onChange={(event) => setAnio(Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
              {Array.from({ length: 7 }, (_, index) => hoy.getFullYear() - index).map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
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

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <button type="button" disabled={!habilitado || exportando || Boolean(tipoExportacion)} onClick={descargarReporteSeleccionado} className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${habilitado && !exportando && !tipoExportacion ? 'bg-emerald-700 hover:bg-emerald-800' : 'cursor-not-allowed bg-slate-300'}`}>
            {exportando || tipoExportacion ? 'Generando Excel…' : 'Descargar reporte'}
          </button>
          {reporteSeleccionado && !reporteSeleccionado.disponible && <span className="text-sm font-medium text-amber-700">Próximamente</span>}
          {reporteSeleccionado?.disponible && !puedeExportar && <span className="text-sm text-slate-500">No tienes permiso para exportar este reporte.</span>}
          {reporteSeleccionado?.disponible && puedeExportar && <span className="text-sm text-slate-500">{reporte === 'documentos' ? 'Reproduce las 56 columnas del modelo; las líneas se separan para evitar repetir importes. Para NC la fecha de emisión queda vacía; el período se filtra por fecha de aceptación y se muestra aparte.' : reporte === 'resumen' ? 'Efectividad = aceptados SUNAT en producción / documentos del período. DEMO y estados adicionales no se clasifican como aceptados; NC se filtran por aceptación, sin sustituir su fecha de emisión.' : reporte === 'tributario' ? 'Libro de revisión contable; no es un PLE oficial certificado para SUNAT. Clasificaciones sin dato fiscal explícito quedan vacías. En NC, emisión queda vacía y aceptación se indica en Estado.' : 'Se descargará el Excel consolidado.'}</span>}
        </div>
        {puedeExportar && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <button type="button" disabled={exportandoAnterior} onClick={() => void descargarExportacionAnterior()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
              {exportandoAnterior ? 'Generando…' : 'Descargar Excel anterior del Dashboard'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
