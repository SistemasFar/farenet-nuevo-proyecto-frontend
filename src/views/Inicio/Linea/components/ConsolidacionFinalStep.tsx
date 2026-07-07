import React from 'react';

interface ConsolidacionFinalStepProps {
  nroInspeccion?: string;
  inspeccionData?: any;
  onAnterior: () => void;
  onFinalizar: () => void;
}

export function ConsolidacionFinalStep({ nroInspeccion, inspeccionData, onAnterior, onFinalizar }: ConsolidacionFinalStepProps) {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
          Consolidación Final
        </h2>
        
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
          <svg className="w-20 h-20 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-2xl font-black text-slate-800 mb-2">¡Todo listo para emitir!</h3>
          <p className="text-slate-600 mb-8">La inspección {nroInspeccion} ha pasado por todos los controles y está lista para ser enviada al MTC y emitir el certificado oficial.</p>
          
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button className="px-6 py-3 bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 hover:bg-blue-200 transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir Certificado (Prueba)
            </button>
            <button className="px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-300 hover:bg-slate-300 transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Imprimir Informe
            </button>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-slate-100 p-4 border-t border-slate-200 flex justify-between items-center">
        <button
          onClick={onAnterior}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-200 hover:text-slate-800 transition-all text-sm uppercase"
        >
          Anterior
        </button>

        <button
          onClick={onFinalizar}
          className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-green-500 text-white font-black hover:bg-green-600 transition-all text-sm uppercase shadow-sm shadow-green-500/20"
        >
          Finalizar
        </button>
      </div>
    </div>
  );
}
