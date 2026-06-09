import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { InicioView } from './InicioView';
import { GenericView } from './GenericView';
import type {
  UserSession,
  PlantaAsignada
} from '../../types/auth';

interface MainLayoutProps {
  user: UserSession | null;
  permisos: string[];
  plantaSeleccionada: PlantaAsignada | null;
  plantasDisponibles: PlantaAsignada[];
  onCambiarPlanta: (plantaKey: string) => Promise<void> | void;
  onLogout: () => void;
}

const TAB_PERMISOS: Record<string, string[]> = {
  inicio: [],
  inspecciones: ['LISTA_INSPECCION', 'VER_INSPECCION', 'CREAR_INSPECCION'],
  personas: ['EDITAR_PERSONA'],
  vehiculos: ['EDITAR_VEHICULO'],
  caja: ['CAJA_OPERAR'],
  correlativos: ['EDITAR_MAESTRO'],
  recibos: ['WEB_REPORTE_SUNAT'],
  usuarios: ['EDITAR_MAESTRO'],
  empresas: ['EDITAR_MAESTRO'],
  descuentos: ['EDITAR_MAESTRO']
};

const tieneAlguno = (
  permisosUsuario: string[],
  permisosRequeridos: string[]
) => {
  if (permisosRequeridos.length === 0) return true;

  return permisosRequeridos.some((permiso) =>
    permisosUsuario.includes(permiso)
  );
};

export function MainLayout({
  user,
  permisos,
  plantaSeleccionada,
  plantasDisponibles,
  onCambiarPlanta,
  onLogout
}: MainLayoutProps) {
  const [activeTab, setActiveTab] = useState('inicio');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const plantaNombre =
    plantaSeleccionada?.nombre ||
    'Sin sede';

  const plantaKey =
    plantaSeleccionada?.key ||
    '';

  const puedeVerTab = useMemo(() => {
    return (tab: string) => {
      const requeridos = TAB_PERMISOS[tab] || [];
      return tieneAlguno(permisos, requeridos);
    };
  }, [permisos]);

  useEffect(() => {
    if (!puedeVerTab(activeTab)) {
      setActiveTab('inicio');
    }
  }, [activeTab, puedeVerTab]);

  const renderContent = () => {
    if (!puedeVerTab(activeTab)) {
      return (
        <GenericView
          title="Acceso restringido"
          description="No tienes permisos para visualizar este módulo."
        />
      );
    }

    switch (activeTab) {
      case 'inicio':
        return (
          <InicioView
            plantaSeleccionada={plantaKey}
            plantaNombre={plantaNombre}
          />
        );

      case 'inspecciones':
        return (
          <GenericView
            title="Módulo de Inspecciones"
            description={`Gestión y registro de inspecciones técnicas vehiculares para la sede ${plantaNombre}.`}
          />
        );

      case 'personas':
        return (
          <GenericView
            title="Control de Personas"
            description={`Administración de clientes, inspectores y personal autorizado para la sede ${plantaNombre}.`}
          />
        );

      case 'vehiculos':
        return (
          <GenericView
            title="Registro de Vehículos"
            description={`Búsqueda e historial vehicular filtrado por la sede ${plantaNombre}.`}
          />
        );

      case 'caja':
        return (
          <GenericView
            title="Módulo de Caja"
            description={`Control de cobros, cierres de caja diaria y transacciones de la sede ${plantaNombre}.`}
          />
        );

      case 'correlativos':
        return (
          <GenericView
            title="Gestión de Correlativos"
            description={`Mantenimiento de numeración y series de comprobantes para la sede ${plantaNombre}.`}
          />
        );

      case 'recibos':
        return (
          <GenericView
            title="Historial de Recibos"
            description={`Búsqueda, visualización e impresión de recibos emitidos en la sede ${plantaNombre}.`}
          />
        );

      case 'usuarios':
        return (
          <GenericView
            title="Control de Usuarios"
            description="Administración de cuentas, perfiles y asignaciones de planta."
          />
        );

      case 'empresas':
        return (
          <GenericView
            title="Catálogo de Empresas"
            description="Mantenimiento de convenios corporativos y entidades asociadas."
          />
        );

      case 'descuentos':
        return (
          <GenericView
            title="Reglas de Descuentos"
            description="Configuración de campañas, promociones y tarifas especiales."
          />
        );

      default:
        return (
          <InicioView
            plantaSeleccionada={plantaKey}
            plantaNombre={plantaNombre}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans antialiased overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        activeMenu={activeTab}
        permisos={permisos}
        onTabChange={setActiveTab}
        onMouseEnterSidebar={() => {}}
        onMouseLeaveSidebar={() => {}}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          user={user}
          plantaName={plantaNombre}
          plantaSeleccionada={plantaKey}
          plantasDisponibles={plantasDisponibles}
          activeTab={activeTab}
          onCambiarPlanta={onCambiarPlanta}
          onToggleSidebar={toggleSidebar}
          onLogout={onLogout}
        />

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}