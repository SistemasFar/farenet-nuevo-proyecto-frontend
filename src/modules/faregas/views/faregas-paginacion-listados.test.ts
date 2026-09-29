import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Estandarización de paginación y filtros de fecha en FAREGAS.
 *
 * El componente `Paginacion` es la pieza compartida: no lleva lógica de
 * negocio, sólo presenta el sobre del backend y avisa del cambio de página.
 * El hook `useListadoPaginado` es quien garantiza las reglas funcionales
 * (HOY -> HOY, reset a página 1, validar rango).
 */
const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');

const COMPONENTE = leer('components', 'Paginacion.tsx');
const HOOK = leer('hooks', 'useListadoPaginado.ts');
const VENTAS = leer('Chips', 'ChipsView.tsx');
const AUDITORIA = leer('Auditoria', 'AuditoriaView.tsx');
const API_AUDITORIA = leer('..', 'services', 'faregas-auditoria.api.ts');
const API_CHIPS = leer('..', 'services', 'faregas-chips.api.ts');

// ===========================================================================
// 1. El componente compartido
// ===========================================================================

describe('componente de paginación', () => {
  it('muestra "Mostrando X a Y de Z"', () => {
    expect(COMPONENTE).toMatch(/Mostrando/);
    expect(COMPONENTE).toMatch(/\{desde\}<\/b> a <b className="text-slate-800">\{hasta\}<\/b> de/);
    expect(COMPONENTE).toMatch(/\{total\}<\/b> \{etiqueta\}/);
  });

  it('muestra "Página X de Y"', () => {
    expect(COMPONENTE).toMatch(/Página \{totalPages === 0 \? 0 : page\} de \{totalPages\}/);
  });

  it('tiene ANTERIOR y SIGUIENTE', () => {
    expect(COMPONENTE).toMatch(/ANTERIOR/);
    expect(COMPONENTE).toMatch(/SIGUIENTE/);
  });

  it('ANTERIOR queda deshabilitado en la página 1', () => {
    expect(COMPONENTE).toMatch(/const hayAnterior = page > 1;/);
    expect(COMPONENTE).toMatch(/disabled=\{!hayAnterior \|\| deshabilitado\}/);
  });

  it('SIGUIENTE queda deshabilitado en la última página', () => {
    expect(COMPONENTE).toMatch(/const haySiguiente = totalPages > 0 && page < totalPages;/);
  });

  it('con cero registros muestra 0 y no rompe el rango', () => {
    expect(COMPONENTE).toMatch(/const desde = total === 0 \? 0 : \(page - 1\) \* limit \+ 1;/);
    expect(COMPONENTE).toMatch(/const hasta = total === 0 \? 0 : Math\.min\(page \* limit, total\);/);
  });

  it('la última página calcula bien el fin (p.ej. 81 a 84 de 84)', () => {
    // Math.min(page * limit, total) es lo que hace que 9 de 10 no se pase.
    expect(COMPONENTE).toMatch(/Math\.min\(page \* limit, total\)/);
  });

  it('ofrece el selector de 10 / 20 / 50 con 10 por defecto', () => {
    expect(COMPONENTE).toMatch(/OPCIONES_POR_DEFECTO = \[10, 20, 50\]/);
  });

  it('no lleva lógica de negocio ni llamadas al backend', () => {
    expect(COMPONENTE).not.toMatch(/fetch|axios|faregasFetch|useEffect/);
  });
});

// ===========================================================================
// 2. El hook: reglas funcionales
// ===========================================================================

describe('hook de listado paginado', () => {
  /** Recorta un solo callback del hook: desde `marca` hasta la siguiente declaración. */
  const bloque = (marca: string) => {
    const ini = HOOK.indexOf(marca);
    expect(ini).toBeGreaterThan(-1);
    const fin = HOOK.indexOf('\n\n', ini);
    return HOOK.slice(ini, fin === -1 ? undefined : fin);
  };

  it('arranca en la página 1 con 10 por página', () => {
    expect(HOOK).toMatch(/const \[page, setPage\] = useState\(1\);/);
    expect(HOOK).toMatch(/pageSizePorDefecto = 10/);
  });

  it('un listado transaccional abre en HOY -> HOY', () => {
    expect(HOOK).toMatch(/\.\.\.\(transaccional \? \{ fechaDesde: hoy, fechaHasta: hoy \} : \{\}\)/);
  });

  it('"limpiar" restaura HOY -> HOY, nunca vacío', () => {
    expect(HOOK).toMatch(/const limpiarFiltros = useCallback\(\(\) => \{/);
    // Los valores por defecto viven en `iniciales`, que es la única fuente.
    expect(HOOK).toMatch(/const iniciales = \{\s*\.\.\.filtrosIniciales,\s*\.\.\.\(transaccional \? \{ fechaDesde: hoy, fechaHasta: hoy \} : \{\}\)\s*\};/);
    // "Limpiar" devuelve el formulario y lo aplicado a ese mismo valor por
    // defecto, de modo que el backend vuelve a traer HOY -> HOY.
    const b = bloque('const limpiarFiltros = useCallback');
    expect(b).toMatch(/const base = \{ \.\.\.iniciales \};/);
    expect(b).toMatch(/setFiltros\(base\);/);
    expect(b).toMatch(/setAplicados\(base\);/);
    expect(b).toMatch(/setPage\(1\);/);
  });

  it('editar un campo NO dispara la consulta: eso es "Buscar"', () => {
    const b = bloque('const setFiltro = useCallback');
    expect(b).toMatch(/setFiltros\(\(prev\) => \(\{ \.\.\.prev, \[campo\]: valor \}\)\);/);
    // Ni setPage(1) ni consulta: escribir una fecha no recarga la tabla.
    expect(b).not.toMatch(/setPage\(1\)/);
    expect(b).not.toMatch(/setAplicados/);
  });

  it('"Buscar" manda los filtros al backend y vuelve a la página 1', () => {
    const b = bloque('const aplicarFiltros = useCallback');
    expect(b).toMatch(/setFiltros\(base\);/);
    expect(b).toMatch(/setAplicados\(base\);/);
    expect(b).toMatch(/setPage\(1\);/);
  });

  it('cambiar el tamaño de página también vuelve a la 1', () => {
    expect(HOOK).toMatch(/const cambiarPageSize = useCallback\(\(nuevo: number\) => \{\s*setPageSize\(nuevo\);\s*setPage\(1\);/);
  });

  it('un rango invertido no consulta y avisa, sin intercambiar fechas', () => {
    expect(HOOK).toMatch(/La fecha Desde no puede ser posterior a la fecha Hasta\./);
    const bloque = HOOK.slice(HOOK.indexOf('const refrescar = useCallback'));
    const guarda = bloque.slice(0, bloque.indexOf('setRangoError(\'\')'));
    expect(guarda).toMatch(/if \(desde && hasta && desde > hasta\)/);
    // No hay llamada al backend antes del return.
    expect(guarda).toMatch(/return;/);
  });

  it('los filtros y la paginación viajan juntos al backend', () => {
    expect(HOOK).toMatch(/cargarRef\.current\(\{\s*page: pagina,\s*pageSize: tamanho,\s*\.\.\.actuales\s*\}\)/);
  });

  it('evita el bucle render -> request -> render', () => {
    // El callback de carga se guarda en una ref: cambiar de función no
    // dispara peticiones nuevas.
    expect(HOOK).toMatch(/cargarRef = useRef\(cargar\);/);
    expect(HOOK).toMatch(/cargarRef\.current = cargar;/);
    // Y `refrescar` sigue siendo estable (dependencias vacías).
    expect(HOOK).toMatch(/const refrescar = useCallback\(async \(pagina: number, tamanho: number\) => \{[\s\S]*?\}, \[\]\);/);
  });

  it('el efecto recarga al cambiar los filtros APLICADOS, no al escribirlos', () => {
    // Éste era el bug de BUSCAR/LIMPIAR: el efecto sólo miraba page/pageSize,
    // así que sobre la página 1 (donde setPage(1) no produce cambio) los botones
    // no llegaban a consultar nada.
    expect(HOOK).toMatch(/\}, \[page, pageSize, aplicados, refrescar\]\);/);
    // Y la consulta lee los aplicados, no el borrador del formulario.
    expect(HOOK).toMatch(/const actuales = aplicadosRef\.current;/);
    expect(HOOK).toMatch(/aplicadosRef = useRef\(aplicados\);/);
  });

  it('acepta un backend que todavía devuelve un arreglo plano', () => {
    expect(HOOK).toMatch(/if \(Array\.isArray\(respuesta\)\)/);
  });
});

// ===========================================================================
// 3. Ventas de chips
// ===========================================================================

describe('ventas de chips', () => {
  it('usa el hook y el componente compartidos', () => {
    expect(VENTAS).toMatch(/useListadoPaginado<VentaChipOperacion>\(\{/);
    expect(VENTAS).toMatch(/<Paginacion/);
  });

  it('es transaccional: abre en HOY -> HOY', () => {
    expect(VENTAS).toMatch(/transaccional: true/);
  });

  it('envía page y pageSize al backend', () => {
    expect(VENTAS).toMatch(/page: Number\(params\.page \|\| 1\)/);
    expect(VENTAS).toMatch(/pageSize: Number\(params\.pageSize \|\| 10\)/);
  });

  it('el total viene del backend, no de ventas.length', () => {
    expect(VENTAS).toMatch(/total: Number\(response\.total \|\| 0\)/);
    expect(VENTAS).toMatch(/totalPages: Number\(response\.totalPages \|\| 0\)/);
  });

  it('el botón BUSCAR aplica los filtros y vuelve a la página 1', () => {
    expect(VENTAS).toMatch(/onClick=\{\(\) => listado\.aplicarFiltros\(\)\}/);
  });

  it('"LIMPIAR" restaura HOY -> HOY', () => {
    expect(VENTAS).toMatch(/onClick=\{listado\.limpiarFiltros\}/);
  });

  it('muestra el error de rango invertido', () => {
    expect(VENTAS).toMatch(/listado\.rangoError/);
  });

  it('mantiene detalle, ver comprobante y la fila hacia el detalle', () => {
    expect(VENTAS).toMatch(/onClick=\{\(\) => onSelectVenta\(venta\.operacionId\)\}/);
    expect(VENTAS).toMatch(/VER COMPROBANTE/);
  });

  it('la API pide page y pageSize y devuelve el sobre', () => {
    expect(API_CHIPS).toMatch(/params\.set\('page', String\(filtros\.page\)\);/);
    expect(API_CHIPS).toMatch(/params\.set\('pageSize', String\(filtros\.pageSize\)\);/);
    expect(API_CHIPS).toMatch(/totalPages: number;/);
  });
});

// ===========================================================================
// 4. Auditoría
// ===========================================================================

describe('auditoría', () => {
  it('abre en HOY -> HOY', () => {
    expect(AUDITORIA).toMatch(/useState\(hoyLocal\(\)\)/);
  });

  it('valida el rango antes de consultar', () => {
    expect(AUDITORIA).toMatch(/La fecha Desde no puede ser posterior a la fecha Hasta\./);
  });

  it('"Limpiar" restaura HOY -> HOY, no vacío', () => {
    expect(AUDITORIA).toMatch(/setFechaInicio\(hoyLocal\(\)\);/);
    expect(AUDITORIA).toMatch(/setFechaFin\(hoyLocal\(\)\);/);
  });

  it('el filtro BUSCAR vuelve a la página 1', () => {
    expect(AUDITORIA).toMatch(/const aplicarFiltros = \(\) => \{\s*setPage\(1\);/);
    expect(AUDITORIA).toMatch(/onClick=\{aplicarFiltros\}/);
  });

  it('la navegación de página consulta esa página concreta', () => {
    expect(AUDITORIA).toMatch(/const irAPagina = \(nueva: number\) => \{\s*setPage\(nueva\);/);
    expect(AUDITORIA).toMatch(/page: paginaActual/);
  });

  it('muestra el componente de paginación', () => {
    expect(AUDITORIA).toMatch(/<Paginacion/);
    expect(AUDITORIA).toMatch(/etiqueta="eventos"/);
  });

  it('el encabezado usa el total del backend', () => {
    expect(AUDITORIA).toMatch(/\{resumen\.total\} registros encontrados/);
  });

  it('la API devuelve el sobre de paginación', () => {
    expect(API_AUDITORIA).toMatch(/export interface AuditoriaAccesoPaginado/);
    expect(API_AUDITORIA).toMatch(/params\.append\('page', String\(filtros\.page\)\);/);
    expect(API_AUDITORIA).toMatch(/params\.append\('pageSize', String\(filtros\.pageSize\)\);/);
  });
});

// ===========================================================================
// 5. Protección de catálogos maestros
// ===========================================================================

describe('los catálogos maestros no se filtran por fecha', () => {
  it('el hook sólo aplica fechas a los listados marcados transaccional', () => {
    // La fecha se inyecta únicamente si `transaccional` es true.
    expect(HOOK).toMatch(/transaccional \? \{ fechaDesde: hoy, fechaHasta: hoy \} : \{\}/);
    // Aparece UNA sola vez: en `iniciales`. Antes estaba duplicado (en el
    // useState y en limpiarFiltros), y esa duplicación era justamente la que
    // hacía que el botón LIMPIAR dependiera de un setPage(1) inoperante.
    expect(HOOK.match(/transaccional \? \{ fechaDesde/g)).toHaveLength(1);
    expect(HOOK).toMatch(/const iniciales = \{/);
  });

  it('el componente de paginación no manda fechas al backend', () => {
    expect(COMPONENTE).not.toMatch(/fechaDesde|fechaHasta|hoyLocal/);
  });
});
