import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { MainLayoutContext } from './MainLayout';
import {
  faregasDashboardApi,
  type DashboardResumenResponse,
  type SedeDetalleItem,
  type CertificadoDetalleItem,
  type ProductoDetalleItem,
  type ComprobanteDetalleItem,
  type PagoDetalleItem,
  type DescuentoDetalleItem,
  type UsuarioDetalleItem,
  type PaginadoResponse,
  type FiltrosDashboard
} from '../../services/faregas-dashboard.api';
import { exportarExcelVariasHojas, type ExcelSheetDefinition } from '../../utils/exportar-excel';

import { DashboardFiltros } from './components/DashboardFiltros';
import { DashboardKpis } from './components/DashboardKpis';
import { DashboardGraficos } from './components/DashboardGraficos';
import { DashboardCertificados } from './components/DashboardCertificados';
import { DashboardVentas } from './components/DashboardVentas';
import { DashboardFacturacion } from './components/DashboardFacturacion';
import { DashboardPagos } from './components/DashboardPagos';
import { DashboardDescuentos } from './components/DashboardDescuentos';
import { DashboardSedes } from './components/DashboardSedes';
import { DashboardUsuarios } from './components/DashboardUsuarios';

type TabId = 'resumen' | 'sedes' | 'certificados' | 'ventas' | 'facturacion' | 'pagos' | 'descuentos' | 'usuarios';

export const FaregasDashboardView: React.FC = () => {
  const context = useOutletContext<MainLayoutContext>();
  const user = context?.user;
  const permisos = context?.permisos || [];
  const plantaActiva = context?.plantaSeleccionada;
  const plantasDisponibles = context?.plantasDisponibles || [];

  const puedeVerGlobal = permisos.includes('DASHBOARD_GLOBAL') || user?.perfilId === 'SISTEMAS' || user?.perfil_id === 'SISTEMAS';
  const puedeExportar = permisos.includes('DASHBOARD_EXPORTAR') || user?.perfilId === 'SISTEMAS' || user?.perfil_id === 'SISTEMAS';

  const [tabActiva, setTabActiva] = useState<TabId>('resumen');

  // Inicialización de fechas a los últimos 30 días
  const [filtros, setFiltros] = useState<FiltrosDashboard>(() => {
    const hoy = new Date();
    const d30 = new Date();
    d30.setDate(d30.getDate() - 29);
    const formato = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return {
      alcance: puedeVerGlobal ? 'GLOBAL' : 'SEDE',
      desde: formato(d30),
      hasta: formato(hoy),
      pagina: 1,
      limite: 20
    };
  });

  // Estados de datos
  const [resumen, setResumen] = useState<DashboardResumenResponse | null>(null);
  const [sedes, setSedes] = useState<SedeDetalleItem[]>([]);
  const [certificados, setCertificados] = useState<PaginadoResponse<CertificadoDetalleItem> | null>(null);
  const [ventas, setVentas] = useState<PaginadoResponse<ProductoDetalleItem> | null>(null);
  const [comprobantes, setComprobantes] = useState<PaginadoResponse<ComprobanteDetalleItem> | null>(null);
  const [pagos, setPagos] = useState<PaginadoResponse<PagoDetalleItem> | null>(null);
  const [descuentos, setDescuentos] = useState<PaginadoResponse<DescuentoDetalleItem> | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioDetalleItem[]>([]);

  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setErrorMsg(null);
    try {
      const [resResumen, resSedes, resCerts, resVentas, resComprobantes, resPagos, resDescuentos, resUsuarios] = await Promise.all([
        faregasDashboardApi.obtenerResumen(filtros),
        faregasDashboardApi.obtenerSedes(filtros),
        faregasDashboardApi.obtenerCertificados(filtros),
        faregasDashboardApi.obtenerProductos(filtros),
        faregasDashboardApi.obtenerComprobantes(filtros),
        faregasDashboardApi.obtenerPagos(filtros),
        faregasDashboardApi.obtenerDescuentos(filtros),
        faregasDashboardApi.obtenerUsuarios(filtros)
      ]);

      setResumen(resResumen);
      setSedes(resSedes);
      setCertificados(resCerts);
      setVentas(resVentas);
      setComprobantes(resComprobantes);
      setPagos(resPagos);
      setDescuentos(resDescuentos);
      setUsuarios(resUsuarios);
    } catch (err: unknown) {
      console.error('Error cargando datos del dashboard:', err);
      const msg = err instanceof Error ? err.message : 'Error al cargar las métricas del dashboard.';
      setErrorMsg(msg);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void cargarDatos();
    }, 0);
    return () => clearTimeout(timer);
  }, [cargarDatos]);

  const handleCambiarFiltros = (nuevos: Partial<FiltrosDashboard>) => {
    setFiltros(prev => ({ ...prev, ...nuevos, pagina: 1 }));
  };

  const handleExportarExcel = async () => {
    if (!puedeExportar) {
      alert('No tiene permiso DASHBOARD_EXPORTAR para descargar el reporte.');
      return;
    }

    setExportando(true);
    try {
      const h = await faregasDashboardApi.exportarTodo(filtros);

      const sheets: ExcelSheetDefinition[] = [
        {
          name: 'Resumen Ejecutivo',
          headers: ['Indicador', 'Valor', 'Período Anterior', 'Variación %'],
          rows: [
            { Indicador: 'Venta Operativa Generada', Valor: `S/ ${(h.resumen.kpis.ventaOperativaGenerada.actual || 0).toFixed(2)}`, 'Período Anterior': `S/ ${(h.resumen.kpis.ventaOperativaGenerada.anterior || 0).toFixed(2)}`, 'Variación %': `${h.resumen.kpis.ventaOperativaGenerada.variacionPorcentaje || 0}%` },
            { Indicador: 'Venta Pagada', Valor: `S/ ${(h.resumen.kpis.ventaPagada.actual || 0).toFixed(2)}`, 'Período Anterior': `S/ ${(h.resumen.kpis.ventaPagada.anterior || 0).toFixed(2)}`, 'Variación %': `${h.resumen.kpis.ventaPagada.variacionPorcentaje || 0}%` },
            { Indicador: 'Venta Facturada', Valor: `S/ ${(h.resumen.kpis.ventaFacturada.actual || 0).toFixed(2)}`, 'Período Anterior': `S/ ${(h.resumen.kpis.ventaFacturada.anterior || 0).toFixed(2)}`, 'Variación %': `${h.resumen.kpis.ventaFacturada.variacionPorcentaje || 0}%` },
            { Indicador: 'Cobrado (Caja/Bancos)', Valor: `S/ ${(h.resumen.kpis.cobrado.actual || 0).toFixed(2)}`, 'Período Anterior': `S/ ${(h.resumen.kpis.cobrado.anterior || 0).toFixed(2)}`, 'Variación %': `${h.resumen.kpis.cobrado.variacionPorcentaje || 0}%` },
            { Indicador: 'Saldo Pendiente', Valor: `S/ ${(h.resumen.kpis.saldoPendiente.actual || 0).toFixed(2)}`, 'Período Anterior': `S/ ${(h.resumen.kpis.saldoPendiente.anterior || 0).toFixed(2)}`, 'Variación %': `${h.resumen.kpis.saldoPendiente.variacionPorcentaje || 0}%` },
            { Indicador: 'Venta Bruta (con Dscto)', Valor: `S/ ${(h.resumen.kpis.ventaBruta.actual || 0).toFixed(2)}`, 'Período Anterior': `S/ ${(h.resumen.kpis.ventaBruta.anterior || 0).toFixed(2)}`, 'Variación %': `${h.resumen.kpis.ventaBruta.variacionPorcentaje || 0}%` },
            { Indicador: 'Descuentos Otorgados', Valor: `S/ ${(h.resumen.kpis.descuentos.actual || 0).toFixed(2)}`, 'Período Anterior': `S/ ${(h.resumen.kpis.descuentos.anterior || 0).toFixed(2)}`, 'Variación %': `${h.resumen.kpis.descuentos.variacionPorcentaje || 0}%` },
            { Indicador: 'Venta Neta', Valor: `S/ ${(h.resumen.kpis.ventaNeta.actual || 0).toFixed(2)}`, 'Período Anterior': `S/ ${(h.resumen.kpis.ventaNeta.anterior || 0).toFixed(2)}`, 'Variación %': `${h.resumen.kpis.ventaNeta.variacionPorcentaje || 0}%` },
            { Indicador: 'Certificados Emitidos', Valor: h.resumen.kpis.certificadosEmitidos.actual || 0, 'Período Anterior': h.resumen.kpis.certificadosEmitidos.anterior || 0, 'Variación %': `${h.resumen.kpis.certificadosEmitidos.variacionPorcentaje || 0}%` },
            { Indicador: 'Ticket Promedio', Valor: `S/ ${(h.resumen.kpis.ticketPromedio.actual || 0).toFixed(2)}`, 'Período Anterior': `S/ ${(h.resumen.kpis.ticketPromedio.anterior || 0).toFixed(2)}`, 'Variación %': `${h.resumen.kpis.ticketPromedio.variacionPorcentaje || 0}%` },
            { Indicador: 'Operaciones Comerciales', Valor: h.resumen.kpis.operacionesTotal.actual || 0, 'Período Anterior': h.resumen.kpis.operacionesTotal.anterior || 0, 'Variación %': `${h.resumen.kpis.operacionesTotal.variacionPorcentaje || 0}%` }
          ]
        },
        {
          name: 'Sedes',
          headers: [
            'Sede ID', 'Código Sede', 'Nombre Sede', 'Certificados',
            'Venta Operativa (S/)', 'Cobrado (S/)', 'Saldo Pendiente (S/)',
            'Descuentos (S/)', 'Participación %'
          ],
          rows: h.sedes.map(s => ({
            'Sede ID': String(s.sedeId),
            'Código Sede': String(s.codigoSede || ''),
            'Nombre Sede': s.nombreSede,
            'Certificados': s.certificadosTotal,
            'Venta Operativa (S/)': Number(s.ventaOperativa.toFixed(2)),
            'Cobrado (S/)': Number(s.cobrado.toFixed(2)),
            'Saldo Pendiente (S/)': Number(s.saldoPendiente.toFixed(2)),
            'Descuentos (S/)': Number(s.descuentos.toFixed(2)),
            'Participación %': Number(s.porcentajeParticipacion.toFixed(1))
          }))
        },
        {
          name: 'Certificados',
          headers: [
            'ID', 'Fecha Emisión', 'Sede', 'Tipo Certificado', 'Número Certificado',
            'Placa', 'VIN', 'Marca', 'Modelo', 'Cliente', 'Documento',
            'Precio (S/)', 'Estado Emisión', 'Estado Pago', 'Comprobante', 'Operador'
          ],
          rows: h.certificados.map(c => ({
            'ID': String(c.id),
            'Fecha Emisión': c.fechaEmision ? c.fechaEmision.substring(0, 19).replace('T', ' ') : '',
            'Sede': c.nombreSede,
            'Tipo Certificado': c.tipoCertificado,
            'Número Certificado': String(c.numeroCertificado || ''),
            'Placa': String(c.placa || ''),
            'VIN': String(c.vin || ''),
            'Marca': c.marca || '',
            'Modelo': c.modelo || '',
            'Cliente': c.clienteNombre || '',
            'Documento': String(c.clienteDocumento || ''),
            'Precio (S/)': Number((c.precio || 0).toFixed(2)),
            'Estado Emisión': c.estado,
            'Estado Pago': c.estadoPago || '',
            'Comprobante': c.comprobante || '',
            'Operador': c.usuarioCreacion || ''
          }))
        },
        {
          name: 'Ventas por Producto',
          headers: [
            'SKU', 'Descripción', 'Tipo', 'Cantidad',
            'Importe Total (S/)', 'Ticket Promedio (S/)', 'Participación %'
          ],
          rows: h.ventasProductos.map(v => ({
            'SKU': String(v.codigo || ''),
            'Descripción': v.descripcion,
            'Tipo': v.tipo,
            'Cantidad': v.cantidadTotal,
            'Importe Total (S/)': Number(v.importeTotal.toFixed(2)),
            'Ticket Promedio (S/)': Number(v.ticketPromedio.toFixed(2)),
            'Participación %': Number(v.participacionPorcentaje.toFixed(1))
          }))
        },
        {
          name: 'Comprobantes Fiscales',
          headers: [
            'ID', 'Fecha Emisión', 'Sede', 'Tipo', 'Serie', 'Número',
            'Cliente RUC/DNI', 'Razón Social', 'Forma Pago',
            'Total (S/)', 'Estado SUNAT', 'PDF / CDR'
          ],
          rows: h.comprobantes.map(cp => ({
            'ID': String(cp.id),
            'Fecha Emisión': cp.fechaEmision ? cp.fechaEmision.substring(0, 19).replace('T', ' ') : '',
            'Sede': cp.nombreSede,
            'Tipo': cp.tipoComprobante,
            'Serie': String(cp.serie || ''),
            'Número': String(cp.numero || ''),
            'Cliente RUC/DNI': String(cp.clienteNumero || ''),
            'Razón Social': cp.clienteRazonSocial || '',
            'Forma Pago': cp.formaPago || '',
            'Total (S/)': Number(cp.total.toFixed(2)),
            'Estado SUNAT': cp.estadoSunat,
            'PDF / CDR': cp.tienePdf ? (cp.tieneCdr ? 'PDF+CDR' : 'Solo PDF') : 'Sin PDF'
          }))
        },
        {
          name: 'Cobranzas y Pagos',
          headers: [
            'ID', 'Fecha Pago', 'Sede', 'Medio Pago', 'Condición',
            'Monto (S/)', 'Referencia / Operación', 'Banco',
            'Orden ID', 'Estado Pago', 'Cajero / Usuario'
          ],
          rows: h.pagos.map(p => ({
            'ID': String(p.id),
            'Fecha Pago': p.fechaPago ? p.fechaPago.substring(0, 19).replace('T', ' ') : '',
            'Sede': p.nombreSede,
            'Medio Pago': p.medioPago,
            'Condición': p.condicion,
            'Monto (S/)': Number(p.monto.toFixed(2)),
            'Referencia / Operación': String(p.referencia || ''),
            'Banco': p.banco || '',
            'Orden ID': String(p.ordenPagoId || ''),
            'Estado Pago': p.estado,
            'Cajero / Usuario': p.usuario || ''
          }))
        },
        {
          name: 'Descuentos Aplicados',
          headers: [
            'ID Descuento', 'Código Cupón', 'Nombre Campaña', 'Tipo',
            'Valor Regla', 'Monto Descontado (S/)', 'Fecha Aplicación',
            'Sede', 'Comprobante', 'Usuario Autoriza'
          ],
          rows: h.descuentos.map(d => ({
            'ID Descuento': String(d.id),
            'Código Cupón': String(d.codigoCupon || ''),
            'Nombre Campaña': d.nombreCampana,
            'Tipo': d.tipoDescuento,
            'Valor Regla': Number(d.valorDescuento.toFixed(2)),
            'Monto Descontado (S/)': Number(d.montoDescontado.toFixed(2)),
            'Fecha Aplicación': d.fechaAplicacion ? d.fechaAplicacion.substring(0, 19).replace('T', ' ') : '',
            'Sede': d.nombreSede,
            'Comprobante': d.comprobante || '',
            'Usuario Autoriza': d.usuarioCreacion || ''
          }))
        },
        {
          name: 'Productividad Usuarios',
          headers: [
            'Usuario', 'Nombre Completo', 'Perfil', 'Sede Asignada',
            'Certificados Emitidos', 'Total Facturado (S/)', 'Cobrado (S/)'
          ],
          rows: h.usuarios.map(u => ({
            'Usuario': String(u.username),
            'Nombre Completo': u.nombreCompleto,
            'Perfil': u.perfil,
            'Sede Asignada': u.sede,
            'Certificados Emitidos': u.certificadosEmitidos,
            'Total Facturado (S/)': Number(u.totalFacturado.toFixed(2)),
            'Cobrado (S/)': Number(u.cobradoTotal.toFixed(2))
          }))
        }
      ];

      const nombreArchivo = `Faregas_Dashboard_${filtros.alcance}_${filtros.desde}_${filtros.hasta}.xlsx`;
      await exportarExcelVariasHojas(sheets, nombreArchivo);
    } catch (err: unknown) {
      console.error('Error al exportar reporte Excel multi-hoja:', err);
      const msg = err instanceof Error ? err.message : 'Error inesperado al exportar Excel.';
      alert(`No se pudo exportar el reporte: ${msg}`);
    } finally {
      setExportando(false);
    }
  };

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'resumen', label: 'Resumen Ejecutivo' },
    { id: 'sedes', label: 'Rendimiento por Sede', count: sedes.length },
    { id: 'certificados', label: 'Certificados', count: certificados?.total },
    { id: 'ventas', label: 'Ventas por Producto', count: ventas?.total },
    { id: 'facturacion', label: 'Comprobantes Fiscales', count: comprobantes?.total },
    { id: 'pagos', label: 'Cobranzas y Pagos', count: pagos?.total },
    { id: 'descuentos', label: 'Descuentos', count: descuentos?.total },
    { id: 'usuarios', label: 'Productividad por Usuario', count: usuarios.length }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Módulo FAREGAS
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">
              {filtros.alcance === 'GLOBAL' ? 'Consolidado Multisede' : `Sede: ${plantaActiva?.nombre || 'Sede Actual'}`}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Dashboard Operativo y Financiero
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas analíticas consolidadas, trazabilidad tributaria, cobranzas y control territorial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={cargando}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${cargando ? 'animate-spin text-blue-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>

          {puedeExportar && (
            <button
              type="button"
              onClick={handleExportarExcel}
              disabled={exportando || cargando}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {exportando ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              {exportando ? 'Exportando...' : 'Exportar Excel Completo (8 Hojas)'}
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Error si ocurre */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-start gap-3">
          <svg className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1 text-xs">
            <span className="font-bold">Error en la carga:</span> {errorMsg}
          </div>
        </div>
      )}

      {/* Barra de Filtros */}
      <DashboardFiltros
        filtros={filtros}
        onCambiarFiltros={handleCambiarFiltros}
        plantasDisponibles={plantasDisponibles}
        puedeVerGlobal={puedeVerGlobal}
        cargando={cargando}
      />

      {/* Navegación por Pestañas */}
      <div className="flex border-b border-slate-200 overflow-x-auto space-x-2">
        {tabs.map((tab) => {
          const activa = tabActiva === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabActiva(tab.id)}
              className={`whitespace-nowrap pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activa
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  activa ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contenido de la pestaña activa */}
      {tabActiva === 'resumen' && (
        <div className="space-y-6">
          <DashboardKpis kpis={resumen?.kpis} cargando={cargando} />

          {/* Advertencia si hay saldo pendiente con orden PAGADO */}
          {resumen?.inconsistencias && resumen.inconsistencias.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl">
              <div className="flex items-center gap-2 font-bold text-xs mb-1">
                <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Alertas de Inconsistencia Operativa Detectadas ({resumen.inconsistencias.length})
              </div>
              <p className="text-xs text-amber-700 mb-2">
                Se detectaron órdenes marcadas como PAGADO con saldo pendiente mayor a cero:
              </p>
              <ul className="list-disc list-inside text-xs space-y-1">
                {resumen.inconsistencias.map(inc => (
                  <li key={inc.ordenId}>
                    Orden #{inc.ordenId} - Sede: {inc.nombreSede} - Saldo pendiente: S/ {inc.saldoPendiente.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gráficos de evolución y distribución */}
          <DashboardGraficos
            serieDiaria={resumen?.serieDiaria || []}
            distribucionCertificados={resumen?.distribucionCertificados || []}
            distribucionPagos={resumen?.distribucionPagos || []}
          />
        </div>
      )}

      {tabActiva === 'sedes' && (
        <DashboardSedes sedes={sedes} cargando={cargando} />
      )}

      {tabActiva === 'certificados' && (
        <DashboardCertificados
          data={certificados}
          cargando={cargando}
          onCambiarPagina={(p) => handleCambiarFiltros({ pagina: p })}
        />
      )}

      {tabActiva === 'ventas' && (
        <DashboardVentas
          data={ventas}
          cargando={cargando}
          onCambiarPagina={(p) => handleCambiarFiltros({ pagina: p })}
        />
      )}

      {tabActiva === 'facturacion' && (
        <DashboardFacturacion
          data={comprobantes}
          cargando={cargando}
          onCambiarPagina={(p) => handleCambiarFiltros({ pagina: p })}
        />
      )}

      {tabActiva === 'pagos' && (
        <DashboardPagos
          data={pagos}
          cargando={cargando}
          onCambiarPagina={(p) => handleCambiarFiltros({ pagina: p })}
        />
      )}

      {tabActiva === 'descuentos' && (
        <DashboardDescuentos
          data={descuentos}
          cargando={cargando}
          onCambiarPagina={(p) => handleCambiarFiltros({ pagina: p })}
        />
      )}

      {tabActiva === 'usuarios' && (
        <DashboardUsuarios usuarios={usuarios} cargando={cargando} />
      )}
    </div>
  );
};
