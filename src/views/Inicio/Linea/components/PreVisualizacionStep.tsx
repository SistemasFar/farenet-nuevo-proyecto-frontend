import React from 'react';

interface PreVisualizacionStepProps {
  nroInspeccion?: string;
  inspeccionData?: any;
  onSiguiente: () => void;
  onAnterior: () => void;
}

export function PreVisualizacionStep({ nroInspeccion, inspeccionData, onSiguiente, onAnterior }: PreVisualizacionStepProps) {
  const placa = inspeccionData?.form_data?.vehiculo?.placa || 'N/A';
  const nombreCliente = inspeccionData?.form_data?.facturacion?.razonSocial || 'N/A';
  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
          Pre Visualización Certificado
        </h2>
        
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
            <h3 className="text-lg font-bold text-slate-800">Certificado (Borrador)</h3>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded border border-amber-200">
              VISTA PREVIA
            </span>
          </div>
          
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-8 text-center min-h-[400px] flex flex-col justify-center items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-50/50 flex items-center justify-center opacity-10 pointer-events-none">
              <span className="text-6xl font-black rotate-[-45deg] text-slate-900">BORRADOR</span>
            </div>
            
            <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500 font-bold mb-2">Pre-visualización del certificado para la placa:</p>
            <p className="text-3xl font-black text-slate-800 mb-4">{placa}</p>
            <p className="text-sm text-slate-400">Cliente: {nombreCliente}</p>
            <p className="text-sm text-slate-400 mt-2">Nro Inspección: {nroInspeccion}</p>
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
          onClick={onSiguiente}
          className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-amber-500 text-slate-900 font-black hover:bg-amber-400 transition-all text-sm uppercase shadow-sm shadow-amber-500/20"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
