import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { inspeccionesApi } from '../../../../services/api';

interface ModalAnularInspeccionProps {
  nroInspeccion: string;
  onClose: () => void;
  onSuccess: () => void;
}

const MOTIVOS_ANULACION = [
  'Saltos de correlativos',
  'Falla en la impresora',
  'Error de impresión',
  'Errores en digitación',
  'Error en consolidación',
  'Error en el proveedor'
];

export const ModalAnularInspeccion: React.FC<ModalAnularInspeccionProps> = ({ nroInspeccion, onClose, onSuccess }) => {
  const [motivo, setMotivo] = useState('');
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const observacionLimpia = observacion.trim();
  const faltanChars = Math.max(0, 20 - observacionLimpia.length);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!motivo) {
      setError("Debe seleccionar un motivo de anulación.");
      return;
    }

    if (observacionLimpia.length < 20) {
      setError(`La observación debe tener al menos 20 caracteres (faltan ${faltanChars}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await inspeccionesApi.anularInspeccion(nroInspeccion, {
        motivo,
        observacion: observacionLimpia
      });

      if (data.ok) {
        onSuccess(); // Deberá refrescar la inspeccion en el padre
      } else {
        setError("DATA: " + JSON.stringify(data));
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Error de red o servidor al intentar anular.";
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-xl font-bold tracking-tight">Anular Inspección</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <p className="text-slate-600 mb-6 text-sm">
            Está a punto de anular la inspección <span className="font-bold text-slate-900">{nroInspeccion}</span>. 
            Esta acción es destructiva y deshabilitará certificados y comprobantes asociados.
          </p>

          <form id="anularForm" onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Motivo de Anulación</label>
              <select 
                value={motivo} 
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-slate-700 bg-slate-50"
                disabled={isSubmitting}
              >
                <option value="">-- Seleccione un motivo --</option>
                {MOTIVOS_ANULACION.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">Observación</label>
                <span className={`text-xs font-medium ${faltanChars > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  {observacionLimpia.length} / 20 mín
                </span>
              </div>
              <textarea 
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-slate-700 bg-slate-50 resize-none"
                placeholder="Escriba el detalle de por qué se anula esta inspección..."
                disabled={isSubmitting}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="anularForm"
            className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:ring-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-red-600/20"
            disabled={isSubmitting || !motivo || faltanChars > 0}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Anulando...</span>
              </>
            ) : (
              <span>Confirmar Anulación</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
