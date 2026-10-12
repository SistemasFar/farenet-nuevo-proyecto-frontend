import { useCallback, useEffect, useState } from 'react';
import { Edit, Power, PowerOff, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { faregasDescuentosAdminApi, type CodigoDescuentoAdmin, type DescuentoAdmin } from '../../../services/faregas-descuentos.api';

type Props = { descuento: DescuentoAdmin; onCerrar: () => void; onCambio?: () => Promise<void> | void };
const fecha = (valor?: string) => valor ? new Date(valor).toLocaleDateString('es-PE') : '';

export function CodigosListadoModal({ descuento, onCerrar, onCambio }: Props) {
  const [items, setItems] = useState<CodigoDescuentoAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [buscar, setBuscar] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [estado, setEstado] = useState('TODOS');
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<CodigoDescuentoAdmin | null>(null);
  const [form, setForm] = useState({ codigo: '', placa: '', maxUsos: 1, personalizada: false, fechaInicio: '', fechaFin: '' });
  const limite = 20;

  useEffect(() => {
    const timer = window.setTimeout(() => { setPagina(1); setBusquedaAplicada(buscar.trim()); }, 350);
    return () => window.clearTimeout(timer);
  }, [buscar]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const respuesta = await faregasDescuentosAdminApi.listarCodigos(descuento.id, { search: busquedaAplicada, estado, limit: limite, offset: (pagina - 1) * limite });
      setItems(respuesta.items); setTotal(respuesta.total);
      if (respuesta.total > 0 && (pagina - 1) * limite >= respuesta.total) setPagina(Math.ceil(respuesta.total / limite));
    } catch (error) {
      await Swal.fire('No se pudieron cargar', error instanceof Error ? error.message : 'Error inesperado.', 'error');
    } finally { setLoading(false); }
  }, [busquedaAplicada, descuento.id, estado, pagina]);
  useEffect(() => { void cargar(); }, [cargar]);

  const abrirEdicion = (item: CodigoDescuentoAdmin) => {
    setEditando(item);
    setForm({ codigo: item.codigo, placa: item.placa || '', maxUsos: item.max_usos, personalizada: Boolean(item.fecha_inicio), fechaInicio: item.fecha_inicio?.slice(0, 10) || '', fechaFin: item.fecha_fin?.slice(0, 10) || '' });
  };
  const guardarEdicion = async () => {
    if (!editando) return;
    try {
      await faregasDescuentosAdminApi.actualizarCodigo(editando.id, { codigo: form.codigo, placa: form.placa, maxUsos: form.maxUsos, fechaInicio: form.personalizada ? form.fechaInicio : null, fechaFin: form.personalizada ? form.fechaFin : null });
      setEditando(null); await cargar(); await onCambio?.();
    } catch (error) { await Swal.fire('No se pudo actualizar', error instanceof Error ? error.message : 'Error inesperado.', 'error'); }
  };
  const cambiarEstado = async (item: CodigoDescuentoAdmin) => {
    try { await faregasDescuentosAdminApi.cambiarEstadoCodigo(item.id, !item.activo); await cargar(); await onCambio?.(); }
    catch (error) { await Swal.fire('No se pudo cambiar el estado', error instanceof Error ? error.message : 'Error inesperado.', 'error'); }
  };

  const paginas = Math.max(1, Math.ceil(total / limite));
  const desde = total ? (pagina - 1) * limite + 1 : 0;
  const hasta = Math.min(pagina * limite, total);

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
    <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4"><div><h2 className="text-lg font-black">Códigos — {descuento.nombre}</h2><p className="text-xs text-slate-500">Listado paginado desde el servidor.</p></div><button type="button" onClick={onCerrar}><X /></button></header>
      <div className="space-y-4 p-5">
        <div className="grid gap-2 md:grid-cols-[1fr_14rem]"><input value={buscar} onChange={event => setBuscar(event.target.value)} placeholder="Buscar código o placa..." className="input" /><select value={estado} onChange={event => { setEstado(event.target.value); setPagina(1); }} className="input"><option value="TODOS">Todos los estados</option><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option></select></div>
        {editando && <section className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-3"><label className="text-xs font-bold">CÓDIGO<input value={form.codigo} onChange={event => setForm({ ...form, codigo: event.target.value.toUpperCase() })} className="input mt-1" /></label><label className="text-xs font-bold">PLACA<input value={form.placa} onChange={event => setForm({ ...form, placa: event.target.value.toUpperCase() })} className="input mt-1" /></label><label className="text-xs font-bold">MÁXIMO USOS<input type="number" min="1" value={form.maxUsos} onChange={event => setForm({ ...form, maxUsos: Number(event.target.value) })} className="input mt-1" /></label><label className="flex items-center gap-2 text-xs font-bold md:col-span-3"><input type="checkbox" checked={form.personalizada} onChange={event => setForm({ ...form, personalizada: event.target.checked, fechaInicio: '', fechaFin: '' })} /> Usar vigencia personalizada</label>{form.personalizada && <><label className="text-xs font-bold">DESDE<input type="date" value={form.fechaInicio} onChange={event => setForm({ ...form, fechaInicio: event.target.value })} className="input mt-1" /></label><label className="text-xs font-bold">HASTA<input type="date" value={form.fechaFin} onChange={event => setForm({ ...form, fechaFin: event.target.value })} className="input mt-1" /></label></>}<div className="flex items-end gap-2 md:col-span-3"><button type="button" onClick={() => setEditando(null)} className="rounded-lg border bg-white px-4 py-2 text-xs font-bold">Cancelar</button><button type="button" onClick={() => void guardarEdicion()} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white">Guardar</button></div></section>}
        <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Código</th><th>Placa</th><th>Vigencia</th><th>Usos</th><th>Estado</th><th>Acción</th></tr></thead><tbody className="divide-y">{loading ? <tr><td colSpan={6} className="p-8 text-center">Cargando...</td></tr> : items.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">No se encontraron códigos.</td></tr> : items.map(item => <tr key={item.id}><td className="p-3 font-black text-[#052a79]">{item.codigo}</td><td>{item.placa || 'Sin restricción'}</td><td>{item.fecha_inicio ? `${fecha(item.fecha_inicio)} – ${fecha(item.fecha_fin)}` : 'Heredada de campaña'}</td><td>{item.usos_realizados} de {item.max_usos}</td><td><span className={`rounded-full px-2 py-1 font-bold ${item.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.activo ? 'ACTIVO' : 'INACTIVO'}</span></td><td><div className="flex gap-2"><button type="button" onClick={() => abrirEdicion(item)} className="rounded-md border border-blue-200 bg-blue-50 p-2 text-[#052a79]" title="Editar"><Edit size={16} /></button><button type="button" onClick={() => void cambiarEstado(item)} className="rounded-md border p-2 text-[#052a79]" title={item.activo ? 'Desactivar' : 'Activar'}>{item.activo ? <PowerOff size={16} /> : <Power size={16} />}</button></div></td></tr>)}</tbody></table></div>
        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs"><span>Mostrando {desde}-{hasta} de {total.toLocaleString('es-PE')}</span><div className="flex items-center gap-3"><button type="button" disabled={pagina <= 1} onClick={() => setPagina(valor => valor - 1)} className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40">Anterior</button><b>Página {pagina} de {paginas}</b><button type="button" disabled={pagina >= paginas} onClick={() => setPagina(valor => valor + 1)} className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40">Siguiente</button></div></footer>
      </div>
    </div>
  </div>;
}
