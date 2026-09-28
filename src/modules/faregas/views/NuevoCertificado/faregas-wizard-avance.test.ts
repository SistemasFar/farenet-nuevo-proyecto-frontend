import { describe, expect, it } from 'vitest';
import {
  validarDatosFacturacionCampos,
  validarPasoExpedienteTecnico,
  type ErroresCampo,
} from './faregas-wizard.validation';

/**
 * Integración del avance del paso "Vehículo y Datos Técnicos".
 *
 * El handler real (irSiguientePaso en NuevoCertificadoView) compone el objeto
 * de errores con validarPasoExpedienteTecnico + validarDatosFacturacionCampos
 * y llama bloquearPaso(errores), que devuelve true (y por tanto NO avanza)
 * cuando el objeto tiene al menos una clave.
 *
 * Estas pruebas reproducen exactamente esa composición y esa decisión, para
 * comprobar que un campo obligatorio vacío detiene el avance.
 */

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
  categoria: '',
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
  formulaRodante: '',
};

const FACTURACION_VALIDA = {
  tipoDocFac: 'BOLETA',
  nroDocFac: '74045612',
  razonSocialFac: 'GRACE IBARRA',
  direccionFac: 'AV. PRINCIPAL 123',
  telefonoFac: '987654321',
  emailFac: 'grace@example.com',
};

const titularValido = {
  tipoDocumento: 'DNI',
  nroDocumento: '32332244',
  nombreRazonSocial: 'SSSS',
  direccion: 'AV. PRINCIPAL 123',
};

const especificosDe = (tipo: string) => {
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
  return {
    conformidad: {
      tipoConformidad: 'LIVIANO',
      tipoTramite: 'PRIMERA',
      caracteristicaRegistrable: 'NUMERO DE EJES',
      motivo: 'RECTIFICACION',
      descripcion: 'Se rectifica',
      usoOriginalVehiculo: 'PARTICULAR',
    },
    titulares: [{ ...titularValido }],
  };
};

/** Compone los errores igual que el handler y devuelve si el avance se bloquea. */
const evaluatingAvance = (
  tipo: string,
  vehiculo: Record<string, any>,
  facturacion: Record<string, any> = FACTURACION_VALIDA
) => {
  const extras = especificosDe(tipo);
  const erroresCampo: ErroresCampo = {
    ...validarPasoExpedienteTecnico({
      tipoCertificado: tipo,
      modalidad: tipo === 'CONFORMIDAD' ? 'UNICA' : 'ANUAL',
      caja: { placa: 'ABC123', categoria: 'N1' },
      vehiculo,
      titulares: extras.titulares,
      gnv: (extras as any).gnv ?? {},
      glp: (extras as any).glp ?? {},
      conformidad: (extras as any).conformidad ?? {},
    } as any),
    ...validarDatosFacturacionCampos(facturacion),
  };
  // Esto es literalmente lo que hace bloquearPaso() en la vista.
  const bloqueado = Object.keys(erroresCampo).length > 0;
  return { erroresCampo, bloqueado };
};

describe('integración: un campo obligatorio vacío detiene el avance', () => {
  it('A. GNV con la marca vacía no avanza', () => {
    const { erroresCampo, bloqueado } = evaluatingAvance('GNV_ANUAL', { ...VEHICULO_COMPLETO, marca: '', color: 'BLANCO' });
    expect(bloqueado).toBe(true);
    expect(erroresCampo.marca).toBeTruthy();
  });

  it('B. GLP con la marca vacía no avanza', () => {
    const { erroresCampo, bloqueado } = evaluatingAvance('GLP_ANUAL', { ...VEHICULO_COMPLETO, marca: '' });
    expect(bloqueado).toBe(true);
    expect(erroresCampo.marca).toBeTruthy();
  });

  it('C. CONFORMIDAD con la marca vacía no avanza', () => {
    const { erroresCampo, bloqueado } = evaluatingAvance('CONFORMIDAD', { ...VEHICULO_COMPLETO, marca: '' });
    expect(bloqueado).toBe(true);
    expect(erroresCampo.marca).toBeTruthy();
  });

  it('D. CONFORMIDAD con la fórmula rodante vacía no avanza', () => {
    const { erroresCampo, bloqueado } = evaluatingAvance('CONFORMIDAD', { ...VEHICULO_COMPLETO, formulaRodante: '', anioModelo: '2010' });
    expect(bloqueado).toBe(true);
    expect(erroresCampo.formulaRodante).toBeTruthy();
    expect(erroresCampo.marca).toBeUndefined();
  });

  it('E. GNV con la fórmula rodante vacía SÍ puede avanzar (regla actual)', () => {
    const { erroresCampo, bloqueado } = evaluatingAvance('GNV_ANUAL', { ...VEHICULO_COMPLETO, formulaRodante: '' });
    expect(bloqueado).toBe(false);
    expect(erroresCampo.formulaRodante).toBeUndefined();
  });

  it('F. GLP con la fórmula rodante vacía SÍ puede avanzar (regla actual)', () => {
    const { bloqueado } = evaluatingAvance('GLP_ANUAL', { ...VEHICULO_COMPLETO, formulaRodante: '' });
    expect(bloqueado).toBe(false);
  });

  it('G. con todos los obligatorios completos avanza en los tres tipos', () => {
    const gnv = evaluatingAvance('GNV_ANUAL', { ...VEHICULO_COMPLETO, color: 'BLANCO' });
    expect(gnv.erroresCampo).toEqual({});
    expect(gnv.bloqueado).toBe(false);

    const glp = evaluatingAvance('GLP_ANUAL', { ...VEHICULO_COMPLETO });
    expect(glp.bloqueado).toBe(false);

    const conformidad = evaluatingAvance('CONFORMIDAD', { ...VEHICULO_COMPLETO, formulaRodante: '4X2' });
    expect(conformidad.bloqueado).toBe(false);
  });
});

describe('integración: el vacío nunca se confunde con un valor válido', () => {
  it('la categoría N1 no bloquea por sí sola', () => {
    const { bloqueado } = evaluatingAvance('GNV_ANUAL', { ...VEHICULO_COMPLETO, color: 'BLANCO' });
    expect(bloqueado).toBe(false);
  });

  it('la categoría realmente vacía sí bloquea', () => {
    const gnv = especificosDe('GNV_ANUAL');
    const erroresCampo = validarPasoExpedienteTecnico({
      tipoCertificado: 'GNV_ANUAL',
      modalidad: 'ANUAL',
      caja: { placa: 'ABC123', categoria: '' },
      vehiculo: { ...VEHICULO_COMPLETO, color: 'BLANCO' },
      titulares: [],
      gnv: gnv.gnv,
      glp: {},
      conformidad: {},
    } as any);
    expect(erroresCampo.categoria).toBeTruthy();
    expect(Object.keys(erroresCampo)).toEqual(['categoria']);
  });

  it('los datos de facturación también bloquean el avance de este paso', () => {
    const { erroresCampo, bloqueado } = evaluatingAvance('GNV_ANUAL', { ...VEHICULO_COMPLETO, color: 'BLANCO' }, {
      ...FACTURACION_VALIDA,
      emailFac: '',
    });
    expect(bloqueado).toBe(true);
    expect(erroresCampo.emailFac).toBeTruthy();
  });
});

describe('integración: several campos a la vez siguen bloqueando', () => {
  it('acumula y no deja pasar con marca, modelo y motor vacíos', () => {
    const { erroresCampo, bloqueado } = evaluatingAvance('GNV_ANUAL', {
      ...VEHICULO_COMPLETO,
      color: 'BLANCO',
      marca: '',
      modelo: '',
      numeroMotor: '',
    });
    expect(bloqueado).toBe(true);
    expect(Object.keys(erroresCampo).sort()).toEqual(['marca', 'modelo', 'numeroMotor']);
  });
});
