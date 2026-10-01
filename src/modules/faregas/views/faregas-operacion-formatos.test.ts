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
const API_SEDES = leer('..', 'services', 'faregas-config.api.ts');

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

describe('el bug: "Sin producto fiscal vinculado" aunque el vínculo exista en la tarifa', () => {
  /**
   * Caso real: COLINA + GLP_ANUAL_MOTO. `fg_tarifa.id=179` tiene
   * `producto_facturacion_id = 14` (SKU 0228) desde siempre, y facturación
   * resuelve bien. Pero la pantalla decía "Sin producto fiscal vinculado".
   *
   * Causa: `fg_producto_facturacion.id` es `bigint`, así que el driver de Postgres
   * lo devuelve como TEXTO ("14"), mientras que `producto_facturacion_id` llega
   * como NÚMERO desde el `json_agg` de `obtenerSedesPorServicio()`. El `===`
   * entre "14" y 14 nunca era verdadero, así que el producto no se encontraba.
   * Afectaba a 8 operaciones de las 9 con sede activa.
   */
  it('normaliza el id de producto antes de compararlo', () => {
    const fuente = codigo(VISTA);
    // Sin Number() la comparación sigue fallando por tipo.
    expect(fuente).not.toMatch(/productos\.find\(\(producto\) => producto\.id === id\)/);
    expect(fuente).toMatch(/const buscarProductoPorId = \(id: number \| string\) =>/);
    expect(fuente).toMatch(/Number\(producto\.id\) === Number\(id\)/);
  });

  it('convierte a número los ids que vienen de la tarifa', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/\.map\(\(id\) => Number\(id\)\)/);
    // Y descarta nulos y valores no numéricos en lugar de dejar que se cuelen.
    expect(fuente).toMatch(/id !== null && id !== undefined/);
    expect(fuente).toMatch(/Number\.isFinite\(id\) && id > 0/);
  });

  it('usa el mismo comparador en la lista de productos de la operación', () => {
    const fuente = codigo(VISTA);
    // El texto "Productos:" se construye con el comparador normalizado, no con
    // un `===` directo que reproduce el bug.
    expect(fuente).toMatch(/productoIdsDe\(servicio\.id\)\s*\n?\s*\.map\(\(id\) => buscarProductoPorId\(id\)\)/);
    expect(fuente).not.toMatch(/\.map\(\(id\) => productos\.find\(\(producto\) => producto\.id === id\)\)/);
  });

  it('el botón "Configurar operación" también compara normalizado', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/productoIdsDe\(servicio\.id\)\.includes\(Number\(producto\.id\)\)/);
    expect(fuente).not.toMatch(/productoIdsDe\(servicio\.id\)\.includes\(producto\.id\)/);
  });

  it('compara la categoría por número, no por tipo', () => {
    const fuente = codigo(VISTA);
    expect(fuente).toMatch(/Number\(producto\.categoria_id\) === Number\(categoriaId\)/);
    expect(fuente).toMatch(/Number\(servicio\.categoria_id\) === Number\(categoriaId\)/);
  });

  it('el texto de "Sin producto fiscal vinculado" se conserva para lo que sí falta', () => {
    // La corrección no maquilla el caso real: si de verdad no hay producto, sigue
    // avisando. Sólo deja de mentir cuando el vínculo existe.
    expect(codigo(VISTA)).toMatch(/'Sin producto fiscal vinculado'/);
  });
});

describe('la relación es por operación + sede + producto, no una propiedad global', () => {
  it('el producto se lee de la tarifa de cada sede', () => {
    const fuente = codigo(VISTA);
    // `obtenerSedesPorServicio()` agrupa por `servicio_id` y trae, por fila,
    // `planta_key` + `tarifa_id` + `producto_facturacion_id`. Esa fila ES la
    // relación (operación, sede, producto): dos sedes de la misma operación
    // pueden llevar SKU distintos.
    expect(fuente).toMatch(/obtenerSedesPorServicio\(\)/);
  });

  it('el backend expone la relación con sede, tarifa y producto juntos', () => {
    const fuente = codigo(API_SEDES);
    expect(fuente).toMatch(/producto_facturacion_id: number \| null/);
    expect(fuente).toMatch(/tarifa_id: number/);
    expect(fuente).toMatch(/key: string/);
  });

  it('el modal edita la tarifa de cada sede, no un producto único de la operación', () => {
    const modal = codigo(leer('Configuracion', 'components', 'ServicioModal.tsx'));
    // Un `productoId` por sede, guardado en su tarifa.
    expect(modal).toMatch(/productoId: string/);
    expect(modal).toMatch(/Record<string, EstadoSede>/);
    // Y al guardar, cada sede va a SU tarifa: sin sede con tarifa, se crea una.
    expect(modal).toMatch(/if \(estado\.tarifaId\) await faregasTarifasAdminApi\.editar\(estado\.tarifaId, datos\)/);
    expect(modal).toMatch(/else await faregasTarifasAdminApi\.crear\(\{ planta_key: sede\.key, servicio_id: servicioId, \.\.\.datos \}\)/);
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
