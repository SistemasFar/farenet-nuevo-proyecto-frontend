import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoginView } from './core/views/LoginView';
import { SelectPlantaView } from './core/views/SelectPlantaView';
import { SeleccionPlantaView as FaregasSeleccionPlantaView } from './modules/faregas/views/SeleccionPlanta/SeleccionPlantaView';
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
import { UsuariosView as FaregasUsuariosView } from './modules/faregas/views/Usuarios/UsuariosView';
import { AuditoriaView as FaregasAuditoriaView } from './modules/faregas/views/Auditoria/AuditoriaView';
import { FaregasConfiguracionView } from './modules/faregas/views/Configuracion/FaregasConfiguracionView';
import { DescuentosView as FaregasDescuentosView } from './modules/faregas/views/Descuentos/DescuentosView';
import { ChipsView as FaregasChipsView } from './modules/faregas/views/Chips/ChipsView';

import { useEmpresa } from './context/EmpresaContext';

import type { UserSession, PlantaAsignada, EmpresaAsignada } from './types/auth';
import { authApi, authFaregasApi, plantaSession, permisosSession } from './services/api';

type FaregasUserSession = UserSession & { permisos?: string[] };

interface PlantaUpdateDetail {
  key: string;
  activo: boolean;
  nombre: string;
}

const SEDES_VALIDAS_FAREGAS = [
  'AREQUIPA', 'ATE', 'CAMACHO', 'CHORRILLOS', 'CHORRILLOS MAKALU', 'COLINA', 
  'COLINA MAKALU', 'DERBY', 'FAUCETT', 'ICA', 'INDEPENDENCIA', 'JESUS MARIA', 
  'JICAMARCA', 'MOLINA', 'OLGUIN', 'PIURA', 'PLANTA 1', 'RIMAC', 'SAN BORJA', 
  'SAN JUAN DE LURIGANCHO', 'SAN MIGUEL', 'SANTA ANITA', 'SATIPO', 'SURCO', 
  'SURQUILLO', 'TRENEMAN', 'TRUJILLO', 'VICTORIA', 'VICTORIA BIRMINGHAM'
];
const leerPlantasFaregas = () => {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem('faregasPlantasDisponibles') || '[]');
    if (Array.isArray(parsed)) {
      return parsed.filter((p: any) => p && typeof p === 'object' && p.nombre && SEDES_VALIDAS_FAREGAS.some(sede => p.nombre.toUpperCase().includes(sede))) as PlantaAsignada[];
    }
    return [];
  } catch {
    return [];
  }
};

const leerUsuarioFaregas = (): FaregasUserSession | null => {
  try {
    return JSON.parse(sessionStorage.getItem('faregasUser') || 'null') as FaregasUserSession | null;
  } catch {
    return null;
  }
};

export default function App() {
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(true);

  const [usernameContext, setUsernameContext] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [user, setUser] = useState<UserSession | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [planta, setPlanta] = useState<PlantaAsignada | null>(null);
  const [plantasDisponibles, setPlantasDisponibles] = useState<PlantaAsignada[]>([]);
  const [faregasPreToken, setFaregasPreToken] = useState<string>('');
  const [faregasAccessToken, setFaregasAccessToken] = useState<string>('');
  const [faregasPlantasDisponibles, setFaregasPlantasDisponibles] = useState<PlantaAsignada[]>([]);
  const [faregasUser, setFaregasUser] = useState<FaregasUserSession | null>(null);
  const [faregasPlanta, setFaregasPlanta] = useState<PlantaAsignada | null>(null);
  
  const { empresasDisponibles, establecerEmpresasDisponibles, limpiarEmpresa, empresaSeleccionada } = useEmpresa();

  const isFaregas = empresaSeleccionada?.nombre?.toUpperCase().includes('FAREGAS');

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const { key, activo, nombre } = (event as CustomEvent<PlantaUpdateDetail>).detail;
      setFaregasPlantasDisponibles(prev => {
        let next: PlantaAsignada[] = prev.length > 0 ? [...prev] : leerPlantasFaregas();
        if (!activo) {
          next = next.filter((planta) => planta.key !== key);
        } else {
          if (!next.find((planta) => planta.key === key)) {
            next.push({ key, nombre });
            next.sort((a, b) => a.nombre.localeCompare(b.nombre));
          }
        }
        sessionStorage.setItem('faregasPlantasDisponibles', JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener('updatePlantasDisponibles', handleUpdate);
    return () => window.removeEventListener('updatePlantasDisponibles', handleUpdate);
  }, []);
  const limpiarSesionFrontend = useCallback(() => {
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
  }, [limpiarEmpresa, navigate]);

  useEffect(() => {
    const restaurarSesion = async () => {
      const fToken = sessionStorage.getItem('faregasAccessToken');
      if(fToken) {
        setFaregasAccessToken(fToken);
        setFaregasUser(JSON.parse(sessionStorage.getItem('faregasUser') || 'null'));
        setFaregasPlanta(JSON.parse(sessionStorage.getItem('faregasPlanta') || 'null'));
      }
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
  }, [limpiarSesionFrontend]);

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
    empresas: EmpresaAsignada[] = [],
    isAutoRedirect: boolean = false
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
    setTimeout(() => {
      navigate(esSedeFaregas ? '/faregas/inicio' : '/inicio', { replace: isAutoRedirect });
    }, 0);
  };

  
  const ejecutarLoginEmpresa = async (empresa: EmpresaAsignada, usernameArg?: string, passwordArg?: string, isAutoRedirect: boolean = false) => {
    const userToUse = usernameArg || usernameContext;
    const passToUse = passwordArg || pendingPassword;
    
    const esFaregas = empresa.nombre.toUpperCase().includes('FAREGAS');
    if (esFaregas) {
      try {
        const resp = await authFaregasApi.loginAsync(userToUse, passToUse);
        
        setFaregasPreToken(resp.preToken);
        sessionStorage.setItem('faregasPreToken', resp.preToken);
        
        const SEDES_VALIDAS_FAREGAS = [
          'AREQUIPA', 'ATE', 'CAMACHO', 'CHORRILLOS', 'CHORRILLOS MAKALU', 'COLINA', 
          'COLINA MAKALU', 'DERBY', 'FAUCETT', 'ICA', 'INDEPENDENCIA', 'JESUS MARIA', 
          'JICAMARCA', 'MOLINA', 'OLGUIN', 'PIURA', 'PLANTA 1', 'RIMAC', 'SAN BORJA', 
          'SAN JUAN DE LURIGANCHO', 'SAN MIGUEL', 'SANTA ANITA', 'SATIPO', 'SURCO', 
          'SURQUILLO', 'TRENEMAN', 'TRUJILLO', 'VICTORIA', 'VICTORIA BIRMINGHAM'
        ];
        const plantasFaregasBruto = resp.plantas || [];
        const plantasFaregas = plantasFaregasBruto.filter((p: any) => 
          SEDES_VALIDAS_FAREGAS.some(sede => p.nombre.toUpperCase().includes(sede))
        );
        setFaregasPlantasDisponibles(plantasFaregas);
        sessionStorage.setItem('faregasPlantasDisponibles', JSON.stringify(plantasFaregas));
        
        if (resp.user) {
          setFaregasUser(resp.user);
          sessionStorage.setItem('faregasUser', JSON.stringify(resp.user));
        }
        
        setPendingPassword('');
        setTimeout(() => {
          navigate('/faregas/seleccionar-planta', { replace: isAutoRedirect });
        }, 0);
        return;
      } catch (e: unknown) {
        setPendingPassword('');
        throw e;
      }
    }
    
    // ES FARENET -> Ejecutar Login original!
    try {
      const resp = await authApi.loginAsync(userToUse, passToUse);
      
      setPendingPassword('');
      
      const plantasReales = resp.plantas || [];
      const permisosLocales = resp.permisos || [];
      const empresasLocales = resp.empresas || [];
      
      if (resp.requiereSeleccionarPlanta) {
        handleRequirePlanta(
          userToUse,
          plantasReales,
          resp.user,
          permisosLocales,
          isAutoRedirect
        );
        return;
      }

      if (resp.accessToken && resp.user) {
        handleLoginSuccess(
          resp.accessToken,
          resp.user,
          permisosLocales,
          resp.plantaSeleccionada,
          plantasReales,
          empresasLocales,
          isAutoRedirect
        );
        return;
      }
      
      throw new Error('No se recibió una sesión válida desde el servidor.');
    } catch (e: unknown) {
       setPendingPassword('');
       throw e;
    }
  };
  const handleRequireEmpresa = async (
    username: string,
    plantas: PlantaAsignada[],
    empresas: EmpresaAsignada[],
    userData?: UserSession,
    userPermisos: string[] = [],
    password?: string
  ) => {
    setUsernameContext(username);
    setPlantasDisponibles(plantas);
    setPermisos(userPermisos);

    if (password) {
      setPendingPassword(password);
    }

    if (userData) {
      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));
    }
    sessionStorage.setItem('plantasDisponibles', JSON.stringify(plantas));
    permisosSession.guardar(userPermisos);
    
    establecerEmpresasDisponibles(empresas);
    
    if (empresas.length === 1 && password) {
      await ejecutarLoginEmpresa(empresas[0], username, password, true);
    } else {
      setTimeout(() => navigate('/seleccionar-empresa'), 0);
    }
  };

  const handleRequirePlanta = (
    username: string,
    plantas: PlantaAsignada[],
    userData?: UserSession,
    userPermisos: string[] = [],
    isAutoRedirect: boolean = false
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
    setTimeout(() => {
      const actualIsFaregas = JSON.parse(sessionStorage.getItem('empresaSeleccionada') || '{}')?.nombre?.toUpperCase().includes('FAREGAS');
      navigate(actualIsFaregas ? '/faregas/seleccionar-planta' : '/seleccionar-planta', { replace: isAutoRedirect });
    }, 0);
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
    
    setTimeout(() => {
      const actualIsFaregas = JSON.parse(sessionStorage.getItem('empresaSeleccionada') || '{}')?.nombre?.toUpperCase().includes('FAREGAS');
      navigate(actualIsFaregas ? '/faregas/inicio' : '/inicio');
    }, 0);
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

  const handleCambiarPlantaFaregas = async (plantaKey: string) => {
    const token = faregasAccessToken || sessionStorage.getItem('faregasAccessToken');
    if (!token) throw new Error('No hay sesión activa en FAREGAS.');

    const resp = await authFaregasApi.cambiarPlantaAsync(plantaKey, token);
    
    setFaregasAccessToken(resp.accessToken);
    sessionStorage.setItem('faregasAccessToken', resp.accessToken);
    
    setFaregasPlanta(resp.plantaSeleccionada);
    sessionStorage.setItem('faregasPlanta', JSON.stringify(resp.plantaSeleccionada));
    
    setFaregasUser(resp.user);
    sessionStorage.setItem('faregasUser', JSON.stringify(resp.user));
    
    setTimeout(() => {
      navigate('/faregas/inicio');
    }, 0);
  };

  const handleLogoutFaregas = () => {
    sessionStorage.removeItem('faregasAccessToken');
    sessionStorage.removeItem('faregasUser');
    sessionStorage.removeItem('faregasPlanta');
    sessionStorage.removeItem('faregasPreToken');
    setFaregasAccessToken('');
    setFaregasUser(null);
    setFaregasPlanta(null);
    setFaregasPreToken('');
    setFaregasPlantasDisponibles([]);
    navigate('/login', { replace: true });
  };

  const handleLogout = async () => {
    setPendingPassword('');
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
              onRequireEmpresa={handleRequireEmpresa}
            />
          )
        }
      />
      
      <Route 
        path="/seleccionar-empresa" 
        element={
          !(isAuthenticated || empresasDisponibles.length > 0) ? (
            <Navigate to="/login" replace />
          ) : (
            <SeleccionEmpresaView 
              onLogout={handleLogout} 
              onSelect={async (empresa) => {
                await ejecutarLoginEmpresa(empresa);
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
          <Routes>
            <Route 
              path="seleccionar-planta" 
              element={
                (!faregasPreToken && !sessionStorage.getItem('faregasPreToken')) ? (
                  <Navigate to="/login" replace />
                ) : (
                  <FaregasSeleccionPlantaView
                    plantas={faregasPlantasDisponibles.length > 0 ? faregasPlantasDisponibles : leerPlantasFaregas()}
                    onConfirmPlanta={async (plantaKey) => {
                      const token = faregasPreToken || sessionStorage.getItem('faregasPreToken') || '';
                      const resp = await authFaregasApi.confirmarPlantaAsync(plantaKey, token);
                      
                      setFaregasAccessToken(resp.accessToken);
                      sessionStorage.setItem('faregasAccessToken', resp.accessToken);
                      
                      setFaregasUser(resp.user);
                      sessionStorage.setItem('faregasUser', JSON.stringify(resp.user));
                      
                      setFaregasPlanta(resp.plantaSeleccionada);
                      sessionStorage.setItem('faregasPlanta', JSON.stringify(resp.plantaSeleccionada));
                      
                      navigate('/faregas/inicio');
                      
                      setTimeout(() => {
                        setFaregasPreToken('');
                        sessionStorage.removeItem('faregasPreToken');
                      }, 100);
                    }}
                    onCancel={handleLogoutFaregas}
                  />
                )
              } 
            />
            <Route
              element={
                (!faregasAccessToken && !sessionStorage.getItem('faregasAccessToken')) ? (
                  <Navigate to="/login" replace />
                ) : (
                  <FaregasMainLayout
                    user={faregasUser || leerUsuarioFaregas()}
                    permisos={(faregasUser || leerUsuarioFaregas())?.permisos || []}
                    plantaSeleccionada={faregasPlanta || JSON.parse(sessionStorage.getItem('faregasPlanta') || 'null')}
                    plantasDisponibles={faregasPlantasDisponibles.length > 0 ? faregasPlantasDisponibles : leerPlantasFaregas()}
                    onCambiarPlanta={handleCambiarPlantaFaregas}
                    onLogout={handleLogoutFaregas}
                  />
                )
              }
            >
              <Route path="inicio" element={<FaregasInicioView />} />
              <Route path="certificados/nuevo" element={<FaregasNuevoCertificadoView />} />
              <Route path="certificados/:id/continuar" element={<FaregasNuevoCertificadoView />} />
              <Route 
                path="usuarios" 
                element={
                  (() => {
                    const fUser = faregasUser || JSON.parse(sessionStorage.getItem('faregasUser') || '{}');
                    const userPerms = fUser?.permisos || [];
                    return userPerms.includes('MENU_USUARIOS') ? (
                      <FaregasUsuariosView />
                    ) : (
                      <ForbiddenView />
                    );
                  })()
                } 
              />
              <Route 
                path="auditoria" 
                element={
                  (() => {
                    const fUser = faregasUser || JSON.parse(sessionStorage.getItem('faregasUser') || '{}');
                    const userPerms = fUser?.permisos || [];
                    return userPerms.includes('MENU_AUDITORIA') ? (
                      <FaregasAuditoriaView />
                    ) : (
                      <ForbiddenView />
                    );
                  })()
                } 
              />
              <Route 
                path="descuentos" 
                element={
                  (() => {
                    const fUser = faregasUser || JSON.parse(sessionStorage.getItem('faregasUser') || '{}');
                    const userPerms = fUser?.permisos || [];
                    const pId = String(fUser?.perfilId || fUser?.perfil_id || '').toLowerCase();
                    return userPerms.includes('MENU_DESCUENTOS') || pId === 'sistemas' ? (
                      <FaregasDescuentosView />
                    ) : (
                      <ForbiddenView />
                    );
                  })()
                } 
              />
              <Route path="configuracion" element={<FaregasConfiguracionView />} />
              <Route
                path="chips"
                element={
                  (() => {
                    const fUser = faregasUser || JSON.parse(sessionStorage.getItem('faregasUser') || '{}');
                    const userPerms = fUser?.permisos || [];
                    return userPerms.includes('MENU_CHIPS') || userPerms.includes('CHIPS_VER') ? (
                      <FaregasChipsView />
                    ) : (
                      <ForbiddenView />
                    );
                  })()
                }
              />
              <Route path="*" element={<NotFoundView />} />
            </Route>
          </Routes>
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
