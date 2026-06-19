import React, { useState } from 'react';
import { Plus, XCircle } from 'lucide-react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { maestrosApi } from '../../../../../services/api';

export const FormVehiculoContext = React.createContext<any>(null);

const AgregarMaestroModal = ({ isOpen, onClose, onSave, title, loading, existingOptions = [], asyncSearch }: any) => {
  const [value, setValue] = useState('');
  const [asyncMatches, setAsyncMatches] = useState<any[]>([]);
  const [serverError, setServerError] = useState(false);
  
  const trimValue = value.trim();

  // Búsqueda asíncrona para Color y Modelo
  React.useEffect(() => {
    if (asyncSearch && trimValue.length >= 2) {
      const timer = setTimeout(async () => {
        const results = await asyncSearch(trimValue);
        setAsyncMatches(results);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setAsyncMatches([]);
    }
  }, [trimValue, asyncSearch]);

  if (!isOpen) return null;

  // Derive error and suggestions based on value
  let error = '';
  let isExactMatch = false;
  let suggestions: string[] = [];

  const combinedOptions = [...existingOptions, ...asyncMatches];

  if (trimValue) {
    if (!/[A-Z]/.test(trimValue)) {
      error = 'Debe contener al menos una letra (no puede ser solo números o guiones).';
    } else if ((trimValue.match(/-/g) || []).length > 6) {
      error = 'Máximo 6 guiones permitidos (hasta 7 palabras).';
    } else if (/--/.test(trimValue)) {
      error = 'No se permiten guiones seguidos.';
    } else if (/^-|-$/.test(trimValue)) {
      error = 'No puede empezar ni terminar con guión.';
    }

    const matches = combinedOptions.filter((opt: any) => opt.label && opt.label.includes(trimValue));
    
    if (matches.some((opt: any) => opt.label === trimValue)) {
      isExactMatch = true;
    } else if (matches.length > 0) {
      suggestions = matches.map((m: any) => m.label).slice(0, 3); // Max 3 sugerencias
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (error || isExactMatch || !trimValue) return;
    try {
      await onSave(trimValue);
    } catch (err: any) {
      setServerError(true);
    }
  };

  const handleChange = (e: any) => {
    // Solo permitir letras, números y guiones, todo a mayúsculas
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setValue(val);
    setServerError(false);
  };

  const isSaveDisabled = loading || !trimValue || error !== '' || isExactMatch || serverError;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800 uppercase">Agregar Nuevo: {title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <XCircle size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          {(isExactMatch || serverError) && (
            <p className="text-xs text-white bg-blue-600 font-semibold p-2 rounded-lg flex items-center gap-2">
              <span className="text-lg">🥶</span> Este elemento ya existe.
            </p>
          )}
          {error && <p className="text-xs text-red-500 font-semibold bg-red-50 p-2 rounded-lg">{error}</p>}
          
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Valor</label>
            <input
              type="text"
              autoFocus
              value={value}
              onChange={handleChange}
              disabled={loading}
              className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-[#052a79]"
            />
          </div>

          {!isExactMatch && suggestions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg">
              <p className="text-[10px] font-bold text-amber-800 mb-1">
                ⚠️ Es posible que este elemento ya esté registrado o exista, revisa bien:
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {suggestions.map(s => (
                  <span key={s} className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
          
          {title === 'Color' && (
            <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg">
              <p className="text-[10px] font-bold text-amber-800">
                💡 <strong>Nota:</strong> Si son varios colores, puedes separarlos por guiones.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaveDisabled}
              className="px-4 py-2 text-xs font-bold text-white bg-[#052a79] hover:bg-blue-800 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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

export const InputField = ({ label, name, type = "text", placeholder = "", required = false, isSelect = false, options = [], disabled = false, overrideValue, isAsyncSelect = false, loadOptions, defaultOptions = false, maxLength, minNumber, onAddNuevo }: any) => {
  const { formVehiculo, setFormVehiculo } = React.useContext(FormVehiculoContext);
  return (
    <div className="flex flex-col gap-1.5 md:col-span-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-slate-500 uppercase">{label} {required && '*'}</label>
        {onAddNuevo && !disabled && (
          <button 
            type="button" 
            onClick={onAddNuevo}
            className="text-white bg-blue-600 hover:bg-blue-700 rounded p-0.5 shadow transition"
            title="Agregar Nuevo"
          >
            <Plus size={12} strokeWidth={3} />
          </button>
        )}
      </div>
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
          type={type === 'number' ? 'text' : type}
          inputMode={type === 'number' ? 'numeric' : undefined}
          value={overrideValue !== undefined ? overrideValue : formVehiculo[name]}
          onChange={(e) => {
            let val = e.target.value.toUpperCase();
            if (type === 'number') {
              val = val.replace(/\D/g, '');
            }
            if (maxLength && val.length > maxLength) {
              val = val.slice(0, maxLength);
            }
            setFormVehiculo({...formVehiculo, [name]: val});
          }}
          onBlur={() => {
            if (minNumber !== undefined && formVehiculo[name]) {
              if (parseInt(formVehiculo[name], 10) < minNumber) {
                setFormVehiculo({...formVehiculo, [name]: ''});
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

export const loadModelos = async (inputValue: string) => {
  try {
    const response = await maestrosApi.buscarModelosAsync(inputValue);
    return response.data.map((m: any) => ({ value: m.key, label: m.nombre }));
  } catch (error) {
    console.error(error);
    return [];
  }
};

const loadColores = async (inputValue: string) => {
  try {
    const response = await maestrosApi.buscarColoresAsync(inputValue);
    return response.data.map((c: any) => ({ value: c.key, label: c.nombre }));
  } catch (error) {
    console.error(error);
    return [];
  }
};

interface VehiculoStepProps {
  vehiculoTab: 'DATOS' | 'SOAT' | 'PROPIETARIO';
  setVehiculoTab: (tab: 'DATOS' | 'SOAT' | 'PROPIETARIO') => void;
  formVehiculo: any;
  setFormVehiculo: (data: any) => void;
  maestrosVehiculo: any;
  getCategoriaName: () => string;
}

export function VehiculoStep({
  vehiculoTab,
  setVehiculoTab,
  formVehiculo,
  setFormVehiculo,
  maestrosVehiculo,
  getCategoriaName
}: VehiculoStepProps) {

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTabla, setModalTabla] = useState('');
  const [modalField, setModalField] = useState('');
  const [modalOptions, setModalOptions] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const [modalAsyncSearch, setModalAsyncSearch] = useState<any>(null);

  const handleAddNuevo = (title: string, tabla: string, field: string, options: any = [], asyncSearchFunc?: any) => {
    setModalTitle(title);
    setModalTabla(tabla);
    setModalField(field);
    setModalOptions(options);
    setModalAsyncSearch(() => asyncSearchFunc);
    setModalOpen(true);
  };

  const handleSaveNuevo = async (valor: string) => {
    try {
      setModalLoading(true);
      const res = await maestrosApi.agregarMaestroAsync(modalTabla, valor);
      
      setFormVehiculo({ 
        ...formVehiculo, 
        [modalField]: res.data.key, 
        [`${modalField}_label`]: res.data.nombre 
      });
      
      if (modalTabla === 'clase' && maestrosVehiculo?.clases) maestrosVehiculo.clases.push(res.data);
      if (modalTabla === 'marca' && maestrosVehiculo?.marcas) maestrosVehiculo.marcas.push(res.data);
      if (modalTabla === 'carroceria' && maestrosVehiculo?.carrocerias) maestrosVehiculo.carrocerias.push(res.data);
      if (modalTabla === 'color' && maestrosVehiculo?.colores) maestrosVehiculo.colores.push(res.data);

      setModalOpen(false);
    } catch (err: any) {
      throw err;
    } finally {
      setModalLoading(false);
    }
  };

  const checkDatosValid = () => {
    const catName = getCategoriaName() || '';
    if (!catName) return ['Categoría'];

    const isO2O3O4 = ['O2', 'O3', 'O4'].includes(catName);
    const hasCategoriaExtra = ['M2', 'M3'].includes(catName);
    
    const isValid = (val: any) => val !== undefined && val !== null && String(val).trim() !== '';

    const coreFields = [
      'clase', 'marca', 'modelo', 'color', 'carroceria', 
      'nroSerie', 'anioFabricacion', 'combustible',
      'longitud', 'ancho', 'altura', 'nroEjes', 'nroRuedas',
      'pesoSeco', 'cargaUtil', 'pesoBruto'
    ];

    let missing: string[] = [];

    for (const f of coreFields) {
      if (!isValid((formVehiculo as any)[f])) missing.push(f);
    }
    
    if (hasCategoriaExtra && !isValid(formVehiculo.categoriaExtra)) missing.push('categoriaExtra');
    
    if (!isO2O3O4) {
      const dynamicFields = [
        'nroMotor', 'nroCilindros', 'kilometraje', 'nroAsientos', 
        'nroPasajeros', 'nroPuertas', 'nroPisos', 'salidasEmergencia'
      ];
      for (const f of dynamicFields) {
        if (!isValid((formVehiculo as any)[f])) missing.push(f);
      }
    }

    return missing;
  };

  const missingDatos = checkDatosValid();
  const isDatosValid = missingDatos.length === 0;

  const checkSoatValid = () => {
    const isValid = (val: any) => val !== undefined && val !== null && String(val).trim() !== '';
    const soatFields = ['nroSoat', 'tipoPoliza', 'aseguradora', 'mesesSoat', 'fechaEmisionSoat', 'fechaVencimientoSoat'];
    let missing: string[] = [];
    for (const f of soatFields) {
      if (!isValid((formVehiculo as any)[f])) missing.push(f);
    }
    return missing;
  };

  const missingSoat = checkSoatValid();
  const isSoatValid = missingSoat.length === 0;

  return (
    <div className="space-y-6">
      <AgregarMaestroModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSave={handleSaveNuevo} 
        title={modalTitle} 
        loading={modalLoading} 
        existingOptions={modalOptions}
        asyncSearch={modalAsyncSearch}
      />
      {/* Pestañas de Vehículo */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
        {(['DATOS DEL VEHÍCULO', 'SOAT', 'PROPIETARIO'] as const).map(tab => {
          const key = tab === 'DATOS DEL VEHÍCULO' ? 'DATOS' : tab as 'SOAT' | 'PROPIETARIO';
          
          let isDisabled = false;
          let disabledReason = '';
          
          if (key === 'SOAT' && !isDatosValid) {
            isDisabled = true;
            disabledReason = 'Debe completar todos los datos del vehículo primero';
          }
          if (key === 'PROPIETARIO' && (!isDatosValid || !isSoatValid)) {
            isDisabled = true;
            disabledReason = 'Debe completar los datos del vehículo y el SOAT primero';
          }
          
          return (
            <button
              key={key}
              onClick={() => !isDisabled && setVehiculoTab(key)}
              disabled={isDisabled}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all 
                ${vehiculoTab === key ? 'bg-white text-[#052a79] shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}
              `}
              title={disabledReason}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
         {vehiculoTab === 'DATOS' && (() => {
           const catName = getCategoriaName() || ''; // e.g. M1, L1, O2
           const isO2O3O4 = ['O2', 'O3', 'O4'].includes(catName);

           // Reglas dinámicas (basadas en la lista exacta proporcionada)
           const hasCategoriaExtra = ['M2', 'M3'].includes(catName);
           const hasMotor = !isO2O3O4;
           const hasAsientos = !isO2O3O4;
           const hasPasajeros = !isO2O3O4;
           const hasPisos = !isO2O3O4;
           const hasCargaUtil = true; // Todos tienen Peso Seco, Carga Útil, Peso Bruto en este listado
           const hasPuertas = !isO2O3O4;
           const hasSalidasEmergencia = !isO2O3O4;
           const hasCilindros = !isO2O3O4;
           const hasKilometraje = !isO2O3O4;

           // Opciones Mapeadas
           const optsClases = maestrosVehiculo?.clases.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
           const optsMarcas = maestrosVehiculo?.marcas.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
           // Modelos y Colores se cargan dinámicamente
           const optsCarrocerias = maestrosVehiculo?.carrocerias.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
           const optsCombustibles = maestrosVehiculo?.combustibles.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
           const optsCategoriasExtra = maestrosVehiculo?.categoriasExtra?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];

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
                        {hasCategoriaExtra && <InputField label="Categoría Extra" name="categoriaExtra" isSelect options={optsCategoriasExtra} />}
                        <InputField label="Clase" name="clase" isSelect options={optsClases} onAddNuevo={() => handleAddNuevo('Clase', 'vehiculoclase', 'clase', optsClases)} />
                        <InputField label="Marca" name="marca" isSelect options={optsMarcas} onAddNuevo={() => handleAddNuevo('Marca', 'marca', 'marca', optsMarcas)} />
                        <InputField label="Modelo" name="modelo" isAsyncSelect loadOptions={loadModelos} onAddNuevo={() => handleAddNuevo('Modelo', 'modelo', 'modelo', [], loadModelos)} />
                        <InputField label="Color" name="color" isAsyncSelect loadOptions={loadColores} onAddNuevo={() => handleAddNuevo('Color', 'color', 'color', [], loadColores)} />
                        <InputField label="Carrocería" name="carroceria" isSelect options={optsCarrocerias} onAddNuevo={() => handleAddNuevo('Carrocería', 'carroceria', 'carroceria', optsCarrocerias)} />
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
                        <InputField label="Combustible" name="combustible" isSelect options={optsCombustibles} />
                        {hasCilindros && <InputField label="Nro Cilindros" name="nroCilindros" type="number" />}
                        {hasKilometraje && <InputField label="Kilometraje" name="kilometraje" type="number" />}
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
                        {hasCargaUtil && <InputField label="Carga Útil (Kg)" name="cargaUtil" type="number" />}
                        <InputField label="Peso Bruto (Kg)" name="pesoBruto" type="number" />
                        
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

              <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col items-center justify-center">
                {!isDatosValid && (
                  <p className="text-xs text-amber-600 font-bold mb-3 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                    ⚠️ Complete todos los campos obligatorios para continuar al SOAT
                  </p>
                )}
                <button
                  type="button"
                  disabled={!isDatosValid}
                  onClick={() => setVehiculoTab('SOAT')}
                  className={`px-8 py-3 rounded-xl font-black text-sm transition-all shadow-md
                    ${isDatosValid 
                      ? 'bg-amber-400 text-[#052a79] hover:bg-amber-300 hover:shadow-lg hover:-translate-y-0.5' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }
                  `}
                >
                  Continuar a 2. SOAT
                </button>
                {!isDatosValid && (
                  <p className="mt-3 text-xs text-red-500 font-semibold max-w-lg text-center">
                    Falta completar: {missingDatos.join(', ')}
                  </p>
                )}
              </div>

             </FormVehiculoContext.Provider>
           );
         })()}
         {vehiculoTab === 'SOAT' && (() => {
           const optsTiposPoliza = maestrosVehiculo?.tiposPoliza?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
           const optsAseguradoras = maestrosVehiculo?.aseguradoras?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];

           return (
             <FormVehiculoContext.Provider value={{formVehiculo, setFormVehiculo}}>
               <div>
                 <h3 className="text-sm font-black text-[#052a79] uppercase mb-4">2. SOAT</h3>
                 
                 <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <InputField 
                       label="Nro SOAT" 
                       name="nroSoat" 
                       maxLength={25}
                       onKeyDown={(e: any) => {
                         // Solo permitir números, retroceso y teclas de flecha
                         if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                           e.preventDefault();
                         }
                       }}
                       onChange={(e: any) => {
                         const val = e.target.value.replace(/[^0-9]/g, '');
                         setFormVehiculo({...formVehiculo, nroSoat: val});
                       }}
                       overrideValue={formVehiculo.nroSoat || ''}
                     />
                     <InputField label="Tipo de Póliza" name="tipoPoliza" isSelect options={optsTiposPoliza} />
                     <InputField label="Aseguradora" name="aseguradora" isSelect options={optsAseguradoras} />
                     <InputField 
                       label="Vigencia SOAT (Meses)" 
                       name="mesesSoat" 
                       isSelect 
                       options={[
                         { value: '6', label: '6 meses' },
                         { value: '12', label: '12 meses' }
                       ]} 
                     />
                     <InputField label="Fecha de Emisión" name="fechaEmisionSoat" type="date" />
                     <InputField label="Fecha de Vencimiento" name="fechaVencimientoSoat" type="date" />
                   </div>
                 </div>

                 <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col items-center justify-center">
                    {!isSoatValid && (
                      <p className="text-xs text-amber-600 font-bold mb-3 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                        ⚠️ Complete todos los campos del SOAT para continuar
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={!isSoatValid}
                      onClick={() => setVehiculoTab('PROPIETARIO')}
                      className={`px-8 py-3 rounded-xl font-black text-sm transition-all shadow-md
                        ${isSoatValid 
                          ? 'bg-amber-400 text-[#052a79] hover:bg-amber-300 hover:shadow-lg hover:-translate-y-0.5' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        }
                      `}
                    >
                      Continuar a 3. Propietario
                    </button>
                  </div>
               </div>
             </FormVehiculoContext.Provider>
           );
         })()}
         {vehiculoTab === 'PROPIETARIO' && (
           <div>
              <h3 className="text-sm font-black text-slate-800 uppercase mb-4">3. Datos del Propietario</h3>
              <p className="text-slate-500 text-sm">Sección en construcción.</p>
           </div>
         )}
      </div>
    </div>
  );
}
