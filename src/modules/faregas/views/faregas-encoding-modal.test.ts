import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Codificación de los textos del modal "Configurar operación".
 *
 * `ServicioModal.tsx` llegó a tener 21 caracteres U+FFFD (el carácter de
 * reemplazo, escrito aqui como escapes para no repetir el fallo): las vocales
 * acentuadas se perdieron al escribir el archivo, así que la interfaz mostraba
 * "Configurar nueva operaci_n", "C_digo t_cnico" y "Formato de impresi_n".
 *
 * Estos tests son la barrera para que no vuelva a pasar: detectan el carácter de
 * reemplazo y las firmas de doble codificación, y comprueban que los textos que
 * el usuario ve llevan las tildes correctas.
 *
 * Todos los caracteres problemáticos se escriben como secuencia de escape, para
 * que este archivo no se detecte a sí mismo como corrupto.
 */
const MODAL = resolve(__dirname, 'Configuracion', 'components', 'ServicioModal.tsx');

const REEMPLAZO = '\uFFFD';
// U+00C3 y U+00C2: la "A" con diéresis que aparece cuando un texto UTF-8 se
// interpreta como latin-1. Sólo se buscan Next a un byte alto.
const MOJI_A = '\u00C3';
const MOJI_B = '\u00C2';

const ACENTOS: Record<string, string> = {
  a: '\u00E1', e: '\u00E9', i: '\u00ED', o: '\u00F3', u: '\u00FA'
};
const { a, e, i, o, u } = ACENTOS;

/** Recorre `src` buscando archivos de código con texto. */
const archivosDeCodigo = (raiz: string): string[] => {
  const salida: string[] = [];
  for (const nombre of readdirSync(raiz)) {
    const p = join(raiz, nombre);
    if (statSync(p).isDirectory()) {
      salida.push(...archivosDeCodigo(p));
    } else if (/\.(ts|tsx)$/.test(nombre)) {
      salida.push(p);
    }
  }
  return salida;
};

const RAIZ_MODULO = resolve(__dirname, '..');
const ARCHIVOS = archivosDeCodigo(RAIZ_MODULO);

describe('ningún archivo del módulo tiene caracteres de reemplazo', () => {
  it('no hay U+FFFD en ningún .ts/.tsx de FAREGAS', () => {
    const sucios: string[] = [];
    for (const f of ARCHIVOS) {
      if (f === __filename) continue;
      const t = readFileSync(f, 'utf8');
      if (t.includes(REEMPLAZO)) sucios.push(`${f} (${(t.match(/\uFFFD/g) || []).length})`);
    }
    expect(sucios, `archivos con texto corrupto: ${sucios.join(', ')}`).toEqual([]);
  });

  it('el modal de operación está libre de corrupción', () => {
    expect(readFileSync(MODAL, 'utf8')).not.toMatch(/\uFFFD/);
  });
});

describe('no hay doble codificación (UTF-8 leído como latin-1)', () => {
  it('ningún archivo contiene la firma de mojibake', () => {
    // Un archivo bien guardado en UTF-8 con "ó" guarda C3 B3. Si alguien lo
    // guardara en latin-1 y luego se leyera como UTF-8 aparecería esa firma.
    const sucios: string[] = [];
    for (const f of ARCHIVOS) {
      if (f === __filename) continue;
      const t = readFileSync(f, 'utf8');
      const tiene = (c: string) => {
        for (let k = 0; k < t.length - 1; k += 1) {
          if (t[k] === c && t.charCodeAt(k + 1) >= 0x80 && t.charCodeAt(k + 1) <= 0xbf) return true;
        }
        return false;
      };
      if (tiene(MOJI_A) || tiene(MOJI_B)) sucios.push(f);
    }
    expect(sucios, `archivos con mojibake: ${sucios.join(', ')}`).toEqual([]);
  });
});

describe('los textos del modal llevan las tildes correctas', () => {
  const texto = readFileSync(MODAL, 'utf8');

  it(`"Configurar nueva operaci${o}n" y "Configurar operaci${o}n"`, () => {
    expect(texto).toMatch(new RegExp(`Configurar nueva operaci${o}n`));
    expect(texto).toMatch(new RegExp(`'Configurar operaci${o}n'`));
  });

  it(`"C${o}digo t${e}cnico"`, () => {
    expect(texto).toMatch(new RegExp(`C${o}digo t${e}cnico`));
  });

  it(`"operaci${o}n" en los mensajes de validación`, () => {
    // Se comprueban los mensajes que el modal sigue mostrando. El de elegir
    // formato ya no existe: ese campo se quitó del formulario.
    expect(texto).toMatch(new RegExp(`afectaci${o}n IGV 10`));
    expect(texto).toMatch(new RegExp(`para una certificaci${o}n`));
    expect(texto).toMatch(new RegExp(`El c${o}digo y el nombre de la operaci${o}n`));
    expect(texto).toMatch(new RegExp(`identificar la operaci${o}n`));
  });

  it(`"v${a}lida" y "configuraci${o}n"`, () => {
    expect(texto).toMatch(new RegExp(`variante v${a}lida`));
    expect(texto).toMatch(new RegExp(`guardar la configuraci${o}n`));
    expect(texto).toMatch(new RegExp(`Guardar configuraci${o}n`));
  });

  it(`"Identidad de la operaci${o}n" y el texto de tarifas`, () => {
    expect(texto).toMatch(new RegExp(`Identidad de la operaci${o}n`));
    expect(texto).toMatch(new RegExp(`tarifas reales de la operaci${o}n`));
  });

  it('el modal conserva vocales acentuadas reales (no texto plano)', () => {
    // No se comprueba una lista fija: este modal usa varias vocales distintas y
    // basta con que estén presentes y sean las codificadas en UTF-8.
    for (const letra of [a, e, i, o, u]) {
      expect(texto.includes(letra),
        `falta la vocal acentuada U+${letra.codePointAt(0)!.toString(16).toUpperCase()}`).toBe(true);
    }
  });
});

describe('el archivo está guardado en UTF-8', () => {
  it('decodifica como UTF-8 estricto y sin BOM', () => {
    const buf = readFileSync(MODAL);
    expect(() => new TextDecoder('utf-8', { fatal: true }).decode(buf)).not.toThrow();
    const esBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    expect(esBom, 'no debe llevar BOM').toBe(false);
  });

  it(`"C${o}digo" usa los bytes UTF-8 de "ó" (C3 B3), no el byte latin-1 (E9)`, () => {
    const texto = readFileSync(MODAL, 'utf8');
    const pos = texto.indexOf(`C${o}digo`);
    expect(pos).toBeGreaterThan(-1);
    // "C" + "ó" = 43 C3 B3
    const bytes = [...Buffer.from(texto.slice(pos, pos + 2), 'utf8')].map((b) => b.toString(16).toUpperCase());
    expect(bytes).toEqual(['43', 'C3', 'B3']);
  });
});
