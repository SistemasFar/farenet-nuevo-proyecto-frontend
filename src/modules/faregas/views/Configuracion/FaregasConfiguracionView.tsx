import { useState, useEffect } from 'react';
import TabSedes from './TabSedes';
import TabServicios from './components/TabServicios';
import TabCertificadosBase from './components/TabCertificadosBase';

type ConfigTab = 'SEDES' | 'SERVICIOS' | 'TARIFAS' | 'CERTIFICADOS_BASE';

export function FaregasConfiguracionView() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('SEDES');
  
  
  let fUser = {};
  try {
    const stored = sessionStorage.getItem('faregasUser');
    if (stored && stored !== 'undefined') fUser = JSON.parse(stored);
  } catch(e) {}

  const permisos = fUser?.permisos || [];

  const hasSedes = permisos.includes('CONFIGURACION_SEDES');
  const hasServicios = permisos.includes('CONFIGURACION_SERVICIOS');

  useEffect(() => {
    if (!hasSedes && hasServicios) setActiveTab('SERVICIOS');
    else if (!hasSedes && !hasServicios) setActiveTab('CERTIFICADOS_BASE');
  }, [hasSedes, hasServicios]);

  const tabs = [];
  if (hasSedes) tabs.push({ id: 'SEDES', label: 'SEDES' });
  if (hasServicios) tabs.push({ id: 'SERVICIOS', label: 'SERVICIOS' });
  tabs.push({ id: 'TARIFAS', label: 'TARIFAS' }); // Will be protected later
  tabs.push({ id: 'CERTIFICADOS_BASE', label: 'CERTIFICADOS BASE' });

  return (
    <div className="space-y-4">
      <div className="w-full">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Configuración</h1>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-6">
          <div className="flex border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ConfigTab)}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'SEDES' && hasSedes && <TabSedes />}
            {activeTab === 'SERVICIOS' && hasServicios && <TabServicios />}
            {activeTab === 'CERTIFICADOS_BASE' && <TabCertificadosBase />}
            {activeTab === 'TARIFAS' && (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg font-semibold">Próximamente</p>
                <p className="text-sm">Administración de Tarifas (En desarrollo)</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
