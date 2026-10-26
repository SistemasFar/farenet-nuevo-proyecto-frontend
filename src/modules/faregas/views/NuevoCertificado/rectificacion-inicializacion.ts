type DatosCargaRectificacion = {
  estado?: unknown;
  tipo?: { clave?: unknown } | null;
  servicio?: {
    codigo?: unknown;
    nombre?: unknown;
    tipoFlujo?: unknown;
  } | null;
  vehiculo?: unknown;
};

const texto = (valor: unknown) => String(valor ?? '').trim();

export const validarCargaRectificacion = (datos: DatosCargaRectificacion | null | undefined): string | null => {
  if (!datos) {
    return 'El servidor no devolvió los datos del certificado emitido.';
  }
  if (texto(datos.estado).toUpperCase() !== 'EMITIDO') {
    return 'El certificado ya no se encuentra en estado EMITIDO y no puede abrirse para rectificación.';
  }
  if (!texto(datos.tipo?.clave)) {
    return 'El certificado no tiene un tipo técnico asociado. No es posible determinar qué formulario debe abrirse.';
  }
  if (!texto(datos.servicio?.codigo) || !texto(datos.servicio?.nombre) || !texto(datos.servicio?.tipoFlujo)) {
    return 'El certificado no tiene un servicio operativo completo asociado. Revise la tarifa y el catálogo del servicio antes de rectificar.';
  }
  if (texto(datos.servicio?.tipoFlujo).toUpperCase() !== 'TALLER_INSPECCION' && !datos.vehiculo) {
    return 'El certificado no contiene el registro original del vehículo necesario para iniciar la rectificación.';
  }
  return null;
};

export const obtenerPasoWizard = <T>(pasos: readonly T[], indice: number): T | null => {
  if (!Number.isInteger(indice) || indice < 0 || indice >= pasos.length) return null;
  return pasos[indice];
};
