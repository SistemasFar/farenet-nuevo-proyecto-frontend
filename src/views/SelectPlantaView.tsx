import { useState, type FormEvent } from 'react';
import type { PlantaAsignada } from '../types/auth';

import bgFarenet from '../assets/images/farenet1.png';

interface SelectPlantaViewProps {
  plantas: PlantaAsignada[];
  onConfirmPlanta: (plantaKey: string) => Promise<void> | void;
  onCancel: () => void;
}

export function SelectPlantaView({
  plantas,
  onConfirmPlanta,
  onCancel
}: SelectPlantaViewProps) {
  const [selectedKey, setSelectedKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedKey) {
      setError('Por favor selecciona una sede operativa.');
      return;
    }

    try {
      setLoading(true);
      await onConfirmPlanta(selectedKey);
    } catch (err: any) {
      setError(err.message || 'No se pudo confirmar la sede seleccionada.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-4 select-none bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${bgFarenet})` }}
    >
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <div className="mb-4 text-center">
          <h1 className="text-5xl font-black tracking-tight text-[#f2cc11] font-serif drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]">
            FARENET
          </h1>

          <h2 className="mt-1 text-lg font-bold tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            Seleccionar Sede
          </h2>
        </div>

        <div className="w-full rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-200 text-center font-medium drop-shadow-sm">
              Elige la sede desde la que vas a operar en esta sesión.
            </p>

            {plantas.length === 0 && (
              <div className="rounded bg-red-500/20 backdrop-blur-sm p-3 text-center border-l-4 border-red-500">
                <p className="text-xs font-semibold text-red-200">
                  No tienes sedes asignadas para operar.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded bg-red-500/20 backdrop-blur-sm p-3 text-center border-l-4 border-red-500">
                <p className="text-xs font-semibold text-red-200">
                  {error}
                </p>
              </div>
            )}

            <div>
              <select
                value={selectedKey}
                disabled={loading || plantas.length === 0}
                onChange={(e) => {
                  setSelectedKey(e.target.value);
                  setError(null);
                }}
                className="w-full rounded border border-white/10 bg-white/15 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30 focus:bg-white/25 cursor-pointer appearance-none disabled:opacity-50"
                style={{ colorScheme: 'dark' }}
              >
                <option value="" className="text-slate-800 bg-white">
                  -- Seleccionar Sede --
                </option>

                {plantas.map((planta) => (
                  <option
                    key={planta.key}
                    value={planta.key}
                    className="text-slate-800 bg-white"
                  >
                    {planta.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={loading || plantas.length === 0}
                className="w-full rounded-lg bg-[#f2cc11] py-3 text-sm font-black text-[#052a79] shadow-lg transition transform hover:bg-[#e0bc0d] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Confirmando...' : 'Confirmar Sede'}
              </button>

              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="w-full text-center text-xs text-slate-300 hover:text-white transition-colors py-1 underline underline-offset-4 disabled:opacity-50"
              >
                ← Volver al Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}