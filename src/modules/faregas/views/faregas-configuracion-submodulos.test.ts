import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');
const PERFILES = leer('Usuarios', 'UsuariosView.tsx');
const CONFIGURACION = leer('Configuracion', 'FaregasConfiguracionView.tsx');
const BACKEND = resolve(__dirname, '..', '..', '..', '..', '..', 'farenetBackend');
const MIGRACION = readFileSync(resolve(
  BACKEND,
  'modules', 'faregas', 'database', 'migrations',
  '20261002_faregas_permiso_configuracion_submodulos.sql'
), 'utf8');

const SUBMODULOS = [
  'MENU_CONFIGURACION_SEDES',
  'MENU_CONFIGURACION_CATALOGO',
  'MENU_CONFIGURACION_CORRELATIVOS',
  'MENU_CONFIGURACION_EMPRESAS'
];

describe('Editar Perfil divide Configuración en cuatro submódulos', () => {
  it('declara los cuatro hijos bajo MENU_CONFIGURACION', () => {
    expect(PERFILES).toContain("const PERMISO_CONFIGURACION = 'MENU_CONFIGURACION';");
    expect(PERFILES).toMatch(/padre: PERMISO_CONFIGURACION, hijos: SUBMODULOS_CONFIGURACION/);
    for (const permiso of SUBMODULOS) expect(PERFILES).toContain(`'${permiso}'`);
  });

  it('reutiliza la jerarquía padre-hijos y elimina los hijos al quitar el padre', () => {
    expect(PERFILES).toMatch(/MODULOS_CON_SUBMODULOS\.find\(\(m\) => m\.padre === clave\)/);
    expect(PERFILES).toMatch(/p !== clave && !modulo\.hijos\.includes\(p\)/);
  });
});

describe('Configuración sólo muestra las pestañas autorizadas', () => {
  it('cada pestaña exige su permiso visual', () => {
    for (const permiso of SUBMODULOS) expect(CONFIGURACION).toContain(`permisos.includes('${permiso}')`);
  });

  it('mantiene separados los permisos visuales y los operativos', () => {
    expect(CONFIGURACION).toMatch(/MENU_CONFIGURACION_SEDES'\) && hasSedes/);
    expect(CONFIGURACION).toMatch(/MENU_CONFIGURACION_CATALOGO'\) && hasCatalogo/);
    expect(CONFIGURACION).toMatch(/MENU_CONFIGURACION_TARIFAS'\) && hasTarifas/);
    expect(CONFIGURACION).toMatch(/MENU_CONFIGURACION_CORRELATIVOS'\) && hasCorrelativos/);
    expect(CONFIGURACION).toMatch(/MENU_CONFIGURACION_EMPRESAS'\) && hasEmpresas/);
  });

  it('si la pestaña activa queda oculta, usa la primera permitida', () => {
    expect(CONFIGURACION).toMatch(/tabs\.some\(\(tab\) => tab\.id === activeTab\)/);
    expect(CONFIGURACION).toMatch(/tabs\[0\]\?\.id as ConfigTab \| undefined/);
  });
});

describe('la migración conserva el acceso actual', () => {
  it('crea permisos MENU idempotentes', () => {
    for (const permiso of SUBMODULOS) expect(MIGRACION).toContain(`'${permiso}'`);
    expect(MIGRACION).toMatch(/ON CONFLICT \(clave\) DO UPDATE/);
    expect(MIGRACION).toMatch(/ON CONFLICT DO NOTHING/);
  });

  it('no elimina ni reemplaza permisos existentes', () => {
    expect(MIGRACION).not.toMatch(/DELETE\s+FROM/i);
    expect(MIGRACION).not.toMatch(/UPDATE\s+fg_perfil_permiso/i);
    expect(MIGRACION).toContain("padre.permiso_clave = 'MENU_CONFIGURACION'");
  });
});
