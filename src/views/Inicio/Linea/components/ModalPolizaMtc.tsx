import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { maestrosApi, lineaApi } from '../../../../services/api';

interface ModalPolizaMtcProps {
  nroInspeccion: string;
  onClose: () => void;
  onRefresh: () => void;
}

export function ModalPolizaMtc({ nroInspeccion, onClose, onRefresh }: ModalPolizaMtcProps) {
  const [aseguradoras, setAseguradoras] = useState<any[]>([]);
  const [tiposPoliza, setTiposPoliza] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    aseguradora: '',
    tipoPoliza: '',
    nroPoliza: '',
    fechaInicio: '',
    fechaFin: ''
  });

  useEffect(() => {
    cargarMaestros();
  }, []);

  const cargarMaestros = async () => {
    try {
      const { data } = await maestrosApi.obtenerMaestrosVehiculoAsync();
      if (data) {
        setAseguradoras(data.aseguradoras || []);
        setTiposPoliza(data.tiposPoliza || []);
      }
    } catch (error) {
      console.error('Error al cargar maestros:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const asgMatch = aseguradoras.find(a => a.nombre.toLowerCase() === form.aseguradora.toLowerCase());
      const tipMatch = tiposPoliza.find(t => t.nombre.toLowerCase() === form.tipoPoliza.toLowerCase());

      const dataToSave = {
        ...form,
        aseguradora: asgMatch ? asgMatch.key : form.aseguradora,
        tipoPoliza: tipMatch ? tipMatch.key : form.tipoPoliza,
      };

      await lineaApi.registrarPoliza(nroInspeccion, dataToSave);
      alert('Póliza MTC registrada con éxito.');
      onRefresh();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
      <div className="bg-white rounded shadow-lg max-w-md w-full animate-fade-in-up">
        <div className="flex justify-between items-center bg-slate-100 p-4 border-b border-slate-200 rounded-t">
          <h3 className="font-bold text-slate-700 uppercase tracking-wide">Registro Póliza MTC</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Aseguradora</label>
            <input
              list="aseguradoras-list"
              className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-200"
              value={form.aseguradora}
              onChange={(e) => setForm({ ...form, aseguradora: e.target.value })}
              placeholder="Escriba o seleccione..."
            />
            <datalist id="aseguradoras-list">
              {aseguradoras.map(a => (
                <option key={a.key} value={a.nombre} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Póliza</label>
            <input
              list="tipos-poliza-list"
              className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-200"
              value={form.tipoPoliza}
              onChange={(e) => setForm({ ...form, tipoPoliza: e.target.value })}
              placeholder="Escriba o seleccione..."
            />
            <datalist id="tipos-poliza-list">
              {tiposPoliza.map(t => (
                <option key={t.key} value={t.nombre} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nro Póliza / SOAT</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-200 uppercase"
              value={form.nroPoliza}
              onChange={(e) => setForm({ ...form, nroPoliza: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Fecha Inicio</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-200"
                value={form.fechaInicio}
                onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Fecha Fin</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-200"
                value={form.fechaFin}
                onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end bg-slate-50 p-4 border-t border-slate-200 rounded-b gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-100 font-bold text-sm">
            Cancelar
          </button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold text-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
