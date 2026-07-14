import React, { useState, useEffect } from 'react';
import { X, Save, ShieldAlert, Loader2 } from 'lucide-react';
import { lineaApi } from '../../../../services/api';

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
  datosIniciales: PropietarioData | null;
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

  useEffect(() => {
    if (isOpen && datosIniciales) {
      setFormData(datosIniciales);
    }
  }, [isOpen, datosIniciales]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAceptar = async () => {
    if (formData.sinDni) {
      alert("No se encontró convención legacy para propietarios sin DNI. Pendiente de definir.");
      return;
    }

    if (!formData.nroDocumento || formData.nroDocumento.trim() === '') {
      alert("El número de documento es obligatorio.");
      return;
    }

    if (!formData.nombres.trim() && !formData.razonSocial.trim()) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
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
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">DNI / RUC</label>
              <input 
                type="text" 
                name="nroDocumento"
                value={formData.nroDocumento}
                onChange={handleInputChange}
                className="w-full border border-slate-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-200 uppercase"
                disabled={formData.sinDni}
              />
            </div>

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

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">País</label>
              <input 
                type="text" 
                name="pais"
                value={formData.pais}
                readOnly
                disabled
                className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-100 text-slate-500 cursor-not-allowed uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Departamento</label>
              <input 
                type="text" 
                name="departamento"
                value={formData.departamento}
                readOnly
                disabled
                className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-100 text-slate-500 cursor-not-allowed uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Provincia</label>
              <input 
                type="text" 
                name="provincia"
                value={formData.provincia}
                readOnly
                disabled
                className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-100 text-slate-500 cursor-not-allowed uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Distrito</label>
              <input 
                type="text" 
                name="distrito"
                value={formData.distrito}
                readOnly
                disabled
                className="w-full border border-slate-200 rounded p-2 text-sm bg-slate-100 text-slate-500 cursor-not-allowed uppercase"
              />
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
                value={formData.telefono}
                onChange={handleInputChange}
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
