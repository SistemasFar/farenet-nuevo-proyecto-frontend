type VerificacionGnv = {
  cumple?: boolean | null;
  observacion?: string;
  [campo: string]: unknown;
};

export const marcarTodasVerificacionesGnvComoCumple = (verificaciones: VerificacionGnv[] = []) => verificaciones.map((verificacion) => ({
  ...verificacion,
  cumple: true,
  observacion: ''
}));

export const alternarIncumplimientoGnv = (verificaciones: VerificacionGnv[] = [], indice: number) => verificaciones.map((verificacion, posicion) => {
  if (posicion === indice) {
    const noCumple = verificacion.cumple !== false;
    return {
      ...verificacion,
      cumple: noCumple ? false : true,
      observacion: noCumple ? (verificacion.observacion || '') : ''
    };
  }
  // Al registrar la primera excepción, los demás puntos pendientes quedan
  // conformes. Así el operador sólo interactúa con los incumplimientos reales.
  return verificacion.cumple === null || verificacion.cumple === undefined
    ? { ...verificacion, cumple: true, observacion: '' }
    : verificacion;
});
