import React from 'react';
import type { FormularioFormatoDinamicoFaregas } from '../../../../types/faregas-api';
import { TitularesList } from './TitularesList';
import type { TitularState } from './TitularesList';
import type { FormFacturacionState } from '../../NuevoCertificadoView';

interface TallerStepProps {
  formulario: FormularioFormatoDinamicoFaregas | null;
  valores: Record<string, string>;
  setValores: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  cargando?: boolean;
  error?: string;
  titulares: TitularState[];
  setTitulares: React.Dispatch<React.SetStateAction<TitularState[]>>;
  formFacturacion: FormFacturacionState;
  setFormFacturacion: React.Dispatch<React.SetStateAction<FormFacturacionState>>;
  onRemoveTitular?: (titular: TitularState) => Promise<void>;
}

export const TallerStep: React.FC<TallerStepProps> = ({ 
  formulario, valores, setValores, cargando, error,
  titulares, setTitulares, formFacturacion, setFormFacturacion, onRemoveTitular 
}) => {
  if (cargando) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Leyendo las variables del formato seleccionado...</div>;
  }

  if (error || !formulario) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        {error || 'El servicio no tiene una versión de formato disponible para construir el formulario.'}
      </div>
    );
  }

  const grupos = formulario.campos.reduce<Record<string, typeof formulario.campos>>((acumulado, campo) => {
    (acumulado[campo.grupo] ||= []).push(campo);
    return acumulado;
  }, {});

  return (
    <div className="w-full flex flex-col gap-5 animate-fade-in pb-12">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
        <h3 className="font-bold text-[#052a79]">Datos del formato: {formulario.formatoNombre}</h3>
        <p className="mt-1 text-xs text-slate-600">
          Este formulario se generó automáticamente con las variables usadas por la versión {formulario.version}.
        </p>
        {formulario.versionEstado !== 'VIGENTE' && (
          <p className="mt-2 text-xs font-semibold text-amber-700">
            La versión todavía es BORRADOR. Puede completar los datos, pero deberá activarla antes de emitir.
          </p>
        )}
      </div>

      {formulario.campos.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Este formato solo utiliza variables automáticas; no requiere datos manuales en este paso.
        </div>
      ) : Object.entries(grupos).map(([grupo, campos]) => (
        <section key={grupo} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-[#f4f9ff] px-6 py-4">
            <h3 className="text-base font-bold capitalize text-slate-800">{grupo}</h3>
            <p className="mt-1 text-xs text-slate-500">Complete los valores que aparecerán en el certificado.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2 lg:grid-cols-3">
            {campos.map((campo) => {
              const esObservacion = campo.key.includes('observacion');
              return (
                <div key={campo.key} className={`flex flex-col gap-1.5 ${esObservacion ? 'md:col-span-2' : ''}`}>
                  <label htmlFor={`formato-${campo.key}`} className="text-xs font-bold capitalize tracking-wider text-slate-600">
                    {campo.label} {campo.requerido && <span className="text-red-500">*</span>}
                  </label>
                  {esObservacion ? (
                    <textarea
                      id={`formato-${campo.key}`}
                      value={valores[campo.key] ?? ''}
                      onChange={(event) => setValores((actual) => ({ ...actual, [campo.key]: event.target.value }))}
                      rows={3}
                      className="w-full resize-none rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all focus:border-[#052a79] focus:ring-4 focus:ring-blue-50"
                    />
                  ) : (
                    <input
                      id={`formato-${campo.key}`}
                      type={campo.tipo === 'date' ? 'date' : 'text'}
                      value={valores[campo.key] ?? ''}
                      onChange={(event) => setValores((actual) => ({ ...actual, [campo.key]: event.target.value }))}
                      className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all focus:border-[#052a79] focus:ring-4 focus:ring-blue-50"
                    />
                  )}
                  <span className="font-mono text-[10px] text-slate-400">{`{{${campo.key}}}`}</span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <TitularesList
        titulares={titulares}
        setTitulares={setTitulares}
        formFacturacion={formFacturacion}
        setFormFacturacion={setFormFacturacion}
        onRemoveTitular={onRemoveTitular}
      />
    </div>
  );
};
