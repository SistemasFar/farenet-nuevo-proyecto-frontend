export const obtenerFechaHoyPeru = (): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

import type { TipoCertificadoFaregas } from '../../types/faregas';
import { camposVehiculoEditables } from './faregas-certificado-campos';
import type { CampoFormatoDinamicoFaregas } from '../../types/faregas-api';
import { combustiblesGnvSonEquivalentes, combustiblesSonEquivalentes, pesosGnvSonIguales } from './gnv-conversion';
import { validarDocumento } from '../Usuarios/usuariosValidacion';

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
    const esOpcional = !campo.requerido || campo.key === 'taller.telefono' || campo.key === 'inspeccion.observaciones';

    if (!esOpcional && !valor) {
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
  modalidad,
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
    if (String(modalidad || '').toUpperCase() === 'ANUAL') {
      const hoyPeru = obtenerFechaHoyPeru();
      if (vacio(gnv.fechaVigencia)) {
        errores.push('Complete la vigencia GNV.');
      } else if (String(gnv.fechaVigencia).slice(0, 10) < hoyPeru) {
        errores.push('La fecha de vigencia no puede ser anterior a la fecha actual.');
      }
      const verificaciones = gnv.verificaciones || [];
      if (verificaciones.length !== 8 || verificaciones.some((item: any) => item.cumple !== true)) {
        errores.push('Las 8 verificaciones GNV deben estar evaluadas como CUMPLE.');
      }
    }
  }

  if (tipoCertificado === 'GLP_ANUAL') {
    const esGlpAnual = String(modalidad || '').toUpperCase() === 'ANUAL';
    agregarFaltantes(errores, vehiculo, [['cargaUtil', 'la carga útil']]);
    const hoyPeru = obtenerFechaHoyPeru();
    if (vacio(glp.fechaVigencia)) {
      errores.push('Complete la vigencia GLP.');
    } else if (String(glp.fechaVigencia).slice(0, 10) < hoyPeru) {
      errores.push('La fecha de vigencia no puede ser anterior a la fecha actual.');
    }
    const componentes = glp.componentes || [];
    for (const tipo of ['CILINDRO', 'REGULADOR']) {
      const componente = componentes.find((item: any) => item.componente === tipo);
      if (!componente) {
        errores.push(`Registre el componente ${tipo}.`);
        continue;
      }
      const camposComponente: Array<[string, string]> = [
        ['marca', `la marca del ${tipo}`],
        ['numeroSerie', `la serie del ${tipo}`],
      ];
      if (tipo !== 'CILINDRO') {
        camposComponente.push(['modelo', `el modelo del ${tipo}`]);
      }
      agregarFaltantes(errores, componente, camposComponente);
      if (tipo === 'CILINDRO') {
        const camposCilindro: Array<[string, string]> = [
          ['capacidadLitros', 'la capacidad del cilindro'],
          ['anioFabricacion', 'el año de fabricación del cilindro'],
        ];
        agregarFaltantes(errores, componente, camposCilindro);
      }
    }
    const verificaciones = glp.verificaciones || [];
    if (verificaciones.length !== 7 || verificaciones.some((item: any) => item.cumple !== true)) {
      errores.push('Las 7 verificaciones GLP deben estar evaluadas como CUMPLE.');
    }
    const esGlpInicialExp = String(modalidad || '').toUpperCase() === 'INICIAL';
    if (esGlpInicialExp) {
      const combustibleLimpio = String(vehiculo.combustible || '').trim().toUpperCase();
      if (combustibleLimpio && combustibleLimpio !== 'GASOLINA' && combustibleLimpio !== 'DIESEL') {
        errores.push('Para GLP INICIAL, el combustible original debe ser GASOLINA o DIESEL.');
      }
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
    });
  }

  if (tipoCertificado === 'CONFORMIDAD') {
    agregarFaltantes(errores, vehiculo, [
      ['clase', 'la clase vehicular'], ['carroceria', 'la carrocería'], ['color', 'el color'],
      ['cargaUtil', 'la carga útil'], ['anioModelo', 'el año modelo'],
      ['formulaRodante', 'la fórmula rodante'], ['potencia', 'la potencia'],
    ]);
    agregarFaltantes(errores, conformidad, [
      ['caracteristicaRegistrable', 'la característica registrable'],
      ['usoOriginalVehiculo', 'el uso original del vehículo'],
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

export const esAsteriscos = (valor: unknown): boolean => {
  const str = String(valor ?? '').trim();
  return str.length > 0 && /^\*+$/.test(str);
};

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
  if (esAsteriscos(valor)) return undefined;
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
  if (esAsteriscos(vehiculo.anioModelo) || esAsteriscos(vehiculo.anioFabricacion)) return {};
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
];

export const validarDatosInicialesCampos = (caja: Record<string, any>): ErroresCampo => {
  const errores: ErroresCampo = {};
  for (const regla of CAMPOS_DATOS_INICIALES) {
    const mensaje = errorDeCampo(caja[regla.campo], regla);
    if (mensaje) marcar(errores, regla.campo, mensaje);
  }
  const esTaller = String(caja.tipo_flujo || '').toUpperCase() === 'TALLER_INSPECCION';
  const identificador = esTaller
    ? { campo: 'tallerNombre', etiqueta: 'el nombre del taller' }
    : { campo: 'placa', etiqueta: 'la placa' };
  const mensajeIdentificador = errorDeCampo(caja[identificador.campo], identificador);
  if (mensajeIdentificador) marcar(errores, identificador.campo, mensajeIdentificador);
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
      { campo: 'nombreRazonSocial', etiqueta: `el nombre del titular ${numero}` },
    ];
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
  modalidad,
  gnv,
  glp,
  conformidad,
}: {
  tipo: TipoCertificadoFaregas;
  modalidad?: string;
  gnv: Record<string, any>;
  glp: Record<string, any>;
  conformidad: Record<string, any>;
}): ErroresCampo => {
  const errores: ErroresCampo = {};

  if (tipo === 'GNV_ANUAL') {
    if (String(modalidad || '').toUpperCase() === 'ANUAL') {
      const hoyPeru = obtenerFechaHoyPeru();
      if (vacio(gnv.fechaVigencia)) {
        marcar(errores, 'gnv.fechaVigencia', 'Complete la vigencia del certificado GNV.');
      } else if (String(gnv.fechaVigencia).slice(0, 10) < hoyPeru) {
        marcar(errores, 'gnv.fechaVigencia', 'La fecha de vigencia no puede ser anterior a la fecha actual.');
      }
      const verificaciones = gnv.verificaciones || [];
      if (verificaciones.length !== 8 || verificaciones.some((item: any) => item.cumple !== true)) {
        marcar(errores, 'gnv.verificaciones', 'Las 8 verificaciones GNV deben estar evaluadas como CUMPLE.');
      }
    }
  }

  if (tipo === 'GLP_ANUAL') {
    const esGlpAnual = String(modalidad || '').toUpperCase() === 'ANUAL';
    const hoyPeru = obtenerFechaHoyPeru();
    if (vacio(glp.fechaVigencia)) {
      marcar(errores, 'glp.fechaVigencia', 'Complete la vigencia del certificado GLP.');
    } else if (String(glp.fechaVigencia).slice(0, 10) < hoyPeru) {
      marcar(errores, 'glp.fechaVigencia', 'La fecha de vigencia no puede ser anterior a la fecha actual.');
    }


    const componentes = glp.componentes || [];
    for (const nombre of ['CILINDRO', 'REGULADOR']) {
      const componente = componentes.find((item: any) => item.componente === nombre);
      if (!componente) {
        marcar(errores, 'glp.componentes', `Registre el componente ${nombre}.`);
        continue;
      }
      const reglas: ReglaCampo[] = [
        { campo: 'marca', etiqueta: `la marca del ${nombre}` },
        { campo: 'numeroSerie', etiqueta: `la serie del ${nombre}` },
      ];
      if (nombre !== 'CILINDRO') {
        reglas.push({ campo: 'modelo', etiqueta: `el modelo del ${nombre}` });
      }
      if (nombre === 'CILINDRO') {
        reglas.push(
          { campo: 'capacidadLitros', etiqueta: 'la capacidad del cilindro', formato: 'entero' },
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
    const reglas: ReglaCampo[] = [
      { campo: 'caracteristicaRegistrable', etiqueta: 'la característica registrable' },
      { campo: 'usoOriginalVehiculo', etiqueta: 'el uso original del vehículo' },
    ];
    for (const regla of reglas) {
      const mensaje = errorDeCampo(conformidad[regla.campo], regla);
      if (mensaje) marcar(errores, `conformidad.${regla.campo}`, mensaje);
    }
    const usoOriginal = String(conformidad.usoOriginalVehiculo || '').trim().toUpperCase();
    const usoNormalizado = usoOriginal === 'MERCANCIAS' ? 'MERCANCÍAS' : usoOriginal;
    if (usoNormalizado && !['PERSONAS', 'MERCANCÍAS'].includes(usoNormalizado)) {
      marcar(
        errores,
        'conformidad.usoOriginalVehiculo',
        'Seleccione PERSONAS o MERCANCÍAS. El valor anterior del borrador no está permitido para una nueva emisión.'
      );
    }
  }

  return errores;
};

const PATRON_TEXTO_TECNICO = /^[\p{L}\p{N} ./*-]+$/u;
const PATRON_MOTOR_TECNICO = /^[\p{L}\p{N}/*-]+$/u;
const PATRON_POTENCIA_TECNICA = /^[\p{L}\p{N}\s@/.,*-]+$/u;
const PATRON_CILINDRADA_DECIMAL = /^(?:\d{1,7}(?:\.\d{1,3})?|\*+)$/;
const PATRON_VIN_CONFORMIDAD = /^[A-HJ-NPR-Za-hj-npr-z0-9*]+$/;

/**
 * Conformidad admite la notación literal de la tarjeta de propiedad. Estas
 * reglas sólo informan errores: nunca reescriben ni eliminan caracteres.
 */
export const validarCaracteresTecnicosConformidad = (
  tipo: TipoCertificadoFaregas,
  vehiculo: Record<string, any>
): ErroresCampo => {
  if (tipo !== 'CONFORMIDAD') return {};
  const errores: ErroresCampo = {};
  const validar = (campo: string, patron: RegExp, mensaje: string) => {
    const valor = String(vehiculo[campo] ?? '');
    if (valor && !esAsteriscos(valor) && !patron.test(valor)) marcar(errores, campo, mensaje);
  };

  validar('modelo', PATRON_TEXTO_TECNICO, 'El modelo sólo admite letras, números, espacios, punto, / y -.');
  validar('version', PATRON_TEXTO_TECNICO, 'La versión sólo admite letras, números, espacios, punto, / y -.');
  validar('numeroMotor', PATRON_MOTOR_TECNICO, 'El motor sólo admite letras, números, / y -.');
  validar('potencia', PATRON_POTENCIA_TECNICA, 'La potencia contiene caracteres no admitidos. Puede usar letras, números, espacios, @, /, punto, coma y guion.');
  validar('cilindrada', PATRON_CILINDRADA_DECIMAL, 'La cilindrada debe ser un número desde 0 y puede incluir hasta 3 decimales. Los cilindros se registran en el campo separado.');
  validar('vin', PATRON_VIN_CONFORMIDAD, 'El VIN sólo admite letras válidas de VIN, números y asteriscos.');

  return errores;
};

/**
 * Valida el paso completo de expediente técnico y devuelve los errores por
 * campo, listos para marcar cada control.
 */
export const validarPasoExpedienteTecnico = ({
  tipoCertificado,
  modalidad,
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
    ...validarCaracteresTecnicosConformidad(tipo, vehiculo),
    ...validarTitulares(titulares, tipo),
    ...validarDatosEspecificos({ tipo, modalidad, gnv, glp, conformidad }),
  };
};

type DatosPago = {
  tipoComprobante?: string;
  condicionPago: string;
  pagos: Array<Record<string, any>>;
  precioTotal: number;
  fechaInicioCredito?: string;
  fechaVencimientoCredito?: string;
  cuotas?: Array<{ numeroCuota: number; fechaPago: string; importe: string | number }>;
};

const redondearMoneda = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;

export const resolverCuotasCredito = ({
  condicionPago,
  pagos,
  precioTotal,
  fechaVencimientoCredito,
  cuotas = [],
}: Pick<DatosPago, 'condicionPago' | 'pagos' | 'precioTotal' | 'fechaVencimientoCredito' | 'cuotas'>) => {
  if (condicionPago !== 'CREDITO') return [];
  const totalPagado = redondearMoneda(pagos.reduce((total, pago) => total + Number(pago.importe || 0), 0));
  const saldo = redondearMoneda(precioTotal - totalPagado);
  if (saldo <= 0) return [];

  // Si ya existen cuotas (1, 2 o 3), conservamos las cuotas editadas por el usuario.
  // Solo cuando el arreglo de cuotas está vacío generamos la cuota por defecto por el saldo actual.
  if (cuotas.length === 0) {
    return [{
      numeroCuota: 1,
      fechaPago: fechaVencimientoCredito || '',
      importe: saldo.toFixed(2),
    }];
  }
  return cuotas.map((cuota, index) => ({
    ...cuota,
    numeroCuota: index + 1,
    importe: typeof cuota.importe === 'number' ? cuota.importe.toFixed(2) : String(cuota.importe || '0.00'),
  }));
};

/**
 * Reglas de pago ya existentes en el asistente, expresadas por campo.
 * CONTADO exige el total completo; CRÉDITO debe conservar saldo para
 * distribuirlo en cuotas (de 1 a 3 cuotas como máximo).
 */
export const validarPasoPago = ({
  condicionPago,
  tipoComprobante,
  pagos,
  precioTotal,
  fechaInicioCredito,
  fechaVencimientoCredito,
  cuotas = [],
}: DatosPago): ErroresCampo => {
  const totalPagado = redondearMoneda(pagos.reduce((total, pago) => total + Number(pago.importe || 0), 0));
  const esCredito = condicionPago === 'CREDITO';
  const saldo = redondearMoneda(Math.max(0, precioTotal - totalPagado));
  const errores: ErroresCampo = {};

  if (String(tipoComprobante || '').toUpperCase() === 'BOLETA' && esCredito) {
    errores.pagos = 'La boleta sólo admite condición de pago CONTADO.';
    return errores;
  }

  if (esCredito) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaInicioCredito || '')) {
      errores.fechaInicioCredito = 'Seleccione la fecha de inicio del crédito.';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaVencimientoCredito || '')) {
      errores.fechaVencimientoCredito = 'Seleccione la fecha de vencimiento del crédito.';
    } else if (fechaInicioCredito && fechaVencimientoCredito < fechaInicioCredito) {
      errores.fechaVencimientoCredito = 'La fecha de vencimiento no puede ser anterior a la fecha de inicio.';
    }
  }

  if (!esCredito && Math.abs(totalPagado - precioTotal) > 0.009) {
    errores.pagos = `El pago debe completar S/ ${precioTotal.toFixed(2)}. Saldo pendiente: S/ ${saldo.toFixed(2)}.`;
  }
  if (esCredito && totalPagado >= precioTotal - 0.009) {
    errores.pagos = 'Una venta a crédito debe conservar un saldo pendiente. Cambie la condición a CONTADO o reduzca el pago inicial.';
  } else if (esCredito) {
    if (cuotas.length === 0) {
      errores.cuotas = 'La factura a crédito requiere al menos una cuota.';
    } else if (cuotas.length > 3) {
      errores.cuotas = 'El crédito permite como máximo 3 cuotas.';
    } else {
      let sumaCuotas = 0;
      const numerosVistos = new Set<number>();
      for (const cuota of cuotas) {
        if (numerosVistos.has(cuota.numeroCuota)) {
          errores.cuotas = 'No se permiten cuotas duplicadas.';
          break;
        }
        numerosVistos.add(cuota.numeroCuota);

        const importe = Number(cuota.importe || 0);
        sumaCuotas += importe;
        if (!Number.isFinite(importe) || importe <= 0) {
          errores.cuotas = 'Cada cuota debe tener un monto mayor a cero.';
          break;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cuota.fechaPago || '')) {
          errores.cuotas = 'Cada cuota debe tener una fecha válida.';
          break;
        }
        if (fechaInicioCredito && cuota.fechaPago < fechaInicioCredito) {
          errores.cuotas = 'La fecha de cada cuota debe ser igual o posterior al inicio del crédito.';
          break;
        }
        if (fechaVencimientoCredito && cuota.fechaPago > fechaVencimientoCredito) {
          errores.cuotas = 'La fecha de cada cuota no puede superar el vencimiento general.';
          break;
        }
      }
      if (!errores.cuotas && Math.abs(redondearMoneda(sumaCuotas) - saldo) > 0.009) {
        errores.cuotas = `Las cuotas deben sumar el saldo financiado de S/ ${saldo.toFixed(2)}.`;
      }
    }
  }
  return errores;
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
  const tipoDocumento = String(facturacion.tipoDocumentoFac || '').trim().toUpperCase();
  const documento = String(facturacion.nroDocFac || '').trim().toUpperCase();
  const email = String(facturacion.emailFac || '').trim();

  if (!['BOLETA', 'FACTURA'].includes(tipoComprobante)) {
    errores.tipoDocFac = 'Seleccione el tipo de comprobante en Titulares y Datos de Facturación.';
  }
  if (!['DNI', 'RUC', 'CARNETEXTRANJERIA'].includes(tipoDocumento)) {
    errores.tipoDocumentoFac = 'Seleccione el tipo de documento de identidad.';
  } else {
    const errorDocumento = validarDocumento(tipoDocumento.toLowerCase(), documento);
    if (errorDocumento) errores.nroDocFac = errorDocumento;
  }
  if (tipoComprobante === 'FACTURA' && tipoDocumento !== 'RUC') {
    errores.tipoDocumentoFac = 'La factura requiere un documento de tipo RUC.';
  } else if (tipoComprobante === 'FACTURA' && tipoDocumento === 'RUC' && !errores.nroDocFac && !esRucValido(documento)) {
    errores.nroDocFac = 'El RUC ingresado no tiene un dígito verificador válido. Revise el número antes de facturar.';
  }
  if (tipoComprobante === 'BOLETA' && tipoDocumento === 'RUC') {
    errores.tipoDocumentoFac = 'La boleta requiere un documento de tipo DNI o Carné de Extranjería.';
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
  // Correo es opcional: solo se valida formato si el usuario lo ingresó
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
  'glp.fechaVigencia',
] as const;
export const CAMPOS_VISIBLES_GLP_INICIAL = [
  'glp.pesoNetoPosterior', 'glp.cargaUtilPosterior',
] as const;

/** Bloque B, sección CONFORMIDAD. */
export const CAMPOS_VISIBLES_CONFORMIDAD = [
  'conformidad.caracteristicaRegistrable',
  'conformidad.usoOriginalVehiculo',
] as const;

/** Campos de cada fila de titular. */
export const CAMPOS_VISIBLES_TITULAR = [
  'tipoDocumento', 'nroDocumento', 'nombreRazonSocial',
] as const;

/** Datos de facturación, que se capturan en el mismo paso. */
export const CAMPOS_VISIBLES_FACTURACION = [
  'tipoDocFac', 'tipoDocumentoFac', 'nroDocFac', 'razonSocialFac', 'direccionFac', 'telefonoFac',
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

    for (const campo of ['marca', 'numeroSerie']) {
      if (esValorVacioParaAvance(componente[campo])) {
        const etiqueta = campo === 'marca' ? 'la marca' : 'la serie';
        marcar(errores, `gnv.componentes.${nombre}.${campo}`, `Complete ${etiqueta} del ${nombre}.`);
      }
    }

    const modo = componente.modoCapacidad || (componente.capacidadLitros === 'NO APLICA' ? 'NO_APLICA' : 'VALOR');
    if (modo === 'NO_APLICA') {
      // Válido tanto para Reductor como para Cilindro
    } else {
      const cap = String(componente.capacidadLitros ?? '').trim();
      if (esValorVacioParaAvance(cap)) {
        marcar(errores, `gnv.componentes.${nombre}.capacidadLitros`, `Complete la capacidad del ${nombre}.`);
      } else if (!/^\d+$/.test(cap)) {
        marcar(errores, `gnv.componentes.${nombre}.capacidadLitros`, `La capacidad del ${nombre} debe ser un número entero sin decimales.`);
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
  const campos: string[] = camposVehiculoEditables(tipoCertificado, modalidad);
  const esInicial = String(modalidad || '').toUpperCase() === 'INICIAL';

  if (tipoCertificado === 'GNV_ANUAL') {
    if (!esInicial) campos.push(...CAMPOS_VISIBLES_GNV);
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
  const camposVehiculo = camposVehiculoEditables(tipoCertificado, modalidad);
  for (const campo of camposVehiculo) {
    // GLP/GNV imprimen un único dato "VIN / N° de Serie": cualquiera de los
    // dos valores históricos satisface el control único del formulario.
    if (campo === 'vin' && tipoCertificado !== 'CONFORMIDAD') {
      if (esValorVacioParaAvance(vehiculo.vin) && esValorVacioParaAvance(vehiculo.serieChasis)) {
        marcar(errores, 'vin', MENSAJE_CAMPO_OBLIGATORIO);
      }
      continue;
    }
    if (esValorVacioParaAvance(leerPorRuta(vehiculoConCategoria, campo))) {
      marcar(errores, campo, MENSAJE_CAMPO_OBLIGATORIO);
    }
  }

  const esInicial = String(modalidad || '').toUpperCase() === 'INICIAL';

  // Las claves de cada sección ya vienen cualificadas (por ejemplo,
  // gnv.fechaVigencia), así que la raíz debe exponer el grupo en su primer
  // segmento para validar el campo correcto.
  if (tipoCertificado === 'GNV_ANUAL') {
    if (!esInicial) {
      marcarVacias(errores, { gnv }, CAMPOS_VISIBLES_GNV);
    }
    if (esInicial) {
      marcarVacias(errores, { gnv }, CAMPOS_VISIBLES_GNV_INICIAL);
      const combustiblePost = gnv.combustiblePosterior || 'BI - COMBUSTIBLE GNV';
      if (combustiblesGnvSonEquivalentes(vehiculo.combustible, combustiblePost)) {
        marcar(
          errores,
          'combustible',
          'El combustible original debe ser diferente a BI - COMBUSTIBLE GNV, que es el resultado de la conversión.'
        );
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
  const esGlpInicial = (tipoCertificado === 'GLP_ANUAL' && esInicial) || (tipoCertificado as string) === 'GLP_INICIAL';
  if (tipoCertificado === 'GLP_ANUAL' || (tipoCertificado as string) === 'GLP_INICIAL') {
    marcarVacias(errores, { glp }, CAMPOS_VISIBLES_GLP);
    if (esGlpInicial) {
      marcarVacias(errores, { glp }, CAMPOS_VISIBLES_GLP_INICIAL);
      const combustibleLimpio = String(vehiculo.combustible || '').trim().toUpperCase();
      if (!combustibleLimpio) {
        marcar(
          errores,
          'combustible',
          'El combustible original es obligatorio. Debe seleccionar GASOLINA o DIESEL.'
        );
      } else if (combustiblesSonEquivalentes(combustibleLimpio, 'BI-COMBUSTIBLE GLP')) {
        marcar(
          errores,
          'combustible',
          'El combustible original debe ser diferente a BI-COMBUSTIBLE GLP, que es el resultado de la conversión. Debe seleccionar GASOLINA o DIESEL.'
        );
      } else if (combustibleLimpio !== 'GASOLINA' && combustibleLimpio !== 'DIESEL') {
        marcar(
          errores,
          'combustible',
          'Para GLP INICIAL, el combustible original debe ser GASOLINA o DIESEL.'
        );
      }
    }
  }
  if (tipoCertificado === 'CONFORMIDAD') {
    marcarVacias(errores, { conformidad }, CAMPOS_VISIBLES_CONFORMIDAD);
    Object.assign(errores, validarCaracteresTecnicosConformidad(tipoCertificado, vehiculo));
  }

  // Taller, componentes y verificaciones forman parte de la misma puerta de
  // avance. Estas reglas ya existían, pero no se incorporaban al validador que
  // usa el botón Siguiente y por eso un cilindro incompleto podía pasar.
  Object.assign(
    errores,
    validarDatosEspecificos({
      tipo: tipoCertificado,
      modalidad,
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
    if (tipoCertificado !== 'GLP_ANUAL' && tipoCertificado !== 'CONFORMIDAD') return;
    const camposTitular = ['nombreRazonSocial'];
    marcarVacias(
      errores,
      { titular: { [indice]: titular } },
      camposTitular.map((campo) => `titular.${indice}.${campo}`)
    );
  });

  marcarVacias(errores, facturacion, CAMPOS_VISIBLES_FACTURACION);
  Object.assign(errores, validarDatosFacturacionCampos(facturacion));

  return errores;
};
