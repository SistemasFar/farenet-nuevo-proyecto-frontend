export interface UserSession {
  username: string;
  perfilId: string;
  personaDocumento?: string;
  estado: boolean;
  userType: string;
}

export interface PlantaAsignada {
  key: string;
  nombre: string;
}

export interface LoginResponse {
  status: string;
  accessToken?: string;
  refreshToken?: string;
  user?: UserSession;
  permisos?: string[];
  plantas?: PlantaAsignada[]; // <-- AGREGA ESTA LÍNEA CRUCIAL
  plantaSeleccionada?: string;
  requiereSeleccionarPlanta?: boolean;
}