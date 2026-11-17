const SUBMODULOS_FACTURACION = [
  'MENU_FACTURACION_SERIES',
  'MENU_FACTURACION_COMPROBANTES',
  'MENU_FACTURACION_CLIENTES',
] as const;

export const puedeAbrirFacturacionFaregas = (permisos: readonly string[] = []) =>
  permisos.includes('MENU_FACTURACION')
  || SUBMODULOS_FACTURACION.some((permiso) => permisos.includes(permiso));
