import React, { useState } from 'react';
import { externosApi, maestrosApi } from '@/services/api';
import { InputField } from './SharedForms';

interface PropietarioStepProps {
  formPropietario: any;
  setFormPropietario: (data: any) => void;
  onValidationChange?: (isValid: boolean) => void;
  onNext?: () => void;
}

export function PropietarioStep({
  formPropietario,
  setFormPropietario,
  onValidationChange,
  onNext
}: PropietarioStepProps) {

  const [maestrosPropietario, setMaestrosPropietario] = useState<any>(null);
  const [provincias, setProvincias] = useState<any[]>([]);
  const [distritos, setDistritos] = useState<any[]>([]);
  const [searchingPropietario, setSearchingPropietario] = useState(false);

  React.useEffect(() => {
    if (!maestrosPropietario) {
      maestrosApi.obtenerMaestrosPropietario().then((res: any) => setMaestrosPropietario(res.data)).catch(console.error);
    }
  }, [maestrosPropietario]);

  React.useEffect(() => {
    if (formPropietario.departamentoProp) {
      maestrosApi.obtenerProvincias(formPropietario.departamentoProp).then((res: any) => setProvincias(res.data)).catch(console.error);
    } else {
      setProvincias([]);
    }
  }, [formPropietario.departamentoProp]);

  React.useEffect(() => {
    if (formPropietario.provinciaProp) {
      maestrosApi.obtenerDistritos(formPropietario.provinciaProp).then((res: any) => setDistritos(res.data)).catch(console.error);
    } else {
      setDistritos([]);
    }
  }, [formPropietario.provinciaProp]);

  const handleSearchPropietario = async () => {
    const nro = formPropietario.nroDocProp;
    const tipo = formPropietario.tipoDocProp;
    if (!nro) return;

    setSearchingPropietario(true);
    try {
      const selectedDoc = maestrosPropietario?.tiposDocumento?.find((x: any) => x.key === tipo);
      const isRuc = selectedDoc?.nombre?.toUpperCase() === 'RUC';

      if (isRuc && nro.length === 11) {
        const res = await externosApi.consultarRuc(nro);
        if (res?.data) {
          setFormPropietario((prev: any) => ({
            ...prev,
            razonSocialProp: res.data.razonSocial || '',
            direccionProp: res.data.direccion || prev.direccionProp
          }));
        }
      } else if (!isRuc && nro.length === 8) {
        const res = await externosApi.consultarDni(nro);
        if (res?.data) {
          setFormPropietario((prev: any) => ({
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

  const checkPropietarioValid = () => {
    const isValid = (val: any) => val !== undefined && val !== null && String(val).trim() !== '';
    const req = ['paisProp', 'departamentoProp', 'provinciaProp', 'distritoProp', 'direccionProp', 'emailProp', 'telefonoProp'];

    if (!formPropietario.sinDni) {
      req.push('tipoDocProp', 'nroDocProp');

      const selectedDoc = maestrosPropietario?.tiposDocumento?.find((x: any) => x.key === formPropietario.tipoDocProp);
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
      if (!isValid((formPropietario as any)[f])) missing.push(f);
    }
    return missing;
  };

  const missingPropietario = checkPropietarioValid();
  const isPropietarioValid = missingPropietario.length === 0;

  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isPropietarioValid);
    }
  }, [isPropietarioValid, onValidationChange]);

  const optsDocs = maestrosPropietario?.tiposDocumento?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
  const optsPaises = maestrosPropietario?.paises?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
  const optsDept = maestrosPropietario?.departamentos?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
  const optsProv = provincias.map((x: any) => ({ value: x.key, label: x.nombre }));
  const optsDist = distritos.map((x: any) => ({ value: x.key, label: x.nombre }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-[#052a79] uppercase">Datos del Propietario / Cliente</h3>
        <label className="flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition">
          <input
            type="checkbox"
            className="w-4 h-4 rounded text-[#052a79] focus:ring-[#052a79] cursor-pointer"
            checked={formPropietario.sinDni || false}
            onChange={(e) => setFormPropietario({ ...formPropietario, sinDni: e.target.checked, tipoDocProp: '', nroDocProp: '' })}
          />
          <span className="text-xs font-bold text-slate-700">SIN DNI</span>
        </label>
      </div>
      <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(() => {
            const selectedDoc = maestrosPropietario?.tiposDocumento?.find((x: any) => x.key === formPropietario.tipoDocProp);
            const isRuc = !formPropietario.sinDni && selectedDoc?.nombre?.toUpperCase() === 'RUC';
            const isDni = selectedDoc?.nombre?.toUpperCase() === 'DNI';
            const maxLen = isDni ? 8 : (isRuc ? 11 : 15);

            return (
              <>
                {!formPropietario.sinDni && (
                  <>
                    <InputField label="Tipo de Documento" name="tipoDocProp" formData={formPropietario} setFormData={setFormPropietario} isSelect options={optsDocs} />
                    <InputField
                      label="NRO. DOCUMENTO DE IDENTIDAD"
                      name="nroDocProp"
                      formData={formPropietario} setFormData={setFormPropietario}
                      type="number"
                      maxLength={maxLen}
                      onSearch={handleSearchPropietario}
                      searching={searchingPropietario}
                    />
                    {isRuc ? (
                      <InputField label="Nombre de la Empresa (Razón Social)" name="razonSocialProp" formData={formPropietario} setFormData={setFormPropietario} />
                    ) : (
                      <>
                        <InputField label="Nombres" name="nombresProp" filter="letras" formData={formPropietario} setFormData={setFormPropietario} />
                        <InputField label="Apellidos" name="apellidosProp" filter="letras" formData={formPropietario} setFormData={setFormPropietario} />
                      </>
                    )}
                  </>
                )}
              </>
            );
          })()}
          <InputField label="País" name="paisProp" formData={formPropietario} setFormData={setFormPropietario} isSelect options={optsPaises} />
          <InputField label="Departamento" name="departamentoProp" formData={formPropietario} setFormData={setFormPropietario} isSelect options={optsDept} />
          <InputField label="Provincia" name="provinciaProp" formData={formPropietario} setFormData={setFormPropietario} isSelect options={optsProv} disabled={!formPropietario.departamentoProp} />
          <InputField label="Distrito" name="distritoProp" formData={formPropietario} setFormData={setFormPropietario} isSelect options={optsDist} disabled={!formPropietario.provinciaProp} />
          <InputField label="Dirección" name="direccionProp" formData={formPropietario} setFormData={setFormPropietario} />
          <InputField label="Email" name="emailProp" type="email" formData={formPropietario} setFormData={setFormPropietario} />
          <InputField label="Teléfono" name="telefonoProp" filter="telefono" maxLength={9} enforceStartWith="9" formData={formPropietario} setFormData={setFormPropietario} />
        </div>
      </div>

      {!isPropietarioValid && (
        <p className="mt-4 text-xs text-red-500 font-semibold text-center">
          Falta completar: {missingPropietario.join(', ')}
        </p>
      )}

      {onNext && (
        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-center">
          <button
            type="button"
            disabled={!isPropietarioValid}
            onClick={onNext}
            className={`px-8 py-3 rounded-xl font-black text-sm transition-all shadow-md
              ${isPropietarioValid
                ? 'bg-[#052a79] text-white hover:bg-blue-800'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }
            `}
          >
            Siguiente Paso
          </button>
        </div>
      )}
    </div>
  );
}
