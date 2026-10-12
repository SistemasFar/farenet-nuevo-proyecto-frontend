import React from 'react';
import type { MaestroOption } from '@/types/maestros';
import type { CampoVehiculoCertificado } from '../../faregas-certificado-campos';
import { MensajeError, propsCampo, claseConError, type ErroresCampo } from '../../faregas-wizard-errores';

const CLASE_CAMPO = 'w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors';

type Props = {
  campos: CampoVehiculoCertificado[];
  formVehiculo: Record<string, unknown>;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  categoriaVehicular: string;
  categoriasVehiculares: MaestroOption[];
  onCategoriaVehicularChange: (categoria: string) => void;
  erroresCampo: ErroresCampo;
  obligatorios: Set<string>;
};

export function CamposVehiculoCertificado({
  campos,
  formVehiculo,
  onChange,
  categoriaVehicular,
  categoriasVehiculares,
  onCategoriaVehicularChange,
  erroresCampo,
  obligatorios,
}: Props) {
  const valor = (campo: CampoVehiculoCertificado) => {
    if (campo.campo === 'combustibleGlpAnual') return 'BI COMBUSTIBLE GLP';
    if (campo.grupo === 'vin-serie') return formVehiculo.vin || formVehiculo.serieChasis || '';
    return formVehiculo[campo.campo] || '';
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {campos.map((campo, indice) => {
        const esError = Boolean(erroresCampo[campo.campo]);
        const requerida = obligatorios.has(campo.campo);
        const etiqueta = (
          <label className="mb-1 block text-xs font-bold text-slate-500">
            {indice + 1}. {campo.etiqueta}{requerida && <span className="text-red-500">*</span>}
          </label>
        );

        if (campo.campo === 'categoria') {
          return (
            <div key={campo.campo} data-campo-certificado={campo.campo}>
              {etiqueta}
              <select
                value={categoriaVehicular || ''}
                onChange={(event) => onCategoriaVehicularChange(event.target.value)}
                className={claseConError(CLASE_CAMPO, esError)}
                data-campo-error={esError || undefined}
              >
                <option value="">-- SELECCIONAR --</option>
                {categoriasVehiculares.map((categoria) => (
                  <option key={categoria.key} value={categoria.key}>{categoria.nombre}</option>
                ))}
              </select>
              <MensajeError campo="categoria" errores={erroresCampo} />
            </div>
          );
        }

        if (campo.automatico) {
          return (
            <div key={campo.campo} data-campo-certificado={campo.campo}>
              {etiqueta}
              <div className="min-h-[42px] rounded-lg border-2 border-blue-100 bg-blue-50 px-3 py-2 font-semibold text-[#052a79]">
                {String(valor(campo) || 'PENDIENTE')}
              </div>
              <p className="mt-1 text-[10px] font-semibold text-blue-700">Dato automático del proceso.</p>
            </div>
          );
        }

        return (
          <div key={campo.campo} data-campo-certificado={campo.campo}>
            {etiqueta}
            <input
              name={campo.campo}
              value={String(valor(campo))}
              onChange={onChange}
              {...propsCampo(campo.campo, erroresCampo, CLASE_CAMPO)}
            />
            <MensajeError campo={campo.campo} errores={erroresCampo} />
          </div>
        );
      })}
    </div>
  );
}

