import { useEffect, useMemo, useState } from 'react';
import {
  faregasSeriesApi,
  type SerieComprobante,
  type SerieSede,
  type TipoComprobanteFaregas
} from '../../../services/faregas-series.api';

type ModalState = { modo: 'CREAR' | 'EDITAR'; serie?: SerieComprobante } | null;

const TIPOS_COMPROBANTE: Array<{ value: TipoComprobanteFaregas; label: string }> = [
  { value: 'FACTURA', label: 'Factura' },
  { value: 'BOLETA', label: 'Boleta' },
  { value: 'NOTA_CREDITO_FACTURA', label: 'Nota de Crédito (Factura)' },
  { value: 'NOTA_CREDITO_BOLETA', label: 'Nota de Crédito (Boleta)' },
  { value: 'NOTA_DEBITO_FACTURA', label: 'Nota de Débito (Factura)' },
  { value: 'NOTA_DEBITO_BOLETA', label: 'Nota de Débito (Boleta)' },
];

const etiquetaTipo = (tipo: TipoComprobanteFaregas) =>
  TIPOS_COMPROBANTE.find((item) => item.value === tipo)?.label || tipo;

const detalleTipo = (tipo: TipoComprobanteFaregas) => {
  if (tipo === 'FACTURA') return { documento: 'Factura', referencia: '—' };
  if (tipo === 'BOLETA') return { documento: 'Boleta', referencia: '—' };
  if (tipo === 'NOTA_CREDITO_FACTURA') return { documento: 'Nota de Crédito', referencia: 'Factura' };
  if (tipo === 'NOTA_CREDITO_BOLETA') return { documento: 'Nota de Crédito', referencia: 'Boleta' };
  if (tipo === 'NOTA_DEBITO_FACTURA') return { documento: 'Nota de Débito', referencia: 'Factura' };
  return { documento: 'Nota de Débito', referencia: 'Boleta' };
};

export default function TabSeries() {
  const [sedes, setSedes] = useState<SerieSede[]>([]);
  const [plantaKey, setPlantaKey] = useState('');
  const [series, setSeries] = useState<SerieComprobante[]>([]);
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [buscar, setBuscar] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState>(null);

  const cargarSedes = async () => {
    const data = await faregasSeriesApi.listarSedes();
    setSedes(data);
    setPlantaKey((actual) => actual || data.find((s) => s.activo)?.key || data[0]?.key || '');
  };
  const cargarSeries = async (key = plantaKey) => {
    if (!key) return;
    try { setLoading(true); setError(''); setSeries(await faregasSeriesApi.listar(key)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error al cargar series'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let cancelado = false;
    void faregasSeriesApi.listarSedes().then((data) => {
      if (cancelado) return;
      setSedes(data);
      setPlantaKey(data.find((s) => s.activo)?.key || data[0]?.key || '');
    }).catch((err) => { if (!cancelado) { setError(err instanceof Error ? err.message : 'Error al cargar sedes'); setLoading(false); } });
    return () => { cancelado = true; };
  }, []);
  useEffect(() => {
    if (!plantaKey) return;
    let cancelado = false;
    void faregasSeriesApi.listar(plantaKey)
      .then((data) => { if (!cancelado) { setSeries(data); setError(''); } })
      .catch((err) => { if (!cancelado) setError(err instanceof Error ? err.message : 'Error al cargar series'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [plantaKey]);

  const filtradas = useMemo(() => series.filter((item) => {
    const texto = buscar.trim().toLowerCase();
    return (!texto || item.serie.toLowerCase().includes(texto))
      && (!tipo || item.tipo_comprobante === tipo)
      && (!estado || (estado === '1' ? item.activo : !item.activo));
  }), [series, buscar, tipo, estado]);
  const sinPredeterminada = TIPOS_COMPROBANTE.map((item) => item.value).filter((item) =>
    !series.some((serie) => serie.tipo_comprobante === item && serie.activo && serie.es_predeterminada)
  );
  const sede = sedes.find((item) => item.key === plantaKey);
  const refrescar = async () => { await Promise.all([cargarSeries(), cargarSedes()]); };
  const cambiarEstado = async (serie: SerieComprobante) => {
    const mensaje = serie.activo && serie.es_predeterminada
      ? `Esta sede quedará sin serie ${etiquetaTipo(serie.tipo_comprobante).toLowerCase()} predeterminada. ¿Deseas desactivar ${serie.serie}?`
      : `¿Deseas ${serie.activo ? 'desactivar' : 'activar'} la serie ${serie.serie}?`;
    if (!confirm(mensaje)) return;
    try { await faregasSeriesApi.cambiarEstado(serie.id, !serie.activo); await refrescar(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Error al cambiar estado'); }
  };

  return <div>
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><strong>Series administrativas no productivas.</strong> Las series FAREGAS todavía no son utilizadas para emisión productiva. La emisión continúa utilizando el correlativo compartido actual.</div>
    <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end"><div className="min-w-64"><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Sede</label><select value={plantaKey} onChange={(e) => { setLoading(true); setPlantaKey(e.target.value); }} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-semibold focus:border-[#052A79] focus:outline-none">{sedes.map((item) => <option key={item.key} value={item.key}>{item.nombre}{item.activo ? '' : ' (INACTIVA)'}</option>)}</select></div><select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Tipo: Todos</option>{TIPOS_COMPROBANTE.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Estado: Todos</option><option value="1">Activas</option><option value="0">Inactivas</option></select><div className="flex-1"><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Buscar</label><input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar serie" className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-[#052A79] focus:outline-none" /></div><button disabled={!plantaKey} onClick={() => setModal({ modo: 'CREAR' })} className="rounded-lg bg-[#052A79] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">+ NUEVA SERIE</button></div>
    {sinPredeterminada.length > 0 && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">Sin serie predeterminada activa: {sinPredeterminada.map(etiquetaTipo).join(', ')}. No se seleccionará otra automáticamente.</div>}
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div><h3 className="font-bold text-slate-700">Series de Comprobante — {sede?.nombre || 'Sin sede'}</h3><p className="text-xs text-slate-500">El correlativo solo avanza mediante reserva atómica; no es editable desde esta pantalla.</p></div>
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{sede?.series_activas || 0} ACTIVAS</span>
      </div>
      {loading ? <div className="p-10 text-center text-slate-500">Cargando series...</div> : error ? <div className="p-10 text-center text-red-600">{error}</div> : filtradas.length === 0 ? <div className="p-12 text-center text-slate-600">No existen series para los filtros seleccionados.</div> :
        <div className="max-h-[58vh] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-slate-200 bg-white text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Serie</th><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Referencia</th><th className="px-4 py-3 text-right">Último Número</th><th className="px-4 py-3 text-center">POS</th><th className="px-4 py-3 text-center">Estado</th><th className="px-4 py-3 text-center">Acciones</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{filtradas.map((serie) => {
              const detalle = detalleTipo(serie.tipo_comprobante);
              const refLabel = serie.tipo_documento_referencia === '01' ? 'Factura' : serie.tipo_documento_referencia === '03' ? 'Boleta' : detalle.referencia;
              return <tr key={serie.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-mono text-base font-bold text-[#052A79]">{serie.serie}{serie.contingencia && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">CONTINGENCIA</span>}{serie.fuente_correlativo === 'COMPARTIDO_FARENET' && <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 font-sans text-xs text-blue-700">COMPARTIDO CON FARENET</span>}</td><td className="px-4 py-3 font-semibold">{detalle.documento}</td><td className="px-4 py-3 text-slate-600">{refLabel}</td><td className="px-4 py-3 text-right font-mono font-bold">{serie.ultimo_numero.toLocaleString('es-PE')}</td><td className="px-4 py-3 text-center">{serie.serie_pos ? <span className="rounded bg-teal-100 px-2 py-1 text-xs font-bold text-teal-700">SÍ</span> : 'No'}</td><td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-1 text-xs font-bold ${serie.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{serie.activo ? 'ACTIVA' : 'INACTIVA'}</span></td><td className="px-4 py-3 text-center"><div className="flex justify-center gap-3 text-xs font-bold"><button onClick={() => setModal({ modo: 'EDITAR', serie })} className="text-[#052A79]">Editar</button><button onClick={() => void cambiarEstado(serie)} className={serie.activo ? 'text-red-600' : 'text-green-600'}>{serie.activo ? 'Desactivar' : 'Activar'}</button></div></td></tr>;
            })}</tbody>
          </table>
        </div>}
    </div>
    {modal && sede && <SerieModal estado={modal} sede={sede} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await refrescar(); }} />}
  </div>;
}

function SerieModal({ estado, sede, onClose, onSaved }: { estado: NonNullable<ModalState>; sede: SerieSede; onClose: () => void; onSaved: () => Promise<void> }) {
  const actual = estado.serie;
  const [tipo, setTipo] = useState<TipoComprobanteFaregas>(actual?.tipo_comprobante || 'FACTURA');
  const [serie, setSerie] = useState(actual?.serie || '');
  const [ultimoNumero, setUltimoNumero] = useState(actual?.ultimo_numero.toString() || '0');
  const [predeterminada, setPredeterminada] = useState(actual?.es_predeterminada || false);
  const [autogenerada, setAutogenerada] = useState(actual?.autogenerada ?? true);
  const [contingencia, setContingencia] = useState(actual?.contingencia || false);
  const [activo, setActivo] = useState(actual?.activo ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
    const [tipoRef, setTipoRef] = useState(actual?.tipo_documento_referencia || '');
    const [seriePos, setSeriePos] = useState(actual?.serie_pos || false);
    const guardar = async (event: React.FormEvent) => {
      event.preventDefault(); setError('');
      try {
        setSaving(true);
        if (estado.modo === 'CREAR') await faregasSeriesApi.crear({ planta_key: sede.key, tipo_comprobante: tipo, serie: serie.trim().toUpperCase(), ultimo_numero: Number(ultimoNumero), es_predeterminada: predeterminada, autogenerada, contingencia, activo, tipo_documento_referencia: tipoRef, serie_pos: seriePos });
        else if (actual) await faregasSeriesApi.editar(actual.id, { es_predeterminada: predeterminada, autogenerada, contingencia, tipo_documento_referencia: tipoRef, serie_pos: seriePos });
        await onSaved();
      } catch (err) { setError(err instanceof Error ? err.message : 'Error al guardar serie'); }
      finally { setSaving(false); }
    };
    
    const esNota = tipo.startsWith('NOTA_');
    
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"><div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl my-8"><h3 className="text-xl font-bold text-[#052A79]">{estado.modo === 'CREAR' ? 'Nueva Serie' : 'Editar Serie'}</h3><p className="mb-5 text-sm text-slate-500">Serie propia de comprobante Faregas</p><form onSubmit={guardar} className="space-y-4"><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Sede</label><input readOnly value={sede.nombre} className="w-full rounded-lg border bg-slate-100 p-2.5" /></div><div className="grid gap-4 md:grid-cols-2"><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Tipo comprobante</label><select disabled={estado.modo === 'EDITAR'} value={tipo} onChange={(e) => setTipo(e.target.value as TipoComprobanteFaregas)} className="w-full rounded-lg border bg-white p-2.5 disabled:bg-slate-100">{TIPOS_COMPROBANTE.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Serie</label><input required maxLength={30} readOnly={estado.modo === 'EDITAR'} value={serie} onChange={(e) => setSerie(e.target.value.toUpperCase())} className="w-full rounded-lg border p-2.5 font-mono font-bold read-only:bg-slate-100" /></div></div>
    
    {esNota && (
      <div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Documento de Referencia (Para Notas)</label><select value={tipoRef} onChange={(e) => setTipoRef(e.target.value)} className="w-full rounded-lg border bg-white p-2.5"><option value="">-- Seleccionar (Opcional) --</option><option value="01">Factura (01)</option><option value="03">Boleta (03)</option></select></div>
    )}
    
    <div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Último número {estado.modo === 'EDITAR' && '(solo lectura)'}</label><input required type="number" min="0" step="1" readOnly={estado.modo === 'EDITAR'} value={ultimoNumero} onChange={(e) => setUltimoNumero(e.target.value)} className="w-full rounded-lg border p-2.5 font-mono read-only:bg-slate-100" /><p className="mt-1 text-xs text-slate-500">El siguiente número reservado será {Number(ultimoNumero || 0) + 1}.</p></div><div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={predeterminada} onChange={(e) => setPredeterminada(e.target.checked)} />Predeterminada</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={autogenerada} onChange={(e) => setAutogenerada(e.target.checked)} />Autogenerada</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={contingencia} onChange={(e) => setContingencia(e.target.checked)} />Contingencia</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={seriePos} onChange={(e) => setSeriePos(e.target.checked)} />Serie para POS</label>{estado.modo === 'CREAR' && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />Activa</label>}</div>{error && <div className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}<div className="flex justify-end gap-3 border-t pt-4"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg px-5 py-2 font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button><button disabled={saving} className="rounded-lg bg-[#052A79] px-5 py-2 font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar Serie'}</button></div></form></div></div>;
}
