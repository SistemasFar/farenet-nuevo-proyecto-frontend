import type {
  ServicioConfiguracionFaregas,
  TipoFlujoServicioFaregas
} from '../../../services/faregas-config.api';

export type VarianteCertificado =
  | 'GNV_INICIAL'
  | 'GNV_ANUAL'
  | 'GLP_INICIAL'
  | 'GLP_ANUAL'
  | 'CONFORMIDAD'
  | 'TALLER_GNV_INICIAL'
  | 'TALLER_GNV_ANUAL'
  | 'TALLER_GLP_INICIAL'
  | 'TALLER_GLP_ANUAL';

export interface OpcionVarianteCertificado {
  value: VarianteCertificado;
  label: string;
}

const OPCIONES: OpcionVarianteCertificado[] = [
  { value: 'GNV_INICIAL', label: 'GNV Inicial' },
  { value: 'GNV_ANUAL', label: 'GNV Anual' },
  { value: 'GLP_INICIAL', label: 'GLP Inicial' },
  { value: 'GLP_ANUAL', label: 'GLP Anual' },
  { value: 'CONFORMIDAD', label: 'Conformidad' },
  { value: 'TALLER_GNV_INICIAL', label: 'Taller GNV Inicial' },
  { value: 'TALLER_GNV_ANUAL', label: 'Taller GNV Anual' },
  { value: 'TALLER_GLP_INICIAL', label: 'Taller GLP Inicial' },
  { value: 'TALLER_GLP_ANUAL', label: 'Taller GLP Anual' }
];

export const varianteDesdeServicio = (
  servicio: Partial<ServicioConfiguracionFaregas>
): VarianteCertificado | '' => {
  // El flujo específico debe evaluarse antes que la familia base. De lo
  // contrario un Taller GLP/GNV se reabre como certificado vehicular normal.
  if (servicio.tipo_flujo === 'TALLER_INSPECCION') {
    if (servicio.tipo_certificado_clave === 'GNV_ANUAL' && servicio.modalidad === 'INICIAL') return 'TALLER_GNV_INICIAL';
    if (servicio.tipo_certificado_clave === 'GNV_ANUAL' && servicio.modalidad === 'ANUAL') return 'TALLER_GNV_ANUAL';
    if (servicio.tipo_certificado_clave === 'GLP_ANUAL' && servicio.modalidad === 'INICIAL') return 'TALLER_GLP_INICIAL';
    if (servicio.tipo_certificado_clave === 'GLP_ANUAL' && servicio.modalidad === 'ANUAL') return 'TALLER_GLP_ANUAL';
    return '';
  }

  if (servicio.tipo_certificado_clave === 'GNV_ANUAL' && servicio.modalidad === 'INICIAL') return 'GNV_INICIAL';
  if (servicio.tipo_certificado_clave === 'GNV_ANUAL' && servicio.modalidad === 'ANUAL') return 'GNV_ANUAL';
  if (servicio.tipo_certificado_clave === 'GLP_ANUAL' && servicio.modalidad === 'INICIAL') return 'GLP_INICIAL';
  if (servicio.tipo_certificado_clave === 'GLP_ANUAL' && servicio.modalidad === 'ANUAL') return 'GLP_ANUAL';
  if (servicio.tipo_certificado_clave === 'CONFORMIDAD') return 'CONFORMIDAD';
  return '';
};

export const configuracionVariante = (variante: VarianteCertificado | ''): {
  tipo_flujo: TipoFlujoServicioFaregas;
  tipo_certificado_clave: string;
  modalidad: 'INICIAL' | 'ANUAL' | null;
} | null => {
  switch (variante) {
    case 'GNV_INICIAL': return { tipo_flujo: 'CERTIFICACION', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'INICIAL' };
    case 'GNV_ANUAL': return { tipo_flujo: 'CERTIFICACION', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'ANUAL' };
    case 'GLP_INICIAL': return { tipo_flujo: 'CERTIFICACION', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'INICIAL' };
    case 'GLP_ANUAL': return { tipo_flujo: 'CERTIFICACION', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'ANUAL' };
    case 'CONFORMIDAD': return { tipo_flujo: 'CERTIFICACION', tipo_certificado_clave: 'CONFORMIDAD', modalidad: null };
    case 'TALLER_GNV_INICIAL': return { tipo_flujo: 'TALLER_INSPECCION', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'INICIAL' };
    case 'TALLER_GNV_ANUAL': return { tipo_flujo: 'TALLER_INSPECCION', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'ANUAL' };
    case 'TALLER_GLP_INICIAL': return { tipo_flujo: 'TALLER_INSPECCION', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'INICIAL' };
    case 'TALLER_GLP_ANUAL': return { tipo_flujo: 'TALLER_INSPECCION', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'ANUAL' };
    default: return null;
  }
};

// El tipo de certificado no queda restringido por la categoría visual donde se
// abrió el modal. El usuario puede reclasificar una operación y necesita ver el
// catálogo completo; la compatibilidad de la plantilla se valida después.
export const opcionesVariantesPorCategoria = (categoriaCodigo: string): OpcionVarianteCertificado[] => {
  void categoriaCodigo;
  return [...OPCIONES];
};

interface FormatoCompatible {
  codigo: string;
  formato_padre_codigo?: string;
}

interface FormatoConRelacion extends FormatoCompatible {
  nombre: string;
  formato_padre_nombre?: string;
}

export const presentacionRelacionFormato = (formato: FormatoConRelacion) => {
  const esTaller = formato.codigo.startsWith('TALLER_');
  if (esTaller) {
    return {
      etiqueta: 'Formato de Taller',
      valor: formato.nombre,
      accion: 'Cambiar formato de Taller'
    };
  }
  return {
    etiqueta: 'Base',
    valor: formato.formato_padre_nombre || formato.nombre,
    accion: 'Cambiar certificado base'
  };
};

const raizEsperadaServicio = (servicio: Partial<ServicioConfiguracionFaregas>) => {
  if (servicio.tipo_certificado_clave === 'GNV_ANUAL' && servicio.modalidad === 'INICIAL') return 'GNV_INICIAL';
  if (servicio.tipo_certificado_clave === 'GNV_ANUAL' && servicio.modalidad === 'ANUAL') return 'GNV_ANUAL';
  if (servicio.tipo_certificado_clave === 'GLP_ANUAL' && servicio.modalidad === 'INICIAL') return 'GLP_INICIAL';
  if (servicio.tipo_certificado_clave === 'GLP_ANUAL' && servicio.modalidad === 'ANUAL') return 'GLP_ANUAL';
  if (servicio.tipo_certificado_clave === 'CONFORMIDAD') return 'CONFORMIDAD';
  return null;
};

export const formatoCompatibleConServicio = (
  servicio: Partial<ServicioConfiguracionFaregas>,
  formato: FormatoCompatible
) => {
  const raizEsperada = raizEsperadaServicio(servicio);
  const raizFormato = formato.formato_padre_codigo || formato.codigo;
  if (raizEsperada && raizFormato !== raizEsperada) return false;

  const esFormatoTaller = formato.codigo.startsWith('TALLER_');
  if (servicio.tipo_flujo === 'TALLER_INSPECCION') return esFormatoTaller;
  return !esFormatoTaller;
};
