import { useEffect, useState } from 'react';
import { LoginView } from './views/LoginView';
import { SelectPlantaView } from './views/SelectPlantaView';
import { MainLayout } from './views/Dashboard/MainLayout';
import type {
  UserSession,
  PlantaAsignada
} from './types/auth';
import { authApi, plantaSession } from './services/api';

type AuthStep = 'LOGIN' | 'SELECT_PLANTA' | 'DASHBOARD';

export default function App() {
  const [step, setStep] = useState<AuthStep>('LOGIN');

  const [usernameContext, setUsernameContext] = useState('');
  const [user, setUser] = useState<UserSession | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [planta, setPlanta] = useState<string>('');
  const [plantasDisponibles, setPlantasDisponibles] = useState<PlantaAsignada[]>([]);

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    const userRaw = sessionStorage.getItem('user');
    const permisosRaw = sessionStorage.getItem('permisos');
    const plantasRaw = sessionStorage.getItem('plantasDisponibles');
    const plantaSeleccionada = plantaSession.obtener();

    if (token && userRaw && plantaSeleccionada) {
      try {
        const userSession = JSON.parse(userRaw) as UserSession;
        const permisosSession = permisosRaw
          ? JSON.parse(permisosRaw)
          : [];
        const plantasSession = plantasRaw
          ? JSON.parse(plantasRaw)
          : [];

        setUser(userSession);
        setPermisos(permisosSession);
        setPlanta(plantaSeleccionada);
        setUsernameContext(userSession.username);
        setPlantasDisponibles(plantasSession);
        setStep('DASHBOARD');
      } catch (error) {
        sessionStorage.clear();
        plantaSession.limpiar();
        setStep('LOGIN');
      }
    }
  }, []);

  const guardarSesionFrontend = (
    token: string,
    userData: UserSession,
    userPermisos: string[],
    plantaSeleccionada: string,
    plantas: PlantaAsignada[] = []
  ) => {
    sessionStorage.setItem('accessToken', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.setItem('permisos', JSON.stringify(userPermisos));
    sessionStorage.setItem('plantasDisponibles', JSON.stringify(plantas));
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
    plantaSeleccionada?: string,
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
    sessionStorage.setItem('permisos', JSON.stringify(userPermisos));

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
      resp.plantaSeleccionada || plantaKey,
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

    const nuevaPlanta = resp.plantaSeleccionada || plantaKey;

    plantaSession.guardar(nuevaPlanta);
    setPlanta(nuevaPlanta);

    // Aquí luego se deberán recargar dashboard, inspecciones y demás módulos
    // usando la nueva sede seleccionada.
  };

  const handleLogout = async () => {
    try {
      if (user?.username) {
        await authApi.logoutAsync(user.username);
      }
    } catch (err) {
      console.error('Error pasivo al notificar logout:', err);
    } finally {
      sessionStorage.clear();
      plantaSession.limpiar();

      setUser(null);
      setPermisos([]);
      setPlanta('');
      setUsernameContext('');
      setPlantasDisponibles([]);
      setStep('LOGIN');
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
        onCancel={() => {
          sessionStorage.clear();
          plantaSession.limpiar();
          setUser(null);
          setPermisos([]);
          setPlanta('');
          setUsernameContext('');
          setPlantasDisponibles([]);
          setStep('LOGIN');
        }}
      />
    );
  }

  return (
    <MainLayout
      user={user}
      plantaSeleccionada={planta}
      plantasDisponibles={plantasDisponibles}
      onCambiarPlanta={handleCambiarPlanta}
      onLogout={handleLogout}
    />
  );
}
