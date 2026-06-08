import { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  user: any;
  plantaName: string;
  activeTab: string;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

function routeToTitle(tabId: string): string {
  const map: Record<string, string> = {
    'inicio': 'Inicio',
    'inspecciones': 'Inspecciones',
    'personas': 'Personas',
    'vehiculos': 'Vehículos',
    'caja': 'Caja',
    'correlativos': 'Correlativos',
    'recibos': 'Recibos',
    'usuarios': 'Usuarios',
    'empresas': 'Empresas',
    'descuentos': 'Descuentos',
  };
  return map[tabId] ?? 'Panel';
}

export function Header({ user, plantaName, activeTab, onToggleSidebar, onLogout }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = routeToTitle(activeTab);
  const userName = user?.username || 'GRACE KELLY';
  const userInitial = userName.trim()[0]?.toUpperCase() ?? 'U';

  // Manejador del cierre de menú al hacer clic fuera del contenedor
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-[#0033a0] text-white shadow-md">
      <div className="flex items-center justify-between px-6 py-3.5">

        {/* Izquierda: Hamburguesa + Título Dinámico */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 text-white hover:bg-white/10 transition"
            aria-label="Toggle sidebar"
          >
            <svg className="fill-current" width="16" height="12" viewBox="0 0 16 12">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 1.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75 Clyde C. 8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z" />
            </svg>
          </button>

          <div className="leading-tight">
            <div className="text-lg font-black tracking-wide text-[#f2cc11] uppercase">
              {plantaName || 'INDEPENDENCIA'}
            </div>
            <div className="text-xs font-light text-slate-200 tracking-wider">
              {pageTitle}
            </div>
          </div>
        </div>

        {/* Derecha: Dropdown Avatar de Usuario */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((p) => !p)}
            className="flex items-center gap-3 text-white focus:outline-none"
          >
            <span
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-extrabold border border-white/20"
              style={{ color: '#f2cc11' }}
            >
              {userInitial}
            </span>
            <span className="text-sm font-bold tracking-wide hidden md:inline">{userName}</span>
            <svg
              className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              width="18" height="20" viewBox="0 0 18 20" fill="none"
            >
              <path d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
                    stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Menú Flotante del Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-60 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-2 border-b border-slate-100 mb-1.5">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Operador</span>
                <span className="block text-sm font-bold text-slate-800 truncate">{userName}</span>
              </div>

              <div className="px-3 py-1.5">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sede de Sesión</span>
                <span className="block text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 mt-1 uppercase font-mono">{plantaName}</span>
              </div>

              <div className="my-2 border-t border-slate-100" />

              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition px-4 py-2.5 text-xs font-bold"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 17l-1 0a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1M14 7l5 5-5 5M19 12H10" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}