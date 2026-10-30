import { describe, expect, it } from 'vitest';
import {
  perfilTieneAccesoGlobalSedes,
  PERMISO_ACCESO_GLOBAL_SEDES,
} from './acceso-global-sedes';

describe('editor de perfiles - acceso global a sedes', () => {
  const perfiles = [
    { clave: 'SISTEMAS', permisos: [PERMISO_ACCESO_GLOBAL_SEDES, 'FAREGAS_SOLICITUD_APROBAR'] },
    { clave: 'SUPERVISOR', permisos: ['FAREGAS_SOLICITUD_APROBAR'] },
    { clave: 'CENTRAL', permisos: [PERMISO_ACCESO_GLOBAL_SEDES] },
  ];

  it('depende del checkbox y no del nombre del perfil', () => {
    expect(perfilTieneAccesoGlobalSedes(perfiles, 'SISTEMAS')).toBe(true);
    expect(perfilTieneAccesoGlobalSedes(perfiles, 'SUPERVISOR')).toBe(false);
    expect(perfilTieneAccesoGlobalSedes(perfiles, 'CENTRAL')).toBe(true);
  });

  it('no concede acceso cuando el permiso no está presente', () => {
    expect(perfilTieneAccesoGlobalSedes([], 'SISTEMAS')).toBe(false);
    expect(perfilTieneAccesoGlobalSedes(perfiles, 'INEXISTENTE')).toBe(false);
  });
});
