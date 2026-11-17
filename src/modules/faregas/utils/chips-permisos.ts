const SUBMODULOS_CHIPS = [
  'MENU_CHIPS_INVENTARIO',
  'MENU_CHIPS_TIPOS',
  'MENU_CHIPS_VENTAS',
] as const;

export const puedeAbrirChipsFaregas = (permisos: readonly string[] = []) =>
  SUBMODULOS_CHIPS.some((permiso) => permisos.includes(permiso));

export const puedeGestionarVentasChips = (permisos: readonly string[] = []) =>
  permisos.includes('MENU_CHIPS_VENTAS');

// La anulación fiscal no se hereda del permiso ordinario de Ventas.
export const puedeAnularComprobanteChips = (permisos: readonly string[] = []) =>
  permisos.includes('MENU_CHIPS_VENTAS')
  && permisos.includes('FAREGAS_ANULAR_COMPROBANTE');
