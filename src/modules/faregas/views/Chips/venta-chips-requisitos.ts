export interface RequisitosConfirmacionVentaChips {
  productoSeleccionado: boolean;
  validacionCompleta: boolean;
  errorFiscalDocumento: string;
  nombreRazonSocial: string;
  direccion: string;
  errorContacto: string;
  tipoComprobante: string;
  condicionPago: 'CONTADO' | 'CREDITO';
  pagoValido: boolean;
  pendiente: number;
  saldoAFinanciar: number;
  cantidadCuotas: number;
  cuotasCuadran: boolean;
  cuotasConDatosInvalidos: boolean;
  fechaCreditoValida: boolean;
  spotError?: string;
}

const TOLERANCIA_MONTO = 0.009;

/** Devuelve los bloqueos reales que controlan Confirmar Venta y Emitir. */
export function resolverRequisitosConfirmacionVentaChips(estado: RequisitosConfirmacionVentaChips): string[] {
  const motivos: string[] = [];
  if (!estado.productoSeleccionado) motivos.push('Seleccione un producto de inventario.');
  if (!estado.validacionCompleta) motivos.push('Valide el stock o los chips antes de confirmar.');
  if (estado.errorFiscalDocumento) motivos.push(estado.errorFiscalDocumento);
  if (!estado.nombreRazonSocial.trim()) motivos.push('Complete el nombre o razón social del cliente.');
  if (estado.nombreRazonSocial.trim().length > 100) motivos.push('El nombre o razón social admite hasta 100 caracteres.');
  if (estado.direccion.trim().length > 100) motivos.push('La dirección fiscal admite hasta 100 caracteres.');
  if (estado.errorContacto) motivos.push(estado.errorContacto);
  if (estado.spotError) motivos.push(estado.spotError);

  if (estado.condicionPago === 'CONTADO' && estado.validacionCompleta) {
    if (estado.pendiente > TOLERANCIA_MONTO) motivos.push(`Registre el saldo pendiente de S/ ${estado.pendiente.toFixed(2)}.`);
    if (estado.pendiente < -TOLERANCIA_MONTO) motivos.push('Los pagos registrados superan el total de la venta.');
  }

  if (estado.condicionPago === 'CREDITO') {
    if (estado.tipoComprobante !== 'FACTURA') motivos.push('Solo las facturas pueden emitirse al crédito.');
    if (estado.saldoAFinanciar <= TOLERANCIA_MONTO) motivos.push('La venta al crédito debe conservar un saldo pendiente.');
    if (estado.cantidadCuotas === 0) motivos.push('Agregue al menos una cuota de crédito.');
    if (estado.cantidadCuotas > 0 && !estado.cuotasCuadran) motivos.push('El total de cuotas debe coincidir con el saldo financiado.');
    if (estado.cuotasConDatosInvalidos) motivos.push('Cada cuota debe tener importe positivo y una fecha válida.');
    if (!estado.fechaCreditoValida) motivos.push('La fecha de vencimiento debe ser igual o posterior a la fecha de inicio del crédito.');
  }

  if (!estado.pagoValido && motivos.length === 0) motivos.push('Revise los pagos registrados y la condición de pago.');
  return [...new Set(motivos)];
}
