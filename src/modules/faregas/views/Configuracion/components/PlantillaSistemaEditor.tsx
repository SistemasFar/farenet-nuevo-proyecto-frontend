import { useCallback, useEffect, useState } from 'react';
import { Eye, Loader2, RotateCcw, Save, ShieldCheck, X } from 'lucide-react';
import {
  faregasFormatosApi,
  type DisenoSistemaVisual,
  type EstadoDisenoSistema,
  type VersionDisenoSistema,
} from '../../../services/faregas-formatos.api';

interface PlantillaSistemaEditorProps {
  formatoId: number;
  onClose: () => void;
  onActivated?: () => Promise<void> | void;
}

const mensajeError = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';

export default function PlantillaSistemaEditor({ formatoId, onClose, onActivated }: PlantillaSistemaEditorProps) {
  const [version, setVersion] = useState<VersionDisenoSistema | null>(null);
  const [diseno, setDiseno] = useState<DisenoSistemaVisual | null>(null);
  const [disenoGuardado, setDisenoGuardado] = useState<DisenoSistemaVisual | null>(null);
  const [html, setHtml] = useState('');
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [formato, setFormato] = useState<Pick<EstadoDisenoSistema, 'codigo' | 'nombre' | 'capacidades'> | null>(null);

  const previsualizar = useCallback(async (valor: DisenoSistemaVisual, versionId?: number) => {
    const resultado = await faregasFormatosApi.previsualizarDisenoSistema(formatoId, valor, versionId);
    setHtml(resultado.html);
    setDiseno(resultado.diseno);
    setFormato({ codigo: resultado.codigo, nombre: resultado.nombre, capacidades: resultado.capacidades });
  }, [formatoId]);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      setCargando(true);
      setError('');
      try {
        const estado = await faregasFormatosApi.obtenerDisenoSistema(formatoId);
        const borrador = estado.borrador || (await faregasFormatosApi.crearBorradorDisenoSistema(formatoId)).version;
        if (!activo) return;
        setVersion(borrador);
        setFormato({ codigo: estado.codigo, nombre: estado.nombre, capacidades: estado.capacidades });
        setDiseno(borrador.diseno);
        setDisenoGuardado(borrador.diseno);
        await previsualizar(borrador.diseno, borrador.id);
      } catch (e) {
        if (activo) setError(mensajeError(e));
      } finally {
        if (activo) setCargando(false);
      }
    };
    void cargar();
    return () => { activo = false; };
  }, [formatoId, previsualizar]);

  const cambiar = <K extends keyof DisenoSistemaVisual, P extends keyof DisenoSistemaVisual[K]>(
    seccion: K,
    propiedad: P,
    valor: DisenoSistemaVisual[K][P]
  ) => {
    setDiseno((actual) => actual ? ({
      ...actual,
      [seccion]: { ...actual[seccion], [propiedad]: valor },
    }) : actual);
    setAviso('');
  };

  const modificado = Boolean(diseno && disenoGuardado && JSON.stringify(diseno) !== JSON.stringify(disenoGuardado));

  const ejecutarPreview = async () => {
    if (!diseno || !version) return;
    setTrabajando(true);
    setError('');
    try {
      await previsualizar(diseno, version.id);
      setAviso('Previsualización actualizada. Los cambios aún no afectan la emisión.');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setTrabajando(false);
    }
  };

  const guardar = async (): Promise<VersionDisenoSistema | null> => {
    if (!diseno || !version) return null;
    setTrabajando(true);
    setError('');
    try {
      const resultado = await faregasFormatosApi.guardarBorradorDisenoSistema(formatoId, version.id, diseno);
      setVersion(resultado.version);
      setDiseno(resultado.version.diseno);
      setDisenoGuardado(resultado.version.diseno);
      setAviso(`Borrador v${resultado.version.version} guardado y verificado.`);
      return resultado.version;
    } catch (e) {
      setError(mensajeError(e));
      return null;
    } finally {
      setTrabajando(false);
    }
  };

  const activar = async () => {
    if (!version || !diseno) return;
    if (!window.confirm('¿Activar este diseño? Sólo se aplicará a futuras emisiones; los certificados históricos conservarán su versión.')) return;
    let versionActivable = version;
    if (modificado) {
      const guardada = await guardar();
      if (!guardada) return;
      versionActivable = guardada;
    }
    setTrabajando(true);
    setError('');
    try {
      const resultado = await faregasFormatosApi.activarBorradorDisenoSistema(formatoId, versionActivable.id);
      setAviso(`Diseño v${resultado.version.version} activado para futuras emisiones.`);
      await onActivated?.();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setTrabajando(false);
    }
  };

  const restaurar = () => {
    if (!disenoGuardado) return;
    setDiseno(disenoGuardado);
    setAviso('Se restauraron los valores del último guardado.');
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-100">
      <header className="flex items-center justify-between border-b bg-[#052A79] px-5 py-3 text-white">
        <div>
          <h2 className="text-base font-bold">Diseñador visual — {formato?.nombre || 'Certificado real'}</h2>
          <p className="text-xs text-blue-100">
            {version ? `Borrador v${version.version}` : 'Cargando borrador'} · La plantilla JavaScript permanece protegida
          </p>
        </div>
        <button type="button" onClick={onClose} disabled={trabajando} className="rounded p-2 hover:bg-white/10" aria-label="Cerrar diseñador">
          <X className="h-5 w-5" />
        </button>
      </header>

      {cargando ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> Preparando el certificado real…</div>
      ) : error && !diseno ? (
        <div className="m-auto max-w-xl rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
      ) : diseno ? (
        <div className="grid min-h-0 flex-1 grid-cols-[330px_minmax(0,1fr)]">
          <aside className="overflow-y-auto border-r bg-white p-4">
            <p className="mb-4 text-xs text-slate-600">Sólo se permiten propiedades controladas. Los datos dinámicos y las tablas técnicas permanecen intactos.</p>

            <fieldset className="space-y-3 border-b pb-4">
              <legend className="mb-2 text-sm font-bold text-slate-800">Textos autorizados</legend>
              <label className="block text-xs font-semibold text-slate-600">Título
                <textarea value={diseno.textos.titulo} onChange={(e) => cambiar('textos', 'titulo', e.target.value)} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" rows={2} />
              </label>
              {formato?.capacidades.textos.certifica && (
                <label className="block text-xs font-semibold text-slate-600">Subtítulo
                  <input value={diseno.textos.certifica} onChange={(e) => cambiar('textos', 'certifica', e.target.value)} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
                </label>
              )}
            </fieldset>

            <fieldset className="grid grid-cols-2 gap-3 border-b py-4">
              <legend className="col-span-2 mb-2 text-sm font-bold text-slate-800">Página y cuerpo</legend>
              <NumberField label="Margen (px)" value={diseno.pagina.paddingPx} min={8} max={60} onChange={(v) => cambiar('pagina', 'paddingPx', v)} />
              <NumberField label="Letra cuerpo" value={diseno.cuerpo.fontSizePx} min={8} max={14} step={0.5} onChange={(v) => cambiar('cuerpo', 'fontSizePx', v)} />
              <NumberField label="Interlineado" value={diseno.cuerpo.lineHeight} min={1} max={2} step={0.1} onChange={(v) => cambiar('cuerpo', 'lineHeight', v)} />
            </fieldset>

            <fieldset className="grid grid-cols-2 gap-3 border-b py-4">
              <legend className="col-span-2 mb-2 text-sm font-bold text-slate-800">Título</legend>
              <NumberField label="Tamaño" value={diseno.titulo.fontSizePx} min={10} max={28} onChange={(v) => cambiar('titulo', 'fontSizePx', v)} />
              <SelectField label="Alineación" value={diseno.titulo.textAlign} onChange={(v) => cambiar('titulo', 'textAlign', v)} />
              <NumberField label="Margen superior" value={diseno.titulo.marginTopPx} min={0} max={40} onChange={(v) => cambiar('titulo', 'marginTopPx', v)} />
              <NumberField label="Margen inferior" value={diseno.titulo.marginBottomPx} min={0} max={40} onChange={(v) => cambiar('titulo', 'marginBottomPx', v)} />
            </fieldset>

            <fieldset className="grid grid-cols-2 gap-3 border-b py-4">
              <legend className="col-span-2 mb-2 text-sm font-bold text-slate-800">Tablas</legend>
              <NumberField label="Tamaño de letra" value={diseno.tablas.fontSizePx} min={7} max={13} step={0.5} onChange={(v) => cambiar('tablas', 'fontSizePx', v)} />
              <NumberField label="Espaciado de celda" value={diseno.tablas.cellPaddingPx} min={0} max={10} onChange={(v) => cambiar('tablas', 'cellPaddingPx', v)} />
              <NumberField label="Grosor de borde" value={diseno.tablas.borderWidthPx} min={0} max={3} step={0.5} onChange={(v) => cambiar('tablas', 'borderWidthPx', v)} />
            </fieldset>

            <fieldset className="grid grid-cols-2 gap-3 py-4">
              <legend className="col-span-2 mb-2 text-sm font-bold text-slate-800">Pie</legend>
              <NumberField label="Tamaño" value={diseno.pie.fontSizePx} min={7} max={14} step={0.5} onChange={(v) => cambiar('pie', 'fontSizePx', v)} />
              <SelectField label="Alineación" value={diseno.pie.textAlign} onChange={(v) => cambiar('pie', 'textAlign', v)} />
              <NumberField label="Margen superior" value={diseno.pie.marginTopPx} min={0} max={40} onChange={(v) => cambiar('pie', 'marginTopPx', v)} />
            </fieldset>
          </aside>

          <main className="min-w-0 overflow-auto bg-slate-300 p-5">
            <div className="mx-auto min-h-[1123px] max-w-[794px] bg-white shadow-xl">
              <iframe title={`Previsualización del certificado ${formato?.codigo || ''}`} srcDoc={html} sandbox="" className="h-[1123px] w-full border-0 bg-white" />
            </div>
          </main>
        </div>
      ) : null}

      <footer className="flex items-center justify-between border-t bg-white px-5 py-3">
        <div className="min-h-5 text-xs">
          {error ? <span className="text-red-600">{error}</span> : <span className="text-emerald-700">{aviso}</span>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={restaurar} disabled={!modificado || trabajando} className="flex items-center gap-1 rounded border px-3 py-2 text-sm font-semibold disabled:opacity-40"><RotateCcw className="h-4 w-4" /> Restaurar</button>
          <button type="button" onClick={() => void ejecutarPreview()} disabled={!diseno || trabajando} className="flex items-center gap-1 rounded border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-800 disabled:opacity-40"><Eye className="h-4 w-4" /> Previsualizar</button>
          <button type="button" onClick={() => void guardar()} disabled={!modificado || trabajando} className="flex items-center gap-1 rounded bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"><Save className="h-4 w-4" /> Guardar borrador</button>
          <button type="button" onClick={() => void activar()} disabled={!version || trabajando} className="flex items-center gap-1 rounded bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"><ShieldCheck className="h-4 w-4" /> Activar diseño</button>
        </div>
      </footer>
    </div>
  );
}

function NumberField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-xs font-semibold text-slate-600">{label}
      <input type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
    </label>
  );
}

function SelectField({ label, value, onChange }: { label: string; value: DisenoSistemaVisual['titulo']['textAlign']; onChange: (value: DisenoSistemaVisual['titulo']['textAlign']) => void }) {
  return (
    <label className="block text-xs font-semibold text-slate-600">{label}
      <select value={value} onChange={(e) => onChange(e.target.value as DisenoSistemaVisual['titulo']['textAlign'])} className="mt-1 w-full rounded border px-2 py-1.5 text-sm">
        <option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option><option value="justify">Justificado</option>
      </select>
    </label>
  );
}
