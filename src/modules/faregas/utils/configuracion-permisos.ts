export type ConfiguracionTabId = 'SEDES' | 'CATALOGO' | 'TARIFAS' | 'EMPRESAS' | 'CORRELATIVOS';

export interface ConfiguracionTabAutorizada {
  id: ConfiguracionTabId;
  label: string;
}

const PERMISOS_SUBMODULO = [
  'CONFIGURACION_CATEGORIAS',
  'CONFIGURACION_EMPRESAS',
  'CONFIGURACION_PRODUCTOS',
  'CONFIGURACION_SEDES',
  'CONFIGURACION_SERIES',
  'CONFIGURACION_SERVICIOS',
  'CONFIGURACION_TARIFAS',
  'MENU_FACTURACION_SERIES',
  'MENU_CONFIGURACION_SEDES',
  'MENU_CONFIGURACION_CATALOGO',
  'MENU_CONFIGURACION_TARIFAS',
  'MENU_CONFIGURACION_CORRELATIVOS',
  'MENU_CONFIGURACION_EMPRESAS',
] as const;

const PERMISOS_IMPLICITOS: Record<string, readonly string[]> = {
  MENU_CONFIGURACION_SEDES: ['CONFIGURACION_SEDES'],
  MENU_CONFIGURACION_CATALOGO: ['CONFIGURACION_CATEGORIAS', 'CONFIGURACION_PRODUCTOS', 'CONFIGURACION_SERVICIOS'],
  MENU_CONFIGURACION_TARIFAS: ['CONFIGURACION_TARIFAS'],
  MENU_CONFIGURACION_CORRELATIVOS: ['CONFIGURACION_SERIES'],
  MENU_CONFIGURACION_EMPRESAS: ['CONFIGURACION_EMPRESAS'],
};

export const tienePermisoConfiguracionFaregas = (permisos: readonly string[] = [], clave: string): boolean => (
  permisos.includes(clave)
  || Object.entries(PERMISOS_IMPLICITOS).some(([submodulo, ordinarios]) =>
    permisos.includes(submodulo) && ordinarios.includes(clave))
);

export const puedeAbrirConfiguracionFaregas = (permisos: readonly string[] = []): boolean => (
  permisos.includes('MENU_CONFIGURACION')
  || PERMISOS_SUBMODULO.some((permiso) => permisos.includes(permiso))
);

export const resolverPermisosConfiguracionFaregas = (permisos: readonly string[] = []) => {
  const tiene = (clave: string) => tienePermisoConfiguracionFaregas(permisos, clave);
  const hasSedes = tiene('CONFIGURACION_SEDES');
  const hasServicios = tiene('CONFIGURACION_SERVICIOS');
  const hasCategorias = tiene('CONFIGURACION_CATEGORIAS');
  const hasProductos = tiene('CONFIGURACION_PRODUCTOS');
  const hasTarifas = tiene('CONFIGURACION_TARIFAS');
  // La API de series conserva el permiso propio de Facturación > Series.
  const hasSeries = tiene('CONFIGURACION_SERIES') || tiene('MENU_FACTURACION_SERIES') || tiene('MENU_CONFIGURACION_CORRELATIVOS');
  const hasEmpresas = tiene('CONFIGURACION_EMPRESAS');
  const hasCatalogo = hasCategorias || hasServicios || hasProductos;
  const tabs: ConfiguracionTabAutorizada[] = [];

  if (hasSedes) tabs.push({ id: 'SEDES', label: 'SEDES / CATEGORÍAS DMS' });
  if (hasCatalogo) tabs.push({ id: 'CATALOGO', label: 'CATÁLOGO' });
  if (hasTarifas) tabs.push({ id: 'TARIFAS', label: 'TARIFAS' });
  if (hasSeries) tabs.push({ id: 'CORRELATIVOS', label: 'CORRELATIVOS' });
  if (hasEmpresas) tabs.push({ id: 'EMPRESAS', label: 'EMPRESAS' });

  return {
    hasSedes,
    hasServicios,
    hasCategorias,
    hasProductos,
    hasTarifas,
    hasSeries,
    hasEmpresas,
    hasCatalogo,
    hasCorrelativos: hasSeries,
    hasAnySubmodule: tabs.length > 0,
    tabs,
  };
};
