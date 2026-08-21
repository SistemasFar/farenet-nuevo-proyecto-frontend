const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';
const getAuthHeaders = () => {
  const token = sessionStorage.getItem('faregasAccessToken')?.trim();
  if (!token || token === 'null' || token === 'undefined') return {};
  return { Authorization: `Bearer ${token}` };
};

const api = {
  get: async (path: string) => {
    const res = await fetch(`${BASE_URL}${path.replace('/api', '')}`, { headers: getAuthHeaders() });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error GET ' + path);
    }
    return res.json();
  },
  post: async (path: string, body: any) => {
    const res = await fetch(`${BASE_URL}${path.replace('/api', '')}`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error POST ' + path);
    }
    return res.json();
  },
  put: async (path: string, body: any) => {
    const res = await fetch(`${BASE_URL}${path.replace('/api', '')}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error PUT ' + path);
    }
    return res.json();
  }
};

export interface Sede {
  key: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  activo: boolean;
  total_tarifas?: number;
}

export const faregasConfigApi = {
  obtenerSedes: async (): Promise<Sede[]> => {
    const response = await api.get('/api/faregas/config/sedes');
    return response.sedes;
  },

  crearSede: async (sede: Partial<Sede>): Promise<void> => {
    const response = await api.post('/api/faregas/config/sedes', sede);
    return response;
  },

  editarSede: async (key: string, sede: Partial<Sede>): Promise<void> => {
    const response = await api.put(`/api/faregas/config/sedes/${key}`, sede);
    return response;
  },

  cambiarEstadoSede: async (key: string, activo: boolean): Promise<void> => {
    const response = await api.put(`/api/faregas/config/sedes/${key}/estado`, { activo });
    return response;
  }
};
