import type {
  LoginResponse,
  CambiarPlantaResponse
} from '../types/auth';

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:3000/api';

console.log('API URL:', BASE_URL);

async function getErrorMessage(
  response: Response,
  defaultMessage: string
): Promise<string> {
  const errorData = await response
    .json()
    .catch(() => ({}));

  return errorData.message || defaultMessage;
}

export const authApi = {
  loginAsync: async (
    username: string,
    password?: string
  ): Promise<LoginResponse> => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.trim(),
        password: password?.trim()
      }),
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Error en la autenticación.'
        )
      );
    }

    return response.json();
  },

  confirmarPlantaAsync: async (
    username: string,
    plantaKey: string
  ): Promise<LoginResponse> => {
    const response = await fetch(`${BASE_URL}/auth/confirmar-planta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.trim(),
        plantaKey
      }),
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Error al confirmar la sede operativa.'
        )
      );
    }

    return response.json();
  },

  cambiarPlantaAsync: async (
    username: string,
    plantaKey: string
  ): Promise<CambiarPlantaResponse> => {
    const response = await fetch(`${BASE_URL}/auth/cambiar-planta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.trim(),
        plantaKey
      }),
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Error al cambiar de sede.'
        )
      );
    }

    return response.json();
  },

  logoutAsync: async (
    username: string
  ): Promise<{
    status: string;
    message: string;
  }> => {
    const response = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.trim()
      }),
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Error al cerrar sesión.'
        )
      );
    }

    return response.json();
  }
};

export const plantaSession = {
  guardar: (plantaKey: string) => {
    sessionStorage.setItem(
      'plantaSeleccionada',
      plantaKey
    );
  },

  obtener: (): string => {
    return (
      sessionStorage.getItem('plantaSeleccionada') ||
      ''
    );
  },

  limpiar: () => {
    sessionStorage.removeItem(
      'plantaSeleccionada'
    );
  }
};