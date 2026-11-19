import { describe, it, expect } from 'vitest';
import { tieneAccesoDashboard, resolverPermisosDashboard } from './dashboard-config';

describe('Permisos Dashboard FAREGAS', () => {
  it('usuario sin MENU_DASHBOARD no tiene acceso al Dashboard, aunque tenga DASHBOARD_GLOBAL o DASHBOARD_EXPORTAR', () => {
    const permisosOperador = [
      'MENU_INICIO',
      'MENU_CHIPS',
      'MENU_CHIPS_VENTAS',
      'DASHBOARD_GLOBAL',
      'DASHBOARD_EXPORTAR'
    ];

    expect(tieneAccesoDashboard(permisosOperador)).toBe(false);

    const permisosResueltos = resolverPermisosDashboard(permisosOperador);
    expect(permisosResueltos.puedeVerGlobal).toBe(false);
    expect(permisosResueltos.puedeExportar).toBe(false);
  });

  it('usuario con MENU_DASHBOARD tiene acceso al Dashboard', () => {
    const permisosConMenu = ['MENU_DASHBOARD'];
    expect(tieneAccesoDashboard(permisosConMenu)).toBe(true);

    const permisosResueltos = resolverPermisosDashboard(permisosConMenu);
    expect(permisosResueltos.puedeVerGlobal).toBe(false);
    expect(permisosResueltos.puedeExportar).toBe(false);
  });

  it('usuario con MENU_DASHBOARD y DASHBOARD_GLOBAL puede ver alcance global', () => {
    const permisosCompletos = ['MENU_DASHBOARD', 'DASHBOARD_GLOBAL', 'DASHBOARD_EXPORTAR'];
    expect(tieneAccesoDashboard(permisosCompletos)).toBe(true);

    const permisosResueltos = resolverPermisosDashboard(permisosCompletos);
    expect(permisosResueltos.puedeVerGlobal).toBe(true);
    expect(permisosResueltos.puedeExportar).toBe(true);
  });
});

