const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';
const getAuthHeaders = (): Record<string, string> => {
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
  post: async (path: string, body: unknown) => {
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
  put: async (path: string, body: unknown) => {
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
  correo?: string;
  activo: boolean;
  empresa_key: string;
  empresa_nombre: string;
  total_tarifas?: number;
}

export interface EmpresaFaregas {
  key: string;
  nombre: string;
  ruc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  cuenta_banco_nacion?: string | null;
  activo: boolean;
  total_sedes: number;
}

export interface CategoriaServicio {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  orden: number;
}

export type TipoFlujoServicioFaregas = 'CERTIFICACION' | 'SERVICIO_COMPLEMENTARIO';

export interface ServicioConfiguracionFaregas {
  id: number;
  codigo: string;
  nombre: string;
  familia: string;
  categoria_id: number;
  categoria_codigo: string;
  categoria_nombre: string;
  tipo_flujo: TipoFlujoServicioFaregas;
  requiere_certificado: boolean;
  tipo_certificado_clave: string | null;
  modalidad: 'INICIAL' | 'ANUAL' | null;
  requiere_vehiculo: boolean;
  activo: boolean;
  orden: number;
}

export const faregasConfigApi = {
  obtenerEmpresas: async (): Promise<EmpresaFaregas[]> => {
    const response = await api.get('/api/faregas/config/empresas');
    return response.empresas || [];
  },

  obtenerSedesEmpresas: async (): Promise<Sede[]> => {
    const response = await api.get('/api/faregas/config/empresas/sedes');
    return response.sedes || [];
  },

  crearEmpresa: async (empresa: Partial<EmpresaFaregas>): Promise<void> => {
    await api.post('/api/faregas/config/empresas', empresa);
  },

  editarEmpresa: async (key: string, empresa: Partial<EmpresaFaregas>): Promise<void> => {
    await api.put(`/api/faregas/config/empresas/${encodeURIComponent(key)}`, empresa);
  },

  cambiarEstadoEmpresa: async (key: string, activo: boolean): Promise<void> => {
    await api.put(`/api/faregas/config/empresas/${encodeURIComponent(key)}/estado`, { activo });
  },

  asignarEmpresaSede: async (sedeKey: string, empresaKey: string): Promise<void> => {
    await api.put(`/api/faregas/config/sedes/${encodeURIComponent(sedeKey)}/empresa`, { empresa_key: empresaKey });
  },

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
  },

  obtenerCategorias: async (soloActivas = false): Promise<CategoriaServicio[]> => {
    const response = await api.get(`/api/faregas/config/categorias${soloActivas ? '?activas=true' : ''}`);
    return response.categorias || [];
  },

  crearCategoria: async (categoria: Partial<CategoriaServicio>): Promise<void> => {
    return api.post('/api/faregas/config/categorias', categoria);
  },

  editarCategoria: async (id: number, categoria: Partial<CategoriaServicio>): Promise<void> => {
    return api.put(`/api/faregas/config/categorias/${id}`, categoria);
  },

  cambiarEstadoCategoria: async (id: number, activo: boolean): Promise<void> => {
    return api.put(`/api/faregas/config/categorias/${id}/estado`, { activo });
  },

  // Servicios
  getServicios: async (): Promise<ServicioConfiguracionFaregas[]> => {
    const response = await api.get('/api/faregas/config/servicios');
    return response.servicios || response;
  },

  crearServicio: async (servicio: Partial<ServicioConfiguracionFaregas>): Promise<number> => {
    const response = await api.post('/api/faregas/config/servicios', servicio);
    return response.servicio_id;
  },

  editarServicio: async (id: number, servicio: Partial<ServicioConfiguracionFaregas>): Promise<void> => {
    const response = await api.put(`/api/faregas/config/servicios/${id}`, servicio);
    return response;
  },

  cambiarEstadoServicio: async (id: number, activo: boolean): Promise<void> => {
    const response = await api.put(`/api/faregas/config/servicios/${id}/estado`, { activo });
    return response;
  },

  obtenerSedesPorServicio: async (): Promise<Record<number, SedeTarifaAsignada[]>> => {
    const response = await api.get('/api/faregas/config/servicios/sedes');
    return response.sedesPorServicio || {};
  }
};

export interface SedeTarifaAsignada {
  key: string;
  nombre: string;
  tarifa_id: number;
  precio: number;
  producto_facturacion_id: number | null;
  activo: boolean;
}
