/**
 * vehiculo-formatters.ts
 * Utilidades para aplicar máscaras y restricciones a los campos de datos técnicos del vehículo
 */

export const formatPlaca = (val: string): string => {
  let v = val.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  
  // Auto-insert hyphen if missing and has 3 letters/numbers
  if (v.length > 3 && !v.includes('-')) {
    v = v.slice(0, 3) + '-' + v.slice(3);
  }
  
  // If it has multiple hyphens or hyphens in wrong place, fix it (advanced)
  v = v.replace(/-+/g, '-');
  
  return v.slice(0, 7); // ABC-123 (7 chars max)
};

export const formatVIN = (val: string): string => {
  // Remove I, O, Q and special characters (allows * for physical card notation)
  return val.toUpperCase().replace(/[^A-HJ-NPR-Z0-9*]/g, '').slice(0, 17);
};

export const formatAlfanumerico = (val: string, max: number = 50): string => {
  return val.toUpperCase().replace(/[^A-Z0-9*]/g, '').slice(0, max);
};

export const formatAlfanumericoConEspacios = (val: string, max: number = 50): string => {
  return val.toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÜÑ *./-]/g, '').slice(0, max);
};

export const formatFormulaRodante = (val: string): string => {
  const limpio = val.trim();
  if (/^\*+$/.test(limpio)) return limpio.slice(0, 7);
  // Solo numeros y X/x
  let v = val.toUpperCase().replace(/[^0-9X*]/g, '');
  // No permitir más de una X
  const xCount = (v.match(/X/g) || []).length;
  if (xCount > 1) {
    v = v.replace(/X(.*)X/g, 'X$1'); // remove subsequent X
  }
  return v.slice(0, 7);
};

export const formatEntero = (val: string, maxDigits: number): string => {
  const limpio = val.trim();
  if (/^\*+$/.test(limpio)) return limpio.slice(0, Math.max(maxDigits, 5));
  return val.replace(/[^0-9*]/g, '').slice(0, maxDigits);
};

export const formatDecimal = (val: string, maxEnteros: number, maxDecimales: number): string => {
  const limpio = val.trim();
  if (/^\*+$/.test(limpio)) return limpio.slice(0, Math.max(maxEnteros, 5));
  let v = val.replace(/[^0-9.]/g, '');
  // Evitar multiples puntos
  const dotParts = v.split('.');
  if (dotParts.length > 2) {
    v = dotParts[0] + '.' + dotParts.slice(1).join('');
  }
  
  if (v.includes('.')) {
    const [int, dec] = v.split('.');
    return `${int.slice(0, maxEnteros)}.${dec.slice(0, maxDecimales)}`;
  }
  
  return v.slice(0, maxEnteros);
};

export const formatMes = (val: string): string => {
  const v = val.replace(/[^0-9]/g, '');
  if (!v) return '';
  const num = parseInt(v, 10);
  if (num > 12) return '12';
  if (v.length === 2 && num < 1) return '01';
  return v.slice(0, 2);
};

export const formatAnio = (val: string): string => {
  const limpio = val.trim();
  if (/^\*+$/.test(limpio)) return limpio.slice(0, 5);
  const v = val.replace(/[^0-9]/g, '').slice(0, 4);
  if (v.length === 4) {
    const num = parseInt(v, 10);
    const maxYear = new Date().getFullYear() + 1;
    if (num > maxYear) return maxYear.toString();
    if (num < 1900) return '1900';
  }
  return v;
};

export interface PeriodoFabricacion {
  mes: string;
  anio: string;
}

/**
 * Mantiene únicamente los caracteres necesarios para escribir un período de
 * fabricación. Admite el formato oficial MM-AAAA, el formato ISO AAAA-MM y el
 * año histórico sin mes (AAAA).
 */
export const formatPeriodoFabricacion = (val: string): string => {
  const limpio = String(val ?? '').replace(/[^0-9-]/g, '');
  const separador = limpio.indexOf('-');
  if (separador < 0) return limpio.slice(0, 4);

  const izquierda = limpio.slice(0, separador).replace(/[^0-9]/g, '');
  const derecha = limpio.slice(separador + 1).replace(/[^0-9]/g, '');
  const anioPrimero = izquierda.length > 2;

  return anioPrimero
    ? `${izquierda.slice(0, 4)}-${derecha.slice(0, 2)}`
    : `${izquierda.slice(0, 2)}-${derecha.slice(0, 4)}`;
};

const esMesValido = (mes: string): boolean => {
  const numero = Number(mes);
  return /^\d{1,2}$/.test(mes) && numero >= 1 && numero <= 12;
};

const esAnioValido = (anio: string): boolean => {
  if (!/^\d{4}$/.test(anio)) return false;
  const numero = Number(anio);
  return numero >= 1900 && numero <= new Date().getFullYear() + 1;
};

/** Separa un período completo sin enviar el guion a las columnas numéricas. */
export const descomponerPeriodoFabricacion = (val: string): PeriodoFabricacion => {
  const periodo = formatPeriodoFabricacion(val);
  if (esAnioValido(periodo)) return { mes: '', anio: periodo };

  const mesAnio = periodo.match(/^(\d{1,2})-(\d{4})$/);
  if (mesAnio && esMesValido(mesAnio[1]) && esAnioValido(mesAnio[2])) {
    return { mes: mesAnio[1].padStart(2, '0'), anio: mesAnio[2] };
  }

  const anioMes = periodo.match(/^(\d{4})-(\d{1,2})$/);
  if (anioMes && esAnioValido(anioMes[1]) && esMesValido(anioMes[2])) {
    return { mes: anioMes[2].padStart(2, '0'), anio: anioMes[1] };
  }

  return { mes: '', anio: '' };
};

/** Presenta los valores separados usando la convención del certificado. */
export const presentarPeriodoFabricacion = (mes: unknown, anio: unknown): string => {
  const anioTexto = String(anio ?? '').trim();
  if (!anioTexto) return '';
  const mesTexto = String(mes ?? '').replace(/[^0-9]/g, '').slice(0, 2);
  return mesTexto ? `${mesTexto.padStart(2, '0')}-${anioTexto}` : anioTexto;
};
