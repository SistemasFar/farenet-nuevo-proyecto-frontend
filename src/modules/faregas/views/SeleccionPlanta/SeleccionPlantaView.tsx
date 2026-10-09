import { useState, type FormEvent } from 'react';
import type { PlantaAsignada } from '@/types/auth';
import bgFarenet from '@/assets/images/farenet1.png';
import faregasLogo from '@/assets/images/faregas_logo.png';

interface SeleccionPlantaViewProps {
  plantas: PlantaAsignada[];
  onConfirmPlanta: (plantaKey: string) => Promise<void> | void;
  onCancel: () => void;
}

export function SeleccionPlantaView({
  plantas,
  onConfirmPlanta,
  onCancel
}: SeleccionPlantaViewProps) {
  const unicaPlanta = plantas.length === 1 ? plantas[0] : null;

  const [selectedKey, setSelectedKey] = useState(() => unicaPlanta?.key ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const selectedKeyValido = unicaPlanta?.key
    ?? (plantas.some((planta) => planta.key === selectedKey) ? selectedKey : '');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedKeyValido) {
      setError('Por favor selecciona una sede operativa.');
      return;
    }

    try {
      setLoading(true);
      await onConfirmPlanta(selectedKeyValido);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar la sede seleccionada.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-y-auto bg-cover bg-[position:55%_center] bg-no-repeat px-3 py-5 sm:px-4 sm:py-8"
      style={{ backgroundImage: `url(${bgFarenet})` }}
    >
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"></div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="mb-4 w-full text-center sm:mb-5">
          <img
            src={faregasLogo}
            alt="FARE GAS"
            className="mx-auto h-auto w-[min(82vw,420px)] max-w-full select-none drop-shadow-[0_5px_8px_rgba(0,0,0,0.55)]"
          />

          <h1 className="mt-3 text-lg font-bold tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] sm:text-xl">
            {unicaPlanta ? 'Sede asignada' : 'Seleccionar Sede'}
          </h1>
        </div>

        <div className="w-full rounded-2xl border border-white/20 bg-slate-950/35 p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-center text-sm font-medium leading-5 text-slate-100 drop-shadow-sm">
              {unicaPlanta
                ? 'Ingresarás a FAREGAS con la siguiente sede.'
                : 'Elige la sede desde la que vas a operar en esta sesión.'}
            </p>

            {plantas.length === 0 && (
              <div className="rounded bg-red-500/20 backdrop-blur-sm p-3 text-center border-l-4 border-red-500">
                <p className="text-xs font-semibold text-red-200">
                  No tienes sedes asignadas para FAREGAS. Contacta con un administrador.
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

            {unicaPlanta ? (
              <div className="flex min-h-12 w-full items-center justify-center rounded-lg border border-white/20 bg-white/15 px-4 py-3 text-center">
                <p className="text-base font-bold text-white">{unicaPlanta.nombre}</p>
              </div>
            ) : plantas.length > 1 ? (
              <div>
                <select
                  value={selectedKeyValido}
                  disabled={loading}
                  onChange={(e) => {
                    setSelectedKey(e.target.value);
                    setError(null);
                  }}
                  className="min-h-12 w-full cursor-pointer appearance-none rounded-lg border border-white/20 bg-slate-900/70 px-4 py-3 text-base text-white outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30 disabled:opacity-50"
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
            ) : null}

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={loading || plantas.length === 0}
                className="min-h-12 w-full rounded-xl bg-gold-3d px-4 py-3 text-base font-black tracking-wide shadow-lg transition disabled:opacity-50"
              >
                {loading
                  ? (unicaPlanta ? 'Iniciando...' : 'Confirmando...')
                  : (unicaPlanta ? 'Iniciar Sesión' : 'Confirmar Sede')}
              </button>

              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="min-h-11 w-full rounded-lg px-3 py-2 text-center text-sm text-slate-200 underline underline-offset-4 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
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
