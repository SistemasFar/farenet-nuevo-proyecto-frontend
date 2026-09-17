import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { DownloadCloud, Info, Cpu, Boxes, FileText, Search } from 'lucide-react';
import type { MainLayoutContext } from '../Dashboard/MainLayout';
import { faregasChipsApi, type Chip, type ChipResumen, type ProductoInventariable } from '../../services/faregas-chips.api';
import { ChipScannerInput, parseChipScan } from './ChipScannerInput';
import { ModalVentaChips } from './ModalVentaChips';

const empty: ChipResumen = { total: 0, disponibles: 0, reservados: 0, vendidos: 0, baja: 0, precio: 0, stockPermitido: false, ventaHabilitada: false, mappingFiscalCompleto: false };
type EditableSede = { precio: number; stockPermitido: boolean; ventaHabilitada: boolean; productoFacturacionId?: number };
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error inesperado.';

export function ChipsView() {
  const { plantaNombre, plantaKey } = useOutletContext<MainLayoutContext>();
  const [searchParams] = useSearchParams();
  const productoSolicitadoId = Number(searchParams.get('producto') || 0);
  const [activeTab, setActiveTab] = useState<'INVENTARIO' | 'PRODUCTOS'>(searchParams.get('tab') === 'productos' ? 'PRODUCTOS' : 'INVENTARIO');
  const [productoSolicitadoAtendido, setProductoSolicitadoAtendido] = useState(false);
  const [resumen, setResumen] = useState<ChipResumen>(empty);
  const [chips, setChips] = useState<Chip[]>([]);
  const [productos, setProductos] = useState<ProductoInventariable[]>([]);
  const [catalogos, setCatalogos] = useState<{ sedes: { key: string, nombre: string }[] }>({ sedes: [] });
  
  const [scan, setScan] = useState('');
  const [modo, setModo] = useState<'INGRESO' | 'TRANSFERENCIA'>('INGRESO');
  const [destino, setDestino] = useState('');
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showVentaModal, setShowVentaModal] = useState(false);

  // New Product Modal State
  const [newProductCodigo, setNewProductCodigo] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductTipo, setNewProductTipo] = useState('CHIP_SERIALIZADO');
  const [savingProduct, setSavingProduct] = useState(false);

  // Edit Product Modal State
  const [editingProductoId, setEditingProductoId] = useState<number | null>(null);
  const [editProductCodigo, setEditProductCodigo] = useState('');
  const [editProductName, setEditProductName] = useState('');
  const [editProductTipo, setEditProductTipo] = useState('OTRO_PRODUCTO_FISICO');
  const [editProductProductoFacturacionId, setEditProductProductoFacturacionId] = useState<number | ''>('');
  const [editProductSedes, setEditProductSedes] = useState<Record<string, EditableSede>>({});

  // Selected product in Inventory tab (for scanning/transferring)
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');

  const parsed = useMemo(() => parseChipScan(scan), [scan]);

  const cargar = useCallback(async () => {
    try {
      const [r, l, prods, cat] = await Promise.all([
        faregasChipsApi.resumen(selectedProductId === '' ? undefined : Number(selectedProductId)),
        faregasChipsApi.listar({ buscar, estado: filtroEstado === 'TODOS' ? undefined : filtroEstado }),
        faregasChipsApi.listarProductosInventariables(),
        faregasChipsApi.catalogosProductosInventariables()
      ]);
      setResumen(r);
      setChips(l.items);
      setProductos(prods);
      setCatalogos(cat);
      if (selectedProductId === '' && prods.length > 0) {
        const defaultProd = prods.find(p => p.codigo === 'CHIP') || prods[0];
        setSelectedProductId(defaultProd.id);
      }
    } catch (error: unknown) {
      setError(errorMessage(error));
    }
  }, [buscar, filtroEstado, selectedProductId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void cargar(), buscar ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [buscar, filtroEstado, cargar]);

  const confirmar = async () => {
    setError(''); setMensaje('');
    if (!parsed.validos.length || parsed.duplicados.length || parsed.errores.length) { setError('Corrija duplicados o lecturas inválidas antes de confirmar.'); return; }
    if (selectedProductId === '') { setError('Seleccione un producto.'); return; }
    try {
      setLoading(true);
      if (modo === 'INGRESO') {
        await faregasChipsApi.ingresar(Number(selectedProductId), parsed.validos);
      } else {
        if (!destino) throw new Error('Seleccione la sede destino.');
        await faregasChipsApi.transferir(Number(selectedProductId), destino, parsed.validos);
      }
      setMensaje(`${parsed.validos.length} unidad(es) procesada(s) correctamente.`);
      setScan('');
      await cargar();
    } catch (error: unknown) { setError(errorMessage(error)); } finally { setLoading(false); }
  };

  const handleCrearProducto = async () => {
    try {
      setSavingProduct(true);
      if (!newProductCodigo) throw new Error('El código es obligatorio.');
      if (!newProductName) throw new Error('El nombre es obligatorio.');

      const payload = {
        codigo: newProductCodigo,
        nombre: newProductName,
        tipo: newProductTipo,
        sedes: []
      };

      await faregasChipsApi.crearProductoInventariable(payload);
      setShowProductModal(false);
      setNewProductCodigo('');
      setNewProductName('');
      setNewProductTipo('CHIP_SERIALIZADO');
      await cargar();
    } catch (error: unknown) {
      alert('Error al guardar el producto: ' + errorMessage(error));
    } finally {
      setSavingProduct(false);
    }
  };

  const openEditModal = (prod: ProductoInventariable) => {
    setEditingProductoId(prod.id);
    setEditProductCodigo(prod.codigo);
    setEditProductName(prod.nombre);
    setEditProductTipo(prod.tipo);
    setEditProductProductoFacturacionId(prod.productoFacturacionId || '');
    const sedesConfig: Record<string, EditableSede> = {};
    prod.sedes.forEach(s => {
      sedesConfig[s.plantaKey] = {
        precio: Number(s.precio),
        stockPermitido: s.stockPermitido,
        ventaHabilitada: s.ventaHabilitada,
        productoFacturacionId: s.productoFacturacionId || undefined
      };
    });
    setEditProductSedes(sedesConfig);
  };

  useEffect(() => {
    if (activeTab !== 'PRODUCTOS' || !productoSolicitadoId || productoSolicitadoAtendido) return;
    const prod = productos.find((producto) => producto.id === productoSolicitadoId);
    if (!prod) return;

    const timer = window.setTimeout(() => {
      setEditingProductoId(prod.id);
      setEditProductCodigo(prod.codigo);
      setEditProductName(prod.nombre);
      setEditProductTipo(prod.tipo);
      setEditProductProductoFacturacionId(prod.productoFacturacionId || '');
      const sedesConfig: Record<string, EditableSede> = {};
      prod.sedes.forEach((sede) => {
        sedesConfig[sede.plantaKey] = {
          precio: Number(sede.precio),
          stockPermitido: sede.stockPermitido,
          ventaHabilitada: sede.ventaHabilitada,
          productoFacturacionId: sede.productoFacturacionId || undefined,
        };
      });
      setEditProductSedes(sedesConfig);
      setProductoSolicitadoAtendido(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, productoSolicitadoAtendido, productoSolicitadoId, productos]);

  const handleEditarProducto = async () => {
    if (!editingProductoId) return;
    try {
      setSavingProduct(true);
      const selectedKeys = Object.keys(editProductSedes);
      if (!editProductName) throw new Error('El nombre es obligatorio.');
      const payload = {
        productoFacturacionId: editProductProductoFacturacionId === '' ? undefined : Number(editProductProductoFacturacionId),
        codigo: editProductCodigo, // included just to satisfy type, backend ignores it
        nombre: editProductName,
        tipo: editProductTipo,
        sedes: selectedKeys.map(plantaKey => ({
          plantaKey,
          precio: editProductSedes[plantaKey].precio,
          stockPermitido: editProductSedes[plantaKey].stockPermitido,
          ventaHabilitada: editProductSedes[plantaKey].ventaHabilitada,
          productoFacturacionId: editProductSedes[plantaKey].productoFacturacionId
        }))
      };

      await faregasChipsApi.editarProductoInventariable(editingProductoId, payload);
      setEditingProductoId(null);
      await cargar();
    } catch (error: unknown) {
      alert('Error al guardar los cambios: ' + errorMessage(error));
    } finally {
      setSavingProduct(false);
    }
  };

  const cards = [['Total', resumen.total], ['Disponibles', resumen.disponibles], ['Reservados', resumen.reservados], ['Vendidos', resumen.vendidos], ['Baja', resumen.baja]];
  
  return <div className="space-y-5">
    <div>
      <h1 className="text-xl font-bold text-slate-900">Inventario de chips</h1>
      <p className="text-sm text-slate-500">Control de seriales físicos y movimientos de stock de la sede {plantaNombre}.</p>
    </div>

    <div className="grid grid-cols-1 gap-2 rounded-xl bg-slate-200 p-1 sm:grid-cols-3">
      <button type="button" onClick={() => setActiveTab('INVENTARIO')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-bold transition ${activeTab === 'INVENTARIO' ? 'bg-[#052A79] text-white shadow' : 'text-slate-600 hover:bg-white'}`}><Cpu size={17} /> INVENTARIO DE CHIPS</button>
      <button type="button" onClick={() => setActiveTab('PRODUCTOS')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-bold transition ${activeTab === 'PRODUCTOS' ? 'bg-[#052A79] text-white shadow' : 'text-slate-600 hover:bg-white'}`}><Boxes size={17} /> TIPOS DE CHIP</button>
      <button type="button" onClick={() => setActiveTab('VENTAS')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-bold transition ${activeTab === 'VENTAS' ? 'bg-[#052A79] text-white shadow' : 'text-slate-600 hover:bg-white'}`}><FileText size={17} /> VENTAS DE CHIPS</button>
    </div>

    {activeTab === 'PRODUCTOS' && <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 sm:flex-row sm:items-center">
        <div>
          <p className="font-bold">Catálogo de tipos de chip</p>
          <p className="mt-1">Aquí solo se define la identidad física del chip. Los precios, productos fiscales y sedes del certificado se administran en Configuración.</p>
        </div>
        <button onClick={() => setShowProductModal(true)} className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white shadow transition hover:bg-blue-700">AGREGAR TIPO DE CHIP</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {productos.map((prod) => (
          <section key={prod.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold uppercase text-[#052A79]">{prod.nombre}</h2>
                <p className="mt-1 font-mono text-xs text-slate-500">{prod.codigo}</p>
              </div>
              <button className="text-xs font-bold text-blue-600 hover:underline" onClick={() => openEditModal(prod)}>Editar tipo</button>
            </div>
            <p className="mt-3 text-xs text-slate-500">Clasificación: <b>{prod.tipo}</b></p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
              <div><span className="text-slate-500">En esta sede</span><p className="text-xl font-black text-[#052A79]">{Number(prod.stockSede || 0)}</p></div>
              <div><span className="text-slate-500">Total global</span><p className="text-xl font-black text-slate-700">{Number(prod.stockTotal || 0)}</p></div>
            </div>
          </section>
        ))}
      </div>
    </div>}

    {activeTab === 'VENTAS' && <TabVentas plantaKey={plantaKey} productos={productos} chipsList={chips} setShowVentaModal={setShowVentaModal} onVentaExitosa={async () => { await cargar(); }} />}
    {activeTab === 'INVENTARIO' && <>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-bold text-slate-800">Cantidades por tipo en {plantaNombre}</h2>
          <p className="mt-1 text-xs text-slate-500">El conteo corresponde a la ubicación actual de cada serial.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Código</th><th className="p-3">Tipo de chip</th><th className="p-3 text-center">Disponibles</th><th className="p-3 text-center">Reservados</th><th className="p-3 text-center">Vendidos</th><th className="p-3 text-center">Bajas</th><th className="p-3 text-center">Total</th></tr></thead>
            <tbody>{productos.map((prod) => <tr key={prod.id} onClick={() => setSelectedProductId(prod.id)} className={`cursor-pointer border-t border-slate-100 hover:bg-blue-50 ${Number(selectedProductId) === prod.id ? 'bg-blue-50' : ''}`}><td className="p-3 font-mono font-bold">{prod.codigo}</td><td className="p-3 font-medium">{prod.nombre}</td><td className="p-3 text-center font-bold text-emerald-700">{Number(prod.disponiblesSede || 0)}</td><td className="p-3 text-center font-bold text-amber-700">{Number(prod.reservadosSede || 0)}</td><td className="p-3 text-center">{Number(prod.vendidosSede || 0)}</td><td className="p-3 text-center text-red-700">{Number(prod.bajasSede || 0)}</td><td className="p-3 text-center text-lg font-black text-[#052A79]">{Number(prod.stockSede || 0)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <div>
        <p className="mb-2 text-xs font-bold uppercase text-slate-500">Resumen del tipo seleccionado: {resumen.productoNombre || '-'}</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{cards.map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-1 text-2xl font-black text-[#052A79]">{value}</div></div>)}</div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex gap-2"><button onClick={() => setModo('INGRESO')} className={`rounded px-3 py-2 text-xs font-bold ${modo === 'INGRESO' ? 'bg-[#052A79] text-white' : 'bg-slate-100'}`}>Ingresar stock</button><button onClick={() => setModo('TRANSFERENCIA')} className={`rounded px-3 py-2 text-xs font-bold ${modo === 'TRANSFERENCIA' ? 'bg-[#052A79] text-white' : 'bg-slate-100'}`}>Transferir</button></div>
          <div className="mb-3">
            <label className="mb-1 block text-sm font-bold text-slate-700">Tipo de chip a {modo === 'INGRESO' ? 'ingresar' : 'transferir'}</label>
            <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="">Seleccione un tipo de chip</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>)}
            </select>
          </div>
          {modo === 'TRANSFERENCIA' && <select value={destino} onChange={e => setDestino(e.target.value)} className="mb-3 w-full rounded border border-slate-300 p-2 text-sm"><option value="">Seleccione sede destino</option>{catalogos.sedes.filter(p => p.key !== plantaKey).map(p => <option key={p.key} value={p.key}>{p.nombre}</option>)}</select>}
          <ChipScannerInput value={scan} onChange={setScan} />
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}{mensaje && <p className="mt-3 text-sm text-emerald-700">{mensaje}</p>}
          <button disabled={loading || selectedProductId === ''} onClick={confirmar} className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-50">{loading ? 'Procesando...' : 'Confirmar'}</button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-end">
            <div><h2 className="font-bold">Unidades registradas</h2><p className="mt-1 text-xs text-slate-500">Todos los tipos ubicados actualmente en {plantaNombre}.</p></div>
            <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto w-full sm:w-auto">
              <label className="relative w-full sm:w-48"><span className="mb-1 block text-xs font-bold text-slate-600">Estado</span>
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="w-full rounded border border-slate-300 py-[7px] px-3 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="TODOS">Todos</option>
                  <option value="DISPONIBLE">Disponibles</option>
                  <option value="RESERVADO">Reservados</option>
                  <option value="VENDIDO">Vendidos</option>
                  <option value="BAJA">Bajas</option>
                </select>
              </label>
              <label className="relative w-full sm:w-72"><span className="mb-1 block text-xs font-bold text-slate-600">Buscar por código de chip</span><Search className="absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" /><input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Ej. CHIP001" className="w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none" /></label>
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr>{modo === 'TRANSFERENCIA' && <th className="w-10 p-3"></th>}<th className="p-3">Código del chip</th><th className="p-3">Tipo</th><th className="p-3">Estado</th><th className="p-3">Sede</th><th className="p-3">Ingreso</th><th className="p-3">Último movimiento</th></tr></thead><tbody>{chips.map(c => <tr key={c.id} className="border-t border-slate-100">{modo === 'TRANSFERENCIA' && <td className="p-3"><input type="checkbox" disabled={c.estado !== 'DISPONIBLE' || Number(c.producto_inventariable_id) !== Number(selectedProductId)} checked={scan.split('\n').some(numero => numero.trim() === c.numero_chip)} onChange={e => { if (e.target.checked) { setScan(prev => prev ? `${prev}\n${c.numero_chip}` : c.numero_chip); } else { setScan(prev => prev.split('\n').map(x => x.trim()).filter(x => x && x !== c.numero_chip).join('\n')); } }} className="rounded border-slate-300 text-[#052A79] focus:ring-[#052A79]" /></td>}<td className="p-3 font-mono font-bold">{c.numero_chip}</td><td className="p-3">{c.producto_nombre}</td><td className="p-3"><span className={`inline-block rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${c.estado === 'DISPONIBLE' ? 'bg-emerald-100 text-emerald-800' : c.estado === 'RESERVADO' ? 'bg-amber-100 text-amber-800' : c.estado === 'VENDIDO' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}>{c.estado}</span></td><td className="p-3">{c.planta_nombre}</td><td className="p-3">{new Date(c.creado_en).toLocaleString()}</td><td className="p-3">{c.ultimo_movimiento ? new Date(c.ultimo_movimiento).toLocaleString() : '-'}</td></tr>)}{!chips.length && <tr><td colSpan={modo === 'TRANSFERENCIA' ? 7 : 6} className="p-10 text-center text-slate-400">No se encontraron chips con ese código.</td></tr>}</tbody></table></div>
        </section>
      </div>
    </>}

    {showVentaModal && <ModalVentaChips onClose={() => setShowVentaModal(false)} onVentaExitosa={() => { alert('Venta exitosa'); cargar(); }} chipsConfig={chips} productosConfig={productos} plantaKey={plantaKey} />}
    {(showProductModal || editingProductoId) && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="text-lg font-bold text-slate-900">{editingProductoId ? 'Editar tipo de chip' : 'Agregar tipo de chip'}</h2><p className="mt-1 text-xs text-slate-500">Solo se registran los datos físicos del tipo de chip.</p></div><button onClick={() => { setShowProductModal(false); setEditingProductoId(null); }} className="text-slate-400 hover:text-slate-600">✕</button></div>
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1 block text-sm font-bold text-slate-700">Código del tipo</label><input type="text" disabled={!!editingProductoId} value={editingProductoId ? editProductCodigo : newProductCodigo} onChange={(e) => setNewProductCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} placeholder="Ej. SUPERCHIP" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100" /></div>
              <div><label className="mb-1 block text-sm font-bold text-slate-700">Clasificación</label><select value={editingProductoId ? editProductTipo : newProductTipo} onChange={(e) => editingProductoId ? setEditProductTipo(e.target.value) : setNewProductTipo(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"><option value="CHIP_SERIALIZADO">Chip serializado</option><option value="ACCESORIO">Accesorio</option><option value="OTRO_PRODUCTO_FISICO">Otro producto físico</option></select></div>
            </div>
            <div><label className="mb-1 block text-sm font-bold text-slate-700">Nombre del tipo de chip</label><input type="text" value={editingProductoId ? editProductName : newProductName} onChange={(e) => editingProductoId ? setEditProductName(e.target.value) : setNewProductName(e.target.value)} placeholder="Ej. Superchip GNV" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" /></div>
          </div>
          <div className="flex justify-end gap-3 rounded-b-2xl border-t border-slate-200 bg-slate-50 p-5"><button onClick={() => { setShowProductModal(false); setEditingProductoId(null); }} disabled={savingProduct} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200">Cancelar</button><button onClick={editingProductoId ? handleEditarProducto : handleCrearProducto} disabled={savingProduct || (editingProductoId ? !editProductName : (!newProductName || !newProductCodigo))} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50">{savingProduct ? 'Guardando...' : 'Guardar'}</button></div>
        </div>
      </div>
    )}
  </div>;
}




function TabVentas({ plantaKey, productos, chipsList, onVentaExitosa, setShowVentaModal }: { plantaKey: string, productos: ProductoInventariable[], chipsList: Chip[], onVentaExitosa: () => void, setShowVentaModal: (v: boolean) => void }) {
  const [ventas, setVentas] = useState<ChipVenta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await faregasChipsApi.listarVentas();
      if (res.success) setVentas(res.ventas);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Operaciones recientes</h2>
          <p className="text-xs text-slate-500">Listado de chips vendidos</p>
        </div>
        <button onClick={() => setShowVentaModal(true)} className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#041c53]">
          + Vender Chips
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-xs text-slate-600">
            <thead className="bg-slate-50 uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">N° VENTA</th>
                <th className="px-4 py-3 font-bold">FECHA Y HORA</th>
                <th className="px-4 py-3 font-bold">DNI / RUC</th>
                <th className="px-4 py-3 font-bold">NOMBRES / RAZÓN SOCIAL</th>
                <th className="px-4 py-3 font-bold">CHIPS VENDIDOS</th>
                <th className="px-4 py-3 font-bold">ESTADO DE VENTA</th>
                <th className="px-4 py-3 font-bold text-right">TOTAL</th>
                <th className="px-4 py-3 font-bold text-center">COMPROBANTE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">Cargando registros...</td></tr>
              ) : ventas.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">No se encontraron ventas.</td></tr>
              ) : (
                ventas.map((v) => (
                  <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 font-bold text-[#052A79]">VENTA #{v.id}</td>
                    <td className="px-4 py-3">{new Date(v.creado_en).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">{v.cliente_nro_documento}</td>
                    <td className="px-4 py-3 font-medium">{v.cliente_nombre}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {v.chips?.map((c, idx) => (
                          <span key={idx} className="bg-blue-50 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                            {c.numero_chip}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        {v.venta_estado === 'COMPLETADO' ? 'Pagado' : v.venta_estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">S/ {Number(v.importe_total).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      {v.enlace_pdf ? (
                        <a href={v.enlace_pdf} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded bg-red-50 px-2 text-[11px] font-bold text-red-600 transition hover:bg-red-100 border border-red-200">
                          <FileText size={12} /> {v.nro_comprobante || 'PDF'}
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">Sin doc.</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

