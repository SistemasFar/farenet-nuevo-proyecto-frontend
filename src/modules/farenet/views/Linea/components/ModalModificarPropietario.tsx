import React, { useState, useEffect } from 'react';
import { X, Save, ShieldAlert, Loader2 } from 'lucide-react';
import { lineaApi } from '@/services/api';

interface PropietarioData {
  sinDni: boolean;
  nroDocumento: string;
  nombres: string;
  apellidos: string;
  razonSocial: string;
  pais: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  email: string;
  telefono: string;
}

interface ModalModificarPropietarioProps {
  isOpen: boolean;
  onClose: () => void;
  datosIniciales: Partial<PropietarioData> | null;
  nroInspeccion: string;
  onSaved?: () => void;
}

export function ModalModificarPropietario({ isOpen, onClose, datosIniciales, nroInspeccion, onSaved }: ModalModificarPropietarioProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PropietarioData>({
    sinDni: false,
    nroDocumento: '',
    nombres: '',
    apellidos: '',
    razonSocial: '',
    pais: '',
    departamento: '',
    provincia: '',
    distrito: '',
    direccion: '',
    email: '',
    telefono: ''
  });

  const [maestrosPropietario, setMaestrosPropietario] = useState<any>(null);
  const [provincias, setProvincias] = useState<any[]>([]);
  const [distritos, setDistritos] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      import('@/services/api').then(({ maestrosApi }) => {
        maestrosApi.obtenerMaestrosPropietario().then((res: any) => setMaestrosPropietario(res.data)).catch(console.error);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && datosIniciales) {
      setFormData(prev => ({ ...prev, ...datosIniciales }));
    }
  }, [isOpen, datosIniciales]);

  useEffect(() => {
    if (formData.departamento) {
      import('@/services/api').then(({ maestrosApi }) => {
        maestrosApi.obtenerProvincias(formData.departamento).then((res: any) => setProvincias(res.data)).catch(console.error);
      });
    } else {
      setProvincias([]);
    }
  }, [formData.departamento]);

  useEffect(() => {
    if (formData.provincia) {
      import('@/services/api').then(({ maestrosApi }) => {
        maestrosApi.obtenerDistritos(formData.provincia).then((res: any) => setDistritos(res.data)).catch(console.error);
      });
    } else {
      setDistritos([]);
    }
  }, [formData.provincia]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name === 'nombres' || name === 'apellidos') {
      value = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    } else if (name === 'telefono') {
      value = value.replace(/[^0-9]/g, '');
      if (value.length > 0 && value[0] !== '9') value = '9' + value.substring(1);
      if (value.length > 9) value = value.substring(0, 9);
    } else if (name === 'nroDocumento') {
      value = value.replace(/[^0-9]/g, '');
      if (value.length > 11) value = value.substring(0, 11);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAceptar = async () => {
    if (!formData.sinDni) {
      if (!formData.nroDocumento || (formData.nroDocumento.length !== 8 && formData.nroDocumento.length !== 11)) {
        alert("El número de documento debe tener 8 (DNI) u 11 (RUC) dígitos.");
        return;
      }
    }

    if (!formData.sinDni && !formData.nombres.trim() && !formData.razonSocial.trim()) {
      alert("Debe proporcionar nombres o razón social.");
      return;
    }

    try {
      setLoading(true);
      await lineaApi.modificarPropietario(nroInspeccion, formData);
      alert('Propietario actualizado correctamente.');
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error interno al actualizar propietario.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    // Solo cierra, no toca nada
    onClose();
  };

  const [localPhone, setLocalPhone] = useState('');
  const [isPhoneMasked, setIsPhoneMasked] = useState(false);

  useEffect(() => {
    if (formData.telefono !== localPhone) {
      setLocalPhone(formData.telefono || '');
      if (formData.telefono && formData.telefono.length > 3) {
        setIsPhoneMasked(true);
      } else {
        setIsPhoneMasked(false);
      }
    }
  }, [formData.telefono, localPhone]);

  let displayPhone = formData.telefono || '';
  if (isPhoneMasked && displayPhone.length > 3) {
    displayPhone = '*'.repeat(displayPhone.length - 3) + displayPhone.slice(-3);
  } else {
    displayPhone = localPhone;
  }

  const handlePhoneChange = (e: any) => {
    let val = e.target.value;
    if (isPhoneMasked) {
      setIsPhoneMasked(false);
      const nativeEvent = e.nativeEvent as any;
      if (nativeEvent.inputType === 'deleteContentBackward') {
        val = '';
      } else if (nativeEvent.data) {
        val = nativeEvent.data.replace(/[^0-9]/g, '');
      } else if (!e.target.value.includes('*')) {
        val = e.target.value.replace(/[^0-9]/g, '');
      } else {
        val = '';
      }
    } else {
      val = val.replace(/[^0-9]/g, '');
    }
    setLocalPhone(val);
    handleInputChange({ target: { name: 'telefono', value: val } } as any);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
            Modificar Propietario (Certificado)
          </h2>
          <button onClick={handleCancelar} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-sm bg-slate-50 flex-1">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded text-amber-800 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>Los cambios realizados aquí solo aplicarán para la emisión del Certificado en esta inspección ({nroInspeccion}).</span>
          </div>

          <div className="flex items-center gap-2 mb-2 p-2 bg-white border border-slate-200 rounded">
            <input 
              type="checkbox" 
              id="sinDni" 
              name="sinDni" 
              checked={formData.sinDni} 
              onChange={handleInputChange} 
              className="w-4 h-4 text-blue-600 rounded border-slate-300"
            />
            <label htmlFor="sinDni" className="font-bold text-slate-700 cursor-pointer">SIN DNI / EXTRANJERO</label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!formData.sinDni && (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">DNI / RUC</label>
                <input 
                  type="text" 
                  name="nroDocumento"
                  value={formData.nroDocumento}
                  onChange={handleInputChange}
                  className="w-full border border-slate-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-200 uppercase"
                />
              </div>
            )}

            {!formData.sinDni && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Razón Social (Si es Empresa)</label>
                  <input 
                    type="text" 
                    name="razonSocial"
                    value={formData.razonSocial}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-200 uppercase"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 italic">Ubigeo pendiente de selección por maestro.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombres</label>
                  <input 
                    type="text" 
                    name="nombres"
                    value={formData.nombres}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-200 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Apellidos</label>
                  <input 
                    type="text" 
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-200 uppercase"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">País</label>
              <select 
                name="pais"
                value={formData.pais}
                onChange={handleInputChange}
                className="w-full border border-slate-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Seleccione...</option>
                {maestrosPropietario?.paises?.map((x: any) => (
                  <option key={x.key} value={x.key}>{x.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Departamento</label>
              <select 
                name="departamento"
                value={formData.departamento}
                onChange={handleInputChange}
                className="w-full border border-slate-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Seleccione...</option>
                {maestrosPropietario?.departamentos?.map((x: any) => (
                  <option key={x.key} value={x.key}>{x.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Provincia</label>
              <select 
                name="provincia"
                value={formData.provincia}
                onChange={handleInputChange}
                disabled={!formData.departamento}
                className="w-full border border-slate-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
              >
                <option value="">Seleccione...</option>
                {provincias?.map((x: any) => (
                  <option key={x.key} value={x.key}>{x.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Distrito</label>
              <select 
                name="distrito"
                value={formData.distrito}
                onChange={handleInputChange}
                disabled={!formData.provincia}
                className="w-full border border-slate-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
              >
                <option value="">Seleccione...</option>
                {distritos?.map((x: any) => (
                  <option key={x.key} value={x.key}>{x.nombre}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Dirección</label>
              <input 
                type="text" 
                name="direccion"
                value={formData.direccion}
                onChange={handleInputChange}
                className="w-full border border-slate-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-200 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full border border-slate-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Teléfono</label>
              <input 
                type="tel" 
                name="telefono"
                value={displayPhone}
                onChange={handlePhoneChange}
                className="w-full border border-slate-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 rounded-b-lg">
          <button 
            onClick={handleCancelar} 
            disabled={loading}
            className="px-4 py-2 border border-slate-300 rounded font-bold text-sm text-slate-600 hover:bg-slate-50 uppercase disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            onClick={handleAceptar} 
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors uppercase disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
