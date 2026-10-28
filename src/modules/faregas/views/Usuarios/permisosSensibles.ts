/**
 * Catálogo de permisos sensibles del editor de perfiles.
 *
 * "Sensible" es sólo una etiqueta visual para resaltar permisos de alto impacto.
 * No bloquea las casillas: cualquier usuario autorizado a administrar perfiles
 * (MENU_USUARIOS, validado por el backend) puede concederlos o revocarlos.
 *
 * Debe coincidir con `faregas-permisos-sensibles.constants.js` del backend.
 */

export const PERMISOS_SENSIBLES = [
  'FAREGAS_SOLICITUD_APROBAR',
  'FAREGAS_SOLICITUD_AUTOAPROBAR',
  'FAREGAS_SOLICITUD_AUTOEJECUTAR',
  'FAREGAS_SOLICITUD_RECHAZAR',
  'FAREGAS_SOLICITUD_ADMINISTRAR',
  'FAREGAS_CERTIFICADO_ANULAR_EJECUTAR',
  'FAREGAS_CERTIFICADO_RECTIFICAR_EJECUTAR',
  'FAREGAS_NOTA_CREDITO',
  'FAREGAS_ANULAR_COMPROBANTE',
] as const;

const PERMISOS_SENSIBLES_SET = new Set<string>(PERMISOS_SENSIBLES);

/**
 * Permiso de la implementación anterior. Si una base de datos ya lo tiene
 * registrado, se ignora en la UI y no se envía al backend. No se elimina ningún
 * registro automáticamente.
 */
export const PERMISOS_OBSOLETOS = [
  'FAREGAS_PERMISOS_SENSIBLES_ADMINISTRAR',
] as const;

const PERMISOS_OBSOLETOS_SET = new Set<string>(PERMISOS_OBSOLETOS);

export const esPermisoSensible = (clave: string): boolean =>
  PERMISOS_SENSIBLES_SET.has(clave);

export const esPermisoObsoleto = (clave: string): boolean =>
  PERMISOS_OBSOLETOS_SET.has(clave);

/** Quita claves obsoletas y duplicados conservando el orden recibido. */
export const filtrarPermisosVigentes = (permisos: readonly string[] = []): string[] => [
  ...new Set(permisos.filter((clave) => !PERMISOS_OBSOLETOS_SET.has(clave))),
];

/**
 * Deja en el payload únicamente las claves que el backend devolvió como
 * catálogo autorizado del editor. El perfil puede tener permisos históricos u
 * operativos que este editor no muestra; enviarlos haría que la validación los
 * rechazara. El backend no los borra: los conserva tal como estaban.
 */
export const filtrarPermisosDelCatalogo = (
  permisos: readonly string[],
  catalogo: ReadonlyArray<{ clave: string }>,
): string[] => {
  const autorizadas = new Set(catalogo.map((permiso) => permiso.clave));
  return filtrarPermisosVigentes(permisos).filter((clave) => autorizadas.has(clave));
};
