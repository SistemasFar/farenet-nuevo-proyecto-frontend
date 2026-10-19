/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { maestrosApi, inspeccionesApi } from '@/services/api';
import { faregasCertificadosApi } from '../../services/faregas-certificados.api';
import { faregasClientesApi } from '../../services/faregas-clientes.api';
import { faregasPagosApi } from '../../services/faregas-pagos.api';
import Swal from 'sweetalert2';
import type { MaestrosCajaResponse, MaestrosPagoResponse, MaestrosVehiculoResponse } from '@/types/maestros';
import { CheckCircle2, FileText, CreditCard, ArrowLeft, Search, Loader2, Save, Eye } from 'lucide-react';
import { CajaStep } from './components/NuevoCertificado/CajaStep';
import { PagoStep } from './components/NuevoCertificado/PagoStep';
import { VehiculoStep } from './components/NuevoCertificado/VehiculoStep';
import { TallerStep } from './components/NuevoCertificado/TallerStep';
import { CertificateChipSection } from './components/NuevoCertificado/CertificateChipSection';
import type { FormularioFormatoDinamicoFaregas, ResumenComercialFaregas } from '../../types/faregas-api';
import type { TitularState } from './components/NuevoCertificado/TitularesList';
import { FacturacionEmisionStep } from './components/NuevoCertificado/FacturacionEmisionStep';
import { PrevisualizacionCertificadoStep } from './components/NuevoCertificado/PrevisualizacionCertificadoStep';
import type { TipoCertificadoFaregas } from '../../types/faregas';
import type { FacturacionFaregas, PasoBorradorFaregas } from '../../types/faregas-api';
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { MainLayoutContext } from '../Dashboard/MainLayout';
import { resolverCuotasCredito, validarDatosFacturacionCampos, validarDatosInicialesCampos, validarPasoPago, validarFormularioVehiculoVisible, validarFormularioFormatoDinamico } from './faregas-wizard.validation';
import { useErroresPaso } from './faregas-wizard-errores';
import { calcularMedioPago } from './faregas-facturacion.utils';
import { indicePasoVisual as indicePaso, puedeRetrocederWizard } from './faregas-emision';
import { manejarNavegacionFormulario, normalizarEnteroCertificado } from './faregas-formulario-operativo';
import { descargarComprobanteFaregas, descargarPdfNubefact } from '../../services/faregas-comprobante-visor.service';





export interface FormCajaState {
  tipoPlaca: string;
  placa: string;
  concepto: string;
  categoria: string;
  tipoInspeccion: string;
  tipoCertificado: string;
  modalidadCertificado: string;
  tipo_flujo: string;
  requiere_certificado: boolean;
  servicioCodigo: string;
  tarifaCodigo: string;
  tipoAutorizacion: string;
  descuentoObj?: { source_table: string; source_id: string; isCuponidad?: boolean; documentoBusqueda?: string; uuid?: string };
  nrodocumentoreinspeccion?: string;
}

export interface FormPagoState {
  importe: string;
  tarjetaKey: string;
  modalidadTarjeta?: '' | 'DEBITO' | 'CREDITO';
  entidadFinancieraKey: string;
  voucher?: string;
  nroOperacion?: string;
  fechaOperacion?: string;
  cuentaCorrienteKey?: string;
  fechaDeposito?: string;
}

export interface PagoAgregado extends FormPagoState {
  id?: number;
  tipo: 'EFECTIVO' | 'TARJETA' | 'BANCO';
}

export interface FormVehiculoState {
  clase: string; marca: string; modelo: string; version: string; carroceria: string; marcaCarroceria: string; placaNueva: string;
  anioFabricacion: string; anioModelo: string; vin: string; combustible: string; serieChasis: string; numeroMotor: string; color: string;
  numeroAsientos: string; numeroPasajeros: string; nroPisos: string; longitud: string; ancho: string; alto: string;
  pesoNeto: string; pesoBruto: string; cargaUtil: string; numeroCilindros: string; cilindrada: string;
  numeroRuedas: string; numeroEjes: string; potencia: string;
  nroSerie?: string; nroMotor?: string; nroAsientos?: string; nroPasajeros?: string; altura?: string;
  pesoSeco?: string; nroCilindros?: string; nroRuedas?: string; nroEjes?: string;
  formulaRodante?: string; nroPuertas: string; nroTubosEscape?: string; kilometraje: string; salidasEmergencia?: string;
  fechaEmisionSoat?: string; fechaVencimientoSoat?: string; aseguradora?: string; poliza?: string; useMtcParams?: boolean;
}

export interface FormFacturacionState {
  tipoDocFac: string; tipoDocumentoFac?: string; nroDocFac: string; razonSocialFac: string; nombresFac: string; apellidosFac: string;
  paisFac: string; departamentoFac: string; provinciaFac: string; distritoFac: string; direccionFac: string;
  emailFac: string; telefonoFac: string;
  usarTitularPrincipalFac: boolean;
  condicionPagoFac: 'CONTADO' | 'CREDITO'; fechaInicioCreditoFac: string; fechaVencimientoFac: string; medioPagoFac: string;
  cuotasFac: Array<{ numeroCuota: number; fechaPago: string; importe: string }>;
}

export interface FormVerificacionState {
  tipoInspeccion: string;
  tipoCertificado: string;
  tipoAutorizacion: string;
  linea?: string;
}

const textValue = (value: unknown) => value === null || value === undefined ? '' : String(value);
const fechaLocalIso = (fecha = new Date()) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};
const enteroValue = (value: unknown, maximoDigitos: number) =>
  normalizarEnteroCertificado(textValue(value), maximoDigitos);

const mapVehiculoBorrador = (vehiculo: any): Partial<FormVehiculoState> => ({
  placaNueva: textValue(vehiculo.placa),
  clase: textValue(vehiculo.clase),
  marca: textValue(vehiculo.marca),
  modelo: textValue(vehiculo.modelo),
  version: textValue(vehiculo.version),
  anioFabricacion: enteroValue(vehiculo.anio_fabricacion ?? vehiculo.anioFabricacion, 4),
  anioModelo: enteroValue(vehiculo.anio_modelo ?? vehiculo.anioModelo, 4),
  vin: textValue(vehiculo.vin),
  serieChasis: textValue(vehiculo.serie_chasis ?? vehiculo.serieChasis),
  numeroMotor: textValue(vehiculo.numero_motor ?? vehiculo.numeroMotor),
  combustible: textValue(vehiculo.combustible),
  color: textValue(vehiculo.color),
  carroceria: textValue(vehiculo.carroceria),
  marcaCarroceria: textValue(vehiculo.marca_carroceria ?? vehiculo.marcaCarroceria),
  numeroCilindros: enteroValue(vehiculo.numero_cilindros ?? vehiculo.numeroCilindros, 4),
  cilindrada: enteroValue(vehiculo.cilindrada, 5),
  numeroEjes: enteroValue(vehiculo.numero_ejes ?? vehiculo.numeroEjes, 4),
  numeroRuedas: enteroValue(vehiculo.numero_ruedas ?? vehiculo.numeroRuedas, 4),
  numeroAsientos: enteroValue(vehiculo.numero_asientos ?? vehiculo.numeroAsientos, 4),
  numeroPasajeros: enteroValue(vehiculo.numero_pasajeros ?? vehiculo.numeroPasajeros, 4),
  longitud: textValue(vehiculo.longitud),
  ancho: textValue(vehiculo.ancho),
  alto: textValue(vehiculo.alto),
  pesoNeto: enteroValue(vehiculo.peso_neto ?? vehiculo.pesoNeto, 6),
  pesoBruto: enteroValue(vehiculo.peso_bruto ?? vehiculo.pesoBruto, 6),
  cargaUtil: enteroValue(vehiculo.carga_util ?? vehiculo.cargaUtil, 6),
  potencia: textValue(vehiculo.potencia),
  formulaRodante: textValue(vehiculo.formula_rodante ?? vehiculo.formulaRodante),
  kilometraje: textValue(vehiculo.kilometraje),
  nroPuertas: textValue(vehiculo.nro_puertas ?? vehiculo.nroPuertas),
  nroPisos: textValue(vehiculo.nro_pisos ?? vehiculo.nroPisos),
  salidasEmergencia: textValue(vehiculo.salidas_emergencia ?? vehiculo.salidasEmergencia),
});

const generarIdTemporal = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const mapTitularBorrador = (titular: any): TitularState => ({
  _uuid: generarIdTemporal(),
  titularId: titular.id ? Number(titular.id) : null,
  orden: Number(titular.orden),
  clienteId: titular.cliente_id ? Number(titular.cliente_id) : null,
  tipoDocumento: textValue(titular.tipo_documento ?? titular.tipoDocumento) || 'DNI',
  nroDocumento: textValue(titular.nro_documento ?? titular.nroDocumento),
  nombreRazonSocial: textValue(titular.nombre_razon_social ?? titular.nombreRazonSocial),
  direccion: textValue(titular.direccion),
});

const mapVerificacionBorrador = (verificacion: any) => ({
  codigo: textValue(verificacion.codigo),
  orden: Number(verificacion.orden),
  descripcion: textValue(verificacion.descripcion),
  cumple: verificacion.cumple === null || verificacion.cumple === undefined ? null : Boolean(verificacion.cumple),
  observacion: textValue(verificacion.observacion),
});

export function NuevoCertificadoView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { plantaKey: plantaSeleccionada, plantaNombre } = useOutletContext<MainLayoutContext>();
  const { id } = useParams<{ id?: string }>();
  const [certificadoId, setCertificadoId] = useState<number | undefined>(id ? parseInt(id, 10) : undefined);

  const descargarPdfFaregas = async () => {
    if (!certificadoId) return;
    await descargarComprobanteFaregas(certificadoId);
  };

  const descargarPdfOficialNubefact = async () => {
    if (!certificadoId) return;
    await descargarPdfNubefact(certificadoId);
  };

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [furthestStepIndex, setFurthestStepIndex] = useState(0);
  const [minimumEditableStepIndex, setMinimumEditableStepIndex] = useState(0);
  const [certificadoEstado, setCertificadoEstado] = useState(id ? 'CARGANDO' : 'BORRADOR');
  const [numeroCertificadoOficial, setNumeroCertificadoOficial] = useState<string | null>(null);
  const soloLectura = new URLSearchParams(location.search).get('vista') === 'consulta' || certificadoEstado !== 'BORRADOR';
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState('');
  const autosaveQueueRef = React.useRef<Promise<void>>(Promise.resolve());
  const [maestros, setMaestros] = useState<MaestrosCajaResponse['data'] | null>(null);
  const [maestrosVehiculo, setMaestrosVehiculo] = useState<MaestrosVehiculoResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isConsultado, setIsConsultado] = useState(false);



  const [precioSubtotal, setPrecioSubtotal] = useState<number>(0);
  const [descuento, setDescuento] = useState<number>(0);
  const [precioTotal, setPrecioTotal] = useState<number>(0);
  const [resumenComercial, setResumenComercial] = useState<ResumenComercialFaregas | null>(null);

  const aplicarResumenComercial = (data: any) => {
    const resumen = data?.resumenComercial as ResumenComercialFaregas | undefined;
    if (resumen) {
      const normalizado: ResumenComercialFaregas = {
        precioCertificado: Number(resumen.precioCertificado || 0),
        descuentoCertificado: Number(resumen.descuentoCertificado || 0),
        certificadoNeto: Number(resumen.certificadoNeto || 0),
        requiereChip: Boolean(resumen.requiereChip),
        productoChipId: resumen.productoChipId ? Number(resumen.productoChipId) : null,
        precioChip: Number(resumen.precioChip || 0),
        importeTotal: Number(resumen.importeTotal || 0),
      };
      setResumenComercial(normalizado);
      setPrecioSubtotal(normalizado.precioCertificado);
      setDescuento(normalizado.descuentoCertificado);
      setPrecioTotal(normalizado.importeTotal);
      return;
    }
    const importe = Number(data?.orden?.importe_total ?? data?.importeTotal ?? 0);
    if (importe > 0) {
      setResumenComercial(null);
      setPrecioSubtotal(importe);
      setDescuento(0);
      setPrecioTotal(importe);
    }
  };



  // Form State (Caja)
  const [formCaja, setFormCaja] = useState<FormCajaState>({
    tipoPlaca: '',
    placa: '',
    concepto: '',
    categoria: '',
    tipoInspeccion: '',
    tipoCertificado: '',
    modalidadCertificado: '',
    tipo_flujo: '',
    requiere_certificado: true,
    servicioCodigo: '',
    tipoAutorizacion: '',
    tarifaCodigo: ''
  });

  // Pago State
  const [maestrosPago, setMaestrosPago] = useState<MaestrosPagoResponse['data'] | null>(null);
  const [pagosAgregados, setPagosAgregados] = useState<PagoAgregado[]>([]);
  const [pagoTab, setPagoTab] = useState<'EFECTIVO' | 'TARJETA' | 'BANCO'>('EFECTIVO');


  // Form State (Pago)
  const [formPago, setFormPago] = useState<FormPagoState>({
    importe: '',
    tarjetaKey: '',
    modalidadTarjeta: '',
    entidadFinancieraKey: '',
    cuentaCorrienteKey: '',
    nroOperacion: '',
    fechaDeposito: fechaLocalIso()
  });

  const [editingPagoIndex, setEditingPagoIndex] = useState<number | null>(null);

  // Form State (Vehículo)
  const [formPropietario, setFormPropietario] = useState<any>({});
  const [formGlp, setFormGlp] = useState<any>({});
  const [formGnv, setFormGnv] = useState<any>({});
  const [formConformidad, setFormConformidad] = useState<any>({});
  const [formatoFormulario, setFormatoFormulario] = useState<FormularioFormatoDinamicoFaregas | null>(null);
  const [formatoValores, setFormatoValores] = useState<Record<string, string>>({});
  const [formatoFormularioLoading, setFormatoFormularioLoading] = useState(false);
  const [formatoFormularioError, setFormatoFormularioError] = useState('');

  const [titulares, setTitulares] = useState<TitularState[]>([]);
  const [catalogoVerificaciones, setCatalogoVerificaciones] = useState<any>({});
  const [isEmitido, setIsEmitido] = useState(false);
  const [vehiculoOrigen, setVehiculoOrigen] = useState<'FARENET' | 'FAREGAS' | 'MIXTO' | 'BORRADOR' | 'MANUAL'>('MANUAL');
  const [expedienteError, setExpedienteError] = useState('');
  const [formVehiculo, setFormVehiculo] = useState<FormVehiculoState>({
    clase: '', marca: '', modelo: '', version: '', carroceria: '', marcaCarroceria: '', placaNueva: '',
    anioFabricacion: '', anioModelo: '', vin: '', combustible: '', serieChasis: '', numeroMotor: '', color: '',
    numeroAsientos: '', numeroPasajeros: '', nroPisos: '', longitud: '', ancho: '', alto: '',
    numeroEjes: '', numeroRuedas: '', numeroCilindros: '', cilindrada: '', pesoNeto: '', cargaUtil: '', pesoBruto: '', potencia: '',
    nroPuertas: '', salidasEmergencia: '', kilometraje: ''
  });

  // Form State (Facturación)
  const [formFacturacion, setFormFacturacion] = useState<FormFacturacionState>({
    tipoDocFac: '', tipoDocumentoFac: 'DNI', nroDocFac: '', razonSocialFac: '', nombresFac: '', apellidosFac: '',
    paisFac: '', departamentoFac: '', provinciaFac: '', distritoFac: '', direccionFac: '',
    emailFac: '', telefonoFac: '', usarTitularPrincipalFac: false,
    condicionPagoFac: 'CONTADO', fechaInicioCreditoFac: fechaLocalIso(), fechaVencimientoFac: '',
    medioPagoFac: '', cuotasFac: []
  });
  const [facturacion, setFacturacion] = useState<FacturacionFaregas | null>(null);
  const retrocesoBloqueadoPorEmision = !puedeRetrocederWizard(certificadoEstado, facturacion);
  const medioPagoCalculado = React.useMemo(
    () => calcularMedioPago(pagosAgregados),
    [pagosAgregados]
  );
  const cuotasCreditoResueltas = React.useMemo(
    () => resolverCuotasCredito({
      condicionPago: formFacturacion.condicionPagoFac,
      pagos: pagosAgregados,
      precioTotal,
      fechaVencimientoCredito: formFacturacion.fechaVencimientoFac,
      cuotas: formFacturacion.cuotasFac,
    }).map((cuota) => ({ ...cuota, importe: String(cuota.importe) })),
    [formFacturacion.condicionPagoFac, formFacturacion.cuotasFac, formFacturacion.fechaVencimientoFac, pagosAgregados, precioTotal]
  );

  const titularPrincipal = React.useMemo(
    () => [...titulares].sort((a, b) => a.orden - b.orden)[0] || null,
    [titulares]
  );

  useEffect(() => {
    if (!formFacturacion.usarTitularPrincipalFac || !titularPrincipal) return;

    const tipoComprobante = titularPrincipal.tipoDocumento === 'RUC' ? 'FACTURA' : 'BOLETA';
    const tipoDocumentoFac = String(titularPrincipal.tipoDocumento || 'DNI').trim().toUpperCase();

    // El documento, nombre y dirección deben reflejarse en el mismo clic. La
    // consulta remota sólo completa contacto y nunca bloquea el checkbox.
    setFormFacturacion((prev) => {
      const sincronizada = {
        ...prev,
        tipoDocFac: tipoComprobante,
        tipoDocumentoFac,
        nroDocFac: titularPrincipal.nroDocumento,
        razonSocialFac: titularPrincipal.nombreRazonSocial,
        direccionFac: titularPrincipal.direccion,
        condicionPagoFac: tipoComprobante === 'BOLETA' ? 'CONTADO' : prev.condicionPagoFac,
        fechaVencimientoFac: tipoComprobante === 'BOLETA' ? '' : prev.fechaVencimientoFac,
        cuotasFac: tipoComprobante === 'BOLETA' ? [] : prev.cuotasFac,
      };
      const sinCambios = prev.tipoDocFac === sincronizada.tipoDocFac
        && prev.tipoDocumentoFac === sincronizada.tipoDocumentoFac
        && prev.nroDocFac === sincronizada.nroDocFac
        && prev.razonSocialFac === sincronizada.razonSocialFac
        && prev.direccionFac === sincronizada.direccionFac;
      return sinCambios ? prev : sincronizada;
    });

    let activo = true;
    const sincronizarContacto = async () => {
      if (!titularPrincipal.nroDocumento) return;
      try {
        const response = await faregasClientesApi.autocompletarPersona(
          titularPrincipal.tipoDocumento,
          titularPrincipal.nroDocumento
        );
        const persona = response?.data;
        if (!activo || !persona) return;
        const emailFac = persona.correo || persona.email || '';
        const telefonoFac = persona.telefono || '';
        if (!emailFac && !telefonoFac) return;
        setFormFacturacion((prev) => ({
          ...prev,
          emailFac: emailFac || prev.emailFac,
          telefonoFac: telefonoFac || prev.telefonoFac,
        }));
      } catch {
        // Los datos básicos ya quedaron sincronizados; el contacto puede
        // completarse manualmente cuando la consulta no responde.
      }
    };

    void sincronizarContacto();
    return () => {
      activo = false;
    };
  }, [formFacturacion.usarTitularPrincipalFac, titularPrincipal]);

  const construirPayloadFacturacion = (cuotas = formFacturacion.cuotasFac) => {
    const tipoComprobante = formFacturacion.tipoDocFac || 'BOLETA';
    const condicionPago = tipoComprobante === 'BOLETA' ? 'CONTADO' : formFacturacion.condicionPagoFac;
    return ({
    tipoComprobante,
    tipoDocumentoCliente: formFacturacion.tipoDocumentoFac || (formFacturacion.nroDocFac.length === 11 ? 'RUC' : 'DNI'),
    nroDocumento: formFacturacion.nroDocFac,
    nombreRazonSocial: formFacturacion.razonSocialFac,
    direccion: formFacturacion.direccionFac,
    email: formFacturacion.emailFac || null,
    telefono: formFacturacion.telefonoFac || null,
    condicionPago,
    fechaInicioCredito: condicionPago === 'CREDITO' ? formFacturacion.fechaInicioCreditoFac : null,
    fechaVencimiento: condicionPago === 'CREDITO' ? (formFacturacion.fechaVencimientoFac || null) : null,
    medioPago: medioPagoCalculado || null,
    cuotas: condicionPago === 'CREDITO' ? cuotas : [],
    facturarAlDuenoPrincipal: formFacturacion.usarTitularPrincipalFac,
    });
  };



  const plantaAnterior = React.useRef(plantaSeleccionada);
  useEffect(() => {
    if (plantaAnterior.current && plantaAnterior.current !== plantaSeleccionada) {
      setFormCaja((actual) => ({
        ...actual,
        servicioCodigo: '',
        tarifaCodigo: '',
        tipoCertificado: '',
        modalidadCertificado: '',
      }));
      setPrecioSubtotal(0);
      setPrecioTotal(0);
    }
    plantaAnterior.current = plantaSeleccionada;
  }, [plantaSeleccionada]);

  const STEPS = React.useMemo(() => {
    return [
      { id: 'datos_iniciales', label: 'Datos Iniciales', icon: FileText },
      { id: 'vehiculo', label: formCaja.tipo_flujo === 'TALLER_INSPECCION' ? 'Datos del Taller' : 'Vehículo y Datos Técnicos', icon: Search },
      { id: 'previsualizacion', label: 'Previsualización del Certificado', icon: Eye },
      { id: 'pago', label: 'Pago', icon: CreditCard },
      { id: 'facturacion', label: 'Facturación y Emisión', icon: CheckCircle2 }
    ];
  }, [formCaja.tipo_flujo]);

  const persistirPaso = async (idBorrador: number, paso: PasoBorradorFaregas) => {
    await faregasCertificadosApi.actualizarPasoBorrador(idBorrador, paso);
  };



  const mostrarErroresPaso = (errores: string[]) => {
    if (errores.length === 0) return false;
    Swal.fire({
      icon: 'warning',
      title: 'Complete este paso',
      html: `<div style="text-align:left"><ul>${errores.map(error => `<li style="margin-bottom:6px">• ${error}</li>`).join('')}</ul></div>`,
      confirmButtonColor: '#052a79',
    });
    return true;
  };

  /**
   * Bloquea el avance de un paso marcando cada campo que falta. El resumen en
   * Swal se conserva como ayuda, pero la información principal queda en el
   * propio control: borde rojo y mensaje debajo, y el foco va al primer fallo.
   */
  const {
    errores,
    registrar: registrarErrores,
    limpiarCampo: limpiarErrorCampo,
    limpiarTodo: limpiarErroresPaso,
    enfocarPrimerError,
  } = useErroresPaso();

  const bloquearPaso = (erroresCampo: Record<string, string>) => {
    if (registrarErrores(erroresCampo)) {
      enfocarPrimerError();
      Swal.fire({
        icon: 'warning',
        title: 'Complete los campos obligatorios',
        text: 'Los campos marcados en rojo deben corregirse para continuar.',
        confirmButtonColor: '#052a79',
      });
      return true;
    }
    limpiarErroresPaso();
    return false;
  };



  useEffect(() => {
    // Cleanup de notificaciones flotantes (SweetAlert2 toasts) al desmontar la vista
    return () => {
      Swal.close();
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStepIndex]);



  useEffect(() => {
    const cargarBorrador = async () => {
      if (!certificadoId) return;
      try {
        setLoading(true);
        const res = await faregasCertificadosApi.obtenerBorradorCompleto(certificadoId);
        if (res?.data) {
          // Hidratar estado del borrador
          setCertificadoEstado(res.data.estado || 'BORRADOR');
          setNumeroCertificadoOficial(res.data.numeroCertificado || res.data.numero_certificado || null);
          setIsEmitido(res.data.estado === 'EMITIDO');
          if (res.data.tipo?.clave) {
            setFormCaja(prev => ({
              ...prev,
              tipoCertificado: res.data.tipo.clave,
              tarifaCodigo: res.data.tarifaCodigo || prev.tarifaCodigo,
              servicioCodigo: res.data.servicio?.codigo || prev.servicioCodigo,
              concepto: res.data.servicio?.nombre || prev.concepto,
              modalidadCertificado: res.data.servicio?.modalidad || prev.modalidadCertificado,
              tipo_flujo: res.data.servicio?.tipoFlujo || prev.tipo_flujo,
              placa: res.data.vehiculo?.placa || prev.placa,
              categoria: res.data.vehiculo?.categoria || prev.categoria,
            }));
          }

          if (res.data.formatoFormulario?.motor === 'HTML_DINAMICO') {
            setFormatoFormulario(res.data.formatoFormulario as FormularioFormatoDinamicoFaregas);
            setFormatoValores(res.data.formatoFormulario.valores || {});
            setFormatoFormularioError('');
          }

          if (res.data.vehiculo && (res.data.vehiculo.marca || res.data.vehiculo.clase || res.data.vehiculo.modelo || res.data.vehiculo.vin)) {
            setFormVehiculo(prev => ({ ...prev, ...mapVehiculoBorrador(res.data.vehiculo) }));
            setVehiculoOrigen('BORRADOR');
          }
          const titularesCargados = res.data.titulares
            ? res.data.titulares.map(mapTitularBorrador)
            : [];
          if (res.data.titulares) setTitulares(titularesCargados);

          const pagosDetalle = await faregasCertificadosApi.obtenerPagos(certificadoId);
          aplicarResumenComercial(pagosDetalle.data);
          setFormFacturacion((prev) => ({
            ...prev,
            condicionPagoFac: pagosDetalle.data?.condicionPago || prev.condicionPagoFac,
            fechaInicioCreditoFac: String(pagosDetalle.data?.fechaInicioCredito || prev.fechaInicioCreditoFac || fechaLocalIso()).slice(0, 10),
            fechaVencimientoFac: String(pagosDetalle.data?.fechaVencimientoCredito || prev.fechaVencimientoFac || '').slice(0, 10),
          }));
          setPagosAgregados((pagosDetalle.data?.pagos || []).map((pago: any) => ({
            id: pago.id,
            tipo: String(pago.tipoContadoKey || '').toUpperCase(),
            importe: Number(pago.importe).toFixed(2),
            tarjetaKey: pago.tarjetaKey || '',
            modalidadTarjeta: pago.modalidadTarjeta || '',
            nroOperacion: pago.nroOperacionBanco || pago.nroOperacionTarjeta || '',
            cuentaCorrienteKey: pago.cuentaCorrienteKey || '',
            entidadFinancieraKey: pago.entidadFinancieraKey || '',
            fechaDeposito: textValue(pago.fechdeposito).slice(0, 10),
          })));

          try {
            const facturacionRes = await faregasCertificadosApi.obtenerFacturacion(certificadoId);
            const fac = facturacionRes.data?.facturacion;
            if (fac) {
              setFormFacturacion(prev => ({
                ...prev,
                tipoDocFac: fac.tipoComprobante || 'BOLETA',
                tipoDocumentoFac: fac.tipoDocumentoCliente || (String(fac.nroDocumento || '').length === 11 ? 'RUC' : 'DNI'),
                nroDocFac: fac.nroDocumento || '',
                razonSocialFac: fac.nombreRazonSocial || '',
                direccionFac: fac.direccion || '',
                emailFac: fac.email || '',
                telefonoFac: fac.telefono || '',
                // Es una decisión persistida del operador; nunca se infiere
                // comparando documento o nombre con el titular.
                usarTitularPrincipalFac: fac.facturarAlDuenoPrincipal === true,
                condicionPagoFac: fac.tipoComprobante === 'BOLETA' ? 'CONTADO' : (fac.condicionPago || 'CONTADO'),
                fechaInicioCreditoFac: String(fac.fechaInicioCredito || prev.fechaInicioCreditoFac || fechaLocalIso()).slice(0, 10),
                fechaVencimientoFac: fac.tipoComprobante === 'BOLETA' ? '' : String(fac.fechaVencimiento || '').slice(0, 10),
                medioPagoFac: fac.medioPago || '',
                cuotasFac: fac.tipoComprobante === 'BOLETA' ? [] : (fac.cuotas || []).map((cuota: any) => ({
                  numeroCuota: Number(cuota.numeroCuota),
                  fechaPago: String(cuota.fechaPago || '').slice(0, 10),
                  importe: String(cuota.importe)
                }))
              }));
              setFacturacion(fac);
            }
          } catch (e) {
            console.log('Borrador sin facturacion guardada');
          }

          if (res.data.tipo?.clave === 'GNV_ANUAL') {
            const detalle = await faregasCertificadosApi.obtenerGnv(certificadoId);
            const gnv = detalle.data?.gnv;
            if (gnv) {
              setFormCaja(prev => ({ ...prev, modalidadCertificado: gnv.modalidad || '' }));
              setFormGnv({
                tallerAutorizadoId: gnv.taller_autorizado_id || '',
                fechaVigencia: textValue(gnv.vigencia_hasta).slice(0, 10),
                modalidad: gnv.modalidad || '',
                numeroChip: gnv.numero_chip || '',
                observaciones: gnv.observaciones || '',
                // Características después de la conversión (sólo INICIAL).
                combustiblePosterior: gnv.combustible_posterior || '',
                pesoNetoPosterior: enteroValue(gnv.peso_neto_posterior, 6),
                componentes: (detalle.data?.componentes || []).map((componente: any) => {
                  const capRaw = String(componente.capacidad_litros ?? '').trim();
                  const esNoAplica = capRaw.toUpperCase() === 'NO APLICA';
                  return {
                    orden: Number(componente.orden),
                    componente: componente.componente,
                    marca: componente.marca || '',
                    modelo: componente.modelo || '',
                    capacidadLitros: esNoAplica ? 'NO APLICA' : (enteroValue(componente.capacidad_litros, 5) || ''),
                    modoCapacidad: esNoAplica ? 'NO_APLICA' : 'VALOR',
                    mesFabricacion: textValue(componente.mes_fabricacion),
                    anioFabricacion: enteroValue(componente.anio_fabricacion, 4),
                    numeroSerie: componente.numero_serie || '',
                  };
                }),
                verificaciones: (detalle.data?.verificaciones || []).map(mapVerificacionBorrador),
              });
            }
          } else if (res.data.tipo?.clave === 'GLP_ANUAL') {
            const detalle = await faregasCertificadosApi.obtenerGlp(certificadoId);
            const glp = detalle.data?.glp;
            if (glp) {
              setFormCaja(prev => ({ ...prev, modalidadCertificado: glp.modalidad || '' }));
              setFormGlp({
                tallerAutorizadoId: glp.taller_autorizado_id || '',
                fechaVigencia: textValue(glp.vigencia_hasta).slice(0, 10),
                expedienteTecnico: glp.expediente_tecnico || '',
                modalidad: glp.modalidad || '',
                combustiblePosterior: glp.combustible_posterior || '',
                pesoNetoPosterior: enteroValue(glp.peso_neto_posterior, 6),
                cargaUtilPosterior: enteroValue(glp.carga_util_posterior, 6),
                componentes: (detalle.data?.componentes || []).map((componente: any) => ({
                  orden: Number(componente.orden),
                  componente: componente.componente,
                  marca: componente.marca || '',
                  modelo: componente.modelo || '',
                  capacidadLitros: enteroValue(componente.capacidad_litros, 5),
                  mesFabricacion: textValue(componente.mes_fabricacion),
                  anioFabricacion: enteroValue(componente.anio_fabricacion, 4),
                  numeroSerie: componente.numero_serie || '',
                })),
                verificaciones: (detalle.data?.verificaciones || []).map(mapVerificacionBorrador),
              });
            }
          } else if (res.data.tipo?.clave === 'CONFORMIDAD') {
            const detalle = await faregasCertificadosApi.obtenerConformidad(certificadoId);
            const conformidad = detalle.data?.conformidad;
            if (conformidad) {
              setFormConformidad({
                tipoConformidad: conformidad.tipo_conformidad || '',
                tipoTramite: conformidad.tipo_tramite || '',
                caracteristicaRegistrable: conformidad.caracteristica_registrable || '',
                motivo: conformidad.motivo || '',
                descripcion: conformidad.descripcion || '',
                usoOriginalVehiculo: conformidad.uso_original_vehiculo || '',
              });
            }
          }

          const pasoRecuperado = indicePaso(res.data.pasoActual);
          setCurrentStepIndex(res.data.estado === 'BORRADOR' && new URLSearchParams(location.search).get('vista') !== 'consulta' ? pasoRecuperado : indicePaso('VERIFICACION_EMISION'));
          setFurthestStepIndex(pasoRecuperado);
          // Un borrador sigue siendo editable aunque haya llegado al último
          // paso. El bloqueo real se decide con los estados de emisión.
          setMinimumEditableStepIndex(0);
          setIsConsultado(true);
          setLastSavedAt(res.data.fechaActualizacion ? new Date(res.data.fechaActualizacion) : new Date());
          setSaveError('');
        }
      } catch (error) {
        console.error("Error al cargar borrador FAREGAS:", error);
        setError('No se pudo cargar el registro. Vuelva al inicio e inténtelo de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    cargarBorrador();
  }, [certificadoId, location.search]);

  const cargarMaestros = async () => {
    try {
      setLoading(true);
      const res = await maestrosApi.obtenerMaestrosCajaAsync();
      setMaestros(res.data);
    } catch (err: any) {
      setError(err.message || 'Error cargando maestros de caja');
    } finally {
      setLoading(false);
    }
  };

  const cargarMaestrosPago = async () => {
    try {
      setLoading(true);
      const res = await faregasPagosApi.obtenerMaestros();
      setMaestrosPago(res.data);
    } catch (err: any) {
      setError(err.message || 'Error cargando maestros de pago');
    } finally {
      setLoading(false);
    }
  };

  const cargarMaestrosVehiculo = async () => {
    try {
      setLoading(true);
      setExpedienteError('');
      const [maestrosResponse, verificacionesResponse] = await Promise.all([
        maestrosApi.obtenerMaestrosVehiculoAsync(),
        faregasCertificadosApi.obtenerCatalogoVerificaciones(),
      ]);
      setMaestrosVehiculo(maestrosResponse.data);
      setCatalogoVerificaciones(verificacionesResponse.data ?? verificacionesResponse);
    } catch (err: any) {
      const message = err.message || 'No se pudieron cargar los catálogos del expediente técnico';
      setExpedienteError(message);
      Swal.fire('Error de carga', message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const cargarFormularioFormato = async (idBorrador: number) => {
    try {
      setFormatoFormularioLoading(true);
      setFormatoFormularioError('');
      const respuesta = await faregasCertificadosApi.obtenerBorradorCompleto(idBorrador);
      const formulario = respuesta.data?.formatoFormulario as FormularioFormatoDinamicoFaregas | null;
      if (!formulario || formulario.motor !== 'HTML_DINAMICO') {
        setFormatoFormulario(null);
        setFormatoFormularioError('El servicio seleccionado no tiene una versión HTML con variables para construir este formulario.');
        return;
      }
      setFormatoFormulario(formulario);
      setFormatoValores(formulario.valores || {});
    } catch (err: any) {
      setFormatoFormularioError(err.message || 'No se pudo leer el formato del certificado.');
    } finally {
      setFormatoFormularioLoading(false);
    }
  };

  useEffect(() => {
    if ((currentStepIndex === indicePaso('DATOS_INICIALES') || (currentStepIndex === indicePaso('VEHICULO') && formCaja.tipo_flujo !== 'TALLER_INSPECCION')) && !maestros) {
      cargarMaestros();
    } else if (currentStepIndex === indicePaso('PAGO') && !maestrosPago) {
      cargarMaestrosPago();
    } else if (currentStepIndex === indicePaso('VEHICULO') && formCaja.tipo_flujo !== 'TALLER_INSPECCION' && !maestrosVehiculo) {
      cargarMaestrosVehiculo();
    }
  }, [currentStepIndex, maestros, maestrosPago, maestrosVehiculo, formCaja.tipo_flujo]);

  useEffect(() => {
    if (currentStepIndex !== indicePaso('VEHICULO') || formCaja.tipo_flujo !== 'TALLER_INSPECCION' || !certificadoId || formatoFormulario) return;
    void cargarFormularioFormato(certificadoId);
  }, [currentStepIndex, formCaja.tipo_flujo, certificadoId, formatoFormulario]);

  // Sincronizar Marca con Marca Carrocería
  useEffect(() => {
    if (formVehiculo.marca && maestrosVehiculo?.marcas) {
      const selectedMarca = maestrosVehiculo.marcas.find((m: any) => m.key === formVehiculo.marca);
      if (selectedMarca && formVehiculo.marcaCarroceria !== selectedMarca.nombre) {
        setFormVehiculo((prev: any) => ({
          ...prev,
          marcaCarroceria: selectedMarca.nombre
        }));
      }
    }
  }, [formVehiculo.marca, formVehiculo.marcaCarroceria, maestrosVehiculo]);

  // Sincronizar Marca con Marca Carrocería









  const consultarVehiculoFarenet = async (excludeCertificadoId?: number | null) => {
    if (!formCaja.placa.trim()) return;
    try {
      const response = await faregasCertificadosApi.obtenerVehiculo(formCaja.placa.trim(), excludeCertificadoId, formCaja.tipoCertificado);
      if (response?.data) {
        const placaEncontrada = textValue(response.data.placa) || formCaja.placa.trim().toUpperCase();
        const categoriaEncontrada = textValue(response.data.categoriaKey ?? response.data.categoria);
        setFormVehiculo(prev => ({ ...prev, ...mapVehiculoBorrador(response.data), placaNueva: placaEncontrada }));
        setFormCaja((prev: any) => ({
          ...prev,
          placa: placaEncontrada,
          categoria: categoriaEncontrada || prev.categoria,
        }));
        const origen = response.data.origen;
        setVehiculoOrigen(origen === 'FAREGAS' || origen === 'MIXTO' ? origen : 'FARENET');

        if (response.data.titularesFaregas && response.data.titularesFaregas.length > 0) {
          setTitulares(response.data.titularesFaregas.map((t: any) => mapTitularBorrador({ ...t, id: null })));
        }
        if (response.data.glpFaregas) {
          const glp = response.data.glpFaregas;
          setFormGlp((prev: any) => ({
            ...prev,
            tallerAutorizadoId: glp.taller_autorizado_id || prev.tallerAutorizadoId,
            fechaVigencia: textValue(glp.vigencia_hasta).slice(0, 10) || prev.fechaVigencia,
            expedienteTecnico: glp.expediente_tecnico || prev.expedienteTecnico,
            componentes: (glp.componentes || []).map((componente: any) => ({
              orden: Number(componente.orden),
              componente: componente.componente,
              marca: componente.marca || '',
              modelo: componente.modelo || '',
              capacidadLitros: enteroValue(componente.capacidad_litros, 5),
              mesFabricacion: componente.mes_fabricacion || '',
              anioFabricacion: enteroValue(componente.anio_fabricacion, 4),
              numeroSerie: componente.numero_serie || '',
            })),
            verificaciones: (glp.verificaciones || []).map((v: any) => ({
              preguntaId: v.pregunta_id,
              codigo: v.codigo,
              orden: v.orden,
              descripcion: v.descripcion,
              cumple: v.cumple,
              observacion: v.observacion
            }))
          }));
        }
        if (response.data.gnvFaregas) {
          const gnv = response.data.gnvFaregas;
          setFormGnv((prev: any) => ({
            ...prev,
            tallerAutorizadoId: gnv.taller_autorizado_id || prev.tallerAutorizadoId,
            fechaVigencia: textValue(gnv.vigencia_hasta).slice(0, 10) || prev.fechaVigencia,
            // Si el backend devuelve NULL no se pisa lo que el operador ya
            // escribió en pantalla; sólo se hidrata cuando hay valor guardado.
            observaciones: gnv.observaciones || prev.observaciones || '',
            // Igual que observaciones: un NULL del servidor no borra la
            // pantalla. El peso es numérico en BD, de ahí el ?? ''.
            combustiblePosterior: gnv.combustible_posterior || prev.combustiblePosterior || '',
            pesoNetoPosterior: gnv.peso_neto_posterior == null
              ? prev.pesoNetoPosterior ?? ''
              : enteroValue(gnv.peso_neto_posterior, 6),
            expedienteTecnico: gnv.expediente_tecnico || prev.expedienteTecnico,
            componentes: (gnv.componentes || []).map((componente: any) => ({
              orden: Number(componente.orden),
              componente: componente.componente,
              marca: componente.marca || '',
              modelo: componente.modelo || '',
              capacidadLitros: enteroValue(componente.capacidad_litros, 5),
              mesFabricacion: componente.mes_fabricacion || '',
              anioFabricacion: enteroValue(componente.anio_fabricacion, 4),
              numeroSerie: componente.numero_serie || '',
            })),
            cilindros: (gnv.cilindros || []).map((cilindro: any) => ({
              orden: Number(cilindro.orden),
              marca: cilindro.marca || '',
              mesFabricacion: cilindro.mes_fabricacion || '',
              anioFabricacion: enteroValue(cilindro.anio_fabricacion, 4),
              numeroSerie: cilindro.numero_serie || '',
              capacidadLitros: enteroValue(cilindro.capacidad_litros, 5),
              pesoVacio: cilindro.peso_vacio || '',
            })),
            verificaciones: (gnv.verificaciones || []).map((v: any) => ({
              preguntaId: v.pregunta_id,
              codigo: v.codigo,
              orden: v.orden,
              descripcion: v.descripcion,
              cumple: v.cumple,
              observacion: v.observacion
            }))
          }));
        }

        if (response.data.conformidadFaregas) {
          const conformidad = response.data.conformidadFaregas;
          const tieneValor = (value) =>
            value !== null &&
            value !== undefined &&
            (typeof value !== 'string' || value.trim() !== '');

          setFormConformidad((prev) => ({
            ...prev,
            tipoConformidad: tieneValor(conformidad.tipo_conformidad) ? conformidad.tipo_conformidad : prev.tipoConformidad,
            tipoTramite: tieneValor(conformidad.tipo_tramite) ? conformidad.tipo_tramite : prev.tipoTramite,
            caracteristicaRegistrable: tieneValor(conformidad.caracteristica_registrable) ? conformidad.caracteristica_registrable : prev.caracteristicaRegistrable,
            motivo: tieneValor(conformidad.motivo) ? conformidad.motivo : prev.motivo,
            usoOriginalVehiculo: tieneValor(conformidad.uso_original_vehiculo) ? conformidad.uso_original_vehiculo : prev.usoOriginalVehiculo,
            descripcion: tieneValor(conformidad.descripcion) ? conformidad.descripcion : prev.descripcion,
          }));
        }

        Swal.fire({
          icon: 'success',
          title: 'Vehículo encontrado',
          text: origen === 'FAREGAS'
            ? 'Los datos se recuperaron desde Faregas y pueden editarse.'
            : origen === 'MIXTO'
              ? 'Los datos de Faregas se completaron con información disponible en Farenet.'
              : 'Los datos se autocompletaron desde Farenet y pueden editarse.',
          timer: 1800,
          showConfirmButton: false,
        });
      }
    } catch (e: any) {
      setVehiculoOrigen('MANUAL');
      if (e.status !== 404) {
        Swal.fire({
          icon: 'warning',
          title: 'Consulta no disponible',
          text: 'El borrador fue creado. Puede completar los datos del vehículo manualmente.',
        });
      }
    }
  };

  const consultarDatosIniciales = async () => {
    if (bloquearPaso(validarDatosInicialesCampos(formCaja))) return;

    setIsSavingStep(true);
    setSaveError('');
    try {
      let idBorrador = certificadoId;
      if (!idBorrador) {
        const response = await faregasCertificadosApi.crearBorrador({
          tipoCertificadoClave: formCaja.tipoCertificado,
          tarifaCodigo: formCaja.tarifaCodigo,
          placa: formCaja.placa,
          categoria: formCaja.categoria,
          observaciones: '',
        });
        idBorrador = Number(response?.data?.id);
        if (!idBorrador) throw new Error('El servidor no devolvió el identificador del borrador.');
        setCertificadoId(idBorrador);
        navigate(`/faregas/certificados/${idBorrador}/continuar`, { replace: true });
      } else {
        await faregasCertificadosApi.actualizarBorrador(idBorrador, { tarifaCodigo: formCaja.tarifaCodigo });
        await faregasCertificadosApi.guardarVehiculoBorrador(idBorrador, {
          placa: formCaja.placa,
          categoria: formCaja.categoria,
        });
      }

      await consultarVehiculoFarenet(idBorrador);
      const tarifaResponse = await faregasCertificadosApi.obtenerPagos(idBorrador);
      aplicarResumenComercial(tarifaResponse.data);
      setCurrentStepIndex(indicePaso('DATOS_INICIALES'));
      setFurthestStepIndex((actual) => Math.max(actual, indicePaso('DATOS_INICIALES')));
      setIsConsultado(true);
      setLastSavedAt(new Date());
    } catch (e: any) {
      setIsConsultado(false);
      setSaveError(e.message || 'No se pudieron consultar los datos iniciales.');
      if (e.codigo === 'CONFIGURACION_CHIP_INCOMPLETA') {
        const productoChipId = Number(e.detalles?.productoChipId || 0);
        const resultado = await Swal.fire({
          icon: 'warning',
          title: 'Falta configurar la facturación del chip',
          html: '<p>El serial del chip se escaneará después, en la sección de datos del taller.</p><p style="margin-top:8px">Para continuar ahora, vincule el <b>producto fiscal que facturará el chip</b> en la sede actual.</p>',
          showCancelButton: true,
          confirmButtonText: 'Configurar producto fiscal',
          cancelButtonText: 'Cerrar',
          confirmButtonColor: '#052A79',
        });
        if (resultado.isConfirmed) {
          const productoParam = productoChipId ? `&producto=${productoChipId}` : '';
          navigate(`/faregas/chips?tab=productos${productoParam}`);
        }
        return;
      }
      Swal.fire('No se pudo consultar', e.message || 'Revise los datos ingresados.', 'error');
    } finally {
      setIsSavingStep(false);
    }
  };

  const asegurarClienteFaregas = async (titular: TitularState) => {
    if (titular.clienteId) return titular.clienteId;
    if (!titular.tipoDocumento || !titular.nroDocumento) return null;

    try {
      const response = await faregasClientesApi.crearCliente({
        tipoDocumento: titular.tipoDocumento,
        nroDocumento: titular.nroDocumento,
        nombreRazonSocial: titular.nombreRazonSocial,
        direccion: titular.direccion,
      });
      return Number(response.data.id);
    } catch (e: any) {
      if (e.status !== 409) throw e;
      const existente = await faregasClientesApi.autocompletarPersona(titular.tipoDocumento, titular.nroDocumento);
      if (existente?.data?.origen === 'FAREGAS' && existente.data.id) return Number(existente.data.id);
      throw e;
    }
  };

  const guardarTitularesBorrador = async (idBorrador: number) => {
    const incompleto = titulares.find(t => !t.nombreRazonSocial.trim());
    if (incompleto) throw new Error(`Complete el nombre o razón social del titular de orden ${incompleto.orden}.`);

    let huboCambios = false;
    const guardados: TitularState[] = [];
    
    for (const titular of titulares) {
      const clienteId = await asegurarClienteFaregas(titular);
      const data = {
        clienteId,
        orden: titular.orden,
        tipoDocumento: titular.tipoDocumento || null,
        nroDocumento: titular.nroDocumento || null,
        nombreRazonSocial: titular.nombreRazonSocial.trim(),
        direccion: titular.direccion || null,
      };

      if (titular.titularId) {
        await faregasCertificadosApi.actualizarTitular(idBorrador, titular.titularId, data);
        if (titular.clienteId !== clienteId) {
          guardados.push({ ...titular, clienteId });
          huboCambios = true;
        } else {
          guardados.push(titular);
        }
      } else {
        const response = await faregasCertificadosApi.crearTitular(idBorrador, data);
        guardados.push({ ...titular, clienteId, titularId: Number(response.data.id) });
        huboCambios = true;
      }
    }
    
    if (huboCambios) {
      setTitulares(guardados);
    }

    // fg_certificado_titular guarda el snapshot de TODOS los dueños; el
    // certificado se enlaza al maestro a través del principal (el de menor
    // `orden`, que es la misma definición que usa titularPrincipal). Así
    // fg_certificado.cliente_id deja de quedar NULL y las operaciones
    // comerciales del certificado heredan la relación desde
    // faregas-pagos.service.js, que ya copia este valor.
    const principal = [...guardados].sort((a, b) => a.orden - b.orden)[0];
    if (principal?.clienteId) {
      await faregasCertificadosApi.actualizarBorrador(idBorrador, {
        clienteId: principal.clienteId
      });
    }
  };

  const guardarExpedienteTecnico = async (idBorrador: number, confirmarMaestro = false) => {
    const guardarVehiculo = confirmarMaestro
      ? faregasCertificadosApi.confirmarVehiculoBorrador
      : faregasCertificadosApi.guardarVehiculoBorrador;
    await guardarVehiculo(idBorrador, {
      placa: formCaja.placa || formVehiculo.placaNueva || null,
      categoria: formCaja.categoria || null,
      clase: formVehiculo.clase || null,
      marca: formVehiculo.marca || null,
      modelo: formVehiculo.modelo || null,
      version: formVehiculo.version || null,
      anioFabricacion: normalizarEnteroCertificado(formVehiculo.anioFabricacion, 4) || null,
      anioModelo: normalizarEnteroCertificado(formVehiculo.anioModelo, 4) || null,
      vin: formVehiculo.vin || formVehiculo.serieChasis || null,
      serieChasis: formVehiculo.serieChasis || (formCaja.tipoCertificado !== 'CONFORMIDAD' ? formVehiculo.vin : null) || null,
      numeroMotor: formVehiculo.numeroMotor || null,
      combustible: formVehiculo.combustible || (formCaja.tipoCertificado === 'GLP_ANUAL' && String(formCaja.modalidadCertificado || '').toUpperCase() === 'ANUAL' ? 'BI COMBUSTIBLE GLP' : null),
      color: formVehiculo.color || null,
      carroceria: formVehiculo.carroceria || null,
      numeroCilindros: normalizarEnteroCertificado(formVehiculo.numeroCilindros, 4) || null,
      cilindrada: normalizarEnteroCertificado(formVehiculo.cilindrada, 5) || null,
      numeroEjes: normalizarEnteroCertificado(formVehiculo.numeroEjes, 4) || null,
      numeroRuedas: normalizarEnteroCertificado(formVehiculo.numeroRuedas, 4) || null,
      numeroAsientos: normalizarEnteroCertificado(formVehiculo.numeroAsientos, 4) || null,
      numeroPasajeros: normalizarEnteroCertificado(formVehiculo.numeroPasajeros, 4) || null,
      longitud: formVehiculo.longitud || null,
      ancho: formVehiculo.ancho || null,
      alto: formVehiculo.alto || null,
      pesoNeto: normalizarEnteroCertificado(formVehiculo.pesoNeto, 6) || null,
      pesoBruto: normalizarEnteroCertificado(formVehiculo.pesoBruto, 6) || null,
      cargaUtil: normalizarEnteroCertificado(formVehiculo.cargaUtil, 6) || null,
      potencia: formVehiculo.potencia || null,
      formulaRodante: formVehiculo.formulaRodante || null,
    });
    await guardarTitularesBorrador(idBorrador);
  };

  const guardarPasoTaller = async (idBorrador: number) => {
    if (!formatoFormulario) throw new Error(formatoFormularioError || 'No se pudo cargar el formulario del formato.');
    await faregasCertificadosApi.guardarTaller(idBorrador, { valores: formatoValores });
    await guardarTitularesBorrador(idBorrador);
  };

  const guardarPasoVehiculo = async (idBorrador: number, confirmarMaestro = false) => {
    await guardarExpedienteTecnico(idBorrador, confirmarMaestro);
    if (formCaja.tipoCertificado === 'GNV_ANUAL') {
      await faregasCertificadosApi.guardarGnv(idBorrador, {
        vigenciaHasta: formGnv.fechaVigencia || formGnv.vigencia_hasta || null,
        modalidad: formCaja.modalidadCertificado || null,
        numeroChip: formGnv.numeroChip || formGnv.numero_chip || null,
        // Campo opcional del inspector. Viaja al backend para que quede
        // persistido; el backend es quien lo recorta y guarda como NULL si
        // viene vacío. Antes no se enviaba y por eso se perdía.
        observaciones: formGnv.observaciones || null,
        // Características DESPUÉS de la conversión. Sólo existen y sólo se
        // envían en modalidad INICIAL: es la única donde el formulario pinta la
        // tabla "antes / después". En ANUAL no se envían, para no poner en NULL
        // valores que el inspector ya haya escrito.
        ...(formCaja.modalidadCertificado === 'INICIAL' ? {
          combustiblePosterior: formGnv.combustiblePosterior || 'BI - COMBUSTIBLE GNV',
          pesoNetoPosterior: normalizarEnteroCertificado(String(formGnv.pesoNetoPosterior || ''), 6) || null,
        } : {}),
      });
      if (formGnv.componentes?.length > 0) {
        await faregasCertificadosApi.guardarComponentesGnv(idBorrador, {
          componentes: formGnv.componentes.map((c: any, i: number) => {
            const modo = c.modoCapacidad || (c.capacidadLitros === 'NO APLICA' ? 'NO_APLICA' : 'VALOR');
            return {
              ...c,
              orden: i + 1,
              capacidadLitros: modo === 'NO_APLICA' ? 'NO APLICA' : (c.capacidadLitros || null)
            };
          })
        });
      }
      if (formGnv.verificaciones?.length > 0) {
        await faregasCertificadosApi.guardarVerificacionesGnv(idBorrador, {
          verificaciones: formGnv.verificaciones,
        });
      }
    } else if (formCaja.tipoCertificado === 'GLP_ANUAL') {
      await faregasCertificadosApi.guardarGlp(idBorrador, {
        tallerAutorizadoId: formGlp.tallerAutorizadoId || null,
        vigenciaHasta: formGlp.fechaVigencia || formGlp.vigencia_hasta || null,
        expedienteTecnico: formGlp.expedienteTecnico || null,
        modalidad: formCaja.modalidadCertificado || null,
        combustiblePosterior: formCaja.modalidadCertificado === 'INICIAL' ? 'BI-COMBUSTIBLE GLP' : null,
        pesoNetoPosterior: formCaja.modalidadCertificado === 'INICIAL'
          ? (normalizarEnteroCertificado(String(formGlp.pesoNetoPosterior || ''), 6) || null)
          : null,
        cargaUtilPosterior: formCaja.modalidadCertificado === 'INICIAL'
          ? (normalizarEnteroCertificado(String(formGlp.cargaUtilPosterior || ''), 6) || null)
          : null,
      });
      await faregasCertificadosApi.guardarComponentesGlp(idBorrador, {
        componentes: (formGlp.componentes || []).map((componente: any, index: number) => ({
          orden: componente.orden || index + 1,
          componente: componente.componente,
          marca: componente.marca || null,
          modelo: componente.modelo || null,
          capacidadLitros: normalizarEnteroCertificado(String(componente.capacidadLitros || ''), 5) || null,
          mesFabricacion: componente.mesFabricacion || null,
          anioFabricacion: normalizarEnteroCertificado(String(componente.anioFabricacion || ''), 4) || null,
          numeroSerie: componente.numeroSerie || null,
        })),
      });
      if (formGlp.verificaciones?.length > 0) {
        await faregasCertificadosApi.guardarVerificacionesGlp(idBorrador, {
          verificaciones: formGlp.verificaciones,
        });
      }
    } else if (formCaja.tipoCertificado === 'CONFORMIDAD') {
      await faregasCertificadosApi.guardarConformidad(idBorrador, {
        tipoConformidad: formConformidad.tipoConformidad || null,
        tipoTramite: formConformidad.tipoTramite || null,
        caracteristicaRegistrable: formConformidad.caracteristicaRegistrable || null,
        motivo: formConformidad.motivo || null,
        descripcion: formConformidad.descripcion || null,
        usoOriginalVehiculo: formConformidad.usoOriginalVehiculo || null,
      });
    }
    setLastSavedAt(new Date());
  };

  const guardarPasoPagos = async (idBorrador: number) => {
    const response = await faregasCertificadosApi.guardarPagos(idBorrador, {
      importeTotal: precioTotal,
      condicionPago: formFacturacion.condicionPagoFac,
      fechaInicioCredito: formFacturacion.condicionPagoFac === 'CREDITO' ? formFacturacion.fechaInicioCreditoFac : null,
      fechaVencimientoCredito: formFacturacion.condicionPagoFac === 'CREDITO' ? formFacturacion.fechaVencimientoFac : null,
      pagos: pagosAgregados.map(pago => ({
        tipo: pago.tipo,
        importe: pago.importe,
        tarjetaKey: pago.tarjetaKey || null,
        modalidadTarjeta: pago.modalidadTarjeta || null,
        nroOperacion: pago.nroOperacion || null,
        cuentaCorrienteKey: pago.cuentaCorrienteKey || null,
        entidadFinancieraKey: pago.entidadFinancieraKey || null,
        fechaDeposito: pago.fechaDeposito || null,
      })),
    });
    aplicarResumenComercial(response.data);
    setLastSavedAt(new Date());
    return response.data;
  };

  const guardarPasoPagoCompleto = async (idBorrador: number, exigirFacturacion = false) => {
    const resumenPago = await guardarPasoPagos(idBorrador);
    const cuotas = formFacturacion.condicionPagoFac === 'CREDITO' ? cuotasCreditoResueltas : [];
    const erroresPago = validarPasoPago({
      tipoComprobante: formFacturacion.tipoDocFac,
      condicionPago: formFacturacion.condicionPagoFac,
      pagos: pagosAgregados,
      precioTotal,
      fechaInicioCredito: formFacturacion.fechaInicioCreditoFac,
      fechaVencimientoCredito: formFacturacion.fechaVencimientoFac,
      cuotas,
    });
    const erroresCliente = validarDatosFacturacionCampos(formFacturacion);
    const primerError = Object.values({ ...erroresCliente, ...erroresPago })[0];
    if (primerError) {
      if (exigirFacturacion) throw new Error(primerError);
      return resumenPago;
    }

    if (formFacturacion.condicionPagoFac === 'CREDITO') {
      setFormFacturacion((prev) => {
        const sinCambios = JSON.stringify(prev.cuotasFac) === JSON.stringify(cuotas);
        return sinCambios ? prev : { ...prev, cuotasFac: cuotas };
      });
    }
    const facturacionGuardada = await faregasCertificadosApi.guardarFacturacion(
      idBorrador,
      construirPayloadFacturacion(cuotas)
    );
    setFacturacion(facturacionGuardada.data as FacturacionFaregas);
    return resumenPago;
  };

  const encolarAutosave = (guardar: () => Promise<unknown>) => {
    autosaveQueueRef.current = autosaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        setIsSavingStep(true);
        setSaveError('');
        try {
          await guardar();
          setLastSavedAt(new Date());
        } catch (e: any) {
          setSaveError(e.message || 'No se pudieron sincronizar los cambios.');
          throw e;
        } finally {
          setIsSavingStep(false);
        }
      });
    return autosaveQueueRef.current;
  };

  // Autosave por bloques, serializado y con debounce para no guardar por tecla.
  useEffect(() => {
    if (!certificadoId || loading || soloLectura || currentStepIndex !== indicePaso('VEHICULO')) return;
    const timer = window.setTimeout(() => {
      if (formCaja.tipo_flujo === 'TALLER_INSPECCION') {
        if (!formatoFormulario) return;
        void encolarAutosave(() => guardarPasoTaller(certificadoId)).catch(() => undefined);
      } else {
        void encolarAutosave(() => guardarPasoVehiculo(certificadoId)).catch(() => undefined);
      }
    }, 1500);
    return () => window.clearTimeout(timer);
    // Los objetos representan el bloque completo que se está editando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificadoId, loading, soloLectura, currentStepIndex, formCaja.categoria, formVehiculo, formGlp, formGnv, formConformidad, formatoFormulario, formatoValores, titulares]);

  useEffect(() => {
    if (!certificadoId || loading || soloLectura || currentStepIndex !== indicePaso('PAGO') || precioTotal <= 0) return;
    if (formFacturacion.condicionPagoFac === 'CREDITO'
      && (!formFacturacion.fechaInicioCreditoFac
        || !formFacturacion.fechaVencimientoFac
        || formFacturacion.fechaVencimientoFac < formFacturacion.fechaInicioCreditoFac)) return;
    const timer = window.setTimeout(() => {
      void encolarAutosave(() => guardarPasoPagoCompleto(certificadoId)).catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificadoId, loading, soloLectura, currentStepIndex, pagosAgregados, precioTotal, formFacturacion.condicionPagoFac, formFacturacion.fechaInicioCreditoFac, formFacturacion.fechaVencimientoFac, cuotasCreditoResueltas]);

  const eliminarTitularBorrador = async (titular: TitularState) => {
    if (!certificadoId || !titular.titularId) return;
    try {
      await faregasCertificadosApi.eliminarTitular(certificadoId, titular.titularId);
      setTitulares(prev => prev.filter(item => item._uuid !== titular._uuid));
    } catch (e: any) {
      Swal.fire('No se pudo eliminar', e.message || 'Ocurrió un error al eliminar el titular.', 'error');
    }
  };

  /**
   * Única puerta de salida del paso de Vehículo y Datos Técnicos.
   *
   * Todo lo que intente entrar a Previsualización pasa por aquí: el botón
   * SIGUIENTE, la flecha del teclado y cualquier navegación futura. No se
   * duplica la validación en otro sitio: si cambia la regla, cambia una vez.
   *
   * Devuelve true cuando el avance queda bloqueado.
   */
  const obtenerErroresVehiculo = (): Record<string, string> =>
    validarFormularioVehiculoVisible({
      tipoCertificado: formCaja.tipoCertificado as TipoCertificadoFaregas,
      modalidad: formCaja.modalidadCertificado,
      caja: formCaja,
      vehiculo: formVehiculo,
      titulares,
      gnv: formGnv,
      glp: formGlp,
      conformidad: formConformidad,
      facturacion: formFacturacion,
    });

  const obtenerErroresDatosTecnicos = () => {
    if (formCaja.tipo_flujo === 'TALLER_INSPECCION') {
      return {
        campos: {} as Record<string, string>,
        resumen: formatoFormulario
          ? validarFormularioFormatoDinamico(formatoFormulario.campos, formatoValores)
          : [formatoFormularioError || 'No se pudo cargar el formulario dinámico del formato.'],
      };
    }

    return {
      campos: obtenerErroresVehiculo(),
      resumen: [] as string[],
    };
  };

  /**
   * Valida exclusivamente el contenido de Vehículo y Datos Técnicos. Cuando un
   * borrador antiguo ya estaba ubicado en Previsualización o Facturación, lo
   * devuelve al paso técnico en vez de permitir que esa posición guardada
   * omita los campos obligatorios.
   */
  const exigirDatosTecnicosCompletos = (regresarAlPasoTecnico = false): boolean => {
    const { campos, resumen } = obtenerErroresDatosTecnicos();
    const tieneErroresCampo = Object.keys(campos).length > 0;
    const estaIncompleto = tieneErroresCampo || resumen.length > 0;
    if (!estaIncompleto) {
      limpiarErroresPaso();
      return false;
    }

    if (tieneErroresCampo) {
      registrarErrores(campos);
    }

    if (regresarAlPasoTecnico) {
      setMinimumEditableStepIndex((actual) => Math.min(actual, indicePaso('VEHICULO')));
      setCurrentStepIndex(indicePaso('VEHICULO'));
    }

    if (resumen.length > 0) {
      mostrarErroresPaso(resumen);
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Complete los campos obligatorios',
        text: regresarAlPasoTecnico
          ? 'El borrador tiene datos incompletos. Regresamos a Vehículo y Datos Técnicos para que corrija los campos marcados en rojo.'
          : 'Los campos marcados en rojo deben corregirse para continuar.',
        confirmButtonColor: '#052a79',
      });
    }

    if (tieneErroresCampo) {
      window.setTimeout(enfocarPrimerError, 0);
    }
    return true;
  };

  const irSiguientePaso = async () => {
    if (isSavingStep) return;
    if (currentStepIndex === indicePaso('DATOS_INICIALES')) {
      if (!isConsultado) {
        Swal.fire('Consulta requerida', 'Primero presione Consultar para validar los datos iniciales.', 'info');
        return;
      }
      if (bloquearPaso(validarDatosInicialesCampos(formCaja))) return;
      setIsSavingStep(true);
      try {
        let idBorrador = certificadoId;
        if (!idBorrador) {
          const res = await faregasCertificadosApi.crearBorrador({
            tipoCertificadoClave: formCaja.tipoCertificado,
            tarifaCodigo: formCaja.tarifaCodigo,
            placa: formCaja.placa,
            categoria: formCaja.categoria,
            observaciones: ''
          });
          idBorrador = Number(res?.data?.id);
          if (!idBorrador) throw new Error('El servidor no devolvió el identificador del borrador.');
          setCertificadoId(idBorrador);
        } else {
          await faregasCertificadosApi.actualizarBorrador(idBorrador, { tarifaCodigo: formCaja.tarifaCodigo });
          await faregasCertificadosApi.guardarVehiculoBorrador(idBorrador, {
            placa: formCaja.placa,
            categoria: formCaja.categoria,
          });
        }
        if (formCaja.tipoCertificado === 'GLP_ANUAL') {
          setFormGlp((prev: any) => ({ ...prev, modalidad: formCaja.modalidadCertificado }));
        } else if (formCaja.tipoCertificado === 'GNV_ANUAL') {
          setFormGnv((prev: any) => ({ ...prev, modalidad: formCaja.modalidadCertificado }));
        }
        const tarifaResponse = await faregasCertificadosApi.obtenerPagos(idBorrador);
        aplicarResumenComercial(tarifaResponse.data);
        setLastSavedAt(new Date());
        await persistirPaso(idBorrador, 'VEHICULO');
        const pasoVehiculo = indicePaso('VEHICULO');
        setFurthestStepIndex(prev => Math.max(prev, pasoVehiculo));
        setCurrentStepIndex(pasoVehiculo);
      } catch (e: any) {
        Swal.fire('Error', e.message || 'No se pudo crear el borrador', 'error');
      } finally {
        setIsSavingStep(false);
      }
    } else if (currentStepIndex < STEPS.length - 1) {
      if (STEPS[currentStepIndex].id === 'vehiculo') {
        // Antes esta rama exigía `certificadoId` para entrar. Si el borrador no
        // estaba disponible, la validación se saltaba entera y el paso avanzaba
        // igual. Ahora la ausencia de borrador bloquea con un aviso claro.
        if (!certificadoId) {
          mostrarErroresPaso(['No se encontró el borrador del certificado. Recargue la pantalla para poder continuar.']);
          return;
        }
        try {
          const chipResponse = await faregasCertificadosApi.obtenerChipBorrador(certificadoId);
          if (chipResponse.data?.requiereChip && !chipResponse.data?.seleccionado) {
            mostrarErroresPaso(['Escanee o escriba y valide el chip requerido antes de continuar.']);
            return;
          }
        } catch (e: any) {
          mostrarErroresPaso([e.message || 'No se pudo validar el chip seleccionado.']);
          return;
        }
        // Regla única: todo control visible y editable de Vehículo y Datos
        // Técnicos debe estar completo, tanto en formularios vehiculares como
        // en los formatos dinámicos de inspección de taller.
        if (exigirDatosTecnicosCompletos()) return;
        setIsSavingStep(true);
        try {
          if (formCaja.tipo_flujo === 'TALLER_INSPECCION') await guardarPasoTaller(certificadoId);
          else await guardarPasoVehiculo(certificadoId, true);
          await persistirPaso(certificadoId, 'PREVISUALIZACION');
        } catch (e: any) {
          Swal.fire('No se pudo guardar', e.message || 'Revise los datos del expediente técnico.', 'error');
          return;
        } finally {
          setIsSavingStep(false);
        }
      } else if (STEPS[currentStepIndex].id === 'pago' && certificadoId) {
        // Un borrador histórico guardado en PAGO conserva esa pantalla, pero no
        // puede saltar los datos técnicos que ahora aparecen antes en el flujo.
        if (exigirDatosTecnicosCompletos(true)) return;
        if (bloquearPaso(validarPasoPago({
          tipoComprobante: formFacturacion.tipoDocFac,
          condicionPago: formFacturacion.condicionPagoFac,
          pagos: pagosAgregados,
          precioTotal,
          fechaInicioCredito: formFacturacion.fechaInicioCreditoFac,
          fechaVencimientoCredito: formFacturacion.fechaVencimientoFac,
          cuotas: cuotasCreditoResueltas,
        }))) return;
        setIsSavingStep(true);
        try {
          // Orden, cliente fiscal y plan de cuotas se guardan antes de cambiar
          // de paso. Así un crédito nunca llega a emisión sin fg_facturacion_cuota.
          await guardarPasoPagos(certificadoId);
          const cuotas = formFacturacion.condicionPagoFac === 'CREDITO' ? cuotasCreditoResueltas : [];
          if (formFacturacion.condicionPagoFac === 'CREDITO') {
            setFormFacturacion((prev) => {
              const sinCambios = JSON.stringify(prev.cuotasFac) === JSON.stringify(cuotas);
              return sinCambios ? prev : { ...prev, cuotasFac: cuotas };
            });
          }
          const facturacionGuardada = await faregasCertificadosApi.guardarFacturacion(
            certificadoId,
            construirPayloadFacturacion(cuotas)
          );
          setFacturacion(facturacionGuardada.data as FacturacionFaregas);
          await persistirPaso(certificadoId, 'FACTURACION');
          setMinimumEditableStepIndex(0);
        } catch (e: any) {
          if (e.codigo === 'PRODUCTO_FISCAL_CHIP_INVALIDO') {
            const productoChipId = Number(e.detalles?.productoChipId || resumenComercial?.productoChipId || 0);
            const resultado = await Swal.fire({
              icon: 'warning',
              title: 'Falta completar el producto fiscal del chip',
              html: '<p>No se registró ningún cobro y el borrador sigue intacto. El SKU elegido para el chip no tiene los datos tributarios obligatorios.</p><p style="margin-top:8px">Seleccione un producto fiscal válido para la sede; el serial físico se escaneará después, en Datos del taller.</p>',
              showCancelButton: true,
              confirmButtonText: 'Configurar producto fiscal',
              cancelButtonText: 'Cerrar',
              confirmButtonColor: '#052A79',
            });
            if (resultado.isConfirmed) {
              const productoParam = productoChipId ? `&producto=${productoChipId}` : '';
              navigate(`/faregas/chips?tab=productos${productoParam}`);
            }
            return;
          }
          Swal.fire('No se pudo guardar el pago', e.message || 'Revise los medios de pago.', 'error');
          return;
        } finally {
          setIsSavingStep(false);
        }
      } else if (STEPS[currentStepIndex].id === 'previsualizacion' && certificadoId) {
        if (exigirDatosTecnicosCompletos(true)) return;
        await persistirPaso(certificadoId, 'PAGO');
      }
      const siguiente = currentStepIndex + 1;
      setFurthestStepIndex(prev => Math.max(prev, siguiente));
      setCurrentStepIndex(siguiente);
    }
  };

  const irAtrasOStep = async (destino: number) => {
    if (isSavingStep || destino < minimumEditableStepIndex || destino >= currentStepIndex || destino > furthestStepIndex) return;
    if (STEPS[currentStepIndex].id === 'facturacion' && retrocesoBloqueadoPorEmision) {
      await Swal.fire(
        'Edición bloqueada',
        'El comprobante o certificado ya inició su emisión. No puede modificar los datos asociados a esta operación.',
        'warning',
      );
      return;
    }
    if (STEPS[currentStepIndex].id === 'vehiculo' && certificadoId) {
      setIsSavingStep(true);
      try {
        if (formCaja.tipo_flujo === 'TALLER_INSPECCION') await guardarPasoTaller(certificadoId);
        else await guardarPasoVehiculo(certificadoId);
      } catch (e: any) {
        Swal.fire('No se pudo guardar', e.message || 'No se cambió de paso para evitar perder información.', 'error');
        return;
      } finally {
        setIsSavingStep(false);
      }
    } else if (STEPS[currentStepIndex].id === 'pago' && certificadoId) {
      setIsSavingStep(true);
      try {
        await guardarPasoPagoCompleto(certificadoId);
      } catch (e: any) {
        Swal.fire('No se pudo guardar', e.message || 'No se cambió de paso para evitar perder los pagos.', 'error');
        return;
      } finally {
        setIsSavingStep(false);
      }
    } else if (STEPS[currentStepIndex].id === 'facturacion' && certificadoId) {
      const tieneDatosFacturacion = Boolean(formFacturacion.nroDocFac?.trim() || formFacturacion.razonSocialFac?.trim() || formFacturacion.direccionFac?.trim());
      if (tieneDatosFacturacion) {
        setIsSavingStep(true);
        try {
          const payloadFact = construirPayloadFacturacion();
          await faregasCertificadosApi.guardarFacturacion(certificadoId, payloadFact);
        } catch (e: any) {
          const res = await Swal.fire({
            title: 'Facturación Incompleta',
            text: (e.message || 'Los datos de facturación no son válidos.') + '\n\n¿Desea omitir el guardado y cambiar de paso?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cambiar sin guardar',
            cancelButtonText: 'No, corregir datos',
          });
          if (!res.isConfirmed) {
            setIsSavingStep(false);
            return;
          }
        } finally {
          setIsSavingStep(false);
        }
      }
    }
    setCurrentStepIndex(destino);
  };

  const irPasoAnterior = () => irAtrasOStep(currentStepIndex - 1);

  const navegarConFlecha = React.useEffectEvent((direccion: 'ANTERIOR' | 'SIGUIENTE') => {
    if (soloLectura) {
      setCurrentStepIndex((actual) => Math.max(0, Math.min(STEPS.length - 1, actual + (direccion === 'SIGUIENTE' ? 1 : -1))));
      return;
    }
    if (direccion === 'SIGUIENTE') {
      void irSiguientePaso();
    } else {
      irPasoAnterior();
    }
  });

  // Navegación por teclado. Se registra después de construir ambos manejadores
  // para que siempre utilice las validaciones y el estado de la vista actual.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const tagName = (event.target as HTMLElement).tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return;

      if (event.key === 'ArrowRight') {
        navegarConFlecha('SIGUIENTE');
      } else if (event.key === 'ArrowLeft') {
        navegarConFlecha('ANTERIOR');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const montoPendiente = Math.max(0, precioTotal - pagosAgregados.reduce((sum, p) => sum + parseFloat(p.importe || '0'), 0));

  // Efecto para inyectar automticamente el pago de Cuponidad
  useEffect(() => {
    if (formCaja.descuentoObj?.isCuponidad) {
      const uuid = formCaja.descuentoObj.documentoBusqueda || formCaja.descuentoObj.uuid;
      const cuponidadTarjeta = maestrosPago?.tarjetas?.find((tarjeta) => tarjeta.nombre.toUpperCase().includes('CUPONIDAD'));

      if (cuponidadTarjeta) {
        const pagoExiste = pagosAgregados.some((pago) => pago.nroOperacion === uuid);
        if (!pagoExiste) {
          const nuevoPago: PagoAgregado = {
            tipo: 'TARJETA',
            tarjetaKey: cuponidadTarjeta.key,
            nroOperacion: uuid,
            importe: precioTotal.toFixed(2),
            entidadFinancieraKey: '',
            cuentaCorrienteKey: '',
            fechaDeposito: '',
          };
          setPagosAgregados([nuevoPago]);
        }
      }
    }
  }, [formCaja.descuentoObj, precioTotal, maestrosPago, pagosAgregados]);

  // Efecto para auto-llenar pagos de Cortesía u otros que dejan el total en 0
  useEffect(() => {
    if (currentStepIndex !== indicePaso('PAGO') || !maestrosPago || !formCaja.descuentoObj || montoPendiente !== 0) {
      return;
    }

    setFormPago((prev) => ({ ...prev, importe: '0' }));
    // Si el precio total es 0, no deben conservarse pagos de una tarifa anterior.
    if (precioTotal === 0 && pagosAgregados.length > 0) {
      setPagosAgregados([]);
    }
  }, [currentStepIndex, formCaja.descuentoObj, maestrosPago, precioTotal, montoPendiente, pagosAgregados.length]);

  const handleAgregarPago = async () => {
    if (!formPago.importe || isNaN(parseFloat(formPago.importe)) || parseFloat(formPago.importe) <= 0) {
      alert('Ingrese un importe válido mayor a 0.');
      return;
    }

    const importeNumerico = parseFloat(formPago.importe);

    if (pagoTab === 'BANCO') {
      if (!formPago.entidadFinancieraKey || !formPago.cuentaCorrienteKey || !formPago.nroOperacion || !formPago.fechaDeposito) {
        alert('Complete todos los campos del banco.');
        return;
      }
    } else if (pagoTab === 'TARJETA') {
      const selected = maestrosPago?.tarjetas?.find(t => t.key === formPago.tarjetaKey);
      const nameUpper = selected ? selected.nombre.toUpperCase() : '';
      const isCuponidad = nameUpper.includes('CUPONIDAD');
      const isYapePlin = nameUpper.includes('YAPE') || nameUpper.includes('PLIN');
      const requiereModalidad = Boolean(selected) && !isCuponidad && !isYapePlin;

      if (!formPago.tarjetaKey || !formPago.nroOperacion) {
        alert('Complete los campos obligatorios de la tarjeta.');
        return;
      }
      if (requiereModalidad && !formPago.modalidadTarjeta) {
        alert('Seleccione si la operación fue con tarjeta de débito o crédito.');
        return;
      }
      if (isCuponidad) {
        if (formPago.nroOperacion.trim().length !== 10) {
          alert('El Nro de Cuponidad ingresado no es correcto. Debe tener exactamente 10 caracteres.');
          return;
        }
        try {
          await inspeccionesApi.validarCuponidad(formPago.nroOperacion.trim());
        } catch (err: any) {
          alert(err.message || 'El código de Cuponidad ya fue usado o es inválido.');
          return;
        }
      }

      if (isYapePlin) {
        const len = formPago.nroOperacion.trim().length;
        if (len < 4 || len > 10) {
          alert('El Nro de Operación de Yape/Plin debe tener entre 4 y 10 dígitos.');
          return;
        }
      }
    }

    let montoPendienteReal = montoPendiente;
    if (editingPagoIndex !== null) {
      montoPendienteReal += parseFloat(pagosAgregados[editingPagoIndex].importe || '0');
    }

    if (importeNumerico > montoPendienteReal) {
      alert(`El importe ingresado (S/ ${importeNumerico.toFixed(2)}) es mayor al monto pendiente (S/ ${montoPendienteReal.toFixed(2)}).`);
      return;
    }

    const nuevoPago: PagoAgregado = {
      tipo: pagoTab,
      ...formPago,
      importe: importeNumerico.toFixed(2),
      nroOperacion: formPago.nroOperacion?.trim() || ''
    };

    if (editingPagoIndex !== null) {
      const nuevosPagos = [...pagosAgregados];
      nuevosPagos[editingPagoIndex] = nuevoPago;
      setPagosAgregados(nuevosPagos);
      setEditingPagoIndex(null);
    } else {
      setPagosAgregados([...pagosAgregados, nuevoPago]);
    }

    // Reset form
    setFormPago({
      importe: '',
      tarjetaKey: '',
      modalidadTarjeta: '',
      entidadFinancieraKey: '',
      cuentaCorrienteKey: '',
      nroOperacion: '',
      fechaDeposito: fechaLocalIso()
    });
  };

  const eliminarPago = (index: number) => {
    const nuevosPagos = [...pagosAgregados];
    nuevosPagos.splice(index, 1);
    setPagosAgregados(nuevosPagos);
  };

  const salirAlInicio = async () => {
    if (!certificadoId) {
      navigate('/faregas/inicio');
      return;
    }
    setIsSavingStep(true);
    setSaveError('');
    try {
      await autosaveQueueRef.current.catch(() => undefined);
      if (currentStepIndex === indicePaso('DATOS_INICIALES')) {
        await faregasCertificadosApi.actualizarBorrador(certificadoId, { tarifaCodigo: formCaja.tarifaCodigo });
        await faregasCertificadosApi.guardarVehiculoBorrador(certificadoId, { placa: formCaja.placa, categoria: formCaja.categoria });
      } else if (currentStepIndex === indicePaso('PAGO') && precioTotal > 0) {
        await guardarPasoPagoCompleto(certificadoId);
      } else if (currentStepIndex === indicePaso('VEHICULO')) {
        if (formCaja.tipo_flujo === 'TALLER_INSPECCION') await guardarPasoTaller(certificadoId);
        else await guardarPasoVehiculo(certificadoId);
      }
      setLastSavedAt(new Date());
      navigate('/faregas/inicio');
    } catch (e: any) {
      setSaveError(e.message || 'No se pudieron guardar los cambios pendientes.');
      Swal.fire('No se pudo salir', 'Los cambios pendientes no se guardaron. Reintente antes de abandonar el borrador.', 'error');
    } finally {
      setIsSavingStep(false);
    }
  };

  const puedeAnularBorrador = Boolean(certificadoId)
    && certificadoEstado === 'BORRADOR'
    && currentStepIndex < indicePaso('FACTURACION');

  const anularBorrador = async () => {
    if (!certificadoId || !puedeAnularBorrador) return;
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Deseas anular este certificado?',
      text: 'Esta acción conservará el registro pero ya no podrá continuarse.',
      showCancelButton: true,
      confirmButtonText: 'ANULAR BORRADOR',
      cancelButtonText: 'CANCELAR',
      confirmButtonColor: '#dc2626',
    });
    if (!confirmacion.isConfirmed) return;

    setIsSavingStep(true);
    try {
      await autosaveQueueRef.current.catch(() => undefined);
      await faregasCertificadosApi.anularBorrador(certificadoId);
      setCertificadoEstado('ANULADO');
      await Swal.fire('Borrador anulado', 'El certificado se conservó con estado ANULADO.', 'success');
      navigate('/faregas/inicio');
    } catch (e: any) {
      await Swal.fire('No se pudo anular', e.message || 'No se pudo anular el certificado.', 'error');
    } finally {
      setIsSavingStep(false);
    }
  };

  useEffect(() => {
    const advertirSalida = (event: BeforeUnloadEvent) => {
      if (!isSavingStep && !saveError) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', advertirSalida);
    return () => window.removeEventListener('beforeunload', advertirSalida);
  }, [isSavingStep, saveError]);

  if (loading && currentStepIndex === indicePaso('DATOS_INICIALES')) {
    return <div className="p-8 text-center text-slate-500">Cargando opciones...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  const pasoPosteriorADatosTecnicos = currentStepIndex >= indicePaso('PREVISUALIZACION');
  const datosTecnicosIncompletos = !soloLectura
    && pasoPosteriorADatosTecnicos
    && (() => {
      const { campos, resumen } = obtenerErroresDatosTecnicos();
      return Object.keys(campos).length > 0 || resumen.length > 0;
    })();

  const volverACorregirDatosTecnicos = () => {
    exigirDatosTecnicosCompletos(true);
  };

  return (
    <div className="faregas-certificate-wizard w-full bg-white rounded-2xl shadow-xl border-t-[4px] border-solid border-t-[#f59e0b] overflow-hidden flex flex-col" style={{ borderImage: "linear-gradient(to right, #fde047 0%, #f59e0b 50%, #b45309 100%) 1" }}>

      {/* Header / Stepper */}
      <div className="bg-[#f4f9ff] border-b border-[#052a79]/10 p-4 sm:px-6">
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={salirAlInicio}
            className="p-1.5 text-slate-400 hover:text-[#052a79] hover:bg-slate-100 rounded-full transition"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-black text-slate-800 capitalize tracking-tight">
            {soloLectura ? 'Consulta de Certificado' : 'Nuevo Certificado'}
          </h2>
          {certificadoId && (
            <div className="ml-auto flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm">
              {soloLectura ? <Eye className="h-3.5 w-3.5 text-[#052a79]" /> : isSavingStep ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#052a79]" /> : <Save className={`h-3.5 w-3.5 ${saveError ? 'text-red-600' : 'text-green-600'}`} />}
              <span>{soloLectura ? certificadoEstado : 'BORRADOR'} #{certificadoId}</span>
              <span className="text-slate-300">|</span>
              <span className={saveError ? 'text-red-600' : ''}>{soloLectura ? 'SOLO LECTURA' : isSavingStep ? 'GUARDANDO…' : saveError ? 'ERROR AL GUARDAR' : lastSavedAt ? `GUARDADO ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'CARGADO'}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-200 -z-10 -translate-y-1/2">
            <div
              className="h-full bg-gold-3d transition-all duration-500"
              style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
            ></div>
          </div>

          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => soloLectura ? setCurrentStepIndex(index) : irAtrasOStep(index)}
                disabled={!soloLectura && (index >= currentStepIndex || index < minimumEditableStepIndex || isSavingStep || (currentStepIndex === indicePaso('FACTURACION') && index < currentStepIndex && retrocesoBloqueadoPorEmision))}
                className={`flex flex-col items-center gap-2 bg-[#f4f9ff] px-2 ${soloLectura || (index < currentStepIndex && index >= minimumEditableStepIndex && !isSavingStep && !retrocesoBloqueadoPorEmision) ? 'cursor-pointer' : 'cursor-default'}`}
                title={soloLectura ? `Consultar ${step.label}` : retrocesoBloqueadoPorEmision && currentStepIndex === indicePaso('FACTURACION') && index < currentStepIndex ? 'El comprobante o certificado ya inició su emisión' : index < minimumEditableStepIndex ? 'Este paso no es editable' : index < currentStepIndex ? `Volver a ${step.label}` : index === currentStepIndex ? 'Paso actual' : 'Complete el paso anterior'}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-[#052a79] text-white shadow-md ring-4 ring-blue-100' :
                    isCompleted ? 'bg-gold-3d shadow-sm border-none' :
                      'bg-white text-slate-400 border-2 border-slate-200'
                    }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                </div>
                <span className={`text-xs font-bold capitalize tracking-wider mt-1 ${isActive ? 'text-[#052a79]' : isCompleted ? 'text-gold-3d drop-shadow-sm' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 sm:p-6 lg:p-8">
        {soloLectura && <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">Consulta de solo lectura. Puede recorrer todos los pasos sin modificar el registro.</p>}
        <fieldset disabled={soloLectura} className="faregas-formulario-operativo m-0 min-w-0 w-full border-0 p-0"
          onKeyDownCapture={manejarNavegacionFormulario}
          onClickCapture={soloLectura ? (event) => { event.preventDefault(); event.stopPropagation(); } : undefined}
          onSubmitCapture={soloLectura ? (event) => { event.preventDefault(); event.stopPropagation(); } : undefined}>
        {STEPS[currentStepIndex].id === 'datos_iniciales' && (
          <CajaStep
            key={plantaSeleccionada}
            plantaSeleccionada={plantaSeleccionada}
            plantaNombre={plantaNombre}
            formCaja={formCaja}
            setFormCaja={setFormCaja}
            certificadoId={certificadoId}
            consultaRealizada={isConsultado}
            consultando={isSavingStep}
            erroresCampo={errores}
            onCorregirCampo={limpiarErrorCampo}
            onConsultar={consultarDatosIniciales}
            onInvalidarConsulta={() => {
              setIsConsultado(false);
              setDescuento(0);
              setPrecioTotal(precioSubtotal + Number(resumenComercial?.precioChip || 0));
            }}
            onDescuentoChange={(desc) => {
              const precioChip = Number(resumenComercial?.precioChip || 0);
              if (desc) {
                setPrecioSubtotal(desc.tarifaOriginal);
                setDescuento(desc.importeDescuento);
                setPrecioTotal(desc.importeFinal + precioChip);
                setResumenComercial((actual) => actual ? {
                  ...actual,
                  precioCertificado: desc.tarifaOriginal,
                  descuentoCertificado: desc.importeDescuento,
                  certificadoNeto: desc.importeFinal,
                  importeTotal: desc.importeFinal + precioChip,
                } : actual);
              } else {
                setDescuento(0);
                setPrecioTotal(precioSubtotal + precioChip);
                setResumenComercial((actual) => actual ? {
                  ...actual,
                  descuentoCertificado: 0,
                  certificadoNeto: precioSubtotal,
                  importeTotal: precioSubtotal + precioChip,
                } : actual);
              }
            }}
          />
        )}
        {STEPS[currentStepIndex].id === 'vehiculo' && (
          <CertificateChipSection certificadoId={certificadoId} />
        )}
        {STEPS[currentStepIndex].id === 'vehiculo' && (formCaja.tipo_flujo === 'CERTIFICACION' || formCaja.tipo_flujo === 'VEHICULAR_EXISTENTE') && (
          <>
            {expedienteError && (
              <div role="alert" className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                <span>{expedienteError}</span>
                <button type="button" onClick={cargarMaestrosVehiculo} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white">REINTENTAR</button>
              </div>
            )}
            <VehiculoStep
              tipoCertificado={formCaja.tipoCertificado as TipoCertificadoFaregas}
              modalidadCertificado={formCaja.modalidadCertificado}
              servicioCodigo={formCaja.servicioCodigo}
              servicioNombre={formCaja.concepto}
              numeroCertificadoOficial={numeroCertificadoOficial}
              formVehiculo={formVehiculo}
              setFormVehiculo={setFormVehiculo}
              formPropietario={formPropietario}
              setFormPropietario={setFormPropietario}
              formGlp={formGlp}
              setFormGlp={setFormGlp}
              formGnv={formGnv}
              setFormGnv={setFormGnv}
              formConformidad={formConformidad}
              setFormConformidad={setFormConformidad}
              titulares={titulares}
              setTitulares={setTitulares}
              formFacturacion={formFacturacion}
              setFormFacturacion={setFormFacturacion}
              onRemoveTitular={eliminarTitularBorrador}
              catalogoVerificaciones={catalogoVerificaciones}
              vehiculoOrigen={vehiculoOrigen}
              maestrosVehiculo={maestrosVehiculo}
              categoriaVehicular={formCaja.categoria}
              categoriasVehiculares={maestros?.categorias || []}
              erroresCampo={errores}
              onCorregirCampo={limpiarErrorCampo}
              onCategoriaVehicularChange={(categoria) => {
                limpiarErrorCampo('categoria');
                setFormCaja((prev) => ({ ...prev, categoria }));
              }}
            />
          </>
        )}

        {STEPS[currentStepIndex].id === 'vehiculo' && formCaja.tipo_flujo === 'TALLER_INSPECCION' && (
          <TallerStep
            formulario={formatoFormulario}
            valores={formatoValores}
            setValores={setFormatoValores}
            cargando={formatoFormularioLoading}
            error={formatoFormularioError}
            titulares={titulares}
            setTitulares={setTitulares}
            formFacturacion={formFacturacion}
            setFormFacturacion={setFormFacturacion}
            onRemoveTitular={eliminarTitularBorrador}
          />
        )}
        {STEPS[currentStepIndex].id === 'pago' && (
          <PagoStep
            pagoTab={pagoTab}
            setPagoTab={setPagoTab}
            formPago={formPago}
            setFormPago={setFormPago}
            pagosAgregados={pagosAgregados}
            handleAgregarPago={handleAgregarPago}
            eliminarPago={eliminarPago}
            totalPagar={precioTotal}
            tarifaOriginal={precioSubtotal}
            descuento={descuento}
            resumenComercial={resumenComercial}
            maestrosPago={maestrosPago}
            tipoComprobante={formFacturacion.tipoDocFac}
            condicionPago={formFacturacion.condicionPagoFac}
            fechaInicioCredito={formFacturacion.fechaInicioCreditoFac}
            fechaVencimientoCredito={formFacturacion.fechaVencimientoFac}
            cuotasCredito={cuotasCreditoResueltas}
            onCuotasCreditoChange={(nuevasCuotas) => {
              limpiarErrorCampo('cuotas');
              setFormFacturacion((prev) => ({
                ...prev,
                cuotasFac: nuevasCuotas.map((c) => ({
                  numeroCuota: c.numeroCuota,
                  fechaPago: c.fechaPago,
                  importe: String(c.importe),
                })),
              }));
            }}
            erroresCampo={errores}
            onCorregirCampo={limpiarErrorCampo}
            onCondicionPagoChange={(condicionPago) => {
              if (formFacturacion.tipoDocFac === 'BOLETA' && condicionPago === 'CREDITO') return;
              limpiarErrorCampo('pagos');
              limpiarErrorCampo('fechaInicioCredito');
              limpiarErrorCampo('fechaVencimientoCredito');
              limpiarErrorCampo('cuotas');
              setFormFacturacion((prev) => ({
                ...prev,
                condicionPagoFac: condicionPago,
                fechaInicioCreditoFac: prev.fechaInicioCreditoFac || fechaLocalIso(),
                cuotasFac: condicionPago === 'CONTADO' ? [] : prev.cuotasFac,
              }));
            }}
            onFechaInicioCreditoChange={(fecha) => {
              limpiarErrorCampo('fechaInicioCredito');
              limpiarErrorCampo('fechaVencimientoCredito');
              limpiarErrorCampo('cuotas');
              setFormFacturacion((prev) => ({ ...prev, fechaInicioCreditoFac: fecha }));
            }}
            onFechaVencimientoCreditoChange={(fecha) => {
              limpiarErrorCampo('fechaVencimientoCredito');
              limpiarErrorCampo('cuotas');
              setFormFacturacion((prev) => {
                const cuotasActualizadas = prev.cuotasFac.length <= 1
                  ? prev.cuotasFac.map((c) => ({ ...c, fechaPago: fecha }))
                  : prev.cuotasFac;
                return { ...prev, fechaVencimientoFac: fecha, cuotasFac: cuotasActualizadas };
              });
            }}
          />
        )}
        {STEPS[currentStepIndex].id === 'previsualizacion' && soloLectura && certificadoEstado !== 'EMITIDO' && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">Este registro no tiene un certificado emitido para previsualizar.</p>
        )}
        {STEPS[currentStepIndex].id === 'previsualizacion' && datosTecnicosIncompletos && (
          <div role="alert" className="mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center shadow-sm">
            <h3 className="text-lg font-black text-amber-900">Faltan datos del vehículo o del expediente técnico</h3>
            <p className="mt-2 text-sm text-amber-800">
              No se puede mostrar una previsualización válida ni continuar a facturación hasta completar todos los campos obligatorios.
            </p>
            <button type="button" onClick={volverACorregirDatosTecnicos} className="mt-5 rounded-lg bg-[#052a79] px-6 py-2.5 text-xs font-black text-white">
              CORREGIR VEHÍCULO Y DATOS TÉCNICOS
            </button>
          </div>
        )}
        {STEPS[currentStepIndex].id === 'previsualizacion' && !datosTecnicosIncompletos && (!soloLectura || certificadoEstado === 'EMITIDO') && (
          <PrevisualizacionCertificadoStep certificadoId={certificadoId} />
        )}
        </fieldset>
        {STEPS[currentStepIndex].id === 'facturacion' && soloLectura && certificadoEstado !== 'EMITIDO' && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">Este registro no llegó a emitirse.</p>
        )}
        {STEPS[currentStepIndex].id === 'facturacion' && datosTecnicosIncompletos && (
          <div role="alert" className="mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center shadow-sm">
            <h3 className="text-lg font-black text-amber-900">La emisión está bloqueada por datos incompletos</h3>
            <p className="mt-2 text-sm text-amber-800">
              Complete primero Vehículo y Datos Técnicos. Ningún certificado puede facturarse o emitirse con campos obligatorios vacíos.
            </p>
            <button type="button" onClick={volverACorregirDatosTecnicos} className="mt-5 rounded-lg bg-[#052a79] px-6 py-2.5 text-xs font-black text-white">
              CORREGIR VEHÍCULO Y DATOS TÉCNICOS
            </button>
          </div>
        )}
        {STEPS[currentStepIndex].id === 'facturacion' && !datosTecnicosIncompletos && (!soloLectura || certificadoEstado === 'EMITIDO') && (
          <FacturacionEmisionStep
            certificadoId={certificadoId}
            certificadoEstado={certificadoEstado}
            soloLectura={soloLectura}
            onEmisionExitosa={() => {
              setCertificadoEstado('EMITIDO');
              setIsEmitido(true);
            }}
            onAtras={irPasoAnterior}
            retrocesoBloqueado={retrocesoBloqueadoPorEmision}
            tipoCertificado={formCaja.tipoCertificado as TipoCertificadoFaregas}
            formCaja={formCaja}
            formVehiculo={formVehiculo}
            formPropietario={formPropietario}
            formGlp={formGlp}
            formGnv={formGnv}
            formConformidad={formConformidad}
            pagosAgregados={pagosAgregados}
            formFacturacion={formFacturacion}
            setFormFacturacion={setFormFacturacion}
            facturacion={facturacion}
            onFacturacionChange={setFacturacion}
            medioPago={medioPagoCalculado}
            onEditarDatosCliente={() => setCurrentStepIndex(indicePaso('VEHICULO'))}
          />
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {currentStepIndex > 0 && currentStepIndex !== STEPS.length - 1 && !isEmitido && !soloLectura && (
            <button
              type="button"
              onClick={irPasoAnterior}
              disabled={isSavingStep}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              {isSavingStep ? 'Guardando…' : 'Atrás'}
            </button>
          )}
          {puedeAnularBorrador && !soloLectura && (
            <button
              type="button"
              onClick={anularBorrador}
              disabled={isSavingStep}
              className="rounded-lg border border-red-300 bg-white px-5 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
            >
              ANULAR BORRADOR
            </button>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {soloLectura ? (
            <div className="flex items-center gap-3">
              {certificadoEstado === 'EMITIDO' && currentStepIndex === STEPS.length - 1 && (facturacion?.enlacePdfFaregas || facturacion?.enlacePdf) && (
                <>
                  <button type="button" onClick={() => void descargarPdfFaregas()} className="rounded-lg border border-blue-200 bg-white px-5 py-2.5 text-xs font-black text-blue-800 hover:bg-blue-50">
                    VER / DESCARGAR COMPROBANTE
                  </button>
                  {facturacion?.enlacePdf && (
                    <button type="button" onClick={() => void descargarPdfOficialNubefact()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" title="Descargar PDF oficial de NubeFact">
                      VER PDF NUBEFACT
                    </button>
                  )}
                </>
              )}
              <button type="button" onClick={salirAlInicio} className="rounded-lg bg-[#052a79] px-6 py-2.5 text-xs font-black text-white">
                {certificadoEstado === 'EMITIDO' && currentStepIndex === STEPS.length - 1 ? 'IR A INICIO' : 'VOLVER AL INICIO'}
              </button>
            </div>
          ) : currentStepIndex === STEPS.length - 1 ? (
            (isEmitido || facturacion?.enlacePdf || facturacion?.enlacePdfFaregas) ? (
              <div className="flex items-center gap-3">
                {(facturacion?.enlacePdfFaregas || facturacion?.enlacePdf) && (
                  <button type="button" onClick={() => void descargarPdfFaregas()} className="rounded-lg border border-blue-200 bg-white px-5 py-2.5 text-xs font-black text-blue-800 hover:bg-blue-50">
                    VER / DESCARGAR COMPROBANTE
                  </button>
                )}
                {facturacion?.enlacePdf && (
                  <button type="button" onClick={() => void descargarPdfOficialNubefact()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" title="Descargar PDF oficial de NubeFact">
                    VER PDF NUBEFACT
                  </button>
                )}
                {isEmitido && (
                  <button type="button" onClick={() => navigate('/faregas/inicio')} className="rounded-lg bg-gold-3d px-6 py-2.5 text-xs font-black transition shadow-sm">
                    IR A INICIO
                  </button>
                )}
              </div>
            ) : null
          ) : currentStepIndex === indicePaso('DATOS_INICIALES') && !isConsultado ? (
            <span className="text-xs font-semibold text-slate-500">Complete los datos y presione Consultar.</span>
          ) : (
            <button
              type="button"
              onClick={irSiguientePaso}
              // El botón no se bloquea por falta de datos: sigue siendo
              // pulsable para que la validación pueda señalar el campo exacto.
              // Sólo se deshabilita mientras se guarda.
              disabled={isSavingStep}
              className={`rounded-lg px-6 py-2.5 text-xs font-black transition shadow-sm
                ${isSavingStep
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-gold-3d hover:-translate-y-0.5'
                }`}
            >
              {isSavingStep ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</span>
              ) : 'Siguiente Paso'}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
