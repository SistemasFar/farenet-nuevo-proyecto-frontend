import { useState } from 'react';
import TabSedes from './TabSedes';
import TabCatalogo from './components/TabCatalogo';
import TabTarifas from './components/TabTarifas';
import TabFacturacion from './components/TabFacturacion';
import TabEmpresas from './components/TabEmpresas';

type ConfigTab = 'SEDES' | 'CATALOGO' | 'TARIFAS' | 'FACTURACION' | 'EMPRESAS';

export function FaregasConfiguracionView() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('SEDES');
  
  
  let fUser: { permisos?: string[] } = {};
  try {
    const stored = sessionStorage.getItem('faregasUser');
    if (stored && stored !== 'undefined') fUser = JSON.parse(stored);
  } catch {
    fUser = {};
  }

  const permisos = fUser?.permisos || [];

  const hasSedes = permisos.includes('CONFIGURACION_SEDES');
  const hasServicios = permisos.includes('CONFIGURACION_SERVICIOS');
  const hasCategorias = permisos.includes('CONFIGURACION_CATEGORIAS');
  const hasProductos = permisos.includes('CONFIGURACION_PRODUCTOS');
  const hasTarifas = permisos.includes('CONFIGURACION_TARIFAS');
  const hasSeries = permisos.includes('CONFIGURACION_SERIES');
  // La relación empresa-sede forma parte de la administración de sedes.
  // El permiso específico permite separarla en perfiles futuros, mientras
  // CONFIGURACION_SEDES conserva acceso para las sesiones actuales.
  const hasEmpresas = permisos.includes('CONFIGURACION_EMPRESAS') || hasSedes;
  const hasCatalogo = hasCategorias || hasServicios || hasProductos;

  const tabs = [];
  if (hasSedes) tabs.push({ id: 'SEDES', label: 'SEDES' });
  if (hasCatalogo) tabs.push({ id: 'CATALOGO', label: 'CATÁLOGO' });
  if (hasTarifas) tabs.push({ id: 'TARIFAS', label: 'TARIFAS' });
  if (hasSeries) tabs.push({ id: 'FACTURACION', label: 'FACTURACIÓN' });
  if (hasEmpresas) tabs.push({ id: 'EMPRESAS', label: 'EMPRESAS' });
  const tabVisible = tabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : tabs[0].id as ConfigTab;

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
                onClick={() => setActiveTab(tab.id as ConfigTab)}
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
            {tabVisible === 'SEDES' && hasSedes && <TabSedes />}
            {tabVisible === 'CATALOGO' && hasCatalogo && (
              <TabCatalogo hasCategorias={hasCategorias} hasServicios={hasServicios} hasProductos={hasProductos} />
            )}
            {tabVisible === 'TARIFAS' && hasTarifas && <TabTarifas />}
            {tabVisible === 'FACTURACION' && hasSeries && <TabFacturacion />}
            {tabVisible === 'EMPRESAS' && hasEmpresas && <TabEmpresas />}
          </div>
        </div>
      </div>
    </div>
  );
}
