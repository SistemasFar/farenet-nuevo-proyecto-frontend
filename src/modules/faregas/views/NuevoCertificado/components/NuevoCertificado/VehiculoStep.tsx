/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { TipoCertificadoFaregas } from '../../../../types/faregas';
import { TitularesList, type TitularState } from './TitularesList';
import { DatosFacturacion } from './DatosFacturacion';
import React, { useEffect } from 'react';
import type { FormFacturacionState } from '../../NuevoCertificadoView';
import type { MaestroOption } from '@/types/maestros';
import {
  formatVIN,
  formatAlfanumerico,
  formatFormulaRodante,
  formatDecimal,
  formatAlfanumericoConEspacios,
  formatMes,
  formatAnio,
  formatPeriodoFabricacion,
  descomponerPeriodoFabricacion,
  presentarPeriodoFabricacion
} from '../../../../utils/vehiculo-formatters';
import { MensajeError, propsCampo, claseConError, type ErroresCampo } from '../../faregas-wizard-errores';
import { camposObligatoriosVisibles } from '../../faregas-wizard.validation';
import { alternarIncumplimientoGnv, marcarTodasVerificacionesGnvComoCumple } from '../../gnv-verificaciones';
import { alternarIncumplimientoGlp, marcarTodasVerificacionesGlpComoCumple } from '../../glp-verificaciones';
import { combustiblesGnvSonEquivalentes, combustiblesSonEquivalentes, pesosGnvSonIguales } from '../../gnv-conversion';
import {
  obtenerCamposVehiculoCertificado,
  resolverServicioConformidad,
  USOS_ORIGINALES_CATALOGO,
} from '../../faregas-certificado-campos';
import { CamposVehiculoCertificado } from './CamposVehiculoCertificado';
import { normalizarEnteroCertificado } from '../../faregas-formulario-operativo';

/** Clase original de los campos del paso; el error sólo sustituye el color. */
const CLASE_CAMPO = 'w-full p-2 border-2 border-slate-200 rounded-lg text-slate-800 font-semibold focus:border-[#f59e0b] focus:ring-0 capitalize transition-colors';

/** Clase original de los campos dentro de la tabla de conversión antes/después. */
const CLASE_TABLA = 'w-full p-1.5 border-2 border-amber-300 rounded text-slate-800 font-bold focus:border-amber-500 focus:ring-0 text-xs';
const COMBUSTIBLE_POSTERIOR_GLP = 'BI-COMBUSTIBLE GLP';
const COMBUSTIBLES_GLP_ANUAL = new Set(['BI-COMBUSTIBLE GLP', 'GLP']);

const normalizarCombustibleGlpAnual = (valor: unknown) => {
  const normalizado = String(valor || '')
    .trim()
    .toUpperCase()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ');
  if (normalizado === 'BI COMBUSTIBLE GLP') return 'BI-COMBUSTIBLE GLP';
  return COMBUSTIBLES_GLP_ANUAL.has(normalizado) ? normalizado : COMBUSTIBLE_POSTERIOR_GLP;
};

interface VehiculoStepProps {
  tipoCertificado: TipoCertificadoFaregas;
  modalidadCertificado: string;
  servicioCodigo?: string;
  servicioNombre?: string;
  numeroCertificadoOficial?: string | null;
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
  servicioCodigo,
  servicioNombre,
  numeroCertificadoOficial = null,
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
  const camposVehiculoCertificado = React.useMemo(
    () => obtenerCamposVehiculoCertificado(tipoCertificado, modalidadCertificado),
    [tipoCertificado, modalidadCertificado]
  );
  const resolucionConformidad = React.useMemo(
    () => resolverServicioConformidad(servicioCodigo, servicioNombre),
    [servicioCodigo, servicioNombre]
  );

  React.useEffect(() => {
    if (tipoCertificado !== 'CONFORMIDAD') return;
    setFormConformidad((prev: any) => {
      let cambio = false;
      const act = { ...prev };
      if (resolucionConformidad.esCambioDeMotor) {
        if (act.caracteristicaRegistrable !== 'CAMBIO DE MOTOR') {
          act.caracteristicaRegistrable = 'CAMBIO DE MOTOR';
          cambio = true;
        }
      }
      if (!act.tipoConformidad) {
        act.tipoConformidad = resolucionConformidad.tipoTrabajoSugerido || 'MODIFICACION';
        cambio = true;
      }
      if (!act.usoOriginalVehiculo) {
        act.usoOriginalVehiculo = resolucionConformidad.usoOriginalSugerido || 'PERSONAS';
        cambio = true;
      }
      return cambio ? act : prev;
    });
  }, [tipoCertificado, resolucionConformidad, setFormConformidad]);
  const esGlpAnual = tipoCertificado === 'GLP_ANUAL'
    && String(modalidadCertificado || '').toUpperCase() === 'ANUAL';

  React.useEffect(() => {
    if (!esGlpAnual) return;
    const combustible = normalizarCombustibleGlpAnual(formVehiculo.combustible);
    if (combustible === formVehiculo.combustible) return;
    setFormVehiculo((prev: any) => ({ ...prev, combustible }));
  }, [esGlpAnual, formVehiculo.combustible, setFormVehiculo]);
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
    && combustiblesGnvSonEquivalentes(formVehiculo.combustible, 'BI - COMBUSTIBLE GNV');
  const pesoGnvSinCambio = modalidadCertificado === 'INICIAL'
    && pesosGnvSonIguales(formVehiculo.pesoNeto, formGnv.pesoNetoPosterior);
  const combustibleGlpSinCambio = modalidadCertificado === 'INICIAL'
    && combustiblesSonEquivalentes(formVehiculo.combustible, COMBUSTIBLE_POSTERIOR_GLP);

  // Initialize verificaciones based on catalog
  useEffect(() => {
    if (tipoCertificado === 'GNV_ANUAL' && modalidadCertificado === 'ANUAL' && catalogoVerificaciones?.GNV_ANUAL && (!formGnv.verificaciones || formGnv.verificaciones.length === 0)) {
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
    if (tipoCertificado === 'GNV_ANUAL' && modalidadCertificado === 'INICIAL') {
      if (faltanComponentesGnv) {
        setFormGnv((prev: any) => ({
          ...prev,
          combustiblePosterior: 'BI - COMBUSTIBLE GNV',
          componentes: [
            { orden: 1, componente: 'REDUCTOR', marca: '', modelo: '', capacidadLitros: 'NO APLICA', modoCapacidad: 'NO_APLICA', mesFabricacion: '', anioFabricacion: '', numeroSerie: '' },
            { orden: 2, componente: 'CILINDRO', marca: '', modelo: '', capacidadLitros: '', modoCapacidad: 'VALOR', mesFabricacion: '', anioFabricacion: '', numeroSerie: '' }
          ]
        }));
      } else if (!formGnv.combustiblePosterior || formGnv.combustiblePosterior !== 'BI - COMBUSTIBLE GNV') {
        setFormGnv((prev: any) => ({
          ...prev,
          combustiblePosterior: 'BI - COMBUSTIBLE GNV'
        }));
      }
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
        finalValue = formatAlfanumericoConEspacios(finalValue, 30); break;
      case 'formulaRodante': finalValue = formatFormulaRodante(finalValue); break;
      case 'numeroCilindros':
      case 'numeroEjes':
      case 'numeroRuedas':
      case 'numeroAsientos':
      case 'numeroPasajeros':
        finalValue = normalizarEnteroCertificado(finalValue, 4); break;
      case 'anioFabricacion':
      case 'anioModelo':
        finalValue = formatAnio(finalValue); break;
      case 'cilindrada':
        finalValue = normalizarEnteroCertificado(finalValue, 5); break;
      case 'pesoNeto':
      case 'pesoBruto':
      case 'cargaUtil':
        finalValue = normalizarEnteroCertificado(finalValue, 6); break;
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
      finalValue = normalizarEnteroCertificado(finalValue, 6);
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
      finalValue = normalizarEnteroCertificado(finalValue, 6);
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
          finalValue = formatAlfanumericoConEspacios(finalValue, 30);
        } else if (campo === 'capacidadLitros') {
          finalValue = normalizarEnteroCertificado(finalValue, 5);
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

  const handlePeriodoFabricacionGlp = (idx: number, valor: string) => {
    const componente = formGlp.componentes?.[idx]?.componente;
    if (componente) {
      limpiar(claveComponente('glp', componente, 'anioFabricacion'));
      limpiar(claveComponente('glp', componente, 'mesFabricacion'));
    }

    const periodoFabricacionInput = formatPeriodoFabricacion(valor);
    const { mes, anio } = descomponerPeriodoFabricacion(periodoFabricacionInput);
    setFormGlp((prev: any) => {
      const componentes = [...(prev.componentes || [])];
      componentes[idx] = {
        ...componentes[idx],
        periodoFabricacionInput,
        mesFabricacion: mes,
        anioFabricacion: anio,
      };
      return { ...prev, componentes };
    });
  };

  const handleModoCapacidadGnv = (idx: number, nuevoModo: 'VALOR' | 'NO_APLICA') => {
    const componente = formGnv.componentes?.[idx]?.componente;
    if (componente) {
      limpiar(claveComponente('gnv', componente, 'capacidadLitros'));
    }
    setFormGnv((prev: any) => {
      const nc = [...(prev.componentes || [])];
      const actual = nc[idx];
      if (!actual) return prev;
      if (nuevoModo === 'NO_APLICA') {
        nc[idx] = {
          ...actual,
          modoCapacidad: 'NO_APLICA',
          capacidadLitros: 'NO APLICA'
        };
      } else {
        const capacidadActual = actual.capacidadLitros === 'NO APLICA' ? '' : (actual.capacidadLitros || '');
        nc[idx] = {
          ...actual,
          modoCapacidad: 'VALOR',
          capacidadLitros: capacidadActual
        };
      }
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
          finalValue = formatAlfanumericoConEspacios(finalValue, 30);
        } else if (campo === 'capacidadLitros' && finalValue !== 'NO APLICA' && finalValue !== ' ' && finalValue !== 'ESPECIFICAR') {
          finalValue = normalizarEnteroCertificado(finalValue, 5);
        }
      }
      nc[idx] = {
        ...nc[idx],
        [campo]: finalValue,
        ...(campo === 'capacidadLitros' && finalValue !== 'NO APLICA' ? { modoCapacidad: 'VALOR' } : {})
      };
      return { ...prev, componentes: nc };
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 1. PROPIETARIO Y FACTURACIÓN (CONFORMIDAD) */}
      {tipoCertificado === 'CONFORMIDAD' && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-seccion-conformidad="propietario">
            <TitularesList
              titulares={titulares}
              setTitulares={setTitulares}
              formFacturacion={formFacturacion}
              setFormFacturacion={setFormFacturacion}
              onRemoveTitular={onRemoveTitular}
              erroresCampo={erroresCampo}
              onCorregirCampo={onCorregirCampo}
              mostrarTitulares={true}
              mostrarFacturacion={false}
              mostrarDireccionTitular={true}
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-seccion-conformidad="facturacion">
            <DatosFacturacion
              titulares={titulares}
              formFacturacion={formFacturacion}
              setFormFacturacion={setFormFacturacion}
              erroresCampo={erroresCampo}
              onCorregirCampo={onCorregirCampo}
            />
          </div>
        </>
      )}

      {/* 1. DATOS PARA FACTURACIÓN (GNV: INICIAL Y ANUAL NO MUESTRAN PROPIETARIO) */}
      {tipoCertificado === 'GNV_ANUAL' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-seccion-gnv="facturacion">
          <DatosFacturacion
            titulares={titulares}
            formFacturacion={formFacturacion}
            setFormFacturacion={setFormFacturacion}
            erroresCampo={erroresCampo}
            onCorregirCampo={onCorregirCampo}
          />
        </div>
      )}

      {/* 1. SECCIÓN GENERAL DEL VEHÍCULO */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h4 className="text-lg font-bold text-slate-800 capitalize tracking-wider mb-6 border-b pb-2">
          {tipoCertificado === 'GLP_ANUAL' ? 'A. DATOS DEL CERTIFICADO / VEHÍCULO' : 'A. DATOS DEL VEHÍCULO'}
        </h4>
        {tipoCertificado === 'GLP_ANUAL' && (
          <>
            <div
              className="mb-6"
              data-seccion-glp-anual={esGlpAnual ? 'propietario' : undefined}
              data-seccion-glp-inicial={!esGlpAnual ? 'propietario' : undefined}
            >
              <TitularesList
                titulares={titulares}
                setTitulares={setTitulares}
                formFacturacion={formFacturacion}
                setFormFacturacion={setFormFacturacion}
                onRemoveTitular={onRemoveTitular}
                erroresCampo={erroresCampo}
                onCorregirCampo={onCorregirCampo}
                mostrarTitulares={true}
                mostrarFacturacion={false}
                integrarPropietarioGlpAnual={true}
              />
            </div>
            <div
              className="mb-6"
              data-seccion-glp-anual={esGlpAnual ? 'facturacion' : undefined}
              data-seccion-glp-inicial={!esGlpAnual ? 'facturacion' : undefined}
            >
              <DatosFacturacion
                titulares={titulares}
                formFacturacion={formFacturacion}
                setFormFacturacion={setFormFacturacion}
                erroresCampo={erroresCampo}
                onCorregirCampo={onCorregirCampo}
              />
            </div>
          </>
        )}
        <div className="mb-4 flex items-center justify-end gap-2">
          {tipoCertificado === 'GNV_ANUAL' && modalidadCertificado === 'INICIAL' && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-[#052a79]">
              MODALIDAD: INICIAL
            </span>
          )}
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-[#052a79]">
            ORIGEN: {vehiculoOrigen}{['FARENET', 'FAREGAS', 'MIXTO'].includes(vehiculoOrigen) ? ' (EDITABLE)' : ''}
          </span>
        </div>
        <CamposVehiculoCertificado
          campos={camposVehiculoCertificado}
          formVehiculo={formVehiculo}
          onChange={handleVehiculo}
          categoriaVehicular={categoriaVehicular}
          categoriasVehiculares={categoriasVehiculares}
          onCategoriaVehicularChange={onCategoriaVehicularChange}
          erroresCampo={erroresCampo}
          obligatorios={obligatorio}
          esGlpInicial={tipoCertificado === 'GLP_ANUAL' && String(modalidadCertificado || '').toUpperCase() === 'INICIAL'}
          maestrosVehiculo={maestrosVehiculo}
        />
        {camposVehiculoCertificado.length === 0 && <>
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
        </>}
      </div>

      {/* 2. SECCIÓN DINÁMICA SEGÚN CERTIFICADO */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h4 className="text-lg font-bold text-[#052a79] capitalize tracking-wider mb-6 border-b pb-2">
          {tipoCertificado === 'GLP_ANUAL'
            ? 'B. COMPONENTES INSTALADOS GLP'
            : (tipoCertificado === 'GNV_ANUAL' && modalidadCertificado === 'INICIAL')
              ? 'B. COMPONENTES INSTALADOS GNV'
              : <>B. INFORMACIÓN ESPECÍFICA:{' '}
                {tipoCertificado === 'GNV_ANUAL' ? 'GNV'
                  : tipoCertificado === 'GLP_ANUAL' ? 'GLP'
                  : tipoCertificado === 'CONFORMIDAD' ? 'CONFORMIDAD'
                  : tipoCertificado || 'NO SELECCIONADO'}
              </>}
        </h4>

        {/* --- DATOS GLP --- */}
        {tipoCertificado === 'GLP_ANUAL' && (
          <div className="space-y-6">

            {/* B. TABLA COMPONENTES GLP */}
            <div
              className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
              data-seccion-glp-anual={esGlpAnual ? 'componentes' : undefined}
              data-seccion-glp-inicial={!esGlpAnual ? 'componentes' : undefined}
            >
              <div className="mb-3 flex items-center justify-between border-b pb-2">
                <h5 className="font-bold text-slate-800">COMPONENTES INSTALADOS GLP</h5>
                <span className="text-[11px] font-bold text-slate-500">TABLA DEL CERTIFICADO</span>
              </div>
              <MensajeError campo="glp.componentes" errores={erroresCampo} />

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                       <th className="p-2 text-center w-12">ÍTEM</th>
                       <th className="p-2 w-32">COMPONENTE</th>
                       <th className="p-2 w-44">MARCA *</th>
                       <th className="p-2 min-w-[240px]">MODELO (*) *</th>
                       <th className="p-2 w-44">N° DE SERIE *</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formGlp.componentes?.map((comp: any, idx: number) => {
                      const esCilindro = comp.componente === 'CILINDRO';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                           <td className="p-2 text-center font-bold text-slate-400 align-top pt-3">
                            {esGlpAnual ? (esCilindro ? '1' : 'Q') : idx + 1}
                          </td>
                           <td className="p-2 font-black text-[#052a79] align-top pt-3">
                            {comp.componente}
                          </td>
                           <td className="p-2 align-top">
                            <input
                              value={comp.marca || ''}
                              onChange={e => handleComponenteGlp(idx, 'marca', e.target.value)}
                              className={claseConError("min-h-10 w-full rounded-md border-2 border-slate-200 p-2 font-semibold capitalize text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0", esError(claveComponente('glp', comp.componente, 'marca')))}
                              data-campo-error={esError(claveComponente('glp', comp.componente, 'marca')) ? true : undefined}
                              placeholder="Marca"
                            />
                            <MensajeError campo={claveComponente('glp', comp.componente, 'marca')} errores={erroresCampo} />
                          </td>
                           <td className="p-2 align-top">
                            {esCilindro ? (
                              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2">
                                <div className="min-w-0">
                                  <label className="mb-0.5 block text-[10px] font-bold text-slate-500">CAPACIDAD (L) *</label>
                                  <input
                                    value={comp.capacidadLitros || ''}
                                    onChange={e => handleComponenteGlp(idx, 'capacidadLitros', e.target.value)}
                                    inputMode="numeric"
                                    data-tipo-dato="entero"
                                    maxLength={5}
                                    className={claseConError("h-9 w-full rounded-md border-2 border-slate-200 px-2 text-xs font-semibold text-slate-800 focus:border-[#f59e0b] focus:ring-0", esError(claveComponente('glp', comp.componente, 'capacidadLitros')))}
                                    data-campo-error={esError(claveComponente('glp', comp.componente, 'capacidadLitros')) ? true : undefined}
                                    placeholder="Litros"
                                  />
                                  <MensajeError campo={claveComponente('glp', comp.componente, 'capacidadLitros')} errores={erroresCampo} />
                                </div>
                                <span className="select-none pt-5 text-base font-black text-slate-400" aria-hidden="true">/</span>
                                <div className="min-w-0">
                                  <label className="mb-0.5 block text-[10px] font-bold text-slate-500">MES-AÑO *</label>
                                  <input
                                    value={comp.periodoFabricacionInput !== undefined
                                      ? comp.periodoFabricacionInput
                                      : presentarPeriodoFabricacion(comp.mesFabricacion, comp.anioFabricacion)}
                                    onChange={e => handlePeriodoFabricacionGlp(idx, e.target.value)}
                                    inputMode="text"
                                    data-tipo-dato="mes-anio"
                                    maxLength={7}
                                    className={claseConError("h-9 w-full rounded-md border-2 border-slate-200 px-2 text-center text-xs font-semibold text-slate-800 focus:border-[#f59e0b] focus:ring-0", esError(claveComponente('glp', comp.componente, 'anioFabricacion')))}
                                    data-campo-error={esError(claveComponente('glp', comp.componente, 'anioFabricacion')) ? true : undefined}
                                    placeholder="MM-AAAA"
                                    title="Ingrese MM-AAAA. También se acepta AAAA-MM o solo AAAA."
                                  />
                                  <MensajeError campo={claveComponente('glp', comp.componente, 'anioFabricacion')} errores={erroresCampo} />
                                </div>
                              </div>
                            ) : (
                              <div>
                                <input
                                  value={comp.modelo || ''}
                                  onChange={e => handleComponenteGlp(idx, 'modelo', e.target.value)}
                                  className={claseConError("min-h-10 w-full rounded-md border-2 border-slate-200 p-2 font-semibold capitalize text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0", esError(claveComponente('glp', comp.componente, 'modelo')))}
                                  data-campo-error={esError(claveComponente('glp', comp.componente, 'modelo')) ? true : undefined}
                                  placeholder="Modelo del regulador"
                                />
                                <MensajeError campo={claveComponente('glp', comp.componente, 'modelo')} errores={erroresCampo} />
                              </div>
                            )}
                          </td>
                           <td className="p-2 align-top">
                            <input
                              value={comp.numeroSerie || ''}
                              onChange={e => handleComponenteGlp(idx, 'numeroSerie', e.target.value)}
                              className={claseConError("min-h-10 w-full rounded-md border-2 border-slate-200 p-2 font-semibold capitalize text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0", esError(claveComponente('glp', comp.componente, 'numeroSerie')))}
                              data-campo-error={esError(claveComponente('glp', comp.componente, 'numeroSerie')) ? true : undefined}
                              placeholder="N° de Serie"
                            />
                            <MensajeError campo={claveComponente('glp', comp.componente, 'numeroSerie')} errores={erroresCampo} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] italic text-slate-500 border-t pt-2">
                (*): En caso del cilindro de almacenamiento de GLP, indicar su capacidad en litros y año de fabricación.
              </p>
            </div>

            {/* C. CAMBIO REALIZADO EN LA CONVERSIÓN GLP (SOLO INICIAL) */}
            {modalidadCertificado === 'INICIAL' && (
              <section
                className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 sm:p-4"
                data-seccion-glp-inicial="conversion"
              >
                <div className="mb-3 flex items-center justify-between border-b pb-2">
                  <h5 className="font-bold text-[#052a79]">C. CAMBIO REALIZADO EN LA CONVERSIÓN GLP</h5>
                  <span className="text-[11px] font-bold text-slate-500">VALORES DEL CERTIFICADO</span>
                </div>

                <div className={`overflow-x-auto rounded-lg border bg-white ${combustibleGlpSinCambio ? 'border-red-400' : 'border-slate-200'}`} data-campo-error={combustibleGlpSinCambio ? true : undefined}>
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                        <th className="p-2 text-center w-12">N°</th>
                        <th className="p-2 w-52 sm:w-64">CARACTERÍSTICA</th>
                        <th className="p-2">VALOR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-2 text-center font-bold text-slate-400 align-middle">11</td>
                        <td className="p-2 font-bold text-slate-700 align-middle">Combustible</td>
                        <td className="p-2 align-middle">
                          <div className="flex min-h-9 items-center rounded-lg border-2 border-blue-100 bg-blue-50 px-3 py-1 font-black text-[#052a79]">
                            {COMBUSTIBLE_POSTERIOR_GLP}
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-2 text-center font-bold text-slate-400 align-middle">15</td>
                        <td className="p-2 font-bold text-slate-700 align-middle">Peso neto (Kg.) <span className="text-red-500">*</span></td>
                        <td className="p-2 align-middle">
                          <input
                            type="text"
                            inputMode="numeric"
                            data-tipo-dato="entero"
                            name="pesoNetoPosterior"
                            value={formGlp.pesoNetoPosterior || ''}
                            onChange={handleGlp}
                            className={claseConError(CLASE_CAMPO, esError('glp.pesoNetoPosterior'))}
                            data-campo-error={esError('glp.pesoNetoPosterior') ? true : undefined}
                            placeholder="Peso neto final"
                          />
                          <MensajeError campo="glp.pesoNetoPosterior" errores={erroresCampo} />
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-2 text-center font-bold text-slate-400 align-middle">17</td>
                        <td className="p-2 font-bold text-slate-700 align-middle">Carga útil (Kg.) <span className="text-red-500">*</span></td>
                        <td className="p-2 align-middle">
                          <input
                            type="text"
                            inputMode="numeric"
                            data-tipo-dato="entero"
                            name="cargaUtilPosterior"
                            value={formGlp.cargaUtilPosterior || ''}
                            onChange={handleGlp}
                            className={claseConError(CLASE_CAMPO, esError('glp.cargaUtilPosterior'))}
                            data-campo-error={esError('glp.cargaUtilPosterior') ? true : undefined}
                            placeholder="Carga útil final"
                          />
                          <MensajeError campo="glp.cargaUtilPosterior" errores={erroresCampo} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {combustibleGlpSinCambio && (
                  <p role="alert" className="mt-2 text-xs font-bold leading-5 text-red-600">
                    El combustible original no puede ser BI-COMBUSTIBLE GLP porque ese es el resultado de la conversión.
                  </p>
                )}
              </section>
            )}

            {/* VERIFICACIONES DE SEGURIDAD GLP */}
            <div
              data-seccion-glp-anual={esGlpAnual ? 'verificaciones' : undefined}
              data-seccion-glp-inicial={!esGlpAnual ? 'verificaciones' : undefined}
            >
              <div className={claseConError("mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3", esError('glp.verificaciones'))} data-campo-error={esError('glp.verificaciones') ? true : undefined}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h5 className="font-bold text-[#052a79]">
                      {esGlpAnual ? 'C. VERIFICACIONES DE SEGURIDAD GLP' : 'D. VERIFICACIONES DE SEGURIDAD GLP'}
                    </h5>
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

            {/* VIGENCIA / EXPEDIENTE */}
            {esGlpAnual ? (
              <section
                className="rounded-xl border border-slate-200 bg-white p-4"
                data-seccion-glp-anual="vigencia-expediente"
              >
                <h5 className="mb-4 border-b border-slate-200 pb-2 font-bold text-[#052a79]">
                  D. VIGENCIA / EXPEDIENTE
                </h5>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500">
                      VIGENCIA HASTA <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="fechaVigencia"
                      value={formGlp.fechaVigencia || ''}
                      onChange={handleGlp}
                      className={claseConError(CLASE_CAMPO, esError('glp.fechaVigencia'))}
                      data-campo-error={esError('glp.fechaVigencia') ? true : undefined}
                    />
                    <MensajeError campo="glp.fechaVigencia" errores={erroresCampo} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500">EXPEDIENTE TÉCNICO</label>
                    <div className="rounded-lg border-2 border-blue-100 bg-blue-50 px-3 py-2">
                      <p className="font-black text-[#052a79]">
                        {numeroCertificadoOficial || 'Se asignará automáticamente al emitir'}
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-blue-600">
                        Usará el mismo número oficial del certificado. No consume un correlativo en este paso.
                      </p>
                    </div>
                    {formGlp.expedienteTecnico
                      && formGlp.expedienteTecnico !== numeroCertificadoOficial && (
                        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                          Este borrador conserva el valor anterior {formGlp.expedienteTecnico}. Al emitir se reemplazará por el número oficial del certificado.
                        </p>
                      )}
                  </div>
                </div>
              </section>
            ) : (
              <section
                className="rounded-xl border border-slate-200 bg-white p-4"
                data-seccion-glp-inicial="vigencia-expediente"
              >
                <h5 className="mb-4 border-b border-slate-200 pb-2 font-bold text-[#052a79]">
                  E. VIGENCIA / EXPEDIENTE
                </h5>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      VIGENCIA HASTA <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="fechaVigencia"
                      value={formGlp.fechaVigencia || ''}
                      onChange={handleGlp}
                      className={claseConError(CLASE_CAMPO, esError('glp.fechaVigencia'))}
                      data-campo-error={esError('glp.fechaVigencia') ? true : undefined}
                    />
                    <MensajeError campo="glp.fechaVigencia" errores={erroresCampo} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500">EXPEDIENTE TÉCNICO</label>
                    <div className="rounded-lg border-2 border-blue-100 bg-blue-50 px-3 py-2">
                      <p className="font-black text-[#052a79]">
                        {numeroCertificadoOficial || 'Se asignará automáticamente al emitir'}
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-blue-600">
                        Usará el mismo número oficial del certificado. No consume un correlativo en este paso.
                      </p>
                    </div>
                    {formGlp.expedienteTecnico
                      && formGlp.expedienteTecnico !== numeroCertificadoOficial && (
                        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                          Este borrador conserva el valor anterior {formGlp.expedienteTecnico}. Al emitir se reemplazará por el número oficial del certificado.
                        </p>
                      )}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* --- DATOS GNV --- */}
        {tipoCertificado === 'GNV_ANUAL' && (
          <div className="space-y-6">
            {modalidadCertificado === 'INICIAL' ? (
              <>
                {/* B. TABLA COMPONENTES GNV */}
                <div
                  className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
                  data-seccion-gnv="componentes"
                >
                  <div className="mb-3 flex items-center justify-between border-b pb-2">
                    <h5 className="font-bold text-slate-800">B. COMPONENTES INSTALADOS GNV</h5>
                    <span className="text-[11px] font-bold text-slate-500">TABLA DEL CERTIFICADO</span>
                  </div>
                  <MensajeError campo="gnv.componentes" errores={erroresCampo} />

                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                          <th className="p-2 text-center w-12">N°</th>
                          <th className="p-2 w-32">COMPONENTE</th>
                          <th className="p-2 w-44">MARCA *</th>
                          <th className="p-2 w-44">N° DE SERIE *</th>
                          <th className="p-2 w-36">CAP. (Lts) *</th>
                          <th className="p-2 w-36">FECHA FAB. (MM/AA) *</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formGnv.componentes?.map((comp: any, idx: number) => {
                          const esReductor = comp.componente === 'REDUCTOR';

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-2 text-center font-bold text-slate-400 align-middle">
                                {comp.orden || idx + 1}
                              </td>
                              <td className="p-2 font-black text-[#052a79] align-middle">
                                {esReductor ? 'REDUCTOR' : 'CILINDRO(S)'}
                              </td>
                              <td className="p-2 align-middle">
                                <input
                                  value={comp.marca || ''}
                                  onChange={e => handleComponenteGnv(idx, 'marca', e.target.value)}
                                  className={claseConError(
                                    "min-h-9 w-full rounded-md border-2 border-slate-200 p-2 font-semibold capitalize text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0",
                                    esError(claveComponente('gnv', comp.componente, 'marca'))
                                  )}
                                  data-campo-error={esError(claveComponente('gnv', comp.componente, 'marca')) ? true : undefined}
                                  placeholder="Marca"
                                />
                                <MensajeError campo={claveComponente('gnv', comp.componente, 'marca')} errores={erroresCampo} />
                              </td>
                              <td className="p-2 align-middle">
                                <input
                                  value={comp.numeroSerie || ''}
                                  onChange={e => handleComponenteGnv(idx, 'numeroSerie', e.target.value)}
                                  className={claseConError(
                                    "min-h-9 w-full rounded-md border-2 border-slate-200 p-2 font-semibold capitalize text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0",
                                    esError(claveComponente('gnv', comp.componente, 'numeroSerie'))
                                  )}
                                  data-campo-error={esError(claveComponente('gnv', comp.componente, 'numeroSerie')) ? true : undefined}
                                  placeholder="N° Serie"
                                />
                                <MensajeError campo={claveComponente('gnv', comp.componente, 'numeroSerie')} errores={erroresCampo} />
                              </td>
                              <td className="p-2 align-middle min-w-[220px]">
                                {(() => {
                                  const modo = comp.modoCapacidad || (comp.capacidadLitros === 'NO APLICA' ? 'NO_APLICA' : 'VALOR');
                                  const esNoAplica = modo === 'NO_APLICA';

                                  return (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <select
                                          value={modo}
                                          onChange={(e) => {
                                            const seleccion = e.target.value as 'VALOR' | 'NO_APLICA';
                                            handleModoCapacidadGnv(idx, seleccion);
                                          }}
                                          className="h-9 shrink-0 rounded-md border-2 border-slate-200 px-2 text-xs font-bold text-slate-700 transition-colors focus:border-[#f59e0b] focus:ring-0"
                                          aria-label={`Tipo de capacidad para ${comp.componente}`}
                                        >
                                          <option value="VALOR">INGRESAR VALOR</option>
                                          <option value="NO_APLICA">NO APLICA</option>
                                        </select>

                                        {!esNoAplica && (
                                          <div className="min-w-[70px] flex-1">
                                            <input
                                              value={comp.capacidadLitros === 'NO APLICA' ? '' : (comp.capacidadLitros || '')}
                                              onChange={(e) => handleComponenteGnv(idx, 'capacidadLitros', e.target.value)}
                                              inputMode="numeric"
                                              data-tipo-dato="entero"
                                              maxLength={5}
                                              className={claseConError(
                                                "h-9 w-full rounded-md border-2 border-slate-200 px-2 text-xs font-semibold text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0",
                                                esError(claveComponente('gnv', comp.componente, 'capacidadLitros'))
                                              )}
                                              data-campo-error={esError(claveComponente('gnv', comp.componente, 'capacidadLitros')) ? true : undefined}
                                              placeholder="Lts"
                                              aria-label={`Capacidad en litros para ${comp.componente}`}
                                            />
                                          </div>
                                        )}
                                      </div>
                                      {!esNoAplica && (
                                        <MensajeError campo={claveComponente('gnv', comp.componente, 'capacidadLitros')} errores={erroresCampo} />
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="p-2 align-middle">
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
                                  className={claseConError(
                                    "min-h-9 w-full rounded-md border-2 border-slate-200 p-2 text-center text-xs font-semibold focus:border-[#f59e0b] focus:ring-0",
                                    esError(claveComponente('gnv', comp.componente, 'fechaFabricacion'))
                                  )}
                                  data-campo-error={esError(claveComponente('gnv', comp.componente, 'fechaFabricacion')) ? true : undefined}
                                />
                                <MensajeError campo={claveComponente('gnv', comp.componente, 'fechaFabricacion')} errores={erroresCampo} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* C. CAMBIO REALIZADO EN LA CONVERSIÓN GNV */}
                <section
                  className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 sm:p-4"
                  data-seccion-gnv="conversion"
                >
                  <div className="mb-3 flex items-center justify-between border-b pb-2">
                    <h5 className="font-bold text-[#052a79]">C. CAMBIO REALIZADO EN LA CONVERSIÓN GNV</h5>
                    <span className="text-[11px] font-bold text-slate-500">VALORES DEL CERTIFICADO</span>
                  </div>

                  <div className={`overflow-x-auto rounded-lg border bg-white ${combustibleGnvSinCambio ? 'border-red-400' : 'border-slate-200'}`} data-campo-error={combustibleGnvSinCambio ? true : undefined}>
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                          <th className="p-2 text-center w-12">N°</th>
                          <th className="p-2 w-52 sm:w-64">CARACTERÍSTICA</th>
                          <th className="p-2">VALOR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-2 text-center font-bold text-slate-400 align-middle">10</td>
                          <td className="p-2 font-bold text-slate-700 align-middle">COMBUSTIBLE</td>
                          <td className="p-2 align-middle">
                            <div className="flex min-h-9 items-center rounded-lg border-2 border-blue-100 bg-blue-50 px-3 py-1 font-black text-[#052a79]">
                              BI - COMBUSTIBLE GNV
                            </div>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-2 text-center font-bold text-slate-400 align-middle">15</td>
                          <td className="p-2 font-bold text-slate-700 align-middle">PESO NETO (Kg.) <span className="text-red-500">*</span></td>
                          <td className="p-2 align-middle">
                            <input
                              type="text"
                              inputMode="numeric"
                              data-tipo-dato="entero"
                              name="pesoNetoPosterior"
                              value={formGnv.pesoNetoPosterior || ''}
                              onChange={handleGnv}
                              placeholder="Ej. 1453"
                              className={claseConError(
                                "min-h-9 w-full max-w-xs rounded-lg border-2 border-slate-200 px-3 py-1 font-bold text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0",
                                esError('gnv.pesoNetoPosterior') || pesoGnvSinCambio
                              )}
                              data-campo-error={esError('gnv.pesoNetoPosterior') || pesoGnvSinCambio ? true : undefined}
                            />
                            {pesoGnvSinCambio ? (
                              <p className="mt-1 text-xs font-semibold text-red-600">El nuevo peso neto debe ser diferente al peso original.</p>
                            ) : (
                              <MensajeError campo="gnv.pesoNetoPosterior" errores={erroresCampo} />
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* D. OBSERVACIONES GNV */}
                <section className="rounded-xl border border-slate-200 bg-white p-4" data-seccion-gnv="observaciones">
                  <label className="mb-1 block text-xs font-bold text-slate-500">
                    D. OBSERVACIONES GNV (Opcional) <span className="font-normal text-slate-400">({formGnv.observaciones?.length || 0}/250)</span>
                  </label>
                  <input
                    name="observaciones"
                    value={formGnv.observaciones || ''}
                    onChange={handleGnv}
                    maxLength={250}
                    className={claseConError(CLASE_CAMPO, esError('gnv.observaciones'))}
                    data-campo-error={esError('gnv.observaciones') ? true : undefined}
                    placeholder="EJ: NINGUNA"
                  />
                </section>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-seccion-gnv="informacion-especifica">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">MODALIDAD</label>
                    <div className="flex min-h-[42px] items-center justify-between rounded-lg border-2 border-blue-100 bg-blue-50 px-3 py-2">
                      <span className="font-black text-[#052a79]">{modalidadCertificado || 'NO DEFINIDA'}</span>
                      <span className="text-[10px] font-bold capitalize text-blue-500">Seleccionada en datos iniciales</span>
                    </div>
                  </div>
                </div>

                <div data-seccion-gnv="verificaciones">
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

                  <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4" data-seccion-gnv="vigencia">
                    <h5 className="mb-4 border-b border-slate-200 pb-2 font-bold text-[#052a79]">VIGENCIA</h5>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-500">VIGENCIA HASTA <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        name="fechaVigencia"
                        value={formGnv.fechaVigencia || ''}
                        onChange={handleGnv}
                        className={claseConError(CLASE_CAMPO, esError('gnv.fechaVigencia'))}
                        data-campo-error={esError('gnv.fechaVigencia') ? true : undefined}
                      />
                      <MensajeError campo="gnv.fechaVigencia" errores={erroresCampo} />
                    </div>
                  </section>

                  <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4" data-seccion-gnv="observaciones">
                    <label className="mb-1 block text-xs font-bold text-slate-500">
                      OBSERVACIONES GNV (Opcional) <span className="font-normal text-slate-400">({formGnv.observaciones?.length || 0}/250)</span>
                    </label>
                    <input
                      name="observaciones"
                      value={formGnv.observaciones || ''}
                      onChange={handleGnv}
                      maxLength={250}
                      className={claseConError(CLASE_CAMPO, esError('gnv.observaciones'))}
                      data-campo-error={esError('gnv.observaciones') ? true : undefined}
                      placeholder="EJ: NINGUNA"
                    />
                  </section>
                </div>
              </>
            )}
          </div>
        )}

        {/* --- DATOS CONFORMIDAD --- */}
        {tipoCertificado === 'CONFORMIDAD' && (
          <div className="space-y-4" data-seccion-conformidad="especifica">
            <h4 className="text-lg font-bold text-slate-800 capitalize tracking-wider mb-2 border-b pb-2">
              B. INFORMACIÓN ESPECÍFICA: CONFORMIDAD
            </h4>

            {/* 1. TIPO DE TRABAJO */}
            <section className="rounded-lg border border-slate-200 bg-white p-4" data-seccion-conformidad="tipo-trabajo">
              <h5 className="mb-3 font-bold text-[#052a79]">1. Tipo de trabajo realizado</h5>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">
                  ¿QUÉ TRABAJO SE CERTIFICA?{required('conformidad.tipoConformidad')}
                </label>
                <select
                  name="tipoConformidad"
                  value={formConformidad.tipoConformidad || ''}
                  onChange={handleConformidad}
                  className={claseConError(CLASE_CAMPO, esError('conformidad.tipoConformidad'))}
                  data-campo-error={esError('conformidad.tipoConformidad') ? true : undefined}
                >
                  <option value="">SELECCIONAR TIPO</option>
                  <option value="MODIFICACION">MODIFICACIÓN</option>
                  <option value="MONTAJE">MONTAJE</option>
                  <option value="FABRICACION">FABRICACIÓN</option>
                </select>
                <MensajeError campo="conformidad.tipoConformidad" errores={erroresCampo} />
                <p className="mt-1 text-xs text-slate-500">Selecciona una de las opciones del certificado.</p>
              </div>
            </section>

            {/* 2. RECTIFICACIÓN DE CARACTERÍSTICAS REGISTRABLES */}
            <section className="rounded-lg border border-slate-200 bg-white p-4" data-seccion-conformidad="caracteristica-registrable">
              <h5 className="mb-3 font-bold text-[#052a79]">2. Rectificación de características registrables</h5>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">
                    RECTIFICACIÓN DE CARACTERÍSTICAS REGISTRABLES{required('conformidad.caracteristicaRegistrable')}
                  </label>
                  {resolucionConformidad.caracteristicaFija ? (
                    <div>
                      <div
                        className="flex min-h-9 items-center rounded-lg border-2 border-blue-100 bg-blue-50 px-3 py-1 font-bold text-[#052a79]"
                        data-caracteristica-fija="true"
                      >
                        {resolucionConformidad.caracteristicaFija}
                      </div>
                      <p className="mt-1 text-[10px] font-semibold text-blue-700">
                        Característica fija derivada automáticamente del servicio.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select
                        aria-label="Selector de característica registrable"
                        value={
                          resolucionConformidad.opcionesCaracteristica.includes(formConformidad.caracteristicaRegistrable)
                            ? formConformidad.caracteristicaRegistrable
                            : formConformidad.caracteristicaRegistrable
                              ? '__OTRO__'
                              : ''
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__OTRO__') {
                            handleConformidad({
                              target: { name: 'caracteristicaRegistrable', value: '' }
                            } as any);
                          } else {
                            handleConformidad({
                              target: { name: 'caracteristicaRegistrable', value: val }
                            } as any);
                          }
                        }}
                        className={claseConError(CLASE_CAMPO, esError('conformidad.caracteristicaRegistrable'))}
                        data-campo-error={esError('conformidad.caracteristicaRegistrable') ? true : undefined}
                      >
                        <option value="">SELECCIONAR CARACTERÍSTICA</option>
                        {resolucionConformidad.opcionesCaracteristica.map((opc) => (
                          <option key={opc} value={opc}>{opc}</option>
                        ))}
                        <option value="__OTRO__">OTRA CARACTERÍSTICA (ESPECIFICAR)</option>
                      </select>
                      {(!resolucionConformidad.opcionesCaracteristica.includes(formConformidad.caracteristicaRegistrable) ||
                        formConformidad.caracteristicaRegistrable === '__OTRO__') && (
                        <input
                          name="caracteristicaRegistrable"
                          value={formConformidad.caracteristicaRegistrable === '__OTRO__' ? '' : formConformidad.caracteristicaRegistrable || ''}
                          onChange={handleConformidad}
                          maxLength={300}
                          className={claseConError(CLASE_CAMPO, esError('conformidad.caracteristicaRegistrable'))}
                          data-campo-error={esError('conformidad.caracteristicaRegistrable') ? true : undefined}
                          placeholder="ESPECIFICAR CARACTERÍSTICA REGISTRABLE"
                        />
                      )}
                      <MensajeError campo="conformidad.caracteristicaRegistrable" errores={erroresCampo} />
                      <p className="mt-1 text-xs text-slate-500">
                        Selecciona del catálogo oficial o especifica la característica a rectificar.
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. USO ORIGINAL DEL VEHÍCULO */}
                <div data-seccion-conformidad="uso-original">
                  <label className="mb-1 block text-xs font-bold text-slate-600">
                    USO ORIGINAL DEL VEHÍCULO{required('conformidad.usoOriginalVehiculo')}
                  </label>
                  <div className="space-y-2">
                    <select
                      aria-label="Selector de uso original del vehículo"
                      value={
                        USOS_ORIGINALES_CATALOGO.includes(formConformidad.usoOriginalVehiculo)
                          ? formConformidad.usoOriginalVehiculo
                          : formConformidad.usoOriginalVehiculo
                            ? '__OTRO__'
                            : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__OTRO__') {
                          handleConformidad({
                            target: { name: 'usoOriginalVehiculo', value: '' }
                          } as any);
                        } else {
                          handleConformidad({
                            target: { name: 'usoOriginalVehiculo', value: val }
                          } as any);
                        }
                      }}
                      className={claseConError(CLASE_CAMPO, esError('conformidad.usoOriginalVehiculo'))}
                      data-campo-error={esError('conformidad.usoOriginalVehiculo') ? true : undefined}
                    >
                      <option value="">SELECCIONAR USO ORIGINAL</option>
                      {USOS_ORIGINALES_CATALOGO.map((uso) => (
                        <option key={uso} value={uso}>{uso}</option>
                      ))}
                      <option value="__OTRO__">OTRO USO (ESPECIFICAR)</option>
                    </select>
                    {(!USOS_ORIGINALES_CATALOGO.includes(formConformidad.usoOriginalVehiculo) ||
                      formConformidad.usoOriginalVehiculo === '__OTRO__') && (
                      <input
                        name="usoOriginalVehiculo"
                        value={formConformidad.usoOriginalVehiculo === '__OTRO__' ? '' : formConformidad.usoOriginalVehiculo || ''}
                        onChange={handleConformidad}
                        maxLength={100}
                        className={claseConError(CLASE_CAMPO, esError('conformidad.usoOriginalVehiculo'))}
                        data-campo-error={esError('conformidad.usoOriginalVehiculo') ? true : undefined}
                        placeholder="EJ.: TRANSPORTE DE PERSONAS"
                      />
                    )}
                    <MensajeError campo="conformidad.usoOriginalVehiculo" errores={erroresCampo} />
                    <p className="mt-1 text-xs text-slate-500">
                      Indica el uso original según diseño y construcción del vehículo.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
