import React, { useState } from 'react';
import { X, Copy, AlertCircle } from 'lucide-react';

interface ModalRegistroResultadosProps {
  isOpen: boolean;
  onClose: () => void;
  nroInspeccion: string; // La inspeccion ANU actual
  placaAnulada: string;
  onSubmit: (placaNueva: string, nroInspeccionNueva: string) => Promise<void>;
}

export const ModalRegistroResultados: React.FC<ModalRegistroResultadosProps> = ({
  isOpen,
  onClose,
  nroInspeccion,
  placaAnulada,
  onSubmit
}) => {
  const [placaNueva, setPlacaNueva] = useState('');
  const [inspeccionNueva, setInspeccionNueva] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      setErrorLocal(null);
      
      if (!placaNueva.trim()) {
        setErrorLocal('Debe ingresar la placa de destino');
        return;
      }
      
      if (!inspeccionNueva.trim()) {
        setErrorLocal('Debe ingresar el número de inspección de destino');
        return;
      }

      setIsLoading(true);
      await onSubmit(placaNueva.trim().toUpperCase(), inspeccionNueva.trim().toUpperCase());
      onClose();
    } catch (error: any) {
      setErrorLocal(error.message || 'Error al traspasar resultados');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Copy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Traspaso de Resultados</h2>
              <p className="text-amber-100 text-sm opacity-90">De Inspección Anulada a Proceso</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 text-sm font-medium">
              ¿Está seguro que desea copiar los resultados de la placa <span className="font-bold">{placaAnulada}</span> con inspección <span className="font-bold">{nroInspeccion}</span>?
            </p>
          </div>

          {errorLocal && (
            <div className="flex items-start gap-3 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{errorLocal}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-gray-700">Placa a Pasar</label>
              <input 
                type="text"
                value={placaNueva}
                onChange={(e) => setPlacaNueva(e.target.value.toUpperCase())}
                placeholder="Ej: ABC-123"
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors outline-none bg-white uppercase"
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-gray-700">Nro. Inspección a Pasar</label>
              <input 
                type="text"
                value={inspeccionNueva}
                onChange={(e) => setInspeccionNueva(e.target.value.toUpperCase())}
                placeholder="Ej: INS-201-000000000"
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors outline-none bg-white uppercase"
                disabled={isLoading}
              />
            </div>
            
            <div className="text-xs text-gray-500 pt-2 flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Si la placa es distinta, las fotos no se copiarán.</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm transition-all hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>Procesar Traspaso</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
