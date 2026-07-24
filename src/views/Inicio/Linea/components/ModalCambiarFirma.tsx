import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { lineaApi } from '../../../../services/api';

interface ModalCambiarFirmaProps {
  nroInspeccion: string;
  ingenieros: any[];
  ingenieroActual: string;
  onClose: () => void;
  onRefresh: () => void;
}

export function ModalCambiarFirma({ nroInspeccion, ingenieros, ingenieroActual, onClose, onRefresh }: ModalCambiarFirmaProps) {
  const [loading, setLoading] = useState(false);
  const [ingenieroSelected, setIngenieroSelected] = useState(ingenieroActual || '');

  const handleSave = async () => {
    if (!ingenieroSelected) {
      alert('Debe seleccionar un ingeniero o INCORPORACION.');
      return;
    }
    setLoading(true);
    try {
      await lineaApi.cambiarFirma(nroInspeccion, ingenieroSelected);
      alert('Firma cambiada con éxito.');
      onRefresh();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Error al cambiar firma');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
      <div className="bg-white rounded shadow-lg max-w-sm w-full animate-fade-in-up">
        <div className="flex justify-between items-center bg-slate-100 p-4 border-b border-slate-200 rounded-t">
          <h3 className="font-bold text-slate-700 uppercase tracking-wide">Cambiar Firma</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Ingeniero Certificador</label>
            <select
              className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-200"
              value={ingenieroSelected}
              onChange={(e) => setIngenieroSelected(e.target.value)}
            >
              <option value="">-- Seleccione Ingeniero --</option>
              {ingenieros.map(ing => {
                const nombreVisible =
                  ing.nombreCompleto ||
                  ing.nombresApellidos ||
                  ing.nombre ||
                  ing.username ||
                  ing.usuario ||
                  'Ingeniero sin nombre';
                const value = ing.username || ing.usuario || ing.id;
                return (
                  <option key={ing.id || value} value={value}>{nombreVisible}</option>
                );
              })}
            </select>
          </div>
        </div>
        <div className="flex justify-end bg-slate-50 p-4 border-t border-slate-200 rounded-b gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-100 font-bold text-sm">
            Cancelar
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading || !ingenieroSelected}
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
