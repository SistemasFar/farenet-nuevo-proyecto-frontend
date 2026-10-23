export const MOTIVOS_NOTA_CREDITO = [
  { codigo: '01', descripcion: 'Anulación de la operación' },
  { codigo: '02', descripcion: 'Anulación por error en el RUC' },
  { codigo: '03', descripcion: 'Corrección por error en la descripción' },
] as const;

interface EstadoCertificadoResumen {
  estado?: string | null;
}

interface EstadoComprobanteResumen {
  estadoFacturacion?: string | null;
  estadoAnulacion?: string | null;
  estadoNotaCredito?: string | null;
}

const normalizarEstado = (valor?: string | null) => String(valor || '').trim().toUpperCase();

export const estadoCertificadoPanel = (item: EstadoCertificadoResumen) => item.estado || 'Pendiente';

export const estadoComprobantePanel = (item: EstadoComprobanteResumen) => {
  const anulacion = normalizarEstado(item.estadoAnulacion);
  if (['BORRADOR', 'PENDIENTE'].includes(anulacion)) return 'Baja pendiente';
  if (anulacion === 'ACEPTADO') return 'Anulado';
  if (anulacion === 'RECHAZADO') return 'Baja rechazada';
  if (anulacion === 'ERROR') return 'Error de baja';

  const notaCredito = normalizarEstado(item.estadoNotaCredito);
  if (notaCredito === 'ACEPTADO') return 'Nota de crédito emitida';
  if (['BORRADOR', 'PENDIENTE', 'PENDIENTE_SUNAT'].includes(notaCredito)) {
    return 'Nota de crédito pendiente';
  }
  if (notaCredito === 'RECHAZADO') return 'Nota de crédito rechazada';
  if (notaCredito === 'ERROR' || notaCredito === 'ERROR_DEFINITIVO') return 'Error en nota de crédito';

  const comprobante = normalizarEstado(item.estadoFacturacion);
  if (!comprobante || comprobante === 'BORRADOR' || comprobante === 'PENDIENTE') return 'Pendiente';
  if (comprobante === 'PENDIENTE_SUNAT') return 'Pendiente SUNAT';
  if (comprobante === 'ACEPTADO') return 'Aceptado';
  if (comprobante === 'RECHAZADO') return 'Rechazado';
  if (comprobante === 'ANULADO') return 'Anulado';
  if (comprobante === 'ERROR') return 'Error';
  return comprobante;
};
