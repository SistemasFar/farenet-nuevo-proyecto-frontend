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

const fechaLocal = (value: string | null) => value
  ? new Date(value).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
  : '—';

const estadoClass = (estado: string) => {
  if (estado === 'ACEPTADO') return 'bg-green-100 text-green-700';
  if (estado === 'ERROR' || estado === 'RECHAZADO') return 'bg-red-100 text-red-700';
  if (estado === 'PENDIENTE') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};

interface DetalleState {
  documento: DocumentoFacturacionAdmin;
  intentos: OperacionFacturacionAdmin[];
  operaciones: OperacionFacturacionAdmin[];
}

export default function TabDocumentosFacturacion() {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState<FiltrosFacturacionAdmin>({ pagina: 1, limite: 50 });
  const [documentos, setDocumentos] = useState<DocumentoFacturacionAdmin[]>([]);
  const [plantas, setPlantas] = useState<Array<{ key: string; nombre: string; empresaKey: string }>>([]);
  const [empresas, setEmpresas] = useState<Array<{ key: string; nombre: string }>>([]);
  const [total, setTotal] = useState(0);
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
      setTotal(response.data.total);
    } catch (error: unknown) {
      await Swal.fire('Facturación', error instanceof Error ? error.message : 'No se pudo cargar la lista.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    faregasFacturacionAdminApi.listar({ pagina: 1, limite: 50 })
      .then((response) => {
        setDocumentos(response.data.documentos);
        setPlantas(response.data.plantas);
        setEmpresas(response.data.empresas);
        setTotal(response.data.total);
      })
      .catch((error: unknown) => Swal.fire('Facturación', error instanceof Error ? error.message : 'No se pudo cargar la lista.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const buscar = () => {
    const siguientes = { ...filtros, pagina: 1 };
    setFiltros(siguientes);
    void cargar(siguientes);
  };

  const limpiar = () => {
    const vacios: FiltrosFacturacionAdmin = { pagina: 1, limite: 50 };
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

  const plantasFiltradas = filtros.empresaKey
    ? plantas.filter((planta) => planta.empresaKey === filtros.empresaKey)
    : plantas;
  const totalPaginas = Math.max(1, Math.ceil(total / Number(filtros.limite || 50)));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        Consulta administrativa de comprobantes. Esta pantalla nunca muestra rutas, tokens ni respuestas completas del proveedor.
      </div>

      <div className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-3 xl:grid-cols-6">
        <input value={filtros.texto || ''} onChange={(e) => setFiltros((prev) => ({ ...prev, texto: e.target.value }))} placeholder="Comprobante, cliente, DNI/RUC o placa" className="rounded-lg border p-2.5 md:col-span-2" />
        <select value={filtros.empresaKey || ''} onChange={(e) => setFiltros((prev) => ({ ...prev, empresaKey: e.target.value, plantaKey: '' }))} className="rounded-lg border bg-white p-2.5"><option value="">Todas las empresas</option>{empresas.map((empresa) => <option key={empresa.key} value={empresa.key}>{empresa.nombre}</option>)}</select>
        <select value={filtros.plantaKey || ''} onChange={(e) => setFiltros((prev) => ({ ...prev, plantaKey: e.target.value }))} className="rounded-lg border bg-white p-2.5"><option value="">Todas las sedes autorizadas</option>{plantasFiltradas.map((planta) => <option key={planta.key} value={planta.key}>{planta.nombre}</option>)}</select>
        <select value={filtros.estado || ''} onChange={(e) => setFiltros((prev) => ({ ...prev, estado: e.target.value }))} className="rounded-lg border bg-white p-2.5"><option value="">Todos los estados</option>{['BORRADOR', 'PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'ERROR', 'ANULADO'].map((estado) => <option key={estado}>{estado}</option>)}</select>
        <div className="flex gap-2"><button type="button" onClick={buscar} className="flex-1 rounded-lg bg-[#052a79] px-3 py-2 font-bold text-white">BUSCAR</button><button type="button" onClick={limpiar} className="rounded-lg border px-3 py-2 font-bold">LIMPIAR</button></div>
        <input type="date" value={filtros.fechaDesde || ''} onChange={(e) => setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value }))} className="rounded-lg border p-2.5" />
        <input type="date" value={filtros.fechaHasta || ''} onChange={(e) => setFiltros((prev) => ({ ...prev, fechaHasta: e.target.value }))} className="rounded-lg border p-2.5" />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600"><tr><th className="p-3">Fecha</th><th className="p-3">Comprobante</th><th className="p-3">Cliente</th><th className="p-3">Empresa / sede</th><th className="p-3">Total</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></td></tr>}
            {!loading && documentos.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-slate-500">No se encontraron comprobantes.</td></tr>}
            {!loading && documentos.map((documento) => (
              <tr key={documento.id} className="border-t align-top">
                <td className="p-3">{fechaLocal(documento.fechaCreacion)}</td>
                <td className="p-3"><div className="font-bold">{documento.nroComprobante || 'SIN NÚMERO'}</div><div className="text-xs text-slate-500">{documento.tipoComprobante} · Cert. {documento.certificadoId}</div></td>
                <td className="p-3"><div className="font-semibold">{documento.cliente}</div><div className="text-xs text-slate-500">{documento.nroDocumento} · {documento.placa || 'Sin placa'}</div></td>
                <td className="p-3"><div>{documento.empresaNombre}</div><div className="text-xs text-slate-500">{documento.plantaNombre}</div></td>
                <td className="p-3 font-bold">S/ {documento.importeTotal.toFixed(2)}</td>
                <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${estadoClass(documento.estado)}`}>{documento.estado}</span><div className="mt-1 text-xs text-slate-500">{documento.intentos} intento(s)</div></td>
                <td className="p-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void verDetalle(documento.id)} className="text-blue-700 underline">Detalle</button><button type="button" onClick={() => navigate(`/faregas/certificados/${documento.certificadoId}/continuar`)} className="text-blue-700 underline">Certificado</button>{documento.enlacePdf && <a href={documento.enlacePdf} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 underline">PDF <ExternalLink className="h-3 w-3" /></a>}{['ERROR', 'PENDIENTE'].includes(documento.estado) && <button disabled={procesandoId === documento.id} type="button" onClick={() => void reintentar(documento)} className="inline-flex items-center gap-1 text-amber-700 underline disabled:opacity-50"><RefreshCw className="h-3 w-3" /> Reintentar</button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm"><span>{total} comprobante(s)</span><div className="flex items-center gap-2"><button disabled={Number(filtros.pagina || 1) <= 1} onClick={() => { const pagina = Number(filtros.pagina || 1) - 1; const next = { ...filtros, pagina }; setFiltros(next); void cargar(next); }} className="rounded border px-3 py-1 disabled:opacity-40">Anterior</button><span>Página {filtros.pagina || 1} de {totalPaginas}</span><button disabled={Number(filtros.pagina || 1) >= totalPaginas} onClick={() => { const pagina = Number(filtros.pagina || 1) + 1; const next = { ...filtros, pagina }; setFiltros(next); void cargar(next); }} className="rounded border px-3 py-1 disabled:opacity-40">Siguiente</button></div></div>

      {detalle && <DetalleModal detalle={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}

function DetalleModal({ detalle, onClose }: { detalle: DetalleState; onClose: () => void }) {
  const registros = [...detalle.operaciones, ...detalle.intentos]
    .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime());
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-2xl"><div className="sticky top-0 flex items-center justify-between border-b bg-white p-5"><div><h3 className="flex items-center gap-2 text-lg font-black text-[#052a79]"><FileSearch className="h-5 w-5" /> {detalle.documento.nroComprobante || 'Comprobante sin número'}</h3><p className="text-sm text-slate-500">Historial técnico sin datos secretos</p></div><button onClick={onClose}><X /></button></div><div className="space-y-4 p-5"><div className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-3"><div><span className="text-xs text-slate-500">Cliente</span><p className="font-bold">{detalle.documento.cliente}</p></div><div><span className="text-xs text-slate-500">Sede</span><p className="font-bold">{detalle.documento.plantaNombre}</p></div><div><span className="text-xs text-slate-500">Estado</span><p className="font-bold">{detalle.documento.estado}</p></div></div>{detalle.documento.mensajeSunat && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{detalle.documento.mensajeSunat}</div>}<div className="overflow-x-auto rounded-xl border"><table className="min-w-full text-sm"><thead className="bg-slate-100 text-left"><tr><th className="p-3">Fecha</th><th className="p-3">Operación</th><th className="p-3">Intento</th><th className="p-3">Estado</th><th className="p-3">HTTP / error</th></tr></thead><tbody>{registros.map((registro, index) => <tr key={`${registro.operacion || 'EMITIR'}-${registro.numero_intento}-${index}`} className="border-t"><td className="p-3">{fechaLocal(registro.fecha_creacion)}</td><td className="p-3">{registro.operacion || 'EMITIR'}</td><td className="p-3">{registro.numero_intento}</td><td className="p-3">{registro.estado}</td><td className="p-3">{registro.http_status || '—'} {registro.error ? `· ${registro.error}` : ''}</td></tr>)}{registros.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Sin intentos registrados.</td></tr>}</tbody></table></div><div className="flex flex-wrap gap-3">{detalle.documento.enlacePdf && <a target="_blank" rel="noreferrer" href={detalle.documento.enlacePdf} className="rounded-lg bg-[#052a79] px-4 py-2 font-bold text-white">PDF</a>}{detalle.documento.enlaceXml && <a target="_blank" rel="noreferrer" href={detalle.documento.enlaceXml} className="rounded-lg border px-4 py-2 font-bold">XML</a>}{detalle.documento.enlaceCdr && <a target="_blank" rel="noreferrer" href={detalle.documento.enlaceCdr} className="rounded-lg border px-4 py-2 font-bold">CDR</a>}</div></div></div></div>;
}
