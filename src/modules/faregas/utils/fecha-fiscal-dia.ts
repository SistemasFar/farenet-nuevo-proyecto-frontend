const ZONA_LIMA = 'America/Lima';

export const obtenerFechaHoyLima = (now = new Date()): string => {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_LIMA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
};

export const parsearFechaFiscal = (value?: string | null): [number, number, number] | null => {
  if (!value) return null;
  let fechaDia = value;
  // pg puede serializar DATE como ISO timestamp. Normalizarlo expresamente
  // en Lima evita tratar una fecha fiscal como una hora UTC.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaDia)) {
    if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(fechaDia)) return null;
    const instante = new Date(fechaDia);
    if (Number.isNaN(instante.getTime())) return null;
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_LIMA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instante);
    const valores = Object.fromEntries(partes.map(({ type, value: partValue }) => [type, partValue]));
    fechaDia = `${valores.year}-${valores.month}-${valores.day}`;
  }
  const [year, month, day] = fechaDia.split('-').map(Number);
  const validada = new Date(Date.UTC(year, month - 1, day));
  if (validada.getUTCFullYear() !== year || validada.getUTCMonth() + 1 !== month || validada.getUTCDate() !== day) return null;
  return [year, month, day];
};

export const fechaFiscalEsHoyLima = (fechaFiscal?: string | null, hoy = obtenerFechaHoyLima()): boolean => {
  const fiscal = parsearFechaFiscal(fechaFiscal);
  const actual = parsearFechaFiscal(hoy);
  return Boolean(fiscal && actual && fiscal.every((value, index) => value === actual[index]));
};

export const fechaFiscalEsAnteriorALima = (fechaFiscal?: string | null, hoy = obtenerFechaHoyLima()): boolean => {
  const fiscal = parsearFechaFiscal(fechaFiscal);
  const actual = parsearFechaFiscal(hoy);
  if (!fiscal || !actual) return false;
  for (let index = 0; index < fiscal.length; index += 1) {
    if (fiscal[index] !== actual[index]) return fiscal[index] < actual[index];
  }
  return false;
};

export const milisegundosHastaMedianocheLima = (now = new Date()): number => {
  const hoy = parsearFechaFiscal(obtenerFechaHoyLima(now));
  if (!hoy) return 60_000;
  // Lima permanece en UTC-05:00. Se agenda una única actualización al siguiente
  // inicio de día; el evento focus/visibility cubre suspensión del navegador.
  const siguienteInicioLima = Date.UTC(hoy[0], hoy[1] - 1, hoy[2] + 1, 5, 0, 0);
  return Math.max(1, siguienteInicioLima - now.getTime() + 100);
};
