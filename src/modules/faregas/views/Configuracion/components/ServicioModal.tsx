import { useState, useEffect } from 'react';
import {
  faregasConfigApi,
  type CategoriaServicio,
  type ServicioConfiguracionFaregas,
  type TipoFlujoServicioFaregas,
  type SedeTarifaAsignada
} from '../../../services/faregas-config.api';
import { faregasTarifasAdminApi } from '../../../services/faregas-tarifas-admin.api';

interface Props {
  mode: 'CREATE' | 'EDIT';
  initialData: Partial<ServicioConfiguracionFaregas>;
  categorias: CategoriaServicio[];
  sedesDisponibles: any[];
  tarifasAsignadas: SedeTarifaAsignada[];
  onClose: () => void;
  onSaved: () => void;
}

type FormularioServicio = Omit<Partial<ServicioConfiguracionFaregas>, 'categoria_id'> & {
  categoria_id?: number | '';
  certificado_base: string;
};

export function ServicioModal({ mode, initialData, categorias, sedesDisponibles, tarifasAsignadas, onClose, onSaved }: Props) {
  const [formData, setFormData] = useState<FormularioServicio>({
    codigo: '',
    nombre: '',
    categoria_id: categorias[0]?.id || '',
    tipo_flujo: 'CERTIFICACION',
    requiere_certificado: true,
    certificado_base: 'GNV_INICIAL',
    requiere_vehiculo: true,
    orden: 10,
    activo: true,
    ...initialData
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [sedesState, setSedesState] = useState<Record<string, { selected: boolean, precio: string, sku: string, tarifa_id?: number, original_activo?: boolean }>>({});

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

  // En inicialización, mapear DB -> Combo si es modo EDIT
  useEffect(() => {
    if (mode === 'EDIT' && initialData.requiere_certificado) {
      const tipo = initialData.tipo_certificado_clave;
      const mod = initialData.modalidad;
      let combo = '';
      if (tipo === 'GNV_ANUAL' && mod === 'INICIAL') combo = 'GNV_INICIAL';
      else if (tipo === 'GNV_ANUAL' && mod === 'ANUAL') combo = 'GNV_ANUAL';
      else if (tipo === 'GLP_ANUAL' && mod === 'INICIAL') combo = 'GLP_INICIAL';
      else if (tipo === 'GLP_ANUAL' && mod === 'ANUAL') combo = 'GLP_ANUAL';
      else if (tipo === 'CONFORMIDAD') combo = 'CONFORMIDAD';
      
      setFormData((prev) => ({ ...prev, certificado_base: combo || 'GNV_INICIAL' }));
    }
  }, [mode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    
    try {
      const payload = { ...formData };

      if (payload.tipo_flujo === 'CERTIFICACION' && !payload.requiere_certificado) {
        throw new Error('Una certificación debe generar uno de los cinco certificados base.');
      }
      if (payload.tipo_flujo === 'SERVICIO_COMPLEMENTARIO' && payload.requiere_certificado) {
        throw new Error('Un servicio complementario no puede generar un certificado.');
      }
      
      if (!payload.requiere_certificado) {
        payload.tipo_certificado_clave = null;
        payload.modalidad = null;
      } else {
        switch (payload.certificado_base) {
          case 'GNV_INICIAL':
            payload.tipo_certificado_clave = 'GNV_ANUAL';
            payload.modalidad = 'INICIAL';
            break;
          case 'GNV_ANUAL':
            payload.tipo_certificado_clave = 'GNV_ANUAL';
            payload.modalidad = 'ANUAL';
            break;
          case 'GLP_INICIAL':
            payload.tipo_certificado_clave = 'GLP_ANUAL';
            payload.modalidad = 'INICIAL';
            break;
          case 'GLP_ANUAL':
            payload.tipo_certificado_clave = 'GLP_ANUAL';
            payload.modalidad = 'ANUAL';
            break;
          case 'CONFORMIDAD':
            payload.tipo_certificado_clave = 'CONFORMIDAD';
            payload.modalidad = null;
            break;
        }
      }

      const servicio: Partial<ServicioConfiguracionFaregas> = {
        ...payload,
        categoria_id: Number(payload.categoria_id)
      };
      
      let targetId = formData.id;
      if (mode === 'CREATE') {
        targetId = await faregasConfigApi.crearServicio(servicio);
      } else {
        if (!targetId) throw new Error('No se pudo identificar el servicio a editar.');
        await faregasConfigApi.editarServicio(targetId, servicio);
      }
      
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
                      servicio_id: targetId!,
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
      setError(err.message || 'Error al guardar el servicio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-[#052A79]">
          {mode === 'CREATE' ? 'Nuevo Servicio' : 'Editar Servicio'}
        </h3>
        
        {error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded border border-red-200 text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Código técnico</label>
              <input
                type="text"
                required
                disabled={mode === 'EDIT'}
                maxLength={30}
                className="w-full border rounded-lg p-2 text-sm disabled:bg-slate-100 disabled:text-slate-500 uppercase"
                value={formData.codigo || ''}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre comercial</label>
              <input
                type="text"
                required
                className="w-full border rounded-lg p-2 text-sm"
                value={formData.nombre || ''}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de flujo</label>
              <select
                required
                className="w-full border rounded-lg p-2 text-sm bg-white"
                value={formData.tipo_flujo}
                onChange={(e) => setFormData({ ...formData, tipo_flujo: e.target.value as TipoFlujoServicioFaregas })}
              >
                <option value="CERTIFICACION">Certificación</option>
                <option value="SERVICIO_COMPLEMENTARIO">Servicio complementario</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">Sólo las certificaciones pueden aparecer en Nuevo Certificado.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Categoría</label>
              <select
                required
                className="w-full border rounded-lg p-2 text-sm bg-white"
                value={formData.categoria_id}
                onChange={(e) => setFormData({ ...formData, categoria_id: Number(e.target.value) })}
              >
                <option value="">-- Seleccionar --</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2 pt-2 md:col-start-2">
              <input
                type="checkbox"
                id="req_veh"
                className="w-4 h-4 text-[#052A79]"
                checked={formData.requiere_vehiculo}
                onChange={(e) => setFormData({ ...formData, requiere_vehiculo: e.target.checked })}
              />
              <label htmlFor="req_veh" className="text-sm font-semibold text-slate-700 cursor-pointer">¿Requiere vehículo en planta?</label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="flex flex-col gap-2">
              <label className="block text-sm font-semibold text-slate-700">¿Genera certificado?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" name="req_cert" checked={formData.requiere_certificado === true} 
                    onChange={() => setFormData({ ...formData, requiere_certificado: true })} />
                  Sí
                </label>
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" name="req_cert" checked={formData.requiere_certificado === false} 
                    onChange={() => setFormData({ ...formData, requiere_certificado: false })} />
                  No
                </label>
              </div>
            </div>

            {formData.requiere_certificado && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Certificado base</label>
                <select
                  required
                  className="w-full border rounded-lg p-2 text-sm bg-white"
                  value={formData.certificado_base}
                  onChange={(e) => setFormData({ ...formData, certificado_base: e.target.value })}
                >
                  <option value="GNV_INICIAL">GNV Inicial</option>
                  <option value="GNV_ANUAL">GNV Anual</option>
                  <option value="GLP_INICIAL">GLP Inicial</option>
                  <option value="GLP_ANUAL">GLP Anual</option>
                  <option value="CONFORMIDAD">Conformidad</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Orden de visualización</label>
              <input
                type="number"
                required
                className="w-full border rounded-lg p-2 text-sm"
                value={formData.orden}
                onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
              />
            </div>
            
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="activo"
                className="w-4 h-4 text-[#052A79]"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              />
              <label htmlFor="activo" className="text-sm font-semibold text-slate-700 cursor-pointer">Servicio Activo</label>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-bold text-[#052A79] mb-3">Disponibilidad en Sedes (Tarifas)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 max-h-60 overflow-y-auto pr-2">
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
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
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
