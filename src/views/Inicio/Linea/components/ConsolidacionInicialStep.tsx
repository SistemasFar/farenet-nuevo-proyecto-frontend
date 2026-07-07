import React from 'react';

interface ConsolidacionInicialStepProps {
  nroInspeccion?: string;
  inspeccionData?: any;
  onSiguiente: () => void;
  onAnular: () => void;
}

export function ConsolidacionInicialStep({ nroInspeccion, inspeccionData, onSiguiente, onAnular }: ConsolidacionInicialStepProps) {
  const placa = inspeccionData?.form_data?.vehiculo?.placa || 'N/A';
  const nombreCliente = inspeccionData?.form_data?.facturacion?.razonSocial || 'N/A';
  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
          Consolidación Inicial
        </h2>
        
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Detalles del Vehículo</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Placa</p>
              <p className="text-lg font-black text-amber-600">{placa}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold">Propietario / Cliente</p>
              <p className="text-sm font-bold text-slate-800">{nombreCliente}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
          <h3 className="text-lg font-bold text-[#052a79] mb-4 border-b border-blue-200 pb-2">Asignación de Ingeniero</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ingeniero Certificador</label>
              <select className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5">
                <option value="">Seleccione ingeniero...</option>
                <option value="ing1">Ing. Carlos Rodríguez (CIP 123456)</option>
                <option value="ing2">Ing. María Fernández (CIP 654321)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-slate-100 p-4 border-t border-slate-200 flex justify-between items-center">
        <button
          onClick={onAnular}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-200 hover:text-slate-800 transition-all text-sm uppercase"
        >
          Anular
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
