import { useNavigate } from 'react-router-dom';

export function ForbiddenView() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="text-center">
        <h1 className="mb-4 text-9xl font-extrabold text-slate-800">403</h1>
        <h2 className="mb-8 text-2xl font-bold text-slate-600">Acceso Denegado</h2>
        <p className="mb-8 text-slate-500">
          No tienes permisos suficientes para acceder a esta pantalla.
        </p>
        <button
          onClick={() => navigate('/inicio', { replace: true })}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700"
        >
          Volver al Inicio
        </button>
      </div>
    </div>
  );
}
