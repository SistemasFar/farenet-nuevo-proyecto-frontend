import { useState, type FormEvent } from 'react';
import { Tag, Loader2, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import { faregasFetch } from '../../../../services/faregas-http-client';

interface ReservaChipAdicionalProps {
  certificadoId?: number;
}

export function ReservaChipAdicional({ certificadoId }: ReservaChipAdicionalProps) {
  const [quiereChip, setQuiereChip] = useState(false);
  const [numeroChip, setNumeroChip] = useState('');
  const [estado, setEstado] = useState<'IDLE' | 'LOADING' | 'RESERVED' | 'ERROR'>('IDLE');
  const [mensajeError, setMensajeError] = useState('');

  if (!certificadoId) return null;

  const handleReservar = async (e: FormEvent) => {
    e.preventDefault();
    if (!numeroChip.trim()) return;
    
    setEstado('LOADING');
    setMensajeError('');
    
    try {
      await faregasFetch('/chips/reservas', {
        method: 'POST',
        body: JSON.stringify({
        numeroChip: numeroChip.trim(),
        certificadoId
      })});
      setEstado('RESERVED');
    } catch (error: any) {
      setEstado('ERROR');
      setMensajeError(error.response?.data?.message || error.message || 'Error al reservar el chip');
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="h-5 w-5 text-[#f59e0b]" />
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700">Adicionales</h4>
      </div>
      
      <div className="flex items-center gap-3 mb-4">
        <input 
          type="checkbox" 
          id="chkChip"
          className="h-5 w-5 rounded border-slate-300 text-[#052a79] focus:ring-[#052a79]"
          checked={quiereChip}
          onChange={(e) => setQuiereChip(e.target.checked)}
          disabled={estado === 'RESERVED' || estado === 'LOADING'}
        />
        <label htmlFor="chkChip" className="font-semibold text-slate-700 cursor-pointer select-none">
          Agregar Chip y porta chip
        </label>
      </div>

      {quiereChip && estado !== 'RESERVED' && (
        <form onSubmit={handleReservar} className="flex gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={numeroChip}
              onChange={(e) => setNumeroChip(e.target.value)}
              placeholder="Escanea o escribe el número de chip..."
              className="h-10 w-full rounded-lg border-2 border-slate-200 pl-10 pr-4 text-sm font-bold text-slate-800 transition-colors focus:border-[#052a79] focus:ring-0"
              disabled={estado === 'LOADING'}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={estado === 'LOADING' || !numeroChip.trim()}
            className="flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-[#052a79] px-4 font-black text-white text-xs transition hover:bg-[#052a79]/90 disabled:opacity-50"
          >
            {estado === 'LOADING' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'RESERVAR CHIP'}
          </button>
        </form>
      )}

      {estado === 'ERROR' && (
        <div className="mt-3 flex items-center gap-2 text-sm font-bold text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertTriangle className="h-4 w-4" />
          {mensajeError}
        </div>
      )}

      {estado === 'RESERVED' && (
        <div className="mt-3 flex items-center gap-2 text-sm font-bold text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Chip {numeroChip} reservado correctamente.
        </div>
      )}
    </section>
  );
}
