import { useEffect, useState } from 'react';
import { ExternalLink, FileSearch, Loader2, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { faregasCertificadosApi } from '../../../services/faregas-certificados.api';
import {
  faregasFacturacionAdminApi,
  type DocumentoFacturacionAdmin,
  type FiltrosFacturacionAdmin,
  type OperacionFacturacionAdmin,
} from '../../../services/faregas-facturacion-admin.api';
// Componente de paginacion COMPARTIDO de FAREGAS: misma UI en los tres
// listados de esta tarea (chips, sedes y comprobantes).
import { Paginacion } from '../../components/Paginacion';

const fechaLocal = (value: string | null) => value
  ? new Date(value).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
  : '—';

const estadoClass = (estado: string) => {
  if (estado === 'ACEPTADO') return 'bg-green-100 text-green-700';
  if (estado === 'ERROR' || estado === 'RECHAZADO') return 'bg-red-100 text-red-700';
  if (estado === 'PENDIENTE' || estado === 'PENDIENTE_SUNAT') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};

const anulacionPresentacion = (documento: DocumentoFacturacionAdmin) => {
  const estado = String(documento.estadoAnulacion || '').toUpperCase();
  if (!estado) return { texto: 'Sin solicitud', clase: 'bg-slate-100 text-slate-600' };
  if (estado === 'BORRADOR' || estado === 'PENDIENTE') {
    return { texto: 'Pendiente de anulación', clase: 'bg-amber-100 text-amber-700' };
  }
  if (estado === 'ACEPTADO') {
    return { texto: documento.entornoFacturador === 'DEMO' ? 'Anulación DEMO procesada' : 'Anulado', clase: 'bg-green-100 text-green-700' };
  }
  if (estado === 'RECHAZADO') return { texto: 'Anulación rechazada', clase: 'bg-red-100 text-red-700' };
  return { texto: 'Error de anulación', clase: 'bg-red-100 text-red-700' };
};

interface DetalleState {
  documento: DocumentoFacturacionAdmin;
  intentos: OperacionFacturacionAdmin[];
  operaciones: OperacionFacturacionAdmin[];
}

export default function TabDocumentosFacturacion() {
  const navigate = useNavigate();
  // Listado transaccional: 10 comprobantes por página, paginado en el backend.
  // La fecha es la LOCAL; HOY se calcula con getters locales, no con toISOString().
  const hoyLocal = () => {
    const ahora = new Date();
    const y = ahora.getFullYear();
    const m = String(ahora.getMonth() + 1).padStart(2, '0');
    const d = String(ahora.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const [filtros, setFiltros] = useState<FiltrosFacturacionAdmin>({ pagina: 1, limite: 10, fechaDesde: hoyLocal(), fechaHasta: hoyLocal() });
  const [documentos, setDocumentos] = useState<DocumentoFacturacionAdmin[]>([]);
  const [plantas, setPlantas] = useState<Array<{ key: string; nombre: string; empresaKey: string }>>([]);
  const [empresas, setEmpresas] = useState<Array<{ key: string; nombre: string }>>([]);
  const [resumen, setResumen] = useState({ items: 0, total: 0, page: 1, limit: 10, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<DetalleState | null>(null);

  const cargar = async (nuevosFiltros: FiltrosFacturacionAdmin = filtros) => {
    setLoading(true);
    try {
      const response = await faregasFacturacionAdminApi.listar(nuevosFiltros);
      setDocumentos(response.data.documentos);
      setPlantas(response.data.plantas);
      setEmpresas(response.data.empresas);
      const limite = Number(response.data.limit ?? response.data.limite ?? nuevosFiltros.limite ?? 10);
      setResumen({
        items: response.data.documentos.length,
        total: Number(response.data.total || 0),
        page: Number(response.data.page ?? response.data.pagina ?? 1),
        limit: limite,
        totalPages: Number(
          response.data.totalPages
          ?? (response.data.total ? Math.ceil(Number(response.data.total) / limite) : 0)
        )
      });
    } catch (error: unknown) {
      await Swal.fire('Facturación', error instanceof Error ? error.message : 'No se pudo cargar la lista.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const hoy = hoyLocal();
    faregasFacturacionAdminApi.listar({ pagina: 1, limite: 10, fechaDesde: hoy, fechaHasta: hoy })
      .then((response) => {
        setDocumentos(response.data.documentos);
        setPlantas(response.data.plantas);
        setEmpresas(response.data.empresas);
        const limite = Number(response.data.limit ?? response.data.limite ?? 10);
        setResumen({
          items: response.data.documentos.length,
          total: Number(response.data.total || 0),
          page: Number(response.data.page ?? response.data.pagina ?? 1),
          limit: limite,
          totalPages: Number(
            response.data.totalPages
            ?? (response.data.total ? Math.ceil(Number(response.data.total) / limite) : 0)
          )
        });
      })
      .catch((error: unknown) => Swal.fire('Facturación', error instanceof Error ? error.message : 'No se pudo cargar la lista.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const buscar = () => {
    // Cualquier cambio de filtro vuelve a la página 1.
    const siguientes = { ...filtros, pagina: 1 };
    setFiltros(siguientes);
    void cargar(siguientes);
  };

  // "Limpiar" restaura HOY -> HOY, nunca "todo el histórico".
  const limpiar = () => {
    const vacios: FiltrosFacturacionAdmin = { pagina: 1, limite: filtros.limite ?? 10, fechaDesde: hoyLocal(), fechaHasta: hoyLocal() };
    setFiltros(vacios);
    void cargar(vacios);
  };

  const verDetalle = async (id: number) => {
    setProcesandoId(id);
    try {
      const response = await faregasFacturacionAdminApi.obtenerDetalle(id);
      setDetalle(response.data);
    } catch (error: unknown) {
      await Swal.fire('Detalle', error instanceof Error ? error.message : 'No se pudo cargar el detalle.', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const reintentar = async (documento: DocumentoFacturacionAdmin) => {
    if (!documento.certificadoId) return;
    const confirmacion = await Swal.fire({
      title: '¿Reintentar el comprobante?',
      text: 'Se reutilizarán la misma serie, número y contenido. El backend bloqueará la operación si Nubefact continúa deshabilitado.',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'REINTENTAR', cancelButtonText: 'CANCELAR'
    });
    if (!confirmacion.isConfirmed) return;
    setProcesandoId(documento.id);
    try {
      await faregasCertificadosApi.emitirFacturacion(documento.certificadoId);
      await Swal.fire('Procesado', 'El comprobante fue procesado correctamente.', 'success');
      await cargar();
    } catch (error: unknown) {
      await Swal.fire('No se procesó', error instanceof Error ? error.message : 'Revise la configuración y el estado del comprobante.', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const consultarAnulacion = async (documento: DocumentoFacturacionAdmin) => {
    if (!documento.anulacionId || !documento.certificadoId) return;
    setProcesandoId(documento.id);
    try {
      await faregasCertificadosApi.consultarAnulacionElectronica(documento.certificadoId, documento.anulacionId);
      await cargar();
      await Swal.fire('Anulación consultada', 'El estado fue actualizado con la respuesta disponible en NubeFact/SUNAT.', 'success');
    } catch (error: unknown) {
      await Swal.fire('No se pudo consultar', error instanceof Error ? error.message : 'No se pudo actualizar la anulación.', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const plantasFiltradas = filtros.empresaKey
    ? plantas.filter((planta) => planta.empresaKey === filtros.empresaKey)
    : plantas;
  // El total y el número de páginas los calcula el backend y llegan en el sobre
  // de paginación; no se recalculan aquí para no discrepar del COUNT.

  const accionesDocumento = (documento: DocumentoFacturacionAdmin) => {
    const anulacionPendiente = ['BORRADOR', 'PENDIENTE'].includes(String(documento.estadoAnulacion || '').toUpperCase());
    const claseAccion = 'inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold transition disabled:opacity-50';

    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void verDetalle(documento.id)} className={`${claseAccion} border-blue-200 bg-blue-50 text-blue-800`}>Detalle</button>
        {documento.certificadoId != null && (
          <button type="button" onClick={() => navigate(`/faregas/certificados/${documento.certificadoId}/continuar`)} className={`${claseAccion} border-blue-200 bg-white text-blue-800`}>Certificado</button>
        )}
        {documento.enlacePdf && (
          <a href={documento.enlacePdf} target="_blank" rel="noreferrer" className={`${claseAccion} border-slate-200 bg-white text-slate-700`}>PDF <ExternalLink className="h-3 w-3" /></a>
        )}
        {anulacionPendiente && (
          <button disabled={procesandoId === documento.id} type="button" onClick={() => void consultarAnulacion(documento)} className={`${claseAccion} border-amber-200 bg-amber-50 text-amber-800`}><RefreshCw className={`h-3 w-3 ${procesandoId === documento.id ? 'animate-spin' : ''}`} /> Consultar anulación</button>
        )}
        {documento.certificadoId != null && !documento.anulacionId && ['ERROR', 'PENDIENTE'].includes(documento.estado) && (
          <button disabled={procesandoId === documento.id} type="button" onClick={() => void reintentar(documento)} className={`${claseAccion} border-amber-200 bg-amber-50 text-amber-800`}><RefreshCw className="h-3 w-3" /> Reintentar</button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800 sm:p-4 sm:text-sm">
        Consulta administrativa de comprobantes y anulaciones para DEMO y PRODUCCIÓN. En producción la confirmación final corresponde a SUNAT; esta pantalla nunca muestra rutas, tokens ni respuestas completas del proveedor.
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 sm:border sm:border-slate-200 sm:p-4 md:grid-cols-2 xl:grid-cols-6">
        <input value={filtros.texto || ''} onChange={(e) => setFiltros((prev) => ({ ...prev, texto: e.target.value }))} placeholder="Comprobante, cliente, DNI/RUC o placa" className="min-w-0 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:col-span-2" />
        <select value={filtros.empresaKey || ''} onChange={(e) => setFiltros((prev) => ({ ...prev, empresaKey: e.target.value, plantaKey: '' }))} className="min-w-0 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-blue-500"><option value="">Todas las empresas</option>{empresas.map((empresa) => <option key={empresa.key} value={empresa.key}>{empresa.nombre}</option>)}</select>
        <select value={filtros.plantaKey || ''} onChange={(e) => setFiltros((prev) => ({ ...prev, plantaKey: e.target.value }))} className="min-w-0 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-blue-500"><option value="">Todas las sedes autorizadas</option>{plantasFiltradas.map((planta) => <option key={planta.key} value={planta.key}>{planta.nombre}</option>)}</select>
        <select value={filtros.estado || ''} onChange={(e) => setFiltros((prev) => ({ ...prev, estado: e.target.value }))} className="min-w-0 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-blue-500"><option value="">Todos los estados</option><option value="PENDIENTE_ANULACION">Pendiente de anulación</option><option value="ANULADO">Anulado</option><option value="ANULACION_RECHAZADA">Anulación rechazada/error</option>{['BORRADOR', 'PENDIENTE', 'PENDIENTE_SUNAT', 'ACEPTADO', 'RECHAZADO', 'ERROR'].map((estado) => <option key={estado}>{estado}</option>)}</select>
        <label className="min-w-0 text-xs font-bold text-slate-600">Desde
          <input type="date" value={filtros.fechaDesde || ''} max={filtros.fechaHasta || undefined} onChange={(e) => setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value }))} className="mt-1 min-w-0 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal text-slate-700 outline-none focus:border-blue-500" />
        </label>
        <label className="min-w-0 text-xs font-bold text-slate-600">Hasta
          <input type="date" value={filtros.fechaHasta || ''} min={filtros.fechaDesde || undefined} onChange={(e) => setFiltros((prev) => ({ ...prev, fechaHasta: e.target.value }))} className="mt-1 min-w-0 w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal text-slate-700 outline-none focus:border-blue-500" />
        </label>
        <div className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-1"><button type="button" onClick={buscar} className="rounded-lg bg-[#052a79] px-3 py-2.5 text-xs font-black text-white">BUSCAR</button><button type="button" onClick={limpiar} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700">LIMPIAR</button></div>
      </div>

      <div className="space-y-3 md:hidden">
        {loading && <div className="rounded-xl bg-slate-50 p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#052a79]" /></div>}
        {!loading && documentos.length === 0 && <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No se encontraron comprobantes.</div>}
        {!loading && documentos.map((documento) => {
          const anulacion = anulacionPresentacion(documento);
          return (
            <article key={documento.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-900">{documento.nroComprobante || 'SIN NÚMERO'}</p>
                  <p className="mt-1 text-xs text-slate-500">{fechaLocal(documento.fechaCreacion)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${estadoClass(documento.estado)}`}>{documento.estado}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
                <div className="col-span-2"><dt className="font-bold text-slate-400">CLIENTE</dt><dd className="mt-0.5 break-words font-semibold text-slate-700">{documento.cliente}</dd><dd className="text-slate-500">{documento.nroDocumento} · {documento.placa || 'Sin placa'}</dd></div>
                <div><dt className="font-bold text-slate-400">EMPRESA / SEDE</dt><dd className="mt-0.5 break-words text-slate-700">{documento.empresaNombre}<br />{documento.plantaNombre}</dd></div>
                <div><dt className="font-bold text-slate-400">TOTAL</dt><dd className="mt-0.5 text-base font-black text-[#052a79]">S/ {documento.importeTotal.toFixed(2)}</dd></div>
                <div className="col-span-2"><dt className="font-bold text-slate-400">ANULACIÓN</dt><dd className="mt-1"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${anulacion.clase}`}>{anulacion.texto}</span></dd></div>
              </dl>
              <div className="mt-4 border-t border-slate-100 pt-3">{accionesDocumento(documento)}</div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs capitalize text-slate-600"><tr><th className="p-3">Fecha</th><th className="p-3">Comprobante</th><th className="p-3">Cliente</th><th className="p-3">Empresa / sede</th><th className="p-3">Total</th><th className="p-3">Estado</th><th className="p-3">Anulación</th><th className="p-3">Acciones</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>}
            {!loading && documentos.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-slate-500">No se encontraron comprobantes.</td></tr>}
            {!loading && documentos.map((documento) => {
              const anulacion = anulacionPresentacion(documento);
              return (
              <tr key={documento.id} className="border-t border-slate-100 align-top">
                <td className="p-3">{fechaLocal(documento.fechaCreacion)}</td>
                <td className="p-3"><div className="font-bold">{documento.nroComprobante || 'SIN NÚMERO'}</div><div className="text-xs text-slate-500">{documento.tipoComprobante} · {documento.origen === 'VENTA_CHIP' ? `Venta de Chip · Op. ${documento.operacionId}` : documento.origen === 'CERTIFICADO' ? `Cert. ${documento.certificadoId}` : 'Operación'}</div></td>
                <td className="p-3"><div className="font-semibold">{documento.cliente}</div><div className="text-xs text-slate-500">{documento.nroDocumento} · {documento.placa || 'Sin placa'}</div></td>
                <td className="p-3"><div>{documento.empresaNombre}</div><div className="text-xs text-slate-500">{documento.plantaNombre}</div></td>
                <td className="p-3 font-bold">S/ {documento.importeTotal.toFixed(2)}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${estadoClass(documento.estado)}`}>{documento.estado}</span><div className="mt-1 text-xs text-slate-500">{documento.intentos} intento(s)</div></td>
                <td className="p-3"><span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-bold ${anulacion.clase}`}>{anulacion.texto}</span>{documento.fechaSolicitudAnulacion && <div className="mt-1 text-xs text-slate-500">{fechaLocal(documento.fechaSolicitudAnulacion)}</div>}</td>
                <td className="p-3">{accionesDocumento(documento)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Paginacion
        resumen={resumen}
        etiqueta="comprobantes"
        deshabilitado={loading}
        onCambioPagina={(pagina) => {
          const next = { ...filtros, pagina };
          setFiltros(next);
          void cargar(next);
        }}
        onCambioPageSize={(limite) => {
          // Cambiar el tamaño también vuelve a la página 1.
          const next = { ...filtros, limite, pagina: 1 };
          setFiltros(next);
          void cargar(next);
        }}
      />

      {detalle && <DetalleModal detalle={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}

function DetalleModal({ detalle, onClose }: { detalle: DetalleState; onClose: () => void }) {
  const registros = [...detalle.operaciones, ...detalle.intentos]
    .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime());
  const anulacion = anulacionPresentacion(detalle.documento);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-2xl"><div className="sticky top-0 flex items-center justify-between border-b bg-white p-5"><div><h3 className="flex items-center gap-2 text-lg font-black text-[#052a79]"><FileSearch className="h-5 w-5" /> {detalle.documento.nroComprobante || 'Comprobante sin número'}</h3><p className="text-sm text-slate-500">Historial técnico sin datos secretos</p></div><button onClick={onClose}><X /></button></div><div className="space-y-4 p-5"><div className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4"><div><span className="text-xs text-slate-500">Cliente</span><p className="font-bold">{detalle.documento.cliente}</p></div><div><span className="text-xs text-slate-500">Sede</span><p className="font-bold">{detalle.documento.plantaNombre}</p></div><div><span className="text-xs text-slate-500">Estado comprobante</span><p className="font-bold">{detalle.documento.estado}</p></div><div><span className="text-xs text-slate-500">Ambiente</span><p className="font-bold">{detalle.documento.entornoFacturador || '—'}</p></div></div>{detalle.documento.anulacionId && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><div className="flex flex-wrap items-center gap-2"><span className="font-black text-slate-800">Anulación #{detalle.documento.anulacionId}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${anulacion.clase}`}>{anulacion.texto}</span></div><p className="mt-2"><span className="font-semibold">Motivo:</span> {detalle.documento.motivoAnulacion || '—'}</p>{detalle.documento.descripcionAnulacion && <p className="mt-1 text-slate-600">{detalle.documento.descripcionAnulacion}</p>}<p className="mt-1 text-xs text-slate-500">Solicitada: {fechaLocal(detalle.documento.fechaSolicitudAnulacion)}{detalle.documento.ticketAnulacionSunat ? ` · Ticket SUNAT: ${detalle.documento.ticketAnulacionSunat}` : ''}</p></div>}{detalle.documento.mensajeSunat && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{detalle.documento.mensajeSunat}</div>}<div className="overflow-x-auto rounded-xl border"><table className="min-w-full text-sm"><thead className="bg-slate-100 text-left"><tr><th className="p-3">Fecha</th><th className="p-3">Operación</th><th className="p-3">Intento</th><th className="p-3">Estado</th><th className="p-3">HTTP / error</th></tr></thead><tbody>{registros.map((registro, index) => <tr key={`${registro.operacion || 'EMITIR'}-${registro.numero_intento}-${index}`} className="border-t"><td className="p-3">{fechaLocal(registro.fecha_creacion)}</td><td className="p-3">{registro.operacion || 'EMITIR'}</td><td className="p-3">{registro.numero_intento}</td><td className="p-3">{registro.estado}</td><td className="p-3">{registro.http_status || '—'} {registro.error ? `· ${registro.error}` : ''}</td></tr>)}{registros.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Sin intentos registrados.</td></tr>}</tbody></table></div><div className="flex flex-wrap gap-3">{detalle.documento.enlacePdf && <a target="_blank" rel="noreferrer" href={detalle.documento.enlacePdf} className="rounded-lg bg-[#052a79] px-4 py-2 font-bold text-white">PDF</a>}{detalle.documento.enlaceXml && <a target="_blank" rel="noreferrer" href={detalle.documento.enlaceXml} className="rounded-lg border px-4 py-2 font-bold">XML</a>}{detalle.documento.enlaceCdr && <a target="_blank" rel="noreferrer" href={detalle.documento.enlaceCdr} className="rounded-lg border px-4 py-2 font-bold">CDR</a>}</div></div></div></div>;
}
