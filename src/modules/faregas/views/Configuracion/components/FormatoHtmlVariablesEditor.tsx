import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  Braces,
  Eye,
  Image as ImageIcon,
  Italic,
  Plus,
  Redo2,
  Save,
  Search,
  SlidersHorizontal,
  Table2,
  Trash2,
  Underline as UnderlineIcon,
  Undo2
} from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { faregasFormatosApi, type Formato, type FormatoVersion, type VariableCatalogo } from '../../../services/faregas-formatos.api';
import {
  collectCertificateVariables,
  createCustomCertificateVariable,
  createCertificateDesignerExtensions,
  isHtmlCertificateVersionEditable,
  parseCertificateDocument,
  sanitizePastedHtml,
  serializeCertificateDocument,
  type FaregasVariableAttributes
} from './certificate-designer';
import './CertificateDesigner.css';

interface Props {
  formato: Formato;
  version: FormatoVersion;
  onBack: () => void;
}

type PanelTab = 'VARIABLES' | 'IMAGENES' | 'PROPIEDADES';

const mensajeError = (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
const limiteTabla = (value: number) => Math.max(1, Math.min(20, Number.isFinite(value) ? value : 1));

export default function FormatoHtmlVariablesEditor({ formato, version, onBack }: Props) {
  const [variables, setVariables] = useState<VariableCatalogo[]>([]);
  const [loadingVariables, setLoadingVariables] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>('VARIABLES');
  const [search, setSearch] = useState('');
  const [activeVariable, setActiveVariable] = useState<FaregasVariableAttributes | null>(null);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [variableDialog, setVariableDialog] = useState(false);
  const [showCustomVariable, setShowCustomVariable] = useState(false);
  const [customVariableName, setCustomVariableName] = useState('');
  const [customVariableError, setCustomVariableError] = useState('');
  const [customVariables, setCustomVariables] = useState<VariableCatalogo[]>(() => {
    const stored = version.configuracion?.variables_personalizadas;
    return Array.isArray(stored)
      ? stored.filter((variable): variable is VariableCatalogo => Boolean(variable?.key && variable?.label))
      : [];
  });
  const [tableDialog, setTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableColumns, setTableColumns] = useState(3);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const editable = isHtmlCertificateVersionEditable(version, formato.es_protegido);
  const parsedDocument = useMemo(
    () => parseCertificateDocument(version.configuracion?.html || '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body><p></p></body></html>'),
    [version.configuracion?.html]
  );

  const editor = useEditor({
    extensions: createCertificateDesignerExtensions(),
    content: parsedDocument.bodyHtml,
    editable,
    immediatelyRender: false,
    onCreate: ({ editor: currentEditor }) => { currentEditor.commands.fixTables(); },
    onUpdate: () => {
      setDirty(true);
      setSelectionRevision((value) => value + 1);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const attrs = currentEditor.isActive('faregasVariable')
        ? currentEditor.getAttributes('faregasVariable') as FaregasVariableAttributes
        : null;
      setActiveVariable(attrs?.key ? attrs : null);
      setSelectionRevision((value) => value + 1);
    },
    editorProps: {
      transformPastedHTML: sanitizePastedHtml,
      handlePaste: (_view, event) => {
        const hasImage = [...(event.clipboardData?.items || [])].some((item) => item.type.startsWith('image/'));
        if (!hasImage) return false;
        setError('El pegado de imágenes se habilitará cuando exista la galería documental de la Fase C.');
        return true;
      }
    }
  });

  useEffect(() => {
    let cancelled = false;
    faregasFormatosApi.obtenerVariables()
      .then((result) => { if (!cancelled) setVariables(result); })
      .catch((cause: unknown) => { if (!cancelled) setError(mensajeError(cause)); })
      .finally(() => { if (!cancelled) setLoadingVariables(false); });
    return () => { cancelled = true; };
  }, []);

  if (!editor) return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-100 text-slate-500">Preparando diseñador…</div>;

  const availableVariables = [...variables, ...customVariables]
    .filter((variable, index, list) => list.findIndex((item) => item.key === variable.key) === index);
  const groupedVariables = availableVariables
    .filter((variable) => `${variable.label} ${variable.key} ${variable.grupo}`.toLowerCase().includes(search.trim().toLowerCase()))
    .reduce<Record<string, VariableCatalogo[]>>((groups, variable) => {
      (groups[variable.grupo] ||= []).push(variable);
      return groups;
    }, {});

  const assignVariable = (variable: VariableCatalogo, showPlaceholder = false) => {
    if (!editable) return;
    const { from, to, empty } = editor.state.selection;
    const changing = editor.isActive('faregasVariable');
    const selectedText = editor.state.doc.textBetween(from, to, ' ').trim();
    const fallback = changing ? activeVariable?.fallback || selectedText : selectedText;
    const attributes: FaregasVariableAttributes = {
      key: variable.key,
      label: variable.label,
      fallback: fallback || variable.demo || '',
      source: showPlaceholder ? 'CUSTOM' : 'FORM'
    };

    if (changing) {
      editor.chain().focus().extendMarkRange('faregasVariable').setMark('faregasVariable', attributes).run();
    } else if (!empty && showPlaceholder) {
      editor.chain().focus().deleteSelection().insertContent({
        type: 'text',
        text: `{{${variable.key}}}`,
        marks: [{ type: 'faregasVariable', attrs: attributes }]
      }).unsetMark('faregasVariable').run();
    } else if (!empty) {
      editor.chain().focus().setMark('faregasVariable', attributes).run();
    } else {
      editor.chain().focus().insertContent({
        type: 'text',
        text: showPlaceholder ? `{{${variable.key}}}` : variable.demo || variable.label,
        marks: [{ type: 'faregasVariable', attrs: attributes }]
      }).unsetMark('faregasVariable').run();
    }
    setPanelTab('PROPIEDADES');
    setVariableDialog(false);
  };

  const createAndAssignCustomVariable = () => {
    const customVariable = createCustomCertificateVariable(customVariableName);
    if (!customVariable) {
      setCustomVariableError('Escribe un nombre válido para la variable.');
      return;
    }
    const existing = availableVariables.find((variable) => variable.key === customVariable.key);
    const variable = existing || customVariable;
    if (!existing) setCustomVariables((current) => [...current, customVariable]);
    setCustomVariableName('');
    setCustomVariableError('');
    setShowCustomVariable(false);
    assignVariable(variable, true);
    setNotice(`Variable {{${variable.key}}} agregada. Guarda el borrador para conservarla.`);
  };

  const removeVariable = () => {
    if (!editable || !editor.isActive('faregasVariable')) return;
    editor.chain().focus().extendMarkRange('faregasVariable').unsetMark('faregasVariable').run();
    setActiveVariable(null);
  };

  const save = async () => {
    if (!editable) return;
    setSaving(true);
    setError('');
    try {
      const html = serializeCertificateDocument(editor.getHTML(), parsedDocument.shell);
      await faregasFormatosApi.guardarConfiguracion(formato.id, version.id, {
        ...(version.configuracion || {}),
        html,
        variables_usadas: collectCertificateVariables(html),
        variables_personalizadas: customVariables
      });
      setDirty(false);
      setNotice('Borrador guardado correctamente.');
    } catch (cause) {
      setError(mensajeError(cause));
    } finally {
      setSaving(false);
    }
  };

  const preview = async () => {
    setLoadingPreview(true);
    setError('');
    try {
      if (dirty) setNotice('La previsualización usa la última versión guardada; guarda primero para incluir cambios recientes.');
      setPreviewHtml(await faregasFormatosApi.obtenerPreviewHtml(formato.id, version.id));
    } catch (cause) {
      setError(mensajeError(cause));
    } finally {
      setLoadingPreview(false);
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: limiteTabla(tableRows), cols: limiteTabla(tableColumns), withHeaderRow: false }).run();
    setTableDialog(false);
  };

  const toolbarButton = (label: string, action: () => void, active = false, disabled = false, icon?: ReactNode) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={!editable || disabled}
      onMouseDown={(event) => { event.preventDefault(); action(); }}
      className={`flex h-9 min-w-9 items-center justify-center gap-1 rounded border px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'border-blue-500 bg-blue-100 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
    >
      {icon || label}
    </button>
  );

  const inTable = editor.isActive('table');
  void selectionRevision;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100">
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-2 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft size={18} /> Volver</button>
          <div className="h-6 w-px bg-slate-300" />
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-[#052A79]">Diseñador de certificado · {formato.nombre}</h2>
            <p className="text-xs text-slate-500">Versión {version.version} · {version.estado} · {version.motor}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editable && <span className="rounded bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">SOLO LECTURA</span>}
          <button type="button" disabled={loadingPreview} onClick={() => void preview()} className="flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><Eye size={16} /> {loadingPreview ? 'Cargando…' : 'Preview Render'}</button>
          <button type="button" disabled={!editable || saving || !dirty} onClick={() => void save()} className="flex items-center gap-2 rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-45"><Save size={16} /> {saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-1 border-b bg-slate-50 px-3 py-2">
        {toolbarButton('Deshacer', () => editor.chain().focus().undo().run(), false, !editor.can().undo(), <Undo2 size={16} />)}
        {toolbarButton('Rehacer', () => editor.chain().focus().redo().run(), false, !editor.can().redo(), <Redo2 size={16} />)}
        <div className="mx-1 h-7 w-px bg-slate-300" />
        {toolbarButton('Negrita', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), false, <Bold size={16} />)}
        {toolbarButton('Cursiva', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), false, <Italic size={16} />)}
        {toolbarButton('Subrayado', () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), false, <UnderlineIcon size={16} />)}
        <select aria-label="Tamaño de fuente" disabled={!editable} value={editor.getAttributes('textStyle').fontSize || ''} onChange={(event) => event.target.value ? editor.chain().focus().setFontSize(event.target.value).run() : editor.chain().focus().unsetFontSize().run()} className="h-9 rounded border border-slate-200 bg-white px-2 text-xs">
          <option value="">Tamaño</option>{[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32].map((size) => <option key={size} value={`${size}px`}>{size} px</option>)}
        </select>
        <select aria-label="Fuente" disabled={!editable} value={editor.getAttributes('textStyle').fontFamily || ''} onChange={(event) => event.target.value ? editor.chain().focus().setFontFamily(event.target.value).run() : editor.chain().focus().unsetFontFamily().run()} className="h-9 rounded border border-slate-200 bg-white px-2 text-xs">
          <option value="">Fuente</option><option value="Arial">Arial</option><option value="Calibri">Calibri</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option>
        </select>
        <div className="mx-1 h-7 w-px bg-slate-300" />
        {toolbarButton('Alinear izquierda', () => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' }), false, <AlignLeft size={16} />)}
        {toolbarButton('Centrar', () => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' }), false, <AlignCenter size={16} />)}
        {toolbarButton('Alinear derecha', () => editor.chain().focus().setTextAlign('right').run(), editor.isActive({ textAlign: 'right' }), false, <AlignRight size={16} />)}
        {toolbarButton('Justificar', () => editor.chain().focus().setTextAlign('justify').run(), editor.isActive({ textAlign: 'justify' }), false, <AlignJustify size={16} />)}
        <div className="mx-1 h-7 w-px bg-slate-300" />
        {toolbarButton('Insertar tabla', () => setTableDialog(true), inTable, false, <Table2 size={16} />)}
        <button
          type="button"
          disabled={!editable}
          onMouseDown={(event) => {
            event.preventDefault();
            setPanelTab('VARIABLES');
            setVariableDialog(true);
          }}
          className="flex h-9 items-center gap-1 rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-40"
        >
          <Braces size={16} /> Asignar variable
        </button>
        {toolbarButton('Quitar variable', removeVariable, false, !activeVariable, <><Trash2 size={15} /><span>Variable</span></>)}
      </div>

      {inTable && editable && (
        <div className="flex flex-wrap items-center gap-1 border-b border-blue-200 bg-blue-50 px-3 py-2 text-xs">
          <b className="mr-2 text-blue-900">Tabla:</b>
          {toolbarButton('Fila arriba', () => editor.chain().focus().addRowBefore().run())}
          {toolbarButton('Fila abajo', () => editor.chain().focus().addRowAfter().run())}
          {toolbarButton('Eliminar fila', () => editor.chain().focus().deleteRow().run())}
          {toolbarButton('Columna izquierda', () => editor.chain().focus().addColumnBefore().run())}
          {toolbarButton('Columna derecha', () => editor.chain().focus().addColumnAfter().run())}
          {toolbarButton('Eliminar columna', () => editor.chain().focus().deleteColumn().run())}
          {toolbarButton('Combinar celdas', () => editor.chain().focus().mergeCells().run(), false, !editor.can().mergeCells())}
          {toolbarButton('Separar celda', () => editor.chain().focus().splitCell().run(), false, !editor.can().splitCell())}
          {toolbarButton('Vertical arriba', () => editor.chain().focus().setCellAttribute('verticalAlign', 'top').run())}
          {toolbarButton('Vertical centro', () => editor.chain().focus().setCellAttribute('verticalAlign', 'middle').run())}
          {toolbarButton('Vertical abajo', () => editor.chain().focus().setCellAttribute('verticalAlign', 'bottom').run())}
          {toolbarButton('Eliminar tabla', () => editor.chain().focus().deleteTable().run(), false, false, <><Trash2 size={14} /><span>Tabla</span></>)}
        </div>
      )}

      {(error || notice) && <div className={`mx-4 mt-2 rounded border px-3 py-2 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>{error || notice}</div>}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="flex flex-1 justify-center overflow-auto bg-slate-200 p-6">
          {parsedDocument.shell.documentCss && <style>{`@scope (.faregas-document-root) { ${parsedDocument.shell.documentCss} }`}</style>}
          <section className="certificate-designer-page faregas-document-root bg-white shadow-xl">
            <EditorContent editor={editor} className="certificate-designer-editor" />
          </section>
        </main>

        <aside className="flex w-80 shrink-0 flex-col border-l bg-white shadow-lg">
          <div className="grid grid-cols-3 border-b bg-slate-50">
            {([
              ['VARIABLES', <Braces key="variables" size={15} />, 'Variables'],
              ['IMAGENES', <ImageIcon key="images" size={15} />, 'Imágenes'],
              ['PROPIEDADES', <SlidersHorizontal key="properties" size={15} />, 'Propiedades']
            ] as const).map(([tab, icon, label]) => <button key={tab} type="button" onClick={() => setPanelTab(tab)} className={`flex items-center justify-center gap-1 border-b-2 px-2 py-3 text-[11px] font-bold ${panelTab === tab ? 'border-blue-600 bg-white text-blue-800' : 'border-transparent text-slate-500'}`}>{icon}{label}</button>)}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {panelTab === 'VARIABLES' && <>
              <h3 className="font-bold text-slate-800">Variables FAREGAS</h3>
              <p className="mt-1 text-xs text-slate-500">Selecciona texto o deja el cursor en una celda vacía y elige una variable.</p>
              <label className="mt-3 flex items-center gap-2 rounded border border-slate-300 px-2"><Search size={15} className="text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar placa, taller, fecha…" className="w-full py-2 text-sm outline-none" /></label>
              {loadingVariables ? <p className="py-8 text-center text-sm text-slate-500">Cargando variables…</p> : <div className="mt-4 space-y-5">{Object.entries(groupedVariables).map(([group, items]) => <section key={group}><h4 className="mb-2 border-b pb-1 text-xs font-bold capitalize text-slate-700">{group}</h4><div className="space-y-1">{items.map((variable) => <button key={variable.key} type="button" disabled={!editable} onMouseDown={(event) => { event.preventDefault(); assignVariable(variable); }} className="w-full rounded px-2 py-1.5 text-left hover:bg-blue-50 disabled:opacity-50"><span className="block text-sm font-medium text-slate-700">{variable.label}</span><span className="block font-mono text-[11px] text-slate-400">{variable.key}</span></button>)}</div></section>)}</div>}
            </>}

            {panelTab === 'IMAGENES' && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><h3 className="font-bold">Galería documental pendiente</h3><p className="mt-2 text-xs leading-5">El proyecto aún no tiene almacenamiento reutilizable para logos, firmas y sellos. Se implementará en la Fase C sin incrustar imágenes base64 dentro del HTML.</p></div>}

            {panelTab === 'PROPIEDADES' && <>
              <h3 className="font-bold text-slate-800">Propiedades</h3>
              {activeVariable ? <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm"><p className="text-xs font-bold capitalize text-amber-700">Variable</p><p className="mt-2 font-semibold">{activeVariable.label}</p><p className="mt-1 font-mono text-xs text-slate-600">{activeVariable.key}</p><p className="mt-2 text-xs"><b>Origen:</b> {activeVariable.source}</p><p className="mt-1 text-xs"><b>Fallback:</b> {activeVariable.fallback || 'Sin fallback'}</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => setPanelTab('VARIABLES')} className="rounded bg-blue-700 px-3 py-1.5 text-xs font-bold text-white">Cambiar</button><button type="button" disabled={!editable} onClick={removeVariable} className="rounded border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50">Quitar variable</button></div></div> : inTable ? <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">Seleccionaste una tabla. Sus herramientas de filas, columnas, combinación y alineación aparecen bajo la barra principal.</div> : <p className="mt-3 text-sm text-slate-500">Selecciona texto, una variable o una celda para ver sus propiedades.</p>}
            </>}
          </div>
        </aside>
      </div>

      {variableDialog && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4">
          <div className="flex max-h-[82vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="border-b px-5 py-4">
              <h3 className="text-lg font-bold text-[#052A79]">Asignar variable</h3>
              <p className="mt-1 text-sm text-slate-600">Selecciona la variable que reemplazará el texto marcado o que se insertará en la posición del cursor.</p>
            </header>
            <div className="border-b p-4">
              <label className="flex items-center gap-2 rounded border border-slate-300 px-3">
                <Search size={16} className="text-slate-400" />
                <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar variable…" className="w-full py-2.5 text-sm outline-none" />
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowCustomVariable((current) => !current);
                  setCustomVariableError('');
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
              >
                <Plus size={17} /> Agregar variable personalizada
              </button>
              {showCustomVariable && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <label className="text-xs font-bold capitalize text-blue-900">Nombre de la nueva variable</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={customVariableName}
                      onChange={(event) => {
                        setCustomVariableName(event.target.value);
                        setCustomVariableError('');
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          createAndAssignCustomVariable();
                        }
                      }}
                      placeholder="Ejemplo: Nombre del inspector"
                      className="min-w-0 flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"
                    />
                    <button type="button" onMouseDown={(event) => { event.preventDefault(); createAndAssignCustomVariable(); }} className="rounded bg-[#052A79] px-4 py-2 text-sm font-bold text-white">Crear</button>
                  </div>
                  {customVariableName.trim() && createCustomCertificateVariable(customVariableName) && (
                    <p className="mt-2 font-mono text-xs text-blue-700">Se insertará: {'{{'}{createCustomCertificateVariable(customVariableName)?.key}{'}}'}</p>
                  )}
                  {customVariableError && <p className="mt-2 text-xs font-semibold text-red-600">{customVariableError}</p>}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingVariables ? (
                <p className="py-8 text-center text-sm text-slate-500">Cargando variables…</p>
              ) : Object.keys(groupedVariables).length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No se encontraron variables.</p>
              ) : (
                <div className="space-y-5">
                  {Object.entries(groupedVariables).map(([group, items]) => (
                    <section key={group}>
                      <h4 className="mb-2 border-b pb-1 text-xs font-bold capitalize text-slate-700">{group}</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {items.map((variable) => (
                          <button
                            key={variable.key}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              assignVariable(variable);
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-blue-400 hover:bg-blue-50"
                          >
                            <span className="block text-sm font-semibold text-slate-700">{variable.label}</span>
                            <span className="mt-1 block font-mono text-[11px] text-slate-400">{variable.key}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
            <footer className="flex justify-end border-t bg-slate-50 px-5 py-3">
              <button type="button" onClick={() => setVariableDialog(false)} className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
            </footer>
          </div>
        </div>
      )}

      {tableDialog && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4"><div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"><h3 className="text-lg font-bold text-[#052A79]">Insertar tabla</h3><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-semibold text-slate-700">Filas<input type="number" min={1} max={20} value={tableRows} onChange={(event) => setTableRows(limiteTabla(Number(event.target.value)))} className="mt-1 w-full rounded border px-3 py-2" /></label><label className="text-sm font-semibold text-slate-700">Columnas<input type="number" min={1} max={20} value={tableColumns} onChange={(event) => setTableColumns(limiteTabla(Number(event.target.value)))} className="mt-1 w-full rounded border px-3 py-2" /></label></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setTableDialog(false)} className="rounded border px-4 py-2 text-sm">Cancelar</button><button type="button" onClick={insertTable} className="rounded bg-[#052A79] px-4 py-2 text-sm font-bold text-white">Insertar</button></div></div></div>}

      {previewHtml !== null && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"><div className="flex h-full max-h-[96vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b bg-slate-100 p-3"><div><h3 className="font-bold text-slate-800">Previsualización guardada</h3><p className="text-xs text-slate-500">Valores de demostración, sin controles del diseñador.</p></div><button type="button" onClick={() => setPreviewHtml(null)} className="rounded bg-red-600 px-4 py-1.5 text-sm font-bold text-white">Cerrar</button></header><div className="flex flex-1 justify-center overflow-auto bg-slate-200 p-4"><iframe title="Previsualización del certificado" srcDoc={previewHtml} sandbox="allow-same-origin" className="min-h-[297mm] w-[210mm] border-0 bg-white shadow-xl" /></div></div></div>}
    </div>
  );
}
