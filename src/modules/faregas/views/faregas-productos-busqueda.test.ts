import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * REGRESIÓN: buscar un producto fiscal que NO está en la primera página.
 *
 * Caso reportado: se creó el SKU 999 / "LUHAN LUHAN" y al escribir "LUHAN" en
 * el buscador la pantalla mostró "0 de 10 productos".
 *
 * La causa estaba en esta vista, no en el backend: pedía la página 1 sin
 * filtros y luego filtraba ESOS 10 registros con un `useMemo`, así que un SKU
 * de la página 28 era invisible por más que estuviera en la base de datos.
 *
 * Estos tests leen la vista y la API como texto porque lo que se verifica es
 * exactamente qué se envía y qué se calcula en el navegador. No necesitan base
 * de datos y fallan en cuanto se vuelve a filtrar en memoria.
 */
const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');

const VISTA = leer('Configuracion', 'components', 'TabProductos.tsx');
const API = leer('..', 'services', 'faregas-productos.api.ts');

/** Sin comentarios: una regla explicada en un comentario no la cumple el código. */
const codigo = (t: string) =>
  t.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('el bug: la vista filtraba en memoria los productos ya cargados', () => {
  it('no existe el filtrado en memoria que rompía la búsqueda', () => {
    const fuente = codigo(VISTA);
    // El síntoma venía de aquí: `productos.filter(...)` sobre la página cargada.
    expect(fuente).not.toMatch(/const filtrados = useMemo\(\(\) => productos\.filter/);
    expect(fuente).not.toMatch(/productos\.filter\(\(producto\) =>/);
    expect(fuente).not.toMatch(/const filtrados =/);
  });

  it('la tabla usa la página del backend y el Excel solicita el resultado completo', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/\{productos\.map\(\(producto\) => \{/);
    expect(fuente).toMatch(/faregasProductosApi\.listarTodos\(/);
    // Y el contador usa el total del backend, no la longitud de la página.
    expect(fuente).toMatch(/\{resumen\.total\} productos/);
    expect(fuente).not.toMatch(/\{filtrados\.length\} de \{productos\.length\}/);
  });
});

describe('la corrección: los filtros van al backend', () => {
  it('la vista usa el listado paginado del backend', () => {
    expect(codigo(VISTA)).toMatch(/faregasProductosApi\.listarPaginado\(/);
  });

  it('el texto de búsqueda se envía al backend', () => {
    expect(codigo(VISTA)).toMatch(/buscar: buscarAplicado \|\| undefined/);
  });

  it('los otros cuatro filtros también se envían', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/activo: estado === '' \? undefined : estado === '1'/);
    expect(fuente).toMatch(/es_para_venta: paraVenta === '' \? undefined : paraVenta === '1'/);
    expect(fuente).toMatch(/unidad: unidad \|\| undefined/);
    expect(fuente).toMatch(/categoria_id: categoria \|\| undefined/);
  });

  it('el catálogo de unidades viene del backend, no de la página cargada', () => {
    // Si se derivara de los 10 productos cargados, al buscar un texto el
    // desplegable se quedaría solo con las unidades de lo encontrado.
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/const unidades = catalogoUnidades;/);
    expect(fuente).toMatch(/setCatalogoUnidades\(r\.unidades\)/);
    expect(fuente).not.toMatch(/new Set\(productos\.map\(\(p\) => p\.unidad\)/);
  });
});

describe('la API construye la consulta completa', () => {
  it('envía los cinco filtros y la página', () => {
    const fuente = codigo(API);
    for (const clave of ['buscar', 'activo', 'es_para_venta', 'unidad', 'categoria_id', 'page', 'pageSize']) {
      expect(fuente, `falta el parámetro ${clave}`).toMatch(
        new RegExp(`params\\.set\\('${clave}'`)
      );
    }
  });

  it('no manda parámetros vacíos que podrían filtrar de más', () => {
    // "Categoría: Todas" debe viajar como ausencia de filtro, no como "undefined".
    expect(codigo(API)).toMatch(/if \(filtros\.buscar\?\.trim\(\)\) params\.set\('buscar', filtros\.buscar\.trim\(\)\);/);
    expect(codigo(API)).toMatch(/if \(filtros\.unidad\) params\.set\('unidad', filtros\.unidad\);/);
    expect(codigo(API)).toMatch(/if \(filtros\.categoria_id\) params\.set\('categoria_id', String\(filtros\.categoria_id\)\);/);
  });

  it('conserva listar() para el consumidor que espera un arreglo', () => {
    // TabCertificadosBase todavía la usa y no se toca en esta corrección.
    const fuente = codigo(API);
    expect(fuente).toMatch(/listar: async \(\): Promise<ProductoFacturacion\[\]> => \{/);
    expect(fuente).toMatch(/return response\.productos \|\| \[\];/);
  });

  it('listarPaginado devuelve el sobre de paginación', () => {
    const fuente = codigo(API);
    expect(fuente).toMatch(/totalPages: Number\(response\.totalPages/);
    expect(fuente).toMatch(/unidades: response\.unidades \|\| \[\]/);
  });
});

describe('paginación y requests', () => {
  it('reutiliza el componente de paginación compartido', () => {
    expect(VISTA).toMatch(/import \{ Paginacion \} from '\.\.\/\.\.\/components\/Paginacion';/);
    expect(VISTA).toMatch(/<Paginacion/);
    expect(VISTA).toMatch(/resumen=\{resumen\}/);
  });

  it('el buscador tiene debounce: no una petición por pulsación', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/setTimeout\(/);
    expect(fuente).toMatch(/clearTimeout\(/);
    expect(fuente).toMatch(/setBuscarAplicado\(buscar\.trim\(\)\)/);
  });

  it('un único efecto carga el listado, sin bucle setState -> useEffect', () => {
    const fuente = codigo(VISTA);
    // El efecto depende del valor debounced, no del input crudo.
    expect(fuente).toMatch(/\}, \[buscarAplicado, estado, paraVenta, unidad, categoria, page, pageSize, refreshToken\]\);/);
  });

  it('cambiar cualquier filtro vuelve a la página 1', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/setBuscarAplicado\(buscar\.trim\(\)\);\s*\n\s*setPage\(1\);/);
    expect(fuente).toMatch(
      /const filtrar = \(campo: 'estado' \| 'paraVenta' \| 'unidad' \| 'categoria'[\s\S]{0,240}?setPage\(1\);/
    );
    expect(fuente).toMatch(/const cambiarPageSize = \(nuevo: number\) => \{\s*\n\s*setPageSize\(nuevo\);\s*\n\s*setPage\(1\);/);
  });

  it('cambiar de página conserva los filtros', () => {
    expect(codigo(VISTA)).toMatch(/const irAPagina = \(nueva: number\) => setPage\(nueva\);/);
  });
});

describe('lo que NO se tocó', () => {
  it('sigue creando, editando, eliminando y cambiando estado', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/\+ Nuevo Producto/);
    expect(fuente).toMatch(/faregasProductosApi\.crear\(actual\)/);
    expect(fuente).toMatch(/faregasProductosApi\.editar\(actual\.id, actual\)/);
    expect(fuente).toMatch(/faregasProductosApi\.cambiarEstado\(/);
    expect(fuente).toMatch(/faregasProductosApi\.eliminar\(/);
  });

  it('sigue exportando el catálogo fiscal mediante el módulo especializado', () => {
    expect(VISTA).toMatch(/exportarProductosFiscales\(resultadoCompleto\)/);
    expect(VISTA).not.toMatch(/exportarExcel\('faregas_productos'/);
  });

  it('conserva el filtro técnico de registros sin tipo de certificado', () => {
    expect(VISTA).toMatch(/<option value="SIN_CATEGORIA">Sin tipo de certificado<\/option>/);
  });

  it('mantiene el aviso de guardado con el enlace a Tarifas', () => {
    expect(VISTA).toMatch(/guardado\./);
    expect(VISTA).toMatch(/Vincular en Tarifas por sede/);
  });
});
