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
import { NuevaInspeccionView } from './modules/farenet/views/NuevaInspeccion/NuevaInspeccionView';
import { NuevoDuplicadoView } from './modules/farenet/views/NuevoDuplicado/NuevoDuplicadoView';
import { LineaView } from './modules/farenet/views/Linea';

import { MainLayout as FaregasMainLayout } from './modules/faregas/views/Dashboard/MainLayout';
import { InicioView as FaregasInicioView } from './modules/faregas/views/Inicio/InicioView';
import { NuevoCertificadoView as FaregasNuevoCertificadoView } from './modules/faregas/views/NuevoCertificado/NuevoCertificadoView';

import { useEmpresa } from './context/EmpresaContext';

import type { UserSession, PlantaAsignada, EmpresaAsignada } from './types/auth';
import { authApi, plantaSession, permisosSession } from './services/api';

export default function App() {
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(true);

  const [usernameContext, setUsernameContext] = useState('');
  const [user, setUser] = useState<UserSession | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [planta, setPlanta] = useState<PlantaAsignada | null>(null);
  const [plantasDisponibles, setPlantasDisponibles] = useState<PlantaAsignada[]>([]);
  
  const { establecerEmpresasDisponibles, limpiarEmpresa, empresaSeleccionada } = useEmpresa();

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
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const restaurarSesion = async () => {
      const token = sessionStorage.getItem('accessToken');
      const userRaw = sessionStorage.getItem('user');
      const plantasRaw = sessionStorage.getItem('plantasDisponibles');
      const plantaSeleccionada = plantaSession.obtener();

      if (!token || !userRaw) {
        setIsInitializing(false);
        return;
      }

      try {
        const userSession = JSON.parse(userRaw) as UserSession;
        await authApi.validarSesionAsync(userSession.username);

        const plantasSession = plantasRaw ? JSON.parse(plantasRaw) as PlantaAsignada[] : [];
        const permisosGuardados = permisosSession.obtener();

        setUser(userSession);
        setPermisos(permisosGuardados);
        setPlanta(plantaSeleccionada);
        setUsernameContext(userSession.username);
        setPlantasDisponibles(plantasSession);

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
    plantaSeleccionada: PlantaAsignada | null,
    plantas: PlantaAsignada[] = []
  ) => {
    sessionStorage.setItem('accessToken', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.setItem('plantasDisponibles', JSON.stringify(plantas));

    permisosSession.guardar(userPermisos);
    if (plantaSeleccionada) {
      plantaSession.guardar(plantaSeleccionada);
    }

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

    guardarSesionFrontend(token, userData, userPermisos, plantaSeleccionada, plantas);

    if (empresas.length > 0) {
      establecerEmpresasDisponibles(empresas);
    }
    
    // Determinamos si redirigir a faregas o farenet según si se autoseleccionó faregas
    const esSedeFaregas = plantaSeleccionada.nombre.toUpperCase().includes('FAREGAS');
    navigate(esSedeFaregas ? '/faregas/inicio' : '/inicio');
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
    navigate('/seleccionar-empresa');
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

    // Si ya seleccionó FAREGAS en sessionStorage/Context, redirigir a faregas/seleccionar-planta
    navigate(isFaregas ? '/faregas/seleccionar-planta' : '/seleccionar-planta');
  };

  const handleConfirmPlanta = async (plantaKey: string) => {
    if (!usernameContext) {
      throw new Error('No se encontró el usuario en contexto.');
    }

    const resp = await authApi.confirmarPlantaAsync(usernameContext, plantaKey);

    if (!resp.plantaSeleccionada) {
      throw new Error('El backend no retornó la sede seleccionada.');
    }

    const userData: UserSession = resp.user || user || {
      username: usernameContext,
      perfilId: 'OPERADOR',
      estado: true,
      userType: 'SISTEMAS'
    };

    const token = resp.accessToken || 'JWT_TOKEN_VALIDADO';
    const permisosFinales = resp.permisos || permisos;

    guardarSesionFrontend(token, userData, permisosFinales, resp.plantaSeleccionada, plantasDisponibles);
    
    navigate(isFaregas ? '/faregas/inicio' : '/inicio');
  };

  const handleCambiarPlanta = async (plantaKey: string) => {
    if (!user?.username) {
      throw new Error('No se encontró usuario activo.');
    }

    const resp = await authApi.cambiarPlantaAsync(user.username, plantaKey);

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

  // Proteccion de rutas
  const isAuthenticated = !!user;
  const isDashboardReady = isAuthenticated && !!planta;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isDashboardReady ? (
            <Navigate to={isFaregas ? '/faregas/inicio' : '/inicio'} replace />
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
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : (
            <SeleccionEmpresaView 
              onLogout={handleLogout} 
              onSelect={(empresa) => {
                const esFaregas = empresa.nombre.toUpperCase().includes('FAREGAS');
                navigate(esFaregas ? '/faregas/seleccionar-planta' : '/seleccionar-planta');
              }} 
            />
          )
        }
      />

      <Route 
        path="/seleccionar-planta" 
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : (
            <SelectPlantaView
              plantas={plantasDisponibles}
              onConfirmPlanta={handleConfirmPlanta}
              onCancel={limpiarSesionFrontend}
            />
          )
        }
      />

      {/* RUTAS DE FAREGAS */}
      <Route
        path="/faregas/*"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : !isFaregas ? (
            <Navigate to="/inicio" replace />
          ) : (
            <Routes>
              <Route 
                path="seleccionar-planta" 
                element={
                  <SelectPlantaView
                    plantas={plantasDisponibles}
                    onConfirmPlanta={handleConfirmPlanta}
                    onCancel={limpiarSesionFrontend}
                  />
                } 
              />
              <Route
                element={
                  !isDashboardReady ? (
                    <Navigate to="/faregas/seleccionar-planta" replace />
                  ) : (
                    <FaregasMainLayout
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
                <Route path="inicio" element={<FaregasInicioView />} />
                <Route path="certificados/nuevo" element={<FaregasNuevoCertificadoView />} />
                <Route path="*" element={<NotFoundView />} />
              </Route>
            </Routes>
          )
        }
      />

      {/* RUTAS DE FARENET */}
      <Route
        element={
          !isDashboardReady ? (
            <Navigate to="/login" replace />
          ) : isFaregas ? (
            <Navigate to="/faregas/inicio" replace />
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
        <Route path="inicio" element={<InicioView />} />
        <Route path="inspecciones" element={<InspeccionesView />} />
        <Route path="inspecciones/nueva" element={<NuevaInspeccionView />} />
        <Route path="inspecciones/:nroInspeccion/continuar" element={<NuevaInspeccionView />} />
        <Route path="inspecciones/duplicado" element={<NuevoDuplicadoView />} />
        <Route path="linea/:nroInspeccion" element={<LineaView />} />
        <Route path="auditoria" element={<AuditoriaView />} />
        <Route path="maestros/personas" element={<GenericView title="Control de Personas" description="Administración de clientes, inspectores y personal autorizado." />} />
        <Route path="maestros/vehiculos" element={<GenericView title="Registro de Vehículos" description="Búsqueda e historial vehicular filtrado." />} />
        <Route path="maestros/caja" element={<GenericView title="Módulo de Caja" description="Control de cobros, cierres de caja diaria y transacciones." />} />
        <Route path="maestros/correlativos" element={<GenericView title="Gestión de Correlativos" description="Mantenimiento de numeración y series de comprobantes." />} />
        <Route path="maestros/recibos" element={<GenericView title="Historial de Recibos" description="Búsqueda, visualización e impresión de recibos emitidos." />} />
        <Route path="maestros/usuarios" element={<GenericView title="Control de Usuarios" description="Administración de cuentas, perfiles y asignaciones de planta." />} />
        <Route path="maestros/empresas" element={<GenericView title="Catálogo de Empresas" description="Mantenimiento de convenios corporativos y entidades asociadas." />} />
        <Route path="maestros/descuentos" element={<GenericView title="Reglas de Descuentos" description="Configuración de campañas, promociones y tarifas especiales." />} />
      </Route>

      <Route path="/sin-acceso" element={<ForbiddenView />} />
      <Route path="/" element={<Navigate to={isDashboardReady ? (isFaregas ? "/faregas/inicio" : "/inicio") : "/login"} replace />} />
      <Route path="*" element={<NotFoundView />} />
    </Routes>
  );
}
