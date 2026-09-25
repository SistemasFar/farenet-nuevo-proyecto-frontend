import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { DownloadCloud, Info, Cpu, Boxes, FileText, Search, Trash2 } from 'lucide-react';
import type { MainLayoutContext } from '../Dashboard/MainLayout';
import { faregasChipsApi, type Chip, type ChipResumen, type FiltrosListadoVentasChips, type ImpactoTipoChip, type ProductoInventariable, type VentaChipOperacion } from '../../services/faregas-chips.api';
import { ChipScannerInput, parseChipScan } from './ChipScannerInput';
import { ModalDetalleVentaChips } from './ModalDetalleVentaChips';
import { ModalVentaChips } from './ModalVentaChips';

const empty: ChipResumen = { total: 0, disponibles: 0, reservados: 0, vendidos: 0, baja: 0, precio: 0, stockPermitido: false, ventaHabilitada: false, mappingFiscalCompleto: false };
type EditableSede = { precio: number; stockPermitido: boolean; ventaHabilitada: boolean; productoFacturacionId?: number };
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error inesperado.';

const escaparHtml = (value: string) => value.replace(/[&<>'"]/g, (caracter) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[caracter] || caracter));

const renderImpactoTipoChip = (impacto: ImpactoTipoChip) => {
  const lista = (items: string[], vacio: string) => items.length > 0
    ? `<ul class="text-left text-xs leading-5">${items.map((item) => `<li>• ${escaparHtml(item)}</li>`).join('')}</ul>`
    : `<p class="text-left text-xs text-slate-500">${escaparHtml(vacio)}</p>`;
  const bloqueos = impacto.bloqueos || [];
  return `<div class="space-y-3 text-left">
    ${bloqueos.length > 0
      ? `<p class="rounded-lg border border-red-300 bg-red-100 p-3 text-xs font-bold text-red-900">No se puede eliminar: ${escaparHtml(bloqueos.map((b) => b.detalle).join(' '))}</p>`
      : `<p class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">ELIMINAR TIPO DE CHIP &mdash; ${escaparHtml(impacto.tipo.nombre)}<br/>También se eliminarán sus datos de prueba relacionados (ambiente ${escaparHtml(impacto.ambiente)}).</p>`}
    <div><p class="mb-1 text-sm font-bold">Configuraciones por sede (${impacto.configuracionesSede.length})</p>${lista(impacto.configuracionesSede.map((s) => `#${s.id} · sede ${s.planta_key}`), 'Sin configuraciones por sede.')}</div>
    <div><p class="mb-1 text-sm font-bold">Chips / seriales (${impacto.chips.length})</p>${lista(impacto.chips.map((c) => `#${c.id} · ${c.numero_chip} · ${c.estado}`), 'Sin seriales.')}</div>
    <div><p class="mb-1 text-sm font-bold">Movimientos (${impacto.movimientos.length})</p>${lista(impacto.movimientos.map((m) => `#${m.id} · chip ${m.chip_id} · ${m.tipo_movimiento}`), 'Sin movimientos.')}</div>
    <div><p class="mb-1 text-sm font-bold">Asignaciones a certificados (${impacto.asignacionesCertificado.length})</p>${lista(impacto.asignacionesCertificado.map((a) => `certificado ${a.certificado_id} · chip ${a.chip_id}`), 'Sin asignaciones.')}</div>
    <div><p class="mb-1 text-sm font-bold">Asignaciones a operaciones (${impacto.asignacionesOperacion.length})</p>${lista(impacto.asignacionesOperacion.map((a) => `detalle ${a.operacion_detalle_id} · chip ${a.chip_id}`), 'Sin asignaciones.')}</div>
    <p class="text-xs text-slate-500">El producto fiscal vinculado, si existe, se conservará. Esta acción no se puede deshacer.</p>
  </div>`;
};

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
  const [eliminandoTipoId, setEliminandoTipoId] = useState<number | null>(null);  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showVentaModal, setShowVentaModal] = useState(false);
  const [detalleOperacionId, setDetalleOperacionId] = useState<number | null>(null);
  const [ventasRefreshToken, setVentasRefreshToken] = useState(0);

  // New Product Modal State
  const [newProductCodigo, setNewProductCodigo] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductTipo, setNewProductTipo] = useState('CHIP_SERIALIZADO');
  const [savingProduct, setSavingProduct] = useState(false);
  const [newProductSedes, setNewProductSedes] = useState<Record<string, EditableSede>>({});

  // Edit Product Modal State
  const [editingProductoId, setEditingProductoId] = useState<number | null>(null);
  const [editProductCodigo, setEditProductCodigo] = useState('');
  const [editProductName, setEditProductName] = useState('');
  const [editProductTipo, setEditProductTipo] = useState('OTRO_PRODUCTO_FISICO');
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

  const abrirModalCrearProducto = () => {
    setEditingProductoId(null);
    setNewProductCodigo('');
    setNewProductName('');
    setNewProductTipo('CHIP_SERIALIZADO');
    setNewProductSedes({});
    setShowProductModal(true);
  };

  const handleCrearProducto = async () => {
    try {
      setSavingProduct(true);
      if (!newProductCodigo) throw new Error('El código es obligatorio.');
      if (!newProductName) throw new Error('El nombre es obligatorio.');

      const sedeConfig = newProductSedes[plantaKey];
      const payload = {
        codigo: newProductCodigo,
        nombre: newProductName,
        tipo: newProductTipo,
        sedes: sedeConfig && (sedeConfig.precio > 0 || sedeConfig.ventaHabilitada) ? [{
          plantaKey,
          precio: sedeConfig.precio,
          stockPermitido: sedeConfig.stockPermitido,
          ventaHabilitada: sedeConfig.ventaHabilitada
        }] : []
      };

      await faregasChipsApi.crearProductoInventariable(payload);
      setShowProductModal(false);
      setNewProductCodigo('');
      setNewProductName('');
      setNewProductTipo('CHIP_SERIALIZADO');
      setNewProductSedes({});
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
    const sedesConfig: Record<string, EditableSede> = {};
    (prod.sedes || []).forEach(s => {
      sedesConfig[s.plantaKey] = {
        precio: Number(s.precio),
        stockPermitido: s.stockPermitido,
        ventaHabilitada: s.ventaHabilitada,
        productoFacturacionId: s.productoFacturacionId || undefined
      };
    });
    setEditProductSedes(sedesConfig);
    setShowProductModal(true);
  };

  const establecerVentaEnTodasLasSedes = (ventaHabilitada: boolean) => {
    setEditProductSedes(prev => Object.fromEntries(
      Object.entries(prev).map(([plantaKey, sede]) => [
        plantaKey,
        { ...sede, ventaHabilitada }
      ])
    ));
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
      const sedesConfig: Record<string, EditableSede> = {};
      (prod.sedes || []).forEach((sede) => {
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
        codigo: editProductCodigo, // included just to satisfy type, backend ignores it
        nombre: editProductName,
        tipo: editProductTipo,
        sedes: selectedKeys.map(plantaKey => ({
          plantaKey,
          precio: editProductSedes[plantaKey].precio,
          stockPermitido: editProductSedes[plantaKey].stockPermitido,
          ventaHabilitada: editProductSedes[plantaKey].ventaHabilitada,
          productoFacturacionId: editProductSedes[plantaKey].productoFacturacionId,
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

  const handleEliminarTipoChip = async (prod: ProductoInventariable) => {
    setEliminandoTipoId(prod.id);
    try {
      const impacto = await faregasChipsApi.obtenerImpactoTipoChip(prod.id);
      const bloqueos = impacto.bloqueos || [];
      const confirmacion = await Swal.fire({
        title: bloqueos.length > 0 ? 'ELIMINACIÓN BLOQUEADA' : 'ELIMINAR TIPO DE CHIP',
        html: renderImpactoTipoChip(impacto),
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

      const resultado = await faregasChipsApi.eliminarTipoChip(prod.id);
      if (Number(selectedProductId) === prod.id) setSelectedProductId(null);
      await cargar();
      const partes = [`El tipo de chip "${resultado.nombre}" fue eliminado.`];
      if (resultado.configuracionesSedeEliminadas > 0) partes.push(`${resultado.configuracionesSedeEliminadas} configuración(es) por sede.`);
      if (resultado.chipsEliminados > 0) partes.push(`${resultado.chipsEliminados} serial(es), ${resultado.movimientosEliminados} movimiento(s) y ${resultado.asignacionesOperacionEliminadas} asignación(es) a operaciones.`);
      if (resultado.productosFiscalesDesvinculados > 0) partes.push(`${resultado.productosFiscalesDesvinculados} producto(s) fiscal(es) se conservaron y sólo se desvincularon.`);
      await Swal.fire({ title: 'Tipo de chip eliminado', text: partes.join(' '), icon: 'success', confirmButtonText: 'OK' });
    } catch (error) {
      await Swal.fire({ title: 'No se pudo eliminar', text: errorMessage(error), icon: 'error', confirmButtonText: 'CERRAR' });
    } finally {
      setEliminandoTipoId(null);
    }
  };

  const cards = [['Total', resumen.total], ['Disponibles', resumen.disponibles], ['Reservados', resumen.reservados], ['Vendidos', resumen.vendidos]];
  
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
          <p className="mt-1">Aquí se administra el tipo físico del chip, su precio y disponibilidad de venta por sede. La configuración fiscal se administra en Configuración.</p>
        </div>
        <button onClick={abrirModalCrearProducto} className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white shadow transition hover:bg-blue-700">AGREGAR TIPO DE CHIP</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {productos.map((prod) => (
          <section key={prod.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold capitalize text-[#052A79]">{prod.nombre}</h2>
                <p className="mt-1 font-mono text-xs text-slate-500">{prod.codigo}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button className="text-xs font-bold text-blue-600 hover:underline" onClick={() => openEditModal(prod)}>Editar tipo</button>
                <button
                  type="button"
                  title="Eliminar"
                  aria-label={`Eliminar tipo de chip ${prod.nombre}`}
                  disabled={eliminandoTipoId === prod.id}
                  onClick={() => void handleEliminarTipoChip(prod)}
                  className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-red-600 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Clasificación: <b>{prod.tipo}</b></p>
            {(() => {
              const sede = (prod.sedes || []).find((s: any) => s.plantaKey === plantaKey);
              return sede?.precio
                ? <p className="mt-1 text-xs font-bold text-emerald-700">Precio en esta sede: S/ {Number(sede.precio).toFixed(2)}</p>
                : <p className="mt-1 text-xs text-amber-600">Sin precio configurado en esta sede</p>;
            })()}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
              <div><span className="text-slate-500">En esta sede</span><p className="text-xl font-black text-[#052A79]">{Number(prod.stockSede || 0)}</p></div>
              <div><span className="text-slate-500">Total global</span><p className="text-xl font-black text-slate-700">{Number(prod.stockTotal || 0)}</p></div>
            </div>
          </section>
        ))}
      </div>
    </div>}

    {activeTab === 'VENTAS' && <TabVentas setShowVentaModal={setShowVentaModal} onSelectVenta={setDetalleOperacionId} refreshToken={ventasRefreshToken} />}
    {activeTab === 'INVENTARIO' && <>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-bold text-slate-800">Cantidades por tipo en {plantaNombre}</h2>
          <p className="mt-1 text-xs text-slate-500">El conteo corresponde a la ubicación actual de cada serial.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs capitalize text-slate-500"><tr><th className="p-3">Código</th><th className="p-3">Tipo de chip</th><th className="p-3 text-center">Disponibles</th><th className="p-3 text-center">Reservados</th><th className="p-3 text-center">Vendidos</th><th className="p-3 text-center">Total</th></tr></thead>
            <tbody>{productos.map((prod) => <tr key={prod.id} onClick={() => setSelectedProductId(prod.id)} className={`cursor-pointer border-t border-slate-100 hover:bg-blue-50 ${Number(selectedProductId) === prod.id ? 'bg-blue-50' : ''}`}><td className="p-3 font-mono font-bold">{prod.codigo}</td><td className="p-3 font-medium">{prod.nombre}</td><td className="p-3 text-center font-bold text-emerald-700">{Number(prod.disponiblesSede || 0)}</td><td className="p-3 text-center font-bold text-amber-700">{Number(prod.reservadosSede || 0)}</td><td className="p-3 text-center">{Number(prod.vendidosSede || 0)}</td><td className="p-3 text-center text-lg font-black text-[#052A79]">{Number(prod.stockSede || 0)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <div>
        <p className="mb-2 text-xs font-bold capitalize text-slate-500">Resumen del tipo seleccionado: {resumen.productoNombre || '-'}</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{cards.map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold capitalize text-slate-500">{label}</div><div className="mt-1 text-2xl font-black text-[#052A79]">{value}</div></div>)}</div>
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
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs capitalize text-slate-500"><tr>{modo === 'TRANSFERENCIA' && <th className="w-10 p-3"></th>}<th className="p-3">Código del chip</th><th className="p-3">Tipo</th><th className="p-3">Estado</th><th className="p-3">Sede</th><th className="p-3">Ingreso</th><th className="p-3">Último movimiento</th></tr></thead><tbody>{chips.map(c => <tr key={c.id} className="border-t border-slate-100">{modo === 'TRANSFERENCIA' && <td className="p-3"><input type="checkbox" disabled={c.estado !== 'DISPONIBLE' || Number(c.producto_inventariable_id) !== Number(selectedProductId)} checked={scan.split('\n').some(numero => numero.trim() === c.numero_chip)} onChange={e => { if (e.target.checked) { setScan(prev => prev ? `${prev}\n${c.numero_chip}` : c.numero_chip); } else { setScan(prev => prev.split('\n').map(x => x.trim()).filter(x => x && x !== c.numero_chip).join('\n')); } }} className="rounded border-slate-300 text-[#052A79] focus:ring-[#052A79]" /></td>}<td className="p-3 font-mono font-bold">{c.numero_chip}</td><td className="p-3">{c.producto_nombre}</td><td className="p-3"><span className={`inline-block rounded px-2 py-1 text-[10px] font-bold capitalize tracking-wider ${c.estado === 'DISPONIBLE' ? 'bg-emerald-100 text-emerald-800' : c.estado === 'RESERVADO' ? 'bg-amber-100 text-amber-800' : c.estado === 'VENDIDO' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}>{c.estado}</span></td><td className="p-3">{c.planta_nombre}</td><td className="p-3">{new Date(c.creado_en).toLocaleString()}</td><td className="p-3">{c.ultimo_movimiento ? new Date(c.ultimo_movimiento).toLocaleString() : '-'}</td></tr>)}{!chips.length && <tr><td colSpan={modo === 'TRANSFERENCIA' ? 7 : 6} className="p-10 text-center text-slate-400">No se encontraron chips con ese código.</td></tr>}</tbody></table></div>
        </section>
      </div>
    </>}

    {detalleOperacionId !== null && <ModalDetalleVentaChips operacionId={detalleOperacionId} onClose={() => setDetalleOperacionId(null)} />}
    {showVentaModal && <ModalVentaChips onClose={() => setShowVentaModal(false)} onVentaExitosa={() => { setVentasRefreshToken((value) => value + 1); void cargar(); }} />}
    {(showProductModal || editingProductoId) && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="text-lg font-bold text-slate-900">{editingProductoId ? 'Editar tipo de chip' : 'Agregar tipo de chip'}</h2><p className="mt-1 text-xs text-slate-500">Se administran aquí los datos físicos, el precio y la venta por sede. La configuración fiscal se realiza en Configuración.</p></div><button onClick={() => { setShowProductModal(false); setEditingProductoId(null); }} className="text-slate-400 hover:text-slate-600">✕</button></div>
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1 block text-sm font-bold text-slate-700">Código del tipo</label><input type="text" disabled={!!editingProductoId} value={editingProductoId ? editProductCodigo : newProductCodigo} onChange={(e) => setNewProductCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} placeholder="Ej. SUPERCHIP" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100" /></div>
              <div><label className="mb-1 block text-sm font-bold text-slate-700">Clasificación</label><select value={editingProductoId ? editProductTipo : newProductTipo} onChange={(e) => editingProductoId ? setEditProductTipo(e.target.value) : setNewProductTipo(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"><option value="CHIP_SERIALIZADO">Chip serializado</option><option value="ACCESORIO">Accesorio</option><option value="OTRO_PRODUCTO_FISICO">Otro producto físico</option></select></div>
            </div>
            <div>
              <div><label className="mb-1 block text-sm font-bold text-slate-700">Nombre del tipo de chip</label><input type="text" value={editingProductoId ? editProductName : newProductName} onChange={(e) => editingProductoId ? setEditProductName(e.target.value) : setNewProductName(e.target.value)} placeholder="Ej. Superchip GNV" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" /></div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="mb-3 text-sm font-bold text-amber-800">Precio en esta sede ({plantaNombre})</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-600">S/</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={editingProductoId
                    ? (editProductSedes[plantaKey]?.precio ?? '')
                    : (newProductSedes[plantaKey]?.precio ?? '')}
                  onChange={(e) => {
                    const precio = parseFloat(e.target.value) || 0;
                    if (editingProductoId) {
                      setEditProductSedes(prev => ({
                        ...prev,
                        [plantaKey]: {
                          precio,
                          stockPermitido: prev[plantaKey]?.stockPermitido ?? true,
                          ventaHabilitada: prev[plantaKey]?.ventaHabilitada ?? true,
                          productoFacturacionId: prev[plantaKey]?.productoFacturacionId,
                        }
                      }));
                    } else {
                      setNewProductSedes(prev => ({
                        ...prev,
                        [plantaKey]: {
                          precio,
                          stockPermitido: prev[plantaKey]?.stockPermitido ?? true,
                          ventaHabilitada: prev[plantaKey]?.ventaHabilitada ?? false,
                        }
                      }));
                    }
                  }}
                  className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-amber-700">Este precio se usará al calcular el total en la venta de chips.</p>
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editingProductoId
                    ? editProductSedes[plantaKey]?.ventaHabilitada ?? false
                    : newProductSedes[plantaKey]?.ventaHabilitada ?? false}
                  onChange={(e) => {
                    const ventaHabilitada = e.target.checked;
                    if (editingProductoId) {
                      setEditProductSedes(prev => {
                        const sedeActual = prev[plantaKey] || { precio: 0, stockPermitido: true };
                        return {
                          ...prev,
                          [plantaKey]: { ...sedeActual, ventaHabilitada }
                        };
                      });
                    } else {
                      setNewProductSedes(prev => {
                        const sedeActual = prev[plantaKey] || { precio: 0, stockPermitido: true };
                        return {
                          ...prev,
                          [plantaKey]: { ...sedeActual, ventaHabilitada }
                        };
                      });
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-[#052A79] focus:ring-[#052A79]"
                />
                Venta habilitada para {plantaNombre}
              </label>
              <p className="mt-1 text-xs text-slate-500">El cambio se aplica solo a {plantaNombre}; las demás sedes conservan su configuración.</p>
              {editingProductoId && Object.keys(editProductSedes).length > 0 && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-white p-3">
                  <p className="text-xs font-bold text-slate-700">
                    Venta habilitada: {Object.values(editProductSedes).filter((sede) => sede.ventaHabilitada).length} / {Object.keys(editProductSedes).length} sedes
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => establecerVentaEnTodasLasSedes(true)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                    >
                      HABILITAR EN TODAS LAS SEDES
                    </button>
                    <button
                      type="button"
                      onClick={() => establecerVentaEnTodasLasSedes(false)}
                      className="rounded-lg bg-slate-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
                    >
                      DESHABILITAR EN TODAS LAS SEDES
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Solo se modifica ventaHabilitada; los precios y demás datos de cada sede se conservan.</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 rounded-b-2xl border-t border-slate-200 bg-slate-50 p-5"><button onClick={() => { setShowProductModal(false); setEditingProductoId(null); }} disabled={savingProduct} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200">Cancelar</button><button onClick={editingProductoId ? handleEditarProducto : handleCrearProducto} disabled={savingProduct || (editingProductoId ? !editProductName : (!newProductName || !newProductCodigo))} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50">{savingProduct ? 'Guardando...' : 'Guardar'}</button></div>
        </div>
      </div>
    )}
  </div>;
}




function TabVentas({ setShowVentaModal, onSelectVenta, refreshToken }: { setShowVentaModal: (v: boolean) => void; onSelectVenta: (operacionId: number) => void; refreshToken: number }) {
  // El botón se refleja con el permiso real CHIPS_VENDER. Si luego se retira el
  // permiso del perfil, el botón desaparece sin tocar código. El backend sigue
  // siendo la autoridad: protege cada ruta con ese mismo permiso.
  const { permisos } = useOutletContext<MainLayoutContext>();
  const puedeVender = Array.isArray(permisos) && permisos.includes('CHIPS_VENDER');
  const [ventas, setVentas] = useState<VentaChipOperacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosListadoVentasChips>({});
  const [errorFiltros, setErrorFiltros] = useState('');

  const buscar = () => {
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      setErrorFiltros('La fecha Desde no puede ser posterior a la fecha Hasta.');
      return;
    }
    setErrorFiltros('');
    setFiltrosAplicados({
      ...(fechaDesde ? { fechaDesde } : {}),
      ...(fechaHasta ? { fechaHasta } : {})
    });
  };

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setErrorFiltros('');
    setFiltrosAplicados({});
  };

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await faregasChipsApi.listarVentas(filtrosAplicados);
        if (activo && response.success) setVentas(response.ventas);
      } catch (e: unknown) {
        if (activo) setError(errorMessage(e));
      } finally {
        if (activo) setLoading(false);
      }
    };
    void cargar();
    return () => { activo = false; };
  }, [refreshToken, filtrosAplicados]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Operaciones recientes</h2>
          <p className="text-xs text-slate-500">Listado canónico de chips vendidos</p>
        </div>
        {puedeVender && (
          <button onClick={() => setShowVentaModal(true)} className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#041c53]">
            + Vender Chips
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <label className="text-xs font-bold text-slate-600">Desde
          <input type="date" value={fechaDesde} onChange={(event) => setFechaDesde(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700" />
        </label>
        <label className="text-xs font-bold text-slate-600">Hasta
          <input type="date" value={fechaHasta} onChange={(event) => setFechaHasta(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700" />
        </label>
        <button type="button" onClick={buscar} className="rounded-lg bg-[#052A79] px-3 py-2 text-xs font-bold text-white hover:bg-[#041c53]">BUSCAR</button>
        <button type="button" onClick={limpiarFiltros} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">LIMPIAR</button>
      </div>
      {errorFiltros && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{errorFiltros}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-xs text-slate-600">
            <thead className="bg-slate-50 capitalize text-slate-500">
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
              ) : ventas.map((venta) => (
                <tr key={venta.operacionId} onClick={() => onSelectVenta(venta.operacionId)} className="cursor-pointer border-t border-slate-100 transition hover:bg-blue-50/60">
                  <td className="px-4 py-3 font-bold text-[#052A79]">OP. #{venta.operacionId}</td>
                  <td className="px-4 py-3">{new Date(venta.creadoEn).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">
                    <span className="mr-1 text-[10px] text-slate-400">{venta.tipoDocumentoCliente || ''}</span>
                    {venta.documentoCliente || '—'}
                  </td>
                  <td className="px-4 py-3 font-medium">{venta.nombreCliente || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-[180px] flex-wrap gap-1">
                      {venta.chips.map((chip) => (
                        <span key={chip} className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-800">{chip}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${venta.estadoVenta === 'PAGADO' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : venta.estadoVenta === 'ANULADO' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                      {venta.estadoVenta}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-800">S/ {venta.importeTotal.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    {venta.facturacion ? (
                      <div className="space-y-1">
                        <div className="font-bold text-slate-700">{venta.facturacion.nroComprobante || venta.facturacion.estado}</div>
                        {venta.facturacion.enlacePdf?.trim() ? (
                          <a href={venta.facturacion.enlacePdf} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex h-7 items-center gap-1 rounded border border-red-200 bg-red-50 px-2 text-[11px] font-bold text-red-600 transition hover:bg-red-100">
                            <FileText size={12} /> VER COMPROBANTE
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-500">{venta.facturacion.estado}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">SIN FACTURACIÓN</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

