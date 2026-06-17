import React, { useState, useEffect } from 'react';
import { maestrosApi, plantaSession } from '../../services/api';
import type { MaestrosCajaResponse, MaestrosPagoResponse } from '../../types/maestros';
import { Search, XCircle, CheckCircle2, FileText, User, CreditCard, Box, ArrowLeft, Frown, HelpCircle } from 'lucide-react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';

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

export const FormVehiculoContext = React.createContext<any>(null);

const InputField = ({ label, name, type = "text", placeholder = "", required = false, isSelect = false, options = [], disabled = false, overrideValue, isAsyncSelect = false, loadOptions, defaultOptions = false, maxLength, minNumber }: any) => {
  const { formVehiculo, setFormVehiculo } = React.useContext(FormVehiculoContext);
  return (
    <div className="flex flex-col gap-1.5 md:col-span-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase">{label} {required && '*'}</label>
      {isAsyncSelect ? (
        <AsyncSelect
          cacheOptions
          defaultOptions={defaultOptions}
          loadOptions={loadOptions}
          placeholder="Buscar..."
          styles={customSelectStyles}
          value={
            formVehiculo[name] ? 
            { value: formVehiculo[name], label: formVehiculo[name + '_label'] || formVehiculo[name] } 
            : null
          }
          onChange={(opt: any) => setFormVehiculo({...formVehiculo, [name]: opt ? opt.value : '', [name + '_label']: opt ? opt.label : ''})}
          isDisabled={disabled}
          noOptionsMessage={() => "Escribe para buscar..."}
          loadingMessage={() => "Buscando..."}
        />
      ) : isSelect ? (
        <Select
          options={options}
          placeholder="Seleccione..."
          styles={customSelectStyles}
          value={options.find((opt: any) => opt.value === formVehiculo[name]) || null}
          onChange={(opt: any) => setFormVehiculo({...formVehiculo, [name]: opt ? opt.value : ''})}
          isDisabled={disabled || options.length === 0}
        />
      ) : (
        <input
          type={type === 'number' ? 'text' : type} // Cambiar a text para evitar flechas pero validamos por regex
          inputMode={type === 'number' ? 'numeric' : undefined}
          value={overrideValue !== undefined ? overrideValue : formVehiculo[name]}
          onChange={(e) => {
            let val = e.target.value.toUpperCase();
            if (type === 'number') {
              val = val.replace(/\D/g, ''); // Solo números
            }
            if (maxLength && val.length > maxLength) {
              val = val.slice(0, maxLength);
            }
            setFormVehiculo({...formVehiculo, [name]: val});
          }}
          onBlur={() => {
            if (minNumber !== undefined && formVehiculo[name]) {
              if (parseInt(formVehiculo[name], 10) < minNumber) {
                setFormVehiculo({...formVehiculo, [name]: ''}); // Resetea si es menor
              }
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-[#052a79] ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
        />
      )}
    </div>
  );
};

const loadModelos = async (inputValue: string) => {
  if (!inputValue) return [];
  try {
    const res = await maestrosApi.buscarModelosAsync(inputValue);
    return res.data.map((m: any) => ({ value: m.key, label: m.nombre }));
  } catch (err) {
    return [];
  }
};

interface NuevaInspeccionViewProps {
  onBack?: () => void;
}

const STEPS = [
  { id: 'caja', label: 'Caja', icon: Box },
  { id: 'pago', label: 'Pago', icon: CreditCard },
  { id: 'vehiculo', label: 'Vehículo', icon: Search },
  { id: 'cliente', label: 'Cliente', icon: User },
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
      const isBIN = formCaja.tipoPlaca === '16'; // Suponiendo ID o lógica de tipo BIN
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
      importe: importeNumerico.toFixed(2),
      ...formPago,
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
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-[#052a79] uppercase border-b border-amber-200/60 pb-2">
              Datos de Caja
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Tipo de Placa *</label>
                <Select
                  options={maestros?.tiposPlaca.map(tp => ({ value: tp.id, label: tp.nombre })) || []}
                  value={maestros?.tiposPlaca.map(tp => ({ value: tp.id, label: tp.nombre })).find(o => o.value === formCaja.tipoPlaca) || null}
                  onChange={(o) => handleSelectChange('tipoPlaca', o)}
                  placeholder="Seleccione..."
                  isClearable
                  styles={customSelectStyles}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Placa *</label>
                <input
                  type="text"
                  name="placa"
                  value={formCaja.placa}
                  onChange={handleCajaChange}
                  placeholder="Ej: ABC-123"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 outline-none transition uppercase"
                  maxLength={formCaja.tipoPlaca === 'BIN_ID_HERE' ? 16 : 16} // Lógica de maxlength
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Concepto *</label>
                <Select
                  options={maestros?.conceptos.map(c => ({ value: c.key, label: c.abreviatura || c.nombre })) || []}
                  value={maestros?.conceptos.map(c => ({ value: c.key, label: c.abreviatura || c.nombre })).find(o => o.value === formCaja.concepto) || null}
                  onChange={(o) => handleSelectChange('concepto', o)}
                  placeholder="Seleccione..."
                  isClearable
                  styles={customSelectStyles}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Categoría *</label>
                <Select
                  options={maestros?.categorias.map(c => ({ value: c.key, label: c.nombre })) || []}
                  value={maestros?.categorias.map(c => ({ value: c.key, label: c.nombre })).find(o => o.value === formCaja.categoria) || null}
                  onChange={(o) => handleSelectChange('categoria', o)}
                  placeholder="Seleccione..."
                  isClearable
                  styles={customSelectStyles}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Tipo de Inspección *</label>
                <Select
                  options={maestros?.tiposInspeccion.map(ti => ({ value: ti.key, label: ti.nombre })) || []}
                  value={maestros?.tiposInspeccion.map(ti => ({ value: ti.key, label: ti.nombre })).find(o => o.value === formCaja.tipoInspeccion) || null}
                  onChange={(o) => handleSelectChange('tipoInspeccion', o)}
                  placeholder="Seleccione..."
                  isClearable
                  styles={customSelectStyles}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase">Tipo Certificado *</label>
                <Select
                  options={maestros?.tiposCertificado.map(tc => ({ value: tc.key, label: tc.abreviacion || tc.nombre })) || []}
                  value={maestros?.tiposCertificado.map(tc => ({ value: tc.key, label: tc.abreviacion || tc.nombre })).find(o => o.value === formCaja.tipoCertificado) || null}
                  onChange={(o) => handleSelectChange('tipoCertificado', o)}
                  placeholder="Seleccione..."
                  isClearable
                  styles={customSelectStyles}
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-600 uppercase">Tipo Autorización</label>
                <Select
                  options={[
                    { value: '', label: 'NINGUNO / EN BLANCO' },
                    ...(maestros?.tiposAutorizacion.map(ta => ({ value: ta.key, label: ta.nombre })) || [])
                  ]}
                  value={maestros?.tiposAutorizacion.map(ta => ({ value: ta.key, label: ta.nombre })).find(o => o.value === formCaja.tipoAutorizacion) || null}
                  onChange={(o) => setFormCaja({ ...formCaja, tipoAutorizacion: o?.value || '' })}
                  placeholder="Seleccione..."
                  isClearable
                  styles={customSelectStyles}
                  menuPlacement="top"
                  menuPortalTarget={document.body}
                />
              </div>

            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={async () => {
                  if (validarCaja()) {
                    try {
                      const planta = plantaSession.obtener();
                      if (!planta?.key) {
                        alert('Por favor seleccione una planta en el inicio.');
                        return;
                      }
                      const res = await maestrosApi.obtenerPrecioConceptoAsync(planta.key, formCaja.concepto);
                      const precio = res?.data?.precio || 0;
                      if (precio === 0) {
                        alert(`El sistema calculó 0.00. Esto sucede porque no hay un precio registrado en la tabla "conceptoinspecciondetalle" para la combinación de la Planta actual (${planta.key}) y el Concepto elegido (${formCaja.concepto}).`);
                      }
                      setPrecioSubtotal(precio);
                      setPrecioTotal(precio - descuento);
                    } catch (err) {
                      console.error('Error calculando precio:', err);
                      setPrecioSubtotal(0);
                      setPrecioTotal(0);
                    } finally {
                      setIsConsultado(true);
                    }
                  } else {
                    setShowCamposVaciosModal(true);
                  }
                }}
                className="flex items-center gap-2 rounded-lg bg-[#052a79] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-900 border border-[#052a79] transition uppercase tracking-wide"
              >
                <Search className="w-4 h-4" />
                Consultar
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormCaja({
                    tipoPlaca: '', placa: '', concepto: '', categoria: '', tipoInspeccion: '', tipoCertificado: '', tipoAutorizacion: ''
                  });
                  setIsConsultado(false);
                  setDocumentoDescuento('');
                }}
                className="flex items-center gap-2 rounded-lg bg-white border border-red-200 text-red-600 px-6 py-2.5 text-xs font-bold hover:bg-red-50 shadow-sm transition uppercase tracking-wide"
              >
                <XCircle className="w-4 h-4" />
                Anular
              </button>
            </div>

            {/* SECCION DE DESCUENTOS (Solo se muestra después de consultar) */}
            {isConsultado && (
              <div className="mt-4 p-4 rounded-lg bg-[#f2cc11] border-2 border-[#e0bc0d] shadow-md">
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="text-[#052a79] font-black uppercase text-sm drop-shadow-sm">
                    Buscar descuentos por: Código / DNI / RUC / Placa
                  </h4>
                  <span className="text-red-600 font-black text-xs uppercase animate-pulse drop-shadow-sm bg-white/50 px-2 py-0.5 rounded">
                    POR HACER
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={documentoDescuento}
                    onChange={(e) => setDocumentoDescuento(e.target.value)}
                    placeholder="Número de documento..."
                    className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 outline-none"
                  />
                  <button type="button" className="bg-[#052a79] text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-blue-900 transition flex items-center gap-2 uppercase">
                    <Search className="w-3 h-3" /> Buscar
                  </button>
                </div>
              </div>
            )}

            {/* SECCION DE RESUMEN DE PAGO (También se muestra después de consultar) */}
            {isConsultado && (
              <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-[#f4f9ff] border-b border-[#052a79]/10 p-3">
                  <h3 className="text-sm font-black text-[#052a79] uppercase tracking-wide">Resumen de Pago</h3>
                </div>
                <div className="p-5 bg-white grid grid-cols-2 md:grid-cols-4 gap-4 items-end">

                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Documento</label>
                    <Select
                      options={maestros?.tiposDocumento?.map(td => ({ value: td.key, label: td.nombre })) || []}
                      value={maestros?.tiposDocumento?.map(td => ({ value: td.key, label: td.nombre })).find(o => o.value === documentoPago) || null}
                      onChange={(o) => setDocumentoPago(o?.value || '')}
                      placeholder="Seleccione..."
                      styles={customSelectStyles}
                      isClearable
                      menuPlacement="top"
                      menuPortalTarget={document.body}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Subtotal (S/)</label>
                    <input type="text" readOnly value={precioSubtotal.toFixed(2)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 text-right outline-none" />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Descuento (S/)</label>
                    <input type="text" readOnly value={descuento.toFixed(2)} className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 text-right outline-none" />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <label className="text-[10px] font-black text-[#052a79] uppercase">Total (S/)</label>
                    <input type="text" readOnly value={precioTotal.toFixed(2)} className="w-full rounded-lg border-2 border-[#052a79] bg-[#f4f9ff] px-3 py-2 text-lg font-black text-[#052a79] text-right outline-none shadow-inner" />
                  </div>

                </div>
              </div>
            )}

            {/* BOTONES DE ACCIÓN (Solo visibles cuando ya se consultó) */}
            {isConsultado && (
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAnularModal(true)}
                  className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  ANULAR
                </button>
                <button
                  type="button"
                  onClick={irSiguientePaso}
                  className="px-8 py-2.5 rounded-xl font-black text-[#052a79] bg-[#f2cc11] hover:bg-[#e0b90c] transition-all shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  SIGUIENTE
                </button>
              </div>
            )}

            {/* MODAL PERSONALIZADO PARA ANULAR */}
            {showAnularModal && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-blue-100">
                    <Frown className="w-10 h-10 text-[#052a79]" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">¿Estás seguro?</h3>
                  <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                    Estás a punto de anular esta inspección y se borrarán todos los datos que ingresaste.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setShowAnularModal(false)}
                      className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        setFormCaja({
                          tipoPlaca: '', placa: '', concepto: '', categoria: '', tipoInspeccion: '', tipoCertificado: '', tipoAutorizacion: ''
                        });
                        setIsConsultado(false);
                        setPrecioSubtotal(0);
                        setDescuento(0);
                        setPrecioTotal(0);
                        setDocumentoPago('');
                        setShowAnularModal(false);
                      }}
                      className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-md shadow-red-200 transition-colors"
                    >
                      Sí, anular
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL PERSONALIZADO PARA CAMPOS VACÍOS */}
            {showCamposVaciosModal && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
                  <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-amber-100">
                    <HelpCircle className="w-10 h-10 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">¡Un momento!</h3>
                  <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                    Te falta llenar todos los campos. Por favor, completa el formulario antes de consultar.
                  </p>
                  <button
                    onClick={() => setShowCamposVaciosModal(false)}
                    className="w-full px-4 py-3 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-200 transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* PASO 2: PAGO */}
        {currentStepIndex === 1 && (
          <div className="p-6">
            {/* Cabecera de Totales */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-[#f4f9ff] border-2 border-[#052a79] rounded-2xl p-6 text-center shadow-sm">
                <h3 className="text-sm font-black text-[#052a79] uppercase tracking-wider mb-2">Monto Total a Pagar</h3>
                <p className="text-4xl font-black text-[#052a79]">S/ {precioTotal.toFixed(2)}</p>
              </div>
              <div className={`border-2 rounded-2xl p-6 text-center shadow-sm transition-colors ${montoPendiente > 0 ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'}`}>
                <h3 className={`text-sm font-black uppercase tracking-wider mb-2 ${montoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>Monto Pendiente</h3>
                <p className={`text-4xl font-black ${montoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>S/ {montoPendiente.toFixed(2)}</p>
              </div>
            </div>

            {/* Pestañas de Método de Pago */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              {(['EFECTIVO', 'TARJETA', 'BANCO'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setPagoTab(tab)}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${pagoTab === tab ? 'bg-white text-[#052a79] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Formulario de Pago */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase mb-4">Detalles del Pago: {pagoTab}</h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                {pagoTab === 'TARJETA' && (
                  <>
                    <div className="flex flex-col gap-1.5 md:col-span-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo Tarjeta</label>
                      <Select
                        options={maestrosPago?.tarjetas?.map(t => ({ value: t.key, label: t.nombre })) || []}
                        value={maestrosPago?.tarjetas?.map(t => ({ value: t.key, label: t.nombre })).find(o => o.value === formPago.tarjetaKey) || null}
                        onChange={(o) => setFormPago({ ...formPago, tarjetaKey: o?.value || '' })}
                        placeholder="Seleccione..."
                        styles={customSelectStyles}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Nro. Operación</label>
                      <input type="text" value={formPago.nroOperacion} onChange={(e) => setFormPago({ ...formPago, nroOperacion: e.target.value.replace(/[^0-9]/g, '') })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500" />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Últimos 4 Dígitos</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={formPago.digitosTarjeta}
                        onChange={(e) => setFormPago({ ...formPago, digitosTarjeta: e.target.value.replace(/\\D/g, '') })}
                        disabled={(() => {
                          const selected = maestrosPago?.tarjetas?.find(t => t.key === formPago.tarjetaKey);
                          if (!selected) return false;
                          const name = selected.nombre.toUpperCase();
                          return name.includes('YAPE') || name.includes('PLIN') || name.includes('CUPONIDAD');
                        })()}
                        className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none ${(() => {
                            const selected = maestrosPago?.tarjetas?.find(t => t.key === formPago.tarjetaKey);
                            if (!selected) return 'focus:border-amber-500';
                            const name = selected.nombre.toUpperCase();
                            return (name.includes('YAPE') || name.includes('PLIN') || name.includes('CUPONIDAD'))
                              ? 'bg-slate-100 cursor-not-allowed opacity-60'
                              : 'focus:border-amber-500'
                          })()
                          }`}
                        placeholder={
                          (() => {
                            const selected = maestrosPago?.tarjetas?.find(t => t.key === formPago.tarjetaKey);
                            if (!selected) return '';
                            const name = selected.nombre.toUpperCase();
                            return (name.includes('YAPE') || name.includes('PLIN') || name.includes('CUPONIDAD'))
                              ? 'N/A'
                              : ''
                          })()
                        }
                      />
                    </div>
                  </>
                )}

                {pagoTab === 'BANCO' && (
                  <>
                    <div className="flex flex-col gap-1.5 md:col-span-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Banco (*)</label>
                      <Select
                        options={maestrosPago?.entidadesFinancieras?.map(t => ({ value: t.key, label: t.nombre })) || []}
                        value={maestrosPago?.entidadesFinancieras?.map(t => ({ value: t.key, label: t.nombre })).find(o => o.value === formPago.entidadFinancieraKey) || null}
                        onChange={(o) => setFormPago({ ...formPago, entidadFinancieraKey: o?.value || '', cuentaCorrienteKey: '' })}
                        placeholder="Seleccione..."
                        styles={customSelectStyles}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Cuenta Corriente (*)</label>
                      <Select
                        options={maestrosPago?.cuentasCorrientes?.filter(c => c.entidadfinanciera_key === formPago.entidadFinancieraKey).map(t => ({ value: t.key, label: t.nombre })) || []}
                        value={maestrosPago?.cuentasCorrientes?.map(t => ({ value: t.key, label: t.nombre })).find(o => o.value === formPago.cuentaCorrienteKey) || null}
                        onChange={(o) => setFormPago({ ...formPago, cuentaCorrienteKey: o?.value || '' })}
                        placeholder={formPago.entidadFinancieraKey ? "Seleccione cuenta..." : "Elija banco primero"}
                        isDisabled={!formPago.entidadFinancieraKey}
                        styles={customSelectStyles}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Nro. Operación (*)</label>
                      <input
                        type="text"
                        maxLength={20}
                        value={formPago.nroOperacion}
                        onChange={(e) => setFormPago({ ...formPago, nroOperacion: e.target.value.replace(/[^0-9]/g, '') })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500"
                      />
                      <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Ingrese el N° indicado en el voucher.</p>
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha Depósito (*)</label>
                      <input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={formPago.fechaDeposito}
                        onChange={(e) => setFormPago({ ...formPago, fechaDeposito: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500"
                      />
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-1.5 md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Importe (S/) (*)</label>
                  <input
                    type="text"
                    value={formPago.importe}
                    onChange={(e) => {
                      // Solo permitir números y un punto decimal
                      let val = e.target.value.replace(/[^0-9.]/g, '');
                      // Evitar múltiples puntos
                      const parts = val.split('.');
                      if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                      setFormPago({ ...formPago, importe: val });
                    }}
                    className="w-full rounded-lg border border-amber-400 bg-amber-50 focus:ring-2 focus:ring-amber-200 px-3 py-2 text-lg font-black text-slate-700 outline-none"
                  />
                  {pagoTab === 'BANCO' && <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Monto depositado según voucher.</p>}
                </div>

                <div className="md:col-span-1 pt-[21px]">
                  <button
                    onClick={handleAgregarPago}
                    disabled={montoPendiente <= 0}
                    className="w-full px-4 py-2.5 rounded-lg font-black text-white bg-[#052a79] hover:bg-blue-900 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed uppercase text-sm h-[42px]"
                  >
                    AGREGAR
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de Pagos Agregados */}
            {pagosAgregados.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-[#f4f9ff] text-[#052a79] text-xs uppercase font-black">
                    <tr>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Detalle</th>
                      <th className="px-4 py-3 text-right">Importe</th>
                      <th className="px-4 py-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagosAgregados.map((pago, idx) => (
                      <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold">{pago.tipo}</td>
                        <td className="px-4 py-3 text-xs">
                          {pago.tipo === 'TARJETA' && `Operación: ${pago.nroOperacion} | Tarjeta: ****${pago.digitosTarjeta}`}
                          {pago.tipo === 'BANCO' && `Operación: ${pago.nroOperacion} | Fecha: ${pago.fechaDeposito}`}
                          {pago.tipo === 'EFECTIVO' && '-'}
                        </td>
                        <td className="px-4 py-3 font-black text-right">S/ {parseFloat(pago.importe).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => eliminarPago(idx)} className="text-red-500 hover:text-red-700">
                            <XCircle className="w-5 h-5 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PASO 3: VEHÍCULO */}
        {currentStepIndex === 2 && (
          <div className="p-6">
            {/* Pestañas de Vehículo */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              {(['DATOS DEL VEHÍCULO', 'SOAT', 'PROPIETARIO'] as const).map(tab => {
                const key = tab === 'DATOS DEL VEHÍCULO' ? 'DATOS' : tab as 'SOAT' | 'PROPIETARIO';
                return (
                  <button
                    key={key}
                    onClick={() => setVehiculoTab(key)}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${vehiculoTab === key ? 'bg-white text-[#052a79] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
               {vehiculoTab === 'DATOS' && (() => {
                 const catName = getCategoriaName() || ''; // e.g. M1, L1, O2
                 const isL = catName.startsWith('L');
                 const isM = catName.startsWith('M');
                 const isN = catName.startsWith('N');
                 const isO = catName.startsWith('O');

                 // Reglas dinámicas (sacadas del prompt del usuario)
                 const hasMotor = isL || isM || isN; // O no tiene motor
                 const hasAsientos = ['L4', 'L5'].includes(catName) || isM || isN;
                 const hasPasajeros = ['L4', 'L5'].includes(catName) || isM;
                 const hasPisos = catName === 'M3';
                 const hasCargaUtil = catName !== '' && !['L1', 'L3'].includes(catName);
                 const hasPuertas = isM || isN;
                 const hasSalidasEmergencia = ['M2', 'M3'].includes(catName);
                 const hasMarcaCarroceria = isM || isN || isO;

                 // Opciones Mapeadas
                 const optsClases = maestrosVehiculo?.clases.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
                 const optsMarcas = maestrosVehiculo?.marcas.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
                 // Modelos se carga dinámicamente
                 const optsColores = maestrosVehiculo?.colores.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
                 const optsCarrocerias = maestrosVehiculo?.carrocerias.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
                 const optsCombustibles = maestrosVehiculo?.combustibles.map((x: any) => ({ value: x.key, label: x.nombre })) || [];

                 return (
                   <FormVehiculoContext.Provider value={{formVehiculo, setFormVehiculo}}>
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black text-[#052a79] uppercase">1. Datos del Vehículo</h3>
                        {catName && <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">Categoría {catName}</span>}
                      </div>
                      
                      {!catName ? (
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl text-sm font-semibold text-center">
                           Selecciona una Categoría en el Paso 1 (Caja) para cargar los campos dinámicos del vehículo.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* BLOQUE 1: IDENTIFICADORES Y CLASIFICACIÓN */}
                          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                            <h4 className="text-xs font-black text-slate-700 uppercase mb-3 border-b border-slate-200 pb-2">Identificadores y Clasificación</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <InputField label="Categoría" name="categoria_display" overrideValue={catName} disabled={true} />
                              <InputField label="Clase" name="clase" isSelect options={optsClases} />
                              <InputField label="Marca" name="marca" isSelect options={optsMarcas} />
                              <InputField label="Modelo" name="modelo" isAsyncSelect loadOptions={loadModelos} />
                              <InputField label="Color" name="color" isSelect options={optsColores} />
                              <InputField label="Carrocería" name="carroceria" isSelect options={optsCarrocerias} />
                              <InputField 
                                label="Marca Carrocería" 
                                name="marcaCarroceria" 
                                disabled={true} 
                              />
                              <InputField label="Placa Nueva" name="placaNueva" />
                              <InputField label="Nro Serie (VIN)" name="nroSerie" />
                              {hasMotor && <InputField label="Nro Motor" name="nroMotor" />}
                            </div>
                          </div>

                          {/* BLOQUE 2: ESPECIFICACIONES TÉCNICAS */}
                          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                            <h4 className="text-xs font-black text-slate-700 uppercase mb-3 border-b border-slate-200 pb-2">Especificaciones Técnicas</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <InputField label="Año Fabricación" name="anioFabricacion" type="number" maxLength={4} minNumber={1800} />
                              {hasMotor && <InputField label="Combustible" name="combustible" isSelect options={optsCombustibles} />}
                              {hasMotor && <InputField label="Nro Cilindros" name="nroCilindros" type="number" />}
                              {hasMotor && <InputField label="Kilometraje" name="kilometraje" type="number" />}
                            </div>
                          </div>

                          {/* BLOQUE 3: CAPACIDAD Y DIMENSIONES */}
                          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                            <h4 className="text-xs font-black text-slate-700 uppercase mb-3 border-b border-slate-200 pb-2">Capacidad y Dimensiones</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              {/* Asientos / Pasajeros */}
                              {hasAsientos && <InputField label="Nro Asientos" name="nroAsientos" type="number" />}
                              {hasPasajeros && <InputField label="Nro Pasajeros" name="nroPasajeros" type="number" />}
                              {hasPuertas && <InputField label="Nro Puertas" name="nroPuertas" type="number" />}
                              {hasPisos && <InputField label="Nro Pisos" name="nroPisos" type="number" />}
                              {hasSalidasEmergencia && <InputField label="Salidas de Emergencia" name="salidasEmergencia" type="number" />}
                              
                              {/* Pesos */}
                              <InputField label="Peso Seco (Kg)" name="pesoSeco" type="number" />
                              <InputField label="Peso Bruto (Kg)" name="pesoBruto" type="number" />
                              {hasCargaUtil && <InputField label="Carga Útil (Kg)" name="cargaUtil" type="number" />}
                              
                              {/* Dimensiones */}
                              <InputField label="Longitud (m)" name="longitud" type="number" />
                              <InputField label="Ancho (m)" name="ancho" type="number" />
                              <InputField label="Altura (m)" name="altura" type="number" />
                              <InputField label="Nro Ejes" name="nroEjes" type="number" />
                              <InputField label="Nro Ruedas" name="nroRuedas" type="number" />
                            </div>
                           </div>
                         </div>
                       )}
                    </div>
                   </FormVehiculoContext.Provider>
                 );
               })()}
             {vehiculoTab === 'SOAT' && (
                 <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase mb-4">2. SOAT</h3>
                    <p className="text-slate-500 text-sm">Sección en construcción.</p>
                 </div>
               )}
               {vehiculoTab === 'PROPIETARIO' && (
                 <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase mb-4">3. Datos del Propietario</h3>
                    <p className="text-slate-500 text-sm">Sección en construcción.</p>
                 </div>
               )}
            </div>
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
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between">
          <button
            type="button"
            onClick={irPasoAnterior}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            Atrás
          </button>

          <button
            type="button"
            onClick={irSiguientePaso}
            disabled={currentStepIndex === 1 && montoPendiente > 0}
            className={`rounded-lg bg-[#052a79] px-5 py-2 text-xs font-bold text-white transition ${currentStepIndex === 1 && montoPendiente > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-900'}`}
          >
            {currentStepIndex === STEPS.length - 1 ? 'Finalizar' : 'Siguiente Paso'}
          </button>
        </div>
      )}

    </div>
  );
}
