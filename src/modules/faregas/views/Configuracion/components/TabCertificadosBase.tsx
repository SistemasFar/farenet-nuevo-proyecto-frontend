import { MapPin, Pencil, Plus, Tags } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  faregasConfigApi,
  type CategoriaServicio,
  type SedeTarifaAsignada,
  type ServicioConfiguracionFaregas
} from '../../../services/faregas-config.api';
import { faregasProductosApi, type ProductoFacturacion } from '../../../services/faregas-productos.api';
import { faregasTarifasAdminApi, type TarifaSede } from '../../../services/faregas-tarifas-admin.api';
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
}

const nombreFormato = (servicio: ServicioConfiguracionFaregas) => {
  if (!servicio.requiere_certificado) return 'No aplica';
  if (servicio.tipo_certificado_clave === 'CONFORMIDAD') return 'Conformidad';
  const combustible = servicio.tipo_certificado_clave?.startsWith('GNV') ? 'GNV' : 'GLP';
  return `${combustible} ${servicio.modalidad === 'INICIAL' ? 'Inicial' : 'Anual'}`;
};

export default function TabCertificadosBase({ canViewProducts, canManageTarifas, onGoToTarifas }: Props) {
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([]);
  const [productos, setProductos] = useState<ProductoFacturacion[]>([]);
  const [servicios, setServicios] = useState<ServicioConfiguracionFaregas[]>([]);
  const [sedes, setSedes] = useState<TarifaSede[]>([]);
  const [sedesPorServicio, setSedesPorServicio] = useState<Record<number, SedeTarifaAsignada[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [modal, setModal] = useState<ModalState | null>(null);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
        faregasConfigApi.obtenerCategorias(false),
        faregasConfigApi.getServicios(),
        canViewProducts ? faregasProductosApi.listar() : Promise.resolve([]),
        canManageTarifas ? faregasTarifasAdminApi.listarSedes() : Promise.resolve([]),
        canManageTarifas ? faregasConfigApi.obtenerSedesPorServicio() : Promise.resolve({})
      ])
      .then(([categoriasData, serviciosData, productosData, sedesData, relacionesData]) => {
        if (cancelado) return;
      setCategorias(categoriasData);
      setServicios(serviciosData);
      setProductos(productosData);
      setSedes(sedesData.filter((sede) => sede.activo));
      setSedesPorServicio(relacionesData);
        setError('');
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : 'No se pudo cargar la configuración del catálogo.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => { cancelado = true; };
  }, [canManageTarifas, canViewProducts, version]);

  const categoriasVisibles = useMemo(() => {
    const texto = buscar.trim().toLowerCase();
    return categorias.filter((categoria) => {
      if (!texto) return true;
      const productosCategoria = productos.filter((producto) => producto.categoria_id === categoria.id);
      const serviciosCategoria = servicios.filter((servicio) => servicio.categoria_id === categoria.id);
      return categoria.codigo.toLowerCase().includes(texto)
        || categoria.nombre.toLowerCase().includes(texto)
        || productosCategoria.some((producto) => `${producto.codigo_sku} ${producto.descripcion}`.toLowerCase().includes(texto))
        || serviciosCategoria.some((servicio) => `${servicio.codigo} ${servicio.nombre}`.toLowerCase().includes(texto));
    });
  }, [buscar, categorias, productos, servicios]);

  const productosDe = (categoriaId: number) => productos.filter((producto) => producto.categoria_id === categoriaId);
  const serviciosDe = (categoriaId: number) => servicios.filter((servicio) => servicio.categoria_id === categoriaId);
  const sedesActivasDe = (servicioId: number) => (sedesPorServicio[servicioId] || []).filter((sede) => sede.activo);
  const productoIdsDe = (servicioId: number) => [...new Set((sedesPorServicio[servicioId] || [])
    .map((sede) => sede.producto_facturacion_id)
    .filter((id): id is number => Boolean(id)))];

  if (loading) return <div className="rounded-xl border bg-white py-14 text-center text-slate-500">Cargando categorías, productos y sedes...</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center font-semibold text-red-700">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-bold">Categorías, operación y formatos</p>
        <p className="mt-1">Aquí aparecen todas las categorías. Cada operación indica si genera certificado, qué formato utiliza y en qué sedes se ofrece.</p>
        <p className="mt-1 text-xs text-blue-700">Las sedes, precios y SKU se guardan en Tarifas por sede; esta vista no crea una configuración paralela.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input value={buscar} onChange={(event) => setBuscar(event.target.value)} placeholder="Buscar categoría, producto u operación..." className="flex-1 rounded-lg border border-slate-300 p-2 text-sm" />
        {canManageTarifas && <button type="button" onClick={onGoToTarifas} className="rounded-lg border border-[#052A79] px-4 py-2 text-sm font-bold text-[#052A79] hover:bg-blue-50">Abrir Tarifas por sede</button>}
      </div>

      {categoriasVisibles.length === 0 ? <div className="rounded-xl border bg-white py-12 text-center text-slate-500">No hay categorías que coincidan con la búsqueda.</div> : <div className="space-y-4">{categoriasVisibles.map((categoria) => {
        const productosCategoria = productosDe(categoria.id);
        const serviciosCategoria = serviciosDe(categoria.id);
        const sedesCategoria = [...new Map(serviciosCategoria.flatMap((servicio) => sedesActivasDe(servicio.id)).map((sede) => [sede.key, sede])).values()];
        const certificaciones = serviciosCategoria.filter((servicio) => servicio.requiere_certificado);
        return <article key={categoria.id} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${categoria.activo ? 'border-slate-200' : 'border-red-200 opacity-75'}`}>
          <header className="flex flex-col gap-3 border-b bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-100 p-2 text-[#052A79]"><Tags size={19} /></div>
              <div>
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#052A79]">{categoria.nombre}</h3><span className="rounded-full bg-slate-200 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">{categoria.codigo}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${categoria.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{categoria.activo ? 'ACTIVA' : 'INACTIVA'}</span></div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500"><span>{productosCategoria.length} producto(s)</span><span>{serviciosCategoria.length} operación(es)</span><span>{certificaciones.length} genera(n) certificado</span></div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><MapPin size={15} />{sedesCategoria.length ? sedesCategoria.map((sede) => sede.nombre).join(', ') : 'Sin sedes asignadas'}</div>
              {canManageTarifas && canViewProducts && categoria.activo && productosCategoria.some((producto) => producto.activo) && <button type="button" onClick={() => setModal({ mode: 'CREATE', categoria, productoInicialId: productosCategoria.find((producto) => producto.activo)?.id })} className="flex items-center gap-1 rounded-lg bg-[#052A79] px-3 py-2 text-xs font-bold text-white"><Plus size={15} /> Nueva operación</button>}
            </div>
          </header>

          <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)]">
            <section>
              <h4 className="mb-2 text-xs font-bold uppercase text-slate-500">Productos fiscales</h4>
              {productosCategoria.length === 0 ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Esta categoría todavía no tiene productos fiscales.</div> : <div className="flex flex-wrap gap-2">{productosCategoria.map((producto) => {
                const usado = serviciosCategoria.some((servicio) => productoIdsDe(servicio.id).includes(producto.id));
                return <span key={producto.id} title={producto.descripcion} className={`rounded-lg border px-2.5 py-2 text-xs ${usado ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-600'}`}><b>{producto.codigo_sku}</b><span className="ml-1">{producto.descripcion}</span>{!producto.activo && <b className="ml-1 text-red-600">INACTIVO</b>}</span>;
              })}</div>}
            </section>

            <section>
              <h4 className="mb-2 text-xs font-bold uppercase text-slate-500">Operaciones, certificado y sedes</h4>
              {serviciosCategoria.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No hay una operación configurada. La categoría y sus productos existen, pero todavía no están disponibles en ninguna sede.</div> : <div className="space-y-2">{serviciosCategoria.map((servicio) => {
                const sedesServicio = sedesActivasDe(servicio.id);
                const productosServicio = productoIdsDe(servicio.id).map((id) => productos.find((producto) => producto.id === id)).filter(Boolean) as ProductoFacturacion[];
                return <div key={servicio.id} className="rounded-lg border border-slate-200 p-3"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="text-sm text-slate-800">{servicio.nombre}</b><span className="font-mono text-[10px] text-slate-500">{servicio.codigo}</span>{!servicio.activo && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">INACTIVA</span>}</div><div className="mt-2 flex flex-wrap gap-2 text-xs"><label className={`flex items-center gap-1.5 rounded-full px-2 py-1 font-bold ${servicio.requiere_certificado ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`} title="El cambio se confirma en la ventana de configuración"><input type="checkbox" checked={servicio.requiere_certificado} disabled={!canManageTarifas || !canViewProducts} onChange={(event) => setModal({ mode: 'EDIT', categoria, servicio: { ...servicio, requiere_certificado: event.target.checked }, productoInicialId: productosServicio[0]?.id })} className="h-3.5 w-3.5" />{servicio.requiere_certificado ? 'Genera certificado' : 'No genera certificado'}</label><span className="rounded-full bg-violet-100 px-2 py-1 font-bold text-violet-700">Formato: {nombreFormato(servicio)}</span></div><div className="mt-2 text-xs text-slate-500"><b>Productos:</b> {productosServicio.length ? productosServicio.map((producto) => producto.codigo_sku).join(', ') : 'Sin producto fiscal vinculado'}</div><div className="mt-1 text-xs text-slate-500"><b>Sedes:</b> {sedesServicio.length ? sedesServicio.map((sede) => sede.nombre).join(', ') : 'Sin sedes activas'}</div></div>{canManageTarifas && canViewProducts && <button type="button" onClick={() => setModal({ mode: 'EDIT', categoria, servicio, productoInicialId: productosServicio[0]?.id })} className="flex shrink-0 items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-[#052A79] hover:bg-blue-100"><Pencil size={14} /> Configurar</button>}</div></div>;
              })}</div>}
            </section>
          </div>
        </article>;
      })}</div>}

      {modal && <ServicioModal mode={modal.mode} initialData={modal.servicio || { categoria_id: modal.categoria.id, requiere_certificado: false, requiere_vehiculo: false, orden: 10 }} categoria={modal.categoria} productos={productos} productoInicialId={modal.productoInicialId} sedesDisponibles={sedes} tarifasAsignadas={modal.servicio ? (sedesPorServicio[modal.servicio.id] || []) : []} onClose={() => setModal(null)} onSaved={() => { setLoading(true); setVersion((actual) => actual + 1); }} />}
    </div>
  );
}
