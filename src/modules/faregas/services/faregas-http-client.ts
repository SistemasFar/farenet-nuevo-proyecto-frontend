const API_URL = import.meta.env.VITE_API_URL || '/api';

export type FaregasHttpError = Error & {
  status?: number;
  codigo?: string;
  detalles?: unknown;
  errores?: Record<string, string>;
  referencia?: string;
  response?: {
    status: number;
    data?: any;
  };
};

export interface FaregasRequestInit extends RequestInit {
  handleUnauthorized?: boolean;
}

const explicaciones: Partial<Record<number, string>> = {
  400: 'La solicitud tiene datos inválidos. Revisa los campos marcados antes de continuar.',
  401: 'La sesión no está activa. Vuelve a iniciar sesión en FAREGAS.',
  403: 'Tu cuenta no tiene acceso a esta acción. Verifica la sede activa y solicita al administrador revisar tus permisos.',
  404: 'El registro o recurso solicitado ya no está disponible. Actualiza el listado y verifica la sede.',
  409: 'El estado actual del registro impide esta acción. Actualiza el registro y revisa su estado antes de repetirla.',
  413: 'El archivo o los datos superan el tamaño permitido. Reduce el tamaño antes de volver a cargarlo.',
  415: 'El formato enviado no es compatible. Selecciona un tipo de archivo admitido.',
  422: 'La operación no cumple una validación. Revisa los campos y el estado del registro.',
  429: 'Se superó el número de solicitudes permitidas. Espera antes de volver a intentar.',
  502: 'Un servicio necesario respondió de forma inválida (HTTP 502). Consulta el estado de la operación antes de repetirla.',
  503: 'El servicio necesario para esta operación no está disponible. Consulta su estado con Sistemas.',
  504: 'Se agotó el tiempo de espera del servidor. Consulta el estado de la operación antes de repetirla.',
};

const accionPorCodigo: Record<string, string> = {
  PLANTA_NO_AUTORIZADA: 'Verifica la sede activa o solicita que te asignen acceso.',
  PAGO_INCOMPLETO: 'Abre Pagos y completa el saldo pendiente.',
  ORDEN_PAGO_FALTANTE: 'Registra primero la orden de pago del certificado.',
  CUENTA_FAREGAS_NO_CONFIGURADA: 'Solicita a Sistemas configurar la cuenta bancaria de FAREGAS.',
  CHIP_NO_DISPONIBLE: 'Actualiza el inventario de la sede y selecciona un chip disponible.',
  CHIP_OTRA_SEDE: 'Selecciona un chip de la sede activa o solicita su traslado.',
  SERIE_COMPROBANTE_NO_CONFIGURADA: 'Pide a Facturación habilitar para esta sede una serie del tipo de comprobante elegido.',
  EMPRESA_EMISORA_NO_CONFIGURADA: 'Pide a Sistemas vincular la sede con una empresa emisora activa.',
  NUBEFACT_CREDENCIALES_EMPRESA_FALTANTES: 'Pide a Sistemas revisar la configuración de NubeFact de la empresa emisora.',
  NUBEFACT_NOTA_NO_ACEPTADA: 'Abre el historial de la nota y consulta su estado y respuesta fiscal antes de reintentar.',
  DOCUMENTO_FISCAL_CORRECTIVO_EXISTENTE: 'Abre el historial del comprobante y revisa el documento correctivo activo.',
};

const texto = (valor: unknown) => typeof valor === 'string' ? valor.trim() : '';
const objeto = (valor: unknown) => valor && typeof valor === 'object' && !Array.isArray(valor)
  ? valor as Record<string, unknown> : undefined;
const esMensajeGenerico = (mensaje: string) => /^(?:error interno(?: del servidor)?|error inesperado|error http \d+|no se pudo completar la operación|no se pudo procesar la solicitud)[.!]?$/i.test(mensaje);

function mensajeHttp(status: number, data: Record<string, unknown> | undefined, codigo: string | undefined, referencia: string | undefined) {
  const base = texto(data?.message) || texto(data?.mensaje) || texto(data?.error);
  const detalles = objeto(data?.detalles);
  const diagnostico = objeto(detalles?.contingencia);
  const causa = texto(diagnostico?.descripcion);
  const detalleProveedor = texto(diagnostico?.mensajeOriginalNormalizado);
  const accion = codigo && Object.hasOwn(accionPorCodigo, codigo) ? accionPorCodigo[codigo] : '';
  const interno = status === 500 || (status >= 500 && !accion && !codigo);
  const mensaje = causa || (!interno && base && !esMensajeGenerico(base) ? base : '')
    || explicaciones[status] || (status >= 500
      ? 'El servidor encontró un error al procesar la operación. Consulta el estado del registro y comunícate con Sistemas.'
      : 'El servidor no pudo procesar la solicitud. Consulta el estado del registro antes de continuar.');

  // Los controladores de validación devuelven una lista de mensajes o errores por campo.
  // No se utiliza el motivo crudo del proveedor, que puede contener datos fiscales.
  const campos = objeto(data?.errores) || objeto(detalles?.errores);
  const lista = Array.isArray(data?.detalles) ? data.detalles
    : Array.isArray(detalles?.errores) ? detalles.errores : [];
  const validaciones = [400, 422].includes(status) || codigo === 'DATOS_NUBEFACT_INVALIDOS'
    ? [...(campos ? Object.values(campos) : []), ...lista]
      .map(item => texto(item) || texto(objeto(item)?.mensaje)).filter(item => item && item !== mensaje)
    : [];
  const seguimiento = texto(diagnostico?.seguimiento) || (status >= 500 ? referencia : undefined);
  return [...new Set([mensaje, detalleProveedor, ...validaciones.slice(0, 4), accion,
    seguimiento ? 'Referencia ' + seguimiento + '.' : ''].filter(Boolean))].join(' ');
}

export async function leerErrorFaregas(response: Response): Promise<FaregasHttpError> {
  let rawData: unknown;
  try { rawData = await response.json(); } catch { /* El proxy también puede devolver HTML. */ }
  const data = objeto(rawData);
  const codigo = texto(data?.codigo) || texto(data?.code) || undefined;
  const referencia = response.headers.get('X-FAREGAS-Referencia') || undefined;
  return Object.assign(new Error(mensajeHttp(response.status, data, codigo, referencia)), {
    status: response.status, codigo, detalles: data?.detalles,
    errores: data?.errores, referencia,
    response: { status: response.status, data: rawData },
  }) as FaregasHttpError;
}

async function request(endpoint: string, options: FaregasRequestInit = {}, descarga = false) {
  const { handleUnauthorized = true, ...fetchOptions } = options;
  const token = sessionStorage.getItem('faregasAccessToken');
  if (!token) throw new Error('La sesión no está activa. Vuelve a iniciar sesión en FAREGAS.');

  let response: Response;
  try {
    response = await fetch(API_URL + '/faregas' + endpoint, {
      ...fetchOptions,
      headers: {
        ...(descarga || fetchOptions.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        Authorization: 'Bearer ' + token,
        ...fetchOptions.headers,
      },
    });
  } catch (error) {
    if (fetchOptions.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
    const escritura = !/^(GET|HEAD)$/i.test(fetchOptions.method || 'GET');
    throw new Error(escritura
      ? 'Se perdió la comunicación con FAREGAS. Consulta si el cambio quedó registrado antes de volver a enviarlo.'
      : 'No se pudo conectar con FAREGAS. Verifica tu conexión y el estado del servidor.');
  }

  if (response.status === 401 && handleUnauthorized) {
    window.dispatchEvent(new CustomEvent('unauthorized-error'));
  }
  if (!response.ok) throw await leerErrorFaregas(response);
  if (descarga) return response.blob();
  if (response.status === 204) return null;
  return response.json();
}

export const faregasFetch = (endpoint: string, options: FaregasRequestInit = {}) =>
  request(endpoint, options);

export const faregasFetchWithStatus = faregasFetch;

export const faregasFetchBlob = (endpoint: string, options: FaregasRequestInit = {}): Promise<Blob> =>
  request(endpoint, options, true);
