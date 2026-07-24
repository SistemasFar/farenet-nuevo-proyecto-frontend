import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

interface ModalCambiarObservacionProps {
  isOpen: boolean;
  onClose: () => void;
  observacionActual: string;
  nroInspeccion: string;
  onSave: (nuevaObservacion: string) => Promise<void>;
}

export function ModalCambiarObservacion({
  isOpen,
  onClose,
  observacionActual,
  nroInspeccion,
  onSave
}: ModalCambiarObservacionProps) {
  const [observacion, setObservacion] = useState(observacionActual);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (observacion.length > 1000) {
      alert('La observación no puede superar los 1000 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(observacion);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transform transition-all scale-100">
        <div className="bg-amber-600 px-4 py-3 flex justify-between items-center text-white">
          <h2 className="font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Cambiar Observación
          </h2>
          <button 
            onClick={onClose}
            className="text-white hover:bg-amber-700 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Inspección: {nroInspeccion}</p>
              <p>Cambie la observación final para esta inspección consolidada.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">
              Observación Actual / Nueva:
            </label>
            <textarea
              className="w-full border border-slate-300 rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[120px]"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ingrese la nueva observación..."
              autoFocus
            />
            <div className="text-xs text-right text-slate-500">
              {observacion.length}/1000 caracteres
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Guardar Observación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
