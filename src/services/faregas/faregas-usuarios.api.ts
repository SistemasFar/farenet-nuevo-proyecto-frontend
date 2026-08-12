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

export const faregasUsuariosApi = {
  obtenerUsuarios: () => fetchWithToken('/usuarios'),
  crearUsuario: (data: any) => fetchWithToken('/usuarios', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  actualizarUsuario: (username: string, data: any) => fetchWithToken(`/usuarios/${username}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  cambiarPassword: (username: string, password: string) => fetchWithToken(`/usuarios/${username}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ password })
  }),
  eliminarUsuario: (username: string) => fetchWithToken(`/usuarios/${username}`, {
    method: 'DELETE'
  }),
  obtenerPerfiles: () => fetchWithToken('/usuarios/perfiles'),
  crearPerfil: (data: any) => fetchWithToken('/usuarios/perfiles', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  actualizarPerfil: (clave: string, data: any) => fetchWithToken(`/usuarios/perfiles/${clave}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  eliminarPerfil: (clave: string) => fetchWithToken(`/usuarios/perfiles/${clave}`, {
    method: 'DELETE'
  }),
  obtenerPlantas: () => fetchWithToken('/usuarios/plantas'),
  obtenerPermisos: () => fetchWithToken('/usuarios/permisos')
};
