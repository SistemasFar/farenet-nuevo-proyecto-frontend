import { describe, expect, it } from 'vitest';
import {
  puedeAbrirConfiguracionFaregas,
  resolverPermisosConfiguracionFaregas,
} from './configuracion-permisos';

describe('permisos del contenedor Configuración FAREGAS', () => {
  it('permite abrir el contenedor con un submódulo aunque falte MENU_CONFIGURACION', () => {
    const permisos = ['CONFIGURACION_PRODUCTOS'];

    expect(puedeAbrirConfiguracionFaregas(permisos)).toBe(true);
    expect(resolverPermisosConfiguracionFaregas(permisos).tabs).toEqual([
      { id: 'CATALOGO', label: 'CATÁLOGO' },
    ]);
  });

  it('selecciona solo los submódulos con permiso operativo', () => {
    const resultado = resolverPermisosConfiguracionFaregas([
      'CONFIGURACION_PRODUCTOS',
      'CONFIGURACION_TARIFAS',
    ]);

    expect(resultado.tabs.map((tab) => tab.id)).toEqual(['CATALOGO', 'TARIFAS']);
    expect(resultado.hasServicios).toBe(false);
    expect(resultado.hasCategorias).toBe(false);
  });

  it('el permiso padre no abre el contenedor si no tiene submódulos autorizados', () => {
    const resultado = resolverPermisosConfiguracionFaregas([
      'MENU_CONFIGURACION',
    ]);

    expect(puedeAbrirConfiguracionFaregas(['MENU_CONFIGURACION'])).toBe(false);
    expect(resultado.hasAnySubmodule).toBe(false);
    expect(resultado.tabs).toEqual([]);
  });

  it('un submódulo de Catálogo autoriza las funciones ordinarias del catálogo', () => {
    const resultado = resolverPermisosConfiguracionFaregas(['MENU_CONFIGURACION_CATALOGO']);

    expect(puedeAbrirConfiguracionFaregas(['MENU_CONFIGURACION_CATALOGO'])).toBe(true);
    expect(resultado.hasProductos).toBe(true);
    expect(resultado.hasServicios).toBe(true);
    expect(resultado.hasCategorias).toBe(true);
  });

  it('MENU_CONFIGURACION_CORRELATIVOS basta para la pestaña y su API', () => {
    const resultado = resolverPermisosConfiguracionFaregas(['MENU_CONFIGURACION_CORRELATIVOS']);

    expect(resultado.tabs).toEqual([{ id: 'CORRELATIVOS', label: 'CORRELATIVOS' }]);
    expect(puedeAbrirConfiguracionFaregas(['MENU_CONFIGURACION_CORRELATIVOS'])).toBe(true);
  });

  it('oculta el acceso si no hay permiso de contenedor ni de submódulo', () => {
    expect(puedeAbrirConfiguracionFaregas([])).toBe(false);
  });

  it('Sedes no concede administración de empresas', () => {
    const resultado = resolverPermisosConfiguracionFaregas(['MENU_CONFIGURACION_SEDES']);

    expect(resultado.hasSedes).toBe(true);
    expect(resultado.hasEmpresas).toBe(false);
    expect(resultado.tabs.map((tab) => tab.id)).toEqual(['SEDES']);
  });

  it('permite Servicios sin exigir también el permiso administrativo de Categorías', () => {
    const resultado = resolverPermisosConfiguracionFaregas(['CONFIGURACION_SERVICIOS']);

    expect(resultado.tabs).toEqual([{ id: 'CATALOGO', label: 'CATÁLOGO' }]);
    expect(resultado.hasServicios).toBe(true);
    expect(resultado.hasCategorias).toBe(false);
  });

  it('muestra Series cuando se tiene el permiso que la API de Facturación ya acepta', () => {
    const resultado = resolverPermisosConfiguracionFaregas(['MENU_FACTURACION_SERIES']);

    expect(resultado.tabs.map((tab) => tab.id)).toEqual(['CORRELATIVOS']);
    expect(resultado.hasCorrelativos).toBe(true);
  });

  it('conserva los módulos autorizados de OPERADOR y SISTEMAS', () => {
    const permisos = [
      'CONFIGURACION_CATEGORIAS',
      'CONFIGURACION_EMPRESAS',
      'CONFIGURACION_PRODUCTOS',
      'CONFIGURACION_SEDES',
      'CONFIGURACION_SERIES',
      'CONFIGURACION_SERVICIOS',
      'CONFIGURACION_TARIFAS',
    ];

    expect(resolverPermisosConfiguracionFaregas(permisos).tabs.map((tab) => tab.id)).toEqual([
      'SEDES', 'CATALOGO', 'TARIFAS', 'CORRELATIVOS', 'EMPRESAS',
    ]);
  });
});
