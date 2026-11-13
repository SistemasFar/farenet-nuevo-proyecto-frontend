import React, { useState } from 'react';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { authApi, authFaregasApi } from '@/services/api';

interface CambiarContrasenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  isFaregas?: boolean;
  onSuccessLogout?: () => void;
}

export const CambiarContrasenaModal: React.FC<CambiarContrasenaModalProps> = ({
  isOpen,
  onClose,
  username,
  isFaregas = false,
  onSuccessLogout
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    setError('');
    setSuccess('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    onClose();
  };

  const validarFormulario = (): string | null => {
    const cur = currentPassword.trim();
    const nueva = newPassword.trim();
    const conf = confirmPassword.trim();

    if (!cur || !nueva || !conf) {
      return 'Todos los campos son obligatorios.';
    }

    if (nueva !== conf) {
      return 'La nueva contraseña y su confirmación no coinciden.';
    }

    if (isFaregas) {
      if (nueva.length < 12) {
        return 'La nueva contraseña debe tener al menos 12 caracteres.';
      }

      const tieneMayus = /[A-Z]/.test(nueva);
      const tieneMinus = /[a-z]/.test(nueva);
      const tieneNumOSimb = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(nueva);

      if (!tieneMayus || !tieneMinus || !tieneNumOSimb) {
        return 'La nueva contraseña debe incluir al menos una mayúscula, una minúscula y un número o símbolo.';
      }

      if (cur === nueva) {
        return 'La nueva contraseña debe ser diferente de la contraseña actual.';
      }

      if (username && nueva.toLowerCase().includes(username.toLowerCase())) {
        return 'La contraseña no puede contener el nombre de usuario.';
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setSuccess('');

    const errorValidacion = validarFormulario();
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    try {
      setLoading(true);

      if (isFaregas) {
        await authFaregasApi.cambiarContrasenaAsync(currentPassword, newPassword, confirmPassword);
        setSuccess('Contraseña actualizada correctamente. Por seguridad, las sesiones activas han sido revocadas. Redirigiendo al inicio de sesión...');

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        setTimeout(() => {
          handleClose();
          if (onSuccessLogout) {
            onSuccessLogout();
          }
        }, 2200);
      } else {
        await authApi.cambiarContrasenaAsync(username, currentPassword, newPassword);
        setSuccess('Contraseña actualizada correctamente.');

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        setTimeout(() => {
          handleClose();
        }, 1800);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al cambiar contraseña.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isFaregas
            ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white'
            : 'bg-slate-100 text-slate-800 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isFaregas ? 'bg-white/15 text-white' : 'bg-blue-100 text-blue-600'}`}>
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                {isFaregas ? 'Cambiar Contraseña — FAREGAS' : 'Cambiar Contraseña'}
              </h2>
              <p className={`text-xs ${isFaregas ? 'text-amber-100' : 'text-slate-500'}`}>
                Usuario: <span className="font-semibold">{username}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-800 border border-emerald-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-semibold leading-relaxed">{success}</div>
            </div>
          )}

          {/* Contraseña Actual */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Contraseña Actual
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading || !!success}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition disabled:bg-slate-100 disabled:opacity-60"
                placeholder="Ingresa tu contraseña actual"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showCurrent ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nueva Contraseña {isFaregas && <span className="text-slate-400 font-normal">(mínimo 12 caracteres)</span>}
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading || !!success}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition disabled:bg-slate-100 disabled:opacity-60"
                placeholder="Ingresa la nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showNew ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isFaregas && (
              <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                Debe incluir mayúsculas, minúsculas y al menos un número o símbolo.
              </p>
            )}
          </div>

          {/* Confirmar Nueva Contraseña */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirmar Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading || !!success}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition disabled:bg-slate-100 disabled:opacity-60"
                placeholder="Repite la nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showConfirm ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botones */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading || !!success}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !!success}
              className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white transition flex items-center gap-2 shadow-sm ${
                isFaregas
                  ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-amber-300'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300'
              }`}
            >
              {loading ? 'Guardando...' : 'Guardar Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
