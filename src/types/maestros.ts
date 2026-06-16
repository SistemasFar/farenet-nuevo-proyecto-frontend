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
    tiposDocumento: MaestroOption[];
  };
}

export interface CuentaCorrienteOption extends MaestroOption {
  entidadfinanciera_key: string;
}

export interface MaestrosPagoResponse {
  status: string;
  data: {
    formasPago: MaestroOption[];
    tarjetas: MaestroOption[];
    entidadesFinancieras: MaestroOption[];
    cuentasCorrientes: CuentaCorrienteOption[];
  };
}
