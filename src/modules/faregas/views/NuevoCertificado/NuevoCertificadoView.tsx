/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { maestrosApi, inspeccionesApi } from '@/services/api';
import { faregasCertificadosApi } from '@/services/faregas/faregas-certificados.api';
import Swal from 'sweetalert2';
import type { MaestrosCajaResponse, MaestrosPagoResponse, MaestrosVehiculoResponse } from '@/types/maestros';
import { CheckCircle2, FileText, User, CreditCard, Box, ArrowLeft, Search } from 'lucide-react';
import { CajaStep } from './components/NuevoCertificado/CajaStep';
import { PagoStep } from './components/NuevoCertificado/PagoStep';
import { VehiculoStep } from './components/NuevoCertificado/VehiculoStep';
import { FacturacionStep } from './components/NuevoCertificado/FacturacionStep';
import { VerificacionStep } from './components/NuevoCertificado/VerificacionStep';
import type { TipoCertificadoFaregas } from '@/types/faregas';
// TipoCertificadoStep ya no se utiliza en FAREGAS, usamos CajaStep como Datos Iniciales
import { PropietarioStep } from './components/NuevoCertificado/PropietarioStep';
import { DatosGlpStep } from './components/NuevoCertificado/glp/DatosGlpStep';
import { ComponentesGlpStep } from './components/NuevoCertificado/glp/ComponentesGlpStep';
import { InspeccionGnvStep } from './components/NuevoCertificado/gnv/InspeccionGnvStep';
import { TipoConformidadStep } from './components/NuevoCertificado/conformidad/TipoConformidadStep';
import { CaracteristicasFinalesStep } from './components/NuevoCertificado/conformidad/CaracteristicasFinalesStep';
import { EmisionStep } from './components/NuevoCertificado/EmisionStep';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { MainLayoutContext } from '../Dashboard/MainLayout';

const customSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    borderRadius: '0.5rem',
    borderColor: state.isFocused ? '#f59e0b' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(253, 230, 138, 0.5)' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#f59e0b' : '#cbd5e1' },
    minHeight: '38px',
    fontSize: '0.75rem',
    fontWeight: '600'
  }),
  option: (base: any) => ({ ...base, fontSize: '0.75rem' }),
  menu: (base: any) => ({ ...base, zIndex: 50 }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
};



export interface FormCajaState {
  tipoPlaca: string;
  placa: string;
  concepto: string;
  categoria: string;
  tipoInspeccion: string;
  tipoCertificado: string;
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
  clase: string; marca: string; modelo: string; carroceria: string; marcaCarroceria: string; placaNueva: string;
  anioFabricacion: string; combustible: string; nroSerie: string; nroMotor: string; color: string;
  nroAsientos: string; nroPasajeros: string; nroPisos: string; longitud: string; ancho: string; altura: string;
  pesoNeto?: string; pesoSeco?: string; pesoBruto: string; cargaUtil: string; nroCilindros: string; nroRuedas: string; nroEjes: string;
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

export function NuevoCertificadoView() {
  const navigate = useNavigate();
  const { plantaKey: plantaSeleccionada } = useOutletContext<MainLayoutContext>();
  const { id } = useParams<{ id?: string }>();
  const [certificadoId, setCertificadoId] = useState<number | undefined>(id ? parseInt(id, 10) : undefined);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
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
    // Nuevos estados FAREGAS
  // El tipoCertificado ahora vive en formCaja.tipoCertificado
  const [formPropietario, setFormPropietario] = useState<any>({});
  const [formGlp, setFormGlp] = useState<any>({});
  const [formGnv, setFormGnv] = useState<any>({});
  const [formConformidad, setFormConformidad] = useState<any>({});
  
  const [titulares, setTitulares] = useState<any[]>([]);
  const [catalogoVerificaciones, setCatalogoVerificaciones] = useState<any>({});
  const [talleres, setTalleres] = useState<any[]>([]);
  const [isEmitido, setIsEmitido] = useState(false);
  const [isVehiculoValid, setIsVehiculoValid] = useState(false);
  const [vehiculoTab, setVehiculoTab] = useState<'DATOS' | 'SOAT'>('DATOS');
  const [formVehiculo, setFormVehiculo] = useState<FormVehiculoState>({
    clase: '', marca: '', modelo: '', carroceria: '', marcaCarroceria: '', placaNueva: '',
    anioFabricacion: '', combustible: '', nroSerie: '', nroMotor: '', color: '',
    nroAsientos: '', nroPasajeros: '', nroPisos: '', longitud: '', ancho: '', altura: '',
    nroEjes: '', nroRuedas: '', nroCilindros: '', pesoSeco: '', cargaUtil: '', pesoBruto: '',
    nroPuertas: '', salidasEmergencia: '', kilometraje: ''
  });

  // Form State (Facturación)
  const [isFacturacionValid, setIsFacturacionValid] = useState(false);
  const [formFacturacion, setFormFacturacion] = useState<FormFacturacionState>({
    tipoDocFac: '', nroDocFac: '', razonSocialFac: '', nombresFac: '', apellidosFac: '',
    paisFac: '', departamentoFac: '', provinciaFac: '', distritoFac: '', direccionFac: '',
    emailFac: '', telefonoFac: ''
  });

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
    const cargarBorrador = async () => {
      if (!certificadoId) return;
      try {
        setLoading(true);
        const res = await faregasCertificadosApi.obtenerBorradorCompleto(certificadoId);
        if (res?.data) {
          // Hidratar estado del borrador
          if (res.data.tipoCertificadoClave) setFormCaja(prev => ({...prev, tipoCertificado: res.data.tipoCertificadoClave}));
          
          if (res.data.vehiculo) {
             setFormVehiculo(prev => ({
                ...prev,
                placaNueva: res.data.vehiculo.placa || '',
                marca: res.data.vehiculo.marca || '',
                modelo: res.data.vehiculo.modelo || '',
                carroceria: res.data.vehiculo.carroceria || '',
                color: res.data.vehiculo.color || '',
                clase: res.data.vehiculo.clase || '',
                combustible: res.data.vehiculo.combustible || '',
                nroSerie: res.data.vehiculo.serie || '',
                nroMotor: res.data.vehiculo.motor || '',
                anioFabricacion: res.data.vehiculo.anoFabricacion?.toString() || '',
                nroAsientos: res.data.vehiculo.asientos?.toString() || '',
                nroCilindros: res.data.vehiculo.cilindros?.toString() || '',
                nroEjes: res.data.vehiculo.ejes?.toString() || '',
                nroRuedas: res.data.vehiculo.ruedas?.toString() || '',
                nroPasajeros: res.data.vehiculo.pasajeros?.toString() || '',
                pesoSeco: res.data.vehiculo.pesoSeco?.toString() || '',
                pesoBruto: res.data.vehiculo.pesoBruto?.toString() || '',
                cargaUtil: res.data.vehiculo.cargaUtil?.toString() || '',
                longitud: res.data.vehiculo.longitud?.toString() || '',
                altura: res.data.vehiculo.altura?.toString() || '',
                ancho: res.data.vehiculo.ancho?.toString() || ''
             }));
          }
          if (res.data.titulares) setTitulares(res.data.titulares);
          
          if (res.data.gnv) setFormGnv(res.data.gnv);
          if (res.data.glp) setFormGlp(res.data.glp);
          if (res.data.conformidad) setFormConformidad(res.data.conformidad);

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
      const res = await maestrosApi.obtenerMaestrosVehiculoAsync();
      setMaestrosVehiculo(res.data);
    } catch (err: any) {
      setError(err.message || 'Error cargando maestros de vehículo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStepIndex === 0 && !maestros) {
      cargarMaestros();
    } else if (currentStepIndex === 1 && !maestrosPago) {
      cargarMaestrosPago();
    } else if (currentStepIndex === 2 && !maestrosVehiculo) {
      cargarMaestrosVehiculo();
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
        if (currentStepIndex === 2) {
          if (vehiculoTab === 'DATOS') {
            setVehiculoTab('SOAT');
            return;
          }
        }
        irSiguientePaso();
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex === 2) {
          if (vehiculoTab === 'SOAT') {
            setVehiculoTab('DATOS');
            return;
          }
        }
        irPasoAnterior();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, vehiculoTab, formCaja, formVehiculo, formFacturacion, isVehiculoValid, isFacturacionValid, pagosAgregados]);

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

  

  const irSiguientePaso = async () => {
    if (currentStepIndex === 0 && !certificadoId) {
      try {
        const res = await faregasCertificadosApi.crearBorrador({
          tipoCertificadoClave: formCaja.tipoCertificado
        });
        if (res?.data?.id) {
          setCertificadoId(res.data.id);
          console.log("[DEBUG] Borrador FAREGAS creado con ID:", res.data.id);
          setCurrentStepIndex(currentStepIndex + 1);
        }
      } catch (e: any) {
        console.error("Error al crear borrador FAREGAS", e);
        Swal.fire('Error', e.message || 'No se pudo crear el borrador', 'error');
      }
    } else if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  


    const irPasoAnterior = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

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
    if (currentStepIndex === 1 && maestrosPago && formCaja.descuentoObj) {

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
    } else if (currentStepIndex === 1) {
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
              <div key={step.id} className="flex flex-col items-center gap-2 bg-[#f4f9ff] px-2">
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
              </div>
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
          <VehiculoStep
            tipoCertificado={formCaja.tipoCertificado as TipoCertificadoFaregas}
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
            catalogoVerificaciones={catalogoVerificaciones}
            talleres={talleres}
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
          />
        )}
        {STEPS[currentStepIndex].id === 'facturacion' && (
          <FacturacionStep
            formFacturacion={formFacturacion}
            setFormFacturacion={setFormFacturacion}
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
          />
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center">
        {currentStepIndex > 0 && !isEmitido ? (
          <button
            type="button"
            onClick={irPasoAnterior}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Atrás
          </button>
        ) : <div></div>}

        <div className="flex flex-col items-end gap-1.5">
          {currentStepIndex === STEPS.length - 1 ? (
            <div className="flex gap-3">
              {!isEmitido && (
                <button
                  type="button"
                  onClick={irSiguientePaso}
                  className="bg-gold-3d hover:-translate-y-0.5 rounded-lg px-6 py-2.5 text-xs font-black transition shadow-sm"
                >
                  FINALIZAR
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={irSiguientePaso}
              disabled={currentStepIndex === 0 && (!formCaja.tipoCertificado || !formCaja.placa || !formCaja.categoria)}
              className={`rounded-lg px-6 py-2.5 text-xs font-black transition shadow-sm
                ${(currentStepIndex === 0 && (!formCaja.tipoCertificado || !formCaja.placa || !formCaja.categoria))
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-gold-3d hover:-translate-y-0.5'
                }`}
            >
              Siguiente Paso
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
