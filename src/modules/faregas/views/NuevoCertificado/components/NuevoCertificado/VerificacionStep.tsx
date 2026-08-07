import { Car, UserCheck } from 'lucide-react';
import type { TipoCertificadoFaregas } from '@/types/faregas';

interface VerificacionStepProps {
  tipoCertificadoFaregas: TipoCertificadoFaregas;
  formVehiculo: any;
  formPropietario: any;
  onNext?: () => void;
}

export function VerificacionStep({
  tipoCertificadoFaregas,
  formVehiculo,
  formPropietario,
  onNext
}: VerificacionStepProps) {

  const marcaNombre = formVehiculo?.marca_label || formVehiculo?.marca || '-';
  const modeloNombre = formVehiculo?.modelo_label || formVehiculo?.modelo || '-';
  const propietarioNombre = formPropietario?.sinDni 
    ? (formPropietario?.nombresProp + ' ' + (formPropietario?.apellidosProp || '')) 
    : (formPropietario?.razonSocialProp || (formPropietario?.nombresProp + ' ' + (formPropietario?.apellidosProp || '')));

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-[#052a79] uppercase border-b border-amber-200/60 pb-2">
        Resumen de Verificación ({tipoCertificadoFaregas})
      </h3>

      {/* BANNER PRINCIPAL SUPERIOR */}
      <div className="bg-white p-4 border-2 border-[#052a79] rounded-xl flex items-center justify-around text-center shadow-sm">
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">Placa</span>
          <span className="block text-xl font-black text-[#052a79] uppercase">{formVehiculo.placaNueva || '-'}</span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">Modelo</span>
          <span className="block text-xl font-black text-[#052a79] uppercase">{modeloNombre}</span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">Marca</span>
          <span className="block text-xl font-black text-[#052a79] uppercase">{marcaNombre}</span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase">Certificado</span>
          <span className="block text-sm font-black text-[#052a79] uppercase">{tipoCertificadoFaregas}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tarjeta Propietario */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex shadow-sm h-full">
          <div className="bg-[#052a79] w-16 flex items-center justify-center shrink-0 border-r-2 border-[#031d5c] shadow-[inset_-2px_0_10px_rgba(0,0,0,0.2)]">
             <UserCheck className="w-10 h-10 drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" style={{ stroke: "url(#gold-gradient)", strokeWidth: 1.8 }} />
          </div>
          <div className="p-4 flex-1">
             <div className="text-xs text-slate-700 space-y-1">
               <div><span className="font-bold text-[10px] text-slate-400 uppercase">Propietario / Cliente: </span><span className="font-bold uppercase">{propietarioNombre}</span></div>
               <div><span className="font-bold text-[10px] text-slate-400 uppercase">Documento: </span><span>{formPropietario?.nroDocProp || '-'}</span></div>
               <div><span className="font-bold text-[10px] text-slate-400 uppercase">Dirección: </span><span>{formPropietario?.direccionProp || '-'}</span></div>
               <div><span className="font-bold text-[10px] text-slate-400 uppercase">Contacto: </span><span>{formPropietario?.telefonoProp} / {formPropietario?.emailProp}</span></div>
             </div>
          </div>
        </div>

        {/* Tarjeta Vehículo */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex shadow-sm h-full">
          <div className="bg-[#052a79] w-16 flex items-center justify-center shrink-0 border-r-2 border-[#031d5c] shadow-[inset_-2px_0_10px_rgba(0,0,0,0.2)]">
             <Car className="w-10 h-10 drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" style={{ stroke: "url(#gold-gradient)", strokeWidth: 1.8 }} />
          </div>
          <div className="p-4 flex-1">
             <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-[10px] text-slate-600">
                <div><span className="block font-bold text-slate-400 uppercase">Nro. Serie</span><span className="font-bold uppercase text-slate-800">{formVehiculo.nroSerie || '-'}</span></div>
                <div><span className="block font-bold text-slate-400 uppercase">Nro. Motor</span><span className="font-bold uppercase text-slate-800">{formVehiculo.nroMotor || '-'}</span></div>
                <div><span className="block font-bold text-slate-400 uppercase">Año Fab.</span><span className="font-bold uppercase text-slate-800">{formVehiculo.anioFabricacion || '-'}</span></div>
                <div><span className="block font-bold text-slate-400 uppercase">Color</span><span className="font-bold uppercase text-slate-800">{formVehiculo.color_label || formVehiculo.color || '-'}</span></div>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <p className="text-xs text-amber-800 font-semibold">Revise cuidadosamente los datos antes de pasar a Caja para la facturación.</p>
        <p className="text-[10px] text-amber-600 mt-1">TODO BACKEND FAREGAS: Aquí se llamará al endpoint para pre-guardar el borrador del certificado.</p>
      </div>

      {onNext && (
        <div className="flex justify-center pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onNext}
            className="px-8 py-3 rounded-xl font-black text-sm transition-all shadow-md bg-[#052a79] text-white hover:bg-blue-800"
          >
            Continuar a CAJA
          </button>
        </div>
      )}
    </div>
  );
}
