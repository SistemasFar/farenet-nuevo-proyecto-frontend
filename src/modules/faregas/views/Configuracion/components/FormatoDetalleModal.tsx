import { Download, Edit3, Eye, FileUp, PlayCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { faregasFormatosApi, type Formato, type FormatoVersion } from '../../../services/faregas-formatos.api';
import FormatosVariablesEditor from './FormatosVariablesEditor';

interface Props {
  formato: Formato;
  onClose: () => void;
}

export default function FormatoDetalleModal({ formato, onClose }: Props) {
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

  const handlePreview = async (v: FormatoVersion) => {
    try {
      const token = sessionStorage.getItem('faregasAccessToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const url = `${API_URL}/faregas/formatos/${formato.id}/versiones/${v.id}/preview`;
      
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `preview_v${v.version}.docx`;
          a.click();
        });
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

  if (editorVersion) {
    return <FormatosVariablesEditor formato={formato} version={editorVersion} onBack={() => { setEditorVersion(null); void cargar(); }} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-[#052A79]">Detalle de Formato</h2>
            <p className="text-sm text-gray-500">{formato.nombre} ({formato.codigo}) - {formato.motor}</p>
          </div>
          <div className="flex gap-2">
            {!formato.es_protegido && (
              <>
                <input type="file" ref={fileInputRef} onChange={handleUpload} accept=".docx" className="hidden" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <FileUp size={16} /> {uploading ? 'Subiendo...' : 'Subir Nueva Versión (Word)'}
                </button>
              </>
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
                        <>
                          <button 
                            onClick={() => setEditorVersion(v)}
                            className="flex items-center gap-1 rounded bg-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-200"
                          >
                            <Edit3 size={16} /> Configurar Variables
                          </button>
                          
                          <button 
                            onClick={() => void handleActivar(v)}
                            className="flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
                          >
                            <PlayCircle size={16} /> Activar
                          </button>
                        </>
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
    </div>
  );
}
