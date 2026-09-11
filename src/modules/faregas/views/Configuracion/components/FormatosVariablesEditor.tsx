import { ArrowLeft, Save, Trash2, CheckCircle2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { faregasFormatosApi, type Formato, type FormatoVersion, type VariableCatalogo } from '../../../services/faregas-formatos.api';

interface Props {
  formato: Formato;
  version: FormatoVersion;
  onBack: () => void;
}

interface Mapping {
  variable: string;
  sourceText: string;
  locator: {
    part: string;
    pIndex: number;
    startOffset: number;
    endOffset: number;
  };
}

export default function FormatosVariablesEditor({ formato, version, onBack }: Props) {
  const [paragraphs, setParagraphs] = useState<any[]>([]);
  const [variables, setVariables] = useState<VariableCatalogo[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState<Mapping | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const [est, vars] = await Promise.all([
          faregasFormatosApi.obtenerEstructura(formato.id, version.id),
          faregasFormatosApi.obtenerVariables()
        ]);
        setParagraphs(est.paragraphs);
        setVariables(vars);
        
        if (version.configuracion?.mappings) {
          // Exclude those that are advanced mode (no locator) to not clutter the visual editor
          setMappings(version.configuracion.mappings.filter((m: any) => m.locator));
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al cargar estructura');
      } finally {
        setLoading(false);
      }
    };
    void cargar();
  }, [formato.id, version.id]);

  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !containerRef.current) return;

      const range = sel.getRangeAt(0);
      const startNode = range.startContainer;
      const endNode = range.endContainer;

      // Find closest paragraph wrapper
      const pWrapper = startNode.parentElement?.closest('[data-pindex]');
      if (!pWrapper || pWrapper !== endNode.parentElement?.closest('[data-pindex]')) {
        // Selection crosses paragraphs, ignore
        return;
      }

      const pIndex = parseInt(pWrapper.getAttribute('data-pindex') || '-1', 10);
      const part = pWrapper.getAttribute('data-part') || '';
      if (pIndex === -1 || !part) return;

      let startOffset = 0;
      let endOffset = 0;
      let foundStart = false;
      let foundEnd = false;

      const traverse = (node: Node) => {
        if (node === startNode) {
          startOffset += range.startOffset;
          foundStart = true;
        }
        if (node === endNode) {
          endOffset += range.endOffset - 1; // inclusive
          foundEnd = true;
        }
        if (foundStart && foundEnd) return;

        if (node.nodeType === Node.TEXT_NODE && !foundStart) {
          startOffset += node.textContent?.length || 0;
        }
        if (node.nodeType === Node.TEXT_NODE && foundStart && !foundEnd && node !== startNode) {
          endOffset += node.textContent?.length || 0;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          for (let i = 0; i < node.childNodes.length; i++) {
            traverse(node.childNodes[i]);
          }
        }
      };

      traverse(pWrapper);
      if (foundStart && !foundEnd) endOffset = startOffset + range.endOffset - range.startOffset - 1;
      // if they select backwards
      if (startOffset > endOffset) {
         const temp = startOffset; startOffset = endOffset; endOffset = temp;
      }

      const sourceText = sel.toString();

      setSelection({
        variable: '',
        sourceText,
        locator: { part, pIndex, startOffset, endOffset }
      });
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleAssign = (variable: string) => {
    if (!selection) return;
    setMappings([...mappings, { ...selection, variable }]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // We must merge these mappings with any advanced mode ones the version might have had
      const advancedMappings = (version.configuracion?.mappings || []).filter((m: any) => !m.locator);
      const finalMappings = [...advancedMappings, ...mappings];
      await faregasFormatosApi.guardarMappings(formato.id, version.id, finalMappings);
      alert('Configuración guardada y plantilla reconstruida');
      onBack();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Group variables
  const groupedVars = variables.reduce((acc, v) => {
    if (!acc[v.grupo]) acc[v.grupo] = [];
    acc[v.grupo].push(v);
    return acc;
  }, {} as Record<string, VariableCatalogo[]>);

  // Render paragraph with highlighted mappings
  const renderParagraph = (p: any) => {
    const pMappings = mappings.filter(m => m.locator.part === p.part && m.locator.pIndex === p.index)
                               .sort((a, b) => a.locator.startOffset - b.locator.startOffset);
    
    if (pMappings.length === 0) return p.text;

    const parts = [];
    let lastIndex = 0;

    for (let i = 0; i < pMappings.length; i++) {
      const m = pMappings[i];
      if (m.locator.startOffset > lastIndex) {
        parts.push(<span key={`text-${i}`}>{p.text.substring(lastIndex, m.locator.startOffset)}</span>);
      }
      parts.push(
        <span key={`map-${i}`} className="bg-blue-100 text-blue-800 font-bold px-1 mx-0.5 rounded border border-blue-300">
          [{m.variable.toUpperCase()}]
          <button 
            className="ml-1 text-red-500 hover:text-red-700" 
            onClick={() => setMappings(mappings.filter(x => x !== m))}
            title="Quitar variable"
          >
            &times;
          </button>
        </span>
      );
      lastIndex = m.locator.endOffset + 1;
    }
    if (lastIndex < p.text.length) {
      parts.push(<span key="end">{p.text.substring(lastIndex)}</span>);
    }

    return parts;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
      <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
            <ArrowLeft size={20} /> Volver
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h2 className="text-lg font-bold text-[#052A79]">Configurar Variables</h2>
          <span className="text-sm text-gray-500">v{version.version}</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setMappings([])} 
            className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
          >
            <Trash2 size={16} /> Limpiar Todo
          </button>
          <button 
            disabled={saving}
            onClick={() => void handleSave()} 
            className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar y Generar Plantilla'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: Document Content */}
        <div className="flex-1 overflow-y-auto p-8" ref={containerRef}>
          <div className="mx-auto max-w-3xl rounded bg-white p-12 shadow-lg min-h-full">
            {loading ? (
              <div className="text-center text-gray-500">Analizando estructura del documento...</div>
            ) : (
              <div className="space-y-3 text-[15px] leading-relaxed text-gray-800">
                {paragraphs.map((p) => (
                  <p 
                    key={`${p.part}-${p.index}`} 
                    data-part={p.part} 
                    data-pindex={p.index}
                    className="min-h-[1.5rem] hover:bg-slate-50 transition-colors rounded"
                  >
                    {renderParagraph(p)}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Variables Catalog */}
        <div className="w-80 border-l bg-white shadow-xl flex flex-col">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-gray-800">Variables FAREGAS</h3>
            <p className="text-xs text-gray-500 mt-1">
              Selecciona un fragmento de texto en el documento y luego haz clic en una variable para asignarla.
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {selection ? (
              <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-3 shadow-inner">
                <p className="text-xs font-semibold text-blue-800 mb-2">Texto seleccionado:</p>
                <div className="rounded bg-white p-2 text-sm font-mono text-gray-700 shadow-sm border border-blue-100 mb-3 truncate">
                  "{selection.sourceText}"
                </div>
                <p className="text-xs font-semibold text-blue-800 mb-2">¿A qué variable corresponde?</p>
                <button onClick={() => setSelection(null)} className="text-xs text-blue-600 underline">Cancelar selección</button>
              </div>
            ) : (
              <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500 text-center">
                Resalta un texto a la izquierda para comenzar
              </div>
            )}

            <div className="space-y-6">
              {Object.entries(groupedVars).map(([grupo, vars]) => (
                <div key={grupo}>
                  <h4 className="mb-2 font-bold text-gray-700 text-sm border-b pb-1">{grupo}</h4>
                  <div className="space-y-2">
                    {vars.map(v => (
                      <button
                        key={v.key}
                        disabled={!selection}
                        onClick={() => handleAssign(v.key)}
                        className={`w-full flex items-center justify-between rounded p-2 text-left text-sm transition-all
                          ${selection 
                            ? 'bg-white border border-gray-200 hover:border-[#052A79] hover:shadow-md cursor-pointer text-gray-800' 
                            : 'bg-gray-50 border border-transparent text-gray-400 cursor-not-allowed'}`}
                      >
                        <div>
                          <p className="font-semibold">{v.label}</p>
                          <p className={`text-xs ${selection ? 'text-blue-600' : 'text-gray-400'}`}>{v.key}</p>
                        </div>
                        {selection && <CheckCircle2 size={16} className="text-[#052A79] opacity-0 group-hover:opacity-100" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
