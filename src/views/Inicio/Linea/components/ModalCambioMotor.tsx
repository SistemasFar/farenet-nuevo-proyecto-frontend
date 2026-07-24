import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { lineaApi } from '../../../../services/api';

interface ModalCambioMotorProps {
  nroInspeccion: string;
  motorActual: string;
  onClose: () => void;
  onRefresh: () => void;
}

export function ModalCambioMotor({ nroInspeccion, motorActual, onClose, onRefresh }: ModalCambioMotorProps) {
  const [loading, setLoading] = useState(false);
  const [nroMotor, setNroMotor] = useState(motorActual || '');

  const handleSave = async () => {
    if (!nroMotor.trim()) {
      alert('Debe ingresar el nuevo número de motor.');
      return;
    }
    setLoading(true);
    try {
      await lineaApi.cambiarMotor(nroInspeccion, nroMotor.trim().toUpperCase());
      alert('Motor cambiado con éxito.');
      onRefresh();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Error al cambiar motor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
      <div className="bg-white rounded shadow-lg max-w-sm w-full animate-fade-in-up">
        <div className="flex justify-between items-center bg-slate-100 p-4 border-b border-slate-200 rounded-t">
          <h3 className="font-bold text-slate-700 uppercase tracking-wide">Cambio de Motor</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-600 mb-2">
            Motor Actual: <span className="font-bold text-slate-800">{motorActual || 'No definido'}</span>
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nuevo Número de Motor</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-200 uppercase"
              value={nroMotor}
              onChange={(e) => setNroMotor(e.target.value)}
              placeholder="Ingrese Nro de Motor"
            />
          </div>
        </div>
        <div className="flex justify-end bg-slate-50 p-4 border-t border-slate-200 rounded-b gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-100 font-bold text-sm">
            Cancelar
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading || !nroMotor.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
