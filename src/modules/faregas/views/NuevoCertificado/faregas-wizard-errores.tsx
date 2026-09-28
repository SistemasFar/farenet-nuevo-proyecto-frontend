import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * Errores de campo del paso actual, indexados por la clave del campo.
 * La clave es la misma que usa el atributo `name` del input, de modo que un
 * error siempre sabe a qué control pertenece sin heurísticas.
 */
export type ErroresCampo = Record<string, string>;

/**
 * Aplica el borde de error reemplazando el color de borde existente en vez de
 * añadir otro. Tailwind no resuelve el conflicto por el orden del atributo
 * class, sino por el orden de sus clases generadas: dos utilidades de borde
 * compiten y gana la que esté después en esa hoja. Sustituir la clase del color
 * es la única forma fiable de ganar sin reconfigurar el orden.
 */
export const claseConError = (claseBase: string, hayError: boolean): string => {
  if (!hayError) return claseBase;
  return `${claseBase.replace(/border-(?:slate|gray|red|green|amber|emerald)-?\d*/g, '').trim()} border-red-500`;
};

export const idMensajeError = (campo: string): string => `error-${campo}`;

/** Borde rojo + aviso para accesibilidad, en un solo punto reutilizable. */
export const estiloErrorCampo = (campo: string, errores: ErroresCampo) => ({
  'aria-invalid': errores[campo] ? true : undefined,
  'aria-describedby': errores[campo] ? idMensajeError(campo) : undefined,
} as const);

type PropsMensajeError = { campo: string; errores: ErroresCampo };

/** Mensaje individual bajo el campo. No renderiza nada si el campo es válido. */
export function MensajeError({ campo, errores }: PropsMensajeError) {
  const mensaje = errores[campo];
  if (!mensaje) return null;
  return (
    <p
      id={idMensajeError(campo)}
      role="alert"
      className="mt-1 text-xs font-semibold text-red-600"
    >
      {mensaje}
    </p>
  );
}

type EstadoErrores = {
  errores: ErroresCampo;
  /** Guarda el resultado y devuelve true si hay al menos un error. */
  registrar: (errores: ErroresCampo) => boolean;
  /** Limpia únicamente el error de un campo, al corregirlo. */
  limpiarCampo: (campo: string) => void;
  limpiarTodo: () => void;
  /** Lleva la vista al primer campo marcado y le da foco si es posible. */
  enfocarPrimerError: () => void;
  total: number;
};

/**
 * Estado de validación de un paso del asistente.
 *
 * Deliberadamente no guarda los datos: sólo recuerda qué campos están mal. El
 * autosave sigue funcionando con datos incompletos (guardar un borrador a medias
 * es válido); lo estricto es únicamente la acción de avanzar.
 */
export const useErroresPaso = (): EstadoErrores => {
  const [errores, setErrores] = useState<ErroresCampo>({});
  const contenedorRef = useRef<HTMLElement | null>(null);

  const registrar = useCallback((nuevos: ErroresCampo) => {
    setErrores(nuevos);
    return Object.keys(nuevos).length > 0;
  }, []);

  const limpiarCampo = useCallback((campo: string) => {
    setErrores((previos) => {
      if (!previos[campo]) return previos;
      const siguiente = { ...previos };
      delete siguiente[campo];
      return siguiente;
    });
  }, []);

  const limpiarTodo = useCallback(() => setErrores({}), []);

  const enfocarPrimerError = useCallback(() => {
    if (typeof document === 'undefined') return;
    const raiz = contenedorRef.current ?? document;
    // data-campo-error es la marca que cada campo inválido expone, y evita
    // depender del orden del DOM o deselectores frágiles.
    const marcado = raiz.querySelector<HTMLElement>('[data-campo-error="true"]');
    if (!marcado) return;
    marcado.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const control = marcado.matches('input,select,textarea')
      ? marcado
      : marcado.querySelector<HTMLElement>('input,select,textarea');
    if (control && typeof control.focus === 'function') {
      try { control.focus({ preventScroll: true }); } catch { control.focus(); }
    }
  }, []);

  return useMemo(
    () => ({
      errores,
      registrar,
      limpiarCampo,
      limpiarTodo,
      enfocarPrimerError,
      total: Object.keys(errores).length,
    }),
    [errores, registrar, limpiarCampo, limpiarTodo, enfocarPrimerError]
  );
};

/** Atributos comunes a cualquier control: borde, foco y accesibilidad. */
export const propsCampo = (campo: string, errores: ErroresCampo, claseBase: string) => ({
  className: claseConError(claseBase, Boolean(errores[campo])),
  'data-campo-error': errores[campo] ? true : undefined,
  ...estiloErrorCampo(campo, errores),
});
