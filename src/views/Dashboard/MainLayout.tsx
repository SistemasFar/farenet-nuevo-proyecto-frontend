import { useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header'; // <-- Ruta corregida con precisión quirúrgica
import { InicioView } from './InicioView';
import { GenericView } from './GenericView';

interface MainLayoutProps {
  user: any;
  plantaSeleccionada: string;
  onLogout: () => void;
}

export function MainLayout({ user, plantaSeleccionada, onLogout }: MainLayoutProps) {
  const [activeTab, setActiveTab] = useState('inicio');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Manejadores de colapso manual y hover inteligente
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio':
        return <InicioView />;
      case 'inspecciones':
        return <GenericView title="Módulo de Inspecciones" description="Gestión y registro de inspecciones técnicas vehiculares." />;
      case 'personas':
        return <GenericView title="Control de Personas" description="Administración de clientes, inspectores y personal autorizado." />;
      case 'vehiculos':
        return <GenericView title="Registro de Vehículos" description="Búsqueda e historial de características vehiculares por placa." />;
      case 'caja':
        return <GenericView title="Módulo de Caja" description="Control de cobros, cierres de caja diaria y transacciones." />;
      case 'correlativos':
        return <GenericView title="Gestión de Correlativos" description="Mantenimiento de numeración y series de comprobantes." />;
      case 'recibos':
        return <GenericView title="Historial de Recibos" description="Búsqueda, visualización e impresión de recibos emitidos." />;
      case 'usuarios':
        return <GenericView title="Control de Usuarios" description="Administración de cuentas, perfiles y asignaciones de planta (RBAC)." />;
      case 'empresas':
        return <GenericView title="Catálogo de Empresas" description="Mantenimiento de convenios corporativos y entidades asociadas." />;
      case 'descuentos':
        return <GenericView title="Reglas de Descuentos" description="Configuración de campañas, promociones y tarifas especiales." />;
      default:
        return <InicioView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans antialiased overflow-hidden">
      {/* 1. Sidebar Corporativo Dinámico */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        activeMenu={activeTab} 
        onTabChange={setActiveTab}
        onMouseEnterSidebar={() => {}} // Reservado para interacciones hover adicionales
        onMouseLeaveSidebar={() => {}} 
      />

      {/* Contenedor del Cuerpo de Trabajo */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* 2. Header Superior con Dropdown Avanzado */}
        <Header 
          user={user} 
          plantaName={plantaSeleccionada} 
          activeTab={activeTab} 
          onToggleSidebar={toggleSidebar} 
          onLogout={onLogout} 
        />

        {/* 3. Área de Trabajo Variable */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {renderContent()}
        </main>
        
      </div>
    </div>
  );
}