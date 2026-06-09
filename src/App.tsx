import { useEffect, useState } from 'react';
import { LoginView } from './views/LoginView';
import { SelectPlantaView } from './views/SelectPlantaView';
import { MainLayout } from './views/Dashboard/MainLayout';
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
  const [step, setStep] = useState<AuthStep>('LOGIN');

  const [usernameContext, setUsernameContext] = useState('');
  const [user, setUser] = useState<UserSession | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [planta, setPlanta] = useState<PlantaAsignada | null>(null);
  const [plantasDisponibles, setPlantasDisponibles] = useState<PlantaAsignada[]>([]);

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    const userRaw = sessionStorage.getItem('user');
    const plantasRaw = sessionStorage.getItem('plantasDisponibles');
    const plantaSeleccionada = plantaSession.obtener();

    if (token && userRaw && plantaSeleccionada) {
      try {
        const userSession = JSON.parse(userRaw) as UserSession;

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
        console.error('Error restaurando sesión:', error);
        limpiarSesionFrontend();
      }
    }
  }, []);

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
  };

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

  if (step === 'LOGIN') {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onRequirePlanta={handleRequirePlanta}
      />
    );
  }

  if (step === 'SELECT_PLANTA') {
    return (
      <SelectPlantaView
        plantas={plantasDisponibles}
        onConfirmPlanta={handleConfirmPlanta}
        onCancel={limpiarSesionFrontend}
      />
    );
  }

  return (
    <MainLayout
      user={user}
      permisos={permisos}
      plantaSeleccionada={planta}
      plantasDisponibles={plantasDisponibles}
      onCambiarPlanta={handleCambiarPlanta}
      onLogout={handleLogout}
    />
  );
}
// Inicialización del proceso permanentemente en IPv4 local