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
  // Remove I, O, Q and special characters
  return val.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
};

export const formatAlfanumerico = (val: string, max: number = 50): string => {
  return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, max);
};

export const formatAlfanumericoConEspacios = (val: string, max: number = 50): string => {
  return val.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, max);
};

export const formatFormulaRodante = (val: string): string => {
  // Solo numeros y X/x
  let v = val.toUpperCase().replace(/[^0-9X]/g, '');
  // No permitir más de una X
  const xCount = (v.match(/X/g) || []).length;
  if (xCount > 1) {
    v = v.replace(/X(.*)X/g, 'X$1'); // remove subsequent X
  }
  return v.slice(0, 7);
};

export const formatEntero = (val: string, maxDigits: number): string => {
  return val.replace(/[^0-9]/g, '').slice(0, maxDigits);
};

export const formatDecimal = (val: string, maxEnteros: number, maxDecimales: number): string => {
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
  const v = val.replace(/[^0-9]/g, '').slice(0, 4);
  if (v.length === 4) {
    const num = parseInt(v, 10);
    const maxYear = new Date().getFullYear() + 1;
    if (num > maxYear) return maxYear.toString();
    if (num < 1900) return '1900';
  }
  return v;
};
