import type { ReactNode } from 'react';

interface MenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  permisos?: string[];
}

interface SidebarProps {
  collapsed: boolean;
  activeMenu: string;
  permisos: string[];
  onTabChange: (tab: string) => void;
  onMouseEnterSidebar: () => void;
  onMouseLeaveSidebar: () => void;
}

const menuItems: MenuItem[] = [
  {
    key: 'inicio',
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
    key: 'inspecciones',
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
    key: 'personas',
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
    key: 'vehiculos',
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
    key: 'caja',
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
    key: 'correlativos',
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
    key: 'recibos',
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
    key: 'usuarios',
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
    key: 'empresas',
    label: 'EMPRESAS',
    permisos: ['EDITAR_MAESTRO'],
    icon: (
      <svg className="h-6 w-6 text-current" viewBox="0 0 24 24" fill="none">
        <path d="M3 21h18M3 7h18M9 21V7m6 14V7M3 14h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'descuentos',
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
];

export function Sidebar({
  collapsed,
  activeMenu,
  permisos,
  onTabChange,
  onMouseEnterSidebar,
  onMouseLeaveSidebar
}: SidebarProps) {
  const menuVisible = menuItems.filter((item) => {
    const permisosRequeridos = item.permisos || [];

    if (permisosRequeridos.length === 0) {
      return true;
    }

    return permisosRequeridos.some((permiso) =>
      permisos.includes(permiso)
    );
  });

  return (
    <aside
      onMouseEnter={onMouseEnterSidebar}
      onMouseLeave={onMouseLeaveSidebar}
      className="
        relative
        bg-[#052a79]
        flex
        h-screen
        flex-col
        transition-[width,padding]
        duration-300
        ease-in-out
        shadow-2xl
        border-r
        border-blue-900
        z-40
      "
      style={{
        width: collapsed ? '90px' : '290px',
        padding: collapsed ? '0 8px' : '0 20px'
      }}
    >
      <div className="flex items-center justify-center px-5 pt-6 pb-4 border-b border-blue-800/50">
        <div
          className="flex w-full items-center justify-center cursor-pointer"
          onClick={() => onTabChange('inicio')}
        >
          {collapsed ? (
            <div
              className="
                h-12
                w-12
                bg-gradient-to-br
                from-[#f2cc11]
                to-yellow-300
                rounded-2xl
                flex
                items-center
                justify-center
                font-black
                text-[#052a79]
                text-xl
                shadow-lg
                select-none
              "
            >
              F
            </div>
          ) : (
            <div className="text-center select-none">
              <h1 className="text-3xl font-black tracking-tight text-[#f2cc11] font-serif drop-shadow-md">
                FARENET
              </h1>
              <p className="text-[10px] tracking-[0.35em] text-blue-100 font-semibold mt-1">
                SISTEMA
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-visible px-1 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <nav>
          <ul className="flex flex-col gap-1.5">
            {menuVisible.map((item) => {
              const isActive = activeMenu === item.key;

              return (
                <li
                  key={item.key}
                  className="relative group"
                >
                  <button
                    type="button"
                    onClick={() => onTabChange(item.key)}
                    title={collapsed ? item.label : undefined}
                    className={`relative w-full flex items-center rounded-xl text-sm font-bold transition-all duration-200 ${
                      collapsed
                        ? 'justify-center px-0 py-3'
                        : 'justify-start gap-4 px-4 py-3'
                    } ${
                      isActive
                        ? 'bg-gradient-to-r from-[#f2cc11] to-yellow-300 text-[#052a79] shadow-lg scale-[1.02]'
                        : 'text-slate-100 hover:bg-blue-800/60 hover:translate-x-1'
                    }`}
                  >
                    {isActive && !collapsed && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#052a79]" />
                    )}

                    <span
                      className={`shrink-0 transition-colors duration-200 ${
                        isActive ? 'text-[#052a79]' : 'text-slate-300'
                      }`}
                    >
                      {item.icon}
                    </span>

                    {!collapsed && (
                      <span className="truncate uppercase tracking-wide text-xs">
                        {item.label}
                      </span>
                    )}
                  </button>

                  {collapsed && (
                    <div
                      className="
                        pointer-events-none
                        absolute
                        left-[calc(100%+12px)]
                        top-1/2
                        -translate-y-1/2
                        px-3
                        py-2
                        rounded-lg
                        bg-slate-900
                        text-white
                        text-xs
                        font-semibold
                        whitespace-nowrap
                        opacity-0
                        invisible
                        group-hover:opacity-100
                        group-hover:visible
                        group-hover:translate-x-1
                        transition-all
                        duration-200
                        shadow-xl
                        z-[999]
                      "
                    >
                      {item.label}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {!collapsed && (
        <div className="border-t border-blue-800/50 py-4 px-2">
          <div className="rounded-2xl bg-blue-950/40 border border-blue-800/60 p-3">
            <p className="text-[10px] uppercase tracking-wide text-blue-100 font-bold">
              Menú dinámico
            </p>
            <p className="text-[11px] text-blue-100/80 mt-1 leading-relaxed">
              Las opciones visibles dependen de los permisos del perfil activo.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}