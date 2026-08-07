import React, { useState } from 'react';
import { Plus, XCircle } from 'lucide-react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';

export const customSelectStyles = {
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

export const AgregarMaestroModal = ({ isOpen, onClose, onSave, title, loading, existingOptions = [], asyncSearch }: any) => {
  const [value, setValue] = useState('');
  const [asyncMatches, setAsyncMatches] = useState<any[]>([]);
  const [serverError, setServerError] = useState(false);

  const trimValue = value.trim();

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
      suggestions = matches.map((m: any) => m.label).slice(0, 3);
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

export const InputField = ({ label, name, formData, setFormData, type = "text", placeholder = "", required = false, isSelect = false, options = [], disabled = false, overrideValue, isAsyncSelect = false, loadOptions, defaultOptions = false, maxLength, minNumber, maxNumber, enforceStartWith, onAddNuevo, filter, onSearch, searching, onKeyDown, onChange }: any) => {
  const [localVal, setLocalVal] = React.useState('');
  const [isMasked, setIsMasked] = React.useState(false);
  const externalVal = overrideValue !== undefined ? overrideValue : formData[name];
  
  React.useEffect(() => {
    if (filter === 'telefono') {
      if (externalVal !== localVal) {
        setLocalVal(externalVal || '');
        if (externalVal && externalVal.length > 3) {
          setIsMasked(true);
        } else {
          setIsMasked(false);
        }
      }
    }
  }, [externalVal, filter, localVal]);

  let displayValue = externalVal || '';
  if (filter === 'telefono') {
    if (isMasked && displayValue.length > 3) {
      displayValue = '*'.repeat(displayValue.length - 3) + displayValue.slice(-3);
    } else {
      displayValue = localVal;
    }
  }

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
            formData[name] ?
              { value: formData[name], label: formData[name + '_label'] || formData[name] }
              : null
          }
          onChange={(opt: any) => setFormData({ ...formData, [name]: opt ? opt.value : '', [name + '_label']: opt ? opt.label : '' })}
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
            options.find((opt: any) => opt.value?.toString() === formData[name]?.toString()) ||
            (formData[name] && formData[name + '_label'] ? { value: formData[name], label: formData[name + '_label'] } : null)
          }
          onChange={(opt: any) => setFormData({ ...formData, [name]: opt ? opt.value : '', [name + '_label']: opt ? opt.label : '' })}
          isDisabled={disabled || options.length === 0}
        />
      ) : (
        <div className="relative flex items-center">
          <input
            type={type === 'number' ? 'text' : type}
            inputMode={type === 'number' ? 'numeric' : undefined}
            value={filter === 'telefono' ? displayValue : (overrideValue !== undefined ? overrideValue : formData[name]) || ''}
            onKeyDown={onKeyDown}
            onChange={(e) => {
              if (onChange) {
                onChange(e);
                return;
              }
              let val = type === 'email' ? e.target.value : e.target.value.toUpperCase();
              if (type === 'number') {
                val = val.replace(/\D/g, '');
              }
              if (filter === 'letras') {
                val = val.replace(/[^A-Z\sÑÁÉÍÓÚ]/g, '');
              } else if (filter === 'telefono') {
                if (isMasked) {
                  setIsMasked(false);
                  const nativeEvent = e.nativeEvent as any;
                  if (nativeEvent.inputType === 'deleteContentBackward') {
                    val = '';
                  } else if (nativeEvent.data) {
                    val = nativeEvent.data.replace(/[^0-9]/g, '');
                  } else if (!e.target.value.includes('*')) {
                    val = e.target.value.replace(/[^0-9]/g, '');
                  } else {
                    val = '';
                  }
                } else {
                  val = val.replace(/[^0-9]/g, '');
                }
                if (enforceStartWith && val.length > 0 && !val.startsWith(enforceStartWith)) {
                  val = '';
                }
                setLocalVal(val);
              }
              if (maxLength && val.length > maxLength) {
                val = val.slice(0, maxLength);
              }
              setFormData({ ...formData, [name]: val });
            }}
            onBlur={() => {
              if (filter === 'telefono') {
                setIsMasked(true);
              }
              if (minNumber !== undefined && formData[name]) {
                if (parseInt(formData[name], 10) < minNumber) {
                  setFormData({ ...formData, [name]: '' });
                }
              }
              if (maxNumber !== undefined && formData[name]) {
                if (parseInt(formData[name], 10) > maxNumber) {
                  setFormData({ ...formData, [name]: maxNumber.toString() });
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
              disabled={disabled || searching || !formData[name]}
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
