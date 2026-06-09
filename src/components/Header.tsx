import { useState, useRef, useEffect } from 'react';
import type {
  PlantaAsignada,
  UserSession
} from '../types/auth';

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

  const userName =
  user?.username ??
  'OPERADOR';

  const userInitial =
    userName.trim()[0]?.toUpperCase() ??
    'U';

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

  const handleChangePlanta = async (
    nuevaPlanta: string
  ) => {

    if (
      !nuevaPlanta ||
      nuevaPlanta === plantaSeleccionada
    ) {
      return;
    }

    try {

      setChangingPlanta(true);

      await onCambiarPlanta(
        nuevaPlanta
      );

    } catch (error) {

      console.error(
        'Error cambiando sede:',
        error
      );

    } finally {

      setChangingPlanta(false);

    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-[#0033a0] text-white shadow-md">
      <div className="flex items-center justify-between px-6 py-3.5">

        {/* IZQUIERDA */}
        <div className="flex items-center gap-4">

          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 text-white hover:bg-white/10 transition"
          >
            ☰
          </button>

          <div className="leading-tight">
            <div className="text-lg font-black tracking-wide text-[#f2cc11] uppercase">
              {plantaName || 'SIN SEDE'}
            </div>

            <div className="text-xs font-light text-slate-200 tracking-wider">
              {pageTitle}
            </div>
          </div>

        </div>

        {/* DERECHA */}
        <div
          className="relative"
          ref={dropdownRef}
        >

          <button
            type="button"
            onClick={() =>
              setDropdownOpen((p) => !p)
            }
            className="flex items-center gap-3 text-white"
          >

            <span
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-extrabold border border-white/20"
              style={{
                color: '#f2cc11'
              }}
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

              </div>

              {/* HU006 */}
              <div className="mb-3">

                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Sede Operativa
                </label>

                <select
                  disabled={
                    changingPlanta
                  }
                  value={
                    plantaSeleccionada
                  }
                  onChange={(e) =>
                    handleChangePlanta(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
                >

                  {plantasDisponibles.map(
                    (planta) => (
                      <option
                        key={planta.key}
                        value={planta.key}
                      >
                        {planta.nombre}
                      </option>
                    )
                  )}

                </select>

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
    </header>
  );
}
