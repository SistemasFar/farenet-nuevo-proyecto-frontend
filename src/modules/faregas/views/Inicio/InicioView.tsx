import { useEffect, useMemo, useRef, useState } from 'react';
import { faregasCertificadosApi } from '../../services/faregas-certificados.api';

import { useNavigate, useOutletContext } from 'react-router-dom';
import type { MainLayoutContext } from '../Dashboard/MainLayout';
import type { FacturacionFaregas } from '../../types/faregas-api';
import Swal from 'sweetalert2';
import { FileText, XCircle, FileEdit, ArrowRight, Edit, Eye } from 'lucide-react';

interface FiltrosPanel { busqueda: string; estado: string; fechaDesde: string; fechaHasta: string; }

interface BorradorPanel {
  id: number;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  placa?: string;
  clienteDocumento?: string;
  clienteNombre?: string;
  conceptoVehicular?: string;
  pasoActual?: string;
  estado?: string;
  estadoPago?: string;
  estadoFacturacion?: string;
}

const normalizarTexto = (valor?: string | null): string => {
  if (!valor || valor.trim() === '') return '-';
  return valor.trim();
};

const obtenerClaseBadge = (valor?: string | null): string => {

  const estado = normalizarTexto(valor).toUpperCase();

  if (
    estado.includes('FINALIZADO') ||
    estado.includes('APROBADO') ||
    estado.includes('VIGENTE')
  ) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  if (
    estado.includes('ANULADO') ||
    estado.includes('DESAPROBADO') ||
    estado.includes('VENCIDO') ||
    estado.includes('INACTIVO')
  ) {
    return 'bg-red-50 text-red-700 border-red-200';
  }

  if (
    estado.includes('PROCESO') ||
    estado.includes('PENDIENTE') ||
    estado.includes('NUEVO')
  ) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return 'bg-slate-50 text-slate-700 border-slate-200';
};

function BadgeEstado({ value }: { value?: string | null }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${obtenerClaseBadge(
        value
      )}`}
    >
      {normalizarTexto(value)}
    </span>
  );
}

const PASO_PANEL: Record<string, string> = {
  DATOS_INICIALES: 'Datos iniciales',
  PAGO: 'Pago pendiente',
  VEHICULO: 'Vehículo y datos técnicos',
  FACTURACION: 'Facturación pendiente',
  PREVISUALIZACION: 'Previsualización del certificado',
  VERIFICACION_EMISION: 'Verificación / emisión',
};

const formatearFecha = (valor?: string) => {
  if (!valor) return '-';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleString('es-PE');
};

const obtenerFechaLocal = () => {
  const ahora = new Date();
  const fechaLocal = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000);
  return fechaLocal.toISOString().slice(0, 10);
};

const filtrosDelDia = (): FiltrosPanel => {
  const hoy = obtenerFechaLocal();
  return { busqueda: '', estado: 'TODOS', fechaDesde: hoy, fechaHasta: hoy };
};

export function InicioView() {
  const navigate = useNavigate();
  const { plantaKey: plantaSeleccionada } = useOutletContext<MainLayoutContext>();
  const [borradores, setBorradores] = useState<BorradorPanel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accionEnProceso, setAccionEnProceso] = useState<number | null>(null);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [filtros, setFiltros] = useState<FiltrosPanel>(filtrosDelDia);
  const filtrosRef = useRef(filtros);

  useEffect(() => {
    filtrosRef.current = filtros;
  }, [filtros]);
  const puedeConsultar = useMemo(() => {
    return plantaSeleccionada && plantaSeleccionada.trim() !== '';
  }, [plantaSeleccionada]);



  const cargarInspecciones = async (
    _paginaConsulta = page,
    pageSizeConsulta = pageSize
  ) => {
    if (!puedeConsultar) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await faregasCertificadosApi.obtenerBorradores(
        _paginaConsulta,
        pageSizeConsulta,
        filtrosRef.current.busqueda,
        filtrosRef.current.fechaDesde,
        filtrosRef.current.fechaHasta,
        filtrosRef.current.estado
      );
      setBorradores(response.data || []);
      setTotal(Number(response.total || 0));
      setPage(Number(response.page || _paginaConsulta));
      setPageSize(pageSizeConsulta);
      setTotalPages(Math.max(1, Number(response.totalPages || 1)));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al cargar borradores.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarInspecciones(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantaSeleccionada]);
  const handleFiltroChange = (
    field: keyof FiltrosPanel,
    value: string
  ) => {
    setFiltros((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const aplicarFiltros = () => {
    if (!filtros.fechaDesde || !filtros.fechaHasta) {
      setError('Debe seleccionar las fechas Desde y Hasta.');
      return;
    }
    if (filtros.fechaDesde > filtros.fechaHasta) {
      setError('La fecha Desde no puede ser posterior a la fecha Hasta.');
      return;
    }
    setPage(1);
    cargarInspecciones(1, pageSize);
  };

  const limpiarFiltros = () => {
    const limpios = filtrosDelDia();
    setFiltros(limpios);
    filtrosRef.current = limpios;

    setPage(1);

    setTimeout(() => {
      cargarInspecciones(1, pageSize);
    }, 0);
  };

  const cambiarPageSize = (nuevoPageSize: number) => {
    setPageSize(nuevoPageSize);
    setPage(1);
    cargarInspecciones(1, nuevoPageSize);
  };

  const irPaginaAnterior = () => {
    if (page <= 1) return;

    const nuevaPagina = page - 1;
    setPage(nuevaPagina);
    cargarInspecciones(nuevaPagina, pageSize);
  };

  const irPaginaSiguiente = () => {
    if (page >= totalPages) return;

    const nuevaPagina = page + 1;
    setPage(nuevaPagina);
    cargarInspecciones(nuevaPagina, pageSize);
  };

  const registroInicio =
    total === 0 ? 0 : (page - 1) * pageSize + 1;

  const registroFin = Math.min(page * pageSize, total);

  const obtenerFacturacion = async (certificadoId: number): Promise<FacturacionFaregas | null> => {
    const response = await faregasCertificadosApi.obtenerFacturacion(certificadoId);
    return (response.data?.facturacion || null) as FacturacionFaregas | null;
  };

  const comprobarComprobanteAceptado = async (certificadoId: number) => {
    const facturacion = await obtenerFacturacion(certificadoId);
    if (!facturacion || facturacion.estado !== 'ACEPTADO' || facturacion.aceptadaSunat !== true) {
      await Swal.fire({
        icon: 'info',
        title: 'Comprobante no disponible',
        text: 'Este certificado no tiene una boleta o factura aceptada por Nubefact/SUNAT. La emisión realizada en modo desarrollo solo emitió el certificado.',
        confirmButtonColor: '#052A79',
      });
      return null;
    }
    return facturacion;
  };

  const verComprobante = async (certificadoId: number) => {
    try {
      setAccionEnProceso(certificadoId);
      const facturacion = await comprobarComprobanteAceptado(certificadoId);
      if (!facturacion) return;
      if (!facturacion.enlacePdf) {
        await Swal.fire('PDF no disponible', 'El comprobante está aceptado, pero Nubefact no devolvió un enlace PDF.', 'warning');
        return;
      }
      window.open(facturacion.enlacePdf, '_blank', 'noopener,noreferrer');
    } catch (err) {
      await Swal.fire('No se pudo consultar', err instanceof Error ? err.message : 'No se pudo obtener el comprobante.', 'error');
    } finally {
      setAccionEnProceso(null);
    }
  };

  const anularComprobante = async (certificadoId: number) => {
    try {
      setAccionEnProceso(certificadoId);
      const facturacion = await comprobarComprobanteAceptado(certificadoId);
      if (!facturacion) return;
      const confirmacion = await Swal.fire({
        icon: 'warning',
        title: `🚫 Anular ${facturacion.nroComprobante || 'comprobante'}`,
        input: 'text',
        inputLabel: 'Motivo de la anulación',
        inputPlaceholder: 'Ingrese el motivo',
        showCancelButton: true,
        confirmButtonText: 'SOLICITAR ANULACIÓN',
        cancelButtonText: 'CANCELAR',
        confirmButtonColor: '#dc2626',
        inputValidator: value => !value.trim()
          ? 'El motivo es obligatorio.'
          : value.trim().length > 100 ? 'El motivo admite como máximo 100 caracteres.' : undefined,
      });
      if (!confirmacion.isConfirmed) return;
      await faregasCertificadosApi.generarAnulacionElectronica(certificadoId, {
        tipoDocumento: 'FACTURACION',
        motivo: String(confirmacion.value).trim(),
      });
      await Swal.fire('Solicitud registrada', 'La anulación fue enviada. Su aceptación debe consultarse posteriormente.', 'success');
    } catch (err) {
      await Swal.fire('No se pudo anular', err instanceof Error ? err.message : 'La solicitud de anulación falló.', 'error');
    } finally {
      setAccionEnProceso(null);
    }
  };

  const crearNotaCredito = async (certificadoId: number) => {
    try {
      setAccionEnProceso(certificadoId);
      const facturacion = await comprobarComprobanteAceptado(certificadoId);
      if (!facturacion) return;
      const totalOriginal = Number(facturacion.importeTotal);
      const formulario = await Swal.fire({
        icon: 'warning',
        title: `📝 Nota de crédito para ${facturacion.nroComprobante || 'comprobante'}`,
        html: `
          <label for="nota-motivo" style="display:block;text-align:left;font-size:12px;font-weight:700;margin:8px 0 4px">MOTIVO</label>
          <select id="nota-motivo" class="swal2-input" style="width:100%;margin:0">
            <option value="1">1 — Anulación de la operación</option>
            <option value="2">2 — Anulación por error en el RUC</option>
            <option value="3">3 — Corrección por error en la descripción</option>
            <option value="4">4 — Descuento global</option>
            <option value="5">5 — Descuento por ítem</option>
            <option value="6">6 — Devolución total</option>
            <option value="7">7 — Devolución por ítem</option>
            <option value="8">8 — Bonificación</option>
            <option value="9">9 — Disminución en el valor</option>
            <option value="10">10 — Otros conceptos</option>
          </select>
          <label for="nota-importe" style="display:block;text-align:left;font-size:12px;font-weight:700;margin:16px 0 4px">IMPORTE TOTAL</label>
          <input id="nota-importe" class="swal2-input" type="number" min="0.01" max="${totalOriginal.toFixed(2)}" step="0.01" value="${totalOriginal.toFixed(2)}" style="width:100%;margin:0" />
          <label for="nota-sustento" style="display:block;text-align:left;font-size:12px;font-weight:700;margin:16px 0 4px">SUSTENTO</label>
          <textarea id="nota-sustento" class="swal2-textarea" maxlength="250" placeholder="Explique el motivo de la nota" style="width:100%;margin:0"></textarea>
        `,
        showCancelButton: true,
        confirmButtonText: 'CREAR NOTA DE CRÉDITO',
        cancelButtonText: 'CANCELAR',
        confirmButtonColor: '#052A79',
        focusConfirm: false,
        preConfirm: () => {
          const motivoCodigo = (document.getElementById('nota-motivo') as HTMLSelectElement | null)?.value || '';
          const importeTotal = Number((document.getElementById('nota-importe') as HTMLInputElement | null)?.value);
          const sustento = (document.getElementById('nota-sustento') as HTMLTextAreaElement | null)?.value.trim() || '';
          if (!Number.isFinite(importeTotal) || importeTotal <= 0 || importeTotal > totalOriginal) {
            Swal.showValidationMessage(`El importe debe ser mayor a cero y no superar S/ ${totalOriginal.toFixed(2)}.`);
            return false;
          }
          if (!sustento) {
            Swal.showValidationMessage('El sustento es obligatorio.');
            return false;
          }
          return { motivoCodigo, importeTotal, sustento };
        },
      });
      if (!formulario.isConfirmed || !formulario.value) return;
      const importeTotal = Number(formulario.value.importeTotal);
      const proporcion = importeTotal / totalOriginal;
      const baseImponible = Math.round(Number(facturacion.baseImponible) * proporcion * 100) / 100;
      const igv = Math.round((importeTotal - baseImponible) * 100) / 100;
      await faregasCertificadosApi.emitirNotaElectronica(certificadoId, {
        tipo: 'CREDITO',
        motivoCodigo: formulario.value.motivoCodigo,
        sustento: formulario.value.sustento,
        baseImponible,
        igv,
        importeTotal,
      });
      await Swal.fire('Nota procesada', 'La nota de crédito fue registrada. Revise posteriormente su estado SUNAT.', 'success');
    } catch (err) {
      await Swal.fire('No se pudo crear la nota', err instanceof Error ? err.message : 'La creación de la nota de crédito falló.', 'error');
    } finally {
      setAccionEnProceso(null);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Panel principal de operación</h1>
        <p className="text-sm text-gray-500">Nuevos registros de certificados</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-6">
          <input
            type="text"
            value={filtros.busqueda}
            onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
            placeholder="Buscar por placa, DNI, RUC o nombre del cliente"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79] md:col-span-2"
          />
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-gray-500">Desde</span>
            <input
              type="date"
              value={filtros.fechaDesde}
              max={filtros.fechaHasta || undefined}
              onChange={(e) => handleFiltroChange('fechaDesde', e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-gray-500">Hasta</span>
            <input
              type="date"
              value={filtros.fechaHasta}
              min={filtros.fechaDesde || undefined}
              onChange={(e) => handleFiltroChange('fechaHasta', e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79]"
            />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button
              type="button"
              onClick={aplicarFiltros}
              disabled={loading || !puedeConsultar}
              className="rounded-lg bg-[#052A79] px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={limpiarFiltros}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="flex flex-col justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Total registros
          </p>
          <p className="text-lg font-bold text-gray-800">{total}</p>
        </div>

        <div className="flex flex-col justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Página actual
          </p>
          <p className="text-lg font-bold text-gray-800">
            {page} / {totalPages || 1}
          </p>
        </div>

        <div className="flex flex-col justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Mostrando
          </p>
          <p className="text-lg font-bold text-gray-800">
            {registroInicio}-{registroFin}
          </p>
        </div>

        <div className="flex flex-col justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase text-gray-500">
            Registros por página
          </p>
          <select
            value={pageSize}
            onChange={(e) => cambiarPageSize(Number(e.target.value))}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 outline-none focus:border-[#052A79]"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="flex flex-col justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase text-gray-500">
            Estado de Certificado
          </p>
          <select
            value={filtros.estado}
            onChange={(e) => handleFiltroChange('estado', e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 outline-none focus:border-[#052A79]"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="EMITIDO">Emitido</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <span className="font-semibold text-gray-700">Certificados registrados</span>
          <button
            type="button"
            onClick={() => navigate('/faregas/certificados/nuevo')}
            className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
          >
            + Nuevo Certificado
          </button>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="min-w-[1400px] w-full border-collapse text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">
                  N° Inspección
                </th>
                <th className="px-4 py-3 text-left">
                  Fecha y hora
                </th>
                <th className="px-4 py-3 text-left">
                  Placa
                </th>
                <th className="px-4 py-3 text-left">
                  DNI / RUC
                </th>
                <th className="px-4 py-3 text-left">
                  Nombres / Razón Social
                </th>
                <th className="px-4 py-3 text-left">
                  Concepto vehicular
                </th>
                
                <th className="px-4 py-3 text-left">
                  Estado actual
                </th>
                <th className="px-4 py-3 text-left">
                  Resultado
                </th>
                <th className="px-4 py-3 text-left">
                  Estado certificado
                </th>
                <th className="px-4 py-3 text-center">
                  Acción
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-8 text-center text-slate-500 font-medium"
                  >
                    Cargando borradores...
                  </td>
                </tr>
              )}

              {!loading && borradores.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    No hay borradores activos o pendientes para esta sede.
                  </td>
                </tr>
              )}

              {!loading &&
                borradores.map((ins) => {
                  const etapa = PASO_PANEL[ins.pasoActual || ''] || 'Datos iniciales';

                  return (
                    <tr
                      key={ins.id}
                      className="text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap text-blue-700`}>
                        BORRADOR #{ins.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500" title={ins.fechaActualizacion ? `Última actualización: ${formatearFecha(ins.fechaActualizacion)}` : undefined}>
                        {formatearFecha(ins.fechaCreacion)}
                      </td>
                      <td className="px-4 py-3 font-bold whitespace-nowrap">
                        {normalizarTexto(ins.placa)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {normalizarTexto(ins.clienteDocumento)}
                      </td>
                      <td className="px-4 py-3 min-w-[220px]">
                        {normalizarTexto(ins.clienteNombre)}
                      </td>
                      <td className="px-4 py-3 min-w-[180px]">
                        {normalizarTexto(ins.conceptoVehicular)}
                      </td>
                      
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-700">
                          {etapa}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <BadgeEstado value="Pendiente" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <BadgeEstado value={ins.estado} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center align-middle">
                        <div className="flex h-full flex-wrap items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/faregas/certificados/${ins.id}/continuar`)}
                            className="rounded-md border border-yellow-300 bg-yellow-50 px-2.5 py-1.5 text-base text-[#052A79] transition-colors hover:bg-yellow-100"
                            title={ins.estado === 'EMITIDO' ? 'Ver' : 'Continuar editando'}
                          >
                            {ins.estado === 'EMITIDO' ? <Eye size={18} /> : <Edit size={18} />}
                          </button>
                          {ins.estado === 'EMITIDO' && <>
                            <button
                              type="button"
                              disabled={accionEnProceso === ins.id}
                              onClick={() => void verComprobante(ins.id)}
                              title="Ver comprobante"
                              className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-base text-[#052A79] hover:bg-blue-100 disabled:opacity-50"
                            ><FileText size={18} /></button>
                            <button
                              type="button"
                              disabled={accionEnProceso === ins.id}
                              onClick={() => void anularComprobante(ins.id)}
                              title="Anular comprobante"
                              className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-base text-[#052A79] hover:bg-red-100 disabled:opacity-50"
                            ><XCircle size={18} /></button>
                            <button
                              type="button"
                              disabled={accionEnProceso === ins.id}
                              onClick={() => void crearNotaCredito(ins.id)}
                              title="Crear nota de crédito"
                              className="rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-base text-[#052A79] hover:bg-violet-100 disabled:opacity-50"
                            ><FileEdit size={18} /></button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
          <div>
            Mostrando{' '}
            <span className="font-semibold text-gray-700">
              {registroInicio}
            </span>{' '}
            a{' '}
            <span className="font-semibold text-gray-700">
              {registroFin}
            </span>{' '}
            de{' '}
            <span className="font-semibold text-gray-700">
              {total}
            </span>{' '}
            registros.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={irPaginaAnterior}
              disabled={loading || page <= 1}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>

            <span className="text-[11px] font-semibold text-gray-500">
              Página {page} de {totalPages || 1}
            </span>

            <button
              type="button"
              onClick={irPaginaSiguiente}
              disabled={loading || page >= totalPages}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>


      </div>
    </div>
  );
}
