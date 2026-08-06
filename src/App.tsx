import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoginView } from './core/views/LoginView';
import { SelectPlantaView } from './core/views/SelectPlantaView';
import { NotFoundView } from './core/views/NotFoundView';
import { ForbiddenView } from './core/views/ForbiddenView';
import { SeleccionEmpresaView } from './core/views/SeleccionEmpresaView';

import { MainLayout } from './modules/farenet/views/Dashboard/MainLayout';
import { InicioView } from './modules/farenet/views/Inicio/InicioView';
import { AuditoriaView } from './modules/farenet/views/Auditoria/AuditoriaView';
import { GenericView } from './modules/farenet/views/Dashboard/GenericView';
import InspeccionesView from './modules/farenet/views/Inspecciones/InspeccionesView';
import { NuevaInspeccionView } from './modules/farenet/views/Inicio/NuevaInspeccion/NuevaInspeccionView';
import { NuevoDuplicadoView } from './modules/farenet/views/Inicio/NuevoDuplicado/NuevoDuplicadoView';
import { LineaView } from './modules/farenet/views/Inicio/Linea';

import { MainLayout as FaregasMainLayout } from './modules/faregas/views/Dashboard/MainLayout';
import { InicioView as FaregasInicioView } from './modules/faregas/views/Inicio/InicioView';
import { NuevaInspeccionView as FaregasNuevaInspeccionView } from './modules/faregas/views/Inicio/NuevaInspeccion/NuevaInspeccionView';

import { useEmpresa } from './context/EmpresaContext';

import type {
  UserSession,
  PlantaAsignada,
  EmpresaAsignada
} from './types/auth';

import {
  authApi,
  plantaSession,
  permisosSession
} from './services/api';

type AuthStep = 'LOGIN' | 'SELECT_EMPRESA' | 'SELECT_PLANTA' | 'DASHBOARD';

export default function App() {
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(true);
  const [step, setStep] = useState<AuthStep>('LOGIN');

  const [usernameContext, setUsernameContext] = useState('');
  const [user, setUser] = useState<UserSession | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [planta, setPlanta] = useState<PlantaAsignada | null>(null);
  const [plantasDisponibles, setPlantasDisponibles] = useState<PlantaAsignada[]>([]);
  const { establecerEmpresasDisponibles, limpiarEmpresa, tieneEmpresaSeleccionada, empresaSeleccionada } = useEmpresa();

  const isFaregas = empresaSeleccionada?.nombre?.toUpperCase().includes('FAREGAS');

  const limpiarSesionFrontend = () => {
    sessionStorage.clear();
    plantaSession.limpiar();
    permisosSession.limpiar();
    limpiarEmpresa();

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
        
        if (tieneEmpresaSeleccionada) {
          setStep('DASHBOARD');
        } else {
          // Fallback en caso recargue en paso medio
          limpiarSesionFrontend();
        }
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
    plantas: PlantaAsignada[] = [],
    empresas: EmpresaAsignada[] = []
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

    if (empresas.length > 0) {
      establecerEmpresasDisponibles(empresas);
    }

    setStep('DASHBOARD');
    navigate('/inicio', { replace: true });
  };

  const handleRequireEmpresa = (
    username: string,
    plantas: PlantaAsignada[],
    empresas: EmpresaAsignada[],
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
    
    establecerEmpresasDisponibles(empresas);
    setStep('SELECT_EMPRESA');
    navigate('/seleccionar-empresa', { replace: true });
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
          ) : step === 'SELECT_EMPRESA' ? (
            <Navigate to="/seleccionar-empresa" replace />
          ) : (
            <LoginView
              onLoginSuccess={handleLoginSuccess}
              onRequirePlanta={handleRequirePlanta}
              onRequireEmpresa={handleRequireEmpresa}
            />
          )
        }
      />
      
      <Route 
        path="/seleccionar-empresa" 
        element={
          step === 'SELECT_EMPRESA' ? (
            <SeleccionEmpresaView 
              onLogout={handleLogout} 
              onSelect={() => {
                setStep('SELECT_PLANTA');
                navigate('/login', { replace: true });
              }} 
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        element={
          step !== 'DASHBOARD' ? (
            <Navigate to="/login" replace />
          ) : isFaregas ? (
            <FaregasMainLayout
              user={user}
              permisos={permisos}
              plantaSeleccionada={planta}
              plantasDisponibles={plantasDisponibles}
              onCambiarPlanta={handleCambiarPlanta}
              onLogout={handleLogout}
            />
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
        {isFaregas ? (
          <>
            <Route path="/inicio" element={<FaregasInicioView />} />
            <Route path="/inspecciones/nueva" element={<FaregasNuevaInspeccionView />} />
          </>
        ) : (
          <>
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
          </>
        )}
        <Route path="/sin-acceso" element={<ForbiddenView />} />
      </Route>

      <Route path="/" element={<Navigate to="/inicio" replace />} />
      <Route path="*" element={<NotFoundView />} />
    </Routes>
  );
}