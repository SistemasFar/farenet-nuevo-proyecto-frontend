import { Edit, Power, PowerOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  faregasProductosApi,
  type ProductoFacturacion
} from '../../../services/faregas-productos.api';
import { exportarExcel } from '../../../utils/exportar-excel';

const productoVacio = (): Partial<ProductoFacturacion> => ({
  codigo_sku: '', descripcion: '', tipo_producto: 'Producto', categoria_dms: null,
  cuenta_por_cobrar: null, unidad: 'NIU', precio_unitario: null,
  precio_referencia: null, valor_referencial_unitario: null,
  codigo_clasificacion_sunat: null, tipo_afectacion_igv: '10',
  porcentaje_isc: null, disponible_pos: false, es_para_venta: true,
  es_para_compra: false, tiene_icbper: false, activo: true
});

const nullableNumber = (value: string) => value === '' ? null : Number(value);

export default function TabProductos() {
  const [productos, setProductos] = useState<ProductoFacturacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('');
  const [paraVenta, setParaVenta] = useState('');
  const [unidad, setUnidad] = useState('');
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [actual, setActual] = useState<Partial<ProductoFacturacion>>(productoVacio());
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      setError('');
      setProductos(await faregasProductosApi.listar());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelado = false;
    void faregasProductosApi.listar()
      .then((data) => { if (!cancelado) setProductos(data); })
      .catch((err) => { if (!cancelado) setError(err instanceof Error ? err.message : 'Error al cargar productos'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, []);

  const unidades = useMemo(() => [...new Set(productos.map((p) => p.unidad).filter(Boolean) as string[])].sort(), [productos]);
  const filtrados = useMemo(() => productos.filter((producto) => {
    const texto = buscar.trim().toLowerCase();
    const coincideTexto = !texto
      || producto.codigo_sku.toLowerCase().includes(texto)
      || producto.descripcion.toLowerCase().includes(texto);
    const coincideEstado = !estado || (estado === '1' ? producto.activo : !producto.activo);
    const coincideVenta = !paraVenta || (paraVenta === '1' ? producto.es_para_venta : !producto.es_para_venta);
    const coincideUnidad = !unidad || producto.unidad === unidad;
    return coincideTexto && coincideEstado && coincideVenta && coincideUnidad;
  }), [productos, buscar, estado, paraVenta, unidad]);

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (actual.unidad === 'ZZ' && actual.es_para_venta) {
      if (!actual.codigo_clasificacion_sunat || actual.codigo_clasificacion_sunat.length !== 8) {
        alert('Los servicios de certificación (Unidad ZZ) deben tener un código SUNAT de exactamente 8 dígitos.');
        return;
      }
    }
    try {
      setSaving(true);
      if (mode === 'CREATE') await faregasProductosApi.crear(actual);
      else if (actual.id) await faregasProductosApi.editar(actual.id, actual);
      setModal(false);
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (producto: ProductoFacturacion) => {
    if (!confirm(`¿Seguro que deseas ${producto.activo ? 'desactivar' : 'activar'} el SKU ${producto.codigo_sku}?`)) return;
    try {
      await faregasProductosApi.cambiarEstado(producto.id, !producto.activo);
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  };

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
        <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar código o descripción..." className="rounded-lg border border-slate-300 p-2 text-sm focus:border-[#052A79] focus:outline-none lg:col-span-2" />
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Estado: Todos</option><option value="1">Activos</option><option value="0">Inactivos</option></select>
        <select value={paraVenta} onChange={(e) => setParaVenta(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Para venta: Todos</option><option value="1">Sí</option><option value="0">No</option></select>
        <select value={unidad} onChange={(e) => setUnidad(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Unidad: Todas</option>{unidades.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div><div className="font-semibold text-gray-700">Productos de Facturación</div><div className="text-xs text-slate-500">{filtrados.length} de {productos.length} productos</div></div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || filtrados.length === 0}
              onClick={() => exportarExcel('faregas_productos', 'Productos', [
                { key: 'sku', header: 'SKU', width: 18 },
                { key: 'descripcion', header: 'DESCRIPCIÓN', width: 60 },
                { key: 'unidad', header: 'UNIDAD', width: 12 },
                { key: 'igv', header: 'AFECTACIÓN IGV', width: 18 },
                { key: 'cuenta', header: 'CUENTA POR COBRAR', width: 30 },
                { key: 'precio', header: 'PRECIO REFERENCIA', width: 20 },
                { key: 'venta', header: 'PARA VENTA', width: 14 },
                { key: 'estado', header: 'ESTADO', width: 14 }
              ], filtrados.map((producto) => ({
                sku: producto.codigo_sku,
                descripcion: producto.descripcion,
                unidad: producto.unidad || '',
                igv: producto.tipo_afectacion_igv || '',
                cuenta: producto.cuenta_por_cobrar || '',
                precio: producto.precio_referencia,
                venta: producto.es_para_venta ? 'SÍ' : 'NO',
                estado: producto.activo ? 'ACTIVO' : 'INACTIVO'
              })))}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ↓ Exportar Excel
            </button>
            <button onClick={() => { setMode('CREATE'); setActual(productoVacio()); setModal(true); }} className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white">+ Nuevo Producto</button>
          </div>
        </div>
        {loading ? <div className="py-10 text-center">Cargando productos...</div>
          : error ? <div className="py-10 text-center text-red-500">{error}</div>
          : <div className="max-h-[58vh] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-gray-200 bg-white text-xs uppercase text-gray-500"><tr><th className="px-3 py-3">SKU</th><th className="px-3 py-3">Descripción</th><th className="px-3 py-3">Unidad</th><th className="px-3 py-3">IGV</th><th className="px-3 py-3">Cuenta por cobrar</th><th className="px-3 py-3 text-right">Precio referencia</th><th className="px-3 py-3 text-center">Para venta</th><th className="px-3 py-3 text-center">Estado</th><th className="px-3 py-3 text-center">Acciones</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{filtrados.map((producto) => <tr key={producto.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-3 py-3 font-mono font-bold text-gray-700">{producto.codigo_sku}</td><td className="min-w-72 px-3 py-3 font-medium text-gray-800">{producto.descripcion}</td><td className="px-3 py-3">{producto.unidad || '-'}</td><td className="px-3 py-3">{producto.tipo_afectacion_igv || '-'}</td><td className="min-w-52 px-3 py-3 text-xs">{producto.cuenta_por_cobrar || '-'}</td><td className="whitespace-nowrap px-3 py-3 text-right">{producto.precio_referencia === null ? '-' : `S/ ${producto.precio_referencia?.toFixed(2)}`}</td><td className="px-3 py-3 text-center">{producto.es_para_venta ? 'Sí' : 'No'}</td><td className="px-3 py-3 text-center"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${producto.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{producto.activo ? 'ACTIVO' : 'INACTIVO'}</span></td><td className="px-3 py-3 text-center"><div className="flex justify-center gap-2"><button onClick={() => { setMode('EDIT'); setActual(producto); setModal(true); }} title="Editar" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[#052A79] hover:bg-blue-100 transition-colors"><Edit size={18} /></button><button onClick={() => void cambiarEstado(producto)} title={producto.activo ? "Desactivar" : "Activar"} className={producto.activo ? "rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[#052A79] hover:bg-red-100 transition-colors" : "rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-[#052A79] hover:bg-green-100 transition-colors"}>{producto.activo ? <PowerOff size={18} /> : <Power size={18} />}</button></div></td>
              </tr>)}</tbody>
            </table>
          </div>}
      </div>

      {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"><h3 className="mb-4 text-xl font-bold text-[#052A79]">{mode === 'CREATE' ? 'Nuevo Producto' : 'Editar Producto'}</h3><form onSubmit={guardar} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label className="mb-1 block text-sm font-semibold">Código SKU</label><input required disabled={mode === 'EDIT'} value={actual.codigo_sku || ''} onChange={(e) => setActual({ ...actual, codigo_sku: e.target.value })} className="w-full rounded-lg border p-2 disabled:bg-slate-100" /></div><div><label className="mb-1 block text-sm font-semibold">Unidad</label><input value={actual.unidad || ''} onChange={(e) => setActual({ ...actual, unidad: e.target.value })} className="w-full rounded-lg border p-2" /></div></div>
        <div><label className="mb-1 block text-sm font-semibold">Descripción</label><input required value={actual.descripcion || ''} onChange={(e) => setActual({ ...actual, descripcion: e.target.value })} className="w-full rounded-lg border p-2" /></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label className="mb-1 block text-sm font-semibold">Tipo afectación IGV</label><input maxLength={2} value={actual.tipo_afectacion_igv || ''} onChange={(e) => setActual({ ...actual, tipo_afectacion_igv: e.target.value })} className="w-full rounded-lg border p-2" /></div><div><label className="mb-1 block text-sm font-semibold">Código producto SUNAT</label><input value={actual.codigo_clasificacion_sunat || ''} onChange={(e) => setActual({ ...actual, codigo_clasificacion_sunat: e.target.value })} className="w-full rounded-lg border p-2" /></div></div>
        <div><label className="mb-1 block text-sm font-semibold">Cuenta por Cobrar</label><input value={actual.cuenta_por_cobrar || ''} onChange={(e) => setActual({ ...actual, cuenta_por_cobrar: e.target.value })} className="w-full rounded-lg border p-2" /></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><div><label className="mb-1 block text-sm font-semibold">Precio unitario</label><input type="number" min="0" step="0.0001" value={actual.precio_unitario ?? ''} onChange={(e) => setActual({ ...actual, precio_unitario: nullableNumber(e.target.value) })} className="w-full rounded-lg border p-2" /></div><div><label className="mb-1 block text-sm font-semibold">Precio referencia</label><input type="number" min="0" step="0.0001" value={actual.precio_referencia ?? ''} onChange={(e) => setActual({ ...actual, precio_referencia: nullableNumber(e.target.value) })} className="w-full rounded-lg border p-2" /></div><div><label className="mb-1 block text-sm font-semibold">Valor referencial</label><input type="number" min="0" step="0.0001" value={actual.valor_referencial_unitario ?? ''} onChange={(e) => setActual({ ...actual, valor_referencial_unitario: nullableNumber(e.target.value) })} className="w-full rounded-lg border p-2" /></div></div>
        <div className="flex flex-wrap gap-5 border-t pt-4">{[['es_para_venta','Es para venta'],['disponible_pos','Disponible POS'],['es_para_compra','Es para compra'],['tiene_icbper','Tiene ICBPER']].map(([campo,label]) => <label key={campo} className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(actual[campo as keyof ProductoFacturacion])} onChange={(e) => setActual({ ...actual, [campo]: e.target.checked })} />{label}</label>)}<label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" disabled={mode === 'EDIT'} checked={Boolean(actual.activo)} onChange={(e) => setActual({ ...actual, activo: e.target.checked })} />Activo</label></div>
        <div className="flex justify-end gap-3 border-t pt-4"><button type="button" disabled={saving} onClick={() => setModal(false)} className="rounded px-5 py-2 font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button><button type="submit" disabled={saving} className="rounded bg-[#052A79] px-5 py-2 font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button></div>
      </form></div></div>}
    </div>
  );
}
