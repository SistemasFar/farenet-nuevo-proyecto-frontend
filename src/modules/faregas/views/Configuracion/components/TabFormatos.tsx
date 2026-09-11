import { Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { faregasFormatosApi, type Formato } from '../../../services/faregas-formatos.api';
import FormatoDetalleModal from './FormatoDetalleModal';

export default function TabFormatos() {
  const [formatos, setFormatos] = useState<Formato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFormato, setSelectedFormato] = useState<Formato | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formatoPadreParaCrear, setFormatoPadreParaCrear] = useState<Formato | null>(null);
  
  // Create state
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      setError('');
      setFormatos(await faregasFormatosApi.listarFormatos());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar formatos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void cargar(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await faregasFormatosApi.crearFormato({ 
        nombre, 
        codigo, 
        motor: formatoPadreParaCrear ? 'HTML_DINAMICO' : 'DOCX_DINAMICO',
        formato_padre_id: formatoPadreParaCrear ? formatoPadreParaCrear.id : null
      });
      setShowCreateModal(false);
      setFormatoPadreParaCrear(null);
      setNombre('');
      setCodigo('');
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCreateModal = (padre: Formato | null = null) => {
    setFormatoPadreParaCrear(padre);
    setShowCreateModal(true);
    setNombre('');
    setCodigo('');
  };

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
          <span className="font-semibold text-gray-700">Administración de Formatos Dinámicos</span>
          <button
            onClick={() => handleOpenCreateModal()}
            className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white"
          >
            + Nuevo Formato
          </button>
        </div>

        {loading ? <div className="py-10 text-center">Cargando formatos...</div>
          : error ? <div className="py-10 text-center text-red-500">{error}</div>
          : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-white text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Motor</th>
                    <th className="px-4 py-3 text-center">Vigencia</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Tipo</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {formatos.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold text-gray-700">
                        {f.formato_padre_id && <span className="mr-2 text-gray-400">↳</span>}
                        {f.codigo}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        <div className={f.formato_padre_id ? "pl-4" : ""}>
                          {f.nombre}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{f.motor}</td>
                      <td className="px-4 py-3 text-center">
                        {f.tiene_version_vigente ? (
                          <span className="text-green-600 font-semibold">VIGENTE</span>
                        ) : (
                          <span className="text-gray-500 font-semibold">SIN VERSIÓN</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${f.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {f.activo ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${f.es_protegido ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {f.es_protegido ? 'PROTEGIDO' : 'DINÁMICO'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setSelectedFormato(f)}
                            title="Gestionar Versiones" 
                            className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[#052A79] hover:bg-blue-100 transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {formatos.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-gray-500">No hay formatos.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-[#052A79]">
              {formatoPadreParaCrear ? 'Nueva Variante de Formato' : 'Nuevo Formato'}
            </h3>
            {formatoPadreParaCrear && (
              <div className="mb-4 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">
                <span className="font-semibold">Basado en:</span> {formatoPadreParaCrear.nombre} ({formatoPadreParaCrear.codigo})<br />
                <span className="font-semibold">Motor:</span> HTML Dinámico
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Código Técnico</label>
                <input required maxLength={50} value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                  placeholder={formatoPadreParaCrear ? `EJ: ${formatoPadreParaCrear.codigo}_VAR` : "EJ: TALLER_INSPECCION"}
                  className="w-full rounded-lg border p-2 uppercase" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Nombre</label>
                <input required maxLength={100} value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Inspección de Taller"
                  className="w-full rounded-lg border p-2" />
              </div>
              <div className="flex justify-end gap-3 border-t pt-4">
                <button type="button" disabled={saving} onClick={() => { setShowCreateModal(false); setFormatoPadreParaCrear(null); }} className="rounded px-5 py-2 font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded bg-[#052A79] px-5 py-2 font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedFormato && (
        <FormatoDetalleModal 
          formato={selectedFormato} 
          onClose={() => { setSelectedFormato(null); void cargar(); }} 
          onCreateVariant={(padre) => {
            setSelectedFormato(null);
            handleOpenCreateModal(padre);
          }}
        />
      )}
    </div>
  );
}
