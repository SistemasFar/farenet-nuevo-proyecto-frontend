export interface MaestroOption {
  key: string;
  nombre: string;
}

export interface MaestroAbreviaturaOption {
  key: string;
  abreviatura?: string;
  abreviacion?: string;
  nombre?: string;
}

export interface MaestroIdOption {
  id: string;
  nombre: string;
}

export interface MaestrosCajaResponse {
  status: string;
  data: {
    tiposPlaca: MaestroIdOption[];
    conceptos: MaestroAbreviaturaOption[];
    categorias: MaestroOption[];
    tiposInspeccion: MaestroOption[];
    tiposCertificado: MaestroAbreviaturaOption[];
    tiposAutorizacion: MaestroOption[];
  };
}
