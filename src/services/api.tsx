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

// TODO FASE JWT: Cambiar por la implementación final cuando se tenga autenticación JWT
const getAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('accessToken')?.trim();

  if (
    !token ||
    token.toLowerCase() === 'null' ||
    token.toLowerCase() === 'undefined'
  ) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

async function getErrorMessage(
  response: Response,
  defaultMessage: string
): Promise<string> {
  if (response.status === 401) {
    return 'Sesión expirada o no autenticada. Vuelva a iniciar sesión.';
  }
  if (response.status === 403) {
    return 'No tiene permisos para acceder a inspecciones de esta planta.';
  }
  if (response.status === 404) {
    return 'No se encontró la inspección.';
  }
  if (response.status === 500) {
    return 'Error interno al cargar Línea. Revise backend.';
  }

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

  const isPublicRoute = url.includes('/auth/login') || url.includes('/auth/confirmar-planta');
  const authHeaders = isPublicRoute ? {} : getAuthHeaders();

  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers || {})
    },
    signal: controller.signal
  };

  try {
    return await fetch(url, mergedOptions);
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
      'No se pudo conectar con el servidor.'
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
  buscarInfoDuplicado: async (placa: string, plantaKey?: string) => {
    const url = plantaKey 
      ? `${BASE_URL}/inspecciones/buscar-info-duplicado/${placa}?plantaKey=${plantaKey}`
      : `${BASE_URL}/inspecciones/buscar-info-duplicado/${placa}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      const errorData = await parseJsonResponse<{message?: string}>(response).catch(() => ({}));
      throw new Error(errorData.message || 'Error al buscar info duplicado');
    }
    return await parseJsonResponse<any>(response);
  },
  guardarDuplicado: async (data: any) => {
    const response = await fetchWithTimeout(`${BASE_URL}/inspecciones/guardar-duplicado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await parseJsonResponse<{message?: string}>(response).catch(() => ({}));
      throw new Error(errorData.message || 'Error al guardar duplicado');
    }
    return await parseJsonResponse<any>(response);
  },
  buscar: async (params: any) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithTimeout(`${BASE_URL}/inspecciones/buscar?${query}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Error al buscar inspecciones');
    return await parseJsonResponse<any>(response);
  },
  consultarVehiculoRapido: async (placa: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/inspecciones/vehiculo-rapido/${placa}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Error al consultar vehículo rápido');
    return await parseJsonResponse<any>(response);
  },
  consultarReinspeccionesActivas: async (placa: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/inspecciones/reinspecciones-activas/${placa}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Error al consultar reinspecciones activas');
    return await parseJsonResponse<any>(response);
  },
  validarCuponidad: async (codigo: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/inspecciones/cuponidad/validar/${codigo}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al validar código de Cuponidad');
    }
    return await parseJsonResponse<any>(response);
  },
  consultarVehiculoYCaja: async (data: any) => {
    const response = await fetchWithTimeout(`${BASE_URL}/inspecciones/consultar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errMsg = await getErrorMessage(response, 'Error al consultar datos');
      throw new Error(errMsg);
    }
    return await parseJsonResponse<any>(response);
  },
  buscarDescuentos: async (documento: string, concepto: string, placaContexto?: string, soloDniCodigo?: boolean) => {
    let url = `${BASE_URL}/inspecciones/descuentos?documento=${documento}&concepto=${concepto}`;
    if (placaContexto) url += `&placaContexto=${placaContexto}`;
    if (soloDniCodigo !== undefined) url += `&soloDniCodigo=${soloDniCodigo}`;

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const errMsg = await getErrorMessage(response, 'Error al buscar descuentos');
      throw new Error(errMsg);
    }
    return await parseJsonResponse<any>(response);
  },
  consumirDescuento: async (source_table: string, source_id: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/descuentos/consumir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_table, source_id })
    });
    if (!response.ok) {
      const errMsg = await getErrorMessage(response, 'Error al consumir descuento');
      throw new Error(errMsg);
    }
    return await parseJsonResponse<any>(response);
  },
  consultarReinspeccion: async (placa: string, concepto: string, planta: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/inspecciones/reinspeccion/${placa}/${concepto}/${planta}`, {
      method: 'GET'
    });
    if (!response.ok) {
      const errMsg = await getErrorMessage(response, 'Error al consultar reinspección');
      throw new Error(errMsg);
    }
    return await parseJsonResponse<any>(response);
  },
  validarDescuentosYReinspeccion: async (placa: string, plantaKey: string, concepto: string, ruc?: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/descuentos/validar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placa, plantaKey, concepto, ruc })
    });
    if (!response.ok) {
      const errMsg = await getErrorMessage(response, 'Error al validar descuentos y reinspección');
      throw new Error(errMsg);
    }
    return await parseJsonResponse<any>(response);
  },

  anularInspeccion: async (nroInspeccion: string, payload: { motivo: string; observacion: string }) => {
    const response = await fetchWithTimeout(`${BASE_URL}/inspecciones/${encodeURIComponent(nroInspeccion)}/anular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errMsg = await getErrorMessage(response, 'Error al anular inspección');
      throw new Error(errMsg);
    }
    return await parseJsonResponse<any>(response);
  },

  guardar: async (data: any) => {
    const response = await fetchWithTimeout(`${BASE_URL}/inspecciones/guardar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errMsg = await getErrorMessage(response, 'Error al guardar inspeccion');
      throw new Error(errMsg);
    }
    return await parseJsonResponse<any>(response);
  },
  generarNroInspeccion: async (plantaKey: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/inspecciones/generar-nro/${plantaKey}`, {
      method: 'GET'
    });
    if (!response.ok) throw new Error('Error al generar Nro Inspección');
    return await parseJsonResponse<any>(response);
  },
  guardarProceso: async (data: any) => {
    const response = await fetchWithTimeout(`${BASE_URL}/inspecciones/guardar/proceso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error al guardar progreso de inspección');
    return await parseJsonResponse<any>(response);
  },
  obtenerProceso: async (nrodocumentoinspeccion: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/inspecciones/proceso/${nrodocumentoinspeccion}`, {
      method: 'GET'
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Error al obtener proceso de inspección');
    }
    return await parseJsonResponse<any>(response);
  },


  errorImpresion: async (nroInspeccion: string, payload: { motivo: string; observacion: string }) => {
    const response = await fetchWithTimeout(`${BASE_URL}/inspecciones/${encodeURIComponent(nroInspeccion)}/error-impresion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errMsg = await getErrorMessage(response, 'Error al reportar impresión');
      throw new Error(errMsg);
    }
    return await parseJsonResponse<any>(response);
  },

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

export const externosApi = {
  consultarDni: async (numero: string): Promise<any> => {
    const response = await fetchWithTimeout(`${BASE_URL}/externos/dni/${numero}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Error al consultar DNI.'));
    return parseJsonResponse<any>(response);
  },
  consultarRuc: async (numero: string): Promise<any> => {
    const response = await fetchWithTimeout(`${BASE_URL}/externos/ruc/${numero}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Error al consultar RUC.'));
    return parseJsonResponse<any>(response);
  }
};

export const vehiculoApi = {
  buscarPorPlaca: async (placa: string): Promise<any> => {
    const response = await fetchWithTimeout(`${BASE_URL}/vehiculo/buscar/${placa}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(await getErrorMessage(response, 'Error al buscar vehículo.'));
    }
    return parseJsonResponse<any>(response);
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

import type { MaestrosCajaResponse, MaestrosPagoResponse, MaestrosVehiculoResponse } from '../types/maestros';

export const maestrosApi = {
  obtenerMaestrosCajaAsync: async (): Promise<MaestrosCajaResponse> => {
    const response = await fetchWithTimeout(`${BASE_URL}/maestros/caja`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(response, 'Error al obtener maestros.')
      );
    }

    return parseJsonResponse<MaestrosCajaResponse>(response);
  },

  obtenerIngenierosAsync: async (plantaKey: string): Promise<{ ok: boolean, planta: string, ingenieros: any[] }> => {
    const response = await fetchWithTimeout(`${BASE_URL}/maestros/ingenieros/${plantaKey}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(response, 'Error al obtener ingenieros.')
      );
    }

    return parseJsonResponse<{ ok: boolean, planta: string, ingenieros: any[] }>(response);
  },

  obtenerPrecioConceptoAsync: async (plantaKey: string, conceptoKey: string): Promise<{ status: string, data: { precio: number } }> => {
    const response = await fetchWithTimeout(`${BASE_URL}/maestros/precio?planta_key=${plantaKey}&concepto_key=${conceptoKey}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(response, 'Error al obtener precio del concepto.')
      );
    }

    return parseJsonResponse<{ status: string, data: { precio: number } }>(response);
  },

  obtenerMaestrosPagoAsync: async (): Promise<MaestrosPagoResponse> => {
    const response = await fetchWithTimeout(`${BASE_URL}/maestros/pago`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(response, 'Error al obtener maestros de pago.')
      );
    }

    return parseJsonResponse<MaestrosPagoResponse>(response);
  },

  obtenerMaestrosVehiculoAsync: async (): Promise<MaestrosVehiculoResponse> => {
    const response = await fetchWithTimeout(`${BASE_URL}/maestros/vehiculo`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(response, 'Error al obtener maestros de vehículo.')
      );
    }

    return parseJsonResponse<MaestrosVehiculoResponse>(response);
  },

  buscarModelosAsync: async (query: string): Promise<{ status: string, data: { key: string, nombre: string }[] }> => {
    const response = await fetchWithTimeout(`${BASE_URL}/maestros/vehiculo/modelos?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(response, 'Error al buscar modelos de vehículo.')
      );
    }

    return parseJsonResponse<{ status: string, data: { key: string, nombre: string }[] }>(response);
  },

  buscarColoresAsync: async (query: string): Promise<{ status: string, data: { key: string, nombre: string }[] }> => {
    const response = await fetchWithTimeout(`${BASE_URL}/maestros/vehiculo/colores?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(response, 'Error al buscar colores.')
      );
    }

    return parseJsonResponse<{ status: string, data: { key: string, nombre: string }[] }>(response);
  },

  agregarMaestroAsync: async (tabla: string, nombre: string): Promise<{ status: string, message: string, data: { key: string, nombre: string } }> => {
    const response = await fetchWithTimeout(`${BASE_URL}/maestros/agregar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tabla, nombre })
    });

    if (!response.ok) {
      throw new Error(
        await getErrorMessage(response, `Error al agregar a ${tabla}.`)
      );
    }

    return parseJsonResponse<{ status: string, message: string, data: { key: string, nombre: string } }>(response);
  },

  obtenerMaestrosPropietario: async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/maestros/propietario`);
    return parseJsonResponse(response);
  },

  obtenerProvincias: async (departamento_key: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/maestros/provincias/${departamento_key}`);
    return parseJsonResponse(response);
  },

  obtenerDistritos: async (provincia_key: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/maestros/distritos/${provincia_key}`);
    return parseJsonResponse(response);
  },

  obtenerMaestrosVerificacionAsync: async () => {
    const response = await fetchWithTimeout(`${BASE_URL}/maestros/verificacion`);
    return parseJsonResponse<any>(response);
  },

  obtenerLineasPorPlantaAsync: async (plantaKey: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/maestros/lineas/${plantaKey}`);
    return parseJsonResponse<any>(response);
  }
};

export const lineaApi = {
  obtenerPrevisualizacion: async (nroInspeccion: string) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/linea/previsualizacion/${nroInspeccion}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Error al obtener previsualización:', error);
      throw error;
    }
  },

  traspasarResultados: async (
    nroInspeccionAnulada: string,
    inspeccionNueva: string,
    placaNueva: string
  ): Promise<any> => {
    try {
      const response = await axiosInstance.post(
        `/api/inspecciones/${nroInspeccionAnulada}/traspaso-resultados`,
        {
          inspeccionNueva,
          placaNueva
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error en traspaso de resultados:', error);
      throw error;
    }
  },

  obtenerCertificadoOficial: async (nroInspeccion: string) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/linea/certificado-oficial/${nroInspeccion}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Error al obtener certificado oficial:', error);
      throw error;
    }
  },
  obtenerInformeVisualizacion: async (nroInspeccion: string) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/linea/informe-visualizacion/${nroInspeccion}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching informe visualizacion:', error);
      throw error;
    }
  },
  obtenerWizardModel: async (nroInspeccion: string) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/linea/wizard/${nroInspeccion}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Error al obtener modelo wizard'));
      }

      return await parseJsonResponse<any>(response);
    } catch (error: any) {
      console.error('Error fetching wizard model:', error);
      return { ok: false, message: error.message || 'Error de conexión.' };
    }
  },
  anularInspeccion: async (nroInspeccion: string, motivo: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/linea/consolidacion/${nroInspeccion}/anular`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ motivo })
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Error al anular la inspección.'));
    }

    return await parseJsonResponse<any>(response);
  },
  obtenerEstadoLinea: async (nroInspeccion: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/linea/estado/${nroInspeccion}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Error al obtener estado de línea'));
    }

    return parseJsonResponse<any>(response);
  },

  obtenerConsolidacion: async (nroInspeccion: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/linea/consolidacion/${nroInspeccion}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(await getErrorMessage(response, 'Error al obtener consolidación de línea'));
    }

    return parseJsonResponse<any>(response);
  },

  obtenerPropietario: async (nroInspeccion: string) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/linea/propietario/${nroInspeccion}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error('Sesión expirada o no autenticada.');
        if (response.status === 403) throw new Error('No tiene permisos para modificar propietarios de esta planta.');
        if (response.status === 404) throw new Error('No se encontró propietario para esta inspección.');
        if (response.status === 500) throw new Error('Error interno al cargar propietario.');
        throw new Error(await getErrorMessage(response, 'Error interno al cargar propietario.'));
      }

      return await parseJsonResponse<any>(response);
    } catch (error: any) {
      console.error('Error fetching propietario:', error);
      throw error;
    }
  },

  obtenerRecibo: async (nroInspeccion: string) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/linea/recibo/${nroInspeccion}`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Error al obtener recibo'));
      }
      return await parseJsonResponse<any>(response);
    } catch (error: any) {
      console.error('Error al obtener recibo:', error);
      throw error;
    }
  },

  modificarPropietario: async (nroInspeccion: string, data: any) => {
    try {
      const response = await fetchWithTimeout(`${BASE_URL}/linea/propietario/${nroInspeccion}`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        if (response.status === 400) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Error de validación.');
        }
        if (response.status === 401) throw new Error('Sesión expirada o no autenticada.');
        if (response.status === 403) throw new Error('No tiene permisos para modificar propietarios de esta planta.');
        if (response.status === 409) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Solo se puede modificar propietario antes de consolidar.');
        }
        throw new Error(await getErrorMessage(response, 'Error interno al actualizar propietario.'));
      }

      return await parseJsonResponse<any>(response);
    } catch (error: any) {
      console.error('Error al modificar propietario:', error);
      throw error;
    }
  },

  guardarDatosConsolidacion: async (nroInspeccion: string, data: any) => {
    const response = await fetchWithTimeout(`${BASE_URL}/linea/consolidacion/${nroInspeccion}/datos`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Error al guardar datos de consolidación.'));
    return parseJsonResponse<any>(response);
  },

  registrarPoliza: async (nroInspeccion: string, data: any) => {
    const response = await fetchWithTimeout(`${BASE_URL}/linea/consolidacion/${nroInspeccion}/poliza`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Error al registrar póliza.'));
    return parseJsonResponse<any>(response);
  },

  cambiarLinea: async (nroInspeccion: string, lineaKey: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/linea/consolidacion/${nroInspeccion}/linea`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineaKey })
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Error al cambiar línea.'));
    return parseJsonResponse<any>(response);
  },

  cambiarMotor: async (nroInspeccion: string, nroMotor: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/linea/consolidacion/${nroInspeccion}/motor`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ nroMotor })
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Error al cambiar motor.'));
    return parseJsonResponse<any>(response);
  },

  cambiarFirma: async (nroInspeccion: string, ingenieroCertificadorUsername: string) => {
    const response = await fetchWithTimeout(`${BASE_URL}/linea/consolidacion/${nroInspeccion}/firma`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingenieroCertificadorUsername })
    });
    if (!response.ok) throw new Error(await getErrorMessage(response, 'Error al cambiar firma.'));
    return parseJsonResponse<any>(response);
  }
};