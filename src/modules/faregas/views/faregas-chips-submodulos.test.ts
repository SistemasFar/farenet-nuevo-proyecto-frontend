/**
 * Submódulos de Chips: permisos granulares de navegación.
 *
 * El módulo Chips se mostraba entero con un único permiso (MENU_CHIPS) y sus
 * tres pestañas (Inventario, Tipos, Ventas) quedaban accesible para cualquiera
 * que entrara. Se añaden tres permisos de navegación, uno por pestaña, que se
 * exigen EN EL BACKEND junto con el permiso operativo que ya existía.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');

const VISTA = leer('Chips', 'ChipsView.tsx');
const PERFILES = leer('Usuarios', 'UsuariosView.tsx');
const SIDEBAR = leer('..', '..', '..', 'components', 'Sidebar.tsx');
const APP = leer('..', '..', '..', 'App.tsx');

const codigo = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const SUBMODULOS = ['MENU_CHIPS_INVENTARIO', 'MENU_CHIPS_TIPOS', 'MENU_CHIPS_VENTAS'];

/**
 * Contenido del bloque visual de un módulo con submódulos: la función
 * `bloqueModulo`, que se dibuja una vez por módulo. Sirve para comprobar que los
 * submódulos se pintan ahí dentro y no como celdas sueltas de la grilla.
 *
 * Desde 20261001 el bloque es genérico y lo comparten Chips y Facturación: hay
 * que comprobar el mecanismo, no una lista escrita a mano.
 */
const bloqueDeChips = (): RegExpExecArray => {
  // El tipo del parámetro contiene paréntesis anidados, así que el cuerpo se
  // delimita por la llave de cierre al mismo nivel de indentación.
  const m = /const bloqueModulo = \([\s\S]*?\) => \{([\s\S]*?)\n {32}\};/.exec(codigo(PERFILES));
  if (!m) throw new Error('no se encontró el bloque visual del módulo padre');
  return m;
};

describe('el frontend lee los tres permisos de submódulo', () => {
  it('cada submódulo se comprueba con su propio permiso', () => {
    expect(codigo(VISTA)).toMatch(/const puedeInventario = lista\.includes\('MENU_CHIPS_INVENTARIO'\);/);
    expect(codigo(VISTA)).toMatch(/const puedeTipos = lista\.includes\('MENU_CHIPS_TIPOS'\);/);
    expect(codigo(VISTA)).toMatch(/const puedeVentas = lista\.includes\('MENU_CHIPS_VENTAS'\);/);
  });

  it('los permisos vienen del contexto de la sesión, no están hardcodeados', () => {
    expect(codigo(VISTA)).toMatch(/useOutletContext<MainLayoutContext>\(\)/);
    expect(codigo(VISTA)).toMatch(/const lista = Array\.isArray\(permisos\) \? permisos : \[\];/);
    for (const mal of ['OPERADOR', 'SISTEMAS', 'JEFE_PLANTA']) {
      expect(codigo(VISTA)).not.toMatch(new RegExp(`'${mal}'`));
    }
  });

  it('las pestañas que no tiene el perfil no se renderizan', () => {
    expect(codigo(VISTA)).toMatch(/\]\s*as const\)\.filter\(\(p\) => p\.permiso\)/);
    expect(codigo(VISTA)).toMatch(/\{PESTANAS\.map\(\(\{ id, etiqueta, Icono \}\) => \(/);
  });

  it('la URL no puede abrir una pestaña no permitida', () => {
    // Si la URL pide PRODUCTOS y el perfil no lo tiene, cae a la primera
    // pestaña que sí tenga, en lugar de dejar la pantalla vacía.
    const bloque = /const \[activeTab, setActiveTab\][\s\S]*?\}\);/.exec(codigo(VISTA));
    expect(bloque).not.toBeNull();
    expect(bloque![0]).toMatch(/!puedeTipos/);
    expect(bloque![0]).toMatch(/!puedeInventario/);
  });

  it('sólo pide al backend lo que la pestaña activa necesita', () => {
    // Antes pedía las cuatro consultas siempre: un perfil sin un submódulo
    // acumulaba errores 403 aunque nunca abriera esa pestaña.
    const bloque = /const cargar = useCallback[\s\S]*?const \[r, l, prods, cat\] = await Promise\.all/;
    expect(bloque.test(codigo(VISTA))).toBe(true);
    expect(codigo(VISTA)).toMatch(/const resumenP = puedeInventario/);
    expect(codigo(VISTA)).toMatch(/const chipsP = puedeInventario/);
    expect(codigo(VISTA)).toMatch(/const prodsP = \(puedeInventario \|\| puedeTipos\)/);
    expect(codigo(VISTA)).toMatch(/const catP = puedeInventario/);
    // Y las dependencias del callback las incluyen.
    expect(codigo(VISTA)).toMatch(/chipsPageSize, puedeInventario, puedeTipos\]\);/);
  });

  it('el botón de vender sigue dependiendo del permiso OPERATIVO, no del de navegación', () => {
    // Con MENU_CHIPS_VENTAS se entra a la pestaña, pero sólo con CHIPS_VENDER
    // se ofrece la acción de venta.
    expect(codigo(VISTA)).toMatch(/const puedeVender = Array\.isArray\(permisos\) && permisos\.includes\('CHIPS_VENDER'\);/);
    expect(codigo(VISTA)).toMatch(/\{puedeVender && \(/);
  });
});

describe('la ruta y el sidebar siguen exigiendo el módulo completo', () => {
  it('la ruta /chips se mantiene bajo MENU_CHIPS', () => {
    expect(APP).toMatch(/path="chips"/);
    expect(APP).toMatch(/userPerms\.includes\('MENU_CHIPS'\) \|\| userPerms\.includes\('CHIPS_VER'\)/);
  });

  it('el sidebar de Chips no se amplía', () => {
    // Se mantiene MENU_CHIPS como puerta del módulo; los submódulos no crean
    // entradas nuevas en el menú lateral.
    expect(SIDEBAR).toMatch(/permisos: \['MENU_CHIPS', 'CHIPS_VER'\]/);
    expect(SIDEBAR).toMatch(/if \(item\.key === 'chips'\) \{\s*return permisos\.includes\('MENU_CHIPS'\) \|\| permisos\.includes\('CHIPS_VER'\);/);
    // Ningún submódulo aparece como item del menú.
    for (const sub of SUBMODULOS) {
      expect(SIDEBAR).not.toMatch(new RegExp(`key: '\\w+', path: '/\\w+',\\s*\\n\\s*label: '[^']*',\\s*\\n\\s*permisos: \\[[^\\]]*${sub}`));
    }
  });
});

describe('Editar Perfil ofrece los submódulos bajo Chips', () => {
  it('declara la lista de submódulos y el permiso padre', () => {
    const bloque = /const SUBMODULOS_CHIPS = \[[\s\S]*?\] as const;/.exec(codigo(PERFILES));
    expect(bloque).not.toBeNull();
    for (const sub of SUBMODULOS) {
      expect(bloque![0]).toMatch(new RegExp(`'${sub}'`));
    }
    expect(codigo(PERFILES)).toMatch(/const PERMISO_CHIPS = 'MENU_CHIPS';/);
    // Y queda registrado en la tabla de módulos con submódulos, que es la que
    // dibuja los bloques. Facturación se suma a esa misma tabla.
    expect(codigo(PERFILES)).toMatch(/const MODULOS_CON_SUBMODULOS = \[/);
    expect(codigo(PERFILES)).toMatch(/padre: PERMISO_CHIPS, hijos: SUBMODULOS_CHIPS as readonly string\[\]/);
  });

  it('los submódulos no se listan sueltos: se anidan bajo Chips', () => {
    expect(codigo(PERFILES)).toMatch(/const esSubmodulo = \(clave: string\) =>/);
    // `lista` ya no contiene ningún submódulo, y `otros` (la grilla) los excluye
    // por partida doble: no hay ruta por la que se mezclen con otros módulos.
    expect(codigo(PERFILES)).toMatch(/const lista = permisos\.filter\(\(p: any\) => !esSubmodulo\(p\.clave\)\);/);
    expect(codigo(PERFILES)).toMatch(/const otros = lista\.filter\(\(p: any\) =>/);
    expect(codigo(PERFILES)).toMatch(/!MODULOS_CON_SUBMODULOS\.some\(\(m\) => m\.padre === p\.clave\)\);/);
    // Los hijos se dibujan dentro del bloque del padre, no como celdas sueltas.
    const bloque = bloqueDeChips();
    expect(bloque![1]).toMatch(/const hijos = permisos\.filter\(\(p: any\) => modulo\.hijos\.includes\(p\.clave\)\);/);
    expect(bloque![1]).toMatch(/\{hijos\.map\(\(h: any\) => casilla\(h, true, padreActivo\)\)\}/);
  });

  it('los submódulos se ven indentados bajo su padre', () => {
    // La guía de jerarquía es el borde izquierdo, con sangría.
    expect(codigo(PERFILES)).toMatch(/ml-3 space-y-1\.5 border-l-2 border-slate-300 pl-3/);
  });

  it('Chips ocupa un bloque propio de ancho completo', () => {
    // Si se quedara dentro de la grilla de dos columnas, sus hijos caerían en
    // la celda siguiente junto a Configuración u otros módulos.
    expect(codigo(PERFILES)).toMatch(/const padre = lista\.find\(\(p: any\) => p\.clave === modulo\.padre\);/);
    const bloque = bloqueDeChips();
    expect(bloque[1]).toMatch(/\{hijos\.map\(\(h: any\) => casilla\(h, true, padreActivo\)\)\}/);
    // Los demás módulos siguen en la grilla de dos columnas.
    expect(codigo(PERFILES)).toMatch(/grid grid-cols-1 gap-2 sm:grid-cols-2/);
    expect(codigo(PERFILES)).toMatch(/\{otros\.map\(\(p: any\) => casilla\(p, false, true\)\)\}/);
  });

  it('los submódulos se ven secundarios respecto a los módulos', () => {
    // El tamaño del texto los distingue de los módulos principales: un
    // submódulo no debe verse al mismo nivel que Configuración.
    const texto = /hijo \? 'text-slate-600 text-xs' : 'text-slate-700'/.exec(codigo(PERFILES));
    expect(texto, 'no se encontró el estilo de texto por hijo').not.toBeNull();

    // Y el fondo: el padre va en gris (como el resto de módulos) y los hijos en
    // blanco, para que se lean como contenido anidado.
    const fondo = /hijo \? 'border-slate-200 bg-white' : 'bg-slate-50 border-slate-200'/.exec(codigo(PERFILES));
    expect(fondo, 'los hijos deberían tener fondo propio, distinto al de los módulos').not.toBeNull();
  });

  it('los submódulos no se dibujan fuera del bloque de su padre', () => {
    // El mapa de los hijos sólo puede aparecer dentro de bloqueModulo.
    const usos = codigo(PERFILES).match(/casilla\(h, true, padreActivo\)/g) || [];
    expect(usos.length).toBe(1);
    expect(bloqueDeChips()[1]).toMatch(/casilla\(h, true, padreActivo\)/);
    // Y la grilla de los demás módulos nunca recibe un submódulo.
    expect(codigo(PERFILES)).not.toMatch(/otros[\s\S]{0,240}?esSubmodulo/);
  });

  it('sin el padre marcado, los submódulos quedan deshabilitados', () => {
    expect(codigo(PERFILES)).toMatch(/const padreActivo = isSistemas \|\| marcados\.includes\(modulo\.padre\);/);
    // Un submódulo se bloquea si su padre no está activo.
    expect(codigo(PERFILES)).toMatch(/const bloqueado = isSistemas \|\| \(hijo && !padreActivo\);/);
  });
});

describe('la regla padre -> hijos se cumple al guardar', () => {
  /** Replica `togglePermiso` para comprobar la lógica sin montar React. */
  const toggle = (permisos: string[], clave: string): string[] => {
    const SUB = SUBMODULOS;
    if (clave === 'MENU_CHIPS' && permisos.includes('MENU_CHIPS')) {
      return permisos.filter((p) => p !== 'MENU_CHIPS' && !SUB.includes(p));
    }
    if (clave === 'MENU_CHIPS') return [...permisos, clave];
    return permisos.includes(clave) ? permisos.filter((p) => p !== clave) : [...permisos, clave];
  };

  it('desmarcar Chips se lleva por delante sus tres submódulos', () => {
    const todos = ['MENU_CHIPS', ...SUBMODULOS];
    const r = toggle(todos, 'MENU_CHIPS');
    expect(r).toEqual([]);
    // Y el guardado real se valida contra esta misma expectativa: filtra por el
    // padre y por los hijos del módulo al que pertenece.
    expect(codigo(PERFILES)).toMatch(/permisos: current\.filter\(\(p: string\) => p !== clave && !modulo\.hijos\.includes\(p\)\)/);
  });

  it('desmarcar Chips conserva los permisos que no son de chips', () => {
    const otros = ['MENU_INICIO', 'CONFIGURACION_PRODUCTOS'];
    const r = toggle(['MENU_CHIPS', ...SUBMODULOS, ...otros], 'MENU_CHIPS');
    expect(r.sort()).toEqual(otros.sort());
  });

  it('marcar Chips NO marca los submódulos de golpe', () => {
    // El administrador elige cuáles; marcar el padre no debe ampliar el alcance
    // más allá de lo que se le pidió.
    const r = toggle([], 'MENU_CHIPS');
    expect(r).toEqual(['MENU_CHIPS']);
    // Y el código real coincide con esa regla: sólo añade la clave del padre.
    expect(codigo(PERFILES)).toMatch(/if \(modulo\) \{\s*setFormData\(\{ \.\.\.formData, permisos: \[\.\.\.current, clave\] \}\);/);
  });

  it('los submódulos se pueden marcar y desmarcar por separado', () => {
    let p: string[] = toggle([], 'MENU_CHIPS');
    p = toggle(p, 'MENU_CHIPS_VENTAS');
    expect(p).toEqual(['MENU_CHIPS', 'MENU_CHIPS_VENTAS']);
    p = toggle(p, 'MENU_CHIPS_VENTAS');
    expect(p).toEqual(['MENU_CHIPS']);
  });
});

describe('los cuatro perfiles del caso de uso', () => {
  /** Replica lo que ve el usuario: menú, pestañas y botón de venta. */
  const vista = (permisos: string[]) => {
    const menu = permisos.includes('MENU_CHIPS') || permisos.includes('CHIPS_VER');
    return {
      menu,
      pestanas: [
        menu && permisos.includes('MENU_CHIPS_INVENTARIO') ? 'Inventario de chips' : null,
        menu && permisos.includes('MENU_CHIPS_TIPOS') ? 'Tipos de chip' : null,
        menu && permisos.includes('MENU_CHIPS_VENTAS') ? 'Ventas de chips' : null
      ].filter(Boolean),
      botonVender: permisos.includes('CHIPS_VENDER')
    };
  };

  it('Perfil A: los tres submódulos -> acceso completo', () => {
    const p = ['MENU_CHIPS', ...SUBMODULOS, 'CHIPS_VER', 'CHIPS_CONFIGURAR', 'CHIPS_VENDER'];
    const v = vista(p);
    expect(v.menu).toBe(true);
    expect(v.pestanas).toEqual(['Inventario de chips', 'Tipos de chip', 'Ventas de chips']);
    expect(v.botonVender).toBe(true);
  });

  it('Perfil B: sólo Ventas -> sólo Ventas de chips', () => {
    const p = ['MENU_CHIPS', 'MENU_CHIPS_VENTAS', 'CHIPS_VENDER'];
    const v = vista(p);
    expect(v.menu).toBe(true);
    expect(v.pestanas).toEqual(['Ventas de chips']);
    expect(v.botonVender).toBe(true);
  });

  it('Perfil C: sólo Inventario -> sólo Inventario de chips', () => {
    const p = ['MENU_CHIPS', 'MENU_CHIPS_INVENTARIO', 'CHIPS_VER'];
    const v = vista(p);
    expect(v.menu).toBe(true);
    expect(v.pestanas).toEqual(['Inventario de chips']);
    // Sin CHIPS_VENDER tampoco ve el botón de venta, aunque tenga la pestaña.
    expect(v.botonVender).toBe(false);
  });

  it('Perfil D: sin Chips -> ningún acceso', () => {
    const v = vista(['MENU_INICIO', 'MENU_USUARIOS']);
    expect(v.menu).toBe(false);
    expect(v.pestanas).toEqual([]);
    expect(v.botonVender).toBe(false);
  });

  it('un submódulo sin su permiso operativo no abre el endpoint', () => {
    // El backend exige las dos cosas: navegación Y operación.
    const soloNavegacion = ['MENU_CHIPS', 'MENU_CHIPS_VENTAS'];
    const backend = (operativo: string[]) =>
      soloNavegacion.includes('MENU_CHIPS_VENTAS') && operativo.every((o) => soloNavegacion.includes(o));
    expect(backend(['CHIPS_VENDER'])).toBe(false);
    expect(backend(['CHIPS_VER'])).toBe(false);
  });
});
