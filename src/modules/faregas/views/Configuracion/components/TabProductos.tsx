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
import { exportarProductosFiscales } from '../../../utils/faregas-productos-exportacion';
import { Paginacion } from '../../components/Paginacion';

const productoVacio = (): Partial<ProductoFacturacion> => ({
  codigo_sku: '', descripcion: '', tipo_producto: 'Producto', categoria_dms: null,
  categoria_id: null,
  cuenta_por_cobrar: null, codigo_barras: null, unidad: 'NIU', precio_unitario: null,
  precio_referencia: null, valor_referencial_unitario: null,
  codigo_clasificacion_sunat: null, tipo_afectacion_igv: '10',
  codigo_afectacion_isc: null, porcentaje_isc: null,
  disponible_pos: false, es_para_venta: true,
  es_para_compra: false, tiene_icbper: false, activo: true,
  imagen_url: null,
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
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('');
  const [paraVenta, setParaVenta] = useState('');
  const [unidad, setUnidad] = useState('');
  const [categoria, setCategoria] = useState('');
  // La búsqueda y los filtros se resuelven en el backend: el texto se aplica
  // antes del LIMIT/OFFSET, así que un SKU de la página 28 aparece al buscarlo.
  const [buscarAplicado, setBuscarAplicado] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [resumen, setResumen] = useState({ items: 0, total: 0, page: 1, limit: 10, totalPages: 0 });
  // Catálogo de unidades completo, lo devuelve el backend junto al listado.
  const [catalogoUnidades, setCatalogoUnidades] = useState<string[]>([]);
  // Se incrementa tras crear/editar/eliminar para recargar conservando filtros.
  const [refreshToken, setRefreshToken] = useState(0);
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [actual, setActual] = useState<Partial<ProductoFacturacion>>(productoVacio());
  const [saving, setSaving] = useState(false);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const [productoGuardado, setProductoGuardado] = useState('');

  // Recarga los catálogos de referencia y dispara un refresco del listado.
  // El listado de productos NO se carga aquí: lo lleva su propio efecto, que
  // depende de los filtros, para no duplicar peticiones.
  const cargar = async () => {
    try {
      setLoading(true);
      setError('');
      const [categoriasData, chipsData, relacionesData] = await Promise.all([
        faregasConfigApi.obtenerCategorias(true),
        faregasChipsApi.listarCatalogoChipsFiscales().catch(() => []),

        canViewRelations
          ? Promise.all([faregasConfigApi.getServicios(), faregasConfigApi.obtenerSedesPorServicio()]).catch(() => null)
          : Promise.resolve(null)
      ]);
      setCategorias(categoriasData);
      setChipsOpciones(chipsData || []);
      if (relacionesData) {
        setServicios(relacionesData[0]);
        setSedesPorServicio(relacionesData[1]);
      }
      setRefreshToken((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelado = false;
    void Promise.all([
      faregasConfigApi.obtenerCategorias(true),
      canViewRelations
        ? Promise.all([faregasConfigApi.getServicios(), faregasConfigApi.obtenerSedesPorServicio()]).catch(() => null)
        : Promise.resolve(null)
    ,
      faregasChipsApi.listarCatalogoChipsFiscales().catch(() => [])
    ])
      .then(([categoriasData, relacionesData, chipsData]) => {
        if (cancelado) return;
        setCategorias(categoriasData);
        setChipsOpciones(chipsData || []);
        if (relacionesData) {
          setServicios(relacionesData[0]);
          setSedesPorServicio(relacionesData[1]);
        }
      })
      .catch((err) => { if (!cancelado) setError(err instanceof Error ? err.message : 'Error al cargar productos'); });
    return () => { cancelado = true; };
  }, [canViewRelations]);

  // Debounce del texto: el input cambia en cada pulsación, pero la consulta
  // sólo sale cuando el usuario deja de escribir. El reset a la página 1 va
  // aquí para que texto y página cambien en la misma tanda.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      setBuscarAplicado(buscar.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(temporizador);
  }, [buscar]);

  // Un ÚNICO efecto carga el listado. Depende del texto debounced (no del
  // input crudo), así que no hay request storm ni bucle setState -> useEffect.
  useEffect(() => {
    let cancelado = false;
    const cargarProductos = () => {
      setLoading(true);
      void faregasProductosApi.listarPaginado({
        buscar: buscarAplicado || undefined,
        activo: estado === '' ? undefined : estado === '1',
        es_para_venta: paraVenta === '' ? undefined : paraVenta === '1',
        unidad: unidad || undefined,
        categoria_id: categoria || undefined,
        page,
        pageSize
      })
        .then((r) => {
          if (cancelado) return;
          setProductos(r.items);
          setResumen({
            items: r.items.length,
            total: r.total,
            page: r.page,
            limit: r.limit,
            totalPages: r.totalPages
          });
          if (r.unidades.length) setCatalogoUnidades(r.unidades);
          setError('');
        })
        .catch((err: unknown) => {
          if (!cancelado) setError(err instanceof Error ? err.message : 'Error al cargar productos');
        })
        .finally(() => { if (!cancelado) setLoading(false); });
    };

    // Las categorías, los chips y las relaciones los carga el efecto de arriba:
    // no dependen de los filtros del listado, así que no se piden aquí.
    cargarProductos();
    return () => { cancelado = true; };
  }, [buscarAplicado, estado, paraVenta, unidad, categoria, page, pageSize, refreshToken]);

  const irAPagina = (nueva: number) => setPage(nueva);
  const cambiarPageSize = (nuevo: number) => {
    setPageSize(nuevo);
    setPage(1);
  };
  // Cada filtro devuelve a la página 1.
  const filtrar = (campo: 'estado' | 'paraVenta' | 'unidad' | 'categoria', valor: string) => {
    setPage(1);
    if (campo === 'estado') setEstado(valor);
    else if (campo === 'paraVenta') setParaVenta(valor);
    else if (campo === 'unidad') setUnidad(valor);
    else setCategoria(valor);
  };

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

  // El listado ya viene filtrado y paginado del backend: `productos` ES la
  // página actual del resultado. Filtrar aquí en memoria sólo podía mirar esos
  // 10 registros, por eso buscar un SKU de otra página devolvía 0 resultados.
  const unidades = catalogoUnidades;

  const exportarProductos = async () => {
    try {
      setExportando(true);
      const resultadoCompleto = await faregasProductosApi.listarTodos({
        buscar: buscarAplicado || undefined,
        activo: estado === '' ? undefined : estado === '1',
        es_para_venta: paraVenta === '' ? undefined : paraVenta === '1',
        unidad: unidad || undefined,
        categoria_id: categoria || undefined
      });
      exportarProductosFiscales(resultadoCompleto);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo exportar el catálogo de productos.');
    } finally {
      setExportando(false);
    }
  };

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    const unidadTributaria = String(actual.unidad || '').trim().toUpperCase();
    if (actual.es_para_venta && !['NIU', 'ZZ'].includes(unidadTributaria)) {
      alert('La unidad tributaria para venta debe ser NIU o ZZ.');
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

  const vinculacionActual = actual.id ? vinculaciones.get(actual.id) : undefined;

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
        <select value={categoria} onChange={(e) => filtrar('categoria', e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Tipo de certificado: Todos</option><option value="SIN_CATEGORIA">Sin tipo de certificado</option>{categorias.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select>
        <select value={estado} onChange={(e) => filtrar('estado', e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Estado: Todos</option><option value="1">Activos</option><option value="0">Inactivos</option></select>
        <select value={paraVenta} onChange={(e) => filtrar('paraVenta', e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Para venta: Todos</option><option value="1">Sí</option><option value="0">No</option></select>
        <select value={unidad} onChange={(e) => filtrar('unidad', e.target.value)} className="rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-[#052A79] focus:outline-none"><option value="">Unidad: Todas</option>{unidades.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div><div className="font-semibold text-gray-700">Productos fiscales</div><div className="text-xs text-slate-500">{resumen.total} productos · {vinculaciones.size} vinculados a la operación</div></div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || exportando || resumen.total === 0}
              onClick={() => void exportarProductos()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exportando ? 'Exportando...' : '↓ Exportar Excel'}
            </button>
            <button onClick={() => { setMode('CREATE'); setActual(productoVacio()); setProductoGuardado(''); setModal(true); }} className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white">+ Nuevo Producto</button>
          </div>
        </div>
        {loading ? <div className="py-10 text-center">Cargando productos...</div>
          : error ? <div className="py-10 text-center text-red-500">{error}</div>
          : <div className="max-h-[58vh] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-gray-200 bg-white text-xs capitalize text-gray-500"><tr><th className="px-3 py-3">SKU / producto</th><th className="px-3 py-3">Sede / Categoría DMS</th><th className="px-3 py-3">Datos fiscales</th><th className="px-3 py-3">Datos comerciales</th><th className="px-3 py-3">Flags</th><th className="px-3 py-3">Uso operativo</th><th className="px-3 py-3 text-center">Imagen</th><th className="px-3 py-3 text-center">Acciones</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{productos.map((producto) => {
                const vinculacion = vinculaciones.get(producto.id);
                return <tr key={producto.id} className="hover:bg-gray-50">
                  <td className="min-w-64 px-3 py-3"><div className="font-mono font-bold text-gray-700">{producto.codigo_sku}</div><div className="mt-1 font-medium text-gray-800">{producto.descripcion}</div><div className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${producto.categoria_id ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{producto.categoria_nombre || 'SIN TIPO DE CERTIFICADO'}</div><div className="mt-1 text-xs text-slate-500">Tipo: {producto.tipo_producto || 'Producto'}</div></td>
                  <td className="min-w-52 px-3 py-3 text-xs">{vinculacion?.sedesActivas.length ? <div className="font-semibold text-slate-800" title={vinculacion.sedesActivas.join(', ')}>{vinculacion.sedesActivas.join(', ')}</div> : <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">SIN TARIFA ACTIVA</span>}<div className="mt-1 text-slate-500">Derivada de Tarifas por sede</div></td>
                  <td className="min-w-52 px-3 py-3 text-xs"><div>Unidad: <b>{producto.unidad || '-'}</b> · IGV: <b>{producto.tipo_afectacion_igv || '-'}</b></div><div className="mt-1 text-slate-500">SUNAT: {producto.codigo_clasificacion_sunat || '-'}</div><div className="mt-1 text-slate-500">ISC: {producto.codigo_afectacion_isc || '-'} · {producto.porcentaje_isc == null ? '-' : `${producto.porcentaje_isc}%`}</div><div className="mt-1 text-slate-500">Cuenta: {producto.cuenta_por_cobrar || '-'}</div></td>
                  <td className="min-w-52 px-3 py-3 text-xs"><div>P. unitario: <b>{producto.precio_unitario == null ? '-' : `S/ ${producto.precio_unitario.toFixed(2)}`}</b></div><div className="mt-1">P. venta: <b>{producto.precio_referencia == null ? '-' : `S/ ${producto.precio_referencia.toFixed(2)}`}</b></div><div className="mt-1">V. referencial: <b>{producto.valor_referencial_unitario == null ? '-' : `S/ ${producto.valor_referencial_unitario.toFixed(2)}`}</b></div><div className="mt-1 text-slate-500">Barras: {producto.codigo_barras || '-'}</div></td>
                  <td className="min-w-40 px-3 py-3 text-xs"><div><span className={`rounded-full px-2 py-1 font-semibold ${producto.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{producto.activo ? 'ACTIVO' : 'INACTIVO'}</span></div><div className="mt-2 text-slate-600">Venta: {producto.es_para_venta ? 'Sí' : 'No'} · Compra: {producto.es_para_compra ? 'Sí' : 'No'}</div><div className="mt-1 text-slate-600">POS: {producto.disponible_pos ? 'Sí' : 'No'} · ICBPER: {producto.tiene_icbper ? 'Sí' : 'No'}</div></td>
                  <td className="min-w-60 px-3 py-3 text-xs">{vinculacion ? <div className="font-semibold text-slate-800">{vinculacion.servicios.join(', ')}</div> : <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">SIN VINCULAR</span>}</td>
                  <td className="px-3 py-3 text-center">{producto.imagen_url ? <img src={producto.imagen_url} alt={producto.descripcion} className="mx-auto h-12 w-12 rounded border border-slate-200 object-cover" /> : <span className="text-xs text-slate-400">Sin imagen</span>}</td>
                  <td className="px-3 py-3 text-center"><div className="flex justify-center gap-2"><button onClick={() => { setMode('EDIT'); setActual(producto); setProductoGuardado(''); setModal(true); }} title="Editar" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[#052A79] transition-colors hover:bg-blue-100"><Edit size={18} /></button><button onClick={() => void eliminarProducto(producto)} disabled={eliminando === producto.id} title="Eliminar" className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-red-600 transition-colors hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"><Trash2 size={18} /></button><button onClick={() => void cambiarEstado(producto)} title={producto.activo ? 'Desactivar' : 'Activar'} className={producto.activo ? 'rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[#052A79] transition-colors hover:bg-red-100' : 'rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-[#052A79] transition-colors hover:bg-green-100'}>{producto.activo ? <PowerOff size={18} /> : <Power size={18} />}</button></div></td>
                </tr>;
              })}</tbody>
            </table>
            <Paginacion
              resumen={resumen}
              etiqueta="productos"
              deshabilitado={loading}
              onCambioPagina={irAPagina}
              onCambioPageSize={cambiarPageSize}
            />
          </div>}
      </div>

      {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"><h3 className="mb-2 text-xl font-bold text-[#052A79]">{mode === 'CREATE' ? 'Nuevo producto fiscal' : 'Editar producto fiscal'}</h3><p className="mb-4 text-sm text-slate-600">Maestro comercial/fiscal. La sede o Categoría DMS se obtiene de Tarifas por sede; aquí no se crea una relación paralela.</p><form onSubmit={guardar} className="space-y-5">
        <section className="rounded-xl border border-slate-200 p-4">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#052A79]">Identificación</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div><label className="mb-1 block text-sm font-semibold">Código SKU</label><input required disabled={mode === 'EDIT'} value={actual.codigo_sku || ''} onChange={(e) => setActual({ ...actual, codigo_sku: e.target.value })} className="w-full rounded-lg border p-2 disabled:bg-slate-100" /></div>
            <div className="md:col-span-2"><label className="mb-1 block text-sm font-semibold">Descripción / Nombre</label><input required value={actual.descripcion || ''} onChange={(e) => setActual({ ...actual, descripcion: e.target.value })} className="w-full rounded-lg border p-2" /></div>
            <div><label className="mb-1 block text-sm font-semibold">Tipo</label><input value={actual.tipo_producto || 'Producto'} readOnly className="w-full rounded-lg border bg-slate-100 p-2" /></div>
            <div><label className="mb-1 block text-sm font-semibold">Tipo de certificado</label><select required value={actual.categoria_id || ''} onChange={(e) => setActual({ ...actual, categoria_id: e.target.value ? Number(e.target.value) : null })} className="w-full rounded-lg border bg-white p-2"><option value="">Seleccionar tipo...</option>{categorias.map((item) => <option key={item.id} value={item.id}>{item.nombre} ({item.codigo})</option>)}</select></div>
            <div><label className="mb-1 block text-sm font-semibold">Código de barras</label><input value={actual.codigo_barras || ''} onChange={(e) => setActual({ ...actual, codigo_barras: e.target.value || null })} className="w-full rounded-lg border p-2" /></div>
          </div>
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><div className="font-semibold">Sede / Categoría DMS</div><div className="mt-1">{vinculacionActual?.sedesActivas.length ? vinculacionActual.sedesActivas.join(', ') : mode === 'CREATE' ? 'Se asigna después desde Tarifas por sede.' : 'Sin tarifa activa asociada.'}</div>{canViewTarifas && onGoToTarifas && <button type="button" onClick={() => { setModal(false); onGoToTarifas(); }} className="mt-2 font-bold text-[#052A79] underline">Administrar en Tarifas por sede</button>}</div>
        </section>

        <section className="rounded-xl border border-slate-200 p-4">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#052A79]">Datos fiscales</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div><label className="mb-1 block text-sm font-semibold">Unidad</label><input value={actual.unidad || ''} maxLength={20} onChange={(e) => setActual({ ...actual, unidad: e.target.value.toUpperCase() || null })} placeholder="NIU" className="w-full rounded-lg border p-2" /></div>
            <div><label className="mb-1 block text-sm font-semibold">Cuenta por cobrar</label><input value={actual.cuenta_por_cobrar || ''} onChange={(e) => setActual({ ...actual, cuenta_por_cobrar: e.target.value || null })} className="w-full rounded-lg border p-2" /></div>
            <div><label className="mb-1 block text-sm font-semibold">Código clasificación SUNAT</label><input value={actual.codigo_clasificacion_sunat || ''} maxLength={30} onChange={(e) => setActual({ ...actual, codigo_clasificacion_sunat: e.target.value || null })} className="w-full rounded-lg border p-2" /></div>
            <div><label className="mb-1 block text-sm font-semibold">Tipo de afectación IGV</label><input value={actual.tipo_afectacion_igv || ''} inputMode="numeric" maxLength={2} pattern="[0-9]{2}" onChange={(e) => setActual({ ...actual, tipo_afectacion_igv: e.target.value || null })} placeholder="10" className="w-full rounded-lg border p-2" /></div>
            <div><label className="mb-1 block text-sm font-semibold">Código afectación ISC</label><input value={actual.codigo_afectacion_isc || ''} maxLength={20} onChange={(e) => setActual({ ...actual, codigo_afectacion_isc: e.target.value || null })} className="w-full rounded-lg border p-2" /></div>
            <div><label className="mb-1 block text-sm font-semibold">% ISC</label><input type="number" min="0" step="0.0001" value={actual.porcentaje_isc ?? ''} onChange={(e) => setActual({ ...actual, porcentaje_isc: nullableNumber(e.target.value) })} className="w-full rounded-lg border p-2" /></div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 p-4">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#052A79]">Precios</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div><label className="mb-1 block text-sm font-semibold">Precio unitario</label><input type="number" min="0" step="0.0001" value={actual.precio_unitario ?? ''} onChange={(e) => setActual({ ...actual, precio_unitario: nullableNumber(e.target.value) })} className="w-full rounded-lg border p-2" /></div>
            <div><label className="mb-1 block text-sm font-semibold">Precio de venta unitario</label><input type="number" min="0" step="0.0001" value={actual.precio_referencia ?? ''} onChange={(e) => setActual({ ...actual, precio_referencia: nullableNumber(e.target.value) })} className="w-full rounded-lg border p-2" /><p className="mt-1 text-xs text-slate-500">Campo existente: precio_referencia. No cambia la tarifa por sede.</p></div>
            <div><label className="mb-1 block text-sm font-semibold">Valor referencial unitario</label><input type="number" min="0" step="0.0001" value={actual.valor_referencial_unitario ?? ''} onChange={(e) => setActual({ ...actual, valor_referencial_unitario: nullableNumber(e.target.value) })} className="w-full rounded-lg border p-2" /></div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 p-4">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#052A79]">Estado / Comercial</h4>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(actual.activo)} onChange={(e) => setActual({ ...actual, activo: e.target.checked })} />Activo</label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(actual.disponible_pos)} onChange={(e) => setActual({ ...actual, disponible_pos: e.target.checked })} />Disponible en POS</label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(actual.es_para_venta)} onChange={(e) => setActual({ ...actual, es_para_venta: e.target.checked })} />Es para venta</label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(actual.es_para_compra)} onChange={(e) => setActual({ ...actual, es_para_compra: e.target.checked })} />Es para compra</label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(actual.tiene_icbper)} onChange={(e) => setActual({ ...actual, tiene_icbper: e.target.checked })} />Tiene ICBPER</label>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 p-4">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#052A79]">Imagen</h4>
          <div className="flex items-end gap-4"><div className="flex-1"><label className="mb-1 block text-sm font-semibold">URL de imagen</label><input type="url" value={actual.imagen_url || ''} onChange={(e) => setActual({ ...actual, imagen_url: e.target.value || null })} placeholder="https://..." className="w-full rounded-lg border p-2" /></div>{actual.imagen_url ? <img src={actual.imagen_url} alt="Vista previa" className="h-16 w-16 rounded border object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded border bg-slate-50 text-center text-xs text-slate-400">Sin imagen</div>}</div>
        </section>

        <div className="rounded-xl border border-slate-200 p-4">
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
            El certificado incluye chip
          </label>
          {actual.requiere_chip && (
            <div>
              <label className="text-sm font-semibold">Tipo de chip
                <select required value={actual.producto_chip_id || ''} onChange={(e) => setActual({ ...actual, producto_chip_id: e.target.value ? Number(e.target.value) : null })} className="mt-1 w-full rounded-lg border bg-white p-2">
                  <option value="">Seleccionar tipo de chip...</option>
                  {chipsOpciones.map(chip => <option key={chip.id} value={chip.id}>{chip.codigo} - {chip.nombre}</option>)}
                </select>
              </label>
            </div>
          )}<p className="mt-2 text-xs text-slate-500">El precio del chip se resuelve desde la configuración del tipo de chip; no se duplica aquí.</p></div>
        <div className="flex justify-end gap-3 border-t pt-4"><button type="button" disabled={saving} onClick={() => setModal(false)} className="rounded px-5 py-2 font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button><button type="submit" disabled={saving} className="rounded bg-[#052A79] px-5 py-2 font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button></div>
      </form></div></div>}
    </div>
  );
}
