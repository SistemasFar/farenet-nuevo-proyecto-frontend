/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { TipoCertificadoFaregas } from '../../../../types/faregas';
import { TitularesList, type TitularState } from './TitularesList';
import React, { useEffect } from 'react';

interface VehiculoStepProps {
  tipoCertificado: TipoCertificadoFaregas;
  modalidadCertificado: '' | 'INICIAL' | 'ANUAL';
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
  onRemoveTitular?: (titular: TitularState) => Promise<void>;
  catalogoVerificaciones?: any;
  talleres?: any[];
  vehiculoOrigen?: 'FARENET' | 'BORRADOR' | 'MANUAL';
  maestrosVehiculo?: any;
}

export function VehiculoStep({
  tipoCertificado,
  modalidadCertificado,
  formVehiculo,
  setFormVehiculo,
  formPropietario: _formPropietario,
  setFormPropietario: _setFormPropietario,
  formGlp,
  setFormGlp,
  formGnv,
  setFormGnv,
  formConformidad,
  setFormConformidad,
  titulares,
  setTitulares,
  onRemoveTitular,
  catalogoVerificaciones,
  talleres,
  vehiculoOrigen = 'MANUAL',
  maestrosVehiculo
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
    const faltanVerificacionesGlp = !formGlp.verificaciones || formGlp.verificaciones.length === 0;
    const faltanComponentesGlp = !formGlp.componentes || formGlp.componentes.length === 0;
    if (tipoCertificado === 'GLP_ANUAL' && catalogoVerificaciones?.GLP_ANUAL && (faltanVerificacionesGlp || faltanComponentesGlp)) {
      setFormGlp((prev: any) => ({
        ...prev,
        verificaciones: faltanVerificacionesGlp ? catalogoVerificaciones.GLP_ANUAL.map((v: any) => ({
          codigo: v.codigo,
          orden: v.orden,
          descripcion: v.descripcion,
          cumple: null,
          observacion: ''
        })) : prev.verificaciones,
        componentes: faltanComponentesGlp ? [
          { orden: 1, componente: 'CILINDRO', marca: '', modelo: '', capacidadLitros: '', mesFabricacion: '', anioFabricacion: '', numeroSerie: '' },
          { orden: 2, componente: 'REGULADOR', marca: '', modelo: '', capacidadLitros: '', mesFabricacion: '', anioFabricacion: '', numeroSerie: '' }
        ] : prev.componentes
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
        <div className="mb-4 flex justify-end">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-[#052a79]">
            ORIGEN: {vehiculoOrigen}{vehiculoOrigen === 'FARENET' ? ' (EDITABLE)' : ''}
          </span>
        </div>
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
            <label className="block text-xs font-bold text-slate-500 mb-1">CLASE VEHICULAR</label>
            <input name="clase" value={formVehiculo.clase || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">CARROCERÍA</label>
            <input name="carroceria" value={formVehiculo.carroceria || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
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
            <label className="block text-xs font-bold text-slate-500 mb-1">LARGO / ANCHO / ALTO (M)</label>
            <div className="flex gap-2">
              <input name="longitud" value={formVehiculo.longitud || ''} onChange={handleVehiculo} className="w-1/3 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Largo" />
              <input name="ancho" value={formVehiculo.ancho || ''} onChange={handleVehiculo} className="w-1/3 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Ancho" />
              <input name="alto" value={formVehiculo.alto || ''} onChange={handleVehiculo} className="w-1/3 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Alto" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">FÓRMULA RODANTE</label>
            <input name="formulaRodante" value={formVehiculo.formulaRodante || ''} onChange={handleVehiculo} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
          </div>
        </div>
        {vehiculoOrigen === 'FARENET' && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            Farenet no almacena versión, año modelo, cilindrada, potencia ni fórmula rodante en su ficha vehicular. Estos campos deben completarse y validarse con la tarjeta de propiedad.
          </p>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <TitularesList titulares={titulares} setTitulares={setTitulares} onRemoveTitular={onRemoveTitular} />
      </div>

      {/* 2. SECCIÓN DINÁMICA SEGÚN CERTIFICADO */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="text-lg font-bold text-[#052a79] uppercase tracking-wider mb-6 border-b pb-2">
          B. INFORMACIÓN ESPECÍFICA:{' '}
          {tipoCertificado === 'GNV_ANUAL' ? 'GNV'
            : tipoCertificado === 'GLP_ANUAL' ? 'GLP'
            : tipoCertificado === 'CONFORMIDAD' ? 'CONFORMIDAD'
            : tipoCertificado || 'NO SELECCIONADO'}
        </h4>

        {/* --- DATOS GLP --- */}
        {tipoCertificado === 'GLP_ANUAL' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">MODALIDAD</label>
                <div className="flex min-h-[42px] items-center justify-between rounded-lg border-2 border-blue-100 bg-blue-50 px-3 py-2">
                  <span className="font-black text-[#052a79]">{modalidadCertificado || 'NO DEFINIDA'}</span>
                  <span className="text-[10px] font-bold uppercase text-blue-500">Seleccionada en datos iniciales</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">TALLER AUTORIZADO <span className="text-red-500">*</span></label>
                <select name="tallerAutorizadoId" value={formGlp.tallerAutorizadoId || ''} onChange={handleGlp} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors">
                  <option value="">-- SELECCIONAR --</option>
                  {talleres?.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">VIGENCIA HASTA <span className="text-red-500">*</span></label>
                <input type="date" name="fechaVigencia" value={formGlp.fechaVigencia || ''} onChange={handleGlp} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
              </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">EXPEDIENTE TÉCNICO <span className="text-red-500">*</span></label>
               <input name="expedienteTecnico" value={formGlp.expedienteTecnico || ''} onChange={handleGlp} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
            </div>

            {modalidadCertificado === 'INICIAL' && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h5 className="font-bold text-slate-700 mb-3">CARACTERÍSTICAS ANTES Y DESPUÉS DE LA CONVERSIÓN</h5>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <div className="grid grid-cols-3 bg-slate-100 text-xs font-bold text-slate-600 uppercase border-b border-slate-200 p-3">
                    <div>CARACTERÍSTICA</div>
                    <div>ANTES</div>
                    <div>DESPUÉS</div>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-100 p-3 items-center">
                    <div className="text-xs font-bold text-slate-600">Combustible</div>
                    <div>
                      <select name="combustible" value={formVehiculo.combustible || ''} onChange={handleVehiculo} className="w-64 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors">
                        <option value="">-- SELECCIONAR --</option>
                        {maestrosVehiculo?.combustibles?.map((c: any) => (
                          <option key={c.key} value={c.nombre}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-sm font-black text-[#052a79]">BI-COMBUSTIBLE GLP</div>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-100 p-3 items-center">
                    <div className="text-xs font-bold text-slate-600">Peso neto (Kg.)</div>
                    <div className="text-sm font-semibold text-slate-500">{formVehiculo.pesoNeto || '-'}</div>
                    <div>
                      <input type="number" step="0.01" name="pesoNetoPosterior" value={formGlp.pesoNetoPosterior || ''} onChange={handleGlp} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Nuevo peso neto" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 p-3 items-center">
                    <div className="text-xs font-bold text-slate-600">Carga útil (Kg.)</div>
                    <div className="text-sm font-semibold text-slate-500">{formVehiculo.cargaUtil || '-'}</div>
                    <div>
                      <input type="number" step="0.01" name="cargaUtilPosterior" value={formGlp.cargaUtilPosterior || ''} onChange={handleGlp} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Nueva carga útil" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h5 className="font-bold text-slate-700 mb-3">COMPONENTES INSTALADOS GLP</h5>
              <div className="grid grid-cols-7 gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <div>Componente</div>
                <div>Marca</div>
                <div>Modelo</div>
                <div>Cap. (L)</div>
                <div>Mes</div>
                <div>Año</div>
                <div>N° Serie</div>
              </div>
              {formGlp.componentes?.map((comp: any, idx: number) => (
                <div key={idx} className="grid grid-cols-7 gap-2 mb-2">
                  <div className="font-bold pt-2">{comp.componente}</div>
                  <input value={comp.marca || ''} onChange={e => handleComponenteGlp(idx, 'marca', e.target.value)} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Marca" />
                  <input value={comp.modelo || ''} onChange={e => handleComponenteGlp(idx, 'modelo', e.target.value)} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Modelo" />
                  {comp.componente === 'REGULADOR' ? (
                    <>
                      <div className="text-center text-slate-400 pt-2">-</div>
                      <div className="text-center text-slate-400 pt-2">-</div>
                      <div className="text-center text-slate-400 pt-2">-</div>
                    </>
                  ) : (
                    <>
                      <input value={comp.capacidadLitros || ''} onChange={e => handleComponenteGlp(idx, 'capacidadLitros', e.target.value)} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0" placeholder="Litros" />
                      <input value={comp.mesFabricacion || ''} onChange={e => handleComponenteGlp(idx, 'mesFabricacion', e.target.value)} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0" placeholder="Mes" />
                      <input value={comp.anioFabricacion || ''} onChange={e => handleComponenteGlp(idx, 'anioFabricacion', e.target.value)} className="w-full p-1.5 border-2 border-slate-200 rounded-md text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="Año" />
                    </>
                  )}
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
                <label className="block text-xs font-bold text-slate-500 mb-1">MODALIDAD</label>
                <div className="flex min-h-[42px] items-center justify-between rounded-lg border-2 border-blue-100 bg-blue-50 px-3 py-2">
                  <span className="font-black text-[#052a79]">{modalidadCertificado || 'NO DEFINIDA'}</span>
                  <span className="text-[10px] font-bold uppercase text-blue-500">Seleccionada en datos iniciales</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">TALLER AUTORIZADO <span className="text-red-500">*</span></label>
                <select name="tallerAutorizadoId" value={formGnv.tallerAutorizadoId || ''} onChange={handleGnv} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors">
                  <option value="">-- SELECCIONAR --</option>
                  {talleres?.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">VIGENCIA HASTA <span className="text-red-500">*</span></label>
                <input type="date" name="fechaVigencia" value={formGnv.fechaVigencia || ''} onChange={handleGnv} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" />
              </div>
              {modalidadCertificado === 'INICIAL' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">N° CHIP <span className="text-red-500">*</span> <span className="font-normal text-slate-400">(alfanumérico, máx 15)</span></label>
                  <input
                    name="numeroChip"
                    value={formGnv.numeroChip || ''}
                    onChange={e => setFormGnv((prev: any) => ({ ...prev, numeroChip: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15) }))}
                    maxLength={15}
                    className="w-full p-2 border-2 border-amber-300 rounded-lg text-slate-800 font-semibold focus:border-amber-500 focus:ring-0 uppercase transition-colors"
                    placeholder="EJ: ABC12345"
                  />
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-500 mb-1">OBSERVACIONES GNV (Opcional) <span className="font-normal text-slate-400">({formGnv.observaciones?.length || 0}/250)</span></label>
              <input
                name="observaciones"
                value={formGnv.observaciones || ''}
                onChange={handleGnv}
                maxLength={250}
                className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors"
                placeholder="EJ: NINGUNA"
              />
            </div>

            <div>
              <h5 className="font-bold text-slate-700 mb-3 mt-6">VERIFICACIONES DE INSPECCIÓN ANUAL GNV</h5>
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
              <h5 className="font-bold text-slate-700 mb-3">SELECCIÓN DE RECUADROS (Opcional)</h5>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="marcaModificacion" checked={!!formConformidad.marcaModificacion} onChange={(e) => setFormConformidad((prev: any) => ({ ...prev, marcaModificacion: e.target.checked }))} className="w-4 h-4 text-[#052a79]" />
                  <span className="text-xs font-bold text-slate-700 uppercase">Marcar Modificación</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="marcaMontaje" checked={!!formConformidad.marcaMontaje} onChange={(e) => setFormConformidad((prev: any) => ({ ...prev, marcaMontaje: e.target.checked }))} className="w-4 h-4 text-[#052a79]" />
                  <span className="text-xs font-bold text-slate-700 uppercase">Marcar Montaje</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="marcaFabricacion" checked={!!formConformidad.marcaFabricacion} onChange={(e) => setFormConformidad((prev: any) => ({ ...prev, marcaFabricacion: e.target.checked }))} className="w-4 h-4 text-[#052a79]" />
                  <span className="text-xs font-bold text-slate-700 uppercase">Marcar Fabricación</span>
                </label>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h5 className="font-bold text-slate-700 mb-3">CARACTERÍSTICAS REGISTRABLES Y MOTIVO</h5>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">CARACTERÍSTICA A CERTIFICAR</label>
                  <input name="caracteristicaRegistrable" value={formConformidad.caracteristicaRegistrable || ''} onChange={handleConformidad} maxLength={300} className="w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 uppercase transition-colors" placeholder="EJ: NÚMERO DE EJES" />
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
