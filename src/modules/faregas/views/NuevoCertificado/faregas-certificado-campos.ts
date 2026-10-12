import type { TipoCertificadoFaregas } from '../../types/faregas';

export type CampoVehiculoCertificado = {
  campo: string;
  etiqueta: string;
  grupo?: 'simple' | 'vin-serie';
  automatico?: boolean;
};

const identificacionComun: CampoVehiculoCertificado[] = [
  { campo: 'placaNueva', etiqueta: 'PLACA DE RODAJE', automatico: true },
  { campo: 'categoria', etiqueta: 'CATEGORÍA' },
  { campo: 'marca', etiqueta: 'MARCA' },
  { campo: 'modelo', etiqueta: 'MODELO' },
  { campo: 'version', etiqueta: 'VERSIÓN' },
  { campo: 'anioFabricacion', etiqueta: 'AÑO DE FABRICACIÓN' },
  { campo: 'vin', etiqueta: 'VIN / N° DE SERIE', grupo: 'vin-serie' },
  { campo: 'numeroMotor', etiqueta: 'N° DE MOTOR' },
  { campo: 'numeroCilindros', etiqueta: 'N° DE CILINDROS' },
  { campo: 'cilindrada', etiqueta: 'CILINDRADA (CM³)' },
];

const rodajeDimensiones: CampoVehiculoCertificado[] = [
  { campo: 'numeroEjes', etiqueta: 'N° DE EJES' },
  { campo: 'numeroRuedas', etiqueta: 'N° DE RUEDAS' },
  { campo: 'numeroAsientos', etiqueta: 'N° DE ASIENTOS' },
  { campo: 'numeroPasajeros', etiqueta: 'N° DE PASAJEROS' },
  { campo: 'longitud', etiqueta: 'LARGO (M)' },
  { campo: 'ancho', etiqueta: 'ANCHO (M)' },
  { campo: 'alto', etiqueta: 'ALTO (M)' },
];

const CAMPOS_GLP_INICIAL: CampoVehiculoCertificado[] = [
  ...identificacionComun,
  { campo: 'combustible', etiqueta: 'COMBUSTIBLE ORIGINAL' },
  ...rodajeDimensiones,
  { campo: 'pesoNeto', etiqueta: 'PESO NETO (KG)' },
  { campo: 'pesoBruto', etiqueta: 'PESO BRUTO VEHICULAR (KG)' },
  { campo: 'cargaUtil', etiqueta: 'CARGA ÚTIL (KG)' },
];

const CAMPOS_GLP_ANUAL: CampoVehiculoCertificado[] = [
  ...identificacionComun,
  { campo: 'combustibleGlpAnual', etiqueta: 'COMBUSTIBLE', automatico: true },
  ...rodajeDimensiones,
  { campo: 'pesoNeto', etiqueta: 'PESO NETO (KG)' },
  { campo: 'pesoBruto', etiqueta: 'PESO BRUTO VEHICULAR (KG)' },
  { campo: 'cargaUtil', etiqueta: 'CARGA ÚTIL (KG)' },
];

const CAMPOS_GNV: CampoVehiculoCertificado[] = [
  ...identificacionComun,
  { campo: 'combustible', etiqueta: 'COMBUSTIBLE' },
  ...rodajeDimensiones,
  { campo: 'color', etiqueta: 'COLOR(ES)' },
  { campo: 'pesoNeto', etiqueta: 'PESO NETO VEHICULAR (KG)' },
  { campo: 'pesoBruto', etiqueta: 'PESO BRUTO VEHICULAR (KG)' },
];

// Orden fila por fila de la versión 2 vigente del formato dinámico CONFORMIDAD.
const CAMPOS_CONFORMIDAD: CampoVehiculoCertificado[] = [
  { campo: 'placaNueva', etiqueta: 'PLACA DE RODAJE', automatico: true },
  { campo: 'clase', etiqueta: 'CLASE' },
  { campo: 'categoria', etiqueta: 'CATEGORÍA' },
  { campo: 'alto', etiqueta: 'ALTURA (M)' },
  { campo: 'modelo', etiqueta: 'MODELO' },
  { campo: 'ancho', etiqueta: 'ANCHO (M)' },
  { campo: 'marca', etiqueta: 'MARCA' },
  { campo: 'pesoBruto', etiqueta: 'PESO BRUTO (KG)' },
  { campo: 'serieChasis', etiqueta: 'SERIE / CHASIS' },
  { campo: 'pesoNeto', etiqueta: 'PESO NETO (KG)' },
  { campo: 'numeroMotor', etiqueta: 'MOTOR' },
  { campo: 'cargaUtil', etiqueta: 'CARGA ÚTIL (KG)' },
  { campo: 'color', etiqueta: 'COLOR' },
  { campo: 'anioFabricacion', etiqueta: 'AÑO DE FABRICACIÓN' },
  { campo: 'carroceria', etiqueta: 'CARROCERÍA' },
  { campo: 'anioModelo', etiqueta: 'AÑO DE MODELO' },
  { campo: 'combustible', etiqueta: 'COMBUSTIBLE' },
  { campo: 'formulaRodante', etiqueta: 'FÓRMULA RODANTE' },
  { campo: 'potencia', etiqueta: 'POTENCIA (KW / RPM)' },
  { campo: 'numeroEjes', etiqueta: 'N° DE EJES' },
  { campo: 'numeroAsientos', etiqueta: 'N° DE ASIENTOS' },
  { campo: 'numeroPasajeros', etiqueta: 'N° DE PASAJEROS' },
  { campo: 'numeroRuedas', etiqueta: 'N° DE RUEDAS' },
  { campo: 'cilindrada', etiqueta: 'CILINDRADA (CC)' },
  { campo: 'numeroCilindros', etiqueta: 'N° DE CILINDROS' },
  { campo: 'version', etiqueta: 'VERSIÓN' },
  { campo: 'longitud', etiqueta: 'LONGITUD (M)' },
  { campo: 'vin', etiqueta: 'VIN' },
];

export const obtenerCamposVehiculoCertificado = (
  tipo: TipoCertificadoFaregas,
  modalidad?: string,
): CampoVehiculoCertificado[] => {
  if (tipo === 'CONFORMIDAD') return CAMPOS_CONFORMIDAD;
  if (tipo === 'GNV_ANUAL') return CAMPOS_GNV;
  if (tipo === 'GLP_ANUAL' && String(modalidad || '').toUpperCase() === 'INICIAL') {
    return CAMPOS_GLP_INICIAL;
  }
  if (tipo === 'GLP_ANUAL') return CAMPOS_GLP_ANUAL;
  return [];
};

export const camposVehiculoEditables = (
  tipo: TipoCertificadoFaregas,
  modalidad?: string,
): string[] => obtenerCamposVehiculoCertificado(tipo, modalidad)
  .filter((campo) => !campo.automatico)
  .map((campo) => campo.campo);

