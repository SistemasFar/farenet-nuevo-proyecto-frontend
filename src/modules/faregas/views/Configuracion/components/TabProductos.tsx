import { faregasChipsApi } from '../../../services/faregas-chips.api';
import Swal from 'sweetalert2';
import { Edit, Link2, Power, PowerOff, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  faregasConfigApi,
  type CategoriaServicio,
  type SedeTarifaAsignada,
  type ServicioConfiguracionFaregas
} from '../../../services/faregas-config.api';
import {
  faregasProductosApi,
  type ImpactoProductoFiscal,
  type ProductoFacturacion
} from '../../../services/faregas-productos.api';
import { exportarExcel } from '../../../utils/exportar-excel';

const productoVacio = (): Partial<ProductoFacturacion> => ({
  codigo_sku: '', descripcion: '', tipo_producto: 'Producto', categoria_dms: null,
  categoria_id: null,
  cuenta_por_cobrar: null, unidad: 'NIU', precio_unitario: null,
  precio_referencia: null, valor_referencial_unitario: null,
  codigo_clasificacion_sunat: null, tipo_afectacion_igv: '10',
  porcentaje_isc: null, disponible_pos: false, es_para_venta: true,
  es_para_compra: false, tiene_icbper: false, activo: true,
  requiere_chip: false, producto_chip_id: null, precio_chip: null
});

const nullableNumber = (value: string) => value === '' ? null : Number(value);
const escaparHtml = (value: string) => value.replace(/[&<>'"]/g, (caracter) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[caracter] || caracter));

const listaImpacto = (items: string[], vacio: string) => items.length > 0
  ? `<ul class="text-left text-xs leading-5">${items.map((item) => `<li>• ${escaparHtml(item)}</li>`).join('')}</ul>`
  : `<p class="text-left text-xs text-slate-500">${escaparHtml(vacio)}</p>`;

const renderImpactoEliminacion = (impacto: ImpactoProductoFiscal) => {
  const esConjunto = impacto.requiereConfirmacionConjunto;
  const operaciones = impacto.operaciones.map((operacion) => {
    const productos = operacion.productos.map((producto) => `${producto.codigo_sku || 'SIN SKU'} — ${producto.descripcion || 'Sin descripción'}`);
    const detalles = operacion.detalles.map((detalle) => `#${detalle.id} ${detalle.descripcion_snapshot || detalle.producto_descripcion || 'Detalle'}`).join(' · ');
    return `#${operacion.id} [${operacion.mixta ? 'MIXTA' : operacion.estado || 'SIN ESTADO'}] · ${productos.join(' | ')} · detalles: ${detalles}`;
  });
  const otros = impacto.otrosProductos.map((producto) => `${producto.codigo_sku || 'SIN SKU'} — ${producto.descripcion || 'Sin descripción'}`);
  const certificados = impacto.certificados.map((certificado) => `#${certificado.id} · ${certificado.numero_certificado || 'sin número'} · ${certificado.estado || 'sin estado'}`);
  const certificadosAEliminar = impacto.certificadosMixtos
    .filter((certificado) => impacto.certificadosAEliminar.includes(certificado.id))
    .map((certificado) => `#${certificado.id} · ${certificado.numero_certificado || 'sin número'} · ${certificado.estado || 'sin estado'}`);
  const certificadosPreservados = impacto.certificados
    .filter((certificado) => !impacto.certificadosAEliminar.includes(certificado.id))
    .map((certificado) => `#${certificado.id} · ${certificado.numero_certificado || 'sin número'} · ${certificado.estado || 'sin estado'}`);
  const facturas = impacto.facturaciones.map((factura) => `#${factura.id} · ${factura.nro_comprobante || 'sin comprobante'} · ${factura.estado || 'sin estado'}`);
  const ordenes = impacto.ordenesPago.map((orden) => `#${orden.id} · ${orden.estado || 'sin estado'} · S/ ${Number(orden.importe_total || 0).toFixed(2)}`);
  const pagos = impacto.pagos.map((pago) => `#${pago.id} · S/ ${Number(pago.importe || 0).toFixed(2)}`);
  const financieroRelacionado = impacto.financieroRelacionado;
  const financierosPreservados = financieroRelacionado
    ? financieroRelacionado.facturaciones.length + financieroRelacionado.ordenesPago.length + financieroRelacionado.pagos.length
    : 0;
  const tarifas = impacto.tarifas.map((tarifa) => `#${tarifa.id} · ${tarifa.tarifa_codigo || 'sin código'} · sede ${tarifa.planta_key || '-'}`);
  const servicios = impacto.servicios.map((servicio) => `#${servicio.id} · ${servicio.nombre || servicio.codigo || 'sin nombre'}${servicio.tiene_otra_tarifa_activa ? ' (compartido)' : ' (exclusivo)'}`);
  const mappings = [
    ...impacto.mappings.producto_sede.map((row) => `fg_producto_sede #${(row as { id?: number }).id ?? '?'} · sede ${(row as { planta_key?: string }).planta_key ?? '-'}`),
    ...impacto.mappings.producto_inventariable.map((row) => `fg_producto_inventariable #${(row as { id?: number }).id ?? '?'} · ${(row as { codigo?: string }).codigo ?? '-'}`),
    ...impacto.mappings.producto_inventariable_sede.map((row) => `fg_producto_inventariable_sede #${(row as { id?: number }).id ?? '?'} · sede ${(row as { planta_key?: string }).planta_key ?? '-'}`)
  ];

  return `<div class="space-y-3 text-left">
    ${esConjunto ? '<p class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">Este producto pertenece a operaciones de prueba que también contienen otros productos. Al continuar se eliminarán esas operaciones mixtas, sus detalles y sus registros financieros relacionados. Los demás productos del catálogo no se eliminarán.</p>' : '<p class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Se eliminará el producto y su configuración operativa. Los históricos con snapshot se conservarán.</p>'}
    <div><p class="mb-1 text-sm font-bold">Operaciones identificadas (${impacto.operaciones.length})</p>${listaImpacto(operaciones, 'Sin operaciones históricas.')}</div>
    ${esConjunto ? `<div><p class="mb-1 text-sm font-bold">Otros productos que permanecen en catálogo</p>${listaImpacto(otros, 'No se identificaron otros productos.')}</div>` : ''}
    <div><p class="mb-1 text-sm font-bold">Certificados (${certificados.length})</p>${listaImpacto(certificados, 'Sin certificados relacionados.')}</div>
    ${esConjunto ? `<div><p class="mb-1 text-sm font-bold text-red-700">Certificados que se eliminarán (${certificadosAEliminar.length})</p>${listaImpacto(certificadosAEliminar, 'No se eliminarán certificados.')}</div>` : ''}
    ${esConjunto ? `<div><p class="mb-1 text-sm font-bold">Certificados que se conservarán/desvincularán (${certificadosPreservados.length})</p>${listaImpacto(certificadosPreservados, 'No hay certificados a conservar.')}</div>` : ''}
    <div><p class="mb-1 text-sm font-bold">Facturaciones (${facturas.length})</p>${listaImpacto(facturas, 'Sin facturaciones relacionadas.')}</div>
    <div><p class="mb-1 text-sm font-bold">Órdenes de pago (${ordenes.length})</p>${listaImpacto(ordenes, 'Sin órdenes de pago relacionadas.')}</div>
    <div><p class="mb-1 text-sm font-bold">Pagos (${pagos.length})</p>${listaImpacto(pagos, 'Sin pagos relacionados.')}</div>
    ${financierosPreservados > 0 ? `<p class="text-xs text-slate-500">Registros financieros relacionados que permanecerán preservados: ${financierosPreservados}.</p>` : ''}
    <div><p class="mb-1 text-sm font-bold">Tarifas (${tarifas.length})</p>${listaImpacto(tarifas, 'Sin tarifas relacionadas.')}</div>
    <div><p class="mb-1 text-sm font-bold">Mappings (${mappings.length})</p>${listaImpacto(mappings, 'Sin mappings relacionados.')}</div>
    <div><p class="mb-1 text-sm font-bold">Servicios (${servicios.length})</p>${listaImpacto(servicios, 'Sin servicios relacionados.')}</div>
    <p class="text-xs text-slate-500">No se modificarán correlativos, series fiscales ni Nubefact.</p>
  </div>`;
};

interface Props {
  canViewRelations?: boolean;
  canViewTarifas?: boolean;
  onGoToTarifas?: () => void;
}

interface VinculacionOperativa {
  servicios: string[];
  sedesActivas: string[];
}

export default function TabProductos({ canViewRelations = false, canViewTarifas = false, onGoToTarifas }: Props) {
  const [productos, setProductos] = useState<ProductoFacturacion[]>([]);
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([]);
  const [chipsOpciones, setChipsOpciones] = useState<{ id: number; codigo: string; nombre: string; }[]>([]);
  const [servicios, setServicios] = useState<ServicioConfiguracionFaregas[]>([]);
  const [sedesPorServicio, setSedesPorServicio] = useState<Record<number, SedeTarifaAsignada[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('');
  const [paraVenta, setParaVenta] = useState('');
  const [unidad, setUnidad] = useState('');
  const [categoria, setCategoria] = useState('');
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [actual, setActual] = useState<Partial<ProductoFacturacion>>(productoVacio());
  const [saving, setSaving] = useState(false);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const [productoGuardado, setProductoGuardado] = useState('');

  const cargar = async () => {
    try {
      setLoading(true);
      setError('');
      const [productosData, categoriasData, chipsData, relacionesData] = await Promise.all([
        faregasProductosApi.listar(),
        faregasConfigApi.obtenerCategorias(true),
        faregasChipsApi.listarCatalogoChipsFiscales().catch(() => []),

        canViewRelations
          ? Promise.all([faregasConfigApi.getServicios(), faregasConfigApi.obtenerSedesPorServicio()]).catch(() => null)
          : Promise.resolve(null)
      ]);
      setProductos(productosData);
      setCategorias(categoriasData);
      setChipsOpciones(chipsData || []);
      if (relacionesData) {
        setServicios(relacionesData[0]);
        setSedesPorServicio(relacionesData[1]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelado = false;
    void Promise.all([
      faregasProductosApi.listar(),
      faregasConfigApi.obtenerCategorias(true),
      canViewRelations
        ? Promise.all([faregasConfigApi.getServicios(), faregasConfigApi.obtenerSedesPorServicio()]).catch(() => null)
        : Promise.resolve(null)
    ,
      faregasChipsApi.listarCatalogoChipsFiscales().catch(() => [])
    ])
      .then(([productosData, categoriasData, relacionesData, chipsData]) => {
        if (cancelado) return;
        setProductos(productosData);
        setCategorias(categoriasData);
        setChipsOpciones(chipsData as any || []);
        if (relacionesData) {
          setServicios(relacionesData[0]);
          setSedesPorServicio(relacionesData[1]);
        }
      })
      .catch((err) => { if (!cancelado) setError(err instanceof Error ? err.message : 'Error al cargar productos'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [canViewRelations]);

  const vinculaciones = useMemo(() => {
    const mapa = new Map<number, { servicios: Set<string>; sedesActivas: Set<string> }>();
    for (const servicio of servicios) {
      for (const tarifa of sedesPorServicio[servicio.id] || []) {
        if (!tarifa.producto_facturacion_id) continue;
        const actualVinculacion = mapa.get(tarifa.producto_facturacion_id) || {
          servicios: new Set<string>(),
          sedesActivas: new Set<string>()
        };
        actualVinculacion.servicios.add(servicio.nombre);
        if (tarifa.activo) actualVinculacion.sedesActivas.add(tarifa.nombre);
        mapa.set(tarifa.producto_facturacion_id, actualVinculacion);
      }
    }

    return new Map<number, VinculacionOperativa>([...mapa.entries()].map(([productoId, relacion]) => [
      productoId,
      {
        servicios: [...relacion.servicios].sort(),
        sedesActivas: [...relacion.sedesActivas].sort()
      }
    ]));
  }, [sedesPorServicio, servicios]);

  const unidades = useMemo(() => [...new Set(productos.map((p) => p.unidad).filter(Boolean) as string[])].sort(), [productos]);
  const filtrados = useMemo(() => productos.filter((producto) => {
    const texto = buscar.trim().toLowerCase();
    const coincideTexto = !texto
      || producto.codigo_sku.toLowerCase().includes(texto)
      || producto.descripcion.toLowerCase().includes(texto);
    const coincideEstado = !estado || (estado === '1' ? producto.activo : !producto.activo);
    const coincideVenta = !paraVenta || (paraVenta === '1' ? producto.es_para_venta : !producto.es_para_venta);
    const coincideUnidad = !unidad || producto.unidad === unidad;
    const coincideCategoria = !categoria
      || (categoria === 'SIN_CATEGORIA' ? !producto.categoria_id : String(producto.categoria_id || '') === categoria);
    return coincideTexto && coincideEstado && coincideVenta && coincideUnidad && coincideCategoria;
  }), [productos, buscar, estado, paraVenta, unidad, categoria]);

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    const unidadTributaria = String(actual.unidad || '').trim().toUpperCase();
    const codigoSunat = String(actual.codigo_clasificacion_sunat || '').trim();
    if (actual.es_para_venta && !['NIU', 'ZZ'].includes(unidadTributaria)) {
      alert('La unidad tributaria para venta debe ser NIU o ZZ.');
      return;
    }
    if (codigoSunat && !/^\d{8}$/.test(codigoSunat)) {
      alert('El código SUNAT es opcional; si se registra, debe tener exactamente 8 dígitos.');
      return;
    }
    try {
      setSaving(true);
      if (mode === 'CREATE') await faregasProductosApi.crear(actual);
      else if (actual.id) await faregasProductosApi.editar(actual.id, actual);
      setProductoGuardado(String(actual.codigo_sku || ''));
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

  const eliminarProducto = async (producto: ProductoFacturacion) => {
    setEliminando(producto.id);
    try {
      // La papelera primero solicita el impacto; esta consulta es read-only.
      const impacto = await faregasProductosApi.obtenerImpacto(producto.id);
      const esConjunto = impacto.requiereConfirmacionConjunto;
      const confirmacion = await Swal.fire({
        title: esConjunto ? 'ELIMINAR PRODUCTO Y CONJUNTO DE PRUEBA' : 'ELIMINAR PRODUCTO',
        html: renderImpactoEliminacion(impacto),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: esConjunto ? 'ELIMINAR TODO EL CONJUNTO DE PRUEBA' : 'ELIMINAR TODO',
        cancelButtonText: 'CANCELAR',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        reverseButtons: true,
        focusCancel: true,
        width: '760px'
      });
      if (!confirmacion.isConfirmed) return;

      const resultado = await faregasProductosApi.eliminar(producto.id, {
        confirmarConjunto: esConjunto
      });
      await cargar();
      const conjunto = resultado.conjuntoPrueba;
      await Swal.fire({
        title: 'Eliminación completada',
        text: conjunto
          ? `Eliminadas ${conjunto.operacionesEliminadas} operación(es) mixta(s), ${conjunto.detallesEliminados} detalle(s) y ${conjunto.certificadosEliminados} certificado(s) de prueba. ${producto.codigo_sku} y su configuración ya no están disponibles.`
          : `El producto y su configuración asociada ya no están disponibles. Se limpiaron ${resultado.tarifasEliminadas + resultado.tarifasDesvinculadas} tarifa(s) y se desactivaron ${resultado.serviciosDesactivados} servicio(s).`,
        icon: 'success',
        confirmButtonText: 'OK'
      });
    } catch (err) {
      await Swal.fire({
        title: 'No se pudo eliminar',
        text: err instanceof Error ? err.message : 'Ocurrió un error al eliminar el producto. No se eliminó nada.',
        icon: 'error',
        confirmButtonText: 'CERRAR'
      });
    } finally {
      setEliminando(null);
    }
  };

  return (
    <div>
      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="flex items-start gap-3">
          <Link2 className="mt-0.5 shrink-0" size={19} />
          <div>
            <p className="font-bold">Este es el catálogo principal de lo que FAREGAS factura.</p>
            <p className="mt-1 text-blue-800">Cada SKU contiene los datos tributarios enviados a Nubefact. La sede, el precio y la operación interna se vinculan una sola vez desde Tarifas por sede.</p>
          </div>
        </div>
      </div>

      {productoGuardado && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
          <div><span className="font-bold">SKU {productoGuardado} guardado.</span> {canViewTarifas ? 'Ahora puedes asignarlo a una sede, precio y operación.' : 'La vinculación operativa requiere permiso de Tarifas por sede.'}</div>
          {canViewTarifas && onGoToTarifas && <button type="button" onClick={onGoToTarifas} className="shrink-0 rounded-lg bg-[#052A79] px-4 py-2 font-bold text-white">Vincular en Tarifas por sede</button>}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
        <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar código o descripción..." className="rounded-lg border border-slate-300 p-2 text-sm focus:border-[#052A79] focus:outline-none lg:col-span-2" />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Categoría: Todas</option><option value="SIN_CATEGORIA">Sin categoría</option>{categorias.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Estado: Todos</option><option value="1">Activos</option><option value="0">Inactivos</option></select>
        <select value={paraVenta} onChange={(e) => setParaVenta(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Para venta: Todos</option><option value="1">Sí</option><option value="0">No</option></select>
        <select value={unidad} onChange={(e) => setUnidad(e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Unidad: Todas</option>{unidades.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div><div className="font-semibold text-gray-700">Productos fiscales</div><div className="text-xs text-slate-500">{filtrados.length} de {productos.length} productos · {vinculaciones.size} vinculados a la operación</div></div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || filtrados.length === 0}
              onClick={() => exportarExcel('faregas_productos', 'Productos', [
                { key: 'sku', header: 'SKU', width: 18 },
                { key: 'descripcion', header: 'DESCRIPCIÓN', width: 60 },
                { key: 'categoria', header: 'CATEGORÍA', width: 24 },
                { key: 'unidad', header: 'UNIDAD', width: 12 },
                { key: 'igv', header: 'AFECTACIÓN IGV', width: 18 },
                { key: 'cuenta', header: 'CUENTA POR COBRAR', width: 30 },
                { key: 'precio', header: 'PRECIO REFERENCIA', width: 20 },
                { key: 'venta', header: 'PARA VENTA', width: 14 },
                { key: 'estado', header: 'ESTADO', width: 14 }
              ], filtrados.map((producto) => ({
                sku: producto.codigo_sku,
                descripcion: producto.descripcion,
                categoria: producto.categoria_nombre || 'SIN CATEGORÍA',
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
            <button onClick={() => { setMode('CREATE'); setActual(productoVacio()); setProductoGuardado(''); setModal(true); }} className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white">+ Nuevo Producto</button>
          </div>
        </div>
        {loading ? <div className="py-10 text-center">Cargando productos...</div>
          : error ? <div className="py-10 text-center text-red-500">{error}</div>
          : <div className="max-h-[58vh] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-gray-200 bg-white text-xs capitalize text-gray-500"><tr><th className="px-3 py-3">SKU / producto</th><th className="px-3 py-3">Datos fiscales</th><th className="px-3 py-3">Uso operativo</th><th className="px-3 py-3 text-center">Sedes activas</th><th className="px-3 py-3 text-right">Precio referencia</th><th className="px-3 py-3 text-center">Estado</th><th className="px-3 py-3 text-center">Acciones</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{filtrados.map((producto) => {
                const vinculacion = vinculaciones.get(producto.id);
                return <tr key={producto.id} className="hover:bg-gray-50">
                  <td className="min-w-64 px-3 py-3"><div className="font-mono font-bold text-gray-700">{producto.codigo_sku}</div><div className="mt-1 font-medium text-gray-800">{producto.descripcion}</div><div className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${producto.categoria_id ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{producto.categoria_nombre || 'SIN CATEGORÍA'}</div></td>
                  <td className="min-w-48 px-3 py-3 text-xs"><div>Unidad: <b>{producto.unidad || '-'}</b> · IGV: <b>{producto.tipo_afectacion_igv || '-'}</b></div><div className="mt-1 text-slate-500">SUNAT: {producto.codigo_clasificacion_sunat || 'Opcional / no registrado'}</div><div className="mt-1 text-slate-500">Cuenta: {producto.cuenta_por_cobrar || '-'}</div></td>
                  <td className="min-w-60 px-3 py-3 text-xs">{vinculacion ? <div className="font-semibold text-slate-800">{vinculacion.servicios.join(', ')}</div> : <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">SIN VINCULAR</span>}</td>
                  <td className="px-3 py-3 text-center">{vinculacion ? <><div className="font-bold text-slate-800">{vinculacion.sedesActivas.length}</div><div className="max-w-40 truncate text-xs text-slate-500" title={vinculacion.sedesActivas.join(', ')}>{vinculacion.sedesActivas.join(', ') || 'Sin tarifa activa'}</div></> : '-'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">{producto.precio_referencia == null ? '-' : `S/ ${producto.precio_referencia.toFixed(2)}`}</td>
                  <td className="px-3 py-3 text-center"><div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${producto.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{producto.activo ? 'ACTIVO' : 'INACTIVO'}</span></div><div className="mt-2 text-xs text-slate-500">{producto.es_para_venta ? 'Para venta' : 'No vendible'}</div></td>
                  <td className="px-3 py-3 text-center"><div className="flex justify-center gap-2"><button onClick={() => { setMode('EDIT'); setActual(producto); setProductoGuardado(''); setModal(true); }} title="Editar" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[#052A79] transition-colors hover:bg-blue-100"><Edit size={18} /></button><button onClick={() => void eliminarProducto(producto)} disabled={eliminando === producto.id} title="Eliminar" className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-red-600 transition-colors hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"><Trash2 size={18} /></button><button onClick={() => void cambiarEstado(producto)} title={producto.activo ? 'Desactivar' : 'Activar'} className={producto.activo ? 'rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[#052A79] transition-colors hover:bg-red-100' : 'rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-[#052A79] transition-colors hover:bg-green-100'}>{producto.activo ? <PowerOff size={18} /> : <Power size={18} />}</button></div></td>
                </tr>;
              })}</tbody>
            </table>
          </div>}
      </div>

      {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"><h3 className="mb-2 text-xl font-bold text-[#052A79]">{mode === 'CREATE' ? 'Nuevo producto fiscal' : 'Editar producto fiscal'}</h3><p className="mb-4 text-sm text-slate-600">Aquí se registran únicamente los datos del concepto facturable. La sede, tarifa y operación se asignan después sin duplicar el producto.</p><form onSubmit={guardar} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label className="mb-1 block text-sm font-semibold">Código SKU</label><input required disabled={mode === 'EDIT'} value={actual.codigo_sku || ''} onChange={(e) => setActual({ ...actual, codigo_sku: e.target.value })} className="w-full rounded-lg border p-2 disabled:bg-slate-100" /></div><div><label className="mb-1 block text-sm font-semibold">Categoría</label><select required value={actual.categoria_id || ''} onChange={(e) => setActual({ ...actual, categoria_id: e.target.value ? Number(e.target.value) : null })} className="w-full rounded-lg border bg-white p-2"><option value="">Seleccionar categoría...</option>{categorias.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.codigo})</option>)}</select></div></div>
        <div><label className="mb-1 block text-sm font-semibold">Unidad tributaria</label><select required value={actual.unidad || 'NIU'} onChange={(e) => setActual({ ...actual, unidad: e.target.value })} className="w-full rounded-lg border bg-white p-2"><option value="NIU">NIU — Bien / unidad</option><option value="ZZ">ZZ — Servicio</option></select></div>
        <div><label className="mb-1 block text-sm font-semibold">Nombre del certificado</label><input required value={actual.descripcion || ''} onChange={(e) => setActual({ ...actual, descripcion: e.target.value })} className="w-full rounded-lg border p-2" /></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label className="mb-1 block text-sm font-semibold">Tipo afectación IGV</label><input maxLength={2} value={actual.tipo_afectacion_igv || ''} onChange={(e) => setActual({ ...actual, tipo_afectacion_igv: e.target.value })} className="w-full rounded-lg border p-2" /></div><div><label className="mb-1 block text-sm font-semibold">Código producto SUNAT <span className="font-normal text-slate-500">(opcional)</span></label><input inputMode="numeric" maxLength={8} value={actual.codigo_clasificacion_sunat || ''} onChange={(e) => setActual({ ...actual, codigo_clasificacion_sunat: e.target.value.replace(/\D/g, '') })} className="w-full rounded-lg border p-2" /></div></div>
        <div><label className="mb-1 block text-sm font-semibold">Cuenta por Cobrar</label><input value={actual.cuenta_por_cobrar || ''} onChange={(e) => setActual({ ...actual, cuenta_por_cobrar: e.target.value })} className="w-full rounded-lg border p-2" /></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-1"><div><label className="mb-1 block text-sm font-semibold">Precio unitario</label><input type="number" min="0" step="0.0001" value={actual.precio_unitario ?? ''} onChange={(e) => setActual({ ...actual, precio_unitario: nullableNumber(e.target.value) })} className="w-full rounded-lg border p-2" /></div>{/* Precio referencia */}{/* Valor referencial */}</div>
        <div className="flex flex-wrap gap-5 border-t pt-4">{[['es_para_venta','Es para venta'],['disponible_pos','Disponible POS'],['es_para_compra','Es para compra'],['tiene_icbper','Tiene ICBPER']].map(([campo,label]) => <label key={campo} className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(actual[campo as keyof ProductoFacturacion])} onChange={(e) => setActual({ ...actual, [campo]: e.target.checked })} />{label}</label>)}<label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" disabled={mode === 'EDIT'} checked={Boolean(actual.activo)} onChange={(e) => setActual({ ...actual, activo: e.target.checked })} />Activo</label>
        </div>
        <div className="border-t pt-4">
          <label className="flex items-center gap-2 text-sm font-semibold mb-3">
            <input type="checkbox" checked={Boolean(actual.requiere_chip)} onChange={(e) => {
              const checked = e.target.checked;
              setActual({
                ...actual,
                requiere_chip: checked,
                producto_chip_id: checked ? actual.producto_chip_id : null,
                precio_chip: checked ? actual.precio_chip : null
              });
            }} />
            Agregar chip
          </label>
          {actual.requiere_chip && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold">Tipo de chip
                <select required value={actual.producto_chip_id || ''} onChange={(e) => setActual({ ...actual, producto_chip_id: e.target.value ? Number(e.target.value) : null })} className="mt-1 w-full rounded-lg border bg-white p-2">
                  <option value="">Seleccionar tipo de chip...</option>
                  {chipsOpciones.map(chip => <option key={chip.id} value={chip.id}>{chip.codigo} - {chip.nombre}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">Monto del chip
                <div className="mt-1 flex overflow-hidden rounded-lg border bg-white">
                  <span className="flex items-center bg-slate-50 px-3 text-slate-600">S/</span>
                  <input required type="number" min="0.01" step="0.01" value={actual.precio_chip ?? ''} onChange={(e) => setActual({ ...actual, precio_chip: nullableNumber(e.target.value) })} className="min-w-0 flex-1 p-2 outline-none" placeholder="0.00" />
                </div>
                <span className="mt-1 block text-xs font-normal text-slate-500">Se suma completo al precio del certificado; no recibe descuentos.</span>
              </label>
            </div>
          )}</div>
        <div className="flex justify-end gap-3 border-t pt-4"><button type="button" disabled={saving} onClick={() => setModal(false)} className="rounded px-5 py-2 font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button><button type="submit" disabled={saving} className="rounded bg-[#052A79] px-5 py-2 font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button></div>
      </form></div></div>}
    </div>
  );
}
