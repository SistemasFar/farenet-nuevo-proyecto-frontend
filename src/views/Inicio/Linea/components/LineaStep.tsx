import React from 'react';

interface LineaStepProps {
  nroInspeccion?: string;
  inspeccionData?: any;
  onSiguiente: () => void;
  onAnterior: () => void;
}

export function LineaStep({ nroInspeccion, inspeccionData, onSiguiente, onAnterior }: LineaStepProps) {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
          Línea
        </h2>
        
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Selección de Línea de Inspección</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            {['Línea 1', 'Línea 2', 'Línea 3'].map(linea => (
              <label key={linea} className="flex flex-col items-center p-4 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-all">
                <input type="radio" name="linea" value={linea} className="mb-2 w-4 h-4 text-amber-500 focus:ring-amber-500" />
                <span className="font-bold text-slate-700">{linea}</span>
              </label>
            ))}
          </div>

          <h3 className="text-lg font-bold text-[#052a79] mb-4 border-b border-blue-200 pb-2">Resultados de Máquinas</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Gases / Opacidad</label>
                <select className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5">
                  <option value="Aprobado">Aprobado</option>
                  <option value="Desaprobado">Desaprobado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Frenos</label>
                <select className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5">
                  <option value="Aprobado">Aprobado</option>
                  <option value="Desaprobado">Desaprobado</option>
                </select>
              </div>
            </div>
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
