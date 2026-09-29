import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * PANTALLA "Operación y formatos" (Catálogo → Operación y formatos).
 *
 * Esta pantalla recorre cada categoría operativa y muestra sus productos, sus
 * operaciones, si generan certificado, su formato y sus sedes.
 *
 * El defecto que estos tests fijan: la vista pedía los productos con `listar()`,
 * que devuelve una PÁGINA de 10 del catálogo (271 en total). Una categoría cuyo
 * producto no cayera en esa página aparecía con "0 producto(s)"; y como el botón
 * "+ Configurar operación" sólo se pinta cuando hay un producto pendiente
 * (`productoPendiente`), la operación quedaba sin forma de crearse desde aquí.
 *
 * Estos tests no necesitan base de datos: falla en cuanto la vista vuelve al
 * listado paginado.
 */
const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');

const VISTA = leer('Configuracion', 'components', 'TabCertificadosBase.tsx');
const WRAPPER = leer('Configuracion', 'components', 'TabOperacionesWrapper.tsx');
const CATALOGO = leer('Configuracion', 'components', 'TabCatalogo.tsx');
const API = leer('..', 'services', 'faregas-productos.api.ts');

const codigo = (t: string) =>
  t.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('qué componente es la pantalla "Operación y formatos"', () => {
  it('el tab OPERACIONES renderiza TabCertificadosBase', () => {
    expect(CATALOGO).toMatch(/label: 'OPERACIÓN Y FORMATOS'/);
    expect(CATALOGO).toMatch(/activeTab === 'OPERACIONES'/);
    expect(CATALOGO).toMatch(/<TabOperacionesWrapper/);
  });

  it('el wrapper delega en TabCertificadosBase', () => {
    expect(WRAPPER).toMatch(/import TabCertificadosBase from '\.\/TabCertificadosBase'/);
    expect(WRAPPER).toMatch(/<TabCertificadosBase/);
  });
});

describe('el bug: la vista pedía una página del catálogo', () => {
  it('pide los productos POR CATEGORÍA, no el listado paginado', () => {
    expect(codigo(VISTA)).toMatch(/faregasProductosApi\.listarPorCategoria\(\)/);
    // Volver a `listar()` es exactamente el defecto: se perderían los productos
    // que no caen en la primera página de 10.
    expect(codigo(VISTA)).not.toMatch(/faregasProductosApi\.listar\(\)/);
  });

  it('guarda el arreglo de productos, no el sobre de paginación', () => {
    expect(codigo(VISTA)).toMatch(/setProductos\(productosData\.productos\)/);
  });

  it('el botón de configurar operación depende del producto, y el producto ya llega', () => {
    // Si `productosCategoria` viene vacía, `productoPendiente` es undefined y el
    // botón no se pinta: la operación se vuelve inc configurable desde la vista.
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/const productoPendiente = productosCategoria\.find/);
    expect(fuente).toMatch(/productoPendiente && <button/);
    expect(fuente).toMatch(/Configurar \{productoPendiente\.codigo_sku\}/);
  });

  it('cada producto de la categoría puede configurar su operación', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/servicioVinculado \? 'Configurar operación' : '\+ Configurar operación'/);
    // Y al pulsarlo, el servicio existente se edita en vez de duplicarse.
    expect(fuente).toMatch(/mode: 'EDIT', categoria, servicio: servicioVinculado/);
  });
});

describe('lo que la pantalla calcula por categoría', () => {
  it('cuenta productos, operaciones ygeneradores de certificado', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/const productosCategoria = productosDe\(categoria\.id\)/);
    expect(fuente).toMatch(/const serviciosCategoria = serviciosDe\(categoria\.id\)/);
    expect(fuente).toMatch(/const certificaciones = serviciosCategoria\.filter\(\(servicio\) => servicio\.requiere_certificado\)/);
    expect(fuente).toMatch(/\{productosCategoria\.length\} producto\(s\)/);
    expect(fuente).toMatch(/\{serviciosCategoria\.length\} operación\(es\)/);
    expect(fuente).toMatch(/\{certificaciones\.length\} genera\(n\) certificado/);
  });

  it('muestra el nombre real del formato cuando la operación lo tiene', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/const nombreFormato = \(servicio: ServicioConfiguracionFaregas\)/);
    expect(fuente).toMatch(/if \(servicio\.formato_id && servicio\.formato_nombre\)/);
    expect(fuente).toMatch(/Formato: \{nombreFormato\(servicio\)\}/);
  });

  it('muestra las sedes de la operación y avisa cuando no hay', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/sedesCategoria\.length \? sedesCategoria\.map\(\(sede\) => sede\.nombre\)\.join\('\, '\) : 'Sin sedes asignadas'/);
    expect(fuente).toMatch(/sedesServicio\.length \? sedesServicio\.map\(\(sede\) => sede\.nombre\)\.join\('\, '\) : 'Sin sedes activas'/);
  });

  it('avisa cuando la categoría no tiene operaciones configuradas', () => {
    expect(codigo(VISTA)).toMatch(/No hay una operación configurada\./);
  });

  it('avisa cuando la categoría no tiene productos fiscales', () => {
    expect(codigo(VISTA)).toMatch(/Esta categoría todavía no tiene productos fiscales\./);
  });
});

describe('la operación se configura aparte, no se inventa', () => {
  it('explica en la propia pantalla que las sedes y precios viven en Tarifas', () => {
    expect(VISTA).toMatch(/Las sedes, precios y SKU se guardan en Tarifas por sede/);
    expect(VISTA).toMatch(/esta vista no crea una configuración paralela/);
  });

  it('crear un producto NO crea una operación: se usa el modal de operación', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/mode: 'CREATE', categoria, productoInicialId/);
    expect(fuente).toMatch(/<ServicioModal/);
  });

  it('el formato se asigna o edita desde la propia operación', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/setAsignarFormatoServicio\(servicio\)/);
    expect(fuente).toMatch(/setEditarFormato\(\{ id: servicio\.formato_id as number, servicio \}\)/);
  });
});

describe('la API expone el listado por categoría', () => {
  it('existe listarPorCategoria y devuelve el mapa por categoría', () => {
    const fuente = codigo(API);
    expect(fuente).toMatch(/listarPorCategoria: async/);
    expect(fuente).toMatch(/porCategoria: response\.porCategoria \|\| \{\}/);
    expect(fuente).toMatch(/request\('\/productos\/por-categoria'\)/);
  });

  it('conserva listar() intacto para el consumidor paginado', () => {
    const fuente = codigo(API);
    expect(fuente).toMatch(/listar: async \(\): Promise<ProductoFacturacion\[\]> => \{/);
    expect(fuente).toMatch(/return response\.productos \|\| \[\];/);
  });
});
