import React from 'react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { maestrosApi } from '../../../../../services/api';

export const FormVehiculoContext = React.createContext<any>(null);

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

export const InputField = ({ label, name, type = "text", placeholder = "", required = false, isSelect = false, options = [], disabled = false, overrideValue, isAsyncSelect = false, loadOptions, defaultOptions = false, maxLength, minNumber }: any) => {
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
  if (!inputValue) return [];
  try {
    const res = await maestrosApi.buscarModelosAsync(inputValue);
    return res.data.map((m: any) => ({ value: m.key, label: m.nombre }));
  } catch (err) {
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
  return (
    <div className="space-y-6">
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

           // Reglas dinámicas (sacadas del prompt del usuario)
           const hasMotor = isL || isM || isN; // O no tiene motor
           const hasAsientos = ['L4', 'L5'].includes(catName) || isM || isN;
           const hasPasajeros = ['L4', 'L5'].includes(catName) || isM;
           const hasPisos = catName === 'M3';
           const hasCargaUtil = catName !== '' && !['L1', 'L3'].includes(catName);
           const hasPuertas = isM || isN;
           const hasSalidasEmergencia = ['M2', 'M3'].includes(catName);

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
  );
}
