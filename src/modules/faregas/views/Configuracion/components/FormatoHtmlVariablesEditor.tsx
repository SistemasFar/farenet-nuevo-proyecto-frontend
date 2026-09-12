import { ArrowLeft, Save, Trash2, Eye } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { faregasFormatosApi, type Formato, type FormatoVersion, type VariableCatalogo } from '../../../services/faregas-formatos.api';

interface Props {
  formato: Formato;
  version: FormatoVersion;
  onBack: () => void;
}

const DESIGN_CSS = `
<style id="faregas-design-css">
  [data-faregas-slot] {
    background-color: #fef08a !important;
    outline: 2px dashed #eab308 !important;
    outline-offset: 2px;
    cursor: pointer;
    border-radius: 2px;
    color: #854d0e !important;
    font-weight: bold !important;
  }
  [data-faregas-slot]:empty::before {
    content: '[' attr(data-faregas-slot) ']';
  }
  [data-faregas-editable-slot] {
    min-width: 50px;
    min-height: 20px;
    display: inline-block;
    border: 1px dashed #94a3b8;
    background-color: #f8fafc;
    cursor: pointer;
  }
  [data-faregas-editable-slot]:hover {
    background-color: #e2e8f0;
  }
  body {
    cursor: text;
  }
</style>
`;

export default function FormatoHtmlVariablesEditor({ formato, version, onBack }: Props) {
  const [variables, setVariables] = useState<VariableCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const vars = await faregasFormatosApi.obtenerVariables();
        setVariables(vars);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al cargar variables');
      } finally {
        setLoading(false);
      }
    };
    void cargar();
  }, []);

  const getCleanHtml = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return '';
    const clone = doc.documentElement.cloneNode(true) as HTMLElement;
    const designCss = clone.querySelector('#faregas-design-css');
    if (designCss) designCss.remove();
    // Remove active outlines
    const active = clone.querySelector('[data-active-slot="true"]');
    if (active) {
        active.removeAttribute('data-active-slot');
        (active as HTMLElement).style.outline = '';
    }
    
    // Security: remove scripts and event handlers
    const scripts = clone.querySelectorAll('script');
    scripts.forEach(s => s.remove());
    const allElements = clone.querySelectorAll('*');
    allElements.forEach(el => {
      for (let i = el.attributes.length - 1; i >= 0; i--) {
        const attr = el.attributes[i].name;
        if (attr.startsWith('on')) {
          el.removeAttribute(attr);
        }
      }
    });

    return '<!DOCTYPE html>\\n' + clone.outerHTML;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const cleanHtml = getCleanHtml();
      
      const config = {
        ...(version.configuracion || {}),
        html: cleanHtml
      };

      const token = sessionStorage.getItem('faregasAccessToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      
      const res = await fetch(`${API_URL}/faregas/formatos/${formato.id}/versiones/${version.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ configuracion: config })
      });

      if (!res.ok) throw new Error('Error al guardar configuración');
      alert('Plantilla guardada correctamente');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleIframeLoad = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // Inject Design CSS
    if (!doc.getElementById('faregas-design-css')) {
      doc.head.insertAdjacentHTML('beforeend', DESIGN_CSS);
    }

    // Handle clicks for variable assignment
    doc.body.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Clear previous active
      if (activeElement) {
          activeElement.removeAttribute('data-active-slot');
          activeElement.style.outline = '';
      }
      
      // If clicking an existing variable, we can make it active to change it
      if (target.hasAttribute('data-faregas-slot') || target.hasAttribute('data-faregas-editable-slot') || target.tagName === 'TD' || target.tagName === 'SPAN') {
          target.setAttribute('data-active-slot', 'true');
          target.style.outline = '2px solid blue';
          setActiveElement(target);
      } else {
          setActiveElement(null);
      }
    });
  };

  const assignVariable = (varKey: string) => {
    const doc = iframeRef.current?.contentDocument;
    const win = iframeRef.current?.contentWindow;
    if (!doc || !win) return;

    const sel = win.getSelection();
    
    // Case 1: Text Selection
    if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const span = doc.createElement('span');
      span.setAttribute('data-faregas-slot', varKey);
      span.textContent = `{{${varKey}}}`;
      range.deleteContents();
      range.insertNode(span);
      sel.removeAllRanges();
      return;
    }

    // Case 2: Active element slot (e.g. empty TD or data-faregas-editable-slot)
    if (activeElement) {
        activeElement.setAttribute('data-faregas-slot', varKey);
        activeElement.textContent = `{{${varKey}}}`;
        activeElement.removeAttribute('data-active-slot');
        activeElement.style.outline = '';
        setActiveElement(null);
        return;
    }

    alert('Por favor selecciona un texto o haz clic en una zona/celda vacía primero.');
  };

  const removeVariable = () => {
      if (activeElement && activeElement.hasAttribute('data-faregas-slot')) {
          activeElement.removeAttribute('data-faregas-slot');
          activeElement.textContent = '';
          activeElement.removeAttribute('data-active-slot');
          activeElement.style.outline = '';
          setActiveElement(null);
      }
  };

  const groupedVars = variables.reduce((acc, v) => {
    if (!acc[v.grupo]) acc[v.grupo] = [];
    acc[v.grupo].push(v);
    return acc;
  }, {} as Record<string, VariableCatalogo[]>);

  // Initial HTML with design CSS
  const initialHtml = version.configuracion?.html || '<html><body><p>El HTML está vacío.</p></body></html>';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
      <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
            <ArrowLeft size={20} /> Volver
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h2 className="text-lg font-bold text-[#052A79]">Configurar Variables HTML</h2>
          <span className="text-sm text-gray-500">v{version.version} ({version.motor})</span>
        </div>
        <div className="flex gap-2">
          {activeElement && activeElement.hasAttribute('data-faregas-slot') && (
              <button 
                onClick={removeVariable} 
                className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
              >
                <Trash2 size={16} /> Quitar Variable Seleccionada
              </button>
          )}
          <button 
            onClick={() => setPreviewMode(true)}
            className="flex items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Eye size={16} /> Preview Render
          </button>
          <button 
            disabled={saving}
            onClick={() => void handleSave()} 
            className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: HTML Iframe */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-200 flex justify-center items-start">
            <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl relative mt-4 origin-top">
                <iframe 
                    ref={iframeRef}
                    title="Editor HTML"
                    srcDoc={initialHtml}
                    onLoad={handleIframeLoad}
                    className="w-full h-full border-none"
                    style={{ minHeight: '297mm' }}
                />
            </div>
        </div>

        {/* RIGHT PANEL: Variables Catalog */}
        <div className="w-80 border-l bg-white shadow-xl flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-800">Variables FAREGAS</h3>
            <p className="text-xs text-gray-500 mt-1">
              Selecciona un texto o haz clic en una celda vacía, luego elige una variable.
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center text-sm text-gray-500">Cargando variables...</div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedVars).map(([grupo, vars]) => (
                  <div key={grupo}>
                    <h4 className="mb-2 text-sm font-bold text-slate-700 border-b pb-1">{grupo}</h4>
                    <div className="space-y-1">
                      {vars.map(v => (
                        <button
                          key={v.key}
                          onClick={() => assignVariable(v.key)}
                          className="w-full text-left rounded px-2 py-1.5 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                          title={v.tipo}
                        >
                          <div className="font-medium">{v.label}</div>
                          <div className="text-xs text-gray-400 font-mono">{v.key}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* PREVIEW MODAL */}
      {previewMode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="flex h-full max-h-[95vh] w-full max-w-5xl flex-col bg-white rounded shadow-2xl">
            <div className="flex justify-between items-center bg-gray-100 p-3 border-b">
              <h3 className="font-bold text-gray-800">Previsualización (A4)</h3>
              <button onClick={() => setPreviewMode(false)} className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700">Cerrar</button>
            </div>
            <div className="flex-1 bg-gray-50 p-4 overflow-auto flex justify-center items-start">
               <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl relative scale-[0.8] origin-top">
                  <iframe 
                    title="preview"
                    srcDoc={getCleanHtml()}
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
