import type { LoginResponse } from '../types/auth';

const BASE_URL = 'http://127.0.0.1:3000/api';

export const authApi = {
  /**
   * Envía las credenciales al backend de Node para el login inicial.
   */
  loginAsync: async (username: string, password?: string, plantaKey?: string): Promise<LoginResponse> => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, plantaKey }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error en la autenticación.');
    }

    return response.json();
  },

  /**
   * 🚀 NUEVO: Confirma la sede operativa seleccionada por el usuario.
   * Envía la planta elegida al backend de Node para impactar e insertar en sesion_usuario.
   */
  confirmarPlantaAsync: async (username: string, plantaKey: string): Promise<LoginResponse> => {
    const response = await fetch(`${BASE_URL}/auth/confirmar-planta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, plantaKey }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al confirmar la sede operativa.');
    }

    return response.json();
  },

  /**
   * Notifica al backend el cierre de sesión lógico para limpiar la tabla sesion_usuario
   */
  logoutAsync: async (username: string): Promise<{ status: string; message: string }> => {
    const response = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al cerrar sesión.');
    }

    return response.json();
  }
};