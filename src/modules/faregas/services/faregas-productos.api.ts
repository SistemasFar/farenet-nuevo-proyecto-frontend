import { faregasFetch } from './faregas-http-client';
export interface ProductoFacturacion {
  id: number;
  codigo_sku: string;
  descripcion: string;
  tipo_producto?: string | null;
  categoria_dms?: string | null;
  categoria_id?: number | null;
  categoria_codigo?: string | null;
  categoria_nombre?: string | null;
  sedes_faregas?: string[];
  usos_operativos?: string[];
  cuenta_por_cobrar?: string | null;
  codigo_barras?: string | null;
  unidad?: string | null;
  precio_unitario?: number | null;
  precio_referencia?: number | null;
  valor_referencial_unitario?: number | null;
  codigo_clasificacion_sunat?: string | null;
  tipo_afectacion_igv?: string | null;
  codigo_afectacion_isc?: string | null;
  porcentaje_isc?: number | null;
  disponible_pos: boolean;
  es_para_venta: boolean;
  es_para_compra: boolean;
  tiene_icbper: boolean;
  imagen_url?: string | null;
  activo: boolean;
  requiere_chip?: boolean;
  producto_chip_id?: number | null;
  precio_chip?: number | null;
}

export interface ProductoFacturacionFiltros {
  buscar?: string;
  activo?: boolean;
  es_para_venta?: boolean;
  unidad?: string;
  categoria_id?: number | string;
  page?: number;
  pageSize?: number;
}

export interface ProductoEnImpacto {
  id: number;
  codigo_sku: string | null;
  descripcion: string | null;
}

export interface OperacionMixtaImpacto {
  id: number;
  estado: string | null;
  planta_key: string | null;
  total_detalles: number;
  detalles_producto: number;
  mixta: boolean;
  productos: ProductoEnImpacto[];
  detalles: Array<{
    id: number;
    producto_facturacion_id: number | null;
    producto_codigo_sku: string | null;
    producto_descripcion: string | null;
    certificado_id: number | null;
    descripcion_snapshot: string | null;
  }>;
  certificado_ids: number[];
}

export interface ImpactoProductoFiscal {
  producto: ProductoEnImpacto;
  requiereConfirmacionConjunto: boolean;
  operaciones: OperacionMixtaImpacto[];
  operacionesMixtas: OperacionMixtaImpacto[];
  otrosProductos: ProductoEnImpacto[];
  certificados: Array<{
    id: number;
    estado: string | null;
    numero_certificado: string | null;
    producto_facturacion_certificado_id: number | null;
    producto_facturacion_chip_id: number | null;
  }>;
  certificadosMixtos: Array<{
    id: number;
    estado: string | null;
    numero_certificado: string | null;
    producto_facturacion_certificado_id: number | null;
    producto_facturacion_chip_id: number | null;
    operacion_externas: number;
  }>;
  certificadosAEliminar: number[];
  certificadosPreservados: number[];
  facturaciones: Array<{ id: number; estado: string | null; nro_comprobante: string | null }>;
  ordenesPago: Array<{ id: number; estado: string | null; importe_total: number }>;
  pagos: Array<{ id: number; importe: number }>;
  financieroRelacionado?: {
    facturaciones: Array<{ id: number }>;
    ordenesPago: Array<{ id: number }>;
    pagos: Array<{ id: number }>;
  };
  tarifas: Array<{ id: number; tarifa_codigo: string | null; planta_key: string | null; servicio_id: number }>;
  mappings: {
    producto_sede: unknown[];
    producto_inventariable: unknown[];
    producto_inventariable_sede: unknown[];
  };
  servicios: Array<{ id: number; codigo: string | null; nombre: string | null; tiene_otra_tarifa_activa: boolean }>;
  chips: { reservas: unknown[]; movimientos: unknown[] };
}

export interface EliminacionProductoFiscal {
  productoEliminado: {
    id: number;
    codigo_sku: string;
    descripcion: string;
  };
  tarifasEliminadas: number;
  tarifasDesvinculadas: number;
  mappingsEliminados: number;
  mappingsDesvinculados: number;
  serviciosDesactivados: number;
  operacionesDesvinculadas: number;
  certificadosDesvinculados: number;
  historicosPreservados: {
    operaciones: number;
    certificados: number;
  };
  conjuntoPrueba: {
    operacionesEliminadas: number;
    detallesEliminados: number;
    facturacionesEliminadas: number;
    ordenesPagoEliminadas: number;
    pagosEliminados: number;
    certificadosEliminados: number;
    documentosElectronicosEliminados?: number;
    descuentosAjustados?: number;
    chipsDesvinculados?: number;
    otrosProductosPreservados: number[];
  } | null;
}

const request = async (path: string, options: RequestInit = {}) => {
  return faregasFetch(`/config${path}`, options);
};

const listarPaginado = async (filtros: ProductoFacturacionFiltros = {}): Promise<{
  items: ProductoFacturacion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unidades: string[];
}> => {
  const params = new URLSearchParams();
  if (filtros.buscar?.trim()) params.set('buscar', filtros.buscar.trim());
  if (filtros.activo !== undefined) params.set('activo', String(filtros.activo));
  if (filtros.es_para_venta !== undefined) params.set('es_para_venta', String(filtros.es_para_venta));
  if (filtros.unidad) params.set('unidad', filtros.unidad);
  if (filtros.categoria_id) params.set('categoria_id', String(filtros.categoria_id));
  if (filtros.page) params.set('page', String(filtros.page));
  if (filtros.pageSize) params.set('pageSize', String(filtros.pageSize));
  const query = params.toString();
  const response = await request(`/productos${query ? `?${query}` : ''}`);
  const items: ProductoFacturacion[] = response.items || response.productos || [];
  const limit = Number(response.limit || filtros.pageSize || 10);
  const total = Number(response.total ?? items.length);
  return {
    items,
    total,
    page: Number(response.page || filtros.page || 1),
    limit,
    totalPages: Number(response.totalPages ?? (total > 0 ? Math.ceil(total / limit) : 0)),
    unidades: response.unidades || []
  };
};

export const faregasProductosApi = {
  listar: async (): Promise<ProductoFacturacion[]> => {
    const response = await request('/productos');
    return response.productos || [];
  },
  /**
   * Productos que TIENEN categoría, agrupados por `categoria_id`.
   *
   * La pantalla "Operación y formatos" recorre las categorías y necesita el
   * producto fiscal de cada una. No debe usar `listar()`, que devuelve una
   * página del catálogo: una categoría cuyo producto no cae en esa página
   * aparecería como "0 producto(s)" y se perdería el botón de configurar la
   * operación. Este listado no está paginado a propósito, porque el conjunto
   * está acotado por ser sólo los productos con categoría.
   */
  listarPorCategoria: async (): Promise<{
    porCategoria: Record<string, ProductoFacturacion[]>;
    productos: ProductoFacturacion[];
    total: number;
  }> => {
    const response = await request('/productos/por-categoria');
    return {
      porCategoria: response.porCategoria || {},
      productos: response.productos || [],
      total: Number(response.total || 0)
    };
  },
  /**
   * Listado paginado con filtros resueltos en el backend.
   *
   * El filtro se aplica ANTES del LIMIT/OFFSET, de modo que un texto de
   * búsqueda encuentra el producto esté en la página que esté. Filtrar en el
   * navegador sólo sobre los 10 registros ya cargados devolvía cero
   * resultados para los productos fuera de esa página.
   */
  listarPaginado,
  /**
   * Recupera el resultado completo usando el mismo endpoint, filtros y orden
   * del listado. Recorre páginas del tamaño máximo admitido por el backend en
   * lugar de pedir un límite gigante o exportar sólo la página visible.
   */
  listarTodos: async (filtros: Omit<ProductoFacturacionFiltros, 'page' | 'pageSize'> = {}): Promise<ProductoFacturacion[]> => {
    const pageSize = 100;
    const primera = await listarPaginado({ ...filtros, page: 1, pageSize });
    const items = [...primera.items];
    for (let page = 2; page <= primera.totalPages; page += 1) {
      const siguiente = await listarPaginado({ ...filtros, page, pageSize });
      items.push(...siguiente.items);
    }
    return items;
  },
  crear: async (producto: Partial<ProductoFacturacion>): Promise<void> => {
    await request('/productos', { method: 'POST', body: JSON.stringify(producto) });
  },
  editar: async (id: number, producto: Partial<ProductoFacturacion>): Promise<void> => {
    await request(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(producto) });
  },
  cambiarEstado: async (id: number, activo: boolean): Promise<void> => {
    await request(`/productos/${id}/estado`, { method: 'PUT', body: JSON.stringify({ activo }) });
  },
  obtenerImpacto: async (id: number): Promise<ImpactoProductoFiscal> => {
    const response = await request(`/productos/${id}/impacto`);
    return response.impacto;
  },
  eliminar: async (id: number, opciones: { confirmarConjunto?: boolean } = {}): Promise<EliminacionProductoFiscal> => {
    return request(`/productos/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirmarConjunto: Boolean(opciones.confirmarConjunto) })
    });
  }
};
