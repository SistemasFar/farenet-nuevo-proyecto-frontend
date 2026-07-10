import React from 'react';
import { ArrowLeft, ArrowRight, EyeOff, Eye, FileText } from 'lucide-react';

interface PreVisualizacionStepProps {
  nroInspeccion: string;
  estadoLinea: any;
}

export function PreVisualizacionStep({ nroInspeccion, estadoLinea }: PreVisualizacionStepProps) {
  const { posicionActual, inspeccionestado_key, nrodocumentocertificado } = estadoLinea;
  const isConsolidada = inspeccionestado_key === 'CON';

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans animate-fade-in-up">
      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        
        {!isConsolidada ? (
          <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm text-center max-w-md">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <EyeOff className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Previsualización Pendiente</h3>
            <p className="text-slate-500 text-sm">
              La inspección aún no está consolidada o no tiene certificado generado. Debes completar la consolidación en el siguiente paso.
            </p>
          </div>
        ) : (
          <div className="bg-white border-2 border-slate-200 p-8 rounded-lg shadow-md max-w-lg w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">Certificado Local</h3>
                <p className="text-sm text-slate-500">Inspección {nroInspeccion}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
            
            <div className="space-y-4 bg-slate-50 p-4 rounded border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm font-bold">Estado:</span>
                <span className="text-green-700 text-sm font-black uppercase">Consolidado</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm font-bold">Nro. Certificado:</span>
                <span className="text-slate-800 text-sm font-bold">{nrodocumentocertificado || 'NO GENERADO (Rechazado)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm font-bold">Resultado:</span>
                <span className="text-slate-800 text-sm font-black">{estadoLinea.resultadoPreliminar || 'N/A'}</span>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-slate-400 bg-amber-50 text-amber-700 p-2 rounded">
              Previsualización legal final pendiente de fase PDF/MTC.
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
