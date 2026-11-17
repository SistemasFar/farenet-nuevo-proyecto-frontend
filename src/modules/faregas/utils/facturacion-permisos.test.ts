import { describe, expect, it } from 'vitest';
import { puedeAbrirFacturacionFaregas } from './facturacion-permisos';

describe('acceso al contenedor de Facturación FAREGAS', () => {
  it('permite entrar con un submódulo sin exigir MENU_FACTURACION', () => {
    expect(puedeAbrirFacturacionFaregas(['MENU_FACTURACION_COMPROBANTES'])).toBe(true);
    expect(puedeAbrirFacturacionFaregas(['MENU_FACTURACION_SERIES'])).toBe(true);
    expect(puedeAbrirFacturacionFaregas(['MENU_FACTURACION_CLIENTES'])).toBe(true);
  });

  it('mantiene el contenedor y rechaza permisos de otros módulos', () => {
    expect(puedeAbrirFacturacionFaregas(['MENU_FACTURACION'])).toBe(true);
    expect(puedeAbrirFacturacionFaregas(['CONFIGURACION_SERIES'])).toBe(false);
    expect(puedeAbrirFacturacionFaregas([])).toBe(false);
  });
});
