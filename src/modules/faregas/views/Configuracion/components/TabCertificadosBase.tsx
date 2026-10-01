import { ChevronDown, ChevronLeft, ChevronRight, FileText, MapPin, Plus, Tags } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  faregasConfigApi,
  type CategoriaServicio,
  type SedeTarifaAsignada,
  type ServicioConfiguracionFaregas
} from '../../../services/faregas-config.api';
import { faregasProductosApi, type ProductoFacturacion } from '../../../services/faregas-productos.api';
import { faregasTarifasAdminApi, type TarifaSede } from '../../../services/faregas-tarifas-admin.api';
import FormatoAsignadorModal from './FormatoAsignadorModal';
import FormatoDetalleModal from './FormatoDetalleModal';
import { ServicioModal } from './ServicioModal';

interface Props {
  canViewProducts: boolean;
  canManageTarifas: boolean;
  onGoToTarifas: () => void;
}

interface ModalState {
  mode: 'CREATE' | 'EDIT';
  categoria: CategoriaServicio;
  servicio?: ServicioConfiguracionFaregas;
  productoInicialId?: number | null;
  productoFijoId?: number | null;
}

type EstadoConfiguracion = '' | 'CONFIGURADOS' | 'SIN_CONFIGURAR';
type GeneraCertificado = '' | 'SI' | 'NO';

const CATEGORIAS_PRINCIPALES = ['GLP', 'GNV', 'CONFORMIDAD', 'COMPLEMENTARIOS'] as const;

/**
 * Resaltado visual de la fila de un producto ya configurado, dentro de la sección
 * PRODUCTOS FISCALES. Es sólo presentación: la condición `usado` es la misma que
 * decide el badge "CONFIGURADO" / "SIN CONFIGURAR", así que el fondo y el badge
 * no pueden discrepar.
 *
 * Celeste muy suave (`sky-50`) con filete lateral y hover propio, para que al
 * pasar el cursor no salte al gris que usan las filas sin configurar.
 */
const CLASE_FILA_CONFIGURADA = 'bg-sky-50 border-l-4 border-sky-400 hover:bg-sky-100';
const CLASE_FILA_SIN_CONFIGURAR = 'bg-white border-l-4 border-transparent hover:bg-slate-50';
const claseFilaProducto = (configurado: boolean) =>
  `${configurado ? CLASE_FILA_CONFIGURADA : CLASE_FILA_SIN_CONFIGURAR}`;

const nombreFormato = (servicio: ServicioConfiguracionFaregas) => {
  if (!servicio.requiere_certificado) return 'No aplica';
  if (servicio.formato_id && servicio.formato_nombre) {
    return `${servicio.formato_nombre} (${servicio.formato_codigo || servicio.formato_id})`;
  }
  if (servicio.tipo_flujo === 'TALLER_INSPECCION') return 'Legacy visual: Taller Inspección';
  if (servicio.tipo_certificado_clave === 'CONFORMIDAD') return 'Legacy visual: Conformidad';
  const combustible = servicio.tipo_certificado_clave?.startsWith('GNV') ? 'GNV' : 'GLP';
  return `Legacy visual: ${combustible} ${servicio.modalidad === 'INICIAL' ? 'Inicial' : 'Anual'}`;
};

const codigoComparable = (value: string | null | undefined) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9_]+/g, '_')
  .replace(/^_+|_+$/g, '');

export default function TabCertificadosBase({ canViewProducts, canManageTarifas, onGoToTarifas }: Props) {
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([]);
  const [productos, setProductos] = useState<ProductoFacturacion[]>([]);
  const [servicios, setServicios] = useState<ServicioConfiguracionFaregas[]>([]);
  const [sedes, setSedes] = useState<TarifaSede[]>([]);
  const [sedesPorServicio, setSedesPorServicio] = useState<Record<number, SedeTarifaAsignada[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoConfiguracion>('');
  const [sedeFiltro, setSedeFiltro] = useState('');
  const [generaCertificadoFiltro, setGeneraCertificadoFiltro] = useState<GeneraCertificado>('');
  const [limiteProductos, setLimiteProductos] = useState(20);
  const [paginaProductos, setPaginaProductos] = useState<Record<number, number>>({});
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<ModalState | null>(null);
  const [asignarFormatoServicio, setAsignarFormatoServicio] = useState<ServicioConfiguracionFaregas | null>(null);
  const [editarFormato, setEditarFormato] = useState<{ id: number; servicio: ServicioConfiguracionFaregas } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      faregasConfigApi.obtenerCategorias(false),
      faregasConfigApi.getServicios(),
      // Productos POR CATEGORÍA, no `listar()`: el listado paginado del catálogo
      // devolvía sólo 10 filas, así que las categorías cuyo producto no caía en
      // esa página aparecían con "0 producto(s)" y, sin producto, tampoco se
      // habilitaba el botón "+ Configurar operación".
      canViewProducts ? faregasProductosApi.listarPorCategoria() : Promise.resolve({ porCategoria: {}, productos: [], total: 0 }),
      canManageTarifas ? faregasTarifasAdminApi.listarSedes() : Promise.resolve([]),
      canManageTarifas ? faregasConfigApi.obtenerSedesPorServicio() : Promise.resolve({})
    ]).then(([categoriasData, serviciosData, productosData, sedesData, relacionesData]) => {
      if (cancelado) return;
      setCategorias(categoriasData);
      setCategoriasExpandidas((actuales) => actuales.size > 0
        ? actuales
        : new Set(categoriasData.slice(0, 1).map((categoria) => categoria.id)));
      setServicios(serviciosData);
      setProductos(productosData.productos);
      setSedes(sedesData.filter((sede) => sede.activo));
      setSedesPorServicio(relacionesData);
      setError('');
    }).catch((cause: unknown) => {
      if (!cancelado) setError(cause instanceof Error ? cause.message : 'No se pudo cargar la configuración del catálogo.');
    }).finally(() => {
      if (!cancelado) setLoading(false);
    });
    return () => { cancelado = true; };
  }, [canManageTarifas, canViewProducts, version]);

  const productosDe = (categoriaId: number) => productos.filter((producto) => Number(producto.categoria_id) === Number(categoriaId));
  const serviciosDe = (categoriaId: number) => servicios.filter((servicio) => Number(servicio.categoria_id) === Number(categoriaId));
  const sedesActivasDe = (servicioId: number) => (sedesPorServicio[servicioId] || []).filter((sede) => sede.activo);
  // `fg_producto_facturacion.id` es bigint: Postgres lo devuelve como texto, mientras
  // que `producto_facturacion_id` llega como número desde el JSON de la tarifa. Sin
  // normalizar, el `===` de abajo nunca encuentra el producto y la operación
  // muestra "Sin producto fiscal vinculado" aunque el vínculo exista en `fg_tarifa`.
  const productoIdsDe = (servicioId: number) => [...new Set((sedesPorServicio[servicioId] || [])
    .map((sede) => sede.producto_facturacion_id)
    .filter((id): id is number => id !== null && id !== undefined)
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0))];
  const buscarProductoPorId = (id: number | string) =>
    productos.find((producto) => Number(producto.id) === Number(id));
  const recargar = () => { setLoading(true); setVersion((actual) => actual + 1); };

  const reiniciarPaginas = () => setPaginaProductos({});
  const alternarCategoria = (categoriaId: number) => {
    setCategoriasExpandidas((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(categoriaId)) siguientes.delete(categoriaId);
      else siguientes.add(categoriaId);
      return siguientes;
    });
  };
  const cambiarCategoriaFiltro = (codigo: string) => {
    setCategoriaFiltro(codigo);
    reiniciarPaginas();
    if (codigo) {
      const coincidencias = categorias
        .filter((categoria) => codigoComparable(categoria.codigo) === codigo)
        .map((categoria) => categoria.id);
      setCategoriasExpandidas(new Set(coincidencias));
    }
  };

  const categoriasVisibles = (() => {
    const texto = buscar.trim().toLowerCase();
    const hayFiltrosDeContenido = Boolean(texto || estadoFiltro || sedeFiltro || generaCertificadoFiltro);

    return categorias.flatMap((categoria) => {
      if (categoriaFiltro && codigoComparable(categoria.codigo) !== categoriaFiltro) return [];

      const productosCategoria = productosDe(categoria.id);
      const serviciosCategoria = serviciosDe(categoria.id);
      const servicioDeProducto = (producto: ProductoFacturacion) => serviciosCategoria.find((servicio) =>
        productoIdsDe(servicio.id).includes(Number(producto.id))
        || codigoComparable(servicio.codigo) === codigoComparable(producto.codigo_sku)
      );
      const coincideSede = (servicio: ServicioConfiguracionFaregas | undefined) => !sedeFiltro
        || Boolean(servicio && sedesActivasDe(servicio.id).some((sede) => sede.key === sedeFiltro));
      const coincideCertificado = (servicio: ServicioConfiguracionFaregas | undefined) => !generaCertificadoFiltro
        || Boolean(servicio && (generaCertificadoFiltro === 'SI' ? servicio.requiere_certificado : !servicio.requiere_certificado));
      const categoriaCoincideTexto = !texto
        || `${categoria.codigo} ${categoria.nombre}`.toLowerCase().includes(texto);

      const productosFiltrados = productosCategoria.filter((producto) => {
        const servicio = servicioDeProducto(producto);
        const configurado = Boolean(servicio);
        const coincideEstado = !estadoFiltro
          || (estadoFiltro === 'CONFIGURADOS' ? configurado : !configurado);
        const coincideTexto = categoriaCoincideTexto
          || `${producto.codigo_sku} ${producto.descripcion}`.toLowerCase().includes(texto)
          || Boolean(servicio && `${servicio.codigo} ${servicio.nombre}`.toLowerCase().includes(texto));
        return coincideEstado && coincideSede(servicio) && coincideCertificado(servicio) && coincideTexto;
      });

      const serviciosFiltrados = serviciosCategoria.filter((servicio) => {
        if (estadoFiltro === 'SIN_CONFIGURAR') return false;
        const coincideTexto = categoriaCoincideTexto
          || `${servicio.codigo} ${servicio.nombre}`.toLowerCase().includes(texto)
          || productoIdsDe(servicio.id).some((id) => {
            const producto = buscarProductoPorId(id);
            return Boolean(producto && `${producto.codigo_sku} ${producto.descripcion}`.toLowerCase().includes(texto));
          });
        return coincideSede(servicio) && coincideCertificado(servicio) && coincideTexto;
      });

      if (hayFiltrosDeContenido && productosFiltrados.length === 0 && serviciosFiltrados.length === 0) return [];

      const configurados = productosCategoria.filter((producto) => Boolean(servicioDeProducto(producto))).length;
      return [{
        categoria,
        productosCategoria,
        productosFiltrados,
        serviciosCategoria,
        serviciosFiltrados,
        configurados,
        sinConfigurar: productosCategoria.length - configurados,
        servicioDeProducto
      }];
    });
  })();

  if (loading) return <div className="rounded-xl border bg-white py-14 text-center text-slate-500">Cargando categorías, productos y sedes...</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center font-semibold text-red-700">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-bold">Categorías, operación y formatos</p>
        <p className="mt-1">Aquí aparecen todas las categorías. Cada operación indica si genera certificado, qué formato utiliza y en qué sedes se ofrece.</p>
        <p className="mt-1 text-xs text-blue-700">Las sedes, precios y SKU se guardan en Tarifas por sede; esta vista no crea una configuración paralela.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_repeat(4,minmax(145px,0.75fr))_auto]">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold capitalize text-slate-500">Buscar</span>
            <input value={buscar} onChange={(event) => { setBuscar(event.target.value); reiniciarPaginas(); }} placeholder="Categoría, SKU u operación..." className="w-full rounded-lg border border-slate-300 p-2.5 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold capitalize text-slate-500">Categoría / Tipo</span>
            <select value={categoriaFiltro} onChange={(event) => cambiarCategoriaFiltro(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm">
              <option value="">Todos</option>
              {CATEGORIAS_PRINCIPALES.map((codigo) => <option key={codigo} value={codigo}>{codigo}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold capitalize text-slate-500">Estado de configuración</span>
            <select value={estadoFiltro} onChange={(event) => { setEstadoFiltro(event.target.value as EstadoConfiguracion); reiniciarPaginas(); }} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm">
              <option value="">Todos</option>
              <option value="CONFIGURADOS">Configurados</option>
              <option value="SIN_CONFIGURAR">Sin configurar</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold capitalize text-slate-500">Sede</span>
            <select value={sedeFiltro} onChange={(event) => { setSedeFiltro(event.target.value); reiniciarPaginas(); }} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm">
              <option value="">Todas</option>
              {sedes.map((sede) => <option key={sede.key} value={sede.key}>{sede.nombre}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold capitalize text-slate-500">Genera certificado</span>
            <select value={generaCertificadoFiltro} onChange={(event) => { setGeneraCertificadoFiltro(event.target.value as GeneraCertificado); reiniciarPaginas(); }} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm">
              <option value="">Todos</option>
              <option value="SI">Sí</option>
              <option value="NO">No</option>
            </select>
          </label>
          {canManageTarifas && <button type="button" onClick={onGoToTarifas} className="self-end rounded-lg border border-[#052A79] px-4 py-2.5 text-sm font-bold text-[#052A79] hover:bg-blue-50">Abrir Tarifas por sede</button>}
        </div>
      </div>

      {categoriasVisibles.length === 0 ? (
        <div className="rounded-xl border bg-white py-12 text-center text-slate-500">No hay categorías que coincidan con la búsqueda.</div>
      ) : (
        <div className="space-y-4">
          {categoriasVisibles.map(({ categoria, productosCategoria, productosFiltrados, serviciosCategoria, serviciosFiltrados, configurados, sinConfigurar, servicioDeProducto }) => {
            const sedesCategoria = [...new Map(serviciosCategoria.flatMap((servicio) => sedesActivasDe(servicio.id)).map((sede) => [sede.key, sede])).values()];
            const expandida = categoriasExpandidas.has(categoria.id);
            const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / limiteProductos));
            const pagina = Math.min(paginaProductos[categoria.id] || 1, totalPaginas);
            const desde = (pagina - 1) * limiteProductos;
            const productosPagina = productosFiltrados.slice(desde, desde + limiteProductos);
            const cambiarPagina = (siguiente: number) => setPaginaProductos((actuales) => ({ ...actuales, [categoria.id]: siguiente }));
            return (
              <article key={categoria.id} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${categoria.activo ? 'border-slate-200' : 'border-red-200 opacity-75'}`}>
                <header className="border-b bg-slate-50">
                  <button type="button" onClick={() => alternarCategoria(categoria.id)} aria-expanded={expandida} className="flex w-full flex-col gap-3 p-4 text-left lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-lg bg-blue-100 p-2 text-[#052A79]"><Tags size={19} /></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {expandida ? <ChevronDown size={18} className="text-[#052A79]" /> : <ChevronRight size={18} className="text-[#052A79]" />}
                        <h3 className="font-bold text-[#052A79]">{categoria.nombre}</h3>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">{categoria.codigo}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${categoria.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{categoria.activo ? 'ACTIVA' : 'INACTIVA'}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-200 px-2 py-1 font-semibold text-slate-700">Productos: {productosCategoria.length}</span>
                        <span className="rounded-full bg-blue-100 px-2 py-1 font-semibold text-blue-700">Configurados: {configurados}</span>
                        <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-800">Sin configurar: {sinConfigurar}</span>
                        <span className="rounded-full bg-violet-100 px-2 py-1 font-semibold text-violet-700">Operaciones: {serviciosCategoria.length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex max-w-xl items-center gap-1.5 text-xs font-semibold text-slate-600"><MapPin size={15} className="shrink-0" /><span className="line-clamp-2">{sedesCategoria.length ? sedesCategoria.map((sede) => sede.nombre).join(', ') : 'Sin sedes asignadas'}</span></div>
                  </button>
                </header>

                {expandida && <div className="space-y-5 p-4">
                  <section className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="flex flex-col gap-2 border-b bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-xs font-black tracking-wide text-slate-700">PRODUCTOS FISCALES</h4>
                        <p className="mt-0.5 text-xs text-slate-500">{productosFiltrados.length} producto(s) según los filtros actuales</p>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        Mostrar
                        <select value={limiteProductos} onChange={(event) => { setLimiteProductos(Number(event.target.value)); reiniciarPaginas(); }} className="rounded-md border border-slate-300 bg-white px-2 py-1.5">
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </label>
                    </div>
                    {productosCategoria.length === 0 ? <div className="m-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Esta categoría todavía no tiene productos fiscales.</div> : productosFiltrados.length === 0 ? (
                      <div className="p-5 text-center text-sm text-slate-500">No hay productos que coincidan con los filtros.</div>
                    ) : (
                      <div className="divide-y divide-slate-200/60">{productosPagina.map((producto) => {
                        const servicioVinculado = servicioDeProducto(producto);
                        const usado = Boolean(servicioVinculado);
                        return <div key={producto.id} title={producto.descripcion} className={`flex flex-col gap-2 px-4 py-2.5 transition-colors sm:flex-row sm:items-center sm:justify-between ${claseFilaProducto(usado)}`}>
                          <div className="min-w-0 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <b className="font-mono text-[#052A79]">{producto.codigo_sku}</b>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${usado ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'}`}>{usado ? 'CONFIGURADO' : 'SIN CONFIGURAR'}</span>
                              {!producto.activo && <b className="text-red-600">INACTIVO</b>}
                            </div>
                            <p className="mt-1 line-clamp-2 text-slate-700">{producto.descripcion}</p>
                          </div>
                          {canManageTarifas && canViewProducts && producto.activo && categoria.activo && (
                            <button
                              type="button"
                              onClick={() => servicioVinculado
                                ? setModal({ mode: 'EDIT', categoria, servicio: servicioVinculado, productoInicialId: producto.id, productoFijoId: producto.id })
                                : setModal({ mode: 'CREATE', categoria, productoInicialId: producto.id, productoFijoId: producto.id })}
                              className="shrink-0 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#052A79] hover:bg-blue-100"
                            >
                              {servicioVinculado ? 'Configurar operación' : '+ Configurar operación'}
                            </button>
                          )}
                        </div>;
                      })}</div>
                    )}
                    {productosFiltrados.length > 0 && <div className="flex flex-col gap-2 border-t bg-slate-50 px-4 py-2.5 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                      <span>Mostrando {desde + 1}-{Math.min(desde + limiteProductos, productosFiltrados.length)} de {productosFiltrados.length}</span>
                      <div className="flex items-center gap-2">
                        <button type="button" disabled={pagina <= 1} onClick={() => cambiarPagina(pagina - 1)} className="rounded-md border bg-white p-1.5 text-[#052A79] disabled:opacity-40" title="Página anterior"><ChevronLeft size={15} /></button>
                        <span className="font-semibold">Página {pagina} de {totalPaginas}</span>
                        <button type="button" disabled={pagina >= totalPaginas} onClick={() => cambiarPagina(pagina + 1)} className="rounded-md border bg-white p-1.5 text-[#052A79] disabled:opacity-40" title="Página siguiente"><ChevronRight size={15} /></button>
                      </div>
                    </div>}
                  </section>

                  <section className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="border-b bg-slate-50 px-4 py-3">
                      <h4 className="text-xs font-black tracking-wide text-slate-700">OPERACIONES CONFIGURADAS</h4>
                      <p className="mt-0.5 text-xs text-slate-500">{serviciosFiltrados.length} operación(es) según los filtros actuales</p>
                    </div>
                    {serviciosCategoria.length === 0 ? <div className="m-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No hay una operación configurada. La categoría y sus productos existen, pero todavía no están disponibles en ninguna sede.</div> : serviciosFiltrados.length === 0 ? (
                      <div className="p-5 text-center text-sm text-slate-500">No hay operaciones que coincidan con los filtros.</div>
                    ) : (
                      <div className="divide-y divide-slate-100">{serviciosFiltrados.map((servicio) => {
                        const sedesServicio = sedesActivasDe(servicio.id);
                        const productosServicio = productoIdsDe(servicio.id)
                          .map((id) => buscarProductoPorId(id))
                          .filter(Boolean) as ProductoFacturacion[];
                        return (
                          <div key={servicio.id} className="px-4 py-3 hover:bg-slate-50">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2"><b className="text-sm text-slate-800">{servicio.nombre}</b><span className="font-mono text-[10px] text-slate-500">{servicio.codigo}</span>{!servicio.activo && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">INACTIVA</span>}</div>
                                <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                                  <label className={`flex items-center gap-1.5 rounded-full px-2 py-1 font-bold ${servicio.requiere_certificado ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`} title="El cambio se confirma en la ventana de configuración">
                                    <input type="checkbox" checked={servicio.requiere_certificado} disabled={!canManageTarifas || !canViewProducts} onChange={(event) => setModal({ mode: 'EDIT', categoria, servicio: { ...servicio, requiere_certificado: event.target.checked }, productoInicialId: productosServicio[0]?.id })} className="h-3.5 w-3.5" />
                                    {servicio.requiere_certificado ? 'Genera certificado' : 'No genera certificado'}
                                  </label>
                                  {servicio.requiere_certificado && <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 font-bold text-violet-700"><FileText size={13} /> Formato: {nombreFormato(servicio)}</span>}
                                </div>
                                <div className="mt-2 grid gap-1 text-xs text-slate-500 md:grid-cols-2"><div><b>Productos:</b> {productosServicio.length ? productosServicio.map((producto) => producto.codigo_sku).join(', ') : 'Sin producto fiscal vinculado'}</div><div><b>Sedes:</b> {sedesServicio.length ? sedesServicio.map((sede) => sede.nombre).join(', ') : 'Sin sedes activas'}</div></div>
                              </div>
                              {canManageTarifas && canViewProducts && (
                                <div className="flex shrink-0 flex-wrap gap-2">
                                  {servicio.requiere_certificado && (servicio.formato_id ? (
                                    <button type="button" onClick={() => setEditarFormato({ id: servicio.formato_id as number, servicio })} className="flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100"><FileText size={14} /> Editar formato</button>
                                  ) : (
                                    <button type="button" onClick={() => setAsignarFormatoServicio(servicio)} className="flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800"><Plus size={14} /> Agregar formato</button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}</div>
                    )}
                  </section>
                </div>}
              </article>
            );
          })}
        </div>
      )}

      {modal && <ServicioModal mode={modal.mode} initialData={modal.servicio || { categoria_id: modal.categoria.id, requiere_certificado: false, requiere_vehiculo: false, orden: 10 }} categoria={modal.categoria} productos={productos} productoInicialId={modal.productoInicialId} productoFijoId={modal.productoFijoId} sedesDisponibles={sedes} tarifasAsignadas={modal.servicio ? (sedesPorServicio[modal.servicio.id] || []) : []} onClose={() => setModal(null)} onSaved={recargar} />}

      {asignarFormatoServicio && <FormatoAsignadorModal servicio={asignarFormatoServicio} onClose={() => setAsignarFormatoServicio(null)} onAsignado={(formato) => {
        setAsignarFormatoServicio(null);
        setEditarFormato({ id: formato.id, servicio: { ...asignarFormatoServicio, formato_id: formato.id, formato_codigo: formato.codigo, formato_nombre: formato.nombre, formato_motor: formato.motor } });
        recargar();
      }} />}

      {editarFormato && <FormatoDetalleModal formatoId={editarFormato.id} contextoOperacion={editarFormato.servicio} onFormatoChanged={(formato) => {
        setEditarFormato((actual) => actual ? { id: formato.id, servicio: { ...actual.servicio, formato_id: formato.id, formato_codigo: formato.codigo, formato_nombre: formato.nombre, formato_motor: formato.motor } } : null);
      }} onClose={() => { setEditarFormato(null); recargar(); }} />}
    </div>
  );
}
