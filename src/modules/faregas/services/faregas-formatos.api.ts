import { faregasFetch } from './faregas-http-client';

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
  formato_padre_codigo?: string;
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

export interface DisenoSistemaVisual {
  textos: { titulo: string; certifica: string };
  pagina: { paddingPx: number };
  titulo: { fontSizePx: number; textAlign: 'left' | 'center' | 'right' | 'justify'; marginTopPx: number; marginBottomPx: number };
  cuerpo: { fontSizePx: number; lineHeight: number };
  tablas: { fontSizePx: number; cellPaddingPx: number; borderWidthPx: number };
  pie: { fontSizePx: number; textAlign: 'left' | 'center' | 'right' | 'justify'; marginTopPx: number };
}

export interface VersionDisenoSistema {
  id: number;
  version: number;
  estado: 'BORRADOR' | 'VIGENTE' | 'RETIRADA';
  motor: 'SISTEMA';
  diseno: DisenoSistemaVisual;
  creadoEn: string | null;
  vigenteDesde: string | null;
}

export interface EstadoDisenoSistema {
  formatoId: number;
  codigo: string;
  nombre: string;
  capacidades: { textos: { titulo: boolean; certifica: boolean } };
  borrador: VersionDisenoSistema | null;
  vigente: VersionDisenoSistema | null;
  historial: VersionDisenoSistema[];
  disenoPredeterminado: DisenoSistemaVisual;
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

  /**
   * Elimina un formato. Sólo funciona si no está protegido y no está en uso: la
   * validación real está en el backend, que devuelve un mensaje claro en lugar
   * de un error de clave foránea.
   */
  eliminarFormato: async (id: number): Promise<{ mensaje: string }> => {
    return faregasFetch(`/formatos/${id}`, { method: 'DELETE' }) as Promise<{ mensaje: string }>;
  },

  listarVersiones: async (formatoId: number): Promise<FormatoVersion[]> => {
    return faregasFetch(`/formatos/${formatoId}/versiones`) as Promise<FormatoVersion[]>;
  },

  subirVersion: async (formatoId: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('archivo', file);
    
    const token = sessionStorage.getItem('faregasAccessToken');
    const res = await faregasFetch(`/formatos/${formatoId}/versiones`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al subir versión');
    }
    return res.json();
  },

  crearVersionHtml: async (formatoId: number, origen: 'PLANTILLA_FAREGAS' | 'ULTIMA_VERSION' = 'PLANTILLA_FAREGAS'): Promise<{ version: FormatoVersion }> => {
    return faregasFetch(`/formatos/${formatoId}/versiones/html`, {
      method: 'POST',
      body: JSON.stringify({ origen }),
    }) as Promise<{ version: FormatoVersion }>;
  },

  crearVersionOficialProtegida: async (formatoId: number): Promise<{
    version: FormatoVersion;
    reutilizada: boolean;
    origen: 'VERSION_VIGENTE' | 'FUENTE_OFICIAL_PROTEGIDA' | 'PLANTILLA_FAREGAS' | 'BORRADOR_EXISTENTE';
    message: string;
  }> => {
    return faregasFetch(`/formatos/${formatoId}/versiones/protegido`, {
      method: 'POST',
    }) as Promise<{
      version: FormatoVersion;
      reutilizada: boolean;
      origen: 'VERSION_VIGENTE' | 'FUENTE_OFICIAL_PROTEGIDA' | 'PLANTILLA_FAREGAS' | 'BORRADOR_EXISTENTE';
      message: string;
    }>;
  },

  importarWordComoHtml: async (formatoId: number, file: File): Promise<{ version: FormatoVersion; advertencias: string[] }> => {
    const formData = new FormData();
    formData.append('archivo', file);
    const token = sessionStorage.getItem('faregasAccessToken');
    const res = await faregasFetch(`/formatos/${formatoId}/versiones/html/importar-docx`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'No se pudo convertir el documento Word a HTML.');
    }
    return res.json() as Promise<{ version: FormatoVersion; advertencias: string[] }>;
  },

  obtenerOperacionesPorFormato: async (formatoId: number): Promise<{ id: number; codigo: string; nombre: string; activo: boolean }[]> => {
    return faregasFetch(`/formatos/${formatoId}/operaciones`) as Promise<{ id: number; codigo: string; nombre: string; activo: boolean }[]>;
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

  activarVersion: async (formatoId: number, versionId: number): Promise<void> => {
    return faregasFetch(`/formatos/${formatoId}/versiones/${versionId}/activar`, {
      method: 'PUT',
    });
  },

  desactivarVersion: async (formatoId: number, versionId: number): Promise<void> => {
    return faregasFetch(`/formatos/${formatoId}/versiones/${versionId}/desactivar`, {
      method: 'PUT',
    });
  },

  eliminarVersion: async (formatoId: number, versionId: number): Promise<void> => {
    return faregasFetch(`/formatos/${formatoId}/versiones/${versionId}`, {
      method: 'DELETE',
    });
  },

  guardarConfiguracion: async (formatoId: number, versionId: number, configuracion: Record<string, unknown>): Promise<void> => {
    return faregasFetch(`/formatos/${formatoId}/versiones/${versionId}`, {
      method: 'PUT',
      body: JSON.stringify({ configuracion }),
    });
  },

  obtenerDisenoSistema: async (formatoId: number): Promise<EstadoDisenoSistema> => {
    return faregasFetch(`/formatos/${formatoId}/diseno-sistema`) as Promise<EstadoDisenoSistema>;
  },

  crearBorradorDisenoSistema: async (formatoId: number): Promise<{ version: VersionDisenoSistema; reutilizada: boolean }> => {
    return faregasFetch(`/formatos/${formatoId}/diseno-sistema/borrador`, {
      method: 'POST',
    }) as Promise<{ version: VersionDisenoSistema; reutilizada: boolean }>;
  },

  guardarBorradorDisenoSistema: async (
    formatoId: number,
    versionId: number,
    diseno: DisenoSistemaVisual
  ): Promise<{ message: string; version: VersionDisenoSistema }> => {
    return faregasFetch(`/formatos/${formatoId}/diseno-sistema/borrador/${versionId}`, {
      method: 'PUT',
      body: JSON.stringify({ diseno }),
    }) as Promise<{ message: string; version: VersionDisenoSistema }>;
  },

  previsualizarDisenoSistema: async (
    formatoId: number,
    diseno: DisenoSistemaVisual,
    versionId?: number
  ): Promise<{ html: string; diseno: DisenoSistemaVisual; codigo: string; nombre: string; capacidades: EstadoDisenoSistema['capacidades'] }> => {
    return faregasFetch(`/formatos/${formatoId}/diseno-sistema/preview`, {
      method: 'POST',
      body: JSON.stringify({ diseno, versionId: versionId || null }),
    }) as Promise<{ html: string; diseno: DisenoSistemaVisual; codigo: string; nombre: string; capacidades: EstadoDisenoSistema['capacidades'] }>;
  },

  activarBorradorDisenoSistema: async (
    formatoId: number,
    versionId: number
  ): Promise<{ message: string; version: VersionDisenoSistema }> => {
    return faregasFetch(`/formatos/${formatoId}/diseno-sistema/borrador/${versionId}/activar`, {
      method: 'PUT',
    }) as Promise<{ message: string; version: VersionDisenoSistema }>;
  },

  obtenerPreviewHtml: async (formatoId: number, versionId: number): Promise<string> => {
    const response = await faregasFetch(`/formatos/${formatoId}/versiones/${versionId}/preview`) as { html?: string };
    if (!response.html) throw new Error('El servidor no devolvió una previsualización HTML.');
    return response.html;
  },

};
