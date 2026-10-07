import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import Swal from 'sweetalert2';
import { faregasChipsApi } from '../../services/faregas-chips.api';
import type { ProductoInventariable, ValidacionVentaDirectaResponse, VentaDirectaFacturacion, VentaDirectaResponse } from '../../services/faregas-chips.api';
import { faregasClientesApi } from '../../services/faregas-clientes.api';
import { ChipScannerInput } from './ChipScannerInput';
import { parseChipScan } from './chips-ingreso-masivo';
import { esComprobanteReintentable } from './facturacionReintento';
import { PagoStep } from '../NuevoCertificado/components/NuevoCertificado/PagoStep';
import { maestrosApi } from '@/services/api';
import type { MaestrosPagoResponse } from '@/types/maestros';
import type { FormPagoState, PagoAgregado } from '../NuevoCertificado/NuevoCertificadoView';
import { entradaVentaCantidad, esProductoCantidad, etiquetaControlInventario } from './inventario-control';

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

/**
 * Mismas reglas que aplica el backend en `faregas-facturacion.rules.js`
 * (normalizarFacturacion / validarFacturacion). No se inventan reglas nuevas:
 * el correo se normaliza en minúsculas y se valida su formato; el teléfono se
 * limita a 30 caracteres. Ambos siguen siendo opcionales, igual que en
 * FAREGAS, de modo que agregar el campo no bloquea ventas que antes pasaban.
 */
const normalizarEmail = (valor: string) => valor.trim().toLowerCase();
const LIMITE_TELEFONO = 30;
const REGLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const errorContacto = (email: string, telefono: string) => {
  if (email && !REGLA_EMAIL.test(email)) return 'El correo no tiene un formato válido.';
  if (telefono && telefono.length > LIMITE_TELEFONO) {
    return `El teléfono admite hasta ${LIMITE_TELEFONO} caracteres.`;
  }
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
  const [productos, setProductos] = useState<ProductoInventariable[]>([]);
  const [productoInventariableId, setProductoInventariableId] = useState<number | ''>('');
  const [cantidad, setCantidad] = useState('1');
  const [tipoComprobante, setTipoComprobante] = useState('BOLETA');
  const [tipoDocumentoCliente, setTipoDocumentoCliente] = useState('DNI');
  const [nroDocumento, setNroDocumento] = useState('');
  const [nombreRazonSocial, setNombreRazonSocial] = useState('');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  const [condicionPago, setCondicionPago] = useState<'CONTADO' | 'CREDITO'>('CONTADO');
  const [pagoTab, setPagoTab] = useState<PagoAgregado['tipo']>('EFECTIVO');
  const [pagosAgregados, setPagosAgregados] = useState<PagoAgregado[]>([]);
  const [formPago, setFormPago] = useState<FormPagoState>(crearFormPagoVacio);
  const [maestrosPago, setMaestrosPago] = useState<MaestrosPagoResponse['data'] | null>(null);

  const [loadingVenta, setLoadingVenta] = useState(false);
  const [reintentandoFacturacion, setReintentandoFacturacion] = useState(false);
  const [validandoChips, setValidandoChips] = useState(false);
  const [ventaRegistrada, setVentaRegistrada] = useState(false);
  const [resultadoVenta, setResultadoVenta] = useState<VentaDirectaResponse | null>(null);
  const [resultadoValidacion, setResultadoValidacion] = useState<ValidacionVentaDirectaResponse | null>(null);
  const [error, setError] = useState('');
  const [errorValidacion, setErrorValidacion] = useState('');
  const [errorPago, setErrorPago] = useState('');
  const [mensaje, setMensaje] = useState('');
  // El bloque de resultado está al final del modal. Cuando aparece, se acerca
  // con `block: 'nearest'`, que desplaza lo mínimo indispensable: nunca sube
  // al principio de la página ni usa window.scrollTo(0, 0).
  const resultadoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!resultadoVenta) return;
    resultadoRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [resultadoVenta]);

  const parsed = parseChipScan(scan);
  const productoSeleccionado = productos.find((producto) => producto.id === Number(productoInventariableId));
  const esCantidad = esProductoCantidad(productoSeleccionado);
  const chipsValidados = resultadoValidacion?.items.filter((item) => item.validoParaVenta) ?? [];
  const totalMonto = resultadoValidacion?.totalEstimado ?? 0;
  const hayErrorDeEscaneo = parsed.errores.length > 0 || parsed.duplicados.length > 0;
  const validacionCompleta = Boolean(resultadoValidacion
    && resultadoValidacion.items.length > 0
    && resultadoValidacion.items.every((item) => item.validoParaVenta)
    && totalMonto > 0
    && (esCantidad
      ? resultadoValidacion.cantidadValidos === Number(cantidad)
      : !hayErrorDeEscaneo && resultadoValidacion.items.length === parsed.validos.length));
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
  const errorContactoActual = errorContacto(email, telefono);
  const datosFiscalesValidos = Boolean(
    !errorFiscalDocumento
    && !errorContactoActual
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

  useEffect(() => {
    faregasChipsApi.listarProductosInventariables()
      .then((lista) => {
        setProductos(lista);
        const inicial = lista.find((producto) => producto.codigo === 'CHIP') || lista[0];
        if (inicial) setProductoInventariableId(inicial.id);
      })
      .catch(() => setErrorValidacion('No se pudieron cargar los productos disponibles para esta sede.'));
  }, []);

  const limpiarPagos = () => {
    setPagosAgregados([]);
    setFormPago(crearFormPagoVacio());
    setErrorPago('');
  };

  /**
   * Reutiliza el endpoint genérico de maestro de clientes que ya usa Nuevo
   * Certificado (GET /clientes/autocompletar/:tipoDocumento/:nroDocumento).
   * No hay endpoint propio de chips: ese endpoint ya resuelve en orden
   * fg_cliente -> histórico de fg_facturacion -> persona de FARENET.
   */
  const buscarCliente = async () => {
    const documento = nroDocumento.replace(/\D/g, '');
    if (errorDocumentoFiscal(tipoComprobante, tipoDocumentoCliente, documento)) {
      setError('Corrija el número de documento antes de buscar el cliente.');
      return;
    }

    setBuscandoCliente(true);
    try {
      const response = await faregasClientesApi.autocompletarPersona(tipoDocumentoCliente, documento);
      const persona = response?.data;
      if (!persona) throw new Error('SIN_COINCIDENCIAS');

      // Un dato vacío que viene del maestro no borra lo que el operador ya
      // escribió: sólo se rellena lo que falta.
      setNombreRazonSocial(prev => persona.nombreRazonSocial || persona.nombrerazonsocial || prev);
      setDireccion(prev => persona.direccion || prev);
      setEmail(prev => normalizarEmail(persona.correo || persona.email || '') || prev);
      setTelefono(prev => (persona.telefono || '').trim() || prev);
      setError('');

      await Swal.fire({
        icon: 'success',
        title: 'Cliente encontrado',
        text: persona.origen === 'FAREGAS'
          ? 'Datos recuperados de Faregas.'
          : 'Datos recuperados de Farenet.',
        timer: 1800,
        showConfirmButton: false
      });
    } catch {
      // No se bloquea el formulario: el cliente se puede escribir a mano.
      await Swal.fire(
        'No se encontró un cliente registrado',
        'Puede completar los datos manualmente.',
        'info'
      );
    } finally {
      setBuscandoCliente(false);
    }
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

  const limpiarValidacionInventario = () => {
    setResultadoValidacion(null);
    setResultadoVenta(null);
    limpiarPagos();
    setError('');
    setErrorValidacion('');
    setMensaje('');
  };

  const seleccionarProducto = (id: number | '') => {
    setProductoInventariableId(id);
    setScan('');
    setCantidad('1');
    limpiarValidacionInventario();
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

  const handleValidarCantidad = async () => {
    const cantidadNumerica = Number(cantidad);
    if (productoInventariableId === '' || !Number.isInteger(cantidadNumerica) || cantidadNumerica <= 0) {
      setErrorValidacion('Ingrese una cantidad entera mayor a cero.');
      return;
    }
    setValidandoChips(true);
    limpiarValidacionInventario();
    try {
      const result = await faregasChipsApi.validarVentaDirecta(entradaVentaCantidad(Number(productoInventariableId), cantidadNumerica));
      setResultadoValidacion(result);
    } catch (e: unknown) {
      setErrorValidacion(e instanceof Error ? e.message : 'No se pudo validar el stock.');
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
      if (!validacionCompleta) throw new Error('Valide nuevamente el inventario antes de confirmar la venta.');
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
        email: normalizarEmail(email) || null,
        telefono: telefono.trim() || null,
        condicionPago,
        medioPago: pagosAgregados[0]?.tipo || 'EFECTIVO',
        pagosAgregados,
        ...(esCantidad
          ? { productoInventariableId: Number(productoInventariableId), cantidad: Number(cantidad) }
          : { chips: chipsValidados.map((item) => String(item.numeroChip)) })
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

  /**
   * Reintenta la emisión del MISMO comprobante ya reservado.
   *
   * No vuelve a enviar el formulario de venta: no revalida el chip, no crea
   * operación, ni pago, ni toca el inventario. El backend reutiliza la serie y
   * el número que ya están en fg_facturacion, así que BBB1-00000089 sigue
   * siendo BBB1-00000089 aunque vuelva a fallar.
   */
  const handleReintentarFacturacion = async () => {
    const operacionId = resultadoVenta?.operacionId;
    if (!operacionId || !esComprobanteReintentable(resultadoVenta?.facturacion)) return;

    const numero = resultadoVenta?.facturacion?.nroComprobante;
    const confirmacion = await Swal.fire({
      icon: 'question',
      title: 'Reintentar comprobante',
      html: `Se volverá a intentar emitir <b>${numero}</b>.<br>No se generará una nueva venta ni un nuevo número.`,
      showCancelButton: true,
      confirmButtonText: 'Reintentar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#052A79'
    });
    if (!confirmacion.isConfirmed) return;

    setReintentandoFacturacion(true);
    setError('');
    setMensaje('');
    try {
      const response = await faregasChipsApi.reintentarFacturacionOperacion(operacionId);
      const facturacion = response?.facturacion;
      if (!facturacion) throw new Error('La respuesta no incluyó el comprobante.');

      // Se reemplaza sólo el estado de la emisión; la venta y el pago no se
      // tocan porque no se vuelven a enviar.
      setResultadoVenta(prev => (prev ? { ...prev, facturacion, facturacionEstado: facturacion.estado } : prev));
      onVentaExitosa({ success: true, operacionId, operacionEstado: prevOperacionEstado(), facturacion, facturacionEstado: facturacion.estado });

      if (facturacion.estado === 'ACEPTADO') {
        setMensaje('COMPROBANTE EMITIDO CORRECTAMENTE');
      } else if (['PENDIENTE', 'PENDIENTE_SUNAT'].includes(facturacion.estado)) {
        setMensaje(`Comprobante ${facturacion.nroComprobante || numero} registrado y pendiente de SUNAT.`);
      } else {
        setError(
          facturacion.sunatDescription
            || `El comprobante ${facturacion.nroComprobante || numero} sigue en estado ${facturacion.estado}.`
        );
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo reintentar la emisión del comprobante.');
    } finally {
      setReintentandoFacturacion(false);
    }
  };

  const prevOperacionEstado = () => resultadoVenta?.operacionEstado || 'PAGADO';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-2 backdrop-blur-sm sm:p-4 lg:p-6">
      <div className="my-2 w-full max-w-[1400px] rounded-2xl bg-white shadow-xl sm:my-4">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:px-5">
          <h2 className="text-xl font-bold text-slate-900">Venta de inventario</h2>
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
              <div className="mt-1 flex gap-2">
                <input
                  value={nroDocumento}
                  onChange={e => setNroDocumento(e.target.value)}
                  inputMode="numeric"
                  maxLength={tipoDocumentoCliente === 'RUC' ? 11 : 8}
                  disabled={ventaRegistrada}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                />
                <button
                  type="button"
                  onClick={() => void buscarCliente()}
                  disabled={buscandoCliente || ventaRegistrada}
                  aria-busy={buscandoCliente}
                  title="Buscar cliente en el maestro"
                  className="flex shrink-0 items-center justify-center rounded-lg bg-slate-200 px-3 transition-colors hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Search className={`h-5 w-5 text-slate-600 ${buscandoCliente ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </label>
            {errorFiscalDocumento && <p className="text-sm font-bold text-red-600">{errorFiscalDocumento}</p>}

            <label className="block text-sm font-bold text-slate-700">Nombre / Razón Social
              <input value={nombreRazonSocial} maxLength={100} disabled={ventaRegistrada} onChange={e => setNombreRazonSocial(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100" />
            </label>

            <label className="block text-sm font-bold text-slate-700">Dirección fiscal
              <input value={direccion} maxLength={100} disabled={ventaRegistrada} onChange={e => setDireccion(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100" />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-700">Correo
                <input
                  type="email"
                  value={email}
                  disabled={ventaRegistrada}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="cliente@correo.com"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700">Teléfono
                <input
                  type="tel"
                  value={telefono}
                  maxLength={LIMITE_TELEFONO}
                  disabled={ventaRegistrada}
                  onChange={e => setTelefono(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                />
              </label>
            </div>
            {errorContactoActual && <p className="text-sm font-bold text-red-600">{errorContactoActual}</p>}
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-700 border-b pb-2">2. Productos a vender</h3>
            <label className="block text-sm font-bold text-slate-700">Producto
              <select value={productoInventariableId} disabled={ventaRegistrada} onChange={(event) => seleccionarProducto(event.target.value ? Number(event.target.value) : '')} className="mt-1 w-full rounded-lg border border-slate-300 p-2 disabled:bg-slate-100">
                <option value="">Seleccione un producto</option>
                {productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre} — {etiquetaControlInventario(producto.tipo)}</option>)}
              </select>
            </label>

            {esCantidad ? <>
              <p className="text-xs text-slate-500">Ingrese la cantidad. No se solicita ni se genera ningún serial.</p>
              <label className="block text-sm font-bold text-slate-700">Cantidad
                <input type="number" min="1" step="1" value={cantidad} disabled={validandoChips || loadingVenta || ventaRegistrada} onChange={(event) => { setCantidad(event.target.value); limpiarValidacionInventario(); }} className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-lg font-bold disabled:bg-slate-100" />
              </label>
              <div className="flex justify-end"><button type="button" onClick={() => void handleValidarCantidad()} disabled={!Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0 || validandoChips || loadingVenta || ventaRegistrada} className="rounded-lg bg-[#052A79] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{validandoChips ? 'VALIDANDO STOCK...' : 'VALIDAR STOCK'}</button></div>
            </> : <>
              <p className="text-xs text-slate-500">Escanee los códigos y presione VALIDAR CHIPS. Sólo el resultado del inventario habilita el pago.</p>
              <ChipScannerInput value={scan} onChange={handleScanChange} rows={5} disabled={validandoChips || loadingVenta || ventaRegistrada} ariaBusy={validandoChips} etiquetaValidos="Formato válido" />
              <div className="flex justify-end"><button type="button" onClick={() => void handleValidarChips()} disabled={parsed.validos.length === 0 || validandoChips || loadingVenta || ventaRegistrada} aria-busy={validandoChips} className="rounded-lg bg-[#052A79] px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-[#041e56] disabled:cursor-not-allowed disabled:opacity-50">{validandoChips ? 'VALIDANDO CHIPS...' : 'VALIDAR CHIPS'}</button></div>
            </>}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{esCantidad ? 'Cantidad válida:' : 'Chips válidos:'}</span>
                <span className="font-bold">{resultadoValidacion?.cantidadValidos ?? 0}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-slate-600">Total estimado:</span>
                <span className="font-bold text-[#052A79]">S/ {totalMonto.toFixed(2)}</span>
              </div>
            </div>

            {resultadoValidacion && (
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200" aria-live="polite">
                {resultadoValidacion.items.map((item, index) => (
                  <div key={item.numeroChip || `${item.productoInventariableId}-${index}`} className={`rounded-lg border p-3 ${item.validoParaVenta ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800">{item.numeroChip || item.productoNombre}</p>
                        <p className={`text-sm font-bold ${item.validoParaVenta ? 'text-emerald-700' : 'text-red-700'}`}>
                          {item.validoParaVenta ? '✓ Disponible' : `✕ ${item.motivo || 'No válido para la venta'}`}
                        </p>
                        {item.existe && (
                          <p className="text-xs text-slate-600">
                            {item.productoNombre || 'Producto no disponible'}{item.plantaNombre ? ` · ${item.plantaNombre}` : ''}
                            {item.cantidad != null ? ` · Cantidad ${item.cantidad} · Stock ${item.disponible ?? 0}` : ''}
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

        {/* Mientras no haya resultado, la barra de acción sigue cerrando el
            modal. Cuando el resultado aparece debajo, las esquinas pasan al
            bloque de resultado para que no quede un corte en medio. */}
        <div className={`flex flex-col-reverse justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row ${resultadoVenta ? '' : 'rounded-b-2xl'}`}>
          <button onClick={onClose} disabled={loadingVenta || validandoChips} className="w-full rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">Cancelar</button>
          <button
            onClick={() => void handleSubmit()}
            disabled={loadingVenta || validandoChips || ventaRegistrada || !validacionCompleta || !datosFiscalesValidos || !pagoCompleto}
            className="w-full rounded-lg bg-emerald-600 px-6 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {loadingVenta ? 'Procesando...' : 'Confirmar Venta y Emitir'}
          </button>
        </div>

        {/* El resultado de la emisión vive AQUÍ, al final del flujo y debajo del
            botón que lo produce. Antes se renderizaba dentro de la columna
            "2. Chips a vender", muy por encima del botón, así que tras emitir
            el usuario no veía nada cambiar: el resultado quedaba fuera de
            pantalla. Sólo se mueve en el DOM; la lógica de emisión y los
            reintentos son los mismos. */}
        {resultadoVenta && (
          <div
            ref={resultadoRef}
            aria-live="polite"
            className={`mx-4 mb-4 rounded-b-2xl border p-4 sm:mx-5 sm:mb-5 ${resultadoVenta.facturacionEstado === 'ACEPTADO' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}
          >
            <p className="font-bold text-slate-900">{resultadoVenta.facturacionEstado === 'ACEPTADO' ? 'COMPROBANTE EMITIDO CORRECTAMENTE' : 'RESULTADO DE LA EMISIÓN'}</p>
            {resultadoVenta.facturacion?.nroComprobante && <p className="mt-1 font-mono text-lg font-bold text-[#052A79]">{resultadoVenta.facturacion.nroComprobante}</p>}
            <p className="mt-1 text-sm text-slate-600">Operación #{resultadoVenta.operacionId} · Estado: {resultadoVenta.facturacionEstado}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {resultadoVenta.facturacion?.enlacePdf && (
                <a href={resultadoVenta.facturacion.enlacePdf} target="_blank" rel="noreferrer" className="inline-flex rounded-lg bg-[#052A79] px-3 py-2 text-xs font-bold text-white">VER COMPROBANTE</a>
              )}
              {esComprobanteReintentable(resultadoVenta?.facturacion) && (
                <button
                  type="button"
                  onClick={() => void handleReintentarFacturacion()}
                  disabled={reintentandoFacturacion}
                  aria-busy={reintentandoFacturacion}
                  title="Reintentar la emision de este comprobante sin generar otro numero"
                  className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {reintentandoFacturacion ? 'REINTENTANDO...' : 'REINTENTAR COMPROBANTE'}
                </button>
              )}
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">CERRAR</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
