import { describe, expect, it } from 'vitest';
import { alternarIncumplimientoGlp, marcarTodasVerificacionesGlpComoCumple } from './glp-verificaciones';

describe('verificaciones simplificadas GLP', () => {
  it('marca los siete puntos como cumple con una sola acción', () => {
    const pendientes = Array.from({ length: 7 }, (_, indice) => ({ codigo: String(indice), cumple: null, observacion: 'PENDIENTE' }));
    const resultado = marcarTodasVerificacionesGlpComoCumple(pendientes);

    expect(resultado).toHaveLength(7);
    expect(resultado.every((item) => item.cumple === true && item.observacion === '')).toBe(true);
  });

  it('permite reportar únicamente el punto que no cumple', () => {
    const pendientes = Array.from({ length: 7 }, (_, indice) => ({ codigo: String(indice), cumple: null, observacion: '' }));
    const resultado = alternarIncumplimientoGlp(pendientes, 2);

    expect(resultado[2].cumple).toBe(false);
    expect(resultado.filter((item) => item.cumple === true)).toHaveLength(6);
    expect(alternarIncumplimientoGlp(resultado, 2).every((item) => item.cumple === true)).toBe(true);
  });
});
