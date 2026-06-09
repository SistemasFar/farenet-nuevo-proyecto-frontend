import { useState, type FormEvent } from 'react';
import { authApi } from '../services/api';
import type {
  LoginResponse,
  PlantaAsignada,
  UserSession
} from '../types/auth';

import bgFarenet from '../assets/images/farenet1.png';

interface LoginViewProps {
  onLoginSuccess: (
    token: string,
    user: UserSession,
    permisos: string[],
    plantaSeleccionada?: string,
    plantas?: PlantaAsignada[]
  ) => void;
  onRequirePlanta: (
    username: string,
    plantas: PlantaAsignada[],
    user?: UserSession,
    permisos?: string[]
  ) => void;
}

export function LoginView({
  onLoginSuccess,
  onRequirePlanta
}: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const resp: LoginResponse = await authApi.loginAsync(
        cleanUsername,
        cleanPassword
      );

      const plantasReales = resp.plantas || [];
      const permisos = resp.permisos || [];

      if (resp.requiereSeleccionarPlanta) {
        onRequirePlanta(
          cleanUsername,
          plantasReales,
          resp.user,
          permisos
        );
        return;
      }

      if (resp.accessToken && resp.user) {
        onLoginSuccess(
          resp.accessToken,
          resp.user,
          permisos,
          resp.plantaSeleccionada,
          plantasReales
        );
        return;
      }

      setError('No se recibió una sesión válida desde el servidor.');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
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
          <h1 className="text-6xl font-black tracking-tight text-[#f2cc11] font-serif drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]">
            FARENET
          </h1>

          <p className="mt-1 text-xl font-bold tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            Sistema de Línea
          </p>
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
              className="w-full rounded-lg bg-[#f2cc11] py-3 text-sm font-black text-[#052a79] shadow-lg transition transform hover:bg-[#e0bc0d] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Ok'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}