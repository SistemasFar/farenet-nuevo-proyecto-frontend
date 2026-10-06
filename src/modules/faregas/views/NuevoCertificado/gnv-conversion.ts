const normalizarTexto = (valor: unknown) => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, '');

/**
 * Compara combustibles por su significado y no por la puntuación usada.
 * Ejemplo: "BI COMBUSTIBLE/GNV" y "BI - COMBUSTIBLE GNV" son lo mismo.
 */
export const combustiblesGnvSonEquivalentes = (antes: unknown, despues: unknown): boolean => {
  const combustibleAntes = normalizarTexto(antes);
  const combustibleDespues = normalizarTexto(despues);
  return Boolean(combustibleAntes && combustibleDespues && combustibleAntes === combustibleDespues);
};

/** Compara pesos escritos con punto o coma, tolerando sólo redondeo decimal. */
export const pesosGnvSonIguales = (antes: unknown, despues: unknown): boolean => {
  const pesoAntes = Number(String(antes ?? '').trim().replace(',', '.'));
  const pesoDespues = Number(String(despues ?? '').trim().replace(',', '.'));
  if (!Number.isFinite(pesoAntes) || !Number.isFinite(pesoDespues)) return false;
  return Math.abs(pesoAntes - pesoDespues) < 0.001;
};

