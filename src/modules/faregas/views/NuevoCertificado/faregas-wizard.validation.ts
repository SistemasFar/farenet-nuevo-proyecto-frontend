import type { TipoCertificadoFaregas } from '../../types/faregas';
import type { CampoFormatoDinamicoFaregas } from '../../types/faregas-api';
import { combustiblesGnvSonEquivalentes, combustiblesSonEquivalentes, pesosGnvSonIguales } from './gnv-conversion';

type DatosAsistente = {
  tipoCertificado: TipoCertificadoFaregas;
  modalidad?: string;
  caja: Record<string, any>;
  vehiculo: Record<string, any>;
  titulares: Array<Record<string, any>>;
  gnv: Record<string, any>;
  glp: Record<string, any>;
  conformidad: Record<string, any>;
};

const vacio = (valor: unknown) => valor === null || valor === undefined || String(valor).trim() === '';

export const validarFormularioFormatoDinamico = (
  campos: CampoFormatoDinamicoFaregas[],
  valores: Record<string, string>
) => {
  const isEmpresaActiva = valores['__incluir_empresa'] === 'true';
  const errores: string[] = [];

  for (const campo of campos) {
    if (campo.optionalGroup?.toLowerCase() === 'empresa' && !isEmpresaActiva) {
      continue;
    }

    const valor = String(valores[campo.key] ?? '').trim();

    if (campo.requerido && !valor) {
      errores.push(`Complete ${campo.label.toLocaleLowerCase('es-PE')}.`);
      continue;
    }

    if (valor) {
      if (campo.minLength && valor.length < campo.minLength) {
        errores.push(`${campo.label}: mínimo ${campo.minLength} caracteres.`);
      }
      if (campo.pattern && !new RegExp(campo.pattern).test(valor)) {
        errores.push(`${campo.label}: ${campo.patternError || 'formato inválido'}`);
      }
    }
  }

  return errores;
};

export const esRucValido = (valor: unknown): boolean => {
  const ruc = String(valor ?? '').trim();
  if (!/^\d{11}$/.test(ruc)) return false;

  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((total, peso, index) => total + Number(ruc[index]) * peso, 0);
  const diferencia = 11 - (suma % 11);
  const digitoCalculado = diferencia === 10 ? 0 : diferencia === 11 ? 1 : diferencia;
  return digitoCalculado === Number(ruc[10]);
};

const agregarFaltantes = (
  errores: string[],
  datos: Record<string, any>,
  campos: Array<[string, string]>
) => {
  for (const [campo, etiqueta] of campos) {
    if (vacio(datos[campo])) errores.push(`Complete ${etiqueta}.`);
  }
};

export const validarDatosIniciales = (caja: Record<string, any>) => {
  const errores: string[] = [];
  agregarFaltantes(errores, caja, [
    ['tarifaCodigo', 'el servicio'],
    ['placa', 'la placa'],
  ]);
  if (caja.tipoCertificado !== 'CONFORMIDAD' && vacio(caja.modalidadCertificado)) {
    errores.push('Seleccione si el certificado es inicial o anual.');
  }
  return errores;
};

export const validarExpedienteTecnico = ({
  tipoCertificado,
  caja,
  vehiculo,
  titulares,
  gnv,
  glp,
  conformidad,
}: DatosAsistente) => {
  const errores: string[] = [];
  const base: Array<[string, string]> = [
    ['marca', 'la marca'], ['modelo', 'el modelo'], ['anioFabricacion', 'el año de fabricación'],
    ['numeroMotor', 'el número de motor'], ['numeroCilindros', 'el número de cilindros'],
    ['combustible', 'el combustible'], ['numeroEjes', 'el número de ejes'],
    ['numeroRuedas', 'el número de ruedas'], ['numeroAsientos', 'el número de asientos'],
    ['numeroPasajeros', 'el número de pasajeros'], ['longitud', 'el largo'],
    ['ancho', 'el ancho'], ['alto', 'el alto'], ['pesoNeto', 'el peso neto'],
    ['pesoBruto', 'el peso bruto'],
  ];

  if (vacio(caja.placa)) errores.push('Complete la placa.');
    if (vacio(vehiculo.vin) && vacio(vehiculo.serieChasis)) errores.push('Complete el VIN o la serie de chasis.');
  agregarFaltantes(errores, vehiculo, base);

  if (tipoCertificado === 'GNV_ANUAL' || tipoCertificado === 'GLP_ANUAL' || tipoCertificado === 'CONFORMIDAD') {
    agregarFaltantes(errores, vehiculo, [['version', 'la versión'], ['cilindrada', 'la cilindrada']]);
  }

  if (tipoCertificado === 'GNV_ANUAL') {
    agregarFaltantes(errores, vehiculo, [['color', 'el color']]);
    agregarFaltantes(errores, gnv, [['fechaVigencia', 'la vigencia GNV']]);
    const verificaciones = gnv.verificaciones || [];
    if (verificaciones.length !== 8 || verificaciones.some((item: any) => item.cumple !== true)) {
      errores.push('Las 8 verificaciones GNV deben estar evaluadas como CUMPLE.');
    }
  }

  if (tipoCertificado === 'GLP_ANUAL') {
    agregarFaltantes(errores, vehiculo, [['cargaUtil', 'la carga útil']]);
    agregarFaltantes(errores, glp, [
      ['tallerAutorizadoId', 'el taller autorizado'],
      ['fechaVigencia', 'la vigencia GLP'],
      ['expedienteTecnico', 'el número de expediente técnico'],
    ]);
    const componentes = glp.componentes || [];
    for (const tipo of ['CILINDRO', 'REGULADOR']) {
      const componente = componentes.find((item: any) => item.componente === tipo);
      if (!componente) {
        errores.push(`Registre el componente ${tipo}.`);
        continue;
      }
      agregarFaltantes(errores, componente, [['marca', `la marca del ${tipo}`], ['modelo', `el modelo del ${tipo}`]]);
      if (tipo === 'CILINDRO') {
        agregarFaltantes(errores, componente, [
          ['capacidadLitros', 'la capacidad del cilindro'], ['mesFabricacion', 'el mes de fabricación del cilindro'],
          ['anioFabricacion', 'el año de fabricación del cilindro'], ['numeroSerie', 'la serie del cilindro'],
        ]);
      }
    }
    const verificaciones = glp.verificaciones || [];
    if (verificaciones.length !== 7 || verificaciones.some((item: any) => item.cumple !== true)) {
      errores.push('Las 7 verificaciones GLP deben estar evaluadas como CUMPLE.');
    }
  }

  if (tipoCertificado === 'GLP_ANUAL' || tipoCertificado === 'CONFORMIDAD') {
    if (titulares.length === 0) errores.push('Registre al menos un titular del certificado.');
    titulares.forEach((titular, index) => {
      agregarFaltantes(errores, titular, [
        ['tipoDocumento', `el tipo de documento del titular ${index + 1}`],
        ['nroDocumento', `el documento del titular ${index + 1}`],
        ['nombreRazonSocial', `el nombre del titular ${index + 1}`],
      ]);
      if (tipoCertificado === 'CONFORMIDAD' && vacio(titular.direccion)) {
        errores.push(`Complete la dirección del titular ${index + 1}.`);
      }
    });
  }

  if (tipoCertificado === 'CONFORMIDAD') {
    agregarFaltantes(errores, vehiculo, [
      ['clase', 'la clase vehicular'], ['carroceria', 'la carrocería'], ['color', 'el color'],
      ['cargaUtil', 'la carga útil'], ['anioModelo', 'el año modelo'],
      ['formulaRodante', 'la fórmula rodante'], ['potencia', 'la potencia'],
    ]);
    if (vacio(conformidad.tipoConformidad)) { errores.push('Seleccione el tipo de conformidad.'); }
    agregarFaltantes(errores, conformidad, [
      ['tipoTramite', 'el tipo de trámite'],
      ['caracteristicaRegistrable', 'la característica registrable'], ['motivo', 'el motivo'],
      ['descripcion', 'la descripción'], ['usoOriginalVehiculo', 'el uso original del vehículo'],
    ]);
  }

  return [...new Set(errores)];
};

// ===========================================================================
// Validación por campo
//
// Las funciones anteriores devuelven una lista de textos y ya se usan en el
// guardado y en la emisión. Estas funciones son el mismo criterio expressed
// como "campo -> mensaje", que es lo que necesita la vista para marcar el
// control concreto, mostrar su mensaje ylimpiar su error al corregirlo.
//
// La fuente de verdad de qué es obligatorio es el backend: la lista de campos
// de `validarEmision` para cada tipo. Aquí se replica esa lista y se añaden
// reglas de formato (números y años) que el backend no comprueba porque confía
// en que el dato guardado ya es válido.
// ===========================================================================

export type ErroresCampo = Record<string, string>;

type FormatoNumerico = 'entero' | 'decimal';

/** Devuelve el número, o null si está vacío, o NaN si no es numérico. */
const leerNumero = (valor: unknown): number | null => {
  const texto = String(valor ?? '').trim().replace(',', '.');
  if (texto === '') return null;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : NaN;
};

const esEnteroPositivo = (valor: unknown): boolean => {
  const numero = leerNumero(valor);
  return numero !== null && !Number.isNaN(numero) && Number.isInteger(numero) && numero > 0;
};

const esDecimalPositivo = (valor: unknown): boolean => {
  const numero = leerNumero(valor);
  return numero !== null && !Number.isNaN(numero) && numero > 0;
};

const mensajeFormato = (etiqueta: string, formato: FormatoNumerico) =>
  `${etiqueta.charAt(0).toUpperCase()}${etiqueta.slice(1)} debe ser un número ${formato === 'entero' ? 'entero' : 'decimale'} mayor que cero.`;

type ReglaCampo = {
  campo: string;
  etiqueta: string;
  formato?: FormatoNumerico;
  /** Si se indica, el campo sólo es obligatorio para esos tipos. */
  tipos?: TipoCertificadoFaregas[];
};

/** Comunes a todo certificado técnico + las específicas de cada tipo. */
export const REGLAS_CAMPOS_TECNICOS: ReglaCampo[] = [
  { campo: 'marca', etiqueta: 'la marca' },
  { campo: 'modelo', etiqueta: 'el modelo' },
  { campo: 'anioFabricacion', etiqueta: 'el año de fabricación' },
  { campo: 'numeroMotor', etiqueta: 'el número de motor' },
  { campo: 'combustible', etiqueta: 'el combustible' },
  { campo: 'numeroCilindros', etiqueta: 'el número de cilindros', formato: 'entero' },
  { campo: 'numeroEjes', etiqueta: 'el número de ejes', formato: 'entero' },
  { campo: 'numeroRuedas', etiqueta: 'el número de ruedas', formato: 'entero' },
  { campo: 'numeroAsientos', etiqueta: 'el número de asientos', formato: 'entero' },
  { campo: 'numeroPasajeros', etiqueta: 'el número de pasajeros', formato: 'entero' },
  { campo: 'longitud', etiqueta: 'el largo', formato: 'decimal' },
  { campo: 'ancho', etiqueta: 'el ancho', formato: 'decimal' },
  { campo: 'alto', etiqueta: 'el alto', formato: 'decimal' },
  { campo: 'pesoNeto', etiqueta: 'el peso neto', formato: 'decimal' },
  { campo: 'pesoBruto', etiqueta: 'el peso bruto', formato: 'decimal' },
  { campo: 'categoria', etiqueta: 'la categoría vehicular', tipos: ['GNV_ANUAL', 'GLP_ANUAL', 'CONFORMIDAD'] },
  { campo: 'version', etiqueta: 'la versión', tipos: ['GNV_ANUAL', 'GLP_ANUAL', 'CONFORMIDAD'] },
  { campo: 'cilindrada', etiqueta: 'la cilindrada', tipos: ['GNV_ANUAL', 'GLP_ANUAL', 'CONFORMIDAD'] },
  { campo: 'color', etiqueta: 'el color', tipos: ['GNV_ANUAL', 'GLP_ANUAL', 'CONFORMIDAD'] },
  { campo: 'cargaUtil', etiqueta: 'la carga útil', tipos: ['GLP_ANUAL', 'CONFORMIDAD'] },
  { campo: 'clase', etiqueta: 'la clase vehicular', tipos: ['CONFORMIDAD'] },
  { campo: 'carroceria', etiqueta: 'la carrocería', tipos: ['CONFORMIDAD'] },
  { campo: 'anioModelo', etiqueta: 'el año modelo', tipos: ['CONFORMIDAD'] },
  { campo: 'formulaRodante', etiqueta: 'la fórmula rodante', tipos: ['CONFORMIDAD'] },
  { campo: 'potencia', etiqueta: 'la potencia', tipos: ['CONFORMIDAD'] },
];

const aplicaAlTipo = (regla: ReglaCampo, tipo: TipoCertificadoFaregas) =>
  !regla.tipos || regla.tipos.includes(tipo);

const marcar = (errores: ErroresCampo, campo: string, mensaje: string) => {
  if (!errores[campo]) errores[campo] = mensaje;
};

/**
 * Valida un campo con la regla dada: vacío o mal formado. Devuelve el mensaje
 * cuando corresponde, o undefined cuando el valor es válido.
 */
const errorDeCampo = (
  valor: unknown,
  regla: ReglaCampo
): string | undefined => {
  if (vacio(valor)) return `Complete ${regla.etiqueta}.`;
  if (regla.formato === 'entero' && !esEnteroPositivo(valor)) {
    return mensajeFormato(regla.etiqueta, 'entero');
  }
  if (regla.formato === 'decimal' && !esDecimalPositivo(valor)) {
    return mensajeFormato(regla.etiqueta, 'decimal');
  }
  return undefined;
};

export const validarCamposTecnicos = (
  tipo: TipoCertificadoFaregas,
  vehiculo: Record<string, any>
): ErroresCampo => {
  const errores: ErroresCampo = {};
  for (const regla of REGLAS_CAMPOS_TECNICOS) {
    if (!aplicaAlTipo(regla, tipo)) continue;
    const mensaje = errorDeCampo(vehiculo[regla.campo], regla);
    if (mensaje) marcar(errores, regla.campo, mensaje);
  }
  return errores;
};

/**
 * VIN y serie de chasis son alternatives: basta con uno de los dos, igual que
 * en el backend. Si faltan ambos se marca el VIN, que es el primero visible.
 */
export const validarIdentificacionVehiculo = (vehiculo: Record<string, any>): ErroresCampo => {
  // Basta con uno de los dos, igual que en el backend. Sólo es error cuando
  // faltan ambos; se marca el VIN porque es el primero visible del formulario.
  if (!vacio(vehiculo.vin) || !vacio(vehiculo.serieChasis)) return {};
  return { vin: 'Complete el VIN o la serie de chasis.' };
};

/**
 * Regla de años ya existente: el año modelo no puede ser posterior al de
 * fabricación. Se marca el año modelo, que es el dato que se corregiría.
 */
export const validarAniosVehiculo = (vehiculo: Record<string, any>): ErroresCampo => {
  const modelo = leerNumero(vehiculo.anioModelo);
  const fabricacion = leerNumero(vehiculo.anioFabricacion);
  if (modelo === null || fabricacion === null) return {};
  if (Number.isNaN(modelo) || Number.isNaN(fabricacion)) return {};
  if (modelo > fabricacion) {
    return { anioModelo: 'El Año Modelo no puede ser mayor que el Año de Fabricación.' };
  }
  return {};
};

const CAMPOS_DATOS_INICIALES: ReglaCampo[] = [
  { campo: 'tarifaCodigo', etiqueta: 'el servicio' },
  { campo: 'placa', etiqueta: 'la placa' },
];

export const validarDatosInicialesCampos = (caja: Record<string, any>): ErroresCampo => {
  const errores: ErroresCampo = {};
  for (const regla of CAMPOS_DATOS_INICIALES) {
    const mensaje = errorDeCampo(caja[regla.campo], regla);
    if (mensaje) marcar(errores, regla.campo, mensaje);
  }
  if (caja.tipoCertificado !== 'CONFORMIDAD' && vacio(caja.modalidadCertificado)) {
    marcar(errores, 'modalidadCertificado', 'Seleccione si el certificado es inicial o anual.');
  }
  return errores;
};

/** Titulares: al menos uno, y cada uno con documento y nombre. */
export const validarTitulares = (
  titulares: Array<Record<string, any>>,
  tipo: TipoCertificadoFaregas
): ErroresCampo => {
  const errores: ErroresCampo = {};
  if (tipo !== 'GLP_ANUAL' && tipo !== 'CONFORMIDAD') return errores;
  if (titulares.length === 0) {
    return { titulares: 'Registre al menos un titular del certificado.' };
  }
  titulares.forEach((titular, indice) => {
    const numero = indice + 1;
    const reglas: ReglaCampo[] = [
      { campo: 'tipoDocumento', etiqueta: `el tipo de documento del titular ${numero}` },
      { campo: 'nroDocumento', etiqueta: `el documento del titular ${numero}` },
      { campo: 'nombreRazonSocial', etiqueta: `el nombre del titular ${numero}` },
    ];
    if (tipo === 'CONFORMIDAD') {
      reglas.push({ campo: 'direccion', etiqueta: `la dirección del titular ${numero}` });
    }
    for (const regla of reglas) {
      if (vacio(titular[regla.campo])) {
        marcar(errores, `titular.${indice}.${regla.campo}`, `Complete ${regla.etiqueta}.`);
      }
    }
  });
  return errores;
};

/** Reglas de taller, vigencia y expediente, por familia de certificado. */
export const validarDatosEspecificos = ({
  tipo,
  gnv,
  glp,
  conformidad,
}: {
  tipo: TipoCertificadoFaregas;
  gnv: Record<string, any>;
  glp: Record<string, any>;
  conformidad: Record<string, any>;
}): ErroresCampo => {
  const errores: ErroresCampo = {};

  if (tipo === 'GNV_ANUAL') {
    if (vacio(gnv.fechaVigencia)) marcar(errores, 'gnv.fechaVigencia', 'Complete la vigencia del certificado GNV.');
    const verificaciones = gnv.verificaciones || [];
    if (verificaciones.length !== 8 || verificaciones.some((item: any) => item.cumple !== true)) {
      marcar(errores, 'gnv.verificaciones', 'Las 8 verificaciones GNV deben estar evaluadas como CUMPLE.');
    }
  }

  if (tipo === 'GLP_ANUAL') {
    if (vacio(glp.tallerAutorizadoId)) {
      marcar(errores, 'glp.tallerAutorizadoId', 'Seleccione el taller autorizado.');
    }
    if (vacio(glp.fechaVigencia)) marcar(errores, 'glp.fechaVigencia', 'Complete la vigencia del certificado GLP.');
    if (vacio(glp.expedienteTecnico)) marcar(errores, 'glp.expedienteTecnico', 'Complete el número de expediente técnico.');

    const componentes = glp.componentes || [];
    for (const nombre of ['CILINDRO', 'REGULADOR']) {
      const componente = componentes.find((item: any) => item.componente === nombre);
      if (!componente) {
        marcar(errores, 'glp.componentes', `Registre el componente ${nombre}.`);
        continue;
      }
      const reglas: ReglaCampo[] = [
        { campo: 'marca', etiqueta: `la marca del ${nombre}` },
        { campo: 'modelo', etiqueta: `el modelo del ${nombre}` },
        { campo: 'numeroSerie', etiqueta: `la serie del ${nombre}` },
      ];
      if (nombre === 'CILINDRO') {
        reglas.push(
          { campo: 'capacidadLitros', etiqueta: 'la capacidad del cilindro', formato: 'decimal' },
          { campo: 'mesFabricacion', etiqueta: 'el mes de fabricación del cilindro' },
          { campo: 'anioFabricacion', etiqueta: 'el año de fabricación del cilindro' }
        );
      }
      // Las claves de la regla coinciden con las del componente, así que se
      // lee el mismo nombre en ambos lados.
      for (const regla of reglas) {
        const mensaje = errorDeCampo(componente[regla.campo], regla);
        if (mensaje) {
          marcar(errores, `glp.componentes.${nombre}.${regla.campo}`, mensaje);
        }
      }
    }

    const verificaciones = glp.verificaciones || [];
    if (verificaciones.length !== 7 || verificaciones.some((item: any) => item.cumple !== true)) {
      marcar(errores, 'glp.verificaciones', 'Las 7 verificaciones GLP deben estar evaluadas como CUMPLE.');
    }
  }

  if (tipo === 'CONFORMIDAD') {
    if (vacio(conformidad.tipoConformidad)) {
      marcar(errores, 'conformidad.tipoConformidad', 'Seleccione el tipo de conformidad.');
    }
    const reglas: ReglaCampo[] = [
      { campo: 'tipoTramite', etiqueta: 'el tipo de trámite' },
      { campo: 'caracteristicaRegistrable', etiqueta: 'la característica registrable' },
      { campo: 'motivo', etiqueta: 'el motivo' },
      { campo: 'descripcion', etiqueta: 'la descripción' },
      { campo: 'usoOriginalVehiculo', etiqueta: 'el uso original del vehículo' },
    ];
    for (const regla of reglas) {
      const mensaje = errorDeCampo(conformidad[regla.campo], regla);
      if (mensaje) marcar(errores, `conformidad.${regla.campo}`, mensaje);
    }
  }

  return errores;
};

/**
 * Valida el paso completo de expediente técnico y devuelve los errores por
 * campo, listos para marcar cada control.
 */
export const validarPasoExpedienteTecnico = ({
  tipoCertificado,
  caja,
  vehiculo,
  titulares,
  gnv,
  glp,
  conformidad,
}: DatosAsistente): ErroresCampo => {
  const tipo = tipoCertificado;

  // La categoría vehicular es la excepción: se elige en el paso de datos
  // iniciales y se guarda en `caja`, no en `vehiculo`. Se combina aquí para
  // que la regla lea el mismo valor que el select. Sin esto, la categoría
  // aparecía siempre vacía y el error se trasladaba a otro campo.
  const vehiculoConCategoria = { ...vehiculo, categoria: caja.categoria };

  // La placa NO se comprueba aquí: se edita y se valida en el paso de datos
  // iniciales, y marcarla en este paso dejaría un error sin campo en pantalla.
  return {
    ...validarCamposTecnicos(tipo, vehiculoConCategoria),
    ...validarIdentificacionVehiculo(vehiculo),
    ...validarAniosVehiculo(vehiculo),
    ...validarTitulares(titulares, tipo),
    ...validarDatosEspecificos({ tipo, gnv, glp, conformidad }),
  };
};

type DatosPago = {
  condicionPago: string;
  pagos: Array<Record<string, any>>;
  precioTotal: number;
};

/**
 * Reglas de pago ya existentes en el asistente, expresadas por campo.
 * CONTADO exige el total completo; CRÉDITO debe conservar saldo para
 * distribuirlo en cuotas.
 */
export const validarPasoPago = ({ condicionPago, pagos, precioTotal }: DatosPago): ErroresCampo => {
  const totalPagado = pagos.reduce((total, pago) => total + Number(pago.importe || 0), 0);
  const esCredito = condicionPago === 'CREDITO';
  const saldo = Math.max(0, precioTotal - totalPagado);

  if (!esCredito && Math.abs(totalPagado - precioTotal) > 0.009) {
    return {
      pagos: `El pago debe completar S/ ${precioTotal.toFixed(2)}. Saldo pendiente: S/ ${saldo.toFixed(2)}.`,
    };
  }
  if (esCredito && totalPagado >= precioTotal - 0.009) {
    return { pagos: 'Una venta al crédito debe conservar un saldo pendiente para distribuirlo en cuotas.' };
  }
  return {};
};

/**
 * Campos que deben llevar asterisco para un tipo de certificado. Se deriva de
 * las mismas reglas que validan, para que la etiqueta y el error nunca
 * discrepen: lo que no es obligatorio para ese tipo no se marca con asterisco.
 */
export const camposObligatorios = (tipo: TipoCertificadoFaregas): string[] =>
  REGLAS_CAMPOS_TECNICOS
    .filter((regla) => aplicaAlTipo(regla, tipo))
    .map((regla) => regla.campo);

/**
 * Mismo criterio de los datos de facturación, pero por campo, para poder marcar
 * el control concreto. Es la función primitiva: la de textos se deriva de ésta,
 * de modo que ambas no pueden discrepar entre sí.
 */
export const validarDatosFacturacionCampos = (
  facturacion: Record<string, any>
): ErroresCampo => {
  const errores: ErroresCampo = {};
  const tipoComprobante = String(facturacion.tipoDocFac || '').trim().toUpperCase();
  const documento = String(facturacion.nroDocFac || '').replace(/\D/g, '');
  const email = String(facturacion.emailFac || '').trim();

  if (!['BOLETA', 'FACTURA'].includes(tipoComprobante)) {
    errores.tipoDocFac = 'Seleccione el tipo de comprobante en Titulares y Datos de Facturación.';
  }
  if (![8, 11].includes(documento.length)) {
    errores.nroDocFac = 'Complete un DNI de 8 dígitos o un RUC de 11 dígitos para facturación.';
  } else if (tipoComprobante === 'FACTURA' && documento.length !== 11) {
    errores.nroDocFac = 'La factura requiere un RUC de 11 dígitos.';
  } else if (tipoComprobante === 'FACTURA' && documento.length === 11 && !esRucValido(documento)) {
    errores.nroDocFac = 'El RUC ingresado no tiene un dígito verificador válido. Revise el número antes de facturar.';
  }
  if (vacio(facturacion.razonSocialFac)) {
    errores.razonSocialFac = 'Complete el nombre o razón social de facturación.';
  }
  if (vacio(facturacion.direccionFac)) {
    errores.direccionFac = 'Complete la dirección fiscal.';
  }
  if (vacio(facturacion.telefonoFac)) {
    errores.telefonoFac = 'Complete el teléfono de facturación.';
  }
  if (!email) {
    errores.emailFac = 'Complete el correo electrónico de facturación.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errores.emailFac = 'El correo de facturación no tiene un formato válido.';
  }

  return errores;
};

export const validarDatosFacturacionBasica = (facturacion: Record<string, any>) =>
  Object.values(validarDatosFacturacionCampos(facturacion));

// ===========================================================================
// Regla única del formulario de Vehículo y Datos Técnicos
//
// Todo control VISIBLE y EDITABLE del formulario debe estar completo para
// poder avanzar a Previsualización. No hay excepciones por tipo: si el campo
// está en pantalla, el operador tiene que llenarlo.
//
// Esto sustituye, para el bloqueo de avance, a REGLAS_CAMPOS_TECNICOS. Esa
// tabla sigue existiendo para las validaciones específicas de cada familia
// (taller, verificaciones, componentes), pero ya no decide qué campo visible
// puede quedar vacío.
//
// La clave de cada error es la MISMA que consume el control marcado en rojo,
// de modo que el error siempre cae en su campo.
// ===========================================================================

export const MENSAJE_CAMPO_OBLIGATORIO = 'Este campo es obligatorio.';

/** Bloque A. Se renderiza siempre, para cualquier tipo de certificado. */
export const CAMPOS_VISIBLES_COMUNES = [
  'marca', 'modelo', 'version', 'anioFabricacion', 'anioModelo', 'vin', 'serieChasis',
  'numeroMotor', 'combustible', 'color', 'clase', 'categoria', 'carroceria',
  'numeroCilindros', 'cilindrada', 'numeroEjes', 'numeroRuedas', 'numeroAsientos',
  'numeroPasajeros', 'pesoNeto', 'pesoBruto', 'cargaUtil', 'potencia',
  'longitud', 'ancho', 'alto', 'formulaRodante',
] as const;

/**
 * Bloque B, sección GNV (más los campos "después" cuando la modalidad es INICIAL).
 *
 * `gnv.observaciones` queda fuera a propósito: su etiqueta en pantalla dice
 * "(Opcional)" y el backend tampoco lo exige. Marcarlo en rojo contradiría lo
 * que el propio formulario afirma al operador.
 */
export const CAMPOS_VISIBLES_GNV = ['gnv.fechaVigencia'] as const;
export const CAMPOS_VISIBLES_GNV_INICIAL = [
  'gnv.combustiblePosterior', 'gnv.pesoNetoPosterior',
] as const;

/** Bloque B, sección GLP (idem para INICIAL). */
export const CAMPOS_VISIBLES_GLP = [
  'glp.fechaVigencia', 'glp.expedienteTecnico',
] as const;
export const CAMPOS_VISIBLES_GLP_INICIAL = [
  'glp.pesoNetoPosterior', 'glp.cargaUtilPosterior',
] as const;

/** Bloque B, sección CONFORMIDAD. */
export const CAMPOS_VISIBLES_CONFORMIDAD = [
  'conformidad.tipoConformidad', 'conformidad.tipoTramite', 'conformidad.caracteristicaRegistrable',
  'conformidad.motivo', 'conformidad.usoOriginalVehiculo', 'conformidad.descripcion',
] as const;

/** Campos de cada fila de titular. */
export const CAMPOS_VISIBLES_TITULAR = [
  'tipoDocumento', 'nroDocumento', 'nombreRazonSocial', 'direccion',
] as const;

/** Datos de facturación, que se capturan en el mismo paso. */
export const CAMPOS_VISIBLES_FACTURACION = [
  'tipoDocFac', 'nroDocFac', 'razonSocialFac', 'direccionFac', 'telefonoFac', 'emailFac',
] as const;

/**
 * Vacío para efectos de avance.
 * `''`, espacios, null, undefined y NaN invalidan. El 0 NO es vacío: si un
 * campo admite cero, cero es un valor escrito y debe dejar pasar el avance.
 */
export const esValorVacioParaAvance = (valor: unknown): boolean => {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === 'number') return Number.isNaN(valor);
  if (typeof valor === 'boolean') return valor === false;
  return String(valor).trim() === '';
};

const leerPorRuta = (raiz: Record<string, any>, ruta: string): unknown => {
  if (!raiz) return undefined;
  if (!ruta.includes('.')) return raiz[ruta];
  return ruta.split('.').reduce<any>((actual, parte) => (actual == null ? undefined : actual[parte]), raiz);
};

const marcarVacias = (errores: ErroresCampo, raiz: Record<string, any>, campos: readonly string[]) => {
  for (const campo of campos) {
    if (esValorVacioParaAvance(leerPorRuta(raiz, campo))) {
      marcar(errores, campo, MENSAJE_CAMPO_OBLIGATORIO);
    }
  }
};

/**
 * Los componentes GNV sólo se muestran en la modalidad INICIAL. Cada fila
 * visible debe estar completa; la fecha se presenta como un único control de
 * mes/año, por eso se reporta con una sola clave de error.
 */
const validarComponentesGnvInicial = (gnv: Record<string, any>): ErroresCampo => {
  const errores: ErroresCampo = {};
  const componentes = Array.isArray(gnv.componentes) ? gnv.componentes : [];

  for (const nombre of ['REDUCTOR', 'CILINDRO']) {
    const componente = componentes.find((item: any) => String(item?.componente || '').toUpperCase() === nombre);
    if (!componente) {
      marcar(errores, 'gnv.componentes', `Registre el componente ${nombre}.`);
      continue;
    }

    for (const campo of ['marca', 'numeroSerie', 'capacidadLitros']) {
      if (esValorVacioParaAvance(componente[campo])) {
        const etiqueta = campo === 'marca' ? 'la marca' : campo === 'numeroSerie' ? 'la serie' : 'la capacidad';
        marcar(errores, `gnv.componentes.${nombre}.${campo}`, `Complete ${etiqueta} del ${nombre}.`);
      }
    }

    if (esValorVacioParaAvance(componente.mesFabricacion) || esValorVacioParaAvance(componente.anioFabricacion)) {
      marcar(
        errores,
        `gnv.componentes.${nombre}.fechaFabricacion`,
        `Complete la fecha de fabricación del ${nombre}.`
      );
    }
  }

  return errores;
};

type ContextoFormularioVehiculo = {
  tipoCertificado: TipoCertificadoFaregas;
  modalidad?: string;
  caja: Record<string, any>;
  vehiculo: Record<string, any>;
  titulares: Array<Record<string, any>>;
  gnv: Record<string, any>;
  glp: Record<string, any>;
  conformidad: Record<string, any>;
  facturacion: Record<string, any>;
};

/**
 * Conjunto de claves que el formulario visible exige para un tipo y modalidad.
 * Lo usan tanto la validación como el asterisco de las etiquetas, de modo que
 * lo marcado con * y lo bloqueado nunca pueden divergir.
 */
export const camposObligatoriosVisibles = (
  tipoCertificado: TipoCertificadoFaregas,
  modalidad?: string
): string[] => {
  const campos: string[] = [...CAMPOS_VISIBLES_COMUNES];
  const esInicial = String(modalidad || '').toUpperCase() === 'INICIAL';

  if (tipoCertificado === 'GNV_ANUAL') {
    campos.push(...CAMPOS_VISIBLES_GNV);
    if (esInicial) campos.push(...CAMPOS_VISIBLES_GNV_INICIAL);
  }
  if (tipoCertificado === 'GLP_ANUAL') {
    campos.push(...CAMPOS_VISIBLES_GLP);
    if (esInicial) campos.push(...CAMPOS_VISIBLES_GLP_INICIAL);
  }
  if (tipoCertificado === 'CONFORMIDAD') {
    campos.push(...CAMPOS_VISIBLES_CONFORMIDAD);
  }
  return campos;
};

/**
 * Valida el formulario de Vehículo y Datos Técnicos completo: todo control
 * visible y editable debe tener valor. Sólo se examinan los bloques que
 * están renderizados para el tipo y la modalidad actuales, de modo que nunca
 * se exige un campo de otra sección que no aparece en pantalla.
 */
export const validarFormularioVehiculoVisible = ({
  tipoCertificado,
  modalidad,
  caja,
  vehiculo,
  titulares,
  gnv,
  glp,
  conformidad,
  facturacion,
}: ContextoFormularioVehiculo): ErroresCampo => {
  const errores: ErroresCampo = {};

  // La categoría se edita en el paso 1 y vive en `caja`.
  const vehiculoConCategoria = { ...vehiculo, categoria: caja.categoria };
  marcarVacias(errores, vehiculoConCategoria, CAMPOS_VISIBLES_COMUNES);

  const esInicial = String(modalidad || '').toUpperCase() === 'INICIAL';

  // Las claves de cada sección ya vienen cualificadas (por ejemplo,
  // gnv.fechaVigencia), así que la raíz debe exponer el grupo en su primer
  // segmento para validar el campo correcto.
  if (tipoCertificado === 'GNV_ANUAL') {
    marcarVacias(errores, { gnv }, CAMPOS_VISIBLES_GNV);
    if (esInicial) {
      marcarVacias(errores, { gnv }, CAMPOS_VISIBLES_GNV_INICIAL);
      if (combustiblesGnvSonEquivalentes(vehiculo.combustible, gnv.combustiblePosterior)) {
        marcar(
          errores,
          'gnv.combustiblePosterior',
          'El combustible después de la conversión debe ser diferente al combustible original.'
        );
      }
      if (pesosGnvSonIguales(vehiculo.pesoNeto, gnv.pesoNetoPosterior)) {
        marcar(
          errores,
          'gnv.pesoNetoPosterior',
          'El peso neto después de la conversión debe ser diferente al peso original.'
        );
      }
    }
  }
  if (tipoCertificado === 'GLP_ANUAL') {
    marcarVacias(errores, { glp }, CAMPOS_VISIBLES_GLP);
    if (esInicial) {
      marcarVacias(errores, { glp }, CAMPOS_VISIBLES_GLP_INICIAL);
      if (combustiblesSonEquivalentes(vehiculo.combustible, 'BI-COMBUSTIBLE GLP')) {
        marcar(
          errores,
          'combustible',
          'El combustible original debe ser diferente a BI-COMBUSTIBLE GLP, que es el resultado de la conversión.'
        );
      }
    }
  }
  if (tipoCertificado === 'CONFORMIDAD') {
    marcarVacias(errores, { conformidad }, CAMPOS_VISIBLES_CONFORMIDAD);
  }

  // Taller, componentes y verificaciones forman parte de la misma puerta de
  // avance. Estas reglas ya existían, pero no se incorporaban al validador que
  // usa el botón Siguiente y por eso un cilindro incompleto podía pasar.
  Object.assign(
    errores,
    validarDatosEspecificos({
      tipo: tipoCertificado,
      gnv,
      glp,
      conformidad,
    })
  );

  if (tipoCertificado === 'GNV_ANUAL' && esInicial) {
    Object.assign(errores, validarComponentesGnvInicial(gnv));
  }

  // Además de impedir vacíos, conserva las reglas de documento, RUC y correo.
  Object.assign(errores, validarTitulares(titulares, tipoCertificado));

  // Cada fila de titular debe estar completa; una fila a medias no pasa.
  // La clave es titular.<indice>.<campo>, así que la raíz se anida en dos
  // niveles para que la ruta se pueda recorrer segmento a segmento.
  titulares.forEach((titular, indice) => {
    marcarVacias(
      errores,
      { titular: { [indice]: titular } },
      CAMPOS_VISIBLES_TITULAR.map((campo) => `titular.${indice}.${campo}`)
    );
  });

  marcarVacias(errores, facturacion, CAMPOS_VISIBLES_FACTURACION);
  Object.assign(errores, validarDatosFacturacionCampos(facturacion));

  return errores;
};
