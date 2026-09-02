import { useState, useEffect } from 'react';
import { Edit, Power, PowerOff } from 'lucide-react';
import { faregasConfigApi, type CategoriaServicio, type ServicioConfiguracionFaregas } from '../../../services/faregas-config.api';
import { ServicioModal } from './ServicioModal';

export default function TabServicios() {
  const [servicios, setServicios] = useState<ServicioConfiguracionFaregas[]>([]);
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [sedesAsignadas, setSedesAsignadas] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [currentServicio, setCurrentServicio] = useState<Partial<ServicioConfiguracionFaregas>>({});
  
  // Filters
  const [search, setSearch] = useState('');
  const [familiaFilter, setFamiliaFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  const loadServicios = async () => {
    try {
      setLoading(true);
      const [data, categoriasData, sedesData, sedesAsignadasData] = await Promise.all([
        faregasConfigApi.getServicios(),
        faregasConfigApi.obtenerCategorias(true),
        faregasConfigApi.obtenerSedes(),
        faregasConfigApi.obtenerSedesPorServicio().catch(() => ({}))
      ]);
      setServicios(data);
      setCategorias(categoriasData);
      setSedes(sedesData.filter(s => s.activo));
      setSedesAsignadas(sedesAsignadasData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServicios();
  }, []);

  const handleToggleActivo = async (id: number, currentActivo: boolean) => {
    if (!confirm(`¿Seguro que deseas ${currentActivo ? 'desactivar' : 'activar'} este servicio?`)) return;
    try {
      await faregasConfigApi.cambiarEstadoServicio(id, !currentActivo);
      loadServicios();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  const getCertificadoBaseLabel = (tipo: string | null, modalidad: string | null) => {
    if (tipo === 'GNV_ANUAL' && modalidad === 'INICIAL') return 'GNV Inicial';
    if (tipo === 'GNV_ANUAL' && modalidad === 'ANUAL') return 'GNV Anual';
    if (tipo === 'GLP_ANUAL' && modalidad === 'INICIAL') return 'GLP Inicial';
    if (tipo === 'GLP_ANUAL' && modalidad === 'ANUAL') return 'GLP Anual';
    if (tipo === 'CONFORMIDAD') return 'Conformidad';
    return '-';
  };

  const filteredServicios = servicios.filter(s => {
    const matchSearch = (s.codigo || '').toLowerCase().includes(search.toLowerCase()) || 
                        (s.nombre || '').toLowerCase().includes(search.toLowerCase());
    const matchFamilia = familiaFilter === '' || s.categoria_codigo === familiaFilter;
    const matchEstado = estadoFilter === '' || (estadoFilter === '1' ? s.activo : !s.activo);
    return matchSearch && matchFamilia && matchEstado;
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <input 
            type="text"
            placeholder="Buscar por código o nombre..."
            className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-[#052A79] focus:outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <select 
            className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-[#052A79] focus:outline-none"
            value={familiaFilter}
            onChange={e => setFamiliaFilter(e.target.value)}
          >
            <option value="">Categoría: Todas</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.codigo}>{categoria.nombre}</option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-48">
          <select 
            className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-[#052A79] focus:outline-none"
            value={estadoFilter}
            onChange={e => setEstadoFilter(e.target.value)}
          >
            <option value="">Estado: Todos</option>
            <option value="1">Activos</option>
            <option value="0">Inactivos</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-gray-50">
          <span className="font-semibold text-gray-700">Administración de Servicios</span>
          <button
            onClick={() => {
              setModalMode('CREATE');
              setCurrentServicio({ activo: true });
              setShowModal(true);
            }}
            className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            + Nuevo Servicio
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10">Cargando servicios...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-10">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-white text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Flujo</th>
                  <th className="px-4 py-3">Certificado base</th>
                  <th className="px-4 py-3 text-center">Req. Vehículo</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredServicios.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-gray-700">{s.codigo}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{s.nombre}</td>
                    <td className="px-4 py-3 text-gray-600 font-semibold">{s.categoria_nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${s.tipo_flujo === 'CERTIFICACION' ? 'bg-blue-100 text-[#052A79]' : 'bg-amber-100 text-amber-800'}`}>
                        {s.tipo_flujo === 'CERTIFICACION' ? 'CERTIFICACIÓN' : 'COMPLEMENTARIO'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.requiere_certificado ? getCertificadoBaseLabel(s.tipo_certificado_clave, s.modalidad) : <span className="text-gray-400 italic">No requiere</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.requiere_vehiculo ? 'Sí' : 'No'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.activo ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                          ACTIVO
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                          INACTIVO
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setModalMode('EDIT'); setCurrentServicio(s); setShowModal(true); }} title="Editar" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[#052A79] hover:bg-blue-100 transition-colors"><Edit size={18} /></button>
                        <button onClick={() => handleToggleActivo(s.id, s.activo)} title={s.activo ? 'Desactivar' : 'Activar'} className={s.activo ? "rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[#052A79] hover:bg-red-100 transition-colors" : "rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-[#052A79] hover:bg-green-100 transition-colors"}>{s.activo ? <PowerOff size={18} /> : <Power size={18} />}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredServicios.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-gray-500">No hay servicios que coincidan con los filtros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ServicioModal 
          mode={modalMode} 
          initialData={currentServicio} 
          categorias={categorias}
          sedesDisponibles={sedes}
          tarifasAsignadas={currentServicio.id ? (sedesAsignadas[currentServicio.id] || []) : []}
          onClose={() => setShowModal(false)}
          onSaved={loadServicios}
        />
      )}
    </div>
  );
}
