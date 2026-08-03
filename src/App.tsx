import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoginView } from './views/LoginView';
import { SelectPlantaView } from './views/SelectPlantaView';
import { MainLayout } from './views/Dashboard/MainLayout';
import { NotFoundView } from './views/NotFoundView';
import { ForbiddenView } from './views/ForbiddenView';
import { InicioView } from './views/Inicio/InicioView';
import { AuditoriaView } from './views/Auditoria/AuditoriaView';
import { GenericView } from './views/Dashboard/GenericView';
import InspeccionesView from './views/Inspecciones/InspeccionesView';
import { NuevaInspeccionView } from './views/Inicio/NuevaInspeccion/NuevaInspeccionView';
import { NuevoDuplicadoView } from './views/Inicio/NuevoDuplicado/NuevoDuplicadoView';
import { LineaView } from './views/Inicio/Linea';

import type {
  UserSession,
  PlantaAsignada
} from './types/auth';

import {
  authApi,
  plantaSession,
  permisosSession
} from './services/api';

type AuthStep = 'LOGIN' | 'SELECT_PLANTA' | 'DASHBOARD';

export default function App() {
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(true);
  const [step, setStep] = useState<AuthStep>('LOGIN');

  const [usernameContext, setUsernameContext] = useState('');
  const [user, setUser] = useState<UserSession | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [planta, setPlanta] = useState<PlantaAsignada | null>(null);
  const [plantasDisponibles, setPlantasDisponibles] = useState<PlantaAsignada[]>([]);

  const limpiarSesionFrontend = () => {
    sessionStorage.clear();
    plantaSession.limpiar();
    permisosSession.limpiar();

    setUser(null);
    setPermisos([]);
    setPlanta(null);
    setUsernameContext('');
    setPlantasDisponibles([]);
    setStep('LOGIN');
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const restaurarSesion = async () => {
      const token = sessionStorage.getItem('accessToken');
      const userRaw = sessionStorage.getItem('user');
      const plantasRaw = sessionStorage.getItem('plantasDisponibles');
      const plantaSeleccionada = plantaSession.obtener();

      if (!token || !userRaw || !plantaSeleccionada) {
        setIsInitializing(false);
        return;
      }

      try {
        const userSession = JSON.parse(userRaw) as UserSession;

        await authApi.validarSesionAsync(userSession.username);

        const plantasSession = plantasRaw
          ? JSON.parse(plantasRaw) as PlantaAsignada[]
          : [];

        const permisosGuardados = permisosSession.obtener();

        setUser(userSession);
        setPermisos(permisosGuardados);
        setPlanta(plantaSeleccionada);
        setUsernameContext(userSession.username);
        setPlantasDisponibles(plantasSession);
        setStep('DASHBOARD');
      } catch (error) {
        console.error('Sesión expirada o inválida:', error);
        limpiarSesionFrontend();
      } finally {
        setIsInitializing(false);
      }
    };

    restaurarSesion();
  }, []);

  const guardarSesionFrontend = (
    token: string,
    userData: UserSession,
    userPermisos: string[],
    plantaSeleccionada: PlantaAsignada,
    plantas: PlantaAsignada[] = []
  ) => {
    sessionStorage.setItem('accessToken', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.setItem('plantasDisponibles', JSON.stringify(plantas));

    permisosSession.guardar(userPermisos);
    plantaSession.guardar(plantaSeleccionada);

    setUser(userData);
    setPermisos(userPermisos);
    setPlanta(plantaSeleccionada);
    setUsernameContext(userData.username);
    setPlantasDisponibles(plantas);
  };

  const handleLoginSuccess = (
    token: string,
    userData: UserSession,
    userPermisos: string[],
    plantaSeleccionada?: PlantaAsignada | null,
    plantas: PlantaAsignada[] = []
  ) => {
    if (!plantaSeleccionada) {
      console.error('No se recibió plantaSeleccionada en login directo.');
      return;
    }

    guardarSesionFrontend(
      token,
      userData,
      userPermisos,
      plantaSeleccionada,
      plantas
    );

    setStep('DASHBOARD');
    navigate('/inicio', { replace: true });
  };

  const handleRequirePlanta = (
    username: string,
    plantas: PlantaAsignada[],
    userData?: UserSession,
    userPermisos: string[] = []
  ) => {
    setUsernameContext(username);
    setPlantasDisponibles(plantas);
    setPermisos(userPermisos);

    if (userData) {
      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));
    }

    sessionStorage.setItem('plantasDisponibles', JSON.stringify(plantas));
    permisosSession.guardar(userPermisos);

    setStep('SELECT_PLANTA');
  };

  const handleConfirmPlanta = async (plantaKey: string) => {
    if (!usernameContext) {
      throw new Error('No se encontró el usuario en contexto.');
    }

    const resp = await authApi.confirmarPlantaAsync(
      usernameContext,
      plantaKey
    );

    if (!resp.plantaSeleccionada) {
      throw new Error('El backend no retornó la sede seleccionada.');
    }

    const userData: UserSession =
      resp.user ||
      user || {
        username: usernameContext,
        perfilId: 'OPERADOR',
        estado: true,
        userType: 'SISTEMAS'
      };

    const token = resp.accessToken || 'JWT_TOKEN_VALIDADO';
    const permisosFinales = resp.permisos || permisos;

    guardarSesionFrontend(
      token,
      userData,
      permisosFinales,
      resp.plantaSeleccionada,
      plantasDisponibles
    );

    setStep('DASHBOARD');
    navigate('/inicio', { replace: true });
  };

  const handleCambiarPlanta = async (plantaKey: string) => {
    if (!user?.username) {
      throw new Error('No se encontró usuario activo.');
    }

    const resp = await authApi.cambiarPlantaAsync(
      user.username,
      plantaKey
    );

    if (!resp.plantaSeleccionada) {
      throw new Error('El backend no retornó la nueva sede.');
    }

    const permisosActualizados = resp.permisos || permisos;

    if (resp.accessToken) {
      sessionStorage.setItem('accessToken', resp.accessToken);
    }

    plantaSession.guardar(resp.plantaSeleccionada);
    permisosSession.guardar(permisosActualizados);

    setPlanta(resp.plantaSeleccionada);
    setPermisos(permisosActualizados);
  };

  const handleLogout = async () => {
    try {
      if (user?.username) {
        await authApi.logoutAsync(user.username);
      }
    } catch (err) {
      console.error('Error pasivo al notificar logout:', err);
    } finally {
      limpiarSesionFrontend();
    }
  };

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium">Restaurando sesión...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          step === 'DASHBOARD' ? (
            <Navigate to="/inicio" replace />
          ) : step === 'SELECT_PLANTA' ? (
            <SelectPlantaView
              plantas={plantasDisponibles}
              onConfirmPlanta={handleConfirmPlanta}
              onCancel={limpiarSesionFrontend}
            />
          ) : (
            <LoginView
              onLoginSuccess={handleLoginSuccess}
              onRequirePlanta={handleRequirePlanta}
            />
          )
        }
      />
      
      <Route
        element={
          step !== 'DASHBOARD' ? (
            <Navigate to="/login" replace />
          ) : (
            <MainLayout
              user={user}
              permisos={permisos}
              plantaSeleccionada={planta}
              plantasDisponibles={plantasDisponibles}
              onCambiarPlanta={handleCambiarPlanta}
              onLogout={handleLogout}
            />
          )
        }
      >
        <Route path="/inicio" element={<InicioView />} />
        <Route path="/inspecciones" element={<InspeccionesView />} />
        <Route path="/inspecciones/nueva" element={<NuevaInspeccionView />} />
        <Route path="/inspecciones/:nroInspeccion/continuar" element={<NuevaInspeccionView />} />
        <Route path="/inspecciones/duplicado" element={<NuevoDuplicadoView />} />
        <Route path="/linea/:nroInspeccion" element={<LineaView />} />
        <Route path="/auditoria" element={<AuditoriaView />} />
        <Route path="/maestros/personas" element={<GenericView title="Control de Personas" description="Administración de clientes, inspectores y personal autorizado." />} />
        <Route path="/maestros/vehiculos" element={<GenericView title="Registro de Vehículos" description="Búsqueda e historial vehicular filtrado." />} />
        <Route path="/maestros/caja" element={<GenericView title="Módulo de Caja" description="Control de cobros, cierres de caja diaria y transacciones." />} />
        <Route path="/maestros/correlativos" element={<GenericView title="Gestión de Correlativos" description="Mantenimiento de numeración y series de comprobantes." />} />
        <Route path="/maestros/recibos" element={<GenericView title="Historial de Recibos" description="Búsqueda, visualización e impresión de recibos emitidos." />} />
        <Route path="/maestros/usuarios" element={<GenericView title="Control de Usuarios" description="Administración de cuentas, perfiles y asignaciones de planta." />} />
        <Route path="/maestros/empresas" element={<GenericView title="Catálogo de Empresas" description="Mantenimiento de convenios corporativos y entidades asociadas." />} />
        <Route path="/maestros/descuentos" element={<GenericView title="Reglas de Descuentos" description="Configuración de campañas, promociones y tarifas especiales." />} />
        <Route path="/sin-acceso" element={<ForbiddenView />} />
      </Route>

      <Route path="/" element={<Navigate to="/inicio" replace />} />
      <Route path="*" element={<NotFoundView />} />
    </Routes>
  );
}