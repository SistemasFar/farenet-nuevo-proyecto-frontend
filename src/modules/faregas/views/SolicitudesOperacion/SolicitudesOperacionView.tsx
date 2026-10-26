import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, Loader2, RefreshCw, X, XCircle } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import type { MainLayoutContext } from '../Dashboard/MainLayout';
import {
  faregasSolicitudesOperacionApi,
  etiquetaEstadoSolicitud,
  etiquetaTipoSolicitud,
  type EstadoSolicitudOperacion,
  type EventoSolicitudOperacion,
  type SolicitudOperacion,
  type TipoSolicitudOperacion,
} from '../../services/faregas-solicitudes-operacion.api';

const hoyLocal = () => {
  const ahora = new Date();
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const usuarioActual = () => {
  try {
    const user = JSON.parse(sessionStorage.getItem('faregasUser') || '{}');
    return String(user.username || user.usuario || '');
  } catch { return ''; }
};

const clasesEstado = (estado: EstadoSolicitudOperacion) => {
  if (estado === 'APROBADA') return 'border-blue-200 bg-blue-50 text-blue-800';
  if (estado === 'RECHAZADA' || estado === 'ERROR') return 'border-red-200 bg-red-50 text-red-700';
  if (estado === 'CANCELADA') return 'border-slate-200 bg-slate-100 text-slate-600';
  if (estado === 'COMPLETADA') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-amber-200 bg-amber-50 text-amber-800';
};

const JsonResumen = ({ titulo, data }: { titulo: string; data: Record<string, unknown> | null }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
    <h4 className="mb-2 text-xs font-bold uppercase text-slate-600">{titulo}</h4>
    {data ? (
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        {Object.entries(data).map(([clave, valor]) => (
          <div key={clave}><dt className="font-semibold text-slate-500">{clave}</dt><dd className="break-words text-slate-800">{typeof valor === 'object' ? JSON.stringify(valor) : String(valor ?? '-')}</dd></div>
        ))}
      </dl>
    ) : <p className="text-xs text-slate-400">No aplica.</p>}
  </div>
);

function DetalleSolicitud({
  solicitud,
  permisos,
  onCerrar,
  onActualizada,
}: {
  solicitud: SolicitudOperacion;
  permisos: string[];
  onCerrar: () => void;
  onActualizada: (solicitud: SolicitudOperacion) => void;
}) {
  const [historial, setHistorial] = useState<EventoSolicitudOperacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const puedeAprobar = permisos.includes('FAREGAS_SOLICITUD_APROBAR') || permisos.includes('FAREGAS_SOLICITUD_ADMINISTRAR');
  const puedeAutoaprobar = permisos.includes('FAREGAS_SOLICITUD_APROBAR')
    && permisos.includes('FAREGAS_SOLICITUD_AUTOAPROBAR');
  const puedeRechazar = permisos.includes('FAREGAS_SOLICITUD_RECHAZAR') || permisos.includes('FAREGAS_SOLICITUD_ADMINISTRAR');
  const esPropia = solicitud.usuarioSolicitante === usuarioActual();

  useEffect(() => {
    faregasSolicitudesOperacionApi.historial(solicitud.id)
      .then(setHistorial)
      .finally(() => setCargando(false));
  }, [solicitud.id]);

  const decidir = async (accion: 'aprobar' | 'rechazar' | 'cancelar') => {
    const esAutoaprobacion = accion === 'aprobar' && esPropia;
    const requiereTexto = accion !== 'aprobar' || esAutoaprobacion;
    const resultado = await Swal.fire({
      title: accion === 'aprobar' ? '¿Aprobar solicitud?' : accion === 'rechazar' ? '¿Rechazar solicitud?' : '¿Cancelar solicitud?',
      text: accion === 'aprobar'
        ? esAutoaprobacion
          ? 'Esta excepción quedará auditada. La solicitud sólo quedará aprobada y pendiente de ejecución; no se modificará ningún documento.'
          : 'Quedará aprobada y pendiente de ejecución; no se modificará ningún documento.'
        : undefined,
      input: requiereTexto ? 'textarea' : undefined,
      inputLabel: requiereTexto ? 'Justificación obligatoria' : 'Justificación opcional',
      inputPlaceholder: 'Escriba el sustento de la decisión',
      showCancelButton: true,
      confirmButtonText: accion === 'aprobar' ? 'Aprobar' : accion === 'rechazar' ? 'Rechazar' : 'Cancelar solicitud',
      cancelButtonText: 'Volver',
      confirmButtonColor: accion === 'aprobar' ? '#047857' : '#b91c1c',
      inputValidator: requiereTexto ? (valor: string) => (!String(valor || '').trim() ? 'Ingrese una justificación.' : undefined) : undefined,
    });
    if (!resultado.isConfirmed) return;
    if (esAutoaprobacion) {
      const confirmacion = await Swal.fire({
        icon: 'warning',
        title: 'Confirmar autoaprobación excepcional',
        text: 'Confirmo que soy el solicitante y que autorizo registrar esta excepción administrativa con el sustento ingresado.',
        showCancelButton: true,
        confirmButtonText: 'Sí, confirmar autoaprobación',
        cancelButtonText: 'Volver',
        confirmButtonColor: '#b45309',
      });
      if (!confirmacion.isConfirmed) return;
    }
    setProcesando(true);
    try {
      const texto = String(resultado.value || '').trim();
      const actualizada = accion === 'aprobar'
        ? await faregasSolicitudesOperacionApi.aprobar(
          solicitud.id,
          solicitud.version,
          texto || undefined,
          esAutoaprobacion,
        )
        : accion === 'rechazar'
          ? await faregasSolicitudesOperacionApi.rechazar(solicitud.id, solicitud.version, texto)
          : await faregasSolicitudesOperacionApi.cancelar(solicitud.id, solicitud.version, texto);
      onActualizada(actualizada);
      await Swal.fire('Decisión registrada', etiquetaEstadoSolicitud(actualizada.estado), 'success');
    } catch (error) {
      await Swal.fire('No se pudo registrar', error instanceof Error ? error.message : 'Intente nuevamente.', 'error');
    } finally { setProcesando(false); }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3" role="dialog" aria-modal="true">
      <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between bg-[#052A79] px-5 py-4 text-white">
          <div><h2 className="text-lg font-bold">Solicitud de anulación #{solicitud.id}</h2><p className="text-xs text-blue-100">Detalle y trazabilidad de la anulación total</p></div>
          <button type="button" onClick={onCerrar} className="rounded p-1 hover:bg-white/10"><X /></button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <div><span className="block text-xs font-semibold text-slate-500">SOLICITANTE</span>{solicitud.usuarioSolicitante}</div>
            <div><span className="block text-xs font-semibold text-slate-500">SEDE</span>{solicitud.plantaNombre || solicitud.plantaKey}</div>
            <div><span className="block text-xs font-semibold text-slate-500">CERTIFICADO</span>{solicitud.numeroCertificado || '-'}</div>
            <div><span className="block text-xs font-semibold text-slate-500">COMPROBANTE</span>{solicitud.nroComprobante || 'No aplica'}</div>
            <div className="md:col-span-2"><span className="block text-xs font-semibold text-slate-500">OPERACIÓN</span>{etiquetaTipoSolicitud(solicitud.tipoOperacion)}</div>
            <div><span className="block text-xs font-semibold text-slate-500">FECHA</span>{new Date(solicitud.fechaSolicitud).toLocaleString('es-PE')}</div>
            <div><span className="block text-xs font-semibold text-slate-500">ESTADO</span><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${clasesEstado(solicitud.estado)}`}>{etiquetaEstadoSolicitud(solicitud.estado)}</span></div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3"><h4 className="text-xs font-bold text-slate-500">MOTIVO</h4><p className="mt-1 text-sm">{solicitud.motivo}</p>{solicitud.observaciones && <p className="mt-2 text-sm text-slate-600">{solicitud.observaciones}</p>}</div>
          
          {solicitud.diferencias && solicitud.diferencias.length > 0 && (
            <div className="rounded-xl border border-indigo-200 bg-white p-4">
              <h4 className="text-xs font-bold uppercase text-indigo-900 mb-2">
                Diferencias registradas (Histórico)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-indigo-50 text-indigo-900">
                      <th className="py-2 px-3 text-left">Campo técnico</th>
                      <th className="py-2 px-3 text-left">Valor original</th>
                      <th className="py-2 px-3 text-left">Valor propuesto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {solicitud.diferencias.map((dif, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">{dif.campo}</td>
                        <td className="py-2 px-3 text-red-600 line-through">{String(dif.valorOriginal ?? '(vacío)')}</td>
                        <td className="py-2 px-3 text-emerald-700 font-bold">{String(dif.valorPropuesto ?? '(vacío)')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-3">
            <JsonResumen titulo="Datos originales del certificado" data={solicitud.datosOriginalesCertificado} />
            <JsonResumen titulo="Datos originales del comprobante" data={solicitud.datosOriginalesComprobante} />
            {solicitud.datosPropuestos && <JsonResumen titulo="Datos propuestos (Histórico)" data={solicitud.datosPropuestos} />}
          </div>
          {solicitud.justificacionDecision && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm"><strong>Decisión de {solicitud.usuarioDecision}:</strong> {solicitud.justificacionDecision}</div>}

          <div className="rounded-xl border border-slate-200">
            <div className="border-b bg-slate-50 px-4 py-3 text-sm font-bold">Historial de eventos</div>
            {cargando ? <div className="p-4 text-sm text-slate-500">Cargando historial...</div> : (
              <div className="divide-y">
                {historial.map((evento) => <div key={evento.id} className="flex gap-3 p-4 text-sm"><Clock3 size={17} className="mt-0.5 text-blue-700" /><div><div className="font-semibold">{evento.tipoEvento.replaceAll('_', ' ')}</div><div className="text-xs text-slate-500">{evento.usuarioResponsable} · {new Date(evento.fechaEvento).toLocaleString('es-PE')}</div>{evento.comentario && <p className="mt-1 text-slate-700">{evento.comentario}</p>}</div></div>)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <button type="button" onClick={onCerrar} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cerrar</button>
            {solicitud.tipoOperacion === 'ANULAR_AMBOS' && solicitud.estado === 'PENDIENTE_APROBACION' && esPropia && <button type="button" disabled={procesando} onClick={() => void decidir('cancelar')} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">Cancelar mi solicitud</button>}
            {solicitud.tipoOperacion === 'ANULAR_AMBOS' && solicitud.estado === 'PENDIENTE_APROBACION' && !esPropia && puedeRechazar && <button type="button" disabled={procesando} onClick={() => void decidir('rechazar')} className="flex items-center gap-1 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"><XCircle size={16} /> Rechazar</button>}
            {solicitud.tipoOperacion === 'ANULAR_AMBOS' && solicitud.estado === 'PENDIENTE_APROBACION' && !esPropia && puedeAprobar && <button type="button" disabled={procesando} onClick={() => void decidir('aprobar')} className="flex items-center gap-1 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"><CheckCircle2 size={16} /> Aprobar solicitud</button>}
            {solicitud.tipoOperacion === 'ANULAR_AMBOS' && solicitud.estado === 'PENDIENTE_APROBACION' && esPropia && puedeAutoaprobar && <button type="button" disabled={procesando} onClick={() => void decidir('aprobar')} className="flex items-center gap-1 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white"><CheckCircle2 size={16} /> Autoaprobar excepcionalmente</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SolicitudesOperacionView() {
  const { permisos, plantaKey } = useOutletContext<MainLayoutContext>();
  const puedeVer = permisos.includes('FAREGAS_SOLICITUD_VER') || permisos.includes('FAREGAS_SOLICITUD_ADMINISTRAR');
  const [solicitudes, setSolicitudes] = useState<SolicitudOperacion[]>([]);
  const [seleccionada, setSeleccionada] = useState<SolicitudOperacion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtros, setFiltros] = useState({ fechaDesde: hoyLocal(), fechaHasta: hoyLocal(), estado: '', tipoOperacion: '', usuarioSolicitante: '', plantaKey: '' });

  const cargar = useCallback(async (pagina = page) => {
    if (!puedeVer) return;
    setLoading(true); setError('');
    try {
      const respuesta = await faregasSolicitudesOperacionApi.listar({
        page: pagina, pageSize: 10,
        fechaDesde: filtros.fechaDesde, fechaHasta: filtros.fechaHasta,
        estado: filtros.estado as EstadoSolicitudOperacion | '',
        tipoOperacion: filtros.tipoOperacion as TipoSolicitudOperacion | '',
        usuarioSolicitante: filtros.usuarioSolicitante,
        plantaKey: filtros.plantaKey,
      });
      setSolicitudes(respuesta.data); setPage(respuesta.page); setTotal(respuesta.total); setTotalPages(respuesta.totalPages);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar las solicitudes.'); }
    finally { setLoading(false); }
  }, [filtros, page, puedeVer]);

  useEffect(() => { void cargar(1); }, [plantaKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const estados = useMemo<EstadoSolicitudOperacion[]>(() => ['PENDIENTE_APROBACION', 'APROBADA', 'RECHAZADA', 'CANCELADA', 'EN_EJECUCION', 'COMPLETADA', 'ERROR', 'REQUIERE_INTERVENCION'], []);
  const tipos = useMemo<TipoSolicitudOperacion[]>(() => ['ANULAR_AMBOS', 'ANULAR_CERTIFICADO', 'ANULAR_COMPROBANTE'], []);

  if (!puedeVer) return <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">No tiene permiso para consultar solicitudes administrativas.</div>;

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><Link to="/faregas" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-800"><ArrowLeft size={16} /> Volver a Inicio</Link><h1 className="text-2xl font-bold text-slate-900">Solicitudes de anulación</h1><p className="text-sm text-slate-500">Aprobación administrativa de anulaciones totales; no ejecuta operaciones técnicas ni fiscales.</p></div>
          <button type="button" onClick={() => void cargar()} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-semibold"><RefreshCw size={16} /> Actualizar</button>
        </div>

        <div className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
          <label className="text-xs font-semibold text-slate-600">Desde<input type="date" value={filtros.fechaDesde} onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })} className="mt-1 w-full rounded-lg border px-2 py-2 font-normal" /></label>
          <label className="text-xs font-semibold text-slate-600">Hasta<input type="date" value={filtros.fechaHasta} onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })} className="mt-1 w-full rounded-lg border px-2 py-2 font-normal" /></label>
          <label className="text-xs font-semibold text-slate-600">Estado<select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })} className="mt-1 w-full rounded-lg border px-2 py-2 font-normal"><option value="">Todos</option>{estados.map((estado) => <option key={estado} value={estado}>{etiquetaEstadoSolicitud(estado)}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">Tipo<select value={filtros.tipoOperacion} onChange={(e) => setFiltros({ ...filtros, tipoOperacion: e.target.value })} className="mt-1 w-full rounded-lg border px-2 py-2 font-normal"><option value="">Todos</option>{tipos.map((tipo) => <option key={tipo} value={tipo}>{etiquetaTipoSolicitud(tipo)}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-600">Solicitante<input value={filtros.usuarioSolicitante} onChange={(e) => setFiltros({ ...filtros, usuarioSolicitante: e.target.value })} className="mt-1 w-full rounded-lg border px-2 py-2 font-normal" placeholder="Usuario" /></label>
          <button type="button" onClick={() => void cargar(1)} className="self-end rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white">Buscar</button>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Solicitante / sede</th><th className="px-4 py-3 text-left">Documento</th><th className="px-4 py-3 text-left">Operación</th><th className="px-4 py-3 text-left">Motivo</th><th className="px-4 py-3 text-left">Estado</th><th className="px-4 py-3 text-center">Detalle</th></tr></thead>
              <tbody className="divide-y">
                {loading && <tr><td colSpan={7} className="p-10 text-center text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" /> Cargando...</td></tr>}
                {!loading && solicitudes.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-slate-400">No existen solicitudes para los filtros seleccionados.</td></tr>}
                {!loading && solicitudes.map((solicitud) => <tr key={solicitud.id} className="hover:bg-slate-50"><td className="px-4 py-3 whitespace-nowrap">{new Date(solicitud.fechaSolicitud).toLocaleString('es-PE')}</td><td className="px-4 py-3"><strong className="block">{solicitud.usuarioSolicitante}</strong><span className="text-xs text-slate-500">{solicitud.plantaNombre || solicitud.plantaKey}</span></td><td className="px-4 py-3"><strong className="block text-blue-800">{solicitud.numeroCertificado || '-'}</strong><span className="text-xs text-slate-500">{solicitud.nroComprobante || 'Sin comprobante'}</span></td><td className="px-4 py-3">{etiquetaTipoSolicitud(solicitud.tipoOperacion)}</td><td className="max-w-xs truncate px-4 py-3" title={solicitud.motivo}>{solicitud.motivo}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${clasesEstado(solicitud.estado)}`}>{etiquetaEstadoSolicitud(solicitud.estado)}</span></td><td className="px-4 py-3 text-center"><button type="button" onClick={() => setSeleccionada(solicitud)} className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-800" aria-label={`Ver solicitud ${solicitud.id}`}><Eye size={17} /></button></td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-slate-600"><span>{total} solicitudes</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => void cargar(page - 1)} className="rounded border p-2 disabled:opacity-40"><ChevronLeft size={16} /></button><span>Página {page} de {totalPages}</span><button disabled={page >= totalPages} onClick={() => void cargar(page + 1)} className="rounded border p-2 disabled:opacity-40"><ChevronRight size={16} /></button></div></div>
        </div>
      </div>
      {seleccionada && <DetalleSolicitud solicitud={seleccionada} permisos={permisos} onCerrar={() => setSeleccionada(null)} onActualizada={(actualizada) => { setSeleccionada(actualizada); setSolicitudes((actuales) => actuales.map((item) => item.id === actualizada.id ? actualizada : item)); }} />}
    </div>
  );
}
