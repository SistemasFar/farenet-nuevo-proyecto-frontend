import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { CheckCircle, Flame, Leaf, FileCheck, AlertTriangle } from 'lucide-react';
import { faregasTarifasApi } from '../../../../services/faregas-tarifas.api';
import type { FormCajaState } from '../../NuevoCertificadoView';
import type { TarifaFaregas } from '../../../../types/faregas-api';

interface CajaStepProps {
  plantaSeleccionada?: string;
  formCaja: FormCajaState;
  setFormCaja: Dispatch<SetStateAction<FormCajaState>>;
}

export function CajaStep({ plantaSeleccionada, formCaja, setFormCaja }: CajaStepProps) {
  const [tarifas, setTarifas] = useState<TarifaFaregas[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    faregasTarifasApi.obtenerTarifas()
      .then(res => {
        if (res && res.success) {
          setTarifas(res.tarifas || []);
        }
      })
      .catch(err => console.error('Error al obtener tarifas', err))
      .finally(() => setLoading(false));
  }, [plantaSeleccionada]);

  const handleSelectTarifa = (tarifa: TarifaFaregas) => {
    setFormCaja(prev => ({ 
      ...prev, 
      tarifaCodigo: tarifa.codigo,
      tipoCertificado: tarifa.tipo_certificado_clave,
      modalidadCertificado: tarifa.modalidad as 'INICIAL' | 'ANUAL' | '' || ''
    }));
  };

  const tarifasGLP = tarifas.filter(t => t.familia === 'GLP').sort((a, b) => a.orden - b.orden);
  const tarifasGNV = tarifas.filter(t => t.familia === 'GNV').sort((a, b) => a.orden - b.orden);
  const tarifasCONFORMIDAD = tarifas.filter(t => t.familia === 'CONFORMIDAD').sort((a, b) => a.orden - b.orden);

  const tarifaSeleccionadaObj = tarifas.find(t => t.codigo === formCaja.tarifaCodigo);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">1. Tipo de Servicio</h4>
        
        {loading ? (
          <div className="text-sm text-slate-500">Cargando tarifas...</div>
        ) : tarifas.length === 0 ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span className="font-bold">No existen tarifas configuradas para esta sede.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card GLP */}
            {tarifasGLP.length > 0 && (
              <div
                className={`rounded-2xl p-6 border-2 transition-all duration-300 relative overflow-hidden ${
                  tarifasGLP.some(t => t.codigo === formCaja.tarifaCodigo)
                    ? 'border-[#052a79] bg-[#052a79]/5 shadow-md scale-[1.02]'
                    : 'border-slate-200 bg-white hover:border-[#052a79]/30 hover:bg-slate-50'
                }`}
              >
                {tarifasGLP.some(t => t.codigo === formCaja.tarifaCodigo) && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle className="w-6 h-6 text-[#052a79]" />
                  </div>
                )}
                <Flame className={`w-10 h-10 mb-4 ${tarifasGLP.some(t => t.codigo === formCaja.tarifaCodigo) ? 'text-[#052a79]' : 'text-slate-400'}`} />
                <h5 className="font-bold text-slate-800 text-lg mb-4">GLP</h5>
                <div className="flex flex-col gap-2">
                  {tarifasGLP.map(tarifa => (
                    <button
                      key={tarifa.codigo}
                      type="button"
                      onClick={() => handleSelectTarifa(tarifa)}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-bold flex justify-between items-center transition ${formCaja.tarifaCodigo === tarifa.codigo ? 'border-[#052a79] bg-[#052a79] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#052a79]'}`}
                    >
                      <span className="text-left">{tarifa.nombre}</span>
                      <span>S/ {Number(tarifa.precio).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Card GNV */}
            {tarifasGNV.length > 0 && (
              <div
                className={`rounded-2xl p-6 border-2 transition-all duration-300 relative overflow-hidden ${
                  tarifasGNV.some(t => t.codigo === formCaja.tarifaCodigo)
                    ? 'border-[#052a79] bg-[#052a79]/5 shadow-md scale-[1.02]'
                    : 'border-slate-200 bg-white hover:border-[#052a79]/30 hover:bg-slate-50'
                }`}
              >
                {tarifasGNV.some(t => t.codigo === formCaja.tarifaCodigo) && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle className="w-6 h-6 text-[#052a79]" />
                  </div>
                )}
                <Leaf className={`w-10 h-10 mb-4 ${tarifasGNV.some(t => t.codigo === formCaja.tarifaCodigo) ? 'text-[#052a79]' : 'text-slate-400'}`} />
                <h5 className="font-bold text-slate-800 text-lg mb-4">GNV</h5>
                <div className="flex flex-col gap-2">
                  {tarifasGNV.map(tarifa => (
                    <button
                      key={tarifa.codigo}
                      type="button"
                      onClick={() => handleSelectTarifa(tarifa)}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-bold flex justify-between items-center transition ${formCaja.tarifaCodigo === tarifa.codigo ? 'border-[#052a79] bg-[#052a79] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#052a79]'}`}
                    >
                      <span className="text-left">{tarifa.nombre}</span>
                      <span>S/ {Number(tarifa.precio).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Card Conformidad */}
            {tarifasCONFORMIDAD.length > 0 && (
              <div
                className={`rounded-2xl p-6 border-2 transition-all duration-300 relative overflow-hidden ${
                  tarifasCONFORMIDAD.some(t => t.codigo === formCaja.tarifaCodigo)
                    ? 'border-[#052a79] bg-[#052a79]/5 shadow-md scale-[1.02]'
                    : 'border-slate-200 bg-white hover:border-[#052a79]/30 hover:bg-slate-50'
                }`}
              >
                {tarifasCONFORMIDAD.some(t => t.codigo === formCaja.tarifaCodigo) && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle className="w-6 h-6 text-[#052a79]" />
                  </div>
                )}
                <FileCheck className={`w-10 h-10 mb-4 ${tarifasCONFORMIDAD.some(t => t.codigo === formCaja.tarifaCodigo) ? 'text-[#052a79]' : 'text-slate-400'}`} />
                <h5 className="font-bold text-slate-800 text-lg mb-4">CONFORMIDAD</h5>
                <div className="flex flex-col gap-2">
                  {tarifasCONFORMIDAD.map(tarifa => (
                    <button
                      key={tarifa.codigo}
                      type="button"
                      onClick={() => handleSelectTarifa(tarifa)}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-bold flex justify-between items-center transition ${formCaja.tarifaCodigo === tarifa.codigo ? 'border-[#052a79] bg-[#052a79] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#052a79]'}`}
                    >
                      <span className="text-left">{tarifa.nombre}</span>
                      <span>S/ {Number(tarifa.precio).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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

      {formCaja.tarifaCodigo && formCaja.placa && tarifaSeleccionadaObj && (
        <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
          <h4 className="text-sm font-bold text-[#052a79] uppercase tracking-wider mb-4">Resumen de Selección</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="block text-xs text-blue-600 font-semibold mb-1">Servicio Seleccionado</span>
              <span className="font-bold text-slate-800 text-lg">{tarifaSeleccionadaObj.familia} - {tarifaSeleccionadaObj.nombre}</span>
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
