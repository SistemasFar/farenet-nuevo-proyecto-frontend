export interface MaestroOption {
  key: string;
  nombre: string;
}

export interface MaestroAbreviaturaOption extends MaestroOption {
  abreviatura?: string;
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
    tiposCertificado: MaestroOption[];
    tiposAutorizacion: MaestroOption[];
  };
}
