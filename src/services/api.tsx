import type {
  LoginResponse,
  CambiarPlantaResponse,
  PermisosResponse,
  PlantaAsignada
} from '../types/auth';

import type {
  InspeccionesResponse,
  BuscarInspeccionesResponse
} from '../types/operacion';

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:3000/api';

console.log('API URL:', BASE_URL);

const TIMEOUT_MS = 10000;

async function getErrorMessage(
  response: Response,
  defaultMessage: string
): Promise<string> {
  const errorData = await response
    .json()
    .catch(() => ({}));

  return errorData.message || defaultMessage;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        'El servidor está tardando demasiado en responder. Intente nuevamente.'
      );
    }

    if (!navigator.onLine) {
      throw new Error(
        'No hay conexión a internet o red local. Verifique su conexión.'
      );
    }

    throw new Error(
      'No se pudo conectar con el servidor. Verifique que el backend esté encendido o que la red esté disponible.'
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function parseJsonResponse<T>(
  response: Response
): Promise<T> {
  try {
    return await response.json();
  } catch {
    throw new Error(
      'El servidor respondió con un formato inválido. Contacte con Sistemas.'
    );
  }
}

export const authApi = {
  loginAsync: async (
    username: string,
    password?: string
  ): Promise<LoginResponse> => {
    const response = await fetchWithTimeout(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username.trim(),
        password: password?.trim()
      })
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Usuario o contraseña incorrectos.'
        )
      );
    }

    return parseJsonResponse<LoginResponse>(response);
  },

  validarSesionAsync: async (
    username: string
  ): Promise<{
    status: string;
    message: string;
  }> => {
    const response = await fetchWithTimeout(`${BASE_URL}/auth/validar-sesion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username.trim()
      })
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'La sesión ha expirado. Inicie sesión nuevamente.'
        )
      );
    }

    return parseJsonResponse<{
      status: string;
      message: string;
    }>(response);
  },

  confirmarPlantaAsync: async (
    username: string,
    plantaKey: string
  ): Promise<LoginResponse> => {
    const response = await fetchWithTimeout(
      `${BASE_URL}/auth/confirmar-planta`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username.trim(),
          plantaKey: plantaKey.trim()
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Error al confirmar la sede operativa.'
        )
      );
    }

    return parseJsonResponse<LoginResponse>(response);
  },

  cambiarPlantaAsync: async (
    username: string,
    plantaKey: string
  ): Promise<CambiarPlantaResponse> => {
    const response = await fetchWithTimeout(`${BASE_URL}/auth/cambiar-planta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username.trim(),
        plantaKey: plantaKey.trim()
      })
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Error al cambiar de sede.'
        )
      );
    }

    return parseJsonResponse<CambiarPlantaResponse>(response);
  },

  obtenerPermisosAsync: async (
    username: string,
    plantaKey?: string
  ): Promise<PermisosResponse> => {
    const params = new URLSearchParams();

    if (plantaKey?.trim()) {
      params.append('plantaKey', plantaKey.trim());
    }

    const queryString = params.toString();

    const url = queryString
      ? `${BASE_URL}/auth/permisos/${username.trim()}?${queryString}`
      : `${BASE_URL}/auth/permisos/${username.trim()}`;

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Error al obtener permisos.'
        )
      );
    }

    return parseJsonResponse<PermisosResponse>(response);
  },

  logoutAsync: async (
    username: string
  ): Promise<{
    status: string;
    message: string;
  }> => {
    const response = await fetchWithTimeout(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username.trim()
      })
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Error al cerrar sesión.'
        )
      );
    }

    return parseJsonResponse<{
      status: string;
      message: string;
    }>(response);
  },

  cambiarContrasenaAsync: async (
    username: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ status: string; message: string }> => {
    const response = await fetchWithTimeout(`${BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim(),
        currentPassword,
        newPassword
      })
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Error al cambiar contraseña.'
        )
      );
    }

    return parseJsonResponse<{ status: string; message: string }>(response);
  }
};

export interface AuditoriaAcceso {
  id: number;
  username: string | null;
  evento: string;
  exitoso: boolean;
  mensaje: string | null;
  planta_key: string | null;
  ip_direccion: string | null;
  user_agent: string | null;
  fecha_evento: string;
}
export interface AuditoriaAccesoFiltro {
  username?: string;
  evento?: string;
  exitoso?: string;
  fechaInicio?: string;
  fechaFin?: string;
}
export const auditoriaApi = {
  listarAccesosAsync: async (
    filtros: AuditoriaAccesoFiltro = {}
  ): Promise<AuditoriaAcceso[]> => {
    const params = new URLSearchParams();

    if (filtros.username?.trim()) {
      params.append('username', filtros.username.trim());
    }

    if (filtros.evento?.trim()) {
      params.append('evento', filtros.evento.trim());
    }

    if (filtros.exitoso === 'true' || filtros.exitoso === 'false') {
      params.append('exitoso', filtros.exitoso);
    }

    if (filtros.fechaInicio) {
      params.append('fechaInicio', filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      params.append('fechaFin', filtros.fechaFin);
    }

    const queryString = params.toString();

    const url = queryString
      ? `${BASE_URL}/auditoria/accesos?${queryString}`
      : `${BASE_URL}/auditoria/accesos`;

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Error al consultar auditoría de acceso.'
        )
      );
    }

    const result = await parseJsonResponse<{
      status: string;
      data: AuditoriaAcceso[];
    }>(response);

    return result.data || [];
  }
};
export const operacionApi = {
  listarInspeccionesAsync: async (
    plantaKey: string,
    filtros?: {
      fechaInicio?: string;
      fechaFin?: string;
      placa?: string;
      estado?: string;
      numeroInspeccion?: string;
      lineaKey?: string;
      page?: number;
      pageSize?: number;
      cliente?: string;
    }
  ): Promise<InspeccionesResponse> => {
    const params = new URLSearchParams();

    params.append('plantaKey', plantaKey.trim());

    if (filtros?.fechaInicio?.trim()) {
      params.append('fechaInicio', filtros.fechaInicio.trim());
    }

    if (filtros?.fechaFin?.trim()) {
      params.append('fechaFin', filtros.fechaFin.trim());
    }

    if (filtros?.placa?.trim()) {
      params.append('placa', filtros.placa.trim());
    }

    if (filtros?.estado?.trim()) {
      params.append('estado', filtros.estado.trim());
    }

    if (filtros?.numeroInspeccion?.trim()) {
      params.append(
        'numeroInspeccion',
        filtros.numeroInspeccion.trim()
      );
    }
    if (filtros?.cliente?.trim()) {
  params.append('cliente', filtros.cliente.trim());
}

    if (filtros?.lineaKey?.trim()) {
      params.append('lineaKey', filtros.lineaKey.trim());
    }

    params.append('page', String(filtros?.page ?? 1));
    params.append('pageSize', String(filtros?.pageSize ?? 5));

    const response = await fetchWithTimeout(
      `${BASE_URL}/operacion/inspecciones-dia?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Error al obtener inspecciones.'
        )
      );
    }

    return parseJsonResponse<InspeccionesResponse>(response);
  },

  listarLineasAsync: async (plantaKey: string): Promise<{ key: string; nombre: string }[]> => {
    const response = await fetchWithTimeout(
      `${BASE_URL}/operacion/lineas/${plantaKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Error al obtener las líneas de la planta.'
        )
      );
    }

    const result = await parseJsonResponse<{ status: string; data: { key: string; nombre: string }[] }>(response);
    return result.data || [];
  }
};

export const inspeccionesApi = {
  buscarInspeccionesAsync: async (
    plantaKey: string,
    filtros?: {
      fechaInicio?: string;
      fechaFin?: string;
      numeroInspeccion?: string;
      placa?: string;
      comprobante?: string;
      cliente?: string;
      estado?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<BuscarInspeccionesResponse> => {
    const params = new URLSearchParams();

    params.append('plantaKey', plantaKey.trim());

    if (filtros?.fechaInicio?.trim()) {
      params.append('fechaInicio', filtros.fechaInicio.trim());
    }

    if (filtros?.fechaFin?.trim()) {
      params.append('fechaFin', filtros.fechaFin.trim());
    }

    if (filtros?.numeroInspeccion?.trim()) {
      params.append(
        'numeroInspeccion',
        filtros.numeroInspeccion.trim()
      );
    }

    if (filtros?.placa?.trim()) {
      params.append('placa', filtros.placa.trim());
    }

    if (filtros?.comprobante?.trim()) {
      params.append('comprobante', filtros.comprobante.trim());
    }

    if (filtros?.cliente?.trim()) {
      params.append('cliente', filtros.cliente.trim());
    }

    if (
      filtros?.estado?.trim() &&
      filtros.estado.trim().toUpperCase() !== 'TODOS'
    ) {
      params.append('estado', filtros.estado.trim());
    }

    params.append('page', String(filtros?.page ?? 1));
    params.append('pageSize', String(filtros?.pageSize ?? 10));

    const response = await fetchWithTimeout(
      `${BASE_URL}/inspecciones/buscar?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
          'Error al buscar inspecciones registradas.'
        )
      );
    }

    return parseJsonResponse<BuscarInspeccionesResponse>(response);
  }
};

export const plantaSession = {
  guardar: (planta: PlantaAsignada | string) => {
    const plantaNormalizada: PlantaAsignada =
      typeof planta === 'string'
        ? {
            key: planta,
            nombre: planta
          }
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

import type { MaestrosCajaResponse } from '../types/maestros';

export const maestrosApi = {
  obtenerMaestrosCajaAsync: async (): Promise<MaestrosCajaResponse> => {
    const response = await fetchWithTimeout(`${BASE_URL}/maestros/caja`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(response, 'Error al obtener maestros.')
      );
    }

    return parseJsonResponse<MaestrosCajaResponse>(response);
  }
};