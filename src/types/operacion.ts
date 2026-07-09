export interface InspeccionPanel {
  numeroInspeccion: string;
  fechaHora: string;
  placa: string;
  comprobante: string;

  clienteDocumento: string;
  clienteNombre: string;

  conceptoVehicular: string;
  linea: string;
  estado: string;

  posicion: number | null;
  estadoActual: string;

  numeroCertificado: string;
  resultado: string;
  estadoCertificado: string;

  estadoRaw?: string;
  etapa?: string;
  flujoActual?: string;
  puedeContinuarFlujo1?: boolean;
  puedeModificarFlujo1?: boolean;
  puedeFinalizarVerificacion?: boolean;
  debeAbrirFlujo2?: boolean;
  puedeAnular?: boolean;
  colorGrupo?: string;
  colorIntensidad?: number;
}

export interface InspeccionesFiltroRequest {
  plantaKey: string;
  fechaInicio?: string;
  fechaFin?: string;
  placa?: string;
  estado?: string;
  numeroInspeccion?: string;
  cliente?: string;
  page?: number;
  pageSize?: number;
}

export interface InspeccionesResponse {
  status: 'success' | 'error';
  plantaKey: string;
  fechaInicio: string;
  fechaFin: string;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  data: InspeccionPanel[];
  message?: string;
}
export type BuscarInspeccionesResponse = InspeccionesResponse;