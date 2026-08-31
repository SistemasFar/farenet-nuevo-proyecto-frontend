import { useState, type FormEvent } from 'react';
import { authApi } from '@/services/api';
import { NetworkStatus } from '@/components/NetworkStatus';
import { BackendStatus } from '@/components/BackendStatus';

import type {
  PlantaAsignada,
  UserSession,
  EmpresaAsignada
} from '@/types/auth';

import { useEmpresa } from '@/context/EmpresaContext';

import bgFarenet from '@/assets/images/farenet1.png';

interface LoginViewProps {
  onRequireEmpresa: (
    username: string,
    plantas: PlantaAsignada[],
    empresas: EmpresaAsignada[],
    user?: UserSession,
    permisos?: string[],
    password?: string
  ) => void;
}

export function LoginView({
  onRequireEmpresa
}: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { limpiarEmpresa } = useEmpresa();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError('Por favor ingresa tu usuario y contraseña.');
      return;
    }

    setLoading(true);

    try {
      const resp = await authApi.detectarEmpresasAsync(
        cleanUsername,
        cleanPassword
      );

      const empresas = resp.empresasDisponibles || [];

      // Validar si el usuario tiene empresas asignadas
      if (empresas.length === 0) {
        limpiarEmpresa();
        setError('Credenciales inválidas o sin empresas asignadas.');
        return;
      }

      // Mostrar SIEMPRE la pantalla de selección de empresa (el auto-login a FARENET/FAREGAS se hará después)
      onRequireEmpresa(
        cleanUsername,
        [], // plantas vacías temporalmente, se obtendrán al elegir FARENET
        empresas,
        undefined,
        undefined,
        cleanPassword
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-4 select-none bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${bgFarenet})` }}
    >
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />

      <div className="absolute right-5 top-5 z-20 flex items-center gap-3">
        <NetworkStatus />
        <BackendStatus />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <div className="mb-4 text-center w-full min-w-max">
          <h1 className="text-4xl whitespace-nowrap font-black tracking-tight text-gold-3d font-serif drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]">
            SISTEMA EN LÍNEA
          </h1>
        </div>

        

        <div className="w-full rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded bg-red-500/20 backdrop-blur-sm p-3 text-center border-l-4 border-red-500">
                <p className="text-xs font-semibold text-red-200">
                  {error}
                </p>
              </div>
            )}

            <div>
              <input
                type="text"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
                className="w-full rounded border border-white/10 bg-white/15 px-4 py-3 text-sm text-white placeholder-slate-300 outline-none transition focus:border-white/30 focus:bg-white/25 disabled:opacity-50"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                className="w-full rounded border border-white/10 bg-white/15 px-4 py-3 text-sm text-white placeholder-slate-300 outline-none transition focus:border-white/30 focus:bg-white/25 disabled:opacity-50"
              />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-3d py-3 text-sm font-black uppercase tracking-wider transition disabled:opacity-50"
              >
              {loading ? 'Procesando...' : 'Ok'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}