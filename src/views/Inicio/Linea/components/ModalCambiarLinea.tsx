import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { maestrosApi, lineaApi } from '../../../../services/api';

interface ModalCambiarLineaProps {
  nroInspeccion: string;
  plantaKey: string;
  lineaActual: string;
  onClose: () => void;
  onRefresh: () => void;
}

export function ModalCambiarLinea({ nroInspeccion, plantaKey, lineaActual, onClose, onRefresh }: ModalCambiarLineaProps) {
  const [lineas, setLineas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lineaKey, setLineaKey] = useState('');

  useEffect(() => {
    cargarLineas();
  }, []);

  const cargarLineas = async () => {
    if (!plantaKey) return;
    try {
      const response = await maestrosApi.obtenerLineasPorPlantaAsync(plantaKey);
      setLineas(response.data || response || []);
    } catch (error) {
      console.error('Error al cargar líneas:', error);
    }
  };

  const handleSave = async () => {
    if (!lineaKey) {
      alert('Debe seleccionar una línea.');
      return;
    }
    setLoading(true);
    try {
      await lineaApi.cambiarLinea(nroInspeccion, lineaKey);
      alert('Línea cambiada con éxito.');
      onRefresh();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Error al cambiar línea');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded shadow-lg max-w-sm w-full animate-fade-in-up">
        <div className="flex justify-between items-center bg-slate-100 p-4 border-b border-slate-200 rounded-t">
          <h3 className="font-bold text-slate-700 uppercase tracking-wide">Cambiar Línea</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-600 mb-2">
            Línea Actual: <span className="font-bold text-slate-800">{lineaActual || 'Desconocida'}</span>
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nueva Línea</label>
            <select
              className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-200"
              value={lineaKey}
              onChange={(e) => setLineaKey(e.target.value)}
            >
              <option value="">Seleccione...</option>
              {Array.isArray(lineas) && lineas.map((l: any) => (
                <option key={l.key || l.id || l} value={l.key || l.id || l}>
                  {l.nombre || l.key || l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end bg-slate-50 p-4 border-t border-slate-200 rounded-b gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-100 font-bold text-sm">
            Cancelar
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading || !lineaKey}
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
