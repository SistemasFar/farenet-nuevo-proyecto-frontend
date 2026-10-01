import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Paginación y buscadores de los TRES listados de esta tarea, en el frontend:
 *
 *   1. CHIPS -> Inventario -> Unidades registradas
 *   2. CONFIGURACIÓN -> Sedes
 *   3. FACTURACIÓN -> Comprobantes
 *
 * Estos tests comprueban lo que sólo se puede ver en la vista: que las tres
 * pantallas REUTILIZAN el componente compartido (y no crean uno nuevo), que
 * cada filtro devuelve a la página 1, que no hay `.slice()` en el cliente y
 * que la fecha de facturación abre en HOY -> HOY.
 */
const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');

const COMPONENTE = leer('components', 'Paginacion.tsx');
const CHIPS = leer('Chips', 'ChipsView.tsx');
const SEDES = leer('Configuracion', 'TabSedes.tsx');
const FACTURACION = leer('Configuracion', 'components', 'TabDocumentosFacturacion.tsx');
const API_CHIPS = leer('..', 'services', 'faregas-chips.api.ts');
const API_CONFIG = leer('..', 'services', 'faregas-config.api.ts');
const API_FACT = leer('..', 'services', 'faregas-facturacion-admin.api.ts');
const API_EXPORT = leer('..', 'utils', 'faregas-sedes-exportacion.ts');

const TRES = [
  ['chips', CHIPS],
  ['sedes', SEDES],
  ['facturación', FACTURACION]
] as const;

/**
 * Quita los comentarios de línea. Las comprobaciones negativas deben mirar el
 * código real: que una regla esté escrita en un comentario no la hace cumplir.
 */
const sinComentarios = (texto: string) => texto.replace(/\/\/[^\n]*/g, '');

// ===========================================================================
// 1. Componente compartido: las tres pantallas lo reutilizan
// ===========================================================================

describe('componente de paginación compartido', () => {
  it('las tres pantallas importan el MISMO componente', () => {
    for (const [nombre, fuente] of TRES) {
      expect(fuente, `${nombre} debe importar Paginacion`).toMatch(
        /import \{ Paginacion \} from '\.\.?\/.*components\/Paginacion'/
      );
    }
  });

  it('ninguna pantalla crea su propio componente de paginación', () => {
    for (const [nombre, fuente] of TRES) {
      expect(fuente, `${nombre} no debe definir otro componente de paginación`).not.toMatch(
        /function (Paginacion|Paginador|ControlesPaginacion)/
      );
    }
  });

  it('las tres pintan el componente bajo la tabla', () => {
    for (const [nombre, fuente] of TRES) {
      expect(fuente, `${nombre} debe renderizar <Paginacion`).toMatch(/<Paginacion/);
    }
  });
});

// ===========================================================================
// 2. CHIPS -> Inventario -> Unidades registradas
// ===========================================================================

describe('CHIPS: inventario de unidades registradas', () => {
  it('pide 10 por página al backend', () => {
    expect(CHIPS).toMatch(/useState\(10\)/);
    expect(CHIPS).toMatch(/page: chipsPagina/);
    expect(CHIPS).toMatch(/pageSize: chipsPageSize/);
  });

  it('el buscador dice que busca por código o tipo', () => {
    expect(CHIPS).toMatch(/Buscar por código o tipo de chip/);
  });

  it('el buscador se llama con el valor escrito', () => {
    expect(CHIPS).toMatch(/aplicarFiltroInventario\('buscar', e\.target\.value\)/);
  });

  it('el filtro Estado se sigue manteniendo y se combina con la búsqueda', () => {
    expect(CHIPS).toMatch(/aplicarFiltroInventario\('estado', e\.target\.value\)/);
    // El backend recibe los dos filtros a la vez.
    expect(CHIPS).toMatch(/buscar,\s*\n\s*estado:/);
  });

  it('cambiar Estado o la búsqueda vuelve a la página 1', () => {
    expect(CHIPS).toMatch(
      /const aplicarFiltroInventario = \(campo: 'buscar' \| 'estado', valor: string\) => \{\s*\n\s*setChipsPagina\(1\);/
    );
  });

  it('las tarjetas de resumen NO se calculan con items.length', () => {
    // Las tarjetas leen del endpoint de resumen, no de la página visible.
    expect(CHIPS).toMatch(/const cards = \[\['Total', resumen\.total\]/);
    expect(CHIPS).toMatch(/faregasChipsApi\.resumen\(/);
    expect(CHIPS).not.toMatch(/cards = \[\['Total', chips\.length\]/);
  });

  it('no pagina con .slice() en el cliente', () => {
    expect(CHIPS).not.toMatch(/chips\.slice\(/);
    expect(CHIPS).not.toMatch(/\.slice\(\(.*- 1\) \* /);
  });

  it('la API del inventario envía page y pageSize', () => {
    expect(API_CHIPS).toMatch(/params\.set\('page', String\(filtros\.page\)\)/);
    expect(API_CHIPS).toMatch(/params\.set\('pageSize', String\(filtros\.pageSize\)\)/);
  });

  it('muestra un mensaje claro cuando no hay resultados', () => {
    expect(CHIPS).toMatch(/No se encontraron registros\./);
  });
});

// ===========================================================================
// 3. CONFIGURACIÓN -> Sedes
// ===========================================================================

describe('CONFIGURACIÓN: administración de sedes', () => {
  it('pide 10 por página al backend', () => {
    expect(SEDES).toMatch(/useState\(10\)/);
    expect(SEDES).toMatch(/obtenerSedes\(\{ buscar: buscarAplicada, page, pageSize \}\)/);
  });

  it('tiene un buscador por nombre de sede', () => {
    expect(SEDES).toMatch(/Buscar por nombre de sede/);
    expect(SEDES).toMatch(/placeholder="Buscar por nombre de sede"/);
  });

  it('la búsqueda se aplica antes de pedir la página', () => {
    // La página se solicita ya con el texto aplicado: el backend filtra y
    // recién después hace el LIMIT/OFFSET.
    expect(SEDES).toMatch(/buscar: buscarAplicada/);
  });

  it('la búsqueda tiene debounce para no lanzar una request por pulsación', () => {
    expect(SEDES).toMatch(/setTimeout\(\(\) => \{\s*\n\s*setBuscarAplicada\(buscar\.trim\(\)\);\s*\n\s*setPage\(1\);/);
    expect(SEDES).toMatch(/clearTimeout\(temporizador\)/);
  });

  it('cambiar la búsqueda vuelve a la página 1', () => {
    expect(SEDES).toMatch(/setBuscarAplicada\(buscar\.trim\(\)\);\s*\n\s*setPage\(1\);/);
  });

  it('cambiar de página o de tamaño NO reinicia la búsqueda', () => {
    expect(SEDES).toMatch(/const irAPagina = \(nueva: number\) => \{\s*\n\s*setPage\(nueva\);/);
    expect(SEDES).toMatch(/const cambiarPageSize = \(nuevo: number\) => \{\s*\n\s*setPageSize\(nuevo\);\s*\n\s*setPage\(1\);/);
  });

  it('carga una sola vez al entrar (un único efecto con sus dependencias)', () => {
    const efectos = SEDES.match(/useEffect\(/g) || [];
    // 2 efectos: el debounce y la carga. No hay un third efecto de carga inicial.
    expect(efectos.length).toBe(2);
    expect(SEDES).toMatch(/\}, \[buscarAplicada, page, pageSize, refreshToken\]\);/);
  });

  it('no pagina con .slice() en el cliente', () => {
    expect(SEDES).not.toMatch(/sedes\.slice\(/);
  });

  it('mantiene intactos Nueva Sede, Editar, activar/desactivar y Exportar Excel', () => {
    expect(SEDES).toMatch(/\+ Nueva Sede/);
    expect(SEDES).toMatch(/setModalMode\('EDIT'\)/);
    expect(SEDES).toMatch(/handleToggleActivo/);
    expect(SEDES).toMatch(/↓ Exportar Excel/);
  });

  it('exporta TODO el resultado del filtro, no la página visible', () => {
    // El estado `sedes` sólo contiene la página actual, así que la
    // exportación vuelve a consultar el filtro completo con `todos=1`.
    expect(SEDES).toMatch(/obtenerSedesTodos\(/);
    expect(SEDES).toMatch(/buscar: buscarAplicada \|\| undefined/);
    expect(SEDES).toMatch(/exportarSedesCatalogo\(/);
    // El módulo de exportación conserva el archivo y la hoja de siempre.
    expect(API_EXPORT).toMatch(/exportarExcel\('faregas_sedes', 'Sedes'/);
    // Y no se escribe directamente sobre el estado paginado.
    expect(SEDES).not.toMatch(/\], sedes\.map\(/);
  });

  it('la API de sedes devuelve la página y el total', () => {
    expect(API_CONFIG).toMatch(/params\.set\('buscar', filtros\.buscar\.trim\(\)\)/);
    expect(API_CONFIG).toMatch(/params\.set\('pageSize', String\(filtros\.pageSize\)\)/);
  });

  it('muestra un mensaje claro cuando no hay resultados', () => {
    expect(SEDES).toMatch(/No se encontraron registros\./);
  });
});

// ===========================================================================
// 4. FACTURACIÓN -> Comprobantes
// ===========================================================================

describe('FACTURACIÓN: comprobantes', () => {
  it('pide 10 por página al backend', () => {
    expect(FACTURACION).toMatch(/useState<FiltrosFacturacionAdmin>\(\{ pagina: 1, limite: 10/);
    expect(FACTURACION).not.toMatch(/limite: 50/);
  });

  it('el buscador conserva los cuatro criterios', () => {
    expect(FACTURACION).toMatch(/placeholder="Comprobante, cliente, DNI\/RUC o placa"/);
  });

  it('la fecha se declara como LOCAL, sin pasar por UTC', () => {
    expect(FACTURACION).toMatch(/getFullYear\(\)/);
    expect(FACTURACION).toMatch(/getMonth\(\) \+ 1/);
    expect(FACTURACION).toMatch(/getDate\(\)/);
    // toISOString() devuelve UTC y puede adelantar o atrasar el día.
    expect(sinComentarios(FACTURACION)).not.toMatch(/toISOString\(\)/);
  });

  it('abre en HOY -> HOY y vuelve a HOY -> HOY al limpiar', () => {
    expect(FACTURACION).toMatch(
      /useState<FiltrosFacturacionAdmin>\(\{ pagina: 1, limite: 10, fechaDesde: hoyLocal\(\), fechaHasta: hoyLocal\(\) \}\)/
    );
    // LIMPIAR no puede dejar el rango vacío: vacío significaría "todo".
    expect(FACTURACION).toMatch(
      /const vacios: FiltrosFacturacionAdmin = \{ pagina: 1, limite: filtros\.limite \?\? 10, fechaDesde: hoyLocal\(\), fechaHasta: hoyLocal\(\) \}/
    );
  });

  it('la carga inicial también pide HOY -> HOY', () => {
    expect(FACTURACION).toMatch(
      /listar\(\{ pagina: 1, limite: 10, fechaDesde: hoy, fechaHasta: hoy \}\)/
    );
  });

  it('BUSCAR combina todos los filtros y vuelve a la página 1', () => {
    expect(FACTURACION).toMatch(/const siguientes = \{ \.\.\.filtros, pagina: 1 \};/);
  });

  it('cada filtro individual se combina con los demás en la misma consulta', () => {
    // Texto, empresa, sede, estado, desde y hasta viajan en el mismo objeto.
    for (const campo of ['texto', 'empresaKey', 'plantaKey', 'estado', 'fechaDesde', 'fechaHasta']) {
      expect(FACTURACION, `falta el filtro ${campo}`).toMatch(new RegExp(`${campo}: e\\.target\\.value`));
    }
  });

  it('cambiar de página conserva los filtros y no reinicia a la 1', () => {
    expect(FACTURACION).toMatch(
      /onCambioPagina=\{\(pagina\) => \{\s*\n\s*const next = \{ \.\.\.filtros, pagina \};/
    );
  });

  it('cambiar el tamaño de página vuelve a la 1', () => {
    expect(FACTURACION).toMatch(
      /onCambioPageSize=\{\(limite\) => \{[\s\S]{0,120}?pagina: 1 \}/
    );
  });

  it('el total y las páginas vienen del backend, no se recalculan aquí', () => {
    expect(FACTURACION).toMatch(/total: Number\(response\.data\.total \|\| 0\)/);
    expect(FACTURACION).toMatch(/totalPages: Number\(/);
    // Se quitó el `Math.ceil(total / limite)` local que discrepaba del COUNT.
    expect(FACTURACION).not.toMatch(/const totalPaginas = /);
  });

  it('no pagina con .slice() en el cliente', () => {
    expect(FACTURACION).not.toMatch(/documentos\.slice\(/);
  });

  it('el tipo de la respuesta declara el sobre de paginación', () => {
    expect(API_FACT).toMatch(/totalPages: number;/);
    expect(API_FACT).toMatch(/pagina: number;/);
    expect(API_FACT).toMatch(/limite: number;/);
  });

  it('muestra un mensaje claro cuando no hay resultados', () => {
    expect(FACTURACION).toMatch(/No se encontraron comprobantes\./);
  });
});

// ===========================================================================
// 5. Reglas transversales
// ===========================================================================

describe('el componente compartido cumple el contrato que las tres pantallas esperan', () => {
  it('muestra el rango y el total', () => {
    expect(COMPONENTE).toMatch(/Mostrando/);
    expect(COMPONENTE).toMatch(/\{desde\}<\/b> a <b className="text-slate-800">\{hasta\}<\/b> de/);
    expect(COMPONENTE).toMatch(/Página \{totalPages === 0 \? 0 : page\} de \{totalPages\}/);
  });

  it('deshabilita ANTERIOR en la página 1 y SIGUIENTE en la última', () => {
    expect(COMPONENTE).toMatch(/const hayAnterior = page > 1;/);
    expect(COMPONENTE).toMatch(/const haySiguiente = totalPages > 0 && page < totalPages;/);
  });

  it('admite una etiqueta por pantalla', () => {
    // Las tres pantallas pasan la suya para que el texto se lea en contexto.
    for (const [nombre, fuente] of TRES) {
      expect(fuente, `${nombre} debe etiquetar su paginación`).toMatch(/etiqueta="/);
    }
  });

  it('no decide el total por su cuenta: lo toma del sobre', () => {
    // Si el componente recalculara el total desde items, dejaría de cuadrar
    // con el COUNT del backend en cuanto haya más de una página.
    expect(COMPONENTE).toMatch(/const total = Math\.max\(0, Number\(resumen\?\.total \|\| 0\)\);/);
    expect(COMPONENTE).not.toMatch(/items\.length/);
  });
});

describe('reglas transversales de los tres listados', () => {
  it('ninguno recalcula el total con la longitud de la página', () => {
    for (const [nombre, fuente] of TRES) {
      expect(fuente, `${nombre} no debe usar items.length como total`).not.toMatch(
        /total: \w+\.items\.length|total: \w+\.length/
      );
    }
  });

  it('ninguno confunde el total del backend con el de la página', () => {
    for (const [nombre, fuente] of TRES) {
      // El total llega del sobre del backend, ya sea como número ya tipado o
      // convertido con Number(). Lo que no vale es derivarlo de la página.
      expect(fuente, `${nombre} debe leer el total del sobre`).toMatch(
        /total: (Number\(|data\.total|response\.data\.total)/
      );
    }
  });
});
