import { describe, expect, it } from 'vitest';
import { REGLAS_CAMPOS_TECNICOS, validarPasoExpedienteTecnico } from './faregas-wizard.validation';

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
  longitud: '4.300',
  ancho: '1.690',
  alto: '1.460',
  pesoNeto: '1301.000',
  pesoBruto: '1450.000',
  cargaUtil: '149.000',
  potencia: '105',
  formulaRodante: '4X2',
};

const titularValido = {
  tipoDocumento: 'DNI',
  nroDocumento: '32332244',
  nombreRazonSocial: 'SSSS',
  direccion: 'AV. PRINCIPAL 123',
};

/** Escenario de conformidad con todo lo suyo completo, salvo lo que se quiera romper. */
const conformidadCompleta = {
  tipoConformidad: 'LIVIANO',
  tipoTramite: 'PRIMERA',
  caracteristicaRegistrable: 'NUMERO DE EJES',
  motivo: 'RECTIFICACION',
  descripcion: 'Se rectifica',
  usoOriginalVehiculo: 'PARTICULAR',
};

const validar = (vehiculo: Record<string, any>, caja: Record<string, any> = { placa: 'ABC123', categoria: 'N1' }) =>
  validarPasoExpedienteTecnico({
    tipoCertificado: 'CONFORMIDAD',
    modalidad: 'UNICA',
    caja,
    vehiculo,
    titulares: [{ ...titularValido }],
    gnv: {},
    glp: {},
    conformidad: { ...conformidadCompleta },
  } as any);

describe('regresión: la categoría válida no puede marcar a otro campo', () => {
  it('categoría N1 con fórmula rodante vacía marca sólo la fórmula rodante', () => {
    const errores = validar({ ...VEHICULO_COMPLETO, formulaRodante: '' });

    expect(errores.categoria).toBeUndefined();
    expect(errores.formulaRodante).toBeTruthy();
    expect(errores.formulaRodante).toBe('Complete la fórmula rodante.');
  });

  it('no deja avanzar con la fórmula rodante vacía', () => {
    const errores = validar({ ...VEHICULO_COMPLETO, formulaRodante: '' });
    expect(Object.keys(errores)).toEqual(['formulaRodante']);
  });

  it('con la fórmula rodante escrita ya no hay esos errores', () => {
    const errores = validar({ ...VEHICULO_COMPLETO, formulaRodante: '4X2' });
    expect(errores.categoria).toBeUndefined();
    expect(errores.formulaRodante).toBeUndefined();
    expect(errores).toEqual({});
  });

  it('la categoría N1 se reconoce como valor válido y no como vacío', () => {
    // El valor vive en `caja`, no en `vehiculo`: leerlo del objeto equivocado
    // lo convertía en vacío siempre.
    const errores = validar({ ...VEHICULO_COMPLETO, formulaRodante: '4X2' }, { placa: 'ABC123', categoria: 'N1' });
    expect(errores.categoria).toBeUndefined();
  });

  it('sí marca la categoría cuando de verdad no se eligió ninguna', () => {
    for (const vacio of ['', null, undefined, '   ']) {
      const errores = validar({ ...VEHICULO_COMPLETO, formulaRodante: '4X2' }, { placa: 'ABC123', categoria: vacio });
      expect(errores.categoria).toBeTruthy();
      expect(errores.categoria).toBe('Complete la categoría vehicular.');
    }
  });

  it('el select y la regla comparten la misma clave "categoria"', () => {
    // Si el JSX consultara otra clave, el error no se vería en el select.
    const errores = validar({ ...VEHICULO_COMPLETO }, { placa: 'ABC123', categoria: '' });
    expect(Object.prototype.hasOwnProperty.call(errores, 'categoria')).toBe(true);
  });
});

describe('cada campo obligatorio vacío produce su propia key, sin cruces', () => {
  // Se recorre la tabla real de reglas: cada campo se vacía de uno en uno y se
  // exige que el error caiga exactamente en su key.
  const TIPOS: any = {
    GNV_ANUAL: 'GNV_ANUAL',
    GLP_ANUAL: 'GLP_ANUAL',
    CONFORMIDAD: 'CONFORMIDAD',
  };

  const extrasPorTipo = (tipo: string) => {
    if (tipo === 'GNV_ANUAL') {
      return {
        gnv: { tallerAutorizadoId: 2, fechaVigencia: '2027-01-01', verificaciones: Array.from({ length: 8 }, () => ({ cumple: true })) },
        titulares: [],
      };
    }
    if (tipo === 'GLP_ANUAL') {
      return {
        glp: {
          tallerAutorizadoId: 2,
          fechaVigencia: '2027-01-01',
          expedienteTecnico: 'DDDD',
          componentes: [
            { componente: 'CILINDRO', marca: 'TIAMET', modelo: 'CIL-10', numeroSerie: 'S1', capacidadLitros: '10', mesFabricacion: '03', anioFabricacion: '2024' },
            { componente: 'REGULADOR', marca: 'MASE', modelo: 'REG-10' },
          ],
          verificaciones: Array.from({ length: 7 }, () => ({ cumple: true })),
        },
        titulares: [{ ...titularValido }],
      };
    }
    return { conformidad: { ...conformidadCompleta }, titulares: [{ ...titularValido }] };
  };

  for (const tipo of Object.keys(TIPOS)) {
    it(`${tipo}: vaciar un campo produce únicamente su propia key`, () => {
      const reglas = REGLAS_CAMPOS_TECNICOS.filter(
        (r) => !r.tipos || r.tipos.includes(tipo as any)
      );
      expect(reglas.length).toBeGreaterThan(0);

      const fallos: string[] = [];
      for (const regla of reglas) {
        const base: Record<string, any> = { ...VEHICULO_COMPLETO, ...(regla.campo === 'categoria' ? {} : {}) };
        // el valor de la categoría vive en caja, el resto en vehiculo
        const caja: Record<string, any> = { placa: 'ABC123', categoria: 'N1' };
        const vehiculo = { ...base };
        if (regla.campo === 'categoria') caja.categoria = '';
        else vehiculo[regla.campo] = '';

        const errores = validarPasoExpedienteTecnico({
          tipoCertificado: tipo as any,
          modalidad: 'ANUAL',
          caja,
          vehiculo,
          titulares: extrasPorTipo(tipo).titulares ?? [],
          gnv: (extrasPorTipo(tipo) as any).gnv ?? {},
          glp: (extrasPorTipo(tipo) as any).glp ?? {},
          conformidad: (extrasPorTipo(tipo) as any).conformidad ?? {},
        } as any);

        const keys = Object.keys(errores);
        if (!keys.includes(regla.campo)) {
          fallos.push(`${regla.campo}: no produjo su propia key (obtuvo ${JSON.stringify(keys)})`);
        }
        if (keys.length !== 1) {
          fallos.push(`${regla.campo}: se contaminó con otras keys ${JSON.stringify(keys)}`);
        }
      }
      expect(fallos).toEqual([]);
    });
  }
});

describe('referencia: la tabla de reglas no declara campos sin control', () => {
  it('cada campo de la tabla existe como control en el formulario', () => {
    // Guarda contra futuras reglas que nombren un campo que nadie pinta.
    const nombresDeInput = new Set([
      'marca', 'modelo', 'version', 'anioFabricacion', 'anioModelo', 'vin', 'serieChasis',
      'numeroMotor', 'combustible', 'color', 'clase', 'categoria', 'carroceria',
      'numeroCilindros', 'cilindrada', 'numeroEjes', 'numeroRuedas', 'numeroAsientos',
      'numeroPasajeros', 'longitud', 'ancho', 'alto', 'pesoNeto', 'pesoBruto', 'cargaUtil',
      'potencia', 'formulaRodante',
    ]);
    for (const regla of REGLAS_CAMPOS_TECNICOS) {
      expect(nombresDeInput.has(regla.campo)).toBe(true);
    }
  });
});
