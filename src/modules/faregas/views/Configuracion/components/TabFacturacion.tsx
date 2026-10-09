import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { MainLayoutContext } from '../../Dashboard/MainLayout';
import TabSeries from './TabSeries';
import TabDocumentosFacturacion from './TabDocumentosFacturacion';
import NubefactReadinessPanel from './NubefactReadinessPanel';

/**
 * Facturación: un módulo, tres pestañas gobernadas por submódulos.
 *
 * Series sigue siendo un solo módulo con UNA sola tabla: la tabla reúne las
 * series Nubefact y las DMS/Legacy de `fg_serie_comprobante`, y la columna Origen
 * dice de qué conjunto es cada fila además de habilitar sus acciones.
 *
 * La jerarquía es la de Chips: MENU_FACTURACION da el módulo y cada
 * MENU_FACTURACION_* da su pestaña (PREPARACION, SERIES, DOCUMENTOS). Un perfil
 * CONTADOR con sólo Comprobantes ve una sola pestaña y entra directamente en
 * ella; nunca queda seleccionado un tab que no tiene.
 */
type VistaFacturacion = 'PREPARACION' | 'SERIES' | 'DOCUMENTOS';

const PESTANAS: ReadonlyArray<{ id: VistaFacturacion; permiso: string; label: string }> = [
  { id: 'PREPARACION', permiso: 'MENU_FACTURACION_PREPARACION', label: 'PREPARACIÓN' },
  { id: 'SERIES', permiso: 'MENU_FACTURACION_SERIES', label: 'SERIES' },
  { id: 'DOCUMENTOS', permiso: 'MENU_FACTURACION_COMPROBANTES', label: 'COMPROBANTES' }
];

export default function TabFacturacion({ plantaKey, plantaNombre }: { plantaKey: string; plantaNombre: string }) {
  const { permisos } = useOutletContext<MainLayoutContext>();
  const lista = Array.isArray(permisos) ? permisos : [];

  // Sólo se pintan las pestañas que el perfil tiene, en el orden de siempre.
  const visibles = PESTANAS.filter((p) => lista.includes(p.permiso));
  const permitidas = visibles.map((p) => p.id);

  // `PREPARACION` era la pestaña fija inicial. Con submódulos puede no existir, y
  // los permisos llegan de forma asíncrona desde el contexto, así que el estado
  // se corrige cada vez que cambia el conjunto autorizado.
  const [vistaSeleccionada, setVistaSeleccionada] = useState<VistaFacturacion>('PREPARACION');
  const vista = permitidas.includes(vistaSeleccionada)
    ? vistaSeleccionada
    : (permitidas[0] ?? 'DOCUMENTOS');

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

  return <div className="space-y-5">
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="flex min-w-max gap-2 border-b border-slate-200 pb-3">
        {visibles.map((p) => pestana(p.id, p.label))}
      </div>
    </div>
    {vista === 'PREPARACION' && <NubefactReadinessPanel plantaKey={plantaKey} plantaNombre={plantaNombre} />}
    {vista === 'SERIES' && <TabSeries />}
    {vista === 'DOCUMENTOS' && <TabDocumentosFacturacion />}
  </div>;
}
