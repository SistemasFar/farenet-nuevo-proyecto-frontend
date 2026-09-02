import { useState } from 'react';
import { AlertTriangle, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import {
  faregasNubefactReadinessApi,
  type CatalogoFiscalPreview
} from '../../../services/faregas-nubefact-readiness.api';

type Row = { tarifa_id: number; producto_sku: string };

const parseCsv = (content: string): Row[] => {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) throw new Error('El archivo no contiene filas de datos.');
  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map(value => value.trim().toLowerCase());
  const tarifaIndex = headers.indexOf('tarifa_id');
  const skuIndex = headers.indexOf('producto_sku');
  if (tarifaIndex < 0 || skuIndex < 0) throw new Error('Se requieren las columnas tarifa_id y producto_sku.');
  return lines.slice(1).map(line => {
    const columns = line.split(delimiter).map(value => value.trim().replace(/^"|"$/g, ''));
    return { tarifa_id: Number(columns[tarifaIndex]), producto_sku: columns[skuIndex] || '' };
  });
};

const descargarPlantilla = (tarifas: Array<{ id: number; sku: string }>) => {
  const content = ['tarifa_id;producto_sku', ...tarifas.map(item => `${item.id};${item.sku}`)].join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'plantilla_vinculacion_fiscal_faregas.csv'; link.click();
  URL.revokeObjectURL(url);
};

export default function CatalogoFiscalImportModal({ tarifas, onClose, onApplied }: { tarifas: Array<{ id: number; sku: string }>; onClose: () => void; onApplied: () => Promise<void> }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<CatalogoFiscalPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const seleccionar = async (file?: File) => {
    if (!file) return;
    try {
      setError(''); setPreview(null);
      const parsed = parseCsv(await file.text());
      setRows(parsed); setLoading(true);
      setPreview(await faregasNubefactReadinessApi.previsualizarCatalogo(parsed));
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo leer el archivo.'); }
    finally { setLoading(false); }
  };

  const aplicar = async () => {
    if (!preview || preview.invalidas > 0) return;
    if (!window.confirm(`Se vincularán ${preview.validas} tarifas. ¿Confirmar?`)) return;
    try {
      setLoading(true); setError('');
      await faregasNubefactReadinessApi.aplicarCatalogo(rows);
      await onApplied(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo aplicar el catálogo.'); }
    finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6 shadow-2xl">
    <div className="mb-5 flex items-start justify-between"><div><h3 className="flex items-center gap-2 text-xl font-black text-[#052a79]"><FileSpreadsheet className="h-6 w-6" />Importar vinculaciones fiscales</h3><p className="text-sm text-slate-500">Primero se valida todo el archivo; ninguna fila se aplica parcialmente.</p></div><button type="button" onClick={onClose} className="text-xl text-slate-500">×</button></div>
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><strong>Formato compatible con Excel:</strong> descargue la plantilla CSV, complétela y guárdela conservando las columnas <code>tarifa_id</code> y <code>producto_sku</code>.</div>
    <div className="my-5 flex flex-wrap gap-3"><button type="button" onClick={() => descargarPlantilla(tarifas)} className="rounded-lg border border-[#052a79] px-4 py-2 text-sm font-bold text-[#052a79]">DESCARGAR PLANTILLA</button><label className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#052a79] px-4 py-2 text-sm font-bold text-white"><Upload className="h-4 w-4" />SELECCIONAR CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={event => void seleccionar(event.target.files?.[0])} /></label></div>
    {loading && <div className="flex items-center gap-2 p-6 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Validando...</div>}
    {error && <div className="mb-4 flex gap-2 rounded-lg bg-red-50 p-4 text-red-700"><AlertTriangle className="h-5 w-5" />{error}</div>}
    {preview && <><div className="mb-3 flex gap-3 text-sm"><span className="rounded bg-slate-100 px-3 py-1 font-bold">Total {preview.total}</span><span className="rounded bg-green-100 px-3 py-1 font-bold text-green-700">Válidas {preview.validas}</span><span className="rounded bg-red-100 px-3 py-1 font-bold text-red-700">Inválidas {preview.invalidas}</span></div><div className="max-h-80 overflow-auto rounded-lg border"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-3">Fila</th><th className="p-3">Tarifa</th><th className="p-3">SKU</th><th className="p-3">Estado</th><th className="p-3">Detalle</th></tr></thead><tbody>{preview.filas.map(row => <tr key={`${row.fila}-${row.tarifaId}`} className="border-t"><td className="p-3">{row.fila}</td><td className="p-3">{row.tarifa?.servicioNombre || row.tarifaId}</td><td className="p-3 font-mono">{row.producto?.sku || row.productoSku}</td><td className={`p-3 font-bold ${row.estado === 'VALIDA' ? 'text-green-700' : 'text-red-700'}`}>{row.estado}</td><td className="p-3">{row.errores.join(' · ') || row.producto?.descripcion}</td></tr>)}</tbody></table></div></>}
    <div className="mt-6 flex justify-end gap-3 border-t pt-4"><button type="button" onClick={onClose} disabled={loading} className="rounded-lg px-5 py-2 font-bold text-slate-600">Cancelar</button><button type="button" onClick={() => void aplicar()} disabled={loading || !preview || preview.invalidas > 0 || preview.validas === 0} className="rounded-lg bg-[#052a79] px-5 py-2 font-bold text-white disabled:opacity-40">APLICAR VINCULACIONES</button></div>
  </div></div>;
}
