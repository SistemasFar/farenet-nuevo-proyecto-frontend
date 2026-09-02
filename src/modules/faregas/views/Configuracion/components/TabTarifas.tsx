import { useEffect, useMemo, useState } from 'react';
import {
  faregasTarifasAdminApi,
  type ProductoTarifa,
  type ServicioDisponible,
  type TarifaAdmin,
  type TarifaSede
} from '../../../services/faregas-tarifas-admin.api';
import { exportarExcel } from '../../../utils/exportar-excel';
import CatalogoFiscalImportModal from './CatalogoFiscalImportModal';

type ModalState = { modo: 'CREAR' | 'EDITAR'; tarifa?: TarifaAdmin } | null;

const getTarifaStatus = (tarifa: TarifaAdmin) => {
  if (!tarifa.producto_facturacion_id) return 'INCOMPLETA';
  if (
    tarifa.producto_activo === false ||
    tarifa.producto_es_para_venta !== true ||
    (tarifa.servicio_tipo_flujo === 'CERTIFICACION' && (
      tarifa.producto_unidad?.trim().toUpperCase() !== 'ZZ' ||
      (Boolean(tarifa.producto_codigo_sunat?.trim()) && !/^\d{8}$/.test(tarifa.producto_codigo_sunat?.trim() || '')) ||
      tarifa.producto_afectacion_igv?.trim() !== '10'
    ))
  ) {
    return 'INVALIDA';
  }
  return 'CONFIGURADA';
};

export default function TabTarifas() {
  const [sedes, setSedes] = useState<TarifaSede[]>([]);
  const [plantaKey, setPlantaKey] = useState('');
  const [tarifas, setTarifas] = useState<TarifaAdmin[]>([]);
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estado, setEstado] = useState('');
  const [filtroEstadoTributario, setFiltroEstadoTributario] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [importModal, setImportModal] = useState(false);

  const cargarSedes = async () => {
    const data = await faregasTarifasAdminApi.listarSedes();
    setSedes(data);
    setPlantaKey((actual) => actual || data.find((s) => s.activo)?.key || data[0]?.key || '');
  };

  const cargarTarifas = async (key = plantaKey) => {
    if (!key) return;
    try { setLoading(true); setError(''); setTarifas(await faregasTarifasAdminApi.listar(key)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error al cargar tarifas'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    let cancelado = false;
    void faregasTarifasAdminApi.listarSedes()
      .then((data) => {
        if (cancelado) return;
        setSedes(data);
        setPlantaKey(data.find((s) => s.activo)?.key || data[0]?.key || '');
      })
      .catch((err) => { if (!cancelado) { setError(err instanceof Error ? err.message : 'Error al cargar sedes'); setLoading(false); } });
    return () => { cancelado = true; };
  }, []);

  useEffect(() => {
    if (!plantaKey) return;
    let cancelado = false;
    void faregasTarifasAdminApi.listar(plantaKey)
      .then((data) => { if (!cancelado) { setTarifas(data); setError(''); } })
      .catch((err) => { if (!cancelado) setError(err instanceof Error ? err.message : 'Error al cargar tarifas'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [plantaKey]);

  const categorias = useMemo(() => [...new Map(tarifas.map((t) => [t.categoria_codigo, t.categoria_nombre])).entries()], [tarifas]);
  
  const filtradas = useMemo(() => tarifas.filter((tarifa) => {
    const texto = buscar.trim().toLowerCase();
    const st = getTarifaStatus(tarifa);
    return (!texto || tarifa.servicio_codigo.toLowerCase().includes(texto) || tarifa.servicio_nombre.toLowerCase().includes(texto))
      && (!categoria || tarifa.categoria_codigo === categoria)
      && (!estado || (estado === '1' ? tarifa.activo : !tarifa.activo))
      && (!filtroEstadoTributario || filtroEstadoTributario === st);
  }), [tarifas, buscar, categoria, estado, filtroEstadoTributario]);
  
  const sede = sedes.find((item) => item.key === plantaKey);

  const stats = useMemo(() => {
    return tarifas.reduce((acc, t) => {
      acc.total++;
      const st = getTarifaStatus(t);
      if (st === 'CONFIGURADA') acc.listas++;
      else if (st === 'INCOMPLETA') acc.incompletas++;
      else if (st === 'INVALIDA') acc.invalidas++;
      return acc;
    }, { total: 0, listas: 0, incompletas: 0, invalidas: 0 });
  }, [tarifas]);

  const refrescar = async () => { await Promise.all([cargarTarifas(), cargarSedes()]); };
  const cambiarEstado = async (tarifa: TarifaAdmin) => {
    if (!confirm(`¿Deseas ${tarifa.activo ? 'desactivar' : 'activar'} ${tarifa.servicio_nombre} en ${tarifa.sede_nombre}?`)) return;
    try { await faregasTarifasAdminApi.cambiarEstado(tarifa.id, !tarifa.activo); await refrescar(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Error al cambiar estado'); }
  };

  return <div>
    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="text-xs font-bold text-slate-500 uppercase">Total de Tarifas</div>
        <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
      </div>
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
        <div className="text-xs font-bold text-green-700 uppercase">Listas para Nubefact</div>
        <div className="text-2xl font-bold text-green-800">{stats.listas}</div>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="text-xs font-bold text-amber-700 uppercase">Incompletas</div>
        <div className="text-2xl font-bold text-amber-800">{stats.incompletas}</div>
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <div className="text-xs font-bold text-red-700 uppercase">Prod. Fiscales Inválidos</div>
        <div className="text-2xl font-bold text-red-800">{stats.invalidas}</div>
      </div>
    </div>

    <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end">
      <div className="min-w-64"><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Sede</label><select value={plantaKey} onChange={(e) => { setLoading(true); setPlantaKey(e.target.value); setCategoria(''); }} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-semibold focus:border-[#052A79] focus:outline-none">{sedes.map((item) => <option key={item.key} value={item.key}>{item.nombre}{item.activo ? '' : ' (INACTIVA)'}</option>)}</select></div>
      <div className="flex-1"><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Buscar</label><input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Código o nombre de servicio" className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-[#052A79] focus:outline-none" /></div>
      <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Categoría: Todas</option>{categorias.map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}</select>
      <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Estado: Todas</option><option value="1">Activas</option><option value="0">Inactivas</option></select>
      <select value={filtroEstadoTributario} onChange={(e) => setFiltroEstadoTributario(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Tributario: Todas</option><option value="CONFIGURADA">Configuradas correctamente</option><option value="INCOMPLETA">Sin SKU asignado (Incompleta)</option><option value="INVALIDA">Producto Inválido</option></select>
      <button type="button" disabled={loading || filtradas.length === 0} onClick={() => exportarExcel(`faregas_tarifas_${plantaKey}`, 'Tarifas', [
        { key: 'tarifa_id', header: 'TARIFA_ID', width: 14 },
        { key: 'sede', header: 'SEDE', width: 24 },
        { key: 'codigo', header: 'CÓDIGO SERVICIO', width: 22 },
        { key: 'servicio', header: 'SERVICIO', width: 42 },
        { key: 'categoria', header: 'CATEGORÍA', width: 24 },
        { key: 'precio', header: 'PRECIO', width: 14 },
        { key: 'sku', header: 'SKU FACTURACIÓN', width: 22 },
        { key: 'producto', header: 'PRODUCTO FACTURACIÓN', width: 50 },
        { key: 'estado', header: 'ESTADO', width: 14 },
        { key: 'tributario', header: 'TRIBUTARIO', width: 20 }
      ], filtradas.map((tarifa) => ({
        tarifa_id: tarifa.id,
        sede: tarifa.sede_nombre,
        codigo: tarifa.servicio_codigo,
        servicio: tarifa.servicio_nombre,
        categoria: tarifa.categoria_nombre,
        precio: tarifa.precio,
        sku: tarifa.producto_sku || '',
        producto: tarifa.producto_descripcion || '',
        estado: tarifa.activo ? 'ACTIVA' : 'INACTIVA',
        tributario: getTarifaStatus(tarifa)
      })))} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">↓ EXPORTAR EXCEL</button>
      <button type="button" onClick={() => setImportModal(true)} className="rounded-lg border border-[#052A79] bg-white px-4 py-2.5 text-sm font-bold text-[#052A79]">IMPORTAR VINCULACIONES</button>
      <button disabled={!plantaKey} onClick={() => setModal({ modo: 'CREAR' })} className="rounded-lg bg-[#052A79] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">+ ASIGNAR SERVICIO</button>
    </div>

    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3"><div><h3 className="font-bold text-slate-700">Tarifas — {sede?.nombre || 'Sin sede'}</h3><p className="text-xs text-slate-500">{filtradas.length} configuraciones · el precio Faregas es la tarifa operativa oficial</p></div><span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{sede?.total_tarifas_activas || 0} ACTIVAS</span></div>
      {loading ? <div className="p-10 text-center text-slate-500">Cargando tarifas...</div> : error ? <div className="p-10 text-center text-red-600">{error}</div> : filtradas.length === 0 ? <div className="p-12 text-center"><p className="font-semibold text-slate-600">No existen tarifas configuradas para esta sede.</p><button onClick={() => setModal({ modo: 'CREAR' })} className="mt-4 rounded-lg bg-[#052A79] px-4 py-2 text-sm font-bold text-white">+ ASIGNAR SERVICIO</button></div> : <div className="max-h-[58vh] overflow-auto"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 border-b border-slate-200 bg-white text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Servicio</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3 text-right">Precio</th><th className="px-4 py-3">SKU Facturación</th><th className="px-4 py-3 text-center">Estado</th><th className="px-4 py-3 text-center">Tributario</th><th className="px-4 py-3 text-center">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{filtradas.map((tarifa) => {
        const st = getTarifaStatus(tarifa);
        return <tr key={tarifa.id} className="hover:bg-slate-50">
          <td className="px-4 py-3"><div className="font-semibold text-slate-800">{tarifa.servicio_nombre}</div><div className="font-mono text-xs text-slate-500">{tarifa.servicio_codigo}</div></td>
          <td className="px-4 py-3">{tarifa.categoria_nombre}</td>
          <td className="whitespace-nowrap px-4 py-3 text-right text-base font-bold text-[#052A79]">S/ {tarifa.precio.toFixed(2)}</td>
          <td className="max-w-sm px-4 py-3">{tarifa.producto_sku ? <><div className="font-mono font-bold">{tarifa.producto_sku}</div><div className="truncate text-xs text-slate-500">{tarifa.producto_descripcion}</div>{tarifa.producto_activo === false && <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">SKU INACTIVO</span>}</> : <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">SIN SKU ASIGNADO</span>}</td>
          <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-1 text-xs font-bold ${tarifa.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tarifa.activo ? 'ACTIVA' : 'INACTIVA'}</span></td>
          <td className="px-4 py-3 text-center">
            {st === 'CONFIGURADA' && <span className="rounded bg-green-100 px-2 py-1 text-xs font-bold text-green-700">CONFIGURADA</span>}
            {st === 'INCOMPLETA' && <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">INCOMPLETA</span>}
            {st === 'INVALIDA' && <span className="rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700">INVÁLIDO</span>}
          </td>
          <td className="px-4 py-3 text-center"><div className="flex justify-center gap-3 text-xs font-bold"><button onClick={() => setModal({ modo: 'EDITAR', tarifa })} className="text-[#052A79] hover:underline">Editar</button><button onClick={() => void cambiarEstado(tarifa)} className={tarifa.activo ? 'text-red-600' : 'text-green-600'}>{tarifa.activo ? 'Desactivar' : 'Activar'}</button></div></td>
        </tr>;
      })}</tbody></table></div>}
    </div>
    {modal && sede && <TarifaModal estado={modal} sede={sede} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await refrescar(); }} />}
    {importModal && <CatalogoFiscalImportModal tarifas={tarifas.filter(item => item.activo).map(item => ({ id: item.id, sku: item.producto_sku || '' }))} onClose={() => setImportModal(false)} onApplied={refrescar} />}
  </div>;
}

const getProductoError = (p: ProductoTarifa, exigeDatosTributarios: boolean) => {
  if (!p.activo) return 'Producto inactivo';
  if (!p.es_para_venta) return 'No habilitado para venta';
  if (exigeDatosTributarios && p.unidad?.trim().toUpperCase() !== 'ZZ') return 'Unidad no es ZZ';
  if (exigeDatosTributarios && p.codigo_clasificacion_sunat?.trim() && !/^\d{8}$/.test(p.codigo_clasificacion_sunat.trim())) return 'Cod. SUNAT inválido';
  if (exigeDatosTributarios && p.tipo_afectacion_igv?.trim() !== '10') return 'Afectación IGV debe ser 10';
  return null;
};

function TarifaModal({ estado, sede, onClose, onSaved }: { estado: NonNullable<ModalState>; sede: TarifaSede; onClose: () => void; onSaved: () => Promise<void> }) {
  const tarifa = estado.tarifa;
  const [servicios, setServicios] = useState<ServicioDisponible[]>([]);
  const [servicioId, setServicioId] = useState(tarifa?.servicio_id || 0);
  const [precio, setPrecio] = useState(tarifa?.precio.toString() || '');
  const [activo, setActivo] = useState(tarifa?.activo ?? true);
  
  const [producto, setProducto] = useState<ProductoTarifa | null>(tarifa?.producto_facturacion_id ? { 
    id: tarifa.producto_facturacion_id, 
    codigo_sku: tarifa.producto_sku || '', 
    descripcion: tarifa.producto_descripcion || '', 
    unidad: tarifa.producto_unidad, 
    tipo_afectacion_igv: tarifa.producto_afectacion_igv, 
    cuenta_por_cobrar: tarifa.producto_cuenta_por_cobrar, 
    precio_referencia: tarifa.producto_precio_referencia, 
    activo: tarifa.producto_activo !== false,
    es_para_venta: tarifa.producto_es_para_venta ?? true,
    codigo_clasificacion_sunat: tarifa.producto_codigo_sunat
  } : null);
  
  const [skuQuery, setSkuQuery] = useState('');
  const [resultados, setResultados] = useState<ProductoTarifa[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const servicio = servicios.find((item) => item.id === servicioId);
  const exigeDatosTributarios = estado.modo === 'EDITAR'
    ? tarifa?.servicio_tipo_flujo === 'CERTIFICACION'
    : servicio?.tipo_flujo === 'CERTIFICACION';
  
  useEffect(() => { if (estado.modo === 'CREAR') void faregasTarifasAdminApi.serviciosDisponibles(sede.key).then(setServicios).catch((err) => setError(err instanceof Error ? err.message : 'Error al cargar servicios')); }, [estado.modo, sede.key]);
  useEffect(() => {
    if (skuQuery.trim().length < 2) return;
    const timer = window.setTimeout(() => { void faregasTarifasAdminApi.buscarProductos(skuQuery.trim()).then(setResultados).catch((err) => setError(err instanceof Error ? err.message : 'Error al buscar SKU')); }, 250);
    return () => window.clearTimeout(timer);
  }, [skuQuery]);

  const actualizarBusquedaSku = (value: string) => {
    setSkuQuery(value);
    if (value.trim().length < 2) setResultados([]);
  };
  
  const guardar = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const monto = Number(precio);
    if (!Number.isFinite(monto) || monto <= 0) { setError('El precio debe ser mayor que cero.'); return; }
    if (producto) {
      const pErr = getProductoError(producto, exigeDatosTributarios);
      if (pErr) {
        setError(`El producto seleccionado es inválido: ${pErr}`);
        return;
      }
    }
    try { 
      setSaving(true); 
      if (estado.modo === 'CREAR') await faregasTarifasAdminApi.crear({ planta_key: sede.key, servicio_id: servicioId, precio: monto, producto_facturacion_id: producto?.id || null, activo }); 
      else if (tarifa) await faregasTarifasAdminApi.editar(tarifa.id, { precio: monto, producto_facturacion_id: producto?.id || null, activo }); 
      await onSaved(); 
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Error al guardar tarifa'); }
    finally { setSaving(false); }
  };
  
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"><h3 className="text-xl font-bold text-[#052A79]">{estado.modo === 'CREAR' ? 'Asignar Servicio' : 'Editar Tarifa'}</h3><p className="mb-5 text-sm text-slate-500">Tarifa operativa oficial de Faregas</p><form onSubmit={guardar} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Sede</label><input readOnly value={sede.nombre} className="w-full rounded-lg border bg-slate-100 p-2.5" /></div>{estado.modo === 'CREAR' ? <div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Servicio</label><select required value={servicioId || ''} onChange={(e) => setServicioId(Number(e.target.value))} className="w-full rounded-lg border bg-white p-2.5"><option value="">-- Seleccionar --</option>{servicios.map((item) => <option key={item.id} value={item.id}>{item.codigo} — {item.nombre}</option>)}</select></div> : <div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Servicio</label><input readOnly value={`${tarifa?.servicio_codigo} — ${tarifa?.servicio_nombre}`} className="w-full rounded-lg border bg-slate-100 p-2.5" /></div>}</div>{estado.modo === 'EDITAR' && <div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">Categoría</label><input readOnly value={tarifa?.categoria_nombre || ''} className="w-full rounded-lg border bg-slate-100 p-2.5" /></div>}{estado.modo === 'CREAR' && servicio && <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">Categoría: <strong>{servicio.categoria_nombre}</strong></div>}<div><label className="mb-1 block text-xs font-bold uppercase text-slate-500">{estado.modo === 'EDITAR' ? 'Nuevo precio Faregas' : 'Precio Faregas'}</label><div className="flex"><span className="rounded-l-lg border border-r-0 bg-slate-100 px-3 py-2.5 font-bold">S/</span><input required type="number" min="0.01" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full rounded-r-lg border p-2.5" /></div>{tarifa && <p className="mt-1 text-xs text-slate-500">Precio actual: S/ {tarifa.precio.toFixed(2)}</p>}</div><div className="rounded-xl border p-4"><div className="mb-2 flex items-center justify-between"><label className="text-sm font-bold text-slate-700">Producto / SKU de facturación <span className="font-normal text-slate-400">(opcional)</span></label>{producto && <button type="button" onClick={() => { setProducto(null); setError(''); }} className="text-xs font-bold text-red-600">Quitar SKU</button>}</div><input value={skuQuery} onChange={(e) => actualizarBusquedaSku(e.target.value)} placeholder="Buscar por SKU o descripción (mínimo 2 caracteres)" className="w-full rounded-lg border p-2.5 text-sm" />{resultados.length > 0 && <div className="mt-2 max-h-48 overflow-auto rounded-lg border">{resultados.map((item) => {
    const pErr = getProductoError(item, exigeDatosTributarios);
    return <button key={item.id} type="button" disabled={Boolean(pErr)} onClick={() => { setProducto(item); setSkuQuery(''); setResultados([]); setError(''); }} className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-blue-50 disabled:bg-slate-50 disabled:opacity-75 disabled:cursor-not-allowed">
      <div className="flex justify-between items-center"><span className="font-mono font-bold text-[#052A79]">{item.codigo_sku}</span>
      {pErr && <span className="text-xs font-bold text-red-600 bg-red-100 rounded px-2">{pErr}</span>}
      </div>
      <div className="text-slate-800">{item.descripcion}</div>
      <div className="text-xs text-slate-500 mt-1 flex gap-3">
        <span>Unidad: {item.unidad || '-'}</span>
        <span>SUNAT (opcional): {item.codigo_clasificacion_sunat || '-'}</span>
      </div>
    </button>;
  })}</div>}{producto && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs"><div className="mb-2 font-bold text-[#052A79]">{producto.codigo_sku} — {producto.descripcion}</div><div className="grid gap-1 md:grid-cols-2"><span>Unidad: <b>{producto.unidad || '-'}</b></span><span>Afectación IGV: <b>{producto.tipo_afectacion_igv || '-'}</b></span><span>Cuenta: <b>{producto.cuenta_por_cobrar || '-'}</b></span><span>Precio referencia SKU: <b>{producto.precio_referencia == null ? '-' : `S/ ${producto.precio_referencia.toFixed(2)}`}</b></span><span>SUNAT (opcional): <b>{producto.codigo_clasificacion_sunat || '-'}</b></span></div><div className="mt-2 border-t pt-2 font-semibold text-amber-700">El precio de referencia no modifica la tarifa Faregas.</div>{getProductoError(producto, exigeDatosTributarios) && <div className="mt-2 font-bold text-red-600">ERROR: {getProductoError(producto, exigeDatosTributarios)}</div>}</div>}</div><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />Tarifa activa</label>{error && <div className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}<div className="flex justify-end gap-3 border-t pt-4"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg px-5 py-2 font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button><button disabled={saving || (estado.modo === 'CREAR' && !servicioId) || Boolean(producto && getProductoError(producto, exigeDatosTributarios))} className="rounded-lg bg-[#052A79] px-5 py-2 font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar Tarifa'}</button></div></form></div></div>;
}
