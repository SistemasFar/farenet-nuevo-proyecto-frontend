import { useState, useEffect } from 'react';
import {
  faregasConfigApi,
  type CategoriaServicio,
  type ServicioConfiguracionFaregas,
  type TipoFlujoServicioFaregas
} from '../../../services/faregas-config.api';

interface Props {
  mode: 'CREATE' | 'EDIT';
  initialData: Partial<ServicioConfiguracionFaregas>;
  categorias: CategoriaServicio[];
  onClose: () => void;
  onSaved: () => void;
}

type FormularioServicio = Omit<Partial<ServicioConfiguracionFaregas>, 'categoria_id'> & {
  categoria_id?: number | '';
  certificado_base: string;
};

export function ServicioModal({ mode, initialData, categorias, onClose, onSaved }: Props) {
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
      
      if (mode === 'CREATE') {
        await faregasConfigApi.crearServicio(servicio);
      } else {
        if (!formData.id) throw new Error('No se pudo identificar el servicio a editar.');
        await faregasConfigApi.editarServicio(formData.id, servicio);
      }
      
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
