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
      // Ignorar error de parseo
    }
    const error: any = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

export const faregasClientesApi = {
  autocompletarPersona: (tipoDocumento: string, nroDocumento: string) => 
    fetchWithToken(`/clientes/autocompletar/${tipoDocumento}/${nroDocumento}`),
    
  crearCliente: (data: { 
    tipoDocumento: string, 
    nroDocumento: string, 
    nombreRazonSocial: string,
    direccion?: string,
    telefono?: string,
    correo?: string
  }) => fetchWithToken('/clientes', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
