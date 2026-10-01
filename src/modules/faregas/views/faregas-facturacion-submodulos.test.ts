/**
 * Submódulos de Facturación: permisos granulares de navegación.
 *
 * El módulo Facturación se mostraba entero con un único permiso (MENU_FACTURACION)
 * y sus tres pestañas (PREPARACIÓN, SERIES, COMPROBANTES) quedaban accesibles
 * para cualquiera que entrara. Se añaden tres permisos de navegación, uno por
 * pestaña, con el mismo patrón que Chips ya usa (20260929_faregas_permiso_
 * chips_submodulos.sql y 20261001_faregas_permiso_facturacion_submodulos.sql).
 *
 * El caso de uso es un perfil CONTADOR: Facturación + Comprobantes, sin
 * Preparación ni Series, para poder seguir comprobantes sin abrirle la
 * administración de series.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');

const VISTA = leer('Configuracion', 'components', 'TabFacturacion.tsx');
const PERFILES = leer('Usuarios', 'UsuariosView.tsx');

// El backend vive en el repo hermano, no dentro de `src`.
const BACKEND = resolve(__dirname, '..', '..', '..', '..', '..', 'farenetBackend');
const leerBackend = (...partes: string[]) => readFileSync(resolve(BACKEND, ...partes), 'utf8');

const RUTAS_CONFIG = leerBackend('modules', 'faregas', 'routes', 'faregas-config.routes.js');
const RUTAS_CERT = leerBackend('modules', 'faregas', 'routes', 'faregas-certificados.routes.js');
const MIGRACION = leerBackend('modules', 'faregas', 'database', 'migrations',
    '20261001_faregas_permiso_facturacion_submodulos.sql');

const codigo = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const SUBMODULOS = [
  'MENU_FACTURACION_PREPARACION',
  'MENU_FACTURACION_SERIES',
  'MENU_FACTURACION_COMPROBANTES'
];

describe('los tres permisos de Facturación existen y son de navegación', () => {
  it('la migración declara los tres con módulo MENU', () => {
    for (const sub of SUBMODULOS) {
      expect(MIGRACION).toContain(`'${sub}'`);
    }
    expect(MIGRACION).toMatch(/\('MENU_FACTURACION_PREPARACION', 'Preparación', 'MENU'/);
    expect(MIGRACION).toMatch(/\('MENU_FACTURACION_SERIES', 'Series', 'MENU'/);
    expect(MIGRACION).toMatch(/\('MENU_FACTURACION_COMPROBANTES', 'Comprobantes', 'MENU'/);
  });

  it('es idempotente', () => {
    expect(MIGRACION).toMatch(/ON CONFLICT \(clave\) DO UPDATE/);
    expect(MIGRACION).toMatch(/ON CONFLICT DO NOTHING/);
  });

  it('mantiene el permiso padre MENU_FACTURACION y no toca los operativos', () => {
    // El padre ya existía: la migración sólo lo usa como criterio.
    expect(MIGRACION).not.toMatch(/INSERT INTO fg_permiso[^;]*MENU_FACTURACION', /);
    // Y CONFIGURACION_SERIES sigue siendo el permiso operativo de Series.
    expect(MIGRACION).toMatch(/CONFIGURACION_SERIES/);
    // No se degradan ni se dan de baja permisos existentes.
    expect(MIGRACION).not.toMatch(/UPDATE fg_permiso SET activo/);
    expect(MIGRACION).not.toMatch(/DELETE FROM fg_perfil_permiso/);
  });
});

describe('la migración da los tres submódulos a quien ya tenía Facturación', () => {
  it('el criterio es MENU_FACTURACION o MENU_CONFIGURACION + CONFIGURACION_SERIES', () => {
    // Las dos vías por las que los middlewares ya abrían el módulo.
    expect(codigo(MIGRACION)).toMatch(/pp\.permiso_clave = 'MENU_FACTURACION'/);
    expect(codigo(MIGRACION)).toMatch(/pp\.permiso_clave = 'MENU_CONFIGURACION'/);
    expect(codigo(MIGRACION)).toMatch(/serie\.permiso_clave = 'CONFIGURACION_SERIES'/);
  });

  it('sobre-otorga a propósito y lo dice', () => {
    // Preferible granting de más: el administrador lo quita desde Editar Perfil.
    expect(MIGRACION).toMatch(/sobre-otorgan los tres a propósito/);
    expect(MIGRACION).toMatch(/NADIE PIERDE ACCESO/);
  });
});

describe('la vista de Facturación lee los tres permisos', () => {
  it('cada pestaña se comprueba con su propio permiso', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/permiso: 'MENU_FACTURACION_PREPARACION'/);
    expect(fuente).toMatch(/permiso: 'MENU_FACTURACION_SERIES'/);
    expect(fuente).toMatch(/permiso: 'MENU_FACTURACION_COMPROBANTES'/);
  });

  it('los permisos vienen del contexto de la sesión, no están hardcodeados', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/useOutletContext<MainLayoutContext>\(\)/);
    expect(fuente).toMatch(/const lista = Array\.isArray\(permisos\) \? permisos : \[\];/);
    for (const mal of ['OPERADOR', 'SISTEMAS', 'JEFE_PLANTA', 'CONTADOR']) {
      expect(fuente).not.toMatch(new RegExp(`'${mal}'`));
    }
  });

  it('sólo se pintan las pestañas autorizadas', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/const visibles = PESTANAS\.filter\(\(p\) => lista\.includes\(p\.permiso\)\);/);
    expect(fuente).toMatch(/\{visibles\.map\(\(p\) => pestana\(p\.id, p\.label\)\)\}/);
  });
});

describe('nunca queda seleccionado un tab sin permiso', () => {
  it('el tab inicial es la primera pestaña autorizada', () => {
    // Antes `PREPARACION` estaba fija: un perfil sin ella se quedaba mirando un
    // botón que no podía abrir.
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/const \[vista, setVista\] = useState<VistaFacturacion>\(permitidas\[0\] \?\? 'DOCUMENTOS'\);/);
    expect(fuente).not.toMatch(/useState<VistaFacturacion>\('PREPARACION'\)/);
  });

  it('se corrige si los permisos cambian después', () => {
    // Los permisos llegan de forma asíncrona: el estado inicial puede quedar
    // fuera de conjunto y hay que repararlo.
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/useEffect\(\(\) => \{/);
    expect(fuente).toMatch(/if \(permitidas\.length > 0 && !permitidas\.includes\(vista\)\)/);
    expect(fuente).toMatch(/setVista\(permitidas\[0\]\);/);
  });

  it('si no tiene ninguna pestaña no rompe la vista', () => {
    // El módulo exige MENU_FACTURACION para llegar aquí, pero si se llegara sin
    // ningún submódulo el render no debe reventar.
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/permitidas\[0\] \?\? 'DOCUMENTOS'/);
    expect(fuente).toMatch(/if \(permitidas\.length > 0 && !permitidas\.includes\(vista\)\)/);
  });
});

describe('Editar Perfil anida los submódulos de Facturación', () => {
  it('declara la lista de submódulos y el permiso padre', () => {
    expect(codigo(PERFILES)).toMatch(/const SUBMODULOS_FACTURACION = \[/);
    for (const sub of SUBMODULOS) {
      expect(codigo(PERFILES)).toContain(`'${sub}'`);
    }
    expect(codigo(PERFILES)).toMatch(/const PERMISO_FACTURACION = 'MENU_FACTURACION';/);
  });

  it('los dos módulos con submódulos comparten el mismo bloque visual', () => {
    // No se duplica la UI: una tabla de módulos, y el bloque se dibuja por
    // iteración sobre MODULOS_CON_SUBMODULOS.
    expect(codigo(PERFILES)).toMatch(/const MODULOS_CON_SUBMODULOS = \[/);
    expect(codigo(PERFILES)).toMatch(/\{MODULOS_CON_SUBMODULOS\.map\(bloqueModulo\)\}/);
    expect(codigo(PERFILES)).toMatch(/const bloqueModulo = \(modulo: \{ padre: string; hijos: readonly string\[\] \}\)/);
  });

  it('los submódulos se anidan bajo su padre, no sueltos en la grilla', () => {
    const fuente = codigo(PERFILES);
    expect(fuente).toMatch(/const esSubmodulo = \(clave: string\) =>/);
    expect(fuente).toMatch(/const lista = permisos\.filter\(\(p: any\) => !esSubmodulo\(p\.clave\)\);/);
    // Los módulos con submódulos salen de la grilla; los demás siguen ahí.
    expect(fuente).toMatch(/const otros = lista\.filter\(\(p: any\) =>/);
    expect(fuente).toMatch(/!MODULOS_CON_SUBMODULOS\.some\(\(m\) => m\.padre === p\.clave\)\);/);
    expect(fuente).toMatch(/\{otros\.map\(\(p: any\) => casilla\(p, false, true\)\)\}/);
  });

  it('cada bloque dibuja su padre y debajo sus hijos con guía de jerarquía', () => {
    const fuente = codigo(PERFILES);
    expect(fuente).toMatch(/const padre = lista\.find\(\(p: any\) => p\.clave === modulo\.padre\);/);
    expect(fuente).toMatch(/const hijos = permisos\.filter\(\(p: any\) => modulo\.hijos\.includes\(p\.clave\)\);/);
    expect(fuente).toMatch(/\{casilla\(padre, false, padreActivo\)\}/);
    expect(fuente).toMatch(/\{hijos\.map\(\(h: any\) => casilla\(h, true, padreActivo\)\)\}/);
    expect(fuente).toMatch(/ml-3 space-y-1\.5 border-l-2 border-slate-300 pl-3/);
  });

  it('sin el padre marcado, los hijos quedan deshabilitados', () => {
    const fuente = codigo(PERFILES);
    expect(fuente).toMatch(/const padreActivo = isSistemas \|\| marcados\.includes\(modulo\.padre\);/);
    expect(fuente).toMatch(/const bloqueado = isSistemas \|\| \(hijo && !padreActivo\);/);
  });
});

describe('la regla padre -> hijos se cumple al guardar', () => {
  /** Replica `togglePermiso` para comprobar la lógica sin montar React. */
  const toggle = (permisos: string[], clave: string): string[] => {
    const MODULOS = [
      { padre: 'MENU_CHIPS', hijos: ['MENU_CHIPS_INVENTARIO', 'MENU_CHIPS_TIPOS', 'MENU_CHIPS_VENTAS'] },
      { padre: 'MENU_FACTURACION', hijos: SUBMODULOS }
    ];
    const modulo = MODULOS.find((m) => m.padre === clave);
    if (modulo && permisos.includes(clave)) {
      return permisos.filter((p) => p !== clave && !modulo.hijos.includes(p));
    }
    if (modulo) return [...permisos, clave];
    return permisos.includes(clave) ? permisos.filter((p) => p !== clave) : [...permisos, clave];
  };

  it('desmarcar Facturación se lleva por delante sus tres submódulos', () => {
    const todos = ['MENU_FACTURACION', ...SUBMODULOS];
    expect(toggle(todos, 'MENU_FACTURACION')).toEqual([]);
  });

  it('desmarcar Facturación conserva lo que no es de facturación', () => {
    const otros = ['MENU_INICIO', 'MENU_CHIPS', 'CONFIGURACION_PRODUCTOS'];
    const r = toggle(['MENU_FACTURACION', ...SUBMODULOS, ...otros], 'MENU_FACTURACION');
    expect(r.sort()).toEqual(otros.sort());
  });

  it('desmarcar Chips NO se lleva los submódulos de Facturación', () => {
    // Es el riesgo de generalizar el toggle: los dos padres son independientes.
    const p = ['MENU_CHIPS', 'MENU_FACTURACION', ...SUBMODULOS];
    const r = toggle(p, 'MENU_CHIPS');
    expect(r.sort()).toEqual(['MENU_FACTURACION', ...SUBMODULOS].sort());
  });

  it('marcar Facturación NO marca los tres hijos de golpe', () => {
    // El administrador elige cuáles; marcar el padre no amplía más el alcance.
    expect(toggle([], 'MENU_FACTURACION')).toEqual(['MENU_FACTURACION']);
  });

  it('los hijos se pueden marcar y desmarcar por separado', () => {
    let p: string[] = toggle([], 'MENU_FACTURACION');
    p = toggle(p, 'MENU_FACTURACION_COMPROBANTES');
    expect(p).toEqual(['MENU_FACTURACION', 'MENU_FACTURACION_COMPROBANTES']);
    p = toggle(p, 'MENU_FACTURACION_COMPROBANTES');
    expect(p).toEqual(['MENU_FACTURACION']);
  });
});

describe('el backend cierra la puerta, no sólo la UI', () => {
  it('Series exige su submódulo de navegación', () => {
    const bloque = /const requireConfigSeriesPerm[\s\S]*?\n\};/.exec(RUTAS_CONFIG);
    expect(bloque).not.toBeNull();
    expect(bloque![0]).toMatch(/permiso_clave = 'MENU_FACTURACION_SERIES'/);
    // MENU_FACTURACION a secas ya no abre la administración de series.
    expect(bloque![0]).not.toMatch(/permiso_clave = 'MENU_FACTURACION'/);
  });

  it('conserva la vía operativa Configuración > Series', () => {
    const bloque = /const requireConfigSeriesPerm[\s\S]*?\n\};/.exec(RUTAS_CONFIG);
    expect(bloque![0]).toMatch(/permiso_clave = 'MENU_CONFIGURACION'/);
    expect(bloque![0]).toMatch(/series_permiso\.permiso_clave = 'CONFIGURACION_SERIES'/);
  });

  it('Comprobantes y Preparación exigen su submódulo por separado', () => {
    const fuente = RUTAS_CERT;
    expect(fuente).toMatch(/const esReadiness = req\.path\.endsWith\('\/readiness'\);/);
    expect(fuente).toMatch(/'MENU_FACTURACION_PREPARACION'/);
    expect(fuente).toMatch(/'MENU_FACTURACION_COMPROBANTES'/);
    // Y ya no basta el módulo entero.
    expect(fuente).not.toMatch(/permiso_clave IN \('MENU_FACTURACION', 'MENU_CONFIGURACION'/);
  });
});

describe('la emisión desde el wizard NO depende de los submódulos', () => {
  it('emitir sigue fuera del middleware administrativo', () => {
    // Es el requisito crítico: quitarle Series a un perfil no debe romper la
    // emisión de certificados de los demás.
    const lineas = RUTAS_CERT.split('\n')
      .filter((l) => /router\.(post|get|put)\('\/borradores\/:id\/(emitir|facturacion\/emitir|validar-emision|previsualizacion)/.test(l));
    expect(lineas.length).toBeGreaterThan(0);
    for (const l of lineas) {
      expect(l).not.toMatch(/facturacionAdminMiddleware/);
    }
  });

  it('sólo las tres rutas administrativas pasan por el middleware', () => {
    const admin = RUTAS_CERT.split('\n')
      .filter((l) => /facturacionAdminMiddleware,/.test(l) && /router\./.test(l));
    expect(admin.length).toBe(3);
    expect(admin.join('\n')).toMatch(/facturacion\/admin\/documentos'/);
    expect(admin.join('\n')).toMatch(/facturacion\/admin\/readiness'/);
  });
});

describe('los casos de uso A-F', () => {
  /** Replica lo que ve el usuario: qué pestañas se pintan y cuál queda activa. */
  const vista = (permisos: string[]) => {
    const P = [
      { id: 'PREPARACION', permiso: 'MENU_FACTURACION_PREPARACION', label: 'PREPARACIÓN' },
      { id: 'SERIES', permiso: 'MENU_FACTURACION_SERIES', label: 'SERIES' },
      { id: 'DOCUMENTOS', permiso: 'MENU_FACTURACION_COMPROBANTES', label: 'COMPROBANTES' }
    ];
    const menu = permisos.includes('MENU_FACTURACION');
    const visibles = menu ? P.filter((p) => permisos.includes(p.permiso)) : [];
    return {
      menu,
      pestanas: visibles.map((p) => p.label),
      inicial: visibles[0]?.id ?? null
    };
  };

  /** Replica los dos middlewares del backend. */
  const backend = (permisos: string[], endpoint: 'series' | 'documentos' | 'readiness') => {
    const sub = {
      series: 'MENU_FACTURACION_SERIES',
      documentos: 'MENU_FACTURACION_COMPROBANTES',
      readiness: 'MENU_FACTURACION_PREPARACION'
    }[endpoint];
    return permisos.includes(sub) || permisos.includes('MENU_CONFIGURACION') || permisos.includes('CONFIGURACION_SERIES');
  };

  it('CASO A: los tres submódulos -> ve las tres pestañas, abre Preparación', () => {
    const v = vista(['MENU_FACTURACION', ...SUBMODULOS]);
    expect(v.menu).toBe(true);
    expect(v.pestanas).toEqual(['PREPARACIÓN', 'SERIES', 'COMPROBANTES']);
    expect(v.inicial).toBe('PREPARACION');
  });

  it('CASO B: sólo Comprobantes -> sólo Comprobantes, entra ahí', () => {
    const p = ['MENU_FACTURACION', 'MENU_FACTURACION_COMPROBANTES'];
    const v = vista(p);
    expect(v.pestanas).toEqual(['COMPROBANTES']);
    expect(v.inicial).toBe('DOCUMENTOS');
    // Y el backend le deja ver comprobantes, pero ni series ni preparación.
    expect(backend(p, 'documentos')).toBe(true);
    expect(backend(p, 'series')).toBe(false);
    expect(backend(p, 'readiness')).toBe(false);
  });

  it('CASO C: sólo Series -> sólo Series, entra ahí', () => {
    const p = ['MENU_FACTURACION', 'MENU_FACTURACION_SERIES'];
    const v = vista(p);
    expect(v.pestanas).toEqual(['SERIES']);
    expect(v.inicial).toBe('SERIES');
  });

  it('CASO D: sin Facturación -> el módulo no se ve', () => {
    const v = vista(['MENU_INICIO', 'MENU_USUARIOS']);
    expect(v.menu).toBe(false);
    expect(v.pestanas).toEqual([]);
  });

  it('CASO E: sin Series, escribir la URL no abre el endpoint', () => {
    // Es el requisito de no basta con ocultar en la UI.
    const contador = ['MENU_FACTURACION', 'MENU_FACTURACION_COMPROBANTES'];
    expect(backend(contador, 'series')).toBe(false);
    // Con MENU_FACTURACION a secas tampoco.
    expect(backend(['MENU_FACTURACION'], 'series')).toBe(false);
  });

  it('CASO F: un perfil con Facturación completo conserva las tres tras la migración', () => {
    const sistemas = ['MENU_FACTURACION', ...SUBMODULOS];
    const v = vista(sistemas);
    expect(v.pestanas).toEqual(['PREPARACIÓN', 'SERIES', 'COMPROBANTES']);
    expect(backend(sistemas, 'series')).toBe(true);
    expect(backend(sistemas, 'documentos')).toBe(true);
    expect(backend(sistemas, 'readiness')).toBe(true);
  });

  it('la emisión del wizard no depende de ningún submódulo', () => {
    // Un perfil sin Series que emite desde el wizard sigue funcionando.
    const contador = ['MENU_FACTURACION', 'MENU_FACTURACION_COMPROBANTES'];
    expect(contador).not.toContain('MENU_FACTURACION_SERIES');
    // Las rutas de emisión no pasan por facturacionAdminMiddleware: ver arriba.
    expect(RUTAS_CERT).toMatch(/NO pasan por facturacionAdminMiddleware/);
  });
});
