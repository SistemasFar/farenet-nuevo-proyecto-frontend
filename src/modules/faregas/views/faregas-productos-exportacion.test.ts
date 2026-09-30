import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  faregasProductosApi,
  type ProductoFacturacion
} from '../services/faregas-productos.api';
import {
  COLUMNAS_PRODUCTOS_FISCALES,
  mapearProductosParaExcel
} from '../utils/faregas-productos-exportacion';
import { crearExcelBytes } from '../utils/exportar-excel';

const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');
const VISTA = leer('Configuracion', 'components', 'TabProductos.tsx');
const API = leer('..', 'services', 'faregas-productos.api.ts');
const BACKEND = readFileSync(resolve(__dirname, '..', '..', '..', '..', '..', 'farenetBackend', 'modules', 'faregas', 'services', 'faregas-productos.service.js'), 'utf8');
const XLSX = leer('..', 'utils', 'exportar-excel.ts');
const fetchOriginal = globalThis.fetch;

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: { getItem: () => null }
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  vi.restoreAllMocks();
});

const producto = (extra: Partial<ProductoFacturacion> = {}): ProductoFacturacion => ({
  id: 1,
  codigo_sku: '0300',
  descripcion: 'CERTIFICADO ANUAL DE GLP',
  tipo_producto: 'Producto',
  categoria_dms: 'SERVICIOS - PLANTA SANTA ANITA',
  sedes_faregas: ['SANTA ANITA'],
  cuenta_por_cobrar: 'S/ - 7041101 - Ingresos',
  codigo_barras: null,
  unidad: 'NIU',
  precio_unitario: 67.8,
  precio_referencia: 80,
  valor_referencial_unitario: 80,
  codigo_clasificacion_sunat: null,
  tipo_afectacion_igv: '10',
  codigo_afectacion_isc: null,
  porcentaje_isc: null,
  disponible_pos: false,
  es_para_venta: true,
  es_para_compra: false,
  tiene_icbper: false,
  imagen_url: null,
  activo: true,
  ...extra
});

describe('exportación completa de productos fiscales', () => {
  it('usa las 21 columnas del maestro DMS en el orden solicitado', () => {
    expect(COLUMNAS_PRODUCTOS_FISCALES.map((columna) => columna.header)).toEqual([
      'SKU', 'DESCRIPCIÓN', 'TIPO', 'CATEGORÍA DMS', 'SEDE FAREGAS',
      'CUENTA POR COBRAR', 'ACTIVO', 'CÓDIGO DE BARRAS', 'UNIDAD',
      'PRECIO UNITARIO', 'PRECIO DE VENTA UNITARIO', 'VALOR REFERENCIAL UNITARIO',
      'CÓDIGO CLASIFICACIÓN SUNAT', 'TIPO DE AFECTACIÓN IGV',
      'CÓDIGO AFECTACIÓN ISC', '% ISC', 'DISPONIBLE POS', 'ES PARA VENTA',
      'ES PARA COMPRA', 'TIENE ICBPER', 'IMAGEN'
    ]);
    expect(COLUMNAS_PRODUCTOS_FISCALES.some((columna) => columna.header === 'TIPO DE CERTIFICADO')).toBe(false);
  });

  it('preserva SKU con ceros, categoría DMS exacta y sede derivada separada', () => {
    const [fila] = mapearProductosParaExcel([producto()]);
    expect(fila.sku).toBe('0300');
    expect(fila.categoriaDms).toBe('SERVICIOS - PLANTA SANTA ANITA');
    expect(fila.sedesFaregas).toBe('SANTA ANITA');
    expect(COLUMNAS_PRODUCTOS_FISCALES.find((columna) => columna.key === 'sku')?.format).toBe('text');
  });

  it('une varias sedes con barra vertical y no inventa valores nulos', () => {
    const [fila] = mapearProductosParaExcel([producto({
      categoria_dms: null,
      sedes_faregas: ['SAN BORJA', 'SURCO'],
      codigo_barras: null
    })]);
    expect(fila.categoriaDms).toBeNull();
    expect(fila.sedesFaregas).toBe('SAN BORJA | SURCO');
    expect(fila.codigoBarras).toBeNull();
  });

  it('mantiene precios numéricos, booleanos SÍ/NO y formato de dos decimales', () => {
    const [fila] = mapearProductosParaExcel([producto()]);
    expect(fila.precioUnitario).toBe(67.8);
    expect(fila.precioVenta).toBe(80);
    expect(fila.valorReferencial).toBe(80);
    expect(fila.activo).toBe('SÍ');
    expect(fila.pos).toBe('NO');
    for (const key of ['precioUnitario', 'precioVenta', 'valorReferencial']) {
      expect(COLUMNAS_PRODUCTOS_FISCALES.find((columna) => columna.key === key)?.format).toBe('decimal2');
    }
    expect(XLSX).toContain('numFmtId="4"');
  });

  it('el XLSX serializa el SKU como texto y los importes como números decimales', () => {
    const filas = mapearProductosParaExcel([
      producto({ codigo_sku: '0021' }),
      producto({ id: 2, codigo_sku: '0238' }),
      producto({ id: 3, codigo_sku: '0300' })
    ]);
    const contenido = new TextDecoder().decode(
      crearExcelBytes('Productos', COLUMNAS_PRODUCTOS_FISCALES, filas)
    );
    expect(contenido).toContain('<c r="A2" s="2" t="inlineStr"><is><t xml:space="preserve">0021</t>');
    expect(contenido).toContain('<c r="A3" s="2" t="inlineStr"><is><t xml:space="preserve">0238</t>');
    expect(contenido).toContain('<c r="A4" s="2" t="inlineStr"><is><t xml:space="preserve">0300</t>');
    expect(contenido).toContain('<c r="J2" s="3"><v>67.8</v></c>');
    expect(contenido).toContain('<cellXfs count="4">');
  });

  it('el export recorre internamente todas las páginas del mismo endpoint', () => {
    expect(API).toMatch(/listarTodos:/);
    expect(API).toMatch(/const pageSize = 100/);
    expect(API).toMatch(/page <= primera\.totalPages/);
    expect(API).toMatch(/await listarPaginado\(\{ \.\.\.filtros, page, pageSize \}\)/);
    expect(VISTA).toMatch(/faregasProductosApi\.listarTodos\(/);
    expect(VISTA).toMatch(/buscar: buscarAplicado \|\| undefined/);
    expect(VISTA).toMatch(/categoria_id: categoria \|\| undefined/);
  });

  it('recupera 277 filas sin filtros y las 67 filas de un filtro, no sólo 10', async () => {
    const urls: string[] = [];
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      urls.push(url);
      const query = new URL(url).searchParams;
      const page = Number(query.get('page') || 1);
      const pageSize = Number(query.get('pageSize') || 10);
      const total = query.get('es_para_venta') === 'true' ? 67 : 277;
      const desde = (page - 1) * pageSize;
      const cantidad = Math.max(0, Math.min(pageSize, total - desde));
      const items = Array.from({ length: cantidad }, (_, index) => producto({
        id: desde + index + 1,
        codigo_sku: String(desde + index + 1).padStart(4, '0')
      }));
      return new Response(JSON.stringify({
        items,
        total,
        page,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
        unidades: ['NIU']
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    const todos = await faregasProductosApi.listarTodos();
    expect(todos).toHaveLength(277);
    expect(urls.slice(0, 3).map((url) => new URL(url).searchParams.get('page'))).toEqual(['1', '2', '3']);

    const filtrados = await faregasProductosApi.listarTodos({ es_para_venta: true });
    expect(filtrados).toHaveLength(67);
    expect(urls.at(-1)).toContain('es_para_venta=true');
    expect(urls.at(-1)).toContain('pageSize=100');
  });

  it('la sede FAREGAS se obtiene sólo de tarifa y planta activas', () => {
    expect(BACKEND).toMatch(/WHERE tarifa\.producto_facturacion_id = p\.id/);
    expect(BACKEND).toMatch(/tarifa\.activo = TRUE/);
    expect(BACKEND).toMatch(/planta\.activo = TRUE/);
    expect(BACKEND).toMatch(/AS sedes_faregas/);
  });
});
