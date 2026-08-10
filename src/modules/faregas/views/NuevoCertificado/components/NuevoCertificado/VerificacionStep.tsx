import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { TipoCertificadoFaregas } from '@/types/faregas';

interface VerificacionStepProps {
  tipoCertificado: TipoCertificadoFaregas;
  formCaja: any;
  formVehiculo: any;
  formPropietario: any;
  formGlp: any;
  formGnv: any;
  formConformidad: any;
  pagosAgregados: any[];
  formFacturacion: any;
}

export function VerificacionStep({
  tipoCertificado,
  formCaja,
  formVehiculo,
  formPropietario,
  formGlp,
  formGnv,
  formConformidad,
  pagosAgregados,
  formFacturacion
}: VerificacionStepProps) {

  const totalPagado = pagosAgregados.reduce((sum, p) => sum + parseFloat(p.importe), 0);

  const handleEmitir = () => {
    alert("Diseño FASE 1 - Emisión aún no implementada.\n\nEn la siguiente fase este botón guardará en base de datos y generará el PDF correspondiente.");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2.5 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Verificación y Emisión</h3>
            <p className="text-sm text-slate-500">
              Revise que todos los datos sean correctos antes de emitir.
            </p>
          </div>
        </div>
        <button 
          onClick={handleEmitir}
          className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-lg flex items-center gap-2 uppercase tracking-wide"
        >
          <CheckCircle2 className="w-5 h-5" /> Emitir Certificado
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* RESUMEN GENERAL Y VEHÍCULO */}
        <div className="space-y-6">
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 pb-2 border-b">1. Resumen General</h4>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div className="text-slate-500 font-semibold">Tipo:</div>
              <div className="font-bold text-slate-800 uppercase">{tipoCertificado}</div>
              <div className="text-slate-500 font-semibold">Placa:</div>
              <div className="font-bold text-[#052a79] text-lg uppercase">{formCaja.placa}</div>
              <div className="text-slate-500 font-semibold">Categoría:</div>
              <div className="font-bold text-slate-800 uppercase">{formCaja.categoria}</div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 pb-2 border-b">2. Datos Básicos del Vehículo</h4>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div className="text-slate-500 font-semibold">Marca:</div>
              <div className="font-bold text-slate-800 uppercase">{formVehiculo.marca || '-'}</div>
              <div className="text-slate-500 font-semibold">Modelo:</div>
              <div className="font-bold text-slate-800 uppercase">{formVehiculo.modelo || '-'}</div>
              <div className="text-slate-500 font-semibold">VIN:</div>
              <div className="font-bold text-slate-800 uppercase">{formVehiculo.nroSerie || '-'}</div>
              <div className="text-slate-500 font-semibold">N° Motor:</div>
              <div className="font-bold text-slate-800 uppercase">{formVehiculo.nroMotor || '-'}</div>
              <div className="text-slate-500 font-semibold">Combustible:</div>
              <div className="font-bold text-slate-800 uppercase">{formVehiculo.combustible || '-'}</div>
            </div>
          </div>

          {/* DATOS ESPECÍFICOS SEGÚN TIPO */}
          <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-[#052a79] uppercase tracking-wider mb-4 pb-2 border-b border-blue-200">
              3. Especificaciones {tipoCertificado}
            </h4>
            
            {tipoCertificado === 'GLP' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-slate-500 font-semibold">Propietario:</div>
                  <div className="font-bold text-slate-800 uppercase">{formPropietario.nombre || '-'}</div>
                  <div className="text-slate-500 font-semibold">Vigencia Hasta:</div>
                  <div className="font-bold text-slate-800 uppercase">{formGlp.fechaVigencia || '-'}</div>
                </div>
                <div className="text-xs bg-white p-3 rounded border border-blue-100">
                  <div className="font-bold text-slate-700 mb-1">Componentes:</div>
                  <div className="text-slate-600">CILINDRO: {formGlp.cilindroMarca || '-'} | SERIE: {formGlp.cilindroSerie || '-'}</div>
                  <div className="text-slate-600">REGULADOR: {formGlp.reguladorMarca || '-'} | SERIE: {formGlp.reguladorSerie || '-'}</div>
                </div>
              </div>
            )}

            {tipoCertificado === 'GNV' && (
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="text-slate-500 font-semibold">Vigencia Hasta:</div>
                <div className="font-bold text-slate-800 uppercase">{formGnv.fechaVigencia || '-'}</div>
                <div className="text-slate-500 font-semibold">Observaciones:</div>
                <div className="font-bold text-slate-800 uppercase">{formGnv.observaciones || 'NINGUNA'}</div>
              </div>
            )}

            {tipoCertificado === 'CONFORMIDAD' && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-y-3">
                  <div className="text-slate-500 font-semibold">Razón Social:</div>
                  <div className="font-bold text-slate-800 uppercase">{formConformidad.razonSocial || '-'}</div>
                  <div className="text-slate-500 font-semibold">Tipo:</div>
                  <div className="font-bold text-slate-800 uppercase">{formConformidad.tipoConformidad || '-'}</div>
                </div>
                <div className="text-xs bg-white p-3 rounded border border-blue-100">
                  <div className="font-bold text-slate-700 mb-1">Motivo:</div>
                  <div className="text-slate-600 uppercase">{formConformidad.motivo || '-'}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FACTURACIÓN Y PAGOS */}
        <div className="space-y-6">
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 pb-2 border-b">4. Facturación</h4>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div className="text-slate-500 font-semibold">Comprobante:</div>
              <div className="font-bold text-slate-800 uppercase">{formFacturacion.tipoDocFac || '-'}</div>
              <div className="text-slate-500 font-semibold">DNI/RUC:</div>
              <div className="font-bold text-slate-800 uppercase">{formFacturacion.nroDocFac || '-'}</div>
              <div className="text-slate-500 font-semibold">Cliente:</div>
              <div className="font-bold text-slate-800 uppercase col-span-2">{formFacturacion.razonSocialFac || '-'}</div>
              <div className="text-slate-500 font-semibold">Dirección:</div>
              <div className="font-bold text-slate-800 uppercase col-span-2">{formFacturacion.direccionFac || '-'}</div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 pb-2 border-b">5. Pago Registrado</h4>
            {pagosAgregados.length === 0 ? (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-bold">Aviso: No hay pagos registrados.</span>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="space-y-2">
                  {pagosAgregados.map((p, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                      <span className="font-semibold text-slate-600">{p.tipo} {p.tarjetaKey}</span>
                      <span className="font-bold text-slate-800">S/ {parseFloat(p.importe).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-bold text-slate-700 uppercase">Total Pagado:</span>
                  <span className="font-black text-[#052a79] text-lg">S/ {totalPagado.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
