import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, AlertCircle, Eye, Settings, RefreshCw } from 'lucide-react';

interface LineaStepProps {
  nroInspeccion: string;
  estadoLinea: any;
  onRefresh: () => void;
}

export function LineaStep({ nroInspeccion, estadoLinea, onRefresh }: LineaStepProps) {
  const { recibidas = [], faltantes = [], noAplicables = [], obligatorias = [] } = estadoLinea;

  const aprobados = recibidas.filter((p: any) => p.resultado === 'A');
  const desaprobados = recibidas.filter((p: any) => p.resultado === 'D');

  // Mapeo visual de fotos (simulación UI)
  const renderFotoItem = (titulo: string, pruebaKey: string) => {
    const recibida = recibidas.find((r: any) => r.tipomaquina_key === pruebaKey);
    const faltante = faltantes.find((f: any) => f.tipomaquina_key === pruebaKey);
    const isListo = !!recibida;
    
    return (
      <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
        <span className="font-bold text-slate-700 text-sm uppercase">{titulo}</span>
        {isListo ? (
          <span className="flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">
            <CheckCircle2 className="w-3 h-3" /> LISTO
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">
            <AlertCircle className="w-3 h-3" /> PENDIENTE
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans animate-fade-in-up">
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        
        {/* Panel Superior: Fotos y Resumen */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Eye className="w-5 h-5 text-blue-600" /> Control Visual (Fotos)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {renderFotoItem('Ver Frenos', '25381385')}
              {renderFotoItem('Ver Gases', '25381382')}
              {renderFotoItem('Ver Luces', '25381387')}
            </div>
          </div>
          <div className="w-full md:w-64 bg-slate-800 text-white p-5 rounded-xl shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
             <Settings className="w-24 h-24 absolute -right-4 -bottom-4 text-white opacity-5" />
             <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Avance</span>
             <span className="text-4xl font-black mt-1">{recibidas.length} <span className="text-xl text-slate-400 font-medium">/ {obligatorias.length}</span></span>
             <button onClick={onRefresh} className="mt-3 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded flex items-center gap-2 transition-colors">
               <RefreshCw className="w-3 h-3" /> Refrescar
             </button>
          </div>
        </div>

        {/* Tablero Principal: Aprobados, Desaprobados, Faltantes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Aprobados */}
          <div className="bg-white border border-green-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="bg-green-50 p-3 border-b border-green-200 flex justify-between items-center">
              <span className="font-bold text-green-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Aprobados</span>
              <span className="bg-green-200 text-green-800 text-xs font-black px-2 py-0.5 rounded-full">{aprobados.length}</span>
            </div>
            <div className="p-4 space-y-2 flex-1 max-h-64 overflow-y-auto">
              {aprobados.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Ninguna prueba aprobada aún</p>}
              {aprobados.map((p: any) => (
                <div key={p.id || p.tipomaquina_key} className="text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center">
                  <span>{p.nombre_prueba}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Desaprobados */}
          <div className="bg-white border border-red-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="bg-red-50 p-3 border-b border-red-200 flex justify-between items-center">
              <span className="font-bold text-red-800 flex items-center gap-2"><XCircle className="w-4 h-4" /> Desaprobados</span>
              <span className="bg-red-200 text-red-800 text-xs font-black px-2 py-0.5 rounded-full">{desaprobados.length}</span>
            </div>
            <div className="p-4 space-y-2 flex-1 max-h-64 overflow-y-auto">
              {desaprobados.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Ninguna prueba desaprobada</p>}
              {desaprobados.map((p: any) => (
                <div key={p.id || p.tipomaquina_key} className="text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center">
                  <span>{p.nombre_prueba}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Faltantes */}
          <div className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="bg-amber-50 p-3 border-b border-amber-200 flex justify-between items-center">
              <span className="font-bold text-amber-800 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Faltantes</span>
              <span className="bg-amber-200 text-amber-800 text-xs font-black px-2 py-0.5 rounded-full">{faltantes.length}</span>
            </div>
            <div className="p-4 space-y-2 flex-1 max-h-64 overflow-y-auto">
              {faltantes.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No hay pruebas faltantes</p>}
              {faltantes.map((p: any) => (
                <div key={p.tipomaquina_key} className="text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center">
                  <span>{p.nombre_prueba}</span>
                  <button className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded text-slate-600 cursor-not-allowed opacity-50" title="Reinicio manual (Próximamente)">Reiniciar</button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* No Aplicables */}
        {noAplicables.length > 0 && (
          <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl flex flex-wrap gap-2">
            <span className="text-sm font-bold text-slate-500 mr-2 flex items-center">No Aplica:</span>
            {noAplicables.map((p: any) => (
              <span key={p.tipomaquina_key} className="text-xs bg-white text-slate-400 px-2 py-1 rounded border border-slate-200">{p.nombre_prueba}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
