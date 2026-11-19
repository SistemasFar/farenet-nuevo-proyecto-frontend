import { useLocation, useNavigate } from 'react-router-dom';
import { resolverAccionForbidden } from '@/modules/faregas/utils/navegacion-permisos';

export function ForbiddenView() {
  const navigate = useNavigate();
  const location = useLocation();

  const isFaregas =
    location.pathname.startsWith('/faregas') ||
    Boolean(sessionStorage.getItem('faregasAccessToken')) ||
    JSON.parse(sessionStorage.getItem('empresaSeleccionada') || '{}')?.nombre?.toUpperCase().includes('FAREGAS');

  let permisosFaregas: string[] = [];
  if (isFaregas) {
    try {
      const fUser = JSON.parse(sessionStorage.getItem('faregasUser') || '{}');
      if (Array.isArray(fUser?.permisos)) {
        permisosFaregas = fUser.permisos;
      }
    } catch {
      permisosFaregas = [];
    }
  }

  const accionFaregas = isFaregas ? resolverAccionForbidden(permisosFaregas) : null;

  const handleAction = () => {
    if (!isFaregas) {
      navigate('/inicio', { replace: true });
      return;
    }

    if (accionFaregas?.ruta) {
      navigate(accionFaregas.ruta, { replace: true });
    } else {
      // Sin módulos autorizados: cierre de sesión limpio
      sessionStorage.removeItem('faregasAccessToken');
      sessionStorage.removeItem('faregasUser');
      sessionStorage.removeItem('faregasPlanta');
      sessionStorage.removeItem('faregasPreToken');
      sessionStorage.removeItem('faregasPlantasDisponibles');
      navigate('/login', { replace: true });
    }
  };

  const sinModulosAutorizados = isFaregas && !accionFaregas?.ruta;

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="text-center max-w-md">
        <h1 className="mb-4 text-9xl font-extrabold text-slate-800">403</h1>
        <h2 className="mb-4 text-2xl font-bold text-slate-600">Acceso Denegado</h2>
        <p className="mb-8 text-slate-500">
          {sinModulosAutorizados
            ? 'No tienes ningún módulo autorizado en tu perfil. Contacta al administrador para que configure tus accesos.'
            : 'No tienes permisos suficientes para acceder a esta pantalla.'}
        </p>
        <button
          type="button"
          onClick={handleAction}
          className={`rounded-lg px-6 py-3 font-semibold text-white shadow-md transition ${
            sinModulosAutorizados
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isFaregas ? (accionFaregas?.label || 'Cerrar sesión') : 'Volver al Inicio'}
        </button>
      </div>
    </div>
  );
}
