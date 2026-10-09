import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const sessionExpired = location.state?.sessionExpired;
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
      className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-y-auto bg-cover bg-[position:55%_center] bg-no-repeat px-3 py-16 sm:px-4 sm:py-8"
      style={{ backgroundImage: `url(${bgFarenet})` }}
    >
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />

      <div className="absolute right-3 top-3 z-20 flex items-center gap-2 sm:right-5 sm:top-5 sm:gap-3">
        <NetworkStatus />
        <BackendStatus />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="mb-4 w-full text-center">
          <h1 className="text-2xl font-black tracking-tight text-gold-3d font-serif drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)] sm:text-4xl">
            SISTEMA EN LÍNEA
          </h1>
        </div>

        {sessionExpired && (
          <div className="mb-4 w-full rounded bg-amber-500/90 p-3 text-center border-l-4 border-amber-600 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <p className="text-sm font-semibold text-white">
              Tu sesión ha expirado. Inicia sesión nuevamente para continuar.
            </p>
          </div>
        )}

        

        <div className="w-full rounded-2xl border border-white/20 bg-slate-950/35 p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md sm:p-6">
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
                className="min-h-12 w-full rounded-lg border border-white/20 bg-slate-900/70 px-4 py-3 text-base text-white placeholder-slate-300 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30 disabled:opacity-50"
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
                className="min-h-12 w-full rounded-lg border border-white/20 bg-slate-900/70 px-4 py-3 text-base text-white placeholder-slate-300 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30 disabled:opacity-50"
              />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold-3d px-4 py-3 text-base font-black tracking-wide transition disabled:opacity-50"
              >
              {loading ? 'Procesando...' : 'Ok'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
