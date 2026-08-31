import { useState } from 'react';
import TabSeries from './TabSeries';
import TabDocumentosFacturacion from './TabDocumentosFacturacion';

export default function TabFacturacion() {
  const [vista, setVista] = useState<'SERIES' | 'DOCUMENTOS'>('SERIES');
  return <div className="space-y-5">
    <div className="flex gap-2 border-b pb-3">
      <button type="button" onClick={() => setVista('SERIES')} className={`rounded-lg px-4 py-2 text-sm font-bold ${vista === 'SERIES' ? 'bg-[#052a79] text-white' : 'bg-slate-100 text-slate-600'}`}>SERIES</button>
      <button type="button" onClick={() => setVista('DOCUMENTOS')} className={`rounded-lg px-4 py-2 text-sm font-bold ${vista === 'DOCUMENTOS' ? 'bg-[#052a79] text-white' : 'bg-slate-100 text-slate-600'}`}>COMPROBANTES</button>
    </div>
    {vista === 'SERIES' ? <TabSeries /> : <TabDocumentosFacturacion />}
  </div>;
}
