import React from 'react';
import { User, FileText } from 'lucide-react';

interface FacturacionStepProps {
  formFacturacion: any;
  setFormFacturacion: (data: any) => void;
}

export function FacturacionStep({
  formFacturacion,
  setFormFacturacion
}: FacturacionStepProps) {

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormFacturacion((prev: any) => ({ ...prev, [e.target.name]: e.target.value.toUpperCase() }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="bg-[#052a79]/10 p-2.5 rounded-xl">
          <FileText className="w-6 h-6 text-[#052a79]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Facturación</h3>
          <p className="text-sm text-slate-500">
            Datos del comprobante de pago. Completamente independiente del propietario del vehículo.
          </p>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">TIPO DE COMPROBANTE</label>
            <select name="tipoDocFac" value={formFacturacion.tipoDocFac || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-slate-800 uppercase focus:border-[#f59e0b] focus:ring-0">
              <option value="">-- SELECCIONAR --</option>
              <option value="BOLETA">BOLETA</option>
              <option value="FACTURA">FACTURA</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">DNI / RUC</label>
            <input type="text" name="nroDocFac" value={formFacturacion.nroDocFac || ''} onChange={handleInput} maxLength={11} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-slate-800 uppercase focus:border-[#f59e0b] focus:ring-0" placeholder="Número de documento" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">NOMBRE / RAZÓN SOCIAL</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" name="razonSocialFac" value={formFacturacion.razonSocialFac || ''} onChange={handleInput} className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-800 uppercase focus:border-[#f59e0b] focus:ring-0" placeholder="Nombre completo o razón social" />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1">DIRECCIÓN FISCAL</label>
            <input type="text" name="direccionFac" value={formFacturacion.direccionFac || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-slate-800 uppercase focus:border-[#f59e0b] focus:ring-0" placeholder="Dirección completa" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">CORREO ELECTRÓNICO (Opcional)</label>
            <input type="email" name="emailFac" value={formFacturacion.emailFac || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-slate-800 uppercase focus:border-[#f59e0b] focus:ring-0" placeholder="correo@ejemplo.com" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">TELÉFONO (Opcional)</label>
            <input type="text" name="telefonoFac" value={formFacturacion.telefonoFac || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-slate-800 uppercase focus:border-[#f59e0b] focus:ring-0" placeholder="N° de contacto" />
          </div>

        </div>

        <div className="bg-amber-50 p-4 border border-amber-200 rounded-xl mt-6 flex gap-3">
          <div className="text-amber-500 mt-0.5">⚠️</div>
          <div className="text-sm text-amber-700">
            <strong>Nota Diseño:</strong> En la Fase 2, ingresar el RUC o DNI realizará la búsqueda en Nubefact/SUNAT. Por ahora, es de ingreso manual libre.
          </div>
        </div>
      </div>
    </div>
  );
}
