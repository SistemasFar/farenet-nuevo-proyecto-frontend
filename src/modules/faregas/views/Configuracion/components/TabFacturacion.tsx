import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { MainLayoutContext } from '../../Dashboard/MainLayout';
import TabSeries from './TabSeries';
import TabDocumentosFacturacion from './TabDocumentosFacturacion';
import TabClientesFacturacion from './TabClientesFacturacion';

/**
 * Facturación electrónica: 3 pestañas gobernadas por submódulos (SERIES, COMPROBANTES, CLIENTES).
 * La pestaña inicial es SERIES.
 */
type VistaFacturacion = 'SERIES' | 'DOCUMENTOS' | 'CLIENTES';

const PESTANAS: ReadonlyArray<{ id: VistaFacturacion; permiso: string; label: string }> = [
  { id: 'SERIES', permiso: 'MENU_FACTURACION_SERIES', label: 'SERIES' },
  { id: 'DOCUMENTOS', permiso: 'MENU_FACTURACION_COMPROBANTES', label: 'COMPROBANTES' },
  { id: 'CLIENTES', permiso: 'MENU_FACTURACION_CLIENTES', label: 'CLIENTES' }
];

export default function TabFacturacion({ plantaKey: _plantaKey, plantaNombre: _plantaNombre }: { plantaKey: string; plantaNombre: string }) {
  const { permisos } = useOutletContext<MainLayoutContext>();
  const lista = Array.isArray(permisos) ? permisos : [];

  // Sólo se pintan las pestañas que el perfil tiene, en orden definido
  const visibles = PESTANAS.filter((p) => lista.includes(p.permiso));
  const permitidas = visibles.map((p) => p.id);

  // La pestaña inicial es SERIES por defecto
  const [vistaSeleccionada, setVistaSeleccionada] = useState<VistaFacturacion>('SERIES');
  const vista = permitidas.includes(vistaSeleccionada)
    ? vistaSeleccionada
    : (permitidas[0] ?? 'SERIES');

  const pestana = (id: VistaFacturacion, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setVistaSeleccionada(id)}
      className={`rounded-lg px-4 py-2 text-sm font-bold ${vista === id ? 'bg-[#052a79] text-white' : 'bg-slate-100 text-slate-600'}`}
    >
      {label}
    </button>
  );

  if (visibles.length === 0) {
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
      El perfil puede abrir Facturación, pero no tiene submódulos autorizados. Solicita que revisen sus permisos efectivos.
    </div>;
  }

  return <div className="space-y-5">
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="flex min-w-max gap-2 border-b border-slate-200 pb-3">
        {visibles.map((p) => pestana(p.id, p.label))}
      </div>
    </div>
    {vista === 'SERIES' && permitidas.includes('SERIES') && <TabSeries />}
    {vista === 'DOCUMENTOS' && permitidas.includes('DOCUMENTOS') && <TabDocumentosFacturacion />}
    {vista === 'CLIENTES' && permitidas.includes('CLIENTES') && <TabClientesFacturacion />}
  </div>;
}
