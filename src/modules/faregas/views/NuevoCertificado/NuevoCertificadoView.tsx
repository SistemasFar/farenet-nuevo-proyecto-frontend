/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { maestrosApi, inspeccionesApi } from '@/services/api';
import { faregasCertificadosApi } from '../../services/faregas-certificados.api';
import { faregasClientesApi } from '../../services/faregas-clientes.api';
import Swal from 'sweetalert2';
import type { MaestrosCajaResponse, MaestrosPagoResponse, MaestrosVehiculoResponse } from '@/types/maestros';
import { CheckCircle2, FileText, User, CreditCard, ArrowLeft, Search, Loader2, Save } from 'lucide-react';
import { CajaStep } from './components/NuevoCertificado/CajaStep';
import { PagoStep } from './components/NuevoCertificado/PagoStep';
import { VehiculoStep } from './components/NuevoCertificado/VehiculoStep';
import type { TitularState } from './components/NuevoCertificado/TitularesList';
import { FacturacionStep } from './components/NuevoCertificado/FacturacionStep';
import { VerificacionStep } from './components/NuevoCertificado/VerificacionStep';
import type { TipoCertificadoFaregas } from '../../types/faregas';
import type { FacturacionFaregas } from '../../types/faregas-api';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { MainLayoutContext } from '../Dashboard/MainLayout';
import { validarDatosIniciales, validarExpedienteTecnico } from './faregas-wizard.validation';





export interface FormCajaState {
  tipoPlaca: string;
  placa: string;
  concepto: string;
  categoria: string;
  tipoInspeccion: string;
  tipoCertificado: string;
  modalidadCertificado: '' | 'INICIAL' | 'ANUAL';
  tipoAutorizacion: string;
  descuentoObj?: { source_table: string; source_id: string; isCuponidad?: boolean; documentoBusqueda?: string; uuid?: string };
  nrodocumentoreinspeccion?: string;
}

export interface FormPagoState {
  importe: string;
  tarjetaKey: string;
  entidadFinancieraKey: string;
  voucher?: string;
  nroOperacion?: string;
  fechaOperacion?: string;
  cuentaCorrienteKey?: string;
  fechaDeposito?: string;
  digitosTarjeta?: string;
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
  tipoDocFac: string; nroDocFac: string; razonSocialFac: string; nombresFac: string; apellidosFac: string;
  paisFac: string; departamentoFac: string; provinciaFac: string; distritoFac: string; direccionFac: string;
  emailFac: string; telefonoFac: string;
}

export interface FormVerificacionState {
  tipoInspeccion: string;
  tipoCertificado: string;
  tipoAutorizacion: string;
  linea?: string;
}

const textValue = (value: unknown) => value === null || value === undefined ? '' : String(value);

const mapVehiculoBorrador = (vehiculo: any): Partial<FormVehiculoState> => ({
  placaNueva: textValue(vehiculo.placa),
  clase: textValue(vehiculo.clase),
  marca: textValue(vehiculo.marca),
  modelo: textValue(vehiculo.modelo),
  version: textValue(vehiculo.version),
  anioFabricacion: textValue(vehiculo.anio_fabricacion ?? vehiculo.anioFabricacion),
  anioModelo: textValue(vehiculo.anio_modelo ?? vehiculo.anioModelo),
  vin: textValue(vehiculo.vin),
  serieChasis: textValue(vehiculo.serie_chasis ?? vehiculo.serieChasis),
  numeroMotor: textValue(vehiculo.numero_motor ?? vehiculo.numeroMotor),
  combustible: textValue(vehiculo.combustible),
  color: textValue(vehiculo.color),
  carroceria: textValue(vehiculo.carroceria),
  marcaCarroceria: textValue(vehiculo.marca_carroceria ?? vehiculo.marcaCarroceria),
  numeroCilindros: textValue(vehiculo.numero_cilindros ?? vehiculo.numeroCilindros),
  cilindrada: textValue(vehiculo.cilindrada),
  numeroEjes: textValue(vehiculo.numero_ejes ?? vehiculo.numeroEjes),
  numeroRuedas: textValue(vehiculo.numero_ruedas ?? vehiculo.numeroRuedas),
  numeroAsientos: textValue(vehiculo.numero_asientos ?? vehiculo.numeroAsientos),
  numeroPasajeros: textValue(vehiculo.numero_pasajeros ?? vehiculo.numeroPasajeros),
  longitud: textValue(vehiculo.longitud),
  ancho: textValue(vehiculo.ancho),
  alto: textValue(vehiculo.alto),
  pesoNeto: textValue(vehiculo.peso_neto ?? vehiculo.pesoNeto),
  pesoBruto: textValue(vehiculo.peso_bruto ?? vehiculo.pesoBruto),
  cargaUtil: textValue(vehiculo.carga_util ?? vehiculo.cargaUtil),
  potencia: textValue(vehiculo.potencia),
  formulaRodante: textValue(vehiculo.formula_rodante ?? vehiculo.formulaRodante),
  kilometraje: textValue(vehiculo.kilometraje),
  nroPuertas: textValue(vehiculo.nro_puertas ?? vehiculo.nroPuertas),
  nroPisos: textValue(vehiculo.nro_pisos ?? vehiculo.nroPisos),
  salidasEmergencia: textValue(vehiculo.salidas_emergencia ?? vehiculo.salidasEmergencia),
});

const mapTitularBorrador = (titular: any): TitularState => ({
  _uuid: crypto.randomUUID(),
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
  const { plantaKey: plantaSeleccionada } = useOutletContext<MainLayoutContext>();
  const { id } = useParams<{ id?: string }>();
  const [certificadoId, setCertificadoId] = useState<number | undefined>(id ? parseInt(id, 10) : undefined);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [furthestStepIndex, setFurthestStepIndex] = useState(0);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [maestros, setMaestros] = useState<MaestrosCajaResponse['data'] | null>(null);
  const [maestrosVehiculo, setMaestrosVehiculo] = useState<MaestrosVehiculoResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isConsultado, setIsConsultado] = useState(false);
  
  // Estados de vehiculo y facturacion (comunes)
  const [showAnularModal, setShowAnularModal] = useState(false);
  const [showCamposVaciosModal, setShowCamposVaciosModal] = useState(false);
  const [documentoDescuento, setDocumentoDescuento] = useState('');

  const [precioSubtotal, setPrecioSubtotal] = useState<number>(0);
  const [descuento, setDescuento] = useState<number>(0);
  const [precioTotal, setPrecioTotal] = useState<number>(0);

  const [documentoPago, setDocumentoPago] = useState<string>('');

  // Form State (Caja)
  const [formCaja, setFormCaja] = useState<FormCajaState>({
    tipoPlaca: '',
    placa: '',
    concepto: '',
    categoria: '',
    tipoInspeccion: '',
    tipoCertificado: '',
    modalidadCertificado: '',
    tipoAutorizacion: ''
  });

  // Pago State
  const [maestrosPago, setMaestrosPago] = useState<MaestrosPagoResponse['data'] | null>(null);
  const [pagosAgregados, setPagosAgregados] = useState<any[]>([]);
  const [pagoTab, setPagoTab] = useState<'EFECTIVO' | 'TARJETA' | 'BANCO'>('EFECTIVO');
  const [disablePagoTabs, setDisablePagoTabs] = useState(false);

  // Form State (Pago)
  const [formPago, setFormPago] = useState<FormPagoState>({
    importe: '',
    tarjetaKey: '',
    entidadFinancieraKey: '',
    cuentaCorrienteKey: '',
    nroOperacion: '',
    digitosTarjeta: '',
    fechaDeposito: new Date().toISOString().split('T')[0]
  });

  const [editingPagoIndex, setEditingPagoIndex] = useState<number | null>(null);

  // Form State (Vehículo)
  const [formPropietario, setFormPropietario] = useState<any>({});
  const [formGlp, setFormGlp] = useState<any>({});
  const [formGnv, setFormGnv] = useState<any>({});
  const [formConformidad, setFormConformidad] = useState<any>({});
  
  const [titulares, setTitulares] = useState<TitularState[]>([]);
  const [catalogoVerificaciones, setCatalogoVerificaciones] = useState<any>({});
  const [talleres, setTalleres] = useState<any[]>([]);
  const [isEmitido, setIsEmitido] = useState(false);
  const [isVehiculoValid, setIsVehiculoValid] = useState(false);
  const [vehiculoOrigen, setVehiculoOrigen] = useState<'FARENET' | 'BORRADOR' | 'MANUAL'>('MANUAL');
  const [expedienteError, setExpedienteError] = useState('');
  const [formVehiculo, setFormVehiculo] = useState<FormVehiculoState>({
    clase: '', marca: '', modelo: '', version: '', carroceria: '', marcaCarroceria: '', placaNueva: '',
    anioFabricacion: '', anioModelo: '', vin: '', combustible: '', serieChasis: '', numeroMotor: '', color: '',
    numeroAsientos: '', numeroPasajeros: '', nroPisos: '', longitud: '', ancho: '', alto: '',
    numeroEjes: '', numeroRuedas: '', numeroCilindros: '', cilindrada: '', pesoNeto: '', cargaUtil: '', pesoBruto: '', potencia: '',
    nroPuertas: '', salidasEmergencia: '', kilometraje: ''
  });

  // Form State (Facturación)
  const [isFacturacionValid, setIsFacturacionValid] = useState(false);
  const [formFacturacion, setFormFacturacion] = useState<FormFacturacionState>({
    tipoDocFac: '', nroDocFac: '', razonSocialFac: '', nombresFac: '', apellidosFac: '',
    paisFac: '', departamentoFac: '', provinciaFac: '', distritoFac: '', direccionFac: '',
    emailFac: '', telefonoFac: ''
  });
  const [facturacion, setFacturacion] = useState<FacturacionFaregas | null>(null);

  // Form State (Verificación)
  const [formVerificacion, setFormVerificacion] = useState<FormVerificacionState>({
    tipoInspeccion: '',
    tipoCertificado: '',
    tipoAutorizacion: '',
    linea: ''
  });

  const STEPS = React.useMemo(() => {
    return [
      { id: 'datos_iniciales', label: 'Datos Iniciales', icon: FileText },
      { id: 'vehiculo', label: 'Vehículo y Datos Técnicos', icon: Search },
      { id: 'pago', label: 'Pago', icon: CreditCard },
      { id: 'facturacion', label: 'Facturación', icon: User },
      { id: 'verificacion', label: 'Verificación / Emisión', icon: CheckCircle2 }
    ];
  }, []);

  const validarVerificacion = () => {
    return formVerificacion.tipoInspeccion !== '' &&
      formVerificacion.tipoCertificado !== '' &&
      formVerificacion.tipoAutorizacion !== '' &&
      formVerificacion.linea !== '';
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

  const getCategoriaName = () => {
    if (!maestros || !formCaja.categoria) return '';
    const cat = maestros.categorias.find(c => c.key === formCaja.categoria);
    return cat ? cat.nombre.toUpperCase() : '';
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
          if (res.data.tipo?.clave) {
            setFormCaja(prev => ({
              ...prev,
              tipoCertificado: res.data.tipo.clave,
              placa: res.data.vehiculo?.placa || prev.placa,
              categoria: res.data.vehiculo?.categoria || prev.categoria,
            }));
          }
          
          if (res.data.vehiculo) {
             setFormVehiculo(prev => ({ ...prev, ...mapVehiculoBorrador(res.data.vehiculo) }));
             setVehiculoOrigen('BORRADOR');
             setCurrentStepIndex(1);
             setFurthestStepIndex(1);
          }
          if (res.data.titulares) setTitulares(res.data.titulares.map(mapTitularBorrador));

          const pagosDetalle = await faregasCertificadosApi.obtenerPagos(certificadoId);
          if (pagosDetalle.data?.importeTotal) {
            setPrecioTotal(Number(pagosDetalle.data.importeTotal));
            setPrecioSubtotal(Number(pagosDetalle.data.importeTotal));
          }
          if (pagosDetalle.data?.orden) {
            setPrecioTotal(Number(pagosDetalle.data.orden.importe_total));
            setPrecioSubtotal(Number(pagosDetalle.data.orden.importe_total));
          }
          setPagosAgregados((pagosDetalle.data?.pagos || []).map((pago: any) => ({
            id: pago.id,
            tipo: String(pago.tipoContadoKey || '').toUpperCase(),
            importe: Number(pago.importe).toFixed(2),
            tarjetaKey: pago.tarjetaKey || '',
            nroOperacion: pago.nroOperacionBanco || pago.nroOperacionTarjeta || '',
            digitosTarjeta: pago.digitosTarjeta || '',
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
                tipoComprobante: fac.tipoComprobante || 'BOLETA',
                tipoDocumento: fac.tipoDocumentoCliente || 'DNI',
                numeroDocumento: fac.nroDocumento || '',
                razonSocial: fac.nombreRazonSocial || '',
                direccion: fac.direccion || '',
                email: fac.email || '',
                telefono: fac.telefono || ''
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
                pesoNetoPosterior: glp.peso_neto_posterior || '',
                cargaUtilPosterior: glp.carga_util_posterior || '',
                componentes: (detalle.data?.componentes || []).map((componente: any) => ({
                  orden: Number(componente.orden),
                  componente: componente.componente,
                  marca: componente.marca || '',
                  modelo: componente.modelo || '',
                  capacidadLitros: textValue(componente.capacidad_litros),
                  mesFabricacion: textValue(componente.mes_fabricacion),
                  anioFabricacion: textValue(componente.anio_fabricacion),
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

          console.log("[DEBUG] Borrador FAREGAS recuperado con éxito:", res.data.id);
        }
      } catch (error) {
        console.error("Error al cargar borrador FAREGAS:", error);
      } finally {
        setLoading(false);
      }
    };
    cargarBorrador();
  }, [certificadoId]);

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
      const res = await maestrosApi.obtenerMaestrosPagoAsync();
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
      const [maestrosResponse, verificacionesResponse, talleresResponse] = await Promise.all([
        maestrosApi.obtenerMaestrosVehiculoAsync(),
        faregasCertificadosApi.obtenerCatalogoVerificaciones(),
        faregasCertificadosApi.obtenerTalleres(),
      ]);
      setMaestrosVehiculo(maestrosResponse.data);
      setCatalogoVerificaciones(verificacionesResponse.data ?? verificacionesResponse);
      setTalleres(talleresResponse.data ?? []);
    } catch (err: any) {
      const message = err.message || 'No se pudieron cargar los catálogos del expediente técnico';
      setExpedienteError(message);
      Swal.fire('Error de carga', message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStepIndex === 0 && !maestros) {
      cargarMaestros();
    } else if (currentStepIndex === 1 && !maestrosVehiculo) {
      cargarMaestrosVehiculo();
    } else if (currentStepIndex === 2 && !maestrosPago) {
      cargarMaestrosPago();
    }
  }, [currentStepIndex, maestros, maestrosPago, maestrosVehiculo]);

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
  }, [formVehiculo.marca, maestrosVehiculo]);

  // NAVEGACIÓN CON FLECHAS DEL TECLADO
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input, textarea o select
      const tagName = (e.target as HTMLElement).tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
        return;
      }

      if (e.key === 'ArrowRight') {
        irSiguientePaso();
      } else if (e.key === 'ArrowLeft') {
        irPasoAnterior();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, formCaja, formVehiculo, formFacturacion, isVehiculoValid, isFacturacionValid, pagosAgregados, isSavingStep]);

  // Sincronizar Marca con Marca Carrocería

  const handleSelectChange = (name: string, option: any) => {
    const value = option ? option.value : '';
    setFormCaja((prev: any) => ({ ...prev, [name]: value }));
    const critical = ['tipoPlaca', 'placa', 'concepto', 'categoria', 'tipoCertificado', 'tipoAutorizacion'];
    if (critical.includes(name)) {
      setIsConsultado(false);
    }
  };

  const handleCajaChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    const critical = ['tipoPlaca', 'placa', 'concepto', 'categoria', 'tipoCertificado', 'tipoAutorizacion'];

    if (critical.includes(name)) {
      setIsConsultado(false);
    }

    if (name === 'tipoPlaca') {
      setFormCaja((prev: any) => ({ ...prev, [name]: value }));
      return;
    }

    if (name === 'placa') {
      let val = value.toUpperCase();
      let maxLen = 17;

      const tp = maestros?.tiposPlaca?.find((x: any) => x.id?.toString() === formCaja.tipoPlaca?.toString());
      if (tp) {
        const n = tp.nombre?.toUpperCase() || '';
        if (n.includes('DIPLOMATIC') || n.includes('DIPLOMÁTIC')) maxLen = 6;
        else if (n.includes('INCORPORACI')) maxLen = 17;
        else if (n.includes('RUTINARI')) maxLen = 6;
        else if (n.includes('EXTRANJER')) maxLen = 7;
      }

      if (val.length > maxLen) {
        val = val.slice(0, maxLen);
      }

      setFormCaja((prev: any) => ({ ...prev, [name]: val }));
      return;
    }

    setFormCaja((prev: any) => ({ ...prev, [name]: value }));
  };





  

  const consultarVehiculoFarenet = async () => {
    if (!formCaja.placa.trim()) return;
    try {
      const response = await faregasCertificadosApi.obtenerVehiculo(formCaja.placa.trim());
      if (response?.data) {
        const placaEncontrada = textValue(response.data.placa) || formCaja.placa.trim().toUpperCase();
        const categoriaEncontrada = textValue(response.data.categoriaKey ?? response.data.categoria);
        setFormVehiculo(prev => ({ ...prev, ...mapVehiculoBorrador(response.data), placaNueva: placaEncontrada }));
        setFormCaja((prev: any) => ({
          ...prev,
          placa: placaEncontrada,
          categoria: categoriaEncontrada || prev.categoria,
        }));
        setVehiculoOrigen('FARENET');
        Swal.fire({
          icon: 'success',
          title: 'Vehículo encontrado',
          text: 'Los datos se autocompletaron desde Farenet y pueden editarse.',
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
        const actualizado = { ...titular, clienteId };
        guardados.push(actualizado);
        setTitulares(prev => prev.map(item => item._uuid === titular._uuid ? actualizado : item));
      } else {
        const response = await faregasCertificadosApi.crearTitular(idBorrador, data);
        const creado = { ...titular, clienteId, titularId: Number(response.data.id) };
        guardados.push(creado);
        setTitulares(prev => prev.map(item => item._uuid === titular._uuid ? creado : item));
      }
    }
    setTitulares(guardados);
  };

  const guardarExpedienteTecnico = async (idBorrador: number) => {
    await faregasCertificadosApi.guardarVehiculoBorrador(idBorrador, {
      placa: formCaja.placa || formVehiculo.placaNueva || null,
      categoria: formCaja.categoria || null,
      clase: formVehiculo.clase || null,
      marca: formVehiculo.marca || null,
      modelo: formVehiculo.modelo || null,
      version: formVehiculo.version || null,
      anioFabricacion: formVehiculo.anioFabricacion || null,
      anioModelo: formVehiculo.anioModelo || null,
      vin: formVehiculo.vin || null,
      serieChasis: formVehiculo.serieChasis || null,
      numeroMotor: formVehiculo.numeroMotor || null,
      combustible: formVehiculo.combustible || null,
      color: formVehiculo.color || null,
      carroceria: formVehiculo.carroceria || null,
      numeroCilindros: formVehiculo.numeroCilindros || null,
      cilindrada: formVehiculo.cilindrada || null,
      numeroEjes: formVehiculo.numeroEjes || null,
      numeroRuedas: formVehiculo.numeroRuedas || null,
      numeroAsientos: formVehiculo.numeroAsientos || null,
      numeroPasajeros: formVehiculo.numeroPasajeros || null,
      longitud: formVehiculo.longitud || null,
      ancho: formVehiculo.ancho || null,
      alto: formVehiculo.alto || null,
      pesoNeto: formVehiculo.pesoNeto || null,
      pesoBruto: formVehiculo.pesoBruto || null,
      cargaUtil: formVehiculo.cargaUtil || null,
      potencia: formVehiculo.potencia || null,
      formulaRodante: formVehiculo.formulaRodante || null,
    });
    await guardarTitularesBorrador(idBorrador);
  };

  const guardarPasoVehiculo = async (idBorrador: number) => {
    await guardarExpedienteTecnico(idBorrador);
    if (formCaja.tipoCertificado === 'GNV_ANUAL') {
      await faregasCertificadosApi.guardarGnv(idBorrador, {
        tallerAutorizadoId: formGnv.tallerAutorizadoId || null,
        vigenciaHasta: formGnv.fechaVigencia || formGnv.vigencia_hasta || null,
        modalidad: formCaja.modalidadCertificado || null,
        numeroChip: formGnv.numeroChip || formGnv.numero_chip || null,
        combustiblePosterior: formCaja.modalidadCertificado === 'INICIAL' ? 'BI - COMBUSTIBLE GNV' : null,
        pesoNetoPosterior: formCaja.modalidadCertificado === 'INICIAL' ? (formGnv.pesoNetoPosterior || null) : null,
        cargaUtilPosterior: formCaja.modalidadCertificado === 'INICIAL' ? (formGnv.cargaUtilPosterior || null) : null,
      });
      if (formGnv.componentes?.length > 0) {
        await faregasCertificadosApi.guardarComponentesGnv(idBorrador, {
          componentes: formGnv.componentes.map((c: any, i: number) => ({
            ...c, orden: i + 1
          }))
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
        pesoNetoPosterior: formCaja.modalidadCertificado === 'INICIAL' ? (formGlp.pesoNetoPosterior || null) : null,
        cargaUtilPosterior: formCaja.modalidadCertificado === 'INICIAL' ? (formGlp.cargaUtilPosterior || null) : null,
      });
      await faregasCertificadosApi.guardarComponentesGlp(idBorrador, {
        componentes: (formGlp.componentes || []).map((componente: any, index: number) => ({
          orden: componente.orden || index + 1,
          componente: componente.componente,
          marca: componente.marca || null,
          modelo: componente.modelo || null,
          capacidadLitros: componente.capacidadLitros || null,
          mesFabricacion: componente.mesFabricacion || null,
          anioFabricacion: componente.anioFabricacion || null,
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
      pagos: pagosAgregados.map(pago => ({
        tipo: pago.tipo,
        importe: pago.importe,
        tarjetaKey: pago.tarjetaKey || null,
        nroOperacion: pago.nroOperacion || null,
        digitosTarjeta: pago.digitosTarjeta || null,
        cuentaCorrienteKey: pago.cuentaCorrienteKey || null,
        entidadFinancieraKey: pago.entidadFinancieraKey || null,
        fechaDeposito: pago.fechaDeposito || null,
      })),
    });
    const pagosGuardados = response.data?.pagos || [];
    setPagosAgregados(pagosGuardados.map((pago: any) => ({
      id: pago.id,
      tipo: String(pago.tipoContadoKey || '').toUpperCase(),
      importe: Number(pago.importe).toFixed(2),
      tarjetaKey: pago.tarjetaKey || '',
      nroOperacion: pago.nroOperacionBanco || pago.nroOperacionTarjeta || '',
      digitosTarjeta: pago.digitosTarjeta || '',
      cuentaCorrienteKey: pago.cuentaCorrienteKey || '',
      entidadFinancieraKey: pago.entidadFinancieraKey || '',
      fechaDeposito: textValue(pago.fechdeposito).slice(0, 10),
    })));
    setLastSavedAt(new Date());
  };

  const eliminarTitularBorrador = async (titular: TitularState) => {
    if (!certificadoId || !titular.titularId) return;
    try {
      await faregasCertificadosApi.eliminarTitular(certificadoId, titular.titularId);
      setTitulares(prev => prev.filter(item => item._uuid !== titular._uuid));
    } catch (e: any) {
      Swal.fire('No se pudo eliminar', e.message || 'Ocurrió un error al eliminar el titular.', 'error');
    }
  };

  const irSiguientePaso = async () => {
    if (isSavingStep) return;
    if (currentStepIndex === 0) {
      if (mostrarErroresPaso(validarDatosIniciales(formCaja))) return;
      setIsSavingStep(true);
      try {
        let idBorrador = certificadoId;
        if (!idBorrador) {
          const res = await faregasCertificadosApi.crearBorrador({ tipoCertificadoClave: formCaja.tipoCertificado });
          idBorrador = Number(res?.data?.id);
          if (!idBorrador) throw new Error('El servidor no devolvió el identificador del borrador.');
          setCertificadoId(idBorrador);
        } else {
          await faregasCertificadosApi.actualizarBorrador(idBorrador, { tipoCertificadoClave: formCaja.tipoCertificado });
        }
        if (formCaja.tipoCertificado === 'GLP_ANUAL') {
          setFormGlp((prev: any) => ({ ...prev, modalidad: formCaja.modalidadCertificado }));
        } else if (formCaja.tipoCertificado === 'GNV_ANUAL') {
          setFormGnv((prev: any) => ({ ...prev, modalidad: formCaja.modalidadCertificado }));
        }
        await consultarVehiculoFarenet();
        const tarifaResponse = await faregasCertificadosApi.obtenerPagos(idBorrador);
        if (tarifaResponse.data?.importeTotal) {
          setPrecioTotal(Number(tarifaResponse.data.importeTotal));
          setPrecioSubtotal(Number(tarifaResponse.data.importeTotal));
        }
        setLastSavedAt(new Date());
        setFurthestStepIndex(prev => Math.max(prev, 1));
        setCurrentStepIndex(1);
      } catch (e: any) {
        Swal.fire('Error', e.message || 'No se pudo crear el borrador', 'error');
      } finally {
        setIsSavingStep(false);
      }
    } else if (currentStepIndex < STEPS.length - 1) {
      if (STEPS[currentStepIndex].id === 'vehiculo' && certificadoId) {
        const errores = validarExpedienteTecnico({
          tipoCertificado: formCaja.tipoCertificado as TipoCertificadoFaregas,
          modalidad: formCaja.modalidadCertificado,
          caja: formCaja,
          vehiculo: formVehiculo,
          titulares,
          gnv: formGnv,
          glp: formGlp,
          conformidad: formConformidad,
        });
        if (mostrarErroresPaso(errores)) return;
        setIsSavingStep(true);
        try {
          await guardarPasoVehiculo(certificadoId);
        } catch (e: any) {
          Swal.fire('No se pudo guardar', e.message || 'Revise los datos del expediente técnico.', 'error');
          return;
        } finally {
          setIsSavingStep(false);
        }
      } else if (STEPS[currentStepIndex].id === 'pago' && certificadoId) {
        const totalPagado = pagosAgregados.reduce((total, pago) => total + Number(pago.importe || 0), 0);
        if (Math.abs(totalPagado - precioTotal) > 0.009) {
          mostrarErroresPaso([`El pago debe completar S/ ${precioTotal.toFixed(2)}. Saldo pendiente: S/ ${Math.max(0, precioTotal - totalPagado).toFixed(2)}.`]);
          return;
        }
        setIsSavingStep(true);
        try {
          await guardarPasoPagos(certificadoId);
        } catch (e: any) {
          Swal.fire('No se pudo guardar el pago', e.message || 'Revise los medios de pago.', 'error');
          return;
        } finally {
          setIsSavingStep(false);
        }
      } else if (STEPS[currentStepIndex].id === 'facturacion') {
        const tieneDatosFacturacion = Boolean(formFacturacion.nroDocumento?.trim() || formFacturacion.nombreRazonSocial?.trim() || formFacturacion.direccion?.trim());
        if (tieneDatosFacturacion) {
          setIsSavingStep(true);
          try {
            await faregasCertificadosApi.guardarFacturacion(certificadoId, formFacturacion);
          } catch (e: any) {
            const res = await Swal.fire({
              title: 'Facturación Incompleta',
              text: (e.message || 'Los datos de facturación no son válidos.') + '\n\n¿Desea omitir el guardado y avanzar a la previsualización?',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Sí, avanzar sin guardar',
              cancelButtonText: 'No, corregir datos',
            });
            if (!res.isConfirmed) {
              setIsSavingStep(false);
              return; // Si no guarda, no avanza.
            }
          } finally {
            setIsSavingStep(false);
          }
        }
      }
      const siguiente = currentStepIndex + 1;
      setFurthestStepIndex(prev => Math.max(prev, siguiente));
      setCurrentStepIndex(siguiente);
    }
  };

  const irAtrasOStep = async (destino: number) => {
    if (isSavingStep || destino < 0 || destino >= currentStepIndex || destino > furthestStepIndex) return;
    if (STEPS[currentStepIndex].id === 'vehiculo' && certificadoId) {
      setIsSavingStep(true);
      try {
        await guardarPasoVehiculo(certificadoId);
      } catch (e: any) {
        Swal.fire('No se pudo guardar', e.message || 'No se cambió de paso para evitar perder información.', 'error');
        return;
      } finally {
        setIsSavingStep(false);
      }
    } else if (STEPS[currentStepIndex].id === 'pago' && certificadoId) {
      setIsSavingStep(true);
      try {
        await guardarPasoPagos(certificadoId);
      } catch (e: any) {
        Swal.fire('No se pudo guardar', e.message || 'No se cambió de paso para evitar perder los pagos.', 'error');
        return;
      } finally {
        setIsSavingStep(false);
      }
    } else if (STEPS[currentStepIndex].id === 'facturacion' && certificadoId) {
      const tieneDatosFacturacion = Boolean(formFacturacion.nroDocumento?.trim() || formFacturacion.nombreRazonSocial?.trim() || formFacturacion.direccion?.trim());
      if (tieneDatosFacturacion) {
        setIsSavingStep(true);
        try {
          await faregasCertificadosApi.guardarFacturacion(certificadoId, formFacturacion);
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

  const montoPendiente = Math.max(0, precioTotal - pagosAgregados.reduce((sum, p) => sum + parseFloat(p.importe || '0'), 0));

  // Efecto para inyectar automticamente el pago de Cuponidad
  useEffect(() => {
    if (formCaja.descuentoObj?.isCuponidad) {
      const uuid = formCaja.descuentoObj.documentoBusqueda || formCaja.descuentoObj.uuid;
      const cuponidadTarjeta = maestrosPago?.tarjetas?.find((t: any) => t.nombre.toUpperCase().includes('CUPONIDAD'));

      if (cuponidadTarjeta) {
        const pagoExiste = pagosAgregados.some((p: any) => p.nroOperacion === uuid);
        if (!pagoExiste) {
          const nuevoPago = {
            tipo: 'TARJETA',
            tarjetaKey: cuponidadTarjeta.key,
            nroOperacion: uuid,
            importe: precioTotal.toFixed(2),
            entidadFinancieraKey: '',
            cuentaCorrienteKey: '',
            fechaDeposito: '',
            digitosTarjeta: ''
          };
          setPagosAgregados([nuevoPago]);
        }
      }
    }
  }, [formCaja.descuentoObj, precioTotal, maestrosPago, pagosAgregados]);

  // Efecto para auto-llenar pagos de Cortesía u otros que dejan el total en 0
  useEffect(() => {
    if (currentStepIndex === 2 && maestrosPago && formCaja.descuentoObj) {

      // Si el monto pendiente es 0 (ej. Cortesía, 100% descuento)
      if (montoPendiente === 0) {
        setDisablePagoTabs(true);
        setFormPago((prev: any) => ({ ...prev, importe: '0' }));
        // Si el precio total es 0, asegurarnos de no tener pagos "basura"
        if (precioTotal === 0 && pagosAgregados.length > 0) {
          setPagosAgregados([]);
        }
      } else {
        setDisablePagoTabs(false);
      }
    } else if (currentStepIndex === 2) {
      // En caso de que se haya quitado el descuento
      if (montoPendiente > 0) {
        setDisablePagoTabs(false);
      }
    }
  }, [currentStepIndex, formCaja.descuentoObj, maestrosPago, precioTotal, montoPendiente]);

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
      const isPagoWeb = nameUpper.includes('PAGO WEB');
      const isEspecial = isCuponidad || isYapePlin || isPagoWeb;

      if (!formPago.tarjetaKey || !formPago.nroOperacion) {
        alert('Complete los campos obligatorios de la tarjeta.');
        return;
      }
      if (!isEspecial && !formPago.digitosTarjeta) {
        alert('Ingrese los últimos 4 dígitos de la tarjeta.');
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

    const nuevoPago = {
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
      entidadFinancieraKey: '',
      cuentaCorrienteKey: '',
      nroOperacion: '',
      digitosTarjeta: '',
      fechaDeposito: new Date().toISOString().split('T')[0]
    });
  };

  const eliminarPago = (index: number) => {
    const nuevosPagos = [...pagosAgregados];
    nuevosPagos.splice(index, 1);
    setPagosAgregados(nuevosPagos);
  };

  if (loading && currentStepIndex === 0) {
    return <div className="p-8 text-center text-slate-500">Cargando opciones...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="w-full min-h-[calc(100vh-10rem)] bg-white rounded-2xl shadow-xl border-t-[4px] border-solid border-t-[#f59e0b] overflow-hidden flex flex-col" style={{ borderImage: "linear-gradient(to right, #fde047 0%, #f59e0b 50%, #b45309 100%) 1" }}>

      {/* Header / Stepper */}
      <div className="bg-[#f4f9ff] border-b border-[#052a79]/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate('/faregas/inicio')}
            className="p-1.5 text-slate-400 hover:text-[#052a79] hover:bg-slate-100 rounded-full transition"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            Nuevo Certificado
          </h2>
          {certificadoId && (
            <div className="ml-auto flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm">
              {isSavingStep ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#052a79]" /> : <Save className="h-3.5 w-3.5 text-green-600" />}
              <span>BORRADOR #{certificadoId}</span>
              <span className="text-slate-300">|</span>
              <span>{isSavingStep ? 'GUARDANDO…' : lastSavedAt ? `GUARDADO ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'CARGADO'}</span>
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
                onClick={() => irAtrasOStep(index)}
                disabled={index >= currentStepIndex || isSavingStep}
                className={`flex flex-col items-center gap-2 bg-[#f4f9ff] px-2 ${index < currentStepIndex && !isSavingStep ? 'cursor-pointer' : 'cursor-default'}`}
                title={index < currentStepIndex ? `Volver a ${step.label}` : index === currentStepIndex ? 'Paso actual' : 'Complete el paso anterior'}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-[#052a79] text-white shadow-md ring-4 ring-blue-100' :
                    isCompleted ? 'bg-gold-3d shadow-sm border-none' :
                      'bg-white text-slate-400 border-2 border-slate-200'
                    }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider mt-1 ${isActive ? 'text-[#052a79]' : isCompleted ? 'text-gold-3d drop-shadow-sm' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8">
        {STEPS[currentStepIndex].id === 'datos_iniciales' && (
          <CajaStep
            formCaja={formCaja}
            setFormCaja={setFormCaja}
          />
        )}
        {STEPS[currentStepIndex].id === 'vehiculo' && (
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
              onRemoveTitular={eliminarTitularBorrador}
              catalogoVerificaciones={catalogoVerificaciones}
              talleres={talleres}
              vehiculoOrigen={vehiculoOrigen}
              maestrosVehiculo={maestrosVehiculo}
            />
          </>
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
            maestrosPago={maestrosPago}
          />
        )}
        {STEPS[currentStepIndex].id === 'facturacion' && (
          <FacturacionStep
            certificadoId={certificadoId}
            formFacturacion={formFacturacion}
            setFormFacturacion={setFormFacturacion}
            facturacion={facturacion}
            onFacturacionChange={setFacturacion}
          />
        )}
        {STEPS[currentStepIndex].id === 'verificacion' && (
          <VerificacionStep
            certificadoId={certificadoId}
            onEmisionExitosa={() => setIsEmitido(true)}
            tipoCertificado={formCaja.tipoCertificado as TipoCertificadoFaregas}
            formCaja={formCaja}
            formVehiculo={formVehiculo}
            formPropietario={formPropietario}
            formGlp={formGlp}
            formGnv={formGnv}
            formConformidad={formConformidad}
            pagosAgregados={pagosAgregados}
            formFacturacion={formFacturacion}
            facturacion={facturacion}
          />
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center">
        {currentStepIndex > 0 && !isEmitido ? (
          <button
            type="button"
            onClick={irPasoAnterior}
            disabled={isSavingStep}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            {isSavingStep ? 'Guardando…' : 'Atrás'}
          </button>
        ) : <div></div>}

        <div className="flex flex-col items-end gap-1.5">
          {currentStepIndex === STEPS.length - 1 ? (
            !isEmitido ? <span className="text-xs font-semibold text-slate-500">Revise la validación y emita desde el panel superior.</span> : <span className="text-xs font-bold text-green-700">Certificado emitido.</span>
          ) : (
            <button
              type="button"
              onClick={irSiguientePaso}
              disabled={isSavingStep || (currentStepIndex === 0 && (!formCaja.tipoCertificado || !formCaja.placa || !formCaja.categoria || (formCaja.tipoCertificado !== 'CONFORMIDAD' && !formCaja.modalidadCertificado)))}
              className={`rounded-lg px-6 py-2.5 text-xs font-black transition shadow-sm
                ${(isSavingStep || (currentStepIndex === 0 && (!formCaja.tipoCertificado || !formCaja.placa || !formCaja.categoria || (formCaja.tipoCertificado !== 'CONFORMIDAD' && !formCaja.modalidadCertificado))))
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
