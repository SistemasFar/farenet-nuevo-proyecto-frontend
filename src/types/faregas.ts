export type TipoCertificadoFaregas = 'GNV_ANUAL' | 'GLP_ANUAL' | 'CONFORMIDAD' | null;

export interface CertificadoGlpData {
  tallerConversion: string;
  fechaConversion: string;
  // Componentes
  cilindroMarca: string;
  cilindroNroSerie: string;
  cilindroCapacidad: string;
  cilindroFechaFab: string;
  reguladorMarca: string;
  reguladorNroSerie: string;
  reguladorModelo: string;
  // Verificaciones técnicas TODO BACKEND FAREGAS
  observaciones: string;
}

export interface CertificadoGnvData {
  tallerConversion: string;
  fechaInstalacion: string;
  cilindroMarca: string;
  cilindroCapacidad: string;
  cilindroNroSerie: string;
  kitMarca: string;
  kitNroSerie: string;
  // Verificaciones TODO BACKEND FAREGAS
  tuberiaVentilacion: boolean;
  fugas: boolean;
  observaciones: string;
}

export interface CertificadoConformidadData {
  tipoConformidad: 'MODIFICACION' | 'MONTAJE' | 'FABRICACION';
  caracteristicasRegistrables: string;
  caracteristicasFinales: string;
  rectificacion: boolean;
  observaciones: string;
}

export interface VehiculoFaregas {
  // Datos heredados del maestro vehiculo (similar a Farenet)
  placa: string;
  marca: string;
  modelo: string;
  color: string;
  combustible: string;
  carroceria: string;
  nroMotor: string;
  nroSerie: string;
  anioFabricacion: string;
  nroAsientos: string;
  nroPasajeros: string;
  nroPisos: string;
}

export interface PropietarioFaregas {
  nroDocumento: string;
  tipoDocumento: string; // DNI, RUC
  nombres: string; // o Razon Social
  apellidos: string;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
}
