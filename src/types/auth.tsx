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
  plantaSeleccionada?: string;
  requiereSeleccionarPlanta?: boolean;
}

export interface CambiarPlantaResponse {
  status: string;
  plantaSeleccionada: string;
  message?: string;
}

