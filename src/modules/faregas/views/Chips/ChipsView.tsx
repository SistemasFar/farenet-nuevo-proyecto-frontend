import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Boxes, Cpu } from 'lucide-react';
import type { MainLayoutContext } from '../Dashboard/MainLayout';
import { faregasChipsApi, type Chip, type ChipResumen, type ProductoInventariable } from '../../services/faregas-chips.api';
import { faregasProductosApi, type ProductoFacturacion } from '../../services/faregas-productos.api';
import { ChipScannerInput, parseChipScan } from './ChipScannerInput';

const empty: ChipResumen = { total: 0, disponibles: 0, reservados: 0, vendidos: 0, baja: 0, precio: 0, stockPermitido: false, ventaHabilitada: false, mappingFiscalCompleto: false };

export function ChipsView() {
  const { plantaNombre } = useOutletContext<MainLayoutContext>();
  const [activeTab, setActiveTab] = useState<'INVENTARIO' | 'PRODUCTOS'>('INVENTARIO');
  const [resumen, setResumen] = useState<ChipResumen>(empty);
  const [chips, setChips] = useState<Chip[]>([]);
  const [productos, setProductos] = useState<ProductoInventariable[]>([]);
  const [catalogos, setCatalogos] = useState<{ sedes: { key: string, nombre: string }[] }>({ sedes: [] });
  const [maestrosFacturacion, setMaestrosFacturacion] = useState<ProductoFacturacion[]>([]);
  
  const [scan, setScan] = useState('');
  const [modo, setModo] = useState<'INGRESO' | 'TRANSFERENCIA'>('INGRESO');
  const [destino, setDestino] = useState('');
  const [buscar, setBuscar] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  // New Product Modal State
  const [newProductCodigo, setNewProductCodigo] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductTipo, setNewProductTipo] = useState('OTRO_PRODUCTO_FISICO');
  const [newProductSedes, setNewProductSedes] = useState<Record<string, { precio: number, stockPermitido: boolean, ventaHabilitada: boolean, productoFacturacionId?: number }>>({});
  const [savingProduct, setSavingProduct] = useState(false);

  // Edit Product Modal State
  const [editingProductoId, setEditingProductoId] = useState<number | null>(null);
  const [editProductCodigo, setEditProductCodigo] = useState('');
  const [editProductName, setEditProductName] = useState('');
  const [editProductTipo, setEditProductTipo] = useState('OTRO_PRODUCTO_FISICO');
  const [editProductSedes, setEditProductSedes] = useState<Record<string, { precio: number, stockPermitido: boolean, ventaHabilitada: boolean, productoFacturacionId?: number }>>({});

  // Selected product in Inventory tab (for scanning/transferring)
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');

  const parsed = useMemo(() => parseChipScan(scan), [scan]);

  const cargar = useCallback(async () => {
    try {
      const [r, l, prods, cat, fiscales] = await Promise.all([
        faregasChipsApi.resumen(selectedProductId === '' ? undefined : Number(selectedProductId)),
        faregasChipsApi.listar({ buscar, productoInventariableId: selectedProductId === '' ? undefined : Number(selectedProductId) }),
        faregasChipsApi.listarProductosInventariables(),
        faregasChipsApi.catalogosProductosInventariables(),
        faregasProductosApi.listar()
      ]);
      setResumen(r);
      setChips(l.items);
      setProductos(prods);
      setCatalogos(cat);
      setMaestrosFacturacion(fiscales.filter(f => f.activo && f.es_para_venta));
      if (selectedProductId === '' && prods.length > 0) {
        const defaultProd = prods.find(p => p.codigo === 'CHIP') || prods[0];
        setSelectedProductId(defaultProd.id);
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, [buscar, selectedProductId]);

  useEffect(() => { cargar(); }, [cargar]);

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
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleCrearProducto = async () => {
    try {
      setSavingProduct(true);
      const selectedKeys = Object.keys(newProductSedes);
      if (!newProductCodigo) throw new Error('El código es obligatorio.');
      if (!newProductName) throw new Error('El nombre es obligatorio.');
      if (!selectedKeys.length) throw new Error('Debe seleccionar al menos una sede.');

      const payload = {
        codigo: newProductCodigo,
        nombre: newProductName,
        tipo: newProductTipo,
        sedes: selectedKeys.map(plantaKey => ({
          plantaKey,
          precio: newProductSedes[plantaKey].precio,
          stockPermitido: newProductSedes[plantaKey].stockPermitido,
          ventaHabilitada: newProductSedes[plantaKey].ventaHabilitada,
          productoFacturacionId: newProductSedes[plantaKey].productoFacturacionId
        }))
      };

      await faregasChipsApi.crearProductoInventariable(payload);
      setShowProductModal(false);
      setNewProductCodigo('');
      setNewProductName('');
      setNewProductTipo('OTRO_PRODUCTO_FISICO');
      setNewProductSedes({});
      await cargar();
    } catch (e: any) {
      alert('Error al guardar el producto: ' + e.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const toggleSedeSelection = (plantaKey: string, isEdit = false) => {
    const setter = isEdit ? setEditProductSedes : setNewProductSedes;
    setter((prev: any) => {
      const next = { ...prev };
      if (next[plantaKey]) {
        delete next[plantaKey];
      } else {
        next[plantaKey] = { precio: 0, stockPermitido: true, ventaHabilitada: false, productoFacturacionId: undefined };
      }
      return next;
    });
  };

  const updateSedeConfig = (plantaKey: string, field: 'precio' | 'stockPermitido' | 'ventaHabilitada' | 'productoFacturacionId', value: any, isEdit = false) => {
    const setter = isEdit ? setEditProductSedes : setNewProductSedes;
    setter((prev: any) => {
      if (!prev[plantaKey]) return prev;
      return { ...prev, [plantaKey]: { ...prev[plantaKey], [field]: value } };
    });
  };

  const openEditModal = (prod: ProductoInventariable) => {
    setEditingProductoId(prod.id);
    setEditProductCodigo(prod.codigo);
    setEditProductName(prod.nombre);
    setEditProductTipo(prod.tipo);
    const sedesConfig: Record<string, any> = {};
    prod.sedes.forEach(s => {
      sedesConfig[s.plantaKey] = {
        precio: s.precio,
        stockPermitido: s.stockPermitido,
        ventaHabilitada: s.ventaHabilitada,
        productoFacturacionId: s.productoFacturacionId || undefined
      };
    });
    setEditProductSedes(sedesConfig);
  };

  const handleEditarProducto = async () => {
    if (!editingProductoId) return;
    try {
      setSavingProduct(true);
      const selectedKeys = Object.keys(editProductSedes);
      if (!editProductName) throw new Error('El nombre es obligatorio.');
      if (!selectedKeys.length) throw new Error('Debe seleccionar al menos una sede activa.');

      const payload = {
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
    } catch (e: any) {
      alert('Error al guardar los cambios: ' + e.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const cards = [['Total', resumen.total], ['Disponibles', resumen.disponibles], ['Reservados', resumen.reservados], ['Vendidos', resumen.vendidos], ['Baja', resumen.baja]];
  
  const destinosValidos = useMemo(() => {
    if (selectedProductId === '') return [];
    const prod = productos.find(p => p.id === Number(selectedProductId));
    if (!prod) return [];
    return prod.sedes.filter(s => s.stockPermitido).map(s => s.plantaKey);
  }, [productos, selectedProductId]);

  return <div className="space-y-5">
    <div><h1 className="text-xl font-bold text-slate-900">Chips y Productos</h1><p className="text-sm text-slate-500">Inventario y configuración del producto físico para la sede {plantaNombre}.</p></div>

    <div className="grid grid-cols-1 gap-2 rounded-xl bg-slate-200 p-1 sm:grid-cols-2">
      <button type="button" onClick={() => setActiveTab('INVENTARIO')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-bold transition ${activeTab === 'INVENTARIO' ? 'bg-[#052A79] text-white shadow' : 'text-slate-600 hover:bg-white'}`}><Cpu size={17} /> INVENTARIO DE CHIPS</button>
      <button type="button" onClick={() => setActiveTab('PRODUCTOS')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-bold transition ${activeTab === 'PRODUCTOS' ? 'bg-[#052A79] text-white shadow' : 'text-slate-600 hover:bg-white'}`}><Boxes size={17} /> PRODUCTOS INVENTARIABLES</button>
    </div>

    {activeTab === 'PRODUCTOS' && <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <div>
          <p className="font-bold">Productos físicos con control de stock</p>
          <p className="mt-1">Aquí se consulta la configuración comercial, fiscal y de inventario de cada producto en las sedes.</p>
        </div>
        <button
          onClick={() => setShowProductModal(true)}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white shadow hover:bg-blue-700 transition"
        >
          AGREGAR NUEVO PRODUCTO
        </button>
      </div>

      {productos.map((prod) => {
        return (
          <section key={prod.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-[#052A79] uppercase">{prod.nombre} <span className="text-sm text-slate-400 font-normal ml-2">({prod.codigo})</span></h2>
              <p className="text-sm text-slate-500">Tipo: <b>{prod.tipo}</b></p>
            </div>
            
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex justify-between items-center mb-2">
                 <h3 className="text-sm font-bold text-slate-700">Configuración por sede:</h3>
                 <button className="text-xs text-blue-600 hover:underline font-bold" onClick={() => openEditModal(prod)}>Editar Configuración</button>
              </div>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 sticky top-0 text-slate-600">
                    <tr>
                      <th className="p-2 font-bold">Sede</th>
                      <th className="p-2 font-bold">Precio</th>
                      <th className="p-2 font-bold">Stock</th>
                      <th className="p-2 font-bold">Venta</th>
                      <th className="p-2 font-bold">Producto Fiscal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prod.sedes.map(sede => (
                      <tr key={sede.plantaKey} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-2 font-medium text-slate-800">{sede.plantaNombre}</td>
                        <td className="p-2 whitespace-nowrap">S/ {Number(sede.precio).toFixed(2)}</td>
                        <td className={`p-2 font-bold ${sede.stockPermitido ? 'text-emerald-700' : 'text-red-700'}`}>{sede.stockPermitido ? 'Permitido' : 'Bloqueado'}</td>
                        <td className={`p-2 font-bold ${sede.ventaHabilitada ? 'text-emerald-700' : 'text-amber-700'}`}>{sede.ventaHabilitada ? 'Habilitada' : 'Deshabilitada'}</td>
                        <td className="p-2 truncate max-w-[200px]" title={sede.productoFiscalDescripcion || 'No vinculado'}>
                          {sede.productoFiscalCodigo ? `[${sede.productoFiscalCodigo}] ${sede.productoFiscalDescripcion}` : <span className="text-slate-400 italic">Pendiente de vinculación</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 flex gap-6 text-sm">
               <div><span className="text-slate-500">Stock Total (Global):</span> <span className="font-bold">{prod.stockTotal}</span></div>
               <div><span className="text-slate-500">Stock Sede Actual:</span> <span className="font-bold">{prod.stockSede}</span></div>
            </div>
          </section>
        )
      })}
    </div>}

    {activeTab === 'INVENTARIO' && <>
      {!resumen.ventaHabilitada && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><b>Venta no habilitada.</b> Esta sede puede administrar stock para este producto, pero no vender hasta contar con autorización y un producto fiscal válido.</div>}
      {!resumen.stockPermitido && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900"><b>Stock no habilitado.</b> La sede no puede recibir ni reservar este producto.</div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{cards.map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase text-slate-500">{label}</div><div className="mt-1 text-2xl font-black text-[#052A79]">{value}</div></div>)}</div>
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex gap-2"><button onClick={() => setModo('INGRESO')} className={`rounded px-3 py-2 text-xs font-bold ${modo === 'INGRESO' ? 'bg-[#052A79] text-white' : 'bg-slate-100'}`}>Ingresar stock</button><button onClick={() => setModo('TRANSFERENCIA')} className={`rounded px-3 py-2 text-xs font-bold ${modo === 'TRANSFERENCIA' ? 'bg-[#052A79] text-white' : 'bg-slate-100'}`}>Transferir</button></div>
          <div className="mb-3">
            <label className="mb-1 block text-sm font-bold text-slate-700">Producto a {modo === 'INGRESO' ? 'ingresar' : 'transferir'}</label>
            <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="">Seleccione un producto</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>)}
            </select>
          </div>
          {modo === 'TRANSFERENCIA' && <select value={destino} onChange={e => setDestino(e.target.value)} className="mb-3 w-full rounded border border-slate-300 p-2 text-sm">
            <option value="">Seleccione sede destino</option>
            {catalogos.sedes.filter(p => destinosValidos.includes(p.key)).map(p => <option key={p.key} value={p.key}>{p.nombre}</option>)}
          </select>}
          
          <ChipScannerInput value={scan} onChange={setScan} />{error && <p className="mt-3 text-sm text-red-700">{error}</p>}{mensaje && <p className="mt-3 text-sm text-emerald-700">{mensaje}</p>}
          <button disabled={loading || !resumen.stockPermitido} onClick={confirmar} className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-50">{loading ? 'Procesando...' : 'Confirmar'}</button>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-200 p-4"><h2 className="font-bold">Unidades registradas</h2><input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar número" className="ml-auto rounded border border-slate-300 px-3 py-2 text-sm" /></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr>{modo === 'TRANSFERENCIA' && <th className="p-3 w-10"></th>}<th className="p-3">Número</th><th className="p-3">Producto</th><th className="p-3">Estado</th><th className="p-3">Sede</th><th className="p-3">Ingreso</th><th className="p-3">Último movimiento</th></tr></thead><tbody>{chips.map(c => <tr key={c.id} className="border-t border-slate-100">{modo === 'TRANSFERENCIA' && <td className="p-3"><input type="checkbox" disabled={c.estado !== 'DISPONIBLE'} checked={scan.includes(c.numero_chip)} onChange={e => { if (e.target.checked) { setScan(prev => prev ? `${prev}\n${c.numero_chip}` : c.numero_chip); } else { setScan(prev => prev.split('\n').map(x => x.trim()).filter(x => x && x !== c.numero_chip).join('\n')); } }} className="rounded border-slate-300 text-[#052A79] focus:ring-[#052A79]" /></td>}<td className="p-3 font-mono font-bold">{c.numero_chip}</td><td className="p-3">{c.producto_nombre}</td><td className="p-3">{c.estado}</td><td className="p-3">{c.planta_nombre}</td><td className="p-3">{new Date(c.creado_en).toLocaleString()}</td><td className="p-3">{c.ultimo_movimiento ? new Date(c.ultimo_movimiento).toLocaleString() : '-'}</td></tr>)}{!chips.length && <tr><td colSpan={modo === 'TRANSFERENCIA' ? 7 : 6} className="p-10 text-center text-slate-400">No hay unidades registradas.</td></tr>}</tbody></table></div>
        </section>
      </div>
    </>}

    {/* CREATE OR EDIT MODAL */}
    {(showProductModal || editingProductoId) && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto">
        <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl my-8">
          <div className="flex items-center justify-between border-b border-slate-100 p-5 sticky top-0 bg-white rounded-t-2xl z-10">
            <h2 className="text-lg font-bold text-slate-900">{editingProductoId ? 'Editar Producto Inventariable' : 'Agregar Nuevo Producto Inventariable'}</h2>
            <button onClick={() => { setShowProductModal(false); setEditingProductoId(null); }} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Código Técnico</label>
                <input
                  type="text"
                  disabled={!!editingProductoId}
                  value={editingProductoId ? editProductCodigo : newProductCodigo}
                  onChange={(e) => setNewProductCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  placeholder="Ej. PORTA_CHIP_ACR"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Tipo de Producto</label>
                <select
                  value={editingProductoId ? editProductTipo : newProductTipo}
                  onChange={(e) => editingProductoId ? setEditProductTipo(e.target.value) : setNewProductTipo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="CHIP_SERIALIZADO">Chip (Serializado)</option>
                  <option value="ACCESORIO">Accesorio (Porta chip, etiquetas)</option>
                  <option value="DISPOSITIVO_LECTURA">Dispositivo de lectura (Escáner, antena)</option>
                  <option value="MATERIAL_PUBLICITARIO">Material publicitario (Banners, afiches)</option>
                  <option value="OTRO_PRODUCTO_FISICO">Otro producto físico general</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Nombre del Producto</label>
              <input
                type="text"
                value={editingProductoId ? editProductName : newProductName}
                onChange={(e) => editingProductoId ? setEditProductName(e.target.value) : setNewProductName(e.target.value)}
                placeholder="Ej. Porta chip acrílico Faregas"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <div className="border-t border-slate-200 pt-4 mt-4">
              <label className="mb-1 block text-sm font-bold text-slate-700">Configuración Avanzada por Sede</label>
              <p className="mb-3 text-xs text-slate-500">Seleccione las sedes activas, asigne precios y vincule el SKU de Nubefact para habilitar ventas.</p>
              
              <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-200 text-slate-600 text-[11px] uppercase sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="p-2 w-10 text-center">Activo</th>
                      <th className="p-2">Sede</th>
                      <th className="p-2">Precio (S/)</th>
                      <th className="p-2 text-center">Permitir Stock</th>
                      <th className="p-2 text-center">Habilitar Venta</th>
                      <th className="p-2">SKU Nubefact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogos.sedes.map(planta => {
                      const isSelected = !!(editingProductoId ? editProductSedes[planta.key] : newProductSedes[planta.key]);
                      const conf = isSelected ? (editingProductoId ? editProductSedes[planta.key] : newProductSedes[planta.key]) : null;
                      
                      return (
                        <tr key={planta.key} className={`border-b border-slate-100 last:border-0 ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-100 opacity-60'}`}>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSedeSelection(planta.key, !!editingProductoId)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-2 font-bold text-slate-800 text-xs">{planta.nombre}</td>
                          <td className="p-2">
                            <input 
                              type="number" min="0" step="0.01"
                              disabled={!isSelected}
                              value={conf?.precio ?? ''}
                              onChange={(e) => updateSedeConfig(planta.key, 'precio', parseFloat(e.target.value) || 0, !!editingProductoId)}
                              className="w-20 rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 focus:border-blue-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input 
                              type="checkbox"
                              disabled={!isSelected}
                              checked={conf?.stockPermitido ?? false}
                              onChange={(e) => updateSedeConfig(planta.key, 'stockPermitido', e.target.checked, !!editingProductoId)}
                              className="rounded border-slate-300 text-emerald-600 disabled:opacity-50 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input 
                              type="checkbox"
                              disabled={!isSelected || !conf?.productoFacturacionId}
                              checked={conf?.ventaHabilitada ?? false}
                              onChange={(e) => updateSedeConfig(planta.key, 'ventaHabilitada', e.target.checked, !!editingProductoId)}
                              className="rounded border-slate-300 text-amber-600 disabled:opacity-50 focus:ring-amber-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              disabled={!isSelected}
                              value={conf?.productoFacturacionId || ''}
                              onChange={(e) => {
                                const val = e.target.value ? Number(e.target.value) : undefined;
                                updateSedeConfig(planta.key, 'productoFacturacionId', val, !!editingProductoId);
                                if (!val) updateSedeConfig(planta.key, 'ventaHabilitada', false, !!editingProductoId);
                              }}
                              className="w-48 rounded border border-slate-300 p-1 text-xs focus:border-blue-500 focus:outline-none disabled:opacity-50"
                            >
                              <option value="">-- No vinculado --</option>
                              {maestrosFacturacion.map(f => (
                                <option key={f.id} value={f.id}>[{f.codigo_sku}] {f.descripcion}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 rounded-b-2xl bg-slate-50 p-5 sticky bottom-0 border-t border-slate-200">
            <button onClick={() => { setShowProductModal(false); setEditingProductoId(null); }} disabled={savingProduct} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200">Cancelar</button>
            <button
              onClick={editingProductoId ? handleEditarProducto : handleCrearProducto}
              disabled={
                savingProduct || 
                (editingProductoId 
                  ? (!editProductName || Object.keys(editProductSedes).length === 0) 
                  : (!newProductName || !newProductCodigo || Object.keys(newProductSedes).length === 0))
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50"
            >
              {savingProduct ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>;
}
