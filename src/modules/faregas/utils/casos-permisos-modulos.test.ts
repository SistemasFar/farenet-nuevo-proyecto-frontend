import { describe, expect, it } from 'vitest';
import {
  puedeAbrirConfiguracionFaregas,
  resolverPermisosConfiguracionFaregas,
} from './configuracion-permisos';
import { puedeAbrirChipsFaregas, puedeGestionarVentasChips } from './chips-permisos';
import { puedeAbrirFacturacionFaregas } from './facturacion-permisos';

describe('Pruebas obligatorias de visibilidad y autorización de módulos', () => {
  // ==========================================================================
  // CASO A — OPERADOR / mcastillo con Configuración deshabilitada
  // ==========================================================================
  it('Caso A: OPERADOR con Configuración y Facturación deshabilitadas', () => {
    // Permisos reales de OPERADOR configurados en el editor
    const permisosOperador = [
      'MENU_INICIO',
      'MENU_DASHBOARD',
      'MENU_CHIPS',
      'MENU_CHIPS_VENTAS',
      'DASHBOARD_GLOBAL',
      'DESCUENTOS_ADMINISTRAR',
      'FAREGAS_SOLICITUD_CREAR',
      'FAREGAS_SOLICITUD_VER',
    ];

    // 1. No aparece Configuración en Sidebar ni puede abrir contenedor
    expect(puedeAbrirConfiguracionFaregas(permisosOperador)).toBe(false);

    // 2. No muestra ninguna pestaña en Configuración
    const conf = resolverPermisosConfiguracionFaregas(permisosOperador);
    expect(conf.hasAnySubmodule).toBe(false);
    expect(conf.tabs).toEqual([]);
    expect(conf.hasSedes).toBe(false);
    expect(conf.hasCatalogo).toBe(false);
    expect(conf.hasTarifas).toBe(false);
    expect(conf.hasCorrelativos).toBe(false);
    expect(conf.hasEmpresas).toBe(false);

    // 3. No puede abrir Facturación
    expect(puedeAbrirFacturacionFaregas(permisosOperador)).toBe(false);

    // 4. Mantiene acceso a Inventario -> Ventas y Dashboard
    expect(puedeAbrirChipsFaregas(permisosOperador)).toBe(true);
    expect(puedeGestionarVentasChips(permisosOperador)).toBe(true);
    expect(permisosOperador.includes('MENU_DASHBOARD')).toBe(true);
  });

  // ==========================================================================
  // CASO B — Submódulo habilitado: Únicamente Catálogo autorizado
  // ==========================================================================
  it('Caso B: Perfil con únicamente Catálogo autorizado', () => {
    const permisosSoloCatalogo = [
      'MENU_CONFIGURACION_CATALOGO',
    ];

    // 1. Aparece Configuración como contenedor (derivado del submódulo)
    expect(puedeAbrirConfiguracionFaregas(permisosSoloCatalogo)).toBe(true);

    // 2. Aparece exclusivamente Catálogo
    const conf = resolverPermisosConfiguracionFaregas(permisosSoloCatalogo);
    expect(conf.tabs).toEqual([{ id: 'CATALOGO', label: 'CATÁLOGO' }]);
    expect(conf.hasCatalogo).toBe(true);

    // 3. No aparecen Sedes, Tarifas, Correlativos ni Empresas
    expect(conf.hasSedes).toBe(false);
    expect(conf.hasTarifas).toBe(false);
    expect(conf.hasCorrelativos).toBe(false);
    expect(conf.hasEmpresas).toBe(false);

    // 4. Funciones ordinarias de Catálogo autorizadas sin bloqueos contradictorios
    expect(conf.hasProductos).toBe(true);
    expect(conf.hasServicios).toBe(true);
    expect(conf.hasCategorias).toBe(true);
  });

  // ==========================================================================
  // CASO C — Cambios de permisos: Activación y Revocación
  // ==========================================================================
  it('Caso C: Activación y revocación dinámica de permisos', () => {
    let sesionPermisos = ['MENU_INICIO'];

    // Inicialmente bloqueado
    expect(puedeAbrirConfiguracionFaregas(sesionPermisos)).toBe(false);

    // Activar Tarifas
    sesionPermisos = [...sesionPermisos, 'MENU_CONFIGURACION_TARIFAS'];
    expect(puedeAbrirConfiguracionFaregas(sesionPermisos)).toBe(true);
    expect(resolverPermisosConfiguracionFaregas(sesionPermisos).tabs).toEqual([
      { id: 'TARIFAS', label: 'TARIFAS' },
    ]);

    // Desactivar Tarifas
    sesionPermisos = sesionPermisos.filter((p) => p !== 'MENU_CONFIGURACION_TARIFAS');
    expect(puedeAbrirConfiguracionFaregas(sesionPermisos)).toBe(false);
    expect(resolverPermisosConfiguracionFaregas(sesionPermisos).tabs).toEqual([]);
  });

  // ==========================================================================
  // CASO D — Otros perfiles: CONTADOR y SISTEMAS según permisos efectivos
  // ==========================================================================
  it('Caso D: CONTADOR y SISTEMAS evaluados estrictamente por permisos efectivos', () => {
    // CONTADOR solo tiene Correlativos en Configuración
    const permisosContador = [
      'MENU_CONFIGURACION_CORRELATIVOS',
      'MENU_FACTURACION_COMPROBANTES',
    ];
    expect(puedeAbrirConfiguracionFaregas(permisosContador)).toBe(true);
    const confContador = resolverPermisosConfiguracionFaregas(permisosContador);
    expect(confContador.tabs).toEqual([{ id: 'CORRELATIVOS', label: 'CORRELATIVOS' }]);
    expect(confContador.hasCatalogo).toBe(false);
    expect(confContador.hasSedes).toBe(false);
    expect(confContador.hasTarifas).toBe(false);
    expect(confContador.hasEmpresas).toBe(false);

    // SISTEMAS: Si en el perfil se desmarca Empresas, no debe verse Empresas
    const permisosSistemasSinEmpresas = [
      'MENU_CONFIGURACION_SEDES',
      'MENU_CONFIGURACION_CATALOGO',
      'MENU_CONFIGURACION_TARIFAS',
      'MENU_CONFIGURACION_CORRELATIVOS',
      // 'MENU_CONFIGURACION_EMPRESAS' desmarcado
    ];
    const confSistemas = resolverPermisosConfiguracionFaregas(permisosSistemasSinEmpresas);
    expect(confSistemas.hasEmpresas).toBe(false);
    expect(confSistemas.tabs.map((t) => t.id)).toEqual(['SEDES', 'CATALOGO', 'TARIFAS', 'CORRELATIVOS']);
  });
});

