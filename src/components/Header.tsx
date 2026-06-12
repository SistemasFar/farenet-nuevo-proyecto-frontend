import { useState, useRef, useEffect } from 'react';
import type {
  PlantaAsignada,
  UserSession
} from '../types/auth';
import { NetworkStatus } from './NetworkStatus';
import { BackendStatus } from './BackendStatus';

interface HeaderProps {
  user: UserSession | null;
  plantaName: string;
  plantaSeleccionada: string;
  plantasDisponibles: PlantaAsignada[];
  activeTab: string;
  onCambiarPlanta: (plantaKey: string) => Promise<void> | void;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

function routeToTitle(tabId: string): string {
  const map: Record<string, string> = {
    inicio: 'Inicio',
    inspecciones: 'Inspecciones',
    personas: 'Personas',
    vehiculos: 'Vehículos',
    caja: 'Caja',
    correlativos: 'Correlativos',
    recibos: 'Recibos',
    usuarios: 'Usuarios',
    empresas: 'Empresas',
    descuentos: 'Descuentos'
  };

  return map[tabId] ?? 'Panel';
}

function esPerfilSistemas(user: UserSession | null): boolean {
  const perfil = String(user?.perfilId || '').toLowerCase().trim();
  const userType = String(user?.userType || '').toLowerCase().trim();

  return (
    perfil === 'sistemas' ||
    perfil === 'administrador' ||
    userType === 'sistemas'
  );
}

export function Header({
  user,
  plantaName,
  plantaSeleccionada,
  plantasDisponibles,
  activeTab,
  onCambiarPlanta,
  onToggleSidebar,
  onLogout
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [changingPlanta, setChangingPlanta] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = routeToTitle(activeTab);

  const userName = user?.username ?? 'OPERADOR';

  const userInitial =
    userName.trim()[0]?.toUpperCase() ?? 'U';

  const mostrarBackendStatus = esPerfilSistemas(user);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handler);

    return () =>
      document.removeEventListener('mousedown', handler);
  }, []);

  const handleChangePlanta = async (nuevaPlanta: string) => {
    if (!nuevaPlanta || nuevaPlanta === plantaSeleccionada) return;

    try {
      setChangingPlanta(true);
      await onCambiarPlanta(nuevaPlanta);
    } catch (error) {
      console.error('Error cambiando sede:', error);
    } finally {
      setChangingPlanta(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-[#0033a0] text-white shadow-md">
      <div className="flex items-center justify-between gap-4 px-6 py-3.5">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 text-white hover:bg-white/10 transition"
            title="Expandir o fijar menú"
          >
            ☰
          </button>

          <div className="leading-tight min-w-0">
            <div className="text-lg font-black tracking-wide text-[#f2cc11] uppercase truncate">
              SEDE ACTIVA: {plantaName || 'SIN SEDE'}
            </div>

            <div className="text-xs font-semibold text-[#f2cc11] tracking-wider truncate">
              Código de sede: {plantaSeleccionada || 'N/A'} · {pageTitle}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <NetworkStatus />

            {mostrarBackendStatus && (
              <BackendStatus />
            )}
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((p) => !p)}
              className="flex items-center gap-3 text-white"
            >
              <span
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-extrabold border border-white/20"
                style={{ color: '#f2cc11' }}
              >
                {userInitial}
              </span>

              <span className="text-sm font-bold tracking-wide hidden md:inline">
                {userName}
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50">
                <div className="px-3 py-2 border-b border-slate-100 mb-3">
                  <span className="block text-xs font-bold text-slate-400 uppercase">
                    Operador
                  </span>

                  <span className="block text-sm font-bold text-slate-800 truncate">
                    {userName}
                  </span>

                  {user?.perfilId && (
                    <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase text-blue-700">
                      {user.perfilId}
                    </span>
                  )}
                </div>

                <div className="mb-3">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Sede Operativa
                  </label>

                  <select
                    disabled={changingPlanta}
                    value={plantaSeleccionada}
                    onChange={(e) => handleChangePlanta(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    {plantasDisponibles.map((planta) => (
                      <option key={planta.key} value={planta.key}>
                        {planta.nombre}
                      </option>
                    ))}
                  </select>

                  {changingPlanta && (
                    <p className="mt-2 text-[11px] font-semibold text-blue-600">
                      Cambiando sede...
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition px-4 py-2.5 text-xs font-bold"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}