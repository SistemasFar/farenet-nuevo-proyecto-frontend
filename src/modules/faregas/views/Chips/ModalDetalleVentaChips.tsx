import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, FileText, Loader2, RefreshCw, X, Ban } from 'lucide-react';
import Swal from 'sweetalert2';
import { faregasChipsApi, type DetalleVentaChip } from '../../services/faregas-chips.api';
import { esComprobanteReintentable } from './facturacionReintento';

const money = (value: number | null | undefined) => `S/ ${Number(value || 0).toFixed(2)}`;
const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString('es-PE') : '—';

const estadoClass = (estado: string | null | undefined) => {
    if (estado === 'ACEPTADO' || estado === 'PAGADO') return 'bg-emerald-100 text-emerald-700';
    if (estado === 'RECHAZADO' || estado === 'ERROR' || estado === 'ANULADO') return 'bg-red-100 text-red-700';
    if (estado === 'PENDIENTE' || estado === 'PENDIENTE_SUNAT') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
};

export function ModalDetalleVentaChips({
  operacionId,
  onClose,
  onAnular,
  puedeVender,
  anulando
}: {
  operacionId: number;
  onClose: () => void;
  onAnular?: (operacionId: number, nroComprobante: string | null) => Promise<boolean>;
  puedeVender?: boolean;
  anulando?: boolean;
}) {
  const [detalle, setDetalle] = useState<DetalleVentaChip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reintentandoFacturacion, setReintentandoFacturacion] = useState(false);
  const [errorReintento, setErrorReintento] = useState('');

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await faregasChipsApi.obtenerDetalleVenta(operacionId);
      setDetalle(response.venta);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo consultar la venta.');
    } finally {
      setLoading(false);
    }
  }, [operacionId]);

  useEffect(() => { void cargar(); }, [cargar]);

  /**
   * Reintenta la emisión del comprobante ya reservado de esta venta.
   *
   * No vuelve a vender: no manda el formulario de venta, no revalida el chip,
   * no crea operación ni pago y no altera el estado VENDIDO. El backend
   * reutiliza la serie y el número que ya están guardados, así que el
   * comprobante sigue siendo el mismo aunque el reintento vuelva a fallar.
   */
  const handleReintentarFacturacion = async () => {
    const comprobante = detalle?.facturacion;
    if (!esComprobanteReintentable(comprobante)) return;

    const confirmacion = await Swal.fire({
      icon: 'question',
      title: 'Reintentar comprobante',
      html: `Se volverá a intentar emitir <b>${comprobante?.nroComprobante}</b>.<br>No se generará una nueva venta ni un nuevo número.`,
      showCancelButton: true,
      confirmButtonText: 'Reintentar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#052A79'
    });
    if (!confirmacion.isConfirmed) return;

    setReintentandoFacturacion(true);
    setErrorReintento('');
    try {
      await faregasChipsApi.reintentarFacturacionOperacion(operacionId);
      // Se recarga el detalle para mostrar el estado real devuelto por el
      // proveedor, sin cerrar el modal ni volver a listar las ventas.
      await cargar();
    } catch (e: unknown) {
      setErrorReintento(e instanceof Error ? e.message : 'No se pudo reintentar la emisión del comprobante.');
    } finally {
      setReintentandoFacturacion(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Detalle de venta de productos</h2>
            <p className="text-xs text-slate-500">Operación #{operacionId} · Solo lectura</p>
          </div>
          <button type="button" onClick={onClose} disabled={loading} className="text-slate-400 hover:text-slate-700 disabled:opacity-50" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {loading && <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Cargando detalle...</div>}
          {!loading && error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}

          {!loading && !error && detalle && (
            <div className="space-y-5">
              <section>
                <h3 className="border-b border-slate-200 pb-2 text-sm font-bold text-slate-700">1. Datos de facturación</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-sm font-bold text-slate-700">Comprobante
                    <input readOnly value={detalle.facturacion?.tipoComprobante || 'SIN FACTURACIÓN'} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700" />
                  </label>
                  <label className="text-sm font-bold text-slate-700">Documento
                    <input readOnly value={`${detalle.cliente.tipoDocumento || '—'} ${detalle.cliente.documento || ''}`} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700" />
                  </label>
                  <label className="text-sm font-bold text-slate-700 sm:col-span-2">Nombre / Razón Social
                    <input readOnly value={detalle.cliente.nombre || '—'} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700" />
                  </label>
                  <label className="text-sm font-bold text-slate-700 sm:col-span-2">Dirección fiscal
                    <input readOnly value={detalle.cliente.direccion || '—'} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700" />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="border-b border-slate-200 pb-2 text-sm font-bold text-slate-700">2. Productos vendidos</h3>
                <div className="mt-3 space-y-3">
                  {detalle.detalles.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-mono text-sm font-black text-[#052A79]">{item.chip?.numero || 'CHIP NO DISPONIBLE'}</p>
                          <p className="text-sm text-slate-600">{item.descripcion || 'Sin descripción'}</p>
                        </div>
                        {item.chip && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${estadoClass(item.chip.estado)}`}>{item.chip.estado}</span>}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-4">
                        <div><span className="block text-slate-400">Tipo de producto</span><b>{item.descripcion || item.tipoItem || '—'}</b></div>
                        <div><span className="block text-slate-400">Precio aplicado</span><b>{money(item.precioUnitario)}</b></div>
                        <div><span className="block text-slate-400">Cantidad</span><b>{item.cantidad}</b></div>
                        <div><span className="block text-slate-400">Sede</span><b>{item.chip?.sedeNombre || detalle.plantaKey}</b></div>
                        <div><span className="block text-slate-400">Unidad</span><b>{item.unidad || '—'}</b></div>
                        <div><span className="block text-slate-400">Base histórica</span><b>{money(item.baseImponible)}</b></div>
                        <div><span className="block text-slate-400">IGV histórico</span><b>{money(item.igv)}</b></div>
                        <div><span className="block text-slate-400">Total histórico</span><b>{money(item.importeTotal)}</b></div>
                      </div>
                    </div>
                  ))}
                  {!detalle.detalles.length && <p className="text-sm text-slate-500">No hay detalles para mostrar.</p>}
                </div>
              </section>

              <section>
                <h3 className="border-b border-slate-200 pb-2 text-sm font-bold text-slate-700">3. Pago</h3>
                {detalle.ordenPago ? (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div><span className="block text-xs text-slate-400">Condición</span><b>{detalle.ordenPago.condicionPago}</b></div>
                      <div><span className="block text-xs text-slate-400">Total</span><b>{money(detalle.ordenPago.total)}</b></div>
                      <div><span className="block text-xs text-slate-400">Pagado</span><b>{money(detalle.ordenPago.pagado)}</b></div>
                      <div><span className="block text-xs text-slate-400">Falta</span><b>{money(detalle.ordenPago.saldoPendiente)}</b></div>
                    </div>
                    <div className="space-y-2">
                      {detalle.pagos.map((pago) => (
                        <div key={pago.id || `${pago.tipo}-${pago.importe}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                          <span className="font-bold text-slate-700">{pago.tipo}{pago.numeroOperacion ? ` · ${pago.numeroOperacion}` : ''}</span>
                          <span className="font-black text-slate-800">{money(pago.importe)}</span>
                        </div>
                      ))}
                      {!detalle.pagos.length && <p className="text-sm text-slate-500">No hay pagos registrados.</p>}
                    </div>
                  </div>
                ) : <p className="mt-3 text-sm text-slate-500">No existe orden de pago.</p>}
              </section>

              <section>
                <h3 className="border-b border-slate-200 pb-2 text-sm font-bold text-slate-700">4. Comprobante</h3>
                {detalle.facturacion ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-lg font-black text-[#052A79]">{detalle.facturacion.nroComprobante || 'SIN NÚMERO'}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${estadoClass(detalle.facturacion.estado)}`}>{detalle.facturacion.estado}</span>
                    </div>
                    {detalle.facturacion.mensajeRechazo && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><b>Motivo:</b> {detalle.facturacion.mensajeRechazo}{detalle.facturacion.sunatResponseCode ? ` (código ${detalle.facturacion.sunatResponseCode})` : ''}</p>}
                    {detalle.facturacion.ultimoIntento && <p className="text-xs text-slate-500">Último intento: #{detalle.facturacion.ultimoIntento.numero} · {detalle.facturacion.ultimoIntento.estado} · HTTP {detalle.facturacion.ultimoIntento.httpStatus || '—'}</p>}
                    {detalle.facturacion.enlacePdf && <a href={detalle.facturacion.enlacePdf} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"><FileText className="h-4 w-4" /> VER COMPROBANTE</a>}
                    {errorReintento && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{errorReintento}</p>}
                    {esComprobanteReintentable(detalle.facturacion) && (
                      <div>
                        <button
                          type="button"
                          onClick={() => void handleReintentarFacturacion()}
                          disabled={reintentandoFacturacion}
                          aria-busy={reintentandoFacturacion}
                          title="Reintentar la emision de este comprobante sin generar otro numero"
                          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <RefreshCw className={`h-4 w-4 ${reintentandoFacturacion ? 'animate-spin' : ''}`} />
                          {reintentandoFacturacion ? 'REINTENTANDO...' : 'REINTENTAR COMPROBANTE'}
                        </button>
                        <p className="mt-1 text-xs text-slate-500">Reintenta el mismo comprobante reservado. No genera otra venta ni otro numero.</p>
                      </div>
                    )}
                  </div>
                ) : <p className="mt-3 text-sm font-bold text-slate-500">SIN FACTURACIÓN</p>}
              </section>
            </div>
          )}
        </div>

        {!loading && !error && detalle && (
          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
            {detalle.facturacion?.enlacePdf && <a href={detalle.facturacion.enlacePdf} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"><FileText className="h-4 w-4" /> VER COMPROBANTE</a>}
            <button type="button" onClick={onClose} className="rounded-lg bg-[#052A79] px-4 py-2 text-xs font-bold text-white">CERRAR</button>
          </div>
        )}
      </div>
    </div>
  );
}
