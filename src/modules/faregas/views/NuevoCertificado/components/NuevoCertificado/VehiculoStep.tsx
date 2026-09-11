/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { TipoCertificadoFaregas } from '../../../../types/faregas';
import { TitularesList, type TitularState } from './TitularesList';
import React, { useEffect } from 'react';
import type { FormFacturacionState } from '../../NuevoCertificadoView';
import { ChipBarcodeField } from './ChipBarcodeField';
import {
  formatVIN,
  formatAlfanumerico,
  formatFormulaRodante,
  formatEntero,
  formatDecimal,
  formatAlfanumericoConEspacios,
  formatMes,
  formatAnio
} from '../../../../utils/vehiculo-formatters';

interface VehiculoStepProps {
  certificadoId?: number | null;
  tipoCertificado: TipoCertificadoFaregas;
  modalidadCertificado: string;
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
  formFacturacion: FormFacturacionState;
  setFormFacturacion: React.Dispatch<React.SetStateAction<FormFacturacionState>>;
  onRemoveTitular?: (titular: TitularState) => Promise<void>;
  catalogoVerificaciones?: any;
  talleres?: any[];
  vehiculoOrigen?: 'FARENET' | 'BORRADOR' | 'MANUAL';
  maestrosVehiculo?: any;
}

export function VehiculoStep({
  certificadoId,
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
  formFacturacion,
  setFormFacturacion,
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

    const faltanComponentesGnv = !formGnv.componentes || formGnv.componentes.length === 0;
    if (tipoCertificado === 'GNV_ANUAL' && modalidadCertificado === 'INICIAL' && faltanComponentesGnv) {
      setFormGnv((prev: any) => ({
        ...prev,
        componentes: [
          { orden: 1, componente: 'REDUCTOR', marca: '', modelo: '', capacidadLitros: '', mesFabricacion: '', anioFabricacion: '', numeroSerie: '' },
          { orden: 2, componente: 'CILINDRO', marca: '', modelo: '', capacidadLitros: '', mesFabricacion: '', anioFabricacion: '', numeroSerie: '' }
        ]
      }));
    }
  }, [tipoCertificado, modalidadCertificado, catalogoVerificaciones]);

  const handleVehiculo = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value.toUpperCase();
    
    switch (name) {
      case 'vin': finalValue = formatVIN(finalValue); break;
      case 'serieChasis':
      case 'numeroMotor':
        finalValue = formatAlfanumerico(finalValue, 30); break;
      case 'formulaRodante': finalValue = formatFormulaRodante(finalValue); break;
      case 'numeroCilindros':
      case 'numeroEjes':
      case 'numeroRuedas':
      case 'numeroAsientos':
      case 'numeroPasajeros':
        finalValue = formatEntero(finalValue, 4); break;
      case 'anioFabricacion':
      case 'anioModelo':
        finalValue = formatAnio(finalValue); break;
      case 'cilindrada':
        finalValue = formatEntero(finalValue, 5); break;
      case 'pesoNeto':
      case 'pesoBruto':
      case 'cargaUtil':
      case 'potencia':
        finalValue = formatDecimal(finalValue, 6, 2); break;
      case 'longitud':
      case 'ancho':
      case 'alto':
        finalValue = formatDecimal(finalValue, 2, 2); break;
    }
    setFormVehiculo((prev: any) => ({ ...prev, [name]: finalValue }));
  };

  const handleGlp = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value.toUpperCase();
    if (['pesoNetoPosterior', 'cargaUtilPosterior'].includes(name)) {
      finalValue = formatDecimal(finalValue, 6, 2);
    }
    setFormGlp((prev: any) => ({ ...prev, [name]: finalValue }));
  };

  const handleGnv = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value.toUpperCase();
    if (name === 'numeroChip') {
      finalValue = formatAlfanumerico(finalValue, 15);
    } else if (name === 'pesoNetoPosterior') {
      finalValue = formatDecimal(finalValue, 6, 2);
    }
    setFormGnv((prev: any) => ({ ...prev, [name]: finalValue }));
  };

  const handleConformidad = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value.toUpperCase();
    if (name === 'caracteristicaRegistrable') {
       finalValue = formatAlfanumericoConEspacios(finalValue, 300);
    } else if (['motivo', 'usoOriginalVehiculo'].includes(name)) {
       finalValue = formatAlfanumericoConEspacios(finalValue, 100);
    } else if (name === 'descripcion') {
       finalValue = formatAlfanumericoConEspacios(finalValue, 500);
    }
    setFormConformidad((prev: any) => ({ ...prev, [name]: finalValue }));
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
    setFormGlp((prev: any) => {
      const nc = [...(prev.componentes || [])];
      let finalValue = typeof valor === 'string' ? valor.toUpperCase() : valor;
      if (typeof finalValue === 'string') {
        if (['marca', 'modelo', 'numeroSerie'].includes(campo)) {
          finalValue = formatAlfanumerico(finalValue, 30);
        } else if (campo === 'capacidadLitros') {
          finalValue = formatDecimal(finalValue, 5, 2);
        } else if (campo === 'mesFabricacion') {
          finalValue = formatMes(finalValue);
        } else if (campo === 'anioFabricacion') {
          finalValue = formatAnio(finalValue);
        }
      }
      nc[idx] = { ...nc[idx], [campo]: finalValue };
      return { ...prev, componentes: nc };
    });
  };

  const handleComponenteGnv = (idx: number, campo: string, valor: any) => {
    setFormGnv((prev: any) => {
      const nc = [...(prev.componentes || [])];
      let finalValue = typeof valor === 'string' ? valor.toUpperCase() : valor;
      if (typeof finalValue === 'string') {
        if (['marca', 'numeroSerie'].includes(campo)) {
          finalValue = formatAlfanumerico(finalValue, 30);
        } else if (campo === 'capacidadLitros' && finalValue !== 'NO APLICA' && finalValue !== ' ' && finalValue !== 'ESPECIFICAR') {
          finalValue = formatDecimal(finalValue, 5, 2);
        }
      }
      nc[idx] = { ...nc[idx], [campo]: finalValue };
      return { ...prev, componentes: nc };
    });
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
        <TitularesList
          titulares={titulares}
          setTitulares={setTitulares}
          formFacturacion={formFacturacion}
          setFormFacturacion={setFormFacturacion}
          onRemoveTitular={onRemoveTitular}
        />
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
                <ChipBarcodeField
                  value={formGnv.numeroChip ?? formGnv.numero_chip ?? ''}
                  certificadoId={certificadoId}
                  onChange={(numeroChip) => setFormGnv((prev: any) => ({ ...prev, numeroChip }))}
                />
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

            {modalidadCertificado === 'INICIAL' && (
              <>
                {/* CARACTERÍSTICAS DE CONVERSIÓN GNV */}
                <div className="mt-8">
                  <h5 className="font-bold text-[#052a79] mb-3 border-b border-blue-100 pb-2">CARACTERÍSTICAS DE CONVERSIÓN GNV</h5>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="p-3 font-bold">Característica</th>
                          <th className="p-3 font-bold border-l border-slate-200 bg-slate-100">Antes (Original)</th>
                          <th className="p-3 font-bold border-l border-slate-200 bg-amber-50 text-amber-800">Después (Conversión)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-slate-200">
                          <td className="p-3 font-semibold text-slate-800">COMBUSTIBLE</td>
                          <td className="p-3 border-l border-slate-200 bg-slate-50">
                            <select
                              name="combustible"
                              value={formVehiculo.combustible || ''}
                              onChange={handleVehiculo}
                              className="w-64 p-1.5 border-2 border-slate-300 rounded bg-white text-slate-700 font-bold focus:border-[#f59e0b] focus:ring-0 text-xs"
                            >
                              <option value="">-- SELECCIONAR --</option>
                              {maestrosVehiculo?.combustibles?.map((c: any) => (
                                <option key={c.id} value={c.nombre}>{c.nombre}</option>
                              ))}
                              {!maestrosVehiculo?.combustibles && (
                                <>
                                  <option value="GASOLINA">GASOLINA</option>
                                  <option value="DIESEL">DIESEL</option>
                                  <option value="PETROLEO">PETROLEO</option>
                                </>
                              )}
                            </select>
                          </td>
                          <td className="p-3 border-l border-slate-200 bg-amber-50/30">
                            <select
                              name="combustiblePosterior"
                              value={formGnv.combustiblePosterior || ''}
                              onChange={handleGnv}
                              className="w-full p-1.5 border-2 border-amber-300 rounded text-slate-800 font-bold focus:border-amber-500 focus:ring-0 text-xs"
                            >
                              <option value="">-- SELECCIONAR --</option>
                              <option value="BI - COMBUSTIBLE GNV">BI - COMBUSTIBLE GNV</option>
                              <option value="DUAL GNV">DUAL GNV</option>
                            </select>
                          </td>
                        </tr>
                        <tr className="border-t border-slate-200">
                          <td className="p-3 font-semibold text-slate-800">PESO NETO (Kg.)</td>
                          <td className="p-3 border-l border-slate-200 bg-slate-50">
                            <input value={formVehiculo.pesoNeto || ''} readOnly className="w-32 p-1.5 border border-slate-200 rounded bg-slate-100 text-slate-500 text-xs uppercase" title="Modificar en la sección de Vehículo" />
                          </td>
                          <td className="p-3 border-l border-slate-200 bg-amber-50/30">
                            <input
                              name="pesoNetoPosterior"
                              value={formGnv.pesoNetoPosterior || ''}
                              onChange={handleGnv}
                              className="w-32 p-1.5 border-2 border-amber-300 rounded text-slate-800 font-bold focus:border-amber-500 focus:ring-0 text-xs"
                              placeholder="Ej. 1453"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* COMPONENTES INSTALADOS GNV */}
                <div className="mt-8">
                  <h5 className="font-bold text-[#052a79] mb-3 border-b border-blue-100 pb-2">COMPONENTES INSTALADOS GNV</h5>
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="p-2 font-bold w-12 text-center">N°</th>
                          <th className="p-2 font-bold w-32">COMPONENTE</th>
                          <th className="p-2 font-bold w-[20%]">MARCA</th>
                          <th className="p-2 font-bold w-[20%]">N° DE SERIE</th>
                          <th className="p-2 font-bold w-[20%]">CAP. (Lts)</th>
                          <th className="p-2 font-bold w-[20%]">FECHA FAB. (MM/AA)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formGnv.componentes?.map((comp: any, idx: number) => (
                          <tr key={idx} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                            <td className="p-2 text-center font-bold text-slate-400">{comp.orden}</td>
                            <td className="p-2 font-bold text-slate-700">{comp.componente}</td>
                            <td className="p-2">
                              <input value={comp.marca || ''} onChange={e => handleComponenteGnv(idx, 'marca', e.target.value)} className="w-full p-1.5 border-2 border-slate-200 rounded uppercase font-semibold focus:border-[#f59e0b] focus:ring-0" placeholder="Marca" />
                            </td>
                            <td className="p-2">
                              <input value={comp.numeroSerie || ''} onChange={e => handleComponenteGnv(idx, 'numeroSerie', e.target.value)} className="w-full p-1.5 border-2 border-slate-200 rounded uppercase font-semibold focus:border-[#f59e0b] focus:ring-0" placeholder="N° Serie" />
                            </td>
                            <td className="p-2">
                              {comp.capacidadLitros !== 'NO APLICA' && comp.capacidadLitros !== undefined && comp.capacidadLitros !== '' ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    value={comp.capacidadLitros.trim()}
                                    onChange={e => handleComponenteGnv(idx, 'capacidadLitros', e.target.value)}
                                    className="w-full p-1.5 border-2 border-amber-300 rounded uppercase font-bold text-slate-800 focus:border-amber-500 focus:ring-0 text-xs"
                                    placeholder="Lts"
                                  />
                                  <button type="button" onClick={() => handleComponenteGnv(idx, 'capacidadLitros', '')} className="text-red-500 font-bold px-1 text-lg leading-none" title="Volver a seleccionar">×</button>
                                </div>
                              ) : (
                                <select
                                  value={comp.capacidadLitros || ''}
                                  onChange={e => {
                                    if (e.target.value === 'ESPECIFICAR') {
                                      handleComponenteGnv(idx, 'capacidadLitros', ' '); 
                                    } else {
                                      handleComponenteGnv(idx, 'capacidadLitros', e.target.value);
                                    }
                                  }}
                                  className="w-full p-1.5 border-2 border-amber-300 rounded text-slate-800 font-bold focus:border-amber-500 focus:ring-0 text-[10px] uppercase"
                                >
                                  <option value="">-- SELECCIONAR --</option>
                                  <option value="NO APLICA">NO APLICA</option>
                                  <option value="ESPECIFICAR">COMPLETAR...</option>
                                </select>
                              )}
                            </td>
                            <td className="p-2">
                              <input
                                type="month"
                                value={comp.anioFabricacion && comp.mesFabricacion ? `${comp.anioFabricacion}-${String(comp.mesFabricacion).padStart(2, '0')}` : ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val) {
                                    const [year, month] = val.split('-');
                                    handleComponenteGnv(idx, 'anioFabricacion', year);
                                    handleComponenteGnv(idx, 'mesFabricacion', month);
                                  } else {
                                    handleComponenteGnv(idx, 'anioFabricacion', '');
                                    handleComponenteGnv(idx, 'mesFabricacion', '');
                                  }
                                }}
                                className="w-full p-1.5 border-2 border-slate-200 rounded text-center font-semibold focus:border-[#f59e0b] focus:ring-0"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

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
                <span className="text-xs font-bold text-slate-700 uppercase">Marcar Modificación</span>
                <span className="text-xs font-bold text-slate-700 uppercase">Marcar Montaje</span>
                <span className="text-xs font-bold text-slate-700 uppercase">Marcar Fabricación</span>
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
