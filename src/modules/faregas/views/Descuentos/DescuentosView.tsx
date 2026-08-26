/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Edit2, Loader2, MapPin, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { faregasDescuentosAdminApi, type DescuentoAdmin, type DescuentoFormData } from '../../services/faregas-descuentos.api';

type Maestro = { id?: number; key?: string; codigo?: string; nombre: string; categoria?: string };
type TipoCalculo = 'FLAT' | 'MONTO' | 'PORCENTAJE';
type ServicioPorPlanta = Maestro & { planta_key: string; precio: number; tarifa_codigo?: string };
type ReglaCodigo = { plantaKey: string; servicioId: number; tipoCalculo: TipoCalculo; valorContado: number | string; valorCredito: number | string };
type CodigoCliente = { id: number; codigo: string; placa?: string; fecha_inicio?: string; fecha_fin?: string; max_usos: number; usos_realizados: number; activo: boolean; reglas: ReglaCodigo[] };
type Detalle = { descuento: DescuentoAdmin; servicios: Array<{ servicio_id: number }>; codigos: CodigoCliente[] };
type CodigoForm = { codigo: string; placa: string; fechaInicio: string; fechaFin: string; maxUsos: number; reglas: ReglaCodigo[] };
const hoy = () => new Date().toISOString().slice(0, 10);
const proximoMes = () => { const f = new Date(); f.setMonth(f.getMonth() + 1); return f.toISOString().slice(0, 10); };
const nuevoForm = (): DescuentoFormData => ({ nombre: '', tipo: 'CUPON', empresaAliadaRuc: '', empresaAliadaNombre: '', fechaInicio: hoy(), fechaFin: proximoMes() });
const nuevoCodigo = (): CodigoForm => ({ codigo: '', placa: '', fechaInicio: '', fechaFin: '', maxUsos: 1, reglas: [] });
const fecha = (v?: string) => v ? new Date(v).toLocaleDateString('es-PE') : '-';
const tituloValor = (tipo: TipoCalculo, forma: 'contado' | 'crédito') => tipo === 'FLAT'
  ? `Precio final al ${forma} (S/)`
  : tipo === 'PORCENTAJE'
    ? `Descuento al ${forma} (%)`
    : `Descuento al ${forma} (S/)`;

export function DescuentosView() {
  const [lista, setLista] = useState<DescuentoAdmin[]>([]);
  const [plantas, setPlantas] = useState<Maestro[]>([]);
  const [serviciosPorPlanta, setServiciosPorPlanta] = useState<ServicioPorPlanta[]>([]);
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<DescuentoFormData>(nuevoForm());
  const [editando, setEditando] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [codigo, setCodigo] = useState<CodigoForm>(nuevoCodigo());
  const [codigoEditando, setCodigoEditando] = useState<number | null>(null);
  const [sedesSeleccionadas, setSedesSeleccionadas] = useState<string[]>([]);
  const [codigoTab, setCodigoTab] = useState<'CONFIGURAR' | 'LISTADO'>('CONFIGURAR');
  const [buscarCodigo, setBuscarCodigo] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([faregasDescuentosAdminApi.listar(buscar, estado), faregasDescuentosAdminApi.maestros()]);
      setLista(r.descuentos || []); setPlantas(m.plantas || []); setServiciosPorPlanta(m.serviciosPorPlanta || []);
    } catch (e: unknown) { Swal.fire('No se pudo cargar', e instanceof Error ? e.message : 'Error inesperado.', 'error'); }
    finally { setLoading(false); }
  }, [buscar, estado]);
  useEffect(() => { void cargar(); }, [cargar]);

  const plantasPorKey = useMemo(() => new Map(plantas.map(planta => [String(planta.key), planta.nombre])), [plantas]);
  const abrirNuevo = () => { setEditando(null); setForm(nuevoForm()); setShowForm(true); };
  const abrirEditar = async (id: number) => {
    try {
      const r = await faregasDescuentosAdminApi.detalle(id) as Detalle; const d = r.descuento;
      setEditando(id); setForm({ nombre: d.nombre, tipo: d.tipo, empresaAliadaRuc: d.empresa_aliada_ruc || '', empresaAliadaNombre: d.empresa_aliada_nombre || '', fechaInicio: d.fecha_inicio.slice(0, 10), fechaFin: d.fecha_fin.slice(0, 10) }); setShowForm(true);
    } catch (e: unknown) { Swal.fire('Error', e instanceof Error ? e.message : 'No se pudo abrir.', 'error'); }
  };
  const guardar = async () => {
    if (!form.nombre) return void Swal.fire('Complete el formulario', 'El nombre del descuento es obligatorio.', 'warning');
    const payload = { ...form };
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
  const abrirCodigos = async (id: number, tab?: 'CONFIGURAR' | 'LISTADO') => {
    try {
      const respuesta = await faregasDescuentosAdminApi.detalle(id) as Detalle;
      setDetalle(respuesta);
      setCodigo(nuevoCodigo());
      setCodigoEditando(null);
      setSedesSeleccionadas([]);
      setBuscarCodigo('');
      setCodigoTab(tab || (respuesta.codigos.length ? 'LISTADO' : 'CONFIGURAR'));
    }
    catch (e: unknown) { Swal.fire('Error', e instanceof Error ? e.message : 'No se pudieron cargar los códigos.', 'error'); }
  };
  const alternarSede = (plantaKey: string, seleccionada: boolean) => {
    if (seleccionada) {
      setSedesSeleccionadas(actual => actual.includes(plantaKey) ? actual : [...actual, plantaKey]);
      return;
    }
    setSedesSeleccionadas(actual => actual.filter(key => key !== plantaKey));
    setCodigo(actual => ({ ...actual, reglas: actual.reglas.filter(regla => regla.plantaKey !== plantaKey) }));
  };
  const alternarServicio = (plantaKey: string, servicioId: number, seleccionado: boolean) => {
    setCodigo(actual => {
      const otras = actual.reglas.filter(regla => !(regla.plantaKey === plantaKey && regla.servicioId === servicioId));
      return {
        ...actual,
        reglas: seleccionado
          ? [...otras, { plantaKey, servicioId, tipoCalculo: 'FLAT', valorContado: '', valorCredito: '' }]
          : otras,
      };
    });
  };
  const actualizarRegla = (plantaKey: string, servicioId: number, cambio: Partial<ReglaCodigo>) => {
    setCodigo(actual => ({
      ...actual,
      reglas: actual.reglas.map(regla => regla.plantaKey === plantaKey && regla.servicioId === servicioId
        ? { ...regla, ...cambio }
        : regla),
    }));
  };
  const agregarCodigo = async () => {
    if (!detalle || !codigo.codigo.trim()) return;
    if (detalle.descuento.tipo === 'PLACA' && !codigo.placa.trim()) {
      return void Swal.fire('Placa requerida', 'Este descuento es de tipo PLACA; debes indicar la placa autorizada.', 'warning');
    }
    if (!sedesSeleccionadas.length) return void Swal.fire('Sedes requeridas', 'Selecciona al menos una sede donde se aplicará el código.', 'warning');
    const sedeSinServicios = sedesSeleccionadas.find(plantaKey => !codigo.reglas.some(regla => regla.plantaKey === plantaKey));
    if (sedeSinServicios) return void Swal.fire('Servicios requeridos', `Selecciona al menos un servicio para ${plantasPorKey.get(sedeSinServicios) || 'la sede seleccionada'}.`, 'warning');
    if (codigo.reglas.some(regla => regla.valorContado === '' && regla.valorCredito === '')) {
      return void Swal.fire('Valor requerido', 'Cada servicio seleccionado debe tener un valor al contado, al crédito o ambos.', 'warning');
    }
    try {
      if (codigoEditando) await faregasDescuentosAdminApi.actualizarCodigo(codigoEditando, codigo);
      else await faregasDescuentosAdminApi.crearCodigo(detalle.descuento.id, codigo);
      await abrirCodigos(detalle.descuento.id, 'LISTADO');
    }
    catch (e: unknown) { Swal.fire('No se pudo crear', e instanceof Error ? e.message : 'Error inesperado.', 'error'); }
  };
  const editarCodigo = (item: CodigoCliente) => {
    const reglas = (item.reglas || []).map(regla => ({
      plantaKey: String(regla.plantaKey),
      servicioId: Number(regla.servicioId),
      tipoCalculo: regla.tipoCalculo,
      valorContado: regla.valorContado ?? '',
      valorCredito: regla.valorCredito ?? '',
    }));
    setCodigoEditando(item.id);
    setCodigo({ codigo: item.codigo, placa: item.placa || '', fechaInicio: item.fecha_inicio?.slice(0, 10) || '',
      fechaFin: item.fecha_fin?.slice(0, 10) || '', maxUsos: item.max_usos, reglas });
    setSedesSeleccionadas([...new Set(reglas.map(regla => regla.plantaKey))]);
    setCodigoTab('CONFIGURAR');
  };

  const codigosFiltrados = useMemo(() => {
    const termino = buscarCodigo.trim().toUpperCase();
    if (!detalle || !termino) return detalle?.codigos || [];
    return detalle.codigos.filter(item => item.codigo.toUpperCase().includes(termino)
      || String(item.placa || '').toUpperCase().includes(termino));
  }, [buscarCodigo, detalle]);

  return (
    <div className="space-y-4 pb-8 descuentos-admin">
      <style>{`.descuentos-admin .input{height:2.5rem;width:100%;border:1px solid #cbd5e1;border-radius:.5rem;padding:0 .75rem;font-size:.75rem;background:white;outline:none}.descuentos-admin .input:focus{border-color:#052A79;box-shadow:0 0 0 2px rgba(5,42,121,.08)}`}</style>
      
      {/* Header */}
      <div className="flex justify-between items-start flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Descuentos y Alianzas</h1>
          <p className="text-sm text-gray-500">
            Campañas, códigos, vigencias y servicios aplicables.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            type="text"
            placeholder="Buscar por nombre o empresa..."
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79] md:col-span-2"
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
          />
          <select 
            value={estado} 
            onChange={e => setEstado(e.target.value)} 
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79] md:col-span-1"
          >
            <option value="TODOS">Todos</option>
            <option value="ACTIVOS">Activos</option>
            <option value="INACTIVOS">Inactivos</option>
            <option value="VENCIDOS">Vencidos</option>
          </select>
          <div className="flex gap-2 md:col-span-1">
            <button className="rounded-lg bg-[#052A79] px-6 py-2 text-sm font-semibold text-white w-full md:w-auto">
              Buscar
            </button>
            <button
              onClick={() => { setBuscar(''); setEstado('TODOS'); }}
              className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 w-full md:w-auto"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>



      {/* Table Area */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white">
          <h2 className="font-semibold text-gray-800">Descuentos registrados</h2>
          <button
            onClick={abrirNuevo}
            className="rounded-md bg-[#052A79] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-900 flex items-center gap-2"
          >
            + Crear Descuento
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Nombre del descuento</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Vigencia</th><th className="px-4 py-3">Códigos y reglas</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead>
          <tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan={7} className="p-12 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr> : lista.length === 0 ? <tr><td colSpan={7} className="p-12 text-center text-slate-400">No hay descuentos registrados.</td></tr> : lista.map(d => <tr key={d.id} className="hover:bg-gray-50"><td className="px-4 py-3"><b className="text-[#052a79]">{d.nombre}</b></td><td className="px-4 py-3">{d.tipo}</td><td className="px-4 py-3">{d.empresa_aliada_nombre || '-'}</td><td className="px-4 py-3">{fecha(d.fecha_inicio)} – {fecha(d.fecha_fin)}</td><td className="px-4 py-3"><button onClick={() => abrirCodigos(d.id)} className={`rounded-md px-2 py-1 font-bold text-xs ${Number(d.total_codigos) > 0 ? 'bg-blue-50 text-[#052a79]' : 'bg-amber-100 text-amber-800'}`}>{Number(d.total_codigos) > 0 ? `${d.total_codigos} códigos` : 'Vincular código'}</button><div className="mt-1 text-slate-400 text-xs">{d.total_servicios} servicios · {d.usos_realizados} usos</div></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 font-bold text-xs ${d.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{d.activo ? 'ACTIVO' : 'INACTIVO'}</span></td><td className="px-4 py-3"><div className="flex items-center gap-3"><button onClick={() => abrirEditar(d.id)} className="flex items-center gap-1 font-bold text-[#052a79]"><Edit2 className="h-4 w-4" /> Editar</button><button onClick={() => abrirCodigos(d.id)} className="rounded-md bg-[#052a79] px-2 py-1 font-bold text-white">Códigos</button><button onClick={async()=>{await faregasDescuentosAdminApi.cambiarEstado(d.id,!d.activo);await cargar();}} className={d.activo?'font-bold text-red-600':'font-bold text-green-700'}>{d.activo?'Desactivar':'Activar'}</button></div></td></tr>)}</tbody>
        </table>
      </div>
    </div>

    {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white"><div className="flex items-center justify-between border-b px-6 py-4"><h2 className="text-lg font-black">{editando?'Editar descuento':'Crear descuento'}</h2><button onClick={()=>setShowForm(false)}><X /></button></div><div className="grid gap-4 p-6 md:grid-cols-2">
      <Campo titulo="Tipo de descuento"><select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value,empresaAliadaNombre:e.target.value==='ALIANZA'?form.empresaAliadaNombre:'',empresaAliadaRuc:e.target.value==='ALIANZA'?form.empresaAliadaRuc:''})} className="input"><option value="CUPON">Campaña / cupón</option><option value="ALIANZA">Alianza / convenio</option><option value="PLACA">Beneficio por placa</option></select></Campo><Campo titulo="Nombre del descuento"><input placeholder="Nombre del descuento" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} className="input" /></Campo>
      <Campo titulo="Inicio de vigencia"><input type="date" value={form.fechaInicio} onChange={e=>setForm({...form,fechaInicio:e.target.value})} className="input" /></Campo><Campo titulo="Fin de vigencia"><input type="date" value={form.fechaFin} onChange={e=>setForm({...form,fechaFin:e.target.value})} className="input" /></Campo>
      {form.tipo === 'ALIANZA' && <><Campo titulo="Empresa aliada"><input value={form.empresaAliadaNombre} onChange={e=>setForm({...form,empresaAliadaNombre:e.target.value})} className="input" /></Campo><Campo titulo="RUC aliado"><input value={form.empresaAliadaRuc} maxLength={11} onChange={e=>setForm({...form,empresaAliadaRuc:e.target.value.replace(/\D/g,'')})} className="input" /></Campo></>}
    </div><div className="flex justify-end gap-2 border-t p-4"><button onClick={()=>setShowForm(false)} className="rounded-lg border px-5 py-2 text-xs font-bold">Cancelar</button><button onClick={guardar} className="rounded-lg bg-[#052a79] px-5 py-2 text-xs font-black text-white">{editando?'Guardar cambios':'Crear descuento'}</button></div></div></div>}

    {detalle && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b px-6 py-4"><div><h2 className="text-lg font-black">Gestionar códigos — {detalle.descuento.nombre}</h2><p className="text-xs text-slate-500">{detalle.descuento.tipo === 'PLACA' ? 'Cada código queda vinculado a una placa, además de su vigencia y número de usos.' : 'Configura las reglas y consulta los códigos disponibles para Nuevo Certificado.'}</p></div><button onClick={()=>setDetalle(null)}><X /></button></div>
        <nav className="flex gap-6 border-b px-6 text-xs font-bold text-slate-500">
          <button type="button" onClick={()=>setCodigoTab('CONFIGURAR')} className={`border-b-2 px-1 py-3 ${codigoTab==='CONFIGURAR'?'border-[#052a79] text-[#052a79]':'border-transparent'}`}>{codigoEditando ? 'Editar código' : 'Configurar código'}</button>
          <button type="button" onClick={()=>setCodigoTab('LISTADO')} className={`border-b-2 px-1 py-3 ${codigoTab==='LISTADO'?'border-[#052a79] text-[#052a79]':'border-transparent'}`}>Códigos ({detalle.codigos.length})</button>
        </nav>
        {codigoTab === 'CONFIGURAR' && <>
        <div className="mx-4 mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
          La sede, los servicios y los importes se configuran por cada código. <b>FLAT</b> representa el precio final; <b>MONTO</b> resta soles y <b>PORCENTAJE</b> resta un porcentaje.
        </div>
        <div className="grid gap-3 bg-slate-50 p-4 md:grid-cols-4">
          <Campo titulo="Código de aplicación"><input placeholder="Ej. ALIANZA2026" value={codigo.codigo} onChange={e=>setCodigo({...codigo,codigo:e.target.value.toUpperCase()})} className="input"/></Campo>
          {detalle.descuento.tipo === 'PLACA' && <Campo titulo="Placa obligatoria"><input placeholder="Ej. ABC123" value={codigo.placa} onChange={e=>setCodigo({...codigo,placa:e.target.value.toUpperCase()})} className="input"/></Campo>}
          <Campo titulo="Válido desde (opcional)"><input type="date" value={codigo.fechaInicio} onChange={e=>setCodigo({...codigo,fechaInicio:e.target.value})} className="input"/></Campo>
          <Campo titulo="Válido hasta (opcional)"><input type="date" value={codigo.fechaFin} onChange={e=>setCodigo({...codigo,fechaFin:e.target.value})} className="input"/></Campo>
          <Campo titulo="Veces que este código podrá usarse"><input type="number" min="1" value={codigo.maxUsos} onChange={e=>setCodigo({...codigo,maxUsos:Number(e.target.value)})} className="input"/></Campo>

          <section className="md:col-span-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><b className="text-xs">SEDES DONDE APLICA</b><p className="mt-1 text-xs text-slate-500">Selecciona las sedes explícitamente. Los servicios disponibles se obtienen de la tarifa activa de cada sede.</p></div>
              <div className="flex gap-2">
                <button type="button" onClick={()=>setSedesSeleccionadas(plantas.filter(planta=>serviciosPorPlanta.some(servicio=>servicio.planta_key===String(planta.key))).map(planta=>String(planta.key)))} className="rounded-md bg-blue-50 px-3 py-2 text-xs font-bold text-[#052a79]">Seleccionar todas</button>
                <button type="button" onClick={()=>{setSedesSeleccionadas([]);setCodigo(actual=>({...actual,reglas:[]}));}} className="rounded-md border px-3 py-2 text-xs font-bold text-slate-600">Limpiar</button>
              </div>
            </div>
            <div className="mt-3 grid max-h-40 gap-2 overflow-y-auto md:grid-cols-3">
              {plantas.map(planta => {
                const key = String(planta.key);
                const seleccionada = sedesSeleccionadas.includes(key);
                const disponibles = serviciosPorPlanta.filter(servicio => servicio.planta_key === key).length;
                return <label key={key} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs ${disponibles ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${seleccionada ? 'border-[#052a79] bg-blue-50 text-[#052a79]' : 'border-slate-200'}`}>
                  <input type="checkbox" disabled={!disponibles} checked={seleccionada} onChange={e=>alternarSede(key,e.target.checked)} />
                  <MapPin className="h-4 w-4"/><span className="flex-1 font-bold">{planta.nombre}</span><span className="text-slate-400">{disponibles}</span>
                </label>;
              })}
            </div>
          </section>

          <section className="space-y-4 md:col-span-4">
            {sedesSeleccionadas.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Selecciona una o más sedes para configurar sus servicios y valores.</div>}
            {sedesSeleccionadas.map(plantaKey => {
              const disponibles = serviciosPorPlanta.filter(servicio => servicio.planta_key === plantaKey);
              return <div key={plantaKey} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <header className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#052a79]"/><b className="text-sm text-[#052a79]">{plantasPorKey.get(plantaKey)}</b></div>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">{codigo.reglas.filter(regla=>regla.plantaKey===plantaKey).length} seleccionados</span>
                </header>
                {disponibles.length === 0 ? <p className="p-5 text-sm text-amber-700">Esta sede no tiene servicios de certificación con tarifa activa.</p> : <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-xs">
                    <thead className="bg-white text-slate-500"><tr><th className="px-4 py-3">Servicio</th><th className="px-3 py-3">Tarifa sede</th><th className="px-3 py-3">Tipo</th><th className="px-3 py-3">Contado</th><th className="px-3 py-3">Crédito</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{disponibles.map(servicio => {
                      const servicioId = Number(servicio.id);
                      const regla = codigo.reglas.find(item => item.plantaKey === plantaKey && item.servicioId === servicioId);
                      return <tr key={servicioId} className={regla ? 'bg-blue-50/50' : 'bg-white'}>
                        <td className="px-4 py-3"><label className="flex min-w-0 cursor-pointer items-center gap-3">
                            <input type="checkbox" checked={Boolean(regla)} onChange={e=>alternarServicio(plantaKey,servicioId,e.target.checked)} />
                            <span className="min-w-0"><b>{servicio.codigo} — {servicio.nombre}</b><span className="mt-1 block text-slate-400">{servicio.categoria}</span></span>
                          </label></td>
                        <td className="px-3 py-3 font-bold text-[#052a79]">S/ {Number(servicio.precio).toFixed(2)}</td>
                        <td className="px-3 py-3">{regla ? <select aria-label={`Tipo de cálculo para ${servicio.nombre}`} value={regla.tipoCalculo} onChange={e=>actualizarRegla(plantaKey,servicioId,{tipoCalculo:e.target.value as TipoCalculo})} className="input"><option value="FLAT">FLAT</option><option value="MONTO">MONTO</option><option value="PORCENTAJE">PORCENTAJE</option></select> : <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-3">{regla ? <input aria-label={tituloValor(regla.tipoCalculo,'contado')} type="number" min="0.01" max={regla.tipoCalculo==='PORCENTAJE'?100:undefined} step="0.01" value={regla.valorContado} onChange={e=>actualizarRegla(plantaKey,servicioId,{valorContado:e.target.value})} placeholder={tituloValor(regla.tipoCalculo,'contado')} className="input"/> : <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-3">{regla ? <input aria-label={tituloValor(regla.tipoCalculo,'crédito')} type="number" min="0.01" max={regla.tipoCalculo==='PORCENTAJE'?100:undefined} step="0.01" value={regla.valorCredito} onChange={e=>actualizarRegla(plantaKey,servicioId,{valorCredito:e.target.value})} placeholder={tituloValor(regla.tipoCalculo,'crédito')} className="input"/> : <span className="text-slate-300">—</span>}</td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>}
              </div>;
            })}
          </section>
          <div className="flex items-end justify-end gap-2 md:col-span-4">
            {codigoEditando && <button onClick={()=>{setCodigoEditando(null);setCodigo(nuevoCodigo());setSedesSeleccionadas([]);setCodigoTab('LISTADO');}} className="h-10 rounded-lg border px-5 text-xs font-bold">CANCELAR EDICIÓN</button>}
            <button onClick={agregarCodigo} className="h-10 rounded-lg bg-[#052a79] px-6 text-xs font-black text-white">{codigoEditando ? 'GUARDAR CAMBIOS' : 'VINCULAR CÓDIGO'}</button>
          </div>
        </div>
        </>}
        {codigoTab === 'LISTADO' && <div className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input value={buscarCodigo} onChange={e=>setBuscarCodigo(e.target.value)} placeholder="Buscar código o placa..." className="input min-w-64 flex-1"/>
            <button type="button" onClick={()=>{setCodigo(nuevoCodigo());setCodigoEditando(null);setSedesSeleccionadas([]);setCodigoTab('CONFIGURAR');}} className="h-10 rounded-lg bg-[#052a79] px-5 text-xs font-black text-white">+ NUEVO CÓDIGO</button>
          </div>
          <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-3">Código</th><th>Sedes</th><th>Reglas sede–servicio</th>{detalle.descuento.tipo === 'PLACA' && <th>Placa</th>}<th>Vigencia</th><th>Usos</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{codigosFiltrados.length === 0 ? <tr><td colSpan={detalle.descuento.tipo === 'PLACA' ? 8 : 7} className="p-8 text-center font-semibold text-amber-700">{detalle.codigos.length ? 'No se encontraron códigos con ese criterio.' : 'Esta campaña todavía no puede utilizarse en Nuevo Certificado porque no tiene códigos vinculados.'}</td></tr> : codigosFiltrados.map(c=>{const sedes=[...new Set((c.reglas||[]).map(regla=>regla.plantaKey))];return <tr key={c.id} className="border-t"><td className="p-3 font-black text-[#052a79]">{c.codigo}</td><td>{sedes.length}</td><td>{(c.reglas||[]).length}</td>{detalle.descuento.tipo === 'PLACA' && <td>{c.placa||'Sin placa'}</td>}<td>{c.fecha_inicio?`${fecha(c.fecha_inicio)} – ${fecha(c.fecha_fin)}`:'Campaña'}</td><td>{c.usos_realizados} de {c.max_usos}</td><td><span className={`rounded-full px-2 py-1 font-bold ${c.activo?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{c.activo?'ACTIVO':'INACTIVO'}</span></td><td><div className="flex gap-3"><button onClick={()=>editarCodigo(c)} className="font-bold text-[#052a79]">Editar</button><button onClick={async()=>{await faregasDescuentosAdminApi.cambiarEstadoCodigo(c.id,!c.activo);await abrirCodigos(detalle.descuento.id,'LISTADO');}} className={c.activo?'font-bold text-red-600':'font-bold text-green-700'}>{c.activo?'Desactivar':'Activar'}</button></div></td></tr>;})}</tbody></table></div>
        </div>}
      </div>
    </div>}
  </div>);
}

function Campo({ titulo, children }: { titulo: string; children: ReactNode }) { return <label className="text-xs font-bold">{titulo.toUpperCase()}<div className="mt-1">{children}</div></label>; }
