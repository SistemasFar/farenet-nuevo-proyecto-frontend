import { describe, expect, it } from 'vitest';
import {
  CAMPOS_VISIBLES_COMUNES,
  CAMPOS_VISIBLES_CONFORMIDAD,
  CAMPOS_VISIBLES_FACTURACION,
  CAMPOS_VISIBLES_GLP,
  CAMPOS_VISIBLES_GNV,
  CAMPOS_VISIBLES_TITULAR,
  MENSAJE_CAMPO_OBLIGATORIO,
  esValorVacioParaAvance,
  validarFormularioVehiculoVisible,
} from './faregas-wizard.validation';

const VEHICULO_COMPLETO: Record<string, any> = {
  marca: 'TOYOTA',
  modelo: 'YARIS',
  version: '1222',
  anioFabricacion: '2010',
  anioModelo: '2010',
  vin: 'HZ1110WKR295C0031',
  serieChasis: 'HZ1110WKR295C0031',
  numeroMotor: 'HZ1110WKR295C0031',
  combustible: 'BI COMBUSTIBLE/GNV',
  color: 'BLANCO',
  clase: 'AUTOMOVIL',
  carroceria: 'SEDAN',
  numeroCilindros: '4',
  cilindrada: '1498',
  numeroEjes: '2',
  numeroRuedas: '4',
  numeroAsientos: '5',
  numeroPasajeros: '5',
  pesoNeto: '1301.000',
  pesoBruto: '1450.000',
  cargaUtil: '149.000',
  potencia: '105',
  longitud: '4.300',
  ancho: '1.690',
  alto: '1.460',
  formulaRodante: '4X2',
};

const FACTURACION_COMPLETA = {
  tipoDocFac: 'BOLETA',
  nroDocFac: '74045612',
  razonSocialFac: 'GRACE IBARRA',
  direccionFac: 'AV. PRINCIPAL 123',
  telefonoFac: '987654321',
  emailFac: 'grace@example.com',
};

const TITULAR_COMPLETO = {
  tipoDocumento: 'DNI',
  nroDocumento: '32332244',
  nombreRazonSocial: 'SSSS',
  direccion: 'AV. PRINCIPAL 123',
};

const GNV_COMPLETO = { tallerAutorizadoId: '2', fechaVigencia: '2027-01-01' };
const GLP_COMPLETO = { tallerAutorizadoId: '2', fechaVigencia: '2027-01-01', expedienteTecnico: 'DDDD' };
const CONFORMIDAD_COMPLETA = {
  tipoConformidad: 'LIVIANO',
  tipoTramite: 'PRIMERA',
  caracteristicaRegistrable: 'NUMERO DE EJES',
  motivo: 'RECTIFICACION',
  usoOriginalVehiculo: 'PARTICULAR',
  descripcion: 'Se rectifica',
};

const base = (extra: Record<string, any> = {}) => ({
  tipoCertificado: 'GNV_ANUAL',
  modalidad: 'ANUAL',
  caja: { placa: 'ABC123', categoria: 'N1' },
  vehiculo: { ...VEHICULO_COMPLETO },
  titulares: [{ ...TITULAR_COMPLETO }],
  gnv: { ...GNV_COMPLETO },
  glp: { ...GLP_COMPLETO },
  conformidad: { ...CONFORMIDAD_COMPLETA },
  facturacion: { ...FACTURACION_COMPLETA },
  ...extra,
});

/** Reproduce la decisión del handler: bloqueado si hay al menos una key. */
const bloqueadoPor = (errores: Record<string, string>) => Object.keys(errores).length > 0;

describe('caso real de la regresión: GNV con VIN y fórmula rodante vacíos', () => {
  it('marca VIN y fórmula rodante, y NO deja avanzar', () => {
    const contexto = base({ vehiculo: { ...VEHICULO_COMPLETO, vin: '', formulaRodante: '' } });
    const errores = validarFormularioVehiculoVisible(contexto as any);

    expect(Object.keys(errores).sort()).toEqual(['formulaRodante', 'vin']);
    expect(errores.vin).toBe(MENSAJE_CAMPO_OBLIGATORIO);
    expect(errores.formulaRodante).toBe(MENSAJE_CAMPO_OBLIGATORIO);
    expect(bloqueadoPor(errores)).toBe(true);
  });

  it('con VIN y fórmula rodante escritos, y el resto completo, sí avanza', () => {
    const contexto = base({
      vehiculo: { ...VEHICULO_COMPLETO, vin: 'HZ1110WKR295C0031', formulaRodante: '4X2' },
    });
    const errores = validarFormularioVehiculoVisible(contexto as any);

    expect(errores).toEqual({});
    expect(bloqueadoPor(errores)).toBe(false);
  });

  it('la fórmula rodante vacío bloquea en GNV aunque antes fuera opcional', () => {
    const errores = validarFormularioVehiculoVisible(base({
      tipoCertificado: 'GNV_ANUAL',
      modalidad: 'ANUAL',
      vehiculo: { ...VEHICULO_COMPLETO, formulaRodante: '' },
    }) as any);
    expect(errores.formulaRodante).toBeTruthy();
  });
});

describe('cada campo visible vacío produce su propia key, uno por uno', () => {
  it('bloque A: los 27 campos comunes', () => {
    const fallidos: string[] = [];

    for (const campo of CAMPOS_VISIBLES_COMUNES) {
      const esCategoria = campo === 'categoria';
      const contexto = base(
        esCategoria
          ? { caja: { placa: 'ABC123', categoria: '' } }
          : { vehiculo: { ...VEHICULO_COMPLETO, [campo]: '' } }
      );
      const errores = validarFormularioVehiculoVisible(contexto as any);
      const keys = Object.keys(errores);

      if (!keys.includes(campo)) fallidos.push(`${campo}: no produjo su key (${JSON.stringify(keys)})`);
      else if (keys.length !== 1) fallidos.push(`${campo}: se contaminó (${JSON.stringify(keys)})`);
      else if (errores[campo] !== MENSAJE_CAMPO_OBLIGATORIO) fallidos.push(`${campo}: mensaje inesperado`);
      else if (!bloqueadoPor(errores)) fallidos.push(`${campo}: no bloqueó`);
    }

    expect(fallidos).toEqual([]);
    expect(CAMPOS_VISIBLES_COMUNES).toHaveLength(27);
  });

  it('bloque B: los campos visibles de GNV', () => {
    for (const ruta of CAMPOS_VISIBLES_GNV) {
      const campo = ruta.split('.')[1];
      const errores = validarFormularioVehiculoVisible(base({ gnv: { ...GNV_COMPLETO, [campo]: '' } }) as any);
      expect(Object.keys(errores)).toEqual([ruta]);
    }
  });

  it('bloque B: los campos visibles de GLP', () => {
    for (const ruta of CAMPOS_VISIBLES_GLP) {
      const campo = ruta.split('.')[1];
      const contexto = base({ tipoCertificado: 'GLP_ANUAL', glp: { ...GLP_COMPLETO, [campo]: '' } });
      const errores = validarFormularioVehiculoVisible(contexto as any);
      expect(Object.keys(errores)).toEqual([ruta]);
    }
  });

  it('bloque B: los campos visibles de CONFORMIDAD', () => {
    for (const ruta of CAMPOS_VISIBLES_CONFORMIDAD) {
      const campo = ruta.split('.')[1];
      const contexto = base({
        tipoCertificado: 'CONFORMIDAD',
        modalidad: 'UNICA',
        conformidad: { ...CONFORMIDAD_COMPLETA, [campo]: '' },
      });
      const errores = validarFormularioVehiculoVisible(contexto as any);
      expect(Object.keys(errores)).toEqual([ruta]);
    }
  });

  it('titulares: una fila a medias bloquea, campo por campo', () => {
    for (const campo of CAMPOS_VISIBLES_TITULAR) {
      const contexto = base({ titulares: [{ ...TITULAR_COMPLETO, [campo]: '' }] });
      const errores = validarFormularioVehiculoVisible(contexto as any);
      expect(Object.keys(errores)).toEqual([`titular.0.${campo}`]);
    }
  });

  it('facturación: cada campo vacío bloquea con su propia key', () => {
    for (const campo of CAMPOS_VISIBLES_FACTURACION) {
      const contexto = base({ facturacion: { ...FACTURACION_COMPLETA, [campo]: '' } });
      const errores = validarFormularioVehiculoVisible(contexto as any);
      expect(Object.keys(errores)).toEqual([campo]);
    }
  });
});

describe('no se valida lo que no está renderizado', () => {
  it('un GNV no exige campos de GLP', () => {
    const errores = validarFormularioVehiculoVisible(base({
      tipoCertificado: 'GNV_ANUAL',
      glp: {},
      conformidad: {},
      titulares: [],
    }) as any);
    expect(errores).toEqual({});
  });

  it('un GLP no exige campos de GNV ni de conformidad', () => {
    const errores = validarFormularioVehiculoVisible(base({
      tipoCertificado: 'GLP_ANUAL',
      gnv: {},
      conformidad: {},
      titulares: [],
    }) as any);
    expect(errores).toEqual({});
  });

  it('una conformidad no exige taller ni verificaciones de taller', () => {
    const errores = validarFormularioVehiculoVisible(base({
      tipoCertificado: 'CONFORMIDAD',
      modalidad: 'UNICA',
      gnv: {},
      glp: {},
      titulares: [],
    }) as any);
    expect(errores).toEqual({});
  });

  it('los campos "después de la conversión" sólo se exigen en modalidad INICIAL', () => {
    const vacio = { ...GNV_COMPLETO, combustiblePosterior: '', pesoNetoPosterior: '' };
    const anual = validarFormularioVehiculoVisible(base({ tipoCertificado: 'GNV_ANUAL', modalidad: 'ANUAL', gnv: vacio }) as any);
    expect(anual).toEqual({});

    const inicial = validarFormularioVehiculoVisible(base({ tipoCertificado: 'GNV_ANUAL', modalidad: 'INICIAL', gnv: vacio }) as any);
    expect(Object.keys(inicial).sort()).toEqual(['gnv.combustiblePosterior', 'gnv.pesoNetoPosterior']);
  });
});

describe('qué se considera vacío', () => {
  it('cadena vacía, espacios, null, undefined y NaN son vacíos', () => {
    for (const valor of ['', '   ', '  \t ', null, undefined, NaN]) {
      expect(esValorVacioParaAvance(valor)).toBe(true);
    }
  });

  it('el cero NO es vacío: si el campo admite 0, 0 es un valor escrito', () => {
    expect(esValorVacioParaAvance(0)).toBe(false);
    expect(esValorVacioParaAvance('0')).toBe(false);
  });

  it('un select con placeholder es inválido y con valor real es válido', () => {
    const conPlaceholder = validarFormularioVehiculoVisible(base({
      caja: { placa: 'ABC123', categoria: '' },
    }) as any);
    expect(conPlaceholder.categoria).toBe(MENSAJE_CAMPO_OBLIGATORIO);

    const conValor = validarFormularioVehiculoVisible(base({
      caja: { placa: 'ABC123', categoria: 'N1' },
    }) as any);
    expect(conValor.categoria).toBeUndefined();
  });

  it('no inventa límites numéricos: 0 pasa aunque el campo sea numérico', () => {
    const errores = validarFormularioVehiculoVisible(base({
      vehiculo: { ...VEHICULO_COMPLETO, numeroCilindros: 0, pesoNeto: 0 },
    }) as any);
    expect(errores).toEqual({});
  });
});

describe('corregir un campo limpia sólo su error', () => {
  it('los errores de los demás campos vacíos permanecen', () => {
    const contexto = base({ vehiculo: { ...VEHICULO_COMPLETO, vin: '', formulaRodante: '' } });
    const errores = validarFormularioVehiculoVisible(contexto as any);
    expect(Object.keys(errores).sort()).toEqual(['formulaRodante', 'vin']);

    // El operador escribe el VIN: se retira su error, el otro sigue.
    const { vin, ...resto } = errores;
    expect(vin).toBeTruthy();
    expect(Object.keys(resto)).toEqual(['formulaRodante']);
  });
});

describe('autosave permanece flexible', () => {
  it('la validación no muta el estado que recibe', () => {
    const vehiculo = { ...VEHICULO_COMPLETO, vin: '', formulaRodante: '' };
    const copia = JSON.stringify(vehiculo);
    validarFormularioVehiculoVisible(base({ vehiculo }) as any);
    expect(JSON.stringify(vehiculo)).toBe(copia);
  });
});
