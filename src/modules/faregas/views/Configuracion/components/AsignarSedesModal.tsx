import { useState, useEffect } from 'react';
import { faregasTarifasAdminApi } from '../../../services/faregas-tarifas-admin.api';
import { type SedeTarifaAsignada } from '../../../services/faregas-config.api';

interface Props {
  servicioId: number;
  servicioNombre: string;
  sedesDisponibles: any[];
  tarifasAsignadas: SedeTarifaAsignada[];
  onClose: () => void;
  onSaved: () => void;
}

export function AsignarSedesModal({ servicioId, servicioNombre, sedesDisponibles, tarifasAsignadas, onClose, onSaved }: Props) {
  const [sedesState, setSedesState] = useState<Record<string, { selected: boolean, precio: string, sku: string, tarifa_id?: number, original_activo?: boolean }>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const initialState: Record<string, { selected: boolean, precio: string, sku: string, tarifa_id?: number, original_activo?: boolean }> = {};
    sedesDisponibles.forEach(sede => {
      const tarifa = tarifasAsignadas.find(t => t.key === sede.key);
      initialState[sede.key] = {
        selected: tarifa ? tarifa.activo : false,
        precio: tarifa ? tarifa.precio.toString() : '0',
        sku: tarifa?.producto_facturacion_id ? tarifa.producto_facturacion_id.toString() : '',
        tarifa_id: tarifa?.tarifa_id,
        original_activo: tarifa?.activo
      };
    });
    setSedesState(initialState);
  }, [sedesDisponibles, tarifasAsignadas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    
    try {
      const promesasTarifas = [];
      for (const sede of sedesDisponibles) {
        const key = sede.key;
        const state = sedesState[key];
        if (!state) continue;

        if (state.selected) {
           if (state.tarifa_id) {
               promesasTarifas.push(
                  faregasTarifasAdminApi.editar(state.tarifa_id, {
                      precio: Number(state.precio) || 0,
                      producto_facturacion_id: state.sku ? Number(state.sku) : null,
                      activo: true
                  })
               );
           } else {
               promesasTarifas.push(
                  faregasTarifasAdminApi.crear({
                      planta_key: key,
                      servicio_id: servicioId,
                      precio: Number(state.precio) || 0,
                      producto_facturacion_id: state.sku ? Number(state.sku) : null,
                      activo: true
                  })
               );
           }
        } else {
           if (state.tarifa_id && state.original_activo !== false) {
               promesasTarifas.push(faregasTarifasAdminApi.cambiarEstado(state.tarifa_id, false));
           }
        }
      }

      await Promise.all(promesasTarifas);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar asignaciones');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <h3 className="text-xl font-bold mb-1 text-[#052A79]">Asignar Sedes</h3>
        <p className="text-sm text-gray-500 mb-4">Configurando disponibilidad para: <strong className="text-gray-800">{servicioNombre}</strong></p>
        
        {error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded border border-red-200 text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 overflow-y-auto pr-2 pb-4">
            {sedesDisponibles.map(sede => {
              const state = sedesState[sede.key];
              if (!state) return null;
              return (
                <div key={sede.key} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${state.selected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-[#052A79] shrink-0"
                    checked={state.selected}
                    onChange={(e) => setSedesState(prev => ({
                      ...prev,
                      [sede.key]: { ...state, selected: e.target.checked }
                    }))}
                  />
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <span className="text-sm font-bold text-gray-700 truncate block leading-tight">{sede.nombre}</span>
                    {state.selected && (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required={state.selected}
                          placeholder="Precio (S/)"
                          className="w-1/2 border border-blue-200 rounded p-1.5 text-xs focus:outline-none focus:border-blue-500"
                          value={state.precio}
                          onChange={(e) => setSedesState(prev => ({ ...prev, [sede.key]: { ...state, precio: e.target.value } }))}
                        />
                        <input
                          type="number"
                          placeholder="SKU ID (Opcional)"
                          className="w-1/2 border border-blue-200 rounded p-1.5 text-xs focus:outline-none focus:border-blue-500"
                          value={state.sku}
                          onChange={(e) => setSedesState(prev => ({ ...prev, [sede.key]: { ...state, sku: e.target.value } }))}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {sedesDisponibles.length === 0 && (
              <div className="text-sm text-gray-500 italic col-span-2">No hay sedes disponibles.</div>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-3 pt-4 border-t shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#052A79] hover:bg-blue-900 text-white font-bold rounded transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
