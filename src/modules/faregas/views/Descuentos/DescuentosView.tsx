import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Edit, Power, PowerOff, Loader2, Trash2, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { faregasDescuentosAdminApi, type DescuentoAdmin, type DescuentoFormData, type ImpactoDescuento, type TipoCampana } from '../../services/faregas-descuentos.api';
import { DescuentoAlcanceStep } from './components/DescuentoAlcanceStep';
import { DescuentoCodigosStep } from './components/DescuentoCodigosStep';
import { CodigosListadoModal } from './components/CodigosListadoModal';
import {
  aplicarBeneficioGeneral,
  beneficioInicial,
  claveLogicaDeRegla,
  claveRegla,
  construirReglasValidas,
  esDisponibilidadValida,
  obtenerBeneficio,
  reconstruirPaso2,
  type BeneficioDescuento,
  type ReglaDescuento,
  type ServicioPorPlanta,
} from './descuentos-wizard.utils';

type Maestro = { id?: number; key?: string; codigo?: string; nombre: string; categoria?: string };
type Ejecutivo = { id: number; username?: string; nombre: string };
type Detalle = { descuento: DescuentoAdmin; reglas: ReglaDescuento[] };
const hoy = () => new Date().toISOString().slice(0, 10);
const proximoMes = () => { const f = new Date(); f.setMonth(f.getMonth() + 1); return f.toISOString().slice(0, 10); };
const nuevoForm = (): DescuentoFormData => ({ nombre: '', tipo: 'CAMPANA', empresaAliadaRuc: '', empresaAliadaNombre: '', ejecutivo: '', fechaInicio: hoy(), fechaFin: proximoMes() });
const formDesdeDescuento = (descuento: DescuentoAdmin): DescuentoFormData => ({
  nombre: descuento.nombre,
  tipo: descuento.tipo,
  empresaAliadaRuc: descuento.empresa_aliada_ruc || '',
  empresaAliadaNombre: descuento.empresa_aliada_nombre || '',
  ejecutivo: descuento.ejecutivo || '',
  fechaInicio: descuento.fecha_inicio.slice(0, 10),
  fechaFin: descuento.fecha_fin.slice(0, 10),
});
const fecha = (v?: string) => v ? new Date(v).toLocaleDateString('es-PE') : '-';
const escaparHtml = (value: string) => value.replace(/[&<>'"]/g, (caracter) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[caracter] || caracter));

const renderImpactoDescuento = (impacto: ImpactoDescuento) => {
  const lista = (items: string[], vacio: string) => items.length > 0
    ? `<ul class="text-left text-xs leading-5">${items.map((item) => `<li>• ${escaparHtml(item)}</li>`).join('')}</ul>`
    : `<p class="text-left text-xs text-slate-500">${escaparHtml(vacio)}</p>`;
  const bloqueos = impacto.bloqueos || [];
  return `<div class="space-y-3 text-left">
    ${bloqueos.length > 0
      ? `<p class="rounded-lg border border-red-300 bg-red-100 p-3 text-xs font-bold text-red-900">No se puede eliminar: ${escaparHtml(bloqueos.map((b) => b.detalle).join(' '))}</p>`
      : `<p class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">ELIMINAR CAMPAÑA / DESCUENTO &mdash; ${escaparHtml(impacto.descuento.nombre)}<br/>También se eliminarán (ambiente ${escaparHtml(impacto.ambiente)}): ${impacto.codigos.length} código(s), ${impacto.configuraciones.length} configuración(es) y ${impacto.usos.length} uso(s) de prueba.</p>`}
    <div><p class="mb-1 text-sm font-bold">Códigos (${impacto.codigos.length})</p>${lista(impacto.codigos.map((c) => `#${c.id} · ${c.codigo} · ${c.usos_realizados}/${c.max_usos} uso(s)`), 'Sin códigos propios.')}</div>
    <div><p class="mb-1 text-sm font-bold">Configuraciones de servicios y alcances (${impacto.configuraciones.length})</p>${lista(impacto.configuraciones.map((r) => `#${r.id} · sede ${r.planta_key || 'todas'} · ${r.tipo_calculo || 'sin cálculo'}${r.servicio_codigo ? ` · servicio ${r.servicio_codigo}` : ''}`), 'Sin configuraciones.')}</div>
    <div><p class="mb-1 text-sm font-bold">Usos de prueba (${impacto.usos.length})</p>${lista(impacto.usos.map((u) => `#${u.id} · certificado ${u.certificado_id ?? '-'} · ${u.estado || 'sin estado'}`), 'Sin usos registrados.')}</div>
    <p class="text-xs text-slate-500">Los servicios, empresas, certificados, comprobantes, órdenes de pago y operaciones se conservarán. Esta acción no se puede deshacer.</p>
  </div>`;
};

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
  const [reglas, setReglas] = useState<ReglaDescuento[]>([]);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([]);
  const [beneficioGeneral, setBeneficioGeneral] = useState<BeneficioDescuento>(beneficioInicial());
  const [excepciones, setExcepciones] = useState<Set<string>>(new Set());
  const [mostrarExcepciones, setMostrarExcepciones] = useState(false);
  const [sedesSeleccionadas, setSedesSeleccionadas] = useState<string[]>([]);
  const [codigoTab, setCodigoTab] = useState<'DATOS' | 'CONFIGURAR' | 'LISTADO'>('CONFIGURAR');
  const [totalCodigosDetalle, setTotalCodigosDetalle] = useState(0);
  const [campanaCodigos, setCampanaCodigos] = useState<DescuentoAdmin | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const eliminarDescuento = async (d: DescuentoAdmin) => {
    setEliminandoId(d.id);
    try {
      const impacto = await faregasDescuentosAdminApi.obtenerImpacto(d.id);
      const bloqueos = impacto.bloqueos || [];
      const confirmacion = await Swal.fire({
        title: bloqueos.length > 0 ? 'ELIMINACIÓN BLOQUEADA' : 'ELIMINAR CAMPAÑA / DESCUENTO',
        html: renderImpactoDescuento(impacto),
        icon: bloqueos.length > 0 ? 'error' : 'warning',
        showCancelButton: bloqueos.length === 0,
        showConfirmButton: true,
        confirmButtonText: bloqueos.length > 0 ? 'ENTENDIDO' : 'ELIMINAR TODO',
        cancelButtonText: 'CANCELAR',
        confirmButtonColor: bloqueos.length > 0 ? '#64748b' : '#dc2626',
        cancelButtonColor: '#64748b',
        reverseButtons: true,
        focusCancel: true,
        width: '42rem'
      });
      if (bloqueos.length > 0) return;
      if (!confirmacion.isConfirmed) return;

      const resultado = await faregasDescuentosAdminApi.eliminar(d.id);
      if (detalle?.descuento.id === d.id) setDetalle(null);
      await cargar();
      const partes = [`La campaña "${resultado.nombre}" fue eliminada.`];
      if (resultado.codigosEliminados > 0) partes.push(`${resultado.codigosEliminados} código(s) y ${resultado.configuracionesEliminadas} configuración(es) se eliminaron.`);
      if (resultado.usosEliminados > 0) partes.push(`${resultado.usosEliminados} uso(s) de prueba se eliminaron.`);
      if (resultado.serviciosPreservados > 0) partes.push(`${resultado.serviciosPreservados} servicio(s) del catálogo se conservaron; sólo se quitó la relación con la campaña.`);
      await Swal.fire({ title: 'Campaña eliminada', text: partes.join(' '), icon: 'success', confirmButtonText: 'OK' });
    } catch (error) {
      await Swal.fire({ title: 'No se pudo eliminar', text: error instanceof Error ? error.message : 'No se eliminó nada.', icon: 'error', confirmButtonText: 'CERRAR' });
    } finally {
      setEliminandoId(null);
    }
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([faregasDescuentosAdminApi.listar(buscar, estado), faregasDescuentosAdminApi.maestros()]);
      setLista(r.descuentos || []); setPlantas(m.plantas || []); setServiciosPorPlanta(m.serviciosPorPlanta || []); setEjecutivos(m.ejecutivos || []);
    } catch (e: unknown) { Swal.fire('No se pudo cargar', e instanceof Error ? e.message : 'Error inesperado.', 'error'); }
    finally { setLoading(false); }
  }, [buscar, estado]);
  useEffect(() => { void cargar(); }, [cargar]);

  const abrirNuevo = () => { setEditando(null); setForm(nuevoForm()); setShowForm(true); };
  const guardar = async (continuar = false) => {
    if (!form.nombre) return void Swal.fire('Complete el formulario', 'El nombre del descuento es obligatorio.', 'warning');
    const payload = { ...form };
    try {
      if (editando) {
        await faregasDescuentosAdminApi.actualizar(editando, payload);
        await cargar();
        await abrirCodigos(editando, continuar ? 'CONFIGURAR' : 'DATOS');
        await Swal.fire('Datos actualizados', 'Los datos generales de la campaña fueron guardados.', 'success');
      } else {
        const creado = await faregasDescuentosAdminApi.crear(payload) as { id: number };
        await cargar();
        await abrirCodigos(creado.id, 'CONFIGURAR');
        setShowForm(false);
        await Swal.fire('Campaña creada', 'Paso 1 completado. Ahora configura las sedes, los servicios y el beneficio económico.', 'info');
      }
    }
    catch (e: unknown) { Swal.fire('No se pudo guardar', e instanceof Error ? e.message : 'Error inesperado.', 'error'); }
  };
  const abrirCodigos = async (id: number, tab?: 'DATOS' | 'CONFIGURAR' | 'LISTADO') => {
    try {
      const [respuesta, paginaCodigos] = await Promise.all([
        faregasDescuentosAdminApi.detalle(id) as Promise<Detalle>,
        faregasDescuentosAdminApi.listarCodigos(id, { limit: 1, offset: 0 }),
      ]);
      setDetalle(respuesta);
      setEditando(id);
      setForm(formDesdeDescuento(respuesta.descuento));
      setTotalCodigosDetalle(paginaCodigos.total);
      const reglasNormalizadas = (respuesta.reglas || []).map(regla => ({
        plantaKey: String(regla.plantaKey), servicioId: Number(regla.servicioId), tipoCalculo: regla.tipoCalculo,
        valor: regla.valor ?? '', valorContado: regla.valorContado ?? '', valorCredito: regla.valorCredito ?? '',
      }));
      const reconstruccion = reconstruirPaso2(reglasNormalizadas, serviciosPorPlanta);
      setReglas(reglasNormalizadas);
      setSedesSeleccionadas(reconstruccion.sedes);
      setServiciosSeleccionados(reconstruccion.servicios);
      setBeneficioGeneral(reconstruccion.beneficio);
      setExcepciones(new Set(reconstruccion.excepciones));
      setMostrarExcepciones(reconstruccion.modoPersonalizado);
      setCodigoTab(tab || (paginaCodigos.total ? 'LISTADO' : 'CONFIGURAR'));
    }
    catch (e: unknown) { Swal.fire('Error', e instanceof Error ? e.message : 'No se pudieron cargar los códigos.', 'error'); }
  };
  const alternarSede = (plantaKey: string, seleccionada: boolean) => {
    const siguientes = seleccionada
      ? (sedesSeleccionadas.includes(plantaKey) ? sedesSeleccionadas : [...sedesSeleccionadas, plantaKey])
      : sedesSeleccionadas.filter(key => key !== plantaKey);
    const excepcionesVigentes = new Set([...excepciones].filter(clave => siguientes.includes(clave.split(':')[0])));
    setSedesSeleccionadas(siguientes);
    setExcepciones(excepcionesVigentes);
    setReglas(construirReglasValidas({
      sedes: siguientes,
      servicios: serviciosSeleccionados,
      disponibilidad: serviciosPorPlanta,
      beneficio: beneficioGeneral,
      reglasPrevias: reglas,
      excepciones: excepcionesVigentes,
    }));
  };
  const seleccionarTodasLasSedes = () => {
    const siguientes = plantas
      .filter(planta => serviciosPorPlanta.some(servicio => String(servicio.planta_key) === String(planta.key) && esDisponibilidadValida(servicio)))
      .map(planta => String(planta.key));
    setSedesSeleccionadas(siguientes);
    setReglas(construirReglasValidas({ sedes: siguientes, servicios: serviciosSeleccionados, disponibilidad: serviciosPorPlanta, beneficio: beneficioGeneral, reglasPrevias: reglas, excepciones }));
  };
  const limpiarSedes = () => {
    setSedesSeleccionadas([]); setServiciosSeleccionados([]); setReglas([]); setExcepciones(new Set()); setMostrarExcepciones(false);
  };
  const alternarServicio = (servicioLogico: string, seleccionado: boolean) => {
    const siguientes = seleccionado
      ? (serviciosSeleccionados.includes(servicioLogico) ? serviciosSeleccionados : [...serviciosSeleccionados, servicioLogico])
      : serviciosSeleccionados.filter(key => key !== servicioLogico);
    const reglasVigentes = new Set(reglas
      .filter(regla => siguientes.includes(claveLogicaDeRegla(serviciosPorPlanta, regla.plantaKey, regla.servicioId)))
      .map(regla => claveRegla(regla.plantaKey, regla.servicioId)));
    const excepcionesVigentes = new Set([...excepciones].filter(clave => reglasVigentes.has(clave)));
    setServiciosSeleccionados(siguientes);
    setExcepciones(excepcionesVigentes);
    setReglas(construirReglasValidas({ sedes: sedesSeleccionadas, servicios: siguientes, disponibilidad: serviciosPorPlanta, beneficio: beneficioGeneral, reglasPrevias: reglas, excepciones: excepcionesVigentes }));
  };
  const actualizarBeneficioGeneral = (cambio: Partial<BeneficioDescuento>) => {
    const siguiente = { ...beneficioGeneral, ...cambio };
    setBeneficioGeneral(siguiente);
    setReglas(actual => aplicarBeneficioGeneral(actual, siguiente, excepciones));
  };
  const actualizarExcepcion = (plantaKey: string, servicioId: number, cambio: Partial<ReglaDescuento>) => {
    const clave = claveRegla(plantaKey, servicioId);
    setExcepciones(actual => new Set(actual).add(clave));
    setReglas(actual => actual.map(regla => regla.plantaKey === plantaKey && regla.servicioId === servicioId
      ? { ...regla, ...cambio }
      : regla));
  };
  const restaurarBeneficio = (plantaKey: string, servicioId: number) => {
    const clave = claveRegla(plantaKey, servicioId);
    setExcepciones(actual => { const siguiente = new Set(actual); siguiente.delete(clave); return siguiente; });
    setReglas(actual => actual.map(regla => regla.plantaKey === plantaKey && regla.servicioId === servicioId
      ? { ...regla, ...obtenerBeneficio(beneficioGeneral) }
      : regla));
  };
  const guardarReglas = async () => {
    if (!detalle) return;
    if (!sedesSeleccionadas.length || !reglas.length) return void Swal.fire('Reglas requeridas', 'Selecciona al menos una sede y un servicio.', 'warning');
    const reglaIncompleta = reglas.find(regla => regla.tipoCalculo === 'FLAT'
      ? regla.valorContado === '' && regla.valorCredito === ''
      : regla.valor === '');
    if (reglaIncompleta) return void Swal.fire('Valor requerido', 'Completa el valor de todas las reglas seleccionadas.', 'warning');
    try {
      await faregasDescuentosAdminApi.guardarReglas(detalle.descuento.id, { reglas });
      await abrirCodigos(detalle.descuento.id, 'LISTADO');
      await cargar();
      await Swal.fire('Alcance guardado', 'Paso 2 completado. Ahora crea el primer código que autorizará el uso de este beneficio.', 'success');
    } catch (e: unknown) { Swal.fire('No se pudieron guardar las reglas', e instanceof Error ? e.message : 'Error inesperado.', 'error'); }
  };
  const refrescarCodigos = async () => {
    if (!detalle) return;
    const pagina = await faregasDescuentosAdminApi.listarCodigos(detalle.descuento.id, { limit: 1, offset: 0 });
    setTotalCodigosDetalle(pagina.total);
    await cargar();
  };

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
            <thead className="bg-slate-50 text-xs capitalize text-slate-500"><tr><th className="px-4 py-3">Nombre del descuento</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Vigencia</th><th className="px-4 py-3">Alcance y códigos</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Acciones</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan={7} className="p-12 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr> : lista.length === 0 ? <tr><td colSpan={7} className="p-12 text-center text-slate-400">No hay campañas o convenios registrados.</td></tr> : lista.map(d => <tr key={d.id} className="hover:bg-gray-50"><td className="px-4 py-3"><b className="text-[#052a79]">{d.nombre}</b>{d.protegido && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">PROTEGIDO</span>}</td><td className="px-4 py-3">{d.tipo}</td><td className="px-4 py-3">{d.empresa_aliada_nombre || '-'}</td><td className="px-4 py-3">{fecha(d.fecha_inicio)} – {fecha(d.fecha_fin)}</td><td className="px-4 py-3"><div className="flex flex-col items-start gap-1.5"><b className="rounded-md bg-blue-50 px-2 py-1 text-xs text-[#052a79]">{Number(d.total_codigos).toLocaleString('es-PE')} código(s)</b><span className="text-[11px] leading-tight text-slate-500">{d.total_servicios} servicios configurados<br/>{d.usos_realizados} usos realizados</span><button type="button" onClick={() => setCampanaCodigos(d)} className="text-xs font-bold text-[#052a79] underline">Ver códigos</button></div></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 font-bold text-xs ${d.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{d.activo ? 'ACTIVO' : 'INACTIVO'}</span></td><td className="px-4 py-3"><div className="flex items-center gap-2"><button onClick={() => abrirCodigos(d.id, 'DATOS')} title="Editar y gestionar campaña" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-base text-[#052A79] hover:bg-blue-100 transition-colors"><Edit size={18} /></button>{!d.protegido && <><button onClick={async () => { await faregasDescuentosAdminApi.cambiarEstado(d.id, !d.activo); await cargar(); }} title={d.activo ? 'Desactivar' : 'Activar'} className={d.activo ? "rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-base text-[#052A79] hover:bg-red-100 transition-colors" : "rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-base text-[#052A79] hover:bg-green-100 transition-colors"}>{d.activo ? <PowerOff size={18} /> : <Power size={18} />}</button><button onClick={() => void eliminarDescuento(d)} disabled={eliminandoId === d.id} title="Eliminar" className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-base text-red-600 hover:bg-red-100 transition-colors disabled:cursor-wait disabled:opacity-50"><Trash2 size={18} /></button></>}</div></td></tr>)}</tbody>
          </table>
        </div>
      </div>

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white"><div className="flex items-center justify-between border-b px-6 py-4"><div><h2 className="text-lg font-black">Crear descuento</h2><p className="mt-1 text-xs text-slate-500">Paso 1 de 3 · Datos generales y vigencia</p></div><button onClick={() => setShowForm(false)}><X /></button></div><DatosGeneralesCampos form={form} ejecutivos={ejecutivos} onChange={setForm} mostrarAyuda /><div className="flex justify-end gap-2 border-t p-4"><button onClick={() => setShowForm(false)} className="rounded-lg border px-5 py-2 text-xs font-bold">Cancelar</button><button onClick={() => void guardar(false)} className="rounded-lg bg-[#052a79] px-5 py-2 text-xs font-black text-white">Crear y configurar</button></div></div></div>}

      {detalle && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white">
          <div className="flex items-center justify-between border-b px-6 py-4"><div><h2 className="text-lg font-black">Editar y gestionar campaña — {detalle.descuento.nombre}</h2><p className="text-xs text-slate-500">Edita los datos generales, el alcance, el beneficio y los códigos desde un único flujo.</p></div><button onClick={() => { setDetalle(null); setEditando(null); }}><X /></button></div>
          <div className="grid grid-cols-3 border-b bg-slate-50 px-6 py-3 text-xs font-bold">
            <div className="flex items-center gap-2 text-green-700"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">✓</span><span>1. Datos generales</span></div>
            <div className={`flex items-center justify-center gap-2 ${reglas.length ? 'text-green-700' : 'text-[#052a79]'}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full ${reglas.length ? 'bg-green-100' : 'bg-blue-100'}`}>{reglas.length ? '✓' : '2'}</span><span>2. Alcance y beneficio</span></div>
            <div className={`flex items-center justify-end gap-2 ${totalCodigosDetalle ? 'text-green-700' : 'text-slate-500'}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full ${totalCodigosDetalle ? 'bg-green-100' : 'bg-slate-200'}`}>{totalCodigosDetalle ? '✓' : '3'}</span><span>3. Códigos</span></div>
          </div>
          <nav className="grid grid-cols-3 border-b px-6 text-xs font-bold text-slate-500">
            <button type="button" onClick={() => setCodigoTab('DATOS')} className={`border-b-2 px-1 py-3 ${codigoTab === 'DATOS' ? 'border-[#052a79] text-[#052a79]' : 'border-transparent'}`}>Datos generales</button>
            <button type="button" onClick={() => setCodigoTab('CONFIGURAR')} className={`border-b-2 px-1 py-3 ${codigoTab === 'CONFIGURAR' ? 'border-[#052a79] text-[#052a79]' : 'border-transparent'}`}>Alcance y beneficio ({reglas.length})</button>
            <button type="button" onClick={() => setCodigoTab('LISTADO')} className={`border-b-2 px-1 py-3 ${codigoTab === 'LISTADO' ? 'border-[#052a79] text-[#052a79]' : 'border-transparent'}`}>Códigos de autorización ({totalCodigosDetalle})</button>
          </nav>

          {codigoTab === 'DATOS' && <div><DatosGeneralesCampos form={form} ejecutivos={ejecutivos} onChange={setForm} mostrarAyuda /><div className="flex flex-wrap justify-end gap-2 border-t p-4"><button type="button" onClick={() => void guardar(false)} className="rounded-lg border border-[#052a79] px-5 py-2 text-xs font-black text-[#052a79]">GUARDAR DATOS</button><button type="button" onClick={() => void guardar(true)} className="rounded-lg bg-[#052a79] px-5 py-2 text-xs font-black text-white">GUARDAR Y CONTINUAR</button></div></div>}

          {codigoTab === 'CONFIGURAR' && <DescuentoAlcanceStep
            plantas={plantas}
            serviciosPorPlanta={serviciosPorPlanta}
            sedesSeleccionadas={sedesSeleccionadas}
            serviciosSeleccionados={serviciosSeleccionados}
            reglas={reglas}
            beneficio={beneficioGeneral}
            excepciones={excepciones}
            mostrarExcepciones={mostrarExcepciones}
            onCambiarSede={alternarSede}
            onSeleccionarTodasLasSedes={seleccionarTodasLasSedes}
            onLimpiarSedes={limpiarSedes}
            onCambiarServicio={alternarServicio}
            onCambiarBeneficio={actualizarBeneficioGeneral}
            onMostrarExcepciones={setMostrarExcepciones}
            onCambiarExcepcion={actualizarExcepcion}
            onRestaurarBeneficio={restaurarBeneficio}
            onGuardar={guardarReglas}
          />}

          {codigoTab === 'LISTADO' && (reglas.length ? <DescuentoCodigosStep
              descuento={detalle.descuento}
              totalCodigos={totalCodigosDetalle}
              onCambio={refrescarCodigos}
              onVerCodigos={() => setCampanaCodigos(detalle.descuento)}
            /> : <div className="m-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-800">Primero completa y guarda el alcance y beneficio del Paso 2.</div>)}
        </div>
      </div>}
      {campanaCodigos && <CodigosListadoModal descuento={campanaCodigos} onCerrar={() => setCampanaCodigos(null)} onCambio={cargar} />}
    </div>);
}

function Campo({ titulo, children }: { titulo: string; children: ReactNode }) { return <label className="text-xs font-bold">{titulo.toUpperCase()}<div className="mt-1">{children}</div></label>; }

function DatosGeneralesCampos({
  form,
  ejecutivos,
  onChange,
  mostrarAyuda = false,
}: {
  form: DescuentoFormData;
  ejecutivos: Ejecutivo[];
  onChange: (formulario: DescuentoFormData) => void;
  mostrarAyuda?: boolean;
}) {
  const cambiarTipo = (tipo: TipoCampana) => {
    const conservaEmpresa = tipo === 'ALIANZA' || tipo === 'CONVENIO';
    onChange({
      ...form,
      tipo,
      empresaAliadaNombre: conservaEmpresa ? form.empresaAliadaNombre : '',
      empresaAliadaRuc: conservaEmpresa ? form.empresaAliadaRuc : '',
      ejecutivo: tipo === 'ALIANZA' ? form.ejecutivo : '',
    });
  };

  return <div className="grid gap-4 p-6 md:grid-cols-2">
    {mostrarAyuda && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 md:col-span-2">Aquí se registra la campaña general. Las sedes, servicios, importes y códigos se configuran en los pasos siguientes.</div>}
    <Campo titulo="Tipo de campaña"><select value={form.tipo} onChange={event => cambiarTipo(event.target.value as TipoCampana)} className="input"><option value="CAMPANA">CAMPAÑA</option><option value="ALIANZA">ALIANZA</option><option value="CONVENIO">CONVENIO</option><option value="PROMOCION">PROMOCIÓN</option></select></Campo>
    <Campo titulo="Nombre"><input placeholder="Ej. Campaña GLP Setiembre" value={form.nombre} onChange={event => onChange({ ...form, nombre: event.target.value })} className="input" /></Campo>
    <Campo titulo="Inicio de vigencia"><input type="date" value={form.fechaInicio} onChange={event => onChange({ ...form, fechaInicio: event.target.value })} className="input" /></Campo>
    <Campo titulo="Fin de vigencia"><input type="date" value={form.fechaFin} onChange={event => onChange({ ...form, fechaFin: event.target.value })} className="input" /></Campo>
    {(form.tipo === 'ALIANZA' || form.tipo === 'CONVENIO') && <>
      <Campo titulo="Empresa aliada"><input value={form.empresaAliadaNombre} onChange={event => onChange({ ...form, empresaAliadaNombre: event.target.value })} className="input" /></Campo>
      <Campo titulo="RUC aliado"><input value={form.empresaAliadaRuc} maxLength={11} onChange={event => onChange({ ...form, empresaAliadaRuc: event.target.value.replace(/\D/g, '') })} className="input" /></Campo>
    </>}
    {form.tipo === 'ALIANZA' && <Campo titulo="Ejecutivo"><input list="faregas-ejecutivos" placeholder="Nombre del colaborador" value={form.ejecutivo || ''} onChange={event => onChange({ ...form, ejecutivo: event.target.value })} className="input" /><datalist id="faregas-ejecutivos">{ejecutivos.map(item => <option key={item.id} value={item.nombre}>{item.username || ''}</option>)}</datalist></Campo>}
  </div>;
}
