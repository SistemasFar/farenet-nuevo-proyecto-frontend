import type { PagoAgregado } from './NuevoCertificadoView';

const ORDEN_MEDIOS_PAGO: PagoAgregado['tipo'][] = ['EFECTIVO', 'TARJETA', 'BANCO'];

export const calcularMedioPago = (pagos: PagoAgregado[]): string => {
  const tiposRegistrados = new Set(pagos.map((pago) => pago.tipo));
  return ORDEN_MEDIOS_PAGO.filter((tipo) => tiposRegistrados.has(tipo)).join(', ');
};
