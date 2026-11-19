import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ForbiddenView } from '@/core/views/ForbiddenView';
import TabSedes from './TabSedes';
import TabCatalogo from './components/TabCatalogo';
import TabTarifas from './components/TabTarifas';
import TabEmpresas from './components/TabEmpresas';
import TabCorrelativos from './components/TabCorrelativos';
import {
  resolverPermisosConfiguracionFaregas,
  type ConfiguracionTabId,
} from '../../utils/configuracion-permisos';

// La administración principal de series vive en Facturación electrónica.
// Esta vista conserva los correlativos cuando el usuario tiene CONFIGURACION_SERIES
// o MENU_FACTURACION_SERIES, permisos que también valida el backend.
export function FaregasConfiguracionView() {
  const [searchParams] = useSearchParams();
  
  let fUser: { permisos?: string[] } = {};
  try {
    const stored = sessionStorage.getItem('faregasUser');
    if (stored && stored !== 'undefined') fUser = JSON.parse(stored);
  } catch {
    fUser = {};
  }

  const permisos = fUser?.permisos || [];
  const {
    hasSedes,
    hasServicios,
    hasCategorias,
    hasProductos,
    hasTarifas,
    hasCorrelativos,
    hasEmpresas,
    hasCatalogo,
    tabs,
  } = resolverPermisosConfiguracionFaregas(permisos);

  const tabFromQuery = searchParams.get('tab')?.toUpperCase() as ConfiguracionTabId | undefined;
  const initialTab = (tabFromQuery && tabs.some((tab) => tab.id === tabFromQuery))
    ? tabFromQuery
    : (tabs[0]?.id ?? null);

  const [activeTab, setActiveTab] = useState<ConfiguracionTabId | null>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab')?.toUpperCase() as ConfiguracionTabId | undefined;
    if (tabParam && tabs.some((tab) => tab.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams, tabs]);

  if (tabs.length === 0) {
    return <ForbiddenView />;
  }

  const tabVisible = tabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : tabs[0]?.id;

  return (
    <div className="space-y-4">
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Configuración</h1>
          <p className="text-sm text-gray-500">
              Administración general de sedes, catálogo de servicios, tarifas y configuraciones base.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-6">
          <div className="flex border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${
                  tabVisible === tab.id
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {!tabVisible && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                Tu perfil no tiene submódulos de Configuración autorizados. Solicita que revisen sus permisos efectivos.
              </div>
            )}
            {tabVisible === 'SEDES' && hasSedes && <TabSedes />}
            {tabVisible === 'CATALOGO' && hasCatalogo && (
              <TabCatalogo
                hasCategorias={hasCategorias}
                hasServicios={hasServicios}
                hasProductos={hasProductos}
                hasTarifas={hasTarifas}
                onGoToTarifas={() => setActiveTab('TARIFAS')}
              />
            )}
            {tabVisible === 'TARIFAS' && hasTarifas && <TabTarifas />}
            {tabVisible === 'CORRELATIVOS' && hasCorrelativos && <TabCorrelativos />}
            {tabVisible === 'EMPRESAS' && hasEmpresas && <TabEmpresas />}
          </div>
        </div>
      </div>
    </div>
  );
}
