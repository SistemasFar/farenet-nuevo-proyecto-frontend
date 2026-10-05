/**
 * VALIDACIÓN DEL FORMULARIO DE USUARIOS (crear y editar).
 *
 * Espejo de `modules/faregas/services/faregas-usuarios-validacion.service.js`.
 * Son dos capas con las MISMAS reglas: React marca el campo al instante y el
 * backend vuelve a comprobarlo, para que una llamada directa a la API no se
 * salte nada. Los tests fijan el mismo juego de casos en ambos lados.
 *
 * POR QUÉ ESTA CORRECCIÓN
 * ----------------------
 * El formulario ya tenía una comprobación de longitud para el documento:
 *
 *     if (formData.tipoDocumentoKey === '01' && ...length !== 8)
 *     if (formData.tipoDocumentoKey === '06' && ...length !== 11)
 *
 * Pero el catálogo real de `tipodocumentoidentidad` usa claves de texto, no
 * numéricas:
 *
 *     dni · ruc · pasaporte · carnetextranjeria · sindni
 *
 * `'01'` y `'06'` no existen nunca, así que la condición jamás era verdadera y
 * un DNI de 12 dígitos pasaba sin quejarse. Las reglas de abajo usan las claves
 * reales.
 *
 * REGLAS POR TIPO DE DOCUMENTO
 * ----------------------------
 *   dni               -> exactamente 8 dígitos, sólo numéricos.
 *   ruc               -> exactamente 11 dígitos, sólo numéricos.
 *   pasaporte         -> el modelo NO fija longitud, así que no se inventa una.
 *   carnetextranjeria -> igual que pasaporte.
 *   sindni            -> igual, sin longitud fija.
 *
 * Las longitudes salen de `persona.nrodocumentoidentidad`, que es varchar(20).
 *
 * CONTRASEÑA
 * ----------
 * No hay política de contraseña en el sistema: el login sólo compara bcrypt. No
 * se inventa una segunda. Al crear se exige contraseña y confirmación
 * coincidente; al editar, vacía significa "no cambiar", que es lo que ya hacía
 * el formulario.
 */

/** Anchos reales de las columnas. */
export const DOCUMENTO_MAXIMO = 20;
export const NOMBRE_MAXIMO = 200;   // persona.nombres / persona.apellidos
export const DIRECCION_MAXIMA = 500;
export const EMAIL_MAXIMO = 120;      // mas estricto que el varchar(150) de persona.email
export const TELEFONO_MAXIMO = 9;    // exactamente 9 digitos, sin signos ni espacios
export const USERNAME_MAXIMO = 255; // fg_usuario.username

export interface ReglaDocumento {
  longitud: number | null;
  soloDigitos: boolean;
  etiqueta: string;
  inputMode: 'numeric' | 'text';
  maxLength: number;
}

/**
 * `longitud: null` significa que el sistema no define longitud para ese tipo.
 * `maxLength` sale del ancho de la columna, no de una regla inventada.
 */
export const REGLAS_DOCUMENTO: Record<string, ReglaDocumento> = {
  dni: { longitud: 8, soloDigitos: true, etiqueta: 'DNI', inputMode: 'numeric', maxLength: 8 },
  ruc: { longitud: 11, soloDigitos: true, etiqueta: 'RUC', inputMode: 'numeric', maxLength: 11 },
  pasaporte: { longitud: null, soloDigitos: false, etiqueta: 'Pasaporte', inputMode: 'text', maxLength: DOCUMENTO_MAXIMO },
  carnetextranjeria: { longitud: null, soloDigitos: false, etiqueta: 'Carnet de extranjería', inputMode: 'text', maxLength: DOCUMENTO_MAXIMO },
  sindni: { longitud: null, soloDigitos: false, etiqueta: 'Sin DNI', inputMode: 'text', maxLength: DOCUMENTO_MAXIMO },
};

/** Nombres: letras (con tilde y ñ), espacios, apóstrofo y guion. Nada más. */
export const RE_NOMBRE = /^[\p{L}\s'’-]+$/u;
/** Email opcional: un arroba, un dominio con punto y sin espacios. */
export const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/**
 * Teléfono de ESTE formulario: exactamente 9 dígitos. Sin letras, sin espacios
 * y sin signos. Es lo que se guarda en `persona.telefono`.
 */
export const RE_TELEFONO = /^\d{9}$/;
/** Username: lo que el formulario ya permitía. No cambia la regla de acceso. */
export const RE_USERNAME = /^[a-zA-Z0-9_.-]+$/;

/** El tipo de documento elegido marca si se pide razón social o nombres. */
export const esRuc = (tipoDocumentoKey: string) =>
  String(tipoDocumentoKey || '').trim().toLowerCase() === 'ruc';

/** Atributos del input según el tipo: evita el ingreso claramente inválido. */
export const atributosDocumento = (tipoDocumentoKey: string) => {
  const regla = REGLAS_DOCUMENTO[String(tipoDocumentoKey || '').trim().toLowerCase()];
  if (!regla) return { inputMode: 'text' as const, maxLength: DOCUMENTO_MAXIMO, pattern: undefined };
  return {
    inputMode: regla.inputMode,
    maxLength: regla.longitud ?? DOCUMENTO_MAXIMO,
    pattern: regla.soloDigitos ? '^[0-9]+$' : undefined,
  };
};

/** Deja sólo dígitos: se usa al escribir, no para decidir si el valor es válido. */
export const normalizarSoloDigitos = (valor: string) => String(valor || '').replace(/\D/g, '');

/**
 * Normalización del campo Teléfono: deja sólo dígitos y corta a 9, para que el
 * operador no pueda escribir de más. Guardar igual exige 9 exactos.
 */
export const normalizarTelefono = (valor: string) =>
  String(valor || '').replace(/\D/g, '').slice(0, TELEFONO_MAXIMO);

const texto = (valor: unknown) =>
  String(valor === null || valor === undefined ? '' : valor).trim();

export function validarDocumento(tipoKey: string, valor: string): string | null {
  const documento = texto(valor);
  if (!documento) return 'Seleccione el número de documento.';
  const regla = REGLAS_DOCUMENTO[texto(tipoKey).toLowerCase()];
  if (!regla) return null;
  if (regla.soloDigitos && !/^[0-9]+$/.test(documento)) {
    return `El ${regla.etiqueta} debe contener solamente dígitos.`;
  }
  if (regla.longitud !== null && documento.length !== regla.longitud) {
    return `El ${regla.etiqueta} debe contener exactamente ${regla.longitud} dígitos.`;
  }
  if (documento.length > DOCUMENTO_MAXIMO) {
    return `El ${regla.etiqueta} no puede superar los ${DOCUMENTO_MAXIMO} caracteres.`;
  }
  return null;
}

/**
 * Username. La regla de caracteres NO cambia respecto de la que ya tenía el
 * formulario (`[a-zA-Z0-9_.-]`); sólo se le añade el trim y el rechazo de
 * "sólo espacios", que antes pasaban.
 */
export function validarUsername(valor: string): string | null {
  const username = texto(valor);
  if (!username) return 'El username es obligatorio.';
  if (!RE_USERNAME.test(username)) {
    return 'El username admite letras, números, punto, guion y guion bajo.';
  }
  if (username.length < 3) return 'El username debe tener al menos 3 caracteres.';
  if (username.length > USERNAME_MAXIMO) {
    return `El username no puede superar los ${USERNAME_MAXIMO} caracteres.`;
  }
  return null;
}

/** Dirección: trim, obligatoria y con un mínimo de 5. Sin regex. */
export function validarDireccion(valor: string): string | null {
  const direccion = texto(valor);
  if (!direccion) return 'La dirección es obligatoria.';
  if (direccion.length < 5) return 'La dirección debe tener al menos 5 caracteres.';
  if (direccion.length > DIRECCION_MAXIMA) {
    return `La dirección no puede superar los ${DIRECCION_MAXIMA} caracteres.`;
  }
  return null;
}

/** Teléfono: exactamente 9 dígitos, sin letras, espacios ni signos. */
export function validarTelefono(valor: string): string | null {
  const telefono = texto(valor);
  if (!telefono) return 'El teléfono es obligatorio.';
  if (!RE_TELEFONO.test(telefono)) return 'El teléfono debe contener exactamente 9 dígitos.';
  return null;
}

/** Email: sigue siendo opcional. Si viene algo, tiene que tener formato. */
export function validarEmail(valor: string): string | null {
  const email = texto(valor);
  if (!email) return null;
  if (!RE_EMAIL.test(email) || email.length > EMAIL_MAXIMO) {
    return 'Ingresa un correo electrónico válido.';
  }
  return null;
}

export function validarNombre(valor: string, etiqueta: 'nombre' | 'apellido'): string | null {
  const nombre = texto(valor);
  if (!nombre) return `El ${etiqueta} es obligatorio.`;
  if (!RE_NOMBRE.test(nombre)) {
    return `El ${etiqueta} sólo admite letras, espacios, apóstrofos y guiones.`;
  }
  if (nombre.length < 2) return `El ${etiqueta} debe tener al menos 2 caracteres.`;
  if (nombre.length > NOMBRE_MAXIMO) {
    return `El ${etiqueta} no puede superar los ${NOMBRE_MAXIMO} caracteres.`;
  }
  return null;
}

/** Orden en que se lleva el foco: el campo más arriba de la pantalla. */
export const ORDEN_ERRORES = [
  'username',
  'tipoDocumentoKey',
  'nroDocumento',
  'nombres',
  'apellidos',
  'nombreRazonSocial',
  'password',
  'confirmPassword',
  'paisKey',
  'departamentoKey',
  'provinciaKey',
  'distritoKey',
  'direccion',
  'telefono',
  'email',
] as const;

export type CampoUsuario = typeof ORDEN_ERRORES[number];
export type ErroresUsuario = Partial<Record<CampoUsuario, string>>;

export interface DatosUsuarioForm {
  username?: string;
  tipoDocumentoKey?: string;
  nroDocumento?: string;
  nombres?: string;
  apellidos?: string;
  nombreRazonSocial?: string;
  password?: string;
  confirmPassword?: string;
  paisKey?: string;
  departamentoKey?: string;
  provinciaKey?: string;
  distritoKey?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  personaContacto?: string;
  [campo: string]: unknown;
}

/**
 * Devuelve un objeto campo -> mensaje. Vacío significa que el formulario puede
 * enviarse. Sólo se valida un campo cuando tiene contenido, salvo los que están
 * marcados como obligatorios.
 */
export function validarFormularioUsuario(
  form: DatosUsuarioForm,
  modo: 'crear' | 'editar',
): ErroresUsuario {
  const errores: ErroresUsuario = {};
  const esCrear = modo !== 'editar';

  const errorUsername = validarUsername(form.username);
  if (errorUsername) errores.username = errorUsername;

  const tipoDocumentoKey = texto(form.tipoDocumentoKey);
  if (!tipoDocumentoKey) errores.tipoDocumentoKey = 'Seleccione el tipo de documento.';

  const regla = REGLAS_DOCUMENTO[tipoDocumentoKey.toLowerCase()];
  const documento = regla?.soloDigitos ? normalizarSoloDigitos(form.nroDocumento) : texto(form.nroDocumento);
  const errorDocumento = validarDocumento(tipoDocumentoKey, documento);
  if (errorDocumento) errores.nroDocumento = errorDocumento;

  // Con RUC se pide razón social; con documento personal, nombres y apellidos.
  if (esRuc(tipoDocumentoKey)) {
    const razon = texto(form.nombreRazonSocial);
    if (!razon) errores.nombreRazonSocial = 'La razón social es obligatoria.';
    else if (razon.length > 500) {
      errores.nombreRazonSocial = 'La razón social no puede superar los 500 caracteres.';
    }
  } else {
    const e1 = validarNombre(form.nombres || '', 'nombre');
    if (e1) errores.nombres = e1;
    const e2 = validarNombre(form.apellidos || '', 'apellido');
    if (e2) errores.apellidos = e2;
  }

  const direccion = texto(form.direccion);
  if (!direccion) errores.direccion = 'La dirección es obligatoria.';
  else if (direccion.length < 5) errores.direccion = 'La dirección debe tener al menos 5 caracteres.';
  else if (direccion.length > DIRECCION_MAXIMA) {
    errores.direccion = `La dirección no puede superar los ${DIRECCION_MAXIMA} caracteres.`;
  }

  const errorTelefono = validarTelefono(form.telefono);
  if (errorTelefono) errores.telefono = errorTelefono;

  // El email sigue siendo opcional: vacío es válido, con contenido debe tener
  // formato de correo.
  const errorEmail = validarEmail(form.email);
  if (errorEmail) errores.email = errorEmail;

  if (!texto(form.paisKey)) errores.paisKey = 'Seleccione el país.';
  if (!texto(form.departamentoKey)) errores.departamentoKey = 'Seleccione el departamento.';
  if (!texto(form.provinciaKey)) errores.provinciaKey = 'Seleccione la provincia.';
  if (!texto(form.distritoKey)) errores.distritoKey = 'Seleccione el distrito.';

  const password = String(form.password ?? '');
  const confirmPassword = String(form.confirmPassword ?? '');
  if (esCrear && !password) errores.password = 'La contraseña es obligatoria.';
  if (password && password !== confirmPassword) {
    errores.confirmPassword = 'Las contraseñas no coinciden.';
  }

  return errores;
}

/** El primer campo con error según el orden de la pantalla, para el foco. */
export function primerCampoConError(errores: ErroresUsuario): CampoUsuario | null {
  return ORDEN_ERRORES.find((campo) => Boolean(errores[campo])) || null;
}

export const tieneErrores = (errores: ErroresUsuario) => Object.keys(errores).length > 0;