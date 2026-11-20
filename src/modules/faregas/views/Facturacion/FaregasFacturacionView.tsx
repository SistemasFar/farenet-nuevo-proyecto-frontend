import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { MainLayoutContext } from '../Dashboard/MainLayout';
import TabFacturacion from '../Configuracion/components/TabFacturacion';
import { faregasFacturacionAdminApi, type TrabajoContingenciaAdmin } from '../../services/faregas-facturacion-admin.api';

export function FaregasFacturacionView() {
  const { plantaKey, plantaNombre, permisos } = useOutletContext<MainLayoutContext>();

  return (
    <div className="space-y-4">
      <header className="mb-4 sm:mb-6">
        <h1 className="text-xl font-bold text-gray-800">Facturación electrónica</h1>
        <p className="text-sm text-gray-500">
          Administración de series, emisión de comprobantes y gestión de clientes.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="p-3 sm:p-6">
          <TabFacturacion plantaKey={plantaKey} plantaNombre={plantaNombre} />
        </div>
      </section>
      {permisos?.includes('MENU_FACTURACION_COMPROBANTES') && <SeguimientoContingencia />}
    </div>
  );
}

const fechaContingencia = (valor: string | null) => valor
  ? new Date(valor).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : '—';

function SeguimientoContingencia() {
  const [habilitada, setHabilitada] = useState(false);
  const [items, setItems] = useState<TrabajoContingenciaAdmin[]>([]);
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [version, setVersion] = useState(0);
  const [enProceso, setEnProceso] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    setError('');
    faregasFacturacionAdminApi.listarContingencia(estado, pagina).then(({ data }) => {
      if (!activo) return;
      setHabilitada(data.habilitada);
      setItems(data.items);
      setHayMas(Boolean(data.hayMas));
    }).catch((cause: unknown) => {
      if (activo) setError(cause instanceof Error ? cause.message : 'No se pudo consultar la regularización. Vuelve a cargar el listado.');
    });
    return () => { activo = false; };
  }, [estado, pagina, version]);

  const reintentar = async (id: string) => {
    setEnProceso(id);
    setError('');
    try {
      await faregasFacturacionAdminApi.reintentarContingencia(id);
      setVersion(value => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo iniciar el intento.');
    } finally {
      setEnProceso(null);
    }
  };

  if (!habilitada) return error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null;
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-slate-800">Regularización de comprobantes DEMO</h2>
        <div className="flex gap-2">
          <select aria-label="Estado de regularización" className="rounded border px-2 py-1"
            value={estado} onChange={event => { setEstado(event.target.value); setPagina(1); }}>
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="REVISION">Requieren revisión</option>
            <option value="REGULARIZADO">Regularizados</option>
            <option value="CANCELADO">Cancelados</option>
          </select>
          <button type="button" className="rounded border px-3 py-1" onClick={() => setVersion(value => value + 1)}>Actualizar</button>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {items.length === 0 ? <p className="text-sm text-slate-600">Sin regularizaciones para este filtro.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50"><tr>
              <th className="p-2">Certificado y comprobante</th><th className="p-2">Estado</th>
              <th className="p-2">Intentos</th><th className="p-2">Correo</th><th className="p-2">Acción</th>
            </tr></thead>
            <tbody>{items.map(item => (
              <tr key={item.facturacion_id} className="border-t align-top">
                <td className="p-2 font-semibold">{item.numero_certificado || item.certificado_id}<br />{item.nro_comprobante || '—'} · {item.planta_key}</td>
                <td className="p-2">{item.prioridad && <p className="font-bold text-red-700">Prioridad fiscal</p>}{item.estado} · {item.estado_fiscal}<br />{item.ultimo_resultado || item.diagnostico.categoria}<br />{item.diagnostico.seguimiento}</td>
                <td className="p-2">{item.intentos} · Último {fechaContingencia(item.ultimo_intento)}<br />{item.estado === 'PENDIENTE' && 'Próximo ' + fechaContingencia(item.siguiente_intento)}</td>
                <td className="p-2">{item.correo_estado} · {item.correo_intentos}<br />{item.correo_ultimo_error}</td>
                <td className="p-2">{item.estado === 'PENDIENTE' && (
                  <button type="button" className="rounded border px-2 py-1" disabled={enProceso !== null}
                    onClick={() => void reintentar(item.facturacion_id)}>Reintentar</button>
                )}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-end gap-3 text-sm">
        <button type="button" className="rounded border px-2 py-1" disabled={pagina === 1} onClick={() => setPagina(value => value - 1)}>Anterior</button>
        <span>Página {pagina}</span>
        <button type="button" className="rounded border px-2 py-1" disabled={!hayMas} onClick={() => setPagina(value => value + 1)}>Siguiente</button>
      </div>
    </section>
  );
}
