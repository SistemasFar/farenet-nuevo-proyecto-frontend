import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Retirada del campo "Orden" de Categorías en el frontend.
 *
 * El usuario ya no ve la columna, ni la define en Nueva/Editar Categoría, ni
 * la exporta a Excel, y el payload que se manda al backend ya no la lleva.
 * Estos tests leen la vista como texto porque lo que se verifica es exactamente
 * qué se muestra y qué se envía.
 */
const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');

const VISTA = leer('Configuracion', 'components', 'TabCategorias.tsx');
const API = leer('..', 'services', 'faregas-config.api.ts');

/** Quita comentarios: si una regla está escrita en un comentario, no cuenta. */
const codigo = (texto: string) =>
  texto.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

/** La cabecera de la tabla de categorías, acotada a su propio <thead>. */
const cabeceraCategorias = () => {
  const m = /<thead[\s\S]*?<\/thead>/.exec(VISTA);
  expect(m).not.toBeNull();
  return m![0];
};

describe('Categorías: la tabla ya no tiene columna Orden', () => {
  it('no hay ni <th> ni <td> de Orden', () => {
    expect(cabeceraCategorias()).not.toMatch(/Orden/);
    expect(VISTA).not.toMatch(/<td[^>]*>\s*\{categoria\.orden\}\s*<\/td>/);
  });

  it('quedan exactamente las columnas pedidas: Código, Nombre, Descripción, Estado, Acciones', () => {
    // `\s` es imprescindible: sin él, `<thead ...>` también cuenta como `<th`.
    const cabeceras = [...cabeceraCategorias().matchAll(/<th\s[^>]*>([^<]*)<\/th>/g)].map((m) => m[1].trim());
    expect(cabeceras).toEqual(['Código', 'Nombre', 'Descripción', 'Estado', 'Acciones']);
  });

  it('el cuerpo de la fila tiene el mismo número de celdas que la cabecera', () => {
    const cabeceras = [...cabeceraCategorias().matchAll(/<th\s[^>]*>/g)].length;
    // Se ancla a la fila de datos, no a otro `.map` (el del export de Excel
    // también recibe una `categoria`). La celda del mensaje "sin coincidencias"
    // lleva colSpan y no cuenta como columna.
    const fila = /<tr key=\{categoria\.id\}[\s\S]*?<\/tr>/.exec(codigo(VISTA));
    expect(fila).not.toBeNull();
    const celdas = (fila![0].match(/<td[ >]/g) || []).length;
    expect(cabeceras).toBe(5);
    expect(celdas).toBe(cabeceras);
  });

  it('el estado vacío cubre todas las columnas', () => {
    // Con 5 columnas, un colSpan de 6 desalinearía la fila del mensaje.
    expect(VISTA).toMatch(/colSpan=\{5\}/);
    expect(VISTA).not.toMatch(/colSpan=\{6\}/);
  });
});

describe('Categorías: el modal ya no pide Orden', () => {
  it('no existe el input de Orden', () => {
    expect(VISTA).not.toMatch(/value=\{actual\.orden/);
    expect(VISTA).not.toMatch(/setActual\(\{ \.\.\.actual, orden:/);
  });

  it('el formulario ya no tiene etiqueta "Orden"', () => {
    expect(VISTA).not.toMatch(/>\s*Orden\s*</);
  });

  it('el objeto de categoría nueva no lleva `orden` de partida', () => {
    const vacia = /const categoriaVacia[\s\S]*?\}\);/.exec(codigo(VISTA));
    expect(vacia).not.toBeNull();
    expect(vacia![0]).not.toMatch(/orden/);
  });

  it('el objeto que se envía es el que el usuario ve', () => {
    // Se manda `actual` tal cual: si el formulario ya no tiene `orden`, el
    // payload tampoco puede llevarlo.
    expect(VISTA).toMatch(/crearCategoria\(actual\)/);
    expect(VISTA).toMatch(/editarCategoria\(actual\.id, actual\)/);
  });
});

describe('Categorías: el Excel ya no incluye Orden', () => {
  /** El bloque completo del export: desde la llamada hasta el cierre `})))}`. */
  const bloqueExcel = () => {
    const m = /exportarExcel\('faregas_tipos_certificado'[\s\S]*?\}\)\)\)/.exec(VISTA);
    expect(m).not.toBeNull();
    return m![0];
  };

  it('la definición de columnas no tiene ORDEN', () => {
    expect(bloqueExcel()).not.toMatch(/ORDEN/);
  });

  it('el resto del export queda intacto', () => {
    const texto = bloqueExcel();
    expect(texto).toMatch(/CÓDIGO/);
    expect(texto).toMatch(/NOMBRE/);
    expect(texto).toMatch(/DESCRIPCIÓN/);
    expect(texto).toMatch(/ESTADO/);
    expect(texto).toMatch(/'faregas_tipos_certificado', 'Tipos de certificado'/);
  });

  it('el mapeo de filas ya no manda `orden`', () => {
    const mapeo = /filtradas\.map\(\(categoria\) => \(\{[\s\S]*?\}\)\)/.exec(VISTA);
    expect(mapeo).not.toBeNull();
    expect(mapeo![0]).not.toMatch(/orden:/);
    // Pero sí conserva el resto de los campos del catálogo.
    expect(mapeo![0]).toMatch(/codigo: categoria\.codigo/);
    expect(mapeo![0]).toMatch(/nombre: categoria\.nombre/);
    expect(mapeo![0]).toMatch(/descripcion: categoria\.descripcion/);
    expect(mapeo![0]).toMatch(/estado: categoria\.activo/);
  });
});

describe('Categorías: el tipo del frontend ya no expone Orden', () => {
  it('CategoriaServicio no declara `orden`', () => {
    const tipo = /export interface CategoriaServicio \{[\s\S]*?\}/.exec(API);
    expect(tipo).not.toBeNull();
    expect(tipo![0]).not.toMatch(/\borden\b/);
  });

  it('el tipo conserva el resto de los campos del catálogo', () => {
    const tipo = /export interface CategoriaServicio \{[\s\S]*?\}/.exec(API)![0];
    for (const campo of ['id', 'codigo', 'nombre', 'descripcion', 'activo',
      'productos_vinculados', 'servicios_vinculados']) {
      expect(tipo, `falta ${campo}`).toMatch(new RegExp(`\\b${campo}\\??:`));
    }
  });
});

describe('Categorías: lo que NO se tocó', () => {
  it('sigue habiendo Nuevo Tipo de Certificado, Editar, activar/desactivar y eliminar', () => {
    expect(VISTA).toMatch(/\+ Nuevo Tipo de Certificado/);
    expect(VISTA).toMatch(/setMode\('EDIT'\)/);
    expect(VISTA).toMatch(/setMode\('CREATE'\)/);
    expect(VISTA).toMatch(/cambiarEstadoCategoria/);
    expect(VISTA).toMatch(/eliminarCategoria/);
    expect(VISTA).toMatch(/obtenerImpactoCategoria/);
  });

  it('sigue exportando a Excel', () => {
    expect(VISTA).toMatch(/↓ Exportar Excel/);
    expect(VISTA).toMatch(/exportarExcel\(/);
  });

  it('sigue filtrando por texto y estado', () => {
    expect(VISTA).toMatch(/const filtradas = useMemo/);
    expect(VISTA).toMatch(/setSearch/);
    expect(VISTA).toMatch(/setEstado/);
  });

  it('las "órdenes de pago" del impacto NO se tocaron', () => {
    // Son otra cosa: órdenes de pago, no el orden de la categoría.
    expect(VISTA).toMatch(/impacto\.ordenesPago/);
  });
});
