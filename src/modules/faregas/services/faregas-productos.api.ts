const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';

export interface ProductoFacturacion {
  id: number;
  codigo_sku: string;
  descripcion: string;
  tipo_producto?: string | null;
  categoria_dms?: string | null;
  categoria_id?: number | null;
  categoria_codigo?: string | null;
  categoria_nombre?: string | null;
  cuenta_por_cobrar?: string | null;
  unidad?: string | null;
  precio_unitario?: number | null;
  precio_referencia?: number | null;
  valor_referencial_unitario?: number | null;
  codigo_clasificacion_sunat?: string | null;
  tipo_afectacion_igv?: string | null;
  porcentaje_isc?: number | null;
  disponible_pos: boolean;
  es_para_venta: boolean;
  es_para_compra: boolean;
  tiene_icbper: boolean;
  activo: boolean;
  requiere_chip?: boolean;
  producto_chip_id?: number | null;
  precio_chip?: number | null;
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
  const token = sessionStorage.getItem('faregasAccessToken')?.trim();
  const response = await fetch(`${BASE_URL}/faregas/config${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Error al procesar productos.');
  return data;
};

export const faregasProductosApi = {
  listar: async (): Promise<ProductoFacturacion[]> => {
    const response = await request('/productos');
    return response.productos || [];
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
