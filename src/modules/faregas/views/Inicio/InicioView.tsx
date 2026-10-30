import { useEffect, useMemo, useRef, useState } from 'react';
import { faregasCertificadosApi } from '../../services/faregas-certificados.api';

import { useNavigate, useOutletContext } from 'react-router-dom';
import type { MainLayoutContext } from '../Dashboard/MainLayout';
import type { FacturacionFaregas } from '../../types/faregas-api';
import Swal from 'sweetalert2';
import { FileText, FileEdit, Eye, Ban, RefreshCw, ClipboardX } from 'lucide-react';
import { nombreTipoCertificadoPanel } from './tipo-certificado-panel';
import { abrirPdfNotaCreditoNubefact, abrirPdfNubefact } from '../../services/faregas-comprobante-visor.service';
import { DuplicadoCertificadoModal } from './DuplicadoCertificadoModal';
import { SolicitudOperacionModal } from './SolicitudOperacionModal';
import { NotaCreditoModal } from './NotaCreditoModal';
import {
  estadoCertificadoPanel,
  estadoComprobantePanel,
} from '../../utils/documentos-electronicos';

interface FiltrosPanel { busqueda: string; estado: string; fechaDesde: string; fechaHasta: string; }

export interface BorradorPanel {
  id: number;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  fechaEmision?: string | null;
  numeroCertificado?: string | null;
  placa?: string;
  clienteDocumento?: string;
  clienteNombre?: string;
  propietarioTipoDocumento?: string | null;
  propietarioDocumento?: string | null;
  propietarioNombre?: string | null;
  facturacionTipoDocumento?: string | null;
  facturacionDocumento?: string | null;
  facturacionNombre?: string | null;
  tipoCertificadoClave?: string;
  modalidad?: string | null;
  conceptoVehicular?: string;
  pasoActual?: string;
  estado?: string;
  estadoPago?: string;
  estadoFacturacion?: string;
  aceptadaSunat?: boolean | null;
  entornoFacturador?: string | null;
  enlacePdf?: string | null;
  enlacePdfFaregas?: string | null;
  nroComprobante?: string | null;
  importeFinal?: number | string | null;
  anulacionImporteCero?: boolean | null;
  anulacionImporteNoDeterminable?: boolean | null;
  anulacionEnPlazo?: boolean | null;
  anulacionHastaMs?: number | string | null;
  anulacionId?: number | null;
  estadoAnulacion?: string | null;
  descripcionAnulacion?: string | null;
  solicitudOperacionId?: number | null;
  solicitudOperacionEstado?: string | null;
  solicitudOperacionTipo?: string | null;
  solicitudOperacionMotivo?: string | null;
  solicitudOperacionResultadoFiscal?: Record<string, unknown> | null;
  notaCreditoId?: number | null;
  estadoNotaCredito?: string | null;
  nroNotaCredito?: string | null;
  notaCreditoPdfDisponible?: boolean | null;
}

const normalizarTexto = (valor?: string | null): string => {
  if (!valor || valor.trim() === '') return '-';
  return valor.trim();
};

const formatearDocumento = (tipo?: string | null, numero?: string | null): string => {
  const documento = normalizarTexto(numero);
  if (documento === '-') return documento;
  const tipoDocumento = normalizarTexto(tipo);
  return tipoDocumento === '-' ? documento : `${tipoDocumento}: ${documento}`;
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
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize tracking-wide ${obtenerClaseBadge(
        value
      )}`}
    >
      {normalizarTexto(value)?.toLowerCase()}
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

const esComprobanteOperable = (facturacion: Pick<FacturacionFaregas, 'estado' | 'aceptadaSunat' | 'entornoFacturador' | 'enlacePdf' | 'enlaceXml' | 'nroComprobante'>) => {
  const entorno = String(facturacion.entornoFacturador || '').trim().toUpperCase();
  const aceptadoProduccion = facturacion.estado === 'ACEPTADO' && facturacion.aceptadaSunat === true;
  const generadoDemo = entorno === 'DEMO'
    && facturacion.estado === 'PENDIENTE_SUNAT'
    && Boolean(facturacion.nroComprobante)
    && Boolean(facturacion.enlacePdf || facturacion.enlaceXml);
  return aceptadoProduccion || generadoDemo;
};

const esResumenComprobanteOperable = (item: BorradorPanel) => {
  const entorno = String(item.entornoFacturador || '').trim().toUpperCase();
  const estado = String(item.estadoFacturacion || '').trim().toUpperCase();
  return (estado === 'ACEPTADO' && item.aceptadaSunat === true)
    || (entorno === 'DEMO' && estado === 'PENDIENTE_SUNAT' && Boolean(item.nroComprobante) && Boolean(item.enlacePdf));
};

const esAnulacionPendiente = (item: BorradorPanel) => ['BORRADOR', 'PENDIENTE']
  .includes(String(item.estadoAnulacion || '').trim().toUpperCase());

const esAnulacionAceptada = (item: BorradorPanel) => (
  String(item.estadoAnulacion || '').trim().toUpperCase() === 'ACEPTADO'
);

export const esNotaCreditoPendiente = (item: BorradorPanel) => {
  const estado = String(item.estadoNotaCredito || '').trim().toUpperCase();
  return estado === 'PENDIENTE' || estado === 'PENDIENTE_SUNAT' || estado === 'INCERTA' || estado === 'ERROR';
};

export const esNotaCreditoAceptada = (item: BorradorPanel) => (
  String(item.estadoNotaCredito || '').trim().toUpperCase() === 'ACEPTADA'
);

export const esNotaCreditoRechazada = (item: BorradorPanel) => (
  String(item.estadoNotaCredito || '').trim().toUpperCase() === 'RECHAZADA'
);

export const notaCreditoExiste = (item: BorradorPanel) => (
  Boolean(item.notaCreditoId) && Boolean(String(item.estadoNotaCredito || '').trim())
);

export const notaCreditoBloqueaOperacionesFiscales = (item: BorradorPanel) => {
  if (esNotaCreditoPendiente(item)) return true;
  if (esNotaCreditoAceptada(item)) return true;
  if (esNotaCreditoRechazada(item)) return true;
  return false;
};

export const etiquetaEstadoNotaCredito = (estado?: string | null): string => {
  switch (String(estado || '').trim().toUpperCase()) {
    case 'PENDIENTE': return 'Nota de Crédito Pendiente';
    case 'PENDIENTE_SUNAT': return 'Nota de Crédito Pendiente SUNAT';
    case 'ACEPTADA': return 'Nota de Crédito Aceptada';
    case 'RECHAZADA': return 'Nota de Crédito Rechazada';
    case 'ERROR': return 'Nota de Crédito Error';
    case 'INCERTA': return 'Nota de Crédito Estado Incierto';
    default: return 'Sin Nota de Crédito';
  }
};

export const claseEstadoNotaCredito = (estado?: string | null): string => {
  const estadoUpper = String(estado || '').trim().toUpperCase();
  if (estadoUpper === 'ACEPTADA') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (estadoUpper === 'RECHAZADA' || estadoUpper === 'ERROR') return 'bg-red-50 text-red-700 border-red-200';
  if (estadoUpper === 'PENDIENTE' || estadoUpper === 'PENDIENTE_SUNAT' || estadoUpper === 'INCERTA') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};


export const tieneCertificadoDefinitivo = (item: BorradorPanel) => {
  const estadoTecnico = String(item.estado || '').trim().toUpperCase();
  const tieneNumeroValido = Boolean(String(item.numeroCertificado || '').trim());
  return (estadoTecnico === 'EMITIDO' || estadoTecnico === 'ANULADO') && tieneNumeroValido;
};

export const certificadoEmitidoVisible = (item: BorradorPanel) => (
  String(item.estado || '').trim().toUpperCase() === 'EMITIDO'
  && Boolean(String(item.numeroCertificado || '').trim())
);

export const puedeCrearSolicitudAnulacion = (permisos: string[]) =>
  permisos.includes('FAREGAS_SOLICITUD_CREAR');

export const ESTADOS_SOLICITUD_ANULACION_ACTIVOS = [
  'PENDIENTE_APROBACION',
  'APROBADA',
  'EN_EJECUCION',
  'REQUIERE_INTERVENCION',
] as const;

export const esSolicitudActivaAnulacion = (estado?: string | null): boolean => (
  (ESTADOS_SOLICITUD_ANULACION_ACTIVOS as readonly string[]).includes(
    String(estado || '').trim().toUpperCase()
  )
);

export const esSolicitudCompletadaAnulacion = (estado?: string | null): boolean => (
  String(estado || '').trim().toUpperCase() === 'COMPLETADA'
);

export const etiquetaSolicitudAnulacion = (estado?: string | null): string => {
  switch (String(estado || '').trim().toUpperCase()) {
    case 'PENDIENTE_APROBACION': return 'Pendiente de aprobación';
    case 'APROBADA': return 'Aprobada — pendiente de ejecución';
    case 'EN_EJECUCION': return 'Baja fiscal pendiente de confirmación';
    case 'REQUIERE_INTERVENCION': return 'Requiere intervención';
    case 'COMPLETADA': return 'Anulado';
    case 'RECHAZADA': return 'Anulación rechazada';
    case 'CANCELADA': return 'Solicitud cancelada';
    case 'ERROR': return 'Error en anulación';
    default: return 'Sin solicitud';
  }
};

export const etiquetaSolicitudOperacionPanel = (item: Pick<BorradorPanel,
  'solicitudOperacionEstado' | 'solicitudOperacionTipo' | 'solicitudOperacionResultadoFiscal'>): string => {
  if (item.solicitudOperacionTipo !== 'EMITIR_NOTA_CREDITO') {
    return etiquetaSolicitudAnulacion(item.solicitudOperacionEstado);
  }
  const fiscal = String(item.solicitudOperacionResultadoFiscal?.estado || '').trim().toUpperCase();
  const etiquetas: Record<string, string> = {
    AUTORIZADA_EN_COLA: 'Nota autorizada — en cola',
    ESPERANDO_COMPROBANTE: 'Nota autorizada — esperando confirmación del comprobante',
    EMITIENDO: 'Nota en emisión',
    PENDIENTE: 'Nota pendiente de SUNAT',
    PENDIENTE_SUNAT: 'Nota pendiente de SUNAT',
    ACEPTADO: 'Nota aceptada',
    ACEPTADA: 'Nota aceptada',
    RECHAZADO: 'Nota rechazada',
    RECHAZADA: 'Nota rechazada',
    BLOQUEADA: 'Emisión de nota bloqueada',
    RESULTADO_INCIERTO: 'Resultado de nota incierto — pendiente de consulta',
    ERROR: 'Error al emitir la nota',
  };
  return etiquetas[fiscal] || etiquetaEstadoSolicitudNota(item.solicitudOperacionEstado);
};

const etiquetaEstadoSolicitudNota = (estado?: string | null): string => {
  switch (String(estado || '').trim().toUpperCase()) {
    case 'PENDIENTE_APROBACION': return 'Nota por autorizar';
    case 'APROBADA': return 'Nota autorizada — pendiente de ejecución';
    case 'EN_EJECUCION': return 'Nota en ejecución';
    case 'COMPLETADA': return 'Nota aceptada';
    case 'RECHAZADA': return 'Autorización de nota rechazada';
    case 'CANCELADA': return 'Solicitud de nota cancelada';
    case 'ERROR': return 'Error al emitir la nota';
    default: return 'Sin solicitud';
  }
};

export const certificadoImporteFinalCero = (item: Pick<BorradorPanel, 'anulacionImporteCero' | 'importeFinal'>): boolean => {
  if (item.anulacionImporteCero === true) return true;
  if (item.importeFinal === null || item.importeFinal === undefined || item.importeFinal === '') return false;
  const importe = Number(item.importeFinal);
  return Number.isFinite(importe) && Math.abs(importe) < 0.005;
};

export const certificadoAnulacionBloqueadaPorImporte = (
  item: Pick<BorradorPanel, 'anulacionImporteCero' | 'anulacionImporteNoDeterminable' | 'importeFinal'>
): boolean => (
  certificadoImporteFinalCero(item) || item.anulacionImporteNoDeterminable === true
);

export const mensajeBloqueoAnulacionCertificado = (item: Pick<BorradorPanel, 'anulacionImporteNoDeterminable'>): string => (
  item.anulacionImporteNoDeterminable === true
    ? 'No se pudo determinar el importe final del certificado; la anulación está bloqueada hasta regularizar el importe.'
    : 'Este certificado tiene un importe final de S/ 0.00 y no admite anulación.'
);

export const puedeSolicitarAnulacionCertificado = (item: BorradorPanel, permisos: string[]) => (
  puedeCrearSolicitudAnulacion(permisos)
  && certificadoEmitidoVisible(item)
  && item.anulacionEnPlazo === true
  && !certificadoAnulacionBloqueadaPorImporte(item)
  && !esSolicitudActivaAnulacion(item.solicitudOperacionEstado)
  && !esSolicitudCompletadaAnulacion(item.solicitudOperacionEstado)
  && !notaCreditoBloqueaOperacionesFiscales(item)
);

export const puedeCrearNotaCreditoPanel = (item: BorradorPanel, permisos: string[]) => {
  if (!permisos.includes('FAREGAS_NOTA_CREDITO')) return false;

  // TEMPORAL: En entorno de pruebas NubeFact DEMO, omitir la regla de 24 horas
  // para permitir la emisión inmediata de notas de crédito.
  // Controlado por la variable de entorno VITE_NOTA_CREDITO_SIN_PLAZO_24H.
  const sinPlazo24h = import.meta.env.VITE_NOTA_CREDITO_SIN_PLAZO_24H === 'true';
  if (!sinPlazo24h && item.anulacionEnPlazo !== false) return false;

  if (esSolicitudActivaAnulacion(item.solicitudOperacionEstado) || esSolicitudCompletadaAnulacion(item.solicitudOperacionEstado)) return false;
  if (esAnulacionPendiente(item) || esAnulacionAceptada(item)) return false;
  const comprobanteAceptado = esResumenComprobanteOperable(item);
  return comprobanteAceptado;
};

export function InicioView() {
  const navigate = useNavigate();
  const { plantaKey: plantaSeleccionada, permisos } = useOutletContext<MainLayoutContext>();
  // La visibilidad depende del permiso asignado al perfil, nunca del nombre
  // del perfil: así el acceso se puede restringir luego desde Configuración.
  const tienePermisoNotaCredito = permisos.includes('FAREGAS_NOTA_CREDITO');
  const puedeVerSolicitudes = permisos.includes('FAREGAS_SOLICITUD_VER') || permisos.includes('FAREGAS_SOLICITUD_ADMINISTRAR');
  const [borradores, setBorradores] = useState<BorradorPanel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accionEnProceso, setAccionEnProceso] = useState<number | null>(null);
  const [mostrarDuplicado, setMostrarDuplicado] = useState(false);
  const [certificadoSolicitudId, setCertificadoSolicitudId] = useState<number | null>(null);
  const [solicitudSolicitadaId, setSolicitudSolicitadaId] = useState<number | null>(null);
  const [solicitudNotaCreditoMotivo, setSolicitudNotaCreditoMotivo] = useState<'01' | '02' | '03' | null>(null);
  const [solicitudNotaCreditoItemIndice, setSolicitudNotaCreditoItemIndice] = useState<number | null>(null);
  const [solicitudNotaCreditoDescripcion, setSolicitudNotaCreditoDescripcion] = useState<string>('');
  const [notaCreditoModal, setNotaCreditoModal] = useState<{
    certificadoId: number;
    permitirMotivosAnulacion: boolean;
    motivoBloqueoNota?: string;
  } | null>(null);

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

  const comprobarComprobanteDisponible = async (
    certificadoId: number
  ): Promise<FacturacionFaregas | null> => {
    const facturacion = await obtenerFacturacion(certificadoId);

    if (!facturacion?.enlacePdf) {
      await Swal.fire({
        icon: 'info',
        title: 'Comprobante no disponible',
        text: 'Todavía no está disponible el PDF oficial de NubeFact para este comprobante.',
        confirmButtonColor: '#052A79',
      });
      return null;
    }
    return facturacion;
  };

  const comprobarComprobanteOperable = async (certificadoId: number) => {
    const facturacion = await obtenerFacturacion(certificadoId);
    if (!facturacion || !esComprobanteOperable(facturacion)) {
      await Swal.fire({
        icon: 'info',
        title: 'Acción no disponible',
        text: 'En PRODUCCIÓN se requiere aceptación de SUNAT. En DEMO se requiere que NubeFact haya generado el comprobante y sus archivos.',
        confirmButtonColor: '#052A79',
      });
      return null;
    }
    return facturacion;
  };

  const verComprobante = async (certificadoId: number) => {
    try {
      setAccionEnProceso(certificadoId);
      const facturacion = await comprobarComprobanteDisponible(certificadoId);
      if (!facturacion) return;
      await abrirPdfNubefact(certificadoId);
    } catch (err) {
      await Swal.fire('No se pudo consultar', err instanceof Error ? err.message : 'No se pudo obtener el comprobante.', 'error');
    } finally {
      setAccionEnProceso(null);
    }
  };

  const verNotaCredito = async (certificadoId: number, notaCreditoId: number) => {
    try {
      setAccionEnProceso(certificadoId);
      await abrirPdfNotaCreditoNubefact(certificadoId, notaCreditoId);
    } finally {
      setAccionEnProceso(null);
    }
  };

  const abrirRegistro = (ins: BorradorPanel) => {
    const editable = ins.estado === 'BORRADOR' && !esAnulacionPendiente(ins) && !esAnulacionAceptada(ins);
    navigate(`/faregas/certificados/${ins.id}/continuar${editable ? '' : '?vista=consulta'}`);
  };

  const solicitarAnulacionTotal = (ins: BorradorPanel) => {
    setCertificadoSolicitudId(ins.id);
    setSolicitudSolicitadaId(null);
  };

  const abrirSolicitudExistente = (ins: BorradorPanel) => {
    if (!ins.solicitudOperacionId) return;
    setCertificadoSolicitudId(ins.id);
    setSolicitudSolicitadaId(ins.solicitudOperacionId);
  };

  const consultarAnulacion = async (certificadoId: number, anulacionId: number) => {
    try {
      setAccionEnProceso(certificadoId);
      await faregasCertificadosApi.consultarAnulacionElectronica(certificadoId, anulacionId);
      await cargarInspecciones(page, pageSize);
      await Swal.fire({
        icon: 'info',
        title: 'Estado actualizado',
        text: 'Se consultó la solicitud en NubeFact. El panel muestra ahora el último estado informado.',
        confirmButtonColor: '#052A79',
      });
    } catch (err) {
      await Swal.fire('No se pudo consultar', err instanceof Error ? err.message : 'No se pudo actualizar la anulación.', 'error');
    } finally {
      setAccionEnProceso(null);
    }
  };

  const crearNotaCredito = async (
    certificadoId: number,
    permitirMotivosAnulacion = true,
    motivoBloqueoNota?: string
  ) => {
    try {
      setAccionEnProceso(certificadoId);
      const facturacion = await comprobarComprobanteOperable(certificadoId);
      if (!facturacion) return;
      setNotaCreditoModal({
        certificadoId,
        permitirMotivosAnulacion,
        motivoBloqueoNota,
      });
    } catch (err) {
      await Swal.fire('No se pudo abrir la nota', err instanceof Error ? err.message : 'No se pudo cargar el comprobante.', 'error');
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
            placeholder="Buscar por placa, propietario o cliente facturado"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79] md:col-span-2"
          />
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold capitalize text-gray-500">Desde</span>
            <input
              type="date"
              value={filtros.fechaDesde}
              max={filtros.fechaHasta || undefined}
              onChange={(e) => handleFiltroChange('fechaDesde', e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold capitalize text-gray-500">Hasta</span>
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
          <p className="text-xs font-semibold capitalize text-gray-500">
            Total registros
          </p>
          <p className="text-lg font-bold text-gray-800">{total}</p>
        </div>

        <div className="flex flex-col justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold capitalize text-gray-500">
            Página actual
          </p>
          <p className="text-lg font-bold text-gray-800">
            {page} / {totalPages || 1}
          </p>
        </div>

        <div className="flex flex-col justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold capitalize text-gray-500">
            Mostrando
          </p>
          <p className="text-lg font-bold text-gray-800">
            {registroInicio}-{registroFin}
          </p>
        </div>

        <div className="flex flex-col justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-xs font-semibold capitalize text-gray-500">
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
          <p className="mb-1 text-xs font-semibold capitalize text-gray-500">
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
            <option value="ANULADO">Anulado</option>
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
          <span className="font-semibold text-gray-700">Operaciones recientes</span>
          <div className="flex flex-wrap justify-end gap-2">
            {puedeVerSolicitudes && (
              <button
                type="button"
                onClick={() => navigate('/faregas/auditoria/solicitudes')}
                className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-[#052A79] hover:bg-blue-100"
              >
                Solicitudes de anulación
              </button>
            )}
            <button
              type="button"
              onClick={() => setMostrarDuplicado(true)}
              className="rounded-lg border border-amber-500 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            >
              + Nuevo Duplicado
            </button>
            <button
              type="button"
              onClick={() => navigate('/faregas/certificados/nuevo')}
              className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
            >
              + Nuevo Certificado
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="hidden md:table min-w-[1400px] w-full border-collapse text-sm">
            <thead className="bg-gray-50 text-xs font-semibold capitalize text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">
                  N° Certificado
                </th>
                <th className="px-4 py-3 text-left">
                  Fecha de emisión / creación
                </th>
                <th className="px-4 py-3 text-left">
                  Placa
                </th>
                <th className="px-4 py-3 text-left">
                  Propietario
                </th>
                <th className="px-4 py-3 text-left">
                  Facturado a
                </th>
                <th className="px-4 py-3 text-left">
                  Tipo de Certificado
                </th>
                <th className="px-4 py-3 text-left">
                  Estado comprobante
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
                    colSpan={9}
                    className="px-4 py-8 text-center text-slate-500 font-medium"
                  >
                    Cargando borradores...
                  </td>
                </tr>
              )}

              {!loading && borradores.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    No hay borradores activos o pendientes para esta sede.
                  </td>
                </tr>
              )}

              {!loading &&
                borradores.map((ins) => {
                  const anulacionPendiente = esAnulacionPendiente(ins);
                  const anulacionAceptada = esAnulacionAceptada(ins);
                  const solicitudEstado = ins.solicitudOperacionEstado || null;
                  const solicitudActiva = esSolicitudActivaAnulacion(solicitudEstado);
                  const solicitudCompletada = esSolicitudCompletadaAnulacion(solicitudEstado);
                  const accionesCongeladas = solicitudActiva || anulacionPendiente || anulacionAceptada;
                  const notaCreditoBloquea = notaCreditoBloqueaOperacionesFiscales(ins);
                  const accionesFiscalesCongeladas = accionesCongeladas || notaCreditoBloquea;
                  const certificadoEditable = ins.estado === 'BORRADOR' && !accionesFiscalesCongeladas;
                  const puedeSolicitar = puedeSolicitarAnulacionCertificado(ins, permisos) && !notaCreditoBloquea;
                  const anulacionBloqueadaPorImporte = certificadoAnulacionBloqueadaPorImporte(ins)
                    && certificadoEmitidoVisible(ins)
                    && puedeCrearSolicitudAnulacion(permisos);
                  const puedeCrearNota = puedeCrearNotaCreditoPanel(ins, permisos) && !notaCreditoBloquea;
                  // Los controles permanecen visibles aunque el resumen todavía no se haya
                  // refrescado. Cada acción vuelve a consultar la facturación completa antes
                  // de abrir/enviar algo, por lo que no debilita la validación tributaria.
                  const puedeVerComprobante = Boolean(ins.enlacePdf);
                  const puedeVerNotaCredito = Boolean(ins.notaCreditoId && ins.notaCreditoPdfDisponible);

                  return (
                    <tr
                      key={ins.id}
                      className="cursor-pointer text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#052A79]"
                      onClick={() => abrirRegistro(ins)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && event.target === event.currentTarget) {
                          abrirRegistro(ins);
                        }
                      }}
                      tabIndex={0}
                      role="link"
                      aria-label={certificadoEditable ? `Continuar borrador ${ins.id}` : `Consultar registro ${ins.id} en solo lectura`}
                    >
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap text-blue-700`}>
                        {tieneCertificadoDefinitivo(ins) ? (
                          ins.numeroCertificado
                        ) : (
                          <>
                            Borrador #{ins.id}
                            {ins.numeroCertificado && <span className="block text-[10px] font-medium text-slate-500">{ins.numeroCertificado}</span>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500" title={ins.estado === 'EMITIDO' ? 'Fecha de emisión del certificado' : 'Fecha de creación del registro'}>
                        {ins.estado === 'EMITIDO' && ins.fechaEmision ? ins.fechaEmision : formatearFecha(ins.fechaCreacion)}
                      </td>
                      <td className="px-4 py-3 font-bold whitespace-nowrap">
                        {normalizarTexto(ins.placa)}
                      </td>
                      <td className="px-4 py-3 min-w-[220px]">
                        <span className="block font-semibold text-slate-800">
                          {normalizarTexto(ins.propietarioNombre || ins.clienteNombre)}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {formatearDocumento(ins.propietarioTipoDocumento, ins.propietarioDocumento || ins.clienteDocumento)}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[240px]">
                        <span className="block font-semibold text-slate-800">
                          {normalizarTexto(ins.facturacionNombre)}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {formatearDocumento(ins.facturacionTipoDocumento, ins.facturacionDocumento)}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[180px]">
                        {nombreTipoCertificadoPanel(ins)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <BadgeEstado value={estadoComprobantePanel(ins)} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <BadgeEstado value={estadoCertificadoPanel(ins)} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center align-middle" onClick={(event) => event.stopPropagation()}>
                        <div className="flex h-full flex-wrap items-center justify-center gap-1.5">
                          {notaCreditoExiste(ins) && (
                            <BadgeEstado value={ins.estadoNotaCredito} />
                          )}
                          {notaCreditoBloquea && (
                            <button
                              type="button"
                              disabled
                              title="Nota de crédito registrada: operaciones fiscales bloqueadas para este comprobante"
                              className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-slate-400"
                            ><Ban size={16} /></button>
                          )}
                          {puedeVerComprobante && (
                            <button
                              type="button"
                              disabled={accionEnProceso === ins.id}
                              onClick={() => void verComprobante(ins.id)}
                              title="Ver comprobante"
                              className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[#052A79] hover:bg-blue-100 disabled:opacity-50"
                            ><FileText size={16} /></button>
                          )}
                          {puedeVerNotaCredito && ins.notaCreditoId && (
                            <button
                              type="button"
                              disabled={accionEnProceso === ins.id}
                              onClick={() => void verNotaCredito(ins.id, Number(ins.notaCreditoId))}
                              title="Ver / Descargar nota de crédito"
                              aria-label={`Ver / Descargar nota de crédito ${ins.nroNotaCredito || ''}`.trim()}
                              className="rounded-md border border-orange-300 bg-orange-50 px-2.5 py-1.5 text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                            ><FileText size={16} /></button>
                          )}
                          {!solicitudCompletada && anulacionPendiente && ins.anulacionId && (
                            <button
                              type="button"
                              disabled={accionEnProceso === ins.id}
                              onClick={() => void consultarAnulacion(ins.id, Number(ins.anulacionId))}
                              title="Consultar estado de anulación"
                              className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                            ><RefreshCw size={16} className={accionEnProceso === ins.id ? 'animate-spin' : ''} /></button>
                          )}
                          {!solicitudCompletada && accionesCongeladas && !solicitudActiva && (
                            <button
                              type="button"
                              disabled
                              title="Anulación en revisión: las acciones tributarias están bloqueadas"
                              className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-slate-400"
                            ><Ban size={16} /></button>
                          )}
                          {!solicitudCompletada && puedeCrearNota && (
                            <button
                              type="button"
                              disabled={accionEnProceso === ins.id}
                              onClick={() => void crearNotaCredito(
                                ins.id,
                                !certificadoAnulacionBloqueadaPorImporte(ins),
                                certificadoAnulacionBloqueadaPorImporte(ins)
                                  ? mensajeBloqueoAnulacionCertificado(ins)
                                  : undefined
                              )}
                              title={certificadoAnulacionBloqueadaPorImporte(ins)
                                ? (ins.anulacionImporteNoDeterminable === true
                                  ? 'Solo corrección: no se pudo determinar el importe final del certificado'
                                  : 'Solo corrección: el importe final es S/ 0.00 y no admite notas de anulación')
                                : 'Crear nota de crédito'}
                              className="rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[#052A79] hover:bg-violet-100 disabled:opacity-50"
                            ><FileEdit size={16} /></button>
                          )}
                          {!solicitudCompletada && !solicitudActiva && anulacionBloqueadaPorImporte && (
                            <button
                              type="button"
                              disabled
                              title={mensajeBloqueoAnulacionCertificado(ins)}
                              className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-slate-400"
                            ><Ban size={16} /></button>
                          )}
                          {!solicitudCompletada && puedeSolicitar && (
                            <button
                              type="button"
                              onClick={() => solicitarAnulacionTotal(ins)}
                              title="Solicitar anulación total — requiere autorización de un usuario con permiso para aprobar"
                              className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-red-700 hover:bg-red-100"
                            ><ClipboardX size={16} /></button>
                          )}
                          {!solicitudCompletada && solicitudActiva && ins.solicitudOperacionId && (
                            <button
                              type="button"
                              disabled={accionEnProceso === ins.id}
                              onClick={() => abrirSolicitudExistente(ins)}
                              title="Abrir solicitud de anulación existente"
                              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                            >
                              <ClipboardX size={16} />
                              {etiquetaSolicitudOperacionPanel(ins)}
                            </button>
                          )}
                          {!solicitudCompletada && accionesCongeladas && tienePermisoNotaCredito && (
                            <button
                              type="button"
                              disabled
                              title="No se puede crear una nota mientras la anulación esté activa"
                              className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-slate-400"
                            ><FileEdit size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
          
          {/* Vista Móvil (Tarjetas) */}
          <div className="md:hidden flex flex-col divide-y divide-gray-100">
            {loading && (
              <div className="p-8 text-center text-slate-500 font-medium">Cargando borradores...</div>
            )}
            {!loading && borradores.length === 0 && (
              <div className="p-8 text-center text-slate-400">No hay borradores activos o pendientes para esta sede.</div>
            )}
            {!loading && borradores.map((ins) => {
              const etapa = PASO_PANEL[ins.pasoActual || ''] || 'Datos iniciales';
              const anulacionPendiente = esAnulacionPendiente(ins);
              const anulacionAceptada = esAnulacionAceptada(ins);
              const solicitudEstado = ins.solicitudOperacionEstado || null;
              const solicitudActiva = esSolicitudActivaAnulacion(solicitudEstado);
              const solicitudCompletada = esSolicitudCompletadaAnulacion(solicitudEstado);
              const accionesCongeladas = solicitudActiva || anulacionPendiente || anulacionAceptada;
              const notaCreditoBloquea = notaCreditoBloqueaOperacionesFiscales(ins);
              const accionesFiscalesCongeladas = accionesCongeladas || notaCreditoBloquea;
              const certificadoEditable = ins.estado === 'BORRADOR' && !accionesFiscalesCongeladas;
              const puedeVerComprobante = Boolean(ins.enlacePdf);
              const puedeVerNotaCredito = Boolean(ins.notaCreditoId && ins.notaCreditoPdfDisponible);
              const puedeCrearNotaCredito = puedeCrearNotaCreditoPanel(ins, permisos) && !notaCreditoBloquea;
              const puedeSolicitar = puedeSolicitarAnulacionCertificado(ins, permisos);
              const anulacionBloqueadaPorImporte = certificadoAnulacionBloqueadaPorImporte(ins)
                && certificadoEmitidoVisible(ins)
                && puedeCrearSolicitudAnulacion(permisos);
              return (
                <div
                  key={ins.id}
                  className="cursor-pointer flex flex-col gap-3 bg-white p-4 focus-visible:outline-2 focus-visible:outline-[#052A79]"
                  onClick={() => abrirRegistro(ins)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && event.target === event.currentTarget) {
                      abrirRegistro(ins);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={certificadoEditable ? `Continuar borrador ${ins.id}` : `Consultar registro ${ins.id} en solo lectura`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      {tieneCertificadoDefinitivo(ins) ? (
                         <div className="font-bold text-blue-700">{ins.numeroCertificado}</div>
                       ) : (
                         <div className="font-bold text-blue-700">Borrador #{ins.id}</div>
                       )}
                      {!tieneCertificadoDefinitivo(ins) && ins.numeroCertificado && <div className="text-xs text-slate-600">{ins.numeroCertificado}</div>}
                      <div className="text-xs text-slate-500">{ins.estado === 'EMITIDO' && ins.fechaEmision ? ins.fechaEmision : formatearFecha(ins.fechaCreacion)}</div>
                    </div>
                    <BadgeEstado value={estadoCertificadoPanel(ins)} />
                    {notaCreditoExiste(ins) && (
                      <BadgeEstado value={ins.estadoNotaCredito} />
                    )}
                  </div>

                  {anulacionPendiente && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                      Pendiente de revisión · las acciones tributarias están congeladas.
                    </div>
                  )}
                  {notaCreditoBloquea && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                      Nota de Crédito {etiquetaEstadoNotaCredito(ins.estadoNotaCredito)} · operaciones fiscales bloqueadas.
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 capitalize">Placa</span>
                      <span className="font-bold text-slate-800">{normalizarTexto(ins.placa)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 capitalize">Etapa</span>
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 text-[10px] font-bold tracking-wide text-amber-700">{etapa}</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between rounded-md bg-slate-50 p-2">
                      <span className="text-[10px] font-semibold text-slate-500">Estado del comprobante</span>
                      <BadgeEstado value={estadoComprobantePanel(ins)} />
                    </div>
                    <div className="col-span-2 rounded-md bg-slate-50 p-2">
                      <span className="block text-[10px] font-semibold text-slate-500">Propietario</span>
                      <span className="block text-xs font-semibold text-slate-800">{normalizarTexto(ins.propietarioNombre || ins.clienteNombre)}</span>
                      <span className="block text-[11px] text-slate-600">{formatearDocumento(ins.propietarioTipoDocumento, ins.propietarioDocumento || ins.clienteDocumento)}</span>
                    </div>
                    <div className="col-span-2 rounded-md bg-blue-50 p-2">
                      <span className="block text-[10px] font-semibold text-blue-700">Facturado a</span>
                      <span className="block text-xs font-semibold text-slate-800">{normalizarTexto(ins.facturacionNombre)}</span>
                      <span className="block text-[11px] text-slate-600">{formatearDocumento(ins.facturacionTipoDocumento, ins.facturacionDocumento)}</span>
                    </div>
                  </div>

                  {((!certificadoEditable && !solicitudCompletada) || puedeVerComprobante || puedeVerNotaCredito) && (
                    <div className="pt-3 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                      {!certificadoEditable && !solicitudCompletada && (
                        <button
                          type="button"
                          onClick={() => abrirRegistro(ins)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-[#052A79] transition-colors hover:bg-blue-100"
                        >
                          <Eye size={16} /> Ver historial
                        </button>
                      )}
                      {puedeVerComprobante && (
                        <button
                          type="button"
                          disabled={accionEnProceso === ins.id}
                          onClick={() => void verComprobante(ins.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-[#052A79] hover:bg-blue-100 disabled:opacity-50"
                        ><FileText size={16} /> PDF</button>
                      )}
                      {puedeVerNotaCredito && ins.notaCreditoId && (
                        <button
                          type="button"
                          disabled={accionEnProceso === ins.id}
                          onClick={() => void verNotaCredito(ins.id, Number(ins.notaCreditoId))}
                          title="Ver / Descargar nota de crédito"
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                        ><FileText size={16} /> Nota de crédito</button>
                      )}
                    </div>
                  )}
                  {!solicitudCompletada && (puedeCrearNotaCredito || accionesCongeladas || puedeSolicitar) && (
                    <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                      {anulacionPendiente && ins.anulacionId && (
                        <button
                          type="button"
                          disabled={accionEnProceso === ins.id}
                          onClick={() => void consultarAnulacion(ins.id, Number(ins.anulacionId))}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                        ><RefreshCw size={16} className={accionEnProceso === ins.id ? 'animate-spin' : ''} /> Consultar anulación</button>
                      )}
                      {puedeCrearNotaCredito && (
                        <button
                          type="button"
                          disabled={accionEnProceso === ins.id}
                          onClick={() => void crearNotaCredito(
                                ins.id,
                                !certificadoAnulacionBloqueadaPorImporte(ins),
                                certificadoAnulacionBloqueadaPorImporte(ins)
                                  ? mensajeBloqueoAnulacionCertificado(ins)
                                  : undefined
                              )}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                        ><FileEdit size={16} /> Nota de Crédito</button>
                      )}
                      {anulacionBloqueadaPorImporte && !solicitudActiva && (
                        <button
                          type="button"
                          disabled
                          title={mensajeBloqueoAnulacionCertificado(ins)}
                          className="flex-1 rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400"
                        >{ins.anulacionImporteNoDeterminable === true ? 'Anulación no disponible' : 'Anulación no disponible · S/ 0.00'}</button>
                      )}
                      {puedeSolicitar && (
                        <button
                          type="button"
                          onClick={() => solicitarAnulacionTotal(ins)}
                          title="Solicitar anulación total — requiere autorización de un usuario con permiso para aprobar"
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                        ><ClipboardX size={16} /> Solicitar anulación total</button>
                      )}
                      {solicitudActiva && ins.solicitudOperacionId && (
                        <button
                          type="button"
                          disabled={accionEnProceso === ins.id}
                          onClick={() => abrirSolicitudExistente(ins)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                        >
                          <ClipboardX size={16} /> {etiquetaSolicitudOperacionPanel(ins)}
                        </button>
                      )}
                      {!solicitudActiva && accionesCongeladas && !solicitudCompletada && (
                        <button type="button" disabled className="flex-1 rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400">
                          Acciones congeladas
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

      {mostrarDuplicado && <DuplicadoCertificadoModal onClose={() => setMostrarDuplicado(false)} />}
      <SolicitudOperacionModal
        abierto={certificadoSolicitudId !== null}
        certificadoId={certificadoSolicitudId}
        solicitudId={solicitudSolicitadaId}
        tipoSolicitudInicial={solicitudNotaCreditoMotivo ? 'EMITIR_NOTA_CREDITO' : 'ANULAR_AMBOS'}
        motivoNotaCredito={solicitudNotaCreditoMotivo}
        motivoNotaCreditoItemIndice={solicitudNotaCreditoItemIndice}
        motivoNotaCreditoDescripcion={solicitudNotaCreditoDescripcion}
        onCerrar={() => { setCertificadoSolicitudId(null); setSolicitudSolicitadaId(null); setSolicitudNotaCreditoMotivo(null); setSolicitudNotaCreditoItemIndice(null); setSolicitudNotaCreditoDescripcion(''); }}
        onCreada={() => { void cargarInspecciones(page, pageSize); }}
      />
      <NotaCreditoModal
        abierto={notaCreditoModal !== null}
        certificadoId={notaCreditoModal?.certificadoId || null}
        permitirMotivosAnulacion={notaCreditoModal?.permitirMotivosAnulacion}
        motivoBloqueoAnulacion={notaCreditoModal?.motivoBloqueoNota}
        onCerrar={() => setNotaCreditoModal(null)}
        onProcesada={() => cargarInspecciones(page, pageSize)}
        onSolicitarAutorizacion={(motivoCodigo, itemIndice, descripcionCorregida) => {
          const certificadoId = notaCreditoModal?.certificadoId || null;
          setNotaCreditoModal(null);
          setSolicitudSolicitadaId(null);
          setSolicitudNotaCreditoMotivo(motivoCodigo);
          setSolicitudNotaCreditoItemIndice(itemIndice ?? null);
          setSolicitudNotaCreditoDescripcion(descripcionCorregida ?? '');
          setCertificadoSolicitudId(certificadoId);
        }}
      />
    </div>
  );
}
