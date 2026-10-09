/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { TipoCertificadoFaregas } from '../../../../types/faregas';
import { TitularesList, type TitularState } from './TitularesList';
import React, { useEffect } from 'react';
import type { FormFacturacionState } from '../../NuevoCertificadoView';
import type { MaestroOption } from '@/types/maestros';
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
import { MensajeError, propsCampo, claseConError, type ErroresCampo } from '../../faregas-wizard-errores';
import { camposObligatoriosVisibles } from '../../faregas-wizard.validation';
import { alternarIncumplimientoGnv, marcarTodasVerificacionesGnvComoCumple } from '../../gnv-verificaciones';
import { alternarIncumplimientoGlp, marcarTodasVerificacionesGlpComoCumple } from '../../glp-verificaciones';
import { combustiblesGnvSonEquivalentes, combustiblesSonEquivalentes, pesosGnvSonIguales } from '../../gnv-conversion';

/** Clase original de los campos del paso; el error sólo sustituye el color. */
const CLASE_CAMPO = 'w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors';

/** Clase original de los campos dentro de la tabla de conversión antes/después. */
const CLASE_TABLA = 'w-full p-1.5 border-2 border-amber-300 rounded text-slate-800 font-bold focus:border-amber-500 focus:ring-0 text-xs';
const COMBUSTIBLE_POSTERIOR_GLP = 'BI-COMBUSTIBLE GLP';

interface VehiculoStepProps {
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
  vehiculoOrigen?: 'FARENET' | 'FAREGAS' | 'MIXTO' | 'BORRADOR' | 'MANUAL';
  maestrosVehiculo?: any;
  categoriaVehicular: string;
  categoriasVehiculares: MaestroOption[];
  onCategoriaVehicularChange: (categoria: string) => void;
  /** Errores del paso, indexados por el nombre del campo. */
  erroresCampo?: ErroresCampo;
  /** Limpia el error de un único campo cuando el usuario lo corrige. */
  onCorregirCampo?: (campo: string) => void;
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
  formFacturacion,
  setFormFacturacion,
  onRemoveTitular,
  catalogoVerificaciones,
  vehiculoOrigen = 'MANUAL',
  maestrosVehiculo,
  categoriaVehicular,
  categoriasVehiculares,
  onCategoriaVehicularChange,
  erroresCampo = {},
  onCorregirCampo
}: VehiculoStepProps) {

  // El asterisco de cada etiqueta sale del mismo conjunto que usa la
  // validación, así que lo marcado como obligatorio y lo que se bloquea
  // nunca se contradicen.
  const obligatorio = React.useMemo(
    () => new Set(camposObligatoriosVisibles(tipoCertificado, modalidadCertificado)),
    [tipoCertificado, modalidadCertificado]
  );
  const required = (campo: string) => (obligatorio.has(campo) ? ' *' : '');
  const esError = (campo: string) => Boolean(erroresCampo[campo]);
  const limpiar = (campo: string) => onCorregirCampo?.(campo);
  const claveComponente = (familia: 'glp' | 'gnv', componente: unknown, campo: string) =>
    `${familia}.componentes.${String(componente || '').toUpperCase()}.${campo}`;
  const verificacionesGnv = Array.isArray(formGnv.verificaciones) ? formGnv.verificaciones : [];
  const todasVerificacionesGnvCumplen = verificacionesGnv.length === 8
    && verificacionesGnv.every((item: any) => item.cumple === true);
  const existeVerificacionGnvNoCumple = verificacionesGnv.some((item: any) => item.cumple === false);
  const verificacionesGlp = Array.isArray(formGlp.verificaciones) ? formGlp.verificaciones : [];
  const todasVerificacionesGlpCumplen = verificacionesGlp.length === 7
    && verificacionesGlp.every((item: any) => item.cumple === true);
  const existeVerificacionGlpNoCumple = verificacionesGlp.some((item: any) => item.cumple === false);
  const combustibleGnvSinCambio = modalidadCertificado === 'INICIAL'
    && combustiblesGnvSonEquivalentes(formVehiculo.combustible, formGnv.combustiblePosterior);
  const pesoGnvSinCambio = modalidadCertificado === 'INICIAL'
    && pesosGnvSonIguales(formVehiculo.pesoNeto, formGnv.pesoNetoPosterior);
  const combustibleGlpSinCambio = modalidadCertificado === 'INICIAL'
    && combustiblesSonEquivalentes(formVehiculo.combustible, COMBUSTIBLE_POSTERIOR_GLP);
  
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
  }, [
    tipoCertificado,
    modalidadCertificado,
    catalogoVerificaciones,
    formGnv.verificaciones,
    formGnv.componentes,
    formGlp.verificaciones,
    formGlp.componentes,
    setFormGnv,
    setFormGlp
  ]);

  const handleVehiculo = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value.toUpperCase();
    limpiar(name);
    if (name === 'combustible') limpiar('gnv.combustiblePosterior');
    if (name === 'pesoNeto') limpiar('gnv.pesoNetoPosterior');
    
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
    limpiar(name);
    if (['pesoNetoPosterior', 'cargaUtilPosterior'].includes(name)) {
      finalValue = formatDecimal(finalValue, 6, 2);
    }
    setFormGlp((prev: any) => ({ ...prev, [name]: finalValue }));
  };

  const handleGnv = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value.toUpperCase();
    limpiar(`gnv.${name}`);
    if (name === 'numeroChip') {
      finalValue = formatAlfanumerico(finalValue, 15);
    } else if (name === 'pesoNetoPosterior') {
      finalValue = formatDecimal(finalValue, 6, 2);
    }
    setFormGnv((prev: any) => ({ ...prev, [name]: finalValue }));
  };

  const handleConformidad = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue = value.toUpperCase();
    limpiar(`conformidad.${name}`);
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

  const marcarTodasGnvComoCumple = () => {
    limpiar('gnv.verificaciones');
    setFormGnv((prev: any) => ({
      ...prev,
      verificaciones: marcarTodasVerificacionesGnvComoCumple(prev.verificaciones)
    }));
  };

  const alternarIncumplimiento = (idx: number) => {
    limpiar('gnv.verificaciones');
    setFormGnv((prev: any) => ({
      ...prev,
      verificaciones: alternarIncumplimientoGnv(prev.verificaciones, idx)
    }));
  };

  const handleVerificacionGlp = (idx: number, campo: string, valor: any) => {
    const nv = [...(formGlp.verificaciones || [])];
    nv[idx] = { ...nv[idx], [campo]: valor };
    setFormGlp((prev: any) => ({ ...prev, verificaciones: nv }));
  };

  const marcarTodasGlpComoCumple = () => {
    limpiar('glp.verificaciones');
    setFormGlp((prev: any) => ({
      ...prev,
      verificaciones: marcarTodasVerificacionesGlpComoCumple(prev.verificaciones)
    }));
  };

  const alternarIncumplimientoEnGlp = (idx: number) => {
    limpiar('glp.verificaciones');
    setFormGlp((prev: any) => ({
      ...prev,
      verificaciones: alternarIncumplimientoGlp(prev.verificaciones, idx)
    }));
  };

  const handleComponenteGlp = (idx: number, campo: string, valor: any) => {
    const componente = formGlp.componentes?.[idx]?.componente;
    if (componente) limpiar(claveComponente('glp', componente, campo));
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
    const componente = formGnv.componentes?.[idx]?.componente;
    if (componente) {
      limpiar(claveComponente('gnv', componente, campo));
      if (campo === 'mesFabricacion' || campo === 'anioFabricacion') {
        limpiar(claveComponente('gnv', componente, 'fechaFabricacion'));
      }
    }
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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h4 className="text-lg font-bold text-slate-800 capitalize tracking-wider mb-6 border-b pb-2">
          A. DATOS GENERALES DEL VEHÍCULO
        </h4>
        <div className="mb-4 flex justify-end">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-[#052a79]">
            ORIGEN: {vehiculoOrigen}{['FARENET', 'FAREGAS', 'MIXTO'].includes(vehiculoOrigen) ? ' (EDITABLE)' : ''}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">MARCA{required('marca') && <span className="text-red-500">*</span>}</label>
            <input name="marca" value={formVehiculo.marca || ''} onChange={handleVehiculo} {...propsCampo('marca', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="marca" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">MODELO{required('modelo') && <span className="text-red-500">*</span>}</label>
            <input name="modelo" value={formVehiculo.modelo || ''} onChange={handleVehiculo} {...propsCampo('modelo', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="modelo" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">VERSIÓN{required('version') && <span className="text-red-500">*</span>}</label>
            <input name="version" value={formVehiculo.version || ''} onChange={handleVehiculo} {...propsCampo('version', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="version" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">AÑO FABRICACIÓN{required('anioFabricacion') && <span className="text-red-500">*</span>}</label>
            <input name="anioFabricacion" value={formVehiculo.anioFabricacion || ''} onChange={handleVehiculo} {...propsCampo('anioFabricacion', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="anioFabricacion" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">AÑO MODELO{required('anioModelo') && <span className="text-red-500">*</span>}</label>
            <input name="anioModelo" value={formVehiculo.anioModelo || ''} onChange={handleVehiculo} {...propsCampo('anioModelo', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="anioModelo" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">VIN{required('vin') && <span className="text-red-500">*</span>}</label>
            <input name="vin" value={formVehiculo.vin || ''} onChange={handleVehiculo} {...propsCampo('vin', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="vin" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">SERIE CHASIS{required('serieChasis') && <span className="text-red-500">*</span>}</label>
            <input name="serieChasis" value={formVehiculo.serieChasis || ''} onChange={handleVehiculo} {...propsCampo('serieChasis', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="serieChasis" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">N° MOTOR{required('numeroMotor') && <span className="text-red-500">*</span>}</label>
            <input name="numeroMotor" value={formVehiculo.numeroMotor || ''} onChange={handleVehiculo} {...propsCampo('numeroMotor', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="numeroMotor" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">COMBUSTIBLE{required('combustible') && <span className="text-red-500">*</span>}</label>
            <input name="combustible" value={formVehiculo.combustible || ''} onChange={handleVehiculo} {...propsCampo('combustible', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="combustible" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">COLOR{required('color') && <span className="text-red-500">*</span>}</label>
            <input name="color" value={formVehiculo.color || ''} onChange={handleVehiculo} {...propsCampo('color', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="color" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">CLASE VEHICULAR{required('clase') && <span className="text-red-500">*</span>}</label>
            <input name="clase" value={formVehiculo.clase || ''} onChange={handleVehiculo} {...propsCampo('clase', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="clase" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">CATEGORÍA{required('categoria') && <span className="text-red-500">*</span>}</label>
            <select
              value={categoriaVehicular || ''}
              onChange={(event) => onCategoriaVehicularChange(event.target.value)}
              className={claseConError(CLASE_CAMPO, esError('categoria'))}
              data-campo-error={esError('categoria') ? true : undefined}
              aria-invalid={esError('categoria') ? true : undefined}
              aria-describedby={esError('categoria') ? 'error-categoria' : undefined}
            >
              <option value="">-- SELECCIONAR --</option>
              {categoriasVehiculares.map((categoria) => (
                <option key={categoria.key} value={categoria.key}>{categoria.nombre}</option>
              ))}
            </select>
            <MensajeError campo="categoria" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">CARROCERÍA{required('carroceria') && <span className="text-red-500">*</span>}</label>
            <input name="carroceria" value={formVehiculo.carroceria || ''} onChange={handleVehiculo} {...propsCampo('carroceria', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="carroceria" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">NÚMERO CILINDROS{required('numeroCilindros') && <span className="text-red-500">*</span>}</label>
            <input name="numeroCilindros" value={formVehiculo.numeroCilindros || ''} onChange={handleVehiculo} {...propsCampo('numeroCilindros', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="numeroCilindros" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">CILINDRADA{required('cilindrada') && <span className="text-red-500">*</span>}</label>
            <input name="cilindrada" value={formVehiculo.cilindrada || ''} onChange={handleVehiculo} {...propsCampo('cilindrada', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="cilindrada" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">EJES / RUEDAS *</label>
            <div className="flex gap-2">
                <input name="numeroEjes" value={formVehiculo.numeroEjes || ''} onChange={handleVehiculo} className="w-1/2 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors" placeholder="Ejes" />
                <input name="numeroRuedas" value={formVehiculo.numeroRuedas || ''} onChange={handleVehiculo} className="w-1/2 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors" placeholder="Ruedas" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">ASIENTOS / PASAJEROS *</label>
            <div className="flex gap-2">
                <input name="numeroAsientos" value={formVehiculo.numeroAsientos || ''} onChange={handleVehiculo} className="w-1/2 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors" placeholder="Asientos" />
                <input name="numeroPasajeros" value={formVehiculo.numeroPasajeros || ''} onChange={handleVehiculo} className="w-1/2 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors" placeholder="Pasajeros" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">PESO NETO / BRUTO / UTIL *</label>
            <div className="flex gap-2">
              <input name="pesoNeto" value={formVehiculo.pesoNeto || ''} onChange={handleVehiculo} className="w-1/3 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors" placeholder="Neto" />
              <input name="pesoBruto" value={formVehiculo.pesoBruto || ''} onChange={handleVehiculo} className="w-1/3 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors" placeholder="Bruto" />
              <input name="cargaUtil" value={formVehiculo.cargaUtil || ''} onChange={handleVehiculo} className="w-1/3 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors" placeholder="Util" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">POTENCIA{required('potencia') && <span className="text-red-500">*</span>}</label>
            <input name="potencia" value={formVehiculo.potencia || ''} onChange={handleVehiculo} {...propsCampo('potencia', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="potencia" errores={erroresCampo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">LARGO / ANCHO / ALTO (M) *</label>
            <div className="flex gap-2">
              <input name="longitud" value={formVehiculo.longitud || ''} onChange={handleVehiculo} className="w-1/3 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors" placeholder="Largo" />
              <input name="ancho" value={formVehiculo.ancho || ''} onChange={handleVehiculo} className="w-1/3 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors" placeholder="Ancho" />
              <input name="alto" value={formVehiculo.alto || ''} onChange={handleVehiculo} className="w-1/3 p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors" placeholder="Alto" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">FÓRMULA RODANTE{required('formulaRodante') && <span className="text-red-500">*</span>}</label>
            <input name="formulaRodante" value={formVehiculo.formulaRodante || ''} onChange={handleVehiculo} {...propsCampo('formulaRodante', erroresCampo, CLASE_CAMPO)} />
            <MensajeError campo="formulaRodante" errores={erroresCampo} />
          </div>
        </div>
        {vehiculoOrigen === 'FARENET' && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            Farenet no almacena versión, año modelo, cilindrada, potencia ni fórmula rodante en su ficha vehicular. Estos campos deben completarse y validarse con la tarjeta de propiedad.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <TitularesList
          titulares={titulares}
          setTitulares={setTitulares}
          formFacturacion={formFacturacion}
          setFormFacturacion={setFormFacturacion}
          onRemoveTitular={onRemoveTitular}
          erroresCampo={erroresCampo}
          onCorregirCampo={onCorregirCampo}
        />
      </div>

      {/* 2. SECCIÓN DINÁMICA SEGÚN CERTIFICADO */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h4 className="text-lg font-bold text-[#052a79] capitalize tracking-wider mb-6 border-b pb-2">
          B. INFORMACIÓN ESPECÍFICA:{' '}
          {tipoCertificado === 'GNV_ANUAL' ? 'GNV'
            : tipoCertificado === 'GLP_ANUAL' ? 'GLP'
            : tipoCertificado === 'CONFORMIDAD' ? 'CONFORMIDAD'
            : tipoCertificado || 'NO SELECCIONADO'}
        </h4>

        {/* --- DATOS GLP --- */}
        {tipoCertificado === 'GLP_ANUAL' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">MODALIDAD</label>
                <div className="flex min-h-[42px] items-center justify-between rounded-lg border-2 border-blue-100 bg-blue-50 px-3 py-2">
                  <span className="font-black text-[#052a79]">{modalidadCertificado || 'NO DEFINIDA'}</span>
                  <span className="text-[10px] font-bold capitalize text-blue-500">Seleccionada en datos iniciales</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">VIGENCIA HASTA <span className="text-red-500">*</span></label>
                <input type="date" name="fechaVigencia" value={formGlp.fechaVigencia || ''} onChange={handleGlp} className={claseConError(CLASE_CAMPO, esError('glp.fechaVigencia'))} data-campo-error={esError('glp.fechaVigencia') ? true : undefined} />
            <MensajeError campo="glp.fechaVigencia" errores={erroresCampo} />
              </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">EXPEDIENTE TÉCNICO <span className="text-red-500">*</span></label>
               <input name="expedienteTecnico" value={formGlp.expedienteTecnico || ''} onChange={handleGlp} className={claseConError(CLASE_CAMPO, esError('glp.expedienteTecnico'))} data-campo-error={esError('glp.expedienteTecnico') ? true : undefined} />
            <MensajeError campo="glp.expedienteTecnico" errores={erroresCampo} />
            </div>

            {modalidadCertificado === 'INICIAL' && (
              <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 sm:p-4">
                <h5 className="font-bold text-[#052a79]">CAMBIO REALIZADO EN LA CONVERSIÓN GLP</h5>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Primero confirma cómo ingresó el vehículo. El resultado de la conversión es fijo y no puede ser igual al combustible original.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className={`rounded-xl border bg-white p-4 ${combustibleGlpSinCambio ? 'border-red-400' : 'border-slate-200'}`} data-campo-error={combustibleGlpSinCambio ? true : undefined}>
                    <div className="mb-4 flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-black text-white">1</span>
                      <div>
                        <p className="text-xs font-black text-slate-800">ANTES DE LA CONVERSIÓN</p>
                        <p className="text-[11px] text-slate-500">Datos originales del vehículo</p>
                      </div>
                    </div>

                    <label className="mb-1 block text-xs font-bold text-slate-600">COMBUSTIBLE ORIGINAL <span className="text-red-500">*</span></label>
                    <select
                      name="combustible"
                      value={formVehiculo.combustible || ''}
                      onChange={handleVehiculo}
                      className={claseConError(CLASE_CAMPO, esError('combustible') || combustibleGlpSinCambio)}
                      data-campo-error={(esError('combustible') || combustibleGlpSinCambio) ? true : undefined}
                    >
                      <option value="">-- SELECCIONAR COMBUSTIBLE ORIGINAL --</option>
                      {maestrosVehiculo?.combustibles?.map((c: any) => {
                        const coincideConResultado = combustiblesSonEquivalentes(c.nombre, COMBUSTIBLE_POSTERIOR_GLP);
                        return (
                          <option key={c.key} value={c.nombre} disabled={coincideConResultado}>
                            {c.nombre}{coincideConResultado ? ' — NO VÁLIDO COMO ORIGINAL' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <MensajeError campo="combustible" errores={erroresCampo} />
                    {combustibleGlpSinCambio && !esError('combustible') && (
                      <p role="alert" className="mt-2 text-xs font-bold leading-5 text-red-600">
                        El combustible original no puede ser BI-COMBUSTIBLE GLP porque ese es el resultado de la conversión.
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-[10px] font-bold text-slate-500">PESO NETO ORIGINAL</p>
                        <p className="mt-1 text-sm font-black text-slate-800">{formVehiculo.pesoNeto || '-'} kg</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-[10px] font-bold text-slate-500">CARGA ÚTIL ORIGINAL</p>
                        <p className="mt-1 text-sm font-black text-slate-800">{formVehiculo.cargaUtil || '-'} kg</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-white">2</span>
                      <div>
                        <p className="text-xs font-black text-amber-900">DESPUÉS DE LA CONVERSIÓN</p>
                        <p className="text-[11px] text-amber-700">Resultado que se certificará</p>
                      </div>
                    </div>

                    <div className="mb-4 rounded-lg border border-amber-200 bg-white px-3 py-3">
                      <p className="text-[10px] font-bold text-slate-500">NUEVO COMBUSTIBLE</p>
                      <p className="mt-1 text-sm font-black text-[#052a79]">{COMBUSTIBLE_POSTERIOR_GLP}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-600">NUEVO PESO NETO (kg) <span className="text-red-500">*</span></label>
                        <input type="number" step="0.01" name="pesoNetoPosterior" value={formGlp.pesoNetoPosterior || ''} onChange={handleGlp} className={claseConError(CLASE_CAMPO, esError('glp.pesoNetoPosterior'))} data-campo-error={esError('glp.pesoNetoPosterior') ? true : undefined} placeholder="Ej.: 1450.00" />
                        <MensajeError campo="glp.pesoNetoPosterior" errores={erroresCampo} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-600">NUEVA CARGA ÚTIL (kg) <span className="text-red-500">*</span></label>
                        <input type="number" step="0.01" name="cargaUtilPosterior" value={formGlp.cargaUtilPosterior || ''} onChange={handleGlp} className={claseConError(CLASE_CAMPO, esError('glp.cargaUtilPosterior'))} data-campo-error={esError('glp.cargaUtilPosterior') ? true : undefined} placeholder="Ej.: 149.00" />
                        <MensajeError campo="glp.cargaUtilPosterior" errores={erroresCampo} />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
              <h5 className="mb-3 font-bold text-slate-700">COMPONENTES INSTALADOS GLP</h5>
              <MensajeError campo="glp.componentes" errores={erroresCampo} />
              <div className="mb-2 hidden grid-cols-7 gap-2 text-xs font-bold capitalize text-slate-500 md:grid">
                <div>Componente</div>
                <div>Marca *</div>
                <div>Modelo *</div>
                <div>Cap. (L) *</div>
                <div>Mes *</div>
                <div>Año *</div>
                <div>N° Serie *</div>
              </div>
              {formGlp.componentes?.map((comp: any, idx: number) => (
                <div key={idx} className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 last:mb-0 md:grid md:grid-cols-7 md:gap-2 md:border-0 md:bg-transparent md:p-0">
                  <div className="mb-3 font-bold text-[#052a79] md:mb-0 md:pt-2 md:text-slate-800">
                    <span className="mr-1 text-[10px] text-slate-500 md:hidden">COMPONENTE:</span>{comp.componente}
                  </div>
                  <label className="mb-3 block md:mb-0">
                    <span className="mb-1 block text-[10px] font-bold text-slate-500 md:hidden">MARCA *</span>
                    <input value={comp.marca || ''} onChange={e => handleComponenteGlp(idx, 'marca', e.target.value)} className={claseConError("min-h-10 w-full min-w-0 rounded-md border-2 border-slate-200 p-1.5 font-semibold capitalize text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0", esError(claveComponente('glp', comp.componente, 'marca')))} data-campo-error={esError(claveComponente('glp', comp.componente, 'marca')) ? true : undefined} placeholder="Marca" />
                    <MensajeError campo={claveComponente('glp', comp.componente, 'marca')} errores={erroresCampo} />
                  </label>
                  <label className="mb-3 block md:mb-0">
                    <span className="mb-1 block text-[10px] font-bold text-slate-500 md:hidden">MODELO *</span>
                    <input value={comp.modelo || ''} onChange={e => handleComponenteGlp(idx, 'modelo', e.target.value)} className={claseConError("min-h-10 w-full min-w-0 rounded-md border-2 border-slate-200 p-1.5 font-semibold capitalize text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0", esError(claveComponente('glp', comp.componente, 'modelo')))} data-campo-error={esError(claveComponente('glp', comp.componente, 'modelo')) ? true : undefined} placeholder="Modelo" />
                    <MensajeError campo={claveComponente('glp', comp.componente, 'modelo')} errores={erroresCampo} />
                  </label>
                  {comp.componente === 'REGULADOR' ? (
                    <div className="mb-3 rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 md:col-span-3 md:mb-0 md:bg-transparent md:text-center">
                      <span className="md:hidden">Capacidad y fecha de fabricación: </span>NO APLICA
                    </div>
                  ) : (
                    <>
                      <label className="mb-3 block md:mb-0">
                        <span className="mb-1 block text-[10px] font-bold text-slate-500 md:hidden">CAPACIDAD (L) *</span>
                        <input value={comp.capacidadLitros || ''} onChange={e => handleComponenteGlp(idx, 'capacidadLitros', e.target.value)} className={claseConError("min-h-10 w-full min-w-0 rounded-md border-2 border-slate-200 p-1.5 font-semibold text-slate-800 focus:border-[#f59e0b] focus:ring-0", esError(claveComponente('glp', comp.componente, 'capacidadLitros')))} data-campo-error={esError(claveComponente('glp', comp.componente, 'capacidadLitros')) ? true : undefined} placeholder="Litros" />
                        <MensajeError campo={claveComponente('glp', comp.componente, 'capacidadLitros')} errores={erroresCampo} />
                      </label>
                      <label className="mb-3 block md:mb-0">
                        <span className="mb-1 block text-[10px] font-bold text-slate-500 md:hidden">MES *</span>
                        <input value={comp.mesFabricacion || ''} onChange={e => handleComponenteGlp(idx, 'mesFabricacion', e.target.value)} className={claseConError("min-h-10 w-full min-w-0 rounded-md border-2 border-slate-200 p-1.5 font-semibold text-slate-800 focus:border-[#f59e0b] focus:ring-0", esError(claveComponente('glp', comp.componente, 'mesFabricacion')))} data-campo-error={esError(claveComponente('glp', comp.componente, 'mesFabricacion')) ? true : undefined} placeholder="Mes" />
                        <MensajeError campo={claveComponente('glp', comp.componente, 'mesFabricacion')} errores={erroresCampo} />
                      </label>
                      <label className="mb-3 block md:mb-0">
                        <span className="mb-1 block text-[10px] font-bold text-slate-500 md:hidden">AÑO *</span>
                        <input value={comp.anioFabricacion || ''} onChange={e => handleComponenteGlp(idx, 'anioFabricacion', e.target.value)} className={claseConError("min-h-10 w-full min-w-0 rounded-md border-2 border-slate-200 p-1.5 font-semibold capitalize text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0", esError(claveComponente('glp', comp.componente, 'anioFabricacion')))} data-campo-error={esError(claveComponente('glp', comp.componente, 'anioFabricacion')) ? true : undefined} placeholder="Año" />
                        <MensajeError campo={claveComponente('glp', comp.componente, 'anioFabricacion')} errores={erroresCampo} />
                      </label>
                    </>
                  )}
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold text-slate-500 md:hidden">N° SERIE *</span>
                    <input value={comp.numeroSerie || ''} onChange={e => handleComponenteGlp(idx, 'numeroSerie', e.target.value)} className={claseConError("min-h-10 w-full min-w-0 rounded-md border-2 border-slate-200 p-1.5 font-semibold capitalize text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0", esError(claveComponente('glp', comp.componente, 'numeroSerie')))} data-campo-error={esError(claveComponente('glp', comp.componente, 'numeroSerie')) ? true : undefined} placeholder="N° Serie" />
                    <MensajeError campo={claveComponente('glp', comp.componente, 'numeroSerie')} errores={erroresCampo} />
                  </label>
                </div>
              ))}
            </div>

            <div>
              <div className={claseConError("mb-3 rounded-lg border border-blue-200 bg-blue-50 p-4", esError('glp.verificaciones'))} data-campo-error={esError('glp.verificaciones') ? true : undefined}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h5 className="font-bold text-[#052a79]">VERIFICACIONES DE SEGURIDAD GLP</h5>
                    <p className="mt-1 text-xs leading-5 text-blue-800">Si toda la inspección es conforme, usa este único botón. Después sólo modifica el punto que presente una observación.</p>
                  </div>
                  <button
                    type="button"
                    onClick={marcarTodasGlpComoCumple}
                    className="w-full shrink-0 rounded-lg bg-emerald-600 px-4 py-3 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto"
                  >
                    ✓ MARCAR LAS {verificacionesGlp.length || 7} COMO CUMPLE
                  </button>
                </div>
                <p className={`mt-3 text-xs font-bold ${
                  todasVerificacionesGlpCumplen
                    ? 'text-emerald-700'
                    : existeVerificacionGlpNoCumple
                      ? 'text-red-700'
                      : 'text-amber-700'
                }`}>
                  {todasVerificacionesGlpCumplen
                    ? 'Resultado: todos los puntos cumplen.'
                    : existeVerificacionGlpNoCumple
                      ? 'Resultado: existen puntos que no cumplen.'
                      : 'Resultado pendiente de evaluación.'}
                </p>
                <MensajeError campo="glp.verificaciones" errores={erroresCampo} />
              </div>
              <div className="space-y-2">
                {verificacionesGlp.map((verif: any, idx: number) => (
                  <div key={idx} className={`flex flex-col gap-2 rounded-lg border p-3 ${
                    verif.cumple === false
                      ? 'border-red-300 bg-red-50'
                      : verif.cumple === true
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-sm font-semibold leading-5 text-slate-800">{verif.codigo}) {verif.descripcion}</p>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                          verif.cumple === false
                            ? 'bg-red-100 text-red-700'
                            : verif.cumple === true
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}>
                          {verif.cumple === false ? 'NO CUMPLE' : verif.cumple === true ? 'CUMPLE' : 'PENDIENTE'}
                        </span>
                        <button
                          type="button"
                          onClick={() => alternarIncumplimientoEnGlp(idx)}
                          className={`rounded-md border px-2.5 py-1 text-[10px] font-bold transition ${
                            verif.cumple === false
                              ? 'border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50'
                              : 'border-red-200 bg-white text-red-600 hover:bg-red-50'
                          }`}
                        >
                          {verif.cumple === false ? 'MARCAR CUMPLE' : 'REPORTAR NO CUMPLE'}
                        </button>
                      </div>
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">MODALIDAD</label>
                <div className="flex min-h-[42px] items-center justify-between rounded-lg border-2 border-blue-100 bg-blue-50 px-3 py-2">
                  <span className="font-black text-[#052a79]">{modalidadCertificado || 'NO DEFINIDA'}</span>
                  <span className="text-[10px] font-bold capitalize text-blue-500">Seleccionada en datos iniciales</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">VIGENCIA HASTA <span className="text-red-500">*</span></label>
                <input type="date" name="fechaVigencia" value={formGnv.fechaVigencia || ''} onChange={handleGnv} className={claseConError(CLASE_CAMPO, esError('gnv.fechaVigencia'))} data-campo-error={esError('gnv.fechaVigencia') ? true : undefined} />
            <MensajeError campo="gnv.fechaVigencia" errores={erroresCampo} />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-500 mb-1">OBSERVACIONES GNV (Opcional) <span className="font-normal text-slate-400">({formGnv.observaciones?.length || 0}/250)</span></label>
              <input
                name="observaciones"
                value={formGnv.observaciones || ''}
                onChange={handleGnv}
                maxLength={250}
                className={claseConError(CLASE_CAMPO, esError('gnv.observaciones'))} data-campo-error={esError('gnv.observaciones') ? true : undefined}
                placeholder="EJ: NINGUNA"
              />
            </div>

            {modalidadCertificado === 'INICIAL' && (
              <>
                {/* CARACTERÍSTICAS DE CONVERSIÓN GNV */}
                <div className="mt-8">
                  <h5 className="mb-1 border-b border-blue-100 pb-2 font-bold text-[#052a79]">CAMBIO REALIZADO EN LA CONVERSIÓN GNV</h5>
                  <p className="mb-3 text-xs text-slate-500">
                    Verifique el dato original y registre cómo queda el vehículo. El valor de después no puede ser igual al de antes.
                  </p>

                  <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr]">
                    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h6 className="text-xs font-black text-slate-700">1. ANTES DE LA CONVERSIÓN</h6>
                        <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600">DATO ORIGINAL</span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-500">COMBUSTIBLE</label>
                          <div className="min-h-[38px] rounded border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                            {formVehiculo.combustible || 'SIN REGISTRAR'}
                          </div>
                          <p className="mt-1 text-[10px] text-slate-400">Se toma de los datos del vehículo.</p>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-slate-500">PESO NETO (kg)</label>
                          <div className="min-h-[38px] rounded border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                            {formVehiculo.pesoNeto || 'SIN REGISTRAR'}
                          </div>
                        </div>
                      </div>
                    </section>

                    <div className="flex items-center justify-center text-2xl font-black text-amber-500" aria-hidden="true">
                      <span className="hidden lg:inline">→</span>
                      <span className="lg:hidden">↓</span>
                    </div>

                    <section className="rounded-lg border-2 border-amber-200 bg-amber-50/40 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h6 className="text-xs font-black text-amber-900">2. DESPUÉS DE LA CONVERSIÓN</h6>
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">DEBE CAMBIAR</span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-amber-900">COMBUSTIBLE RESULTANTE *</label>
                          <select
                            name="combustiblePosterior"
                            value={formGnv.combustiblePosterior || ''}
                            onChange={handleGnv}
                            className={claseConError(CLASE_TABLA, esError('gnv.combustiblePosterior') || combustibleGnvSinCambio)}
                            data-campo-error={(esError('gnv.combustiblePosterior') || combustibleGnvSinCambio) ? true : undefined}
                          >
                            <option value="">-- SELECCIONE EL RESULTADO --</option>
                            <option
                              value="BI - COMBUSTIBLE GNV"
                              disabled={combustiblesGnvSonEquivalentes(formVehiculo.combustible, 'BI - COMBUSTIBLE GNV')}
                            >
                              BI - COMBUSTIBLE GNV
                            </option>
                            <option
                              value="DUAL GNV"
                              disabled={combustiblesGnvSonEquivalentes(formVehiculo.combustible, 'DUAL GNV')}
                            >
                              DUAL GNV
                            </option>
                          </select>
                          {combustibleGnvSinCambio ? (
                            <p className="mt-1 text-xs font-semibold text-red-600">El resultado no puede ser el mismo combustible original.</p>
                          ) : (
                            <MensajeError campo="gnv.combustiblePosterior" errores={erroresCampo} />
                          )}
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-amber-900">NUEVO PESO NETO (kg) *</label>
                          <input
                            name="pesoNetoPosterior"
                            value={formGnv.pesoNetoPosterior || ''}
                            onChange={handleGnv}
                            inputMode="decimal"
                            className={claseConError(CLASE_TABLA, esError('gnv.pesoNetoPosterior') || pesoGnvSinCambio)}
                            data-campo-error={(esError('gnv.pesoNetoPosterior') || pesoGnvSinCambio) ? true : undefined}
                            placeholder="Ej. 1453"
                          />
                          {pesoGnvSinCambio ? (
                            <p className="mt-1 text-xs font-semibold text-red-600">El nuevo peso no puede ser igual al peso original.</p>
                          ) : (
                            <MensajeError campo="gnv.pesoNetoPosterior" errores={erroresCampo} />
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>

                {/* COMPONENTES INSTALADOS GNV */}
                <div className="mt-8">
                  <h5 className="font-bold text-[#052a79] mb-3 border-b border-blue-100 pb-2">COMPONENTES INSTALADOS GNV</h5>
                  <MensajeError campo="gnv.componentes" errores={erroresCampo} />
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="p-2 font-bold w-12 text-center">N°</th>
                          <th className="p-2 font-bold w-32">COMPONENTE</th>
                          <th className="p-2 font-bold w-[20%]">MARCA *</th>
                          <th className="p-2 font-bold w-[20%]">N° DE SERIE *</th>
                          <th className="p-2 font-bold w-[20%]">CAP. (Lts) *</th>
                          <th className="p-2 font-bold w-[20%]">FECHA FAB. (MM/AA) *</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formGnv.componentes?.map((comp: any, idx: number) => (
                          <tr key={idx} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                            <td className="p-2 text-center font-bold text-slate-400">{comp.orden}</td>
                            <td className="p-2 font-bold text-slate-700">{comp.componente}</td>
                            <td className="p-2">
                              <input value={comp.marca || ''} onChange={e => handleComponenteGnv(idx, 'marca', e.target.value)} className={claseConError("w-full p-1.5 border-2 border-slate-200 rounded capitalize font-semibold focus:border-[#f59e0b] focus:ring-0", esError(claveComponente('gnv', comp.componente, 'marca')))} data-campo-error={esError(claveComponente('gnv', comp.componente, 'marca')) ? true : undefined} placeholder="Marca" />
                              <MensajeError campo={claveComponente('gnv', comp.componente, 'marca')} errores={erroresCampo} />
                            </td>
                            <td className="p-2">
                              <input value={comp.numeroSerie || ''} onChange={e => handleComponenteGnv(idx, 'numeroSerie', e.target.value)} className={claseConError("w-full p-1.5 border-2 border-slate-200 rounded capitalize font-semibold focus:border-[#f59e0b] focus:ring-0", esError(claveComponente('gnv', comp.componente, 'numeroSerie')))} data-campo-error={esError(claveComponente('gnv', comp.componente, 'numeroSerie')) ? true : undefined} placeholder="N° Serie" />
                              <MensajeError campo={claveComponente('gnv', comp.componente, 'numeroSerie')} errores={erroresCampo} />
                            </td>
                            <td className="p-2">
                              {comp.capacidadLitros !== 'NO APLICA' && comp.capacidadLitros !== undefined && comp.capacidadLitros !== '' ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    value={comp.capacidadLitros.trim()}
                                    onChange={e => handleComponenteGnv(idx, 'capacidadLitros', e.target.value)}
                                    className={claseConError("w-full p-1.5 border-2 border-amber-300 rounded capitalize font-bold text-slate-800 focus:border-amber-500 focus:ring-0 text-xs", esError(claveComponente('gnv', comp.componente, 'capacidadLitros')))}
                                    data-campo-error={esError(claveComponente('gnv', comp.componente, 'capacidadLitros')) ? true : undefined}
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
                                  className={claseConError("w-full p-1.5 border-2 border-amber-300 rounded text-slate-800 font-bold focus:border-amber-500 focus:ring-0 text-[10px] capitalize", esError(claveComponente('gnv', comp.componente, 'capacidadLitros')))}
                                  data-campo-error={esError(claveComponente('gnv', comp.componente, 'capacidadLitros')) ? true : undefined}
                                >
                                  <option value="">-- SELECCIONAR --</option>
                                  <option value="NO APLICA">NO APLICA</option>
                                  <option value="ESPECIFICAR">COMPLETAR...</option>
                                </select>
                              )}
                              <MensajeError campo={claveComponente('gnv', comp.componente, 'capacidadLitros')} errores={erroresCampo} />
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
                                className={claseConError("w-full p-1.5 border-2 border-slate-200 rounded text-center font-semibold focus:border-[#f59e0b] focus:ring-0", esError(claveComponente('gnv', comp.componente, 'fechaFabricacion')))}
                                data-campo-error={esError(claveComponente('gnv', comp.componente, 'fechaFabricacion')) ? true : undefined}
                              />
                              <MensajeError campo={claveComponente('gnv', comp.componente, 'fechaFabricacion')} errores={erroresCampo} />
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
                <div className={claseConError("mb-3 mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4", esError('gnv.verificaciones'))} data-campo-error={esError('gnv.verificaciones') ? true : undefined}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h5 className="font-bold text-[#052a79]">VERIFICACIONES DE INSPECCIÓN ANUAL GNV</h5>
                    <p className="mt-1 text-xs text-blue-800">Si la inspección es conforme, usa un solo botón. Sólo modifica el punto que presente una observación.</p>
                  </div>
                  <button
                    type="button"
                    onClick={marcarTodasGnvComoCumple}
                    className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    ✓ MARCAR LOS 8 COMO CUMPLE
                  </button>
                </div>
                <p className={`mt-3 text-xs font-bold ${
                  todasVerificacionesGnvCumplen
                    ? 'text-emerald-700'
                    : existeVerificacionGnvNoCumple
                      ? 'text-red-700'
                      : 'text-amber-700'
                }`}>
                  {todasVerificacionesGnvCumplen
                    ? 'Resultado: todos los puntos cumplen.'
                    : existeVerificacionGnvNoCumple
                      ? 'Resultado: existen puntos que no cumplen.'
                        : 'Resultado pendiente de evaluación.'}
                </p>
                <MensajeError campo="gnv.verificaciones" errores={erroresCampo} />
              </div>

              <div className="space-y-2">
                {verificacionesGnv.map((verif: any, idx: number) => (
                  <div key={idx} className={`flex flex-col gap-2 rounded-lg border p-3 ${
                    verif.cumple === false
                      ? 'border-red-300 bg-red-50'
                      : verif.cumple === true
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <p className="text-sm font-semibold leading-5 text-slate-800">{verif.codigo}) {verif.descripcion}</p>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                          verif.cumple === false
                            ? 'bg-red-100 text-red-700'
                            : verif.cumple === true
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}>
                          {verif.cumple === false ? 'NO CUMPLE' : verif.cumple === true ? 'CUMPLE' : 'PENDIENTE'}
                        </span>
                        <button
                          type="button"
                          onClick={() => alternarIncumplimiento(idx)}
                          className={`rounded-md border px-2.5 py-1 text-[10px] font-bold transition ${
                            verif.cumple === false
                              ? 'border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50'
                              : 'border-red-200 bg-white text-red-600 hover:bg-red-50'
                          }`}
                        >
                          {verif.cumple === false ? 'MARCAR CUMPLE' : 'REPORTAR NO CUMPLE'}
                        </button>
                      </div>
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
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <p className="font-bold">Completa los 6 datos que aparecerán en el certificado.</p>
              <p className="mt-1 text-xs leading-5 text-blue-800">Primero indica el trabajo realizado; después explica qué característica se certifica y por qué.</p>
            </div>

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h5 className="mb-4 font-bold text-[#052a79]">1. Tipo de trabajo realizado</h5>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">¿QUÉ TRABAJO SE CERTIFICA?{required('conformidad.tipoConformidad')}</label>
                  <select name="tipoConformidad" value={formConformidad.tipoConformidad || ''} onChange={handleConformidad} className={claseConError(CLASE_CAMPO, esError('conformidad.tipoConformidad'))} data-campo-error={esError('conformidad.tipoConformidad') ? true : undefined}>
                    <option value="">SELECCIONAR TIPO</option>
                    <option value="MODIFICACION">MODIFICACIÓN</option>
                    <option value="MONTAJE">MONTAJE</option>
                    <option value="FABRICACION">FABRICACIÓN</option>
                  </select>
                  <MensajeError campo="conformidad.tipoConformidad" errores={erroresCampo} />
                  <p className="mt-1 text-xs text-slate-500">Selecciona una sola opción.</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">TRÁMITE SOLICITADO{required('conformidad.tipoTramite')}</label>
                  <input name="tipoTramite" value={formConformidad.tipoTramite || ''} onChange={handleConformidad} className={claseConError(CLASE_CAMPO, esError('conformidad.tipoTramite'))} data-campo-error={esError('conformidad.tipoTramite') ? true : undefined} placeholder="EJ.: RECTIFICACIÓN DE CARACTERÍSTICAS" />
                  <MensajeError campo="conformidad.tipoTramite" errores={erroresCampo} />
                  <p className="mt-1 text-xs text-slate-500">Escribe el nombre del trámite presentado.</p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h5 className="mb-4 font-bold text-[#052a79]">2. Detalle que aparecerá en el certificado</h5>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">¿QUÉ CARACTERÍSTICA SE CERTIFICA?{required('conformidad.caracteristicaRegistrable')}</label>
                  <input name="caracteristicaRegistrable" value={formConformidad.caracteristicaRegistrable || ''} onChange={handleConformidad} maxLength={300} className={claseConError(CLASE_CAMPO, esError('conformidad.caracteristicaRegistrable'))} data-campo-error={esError('conformidad.caracteristicaRegistrable') ? true : undefined} placeholder="EJ.: NÚMERO DE EJES, CARROCERÍA O PESO" />
                  <MensajeError campo="conformidad.caracteristicaRegistrable" errores={erroresCampo} />
                  <p className="mt-1 text-xs text-slate-500">Indica el dato registrable que se está verificando o corrigiendo.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">MOTIVO DE LA SOLICITUD{required('conformidad.motivo')}</label>
                    <input name="motivo" value={formConformidad.motivo || ''} onChange={handleConformidad} className={claseConError(CLASE_CAMPO, esError('conformidad.motivo'))} data-campo-error={esError('conformidad.motivo') ? true : undefined} placeholder="EJ.: DATO INCORRECTO EN LA TARJETA" />
                    <MensajeError campo="conformidad.motivo" errores={erroresCampo} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">USO ORIGINAL DEL VEHÍCULO{required('conformidad.usoOriginalVehiculo')}</label>
                    <input name="usoOriginalVehiculo" value={formConformidad.usoOriginalVehiculo || ''} onChange={handleConformidad} className={claseConError(CLASE_CAMPO, esError('conformidad.usoOriginalVehiculo'))} data-campo-error={esError('conformidad.usoOriginalVehiculo') ? true : undefined} placeholder="EJ.: TRANSPORTE DE PERSONAS" />
                    <MensajeError campo="conformidad.usoOriginalVehiculo" errores={erroresCampo} />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">DESCRIPCIÓN COMPLEMENTARIA{required('conformidad.descripcion')}</label>
                  <textarea name="descripcion" value={formConformidad.descripcion || ''} onChange={handleConformidad} maxLength={500} rows={3} className={claseConError(`${CLASE_CAMPO} resize-y normal-case`, esError('conformidad.descripcion'))} data-campo-error={esError('conformidad.descripcion') ? true : undefined} placeholder="DESCRIBE BREVEMENTE LA MODIFICACIÓN, MONTAJE O FABRICACIÓN REALIZADA." />
                  <MensajeError campo="conformidad.descripcion" errores={erroresCampo} />
                  <p className="mt-1 text-right text-xs text-slate-400">{String(formConformidad.descripcion || '').length}/500</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
