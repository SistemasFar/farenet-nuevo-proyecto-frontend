import { faregasCertificadosApi } from '../../services/faregas-certificados.api';
import type { FacturacionFaregas, PasoBorradorFaregas } from '../../types/faregas-api';

export type ModoFacturacionEmision = 'NUBEFACT' | 'SIMULACION';

export interface ValidacionEmisionOperacion {
  valido: boolean;
  errores?: unknown[];
  modoFacturacion?: ModoFacturacionEmision;
}

export interface ResultadoEmisionCertificado {
  numero_certificado: string;
  fecha_emision?: string | null;
  estado?: string;
}

export interface EmisionCombinadaDependencias {
  /** Ejecuta la preparación, preflight y emisión de Nubefact ya existente. */
  emitirComprobante: () => Promise<FacturacionFaregas | null>;
  /** Ejecuta la validación actual del certificado. */
  validarCertificado: () => Promise<ValidacionEmisionOperacion | null>;
  /** Ejecuta la emisión actual del certificado y la asignación del correlativo. */
  emitirCertificado: (certificadoId: number) => Promise<ResultadoEmisionCertificado>;
  /** Conserva el estado técnico histórico antes de la emisión final. */
  marcarPasoVerificacion?: () => Promise<void>;
}

/**
 * Conserva la regla que el frontend ya usaba para habilitar la emisión:
 * simulación explícita, documento generado completamente en DEMO o aceptación
 * productiva con el indicador de SUNAT.
 */
export const esComprobanteOperable = (
  facturacion: FacturacionFaregas | null,
  modoFacturacion?: ModoFacturacionEmision,
): boolean => {
  if (!facturacion) return false;
  if (modoFacturacion === 'SIMULACION') return true;

  const entorno = String(facturacion.entornoFacturador || '').trim().toUpperCase();
  const generadoEnDemo = entorno === 'DEMO'
    && facturacion.estado === 'PENDIENTE_SUNAT'
    && Boolean(facturacion.nroComprobante)
    && Boolean(facturacion.enlacePdf || facturacion.enlaceXml);
  const aceptadoEnProduccion = facturacion.estado === 'ACEPTADO'
    && facturacion.aceptadaSunat === true;

  return generadoEnDemo || aceptadoEnProduccion;
};

/** Un comprobante en cualquiera de estos estados no debe volver a Nubefact. */
export const esComprobanteYaEmitido = (facturacion: FacturacionFaregas | null): boolean =>
  facturacion?.estado === 'ACEPTADO' || facturacion?.estado === 'PENDIENTE_SUNAT';

/** Mantiene aliasados los estados técnicos históricos en el nodo visual final. */
export const indicePasoVisual = (paso?: PasoBorradorFaregas | string): number => ({
  DATOS_INICIALES: 0,
  PAGO: 1,
  VEHICULO: 2,
  PREVISUALIZACION: 3,
  FACTURACION: 4,
  VERIFICACION_EMISION: 4,
}[paso || ''] ?? 0);

export const ejecutarEmisionCertificado = async (certificadoId: number): Promise<ResultadoEmisionCertificado> => {
  const response = await faregasCertificadosApi.emitirCertificado(certificadoId);
  return response?.data as ResultadoEmisionCertificado;
};

const marcarComprobanteEmitido = (error: unknown): Error => {
  const normalized = error instanceof Error ? error : new Error(String(error || 'Error desconocido'));
  (normalized as Error & { comprobanteEmitido?: boolean }).comprobanteEmitido = true;
  return normalized;
};

const mensajeValidacion = (validacion: ValidacionEmisionOperacion | null): string => {
  if (!validacion) return 'No se pudo validar la emisión del certificado.';
  const mensajes = (validacion.errores || [])
    .map((detalle) => {
      if (detalle && typeof detalle === 'object' && 'mensaje' in detalle) {
        return String((detalle as { mensaje?: unknown }).mensaje || '');
      }
      return String(detalle || '');
    })
    .filter(Boolean);
  return mensajes.join('\n') || 'El certificado no está listo para emitirse.';
};

/**
 * Orquesta las dos operaciones sin paralelismo. Si Nubefact termina y falla
 * la validación/emisión del certificado, el error queda marcado para que la
 * UI ofrezca reintentar sólo desde la emisión del certificado.
 */
export const ejecutarEmisionCombinada = async (
  certificadoId: number,
  facturacion: FacturacionFaregas | null,
  dependencias: EmisionCombinadaDependencias,
): Promise<{ facturacion: FacturacionFaregas; certificado: ResultadoEmisionCertificado }> => {
  let facturacionResultante = facturacion;
  let comprobanteResuelto = esComprobanteYaEmitido(facturacionResultante);

  if (!comprobanteResuelto) {
    const emitida = await dependencias.emitirComprobante();
    if (!emitida) throw new Error('No se pudo obtener el resultado de la facturación.');
    facturacionResultante = emitida;
    comprobanteResuelto = true;
  }

  try {
    if (comprobanteResuelto && dependencias.marcarPasoVerificacion) {
      await dependencias.marcarPasoVerificacion();
    }
    const validacion = await dependencias.validarCertificado();
    if (!validacion?.valido) throw new Error(mensajeValidacion(validacion));
    if (!esComprobanteOperable(facturacionResultante, validacion.modoFacturacion)) {
      throw new Error('La facturación todavía no permite emitir el certificado.');
    }

    const certificado = await dependencias.emitirCertificado(certificadoId);
    return { facturacion: facturacionResultante as FacturacionFaregas, certificado };
  } catch (error) {
    if (comprobanteResuelto) throw marcarComprobanteEmitido(error);
    throw error;
  }
};
