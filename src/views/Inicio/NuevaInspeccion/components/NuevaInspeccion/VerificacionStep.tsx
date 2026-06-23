/* eslint-disable @typescript-eslint/no-explicit-any */
import Select from 'react-select';
import { FileSignature, Car, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { plantaSession, maestrosApi } from '../../../../../services/api';

interface VerificacionStepProps {
  maestros: any;
  formCaja: any;
  formVehiculo: any;
  formPropietario: any;
  formFacturacion: any;
  formVerificacion: any;
  setFormVerificacion: (data: any) => void;
  precioTotal: number;
  customSelectStyles: any;
}

export function VerificacionStep({
  maestros,
  formCaja,
  formVehiculo,
  formPropietario,
  formFacturacion,
  formVerificacion,
  setFormVerificacion,
  precioTotal,
  customSelectStyles
}: VerificacionStepProps) {

  const [maestrosVerif, setMaestrosVerif] = useState<any>(null);
  const [lineas, setLineas] = useState<any[]>([]);

  useEffect(() => {
    const fetchMaestros = async () => {
      try {
        const res = await maestrosApi.obtenerMaestrosVerificacionAsync();
        setMaestrosVerif(res.data);
      } catch (err) {
        console.error('Error al obtener maestros verificacion', err);
      }
    };

    const fetchLineas = async () => {
      try {
        const planta = plantaSession.obtener();
        if (planta?.key) {
          const res = await maestrosApi.obtenerLineasPorPlantaAsync(planta.key);
          setLineas(res.data || []);
        }
      } catch (err) {
        console.error('Error al obtener lineas', err);
      }
    };

    fetchMaestros();
    fetchLineas();
  }, []);

  const handleSelectChange = (name: string, option: any) => {
    setFormVerificacion({ ...formVerificacion, [name]: option ? option.value : '' });
  };

  const getNameFromList = (list: any[], val: string, keyName = 'key', labelName = 'nombre') => {
    if (!list) return val;
    const found = list.find((item: any) => item[keyName]?.toString() === val?.toString());
    return found ? found[labelName] : val;
  };

  const conceptoNombre = getNameFromList(maestros?.conceptos || [], formCaja?.concepto, 'key', 'abreviatura');
  const marcaNombre = getNameFromList(maestros?.marcas || [], formVehiculo?.marca);
  const carroceriaNombre = getNameFromList(maestros?.carrocerias || [], formVehiculo?.carroceria);
  const combustibleNombre = getNameFromList(maestros?.combustibles || [], formVehiculo?.combustible);

  return (
    <div className="space-y-6">

      <h3 className="text-lg font-bold text-[#052a79] uppercase border-b border-amber-200/60 pb-2">
        Verificación
      </h3>

      {/* BANNER PRINCIPAL SUPERIOR */}
      <div className="bg-white p-4 border-2 border-[#052a79] rounded-xl flex items-center justify-around text-center shadow-sm">
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">Placa</span>
          <span className="block text-xl font-black text-[#052a79] uppercase">{formCaja.placa || '-'}</span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">Modelo</span>
          <span className="block text-xl font-black text-[#052a79] uppercase">{formVehiculo.modelo || '-'}</span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">Marca</span>
          <span className="block text-xl font-black text-[#052a79] uppercase">{marcaNombre || '-'}</span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">Concepto Inspección</span>
          <span className="block text-sm font-black text-[#052a79] uppercase max-w-[200px] leading-tight">{conceptoNombre || '-'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* PANEL IZQUIERDO: Tarjetas de resumen */}
        <div className="md:col-span-8 space-y-4">
          
          {/* Tarjeta Facturación */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex shadow-sm">
            <div className="bg-[#052a79] w-16 flex items-center justify-center shrink-0 border-r-2 border-[#031d5c] shadow-[inset_-2px_0_10px_rgba(0,0,0,0.2)]">
               <FileSignature className="w-10 h-10 drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" style={{ stroke: "url(#gold-gradient)", strokeWidth: 1.8 }} />
            </div>
            <div className="p-4 flex-1 flex justify-between">
               <div className="text-xs text-slate-700 space-y-1">
                 <div><span className="font-bold text-[10px] text-slate-400 uppercase">Documento: </span><span className="font-bold">{formFacturacion.nroDocumento}</span></div>
                 <div><span className="font-bold text-[10px] text-slate-400 uppercase">Nombre/Razón Social: </span><span className="font-bold">{formFacturacion.nombreRazonSocial || (formPropietario.nombres + ' ' + formPropietario.apellidos)}</span></div>
                 <div><span className="font-bold text-[10px] text-slate-400 uppercase">Dirección: </span><span>{formFacturacion.direccion || formPropietario.direccion}</span></div>
                 <div><span className="font-bold text-[10px] text-slate-400 uppercase">Teléfono / Email: </span><span>{formFacturacion.telefono} / {formFacturacion.email}</span></div>
               </div>
               <div className="bg-[#052a79] text-white p-4 rounded-lg text-center flex flex-col justify-center min-w-[120px]">
                 <span className="text-[10px] font-bold uppercase">{formCaja.comprobanteSeleccionado === 'RUC' ? 'FACTURA' : 'BOLETA'}</span>
                 <span className="text-2xl font-black">S/ {precioTotal.toFixed(2)}</span>
                 <span className="text-[10px] font-bold">Contado</span>
               </div>
            </div>
          </div>

          {/* Tarjeta Vehículo */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex shadow-sm">
            <div className="bg-[#052a79] w-16 flex items-center justify-center shrink-0 border-r-2 border-[#031d5c] shadow-[inset_-2px_0_10px_rgba(0,0,0,0.2)]">
               <Car className="w-10 h-10 drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" style={{ stroke: "url(#gold-gradient)", strokeWidth: 1.8 }} />
            </div>
            <div className="p-4 flex-1">
               <div className="text-xs text-slate-700 mb-2">
                 <span className="font-bold text-[10px] text-slate-400 uppercase">Propietario: </span>
                 <span className="font-bold">{formPropietario.nombres} {formPropietario.apellidos}</span>
               </div>
               <div className="grid grid-cols-3 gap-x-2 gap-y-3 text-[10px] text-slate-600">
                  <div><span className="block font-bold text-slate-400 uppercase">Categoría</span><span className="font-bold uppercase text-slate-800">{formCaja.categoria}</span></div>
                  <div><span className="block font-bold text-slate-400 uppercase">Combustible</span><span className="font-bold uppercase text-slate-800">{combustibleNombre}</span></div>
                  <div><span className="block font-bold text-slate-400 uppercase">Asientos / Pasajeros</span><span className="font-bold uppercase text-slate-800">{formVehiculo.asientos} / {formVehiculo.pasajeros}</span></div>
                  
                  <div><span className="block font-bold text-slate-400 uppercase">Marca</span><span className="font-bold uppercase text-slate-800">{marcaNombre}</span></div>
                  <div><span className="block font-bold text-slate-400 uppercase">Nro. Serie</span><span className="font-bold uppercase text-slate-800">{formVehiculo.serie}</span></div>
                  <div><span className="block font-bold text-slate-400 uppercase">Largo/Ancho/Alto</span><span className="font-bold uppercase text-slate-800">{formVehiculo.largo} / {formVehiculo.ancho} / {formVehiculo.alto}</span></div>

                  <div><span className="block font-bold text-slate-400 uppercase">Modelo</span><span className="font-bold uppercase text-slate-800">{formVehiculo.modelo}</span></div>
                  <div><span className="block font-bold text-slate-400 uppercase">Nro. Motor</span><span className="font-bold uppercase text-slate-800">{formVehiculo.motor}</span></div>
                  <div><span className="block font-bold text-slate-400 uppercase">Color</span><span className="font-bold uppercase text-slate-800">{formVehiculo.color}</span></div>

                  <div><span className="block font-bold text-slate-400 uppercase">Año Fab.</span><span className="font-bold uppercase text-slate-800">{formVehiculo.anioFabricacion}</span></div>
                  <div><span className="block font-bold text-slate-400 uppercase">Carrocería</span><span className="font-bold uppercase text-slate-800">{carroceriaNombre}</span></div>
                  <div><span className="block font-bold text-slate-400 uppercase">Peso Neto</span><span className="font-bold uppercase text-slate-800">{formVehiculo.pesoNeto}</span></div>

                  <div><span className="block font-bold text-slate-400 uppercase">Kilometraje</span><span className="font-bold uppercase text-slate-800">{formVehiculo.kilometraje}</span></div>
                  <div><span className="block font-bold text-slate-400 uppercase">Ejes / Ruedas</span><span className="font-bold uppercase text-slate-800">{formVehiculo.ejes} / {formVehiculo.ruedas}</span></div>
                  <div><span className="block font-bold text-slate-400 uppercase">Peso Bruto</span><span className="font-bold uppercase text-slate-800">{formVehiculo.pesoBruto}</span></div>
               </div>
            </div>
          </div>

          {/* Tarjeta SOAT */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex shadow-sm">
            <div className="bg-[#052a79] w-16 flex items-center justify-center shrink-0 border-r-2 border-[#031d5c] shadow-[inset_-2px_0_10px_rgba(0,0,0,0.2)]">
               <ShieldCheck className="w-10 h-10 drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" style={{ stroke: "url(#gold-gradient)", strokeWidth: 1.8 }} />
            </div>
            <div className="p-4 flex-1">
               <div className="text-xs text-slate-700 space-y-1">
                 <div><span className="font-bold text-[10px] text-slate-400 uppercase">SOAT: </span><span className="font-bold">{formVehiculo.aseguradora} - {formVehiculo.nroPoliza}</span></div>
                 <div><span className="font-bold text-[10px] text-slate-400 uppercase">Vigencia: </span><span className="font-bold">{formVehiculo.fechaInicioPoliza} - {formVehiculo.fechaFinPoliza}</span></div>
               </div>
            </div>
          </div>

        </div>

        {/* PANEL DERECHO: Formulario de Verificación */}
        <div className="md:col-span-4 bg-[#f4f9ff] border-2 border-[#052a79]/20 rounded-xl p-5 shadow-inner">
          <h4 className="text-sm font-black text-[#052a79] uppercase mb-4 text-center">Datos de Operación</h4>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Tipo Inspección *</label>
              <Select
                options={maestrosVerif?.tiposInspeccion?.map((t: any) => ({ value: t.key, label: t.nombre })) || []}
                value={maestrosVerif?.tiposInspeccion?.map((t: any) => ({ value: t.key, label: t.nombre })).find((o: any) => o.value?.toString() === formVerificacion.tipoInspeccion?.toString()) || null}
                onChange={(o) => handleSelectChange('tipoInspeccion', o)}
                placeholder="Seleccione..."
                styles={customSelectStyles}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Tipo Certificado *</label>
              <Select
                options={maestrosVerif?.tiposCertificado?.map((t: any) => ({ value: t.key, label: t.nombre })) || []}
                value={maestrosVerif?.tiposCertificado?.map((t: any) => ({ value: t.key, label: t.nombre })).find((o: any) => o.value?.toString() === formVerificacion.tipoCertificado?.toString()) || null}
                onChange={(o) => handleSelectChange('tipoCertificado', o)}
                placeholder="Seleccione..."
                styles={customSelectStyles}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Tipo Ámbito *</label>
              <Select
                options={maestrosVerif?.tiposAutorizacion?.map((t: any) => ({ value: t.key, label: t.nombre })) || []}
                value={maestrosVerif?.tiposAutorizacion?.map((t: any) => ({ value: t.key, label: t.nombre })).find((o: any) => o.value?.toString() === formVerificacion.tipoAmbito?.toString()) || null}
                onChange={(o) => handleSelectChange('tipoAmbito', o)}
                placeholder="Seleccione..."
                styles={customSelectStyles}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Tipo Autorización *</label>
              <Select
                options={maestros?.tiposAutorizacion?.map((ta: any) => ({ value: ta.key, label: ta.nombre })) || []}
                value={maestros?.tiposAutorizacion?.map((ta: any) => ({ value: ta.key, label: ta.nombre })).find((o: any) => o.value?.toString() === formVerificacion.tipoAutorizacion?.toString()) || null}
                onChange={(o) => handleSelectChange('tipoAutorizacion', o)}
                placeholder="Seleccione..."
                styles={customSelectStyles}
              />
            </div>

            <div className="my-4 border-t-2 border-dashed border-slate-300"></div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-amber-600 uppercase">Línea de Inspección *</label>
              <Select
                options={lineas?.map((l: any) => ({ value: l.key, label: l.nombre })) || []}
                value={lineas?.map((l: any) => ({ value: l.key, label: l.nombre })).find((o: any) => o.value?.toString() === formVerificacion.linea?.toString()) || null}
                onChange={(o) => handleSelectChange('linea', o)}
                placeholder="Seleccione la línea..."
                styles={{
                  ...customSelectStyles,
                  control: (base: any) => ({
                    ...base,
                    borderColor: '#f59e0b',
                    boxShadow: '0 0 0 1px #f59e0b',
                    backgroundColor: '#fffbeb'
                  })
                }}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
