import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import readXlsxFile from 'read-excel-file/browser';
import { Cpu, Boxes, FileText, Search, Trash2, Ban, RefreshCw, ScanLine, FileSpreadsheet, ListOrdered } from 'lucide-react';
import type { MainLayoutContext } from '../Dashboard/MainLayout';
import { Paginacion } from '../components/Paginacion';
import { useListadoPaginado } from '../hooks/useListadoPaginado';
import { faregasChipsApi, type Chip, type ChipResumen, type ImpactoTipoChip, type ProductoInventariable, type VentaChipOperacion } from '../../services/faregas-chips.api';
import { ChipScannerInput } from './ChipScannerInput';
import { extraerCodigosDeHoja, generarCodigosPorRango, parseChipScan } from './chips-ingreso-masivo';
import { ModalDetalleVentaChips } from './ModalDetalleVentaChips';
import { ModalVentaChips } from './ModalVentaChips';

const empty: ChipResumen = { total: 0, disponibles: 0, reservados: 0, vendidos: 0, baja: 0, precio: 0, stockPermitido: false, ventaHabilitada: false, mappingFiscalCompleto: false };
type EditableSede = { precio: number; stockPermitido: boolean; ventaHabilitada: boolean; productoFacturacionId?: number };
type MetodoIngreso = 'ESCANEO' | 'EXCEL' | 'RANGO';
const SEDES_TRANSFERENCIA_CHIPS = ['13', '98', '160'];
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
  const { plantaNombre, plantaKey, permisos } = useOutletContext<MainLayoutContext>();
  const [searchParams] = useSearchParams();
  const productoSolicitadoId = Number(searchParams.get('producto') || 0);

  // Submódulos de Chips. MENU_CHIPS da el módulo; los MENU_CHIPS_* dan cada
  // pestaña. El botón de venta sigue dependiendo de CHIPS_VENDER (capacidad
  // operativa), no de la navegación.
  const lista = Array.isArray(permisos) ? permisos : [];
  const puedeInventario = lista.includes('MENU_CHIPS_INVENTARIO');
  const puedeTipos = lista.includes('MENU_CHIPS_TIPOS');
  const puedeVentas = lista.includes('MENU_CHIPS_VENTAS');

  const PESTANAS = useMemo(() => ([
    { id: 'INVENTARIO', permiso: puedeInventario, etiqueta: 'INVENTARIO DE CHIPS', Icono: Cpu },
    { id: 'PRODUCTOS', permiso: puedeTipos, etiqueta: 'TIPOS DE CHIP', Icono: Boxes },
    { id: 'VENTAS', permiso: puedeVentas, etiqueta: 'VENTAS DE CHIPS', Icono: FileText }
  ] as const).filter((p) => p.permiso), [puedeInventario, puedeTipos, puedeVentas]);

  // Si la URL pide una pestaña que el perfil no tiene, se cae a la primera
  // permitida en lugar de dejar la pantalla vacía.
  const [activeTab, setActiveTab] = useState<'INVENTARIO' | 'PRODUCTOS' | 'VENTAS'>(() => {
    const pedida = searchParams.get('tab') === 'productos' ? 'PRODUCTOS' : 'INVENTARIO';
    if (pedida === 'PRODUCTOS' && !puedeTipos) return puedeVentas ? 'VENTAS' : 'INVENTARIO';
    if (pedida === 'INVENTARIO' && !puedeInventario) return puedeVentas ? 'VENTAS' : 'INVENTARIO';
    return pedida;
  });
  const [productoSolicitadoAtendido, setProductoSolicitadoAtendido] = useState(false);
  const [resumen, setResumen] = useState<ChipResumen>(empty);
  const [chips, setChips] = useState<Chip[]>([]);
  const [productos, setProductos] = useState<ProductoInventariable[]>([]);
  const [catalogos, setCatalogos] = useState<{ sedes: { key: string, nombre: string }[] }>({ sedes: [] });

  const [scan, setScan] = useState('');
  const [modo, setModo] = useState<'INGRESO' | 'TRANSFERENCIA'>('INGRESO');
  const [metodoIngreso, setMetodoIngreso] = useState<MetodoIngreso>('ESCANEO');
  const [destino, setDestino] = useState('');
  const [archivoImportado, setArchivoImportado] = useState('');
  const [cargandoArchivo, setCargandoArchivo] = useState(false);
  const archivoInputRef = useRef<HTMLInputElement>(null);
  const [rango, setRango] = useState({ prefijo: 'CHIP', desde: '1', hasta: '200', digitos: '3' });
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  // Paginacion del inventario: 10 por pagina, en el backend.
  const [chipsPagina, setChipsPagina] = useState(1);
  const [chipsPageSize, setChipsPageSize] = useState(10);
  const [chipsResumen, setChipsResumen] = useState({ items: 0, total: 0, page: 1, limit: 10, totalPages: 0 });
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
  const sedeTransferenciaHabilitada = SEDES_TRANSFERENCIA_CHIPS.includes(String(plantaKey));

  const cargar = useCallback(async () => {
    try {
      // Cada pestaña pide sólo lo suyo. Antes se pedían las cuatro cosas
      // siempre, así que un perfil sin uno de los submódulos acumulaba 403 en
      // pantalla aunque nunca abriera esa pestaña.
      const resumenP = puedeInventario
        ? faregasChipsApi.resumen(selectedProductId === '' ? undefined : Number(selectedProductId))
        : Promise.resolve(empty);
      const chipsP = puedeInventario
        ? faregasChipsApi.listar({
            buscar,
            estado: filtroEstado === 'TODOS' ? undefined : filtroEstado,
            page: chipsPagina,
            pageSize: chipsPageSize
          })
        : Promise.resolve({ items: [] as Chip[], total: 0, page: 1, limit: 10, totalPages: 0 });
      // El catálogo de tipos lo usan las dos primeras pestañas.
      const prodsP = (puedeInventario || puedeTipos)
        ? faregasChipsApi.listarProductosInventariables()
        : Promise.resolve([] as ProductoInventariable[]);
      const catP = puedeInventario
        ? faregasChipsApi.catalogosProductosInventariables()
        : Promise.resolve({ sedes: [] as { key: string; nombre: string }[] });

      const [r, l, prods, cat] = await Promise.all([resumenP, chipsP, prodsP, catP]);
      setResumen(r);
      setChips(l.items);
      setChipsResumen({
        items: l.items.length,
        total: Number(l.total || 0),
        page: Number(l.page || chipsPagina),
        limit: Number(l.limit || chipsPageSize),
        totalPages: Number(l.totalPages || 0)
      });
      setProductos(prods);
      setCatalogos(cat);
      if (selectedProductId === '' && prods.length > 0) {
        const defaultProd = prods.find(p => p.codigo === 'CHIP') || prods[0];
        setSelectedProductId(defaultProd.id);
      }
    } catch (error: unknown) {
      setError(errorMessage(error));
    }
  }, [buscar, filtroEstado, selectedProductId, chipsPagina, chipsPageSize, puedeInventario, puedeTipos]);

  // Cualquier cambio de filtro del inventario vuelve a la pagina 1.
  const aplicarFiltroInventario = (campo: 'buscar' | 'estado', valor: string) => {
    setChipsPagina(1);
    if (campo === 'buscar') setBuscar(valor);
    else setFiltroEstado(valor);
  };

  const cambiarChipsPageSize = (nuevo: number) => {
    setChipsPageSize(nuevo);
    setChipsPagina(1);
  };

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
        if (!sedeTransferenciaHabilitada) throw new Error('Los chips sólo pueden transferirse entre COLINA, SURCO y SURQUILLO.');
        if (!destino) throw new Error('Seleccione la sede destino.');
        await faregasChipsApi.transferir(Number(selectedProductId), destino, parsed.validos);
      }
      setMensaje(`${parsed.validos.length} unidad(es) procesada(s) correctamente.`);
      setScan('');
      await cargar();
    } catch (error: unknown) { setError(errorMessage(error)); } finally { setLoading(false); }
  };

  const seleccionarMetodoIngreso = (metodo: MetodoIngreso) => {
    setMetodoIngreso(metodo);
    setError('');
    setMensaje('');
  };

  const importarArchivoChips = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    event.target.value = '';
    if (!archivo) return;

    setError('');
    setMensaje('');
    setCargandoArchivo(true);
    try {
      const extension = archivo.name.split('.').pop()?.toLowerCase();
      let filas: unknown[][];
      if (extension === 'csv' || extension === 'txt') {
        const contenido = await archivo.text();
        filas = contenido.split(/\r?\n/).map((linea) => linea.split(/[;,\t]/));
      } else {
        filas = await readXlsxFile(archivo) as unknown[][];
      }

      const codigos = extraerCodigosDeHoja(filas);
      if (codigos.length === 0) throw new Error('El archivo no contiene códigos de chip. Use una columna llamada CÓDIGO, CHIP, NÚMERO o SERIAL.');
      setScan(codigos.join('\n'));
      setArchivoImportado(archivo.name);
      setMensaje(`${codigos.length} código(s) cargado(s) desde ${archivo.name}. Revise el resumen y confirme el lote.`);
    } catch (error: unknown) {
      setArchivoImportado('');
      setError(`No se pudo leer el archivo. ${errorMessage(error)}`);
    } finally {
      setCargandoArchivo(false);
    }
  };

  const crearListaDesdeRango = () => {
    setError('');
    setMensaje('');
    try {
      const codigos = generarCodigosPorRango(rango);
      setScan(codigos.join('\n'));
      setMensaje(`Rango preparado: ${codigos[0]} hasta ${codigos[codigos.length - 1]} (${codigos.length} códigos).`);
    } catch (error: unknown) {
      setError(errorMessage(error));
    }
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
      return false;
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
      return false;
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
      if (!confirmacion.isConfirmed) return false;

      const resultado = await faregasChipsApi.eliminarTipoChip(prod.id);
      if (Number(selectedProductId) === prod.id) setSelectedProductId('');
      await cargar();
      const partes = [`El tipo de chip "${resultado.nombre}" fue eliminado.`];
      if (resultado.configuracionesSedeEliminadas > 0) partes.push(`${resultado.configuracionesSedeEliminadas} configuración(es) por sede.`);
      if (resultado.chipsEliminados > 0) partes.push(`${resultado.chipsEliminados} serial(es), ${resultado.movimientosEliminados} movimiento(s) y ${resultado.asignacionesOperacionEliminadas} asignación(es) a operaciones.`);
      if (resultado.productosFiscalesDesvinculados > 0) partes.push(`${resultado.productosFiscalesDesvinculados} producto(s) fiscal(es) se conservaron y sólo se desvincularon.`);
      await Swal.fire({ title: 'Tipo de chip eliminado', text: partes.join(' '), icon: 'success', confirmButtonText: 'OK' });
    } catch (error) {
      await Swal.fire({ title: 'No se pudo eliminar', text: errorMessage(error), icon: 'error', confirmButtonText: 'CERRAR' });
      return false;
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
      {PESTANAS.map(({ id, etiqueta, Icono }) => (
        <button key={id} type="button" onClick={() => setActiveTab(id)}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-bold transition ${activeTab === id ? 'bg-[#052A79] text-white shadow' : 'text-slate-600 hover:bg-white'}`}>
          <Icono size={17} /> {etiqueta}
        </button>
      ))}
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
              const sede = (prod.sedes || []).find((s) => s.plantaKey === plantaKey);
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
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setModo('INGRESO'); setDestino(''); setError(''); setMensaje(''); }}
              className={`rounded-lg px-3 py-2.5 text-xs font-bold ${modo === 'INGRESO' ? 'bg-[#052A79] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              INGRESAR CHIPS
            </button>
            <button
              type="button"
              disabled={!sedeTransferenciaHabilitada}
              onClick={() => { setModo('TRANSFERENCIA'); setError(''); setMensaje(''); }}
              className={`rounded-lg px-3 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${modo === 'TRANSFERENCIA' ? 'bg-[#052A79] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              TRANSFERIR ENTRE SEDES
            </button>
          </div>

          {!sedeTransferenciaHabilitada && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              Las transferencias de chips sólo están disponibles en COLINA, SURCO y SURQUILLO.
            </p>
          )}

          <div className="mb-3">
            <label className="mb-1 block text-sm font-bold text-slate-700">Tipo de chip a {modo === 'INGRESO' ? 'ingresar' : 'transferir'}</label>
            <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value ? Number(e.target.value) : '')} className="w-full rounded border border-slate-300 p-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="">Seleccione un tipo de chip</option>
              {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>)}
            </select>
          </div>

          {modo === 'INGRESO' && (
            <div className="mb-4">
              <p className="mb-2 text-sm font-bold text-slate-700">¿Cómo recibirá los códigos?</p>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => seleccionarMetodoIngreso('ESCANEO')}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${metodoIngreso === 'ESCANEO' ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <ScanLine className="h-5 w-5 shrink-0" />
                  <span><b className="block text-xs">ESCANEAR CÓDIGOS</b><small className="text-[11px] text-slate-500">Pase cada chip con el lector; se acumulan en un solo lote.</small></span>
                </button>
                <button
                  type="button"
                  onClick={() => seleccionarMetodoIngreso('EXCEL')}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${metodoIngreso === 'EXCEL' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <FileSpreadsheet className="h-5 w-5 shrink-0" />
                  <span><b className="block text-xs">IMPORTAR EXCEL O CSV</b><small className="text-[11px] text-slate-500">Carga de una vez la lista entregada por el proveedor.</small></span>
                </button>
                <button
                  type="button"
                  onClick={() => seleccionarMetodoIngreso('RANGO')}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${metodoIngreso === 'RANGO' ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <ListOrdered className="h-5 w-5 shrink-0" />
                  <span><b className="block text-xs">INGRESAR RANGO CONSECUTIVO</b><small className="text-[11px] text-slate-500">Úselo sólo si el proveedor confirma que no existen saltos.</small></span>
                </button>
              </div>

              {metodoIngreso === 'EXCEL' && (
                <div className="mt-3 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 p-4 text-center">
                  <input
                    ref={archivoInputRef}
                    type="file"
                    accept=".xlsx,.csv,.txt"
                    onChange={importarArchivoChips}
                    className="hidden"
                  />
                  <p className="text-xs font-semibold text-slate-700">El código debe estar en una columna llamada CÓDIGO, CHIP, NÚMERO o SERIAL.</p>
                  <button
                    type="button"
                    disabled={cargandoArchivo}
                    onClick={() => archivoInputRef.current?.click()}
                    className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {cargandoArchivo ? 'LEYENDO ARCHIVO...' : 'SELECCIONAR ARCHIVO'}
                  </button>
                  {archivoImportado && <p className="mt-2 truncate text-xs text-emerald-700">Archivo: {archivoImportado}</p>}
                </div>
              )}

              {metodoIngreso === 'RANGO' && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="col-span-2 text-xs font-bold text-slate-700">Prefijo
                      <input value={rango.prefijo} onChange={(event) => setRango((actual) => ({ ...actual, prefijo: event.target.value.toUpperCase() }))} placeholder="CHIP" className="mt-1 w-full rounded border border-slate-300 bg-white p-2 font-mono text-sm" />
                    </label>
                    <label className="text-xs font-bold text-slate-700">Desde
                      <input type="number" min="0" value={rango.desde} onChange={(event) => setRango((actual) => ({ ...actual, desde: event.target.value }))} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm" />
                    </label>
                    <label className="text-xs font-bold text-slate-700">Hasta
                      <input type="number" min="0" value={rango.hasta} onChange={(event) => setRango((actual) => ({ ...actual, hasta: event.target.value }))} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm" />
                    </label>
                    <label className="col-span-2 text-xs font-bold text-slate-700">Dígitos del número
                      <input type="number" min="1" max="15" value={rango.digitos} onChange={(event) => setRango((actual) => ({ ...actual, digitos: event.target.value }))} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-sm" />
                    </label>
                  </div>
                  <button type="button" onClick={crearListaDesdeRango} className="mt-3 w-full rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600">CREAR LISTA DEL RANGO</button>
                </div>
              )}
            </div>
          )}

          {modo === 'TRANSFERENCIA' && (
            <div className="mb-3">
              <label className="mb-1 block text-sm font-bold text-slate-700">Sede que recibirá los chips</label>
              <select value={destino} onChange={e => setDestino(e.target.value)} className="w-full rounded border border-slate-300 p-2 text-sm">
                <option value="">Seleccione COLINA, SURCO o SURQUILLO</option>
                {catalogos.sedes.filter(p => p.key !== plantaKey).map(p => <option key={p.key} value={p.key}>{p.nombre}</option>)}
              </select>
              <p className="mt-1 text-xs text-slate-500">No se permite transferir chips a otras sedes.</p>
            </div>
          )}

          <ChipScannerInput
            value={scan}
            onChange={setScan}
            rows={metodoIngreso === 'ESCANEO' || modo === 'TRANSFERENCIA' ? 7 : 5}
            etiquetaValidos={modo === 'INGRESO' ? 'Listos para ingresar' : 'Listos para transferir'}
            placeholder={modo === 'TRANSFERENCIA'
              ? 'Escanee o seleccione los chips que serán transferidos'
              : metodoIngreso === 'ESCANEO'
                ? 'Escanee cada chip; el lector debe enviar Enter después de cada código'
                : 'Aquí aparecerán los códigos cargados. Puede revisarlos antes de confirmar.'}
          />
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}{mensaje && <p className="mt-3 text-sm text-emerald-700">{mensaje}</p>}
          <button
            disabled={loading || selectedProductId === '' || parsed.validos.length === 0 || parsed.duplicados.length > 0 || parsed.errores.length > 0 || (modo === 'TRANSFERENCIA' && (!destino || !sedeTransferenciaHabilitada))}
            onClick={confirmar}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? 'PROCESANDO LOTE...'
              : modo === 'INGRESO'
                ? `INGRESAR LOTE (${parsed.validos.length})`
                : `TRANSFERIR LOTE (${parsed.validos.length})`}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-end">
            <div><h2 className="font-bold">Unidades registradas</h2><p className="mt-1 text-xs text-slate-500">Todos los tipos ubicados actualmente en {plantaNombre}.</p></div>
            <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto w-full sm:w-auto">
              <label className="relative w-full sm:w-48"><span className="mb-1 block text-xs font-bold text-slate-600">Estado</span>
                <select value={filtroEstado} onChange={e => aplicarFiltroInventario('estado', e.target.value)} className="w-full rounded border border-slate-300 py-[7px] px-3 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="TODOS">Todos</option>
                  <option value="DISPONIBLE">Disponibles</option>
                  <option value="RESERVADO">Reservados</option>
                  <option value="VENDIDO">Vendidos</option>
                  <option value="BAJA">Bajas</option>
                </select>
              </label>
              <label className="relative w-full sm:w-72"><span className="mb-1 block text-xs font-bold text-slate-600">Buscar por código o tipo de chip</span><Search className="absolute bottom-2.5 left-3 h-4 w-4 text-slate-400" /><input value={buscar} onChange={e => aplicarFiltroInventario('buscar', e.target.value)} placeholder="Buscar por código o tipo de chip" className="w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none" /></label>
            </div>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs capitalize text-slate-500"><tr>{modo === 'TRANSFERENCIA' && <th className="w-10 p-3"></th>}<th className="p-3">Código del chip</th><th className="p-3">Tipo</th><th className="p-3">Estado</th><th className="p-3">Sede</th><th className="p-3">Ingreso</th><th className="p-3">Último movimiento</th></tr></thead><tbody>{chips.map(c => <tr key={c.id} className="border-t border-slate-100">{modo === 'TRANSFERENCIA' && <td className="p-3"><input type="checkbox" disabled={c.estado !== 'DISPONIBLE' || Number(c.producto_inventariable_id) !== Number(selectedProductId)} checked={scan.split('\n').some(numero => numero.trim() === c.numero_chip)} onChange={e => { if (e.target.checked) { setScan(prev => prev ? `${prev}\n${c.numero_chip}` : c.numero_chip); } else { setScan(prev => prev.split('\n').map(x => x.trim()).filter(x => x && x !== c.numero_chip).join('\n')); } }} className="rounded border-slate-300 text-[#052A79] focus:ring-[#052A79]" /></td>}<td className="p-3 font-mono font-bold">{c.numero_chip}</td><td className="p-3">{c.producto_nombre}</td><td className="p-3"><span className={`inline-block rounded px-2 py-1 text-[10px] font-bold capitalize tracking-wider ${c.estado === 'DISPONIBLE' ? 'bg-emerald-100 text-emerald-800' : c.estado === 'RESERVADO' ? 'bg-amber-100 text-amber-800' : c.estado === 'VENDIDO' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}>{c.estado}</span></td><td className="p-3">{c.planta_nombre}</td><td className="p-3">{new Date(c.creado_en).toLocaleString()}</td><td className="p-3">{c.ultimo_movimiento ? new Date(c.ultimo_movimiento).toLocaleString() : '-'}</td></tr>)}{!chips.length && <tr><td colSpan={modo === 'TRANSFERENCIA' ? 7 : 6} className="p-10 text-center text-slate-400">No se encontraron registros.</td></tr>}</tbody></table></div>
          <Paginacion
            resumen={chipsResumen}
            onCambioPagina={setChipsPagina}
            onCambioPageSize={cambiarChipsPageSize}
            etiqueta="chips"
          />
        </section>
      </div>
    </>}

    {detalleOperacionId !== null && <ModalDetalleVentaChips operacionId={detalleOperacionId} onClose={() => setDetalleOperacionId(null)} onAnular={anularComprobante} puedeVender={puedeVender} anulando={accionEnProceso === detalleOperacionId} />}
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
  const [accionEnProceso, setAccionEnProceso] = useState<number | null>(null);

  // Listado transaccional: abre en HOY -> HOY, 10 por pagina, y pagina en el
  // backend (LIMIT/OFFSET + COUNT con los mismos filtros).
  const listado = useListadoPaginado<VentaChipOperacion>({
    transaccional: true,
    cargar: async (params) => {
      const response = await faregasChipsApi.listarVentas({
        page: Number(params.page || 1),
        pageSize: Number(params.pageSize || 10),
        fechaDesde: String(params.fechaDesde || ''),
        fechaHasta: String(params.fechaHasta || '')
      });
      return {
        items: response.ventas || [],
        total: Number(response.total || 0),
        page: Number(response.page || 1),
        limit: Number(response.limit || 10),
        totalPages: Number(response.totalPages || 0)
      };
    }
  });

  const ventas = listado.items;

  useEffect(() => {
    if (refreshToken > 0) void listado.refrescar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const verComprobante = async (venta: VentaChipOperacion) => {
    if (!venta.facturacion?.enlacePdf?.trim()) {
      await Swal.fire({
        icon: 'info',
        title: 'Comprobante no disponible',
        text: 'Nubefact todavía no ha proporcionado un PDF para este comprobante.',
        confirmButtonColor: '#052A79'
      });
      return;
    }
    window.open(venta.facturacion.enlacePdf, '_blank', 'noopener,noreferrer');
  };

  const anularComprobante = async (operacionId: number, nroComprobante: string | null): Promise<boolean> => {


    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: `🚫 Anular ${nroComprobante || 'comprobante'}`,
      input: 'text',
      inputLabel: 'Motivo de la anulación',
      inputPlaceholder: 'Ingrese el motivo',
      showCancelButton: true,
      confirmButtonText: 'SOLICITAR ANULACIÓN',
      cancelButtonText: 'CANCELAR',
      confirmButtonColor: '#dc2626',
      inputValidator: value => !value.trim()
        ? 'El motivo es obligatorio.'
        : value.trim().length > 100 ? 'El motivo admite como máximo 100 caracteres.' : undefined
    });
    if (!confirmacion.isConfirmed) return false;
    try {
      setAccionEnProceso(operacionId);
      await faregasChipsApi.generarAnulacionOperacion(operacionId, String(confirmacion.value).trim());
      await Swal.fire('Solicitud registrada', 'La anulación fue enviada. Su aceptación debe consultarse posteriormente.', 'success');
      await listado.refrescar();
      return true;
    } catch (error) {
      await Swal.fire('No se pudo anular', errorMessage(error), 'error');
      return false;
    } finally {
      setAccionEnProceso(null);
    }
  };

  const consultarAnulacion = async (venta: VentaChipOperacion) => {
    const anulacionId = venta.facturacion?.anulacionId;
    if (!anulacionId) return;
    try {
      setAccionEnProceso(venta.operacionId);
      const resultado = await faregasChipsApi.consultarAnulacionOperacion(venta.operacionId, anulacionId);
      await Swal.fire('Estado actualizado', `La solicitud se encuentra ${resultado.data.estado}.`, 'success');
      await listado.refrescar();
      return true;
    } catch (error) {
      await Swal.fire('No se pudo consultar', errorMessage(error), 'error');
      return false;
    } finally {
      setAccionEnProceso(null);
    }
  };

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
          <input type="date" value={listado.filtros.fechaDesde || ''} max={listado.filtros.fechaHasta || undefined} onChange={(event) => listado.setFiltro('fechaDesde', event.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700" />
        </label>
        <label className="text-xs font-bold text-slate-600">Hasta
          <input type="date" value={listado.filtros.fechaHasta || ''} min={listado.filtros.fechaDesde || undefined} onChange={(event) => listado.setFiltro('fechaHasta', event.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700" />
        </label>
        <button type="button" onClick={() => listado.aplicarFiltros()} className="rounded-lg bg-[#052A79] px-3 py-2 text-xs font-bold text-white hover:bg-[#041c53]">BUSCAR</button>
        <button type="button" onClick={listado.limpiarFiltros} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">LIMPIAR</button>
      </div>
      {listado.rangoError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{listado.rangoError}</p>}
      {listado.error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{listado.error}</p>}

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
              {listado.loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">Cargando registros...</td></tr>
              ) : ventas.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">No se encontraron registros para el rango seleccionado.</td></tr>
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
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={accionEnProceso === venta.operacionId}
                            onClick={(event) => { event.stopPropagation(); void verComprobante(venta); }}
                            title="Ver comprobante"
                            className="inline-flex h-7 items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 text-[11px] font-bold text-[#052A79] transition hover:bg-blue-100 disabled:opacity-50"
                          ><FileText size={13} /> VER</button>
                          {['BORRADOR', 'PENDIENTE'].includes(String(venta.facturacion.estadoAnulacion || '').toUpperCase()) ? (
                            <button
                              type="button"
                              disabled={accionEnProceso === venta.operacionId || !puedeVender}
                              onClick={(event) => { event.stopPropagation(); void consultarAnulacion(venta); }}
                              title="Consultar estado de anulación"
                              className="inline-flex h-7 items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 text-[11px] font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                            ><RefreshCw size={13} className={accionEnProceso === venta.operacionId ? 'animate-spin' : ''} /> CONSULTAR</button>
                          ) : String(venta.facturacion.estadoAnulacion || '').toUpperCase() === 'ACEPTADO' || venta.facturacion.estado === 'ANULADO' ? (
                            <button type="button" disabled title="Comprobante anulado" className="inline-flex h-7 items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 text-[11px] font-bold text-slate-400">
                              <Ban size={13} /> ANULADO
                            </button>
                          ) : puedeVender && venta.facturacion.anulacionEnPlazo === true ? (
                            <button
                              type="button"
                              disabled={accionEnProceso === venta.operacionId}
                              onClick={(event) => { event.stopPropagation(); void anularComprobante(venta.operacionId, venta.facturacion!.nroComprobante); }}
                              title="Anular comprobante"
                              className="inline-flex h-7 items-center gap-1 rounded border border-red-200 bg-red-50 px-2 text-[11px] font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                            ><Ban size={13} /> ANULAR</button>
                          ) : null}
                        </div>
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
        <Paginacion
          resumen={listado.resumen}
          onCambioPagina={listado.irAPagina}
          onCambioPageSize={listado.cambiarPageSize}
          etiqueta="ventas"
          deshabilitado={listado.loading}
        />
      </div>
    </div>
  );
}

