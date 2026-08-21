import { useState, useEffect } from 'react';
import { faregasConfigApi } from '../../../services/faregas-config.api';
import { ServicioModal } from './ServicioModal';

export default function TabServicios() {
  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [currentServicio, setCurrentServicio] = useState<any>({});
  
  // Filters
  const [search, setSearch] = useState('');
  const [familiaFilter, setFamiliaFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');

  const loadServicios = async () => {
    try {
      setLoading(true);
      const data = await faregasConfigApi.getServicios();
      setServicios(data);
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

  const getCertificadoBaseLabel = (tipo: string, modalidad: string) => {
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
    const matchFamilia = familiaFilter === '' || s.familia === familiaFilter;
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
            className="w-full border rounded-lg p-2 text-sm focus:border-[#052A79] focus:outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <select 
            className="w-full border rounded-lg p-2 text-sm focus:border-[#052A79] focus:outline-none bg-white"
            value={familiaFilter}
            onChange={e => setFamiliaFilter(e.target.value)}
          >
            <option value="">Familia: Todas</option>
            <option value="GLP">GLP</option>
            <option value="GNV">GNV</option>
            <option value="CONFORMIDAD">CONFORMIDAD</option>
          </select>
        </div>
        <div className="w-full md:w-48">
          <select 
            className="w-full border rounded-lg p-2 text-sm focus:border-[#052A79] focus:outline-none bg-white"
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
              <thead className="bg-white text-xs uppercase text-gray-500 border-b">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Familia</th>
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
                    <td className="px-4 py-3 text-gray-600 font-semibold">{s.familia}</td>
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
                      <div className="flex justify-center gap-3 text-xs font-semibold">
                        <button
                          onClick={() => {
                            setModalMode('EDIT');
                            setCurrentServicio(s);
                            setShowModal(true);
                          }}
                          className="text-[#052A79] hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActivo(s.id, s.activo)}
                          className={`${s.activo ? 'text-red-600 hover:underline' : 'text-green-600 hover:underline'}`}
                        >
                          {s.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredServicios.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-500">No hay servicios que coincidan con los filtros.</td>
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
          onClose={() => setShowModal(false)}
          onSaved={loadServicios}
        />
      )}
    </div>
  );
}
