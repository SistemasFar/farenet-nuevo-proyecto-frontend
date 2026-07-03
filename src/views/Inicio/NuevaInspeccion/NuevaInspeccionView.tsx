/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { plantaSession, maestrosApi, inspeccionesApi } from '../../../services/api';
import Swal from 'sweetalert2';
import type { MaestrosCajaResponse, MaestrosPagoResponse } from '../../../types/maestros';
import { CheckCircle2, FileText, User, CreditCard, Box, ArrowLeft, Search } from 'lucide-react';
import { CajaStep } from './components/NuevaInspeccion/CajaStep';
import { PagoStep } from './components/NuevaInspeccion/PagoStep';
import { VehiculoStep } from './components/NuevaInspeccion/VehiculoStep';
import { FacturacionStep } from './components/NuevaInspeccion/FacturacionStep';
import { VerificacionStep } from './components/NuevaInspeccion/VerificacionStep';

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

interface NuevaInspeccionViewProps {
  onBack?: () => void;
  plantaSeleccionada?: string;
  inspeccionIdBorrador?: string;
}

const STEPS = [
  { id: 'caja', label: 'Caja', icon: Box },
  { id: 'pago', label: 'Pago', icon: CreditCard },
  { id: 'vehiculo', label: 'Vehículo', icon: Search },
  { id: 'cliente', label: 'Facturación', icon: User },
  { id: 'verificacion', label: 'Verificación', icon: FileText }
];

export function NuevaInspeccionView({ onBack, plantaSeleccionada, inspeccionIdBorrador }: NuevaInspeccionViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentBorradorId, setCurrentBorradorId] = useState<string | undefined>(inspeccionIdBorrador);
  const [maestros, setMaestros] = useState<MaestrosCajaResponse['data'] | null>(null);
  const [maestrosVehiculo, setMaestrosVehiculo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isConsultado, setIsConsultado] = useState(false);
  const [showAnularModal, setShowAnularModal] = useState(false);
  const [showCamposVaciosModal, setShowCamposVaciosModal] = useState(false);
  const [documentoDescuento, setDocumentoDescuento] = useState('');

  const [precioSubtotal, setPrecioSubtotal] = useState<number>(0);
  const [descuento, setDescuento] = useState<number>(0);
  const [precioTotal, setPrecioTotal] = useState<number>(0);

  const [documentoPago, setDocumentoPago] = useState<string>('');

  // Form State (Caja)
  const [formCaja, setFormCaja] = useState<any>({
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
  const [formPago, setFormPago] = useState({
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
  const [isVehiculoValid, setIsVehiculoValid] = useState(false);
  const [vehiculoTab, setVehiculoTab] = useState<'DATOS' | 'SOAT' | 'PROPIETARIO'>('DATOS');
  const [formVehiculo, setFormVehiculo] = useState({
    clase: '', marca: '', modelo: '', carroceria: '', marcaCarroceria: '', placaNueva: '',
    anioFabricacion: '', combustible: '', nroSerie: '', nroMotor: '', color: '',
    nroAsientos: '', nroPasajeros: '', nroPisos: '', longitud: '', ancho: '', altura: '',
    nroEjes: '', nroRuedas: '', nroCilindros: '', pesoSeco: '', cargaUtil: '', pesoBruto: '',
    nroPuertas: '', salidasEmergencia: '', kilometraje: ''
  });

  // Form State (Facturación)
  const [isFacturacionValid, setIsFacturacionValid] = useState(false);
  const [formFacturacion, setFormFacturacion] = useState({
    tipoDocFac: '', nroDocFac: '', razonSocialFac: '', nombresFac: '', apellidosFac: '',
    paisFac: '', departamentoFac: '', provinciaFac: '', distritoFac: '', direccionFac: '',
    emailFac: '', telefonoFac: ''
  });

  // Form State (Verificación)
  const [formVerificacion, setFormVerificacion] = useState({
    tipoInspeccion: '',
    tipoCertificado: '',
    tipoAutorizacion: '',
    linea: ''
  });

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
    if (inspeccionIdBorrador) {
      setLoading(true);
      inspeccionesApi.obtenerBorrador(inspeccionIdBorrador)
        .then(res => {
          if (res?.data) {
            const data = res.data;
            if (data.formCaja) setFormCaja(data.formCaja);
            if (data.formVehiculo) setFormVehiculo(data.formVehiculo);
            if (data.formFacturacion) setFormFacturacion(data.formFacturacion);
            if (data.formVerificacion) setFormVerificacion(data.formVerificacion);
            if (data.pagosAgregados) setPagosAgregados(data.pagosAgregados);
            if (data.currentStepIndex) setCurrentStepIndex(data.currentStepIndex);

            // Restaurar estado del Resumen de Pago
            if (data.isConsultado) setIsConsultado(data.isConsultado);
            if (data.documentoPago) setDocumentoPago(data.documentoPago);
            if (data.precioSubtotal) setPrecioSubtotal(data.precioSubtotal);
            if (data.descuento) setDescuento(data.descuento);
            if (data.precioTotal) setPrecioTotal(data.precioTotal);
            if (data.documentoDescuento) setDocumentoDescuento(data.documentoDescuento);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [inspeccionIdBorrador]);

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
          } else if (vehiculoTab === 'SOAT') {
            setVehiculoTab('PROPIETARIO');
            return;
          }
        }
        irSiguientePaso();
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex === 2) {
          if (vehiculoTab === 'PROPIETARIO') {
            setVehiculoTab('SOAT');
            return;
          } else if (vehiculoTab === 'SOAT') {
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
    setFormCaja((prev) => ({ ...prev, [name]: value, ...(name === 'tipoPlaca' ? { placa: '' } : {}) }));
  };

  const handleCajaChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;

    // Si cambia el tipo de placa, limpiamos la placa para evitar problemas de formato
    if (name === 'tipoPlaca') {
      setFormCaja((prev) => ({ ...prev, [name]: value, placa: '' }));
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

      setFormCaja((prev) => ({ ...prev, [name]: val }));
      return;
    }

    setFormCaja((prev) => ({ ...prev, [name]: value }));
  };

  const validarCaja = () => {
    // Validar que todos los campos requeridos estén llenos
    if (!formCaja.tipoPlaca || !formCaja.placa || !formCaja.concepto || !formCaja.categoria || !formCaja.tipoInspeccion || !formCaja.tipoCertificado) {
      return false;
    }
    return true;
  };

  const irSiguientePaso = async () => {
    if (currentStepIndex === 0 && (!validarCaja() || !isConsultado)) {
      alert('Por favor completa todos los campos de la caja y consulta exitosamente antes de continuar.');
      return;
    }

    if (currentStepIndex === 2 && !isVehiculoValid) {
      alert('Por favor completa todos los campos obligatorios del vehículo, SOAT y Propietario antes de continuar.');
      return;
    }

    if (currentStepIndex === 3 && !isFacturacionValid) {
      alert('Por favor completa todos los campos obligatorios de Facturación antes de continuar.');
      return;
    }

    if (currentStepIndex === 4 && !validarVerificacion()) {
      alert('Por favor completa todos los campos obligatorios de Operación (Tipos y Línea) antes de finalizar.');
      return;
    }

    try {
      // Auto-guardar borrador
      const payload = {
        idBorrador: currentBorradorId,
        currentStepIndex: currentStepIndex + 1,
        plantaKey: plantaSeleccionada,
        formCaja,
        pagosAgregados,
        formVehiculo,
        formFacturacion,
        formVerificacion,
        precioSubtotal,
        descuento,
        precioTotal,
        documentoPago,
        isConsultado,
        documentoDescuento
      };

      const res = await inspeccionesApi.guardarBorrador(payload);
      if (res?.data?.idBorrador) {
        setCurrentBorradorId(res.data.idBorrador);
      }
    } catch (err) {
      console.warn('No se pudo guardar el borrador silenciosamente', err);
    }

    if (currentStepIndex === STEPS.length - 1) {
      try {
        setLoading(true);
        const savePayload = {
          plantaKey: plantaSeleccionada,
          formCaja,
          pagosAgregados,
          formVehiculo,
          formFacturacion,
          formVerificacion,
          idBorrador: currentBorradorId,
          documentoPago,
          isConsultado,
          precioSubtotal,
          descuento,
          precioTotal
        };
        const res = await inspeccionesApi.guardar(savePayload);
        const finalId = res?.data?.data?.nroInspeccion || res?.data?.nroInspeccion || 'Generado con éxito';

        if (formCaja.descuentoObj && formCaja.descuentoObj.source_table && formCaja.descuentoObj.source_id) {
          try {
            await inspeccionesApi.consumirDescuento(formCaja.descuentoObj.source_table, formCaja.descuentoObj.source_id);
          } catch (e) {
            console.error("No se pudo consumir el descuento", e);
          }
        }

        Swal.fire({
          icon: 'success',
          title: '¡Guardado!',
          text: `La inspección se guardó correctamente en la base de datos. Código Oficial: ${finalId}`,
          confirmButtonColor: '#052a79'
        });
        if (onBack) onBack();
      } catch (error: any) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'No se pudo guardar la inspección.',
          confirmButtonColor: '#d33'
        });
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };
  const handleGuardarSoloBorrador = async () => {
    try {
      setLoading(true);
      const payload = {
        idBorrador: currentBorradorId,
        currentStepIndex: currentStepIndex,
        plantaKey: plantaSeleccionada,
        formCaja,
        pagosAgregados,
        formVehiculo,
        formFacturacion,
        formVerificacion,
        precioSubtotal,
        descuento,
        precioTotal,
        documentoPago,
        isConsultado,
        documentoDescuento
      };
      const res = await inspeccionesApi.guardarBorrador(payload);
      if (res?.data?.idBorrador) {
        setCurrentBorradorId(res.data.idBorrador);
      }
      Swal.fire({
        icon: 'success',
        title: 'Borrador Guardado',
        text: 'Los datos han sido guardados temporalmente. Puedes salir y continuar más tarde.',
        timer: 3000,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'No se pudo guardar el borrador.',
      });
    } finally {
      setLoading(false);
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
      nroOperacion: formPago.nroOperacion.trim()
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
            onClick={onBack}
            className="p-1.5 text-slate-400 hover:text-[#052a79] hover:bg-slate-100 rounded-full transition"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            Nueva Inspección
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

        {/* === PASO 1: CAJA === */}
        {currentStepIndex === 0 && (
          <CajaStep
            maestros={maestros}
            formCaja={formCaja}
            setFormCaja={setFormCaja}
            setFormVehiculo={setFormVehiculo}
            handleCajaChange={handleCajaChange}
            handleSelectChange={handleSelectChange}
            validarCaja={validarCaja}
            irSiguientePaso={irSiguientePaso}
            isConsultado={isConsultado}
            setIsConsultado={setIsConsultado}
            showAnularModal={showAnularModal}
            setShowAnularModal={setShowAnularModal}
            showCamposVaciosModal={showCamposVaciosModal}
            setShowCamposVaciosModal={setShowCamposVaciosModal}
            documentoDescuento={documentoDescuento}
            setDocumentoDescuento={setDocumentoDescuento}
            precioSubtotal={precioSubtotal}
            setPrecioSubtotal={setPrecioSubtotal}
            descuento={descuento}
            setDescuento={setDescuento}
            precioTotal={precioTotal}
            setPrecioTotal={setPrecioTotal}
            documentoPago={documentoPago}
            setDocumentoPago={setDocumentoPago}
            customSelectStyles={customSelectStyles}
          />
        )}

        {/* PASO 2: PAGO */}
        {currentStepIndex === 1 && (
          <div className="p-6">
            <PagoStep
              precioTotal={precioTotal}
              montoPendiente={montoPendiente}
              pagoTab={pagoTab}
              setPagoTab={setPagoTab}
              formPago={formPago}
              setFormPago={setFormPago}
              maestrosPago={maestrosPago}
              customSelectStyles={customSelectStyles}
              handleAgregarPago={handleAgregarPago}
              pagosAgregados={pagosAgregados}
              eliminarPago={eliminarPago}
              editingPagoIndex={editingPagoIndex}
              setEditingPagoIndex={setEditingPagoIndex}
              disablePagoTabs={disablePagoTabs || (formCaja.nrodocumentoreinspeccion && montoPendiente === 0)}
              descuentoObj={formCaja.descuentoObj}
              isReinspeccionGratuita={!!(formCaja.nrodocumentoreinspeccion && montoPendiente === 0)}
            />
          </div>
        )}

        {/* PASO 3: VEHÍCULO */}
        {currentStepIndex === 2 && (
          <div className="p-6">
            <VehiculoStep
              vehiculoTab={vehiculoTab}
              setVehiculoTab={setVehiculoTab}
              formVehiculo={formVehiculo}
              setFormVehiculo={setFormVehiculo}
              maestrosVehiculo={maestrosVehiculo}
              getCategoriaName={getCategoriaName}
              onValidationChange={setIsVehiculoValid}
              placaCaja={formCaja.placa}
              isReinspeccion={!!formCaja.nrodocumentoreinspeccion}
            />
          </div>
        )}

        {/* PASO 4: FACTURACIÓN */}
        {currentStepIndex === 3 && (
          <div className="p-6">
            <FacturacionStep
              formFacturacion={formFacturacion}
              setFormFacturacion={setFormFacturacion}
              formVehiculo={formVehiculo}
              documentoPago={documentoPago}
              onValidationChange={setIsFacturacionValid}
            />
          </div>
        )}

        {/* === PASO 5: VERIFICACION === */}
        {currentStepIndex === 4 && (
          <VerificacionStep
            maestros={maestros}
            formCaja={formCaja}
            formVehiculo={formVehiculo}
            formPropietario={formVehiculo} // Usando el formVehiculo temporalmente ya que ahí están los datos de propietario
            formFacturacion={formFacturacion}
            formVerificacion={formVerificacion}
            setFormVerificacion={setFormVerificacion}
            precioTotal={precioTotal}
            customSelectStyles={customSelectStyles}
          />
        )}
      </div>

      {/* FOOTER ACTIONS */}
      {currentStepIndex > 0 && (
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center">
          <button
            type="button"
            onClick={irPasoAnterior}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Atrás
          </button>

          <div className="flex flex-col items-end gap-1.5">
            {currentStepIndex === 2 && !isVehiculoValid && (
              <p className="text-[10px] text-red-500 font-bold uppercase">
                Falta completar campos en Datos, SOAT o Propietario
              </p>
            )}
            {currentStepIndex === 3 && !isFacturacionValid && (
              <p className="text-[10px] text-red-500 font-bold uppercase">
                Falta completar campos de facturación
              </p>
            )}
            {currentStepIndex === STEPS.length - 1 ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleGuardarSoloBorrador}
                  className="rounded-lg px-6 py-2.5 text-xs font-black transition shadow-sm bg-slate-200 text-slate-700 hover:bg-slate-300 hover:-translate-y-0.5"
                >
                  GUARDAR (BORRADOR)
                </button>
                <button
                  type="button"
                  onClick={irSiguientePaso}
                  disabled={!validarVerificacion()}
                  className={`rounded-lg px-6 py-2.5 text-xs font-black transition shadow-sm
                    ${!validarVerificacion()
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-gold-3d hover:-translate-y-0.5'
                    }`}
                >
                  FINALIZAR
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={irSiguientePaso}
                disabled={(currentStepIndex === 1 && montoPendiente > 0) || (currentStepIndex === 2 && !isVehiculoValid) || (currentStepIndex === 3 && !isFacturacionValid)}
                className={`rounded-lg px-6 py-2.5 text-xs font-black transition shadow-sm
                  ${(currentStepIndex === 1 && montoPendiente > 0) || (currentStepIndex === 2 && !isVehiculoValid) || (currentStepIndex === 3 && !isFacturacionValid)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gold-3d hover:-translate-y-0.5'
                  }`}
              >
                Siguiente Paso
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
