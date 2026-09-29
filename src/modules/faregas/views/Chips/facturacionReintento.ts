/**
 * Regla única de "este comprobante se puede reintentar".
 *
 * Vive aparte para que el resultado de la venta y el detalle de la venta
 * no puedan discrepar: las dos pantallas usan exactamente el mismo criterio.
 *
 * No inventa estados. Se deduce de las reglas reales del backend
 * (`faregas-facturacion.service.js` → `reservarEmisionOperacion`):
 *
 *   ACEPTADO / PENDIENTE_SUNAT → el backend responde `yaAceptada` y no
 *       reenvía nada. Reintentar sería un no-op: el botón no se ofrece.
 *   RECHAZADO → el endpoint de reintento lo permitiría, pero reenviar a SUNAT
 *       el mismo número rechazado reproduce el mismo rechazo, y además
 *       `guardarFacturacionOperacion` devuelve temprano sin dejar corregir
 *       los datos. Queda fuera a propósito; se resuelve por anulación, que
 *       es otro flujo.
 *   BORRADOR → aún no se intentó emitir. No es un fallo que reintentar.
 *   ERROR / PENDIENTE → sí. `PENDIENTE` está sujeto al lock de 2 minutos del
 *       backend (`retryLockMs`), que se manifiesta como un mensaje de error
 *       si se pulsa demasiado pronto.
 *
 * Exigir `serie` y `numero` es la guarda de seguridad importante: sin un
 * correlativo ya reservado, `reservarEmisionOperacion` reservaría OTRO
 * número. Como esta función exige que existan, el botón nunca puede llevar a
 * un consumo de correlativo nuevo.
 */

export const ESTADOS_REINTENTABLES = ['ERROR', 'PENDIENTE'] as const;

export interface ComprobanteReintentable {
  estado?: string | null;
  serie?: string | null;
  numero?: number | null;
}

export const esComprobanteReintentable = (
  comprobante: ComprobanteReintentable | null | undefined
): boolean => {
  if (!comprobante) return false;
  if (!ESTADOS_REINTENTABLES.includes(comprobante.estado as (typeof ESTADOS_REINTENTABLES)[number])) {
    return false;
  }
  // El número ya tiene que estar reservado: es lo que garantiza que el
  // reintento reutiliza el mismo comprobante en vez de consumir uno nuevo.
  // Un 0 no sirve: los correlativos empiezan en 1.
  return Boolean(comprobante.serie)
    && comprobante.numero != null
    && comprobante.numero > 0;
};
