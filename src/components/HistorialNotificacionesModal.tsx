import { useCallback, useEffect, useState } from 'react';
import { X, Loader2, Search, Filter } from 'lucide-react';
import { faregasFetch } from '../modules/faregas/services/faregas-http-client';
import {
  ESTADOS_CON_DECISION,
  etiquetaEstadoNotificacion,
  nombreUsuarioLegible,
  operacionLegible,
  obtenerPaginasVisibles,
  tituloNotificacionLegible,
  type NotificacionHistorial,
} from './historial-notificaciones.utils';

interface HistorialRespuesta {
  ok: boolean;
  data: NotificacionHistorial[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onIr?: (destino: string | null, id: number) => void;
}

interface FiltrosAplicados {
  busqueda: string;
  fechaDesde: string;
  fechaHasta: string;
}

const formatearFechaHora = (valor: string): string => {
  try {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor;
    return fecha.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return valor;
  }
};

export function HistorialNotificacionesModal({ abierto, onCerrar, onIr }: Props) {
  if (!abierto) return null;
  return <HistorialNotificacionesContenido onCerrar={onCerrar} onIr={onIr} />;
}

function HistorialNotificacionesContenido({ onCerrar, onIr }: Omit<Props, 'abierto'>) {
  const [notificaciones, setNotificaciones] = useState<NotificacionHistorial[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosAplicados>({
    busqueda: '',
    fechaDesde: '',
    fechaHasta: '',
  });

  const cargar = useCallback(async (params?: { busqueda?: string; fechaDesde?: string; fechaHasta?: string; pagina?: number }) => {
    setCargando(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (params?.busqueda) q.set('busqueda', params.busqueda);
      if (params?.fechaDesde) q.set('fechaDesde', params.fechaDesde);
      if (params?.fechaHasta) q.set('fechaHasta', params.fechaHasta);
      if (params?.pagina) q.set('pagina', String(params.pagina));
      q.set('limite', '10');

      const res = await faregasFetch(`/notificaciones/historial?${q.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = (res as unknown as HistorialRespuesta);
      setNotificaciones(data.data ?? []);
      setTotal(data.total ?? 0);
      setPagina(data.pagina ?? 1);
      setTotalPaginas(data.totalPaginas ?? 1);
      setFiltrosAplicados({
        busqueda: String(params?.busqueda || '').trim(),
        fechaDesde: String(params?.fechaDesde || ''),
        fechaHasta: String(params?.fechaHasta || ''),
      });
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo cargar el historial.';
      setError(mensaje);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      void cargar({ pagina: 1 });
    }, 0);
    return () => window.clearTimeout(temporizador);
  }, [cargar]);

  useEffect(() => {
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [onCerrar]);

  const buscar = () => {
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      setError('La fecha Desde no puede ser posterior a la fecha Hasta.');
      return;
    }
    setPagina(1);
    void cargar({ busqueda, fechaDesde, fechaHasta, pagina: 1 });
  };

  const limpiar = () => {
    setBusqueda('');
    setFechaDesde('');
    setFechaHasta('');
    setPagina(1);
    void cargar({ pagina: 1 });
  };

  const cambiarPagina = (nuevaPagina: number) => {
    setPagina(nuevaPagina);
    void cargar({ busqueda, fechaDesde, fechaHasta, pagina: nuevaPagina });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3" role="dialog" aria-modal="true" aria-labelledby="historial-notificaciones-titulo">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 bg-[#052A79] px-5 py-4 text-white">
          <div>
            <h2 id="historial-notificaciones-titulo" className="font-black">HISTORIAL DE NOTIFICACIONES</h2>
            <p className="text-xs text-blue-100">Todas las notificaciones del usuario, incluidas las ya atendidas y leídas.</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="rounded-lg p-2 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b bg-slate-50 p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs font-bold text-slate-500">
                BUSCAR POR NOMBRE, USUARIO, CERTIFICADO, COMPROBANTE O SEDE
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') buscar(); }}
                  placeholder="Nombre, usuario, certificado, comprobante o sede..."
                  aria-label="Buscar por nombre, usuario, certificado, comprobante o sede"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 caret-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="min-w-[140px]">
              <label className="mb-1 block text-xs font-bold text-slate-500">FECHA DESDE</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-900 [color-scheme:light]"
              />
            </div>
            <div className="min-w-[140px]">
              <label className="mb-1 block text-xs font-bold text-slate-500">FECHA HASTA</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-900 [color-scheme:light]"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={buscar}
                disabled={cargando}
                className="flex items-center gap-1 rounded-lg bg-[#052A79] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                <Filter className="h-4 w-4" /> Buscar
              </button>
              <button
                type="button"
                onClick={limpiar}
                disabled={cargando}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
              >
                Limpiar
              </button>
            </div>
          </div>
          {(filtrosAplicados.busqueda || filtrosAplicados.fechaDesde || filtrosAplicados.fechaHasta) && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900" role="status">
              Filtros aplicados:
              {filtrosAplicados.busqueda && <> búsqueda “{filtrosAplicados.busqueda}”</>}
              {filtrosAplicados.fechaDesde && <> · desde {filtrosAplicados.fechaDesde}</>}
              {filtrosAplicados.fechaHasta && <> · hasta {filtrosAplicados.fechaHasta}</>}
              {' · '}{total} resultado{total !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cargando && notificaciones.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando historial…
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : notificaciones.length === 0 ? (
            <p className="text-center py-8 text-sm text-slate-500">No se encontraron notificaciones.</p>
          ) : (
            <div className="space-y-2">
              {notificaciones.map((n) => {
                const estado = String(n.estado_solicitud || '').trim().toUpperCase();
                const tieneSolicitud = Boolean(n.solicitud_id || n.entidad_tipo === 'SOLICITUD_OPERACION');
                const tieneDecision = ESTADOS_CON_DECISION.has(estado) && Boolean(n.fecha_decision);
                const esRechazo = estado === 'RECHAZADA';
                return (
                  <article
                    key={n.id}
                    className={`rounded-xl border p-4 text-sm shadow-sm ${n.leida ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/60'}`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-200 pb-2">
                      <h3 className="font-extrabold text-slate-900">{tituloNotificacionLegible(n)}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${n.leida ? 'bg-slate-100 text-slate-500' : 'border border-blue-200 bg-blue-100 text-blue-700'}`}>
                        {n.leida ? 'Leída' : 'Nueva'}
                      </span>
                    </div>

                    {tieneSolicitud ? (
                      <dl className="grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <dt className="font-bold text-slate-500">Solicitado por</dt>
                          <dd className="font-semibold text-slate-900">{nombreUsuarioLegible(n.solicitante_nombre, n.solicitante_username)}</dd>
                        </div>
                        {tieneDecision && n.autorizador_username && (
                          <div className="sm:col-span-2">
                            <dt className={`font-bold ${esRechazo ? 'text-red-600' : 'text-emerald-700'}`}>
                              {esRechazo ? 'Rechazado por' : 'Autorizado por'}
                            </dt>
                            <dd className="font-semibold text-slate-900">{nombreUsuarioLegible(n.autorizador_nombre, n.autorizador_username)}</dd>
                          </div>
                        )}
                        {n.autoaprobacion_excepcional === true && (
                          <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-bold text-amber-800">
                            Autoaprobación excepcional
                          </div>
                        )}
                        <div>
                          <dt className="font-bold text-slate-500">Operación</dt>
                          <dd className="text-slate-800">{operacionLegible(n)}</dd>
                        </div>
                        <div>
                          <dt className="font-bold text-slate-500">Estado</dt>
                          <dd className="text-slate-800">{etiquetaEstadoNotificacion(n.estado_solicitud)}</dd>
                        </div>
                        <div>
                          <dt className="font-bold text-slate-500">Certificado</dt>
                          <dd className="font-semibold text-slate-800">{n.certificado_numero || '-'}</dd>
                        </div>
                        <div>
                          <dt className="font-bold text-slate-500">Comprobante</dt>
                          <dd className="font-semibold text-slate-800">{n.comprobante_numero || '-'}</dd>
                        </div>
                        <div>
                          <dt className="font-bold text-slate-500">Sede</dt>
                          <dd className="text-slate-800">{n.planta_nombre || n.planta_key || '-'}</dd>
                        </div>
                        <div>
                          <dt className="font-bold text-slate-500">Solicitud</dt>
                          <dd className="text-slate-800">#{n.solicitud_id || n.entidad_id || '-'}</dd>
                        </div>
                        {esRechazo && n.justificacion_decision && (
                          <div className="sm:col-span-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                            <dt className="font-bold text-red-700">Motivo del rechazo</dt>
                            <dd className="mt-0.5 text-red-900">{n.justificacion_decision}</dd>
                          </div>
                        )}
                        <div className="sm:col-span-2">
                          <dt className="font-bold text-slate-500">{tieneDecision ? 'Fecha de decisión' : 'Fecha y hora'}</dt>
                          <dd className="text-slate-800">{formatearFechaHora((tieneDecision ? n.fecha_decision : n.fecha_creacion) || n.fecha_creacion)}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-sm leading-6 text-slate-700">{n.mensaje}</p>
                    )}

                    <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-2">
                      {n.destino_navegacion && onIr && (
                        <button
                          type="button"
                          onClick={() => onIr(n.destino_navegacion, n.id)}
                          className="rounded-md bg-[#052A79] px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-900"
                        >
                          IR
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {total > 0 && (
          <footer className="flex items-center justify-between border-t bg-slate-50 px-5 py-3">
            <span className="text-xs text-slate-500">
              {total} notificación{total !== 1 ? 'es' : ''} · Mostrando máximo 10 · Página {pagina} de {totalPaginas}
            </span>
            <nav className="flex items-center gap-1" aria-label="Paginación del historial">
              <button
                type="button"
                disabled={pagina <= 1 || cargando}
                onClick={() => cambiarPagina(pagina - 1)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"
              >
                Anterior
              </button>
              {obtenerPaginasVisibles(pagina, totalPaginas).map((item, indice) => (
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${indice}`} className="px-2 text-sm text-slate-400" aria-hidden="true">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    disabled={cargando}
                    aria-current={item === pagina ? 'page' : undefined}
                    aria-label={`Ir a la página ${item}`}
                    onClick={() => cambiarPagina(item)}
                    className={`min-w-9 rounded-lg border px-3 py-2 text-xs font-black ${
                      item === pagina
                        ? 'border-[#052A79] bg-[#052A79] text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    } disabled:opacity-40`}
                  >
                    {item}
                  </button>
                )
              ))}
              <button
                type="button"
                disabled={pagina >= totalPaginas || cargando}
                onClick={() => cambiarPagina(pagina + 1)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"
              >
                Siguiente
              </button>
            </nav>
          </footer>
        )}
      </div>
    </div>
  );
}
