import { useOutletContext } from 'react-router-dom';
import type { MainLayoutContext } from '../Dashboard/MainLayout';
import TabFacturacion from '../Configuracion/components/TabFacturacion';

export function FaregasFacturacionView() {
  const { plantaKey, plantaNombre } = useOutletContext<MainLayoutContext>();

  return (
    <div className="space-y-4">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Facturación electrónica</h1>
        <p className="text-sm text-gray-500">
          Preparación de NubeFact, administración de series y seguimiento de comprobantes.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="p-6">
          <TabFacturacion plantaKey={plantaKey} plantaNombre={plantaNombre} />
        </div>
      </section>
    </div>
  );
}
