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
  onContinueToVerificacion?: (id: string) => void;
  plantaSeleccionada?: string;
  inspeccionIdToResume?: string | null;
}

const STEPS = [
  { id: 'caja', label: 'Caja', icon: Box },
  { id: 'pago', label: 'Pago', icon: CreditCard },
  { id: 'vehiculo', label: 'Vehículo', icon: Search },
  { id: 'cliente', label: 'Facturación', icon: User },
  { id: 'verificacion', label: 'Verificación', icon: FileText }
];

export function NuevaInspeccionView({ onBack, onContinueToVerificacion, plantaSeleccionada, inspeccionIdToResume }: NuevaInspeccionViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [maestros, setMaestros] = useState<MaestrosCajaResponse['data'] | null>(null);
  const [maestrosVehiculo, setMaestrosVehiculo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isConsultado, setIsConsultado] = useState(false);
  const [posicionActualGuardada, setPosicionActualGuardada] = useState(0);
  const [formCajaOriginalRehidratado, setFormCajaOriginalRehidratado] = useState<any>(null);
  const [puedeModificarFlujo1, setPuedeModificarFlujo1] = useState(true);

  // Estados de vehiculo y facturacion (comunes)
  const [showAnularModal, setShowAnularModal] = useState(false);
  const [showCamposVaciosModal, setShowCamposVaciosModal] = useState(false);
  const [documentoDescuento, setDocumentoDescuento] = useState('');

  const [precioSubtotal, setPrecioSubtotal] = useState<number>(0);
  const [descuento, setDescuento] = useState<number>(0);
  const [precioTotal, setPrecioTotal] = useState<number>(0);

  const [documentoPago, setDocumentoPago] = useState<string>('');
  const [nrodocumentoinspeccion, setNrodocumentoinspeccion] = useState<string>('');

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
    const initNroInspeccion = async () => {
      try {
        if (inspeccionIdToResume) {
          const res = await inspeccionesApi.obtenerProceso(inspeccionIdToResume);
          if (res?.data) {
            if (res.data.debeAbrirFlujo2) {
              Swal.fire({
                icon: 'warning',
                title: 'Inspección en línea',
                text: 'Esta inspección ya ha sido enviada a la línea de inspección.',
                confirmButtonText: 'Ir a Línea'
              }).then(() => {
                if (onContinueToVerificacion) {
                  onContinueToVerificacion(inspeccionIdToResume);
                } else if (onBack) {
                  onBack();
                }
              });
              return;
            }

            setNrodocumentoinspeccion(inspeccionIdToResume);
            if (res.data.formCaja) {
              setFormCaja(res.data.formCaja);
              setFormCajaOriginalRehidratado(res.data.formCaja);
            }
            if (res.data.formVehiculo) setFormVehiculo(res.data.formVehiculo);
            if (res.data.formFacturacion) setFormFacturacion(res.data.formFacturacion);
            if (res.data.formVerificacion) setFormVerificacion(res.data.formVerificacion);
            if (res.data.pagosAgregados) setPagosAgregados(res.data.pagosAgregados);
            if (res.data.documentoPago) setDocumentoPago(res.data.documentoPago);
            if (res.data.precioSubtotal !== undefined) setPrecioSubtotal(res.data.precioSubtotal);
            if (res.data.descuento !== undefined) setDescuento(res.data.descuento);
            if (res.data.precioTotal !== undefined) setPrecioTotal(res.data.precioTotal);

            if (res.data.isConsultado !== undefined) setIsConsultado(res.data.isConsultado);
            if (res.data.puedeModificarFlujo1 !== undefined) setPuedeModificarFlujo1(res.data.puedeModificarFlujo1);
            
            if (res.data.posicion !== undefined) {
              const pos = Number(res.data.posicion);
              setPosicionActualGuardada(pos);
              setCurrentStepIndex(pos);
            }
          }
        } else if (!nrodocumentoinspeccion && plantaSeleccionada) {
          const res = await inspeccionesApi.generarNroInspeccion(plantaSeleccionada);
          if (res?.nrodocumentoinspeccion) {
            setNrodocumentoinspeccion(res.nrodocumentoinspeccion);
          }
        }
      } catch (e) {
        console.error('Error al generar NRO', e);
      }
    };
    initNroInspeccion();
  }, [plantaSeleccionada, nrodocumentoinspeccion, inspeccionIdToResume]);

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
    setFormCaja((prev) => ({ ...prev, [name]: value }));
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
      setFormCaja((prev) => ({ ...prev, [name]: value }));
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

  const validarCaja = (opciones = { ignorarTipoPlaca: false }) => {
    const faltantes = [];
    if (!opciones.ignorarTipoPlaca && !formCaja.tipoPlaca) faltantes.push('Tipo de Placa');
    if (!formCaja.placa) faltantes.push('Placa');
    if (!formCaja.concepto) faltantes.push('Concepto');
    if (!formCaja.categoria) faltantes.push('Categoría');
    if (!formCaja.tipoCertificado) faltantes.push('Tipo Certificado');
    if (!formCaja.tipoInspeccion) faltantes.push('Tipo Inspección');
    if (!documentoPago || documentoPago === '' || documentoPago === 'Seleccione...') faltantes.push('Documento de pago');

    if (faltantes.length > 0) {
      return { valido: false, mensaje: `Falta completar: ${faltantes.join(', ')}.` };
    }

    if (formCaja.tipoPlaca && formCaja.placa) {
      let maxLen = 17;
      let minLen = 6;
      let exactLen = false;

      const tp = maestros?.tiposPlaca?.find((x: any) => x.id?.toString() === formCaja.tipoPlaca?.toString());
      if (tp) {
        const n = tp.nombre?.toUpperCase() || '';
        if (n.includes('DIPLOMATIC') || n.includes('DIPLOMÁTIC')) { maxLen = 6; minLen = 6; exactLen = true; }
        else if (n.includes('INCORPORACI')) { maxLen = 17; minLen = 6; }
        else if (n.includes('RUTINARI')) { maxLen = 6; minLen = 6; exactLen = true; }
        else if (n.includes('EXTRANJER')) { maxLen = 7; minLen = 6; }
        else { maxLen = 6; minLen = 6; exactLen = true; }
      }

      if (formCaja.placa.length > maxLen) {
        return { valido: false, mensaje: `La placa ingresada no cumple el formato permitido para el tipo de placa seleccionado (máximo ${maxLen} caracteres).` };
      }
      if (formCaja.placa.length < minLen) {
        return { valido: false, mensaje: `La placa ingresada no cumple el formato permitido para el tipo de placa seleccionado (mínimo ${minLen} caracteres).` };
      }
      if (exactLen && formCaja.placa.length !== maxLen) {
        return { valido: false, mensaje: `La placa ingresada no cumple el formato permitido para el tipo de placa seleccionado (debe tener exactamente ${maxLen} caracteres).` };
      }
    }

    return { valido: true };
  };

  const irSiguientePaso = async () => {
    if (loading) return; // Protección anti doble click

    const esReanudacionConCajaCompletada = posicionActualGuardada >= 1;
    let cajaModificada = false;

    if (esReanudacionConCajaCompletada && formCajaOriginalRehidratado) {
      cajaModificada = formCaja.placa !== formCajaOriginalRehidratado.placa ||
                       formCaja.concepto !== formCajaOriginalRehidratado.concepto ||
                       formCaja.categoria !== formCajaOriginalRehidratado.categoria ||
                       formCaja.tipoInspeccion !== formCajaOriginalRehidratado.tipoInspeccion ||
                       formCaja.tipoCertificado !== formCajaOriginalRehidratado.tipoCertificado ||
                       formCaja.tipoAutorizacion !== formCajaOriginalRehidratado.tipoAutorizacion;
    }

    if (currentStepIndex === 0) {
      const ignorarTipoPlaca = esReanudacionConCajaCompletada && !cajaModificada;
      const validacion = validarCaja({ ignorarTipoPlaca });

      if (!validacion.valido) {
        alert(validacion.mensaje);
        return;
      }
      
      if (!isConsultado) {
        alert('Por favor realiza la consulta exitosamente antes de continuar.');
        return;
      }
    }

    if (currentStepIndex === 1 && !documentoPago) {
      alert('Por favor selecciona el documento de pago obligatorio antes de continuar.');
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

    if (nrodocumentoinspeccion) {
      try {
        setLoading(true);
        let targetPosicion = currentStepIndex + 1;
        if (currentStepIndex >= 4) targetPosicion = 4;

        if (currentStepIndex === STEPS.length - 1) {
          // Guardado Final
          const savePayload = {
            nrodocumentoinspeccion,
            plantaKey: plantaSeleccionada,
            formCaja,
            pagosAgregados,
            formVehiculo,
            formFacturacion,
            formVerificacion,
            documentoPago,
            isConsultado,
            precioSubtotal,
            descuento,
            precioTotal
          };
          const res = await inspeccionesApi.guardar(savePayload);
          const finalId = res?.data?.data?.nroInspeccion || res?.data?.nroInspeccion || nrodocumentoinspeccion || 'Generado con éxito';

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
          }).then(() => {
            if (onContinueToVerificacion) {
              onContinueToVerificacion(finalId);
            } else if (onBack) {
              onBack();
            }
          });
        } else {
          // Guardado Progresivo Asíncrono Estricto
          const payload = {
            nrodocumentoinspeccion,
            posicionActual: currentStepIndex,
            siguientePosicion: targetPosicion,
            plantaKey: plantaSeleccionada,
            formCaja,
            pagosAgregados,
            formVehiculo,
            formFacturacion,
            formVerificacion,
            documentoPago,
            isConsultado,
            precioSubtotal,
            descuento,
            precioTotal
          };
          console.log('[FRONT guardarProceso payload]', payload);
          const res = await inspeccionesApi.guardarProceso(payload);
          console.log('[FRONT guardarProceso response]', res);

          if (res?.ok) {
            setCurrentStepIndex(res.posicionActual);
            setPosicionActualGuardada(res.posicionActual);
          } else {
            alert(res?.message || 'No se pudo guardar el paso actual en el servidor.');
          }
        }
      } catch (err: any) {
        console.error("Error en guardado:", err);
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'No se pudo guardar la información.';
        Swal.fire({
          icon: 'error',
          title: 'Error de Guardado',
          text: msg,
          confirmButtonColor: '#d33'
        });
      } finally {
        setLoading(false);
      }
    } else {
      if (currentStepIndex < STEPS.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      }
    }
  };

  const guardarParcialAsync = async (tabDestino: string) => {
    if (loading) return; // Protección anti doble click
    if (!nrodocumentoinspeccion) {
      setVehiculoTab(tabDestino);
      return;
    }
    
    try {
      setLoading(true);
      const payload = {
        nrodocumentoinspeccion,
        posicionActual: currentStepIndex,
        siguientePosicion: currentStepIndex,
        plantaKey: plantaSeleccionada,
        formCaja,
        pagosAgregados,
        formVehiculo,
        formFacturacion,
        formVerificacion,
        documentoPago,
        isConsultado,
        precioSubtotal,
        descuento,
        precioTotal
      };
      console.log('[FRONT guardarParcial payload]', payload);
      const res = await inspeccionesApi.guardarProceso(payload);
      console.log('[FRONT guardarParcial response]', res);

      if (res?.ok) {
        setPosicionActualGuardada(res.posicionActual);
        setVehiculoTab(tabDestino);
      } else {
        alert(res?.message || 'Error al guardar parcialmente los datos.');
      }
    } catch (err: any) {
      console.error("Error guardado parcial:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Error al guardar parcialmente los datos.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };


  const irPasoAnterior = () => {
    if (!puedeModificarFlujo1) {
      alert('Esta inspección ya se encuentra en Verificación y no puede ser modificada en pasos anteriores.');
      return;
    }
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
            isReadOnly={posicionActualGuardada >= 1}
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
              guardarParcialAsync={guardarParcialAsync}
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
                  onClick={irSiguientePaso}
                  disabled={!validarVerificacion() || loading}
                  className={`rounded-lg px-6 py-2.5 text-xs font-black transition shadow-sm
                    ${!validarVerificacion() || loading
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-gold-3d hover:-translate-y-0.5'
                    }`}
                >
                  {loading ? 'GUARDANDO...' : 'FINALIZAR'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={irSiguientePaso}
                disabled={(currentStepIndex === 1 && montoPendiente > 0) || (currentStepIndex === 2 && !isVehiculoValid) || (currentStepIndex === 3 && !isFacturacionValid) || loading}
                className={`rounded-lg px-6 py-2.5 text-xs font-black transition shadow-sm
                  ${(currentStepIndex === 1 && montoPendiente > 0) || (currentStepIndex === 2 && !isVehiculoValid) || (currentStepIndex === 3 && !isFacturacionValid) || loading
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gold-3d hover:-translate-y-0.5'
                  }`}
              >
                {loading ? 'CARGANDO...' : 'Siguiente Paso'}
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
