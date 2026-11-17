import { describe, expect, it } from 'vitest';
import { resolverRequisitosConfirmacionVentaChips } from './venta-chips-requisitos';

const casoBase = {
  productoSeleccionado: true,
  validacionCompleta: true,
  errorFiscalDocumento: '',
  nombreRazonSocial: 'CLIENTE',
  direccion: 'DIRECCIÓN FISCAL',
  errorContacto: '',
  tipoComprobante: 'BOLETA',
  condicionPago: 'CONTADO' as const,
  pagoValido: true,
  pendiente: 0,
  saldoAFinanciar: 0,
  cantidadCuotas: 0,
  cuotasCuadran: true,
  cuotasConDatosInvalidos: false,
  fechaCreditoValida: true
};

describe('Requisitos de confirmación para venta de chips', () => {
  it('no bloquea una boleta al contado validada y pagada por completo', () => {
    expect(resolverRequisitosConfirmacionVentaChips(casoBase)).toEqual([]);
  });

  it('permite dirección fiscal vacía en boleta, pero sigue exigiendo nombre del cliente', () => {
    expect(resolverRequisitosConfirmacionVentaChips({
      ...casoBase, nombreRazonSocial: '', direccion: ''
    })).toEqual(['Complete el nombre o razón social del cliente.']);
    expect(resolverRequisitosConfirmacionVentaChips({ ...casoBase, direccion: '' })).toEqual([]);
  });

  it('conserva el límite de 100 caracteres de la dirección cuando se proporciona', () => {
    expect(resolverRequisitosConfirmacionVentaChips({
      ...casoBase, direccion: 'D'.repeat(101)
    })).toContain('La dirección fiscal admite hasta 100 caracteres.');
  });

  it('explica que falta validar inventario aunque el total pagado coincida', () => {
    expect(resolverRequisitosConfirmacionVentaChips({
      ...casoBase, validacionCompleta: false, pagoValido: false
    })).toContain('Valide el stock o los chips antes de confirmar.');
  });

  it('indica que debe configurarse la clasificación fiscal del producto', () => {
    expect(resolverRequisitosConfirmacionVentaChips({
      ...casoBase,
      tipoComprobante: 'FACTURA',
      spotError: 'Clasifique el producto en Configuración → Productos.'
    })).toContain('Clasifique el producto en Configuración → Productos.');
  });

  it('mantiene el control de saldo y las reglas propias del crédito', () => {
    const contado = resolverRequisitosConfirmacionVentaChips({
      ...casoBase, pendiente: 20, pagoValido: false
    });
    expect(contado).toContain('Registre el saldo pendiente de S/ 20.00.');

    const credito = resolverRequisitosConfirmacionVentaChips({
      ...casoBase, tipoComprobante: 'BOLETA', condicionPago: 'CREDITO', pagoValido: false,
      saldoAFinanciar: 100, cantidadCuotas: 0
    });
    expect(credito).toContain('Solo las facturas pueden emitirse al crédito.');
    expect(credito).toContain('Agregue al menos una cuota de crédito.');
  });
});
