/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Edit2, Loader2, MapPin, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { faregasDescuentosAdminApi, type DescuentoAdmin, type DescuentoFormData, type TipoCampana } from '../../services/faregas-descuentos.api';

type Maestro = { id?: number; key?: string; codigo?: string; nombre: string; categoria?: string };
type Ejecutivo = { id: number; username?: string; nombre: string };
type TipoCalculo = 'FLAT' | 'MONTO' | 'PORCENTAJE';
type ServicioPorPlanta = Maestro & { planta_key: string; precio: number; tarifa_codigo?: string };
type ReglaDescuento = { plantaKey: string; servicioId: number; tipoCalculo: TipoCalculo; valor: number | string; valorContado: number | string; valorCredito: number | string };
type CodigoCliente = { id: number; codigo: string; placa?: string; fecha_inicio?: string; fecha_fin?: string; max_usos: number; usos_realizados: number; activo: boolean };
type Detalle = { descuento: DescuentoAdmin; reglas: ReglaDescuento[]; codigos: CodigoCliente[] };
type CodigoForm = { codigo: string; placa: string; fechaInicio: string; fechaFin: string; maxUsos: number };
const hoy = () => new Date().toISOString().slice(0, 10);
const proximoMes = () => { const f = new Date(); f.setMonth(f.getMonth() + 1); return f.toISOString().slice(0, 10); };
const nuevoForm = (): DescuentoFormData => ({ nombre: '', tipo: 'CAMPANA', empresaAliadaRuc: '', empresaAliadaNombre: '', ejecutivo: '', fechaInicio: hoy(), fechaFin: proximoMes() });
const nuevoCodigo = (): CodigoForm => ({ codigo: '', placa: '', fechaInicio: '', fechaFin: '', maxUsos: 1 });
const fecha = (v?: string) => v ? new Date(v).toLocaleDateString('es-PE') : '-';
const tituloValor = (tipo: TipoCalculo) => tipo === 'FLAT'
  ? `Precio final (S/)`
  : tipo === 'PORCENTAJE'
    ? `Descuento (%)`
    : `Descuento (S/)`;

export function DescuentosView() {
  const [lista, setLista] = useState<DescuentoAdmin[]>([]);
  const [plantas, setPlantas] = useState<Maestro[]>([]);
  const [serviciosPorPlanta, setServiciosPorPlanta] = useState<ServicioPorPlanta[]>([]);
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<DescuentoFormData>(nuevoForm());
  const [editando, setEditando] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [codigo, setCodigo] = useState<CodigoForm>(nuevoCodigo());
  const [reglas, setReglas] = useState<ReglaDescuento[]>([]);
  const [codigoEditando, setCodigoEditando] = useState<number | null>(null);
  const [sedesSeleccionadas, setSedesSeleccionadas] = useState<string[]>([]);
  const [codigoTab, setCodigoTab] = useState<'CONFIGURAR' | 'LISTADO'>('CONFIGURAR');
  const [mostrarFormCodigo, setMostrarFormCodigo] = useState(false);
  const [buscarCodigo, setBuscarCodigo] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([faregasDescuentosAdminApi.listar(buscar, estado), faregasDescuentosAdminApi.maestros()]);
      setLista(r.descuentos || []); setPlantas(m.plantas || []); setServiciosPorPlanta(m.serviciosPorPlanta || []); setEjecutivos(m.ejecutivos || []);
    } catch (e: unknown) { Swal.fire('No se pudo cargar', e instanceof Error ? e.message : 'Error inesperado.', 'error'); }
    finally { setLoading(false); }
  }, [buscar, estado]);
  useEffect(() => { void cargar(); }, [cargar]);

  const plantasPorKey = useMemo(() => new Map(plantas.map(planta => [String(planta.key), planta.nombre])), [plantas]);
  const abrirNuevo = () => { setEditando(null); setForm(nuevoForm()); setShowForm(true); };
  const abrirEditar = async (id: number) => {
    try {
      const r = await faregasDescuentosAdminApi.detalle(id) as Detalle; const d = r.descuento;
      setEditando(id); setForm({ nombre: d.nombre, tipo: d.tipo, empresaAliadaRuc: d.empresa_aliada_ruc || '', empresaAliadaNombre: d.empresa_aliada_nombre || '', ejecutivo: d.ejecutivo || '', fechaInicio: d.fecha_inicio.slice(0, 10), fechaFin: d.fecha_fin.slice(0, 10) }); setShowForm(true);
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
        await abrirCodigos(creado.id, 'CONFIGURAR');
        await Swal.fire('Campaña creada', 'Paso 1 completado. Ahora configura las sedes, los servicios y el beneficio económico.', 'info');
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
      const reglasNormalizadas = (respuesta.reglas || []).map(regla => ({
        plantaKey: String(regla.plantaKey), servicioId: Number(regla.servicioId), tipoCalculo: regla.tipoCalculo,
        valor: regla.valor ?? '', valorContado: regla.valorContado ?? '', valorCredito: regla.valorCredito ?? '',
      }));
      setReglas(reglasNormalizadas);
      setSedesSeleccionadas([...new Set(reglasNormalizadas.map(regla => regla.plantaKey))]);
      setBuscarCodigo('');
      setCodigoTab(tab || (respuesta.codigos.length ? 'LISTADO' : 'CONFIGURAR'));
      setMostrarFormCodigo(false);
    }
    catch (e: unknown) { Swal.fire('Error', e instanceof Error ? e.message : 'No se pudieron cargar los códigos.', 'error'); }
  };
  const alternarSede = (plantaKey: string, seleccionada: boolean) => {
    if (seleccionada) {
      setSedesSeleccionadas(actual => actual.includes(plantaKey) ? actual : [...actual, plantaKey]);
      return;
    }
    setSedesSeleccionadas(actual => actual.filter(key => key !== plantaKey));
    setReglas(actual => actual.filter(regla => regla.plantaKey !== plantaKey));
  };
  const alternarServicio = (plantaKey: string, servicioId: number, seleccionado: boolean) => {
    setReglas(actual => {
      const otras = actual.filter(regla => !(regla.plantaKey === plantaKey && regla.servicioId === servicioId));
      return seleccionado
        ? [...otras, { plantaKey, servicioId, tipoCalculo: 'PORCENTAJE', valor: '', valorContado: '', valorCredito: '' }]
        : otras;
    });
  };
  const actualizarRegla = (plantaKey: string, servicioId: number, cambio: Partial<ReglaDescuento>) => {
    setReglas(actual => actual.map(regla => {
      if (regla.plantaKey !== plantaKey || regla.servicioId !== servicioId) return regla;
      const siguiente = { ...regla, ...cambio };
      if (cambio.tipoCalculo === 'FLAT') siguiente.valor = '';
      if (cambio.tipoCalculo === 'MONTO' || cambio.tipoCalculo === 'PORCENTAJE') {
        siguiente.valorContado = ''; siguiente.valorCredito = '';
      }
      return siguiente;
    }));
  };
  const guardarReglas = async () => {
    if (!detalle) return;
    if (!sedesSeleccionadas.length || !reglas.length) return void Swal.fire('Reglas requeridas', 'Selecciona al menos una sede y un servicio.', 'warning');
    const sedeSinServicios = sedesSeleccionadas.find(plantaKey => !reglas.some(regla => regla.plantaKey === plantaKey));
    if (sedeSinServicios) return void Swal.fire('Servicios requeridos', `Selecciona al menos un servicio para ${plantasPorKey.get(sedeSinServicios) || 'la sede seleccionada'}.`, 'warning');
    const reglaIncompleta = reglas.find(regla => regla.tipoCalculo === 'FLAT'
      ? regla.valorContado === '' && regla.valorCredito === ''
      : regla.valor === '');
    if (reglaIncompleta) return void Swal.fire('Valor requerido', 'Completa el valor de todas las reglas seleccionadas.', 'warning');
    try {
      await faregasDescuentosAdminApi.guardarReglas(detalle.descuento.id, { reglas });
      await abrirCodigos(detalle.descuento.id, 'LISTADO');
      setMostrarFormCodigo(true);
      await cargar();
      await Swal.fire('Alcance guardado', 'Paso 2 completado. Ahora crea el primer código que autorizará el uso de este beneficio.', 'success');
    } catch (e: unknown) { Swal.fire('No se pudieron guardar las reglas', e instanceof Error ? e.message : 'Error inesperado.', 'error'); }
  };
  const agregarCodigo = async () => {
    if (!detalle || !codigo.codigo.trim()) return;
    try {
      if (codigoEditando) await faregasDescuentosAdminApi.actualizarCodigo(codigoEditando, codigo);
      else await faregasDescuentosAdminApi.crearCodigo(detalle.descuento.id, codigo);
      await abrirCodigos(detalle.descuento.id, 'LISTADO');
    }
    catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error inesperado.';
      if (msg === 'VIGENCIA_CODIGO_FUERA_DE_CAMPANA') {
        const f_inicio = new Date(detalle.descuento.fecha_inicio).toLocaleDateString('es-PE');
        const f_fin = new Date(detalle.descuento.fecha_fin).toLocaleDateString('es-PE');
        Swal.fire('Vigencia fuera de rango', `Las fechas de este código deben estar dentro del rango de la campaña principal:\nDel ${f_inicio} al ${f_fin}`, 'error');
      } else {
        Swal.fire('No se pudo guardar', msg, 'error');
      }
    }
  };
  const editarCodigo = (item: CodigoCliente) => {
    setCodigoEditando(item.id);
    setCodigo({
      codigo: item.codigo, placa: item.placa || '', fechaInicio: item.fecha_inicio?.slice(0, 10) || '',
      fechaFin: item.fecha_fin?.slice(0, 10) || '', maxUsos: item.max_usos,
    });
    setCodigoTab('LISTADO');
    setMostrarFormCodigo(true);
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
          <h1 className="text-xl font-bold text-gray-800">Campañas, convenios y descuentos</h1>
          <p className="text-sm text-gray-500">
            Define primero la campaña, luego su alcance económico y finalmente los códigos que autorizan su uso.
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
          <h2 className="font-semibold text-gray-800">Campañas y convenios registrados</h2>
          <button
            onClick={abrirNuevo}
            className="rounded-md bg-[#052A79] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-900 flex items-center gap-2"
          >
            + Crear Descuento
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Nombre del descuento</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Vigencia</th><th className="px-4 py-3">Alcance y códigos</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan={7} className="p-12 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr> : lista.length === 0 ? <tr><td colSpan={7} className="p-12 text-center text-slate-400">No hay campañas o convenios registrados.</td></tr> : lista.map(d => <tr key={d.id} className="hover:bg-gray-50"><td className="px-4 py-3"><b className="text-[#052a79]">{d.nombre}</b></td><td className="px-4 py-3">{d.tipo}</td><td className="px-4 py-3">{d.empresa_aliada_nombre || '-'}</td><td className="px-4 py-3">{fecha(d.fecha_inicio)} – {fecha(d.fecha_fin)}</td><td className="px-4 py-3"><div className="flex flex-col items-start gap-1.5"><button onClick={() => abrirCodigos(d.id)} className={`rounded-md px-2 py-1 font-bold text-xs ${Number(d.total_codigos) > 0 ? 'bg-blue-50 text-[#052a79]' : 'bg-amber-100 text-amber-800'}`}>{Number(d.total_codigos) > 0 ? `${d.total_codigos} códigos` : 'Completar configuración'}</button>{d.nombres_codigos && <div className="flex flex-wrap gap-1 max-w-[150px]">{d.nombres_codigos.split(',').slice(0, 3).map(c => <span key={c} className="bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 rounded px-1.5 py-0.5 uppercase">{c}</span>)}{d.nombres_codigos.split(',').length > 3 && <span className="bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 rounded px-1.5 py-0.5 uppercase">+{d.nombres_codigos.split(',').length - 3}</span>}</div>}<div className="mt-0.5 text-slate-400 text-[11px] leading-tight">{d.total_servicios} servicios configurados<br/>{d.usos_realizados} usos realizados</div></div></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 font-bold text-xs ${d.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{d.activo ? 'ACTIVO' : 'INACTIVO'}</span></td><td className="px-4 py-3"><div className="flex items-center gap-3"><button onClick={() => abrirEditar(d.id)} className="flex items-center gap-1 font-bold text-[#052a79]"><Edit2 className="h-4 w-4" /> Editar</button><button onClick={() => abrirCodigos(d.id)} className="rounded-md bg-[#052a79] px-2 py-1 font-bold text-white">Configurar</button><button onClick={async () => { await faregasDescuentosAdminApi.cambiarEstado(d.id, !d.activo); await cargar(); }} className={d.activo ? 'font-bold text-red-600' : 'font-bold text-green-700'}>{d.activo ? 'Desactivar' : 'Activar'}</button></div></td></tr>)}</tbody>
          </table>
        </div>
      </div>

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white"><div className="flex items-center justify-between border-b px-6 py-4"><div><h2 className="text-lg font-black">{editando ? 'Editar descuento' : 'Crear descuento'}</h2><p className="mt-1 text-xs text-slate-500">Paso 1 de 3 · Datos generales y vigencia</p></div><button onClick={() => setShowForm(false)}><X /></button></div><div className="grid gap-4 p-6 md:grid-cols-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 md:col-span-2">Aquí se registra la campaña general. Las sedes, servicios, importes y códigos se configurarán en los pasos siguientes.</div>
        <Campo titulo="Tipo de campaña"><select value={form.tipo} onChange={e => { const tipo = e.target.value as TipoCampana; const conservaEmpresa = tipo === 'ALIANZA' || tipo === 'CONVENIO'; setForm({ ...form, tipo, empresaAliadaNombre: conservaEmpresa ? form.empresaAliadaNombre : '', empresaAliadaRuc: conservaEmpresa ? form.empresaAliadaRuc : '', ejecutivo: tipo === 'ALIANZA' ? form.ejecutivo : '' }); }} className="input"><option value="CAMPANA">CAMPAÑA</option><option value="ALIANZA">ALIANZA</option><option value="CONVENIO">CONVENIO</option><option value="PROMOCION">PROMOCIÓN</option></select></Campo><Campo titulo="Nombre"><input placeholder="Ej. Campaña GLP Setiembre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="input" /></Campo>
        <Campo titulo="Inicio de vigencia"><input type="date" value={form.fechaInicio} onChange={e => setForm({ ...form, fechaInicio: e.target.value })} className="input" /></Campo><Campo titulo="Fin de vigencia"><input type="date" value={form.fechaFin} onChange={e => setForm({ ...form, fechaFin: e.target.value })} className="input" /></Campo>
        {(form.tipo === 'ALIANZA' || form.tipo === 'CONVENIO') && <><Campo titulo="Empresa aliada"><input value={form.empresaAliadaNombre} onChange={e => setForm({ ...form, empresaAliadaNombre: e.target.value })} className="input" /></Campo><Campo titulo="RUC aliado"><input value={form.empresaAliadaRuc} maxLength={11} onChange={e => setForm({ ...form, empresaAliadaRuc: e.target.value.replace(/\D/g, '') })} className="input" /></Campo></>}
        {form.tipo === 'ALIANZA' && <Campo titulo="Ejecutivo"><input list="faregas-ejecutivos" placeholder="Nombre del colaborador" value={form.ejecutivo || ''} onChange={e => setForm({ ...form, ejecutivo: e.target.value })} className="input" /><datalist id="faregas-ejecutivos">{ejecutivos.map(item => <option key={item.id} value={item.nombre}>{item.username || ''}</option>)}</datalist></Campo>}
      </div><div className="flex justify-end gap-2 border-t p-4"><button onClick={() => setShowForm(false)} className="rounded-lg border px-5 py-2 text-xs font-bold">Cancelar</button><button onClick={guardar} className="rounded-lg bg-[#052a79] px-5 py-2 text-xs font-black text-white">{editando ? 'Guardar cambios' : 'Crear y configurar'}</button></div></div></div>}

      {detalle && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white">
          <div className="flex items-center justify-between border-b px-6 py-4"><div><h2 className="text-lg font-black">Gestionar campaña — {detalle.descuento.nombre}</h2><p className="text-xs text-slate-500">La campaña define el beneficio; los códigos únicamente autorizan quién puede utilizarlo en Nuevo Certificado.</p></div><button onClick={() => setDetalle(null)}><X /></button></div>
          <div className="grid grid-cols-3 border-b bg-slate-50 px-6 py-3 text-xs font-bold">
            <div className="flex items-center gap-2 text-green-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">✓</span><span>1. Datos generales</span></div>
            <div className={`flex items-center justify-center gap-2 ${reglas.length ? 'text-green-700' : 'text-[#052a79]'}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full ${reglas.length ? 'bg-green-100' : 'bg-blue-100'}`}>{reglas.length ? '✓' : '2'}</span><span>2. Alcance y beneficio</span></div>
            <div className={`flex items-center justify-end gap-2 ${detalle.codigos.length ? 'text-green-700' : 'text-slate-500'}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full ${detalle.codigos.length ? 'bg-green-100' : 'bg-slate-200'}`}>{detalle.codigos.length ? '✓' : '3'}</span><span>3. Códigos</span></div>
          </div>
          <nav className="flex gap-6 border-b px-6 text-xs font-bold text-slate-500">
            <button type="button" onClick={() => setCodigoTab('CONFIGURAR')} className={`border-b-2 px-1 py-3 ${codigoTab === 'CONFIGURAR' ? 'border-[#052a79] text-[#052a79]' : 'border-transparent'}`}>Alcance y beneficio ({reglas.length})</button>
            <button type="button" onClick={() => setCodigoTab('LISTADO')} className={`border-b-2 px-1 py-3 ${codigoTab === 'LISTADO' ? 'border-[#052a79] text-[#052a79]' : 'border-transparent'}`}>Códigos de autorización ({detalle.codigos.length})</button>
          </nav>

          {codigoTab === 'CONFIGURAR' && <div className="space-y-4 bg-slate-50 p-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
              Paso 2: define una sola vez dónde aplica y cuál es el beneficio. <b>FLAT</b> establece el precio final; <b>MONTO</b> resta soles y <b>PORCENTAJE</b> descuenta un porcentaje.
            </div>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><b className="text-xs">SEDES DONDE APLICA</b><p className="mt-1 text-xs text-slate-500">Los servicios se obtienen de la tarifa activa de cada sede.</p></div><div className="flex gap-2"><button type="button" onClick={() => setSedesSeleccionadas(plantas.filter(planta => serviciosPorPlanta.some(servicio => servicio.planta_key === String(planta.key))).map(planta => String(planta.key)))} className="rounded-md bg-blue-50 px-3 py-2 text-xs font-bold text-[#052a79]">Seleccionar todas</button><button type="button" onClick={() => { setSedesSeleccionadas([]); setReglas([]); }} className="rounded-md border px-3 py-2 text-xs font-bold text-slate-600">Limpiar</button></div></div>
              <div className="mt-3 grid max-h-40 gap-2 overflow-y-auto md:grid-cols-3">{plantas.map(planta => { const key = String(planta.key); const seleccionada = sedesSeleccionadas.includes(key); const disponibles = serviciosPorPlanta.filter(servicio => servicio.planta_key === key).length; return <label key={key} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs ${disponibles ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${seleccionada ? 'border-[#052a79] bg-blue-50 text-[#052a79]' : 'border-slate-200'}`}><input type="checkbox" disabled={!disponibles} checked={seleccionada} onChange={e => alternarSede(key, e.target.checked)} /><MapPin className="h-4 w-4" /><span className="flex-1 font-bold">{planta.nombre}</span><span className="text-slate-400">{disponibles}</span></label>; })}</div>
            </section>
            {sedesSeleccionadas.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Selecciona una o más sedes para configurar sus servicios y valores.</div>}
            {sedesSeleccionadas.map(plantaKey => { const disponibles = serviciosPorPlanta.filter(servicio => servicio.planta_key === plantaKey); return <div key={plantaKey} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <header className="flex items-center justify-between border-b bg-slate-50 px-4 py-3"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#052a79]" /><b className="text-sm text-[#052a79]">{plantasPorKey.get(plantaKey)}</b></div><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">{reglas.filter(regla => regla.plantaKey === plantaKey).length} seleccionados</span></header>
              <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="text-slate-500"><tr><th className="px-4 py-3">Servicio</th><th className="px-3 py-3">Tarifa sede</th><th className="px-3 py-3">Tipo</th><th className="px-3 py-3">Valor</th></tr></thead><tbody className="divide-y divide-slate-100">{disponibles.map(servicio => { const servicioId = Number(servicio.id); const regla = reglas.find(item => item.plantaKey === plantaKey && item.servicioId === servicioId); return <tr key={servicioId} className={regla ? 'bg-blue-50/50' : ''}><td className="px-4 py-3"><label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={Boolean(regla)} onChange={e => alternarServicio(plantaKey, servicioId, e.target.checked)} /><span><b>{servicio.codigo} — {servicio.nombre}</b><small className="mt-1 block text-slate-400">{servicio.categoria}</small></span></label></td><td className="px-3 py-3 font-bold text-[#052a79]">S/ {Number(servicio.precio).toFixed(2)}</td><td className="px-3 py-3">{regla ? <select value={regla.tipoCalculo} onChange={e => actualizarRegla(plantaKey, servicioId, { tipoCalculo: e.target.value as TipoCalculo })} className="input"><option value="FLAT">FLAT — precio final</option><option value="MONTO">MONTO — resta soles</option><option value="PORCENTAJE">PORCENTAJE</option></select> : '—'}</td><td className="px-3 py-3">{!regla ? '—' : regla.tipoCalculo === 'FLAT' ? <div className="grid grid-cols-2 gap-2"><input type="number" min="0.01" step="0.01" value={regla.valorContado} onChange={e => actualizarRegla(plantaKey, servicioId, { valorContado: e.target.value })} placeholder="Precio final contado" className="input" /><input type="number" min="0.01" step="0.01" value={regla.valorCredito} onChange={e => actualizarRegla(plantaKey, servicioId, { valorCredito: e.target.value })} placeholder="Precio final crédito" className="input" /></div> : <input type="number" min="0.01" max={regla.tipoCalculo === 'PORCENTAJE' ? 100 : undefined} step="0.01" value={regla.valor} onChange={e => actualizarRegla(plantaKey, servicioId, { valor: e.target.value })} placeholder={tituloValor(regla.tipoCalculo)} className="input" />}</td></tr>; })}</tbody></table></div>
            </div>; })}
            <div className="flex justify-end border-t pt-4"><button type="button" onClick={guardarReglas} className="h-10 rounded-lg bg-green-600 px-8 text-xs font-black text-white hover:bg-green-700">GUARDAR ALCANCE Y CONTINUAR</button></div>
          </div>}

          {codigoTab === 'LISTADO' && <div className="space-y-4 p-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">Paso 3: crea uno o varios códigos de autorización. Todos heredarán automáticamente las sedes, servicios y beneficios configurados en el paso anterior.</div>
            <div className="flex flex-wrap items-center gap-3"><input value={buscarCodigo} onChange={e => setBuscarCodigo(e.target.value)} placeholder="Buscar código o placa..." className="input min-w-64 flex-1" /><button type="button" disabled={!reglas.length} onClick={() => { setCodigo(nuevoCodigo()); setCodigoEditando(null); setMostrarFormCodigo(true); }} className="h-10 rounded-lg bg-[#052a79] px-5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">+ NUEVO CÓDIGO</button></div>
            {mostrarFormCodigo && <section className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-4"><Campo titulo="Código que ingresará el cliente"><input placeholder="Ej. ALIANZA2026" value={codigo.codigo} onChange={e => setCodigo({ ...codigo, codigo: e.target.value.toUpperCase() })} className="input" /></Campo><Campo titulo="Placa (opcional)"><input placeholder="Ej. ABC123" value={codigo.placa} onChange={e => setCodigo({ ...codigo, placa: e.target.value.toUpperCase() })} className="input" /></Campo><Campo titulo="Válido desde (opcional)"><input type="date" value={codigo.fechaInicio} onChange={e => setCodigo({ ...codigo, fechaInicio: e.target.value })} className="input" /></Campo><Campo titulo="Válido hasta (opcional)"><input type="date" value={codigo.fechaFin} onChange={e => setCodigo({ ...codigo, fechaFin: e.target.value })} className="input" /></Campo><Campo titulo="Cantidad máxima de usos"><input type="number" min="1" value={codigo.maxUsos} onChange={e => setCodigo({ ...codigo, maxUsos: Number(e.target.value) })} className="input" /></Campo><div className="flex items-end gap-2 md:col-span-4"><button type="button" onClick={() => { setMostrarFormCodigo(false); setCodigoEditando(null); setCodigo(nuevoCodigo()); }} className="h-10 rounded-lg border bg-white px-5 text-xs font-bold">Cancelar</button><button type="button" onClick={agregarCodigo} className="h-10 rounded-lg bg-green-600 px-6 text-xs font-black text-white">{codigoEditando ? 'GUARDAR CÓDIGO' : 'CREAR CÓDIGO'}</button></div></section>}
            {!reglas.length && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800">Primero completa y guarda el alcance y beneficio. Sin esa configuración no se pueden crear códigos.</div>}
            <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-3">Código</th><th>Placa</th><th>Vigencia</th><th>Usos</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{codigosFiltrados.length === 0 ? <tr><td colSpan={6} className="p-8 text-center font-semibold text-amber-700">{detalle.codigos.length ? 'No se encontraron códigos con ese criterio.' : 'Todavía no hay códigos de autorización vinculados a esta campaña.'}</td></tr> : codigosFiltrados.map(c => <tr key={c.id} className="border-t"><td className="p-3 font-black text-[#052a79]">{c.codigo}</td><td>{c.placa || 'Sin restricción'}</td><td>{c.fecha_inicio ? `${fecha(c.fecha_inicio)} – ${fecha(c.fecha_fin)}` : 'Vigencia de la campaña'}</td><td>{c.usos_realizados} de {c.max_usos}</td><td><span className={`rounded-full px-2 py-1 font-bold ${c.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.activo ? 'ACTIVO' : 'INACTIVO'}</span></td><td><div className="flex gap-3"><button onClick={() => editarCodigo(c)} className="font-bold text-[#052a79]">Editar</button><button onClick={async () => { await faregasDescuentosAdminApi.cambiarEstadoCodigo(c.id, !c.activo); await abrirCodigos(detalle.descuento.id, 'LISTADO'); }} className={c.activo ? 'font-bold text-red-600' : 'font-bold text-green-700'}>{c.activo ? 'Desactivar' : 'Activar'}</button></div></td></tr>)}</tbody></table></div>
          </div>}
        </div>
      </div>}
    </div>);
}

function Campo({ titulo, children }: { titulo: string; children: ReactNode }) { return <label className="text-xs font-bold">{titulo.toUpperCase()}<div className="mt-1">{children}</div></label>; }
