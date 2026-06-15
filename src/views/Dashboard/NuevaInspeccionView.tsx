import React, { useState, useEffect } from 'react';
import { maestrosApi } from '../../services/api';
import type { MaestrosCajaResponse } from '../../types/maestros';
import { Search, XCircle, CheckCircle2, FileText, User, CreditCard, Box, ArrowLeft } from 'lucide-react';

interface NuevaInspeccionViewProps {
  onBack?: () => void;
}

const STEPS = [
  { id: 'caja', label: 'Caja', icon: Box },
  { id: 'pago', label: 'Pago', icon: CreditCard },
  { id: 'vehiculo', label: 'Vehículo', icon: Search },
  { id: 'cliente', label: 'Cliente', icon: User },
  { id: 'verificacion', label: 'Verificación', icon: FileText }
];

export function NuevaInspeccionView({ onBack }: NuevaInspeccionViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [maestros, setMaestros] = useState<MaestrosCajaResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State (Caja)
  const [formCaja, setFormCaja] = useState({
    tipoPlaca: '',
    placa: '',
    concepto: '',
    categoria: '',
    tipoInspeccion: '',
    tipoCertificado: '',
    tipoAutorizacion: ''
  });

  useEffect(() => {
    cargarMaestros();
  }, []);

  const cargarMaestros = async () => {
    try {
      setLoading(true);
      const res = await maestrosApi.obtenerMaestrosCajaAsync();
      setMaestros(res.data);
    } catch (err: any) {
      setError(err.message || 'Error cargando maestros');
    } finally {
      setLoading(false);
    }
  };

  const handleCajaChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Si cambia el tipo de placa, limpiamos la placa para evitar problemas de formato
    if (name === 'tipoPlaca') {
      setFormCaja((prev) => ({ ...prev, [name]: value, placa: '' }));
      return;
    }

    // Validación de placa: Limitar a 6 o 16 caracteres dependiendo del tipo
    if (name === 'placa') {
      const isBIN = formCaja.tipoPlaca === '16'; // Suponiendo ID o lógica de tipo BIN
      // En este caso el usuario dijo "hay dos tipos usualmente son de 6... o 16". 
      // Por defecto no limitamos estrictamente la longitud máxima en el onChange para dejarles escribir,
      // pero podríamos limitarlo si conocemos el ID del tipo de placa BIN (ej. id 2).
      // Por ahora, aplicamos mayúsculas siempre:
      setFormCaja((prev) => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }

    setFormCaja((prev) => ({ ...prev, [name]: value }));
  };

  const validarCaja = () => {
    // Validar que todos los campos requeridos estén llenos
    if (!formCaja.tipoPlaca || !formCaja.placa || !formCaja.concepto || !formCaja.categoria || !formCaja.tipoInspeccion || !formCaja.tipoCertificado || !formCaja.tipoAutorizacion) {
      return false;
    }
    return true;
  };

  const irSiguientePaso = () => {
    if (currentStepIndex === 0 && !validarCaja()) {
      alert('Por favor completa todos los campos de la caja antes de continuar.');
      return;
    }
    
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const irPasoAnterior = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Cargando opciones...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="w-full min-h-[calc(100vh-10rem)] bg-white rounded-2xl shadow-xl border-t-4 border-t-amber-500 border border-slate-200 overflow-hidden flex flex-col">
      
      {/* Header / Stepper */}
      <div className="bg-[#f4f9ff] border-b border-[#052a79]/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <button 
            type="button" 
            onClick={onBack}
            className="p-1.5 text-slate-400 hover:text-[#052a79] hover:bg-slate-100 rounded-full transition"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            Nueva Inspección
          </h2>
        </div>
        
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-200 -z-10 -translate-y-1/2">
            <div 
              className="h-full bg-amber-500 transition-all duration-500" 
              style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
            ></div>
          </div>
          
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            
            return (
              <div key={step.id} className="flex flex-col items-center gap-2 bg-[#f4f9ff] px-2">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isActive ? 'bg-[#052a79] text-white shadow-md ring-4 ring-blue-100' :
                    isCompleted ? 'bg-amber-500 text-white shadow-sm' : 
                    'bg-white text-slate-400 border-2 border-slate-200'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider mt-1 ${isActive ? 'text-[#052a79]' : isCompleted ? 'text-amber-600' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8">
        
        {/* === PASO 1: CAJA === */}
        {currentStepIndex === 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-[#052a79] uppercase border-b border-amber-200/60 pb-2">
              Datos de Caja
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Tipo de Placa *</label>
                <select 
                  name="tipoPlaca" 
                  value={formCaja.tipoPlaca} 
                  onChange={handleCajaChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 outline-none transition"
                >
                  <option value="">Seleccione...</option>
                  {maestros?.tiposPlaca.map(tp => (
                    <option key={tp.id} value={tp.id}>{tp.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Placa *</label>
                <input 
                  type="text" 
                  name="placa" 
                  value={formCaja.placa} 
                  onChange={handleCajaChange}
                  placeholder="Ej: ABC-123"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 outline-none transition uppercase"
                  maxLength={formCaja.tipoPlaca === 'BIN_ID_HERE' ? 16 : 16} // Lógica de maxlength
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Concepto *</label>
                <select 
                  name="concepto" 
                  value={formCaja.concepto} 
                  onChange={handleCajaChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 outline-none transition"
                >
                  <option value="">Seleccione...</option>
                  {maestros?.conceptos.map(c => (
                    <option key={c.key} value={c.key}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Categoría *</label>
                <select 
                  name="categoria" 
                  value={formCaja.categoria} 
                  onChange={handleCajaChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 outline-none transition"
                >
                  <option value="">Seleccione...</option>
                  {maestros?.categorias.map(c => (
                    <option key={c.key} value={c.key}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Tipo de Inspección *</label>
                <select 
                  name="tipoInspeccion" 
                  value={formCaja.tipoInspeccion} 
                  onChange={handleCajaChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 outline-none transition"
                >
                  <option value="">Seleccione...</option>
                  {maestros?.tiposInspeccion.map(ti => (
                    <option key={ti.key} value={ti.key}>{ti.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Tipo Certificado *</label>
                <select 
                  name="tipoCertificado" 
                  value={formCaja.tipoCertificado} 
                  onChange={handleCajaChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 outline-none transition"
                >
                  <option value="">Seleccione...</option>
                  {maestros?.tiposCertificado.map(tc => (
                    <option key={tc.key} value={tc.key}>{tc.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-600 uppercase">Tipo Autorización *</label>
                <select 
                  name="tipoAutorizacion" 
                  value={formCaja.tipoAutorizacion} 
                  onChange={handleCajaChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 outline-none transition"
                >
                  <option value="">Seleccione...</option>
                  {maestros?.tiposAutorizacion.map(ta => (
                    <option key={ta.key} value={ta.key}>{ta.nombre}</option>
                  ))}
                </select>
              </div>

            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-slate-100 mt-6">
              <button 
                type="button" 
                onClick={() => {
                   if (validarCaja()) {
                     alert('Consultando vehículo...');
                     irSiguientePaso();
                   } else {
                     alert('Por favor complete todos los campos.');
                   }
                }}
                className="flex items-center gap-2 rounded-lg bg-[#052a79] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-900 border border-[#052a79] transition uppercase tracking-wide"
              >
                <Search className="w-4 h-4" />
                Consultar
              </button>
              
              <button 
                type="button"
                onClick={() => {
                  setFormCaja({
                    tipoPlaca: '', placa: '', concepto: '', categoria: '', tipoInspeccion: '', tipoCertificado: '', tipoAutorizacion: ''
                  });
                }}
                className="flex items-center gap-2 rounded-lg bg-white border border-red-200 text-red-600 px-6 py-2.5 text-xs font-bold hover:bg-red-50 shadow-sm transition uppercase tracking-wide"
              >
                <XCircle className="w-4 h-4" />
                Anular
              </button>
            </div>
          </div>
        )}

        {/* OTROS PASOS */}
        {currentStepIndex > 0 && (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-4">
            <CheckCircle2 className="w-16 h-16 text-slate-300" />
            <h3 className="text-xl font-bold text-slate-700">Paso en construcción</h3>
            <p>Este paso ({STEPS[currentStepIndex].label}) se implementará próximamente.</p>
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      {currentStepIndex > 0 && (
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between">
          <button 
            type="button" 
            onClick={irPasoAnterior}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Atrás
          </button>
          
          <button 
            type="button" 
            onClick={irSiguientePaso}
            className="rounded-lg bg-[#052a79] px-5 py-2 text-xs font-bold text-white hover:bg-blue-900 transition"
          >
            {currentStepIndex === STEPS.length - 1 ? 'Finalizar' : 'Siguiente Paso'}
          </button>
        </div>
      )}

    </div>
  );
}
