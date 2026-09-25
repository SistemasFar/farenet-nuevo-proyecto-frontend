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
  },
  delete: async (path: string, body?: unknown) => {
    const res = await fetch(`${BASE_URL}${path.replace('/api', '')}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error DELETE ' + path);
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
  productos_vinculados?: number;
  servicios_vinculados?: number;
}

export interface OperacionBloqueadaCategoria {
  operacion_id: number;
  motivo: 'SERVICIO_DE_OTRA_CATEGORIA' | 'PRODUCTO_FISCAL_COMPARTIDO';
  referencias: number[];
}

export interface ImpactoCategoria {
  categoria: { id: number; codigo: string; nombre: string };
  requiereConfirmacion: boolean;
  eliminable: boolean;
  ambiente: 'DEMO' | 'PRODUCCION';
  limpiezaHabilitada: boolean;
  facturacionesProtegidas: Array<{ id: number; estado: string | null; nro_comprobante: string | null; serie: string | null; numero: number | null; entorno_facturador: string | null }>;
  facturacionesBloqueantes: Array<{ id: number; estado: string | null; nro_comprobante: string | null }>;
  servicios: Array<{ id: number; codigo: string; nombre: string; activo: boolean; formato_id: number | null }>;
  tarifas: Array<{ id: number; servicio_id: number; planta_key: string; codigo: string; nombre: string; activo: boolean; producto_facturacion_id: number | null }>;
  reglasConfiguracion: Array<{ id: number; servicio_id: number; planta_key: string; tipo_calculo: string; valor: number }>;
  operaciones: Array<{ id: number; estado: string | null; total_detalles: number; detalles: Array<{ id: number; servicio_id: number | null; certificado_id: number | null }> }>;
  operacionesBloqueadas: OperacionBloqueadaCategoria[];
  detalleProductoSnapshot: number;
  productosCompartidos: Array<{ id: number; codigo_sku: string; descripcion: string; motivo: string }>;
  certificados: Array<{ id: number; estado: string | null; numero_certificado: string | null; origen: string; operaciones_externas: number }>;
  certificadosAEliminar: number[];
  certificadosPreservados: Array<{ id: number; estado: string | null; numero_certificado: string | null; motivo: string }>;
  facturaciones: Array<{ id: number; estado: string | null; nro_comprobante: string | null; serie?: string | null; numero?: number | null; entorno_facturador?: string | null; aceptada_sunat?: boolean; intentos?: number }>;
  intentosFacturacion: Array<{ id: number; facturacion_id: number; numero_intento: number; estado: string | null }>;
  ordenesPago: Array<{ id: number; estado: string | null }>;
  pagos: Array<{ id: number; importe: number }>;
  formatos: Array<{ id: number; codigo: string; nombre: string; es_protegido: boolean; servicios_que_lo_usan: number; certificados: number }>;
  formatosConservados: number;
  mappingsPorSede: { tarifas: Array<{ id: number; planta_key: string; servicio_id: number }>; reglas: Array<{ id: number; planta_key: string; servicio_id: number }> };
  productos: Array<{ id: number; codigo_sku: string; descripcion: string }>;
  productosPreservados: number[];
  chips: { reservas: unknown[]; movimientos: unknown[] };
}

export type TipoFlujoServicioFaregas = 'CERTIFICACION' | 'SERVICIO_COMPLEMENTARIO' | 'TALLER_INSPECCION';

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
  formato_id?: number | null;
  formato_codigo?: string | null;
  formato_nombre?: string | null;
  formato_motor?: string | null;
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

  obtenerImpactoCategoria: async (id: number): Promise<ImpactoCategoria> => {
    const response = await api.get(`/api/faregas/config/categorias/${id}/impacto`);
    return response.impacto;
  },

  eliminarCategoria: async (id: number, opciones: { confirmarTodo?: boolean } = {}): Promise<{
    productosDesvinculados: number;
    serviciosEliminados: number;
    tarifasEliminadas: number;
    reglasEliminadas: number;
    operacionesEliminadas: number;
    certificadosEliminados: number;
    facturacionesEliminadas: number;
    comprobantesLocalesEliminados: number;
    ambiente: string;
  }> => {
    return api.delete(`/api/faregas/config/categorias/${id}`, { confirmarTodo: Boolean(opciones.confirmarTodo) });
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

  asignarFormato: async (id: number, formatoId: number): Promise<void> => {
    return api.put(`/api/faregas/config/servicios/${id}/formato`, { formato_id: formatoId });
  },

  crearVarianteFormato: async (id: number, formatoPadreId?: number): Promise<import('./faregas-formatos.api').Formato> => {
    const response = await api.post(`/api/faregas/config/servicios/${id}/formato/variante`, {
      formato_padre_id: formatoPadreId ?? null
    });
    return response.formato;
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
