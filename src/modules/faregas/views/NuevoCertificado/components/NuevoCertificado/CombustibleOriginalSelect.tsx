import React, { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import type { MaestroOption } from '@/types/maestros';
import { maestrosApi } from '@/services/api';
import { combustiblesSonEquivalentes } from '../../gnv-conversion';

export interface CombustibleOriginalSelectProps {
  value: string;
  onChange: (value: string) => void;
  maestrosVehiculo?: {
    combustibles?: MaestroOption[];
    [key: string]: unknown;
  } | null;
  combustibles?: MaestroOption[];
  esError?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function CombustibleOriginalSelect({
  value,
  onChange,
  maestrosVehiculo,
  combustibles,
  esError = false,
  disabled = false,
  id = 'combustible-original-select',
  name = 'combustible',
}: CombustibleOriginalSelectProps) {
  const [combustiblesApi, setCombustiblesApi] = useState<MaestroOption[]>([]);

  useEffect(() => {
    const listaProps = combustibles || maestrosVehiculo?.combustibles;
    if (Array.isArray(listaProps) && listaProps.length > 0) {
      return;
    }
    let activo = true;
    maestrosApi
      .obtenerMaestrosVehiculoAsync()
      .then((res) => {
        if (activo && Array.isArray(res?.data?.combustibles)) {
          setCombustiblesApi(res.data.combustibles);
        }
      })
      .catch(() => {
        // Ignora silenciosamente si falla la llamada (ej. entornos de test o desconexión)
      });
    return () => {
      activo = false;
    };
  }, [combustibles, maestrosVehiculo]);

  const listaBase = useMemo(() => {
    if (Array.isArray(combustibles) && combustibles.length > 0) return combustibles;
    if (Array.isArray(maestrosVehiculo?.combustibles) && maestrosVehiculo.combustibles.length > 0) {
      return maestrosVehiculo.combustibles;
    }
    return combustiblesApi;
  }, [combustibles, maestrosVehiculo, combustiblesApi]);

  // Excluir estrictamente cualquier variante de BI-COMBUSTIBLE GLP
  const opcionesCatalogo = useMemo(() => {
    const resultado: Array<{ value: string; label: string }> = [];
    const vistos = new Set<string>();

    for (const item of listaBase) {
      const nombre = String(item?.nombre || item?.label || '').trim().toUpperCase();
      const clave = String(item?.key || item?.value || '').trim();

      if (!nombre) continue;
      if (
        combustiblesSonEquivalentes(nombre, 'BI-COMBUSTIBLE GLP') ||
        combustiblesSonEquivalentes(clave, 'BI-COMBUSTIBLE GLP')
      ) {
        continue;
      }

      if (vistos.has(nombre)) continue;
      vistos.add(nombre);

      resultado.push({
        value: nombre,
        label: nombre,
      });
    }

    return resultado;
  }, [listaBase]);

  const valorLimpio = String(value || '').trim().toUpperCase();

  // Buscar coincidencia en catálogo
  const opcionSeleccionada = useMemo(() => {
    if (!valorLimpio) return null;
    return (
      opcionesCatalogo.find(
        (opt) => opt.value === valorLimpio || combustiblesSonEquivalentes(opt.value, valorLimpio)
      ) || null
    );
  }, [opcionesCatalogo, valorLimpio]);

  // Si existe un valor previo en borrador/registro pero no figura en catálogo (y no es BI-COMBUSTIBLE GLP)
  const esValorHistoricoFueraDeCatalogo = Boolean(
    valorLimpio &&
    !opcionSeleccionada &&
    !combustiblesSonEquivalentes(valorLimpio, 'BI-COMBUSTIBLE GLP')
  );

  const opcionesTotales = useMemo(() => {
    if (esValorHistoricoFueraDeCatalogo) {
      return [
        {
          value: valorLimpio,
          label: `${valorLimpio} (VALOR ACTUAL REGISTRADO)`,
        },
        ...opcionesCatalogo,
      ];
    }
    return opcionesCatalogo;
  }, [esValorHistoricoFueraDeCatalogo, valorLimpio, opcionesCatalogo]);

  const valorActualSelect = useMemo(() => {
    if (!valorLimpio) return null;
    if (opcionSeleccionada) return opcionSeleccionada;
    if (esValorHistoricoFueraDeCatalogo) {
      return {
        value: valorLimpio,
        label: `${valorLimpio} (VALOR ACTUAL REGISTRADO)`,
      };
    }
    return null;
  }, [valorLimpio, opcionSeleccionada, esValorHistoricoFueraDeCatalogo]);

  const customStyles = useMemo(
    () => ({
      control: (base: any, state: any) => ({
        ...base,
        minHeight: '36px',
        height: '36px',
        borderRadius: '0.5rem',
        borderWidth: '2px',
        borderColor: esError
          ? '#ef4444'
          : state.isFocused
            ? '#f59e0b'
            : '#e2e8f0',
        boxShadow: state.isFocused ? '0 0 0 1px #f59e0b' : 'none',
        '&:hover': {
          borderColor: esError
            ? '#ef4444'
            : state.isFocused
              ? '#f59e0b'
              : '#cbd5e1',
        },
        backgroundColor: disabled ? '#f8fafc' : '#ffffff',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#1e293b',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }),
      valueContainer: (base: any) => ({
        ...base,
        padding: '0 8px',
        height: '32px',
      }),
      input: (base: any) => ({
        ...base,
        margin: 0,
        padding: 0,
        color: '#1e293b',
        fontWeight: '600',
        fontSize: '0.875rem',
        textTransform: 'uppercase',
      }),
      singleValue: (base: any) => ({
        ...base,
        color: '#1e293b',
        fontWeight: '600',
        fontSize: '0.875rem',
        textTransform: 'uppercase',
      }),
      placeholder: (base: any) => ({
        ...base,
        color: '#94a3b8',
        fontSize: '0.875rem',
        fontWeight: '500',
      }),
      menu: (base: any) => ({
        ...base,
        zIndex: 60,
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      }),
      menuPortal: (base: any) => ({
        ...base,
        zIndex: 9999,
      }),
      menuList: (base: any) => ({
        ...base,
        maxHeight: '220px',
        padding: '4px',
      }),
      option: (base: any, state: any) => ({
        ...base,
        borderRadius: '0.375rem',
        padding: '6px 10px',
        fontSize: '0.8125rem',
        fontWeight: state.isSelected ? '700' : '600',
        textTransform: 'uppercase',
        backgroundColor: state.isSelected
          ? '#fef3c7'
          : state.isFocused
            ? '#f1f5f9'
            : 'transparent',
        color: state.isSelected ? '#92400e' : '#1e293b',
        cursor: 'pointer',
        '&:active': {
          backgroundColor: '#fde68a',
        },
      }),
    }),
    [esError, disabled]
  );

  return (
    <div className="w-full" data-campo-combustible-original="true">
      <input type="hidden" name={name} value={valorLimpio} />
      <Select
        inputId={id}
        instanceId={id}
        name={name}
        isDisabled={disabled}
        isSearchable={true}
        isClearable={false}
        options={opcionesTotales}
        value={valorActualSelect}
        onChange={(opt: any) => {
          onChange(opt ? String(opt.value).toUpperCase() : '');
        }}
        placeholder="Buscar o seleccionar combustible..."
        noOptionsMessage={() => 'No se encontraron combustibles coincidentes'}
        styles={customStyles}
        className="combustible-original-select"
        classNamePrefix="combustible-select"
      />
      {esValorHistoricoFueraDeCatalogo && (
        <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 border border-amber-200">
          ⚠️ El valor &quot;{valorLimpio}&quot; es un registro existente que no figura en el catálogo activo. Se conserva visualmente para no perder información histórica.
        </div>
      )}
    </div>
  );
}
