import type { TipoCertificadoFaregas } from '../../types/faregas';

export type SubcampoVehiculo = {
  campo: string;
  placeholder?: string;
  etiqueta?: string;
  automatico?: boolean;
  formato?: 'dos-digitos';
};

export type CampoVehiculoCertificado = {
  tipo?: 'simple' | 'grupo';
  campo: string;
  etiqueta: string;
  numero?: number;
  grupo?: 'simple' | 'vin-serie';
  automatico?: boolean;
  valorAutomatico?: string;
  opciones?: Array<{ valor: string; etiqueta: string }>;
  campos?: SubcampoVehiculo[];
  separador?: string;
  colSpan?: number;
  columnaCertificado?: 'izquierda' | 'derecha';
};

const CAMPOS_GLP_INICIAL: CampoVehiculoCertificado[] = [
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
  { campo: 'combustible', etiqueta: 'COMBUSTIBLE ORIGINAL', numero: 11, columnaCertificado: 'derecha' },
  {
    tipo: 'grupo',
    campo: 'numeroEjes',
    etiqueta: 'N° EJES / N° RUEDAS',
    numero: 12,
    campos: [
      { campo: 'numeroEjes', placeholder: 'N° Ejes', formato: 'dos-digitos' },
      { campo: 'numeroRuedas', placeholder: 'N° Ruedas', formato: 'dos-digitos' },
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
      { campo: 'numeroAsientos', placeholder: 'N° Asientos', formato: 'dos-digitos' },
      { campo: 'numeroPasajeros', placeholder: 'Pasajeros', formato: 'dos-digitos' },
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
  {
    campo: 'combustible',
    etiqueta: 'COMBUSTIBLE',
    numero: 11,
    opciones: [
      { valor: 'BI-COMBUSTIBLE GLP', etiqueta: 'BI-COMBUSTIBLE GLP' },
      { valor: 'GLP', etiqueta: 'GLP' },
    ],
    columnaCertificado: 'derecha',
  },
  {
    tipo: 'grupo',
    campo: 'numeroEjes',
    etiqueta: 'N° EJES / N° RUEDAS',
    numero: 12,
    campos: [
      { campo: 'numeroEjes', placeholder: 'N° Ejes', formato: 'dos-digitos' },
      { campo: 'numeroRuedas', placeholder: 'N° Ruedas', formato: 'dos-digitos' },
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
      { campo: 'numeroAsientos', placeholder: 'N° Asientos', formato: 'dos-digitos' },
      { campo: 'numeroPasajeros', placeholder: 'Pasajeros', formato: 'dos-digitos' },
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

// El certificado anual GNV imprime los mismos 16 datos, pero en ocho filas
// emparejadas (1–8 a la izquierda y 9–16 a la derecha). La modalidad inicial
// conserva el formulario operativo que ya tenía.
const CAMPOS_GNV_ANUAL: CampoVehiculoCertificado[] = CAMPOS_GNV.map((campo) => ({
  ...campo,
  columnaCertificado: (campo.numero || 0) <= 8 ? 'izquierda' : 'derecha',
  ...(campo.campo === 'combustible'
    ? { automatico: true, valorAutomatico: 'BI-COMBUSTIBLE GNV' }
    : {}),
}));

const CAMPOS_GNV_INICIAL: CampoVehiculoCertificado[] = CAMPOS_GNV.map((campo) => ({
  ...campo,
  columnaCertificado: (campo.numero || 0) <= 8 ? 'izquierda' : 'derecha',
  ...(campo.campo === 'combustible'
    ? { etiqueta: 'COMBUSTIBLE ORIGINAL' }
    : {}),
  ...(campo.campo === 'pesoNeto'
    ? { etiqueta: 'PESO NETO (KG)' }
    : {}),
}));

// Orden oficial del formato dinámico CONFORMIDAD (versión 2 vigente) y documento Word.
// Dos columnas: 13 filas paralelas. Fila 1 = Placa de rodaje y Clase. Filas 2 a 13 = Tabla técnica.
export const CAMPOS_CONFORMIDAD: CampoVehiculoCertificado[] = [
  // Fila 1: Placa de rodaje (izq) / Clase (der)
  { campo: 'placaNueva', etiqueta: 'PLACA DE RODAJE', automatico: true, columnaCertificado: 'izquierda' },
  { campo: 'clase', etiqueta: 'CLASE', columnaCertificado: 'derecha' },

  // Fila 2: Categoría (izq) / Altura (metros) (der)
  { campo: 'categoria', etiqueta: 'CATEGORÍA', columnaCertificado: 'izquierda' },
  { campo: 'alto', etiqueta: 'ALTURA (METROS)', columnaCertificado: 'derecha' },

  // Fila 3: Modelo (izq) / Ancho (metros) (der)
  { campo: 'modelo', etiqueta: 'MODELO', columnaCertificado: 'izquierda' },
  { campo: 'ancho', etiqueta: 'ANCHO (METROS)', columnaCertificado: 'derecha' },

  // Fila 4: Marca (izq) / Peso bruto (kg) (der)
  { campo: 'marca', etiqueta: 'MARCA', columnaCertificado: 'izquierda' },
  { campo: 'pesoBruto', etiqueta: 'PESO BRUTO (KG)', columnaCertificado: 'derecha' },

  // Fila 5: Serie / Chasis (izq) / Peso neto (kg) (der)
  { campo: 'serieChasis', etiqueta: 'SERIE / CHASIS', columnaCertificado: 'izquierda' },
  { campo: 'pesoNeto', etiqueta: 'PESO NETO (KG)', columnaCertificado: 'derecha' },

  // Fila 6: Motor (izq) / Carga útil (kg) (der)
  { campo: 'numeroMotor', etiqueta: 'MOTOR', columnaCertificado: 'izquierda' },
  { campo: 'cargaUtil', etiqueta: 'CARGA ÚTIL (KG)', columnaCertificado: 'derecha' },

  // Fila 7: Color (izq) / Año de fabricación (der)
  { campo: 'color', etiqueta: 'COLOR', columnaCertificado: 'izquierda' },
  { campo: 'anioFabricacion', etiqueta: 'AÑO DE FABRICACIÓN', columnaCertificado: 'derecha' },

  // Fila 8: Carrocería (izq) / Año de modelo (der)
  { campo: 'carroceria', etiqueta: 'CARROCERÍA', columnaCertificado: 'izquierda' },
  { campo: 'anioModelo', etiqueta: 'AÑO DE MODELO', columnaCertificado: 'derecha' },

  // Fila 9: Combustible (izq) / Fórmula rodante (der)
  { campo: 'combustible', etiqueta: 'COMBUSTIBLE', columnaCertificado: 'izquierda' },
  { campo: 'formulaRodante', etiqueta: 'FÓRMULA RODANTE', columnaCertificado: 'derecha' },

  // Fila 10: Potencia (kw / rpm) (izq) / N° Ejes (der)
  { campo: 'potencia', etiqueta: 'POTENCIA (KW / RPM)', columnaCertificado: 'izquierda' },
  { campo: 'numeroEjes', etiqueta: 'N° EJES', columnaCertificado: 'derecha' },

  // Fila 11: Asientos / Pasajeros (izq) / N° Ruedas (der)
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
    columnaCertificado: 'izquierda',
  },
  { campo: 'numeroRuedas', etiqueta: 'N° RUEDAS', columnaCertificado: 'derecha' },

  // Fila 12: Cilindrada (cc) / Cilindros (izq) / Versión (der)
  {
    tipo: 'grupo',
    campo: 'cilindrada',
    etiqueta: 'CILINDRADA (CC) / CILINDROS',
    campos: [
      { campo: 'cilindrada', placeholder: 'Cilindrada' },
      { campo: 'numeroCilindros', placeholder: 'Cilindros' },
    ],
    separador: '/',
    colSpan: 2,
    columnaCertificado: 'izquierda',
  },
  { campo: 'version', etiqueta: 'VERSIÓN', columnaCertificado: 'derecha' },

  // Fila 13: Longitud (metros) (izq) / VIN (der)
  { campo: 'longitud', etiqueta: 'LONGITUD (METROS)', columnaCertificado: 'izquierda' },
  { campo: 'vin', etiqueta: 'VIN', columnaCertificado: 'derecha' },
];

export interface ResolucionServicioConformidad {
  esCambioDeMotor: boolean;
  esPesados: boolean;
  esModificacionDatos: boolean;
  caracteristicaFija: string | null;
  tipoTrabajoSugerido: 'MODIFICACION' | 'MONTAJE' | 'FABRICACION';
  usoOriginalSugerido: string;
  opcionesCaracteristica: string[];
}

export const CODIGOS_CAMBIO_MOTOR = [
  '0026', '0046', '0086', '0106', '0126', '0146', '0166', '0186',
  '0206', '0214', '0226', '0303', '0351', '0390', '0513',
];

export const CODIGOS_PESADOS = [
  '0047', '0087', '0107', '0127', '0147', '0167', '0187', '0207',
  '0352', '0391', '0227', 'CONFORMIDAD_PESADO',
];

export const CODIGOS_MODIFICACION_DATOS = [
  '0025', '0045', '0085', '0105', '0125', '0145', '0165', '0185',
  '0205', '0213', '0225', '0350', '0389', '0302', '0512', 'CONFORMIDAD_LIVIANO',
];

export const CARACTERISTICAS_REGISTRABLES_CATALOGO = [
  'CAMBIO DE CARROCERÍA',
  'MODIFICACIÓN DE EJES',
  'MODIFICACIÓN DE PESOS Y MEDIDAS',
  'CAMBIO DE COLOR',
  'CAMBIO DE COMBUSTIBLE',
  'MODIFICACIÓN DE ASIENTOS Y PASAJEROS',
  'CAMBIO DE MOTOR',
  'CAMBIO DE CATEGORÍA',
  'RECTIFICACIÓN DE CARACTERÍSTICAS REGISTRABLES',
];

export const USOS_ORIGINALES_CATALOGO = [
  'PERSONAS',
  'MERCANCÍAS',
  'MIXTO',
];

export function resolverServicioConformidad(
  servicioCodigo?: string,
  servicioNombre?: string,
): ResolucionServicioConformidad {
  const cod = String(servicioCodigo || '').trim().toUpperCase();
  const nom = String(servicioNombre || '').trim().toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const esCambioMotor = CODIGOS_CAMBIO_MOTOR.includes(cod) || nom.includes('CAMBIO DE MOTOR');
  if (esCambioMotor) {
    return {
      esCambioDeMotor: true,
      esPesados: false,
      esModificacionDatos: false,
      caracteristicaFija: 'CAMBIO DE MOTOR',
      tipoTrabajoSugerido: 'MODIFICACION',
      usoOriginalSugerido: 'PERSONAS',
      opcionesCaracteristica: ['CAMBIO DE MOTOR'],
    };
  }

  const esPesados = CODIGOS_PESADOS.includes(cod) || nom.includes('PESADOS');
  if (esPesados) {
    return {
      esCambioDeMotor: false,
      esPesados: true,
      esModificacionDatos: false,
      caracteristicaFija: null,
      tipoTrabajoSugerido: 'MODIFICACION',
      usoOriginalSugerido: 'MERCANCÍAS',
      opcionesCaracteristica: CARACTERISTICAS_REGISTRABLES_CATALOGO,
    };
  }

  const esModDatos = CODIGOS_MODIFICACION_DATOS.includes(cod) || nom.includes('MODIFICACION DE DATOS');
  if (esModDatos) {
    return {
      esCambioDeMotor: false,
      esPesados: false,
      esModificacionDatos: true,
      caracteristicaFija: null,
      tipoTrabajoSugerido: 'MODIFICACION',
      usoOriginalSugerido: 'PERSONAS',
      opcionesCaracteristica: CARACTERISTICAS_REGISTRABLES_CATALOGO,
    };
  }

  return {
    esCambioDeMotor: false,
    esPesados: false,
    esModificacionDatos: false,
    caracteristicaFija: null,
    tipoTrabajoSugerido: 'MODIFICACION',
    usoOriginalSugerido: 'PERSONAS',
    opcionesCaracteristica: CARACTERISTICAS_REGISTRABLES_CATALOGO,
  };
}

export const obtenerCamposVehiculoCertificado = (
  tipo: TipoCertificadoFaregas,
  modalidad?: string,
): CampoVehiculoCertificado[] => {
  if (tipo === 'CONFORMIDAD') return CAMPOS_CONFORMIDAD;
  const mod = String(modalidad || '').toUpperCase();
  if (tipo === 'GNV_ANUAL' && mod === 'ANUAL') return CAMPOS_GNV_ANUAL;
  if ((tipo === 'GNV_ANUAL' && mod === 'INICIAL') || (tipo as string) === 'GNV_INICIAL') {
    return CAMPOS_GNV_INICIAL;
  }
  if (tipo === 'GNV_ANUAL') return CAMPOS_GNV;
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
