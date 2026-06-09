export interface UserSession {
  username: string;
  perfilId: string;
  personaDocumento?: string;
  estado?: boolean;
  userType?: string;
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

  plantaSeleccionada?: PlantaAsignada | null;

  requiereSeleccionarPlanta?: boolean;
}

export interface CambiarPlantaResponse {
  status: string;
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