import type { TipoCertificadoFaregas } from '../../types/faregas';

export type SubcampoVehiculo = {
  campo: string;
  placeholder?: string;
  etiqueta?: string;
  automatico?: boolean;
};

export type CampoVehiculoCertificado = {
  tipo?: 'simple' | 'grupo';
  campo: string;
  etiqueta: string;
  numero?: number;
  grupo?: 'simple' | 'vin-serie';
  automatico?: boolean;
  campos?: SubcampoVehiculo[];
  separador?: string;
  colSpan?: number;
  columnaCertificado?: 'izquierda' | 'derecha';
};

const CAMPOS_GLP_INICIAL: CampoVehiculoCertificado[] = [
  { campo: 'placaNueva', etiqueta: 'PLACA DE RODAJE', numero: 2, automatico: true },
  { campo: 'categoria', etiqueta: 'CATEGORÍA', numero: 3 },
  { campo: 'marca', etiqueta: 'MARCA', numero: 4 },
  { campo: 'modelo', etiqueta: 'MODELO', numero: 5 },
  { campo: 'version', etiqueta: 'VERSIÓN', numero: 6 },
  { campo: 'anioFabricacion', etiqueta: 'AÑO DE FABRICACIÓN', numero: 7 },
  { campo: 'vin', etiqueta: 'VIN / N° DE SERIE', numero: 8, grupo: 'vin-serie' },
  { campo: 'numeroMotor', etiqueta: 'N° DE MOTOR', numero: 9 },
  {
    tipo: 'grupo',
    campo: 'numeroCilindros',
    etiqueta: 'N° CILINDROS / CILINDRADA (CM³)',
    numero: 10,
    campos: [
      { campo: 'numeroCilindros', placeholder: 'N° Cilindros' },
      { campo: 'cilindrada', placeholder: 'Cilindrada' },
    ],
    separador: '/',
    colSpan: 2,
  },
  { campo: 'combustible', etiqueta: 'COMBUSTIBLE ORIGINAL', numero: 11 },
  {
    tipo: 'grupo',
    campo: 'numeroEjes',
    etiqueta: 'N° EJES / N° RUEDAS',
    numero: 12,
    campos: [
      { campo: 'numeroEjes', placeholder: 'N° Ejes' },
      { campo: 'numeroRuedas', placeholder: 'N° Ruedas' },
    ],
    separador: '/',
    colSpan: 2,
  },
  {
    tipo: 'grupo',
    campo: 'numeroAsientos',
    etiqueta: 'N° ASIENTOS / PASAJEROS',
    numero: 13,
    campos: [
      { campo: 'numeroAsientos', placeholder: 'N° Asientos' },
      { campo: 'numeroPasajeros', placeholder: 'Pasajeros' },
    ],
    separador: '/',
    colSpan: 2,
  },
  {
    tipo: 'grupo',
    campo: 'longitud',
    etiqueta: 'LARGO / ANCHO / ALTO (M)',
    numero: 14,
    campos: [
      { campo: 'longitud', placeholder: 'Largo' },
      { campo: 'ancho', placeholder: 'Ancho' },
      { campo: 'alto', placeholder: 'Alto' },
    ],
    separador: '/',
    colSpan: 2,
  },
  { campo: 'pesoNeto', etiqueta: 'PESO NETO (KG)', numero: 15 },
  { campo: 'pesoBruto', etiqueta: 'PESO BRUTO VEHICULAR (KG)', numero: 16 },
  { campo: 'cargaUtil', etiqueta: 'CARGA ÚTIL (KG)', numero: 17 },
];

const CAMPOS_GLP_ANUAL: CampoVehiculoCertificado[] = [
  { campo: 'placaNueva', etiqueta: 'PLACA DE RODAJE', numero: 2, automatico: true, columnaCertificado: 'izquierda' },
  { campo: 'categoria', etiqueta: 'CATEGORÍA', numero: 3, columnaCertificado: 'izquierda' },
  { campo: 'marca', etiqueta: 'MARCA', numero: 4, columnaCertificado: 'izquierda' },
  { campo: 'modelo', etiqueta: 'MODELO', numero: 5, columnaCertificado: 'izquierda' },
  { campo: 'version', etiqueta: 'VERSIÓN', numero: 6, columnaCertificado: 'izquierda' },
  { campo: 'anioFabricacion', etiqueta: 'AÑO DE FABRICACIÓN', numero: 7, columnaCertificado: 'izquierda' },
  { campo: 'vin', etiqueta: 'VIN / N° DE SERIE', numero: 8, grupo: 'vin-serie', columnaCertificado: 'izquierda' },
  { campo: 'numeroMotor', etiqueta: 'N° DE MOTOR', numero: 9, columnaCertificado: 'izquierda' },
  {
    tipo: 'grupo',
    campo: 'numeroCilindros',
    etiqueta: 'N° CILINDROS / CILINDRADA (CM³)',
    numero: 10,
    campos: [
      { campo: 'numeroCilindros', placeholder: 'N° Cilindros' },
      { campo: 'cilindrada', placeholder: 'Cilindrada' },
    ],
    separador: '/',
    colSpan: 2,
    columnaCertificado: 'derecha',
  },
  { campo: 'combustibleGlpAnual', etiqueta: 'COMBUSTIBLE', numero: 11, automatico: true, columnaCertificado: 'derecha' },
  {
    tipo: 'grupo',
    campo: 'numeroEjes',
    etiqueta: 'N° EJES / N° RUEDAS',
    numero: 12,
    campos: [
      { campo: 'numeroEjes', placeholder: 'N° Ejes' },
      { campo: 'numeroRuedas', placeholder: 'N° Ruedas' },
    ],
    separador: '/',
    colSpan: 2,
    columnaCertificado: 'derecha',
  },
  {
    tipo: 'grupo',
    campo: 'numeroAsientos',
    etiqueta: 'N° ASIENTOS / PASAJEROS',
    numero: 13,
    campos: [
      { campo: 'numeroAsientos', placeholder: 'N° Asientos' },
      { campo: 'numeroPasajeros', placeholder: 'Pasajeros' },
    ],
    separador: '/',
    colSpan: 2,
    columnaCertificado: 'derecha',
  },
  {
    tipo: 'grupo',
    campo: 'longitud',
    etiqueta: 'LARGO / ANCHO / ALTO (M)',
    numero: 14,
    campos: [
      { campo: 'longitud', placeholder: 'Largo' },
      { campo: 'ancho', placeholder: 'Ancho' },
      { campo: 'alto', placeholder: 'Alto' },
    ],
    separador: '/',
    colSpan: 2,
    columnaCertificado: 'derecha',
  },
  { campo: 'pesoNeto', etiqueta: 'PESO NETO (KG)', numero: 15, columnaCertificado: 'derecha' },
  { campo: 'pesoBruto', etiqueta: 'PESO BRUTO VEHICULAR (KG)', numero: 16, columnaCertificado: 'derecha' },
  { campo: 'cargaUtil', etiqueta: 'CARGA ÚTIL (KG)', numero: 17, columnaCertificado: 'derecha' },
];

const CAMPOS_GNV: CampoVehiculoCertificado[] = [
  { campo: 'placaNueva', etiqueta: 'PLACA DE RODAJE', numero: 1, automatico: true },
  { campo: 'categoria', etiqueta: 'CATEGORÍA', numero: 2 },
  { campo: 'marca', etiqueta: 'MARCA', numero: 3 },
  { campo: 'modelo', etiqueta: 'MODELO', numero: 4 },
  { campo: 'version', etiqueta: 'VERSIÓN', numero: 5 },
  { campo: 'anioFabricacion', etiqueta: 'AÑO DE FABRICACIÓN', numero: 6 },
  { campo: 'vin', etiqueta: 'VIN / N° DE SERIE', numero: 7, grupo: 'vin-serie' },
  { campo: 'numeroMotor', etiqueta: 'N° DE MOTOR', numero: 8 },
  {
    tipo: 'grupo',
    campo: 'numeroCilindros',
    etiqueta: 'N° CILINDROS / CILINDRADA (CM³)',
    numero: 9,
    campos: [
      { campo: 'numeroCilindros', placeholder: 'N° Cilindros' },
      { campo: 'cilindrada', placeholder: 'Cilindrada' },
    ],
    separador: '/',
    colSpan: 2,
  },
  { campo: 'combustible', etiqueta: 'COMBUSTIBLE', numero: 10 },
  {
    tipo: 'grupo',
    campo: 'numeroEjes',
    etiqueta: 'N° EJES / N° RUEDAS',
    numero: 11,
    campos: [
      { campo: 'numeroEjes', placeholder: 'N° Ejes' },
      { campo: 'numeroRuedas', placeholder: 'N° Ruedas' },
    ],
    separador: '/',
    colSpan: 2,
  },
  {
    tipo: 'grupo',
    campo: 'numeroAsientos',
    etiqueta: 'N° ASIENTOS / PASAJEROS',
    numero: 12,
    campos: [
      { campo: 'numeroAsientos', placeholder: 'N° Asientos' },
      { campo: 'numeroPasajeros', placeholder: 'Pasajeros' },
    ],
    separador: '/',
    colSpan: 2,
  },
  {
    tipo: 'grupo',
    campo: 'longitud',
    etiqueta: 'LARGO / ANCHO / ALTO (M)',
    numero: 13,
    campos: [
      { campo: 'longitud', placeholder: 'Largo' },
      { campo: 'ancho', placeholder: 'Ancho' },
      { campo: 'alto', placeholder: 'Alto' },
    ],
    separador: '/',
    colSpan: 2,
  },
  { campo: 'color', etiqueta: 'COLOR(ES)', numero: 14 },
  { campo: 'pesoNeto', etiqueta: 'PESO NETO VEHICULAR (KG)', numero: 15 },
  { campo: 'pesoBruto', etiqueta: 'PESO BRUTO VEHICULAR (KG)', numero: 16 },
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
  {
    tipo: 'grupo',
    campo: 'numeroAsientos',
    etiqueta: 'ASIENTOS / PASAJEROS',
    campos: [
      { campo: 'numeroAsientos', placeholder: 'Asientos' },
      { campo: 'numeroPasajeros', placeholder: 'Pasajeros' },
    ],
    separador: '/',
    colSpan: 2,
  },
  { campo: 'numeroRuedas', etiqueta: 'N° DE RUEDAS' },
  {
    tipo: 'grupo',
    campo: 'cilindrada',
    etiqueta: 'CILINDRADA (CC) / CILINDROS',
    campos: [
      { campo: 'cilindrada', placeholder: 'Cilindrada' },
      { campo: 'numeroCilindros', placeholder: 'N° Cilindros' },
    ],
    separador: '/',
    colSpan: 2,
  },
  { campo: 'version', etiqueta: 'VERSIÓN' },
  { campo: 'longitud', etiqueta: 'LONGITUD (M)' },
  { campo: 'vin', etiqueta: 'VIN' },
];

export const obtenerCamposVehiculoCertificado = (
  tipo: TipoCertificadoFaregas,
  modalidad?: string,
): CampoVehiculoCertificado[] => {
  if (tipo === 'CONFORMIDAD') return CAMPOS_CONFORMIDAD;
  if (tipo === 'GNV_ANUAL' || (tipo as string) === 'GNV_INICIAL') return CAMPOS_GNV;
  const mod = String(modalidad || '').toUpperCase();
  if ((tipo === 'GLP_ANUAL' && mod === 'INICIAL') || (tipo as string) === 'GLP_INICIAL') {
    return CAMPOS_GLP_INICIAL;
  }
  if (tipo === 'GLP_ANUAL') return CAMPOS_GLP_ANUAL;
  return [];
};

export const camposVehiculoEditables = (
  tipo: TipoCertificadoFaregas,
  modalidad?: string,
): string[] => {
  const elementos = obtenerCamposVehiculoCertificado(tipo, modalidad);
  const resultado: string[] = [];
  for (const item of elementos) {
    if (item.tipo === 'grupo' && item.campos) {
      for (const sub of item.campos) {
        if (!sub.automatico) {
          resultado.push(sub.campo);
        }
      }
    } else if (!item.automatico) {
      resultado.push(item.campo);
    }
  }
  return resultado;
};
