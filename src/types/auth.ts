export interface UserSession {
  username: string;
  nombreCompleto?: string;
  perfilId: string;
  personaDocumento?: string;
  estado?: boolean;
  userType?: string;
}

export interface EmpresaAsignada {
  key: string;
  nombre: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  logoUrl?: string;
}

export interface PlantaAsignada {
  key: string;
  nombre: string;
}

export interface LoginResponse {
  status?: string;
  message?: string;

  accessToken?: string;
  refreshToken?: string;

  user?: UserSession;
  permisos?: string[];

  plantas?: PlantaAsignada[];
  empresas?: EmpresaAsignada[];

  plantaSeleccionada?: PlantaAsignada | null;

  requiereSeleccionarPlanta?: boolean;
}

export interface CambiarPlantaResponse {
  status: string;
  accessToken?: string;
  refreshToken?: string;
  plantaSeleccionada: PlantaAsignada;
  permisos?: string[];
  message?: string;
}

export interface PermisosResponse {
  status: string;
  username: string;
  plantaKey?: string | null;
  permisos: string[];
  message?: string;
}