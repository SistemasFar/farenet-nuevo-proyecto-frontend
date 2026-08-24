const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';

export type TipoComprobanteFaregas = 'FACTURA' | 'BOLETA';

export interface SerieSede {
  key: string;
  nombre: string;
  direccion?: string | null;
  activo: boolean;
  series_activas: number;
}

export interface SerieComprobante {
  id: number;
  planta_key: string;
  sede_nombre: string;
  tipo_comprobante: TipoComprobanteFaregas;
  serie: string;
  ultimo_numero: number;
  es_predeterminada: boolean;
  autogenerada: boolean;
  contingencia: boolean;
  activo: boolean;
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
  if (!response.ok) throw new Error(data.message || 'Error al administrar series.');
  return data;
};

export const faregasSeriesApi = {
  listarSedes: async (): Promise<SerieSede[]> => (await request('/series/sedes')).sedes || [],
  listar: async (plantaKey: string): Promise<SerieComprobante[]> =>
    (await request(`/series?planta_key=${encodeURIComponent(plantaKey)}`)).series || [],
  crear: async (body: Omit<SerieComprobante, 'id' | 'sede_nombre'>) => {
    await request('/series', { method: 'POST', body: JSON.stringify(body) });
  },
  editar: async (id: number, body: Pick<SerieComprobante, 'es_predeterminada' | 'autogenerada' | 'contingencia'>) => {
    await request(`/series/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  },
  cambiarEstado: async (id: number, activo: boolean) => {
    await request(`/series/${id}/estado`, { method: 'PUT', body: JSON.stringify({ activo }) });
  }
};
