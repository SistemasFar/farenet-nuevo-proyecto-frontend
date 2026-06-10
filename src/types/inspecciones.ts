export interface InspeccionRegistrada {
  numeroInspeccion: string;
  fechaHora: string;
  placa: string;
  comprobante: string;
  cliente: string;
  conceptoVehicular: string;
  linea: string;
  estado: string;
  numeroCertificado: string;
  resultado: string;
  estadoCertificado: string;
}

export interface BuscarInspeccionesRequest {
  plantaKey: string;
  numeroInspeccion?: string;
  placa?: string;
  comprobante?: string;
  cliente?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: string;
  page?: number;
  pageSize?: number;
}

export interface BuscarInspeccionesResponse {
  status: 'success' | 'error';
  plantaKey: string;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  data: InspeccionRegistrada[];
  message?: string;
}