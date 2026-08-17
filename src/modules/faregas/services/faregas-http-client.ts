const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const request = async (
  endpoint: string,
  options: RequestInit = {},
  exposeResponseStatus = false,
) => {
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
    } catch {
      // Conservar el mensaje genérico cuando la respuesta no sea JSON.
    }

    const error = new Error(message) as Error & { status?: number };
    if (exposeResponseStatus) {
      error.status = response.status;
    }
    throw error;
  }

  return response.json();
};

export const faregasFetch = (endpoint: string, options: RequestInit = {}) =>
  request(endpoint, options);

export const faregasFetchWithStatus = (endpoint: string, options: RequestInit = {}) =>
  request(endpoint, options, true);
