import { useState, useEffect } from 'react';
import { faregasChipsApi } from '../../services/faregas-chips.api';
import type { ValidacionVentaDirectaResponse, VentaDirectaFacturacion, VentaDirectaResponse } from '../../services/faregas-chips.api';
import { ChipScannerInput, parseChipScan } from './ChipScannerInput';
import { PagoStep } from '../NuevoCertificado/components/NuevoCertificado/PagoStep';
import { maestrosApi } from '@/services/api';
import type { MaestrosPagoResponse } from '@/types/maestros';
import type { FormPagoState, PagoAgregado } from '../NuevoCertificado/NuevoCertificadoView';

const crearFormPagoVacio = (): FormPagoState => ({
  importe: '',
  tarjetaKey: '',
  entidadFinancieraKey: ''
});

const toleranciaMonto = 0.009;

const errorDocumentoFiscal = (
  tipoComprobante: string,
  tipoDocumento: string,
  documento: string
) => {
  const valor = documento.trim();
  if (!valor) return 'El número de documento es obligatorio.';
  if (!/^\d+$/.test(valor)) {
    return tipoDocumento === 'RUC'
      ? 'RUC debe contener 11 dígitos.'
      : 'DNI debe contener 8 dígitos.';
  }
  if (tipoComprobante === 'FACTURA' && (tipoDocumento !== 'RUC' || valor.length !== 11)) {
    return 'FACTURA requiere un RUC de 11 dígitos.';
  }
  if (tipoDocumento === 'RUC' && valor.length !== 11) return 'RUC debe contener 11 dígitos.';
  if (tipoDocumento === 'DNI' && valor.length !== 8) return 'DNI debe contener 8 dígitos.';
  return '';
};

export function ModalVentaChips({
  onClose,
  onVentaExitosa
}: {
  onClose: () => void;
  onVentaExitosa: (result: VentaDirectaResponse) => void;
}) {
  const [scan, setScan] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState('BOLETA');
  const [tipoDocumentoCliente, setTipoDocumentoCliente] = useState('DNI');
  const [nroDocumento, setNroDocumento] = useState('');
  const [nombreRazonSocial, setNombreRazonSocial] = useState('');
  const [direccion, setDireccion] = useState('');

  const [condicionPago, setCondicionPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [pagoTab, setPagoTab] = useState<PagoAgregado['tipo']>('EFECTIVO');
  const [pagosAgregados, setPagosAgregados] = useState<PagoAgregado[]>([]);
  const [formPago, setFormPago] = useState<FormPagoState>(crearFormPagoVacio);
  const [maestrosPago, setMaestrosPago] = useState<MaestrosPagoResponse['data'] | null>(null);

  const [loadingVenta, setLoadingVenta] = useState(false);
  const [validandoChips, setValidandoChips] = useState(false);
  const [ventaRegistrada, setVentaRegistrada] = useState(false);
  const [resultadoVenta, setResultadoVenta] = useState<VentaDirectaResponse | null>(null);
  const [resultadoValidacion, setResultadoValidacion] = useState<ValidacionVentaDirectaResponse | null>(null);
  const [error, setError] = useState('');
  const [errorValidacion, setErrorValidacion] = useState('');
  const [errorPago, setErrorPago] = useState('');
  const [mensaje, setMensaje] = useState('');

  const parsed = parseChipScan(scan);
  const chipsValidados = resultadoValidacion?.items.filter((item) => item.validoParaVenta) ?? [];
  const totalMonto = resultadoValidacion?.totalEstimado ?? 0;
  const hayErrorDeEscaneo = parsed.errores.length > 0 || parsed.duplicados.length > 0;
  const validacionCompleta = Boolean(
    resultadoValidacion
    && !hayErrorDeEscaneo
    && resultadoValidacion.items.length === parsed.validos.length
    && resultadoValidacion.items.length > 0
    && resultadoValidacion.items.every((item) => item.validoParaVenta)
    && totalMonto > 0
  );
  const totalPagado = pagosAgregados.reduce((sum, pago) => {
    const importe = Number(pago.importe);
    return sum + (Number.isFinite(importe) ? importe : 0);
  }, 0);
  const pendiente = totalMonto - totalPagado;
  const pagoCompleto = validacionCompleta && Math.abs(pendiente) <= toleranciaMonto;
  const errorFiscalDocumento = errorDocumentoFiscal(
    tipoComprobante,
    tipoDocumentoCliente,
    nroDocumento
  );
  const datosFiscalesValidos = Boolean(
    !errorFiscalDocumento
    && nombreRazonSocial.trim()
    && nombreRazonSocial.trim().length <= 100
    && direccion.trim()
    && direccion.trim().length <= 100
  );
  const pagoDisponible = validacionCompleta && !loadingVenta && !validandoChips && !ventaRegistrada;

  useEffect(() => {
    maestrosApi.obtenerMaestrosPagoAsync()
      .then(res => setMaestrosPago(res.data))
      .catch(err => {
        console.error("Error al cargar maestros pago:", err);
        setErrorPago('No se pudieron cargar los medios de pago.');
      });
  }, []);

  const limpiarPagos = () => {
    setPagosAgregados([]);
    setFormPago(crearFormPagoVacio());
    setErrorPago('');
  };

  const handleScanChange = (valor: string) => {
    setScan(valor);
    setResultadoValidacion(null);
    setResultadoVenta(null);
    limpiarPagos();
    setError('');
    setErrorValidacion('');
    setMensaje('');
  };

  const handleValidarChips = async () => {
    if (parsed.validos.length === 0) {
      setErrorValidacion('Escanee al menos un chip con formato válido.');
      return;
    }
    if (hayErrorDeEscaneo) {
      setResultadoValidacion(null);
      setErrorValidacion('Corrija los duplicados y códigos inválidos antes de consultar el inventario.');
      return;
    }

    setValidandoChips(true);
    setResultadoValidacion(null);
    setResultadoVenta(null);
    limpiarPagos();
    setError('');
    setErrorValidacion('');
    setMensaje('');

    try {
      const result = await faregasChipsApi.validarVentaDirecta(parsed.validos);
      setResultadoValidacion(result);
    } catch (e: unknown) {
      setErrorValidacion(e instanceof Error ? e.message : 'No se pudieron validar los chips.');
    } finally {
      setValidandoChips(false);
    }
  };

  const handleAgregarPago = () => {
    setErrorPago('');
    if (!pagoDisponible) return;

    const importe = Number(formPago.importe);
    if (!Number.isFinite(importe) || importe <= 0) {
      setErrorPago('Ingrese un importe mayor a cero.');
      return;
    }
    if (importe - pendiente > toleranciaMonto) {
      setErrorPago('El pago no puede superar el saldo pendiente.');
      return;
    }

    setPagosAgregados(prev => [...prev, {
      tipo: pagoTab,
      importe: importe.toFixed(2),
      tarjetaKey: formPago.tarjetaKey,
      nroOperacion: formPago.nroOperacion,
      digitosTarjeta: formPago.digitosTarjeta,
      entidadFinancieraKey: formPago.entidadFinancieraKey,
      cuentaCorrienteKey: formPago.cuentaCorrienteKey,
      fechaDeposito: formPago.fechaDeposito
    }]);
    setFormPago(crearFormPagoVacio());
  };

  const eliminarPago = (index: number) => {
    setPagosAgregados(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    let ventaSolicitada = false;
    try {
      setError('');
      setMensaje('');
      if (!validacionCompleta) throw new Error('Valide nuevamente los chips antes de confirmar la venta.');
      if (errorFiscalDocumento) throw new Error(errorFiscalDocumento);
      if (!datosFiscalesValidos) throw new Error('Complete nombre y dirección fiscal, con un máximo de 100 caracteres.');
      if (condicionPago === 'CONTADO' && pendiente > toleranciaMonto) {
        throw new Error('Debe completar el pago para confirmar la venta al contado.');
      }
      if (pendiente < -toleranciaMonto) {
        throw new Error('El pago no puede superar el total de la venta.');
      }

      setLoadingVenta(true);
      ventaSolicitada = true;
      const response = await faregasChipsApi.ventaDirecta({
        tipoComprobante,
        tipoDocumentoCliente,
        nroDocumento: nroDocumento.trim(),
        nombreRazonSocial: nombreRazonSocial.trim(),
        direccion: direccion.trim(),
        condicionPago,
        medioPago: pagosAgregados[0]?.tipo || 'EFECTIVO',
        pagosAgregados,
        chips: chipsValidados.map((item) => item.numeroChip)
      });
      const estado = response.facturacion?.estado || response.facturacionEstado;

      setResultadoVenta(response);
      setVentaRegistrada(true);
      onVentaExitosa(response);

      if (estado === 'ACEPTADO') {
        setMensaje('COMPROBANTE EMITIDO CORRECTAMENTE');
      } else if (['PENDIENTE', 'PENDIENTE_SUNAT', 'PENDING_SUNAT'].includes(String(estado))) {
        setMensaje('El comprobante fue registrado y está pendiente de SUNAT.');
      } else {
        setError(response.message || 'La venta fue registrada, pero el comprobante no pudo emitirse.');
      }
    } catch (e: unknown) {
      const errorConDetalles = e as {
        message?: string;
        codigo?: string;
        detalles?: {
          operacionId?: number;
          ventaRegistrada?: boolean;
          facturacion?: VentaDirectaFacturacion;
        } | string[];
      };
      const detalles = Array.isArray(errorConDetalles.detalles)
        ? null
        : errorConDetalles.detalles;
      if (ventaSolicitada && (detalles?.ventaRegistrada || !errorConDetalles.codigo)) {
        setVentaRegistrada(true);
      }
      if (detalles?.ventaRegistrada && detalles.operacionId) {
        const response: VentaDirectaResponse = {
          success: false,
          operacionId: detalles.operacionId,
          operacionEstado: 'PAGADO',
          facturacion: detalles.facturacion,
          facturacionEstado: detalles.facturacion?.estado || 'ERROR',
          message: e instanceof Error ? e.message : errorConDetalles.message
        };
        setResultadoVenta(response);
        onVentaExitosa(response);
      }
      setError(e instanceof Error ? e.message : errorConDetalles.message || 'Error al procesar la venta');
    } finally {
      setLoadingVenta(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-2 backdrop-blur-sm sm:p-4 lg:p-6">
      <div className="my-2 w-full max-w-[1400px] rounded-2xl bg-white shadow-xl sm:my-4">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:px-5">
          <h2 className="text-xl font-bold text-slate-900">Venta Directa de Chips</h2>
          <button onClick={onClose} disabled={loadingVenta || validandoChips} className="text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Cerrar">✕</button>
        </div>

        <div className="grid grid-cols-1 gap-5 border-b border-slate-100 p-4 sm:p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:gap-6">
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-700 border-b pb-2">1. Datos de Facturación</h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-700">Comprobante
                <select value={tipoComprobante} disabled={ventaRegistrada} onChange={e => {
                  setTipoComprobante(e.target.value);
                  setTipoDocumentoCliente(e.target.value === 'FACTURA' ? 'RUC' : 'DNI');
                }} className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100">
                  <option value="BOLETA">BOLETA</option>
                  <option value="FACTURA">FACTURA</option>
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-700">Documento
                <select value={tipoDocumentoCliente} onChange={e => setTipoDocumentoCliente(e.target.value)} disabled={tipoComprobante === 'FACTURA' || ventaRegistrada} className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100">
                  <option value="DNI">DNI</option>
                  <option value="RUC">RUC</option>
                </select>
              </label>
            </div>

            <label className="block text-sm font-bold text-slate-700">Nro Documento
              <input value={nroDocumento} onChange={e => setNroDocumento(e.target.value)} inputMode="numeric" maxLength={tipoDocumentoCliente === 'RUC' ? 11 : 8} disabled={ventaRegistrada} className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100" />
            </label>
            {errorFiscalDocumento && <p className="text-sm font-bold text-red-600">{errorFiscalDocumento}</p>}

            <label className="block text-sm font-bold text-slate-700">Nombre / Razón Social
              <input value={nombreRazonSocial} maxLength={100} disabled={ventaRegistrada} onChange={e => setNombreRazonSocial(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100" />
            </label>

            <label className="block text-sm font-bold text-slate-700">Dirección fiscal
              <input value={direccion} maxLength={100} disabled={ventaRegistrada} onChange={e => setDireccion(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100" />
            </label>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-700 border-b pb-2">2. Chips a vender</h3>
            <p className="text-xs text-slate-500">Escanee los códigos y presione VALIDAR CHIPS. Solo el resultado del inventario habilita el pago.</p>
            <ChipScannerInput
              value={scan}
              onChange={handleScanChange}
              rows={5}
              disabled={validandoChips || loadingVenta || ventaRegistrada}
              ariaBusy={validandoChips}
              etiquetaValidos="Formato válido"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleValidarChips()}
                disabled={parsed.validos.length === 0 || validandoChips || loadingVenta || ventaRegistrada}
                aria-busy={validandoChips}
                className="rounded-lg bg-[#052A79] px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-[#041e56] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {validandoChips ? 'VALIDANDO CHIPS...' : 'VALIDAR CHIPS'}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Chips válidos:</span>
                <span className="font-bold">{resultadoValidacion?.cantidadValidos ?? 0}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-slate-600">Total estimado:</span>
                <span className="font-bold text-[#052A79]">S/ {totalMonto.toFixed(2)}</span>
              </div>
            </div>

            {resultadoValidacion && (
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200" aria-live="polite">
                {resultadoValidacion.items.map((item) => (
                  <div key={item.numeroChip} className={`rounded-lg border p-3 ${item.validoParaVenta ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-bold text-slate-800">{item.numeroChip}</p>
                        <p className={`text-sm font-bold ${item.validoParaVenta ? 'text-emerald-700' : 'text-red-700'}`}>
                          {item.validoParaVenta ? '✓ Disponible' : `✕ ${item.motivo || 'No válido para la venta'}`}
                        </p>
                        {item.existe && (
                          <p className="text-xs text-slate-600">
                            {item.productoNombre || 'Producto no disponible'}{item.plantaNombre ? ` · ${item.plantaNombre}` : ''}
                          </p>
                        )}
                      </div>
                      {item.precio != null && <span className="shrink-0 text-sm font-bold text-slate-800">S/ {item.precio.toFixed(2)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {errorValidacion && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-600">{errorValidacion}</p>}
            {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
            {mensaje && <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-700">{mensaje}</p>}
            {resultadoVenta && (
              <div className={`rounded-xl border p-4 ${resultadoVenta.facturacionEstado === 'ACEPTADO' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                <p className="font-bold text-slate-900">{resultadoVenta.facturacionEstado === 'ACEPTADO' ? 'COMPROBANTE EMITIDO CORRECTAMENTE' : 'RESULTADO DE LA EMISIÓN'}</p>
                {resultadoVenta.facturacion?.nroComprobante && <p className="mt-1 font-mono text-lg font-bold text-[#052A79]">{resultadoVenta.facturacion.nroComprobante}</p>}
                <p className="mt-1 text-sm text-slate-600">Operación #{resultadoVenta.operacionId} · Estado: {resultadoVenta.facturacionEstado}</p>
                {resultadoVenta.facturacion?.enlacePdf && (
                  <a href={resultadoVenta.facturacion.enlacePdf} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-[#052A79] px-3 py-2 text-xs font-bold text-white">VER COMPROBANTE</a>
                )}
                <button type="button" onClick={onClose} className="ml-2 mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">CERRAR</button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {errorPago && <p className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-600">{errorPago}</p>}
          <fieldset disabled={!pagoDisponible} className="min-w-0 border-0 p-0">
            <PagoStep
              pagoTab={pagoTab}
              setPagoTab={setPagoTab}
              formPago={formPago}
              setFormPago={setFormPago}
              pagosAgregados={pagosAgregados}
              handleAgregarPago={handleAgregarPago}
              eliminarPago={eliminarPago}
              totalPagar={totalMonto}
              tarifaOriginal={totalMonto}
              maestrosPago={maestrosPago}
              condicionPago={condicionPago}
              onCondicionPagoChange={setCondicionPago}
              compact
            />
          </fieldset>
        </div>

        <div className="flex flex-col-reverse justify-end gap-3 rounded-b-2xl border-t border-slate-200 bg-slate-50 p-4 sm:flex-row">
          <button onClick={onClose} disabled={loadingVenta || validandoChips} className="w-full rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">Cancelar</button>
          <button
            onClick={() => void handleSubmit()}
            disabled={loadingVenta || validandoChips || ventaRegistrada || !validacionCompleta || !datosFiscalesValidos || !pagoCompleto}
            className="w-full rounded-lg bg-emerald-600 px-6 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {loadingVenta ? 'Procesando...' : 'Confirmar Venta y Emitir'}
          </button>
        </div>
      </div>
    </div>
  );
}
