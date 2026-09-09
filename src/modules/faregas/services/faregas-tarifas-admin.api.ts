const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';

export interface TarifaSede {
  key: string;
  nombre: string;
  direccion?: string | null;
  activo: boolean;
  total_tarifas_activas: number;
}

export interface TarifaAdmin {
  id: number;
  planta_key: string;
  sede_nombre: string;
  servicio_id: number;
  servicio_codigo: string;
  servicio_nombre: string;
  servicio_tipo_flujo: string;
  categoria_id: number;
  categoria_codigo: string;
  categoria_nombre: string;
  precio: number;
  producto_facturacion_id: number | null;
  producto_sku: string | null;
  producto_descripcion: string | null;
  producto_unidad: string | null;
  producto_afectacion_igv: string | null;
  producto_cuenta_por_cobrar: string | null;
  producto_precio_referencia: number | null;
  producto_activo: boolean | null;
  producto_es_para_venta: boolean | null;
  producto_codigo_sunat: string | null;
  producto_categoria_id: number | null;
  producto_categoria_codigo: string | null;
  producto_categoria_nombre: string | null;
  activo: boolean;
}

export interface ServicioDisponible {
  id: number;
  codigo: string;
  nombre: string;
  tipo_flujo: string;
  categoria_id: number;
  categoria_codigo: string;
  categoria_nombre: string;
}

export interface ProductoTarifa {
  id: number;
  codigo_sku: string;
  descripcion: string;
  unidad: string | null;
  tipo_afectacion_igv: string | null;
  cuenta_por_cobrar: string | null;
  precio_referencia: number | null;
  activo: boolean;
  es_para_venta: boolean;
  codigo_clasificacion_sunat: string | null;
  categoria_id: number | null;
  categoria_codigo: string | null;
  categoria_nombre: string | null;
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
  if (!response.ok) throw new Error(data.message || 'Error al administrar tarifas.');
  return data;
};

export const faregasTarifasAdminApi = {
  listarSedes: async (): Promise<TarifaSede[]> => (await request('/tarifas/sedes')).sedes || [],
  listar: async (plantaKey: string): Promise<TarifaAdmin[]> =>
    (await request(`/tarifas?planta_key=${encodeURIComponent(plantaKey)}`)).tarifas || [],
  serviciosDisponibles: async (plantaKey: string): Promise<ServicioDisponible[]> =>
    (await request(`/tarifas/servicios-disponibles?planta_key=${encodeURIComponent(plantaKey)}`)).servicios || [],
  buscarProductos: async (q: string): Promise<ProductoTarifa[]> =>
    (await request(`/tarifas/productos?q=${encodeURIComponent(q)}`)).productos || [],
  crear: async (body: { planta_key: string; servicio_id: number; precio: number; producto_facturacion_id: number | null; activo: boolean }) => {
    await request('/tarifas', { method: 'POST', body: JSON.stringify(body) });
  },
  editar: async (id: number, body: { precio: number; producto_facturacion_id: number | null; activo: boolean }) => {
    await request(`/tarifas/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  },
  cambiarEstado: async (id: number, activo: boolean) => {
    await request(`/tarifas/${id}/estado`, { method: 'PUT', body: JSON.stringify({ activo }) });
  }
};
