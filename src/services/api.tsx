import type {
  LoginResponse,
  CambiarPlantaResponse,
  PermisosResponse,
  PlantaAsignada
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
        plantaKey: plantaKey.trim()
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
        plantaKey: plantaKey.trim()
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

  obtenerPermisosAsync: async (
    username: string,
    plantaKey?: string
  ): Promise<PermisosResponse> => {
    const params = new URLSearchParams();

    if (plantaKey) {
      params.append('plantaKey', plantaKey.trim());
    }

    const queryString = params.toString();
    const url = queryString
      ? `${BASE_URL}/auth/permisos/${username.trim()}?${queryString}`
      : `${BASE_URL}/auth/permisos/${username.trim()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Error al obtener permisos.'
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
  guardar: (planta: PlantaAsignada | string) => {
    const plantaNormalizada: PlantaAsignada =
      typeof planta === 'string'
        ? { key: planta, nombre: planta }
        : planta;

    sessionStorage.setItem(
      'plantaSeleccionada',
      JSON.stringify(plantaNormalizada)
    );
  },

  obtener: (): PlantaAsignada | null => {
    const data = sessionStorage.getItem('plantaSeleccionada');

    if (!data) return null;

    try {
      const parsed = JSON.parse(data) as PlantaAsignada;

      if (!parsed?.key) return null;

      return parsed;
    } catch {
      return {
        key: data,
        nombre: data
      };
    }
  },

  limpiar: () => {
    sessionStorage.removeItem('plantaSeleccionada');
  }
};

export const permisosSession = {
  guardar: (permisos: string[] = []) => {
    sessionStorage.setItem(
      'permisos',
      JSON.stringify(permisos)
    );
  },

  obtener: (): string[] => {
    const data = sessionStorage.getItem('permisos');

    if (!data) return [];

    try {
      const parsed = JSON.parse(data);

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  limpiar: () => {
    sessionStorage.removeItem('permisos');
  }
};