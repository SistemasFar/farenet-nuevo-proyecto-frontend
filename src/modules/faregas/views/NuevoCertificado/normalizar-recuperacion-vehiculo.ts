export interface ResultadoValorRecuperado {
  valor: string;
  valorOriginal: string;
  compatible: boolean;
  advertencia: string | null;
}

/**
 * Normaliza un valor obtenido de una fuente externa contra el conjunto que el
 * formulario permite. Un valor incompatible queda vacío para que el usuario
 * lo complete; nunca se sustituye por otra opción automáticamente.
 */
export const normalizarValorRecuperadoConOpciones = (
  valor: unknown,
  opciones: readonly string[],
  etiqueta: string,
): ResultadoValorRecuperado => {
  const valorOriginal = String(valor ?? '').trim();
  if (!valorOriginal) {
    return { valor: '', valorOriginal, compatible: true, advertencia: null };
  }

  const opcion = opciones.find((item) => item.toUpperCase() === valorOriginal.toUpperCase());
  if (opcion) {
    return { valor: opcion, valorOriginal, compatible: true, advertencia: null };
  }

  return {
    valor: '',
    valorOriginal,
    compatible: false,
    advertencia: `El valor recuperado de ${etiqueta} ("${valorOriginal}") no está permitido para este trámite. Opciones válidas: ${opciones.join(' o ')}. El campo quedó vacío; seleccione el valor correcto manualmente.`,
  };
};

export const esGlpInicial = (tipoCertificado: unknown, modalidad: unknown): boolean => (
  String(tipoCertificado ?? '').trim().toUpperCase() === 'GLP_INICIAL'
  || (
    String(tipoCertificado ?? '').trim().toUpperCase() === 'GLP_ANUAL'
    && String(modalidad ?? '').trim().toUpperCase() === 'INICIAL'
  )
);

export const normalizarCombustibleRecuperado = (
  valor: unknown,
  requiereCombustibleGlpInicial: boolean,
): ResultadoValorRecuperado => requiereCombustibleGlpInicial
  ? normalizarValorRecuperadoConOpciones(valor, ['GASOLINA', 'DIESEL'], 'combustible original')
  : {
      valor: String(valor ?? '').trim(),
      valorOriginal: String(valor ?? '').trim(),
      compatible: true,
      advertencia: null,
    };

export const normalizarCategoriaRecuperada = (
  valor: unknown,
  opciones: readonly { key: string; nombre: string }[],
): ResultadoValorRecuperado => {
  const valorOriginal = String(valor ?? '').trim();
  if (!valorOriginal || opciones.length === 0) {
    return { valor: valorOriginal, valorOriginal, compatible: true, advertencia: null };
  }
  const opcion = opciones.find((item) => (
    item.key.trim().toUpperCase() === valorOriginal.toUpperCase()
    || item.nombre.trim().toUpperCase() === valorOriginal.toUpperCase()
  ));
  if (opcion) {
    return { valor: opcion.key, valorOriginal, compatible: true, advertencia: null };
  }
  return {
    valor: '',
    valorOriginal,
    compatible: false,
    advertencia: `La categoría recuperada ("${valorOriginal}") no existe en las opciones locales. El campo quedó vacío; seleccione la categoría correcta manualmente.`,
  };
};
