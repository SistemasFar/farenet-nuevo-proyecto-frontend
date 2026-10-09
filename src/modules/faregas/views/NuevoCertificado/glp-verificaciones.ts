type VerificacionGlp = {
  cumple?: boolean | null;
  observacion?: string;
  [campo: string]: unknown;
};

export const marcarTodasVerificacionesGlpComoCumple = (verificaciones: VerificacionGlp[] = []) => verificaciones.map((verificacion) => ({
  ...verificacion,
  cumple: true,
  observacion: ''
}));

export const alternarIncumplimientoGlp = (verificaciones: VerificacionGlp[] = [], indice: number) => verificaciones.map((verificacion, posicion) => {
  if (posicion === indice) {
    const noCumple = verificacion.cumple !== false;
    return {
      ...verificacion,
      cumple: noCumple ? false : true,
      observacion: noCumple ? (verificacion.observacion || '') : ''
    };
  }

  return verificacion.cumple === null || verificacion.cumple === undefined
    ? { ...verificacion, cumple: true, observacion: '' }
    : verificacion;
});
