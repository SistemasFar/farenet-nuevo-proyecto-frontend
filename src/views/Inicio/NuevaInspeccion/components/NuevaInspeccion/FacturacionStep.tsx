import React, { useState } from 'react';
import { InputField, FormVehiculoContext } from './VehiculoStep';
import { maestrosApi, externosApi } from '../../../../../services/api';

interface FacturacionStepProps {
  formFacturacion: any;
  setFormFacturacion: (data: any) => void;
  formVehiculo: any; // Para poder copiar los datos del propietario
  documentoPago: string; // Para saber si es Boleta ('4') o Factura ('5')
  onValidationChange?: (isValid: boolean) => void;
}

export function FacturacionStep({
  formFacturacion,
  setFormFacturacion,
  formVehiculo,
  documentoPago,
  onValidationChange
}: FacturacionStepProps) {

  const [maestrosFacturacion, setMaestrosFacturacion] = useState<any>(null);
  const [provincias, setProvincias] = useState<any[]>([]);
  const [distritos, setDistritos] = useState<any[]>([]);
  
  const [searchingFacturacion, setSearchingFacturacion] = useState(false);

  React.useEffect(() => {
    if (!maestrosFacturacion) {
      maestrosApi.obtenerMaestrosPropietario().then((res: any) => setMaestrosFacturacion(res.data)).catch(console.error);
    }
  }, [maestrosFacturacion]);

  React.useEffect(() => {
    if (formFacturacion.departamentoFac) {
      maestrosApi.obtenerProvincias(formFacturacion.departamentoFac).then((res: any) => setProvincias(res.data)).catch(console.error);
    } else {
      setProvincias([]);
    }
  }, [formFacturacion.departamentoFac]);

  React.useEffect(() => {
    if (formFacturacion.provinciaFac) {
      maestrosApi.obtenerDistritos(formFacturacion.provinciaFac).then((res: any) => setDistritos(res.data)).catch(console.error);
    } else {
      setDistritos([]);
    }
  }, [formFacturacion.provinciaFac]);

  // Lógica de Boleta vs Factura
  React.useEffect(() => {
    if (documentoPago === '5') { // 5 = FACTURA
      if (formFacturacion.tipoDocFac !== 'ruc') {
        setFormFacturacion((prev: any) => ({ ...prev, tipoDocFac: 'ruc' }));
      }
    } else if (documentoPago === '4') { // 4 = BOLETA
      if (formFacturacion.tipoDocFac === 'ruc') {
        setFormFacturacion((prev: any) => ({ ...prev, tipoDocFac: '' })); // No puede ser RUC en boleta
      }
    }
  }, [documentoPago, formFacturacion.tipoDocFac, setFormFacturacion]);

  const checkValid = () => {
    const isValid = (val: any) => val !== undefined && val !== null && String(val).trim() !== '';
    const req = ['tipoDocFac', 'nroDocFac', 'paisFac', 'departamentoFac', 'provinciaFac', 'distritoFac', 'direccionFac', 'emailFac', 'telefonoFac'];
    
    const selectedDoc = maestrosFacturacion?.tiposDocumento?.find((x: any) => x.key === formFacturacion.tipoDocFac);
    const isRuc = selectedDoc?.nombre?.toUpperCase() === 'RUC';
    
    if (isRuc) {
      req.push('razonSocialFac');
    } else {
      req.push('nombresFac', 'apellidosFac');
    }
    
    let missing: string[] = [];
    for (const f of req) {
      if (!isValid((formFacturacion as any)[f])) missing.push(f);
    }
    return missing;
  };

  const missingFacturacion = checkValid();
  const isFacturacionValid = missingFacturacion.length === 0;

  React.useEffect(() => {
    if (onValidationChange) {
      onValidationChange(isFacturacionValid);
    }
  }, [isFacturacionValid, onValidationChange]);

  const handleSearchFacturacion = async () => {
    const nro = formFacturacion.nroDocFac;
    const tipo = formFacturacion.tipoDocFac;
    if (!nro) return;

    setSearchingFacturacion(true);
    try {
      const selectedDoc = maestrosFacturacion?.tiposDocumento?.find((x: any) => x.key === tipo);
      const isRuc = selectedDoc?.nombre?.toUpperCase() === 'RUC';
      
      if (isRuc && nro.length === 11) {
        const res = await externosApi.consultarRuc(nro);
        if (res?.data) {
          setFormFacturacion((prev: any) => ({
            ...prev,
            razonSocialFac: res.data.razonSocial || '',
            direccionFac: res.data.direccion || prev.direccionFac
          }));
        }
      } else if (!isRuc && nro.length === 8) {
        const res = await externosApi.consultarDni(nro);
        if (res?.data) {
          setFormFacturacion((prev: any) => ({
            ...prev,
            nombresFac: res.data.nombres || '',
            apellidosFac: res.data.apellidos || ''
          }));
        }
      }
    } catch (e) {
      console.error('Error autocompletando facturación', e);
    } finally {
      setSearchingFacturacion(false);
    }
  };

  const handleCopiarPropietario = () => {
    setFormFacturacion({
      ...formFacturacion,
      tipoDocFac: formVehiculo.tipoDocProp || '',
      nroDocFac: formVehiculo.nroDocProp || '',
      razonSocialFac: formVehiculo.razonSocialProp || '',
      nombresFac: formVehiculo.nombresProp || '',
      apellidosFac: formVehiculo.apellidosProp || '',
      paisFac: formVehiculo.paisProp || '',
      departamentoFac: formVehiculo.departamentoProp || '',
      provinciaFac: formVehiculo.provinciaProp || '',
      distritoFac: formVehiculo.distritoProp || '',
      direccionFac: formVehiculo.direccionProp || '',
      emailFac: formVehiculo.emailProp || '',
      telefonoFac: formVehiculo.telefonoProp || ''
    });
  };

  let optsDocs = maestrosFacturacion?.tiposDocumento?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
  
  // Filtrar según Boleta / Factura
  if (documentoPago === '5') {
    optsDocs = optsDocs.filter((x: any) => x.value === 'ruc');
  } else if (documentoPago === '4') {
    optsDocs = optsDocs.filter((x: any) => x.value !== 'ruc');
  }

  const optsPaises = maestrosFacturacion?.paises?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
  const optsDept = maestrosFacturacion?.departamentos?.map((x: any) => ({ value: x.key, label: x.nombre })) || [];
  const optsProv = provincias.map((x: any) => ({ value: x.key, label: x.nombre }));
  const optsDist = distritos.map((x: any) => ({ value: x.key, label: x.nombre }));

  // Reutilizamos el contexto temporalmente para el InputField que espera leer de "formVehiculo"
  // Para evitar rediseñar InputField ahora, pasaremos formVehiculo = formFacturacion y setFormVehiculo = setFormFacturacion
  return (
    <FormVehiculoContext.Provider value={{formVehiculo: formFacturacion, setFormVehiculo: setFormFacturacion}}>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-4xl mx-auto">
        
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-[#052a79] uppercase">Datos del Recibo</h3>
            <p className="text-xs font-semibold text-slate-500 mt-1">Complete los datos para la facturación</p>
          </div>
          <button 
            type="button" 
            onClick={handleCopiarPropietario}
            className="text-xs font-bold bg-slate-100 hover:bg-amber-100 hover:text-amber-700 text-[#052a79] px-4 py-2 rounded-lg border border-slate-200 transition shadow-sm"
          >
            📄 Copiar datos del Propietario
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InputField 
              label="TIPO DOCUMENTO DE IDENTIDAD" 
              name="tipoDocFac" 
              isSelect 
              options={optsDocs} 
              disabled={documentoPago === '5'} // Si es Factura, forzamos RUC y lo bloqueamos
            />
            <InputField 
              label="NRO. DOCUMENTO DE IDENTIDAD" 
              name="nroDocFac" 
              onSearch={handleSearchFacturacion}
              searching={searchingFacturacion}
            />
            
            {(() => {
              const selectedDoc = maestrosFacturacion?.tiposDocumento?.find((x: any) => x.key === formFacturacion.tipoDocFac);
              const isRuc = selectedDoc?.nombre?.toUpperCase() === 'RUC';
              
              if (isRuc) {
                return <InputField label="NOMBRE DE LA EMPRESA (RAZÓN SOCIAL)" name="razonSocialFac" />;
              }
              
              return (
                <>
                  <InputField label="NOMBRES" name="nombresFac" filter="letras" />
                  <InputField label="APELLIDOS" name="apellidosFac" filter="letras" />
                </>
              );
            })()}
            
            <InputField label="PAÍS" name="paisFac" isSelect options={optsPaises} />
            <InputField label="DEPARTAMENTO" name="departamentoFac" isSelect options={optsDept} />
            <InputField label="PROVINCIA" name="provinciaFac" isSelect options={optsProv} disabled={!formFacturacion.departamentoFac} />
            <InputField label="DISTRITO" name="distritoFac" isSelect options={optsDist} disabled={!formFacturacion.provinciaFac} />
            
            <div className="lg:col-span-2">
              <InputField label="DIRECCIÓN" name="direccionFac" />
            </div>
            
            <InputField label="EMAIL" name="emailFac" type="email" />
            <InputField label="TELÉFONO" name="telefonoFac" filter="telefono" maxLength={9} enforceStartWith="9" />
          </div>
        </div>

        {!isFacturacionValid && (
          <p className="mt-4 text-xs text-red-500 font-semibold text-center bg-red-50 py-2 rounded-lg border border-red-100">
            Falta completar campos obligatorios: {missingFacturacion.join(', ')}
          </p>
        )}
      </div>
    </FormVehiculoContext.Provider>
  );
}
