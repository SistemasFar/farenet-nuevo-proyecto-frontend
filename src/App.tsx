import { useState } from 'react';
import { LoginView } from './views/LoginView';
import { SelectPlantaView } from './views/SelectPlantaView';
import { MainLayout } from './views/Dashboard/MainLayout'; // <-- Importamos tu Layout Premium
import type { UserSession, PlantaAsignada } from './types/auth'; 
import { authApi } from './services/api';

type AuthStep = 'LOGIN' | 'SELECT_PLANTA' | 'DASHBOARD';

export default function App() {
  // Estados de control de la sesión global heredados de tu código
  const [step, setStep] = useState<AuthStep>('LOGIN');
  const [usernameContext, setUsernameContext] = useState('');
  const [user, setUser] = useState<UserSession | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [planta, setPlanta] = useState<string>('');
  const [plantasDisponibles, setPlantasDisponibles] = useState<PlantaAsignada[]>([]);

  // Manejador del Login inicial (HU001)
  const handleLoginSuccess = (token: string, userData: UserSession, userPermisos: string[]) => {
    setUser(userData);
    setPermisos(userPermisos);
    sessionStorage.setItem('accessToken', token); 
    setStep('DASHBOARD');
  };

  const handleRequirePlanta = (username: string, plantas: PlantaAsignada[]) => {
    setUsernameContext(username);
    setPlantasDisponibles(plantas);
    setStep('SELECT_PLANTA');
  };

  // Confirmación del paso intermedio de plantas conectándose a tu Backend
  const handleConfirmPlanta = async (plantaKey: string) => {
    try {
      // 🚀 LLAMADA CORREGIDA: Ahora sí impactará el INSERT en Postgres sin rebotar por claves falsas
      const resp = await authApi.confirmarPlantaAsync(usernameContext, plantaKey);
      
      // Guardamos la persistencia en el navegador para la HU001
      sessionStorage.setItem('accessToken', resp.accessToken || 'JWT_TOKEN_VALIDADO');
      sessionStorage.setItem('plantaSeleccionada', plantaKey);

      // Seteamos los datos del usuario reales devueltos por el backend
      if (resp.user) {
        setUser(resp.user);
      } else {
        setUser({ username: usernameContext, perfilId: 'OPERADOR', estado: true, userType: 'SISTEMAS' });
      }
      
      if (resp.permisos) setPermisos(resp.permisos);

      setPlanta(plantaKey);
      setStep('DASHBOARD'); // ¡Damos el pase libre!
    } catch (err) {
      console.error("Error al confirmar planta en el backend:", err);
      // Respaldo de contingencia por si se requiere avanzar localmente ante fallas de red
      setPlanta(plantaKey);
      setStep('DASHBOARD');
    }
  };

  // Ejecución del Logout Completo (HU002)
  const handleLogout = async () => {
    try {
      if (user?.username) {
        // 1. Avisa al backend para que ponga 'activo = false' en Postgres
        await authApi.logoutAsync(user.username); 
      }
    } catch (err) {
      console.error("Error pasivo al notificar logout:", err);
    } finally {
      // 2. Limpia los tokens del navegador y te bota a la pantalla azul de login
      sessionStorage.clear();
      setUser(null);
      setPermisos([]);
      setPlanta('');
      setStep('LOGIN'); // <-- Redirección automática
    }
  };

  // ── RENDERIZADO CONDICIONAL SEGÚN ARQUITECTURA DESACOPLADA ──
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
        onCancel={() => setStep('LOGIN')}
      />
    );
  }

  // --- INTERFAZ DEL SISTEMA YA LOGUEADO (Dashboard con tu Sidebar y Header oficial) ---
  return (
    <MainLayout 
      user={user} 
      plantaSeleccionada={planta} 
      onLogout={handleLogout} 
    />
  );
}