import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * PASO 1 "1. Selecciona el Servicio": los chips de categoría pasan a un select.
 *
 * Motivo purely visual: los botones horizontales (TODOS / GLP / GNV /
 * Conformidad / Complementarios) ocupaban una fila entera y, con las tarjetas
 * de servicios justo debajo, la cabecera se veía demasiado cargada.
 *
 * Lo que NO cambia y estos tests fijan:
 *  - el filtro sigue siendo UNO y exclusivo, el mismo estado `categoriaActiva`;
 *  - el buscador y el tipo se combinan (no se pisan entre sí);
 *  - las opciones salen de `catalogo.categorias`, sin lista hardcodeada;
 *  - el valor por defecto sigue siendo TODOS;
 *  - las tarjetas de servicios no se tocan.
 */

const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');

const CAJA = leer(
  'components', 'NuevoCertificado', 'CajaStep.tsx'
);

/** Código sin comentarios: para afirmar que algo NO está. */
const codigo = (t: string) => t
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '')
  .replace(/^\s*\*.*$/gm, '');
const CAJA_CODIGO = codigo(CAJA);

// --- Réplica del filtro real del componente, para poder probarlo sin React ---
type Servicio = { id: number; nombre: string; codigo: string };
type Categoria = { codigo: string; nombre: string; servicios: Servicio[] };
type Catalogo = { categorias: Categoria[] };

const normalizarBusqueda = (valor: string) => valor
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es-PE')
  .trim();

const contieneBusqueda = (servicio: Servicio, categoria: Categoria, busqueda: string) => {
  const termino = normalizarBusqueda(busqueda);
  if (!termino) return true;
  return normalizarBusqueda(`${servicio.nombre} ${servicio.codigo} ${categoria.nombre}`).includes(termino);
};

/** Copia exacta del useMemo de CajaStep, con los mismos dos filtros. */
const filtrar = (catalogo: Catalogo | null, busqueda: string, categoriaActiva: string) =>
  catalogo?.categorias.flatMap((categoria) =>
    categoria.servicios
      .filter(() => categoriaActiva === 'TODOS' || categoria.codigo === categoriaActiva)
      .filter((servicio) => contieneBusqueda(servicio, categoria, busqueda))
      .map((servicio) => ({ servicio, categoria }))) ?? [];

const CATALOGO: Catalogo = {
  categorias: [
    {
      codigo: 'GLP', nombre: 'GLP',
      servicios: [
        { id: 1, nombre: 'CERTIFICADO ANUAL GLP - MOTO TAXI', codigo: 'GLP-ANUAL' },
        { id: 2, nombre: 'CERTIFICADO INICIAL GLP', codigo: 'GLP-INICIAL' }
      ]
    },
    {
      codigo: 'GNV', nombre: 'GNV',
      servicios: [
        { id: 3, nombre: 'CERTIFICADO ANUAL GNV', codigo: 'GNV-ANUAL' },
        { id: 4, nombre: 'CAMBIO DE GNV LIGERO', codigo: 'GNV-CAMBIO' }
      ]
    },
    {
      codigo: 'CONFORMIDAD', nombre: 'Conformidad',
      servicios: [{ id: 5, nombre: 'CERTIFICADO DE CONFORMIDAD DE CAMBIO DE MOTOR', codigo: 'CONF-0390' }]
    },
    {
      codigo: 'COMPLEMENTARIOS', nombre: 'Complementarios',
      servicios: [{ id: 6, nombre: 'INSPECCION TALLER', codigo: 'COMP-01' }]
    }
  ]
};

const codigos = (catalogo: Catalogo, busqueda: string, categoria: string) =>
  filtrar(catalogo, busqueda, categoria).map((item) => item.servicio.codigo);

describe('el selector de tipo de certificado', () => {
  it('1. por defecto es TODOS y muestra todos los servicios', () => {
    expect(codigos(CATALOGO, '', 'TODOS'))
      .toEqual(['GLP-ANUAL', 'GLP-INICIAL', 'GNV-ANUAL', 'GNV-CAMBIO', 'CONF-0390', 'COMP-01']);
    expect(CAJA).toMatch(/useState\('TODOS'\)/);
  });

  it('2. seleccionar GNV deja sólo GNV', () => {
    expect(codigos(CATALOGO, '', 'GNV')).toEqual(['GNV-ANUAL', 'GNV-CAMBIO']);
  });

  it('3. seleccionar GLP deja sólo GLP', () => {
    expect(codigos(CATALOGO, '', 'GLP')).toEqual(['GLP-ANUAL', 'GLP-INICIAL']);
  });

  it('4. seleccionar CONFORMIDAD deja sólo esa categoría', () => {
    expect(codigos(CATALOGO, '', 'CONFORMIDAD')).toEqual(['CONF-0390']);
  });

  it('5. seleccionar COMPLEMENTARIOS deja sólo esa categoría', () => {
    expect(codigos(CATALOGO, '', 'COMPLEMENTARIOS')).toEqual(['COMP-01']);
  });

  it('6. buscador + tipo se combinan: ninguno anula al otro', () => {
    expect(codigos(CATALOGO, 'ANUAL', 'GNV')).toEqual(['GNV-ANUAL']);
    // Con un término que sólo existe en otra categoría, la combinación no da nada.
    expect(codigos(CATALOGO, 'TAXI', 'GNV')).toEqual([]);
    // Y el buscador solo sigue funcionando como antes.
    expect(codigos(CATALOGO, 'TAXI', 'TODOS')).toEqual(['GLP-ANUAL']);
  });

  it('7. volver a Todos restituye el listado completo', () => {
    const antes = codigos(CATALOGO, '', 'GNV');
    expect(antes).toHaveLength(2);
    expect(codigos(CATALOGO, '', 'TODOS')).toHaveLength(6);
  });
});

describe('el componente renderiza un select y no chips', () => {
  it('8. los chips horizontales ya no se renderizan', () => {
    expect(CAJA_CODIGO).not.toMatch(/Categorías de servicio/);
    expect(CAJA_CODIGO).not.toMatch(/rounded-full/);
    expect(CAJA_CODIGO).not.toMatch(/setCategoriaActiva\('TODOS'\)/);
  });

  it('el select está etiquetado y su valor por defecto es Todos', () => {
    expect(CAJA_CODIGO).toMatch(/<select/);
    expect(CAJA_CODIGO).toMatch(/aria-label="Tipo de certificado"/);
    expect(CAJA_CODIGO).toMatch(/<label htmlFor="tipo-certificado" className="sr-only">Tipo de certificado<\/label>/);
    expect(CAJA_CODIGO).toMatch(/<option value="TODOS">Todos<\/option>/);
    // Un solo valor: es un select, no un multiselección.
    expect(CAJA_CODIGO).toMatch(/<select[^>]*\sid="tipo-certificado"/);
    expect(CAJA_CODIGO).not.toMatch(/multiple/);
  });

  it('el select reusa el MISMO estado y el MISMO setter del filtro', () => {
    expect(CAJA_CODIGO).toMatch(/const \[categoriaActiva, setCategoriaActiva\] = useState\('TODOS'\)/);
    expect(CAJA_CODIGO).toMatch(/value=\{categoriaActiva\}/);
    expect(CAJA_CODIGO).toMatch(/onChange=\{\(event\) => setCategoriaActiva\(event\.target\.value\)\}/);
    // Y el filtro sigue siendo el mismo, sin segunda implementación.
    expect(CAJA_CODIGO).toMatch(/categoriaActiva === 'TODOS' \|\| categoria\.codigo === categoriaActiva/);
  });

  it('las opciones salen del catálogo, no de una lista fija', () => {
    expect(CAJA_CODIGO).toMatch(/catalogo\.categorias\.map\(\(categoria\) => \(/);
    expect(CAJA_CODIGO).toMatch(/<option key=\{categoria\.codigo\} value=\{categoria\.codigo\}>\{categoria\.nombre\}<\/option>/);
    for (const codigo of ['GLP', 'GNV', 'CONFORMIDAD', 'COMPLEMENTARIOS']) {
      expect(CAJA_CODIGO).not.toMatch(new RegExp(`'${codigo}'`),
        `${codigo} no debe estar escrito a mano en el componente`);
    }
  });
});

describe('el buscador se conserva', () => {
  it('sigue siendo un input de búsqueda con su placeholder', () => {
    expect(CAJA).toMatch(/placeholder="Buscar servicio\.\.\."/);
    expect(CAJA).toMatch(/aria-label="Buscar servicio"/);
    expect(CAJA_CODIGO).toMatch(/value=\{busqueda\}/);
    expect(CAJA_CODIGO).toMatch(/onChange=\{\(event\) => setBusqueda\(event\.target\.value\)\}/);
  });

  it('comparte fila con el select en escritorio y se apila en móvil', () => {
    expect(CAJA_CODIGO).toMatch(/flex flex-col gap-3 sm:flex-row sm:items-center/);
    // El buscador manda en el ancho; el select tiene ancho fijo en escritorio.
    expect(CAJA_CODIGO).toMatch(/<div className="relative flex-1">/);
    expect(CAJA_CODIGO).toMatch(/sm:w-60 sm:shrink-0/);
    // Altura igual en ambos para que queden alineados.
    expect(CAJA_CODIGO).toMatch(/<select[\s\S]{0,400}?h-10/);
  });
});

describe('las tarjetas y el empty state no cambian', () => {
  it('sigue el mismo empty state cuando buscar + tipo no encuentran nada', () => {
    expect(CAJA)
      .toMatch(/No se encontraron servicios con los filtros seleccionados\./);
    expect(CAJA_CODIGO).toMatch(/servicios\.length === 0/);
  });

  it('las tarjetas conservan categoría, código, precio y selección', () => {
    expect(CAJA_CODIGO).toMatch(/onClick=\{\(\) => seleccionarServicio\(servicio\)\}/);
    expect(CAJA_CODIGO).toMatch(/aria-pressed=\{seleccionado\}/);
    expect(CAJA_CODIGO).toMatch(/\{categoria\.nombre\}/);
    expect(CAJA_CODIGO).toMatch(/\{servicio\.codigo\}/);
    expect(CAJA_CODIGO).toMatch(/servicio\.tarifa\.importeTotal\.toFixed\(2\)/);
    expect(CAJA_CODIGO).toMatch(/Incluye chip/);
    expect(CAJA_CODIGO).toMatch(/hover:-translate-y-0\.5/);
  });

  it('la lógica de servicios no se tocó', () => {
    expect(CAJA_CODIGO).toMatch(/const seleccionarServicio = \(servicio: ServicioCatalogoFaregas\)/);
    expect(CAJA_CODIGO).toMatch(/tipoCertificado: servicio\.tipo_certificado_clave/);
    expect(CAJA_CODIGO).toMatch(/modalidadCertificado: servicio\.modalidad \?\? ''/);
    expect(CAJA_CODIGO).toMatch(/faregasTarifasApi\.obtenerCatalogo\(\)/);
  });
});