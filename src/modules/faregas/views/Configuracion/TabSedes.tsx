import { useState, useEffect } from 'react';
import { Edit, Power, PowerOff } from 'lucide-react';
import { faregasConfigApi, type Sede } from '../../services/faregas-config.api';
import { exportarExcel } from '../../utils/exportar-excel';

const mensajeError = (error: unknown, defecto: string) => error instanceof Error ? error.message : defecto;

export default function TabSedes() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [currentSede, setCurrentSede] = useState<Partial<Sede>>({});
  
  const loadSedes = async () => {
    try {
      setLoading(true);
      const data = await faregasConfigApi.obtenerSedes();
      setSedes(data);
    } catch (err: unknown) {
      setError(mensajeError(err, 'Error al cargar sedes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelado = false;
    void faregasConfigApi.obtenerSedes()
      .then((data) => { if (!cancelado) { setSedes(data); setError(''); } })
      .catch((err: unknown) => { if (!cancelado) setError(mensajeError(err, 'Error al cargar sedes')); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, []);

  const handleCreateSede = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await faregasConfigApi.crearSede(currentSede);
      setShowModal(false);
      loadSedes();
    } catch (err: unknown) {
      alert(mensajeError(err, 'Error al crear'));
    }
  };

  const handleEditSede = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSede.key) return;
    try {
      await faregasConfigApi.editarSede(currentSede.key, currentSede);
      setShowModal(false);
      loadSedes();
    } catch (err: unknown) {
      alert(mensajeError(err, 'Error al editar'));
    }
  };

  const handleToggleActivo = async (key: string, currentActivo: boolean) => {
    if (!confirm(`¿Seguro que deseas ${currentActivo ? 'desactivar' : 'activar'} esta sede?`)) return;
    try {
      await faregasConfigApi.cambiarEstadoSede(key, !currentActivo);
      const sedeObj = sedes.find((p) => p.key === key);
      window.dispatchEvent(new CustomEvent('updatePlantasDisponibles', { 
        detail: { key, activo: !currentActivo, nombre: sedeObj?.nombre }
      }));
      loadSedes();
    } catch (err: unknown) {
      alert(mensajeError(err, 'Error al cambiar estado'));
    }
  };

  return (
    <div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <span className="font-semibold text-gray-700">Administración de Sedes</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || sedes.length === 0}
              onClick={() => exportarExcel('faregas_sedes', 'Sedes', [
                { key: 'codigo', header: 'CÓDIGO', width: 14 },
                { key: 'nombre', header: 'NOMBRE', width: 24 },
                { key: 'direccion', header: 'DIRECCIÓN', width: 60 },
                { key: 'telefono', header: 'TELÉFONO', width: 22 },
                { key: 'correo', header: 'CORREO', width: 30 },
                { key: 'empresa', header: 'EMPRESA', width: 34 },
                { key: 'tarifas', header: 'TARIFAS', width: 12 },
                { key: 'estado', header: 'ESTADO', width: 14 }
              ], sedes.map((sede) => ({
                codigo: sede.key,
                nombre: sede.nombre,
                direccion: sede.direccion || '',
                telefono: sede.telefono || '',
                correo: sede.correo || '',
                empresa: sede.empresa_nombre || '',
                tarifas: sede.total_tarifas || 0,
                estado: sede.activo ? 'ACTIVA' : 'INACTIVA'
              })))}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ↓ Exportar Excel
            </button>
            <button
              onClick={() => {
                setModalMode('CREATE');
                setCurrentSede({});
                setShowModal(true);
              }}
              className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              + Nueva Sede
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10">Cargando sedes...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-10">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Dirección</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3 text-center">Tarifas</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sedes.map((s) => (
                  <tr key={s.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{s.key}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{s.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{s.direccion || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.telefono || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[120px]" title={s.correo || ''}>{s.correo || '-'}</td>
                    <td className="px-4 py-3"><div className="font-medium text-gray-700">{s.empresa_nombre}</div><div className="font-mono text-xs text-gray-400">{s.empresa_key}</div></td>
                    <td className="px-4 py-3 text-center font-medium">{s.total_tarifas || 0}</td>
                    <td className="px-4 py-3 text-center">
                      {s.activo ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                          ACTIVA
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                          INACTIVA
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-3 text-xs font-semibold">
                        <button onClick={() => { setModalMode('EDIT'); setCurrentSede(s); setShowModal(true); }} title="Editar" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[#052A79] hover:bg-blue-100 transition-colors"><Edit size={18} /></button>
                        <button onClick={() => handleToggleActivo(s.key, s.activo)} title={s.activo ? 'Desactivar' : 'Activar'} className={s.activo ? "rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[#052A79] hover:bg-red-100 transition-colors" : "rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-[#052A79] hover:bg-green-100 transition-colors"}>{s.activo ? <PowerOff size={18} /> : <Power size={18} />}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {modalMode === 'CREATE' ? 'Nueva Sede' : 'Editar Sede'}
            </h3>
            <form onSubmit={modalMode === 'CREATE' ? handleCreateSede : handleEditSede}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Código (Key)</label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'EDIT'}
                    maxLength={20}
                    className="w-full border rounded-lg p-2 disabled:bg-slate-100"
                    value={currentSede.key || ''}
                    onChange={(e) => setCurrentSede({ ...currentSede, key: e.target.value })}
                  />
                  {modalMode === 'EDIT' && <span className="text-xs text-slate-500">El código no puede modificarse.</span>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded-lg p-2"
                    value={currentSede.nombre || ''}
                    onChange={(e) => setCurrentSede({ ...currentSede, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2"
                    value={currentSede.direccion || ''}
                    onChange={(e) => setCurrentSede({ ...currentSede, direccion: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg p-2"
                    value={currentSede.telefono || ''}
                    onChange={(e) => setCurrentSede({ ...currentSede, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Correo</label>
                  <input
                    type="email"
                    className="w-full border rounded-lg p-2"
                    value={currentSede.correo || ''}
                    onChange={(e) => setCurrentSede({ ...currentSede, correo: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
