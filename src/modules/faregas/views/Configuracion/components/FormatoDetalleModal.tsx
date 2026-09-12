import { FileUp, Eye, Edit3, PlayCircle, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { faregasFormatosApi, type Formato, type FormatoVersion } from '../../../services/faregas-formatos.api';
import FormatosVariablesEditor from './FormatosVariablesEditor';
import FormatoHtmlVariablesEditor from './FormatoHtmlVariablesEditor';

interface Props {
  formato: Formato;
  onClose: () => void;
  onCreateVariant?: (f: Formato) => void;
}

export default function FormatoDetalleModal({ formato, onClose, onCreateVariant }: Props) {
  const [versiones, setVersiones] = useState<FormatoVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editorVersion, setEditorVersion] = useState<FormatoVersion | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cargar = async () => {
    try {
      setLoading(true);
      setVersiones(await faregasFormatosApi.listarVersiones(formato.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void cargar(); }, [formato.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (formato.es_protegido) {
      alert('No se pueden subir versiones a un formato protegido');
      return;
    }

    try {
      setUploading(true);
      await faregasFormatosApi.subirVersion(formato.id, file);
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const handlePreview = async (v: FormatoVersion) => {
    try {
      const token = sessionStorage.getItem('faregasAccessToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const url = `${API_URL}/faregas/formatos/${formato.id}/versiones/${v.id}/preview`;
      
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      
      if (v.motor === 'HTML_DINAMICO') {
        const data = await res.json();
        if (res.ok) {
           setPreviewHtml(data.html);
        } else {
           throw new Error(data.message || 'Error al obtener preview HTML');
        }
      } else {
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `preview_v${v.version}.docx`;
        a.click();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleActivar = async (v: FormatoVersion) => {
    if (!confirm('¿Seguro que deseas activar esta versión? La anterior pasará a estado RETIRADA.')) return;
    try {
      await faregasFormatosApi.activarVersion(formato.id, v.id);
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleEliminar = async (v: FormatoVersion) => {
    if (!confirm('¿Seguro que deseas eliminar esta versión de forma permanente?')) return;
    try {
      await faregasFormatosApi.eliminarVersion(formato.id, v.id);
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  if (editorVersion) {
    if (editorVersion.motor === 'HTML_DINAMICO') {
      return <FormatoHtmlVariablesEditor formato={formato} version={editorVersion} onBack={() => { setEditorVersion(null); void cargar(); }} />;
    }
    return <FormatosVariablesEditor formato={formato} version={editorVersion} onBack={() => { setEditorVersion(null); void cargar(); }} />;
  }

  const handleCambiarEstado = async () => {
    try {
      if (!confirm(`¿Seguro que deseas ${formato.activo ? 'desactivar' : 'reactivar'} este formato?`)) return;
      await faregasFormatosApi.cambiarEstado(formato.id);
      onClose(); // Reload logic handled in parent
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-[#052A79]">Detalle de Formato</h2>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
              <span className="font-semibold">{formato.nombre}</span>
              <span className="rounded bg-gray-100 px-2 py-0.5 font-mono">{formato.codigo}</span>
              <span className="rounded bg-gray-100 px-2 py-0.5">{formato.motor}</span>
              {formato.formato_padre_nombre && (
                <span className="rounded bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs font-semibold">
                  Base: {formato.formato_padre_nombre}
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${formato.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {formato.activo ? 'ACTIVO' : 'INACTIVO'}
              </span>
              <span className="text-xs font-semibold">
                {formato.tiene_version_vigente ? <span className="text-green-600">Con Versión Vigente</span> : <span className="text-gray-500">Sin Versión Vigente</span>}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {!formato.es_protegido && (
              <>
                <button
                  onClick={handleCambiarEstado}
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold ${formato.activo ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                >
                  {formato.activo ? 'Desactivar Formato' : 'Reactivar Formato'}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleUpload} accept=".docx" className="hidden" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <FileUp size={16} /> {uploading ? 'Subiendo...' : 'Subir Nueva Versión'}
                </button>
              </>
            )}
            {formato.es_protegido && formato.motor === 'SISTEMA' && onCreateVariant && (
              <button
                onClick={() => onCreateVariant(formato)}
                className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                + Crear Variante
              </button>
            )}
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100">
              Cerrar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center">Cargando...</div>
          ) : versiones.length === 0 ? (
            <div className="text-center text-gray-500">No hay versiones subidas.</div>
          ) : (
            <div className="space-y-4">
              {versiones.map(v => (
                <div key={v.id} className={`rounded-lg border p-4 ${v.estado === 'VIGENTE' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        Versión {v.version}
                        <span className={`rounded px-2 py-0.5 text-xs text-white ${v.estado === 'VIGENTE' ? 'bg-green-600' : v.estado === 'BORRADOR' ? 'bg-yellow-500' : 'bg-gray-400'}`}>
                          {v.estado}
                        </span>
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Subido: {new Date(v.creado_en).toLocaleString()}
                        {v.vigente_desde && ` | Vigente desde: ${new Date(v.vigente_desde).toLocaleString()}`}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => void handlePreview(v)}
                        className="flex items-center gap-1 rounded border px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        <Eye size={16} /> Preview
                      </button>
                      
                      {!formato.es_protegido && v.estado === 'BORRADOR' && (
                        <button 
                          onClick={() => setEditorVersion(v)}
                          className="flex items-center gap-1 rounded bg-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-200"
                        >
                          <Edit3 size={16} /> Configurar Variables
                        </button>
                      )}
                      
                      {!formato.es_protegido && (v.estado === 'BORRADOR' || v.estado === 'RETIRADA') && (
                        <button 
                          onClick={() => void handleEliminar(v)}
                          className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100"
                        >
                          <Trash2 size={16} /> Eliminar
                        </button>
                      )}

                      {v.estado !== 'VIGENTE' && (
                        <button 
                          onClick={() => void handleActivar(v)}
                          className="flex items-center gap-1 rounded bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
                        >
                          <PlayCircle size={16} /> Activar
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {v.configuracion?.mappings && v.configuracion.mappings.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Variables mapeadas:</p>
                      <div className="flex flex-wrap gap-1">
                        {v.configuracion.mappings.map((m: any, idx: number) => (
                          <span key={idx} className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 border border-blue-200">
                            {m.variable}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* PREVIEW HTML MODAL */}
      {previewHtml !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="flex h-full max-h-[95vh] w-full max-w-5xl flex-col bg-white rounded shadow-2xl">
            <div className="flex justify-between items-center bg-gray-100 p-3 border-b">
              <h3 className="font-bold text-gray-800">Previsualización (A4)</h3>
              <button onClick={() => setPreviewHtml(null)} className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700">Cerrar</button>
            </div>
            <div className="flex-1 bg-gray-50 p-4 overflow-auto flex justify-center items-start">
               <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl relative scale-[0.8] origin-top">
                  <iframe 
                    title="preview"
                    srcDoc={previewHtml}
                    className="w-full h-full border-none pointer-events-none"
                    style={{ minHeight: '297mm' }}
                  />
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
