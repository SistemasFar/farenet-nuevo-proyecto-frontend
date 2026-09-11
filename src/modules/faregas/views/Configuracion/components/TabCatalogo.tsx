import { FileCheck2, FileText, PackageSearch, Tags } from 'lucide-react';
import { useMemo, useState } from 'react';
import TabCategorias from './TabCategorias';
import TabProductos from './TabProductos';
import TabOperacionesWrapper from './TabOperacionesWrapper';
import TabFormatos from './TabFormatos';

type CatalogoTab = 'CATEGORIAS' | 'FISCALES' | 'OPERACIONES' | 'FORMATOS';

interface Props {
  hasCategorias: boolean;
  hasServicios: boolean;
  hasProductos: boolean;
  hasTarifas: boolean;
  onGoToTarifas: () => void;
}

export default function TabCatalogo({ hasCategorias, hasServicios, hasProductos, hasTarifas, onGoToTarifas }: Props) {
  const tabs = useMemo(() => [
    ...(hasProductos ? [{ id: 'FISCALES' as const, label: 'PRODUCTOS FISCALES', icon: PackageSearch }] : []),
    ...(hasCategorias ? [{ id: 'CATEGORIAS' as const, label: 'CATEGORÍAS', icon: Tags }] : []),
    ...(hasServicios && hasCategorias ? [{ id: 'OPERACIONES' as const, label: 'OPERACIÓN Y FORMATOS', icon: FileCheck2 }] : []),
    ...(hasServicios ? [{ id: 'FORMATOS' as const, label: 'FORMATOS', icon: FileText }] : [])
  ], [hasCategorias, hasProductos, hasServicios]);
  
  const [activeTab, setActiveTab] = useState<CatalogoTab>(tabs[0]?.id || 'FISCALES');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-2 rounded-xl bg-slate-100 p-1 sm:grid-cols-2 xl:grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button 
              key={tab.id} 
              type="button" 
              onClick={() => setActiveTab(tab.id)} 
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-bold transition ${activeTab === tab.id ? 'bg-[#052A79] text-white shadow' : 'text-slate-600 hover:bg-white'}`}
            >
              <Icon size={17} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'FISCALES' && hasProductos && (
        <TabProductos canViewRelations={hasServicios} canViewTarifas={hasTarifas} onGoToTarifas={onGoToTarifas} />
      )}

      {activeTab === 'CATEGORIAS' && hasCategorias && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-bold">Categorías operativas</p>
            <p className="mt-1">
              Organizan internamente las operaciones vinculadas a los productos fiscales. No representan un segundo producto ni generan facturación por sí solas.
            </p>
          </div>
          <TabCategorias />
        </div>
      )}

      {activeTab === 'OPERACIONES' && hasServicios && hasCategorias && (
        <TabOperacionesWrapper 
          canViewProducts={hasProductos} 
          canManageTarifas={hasTarifas} 
          onGoToTarifas={onGoToTarifas} 
        />
      )}

      {activeTab === 'FORMATOS' && hasServicios && (
        <TabFormatos />
      )}
    </div>
  );
}
