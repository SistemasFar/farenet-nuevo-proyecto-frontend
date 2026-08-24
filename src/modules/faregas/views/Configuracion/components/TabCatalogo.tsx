import { useState } from 'react';
import TabCategorias from './TabCategorias';
import TabServicios from './TabServicios';
import TabProductos from './TabProductos';
import TabCertificadosBase from './TabCertificadosBase';

type CatalogoTab = 'CATEGORIAS' | 'SERVICIOS' | 'PRODUCTOS' | 'CERTIFICADOS_BASE';

interface Props {
  hasCategorias: boolean;
  hasServicios: boolean;
  hasProductos: boolean;
}

export default function TabCatalogo({ hasCategorias, hasServicios, hasProductos }: Props) {
  const primera = hasCategorias ? 'CATEGORIAS' : hasServicios ? 'SERVICIOS' : 'PRODUCTOS';
  const [activeTab, setActiveTab] = useState<CatalogoTab>(primera);

  const tabs = [
    ...(hasCategorias ? [{ id: 'CATEGORIAS' as const, label: 'CATEGORÍAS' }] : []),
    ...(hasServicios ? [{ id: 'SERVICIOS' as const, label: 'SERVICIOS' }] : []),
    ...(hasProductos ? [{ id: 'PRODUCTOS' as const, label: 'PRODUCTOS / SKU' }] : []),
    ...(hasServicios ? [{ id: 'CERTIFICADOS_BASE' as const, label: 'CERTIFICADOS BASE' }] : [])
  ];
  const tabVisible = tabs.some((tab) => tab.id === activeTab) ? activeTab : primera;

  return <div><div className="mb-5 flex rounded-lg bg-slate-100 p-1">{tabs.map((tab) => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 rounded-md px-4 py-2 text-sm font-bold transition ${tabVisible === tab.id ? 'bg-[#052A79] text-white shadow' : 'text-slate-600 hover:bg-white'}`}>{tab.label}</button>)}</div>{tabVisible === 'CATEGORIAS' && hasCategorias && <TabCategorias />}{tabVisible === 'SERVICIOS' && hasServicios && <TabServicios />}{tabVisible === 'PRODUCTOS' && hasProductos && <TabProductos />}{tabVisible === 'CERTIFICADOS_BASE' && hasServicios && <TabCertificadosBase />}</div>;
}
