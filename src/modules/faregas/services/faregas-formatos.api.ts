import { faregasFetch } from './faregas-http-client';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Formato {
  id: number;
  codigo: string;
  nombre: string;
  motor: string;
  es_protegido: boolean;
  activo: boolean;
  tiene_version_vigente: boolean;
  formato_padre_id?: number | null;
  formato_padre_nombre?: string;
}

export interface FormatoVersion {
  id: number;
  version: number;
  archivo_ruta: string;
  configuracion: any;
  estado: 'BORRADOR' | 'VIGENTE' | 'RETIRADA';
  motor: 'DOCX_DINAMICO' | 'HTML_DINAMICO' | 'SISTEMA';
  vigente_desde: string | null;
  creado_en: string;
}

export interface VariableCatalogo {
  key: string;
  label: string;
  grupo: string;
  tipo: string;
  demo: string;
}

export const faregasFormatosApi = {
  listarFormatos: async (): Promise<Formato[]> => {
    return faregasFetch('/formatos') as Promise<Formato[]>;
  },

  crearFormato: async (formato: Partial<Formato>): Promise<Formato> => {
    return faregasFetch('/formatos', {
      method: 'POST',
      body: JSON.stringify(formato),
    }) as Promise<Formato>;
  },

  cambiarEstado: async (id: number): Promise<Formato> => {
    return faregasFetch(`/formatos/${id}/estado`, {
      method: 'PUT',
    }) as Promise<Formato>;
  },

  listarVersiones: async (formatoId: number): Promise<FormatoVersion[]> => {
    return faregasFetch(`/formatos/${formatoId}/versiones`) as Promise<FormatoVersion[]>;
  },

  subirVersion: async (formatoId: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('archivo', file);
    
    const token = sessionStorage.getItem('faregasAccessToken');
    const res = await fetch(`${API_URL}/faregas/formatos/${formatoId}/versiones`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.mensaje || 'Error al subir versión');
    }
    return res.json();
  },

  obtenerVariables: async (): Promise<VariableCatalogo[]> => {
    const res = await faregasFetch('/formatos/variables') as { variables: VariableCatalogo[] };
    return res.variables;
  },

  obtenerEstructura: async (formatoId: number, versionId: number): Promise<{paragraphs: any[]}> => {
    return faregasFetch(`/formatos/${formatoId}/versiones/${versionId}/estructura`) as Promise<{paragraphs: any[]}>;
  },

  guardarMappings: async (formatoId: number, versionId: number, mappings: any[]): Promise<any> => {
    return faregasFetch(`/formatos/${formatoId}/versiones/${versionId}/mappings`, {
      method: 'POST',
      body: JSON.stringify({ mappings }),
    });
  },

  activarVersion: async (formatoId: number, versionId: number): Promise<any> => {
    return faregasFetch(`/formatos/${formatoId}/versiones/${versionId}/activar`, {
      method: 'POST'
    });
  }
};
