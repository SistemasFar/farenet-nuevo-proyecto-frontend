import React, { useState } from 'react';
import { Plus, XCircle } from 'lucide-react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { maestrosApi, externosApi, vehiculoApi } from '../../../../../services/api';

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

export const InputField = ({ label, name, type = "text", placeholder = "", required = false, isSelect = false, options = [], disabled = false, overrideValue, isAsyncSelect = false, loadOptions, defaultOptions = false, maxLength, minNumber, maxNumber, enforceStartWith, onAddNuevo, filter, onSearch, searching }: any) => {
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
          onChange={(opt: any) => setFormVehiculo({ ...formVehiculo, [name]: opt ? opt.value : '', [name + '_label']: opt ? opt.label : '' })}
          isDisabled={disabled}
          noOptionsMessage={() => "Escribe para buscar..."}
          loadingMessage={() => "Buscando..."}
        />
      ) : isSelect ? (
        <Select
          options={options}
          placeholder="Seleccione..."
          styles={customSelectStyles}
          value={
            options.find((opt: any) => opt.value?.toString() === formVehiculo[name]?.toString()) ||
            (formVehiculo[name] && formVehiculo[name + '_label'] ? { value: formVehiculo[name], label: formVehiculo[name + '_label'] } : null)
          }
          onChange={(opt: any) => setFormVehiculo({ ...formVehiculo, [name]: opt ? opt.value : '', [name + '_label']: opt ? opt.label : '' })}
          isDisabled={disabled || options.length === 0}
        />
      ) : (
        <div className="relative flex items-center">
          <input
            type={type === 'number' ? 'text' : type}
            inputMode={type === 'number' ? 'numeric' : undefined}
            value={overrideValue !== undefined ? overrideValue : formVehiculo[name]}
            onChange={(e) => {
              let val = type === 'email' ? e.target.value : e.target.value.toUpperCase();
              if (type === 'number') {
                val = val.replace(/\D/g, '');
              }
              if (filter === 'letras') {
                val = val.replace(/[^A-Z\sÑÁÉÍÓÚ]/g, '');
              } else if (filter === 'telefono') {
                val = val.replace(/[^0-9]/g, '');
                if (enforceStartWith && val.length > 0 && !val.startsWith(enforceStartWith)) {
                  val = '';
                }
              }
              if (maxLength && val.length > maxLength) {
                val = val.slice(0, maxLength);
              }
              setFormVehiculo({ ...formVehiculo, [name]: val });
            }}
            onBlur={() => {
              if (minNumber !== undefined && formVehiculo[name]) {
                if (parseInt(formVehiculo[name], 10) < minNumber) {
                  setFormVehiculo({ ...formVehiculo, [name]: '' });
                }
              }
              if (maxNumber !== undefined && formVehiculo[name]) {
                if (parseInt(formVehiculo[name], 10) > maxNumber) {
                  setFormVehiculo({ ...formVehiculo, [name]: maxNumber.toString() });
                }
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-[#052a79] ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''} ${onSearch ? 'pr-10' : ''}`}
          />
          {onSearch && (
            <button
              type="button"
              onClick={onSearch}
              disabled={disabled || searching || !formVehiculo[name]}
              className={`absolute right-1 top-1 bottom-1 px-2 flex items-center justify-center rounded-md transition ${searching ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
              title="Autocompletar"
            >
              {searching ? '⏳' : '🔍'}
            </button>
          )}
        </div>
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
  onValidationChange?: (isValid: boolean) => void;
  placaCaja?: string;
  isReinspeccion?: boolean;
  guardarParcialAsync?: (tabDestino: string) => void;
}

export function VehiculoStep({
  vehiculoTab,
  setVehiculoTab,
  formVehiculo,
  setFormVehiculo,
  maestrosVehiculo,
  getCategoriaName,
  onValidationChange,
  placaCaja,
  isReinspeccion,
  guardarParcialAsync
}: VehiculoStepProps) {

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTabla, setModalTabla] = useState('');
  const [modalField, setModalField] = useState('');
  const [modalOptions, setModalOptions] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const [modalAsyncSearch, setModalAsyncSearch] = useState<any>(null);

  const [maestrosPropietario, setMaestrosPropietario] = useState<any>(null);
  const [provincias, setProvincias] = useState<any[]>([]);
  const [distritos, setDistritos] = useState<any[]>([]);

  const [searchingPropietario, setSearchingPropietario] = useState(false);
  const [searchingVehiculo, setSearchingVehiculo] = useState(false);

  React.useEffect(() => {
    if (formVehiculo.fechaEmisionSoat && formVehiculo.mesesSoat) {
      const emision = new Date(formVehiculo.fechaEmisionSoat);
      if (!isNaN(emision.getTime())) {
        // Al sumar meses a la fecha, se maneja automáticamente el año
        emision.setMonth(emision.getMonth() + parseInt(formVehiculo.mesesSoat, 10));
        const vencimiento = emision.toISOString().split('T')[0];
        if (formVehiculo.fechaVencimientoSoat !== vencimiento) {
          setFormVehiculo((prev: any) => ({ ...prev, fechaVencimientoSoat: vencimiento }));
        }
      }
    }
  }, [formVehiculo.fechaEmisionSoat, formVehiculo.mesesSoat]);

  React.useEffect(() => {
    if (vehiculoTab === 'PROPIETARIO' && !maestrosPropietario) {
      maestrosApi.obtenerMaestrosPropietario().then((res: any) => setMaestrosPropietario(res.data)).catch(console.error);
    }
  }, [vehiculoTab, maestrosPropietario]);

  React.useEffect(() => {
    if (formVehiculo.departamentoProp) {
      maestrosApi.obtenerProvincias(formVehiculo.departamentoProp).then((res: any) => setProvincias(res.data)).catch(console.error);
    } else {
      setProvincias([]);
    }
  }, [formVehiculo.departamentoProp]);

  React.useEffect(() => {
    if (formVehiculo.provinciaProp) {
      maestrosApi.obtenerDistritos(formVehiculo.provinciaProp).then((res: any) => setDistritos(res.data)).catch(console.error);
    } else {
      setDistritos([]);
    }
  }, [formVehiculo.provinciaProp]);

  const handleSearchPropietario = async () => {
    const nro = formVehiculo.nroDocProp;
    const tipo = formVehiculo.tipoDocProp;
    if (!nro) return;

    setSearchingPropietario(true);
    try {
      const selectedDoc = maestrosPropietario?.tiposDocumento?.find((x: any) => x.key === tipo);
      const isRuc = selectedDoc?.nombre?.toUpperCase() === 'RUC';

      if (isRuc && nro.length === 11) {
        const res = await externosApi.consultarRuc(nro);
        if (res?.data) {
          setFormVehiculo((prev: any) => ({
            ...prev,
            razonSocialProp: res.data.razonSocial || '',
            direccionProp: res.data.direccion || prev.direccionProp
          }));
        }
      } else if (!isRuc && nro.length === 8) {
        const res = await externosApi.consultarDni(nro);
        if (res?.data) {
          setFormVehiculo((prev: any) => ({
            ...prev,
            nombresProp: res.data.nombres || '',
            apellidosProp: res.data.apellidos || ''
          }));
        }
      }
    } catch (e) {
      console.error('Error autocompletando propietario', e);
    } finally {
      setSearchingPropietario(false);
    }
  };

  const handleSearchVehiculo = async () => {
    const p = formVehiculo.placaNueva || placaCaja;
    if (!p) return;
    setSearchingVehiculo(true);
    try {
      const res = await vehiculoApi.buscarPorPlaca(p);
      if (res?.data) {
        setFormVehiculo((prev: any) => ({
          ...prev,
          placaNueva: res.data.placamotor || p,
          nroSerie: res.data.nrovin || res.data.nroserie || '',
          nroMotor: res.data.nromotor || '',
          anioFabricacion: res.data.aniofabricacion || '',
          anioModelo: res.data.aniomodelo || '',
          categoria: res.data.categoria_key || prev.categoria || '',
            categoriaExtra: res.data.categoriaextra || '',
            clase: res.data.vehiculoclase_key || '',
            marca: res.data.marca_key || '',
            modelo: res.data.modelo_key || '',
            color: res.data.color_key || '',
            carroceria: res.data.carroceria_key || '',
            combustible: res.data.combustible_key || '',
            nroCilindros: res.data.nrocilindros || '',
            kilometraje: res.data.kilometraje || '',
            kilometrajeOriginal: res.data.kilometraje || 0,
            nroAsientos: res.data.nroasientos || '',
            nroPasajeros: res.data.nropasajeros || '',
            nroRuedas: res.data.nroruedas || '',
            nroEjes: res.data.nroejes || '',
            nroPuertas: res.data.nropuertas || '',
            nroPisos: res.data.nropisos || '',
            salidasEmergencia: res.data.nrosalidaemergencia || '',
                      pesoSeco: res.data.pesoseco || '',
            pesoBruto: res.data.pesobruto || '',
            cargaUtil: res.data.cargautil || '',
            longitud: res.data.longitud || '',
            altura: res.data.alto || res.data.altura || '',
            ancho: res.data.ancho || '',
            nroSoat: res.data.nrosoat || '',
            tipoPoliza: res.data.tipopoliza_key || '',
            aseguradora: res.data.aseguradora_key || '',
                        fechaEmisionSoat: res.data.fechiniciotarjetapropiedad ? res.data.fechiniciotarjetapropiedad.split('T')[0] : '',
            fechaVencimientoSoat: res.data.fechfintarjetapropiedad ? res.data.fechfintarjetapropiedad.split('T')[0] : '',
            mesesSoat: res.data.fechiniciotarjetapropiedad && res.data.fechfintarjetapropiedad ? 
              (new Date(res.data.fechfintarjetapropiedad).getFullYear() - new Date(res.data.fechiniciotarjetapropiedad).getFullYear()) * 12 === 6 ? '6' : '12' : '12',

            // Propietario
            nroDocProp: res.data.prop_nrodoc || '',
            tipoDocProp: res.data.prop_tipodoc || '',
            razonSocialProp: res.data.prop_razon || '',
            nombresProp: res.data.prop_nombres || '',
            apellidosProp: res.data.prop_apellidos || '',
            paisProp: res.data.prop_pais || '114',
            departamentoProp: res.data.prop_dep || '',
            provinciaProp: res.data.prop_prov || '',
            distritoProp: res.data.prop_dist || '',
            direccionProp: res.data.prop_dir || '',
            emailProp: res.data.prop_email || '',
            telefonoProp: res.data.prop_tel || ''
          }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingVehiculo(false);
    }
  };

  React.useEffect(() => {
    if (placaCaja && !formVehiculo.placaNueva && !formVehiculo.marca) {
      handleSearchVehiculo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placaCaja]);

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

    const isCategoriaO = catName.trim().startsWith('O');
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

    if (!isCategoriaO) {
      const dynamicFields = [
        'nroMotor', 'nroCilindros', 'kilometraje', 'nroAsientos',
        'nroPasajeros', 'nroPuertas', 'nroPisos', 'salidasEmergencia'
      ];
      for (const f of dynamicFields) {
        if (!isValid((formVehiculo as any)[f])) missing.push(f);
      }

      // Regla: Si el vehiculo ya existe en BD, el nuevo kilometraje debe ser obligatoriamente mayor al original
      if (isValid((formVehiculo as any)['kilometraje'])) {
        const kmActual = parseFloat((formVehiculo as any)['kilometraje']);
        
        const kmOriginal = parseFloat((formVehiculo as any)['kilometrajeOriginal'] || 0);
        if (kmOriginal > 0 && kmActual <= kmOriginal) {
          missing.push(`Kilometraje (debe ser mayor a ${kmOriginal} que fue el último registrado)`);
        }
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

  const checkPropietarioValid = () => {
    const isValid = (val: any) => val !== undefined && val !== null && String(val).trim() !== '';
    const req = ['paisProp', 'departamentoProp', 'provinciaProp', 'distritoProp', 'direccionProp', 'emailProp', 'telefonoProp'];

    if (!formVehiculo.sinDni) {
      req.push('tipoDocProp', 'nroDocProp');

      const selectedDoc = maestrosPropietario?.tiposDocumento?.find((x: any) => x.key === formVehiculo.tipoDocProp);
      const isRuc = selectedDoc?.nombre?.toUpperCase() === 'RUC';

      if (isRuc) {
        req.push('razonSocialProp');
      } else {
        req.push('nombresProp', 'apellidosProp');
      }
    } else {
      req.push('nombresProp', 'apellidosProp');
    }

    let missing: string[] = [];
    for (const f of req) {
      if (!isValid((formVehiculo as any)[f])) missing.push(f);
    }
    return missing;
  };

  const missingPropietario = checkPropietarioValid();
  const isPropietarioValid = missingPropietario.length === 0;

  const isAllValid = isDatosValid && isSoatValid && isPropietarioValid;

  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isAllValid);
    }
  }, [isAllValid, onValidationChange]);

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
          const isCategoriaO = catName.trim().startsWith('O');

          // Reglas dinámicas (basadas en la lista exacta proporcionada)
          const hasCategoriaExtra = ['M2', 'M3'].includes(catName);
          const hasMotor = !isCategoriaO;
          const hasAsientos = !isCategoriaO;
          const hasPasajeros = !isCategoriaO;
          const hasPisos = !isCategoriaO;
          const hasCargaUtil = true; // Todos tienen Peso Seco, Carga Útil, Peso Bruto en este listado
          const hasPuertas = !isCategoriaO;
          const hasSalidasEmergencia = !isCategoriaO;
          const hasCilindros = !isCategoriaO;
          const hasKilometraje = !isCategoriaO;

          // Opciones Mapeadas
          const optsClases = maestrosVehiculo?.clases.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
          const optsMarcas = maestrosVehiculo?.marcas.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
          // Modelos y Colores se cargan dinámicamente
          const optsCarrocerias = maestrosVehiculo?.carrocerias.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
          const optsCombustibles = maestrosVehiculo?.combustibles.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
          const optsCategoriasExtra = maestrosVehiculo?.categoriasExtra?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];

          return (
            <FormVehiculoContext.Provider value={{ formVehiculo, setFormVehiculo }}>
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
                        <InputField label="Modelo" name="modelo" isAsyncSelect defaultOptions={true} loadOptions={loadModelos} onAddNuevo={() => handleAddNuevo('Modelo', 'modelo', 'modelo', [], loadModelos)} />
                        <InputField label="Color" name="color" isAsyncSelect defaultOptions={true} loadOptions={loadColores} onAddNuevo={() => handleAddNuevo('Color', 'color', 'color', [], loadColores)} />
                        <InputField label="Carrocería" name="carroceria" isSelect options={optsCarrocerias} onAddNuevo={() => handleAddNuevo('Carrocería', 'carroceria', 'carroceria', optsCarrocerias)} />
                        <InputField
                          label="Marca Carrocería"
                          name="marcaCarroceria"
                          disabled={true}
                        />
                        <InputField
                          label="Placa Nueva"
                          name="placaNueva"
                          onSearch={handleSearchVehiculo}
                          searching={searchingVehiculo}
                          disabled={!(isReinspeccion || parseFloat((formVehiculo as any)['kilometrajeOriginal'] || 0) > 0)}
                        />
                        <InputField label="Nro Serie (VIN)" name="nroSerie" maxLength={22} />
                        {hasMotor && <InputField label="Nro Motor" name="nroMotor" maxLength={20} />}
                      </div>
                    </div>

                    {/* BLOQUE 2: ESPECIFICACIONES TÉCNICAS */}
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                      <h4 className="text-xs font-black text-slate-700 uppercase mb-3 border-b border-slate-200 pb-2">Especificaciones Técnicas</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <InputField label="Año Fabricación" name="anioFabricacion" type="number" maxLength={4} minNumber={1800} maxNumber={new Date().getFullYear() + 2} />
                        <InputField label="Combustible" name="combustible" isSelect options={optsCombustibles} />
                        {hasCilindros && <InputField label="Nro Cilindros" name="nroCilindros" type="number" />}
                        {hasKilometraje && <InputField label="Kilometraje" name="kilometraje" type="number" maxLength={6} />}
                      </div>
                    </div>

                    {/* BLOQUE 3: CAPACIDAD Y DIMENSIONES */}
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                      <h4 className="text-xs font-black text-slate-700 uppercase mb-3 border-b border-slate-200 pb-2">Capacidad y Dimensiones</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Asientos / Pasajeros */}
                        {hasAsientos && <InputField label="Nro Asientos" name="nroAsientos" type="number" minNumber={0} maxNumber={80} />}
                        {hasPasajeros && <InputField label="Nro Pasajeros" name="nroPasajeros" type="number" minNumber={0} maxNumber={80} />}
                        {hasPuertas && <InputField label="Nro Puertas" name="nroPuertas" type="number" />}
                        {hasPisos && <InputField label="Nro Pisos" name="nroPisos" type="number" />}
                        {hasSalidasEmergencia && <InputField label="Salidas de Emergencia" name="salidasEmergencia" type="number" />}

                        {/* Pesos */}
                        <InputField label="Peso Seco (Kg)" name="pesoSeco" type="number" maxLength={5} />
                        {hasCargaUtil && <InputField label="Carga Útil (Kg)" name="cargaUtil" type="number" maxLength={5} />}
                        <InputField label="Peso Bruto (Kg)" name="pesoBruto" type="number" maxLength={5} />

                        {/* Dimensiones */}
                        <InputField label="Longitud (m)" name="longitud" type="number" />
                        <InputField label="Ancho (m)" name="ancho" type="number" />
                        <InputField label="Altura (m)" name="altura" type="number" />
                        <InputField label="Nro Ejes" name="nroEjes" type="number" maxNumber={6} />
                        <InputField label="Nro Ruedas" name="nroRuedas" type="number" maxNumber={24} />
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
                  onClick={() => guardarParcialAsync ? guardarParcialAsync('SOAT') : setVehiculoTab('SOAT')}
                  className={`px-8 py-3 rounded-xl font-black text-sm transition-all shadow-md
                    ${isDatosValid
                      ? 'bg-gold-3d hover:-translate-y-0.5'
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
            <FormVehiculoContext.Provider value={{ formVehiculo, setFormVehiculo }}>
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
                        setFormVehiculo({ ...formVehiculo, nroSoat: val });
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
                    <InputField label="Fecha de Vencimiento" name="fechaVencimientoSoat" type="date" disabled={!!formVehiculo.fechaEmisionSoat} />
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
                    onClick={() => guardarParcialAsync ? guardarParcialAsync('PROPIETARIO') : setVehiculoTab('PROPIETARIO')}
                    className={`px-8 py-3 rounded-xl font-black text-sm transition-all shadow-md
                        ${isSoatValid
                        ? 'bg-gold-3d hover:-translate-y-0.5'
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
        {vehiculoTab === 'PROPIETARIO' && (() => {
          const optsDocs = maestrosPropietario?.tiposDocumento?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
          const optsPaises = maestrosPropietario?.paises?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
          const optsDept = maestrosPropietario?.departamentos?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
          const optsProv = provincias.map((x: any) => ({ value: x.key, label: x.nombre }));
          const optsDist = distritos.map((x: any) => ({ value: x.key, label: x.nombre }));

          return (
            <FormVehiculoContext.Provider value={{ formVehiculo, setFormVehiculo }}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-[#052a79] uppercase">3. Datos del Propietario</h3>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#052a79] focus:ring-[#052a79] cursor-pointer"
                      checked={formVehiculo.sinDni || false}
                      onChange={(e) => setFormVehiculo({ ...formVehiculo, sinDni: e.target.checked, tipoDocProp: '', nroDocProp: '' })}
                    />
                    <span className="text-xs font-bold text-slate-700">SIN DNI</span>
                  </label>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(() => {
                      const selectedDoc = maestrosPropietario?.tiposDocumento?.find((x: any) => x.key === formVehiculo.tipoDocProp);
                      const isRuc = !formVehiculo.sinDni && selectedDoc?.nombre?.toUpperCase() === 'RUC';
                      const isDni = selectedDoc?.nombre?.toUpperCase() === 'DNI';
                      const maxLen = isDni ? 8 : (isRuc ? 11 : 15);

                      return (
                        <>
                          {!formVehiculo.sinDni && (
                            <>
                              <InputField label="Tipo de Documento" name="tipoDocProp" isSelect options={optsDocs} />
                              <InputField
                                label="NRO. DOCUMENTO DE IDENTIDAD"
                                name="nroDocProp"
                                type="number"
                                maxLength={maxLen}
                                onSearch={handleSearchPropietario}
                                searching={searchingPropietario}
                              />
                            </>
                          )}
                          {isRuc ? (
                            <InputField label="Nombre de la Empresa (Razón Social)" name="razonSocialProp" />
                          ) : (
                            <>
                              <InputField label="Nombres" name="nombresProp" filter="letras" />
                              <InputField label="Apellidos" name="apellidosProp" filter="letras" />
                            </>
                          )}
                        </>
                      );
                    })()}
                    <InputField label="País" name="paisProp" isSelect options={optsPaises} />
                    <InputField label="Departamento" name="departamentoProp" isSelect options={optsDept} />
                    <InputField label="Provincia" name="provinciaProp" isSelect options={optsProv} disabled={!formVehiculo.departamentoProp} />
                    <InputField label="Distrito" name="distritoProp" isSelect options={optsDist} disabled={!formVehiculo.provinciaProp} />
                    <InputField label="Dirección" name="direccionProp" />
                    <InputField label="Email" name="emailProp" type="email" />
                    <InputField label="Teléfono" name="telefonoProp" filter="telefono" maxLength={9} enforceStartWith="9" />
                  </div>
                </div>

                {!isPropietarioValid && (
                  <p className="mt-4 text-xs text-red-500 font-semibold text-center">
                    Falta completar: {missingPropietario.join(', ')}
                  </p>
                )}
              </div>
            </FormVehiculoContext.Provider>
          );
        })()}
      </div>
    </div>
  );
}
