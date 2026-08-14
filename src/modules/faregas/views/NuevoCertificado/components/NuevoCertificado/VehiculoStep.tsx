/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { TipoCertificadoFaregas } from '@/types/faregas';
import { TitularesList, type TitularState } from './TitularesList';
import React, { useEffect } from 'react';

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
  titulares: TitularState[];
  setTitulares: React.Dispatch<React.SetStateAction<TitularState[]>>;
  catalogoVerificaciones?: any;
  talleres?: any[];
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
  setFormConformidad,
  titulares,
  setTitulares,
  catalogoVerificaciones,
  talleres
}: VehiculoStepProps) {
  
  // Initialize verificaciones based on catalog
  useEffect(() => {
    if (tipoCertificado === 'GNV_ANUAL' && catalogoVerificaciones?.GNV_ANUAL && (!formGnv.verificaciones || formGnv.verificaciones.length === 0)) {
      setFormGnv((prev: any) => ({
        ...prev,
        verificaciones: catalogoVerificaciones.GNV_ANUAL.map((v: any) => ({
          codigo: v.codigo,
          orden: v.orden,
          descripcion: v.descripcion,
          cumple: null,
          observacion: ''
        }))
      }));
    }
    if (tipoCertificado === 'GLP_ANUAL' && catalogoVerificaciones?.GLP_ANUAL && (!formGlp.verificaciones || formGlp.verificaciones.length === 0)) {
      setFormGlp((prev: any) => ({
        ...prev,
        verificaciones: catalogoVerificaciones.GLP_ANUAL.map((v: any) => ({
          codigo: v.codigo,
          orden: v.orden,
          descripcion: v.descripcion,
          cumple: null,
          observacion: ''
        })),
        componentes: [
          { componente: 'CILINDRO', marca: '', modelo: '', capacidad: '', anioFabricacion: '', numeroSerie: '' },
          { componente: 'REGULADOR', marca: '', modelo: '', capacidad: '', anioFabricacion: '', numeroSerie: '' }
        ]
      }));
    }
  }, [tipoCertificado, catalogoVerificaciones]);

  const handleVehiculo = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormVehiculo((prev: any) => ({ ...prev, [e.target.name]: e.target.value.toUpperCase() }));
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

  const handleVerificacionGnv = (idx: number, campo: string, valor: any) => {
    const nv = [...(formGnv.verificaciones || [])];
    nv[idx] = { ...nv[idx], [campo]: valor };
    setFormGnv((prev: any) => ({ ...prev, verificaciones: nv }));
  };

  const handleVerificacionGlp = (idx: number, campo: string, valor: any) => {
    const nv = [...(formGlp.verificaciones || [])];
    nv[idx] = { ...nv[idx], [campo]: valor };
    setFormGlp((prev: any) => ({ ...prev, verificaciones: nv }));
  };

  const handleComponenteGlp = (idx: number, campo: string, valor: any) => {
    const nc = [...(formGlp.componentes || [])];
    nc[idx] = { ...nc[idx], [campo]: valor.toUpperCase() };
    setFormGlp((prev: any) => ({ ...prev, componentes: nc }));
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
            <label className="block text-xs font-bold text-slate-500 mb-1">AÑO MODELO</label>
            <input name="anioModelo" value={formVehiculo.anioModelo || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">VIN</label>
            <input name="vin" value={formVehiculo.vin || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">SERIE CHASIS</label>
            <input name="serieChasis" value={formVehiculo.serieChasis || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">N° MOTOR</label>
            <input name="numeroMotor" value={formVehiculo.numeroMotor || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
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
            <label className="block text-xs font-bold text-slate-500 mb-1">NÚMERO CILINDROS</label>
            <input name="numeroCilindros" value={formVehiculo.numeroCilindros || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">CILINDRADA</label>
            <input name="cilindrada" value={formVehiculo.cilindrada || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">EJES / RUEDAS</label>
            <div className="flex gap-2">
                <input name="numeroEjes" value={formVehiculo.numeroEjes || ''} onChange={handleVehiculo} className="w-1/2 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Ejes" />
                <input name="numeroRuedas" value={formVehiculo.numeroRuedas || ''} onChange={handleVehiculo} className="w-1/2 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Ruedas" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ASIENTOS / PASAJEROS</label>
            <div className="flex gap-2">
                <input name="numeroAsientos" value={formVehiculo.numeroAsientos || ''} onChange={handleVehiculo} className="w-1/2 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Asientos" />
                <input name="numeroPasajeros" value={formVehiculo.numeroPasajeros || ''} onChange={handleVehiculo} className="w-1/2 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Pasajeros" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">PESO NETO / BRUTO / UTIL</label>
            <div className="flex gap-2">
              <input name="pesoNeto" value={formVehiculo.pesoNeto || ''} onChange={handleVehiculo} className="w-1/3 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Neto" />
              <input name="pesoBruto" value={formVehiculo.pesoBruto || ''} onChange={handleVehiculo} className="w-1/3 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Bruto" />
              <input name="cargaUtil" value={formVehiculo.cargaUtil || ''} onChange={handleVehiculo} className="w-1/3 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Util" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">POTENCIA</label>
            <input name="potencia" value={formVehiculo.potencia || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">FÓRMULA RODANTE</label>
            <input name="formulaRodante" value={formVehiculo.formulaRodante || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <TitularesList titulares={titulares} setTitulares={setTitulares} />
      </div>

      {/* 2. SECCIÓN DINÁMICA SEGÚN CERTIFICADO */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="text-lg font-bold text-[#052a79] uppercase tracking-wider mb-6 border-b pb-2">
          B. INFORMACIÓN ESPECÍFICA: {tipoCertificado || 'NO SELECCIONADO'}
        </h4>

        {/* --- DATOS GLP --- */}
        {tipoCertificado === 'GLP_ANUAL' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">TALLER AUTORIZADO (Opcional)</label>
                <select name="tallerAutorizadoId" value={formGlp.tallerAutorizadoId || ''} onChange={handleGlp} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors">
                  <option value="">-- SELECCIONAR --</option>
                  {talleres?.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">VIGENCIA HASTA</label>
                <input type="date" name="fechaVigencia" value={formGlp.fechaVigencia || ''} onChange={handleGlp} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
              </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">EXPEDIENTE TÉCNICO</label>
               <input name="expedienteTecnico" value={formGlp.expedienteTecnico || ''} onChange={handleGlp} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
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
              {formGlp.componentes?.map((comp: any, idx: number) => (
                <div key={idx} className="grid grid-cols-5 gap-2 mb-2">
                  <div className="font-bold pt-2">{comp.componente}</div>
                  <input value={comp.marca || ''} onChange={e => handleComponenteGlp(idx, 'marca', e.target.value)} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Marca" />
                  <input value={comp.modelo || ''} onChange={e => handleComponenteGlp(idx, 'modelo', e.target.value)} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Modelo" />
                  {comp.componente === 'REGULADOR' ? <div className="text-center text-slate-400 pt-2">-</div> : <input value={comp.anioFabricacion || ''} onChange={e => handleComponenteGlp(idx, 'anioFabricacion', e.target.value)} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Año" />}
                  <input value={comp.numeroSerie || ''} onChange={e => handleComponenteGlp(idx, 'numeroSerie', e.target.value)} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="N° Serie" />
                </div>
              ))}
            </div>

            <div>
              <h5 className="font-bold text-slate-700 mb-3">VERIFICACIONES DE SEGURIDAD GLP</h5>
              <div className="space-y-3">
                {formGlp.verificaciones?.map((verif: any, idx: number) => (
                  <div key={idx} className={`flex flex-col gap-2 bg-slate-50 p-3 rounded border ${verif.cumple === null ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
                    <p className="text-sm font-semibold text-slate-800">{verif.codigo}) {verif.descripcion}</p>
                    <div className="flex items-center gap-6 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name={`glp-verif-${idx}`} checked={verif.cumple === true} onChange={() => handleVerificacionGlp(idx, 'cumple', true)} className="w-4 h-4 text-[#052a79]" />
                        <span className="text-xs font-bold text-slate-700">CUMPLE</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name={`glp-verif-${idx}`} checked={verif.cumple === false} onChange={() => handleVerificacionGlp(idx, 'cumple', false)} className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-bold text-red-600">NO CUMPLE</span>
                      </label>
                    </div>
                    {verif.cumple === false && (
                      <input value={verif.observacion || ''} onChange={e => handleVerificacionGlp(idx, 'observacion', e.target.value)} className="w-full p-2 border-2 border-red-300 rounded-md text-slate-800 text-xs mt-2" placeholder="Indicar observación obligatoria..." />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- DATOS GNV --- */}
        {tipoCertificado === 'GNV_ANUAL' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">TALLER AUTORIZADO (Opcional)</label>
                <select name="tallerAutorizadoId" value={formGnv.tallerAutorizadoId || ''} onChange={handleGnv} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors">
                  <option value="">-- SELECCIONAR --</option>
                  {talleres?.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">VIGENCIA HASTA</label>
                <input type="date" name="fechaVigencia" value={formGnv.fechaVigencia || ''} onChange={handleGnv} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-700 mb-3">VERIFICACIONES DE INSPECCIÓN ANUAL GNV</h5>
              <div className="space-y-3">
                 {formGnv.verificaciones?.map((verif: any, idx: number) => (
                  <div key={idx} className={`flex flex-col gap-2 bg-slate-50 p-3 rounded border ${verif.cumple === null ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
                    <p className="text-sm font-semibold text-slate-800">{verif.codigo}) {verif.descripcion}</p>
                    <div className="flex items-center gap-6 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name={`gnv-verif-${idx}`} checked={verif.cumple === true} onChange={() => handleVerificacionGnv(idx, 'cumple', true)} className="w-4 h-4 text-[#052a79]" />
                        <span className="text-xs font-bold text-slate-700">CUMPLE</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name={`gnv-verif-${idx}`} checked={verif.cumple === false} onChange={() => handleVerificacionGnv(idx, 'cumple', false)} className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-bold text-red-600">NO CUMPLE</span>
                      </label>
                    </div>
                    {verif.cumple === false && (
                      <input value={verif.observacion || ''} onChange={e => handleVerificacionGnv(idx, 'observacion', e.target.value)} className="w-full p-2 border-2 border-red-300 rounded-md text-slate-800 text-xs mt-2" placeholder="Indicar observación obligatoria..." />
                    )}
                  </div>
                ))}
              </div>
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
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">TIPO DE TRÁMITE</label>
                <input name="tipoTramite" value={formConformidad.tipoTramite || ''} onChange={handleConformidad} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h5 className="font-bold text-slate-700 mb-3">CARACTERÍSTICAS REGISTRABLES Y MOTIVO</h5>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">CARACTERÍSTICA A CERTIFICAR</label>
                  <input name="caracteristicaRegistrable" value={formConformidad.caracteristicaRegistrable || ''} onChange={handleConformidad} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="EJ: NÚMERO DE EJES" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">MOTIVO</label>
                  <input name="motivo" value={formConformidad.motivo || ''} onChange={handleConformidad} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="EJ: RECTIFICACIÓN" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">USO ORIGINAL DEL VEHÍCULO</label>
                  <input name="usoOriginalVehiculo" value={formConformidad.usoOriginalVehiculo || ''} onChange={handleConformidad} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">DESCRIPCIÓN / OBSERVACIONES COMPLEMENTARIAS</label>
                  <input name="descripcion" value={formConformidad.descripcion || ''} onChange={handleConformidad} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
