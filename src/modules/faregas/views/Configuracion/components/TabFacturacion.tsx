import { useState } from 'react';
import TabSeries from './TabSeries';
import TabDocumentosFacturacion from './TabDocumentosFacturacion';
import NubefactReadinessPanel from './NubefactReadinessPanel';

/**
 * Series es un solo módulo dentro de Facturación, con UNA sola tabla.
 *
 * No hay subpestañas internas: la tabla reúne las series Nubefact y las series
 * DMS/Legacy de `fg_serie_comprobante` y la columna Origen dice de qué conjunto
 * es cada fila, además de habilitar las acciones que corresponden a cada uno.
 */
type VistaFacturacion = 'PREPARACION' | 'SERIES' | 'DOCUMENTOS';

export default function TabFacturacion({ plantaKey, plantaNombre }: { plantaKey: string; plantaNombre: string }) {
  const [vista, setVista] = useState<VistaFacturacion>('PREPARACION');
  const pestana = (id: VistaFacturacion, label: string) => (
    <button
      type="button"
      onClick={() => setVista(id)}
      className={`rounded-lg px-4 py-2 text-sm font-bold ${vista === id ? 'bg-[#052a79] text-white' : 'bg-slate-100 text-slate-600'}`}
    >
      {label}
    </button>
  );
  return <div className="space-y-5">
    <div className="flex gap-2 border-b pb-3">
      {pestana('PREPARACION', 'PREPARACIÓN')}
      {pestana('SERIES', 'SERIES')}
      {pestana('DOCUMENTOS', 'COMPROBANTES')}
    </div>
    {vista === 'PREPARACION' && <NubefactReadinessPanel plantaKey={plantaKey} plantaNombre={plantaNombre} />}
    {vista === 'SERIES' && <TabSeries />}
    {vista === 'DOCUMENTOS' && <TabDocumentosFacturacion />}
  </div>;
}
