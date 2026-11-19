import { describe, expect, it } from 'vitest';
import { puedeAbrirFacturacionFaregas } from './facturacion-permisos';

describe('acceso al contenedor de Facturación FAREGAS', () => {
  it('permite entrar con un submódulo sin exigir MENU_FACTURACION', () => {
    expect(puedeAbrirFacturacionFaregas(['MENU_FACTURACION_COMPROBANTES'])).toBe(true);
    expect(puedeAbrirFacturacionFaregas(['MENU_FACTURACION_SERIES'])).toBe(true);
    expect(puedeAbrirFacturacionFaregas(['MENU_FACTURACION_CLIENTES'])).toBe(true);
  });

  it('rechaza cuando solo tiene el permiso contenedor sin submódulos', () => {
    expect(puedeAbrirFacturacionFaregas(['MENU_FACTURACION'])).toBe(false);
    expect(puedeAbrirFacturacionFaregas(['CONFIGURACION_SERIES'])).toBe(false);
    expect(puedeAbrirFacturacionFaregas([])).toBe(false);
  });
});
