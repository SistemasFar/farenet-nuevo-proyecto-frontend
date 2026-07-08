import React, { useState, useEffect } from 'react';
import { ConsolidacionInicialStep } from './components/ConsolidacionInicialStep';
import { LineaStep } from './components/LineaStep';
import { PreVisualizacionStep } from './components/PreVisualizacionStep';
import { ConsolidacionFinalStep } from './components/ConsolidacionFinalStep';
import Swal from 'sweetalert2';
import { lineaApi } from '../../../services/api/linea';
import { CheckCircle2, ClipboardCheck, Activity, Eye, FileCheck, ArrowLeft } from 'lucide-react';

interface LineaViewProps {
  nroInspeccion: string | undefined;
  onBack: () => void;
}

const STEPS = [
  { id: 'consolidacion_inicial', label: 'Consolidación', icon: ClipboardCheck },
  { id: 'linea', label: 'Línea', icon: Activity },
  { id: 'pre_visualizacion', label: 'Pre Visualización', icon: Eye },
  { id: 'consolidacion_final', label: 'Consolidación', icon: FileCheck }
];

export function LineaView({ nroInspeccion, onBack }: LineaViewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [inspeccionData, setInspeccionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Si entran a esta vista sin una inspección, los devolvemos al inicio.
    if (!nroInspeccion) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se ha provisto un número de inspección válido.',
        confirmButtonColor: '#3085d6'
      }).then(() => {
        onBack();
      });
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await lineaApi.getInspeccion(nroInspeccion);
        setInspeccionData(data);
      } catch (err) {
        console.error("Error fetching inspeccion", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [nroInspeccion, onBack]);

  const handleSiguiente = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleAnterior = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleAnular = () => {
    Swal.fire({
      title: '¿Anular Proceso?',
      text: 'Se cancelará el proceso de inspección actual. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        onBack();
      }
    });
  };

  const handleFinalizar = () => {
    Swal.fire({
      icon: 'success',
      title: 'Proceso Terminado',
      text: 'La inspección ha concluido exitosamente.',
      confirmButtonColor: '#3085d6'
    }).then(() => {
      onBack();
    });
  };

  if (!nroInspeccion) return null;

  return (
    <div className="w-full min-h-[calc(100vh-10rem)] bg-white rounded-2xl shadow-xl border-t-[4px] border-solid border-t-[#f59e0b] overflow-hidden flex flex-col font-sans" style={{ borderImage: "linear-gradient(to right, #fde047 0%, #f59e0b 50%, #b45309 100%) 1" }}>
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
            Línea de Inspección
          </h2>
          <p className="text-sm text-slate-500 font-medium ml-4 border-l border-slate-300 pl-4">
            Inspección Nro: <span className="text-amber-600 font-bold">{nroInspeccion}</span>
          </p>
        </div>

        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-200 -z-10 -translate-y-1/2">
            <div
              className="h-full bg-gold-3d transition-all duration-500"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            ></div>
          </div>

          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center gap-2 bg-[#f4f9ff] px-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? 
'bg-[#052a79] text-white shadow-md ring-4 ring-blue-100' :
                    isCompleted ? 'bg-gold-3d shadow-sm border-none text-white' :
                      'bg-white text-slate-400 border-2 border-slate-200'
                    }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider mt-1 ${isActive ? 'text-[#052a79]' : 
isCompleted ? 'text-gold-3d drop-shadow-sm' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 relative z-0">
        <div className="w-full h-full animate-fade-in-up pb-10">
          {loading && <div className="p-8 text-center text-slate-500">Cargando inspección...</div>}
          
          {!loading && currentStep === 0 && (
            <ConsolidacionInicialStep
              nroInspeccion={nroInspeccion}
              inspeccionData={inspeccionData}
              onSiguiente={handleSiguiente}
              onAnular={handleAnular}
            />
          )}
          {!loading && currentStep === 1 && (
            <LineaStep
              nroInspeccion={nroInspeccion}
              inspeccionData={inspeccionData}
              onSiguiente={handleSiguiente}
              onAnterior={handleAnterior}
            />
          )}
          {!loading && currentStep === 2 && (
            <PreVisualizacionStep
              nroInspeccion={nroInspeccion}
              inspeccionData={inspeccionData}
              onSiguiente={handleSiguiente}
              onAnterior={handleAnterior}
            />
          )}
          {!loading && currentStep === 3 && (
            <ConsolidacionFinalStep
              nroInspeccion={nroInspeccion}
              inspeccionData={inspeccionData}
              onAnterior={handleAnterior}
              onFinalizar={handleFinalizar}
            />
          )}
        </div>
      </div>
    </div>
  );
}
