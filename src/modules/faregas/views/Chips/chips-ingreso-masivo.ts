const ENCABEZADOS_CODIGO = new Set([
  'CODIGO', 'CODIGO CHIP', 'CODIGO DEL CHIP', 'CHIP', 'NUMERO', 'NUMERO CHIP',
  'NUMERO DEL CHIP', 'SERIAL', 'NRO CHIP'
]);

export const parseChipScan = (text: string) => {
  const vistos = new Set<string>();
  const validos: string[] = [];
  const duplicados: string[] = [];
  const errores: string[] = [];
  text.split(/[\r\n,;\t]+/).forEach((entrada) => {
    const codigo = entrada.trim().toUpperCase();
    if (!codigo) return;
    if (codigo.length > 120 || !/^[A-Z0-9._/-]+$/.test(codigo)) errores.push(codigo);
    else if (vistos.has(codigo)) duplicados.push(codigo);
    else {
      vistos.add(codigo);
      validos.push(codigo);
    }
  });
  return { validos, duplicados, errores };
};

const normalizarEncabezado = (valor: unknown) => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toUpperCase()
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ');

/**
 * Extrae los seriales de una hoja. Si encuentra una cabecera conocida usa esa
 * columna; en archivos sencillos sin cabecera usa la primera columna.
 */
export const extraerCodigosDeHoja = (filas: unknown[][]): string[] => {
  const filasConDatos = filas.filter((fila) => Array.isArray(fila) && fila.some((celda) => String(celda ?? '').trim()));
  if (filasConDatos.length === 0) return [];

  let indiceCabecera = -1;
  let indiceColumna = 0;
  for (let fila = 0; fila < Math.min(filasConDatos.length, 10); fila += 1) {
    const columna = filasConDatos[fila].findIndex((celda) => ENCABEZADOS_CODIGO.has(normalizarEncabezado(celda)));
    if (columna >= 0) {
      indiceCabecera = fila;
      indiceColumna = columna;
      break;
    }
  }

  return filasConDatos
    .slice(indiceCabecera >= 0 ? indiceCabecera + 1 : 0)
    .map((fila) => String(fila[indiceColumna] ?? '').trim().toUpperCase())
    .filter(Boolean);
};

export type DatosRangoChips = {
  prefijo: string;
  desde: string | number;
  hasta: string | number;
  digitos: string | number;
};

export const generarCodigosPorRango = ({ prefijo, desde, hasta, digitos }: DatosRangoChips): string[] => {
  const prefijoNormalizado = String(prefijo ?? '').trim().toUpperCase();
  const inicio = Number(desde);
  const fin = Number(hasta);
  const longitud = Number(digitos);

  if (!/^[A-Z0-9._/-]*$/.test(prefijoNormalizado)) {
    throw new Error('El prefijo sólo puede contener letras, números, punto, guion o barra.');
  }
  if (!Number.isSafeInteger(inicio) || !Number.isSafeInteger(fin) || inicio < 0 || fin < inicio) {
    throw new Error('Revise el número inicial y final del rango.');
  }
  if (!Number.isSafeInteger(longitud) || longitud < 1 || longitud > 15) {
    throw new Error('La cantidad de dígitos debe estar entre 1 y 15.');
  }

  const cantidad = fin - inicio + 1;
  if (cantidad > 1000) throw new Error('Cada lote puede contener como máximo 1000 códigos.');

  return Array.from({ length: cantidad }, (_, indice) => {
    const numero = String(inicio + indice).padStart(longitud, '0');
    const codigo = `${prefijoNormalizado}${numero}`;
    if (codigo.length > 120) throw new Error('Los códigos generados son demasiado largos.');
    return codigo;
  });
};
