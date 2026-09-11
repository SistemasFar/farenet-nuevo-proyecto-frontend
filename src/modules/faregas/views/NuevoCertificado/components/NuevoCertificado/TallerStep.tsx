import React from 'react';
import type { GuardarTallerFaregasRequest } from '../../../../types/faregas-api';

interface TallerStepProps {
  formTaller: GuardarTallerFaregasRequest;
  setFormTaller: React.Dispatch<React.SetStateAction<GuardarTallerFaregasRequest>>;
  certificadoId?: number;
}

export const TallerStep: React.FC<TallerStepProps> = ({ formTaller, setFormTaller }) => {

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormTaller(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in pb-12">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="bg-[#f4f9ff] px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#052a79]/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#052a79]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg uppercase">Datos del Taller a Inspeccionar</h3>
            <p className="text-xs text-slate-500">Ingrese la información obligatoria del taller autorizado.</p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                Nombre del Taller <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={formTaller.nombre || ''}
                onChange={handleChange}
                placeholder="Ej. TALLER DE CONVERSIONES S.A.C."
                className="w-full h-11 px-4 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl focus:border-[#052a79] focus:ring-4 focus:ring-blue-50 transition-all uppercase"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                N° Autorización
              </label>
              <input
                type="text"
                name="numeroAutorizacion"
                value={formTaller.numeroAutorizacion || ''}
                onChange={handleChange}
                placeholder="N° de Resolución / Autorización"
                className="w-full h-11 px-4 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl focus:border-[#052a79] focus:ring-4 focus:ring-blue-50 transition-all uppercase"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                Dirección <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="direccion"
                value={formTaller.direccion || ''}
                onChange={handleChange}
                placeholder="Dirección completa del Taller"
                className="w-full h-11 px-4 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl focus:border-[#052a79] focus:ring-4 focus:ring-blue-50 transition-all uppercase"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                Ciudad / Distrito <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="ciudad"
                value={formTaller.ciudad || ''}
                onChange={handleChange}
                placeholder="Ej. LIMA - SURQUILLO"
                className="w-full h-11 px-4 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl focus:border-[#052a79] focus:ring-4 focus:ring-blue-50 transition-all uppercase"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                Representante Legal <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="representanteLegal"
                value={formTaller.representanteLegal || ''}
                onChange={handleChange}
                placeholder="Nombre completo"
                className="w-full h-11 px-4 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl focus:border-[#052a79] focus:ring-4 focus:ring-blue-50 transition-all uppercase"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Teléfono
              </label>
              <input
                type="text"
                name="telefono"
                value={formTaller.telefono || ''}
                onChange={handleChange}
                placeholder="Teléfono de contacto"
                className="w-full h-11 px-4 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl focus:border-[#052a79] focus:ring-4 focus:ring-blue-50 transition-all uppercase"
              />
            </div>
            
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Observaciones de Inspección
              </label>
              <textarea
                name="observaciones"
                value={formTaller.observaciones || ''}
                onChange={handleChange}
                placeholder="Notas u observaciones de la inspección"
                rows={3}
                className="w-full px-4 py-3 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl focus:border-[#052a79] focus:ring-4 focus:ring-blue-50 transition-all uppercase resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Próxima Inspección
              </label>
              <input
                type="date"
                name="fechaProximaInspeccion"
                value={formTaller.fechaProximaInspeccion || ''}
                onChange={handleChange}
                className="w-full h-11 px-4 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl focus:border-[#052a79] focus:ring-4 focus:ring-blue-50 transition-all uppercase"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
