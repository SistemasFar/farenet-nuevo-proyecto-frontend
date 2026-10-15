import { faregasFetchWithStatus as fetchWithToken } from './faregas-http-client';
import type { CrearClienteFaregasRequest } from '../types/faregas-api';

export interface ClienteFacturacionListado {
  id: number | null;
  tipoDocumento: string;
  nroDocumento: string;
  nombreRazonSocial: string;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  estado: boolean;
  origen: 'MAESTRO' | 'FACTURACION_HISTORICA';
  fechaCreacion: string | null;
  fechaModificacion: string | null;
  totalCertificados: number;
  totalComprobantes: number;
  ultimaAtencion: string | null;
  ultimaPlantaKey: string | null;
  ultimaPlantaNombre: string | null;
  ultimaPlaca: string | null;
}

export interface FiltrosClientesFacturacion {
  texto?: string;
  estado?: '' | 'ACTIVO' | 'INACTIVO';
  pagina?: number;
  limite?: number;
}

export interface ResumenClientesFacturacion {
  clientes: ClienteFacturacionListado[];
  total: number;
  pagina: number;
  limite: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const faregasClientesApi = {
  listar: (filtros: FiltrosClientesFacturacion) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    return fetchWithToken(`/clientes?${params.toString()}`) as Promise<{ ok: true; data: ResumenClientesFacturacion }>;
  },

  autocompletarPersona: (tipoDocumento: string, nroDocumento: string) => 
    fetchWithToken(`/clientes/autocompletar/${tipoDocumento}/${nroDocumento}`),

  consultarDocumento: (tipoDocumento: string, numeroDocumento: string) => {
    const params = new URLSearchParams({ tipoDocumento, numeroDocumento });
    return fetchWithToken(`/clientes/consultar-documento?${params.toString()}`);
  },
    
  crearCliente: (data: CrearClienteFaregasRequest) => fetchWithToken('/clientes', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
