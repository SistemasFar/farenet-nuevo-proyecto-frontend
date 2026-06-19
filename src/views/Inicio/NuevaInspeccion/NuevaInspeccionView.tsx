import React, { useState, useEffect } from 'react';
import { maestrosApi } from '../../../services/api';
import type { MaestrosCajaResponse, MaestrosPagoResponse } from '../../../types/maestros';
import { CheckCircle2, FileText, User, CreditCard, Box, ArrowLeft, Search } from 'lucide-react';
import { CajaStep } from './components/NuevaInspeccion/CajaStep';
import { PagoStep } from './components/NuevaInspeccion/PagoStep';
import { VehiculoStep } from './components/NuevaInspeccion/VehiculoStep';

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
}

const STEPS = [
  { id: 'caja', label: 'Caja', icon: Box },
  { id: 'pago', label: 'Pago', icon: CreditCard },
  { id: 'vehiculo', label: 'Vehículo', icon: Search },
  { id: 'cliente', label: 'Facturación', icon: User },
  { id: 'verificacion', label: 'Verificación', icon: FileText }
];

export function NuevaInspeccionView({ onBack }: NuevaInspeccionViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
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
  const [formCaja, setFormCaja] = useState({
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

  const getCategoriaName = () => {
    if (!maestros || !formCaja.categoria) return '';
    const cat = maestros.categorias.find(c => c.key === formCaja.categoria);
    return cat ? cat.nombre.toUpperCase() : '';
  };

  useEffect(() => {
    if (currentStepIndex === 0 && !maestros) {
      cargarMaestros();
    } else if (currentStepIndex === 1 && !maestrosPago) {
      cargarMaestrosPago();
    } else if (currentStepIndex === 2 && !maestrosVehiculo) {
      cargarMaestrosVehiculo();
    }
  }, [currentStepIndex]);

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

    // Validación de placa: Limitar a 6 o 16 caracteres dependiendo del tipo
    if (name === 'placa') {
      // En este caso el usuario dijo "hay dos tipos usualmente son de 6... o 16". 
      // Por defecto no limitamos estrictamente la longitud máxima en el onChange para dejarles escribir,
      // pero podríamos limitarlo si conocemos el ID del tipo de placa BIN (ej. id 2).
      // Por ahora, aplicamos mayúsculas siempre:
      setFormCaja((prev) => ({ ...prev, [name]: value.toUpperCase() }));
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

  const irSiguientePaso = () => {
    if (currentStepIndex === 0 && !validarCaja()) {
      alert('Por favor completa todos los campos de la caja antes de continuar.');
      return;
    }

    if (currentStepIndex === 2 && !isVehiculoValid) {
      return;
    }

    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const irPasoAnterior = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const montoPendiente = Math.max(0, precioTotal - pagosAgregados.reduce((sum, p) => sum + parseFloat(p.importe || '0'), 0));

  const handleAgregarPago = () => {
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
      const isYapePlin = nameUpper.includes('YAPE') || nameUpper.includes('PLIN') || nameUpper.includes('CUPONIDAD');
      
      if (!formPago.tarjetaKey || !formPago.nroOperacion) {
        alert('Complete los campos obligatorios de la tarjeta.');
        return;
      }
      if (!isYapePlin && !formPago.digitosTarjeta) {
        alert('Ingrese los últimos 4 dígitos de la tarjeta.');
        return;
      }
    }

    if (importeNumerico > montoPendiente) {
      alert(`El importe ingresado (S/ ${importeNumerico.toFixed(2)}) es mayor al monto pendiente (S/ ${montoPendiente.toFixed(2)}).`);
      return;
    }

    const nuevoPago = {
      tipo: pagoTab,
      ...formPago,
      importe: importeNumerico.toFixed(2),
      nroOperacion: formPago.nroOperacion.trim()
    };

    setPagosAgregados([...pagosAgregados, nuevoPago]);

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
    <div className="w-full min-h-[calc(100vh-10rem)] bg-white rounded-2xl shadow-xl border-t-4 border-t-amber-500 border border-slate-200 overflow-hidden flex flex-col">

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
              className="h-full bg-amber-500 transition-all duration-500"
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
                    isCompleted ? 'bg-amber-500 text-white shadow-sm' :
                      'bg-white text-slate-400 border-2 border-slate-200'
                    }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider mt-1 ${isActive ? 'text-[#052a79]' : isCompleted ? 'text-amber-600' : 'text-slate-400'}`}>
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
            />
          </div>
        )}

        {/* OTROS PASOS */}
        {currentStepIndex > 2 && (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-4">
            <CheckCircle2 className="w-16 h-16 text-slate-300" />
            <h3 className="text-xl font-bold text-slate-700">Paso en construcción</h3>
            <p>Este paso ({STEPS[currentStepIndex].label}) se implementará próximamente.</p>
          </div>
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
            <button
              type="button"
              onClick={irSiguientePaso}
              disabled={(currentStepIndex === 1 && montoPendiente > 0) || (currentStepIndex === 2 && !isVehiculoValid)}
              className={`rounded-lg px-6 py-2.5 text-xs font-black transition shadow-sm
                ${(currentStepIndex === 1 && montoPendiente > 0) || (currentStepIndex === 2 && !isVehiculoValid)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-amber-400 text-[#052a79] hover:bg-amber-300 hover:shadow-lg hover:-translate-y-0.5'
                }`}
            >
              {currentStepIndex === STEPS.length - 1 ? 'Finalizar' : 'Siguiente Paso'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
