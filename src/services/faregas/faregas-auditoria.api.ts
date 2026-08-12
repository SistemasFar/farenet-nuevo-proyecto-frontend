const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const fetchWithToken = async (endpoint: string, options: RequestInit = {}) => {
  const token = sessionStorage.getItem('faregasAccessToken');
  
  if (!token) {
    throw new Error('No hay sesión activa en FAREGAS');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_URL}/faregas${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'Error en la petición';
    try {
      const errorData = await response.json();
      message = errorData.message || message;
    } catch (e) {
      // Ignorar error de parseo si no es JSON
    }
    throw new Error(message);
  }

  return response.json();
};

export interface AuditoriaAccesoFiltro {
  username?: string;
  evento?: string;
  exitoso?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface AuditoriaAccesoFaregas {
  id: string;
  username: string | null;
  evento: string;
  exitoso: boolean;
  mensaje: string | null;
  planta_key: string | null;
  ip_direccion: string | null;
  user_agent: string | null;
  fecha_evento: string;
}

export const faregasAuditoriaApi = {
  listarAccesos: async (filtros: AuditoriaAccesoFiltro = {}): Promise<AuditoriaAccesoFaregas[]> => {
    const params = new URLSearchParams();
    if (filtros.username?.trim()) params.append('username', filtros.username.trim());
    if (filtros.evento?.trim()) params.append('evento', filtros.evento.trim());
    if (filtros.exitoso === 'true' || filtros.exitoso === 'false') params.append('exitoso', filtros.exitoso);
    if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
    if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);

    const queryString = params.toString();
    const endpoint = queryString ? `/auditoria/accesos?${queryString}` : '/auditoria/accesos';
    
    const response = await fetchWithToken(endpoint, { method: 'GET' });
    return response.data || [];
  }
};
