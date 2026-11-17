import { describe, expect, it } from 'vitest';
import {
  puedeAbrirChipsFaregas,
  puedeAnularComprobanteChips,
  puedeGestionarVentasChips,
} from './chips-permisos';

describe('política de permisos de chips', () => {
  it('el submódulo Ventas habilita sus operaciones ordinarias', () => {
    const permisos = ['MENU_CHIPS', 'MENU_CHIPS_VENTAS'];
    expect(puedeAbrirChipsFaregas(permisos)).toBe(true);
    expect(puedeGestionarVentasChips(permisos)).toBe(true);
    expect(puedeAnularComprobanteChips(permisos)).toBe(false);
  });

  it('la anulación fiscal requiere su permiso sensible adicional', () => {
    expect(puedeAnularComprobanteChips([
      'MENU_CHIPS_VENTAS',
      'FAREGAS_ANULAR_COMPROBANTE',
    ])).toBe(true);
  });

  it('un permiso interno sin submódulo no abre la página ni sus operaciones', () => {
    expect(puedeAbrirChipsFaregas(['CHIPS_VER', 'CHIPS_VENDER'])).toBe(false);
    expect(puedeGestionarVentasChips(['CHIPS_VENDER'])).toBe(false);
  });
});
