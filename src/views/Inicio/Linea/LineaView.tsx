import React, { useState, useEffect } from 'react';
import { ConsolidacionInicialStep } from './components/ConsolidacionInicialStep';
import { LineaStep } from './components/LineaStep';
import { PreVisualizacionStep } from './components/PreVisualizacionStep';
import { ConsolidacionFinalStep } from './components/ConsolidacionFinalStep';
import Swal from 'sweetalert2';
import { lineaApi } from '../../../services/api/linea';

interface LineaViewProps {
  nroInspeccion: string | undefined;
  onBack: () => void;
}

const STEPS = [
  '1. Consolidación',
  '2. Línea',
  '3. Pre Visualización Certificado',
  '4. Consolidación'
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
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden font-sans">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 z-10 shadow-sm relative">
        {/* Progress bar line base */}
        <div className="absolute bottom-0 left-0 w-full h-[6px] bg-slate-100" />
        
        {/* Progress bar active */}
        <div 
          className="absolute bottom-0 left-0 h-[6px] bg-amber-400 transition-all duration-500 ease-out z-10 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <button 
                onClick={onBack}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                title="Volver"
              >
                <svg className="w-6 h-6 text-slate-400 hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              Línea de Inspección
            </h1>
            <p className="text-sm text-slate-500 font-medium ml-10">Inspección Nro: <span className="text-amber-600 font-bold">{nroInspeccion}</span></p>
          </div>
        </div>

        {/* Stepper Header */}
        <div className="mt-8 flex justify-between relative max-w-4xl mx-auto px-4 md:px-12">
          {STEPS.map((stepName, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;

            return (
              <div key={stepName} className="flex flex-col items-center relative z-10 w-24 md:w-32">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm border-2
                    ${isActive 
                      ? 'bg-amber-400 text-slate-900 border-amber-400 scale-110 shadow-amber-400/30' 
                      : isCompleted 
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-400 border-slate-200'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`mt-3 text-[10px] md:text-xs font-bold text-center uppercase tracking-wide transition-colors duration-300
                  ${isActive ? 'text-slate-800' : isCompleted ? 'text-slate-600' : 'text-slate-400'}
                `}>
                  {stepName.replace(/^\d+\.\s*/, '')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 relative z-0">
        <div className="max-w-4xl mx-auto h-full animate-fade-in-up pb-10">
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
