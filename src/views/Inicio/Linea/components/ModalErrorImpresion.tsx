import React, { useState } from 'react';
import { Printer, AlertCircle } from 'lucide-react';
import { inspeccionesApi } from '../../../../services/api';

interface ModalErrorImpresionProps {
  nroInspeccion: string;
  onClose: () => void;
  onSuccess: () => void;
}

const MOTIVOS_ERROR = [
  "Saltos de correlativos",
  "Falla en la impresora",
  "Error de impresión",
  "Errores en digitación",
  "Error en consolidación",
  "Error en el proveedor"
];

const ModalErrorImpresion: React.FC<ModalErrorImpresionProps> = ({ nroInspeccion, onClose, onSuccess }) => {
  const [motivo, setMotivo] = useState(MOTIVOS_ERROR[0]);
  const [observacion, setObservacion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (observacion.trim().length < 5) {
      setError("La observación debe tener más de 5 caracteres");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await inspeccionesApi.errorImpresion(nroInspeccion, { motivo, observacion });
      if (data.ok) {
        onSuccess();
      } else {
        setError(data.message || "Error al reportar impresión fallida.");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Error de red o servidor.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-[500px] overflow-hidden flex flex-col transform transition-all scale-100">
        
        {/* Header */}
        <div className="bg-[#cc0000] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Printer size={20} className="text-white" />
            <h2 className="text-lg font-bold">Error de Impresión</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200 transition-colors focus:outline-none"
            disabled={isLoading}
          >
            <AlertCircle size={20} className="hidden" />
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5 text-sm text-gray-700 bg-gray-50">
          <p>
            Está a punto de desechar un papel físico para la inspección <strong>{nroInspeccion}</strong>. 
            El sistema anulará el correlativo actual y generará el siguiente en la serie.
          </p>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="font-semibold text-gray-700">Motivo de Error</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:border-[#cc0000] focus:ring-1 focus:ring-[#cc0000] transition-colors outline-none bg-white"
              disabled={isLoading}
            >
              {MOTIVOS_ERROR.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <label className="font-semibold text-gray-700">Observación Detallada</label>
              <span className={`text-xs ${observacion.length < 5 ? 'text-red-500 font-bold' : 'text-green-600'}`}>
                {observacion.length} / mín 5
              </span>
            </div>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 min-h-[100px] resize-none focus:border-[#cc0000] focus:ring-1 focus:ring-[#cc0000] transition-colors outline-none"
              placeholder="Describa qué ocurrió con el papel..."
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-white flex justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-5 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || observacion.trim().length < 5}
            className="px-5 py-2 bg-[#cc0000] hover:bg-red-700 disabled:bg-red-300 text-white font-bold rounded-lg transition-colors flex items-center gap-2 focus:outline-none"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </>
            ) : "Confirmar Error de Impresión"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModalErrorImpresion;
