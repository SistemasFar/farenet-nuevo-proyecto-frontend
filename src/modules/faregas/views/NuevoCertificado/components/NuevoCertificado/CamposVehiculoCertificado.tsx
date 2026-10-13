import React from 'react';
import type { MaestroOption } from '@/types/maestros';
import type { CampoVehiculoCertificado } from '../../faregas-certificado-campos';
import { MensajeError, propsCampo, claseConError, type ErroresCampo } from '../../faregas-wizard-errores';
import { esCampoEnteroCertificado, normalizarEnteroCertificado } from '../../faregas-formulario-operativo';

const CLASE_CAMPO = 'h-9 w-full rounded-lg border-2 border-slate-200 px-2 py-1 text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors';

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
    if (campo.campo === 'combustibleGlpAnual') return 'BI-COMBUSTIBLE GLP';
    if (campo.grupo === 'vin-serie') return formVehiculo.vin || formVehiculo.serieChasis || '';
    return formVehiculo[campo.campo] || '';
  };

  const renderCampo = (campo: CampoVehiculoCertificado, dentroDeColumna = false) => {
    const prefijoNumero = campo.numero != null ? `${campo.numero}. ` : '';
    const textoEtiqueta = `${prefijoNumero}${campo.etiqueta}`;

    if (campo.tipo === 'grupo' && campo.campos) {
      const requeridaGrupo = campo.campos.some((sub) => obligatorios.has(sub.campo));
      const colSpanClase = dentroDeColumna
        ? ''
        : campo.colSpan === 3
          ? 'col-span-1 md:col-span-3'
          : campo.colSpan === 4
            ? 'col-span-1 md:col-span-4'
            : 'col-span-1 md:col-span-2';

      return (
        <div
          key={campo.campo}
          className={colSpanClase}
          data-campo-certificado={campo.campo}
          data-columna-certificado={campo.columnaCertificado}
          data-grupo-certificado="true"
        >
          <label className="mb-1 block text-xs font-bold text-slate-500">
            {textoEtiqueta}{requeridaGrupo && <span className="text-red-500">*</span>}
          </label>
          <div className={dentroDeColumna
            ? 'flex flex-nowrap items-start gap-2'
            : 'flex flex-wrap items-center gap-2 sm:flex-nowrap'}>
            {campo.campos.map((sub, subIdx) => {
              const valorCrudo = String(formVehiculo[sub.campo] ?? '');
              const valorSub = esCampoEnteroCertificado(sub.campo)
                ? normalizarEnteroCertificado(valorCrudo)
                : valorCrudo;
              return (
                <React.Fragment key={sub.campo}>
                  {subIdx > 0 && (
                    <span className={`select-none px-1 text-base font-black text-slate-400 ${dentroDeColumna ? 'pt-2' : ''}`} aria-hidden="true">
                      {campo.separador || '/'}
                    </span>
                  )}
                  <div className={dentroDeColumna ? 'min-w-0 flex-1' : 'min-w-[70px] flex-1'}>
                    <input
                      name={sub.campo}
                      value={valorSub}
                      onChange={onChange}
                      placeholder={sub.placeholder || sub.campo}
                      inputMode={esCampoEnteroCertificado(sub.campo) ? 'numeric' : undefined}
                      data-tipo-dato={esCampoEnteroCertificado(sub.campo) ? 'entero' : 'texto'}
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
        <div key={campo.campo} data-campo-certificado={campo.campo} data-columna-certificado={campo.columnaCertificado}>
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
        <div key={campo.campo} data-campo-certificado={campo.campo} data-columna-certificado={campo.columnaCertificado}>
          {etiqueta}
          <div className="flex min-h-9 items-center rounded-lg border-2 border-blue-100 bg-blue-50 px-3 py-1 font-semibold text-[#052a79]">
            {String(valor(campo) || 'PENDIENTE')}
          </div>
          <p className="mt-1 text-[10px] font-semibold text-blue-700">Dato automático del proceso.</p>
        </div>
      );
    }

    return (
      <div key={campo.campo} data-campo-certificado={campo.campo} data-columna-certificado={campo.columnaCertificado}>
        {etiqueta}
        <input
          name={campo.campo}
          value={esCampoEnteroCertificado(campo.campo)
            ? normalizarEnteroCertificado(String(valor(campo)))
            : String(valor(campo))}
          onChange={onChange}
          inputMode={esCampoEnteroCertificado(campo.campo) ? 'numeric' : undefined}
          data-tipo-dato={esCampoEnteroCertificado(campo.campo) ? 'entero' : 'texto'}
          {...propsCampo(campo.campo, erroresCampo, CLASE_CAMPO)}
        />
        <MensajeError campo={campo.campo} errores={erroresCampo} />
      </div>
    );
  };

  const usaDistribucionDelCertificado = campos.length > 0
    && campos.every((campo) => Boolean(campo.columnaCertificado));

  if (usaDistribucionDelCertificado) {
    const izquierda = campos.filter((campo) => campo.columnaCertificado === 'izquierda');
    const derecha = campos.filter((campo) => campo.columnaCertificado === 'derecha');
    const filas = Array.from({ length: Math.max(izquierda.length, derecha.length) });

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200" data-layout-certificado="dos-columnas">
        {filas.map((_, indice) => (
          <div
            key={indice}
            className="grid grid-cols-1 gap-3 border-b border-slate-100 p-3 last:border-b-0 lg:grid-cols-2 lg:gap-6"
            data-fila-certificado={indice + 1}
          >
            <div>{izquierda[indice] ? renderCampo(izquierda[indice], true) : null}</div>
            <div>{derecha[indice] ? renderCampo(derecha[indice], true) : null}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      {campos.map((campo) => renderCampo(campo))}
    </div>
  );
}
