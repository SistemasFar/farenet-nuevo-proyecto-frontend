import { Edit3, Eye, FileUp, PlayCircle, Trash2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { faregasConfigApi, type ServicioConfiguracionFaregas } from '../../../services/faregas-config.api';
import { faregasFormatosApi, type Formato, type FormatoVersion } from '../../../services/faregas-formatos.api';
import FormatosVariablesEditor from './FormatosVariablesEditor';

const FormatoHtmlVariablesEditor = lazy(() => import('./FormatoHtmlVariablesEditor'));

interface Props {
  formatoId?: number;
  formato?: Formato;
  contextoOperacion?: ServicioConfiguracionFaregas;
  onClose: () => void;
  onCreateVariant?: (formato: Formato) => void;
  onFormatoChanged?: (formato: Formato) => void;
}

interface OperacionVinculada {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

const mensajeError = (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error inesperado.';

export default function FormatoDetalleModal({
  formatoId,
  formato: formatoInicial,
  contextoOperacion,
  onClose,
  onCreateVariant,
  onFormatoChanged
}: Props) {
  const [formato, setFormato] = useState<Formato | null>(formatoInicial || null);
  const [operacionesVinculadas, setOperacionesVinculadas] = useState<OperacionVinculada[]>([]);
  const [versiones, setVersiones] = useState<FormatoVersion[]>([]);
  const [loadingFormato, setLoadingFormato] = useState(!formatoInicial);
  const [loadingVersiones, setLoadingVersiones] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [editorVersion, setEditorVersion] = useState<FormatoVersion | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cargarMetadatos = async (id: number) => {
    const formatos = await faregasFormatosApi.listarFormatos();
    const encontrado = formatos.find((item) => item.id === id);
    if (!encontrado) throw new Error('Formato no encontrado.');
    setFormato(encontrado);
    return encontrado;
  };

  useEffect(() => {
    const id = formatoInicial?.id ?? formatoId;
    if (!id) {
      setError('No se indicó el formato que se debe administrar.');
      setLoadingFormato(false);
      return;
    }
    let cancelado = false;
    setLoadingFormato(!formatoInicial);
    Promise.all([
      formatoInicial ? Promise.resolve(formatoInicial) : faregasFormatosApi.listarFormatos().then((items) => {
        const encontrado = items.find((item) => item.id === id);
        if (!encontrado) throw new Error('Formato no encontrado.');
        return encontrado;
      }),
      faregasFormatosApi.obtenerOperacionesPorFormato(id)
    ]).then(([formatoCargado, operaciones]) => {
      if (cancelado) return;
      setFormato(formatoCargado);
      setOperacionesVinculadas(operaciones);
      setError('');
    }).catch((cause: unknown) => {
      if (!cancelado) setError(mensajeError(cause));
    }).finally(() => {
      if (!cancelado) setLoadingFormato(false);
    });
    return () => { cancelado = true; };
  }, [formatoId, formatoInicial]);

  const cargarVersiones = async (id: number) => {
    setLoadingVersiones(true);
    try {
      setVersiones(await faregasFormatosApi.listarVersiones(id));
    } finally {
      setLoadingVersiones(false);
    }
  };

  useEffect(() => {
    if (!formato?.id) return;
    let cancelado = false;
    setLoadingVersiones(true);
    faregasFormatosApi.listarVersiones(formato.id)
      .then((resultado) => { if (!cancelado) setVersiones(resultado); })
      .catch((cause: unknown) => { if (!cancelado) setError(mensajeError(cause)); })
      .finally(() => { if (!cancelado) setLoadingVersiones(false); });
    return () => { cancelado = true; };
  }, [formato?.id]);

  const crearVersionHtml = async () => {
    if (!formato) return;
    setWorking(true);
    setError('');
    try {
      await faregasFormatosApi.crearVersionHtml(formato.id);
      await cargarVersiones(formato.id);
    } catch (cause) {
      setError(mensajeError(cause));
    } finally {
      setWorking(false);
    }
  };

  const subirVersion = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    if (!archivo || !formato) return;
    if (formato.es_protegido) {
      setError('No se pueden subir versiones a un formato protegido.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      await faregasFormatosApi.subirVersion(formato.id, archivo);
      await cargarVersiones(formato.id);
    } catch (cause) {
      setError(mensajeError(cause));
    } finally {
      setWorking(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const previsualizar = async (version: FormatoVersion) => {
    if (!formato) return;
    try {
      const token = sessionStorage.getItem('faregasAccessToken');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/faregas/formatos/${formato.id}/versiones/${version.id}/preview`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'No se pudo obtener la previsualización.');
      }
      if (version.motor === 'HTML_DINAMICO') {
        const payload = await response.json();
        setPreviewHtml(payload.html);
        return;
      }
      const blobUrl = window.URL.createObjectURL(await response.blob());
      const enlace = document.createElement('a');
      enlace.href = blobUrl;
      enlace.download = `preview_v${version.version}.docx`;
      enlace.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (cause) {
      setError(mensajeError(cause));
    }
  };

  const activar = async (version: FormatoVersion) => {
    if (!formato || formato.es_protegido) return;
    if (!window.confirm('¿Activar esta versión? La versión vigente anterior pasará a RETIRADA.')) return;
    setWorking(true);
    try {
      await faregasFormatosApi.activarVersion(formato.id, version.id);
      await cargarVersiones(formato.id);
    } catch (cause) {
      setError(mensajeError(cause));
    } finally {
      setWorking(false);
    }
  };

  const eliminar = async (version: FormatoVersion) => {
    if (!formato || formato.es_protegido) return;
    if (!window.confirm('¿Eliminar esta versión?')) return;
    setWorking(true);
    try {
      await faregasFormatosApi.eliminarVersion(formato.id, version.id);
      await cargarVersiones(formato.id);
    } catch (cause) {
      setError(mensajeError(cause));
    } finally {
      setWorking(false);
    }
  };

  const cambiarEstado = async () => {
    if (!formato || formato.es_protegido) return;
    if (!window.confirm(`¿${formato.activo ? 'Desactivar' : 'Reactivar'} este formato?`)) return;
    setWorking(true);
    try {
      await faregasFormatosApi.cambiarEstado(formato.id);
      const actualizado = await cargarMetadatos(formato.id);
      onFormatoChanged?.(actualizado);
    } catch (cause) {
      setError(mensajeError(cause));
    } finally {
      setWorking(false);
    }
  };

  const crearVarianteOperacion = async () => {
    if (!formato || !contextoOperacion) return;
    if (!window.confirm(`¿Crear una variante de ${formato.nombre} solo para ${contextoOperacion.nombre}?`)) return;
    setWorking(true);
    try {
      const variante = await faregasConfigApi.crearVarianteFormato(contextoOperacion.id);
      setFormato(variante);
      setOperacionesVinculadas([{ ...contextoOperacion, activo: contextoOperacion.activo }]);
      onFormatoChanged?.(variante);
    } catch (cause) {
      setError(mensajeError(cause));
    } finally {
      setWorking(false);
    }
  };

  if (formato && editorVersion) {
    return editorVersion.motor === 'HTML_DINAMICO'
      ? <Suspense fallback={<div className="fixed inset-0 z-50 grid place-items-center bg-slate-100 text-slate-500">Cargando diseñador…</div>}><FormatoHtmlVariablesEditor formato={formato} version={editorVersion} onBack={() => { setEditorVersion(null); void cargarVersiones(formato.id); }} /></Suspense>
      : <FormatosVariablesEditor formato={formato} version={editorVersion} onBack={() => { setEditorVersion(null); void cargarVersiones(formato.id); }} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl">
        {loadingFormato ? (
          <div className="m-auto text-slate-500">Cargando formato...</div>
        ) : !formato ? (
          <div className="m-auto max-w-md text-center">
            <p className="mb-4 font-semibold text-red-700">{error || 'Formato no disponible.'}</p>
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2">Cerrar</button>
          </div>
        ) : (
          <>
            <header className="flex flex-col gap-4 border-b px-6 py-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#052A79]">Detalle de formato</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <b>{formato.nombre}</b>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono">{formato.codigo}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5">{formato.motor}</span>
                  {formato.formato_padre_nombre && <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">Base: {formato.formato_padre_nombre}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${formato.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{formato.activo ? 'ACTIVO' : 'INACTIVO'}</span>
                  {formato.es_protegido && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">SISTEMA / PROTEGIDO</span>}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {!formato.es_protegido && <button type="button" disabled={working} onClick={() => void cambiarEstado()} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">{formato.activo ? 'Desactivar formato' : 'Reactivar formato'}</button>}
                {!formato.es_protegido && formato.motor === 'HTML_DINAMICO' && <button type="button" disabled={working} onClick={() => void crearVersionHtml()} className="flex items-center gap-2 rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><FileUp size={16} /> Nueva versión HTML</button>}
                {!formato.es_protegido && formato.motor === 'DOCX_DINAMICO' && <><input type="file" ref={fileInputRef} onChange={subirVersion} accept=".docx" className="hidden" /><button type="button" disabled={working} onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><FileUp size={16} /> Subir versión DOCX</button></>}
                {contextoOperacion && (formato.es_protegido || operacionesVinculadas.length > 1) && <button type="button" disabled={working} onClick={() => void crearVarianteOperacion()} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Crear variante para esta operación</button>}
                {!contextoOperacion && formato.es_protegido && onCreateVariant && <button type="button" onClick={() => onCreateVariant(formato)} className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white">Crear variante</button>}
                <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold text-slate-600">Cerrar</button>
              </div>
            </header>

            <div className="flex-1 overflow-auto p-6">
              {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
              {operacionesVinculadas.length > 1 && (
                <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-bold">Este formato es utilizado por {operacionesVinculadas.length} operaciones.</p>
                  <p className="mt-1">Activar una nueva versión afectará las futuras emisiones de todas ellas.</p>
                  <ul className="mt-2 list-inside list-disc">{operacionesVinculadas.map((operacion) => <li key={operacion.id}><span className="font-mono">{operacion.codigo}</span> — {operacion.nombre}</li>)}</ul>
                </div>
              )}

              {loadingVersiones ? <div className="py-12 text-center text-slate-500">Cargando versiones...</div> : versiones.length === 0 ? <div className="py-12 text-center text-slate-500">No hay versiones registradas.</div> : (
                <div className="space-y-4">
                  {versiones.map((version) => (
                    <article key={version.id} className={`rounded-lg border p-4 ${version.estado === 'VIGENTE' ? 'border-green-400 bg-green-50' : 'border-slate-200'}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="flex items-center gap-2 font-bold text-slate-800">Versión {version.version}<span className={`rounded px-2 py-0.5 text-xs text-white ${version.estado === 'VIGENTE' ? 'bg-green-600' : version.estado === 'BORRADOR' ? 'bg-amber-500' : 'bg-slate-400'}`}>{version.estado}</span></h4>
                          <p className="mt-1 text-xs text-slate-500">Creada: {new Date(version.creado_en).toLocaleString()}{version.vigente_desde && ` · Vigente desde: ${new Date(version.vigente_desde).toLocaleString()}`}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => void previsualizar(version)} className="flex items-center gap-1 rounded border px-3 py-1.5 text-sm font-semibold"><Eye size={16} /> Preview</button>
                          {version.motor === 'HTML_DINAMICO' && <button type="button" onClick={() => setEditorVersion(version)} className="flex items-center gap-1 rounded bg-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-700"><Edit3 size={16} /> {version.estado === 'BORRADOR' ? 'Diseñar certificado' : 'Ver diseño'}</button>}
                          {version.motor === 'DOCX_DINAMICO' && !formato.es_protegido && version.estado === 'BORRADOR' && <button type="button" onClick={() => setEditorVersion(version)} className="flex items-center gap-1 rounded bg-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-700"><Edit3 size={16} /> Configurar variables</button>}
                          {!formato.es_protegido && version.estado !== 'VIGENTE' && <button type="button" disabled={working} onClick={() => void eliminar(version)} className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600"><Trash2 size={16} /> Eliminar</button>}
                          {!formato.es_protegido && version.estado === 'BORRADOR' && <button type="button" disabled={working} onClick={() => void activar(version)} className="flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-sm font-semibold text-white"><PlayCircle size={16} /> Activar versión</button>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {previewHtml !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="flex h-full max-h-[95vh] w-full max-w-5xl flex-col rounded bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b bg-slate-100 p-3"><h3 className="font-bold">Previsualización</h3><button type="button" onClick={() => setPreviewHtml(null)} className="rounded bg-red-600 px-4 py-1 text-white">Cerrar</button></header>
            <div className="flex flex-1 justify-center overflow-auto bg-slate-50 p-4"><iframe title="Previsualización del formato" srcDoc={previewHtml} className="min-h-[297mm] w-[210mm] border-0 bg-white shadow-xl" /></div>
          </div>
        </div>
      )}
    </div>
  );
}
