import React from 'react';
import type { TipoCertificadoFaregas } from '@/types/faregas';

interface VehiculoStepProps {
  tipoCertificado: TipoCertificadoFaregas;
  formVehiculo: any;
  setFormVehiculo: (data: any) => void;
  formPropietario: any;
  setFormPropietario: (data: any) => void;
  formGlp: any;
  setFormGlp: (data: any) => void;
  formGnv: any;
  setFormGnv: (data: any) => void;
  formConformidad: any;
  setFormConformidad: (data: any) => void;
}

export function VehiculoStep({
  tipoCertificado,
  formVehiculo,
  setFormVehiculo,
  formPropietario,
  setFormPropietario,
  formGlp,
  setFormGlp,
  formGnv,
  setFormGnv,
  formConformidad,
  setFormConformidad
}: VehiculoStepProps) {
  const handleVehiculo = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormVehiculo((prev: any) => ({ ...prev, [e.target.name]: e.target.value.toUpperCase() }));
  };

  const handlePropietario = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormPropietario((prev: any) => ({ ...prev, [e.target.name]: e.target.value.toUpperCase() }));
  };

  const handleGlp = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormGlp((prev: any) => ({ ...prev, [e.target.name]: e.target.value.toUpperCase() }));
  };

  const handleGnv = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormGnv((prev: any) => ({ ...prev, [e.target.name]: e.target.value.toUpperCase() }));
  };

  const handleConformidad = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormConformidad((prev: any) => ({ ...prev, [e.target.name]: e.target.value.toUpperCase() }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. SECCIÓN GENERAL DEL VEHÍCULO */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="text-lg font-bold text-slate-800 uppercase tracking-wider mb-6 border-b pb-2">
          A. DATOS GENERALES DEL VEHÍCULO
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">MARCA</label>
            <input name="marca" value={formVehiculo.marca || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">MODELO</label>
            <input name="modelo" value={formVehiculo.modelo || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">VERSIÓN</label>
            <input name="version" value={formVehiculo.version || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">AÑO FABRICACIÓN</label>
            <input name="anioFabricacion" value={formVehiculo.anioFabricacion || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">VIN / CHASIS</label>
            <input name="nroSerie" value={formVehiculo.nroSerie || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">N° MOTOR</label>
            <input name="nroMotor" value={formVehiculo.nroMotor || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">COMBUSTIBLE</label>
            <input name="combustible" value={formVehiculo.combustible || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">COLOR</label>
            <input name="color" value={formVehiculo.color || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">CILINDROS / CILINDRADA</label>
            <input name="nroCilindros" value={formVehiculo.nroCilindros || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">EJES / RUEDAS</label>
            <input name="nroEjes" value={formVehiculo.nroEjes || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ASIENTOS / PASAJEROS</label>
            <input name="nroAsientos" value={formVehiculo.nroAsientos || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">PESO NETO / BRUTO</label>
            <input name="pesoNeto" value={formVehiculo.pesoNeto || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
        </div>
      </div>

      {/* 2. SECCIÓN DINÁMICA SEGÚN CERTIFICADO */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="text-lg font-bold text-[#052a79] uppercase tracking-wider mb-6 border-b pb-2">
          B. INFORMACIÓN ESPECÍFICA: {tipoCertificado || 'NO SELECCIONADO'}
        </h4>

        {/* --- DATOS GLP --- */}
        {tipoCertificado === 'GLP' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">PROPIETARIO DEL VEHÍCULO</label>
                <input name="nombre" value={formPropietario.nombre || ''} onChange={handlePropietario} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Nombre completo" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">DIRECCIÓN PROPIETARIO</label>
                <input name="direccion" value={formPropietario.direccion || ''} onChange={handlePropietario} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Dirección" />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h5 className="font-bold text-slate-700 mb-3">COMPONENTES INSTALADOS GLP</h5>
              <div className="grid grid-cols-5 gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <div>Componente</div>
                <div>Marca</div>
                <div>Modelo/Cap.</div>
                <div>Año</div>
                <div>N° Serie</div>
              </div>
              {/* Cilindro */}
              <div className="grid grid-cols-5 gap-2 mb-2">
                <div className="font-bold pt-2">CILINDRO</div>
                <input name="cilindroMarca" value={formGlp.cilindroMarca || ''} onChange={handleGlp} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
                <input name="cilindroModelo" value={formGlp.cilindroModelo || ''} onChange={handleGlp} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
                <input name="cilindroAnio" value={formGlp.cilindroAnio || ''} onChange={handleGlp} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
                <input name="cilindroSerie" value={formGlp.cilindroSerie || ''} onChange={handleGlp} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
              </div>
              {/* Regulador */}
              <div className="grid grid-cols-5 gap-2">
                <div className="font-bold pt-2">REGULADOR</div>
                <input name="reguladorMarca" value={formGlp.reguladorMarca || ''} onChange={handleGlp} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
                <input name="reguladorModelo" value={formGlp.reguladorModelo || ''} onChange={handleGlp} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
                <div className="text-center text-slate-400 pt-2">-</div>
                <input name="reguladorSerie" value={formGlp.reguladorSerie || ''} onChange={handleGlp} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-700 mb-3">VERIFICACIONES DE SEGURIDAD GLP</h5>
              <div className="space-y-2">
                {['Instalación segura', 'Ventilación adecuada', 'Ausencia de fugas', 'Cierre hermético'].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">FECHA EMISIÓN</label>
                <input type="date" name="fechaEmision" value={formGlp.fechaEmision || ''} onChange={handleGlp} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">VIGENCIA HASTA</label>
                <input type="date" name="fechaVigencia" value={formGlp.fechaVigencia || ''} onChange={handleGlp} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">OBSERVACIONES</label>
              <input name="observaciones" value={formGlp.observaciones || ''} onChange={handleGlp} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
            </div>
          </div>
        )}

        {/* --- DATOS GNV --- */}
        {tipoCertificado === 'GNV' && (
          <div className="space-y-6">
            <div>
              <h5 className="font-bold text-slate-700 mb-3">VERIFICACIONES DE INSPECCIÓN ANUAL GNV</h5>
              <div className="grid grid-cols-2 gap-2">
                {['Equipo completo registrado', 'Ausencia de fugas', 'Cilindro sin deterioro', 'Sistema conforme a PEC', 'Tuberías alta/baja presión', 'Controles del tablero'].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">FECHA EMISIÓN</label>
                <input type="date" name="fechaEmision" value={formGnv.fechaEmision || ''} onChange={handleGnv} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">VIGENCIA HASTA</label>
                <input type="date" name="fechaVigencia" value={formGnv.fechaVigencia || ''} onChange={handleGnv} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">OBSERVACIONES</label>
              <input name="observaciones" value={formGnv.observaciones || ''} onChange={handleGnv} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
            </div>
          </div>
        )}

        {/* --- DATOS CONFORMIDAD --- */}
        {tipoCertificado === 'CONFORMIDAD' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">TIPO DE CONFORMIDAD</label>
                <select name="tipoConformidad" value={formConformidad.tipoConformidad || ''} onChange={handleConformidad} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors">
                  <option value="">-- SELECCIONAR --</option>
                  <option value="MODIFICACION">MODIFICACIÓN</option>
                  <option value="MONTAJE">MONTAJE</option>
                  <option value="FABRICACION">FABRICACIÓN</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">RAZÓN SOCIAL / PERSONA NATURAL</label>
                <input name="razonSocial" value={formConformidad.razonSocial || ''} onChange={handleConformidad} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">DIRECCIÓN</label>
                <input name="direccion" value={formConformidad.direccion || ''} onChange={handleConformidad} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h5 className="font-bold text-slate-700 mb-3">CARACTERÍSTICAS REGISTRABLES Y MOTIVO</h5>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">MOTIVO / CARACTERÍSTICA A CERTIFICAR</label>
                  <input name="motivo" value={formConformidad.motivo || ''} onChange={handleConformidad} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="EJ: RECTIFICACIÓN DE NÚMERO DE EJES" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">DESCRIPCIÓN / OBSERVACIONES COMPLEMENTARIAS</label>
                  <input name="observaciones" value={formConformidad.observaciones || ''} onChange={handleConformidad} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
