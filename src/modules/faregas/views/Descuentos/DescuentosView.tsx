/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Edit2, Loader2, Plus, Search, Tag, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { faregasDescuentosAdminApi, type DescuentoAdmin, type DescuentoFormData } from '../../services/faregas-descuentos.api';

type Maestro = { id?: number; key?: string; codigo?: string; nombre: string; categoria?: string };
type CodigoCliente = { id: number; codigo: string; placa?: string; fecha_inicio?: string; fecha_fin?: string; max_usos: number; usos_realizados: number; activo: boolean };
type Detalle = { descuento: DescuentoAdmin; servicios: Array<{ servicio_id: number }>; codigos: CodigoCliente[] };
const hoy = () => new Date().toISOString().slice(0, 10);
const proximoMes = () => { const f = new Date(); f.setMonth(f.getMonth() + 1); return f.toISOString().slice(0, 10); };
const nuevoForm = (): DescuentoFormData => ({ codigo: '', nombre: '', tipo: 'ALIANZA', empresaAliadaRuc: '', empresaAliadaNombre: '', tipoCalculo: 'MONTO', valor: '', fechaInicio: hoy(), fechaFin: proximoMes(), plantaKey: '', servicioIds: [] });
const fecha = (v?: string) => v ? new Date(v).toLocaleDateString('es-PE') : '-';
const reglaDescuento = (tipo: string, valor: number | string) => tipo === 'PORCENTAJE'
  ? `${Number(valor).toFixed(2)}% de descuento`
  : `S/ ${Number(valor).toFixed(2)} de descuento`;

export function DescuentosView() {
  const [lista, setLista] = useState<DescuentoAdmin[]>([]);
  const [plantas, setPlantas] = useState<Maestro[]>([]);
  const [servicios, setServicios] = useState<Maestro[]>([]);
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<DescuentoFormData>(nuevoForm());
  const [editando, setEditando] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [codigo, setCodigo] = useState({ codigo: '', placa: '', fechaInicio: '', fechaFin: '', maxUsos: 1 });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([faregasDescuentosAdminApi.listar(buscar, estado), faregasDescuentosAdminApi.maestros()]);
      setLista(r.descuentos || []); setPlantas(m.plantas || []); setServicios(m.servicios || []);
    } catch (e: unknown) { Swal.fire('No se pudo cargar', e instanceof Error ? e.message : 'Error inesperado.', 'error'); }
    finally { setLoading(false); }
  }, [buscar, estado]);
  useEffect(() => { void cargar(); }, [cargar]);

  const grupos = useMemo(() => servicios.reduce<Record<string, Maestro[]>>((a, s) => { (a[s.categoria || 'Otros'] ||= []).push(s); return a; }, {}), [servicios]);
  const abrirNuevo = () => { setEditando(null); setForm(nuevoForm()); setShowForm(true); };
  const abrirEditar = async (id: number) => {
    try {
      const r = await faregasDescuentosAdminApi.detalle(id) as Detalle; const d = r.descuento;
      setEditando(id); setForm({ codigo: d.codigo, nombre: d.nombre, tipo: d.tipo, empresaAliadaRuc: d.empresa_aliada_ruc || '', empresaAliadaNombre: d.empresa_aliada_nombre || '', tipoCalculo: d.tipo_calculo, valor: Number(d.valor), fechaInicio: d.fecha_inicio.slice(0, 10), fechaFin: d.fecha_fin.slice(0, 10), plantaKey: d.planta_key || '', servicioIds: r.servicios.map(s => Number(s.servicio_id)) }); setShowForm(true);
    } catch (e: unknown) { Swal.fire('Error', e instanceof Error ? e.message : 'No se pudo abrir.', 'error'); }
  };
  const guardar = async () => {
    if (!form.codigo || !form.nombre || Number(form.valor) <= 0 || !form.servicioIds.length) return void Swal.fire('Complete el formulario', 'Código, nombre, valor y servicios son obligatorios.', 'warning');
    const payload = { ...form, valor: Number(form.valor) };
    try {
      if (editando) {
        await faregasDescuentosAdminApi.actualizar(editando, payload);
        setShowForm(false);
        await cargar();
      } else {
        const creado = await faregasDescuentosAdminApi.crear(payload) as { id: number };
        setShowForm(false);
        await cargar();
        await abrirCodigos(creado.id);
        await Swal.fire('Campaña creada', 'Ahora registra al menos un código para poder consultarla desde Nuevo Certificado.', 'info');
      }
    }
    catch (e: unknown) { Swal.fire('No se pudo guardar', e instanceof Error ? e.message : 'Error inesperado.', 'error'); }
  };
  const abrirCodigos = async (id: number) => {
    try { setDetalle(await faregasDescuentosAdminApi.detalle(id) as Detalle); }
    catch (e: unknown) { Swal.fire('Error', e instanceof Error ? e.message : 'No se pudieron cargar los códigos.', 'error'); }
  };
  const agregarCodigo = async () => {
    if (!detalle || !codigo.codigo.trim()) return;
    if (detalle.descuento.tipo === 'PLACA' && !codigo.placa.trim()) {
      return void Swal.fire('Placa requerida', 'Este descuento es de tipo PLACA; debes indicar la placa autorizada.', 'warning');
    }
    try { await faregasDescuentosAdminApi.crearCodigo(detalle.descuento.id, codigo); setCodigo({ codigo: '', placa: '', fechaInicio: '', fechaFin: '', maxUsos: 1 }); await abrirCodigos(detalle.descuento.id); }
    catch (e: unknown) { Swal.fire('No se pudo crear', e instanceof Error ? e.message : 'Error inesperado.', 'error'); }
  };

  return <div className="space-y-5 descuentos-admin">
    <style>{`.descuentos-admin .input{height:2.5rem;width:100%;border:1px solid #cbd5e1;border-radius:.5rem;padding:0 .75rem;font-size:.75rem;background:white;outline:none}.descuentos-admin .input:focus{border-color:#052a79;box-shadow:0 0 0 2px rgba(5,42,121,.08)}`}</style>
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#052a79] p-3 text-white"><Tag /></div><div><h1 className="text-2xl font-black text-slate-800">Descuentos y Alianzas</h1><p className="text-sm text-slate-500">Campañas, códigos, vigencias y servicios aplicables.</p></div></div><button onClick={abrirNuevo} className="flex items-center gap-2 rounded-lg bg-[#052a79] px-5 py-3 text-xs font-black text-white"><Plus className="h-4 w-4" /> NUEVO DESCUENTO</button></div>
    <div className="flex gap-3 rounded-xl border bg-white p-4"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por código, nombre o empresa..." className="h-10 w-full rounded-lg border pl-10 pr-3 text-sm" /></div><select value={estado} onChange={e => setEstado(e.target.value)} className="rounded-lg border px-3 text-sm"><option value="TODOS">Todos</option><option value="ACTIVOS">Activos</option><option value="INACTIVOS">Inactivos</option><option value="VENCIDOS">Vencidos</option></select></div>
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="border-b px-4 py-3 font-bold">Descuentos registrados ({lista.length})</div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="p-3">Código / Nombre</th><th>Tipo</th><th>Empresa</th><th>Regla</th><th>Vigencia</th><th>Sede</th><th>Códigos de aplicación</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={9} className="p-12 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr> : lista.length === 0 ? <tr><td colSpan={9} className="p-12 text-center text-slate-400">No hay descuentos registrados.</td></tr> : lista.map(d => <tr key={d.id} className="border-t"><td className="p-3"><b className="text-[#052a79]">{d.codigo}</b><div>{d.nombre}</div></td><td>{d.tipo}</td><td>{d.empresa_aliada_nombre || '-'}</td><td>{d.tipo_calculo === 'MONTO' ? 'S/ ' : ''}{Number(d.valor).toFixed(2)}{d.tipo_calculo === 'PORCENTAJE' ? '%' : ''}<div className="text-slate-400">{d.total_servicios} servicios enlazados</div></td><td>{fecha(d.fecha_inicio)} – {fecha(d.fecha_fin)}</td><td>{d.planta_nombre || 'Todas'}</td><td><button onClick={() => abrirCodigos(d.id)} className={`rounded-md px-2 py-1 font-bold ${Number(d.total_codigos) > 0 ? 'bg-blue-50 text-[#052a79]' : 'bg-amber-100 text-amber-800'}`}>{Number(d.total_codigos) > 0 ? `${d.total_codigos} códigos` : 'Vincular código'}</button><div className="mt-1 text-slate-400">{d.usos_realizados} usos</div></td><td><span className={`rounded-full px-2 py-1 font-bold ${d.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{d.activo ? 'ACTIVO' : 'INACTIVO'}</span></td><td><div className="flex items-center gap-3"><button onClick={() => abrirEditar(d.id)} className="flex items-center gap-1 font-bold text-[#052a79]"><Edit2 className="h-4 w-4" /> Editar</button><button onClick={() => abrirCodigos(d.id)} className="rounded-md bg-[#052a79] px-2 py-1 font-bold text-white">Códigos</button><button onClick={async()=>{await faregasDescuentosAdminApi.cambiarEstado(d.id,!d.activo);await cargar();}} className={d.activo?'font-bold text-red-600':'font-bold text-green-700'}>{d.activo?'Desactivar':'Activar'}</button></div></td></tr>)}</tbody>
        </table>
      </div>
    </div>

    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white"><div className="flex items-center justify-between border-b px-6 py-4"><h2 className="text-lg font-black">{editando?'Editar descuento':'Nuevo descuento'}</h2><button onClick={()=>setShowForm(false)}><X /></button></div><div className="grid gap-4 p-6 md:grid-cols-2">
      <Campo titulo="Código"><input value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value.toUpperCase()})} className="input" /></Campo><Campo titulo="Nombre"><input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} className="input" /></Campo>
      <Campo titulo="Tipo"><select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} className="input"><option>ALIANZA</option><option>CUPON</option><option>PLACA</option></select></Campo><Campo titulo="Sede"><select value={form.plantaKey} onChange={e=>setForm({...form,plantaKey:e.target.value})} className="input"><option value="">Todas</option>{plantas.map(p=><option key={p.key} value={p.key}>{p.nombre}</option>)}</select></Campo>
      <Campo titulo="Empresa aliada"><input value={form.empresaAliadaNombre} onChange={e=>setForm({...form,empresaAliadaNombre:e.target.value})} className="input" /></Campo><Campo titulo="RUC aliado"><input value={form.empresaAliadaRuc} maxLength={11} onChange={e=>setForm({...form,empresaAliadaRuc:e.target.value.replace(/\D/g,'')})} className="input" /></Campo>
      <Campo titulo="Cálculo"><select value={form.tipoCalculo} onChange={e=>setForm({...form,tipoCalculo:e.target.value})} className="input"><option value="MONTO">Monto en soles</option><option value="PORCENTAJE">Porcentaje</option></select></Campo><Campo titulo={form.tipoCalculo === 'PORCENTAJE' ? 'Porcentaje que se descontará (%)' : 'Monto que se descontará (S/)'}><input type="number" min="0.01" max={form.tipoCalculo === 'PORCENTAJE' ? 100 : undefined} step="0.01" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} placeholder={form.tipoCalculo === 'PORCENTAJE' ? 'Ej. 20' : 'Ej. 20.00'} className="input" /><span className="mt-1 block text-[10px] font-normal text-slate-500">Este valor es el beneficio económico aplicado al precio.</span></Campo>
      <Campo titulo="Inicio"><input type="date" value={form.fechaInicio} onChange={e=>setForm({...form,fechaInicio:e.target.value})} className="input" /></Campo><Campo titulo="Fin"><input type="date" value={form.fechaFin} onChange={e=>setForm({...form,fechaFin:e.target.value})} className="input" /></Campo>
      <div className="md:col-span-2"><b className="text-xs">SERVICIOS</b><div className="mt-2 max-h-52 space-y-3 overflow-y-auto rounded-lg border p-3">{Object.entries(grupos).map(([g,items])=><div key={g}><p className="font-bold text-[#052a79]">{g}</p><div className="grid md:grid-cols-2">{items.map(s=><label key={s.id} className="flex gap-2 py-1 text-xs"><input type="checkbox" checked={form.servicioIds.includes(Number(s.id))} onChange={e=>setForm({...form,servicioIds:e.target.checked?[...form.servicioIds,Number(s.id)]:form.servicioIds.filter(id=>id!==Number(s.id))})}/>{s.codigo} — {s.nombre}</label>)}</div></div>)}</div></div>
    </div><div className="flex justify-end gap-2 border-t p-4"><button onClick={()=>setShowForm(false)} className="rounded-lg border px-5 py-2 text-xs font-bold">Cancelar</button><button onClick={guardar} className="rounded-lg bg-[#052a79] px-5 py-2 text-xs font-black text-white">Guardar</button></div></div></div>}

    {detalle && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b px-6 py-4"><div><h2 className="text-lg font-black">Códigos — {detalle.descuento.nombre}</h2><p className="text-xs text-slate-500">{detalle.descuento.tipo === 'PLACA' ? 'Cada código queda vinculado a una placa, además de su vigencia y número de usos.' : 'Estos códigos se consultan directamente en Nuevo Certificado y pueden limitarse por vigencia y número de usos.'}</p></div><button onClick={()=>setDetalle(null)}><X /></button></div>
        <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs">
          <span><b>Descuento económico configurado:</b> {reglaDescuento(detalle.descuento.tipo_calculo, detalle.descuento.valor)}</span>
          <span><b>Servicios enlazados:</b> {detalle.servicios.length}</span>
        </div>
        <div className="grid gap-3 bg-slate-50 p-4 md:grid-cols-4">
          <Campo titulo="Código de aplicación"><input placeholder="Ej. ALIANZA2026" value={codigo.codigo} onChange={e=>setCodigo({...codigo,codigo:e.target.value.toUpperCase()})} className="input"/></Campo>
          {detalle.descuento.tipo === 'PLACA' && <Campo titulo="Placa obligatoria"><input placeholder="Ej. ABC123" value={codigo.placa} onChange={e=>setCodigo({...codigo,placa:e.target.value.toUpperCase()})} className="input"/></Campo>}
          <Campo titulo="Válido desde (opcional)"><input type="date" value={codigo.fechaInicio} onChange={e=>setCodigo({...codigo,fechaInicio:e.target.value})} className="input"/></Campo>
          <Campo titulo="Válido hasta (opcional)"><input type="date" value={codigo.fechaFin} onChange={e=>setCodigo({...codigo,fechaFin:e.target.value})} className="input"/></Campo>
          <Campo titulo="Veces que este código podrá usarse"><input type="number" min="1" value={codigo.maxUsos} onChange={e=>setCodigo({...codigo,maxUsos:Number(e.target.value)})} className="input"/></Campo>
          <div className="flex items-end"><button onClick={agregarCodigo} className="h-10 w-full rounded-lg bg-[#052a79] text-xs font-black text-white">VINCULAR CÓDIGO</button></div>
        </div>
        <div className="overflow-x-auto p-4"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-3">Código</th>{detalle.descuento.tipo === 'PLACA' && <th>Placa autorizada</th>}<th>Vigencia</th><th>Veces usadas / límite</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{detalle.codigos.length === 0 ? <tr><td colSpan={detalle.descuento.tipo === 'PLACA' ? 6 : 5} className="p-8 text-center font-semibold text-amber-700">Esta campaña todavía no puede utilizarse en Nuevo Certificado porque no tiene códigos vinculados.</td></tr> : detalle.codigos.map(c=><tr key={c.id} className="border-t"><td className="p-3 font-black text-[#052a79]">{c.codigo}</td>{detalle.descuento.tipo === 'PLACA' && <td>{c.placa||'Sin placa configurada'}</td>}<td>{c.fecha_inicio?`${fecha(c.fecha_inicio)} – ${fecha(c.fecha_fin)}`:'Campaña'}</td><td>{c.usos_realizados} de {c.max_usos}</td><td>{c.activo?'ACTIVO':'INACTIVO'}</td><td><button onClick={async()=>{await faregasDescuentosAdminApi.cambiarEstadoCodigo(c.id,!c.activo);await abrirCodigos(detalle.descuento.id);}} className={c.activo?'font-bold text-red-600':'font-bold text-green-700'}>{c.activo?'Desactivar':'Activar'}</button></td></tr>)}</tbody></table></div>
      </div>
    </div>}
  </div>;
}

function Campo({ titulo, children }: { titulo: string; children: ReactNode }) { return <label className="text-xs font-bold">{titulo.toUpperCase()}<div className="mt-1">{children}</div></label>; }
