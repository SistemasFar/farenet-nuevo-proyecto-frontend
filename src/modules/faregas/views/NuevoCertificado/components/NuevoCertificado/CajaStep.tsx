import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { CheckCircle, Flame, Leaf, FileCheck } from 'lucide-react';
import { faregasCertificadosApi } from '../../../../services/faregas-certificados.api';
import type { FormCajaState } from '../../NuevoCertificadoView';

interface CajaStepProps {
  formCaja: FormCajaState;
  setFormCaja: Dispatch<SetStateAction<FormCajaState>>;
}

export function CajaStep({ formCaja, setFormCaja }: CajaStepProps) {
  const [tiposDisponibles, setTiposDisponibles] = useState<string[]>([]);

  useEffect(() => {
    faregasCertificadosApi.obtenerTipos()
      .then(res => {
        if (res.ok && res.data) {
          setTiposDisponibles(res.data.map((t: { clave: string }) => t.clave));
        }
      })
      .catch(err => console.error('Error al obtener tipos de certificado', err));
  }, []);

  const handleSelectTipo = (tipo: string, modalidad?: 'INICIAL' | 'ANUAL') => {
    setFormCaja(prev => ({ ...prev, tipoCertificado: tipo, modalidadCertificado: modalidad || '' }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">1. Tipo de Certificado</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card GLP */}
          <div
            className={`rounded-2xl p-6 border-2 transition-all duration-300 relative overflow-hidden ${
              !tiposDisponibles.includes('GLP_ANUAL') ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200' :
              formCaja.tipoCertificado === 'GLP_ANUAL'
                ? 'border-[#052a79] bg-[#052a79]/5 shadow-md scale-[1.02]'
                : 'border-slate-200 bg-white hover:border-[#052a79]/30 hover:bg-slate-50'
            }`}
          >
            {formCaja.tipoCertificado === 'GLP_ANUAL' && (
              <div className="absolute top-4 right-4">
                <CheckCircle className="w-6 h-6 text-[#052a79]" />
              </div>
            )}
            <Flame className={`w-10 h-10 mb-4 ${formCaja.tipoCertificado === 'GLP_ANUAL' ? 'text-[#052a79]' : 'text-slate-400'}`} />
            <h5 className="font-bold text-slate-800 text-lg mb-2">GLP</h5>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {(['INICIAL', 'ANUAL'] as const).map(modalidad => (
                <button
                  key={modalidad}
                  type="button"
                  disabled={!tiposDisponibles.includes('GLP_ANUAL')}
                  onClick={() => handleSelectTipo('GLP_ANUAL', modalidad)}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-black transition ${formCaja.tipoCertificado === 'GLP_ANUAL' && formCaja.modalidadCertificado === modalidad ? 'border-[#052a79] bg-[#052a79] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#052a79]'}`}
                >
                  {modalidad}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Certificación relacionada con el sistema de combustión a Gas Licuado de Petróleo.
            </p>
          </div>

          {/* Card GNV */}
          <div
            className={`rounded-2xl p-6 border-2 transition-all duration-300 relative overflow-hidden ${
              !tiposDisponibles.includes('GNV_ANUAL') ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200' :
              formCaja.tipoCertificado === 'GNV_ANUAL'
                ? 'border-[#052a79] bg-[#052a79]/5 shadow-md scale-[1.02]'
                : 'border-slate-200 bg-white hover:border-[#052a79]/30 hover:bg-slate-50'
            }`}
          >
            {formCaja.tipoCertificado === 'GNV_ANUAL' && (
              <div className="absolute top-4 right-4">
                <CheckCircle className="w-6 h-6 text-[#052a79]" />
              </div>
            )}
            <Leaf className={`w-10 h-10 mb-4 ${formCaja.tipoCertificado === 'GNV_ANUAL' ? 'text-[#052a79]' : 'text-slate-400'}`} />
            <h5 className="font-bold text-slate-800 text-lg mb-2">GNV</h5>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {(['INICIAL', 'ANUAL'] as const).map(modalidad => (
                <button
                  key={modalidad}
                  type="button"
                  disabled={!tiposDisponibles.includes('GNV_ANUAL')}
                  onClick={() => handleSelectTipo('GNV_ANUAL', modalidad)}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-black transition ${formCaja.tipoCertificado === 'GNV_ANUAL' && formCaja.modalidadCertificado === modalidad ? 'border-[#052a79] bg-[#052a79] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#052a79]'}`}
                >
                  {modalidad}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Certificación inicial o anual del sistema de Gas Natural Vehicular.
            </p>
          </div>

          {/* Card Conformidad */}
          <div
            onClick={() => tiposDisponibles.includes('CONFORMIDAD') && handleSelectTipo('CONFORMIDAD')}
            className={`rounded-2xl p-6 border-2 transition-all duration-300 relative overflow-hidden ${
              !tiposDisponibles.includes('CONFORMIDAD') ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200' :
              formCaja.tipoCertificado === 'CONFORMIDAD'
                ? 'cursor-pointer border-[#052a79] bg-[#052a79]/5 shadow-md scale-[1.02]'
                : 'cursor-pointer border-slate-200 bg-white hover:border-[#052a79]/30 hover:bg-slate-50'
            }`}
          >
            {formCaja.tipoCertificado === 'CONFORMIDAD' && (
              <div className="absolute top-4 right-4">
                <CheckCircle className="w-6 h-6 text-[#052a79]" />
              </div>
            )}
            <FileCheck className={`w-10 h-10 mb-4 ${formCaja.tipoCertificado === 'CONFORMIDAD' ? 'text-[#052a79]' : 'text-slate-400'}`} />
            <h5 className="font-bold text-slate-800 text-lg mb-2">CONFORMIDAD</h5>
            <p className="text-sm text-slate-500 leading-relaxed">
              Certificación de características registrables, modificación, montaje o fabricación.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-slate-100">
        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">2. Datos Básicos</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Placa de Rodaje
            </label>
            <input
              type="text"
              className="w-full h-[42px] px-4 rounded-xl border-2 border-slate-200 bg-white text-slate-800 font-bold focus:border-[#f59e0b] focus:ring-0 transition-colors uppercase"
              placeholder="EJ: ABC-123"
              value={formCaja.placa || ''}
              onChange={(e) => setFormCaja(prev => ({ ...prev, placa: e.target.value.trim().toUpperCase() }))}
              maxLength={7}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Categoría Vehicular
            </label>
            <select
              className="w-full h-[42px] px-4 rounded-xl border-2 border-slate-200 bg-white text-slate-800 font-bold focus:border-[#f59e0b] focus:ring-0 transition-colors"
              value={formCaja.categoria || ''}
              onChange={(e) => setFormCaja(prev => ({ ...prev, categoria: e.target.value }))}
            >
              <option value="">-- Seleccionar --</option>
              <option value="M1">M1</option>
              <option value="M2">M2</option>
              <option value="M3">M3</option>
              <option value="N1">N1</option>
              <option value="N2">N2</option>
              <option value="N3">N3</option>
              <option value="O1">O1</option>
              <option value="O2">O2</option>
              <option value="O3">O3</option>
              <option value="O4">O4</option>
            </select>
          </div>
        </div>
      </div>

      {formCaja.tipoCertificado && formCaja.placa && (
        <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
          <h4 className="text-sm font-bold text-[#052a79] uppercase tracking-wider mb-4">Resumen de Selección</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="block text-xs text-blue-600 font-semibold mb-1">Tipo de Expediente</span>
              <span className="font-bold text-slate-800 text-lg">{formCaja.tipoCertificado === 'GLP_ANUAL' ? `GLP - ${formCaja.modalidadCertificado}` : formCaja.tipoCertificado === 'GNV_ANUAL' ? `GNV - ${formCaja.modalidadCertificado}` : 'CONFORMIDAD'}</span>
            </div>
            <div>
              <span className="block text-xs text-blue-600 font-semibold mb-1">Placa a Certificar</span>
              <span className="font-bold text-slate-800 text-lg">{formCaja.placa}</span>
            </div>
            <div>
              <span className="block text-xs text-blue-600 font-semibold mb-1">Categoría</span>
              <span className="font-bold text-slate-800 text-lg">{formCaja.categoria || 'Pendiente'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
