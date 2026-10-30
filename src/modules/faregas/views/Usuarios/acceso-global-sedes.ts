export const PERMISO_ACCESO_GLOBAL_SEDES = 'FAREGAS_ACCESO_GLOBAL_SEDES';

export const perfilTieneAccesoGlobalSedes = (
  perfiles: Array<{ clave?: string; permisos?: string[] }>,
  perfilClave?: string | null,
) => Boolean(
  perfiles.find((perfil) => perfil.clave === perfilClave)
    ?.permisos?.includes(PERMISO_ACCESO_GLOBAL_SEDES),
);
