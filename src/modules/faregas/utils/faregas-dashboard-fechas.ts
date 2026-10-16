/**
 * Utilidades de validación y cálculo de rangos de fechas para el Dashboard FAREGAS.
 * Restricción obligatoria: máximo un mes calendario por consulta.
 * Zona horaria de referencia: America/Lima (UTC-5).
 */

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export interface ResultadoValidacionRango {
  valido: boolean;
  codigo?: 'FORMATO_FECHAS_INVALIDO' | 'FECHA_INEXISTENTE' | 'RANGO_FECHAS_INVALIDO' | 'RANGO_FECHAS_EXCEDIDO' | 'ERROR_CALCULO_FECHAS';
  mensaje?: string;
  fechaMaximaPermitida?: string;
}

/**
 * Retorna la cantidad de días de un mes y año dados en calendario gregoriano.
 * month: 1 a 12.
 */
export function obtenerDiasEnMes(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Calcula la fecha máxima permitida (formato YYYY-MM-DD) para un valor 'desde'.
 * Regla: "la fecha inmediatamente anterior a sumar un mes calendario a la fecha inicial,
 * con el tratamiento adecuado de finales de mes. Las consultas de meses completos deben estar permitidas."
 *
 * Ejemplos válidos:
 * - 01/09/2026 al 30/09/2026 -> max: 2026-09-30
 * - 01/10/2026 al 31/10/2026 -> max: 2026-10-31
 * - 17/09/2026 al 16/10/2026 -> max: 2026-10-16
 * - 01/02/2026 al 28/02/2026 -> max: 2026-02-28
 * - 01/02/2028 al 29/02/2028 -> max: 2028-02-29
 */
export function calcularFechaMaximaPermitida(desdeStr: string): string | null {
  if (!desdeStr || typeof desdeStr !== 'string' || !REGEX_FECHA.test(desdeStr)) {
    return null;
  }

  const [yStr, mStr, dStr] = desdeStr.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);

  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1) {
    return null;
  }

  const diasMesActual = obtenerDiasEnMes(y, m);
  if (d > diasMesActual) {
    return null;
  }

  // Sumar 1 mes calendario
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  const diasMesSiguiente = obtenerDiasEnMes(nextYear, nextMonth);

  // Tratamiento adecuado de finales de mes:
  // Si el día supera los días del mes siguiente, se ajusta al último día del mes siguiente
  const targetDay = Math.min(d, diasMesSiguiente);

  // Fecha 1 mes después
  const fechaMasUnMes = new Date(Date.UTC(nextYear, nextMonth - 1, targetDay, 12, 0, 0));

  // Fecha inmediatamente anterior (restar 1 día exacto de 24 horas)
  const fechaMaxima = new Date(fechaMasUnMes.getTime() - 24 * 60 * 60 * 1000);

  const rY = fechaMaxima.getUTCFullYear();
  const rM = String(fechaMaxima.getUTCMonth() + 1).padStart(2, '0');
  const rD = String(fechaMaxima.getUTCDate()).padStart(2, '0');

  return `${rY}-${rM}-${rD}`;
}

/**
 * Valida si un rango [desdeStr, hastaStr] respeta el límite máximo de un mes.
 */
export function validarRangoFechasDashboard(desdeStr: string, hastaStr: string): ResultadoValidacionRango {
  if (!desdeStr || typeof desdeStr !== 'string' || !REGEX_FECHA.test(desdeStr)) {
    return {
      valido: false,
      codigo: 'FORMATO_FECHAS_INVALIDO',
      mensaje: 'El parámetro "desde" debe tener formato YYYY-MM-DD válido.'
    };
  }

  if (!hastaStr || typeof hastaStr !== 'string' || !REGEX_FECHA.test(hastaStr)) {
    return {
      valido: false,
      codigo: 'FORMATO_FECHAS_INVALIDO',
      mensaje: 'El parámetro "hasta" debe tener formato YYYY-MM-DD válido.'
    };
  }

  const [y1, m1, d1] = desdeStr.split('-').map(Number);
  const [y2, m2, d2] = hastaStr.split('-').map(Number);

  if (m1 < 1 || m1 > 12 || d1 < 1 || d1 > obtenerDiasEnMes(y1, m1)) {
    return {
      valido: false,
      codigo: 'FECHA_INEXISTENTE',
      mensaje: `La fecha inicial "${desdeStr}" no existe en el calendario.`
    };
  }

  if (m2 < 1 || m2 > 12 || d2 < 1 || d2 > obtenerDiasEnMes(y2, m2)) {
    return {
      valido: false,
      codigo: 'FECHA_INEXISTENTE',
      mensaje: `La fecha final "${hastaStr}" no existe en el calendario.`
    };
  }

  // Cronología: final no puede ser anterior a inicial
  if (hastaStr < desdeStr) {
    return {
      valido: false,
      codigo: 'RANGO_FECHAS_INVALIDO',
      mensaje: 'La fecha final no puede ser anterior a la fecha inicial.'
    };
  }

  // Límite de período máximo: máximo un mes calendario
  const fechaMaxima = calcularFechaMaximaPermitida(desdeStr);
  if (!fechaMaxima) {
    return {
      valido: false,
      codigo: 'ERROR_CALCULO_FECHAS',
      mensaje: 'No se pudo calcular el período máximo permitido para la fecha inicial.'
    };
  }

  if (hastaStr > fechaMaxima) {
    return {
      valido: false,
      codigo: 'RANGO_FECHAS_EXCEDIDO',
      mensaje: 'El período máximo permitido es de un mes. Selecciona un rango de fechas más corto.',
      fechaMaximaPermitida: fechaMaxima
    };
  }

  return {
    valido: true,
    fechaMaximaPermitida: fechaMaxima
  };
}

/**
 * Retorna la fecha de hoy en hora peruana (America/Lima) en formato YYYY-MM-DD.
 */
export function obtenerFechaHoyLima(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

/**
 * Calcula rangos de filtros rápidos garantizando que NUNCA superen el mes máximo permitido.
 * tipo: 'HOY' | 'AYER' | '7D' | '30D' | 'MES_ACTUAL' | 'MES_ANTERIOR'
 */
export function obtenerRangoRapido(
  tipo: 'HOY' | 'AYER' | '7D' | '30D' | 'MES_ACTUAL' | 'MES_ANTERIOR',
  fechaReferenciaLima?: string
): { desde: string; hasta: string } {
  const hoyStr = fechaReferenciaLima && REGEX_FECHA.test(fechaReferenciaLima)
    ? fechaReferenciaLima
    : obtenerFechaHoyLima();

  const [y, m, d] = hoyStr.split('-').map(Number);

  const formatearDateUTC = (dt: Date) => {
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  if (tipo === 'HOY') {
    return { desde: hoyStr, hasta: hoyStr };
  }

  if (tipo === 'AYER') {
    const dObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    dObj.setUTCDate(dObj.getUTCDate() - 1);
    const ayerStr = formatearDateUTC(dObj);
    return { desde: ayerStr, hasta: ayerStr };
  }

  if (tipo === '7D') {
    const dObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    dObj.setUTCDate(dObj.getUTCDate() - 6);
    return { desde: formatearDateUTC(dObj), hasta: hoyStr };
  }

  if (tipo === 'MES_ACTUAL') {
    const mesStr = String(m).padStart(2, '0');
    const dDesde = `${y}-${mesStr}-01`;
    return { desde: dDesde, hasta: hoyStr };
  }

  if (tipo === 'MES_ANTERIOR') {
    const prevYear = m === 1 ? y - 1 : y;
    const prevMonth = m === 1 ? 12 : m - 1;
    const diasPrev = obtenerDiasEnMes(prevYear, prevMonth);
    const mStr = String(prevMonth).padStart(2, '0');
    return {
      desde: `${prevYear}-${mStr}-01`,
      hasta: `${prevYear}-${mStr}-${String(diasPrev).padStart(2, '0')}`
    };
  }

  if (tipo === '30D') {
    // Calculamos inicialmente hoy - 29 días
    const dObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    dObj.setUTCDate(dObj.getUTCDate() - 29);
    let dDesdeStr = formatearDateUTC(dObj);

    // Garantizar que nunca supere el límite máximo permitido
    let validacion = validarRangoFechasDashboard(dDesdeStr, hoyStr);
    while (!validacion.valido && dDesdeStr < hoyStr) {
      // Si por efecto de febrero u otro límite excede un mes, avanzamos el día inicial hasta que sea válido
      const [ay, am, ad] = dDesdeStr.split('-').map(Number);
      const tempObj = new Date(Date.UTC(ay, am - 1, ad, 12, 0, 0));
      tempObj.setUTCDate(tempObj.getUTCDate() + 1);
      dDesdeStr = formatearDateUTC(tempObj);
      validacion = validarRangoFechasDashboard(dDesdeStr, hoyStr);
    }

    return { desde: dDesdeStr, hasta: hoyStr };
  }

  return { desde: hoyStr, hasta: hoyStr };
}
