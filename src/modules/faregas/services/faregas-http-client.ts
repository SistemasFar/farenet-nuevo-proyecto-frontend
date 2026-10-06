const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export type FaregasHttpError = Error & {
  status?: number;
  codigo?: string;
  detalles?: unknown;
};

export interface FaregasRequestInit extends RequestInit {
  handleUnauthorized?: boolean;
}

const request = async (
  endpoint: string,
  options: FaregasRequestInit = {},
  exposeResponseStatus = false,
) => {
  const { handleUnauthorized = true, ...fetchOptions } = options;
  const token = sessionStorage.getItem('faregasAccessToken');
  if (!token) throw new Error('No hay sesion activa en FAREGAS');

  const response = await fetch(`${API_URL}/faregas${endpoint}`, {
    ...fetchOptions,
    headers: {
      ...(fetchOptions.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${token}`,
      ...fetchOptions.headers,
    },
  });

  if (response.status === 401 && handleUnauthorized) {
    window.dispatchEvent(new CustomEvent('unauthorized-error'));
  }

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

export const faregasFetch = (endpoint: string, options: FaregasRequestInit = {}) =>
  request(endpoint, options);

export const faregasFetchWithStatus = (endpoint: string, options: FaregasRequestInit = {}) =>
  request(endpoint, options, true);
