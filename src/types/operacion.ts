export interface InspeccionPanel {
  numeroInspeccion: string;
  fechaHora: string;
  placa: string;
  comprobante: string;
  conceptoVehicular: string;
  linea: string;
  estado: string;
  numeroCertificado: string;
  resultado: string;
  estadoCertificado: string;
}

export interface InspeccionesFiltroRequest {
  plantaKey: string;
  fechaInicio?: string;
  fechaFin?: string;
  placa?: string;
  estado?: string;
  numeroInspeccion?: string;
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