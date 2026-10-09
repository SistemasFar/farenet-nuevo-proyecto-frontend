import { useState, useRef, useEffect } from 'react';
import type {
  PlantaAsignada,
  UserSession
} from '@/types/auth';
import { NetworkStatus } from './NetworkStatus';
import { BackendStatus } from './BackendStatus';
import { CambiarContrasenaModal } from './CambiarContrasenaModal';
import { useEmpresa } from '@/context/EmpresaContext';

interface HeaderProps {
  user: UserSession | null;
  plantaName: string;
  plantaSeleccionada: string;
  plantasDisponibles: PlantaAsignada[];
  activeTab: string;
  onCambiarPlanta: (plantaKey: string) => Promise<void> | void;
  onToggleSidebar: () => void;
  onLogout: () => void;
  isFaregas?: boolean;
}

interface FaregasUsuarioResumen {
  username: string;
  nombreRazonSocial?: string;
  nombres?: string;
  apellidos?: string;
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
    descuentos: 'Descuentos',
    auditoria: 'Auditoría',
    chips: 'Inventario',
    configuracion: 'Configuración',
    facturacion: 'Facturación'
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
  onLogout,
  isFaregas
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [changingPlanta, setChangingPlanta] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const { empresaSeleccionada } = useEmpresa();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const pageTitle = routeToTitle(activeTab);

  const [nombreOperador, setNombreOperador] = useState('');

  useEffect(() => {
    if (isFaregas && user?.username) {
      import('../modules/faregas/services/faregas-usuarios.api')
        .then(({ faregasUsuariosApi }) => faregasUsuariosApi.obtenerUsuarios())
        .then((usuarios: FaregasUsuarioResumen[]) => {
          const u = usuarios.find((x) => x.username === user.username);
          if (u) {
            if (u.nombreRazonSocial) {
              setNombreOperador(u.nombreRazonSocial);
            } else if (u.nombres || u.apellidos) {
              setNombreOperador(`${u.nombres || ''} ${u.apellidos || ''}`.trim());
            }
          }
        })
        .catch(console.error);
    }
  }, [isFaregas, user?.username]);

  const userName = String(nombreOperador || user?.nombreCompleto || user?.username || 'OPERADOR').toUpperCase();

  const userInitial = Array.from(userName.trim())[0]?.toUpperCase().slice(0, 1) || 'U';

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
      <div className="flex min-h-[64px] items-center justify-between gap-2 px-3 py-2.5 sm:px-4 md:gap-4 md:px-6 md:py-3.5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3 md:gap-4">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 text-white transition hover:bg-white/10 md:h-11 md:w-11"
            title="Abrir menú"
            aria-label="Abrir menú"
          >
            ☰
          </button>

          <div className="leading-tight min-w-0">
            <div className="mb-0.5 hidden text-[10px] font-bold capitalize tracking-widest text-slate-300 opacity-90 sm:block">
              {empresaSeleccionada ? `${empresaSeleccionada.nombre} [${empresaSeleccionada.key}]` : 'EMPRESA NO SELECCIONADA'}
            </div>
            <div className="truncate text-sm font-black tracking-wide text-gold-3d sm:text-base md:text-lg">
              <span className="hidden sm:inline">SEDE ACTIVA: </span>{plantaName || 'SIN SEDE'}
            </div>

            <div className="hidden truncate text-xs font-semibold tracking-wider text-gold-3d sm:block">
              Código de sede: {plantaSeleccionada || 'N/A'} · {pageTitle}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-3 sm:flex">
            <NetworkStatus />
            <BackendStatus />
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((p) => !p)}
              className="flex items-center gap-3 text-white"
            >
              <span
                className="bg-gold-3d flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-300 text-base font-black text-white"
                aria-label={`Inicial del operador: ${userInitial}`}
              >
                <span className="block w-[1ch] max-w-[1ch] overflow-hidden text-center leading-none text-white">
                  {userInitial.slice(0, 1)}
                </span>
              </span>

              <span className="text-sm font-bold tracking-wide hidden md:inline">
                {userName}
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 z-50 mt-3 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="px-3 py-2 border-b border-slate-100 mb-3">
                  <span className="block text-xs font-bold text-slate-400 capitalize">
                    Operador
                  </span>

                  <span className="block text-sm font-bold text-slate-800 break-words">
                    {userName}
                  </span>

                  {user?.perfilId && (
                    <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold capitalize text-blue-700">
                      {user.perfilId}
                    </span>
                  )}
                </div>

                <div className="mb-3">
                  <label className="block text-[11px] font-bold text-slate-500 capitalize mb-1">
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

                <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                  {!isFaregas && (
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        setPasswordModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition px-4 py-2.5 text-xs font-bold"
                    >
                      Cambiar Contraseña
                    </button>
                  )}
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

      <CambiarContrasenaModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        username={user?.username || ''}
      />
    </header>
  );
}
