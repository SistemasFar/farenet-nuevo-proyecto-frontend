import { useState, type FormEvent } from 'react';
import type { PlantaAsignada } from '@/types/auth';
import { useEmpresa } from '@/context/EmpresaContext';

import bgFarenet from '@/assets/images/farenet1.png';

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
  const { empresaSeleccionada } = useEmpresa();
  const isFaregas = empresaSeleccionada?.nombre?.toUpperCase().includes('FAREGAS');

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
          {isFaregas ? (
            <div className="flex items-center justify-center select-none drop-shadow-lg mb-2">
              <h1 className="text-[4.5rem] font-black tracking-[0.02em] text-gold-3d leading-none" style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}>FARE</h1>
              <div className="mx-1 mt-1">
                <svg width="45" height="60" viewBox="0 0 100 130" className="drop-shadow-md">
                  <path d="M 50,0 C 50,0 10,70 10,95 C 10,117 28,130 50,130 C 72,130 90,117 90,95 C 90,70 50,0 50,0 Z" fill="#25a5e3" />
                  <path d="M 52,40 C 52,40 75,75 75,100 C 75,115 65,125 50,125 C 60,110 50,90 48,70 C 47,60 52,40 52,40 Z" fill="#e6201b" />
                  <path d="M 54,65 C 54,65 67,85 67,105 C 67,115 60,120 52,120 C 58,110 52,95 50,85 C 49,80 54,65 54,65 Z" fill="#fbd304" />
                  <path d="M 20,95 C 20,80 35,45 45,25 C 35,45 25,75 25,95 C 25,105 32,115 40,120 C 30,115 20,105 20,95 Z" fill="#69c8f5" opacity="0.8" />
                </svg>
              </div>
              <h1 className="text-[4.5rem] font-black tracking-[0.02em] text-gold-3d leading-none" style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}>GAS</h1>
            </div>
          ) : (
            <h1 className="text-5xl font-black tracking-tight text-gold-3d font-serif drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]">
              FARENET
            </h1>
          )}

          <h2 className="mt-2 text-lg font-bold tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
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
                className="w-full rounded-xl bg-gold-3d py-3 text-sm font-black uppercase tracking-wider shadow-lg transition disabled:opacity-50"
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