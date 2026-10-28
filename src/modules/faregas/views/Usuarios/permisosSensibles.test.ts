import { describe, expect, it } from 'vitest';
import {
  esPermisoObsoleto,
  esPermisoSensible,
  filtrarPermisosDelCatalogo,
  filtrarPermisosVigentes,
  PERMISOS_OBSOLETOS,
  PERMISOS_SENSIBLES,
} from './permisosSensibles';

describe('permisos sensibles del editor de perfiles', () => {
  it('marca como sensibles los permisos operativos de alto impacto', () => {
    expect(esPermisoSensible('FAREGAS_SOLICITUD_APROBAR')).toBe(true);
    expect(esPermisoSensible('FAREGAS_CERTIFICADO_RECTIFICAR_EJECUTAR')).toBe(true);
    expect(esPermisoSensible('FAREGAS_SOLICITUD_CREAR')).toBe(false);
    expect(esPermisoSensible('MENU_USUARIOS')).toBe(false);
  });

  it('ya no exige ni muestra el permiso administrativo adicional', () => {
    expect(esPermisoSensible('FAREGAS_PERMISOS_SENSIBLES_ADMINISTRAR')).toBe(false);
    expect(PERMISOS_SENSIBLES).not.toContain('FAREGAS_PERMISOS_SENSIBLES_ADMINISTRAR');
    expect(esPermisoObsoleto('FAREGAS_PERMISOS_SENSIBLES_ADMINISTRAR')).toBe(true);
  });

  it('filtra el permiso obsoleto sin tocar los permisos vigentes', () => {
    const permisos = [
      'MENU_INICIO',
      'FAREGAS_SOLICITUD_APROBAR',
      'FAREGAS_PERMISOS_SENSIBLES_ADMINISTRAR',
      'FAREGAS_SOLICITUD_APROBAR',
    ];

    expect(filtrarPermisosVigentes(permisos)).toEqual([
      'MENU_INICIO',
      'FAREGAS_SOLICITUD_APROBAR',
    ]);
    expect(PERMISOS_OBSOLETOS).toEqual(['FAREGAS_PERMISOS_SENSIBLES_ADMINISTRAR']);
  });

  it('el catálogo no contiene duplicados', () => {
    expect(new Set(PERMISOS_SENSIBLES).size).toBe(PERMISOS_SENSIBLES.length);
  });

  it('envía sólo las claves del catálogo autorizado y conserva los sensibles', () => {
    const catalogo = [
      { clave: 'MENU_INICIO' },
      { clave: 'MENU_USUARIOS' },
      { clave: 'FAREGAS_SOLICITUD_APROBAR' },
    ];

    expect(filtrarPermisosDelCatalogo([
      'MENU_INICIO',
      'CHIPS_VER',
      'FAREGAS_PERMISOS_SENSIBLES_ADMINISTRAR',
      'FAREGAS_SOLICITUD_APROBAR',
      'CONFIGURACION_SEDES',
      'FAREGAS_SOLICITUD_APROBAR',
    ], catalogo)).toEqual([
      'MENU_INICIO',
      'FAREGAS_SOLICITUD_APROBAR',
    ]);
  });
});
