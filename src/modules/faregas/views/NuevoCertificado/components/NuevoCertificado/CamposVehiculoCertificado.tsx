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
    if (campo.campo === 'combustibleGlpAnual') return formVehiculo.combustible || 'BI COMBUSTIBLE GLP';
    if (campo.grupo === 'vin-serie') return formVehiculo.vin || formVehiculo.serieChasis || '';
    return formVehiculo[campo.campo] || '';
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {campos.map((campo, indice) => {
        const prefijoNumero = campo.numero != null ? `${campo.numero}. ` : '';
        const textoEtiqueta = `${prefijoNumero}${campo.etiqueta}`;

        if (campo.tipo === 'grupo' && campo.campos) {
          const requeridaGrupo = campo.campos.some((sub) => obligatorios.has(sub.campo));
          const colSpanClase = campo.colSpan === 3
            ? 'col-span-1 md:col-span-3'
            : campo.colSpan === 4
              ? 'col-span-1 md:col-span-4'
              : 'col-span-1 md:col-span-2';

          return (
            <div
              key={campo.campo}
              className={colSpanClase}
              data-campo-certificado={campo.campo}
              data-grupo-certificado="true"
            >
              <label className="mb-1 block text-xs font-bold text-slate-500">
                {textoEtiqueta}{requeridaGrupo && <span className="text-red-500">*</span>}
              </label>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                {campo.campos.map((sub, subIdx) => {
                  const valorSub = String(formVehiculo[sub.campo] ?? '');
                  return (
                    <React.Fragment key={sub.campo}>
                      {subIdx > 0 && (
                        <span className="text-base font-black text-slate-400 select-none px-1">
                          {campo.separador || '/'}
                        </span>
                      )}
                      <div className="flex-1 min-w-[70px]">
                        <input
                          name={sub.campo}
                          value={valorSub}
                          onChange={onChange}
                          placeholder={sub.placeholder || sub.campo}
                          {...propsCampo(sub.campo, erroresCampo, CLASE_CAMPO)}
                        />
                        <MensajeError campo={sub.campo} errores={erroresCampo} />
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        }

        const esError = Boolean(erroresCampo[campo.campo]);
        const requerida = obligatorios.has(campo.campo);
        const etiqueta = (
          <label className="mb-1 block text-xs font-bold text-slate-500">
            {textoEtiqueta}{requerida && <span className="text-red-500">*</span>}
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
