import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface MenuItem {
  path: string;
  key: string;
  label: string;
  icon: ReactNode;
  permisos?: string[];
}

interface SidebarProps {
  collapsed: boolean;
  activeMenu: string;
  permisos: string[];
  perfilId: string; // ✨ 1. Agregamos el perfilId al contrato de props del Sidebar
  isFaregas?: boolean;

  onMouseEnterSidebar: () => void;
  onMouseLeaveSidebar: () => void;
}

const menuItems: MenuItem[] = [
  {
    key: 'inicio', path: '/inicio',
    label: 'INICIO',
    permisos: [],
    icon: (
      <svg className="h-6 w-6 text-current" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: 'inspecciones', path: '/inspecciones',
    label: 'INSPECCIONES',
    permisos: ['LISTA_INSPECCION', 'VER_INSPECCION', 'CREAR_INSPECCION'],
    icon: (
      <svg className="h-6 w-6 text-current" viewBox="0 0 24 24" fill="none">
        <path
          d="M9 5h6l1 2h3v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7h3l1-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 13l1.8 1.8L15.8 10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: 'personas', path: '/maestros/personas',
    label: 'PERSONAS',
    permisos: ['EDITAR_PERSONA'],
    icon: (
      <svg className="h-6 w-6 text-current" viewBox="0 0 24 24" fill="none">
        <path
          d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M4 21a8 8 0 0 1 16 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: 'vehiculos', path: '/maestros/vehiculos',
    label: 'VEHÍCULOS',
    permisos: ['EDITAR_VEHICULO'],
    icon: (
      <svg className="h-6 w-6 text-current" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 16l1.5-6A2 2 0 0 1 8.4 8h7.2a2 2 0 0 1 1.9 2L19 16"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M6 16h12v3a1 1 0 0 1-1 1h-1"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M6 20H5a1 1 0 0 1-1-1v-3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
          fill="currentColor"
        />
        <path
          d="M16 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    key: 'caja', path: '/maestros/caja',
    label: 'CAJA',
    permisos: ['CAJA_OPERAR'],
    icon: (
      <svg className="h-6 w-6 text-current" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M20 10h-5a2 2 0 0 0 0 4h5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M16 12h.01"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: 'correlativos', path: '/maestros/correlativos',
    label: 'CORRELATIVOS',
    permisos: ['EDITAR_MAESTRO'],
    icon: (
      <svg className="h-6 w-6 text-current" viewBox="0 0 24 24" fill="none">
        <path d="M10 4L8 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 4l-2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 9h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M3 15h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'recibos', path: '/maestros/recibos',
    label: 'RECIBOS',
    permisos: ['WEB_REPORTE_SUNAT'],
    icon: (
      <svg className="h-6 w-6 text-current" viewBox="0 0 24 24" fill="none">
        <path
          d="M7 3h10a2 2 0 0 1 2 2v16l-2-1-2 1-2-1-2 1-2-1-2 1V5a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'usuarios', path: '/maestros/usuarios',
    label: 'USUARIOS',
    permisos: ['EDITAR_MAESTRO'],
    icon: (
      <svg className="h-6 w-6 text-current" viewBox="0 0 24 24" fill="none">
        <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'empresas', path: '/maestros/empresas',
    label: 'EMPRESAS',
    permisos: ['EDITAR_MAESTRO'],
    icon: (
      <svg className="h-6 w-6 text-current" viewBox="0 0 24 24" fill="none">
        <path d="M3 21h18M3 7h18M9 21V7m6 14V7M3 14h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'descuentos', path: '/maestros/descuentos',
    label: 'DESCUENTOS',
    permisos: ['EDITAR_MAESTRO'],
    icon: (
      <svg className="h-6 w-6 text-current" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.3L12 14.3l-4.8 2.5.9-5.3L4.2 7.7l5.4-.8L12 2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
  key: 'auditoria', path: '/auditoria',
  label: 'AUDITORÍA',
  permisos: ['EDITAR_MAESTRO'],
  icon: (
    <svg className="h-6 w-6 text-current" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 4h14v16H5V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 8h8M8 12h8M8 16h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
},

  {
    key: 'chips', path: '/chips',
    label: 'CHIPS',
    permisos: ['MENU_CHIPS', 'CHIPS_VER'],
    icon: (
      <svg
        className="h-6 w-6 text-current"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="6"
          y="6"
          width="12"
          height="12"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <rect
          x="9"
          y="9"
          width="6"
          height="6"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    key: 'configuracion', path: '/configuracion',
    label: 'CONFIGURACIÓN',
    permisos: ['MENU_CONFIGURACION'],
    icon: (
      <svg className="h-6 w-6 text-current" viewBox="0 0 24 24" fill="none">
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function Sidebar({
  collapsed,
  activeMenu,
  permisos,
  perfilId, // ✨ 2. Desestructuramos la nueva prop recibida
  isFaregas,

  onMouseEnterSidebar,
  onMouseLeaveSidebar
}: SidebarProps) {
  
  // 🔐 ✨ AQUÍ SE LIBERA EL BLOQUEO ✨ 🔐
  let menuVisible = menuItems.filter((item) => {
    // Si estamos en Faregas, validamos contra los permisos reales del perfil
    if (isFaregas) {
      if (item.key === 'descuentos') {
        return permisos.includes('MENU_DESCUENTOS') || perfilId?.toLowerCase() === 'sistemas';
      }
      if (item.key === 'usuarios') {
        return permisos.includes('MENU_USUARIOS');
      }
      if (item.key === 'inicio') {
        return permisos.includes('MENU_INICIO');
      }
      if (item.key === 'auditoria') {
        return permisos.includes('MENU_AUDITORIA');
      }
      if (item.key === 'configuracion') {
        return permisos.includes('MENU_CONFIGURACION');
      }
      if (item.key === 'chips') {
        return permisos.includes('MENU_CHIPS') || permisos.includes('CHIPS_VER');
      }
      return false;
    }

    // Si el usuario es de 'sistemas', la regla estricta no aplica y ve TODO de frente.
    if (perfilId === 'sistemas') {
      return true;
    }

    const permisosRequeridos = item.permisos || [];

    if (permisosRequeridos.length === 0) {
      return true;
    }

    return permisosRequeridos.some((permiso) =>
      permisos.includes(permiso)
    );
  });

  // Reordenar dinámicamente si estamos en FAREGAS
  // Se requiere que AUDITORÍA esté inmediatamente debajo de USUARIOS
  if (isFaregas) {
    const sorted: MenuItem[] = [];
    menuVisible.forEach(item => {
      if (item.key !== 'auditoria') {
        sorted.push(item);
        if (item.key === 'usuarios') {
          const auditoriaItem = menuVisible.find(m => m.key === 'auditoria');
          if (auditoriaItem) sorted.push(auditoriaItem);
        }
      }
    });
    // In case 'usuarios' was not present but 'auditoria' was (edge case)
    if (menuVisible.some(m => m.key === 'auditoria') && !sorted.some(m => m.key === 'auditoria')) {
       const auditoriaItem = menuVisible.find(m => m.key === 'auditoria');
       if (auditoriaItem) sorted.push(auditoriaItem);
    }
    menuVisible = sorted;
  }

  return (
    <aside
      onMouseEnter={onMouseEnterSidebar}
      onMouseLeave={onMouseLeaveSidebar}
      className="bg-[#052a79] flex h-screen flex-col overflow-hidden transition-[width,padding] duration-300 ease-in-out shadow-xl border-r border-blue-900"
      style={{
        width: collapsed ? '90px' : '290px',
        padding: collapsed ? '0 8px' : '0 20px'
      }}
    >
      <div className="flex items-center justify-center px-5 pt-6 pb-4 border-b border-blue-800/50">
        <Link
          to={isFaregas ? '/faregas/inicio' : '/inicio'}
          className="flex w-full items-center justify-center cursor-pointer"
        >
          {collapsed ? (
            <div className="h-10 w-10 bg-gold-3d rounded-full flex items-center justify-center font-black text-white text-xl shadow-md select-none">
              {isFaregas ? 'FG' : 'F'}
            </div>
          ) : isFaregas ? (
            <div className="flex items-center justify-center select-none drop-shadow-md">
              <h1 className="text-[2.6rem] font-black tracking-[0.02em] text-gold-3d leading-none" style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}>FARE</h1>
              <div className="mx-1 mt-1">
                <svg width="25" height="35" viewBox="0 0 100 130" className="drop-shadow-md">
                  <path d="M 50,0 C 50,0 10,70 10,95 C 10,117 28,130 50,130 C 72,130 90,117 90,95 C 90,70 50,0 50,0 Z" fill="#25a5e3" />
                  <path d="M 52,40 C 52,40 75,75 75,100 C 75,115 65,125 50,125 C 60,110 50,90 48,70 C 47,60 52,40 52,40 Z" fill="#e6201b" />
                  <path d="M 54,65 C 54,65 67,85 67,105 C 67,115 60,120 52,120 C 58,110 52,95 50,85 C 49,80 54,65 54,65 Z" fill="#fbd304" />
                  <path d="M 20,95 C 20,80 35,45 45,25 C 35,45 25,75 25,95 C 25,105 32,115 40,120 C 30,115 20,105 20,95 Z" fill="#69c8f5" opacity="0.8" />
                </svg>
              </div>
              <h1 className="text-[2.6rem] font-black tracking-[0.02em] text-gold-3d leading-none" style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}>GAS</h1>
            </div>
          ) : (
            <h1 className="text-3xl font-black tracking-tight text-gold-3d font-serif select-none drop-shadow-md">
              FARENET
            </h1>
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <nav>
          <ul className="flex flex-col gap-1.5">
            {menuVisible.map((item) => {
              const isActive = activeMenu === item.key;
              const linkPath = isFaregas ? (item.key === 'usuarios' ? '/faregas/usuarios' : item.key === 'descuentos' ? '/faregas/descuentos' : `/faregas${item.path}`) : item.path;

              return (
                <li key={item.key}>
                  <Link to={linkPath}
                    
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-gold-3d text-white shadow-lg scale-[1.01]'
                        : 'text-slate-100 hover:bg-blue-800/60'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-300'}>
                      {item.icon}
                    </span>

                    {!collapsed && (
                      <span className="truncate uppercase tracking-wide text-xs">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
