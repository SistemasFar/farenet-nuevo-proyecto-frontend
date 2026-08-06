import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

import type {
  UserSession,
  PlantaAsignada
} from '@/types/auth';

interface MainLayoutProps {
  user: UserSession | null;
  permisos: string[];
  plantaSeleccionada: PlantaAsignada | null;
  plantasDisponibles: PlantaAsignada[];
  onCambiarPlanta: (plantaKey: string) => Promise<void> | void;
  onLogout: () => void;
}

export interface MainLayoutContext {
  user: UserSession | null;
  permisos: string[];
  plantaSeleccionada: PlantaAsignada | null;
  plantaKey: string;
  plantaNombre: string;
}

export function MainLayout({
  user,
  permisos,
  plantaSeleccionada,
  plantasDisponibles,
  onCambiarPlanta,
  onLogout
}: MainLayoutProps) {
  const location = useLocation();
  const path = location.pathname;

  const [sidebarPinned, setSidebarPinned] = useState(() => {
    return localStorage.getItem('sidebarPinned') === 'true';
  });
  const [sidebarHover, setSidebarHover] = useState(false);

  const sidebarCollapsed = !sidebarPinned && !sidebarHover;

  const toggleSidebar = () => {
    setSidebarPinned((prev) => {
      const nuevoValor = !prev;
      localStorage.setItem('sidebarPinned', String(nuevoValor));
      return nuevoValor;
    });
  };

  const plantaNombre = plantaSeleccionada?.nombre || 'Sin sede';
  const plantaKey = plantaSeleccionada?.key || '';

  let activeMenu = 'inicio';
  if (path.startsWith('/inspecciones') || path.startsWith('/linea')) activeMenu = 'inspecciones';
  else if (path.startsWith('/maestros/personas')) activeMenu = 'personas';
  else if (path.startsWith('/maestros/vehiculos')) activeMenu = 'vehiculos';
  else if (path.startsWith('/maestros/caja')) activeMenu = 'caja';
  else if (path.startsWith('/maestros/correlativos')) activeMenu = 'correlativos';
  else if (path.startsWith('/maestros/recibos')) activeMenu = 'recibos';
  else if (path.startsWith('/maestros/usuarios')) activeMenu = 'usuarios';
  else if (path.startsWith('/maestros/empresas')) activeMenu = 'empresas';
  else if (path.startsWith('/maestros/descuentos')) activeMenu = 'descuentos';
  else if (path.startsWith('/auditoria')) activeMenu = 'auditoria';

  const contextValue: MainLayoutContext = {
    user,
    permisos,
    plantaSeleccionada,
    plantaKey,
    plantaNombre
  };

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans antialiased overflow-hidden">
      <Sidebar
        isFaregas={true}
        collapsed={sidebarCollapsed}
        activeMenu={activeMenu}
        permisos={permisos}
        perfilId={user?.perfilId || ''}
        onMouseEnterSidebar={() => setSidebarHover(true)}
        onMouseLeaveSidebar={() => setSidebarHover(false)}
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          user={user}
          plantaName={plantaNombre}
          plantaSeleccionada={plantaKey}
          plantasDisponibles={plantasDisponibles}
          activeTab={activeMenu}
          onCambiarPlanta={onCambiarPlanta}
          onToggleSidebar={toggleSidebar}
          onLogout={onLogout}
        />

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 transition-all duration-300">
          <Outlet context={contextValue} />
        </main>
      </div>
    </div>
  );
}