import { describe, expect, it } from 'vitest';
import {
  resolverRutaInicialFaregas,
  tieneAccesoRutaFaregas,
  resolverAccionForbidden,
} from './navegacion-permisos';

describe('Navegación y Redirección inicial según permisos de perfil FAREGAS', () => {
  // ==========================================================================
  // CASO 1: jsturt / CONTADOR (Inicio deshabilitado, Dashboard y Facturación habilitados)
  // ==========================================================================
  it('Usuario jsturt (CONTADOR): Sin Inicio, con Dashboard -> aterriza en /faregas/dashboard', () => {
    const permisosJsturt = [
      'DASHBOARD_EXPORTAR',
      'DASHBOARD_GLOBAL',
      'MENU_DASHBOARD',
      'MENU_FACTURACION',
      'MENU_FACTURACION_COMPROBANTES',
    ];

    // 1. Ruta inicial debe ser Dashboard, NUNCA Inicio ni 403
    const rutaInicial = resolverRutaInicialFaregas(permisosJsturt);
    expect(rutaInicial).toBe('/faregas/dashboard');

    // 2. Botón de ForbiddenView debe ofrecer "Ir al Dashboard"
    const accionForbidden = resolverAccionForbidden(permisosJsturt);
    expect(accionForbidden).toEqual({
      ruta: '/faregas/dashboard',
      label: 'Ir al Dashboard',
    });

    // 3. Verificación de accesos por ruta
    expect(tieneAccesoRutaFaregas('/faregas/dashboard', permisosJsturt)).toBe(true);
    expect(tieneAccesoRutaFaregas('/faregas/reportes-financieros', permisosJsturt)).toBe(true);
    expect(tieneAccesoRutaFaregas('/faregas/facturacion', permisosJsturt)).toBe(true);
    expect(tieneAccesoRutaFaregas('/faregas/inicio', permisosJsturt)).toBe(false);
    expect(tieneAccesoRutaFaregas('/faregas/configuracion', permisosJsturt)).toBe(false);
    expect(tieneAccesoRutaFaregas('/faregas/chips', permisosJsturt)).toBe(false);
  });

  // ==========================================================================
  // CASO 2: OPERADOR con solo Inventario -> Ventas
  // ==========================================================================
  it('OPERADOR: Sin Inicio ni Dashboard, con Ventas -> aterriza en /faregas/chips?tab=ventas', () => {
    const permisosOperadorVentas = [
      'MENU_CHIPS',
      'MENU_CHIPS_VENTAS',
      'FAREGAS_SOLICITUD_CREAR',
      'FAREGAS_SOLICITUD_VER',
    ];

    // 1. Ruta inicial va directamente a la pestaña de ventas autorizada
    const rutaInicial = resolverRutaInicialFaregas(permisosOperadorVentas);
    expect(rutaInicial).toBe('/faregas/chips?tab=ventas');

    // 2. Botón de ForbiddenView ofrece "Ir a mi módulo"
    const accionForbidden = resolverAccionForbidden(permisosOperadorVentas);
    expect(accionForbidden).toEqual({
      ruta: '/faregas/chips?tab=ventas',
      label: 'Ir a mi módulo',
    });

    // 3. Accesos
    expect(tieneAccesoRutaFaregas('/faregas/chips', permisosOperadorVentas)).toBe(true);
    expect(tieneAccesoRutaFaregas('/faregas/inicio', permisosOperadorVentas)).toBe(false);
    expect(tieneAccesoRutaFaregas('/faregas/dashboard', permisosOperadorVentas)).toBe(false);
    expect(tieneAccesoRutaFaregas('/faregas/configuracion', permisosOperadorVentas)).toBe(false);
  });

  // ==========================================================================
  // CASO 3: SISTEMAS con Inicio habilitado
  // ==========================================================================
  it('SISTEMAS con MENU_INICIO: Aterriza normalmente en /faregas/inicio', () => {
    const permisosSistemas = [
      'MENU_INICIO',
      'MENU_DASHBOARD',
      'MENU_CONFIGURACION_SEDES',
      'MENU_USUARIOS',
    ];

    expect(resolverRutaInicialFaregas(permisosSistemas)).toBe('/faregas/inicio');
    expect(resolverAccionForbidden(permisosSistemas)).toEqual({
      ruta: '/faregas/inicio',
      label: 'Volver al Inicio',
    });
    expect(tieneAccesoRutaFaregas('/faregas/inicio', permisosSistemas)).toBe(true);
  });

  // ==========================================================================
  // CASO 4: Perfil con únicamente Facturación -> Comprobantes
  // ==========================================================================
  it('Solo Facturación Comprobantes -> aterriza en /faregas/facturacion?tab=documentos', () => {
    const permisos = ['MENU_FACTURACION_COMPROBANTES'];
    expect(resolverRutaInicialFaregas(permisos)).toBe('/faregas/facturacion?tab=documentos');
    expect(resolverAccionForbidden(permisos)).toEqual({
      ruta: '/faregas/facturacion?tab=documentos',
      label: 'Ir a mi módulo',
    });
    expect(tieneAccesoRutaFaregas('/faregas/facturacion', permisos)).toBe(true);
  });

  // ==========================================================================
  // CASO 5: Perfil con únicamente Facturación -> Series
  // ==========================================================================
  it('Solo Facturación Series -> aterriza en /faregas/facturacion?tab=series', () => {
    const permisos = ['MENU_FACTURACION_SERIES'];
    expect(resolverRutaInicialFaregas(permisos)).toBe('/faregas/facturacion?tab=series');
    expect(tieneAccesoRutaFaregas('/faregas/facturacion', permisos)).toBe(true);
  });

  // ==========================================================================
  // CASO 6: Perfil con únicamente Facturación -> Clientes
  // ==========================================================================
  it('Solo Facturación Clientes -> aterriza en /faregas/facturacion?tab=clientes', () => {
    const permisos = ['MENU_FACTURACION_CLIENTES'];
    expect(resolverRutaInicialFaregas(permisos)).toBe('/faregas/facturacion?tab=clientes');
    expect(tieneAccesoRutaFaregas('/faregas/facturacion', permisos)).toBe(true);
  });

  // ==========================================================================
  // CASO 7: Perfil con únicamente Configuración -> Catálogo
  // ==========================================================================
  it('Solo Configuración Catálogo -> aterriza en /faregas/configuracion?tab=catalogo', () => {
    const permisos = ['MENU_CONFIGURACION_CATALOGO'];
    expect(resolverRutaInicialFaregas(permisos)).toBe('/faregas/configuracion?tab=catalogo');
    expect(resolverAccionForbidden(permisos)).toEqual({
      ruta: '/faregas/configuracion?tab=catalogo',
      label: 'Ir a mi módulo',
    });
    expect(tieneAccesoRutaFaregas('/faregas/configuracion', permisos)).toBe(true);
    expect(tieneAccesoRutaFaregas('/faregas/inicio', permisos)).toBe(false);
  });

  // ==========================================================================
  // CASO 8: Perfiles individuales con Descuentos, Usuarios o Auditoría
  // ==========================================================================
  it('Módulos individuales: Descuentos, Usuarios y Auditoría', () => {
    expect(resolverRutaInicialFaregas(['MENU_DESCUENTOS'])).toBe('/faregas/descuentos');
    expect(resolverRutaInicialFaregas(['MENU_USUARIOS'])).toBe('/faregas/usuarios');
    expect(resolverRutaInicialFaregas(['MENU_AUDITORIA'])).toBe('/faregas/auditoria');
  });

  // ==========================================================================
  // CASO 9: Usuario sin ningún módulo autorizado
  // ==========================================================================
  it('Usuario sin módulos autorizados: Retorna null y acción Cerrar sesión', () => {
    const permisosVacios: string[] = [];
    expect(resolverRutaInicialFaregas(permisosVacios)).toBeNull();
    expect(resolverAccionForbidden(permisosVacios)).toEqual({
      ruta: null,
      label: 'Cerrar sesión',
    });
    expect(tieneAccesoRutaFaregas('/faregas', permisosVacios)).toBe(false);
    expect(tieneAccesoRutaFaregas('/faregas/inicio', permisosVacios)).toBe(false);
    expect(tieneAccesoRutaFaregas('/faregas/dashboard', permisosVacios)).toBe(false);
  });

  // ==========================================================================
  // CASO 10: Intento de navegación manual a módulo no autorizado sigue bloqueado
  // ==========================================================================
  it('Navegación manual directa a URL no autorizada sigue bloqueada (403)', () => {
    const permisosSoloVentas = ['MENU_CHIPS_VENTAS'];
    // El usuario solo puede ver chips
    expect(tieneAccesoRutaFaregas('/faregas/chips', permisosSoloVentas)).toBe(true);
    // Pero si teclea directamente /faregas/dashboard o /faregas/configuracion en la barra de URL:
    expect(tieneAccesoRutaFaregas('/faregas/dashboard', permisosSoloVentas)).toBe(false);
    expect(tieneAccesoRutaFaregas('/faregas/configuracion', permisosSoloVentas)).toBe(false);
    expect(tieneAccesoRutaFaregas('/faregas/facturacion', permisosSoloVentas)).toBe(false);
    expect(tieneAccesoRutaFaregas('/faregas/inicio', permisosSoloVentas)).toBe(false);
  });
});

