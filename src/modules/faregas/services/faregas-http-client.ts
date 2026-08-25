const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export type FaregasHttpError = Error & {
  status?: number;
  codigo?: string;
  detalles?: unknown;
};

const request = async (
  endpoint: string,
  options: RequestInit = {},
  exposeResponseStatus = false,
) => {
  const token = sessionStorage.getItem('faregasAccessToken');
  if (!token) throw new Error('No hay sesion activa en FAREGAS');

  const response = await fetch(`${API_URL}/faregas${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = 'Error en la peticion';
    let codigo: string | undefined;
    let detalles: unknown;
    try {
      const errorData = await response.json();
      message = errorData.message || message;
      codigo = errorData.codigo;
      detalles = errorData.detalles;
    } catch {
      // Conservar el mensaje generico cuando la respuesta no sea JSON.
    }

    const error = new Error(message) as FaregasHttpError;
    error.codigo = codigo;
    error.detalles = detalles;
    if (exposeResponseStatus) error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
};

export const faregasFetch = (endpoint: string, options: RequestInit = {}) =>
  request(endpoint, options);

export const faregasFetchWithStatus = (endpoint: string, options: RequestInit = {}) =>
  request(endpoint, options, true);
