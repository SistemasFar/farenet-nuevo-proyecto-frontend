import { describe, expect, it } from 'vitest';
import {
  validarAniosVehiculo,
  validarCamposTecnicos,
  validarDatosEspecificos,
  validarDatosFacturacionCampos,
  validarDatosInicialesCampos,
  validarIdentificacionVehiculo,
  validarPasoExpedienteTecnico,
  validarPasoPago,
  camposObligatorios,
  type ErroresCampo,
} from './faregas-wizard.validation';
import { claseConError } from './faregas-wizard-errores';

const VEHICULO_COMPLETO: Record<string, any> = {
  placa: 'ABC123',
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
  // En la aplicación la categoría se elige en el paso 1 y llega ya resuelta
  // desde `caja`; estas pruebas unitarias de `validarCamposTecnicos` la pasan
  // resuelta. El recorrido real se prueba en faregas-mapping.test.ts.
  categoria: 'N3',
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
  formulaRodante: '4X4',
};

const TITULAR_COMPLETO = {
  tipoDocumento: 'DNI',
  nroDocumento: '32332244',
  nombreRazonSocial: 'SSSS',
  direccion: 'AV. PRINCIPAL 123',
};

const tallerYVerificaciones = (cantidad: number) => ({
  tallerAutorizadoId: 2,
  fechaVigencia: '2027-01-01',
  verificaciones: Array.from({ length: cantidad }, () => ({ cumple: true })),
});

const COMPONENTES_GLP = [
  {
    componente: 'CILINDRO',
    marca: 'TIAMET',
    modelo: 'CIL-10',
    numeroSerie: 'S1',
    capacidadLitros: '10',
    mesFabricacion: '03',
    anioFabricacion: '2024',
  },
  { componente: 'REGULADOR', marca: 'MASE', modelo: 'REG-10' },
];

const CONFORMIDAD_COMPLETA = {
  tipoConformidad: 'LIVIANO',
  tipoTramite: 'PRIMERA',
  caracteristicaRegistrable: 'NUMERO DE EJES',
  motivo: 'RECTIFICACION',
  descripcion: 'Se rectifica',
  usoOriginalVehiculo: 'PARTICULAR',
};

const escenario = (tipo: any, extra: Record<string, any> = {}) => ({
  tipoCertificado: tipo,
  modalidad: 'ANUAL',
  // La categoría vehicular NO es un campo de `formVehiculo`: se elige en el
  // paso de datos iniciales y vive en `formCaja.categoria`. Por eso el
  // escenario la coloca en `caja`, igual que en la aplicación real.
  caja: { placa: 'ABC123', categoria: 'N3' },
  vehiculo: { ...VEHICULO_COMPLETO },
  titulares: [{ ...TITULAR_COMPLETO }],
  gnv: {},
  glp: {},
  conformidad: {},
  ...extra,
});

describe('bloqueo del avance por campo obligatorio vacio', () => {
  it('marca unicamente el campo que falta', () => {
    const errores = validarCamposTecnicos('GNV_ANUAL', { ...VEHICULO_COMPLETO, marca: '' });
    expect(Object.keys(errores)).toEqual(['marca']);
    expect(errores.marca).toBe('Complete la marca.');
  });

  it('acumula varios errores a la vez y no avanza', () => {
    const errores = validarCamposTecnicos('GNV_ANUAL', {
      ...VEHICULO_COMPLETO,
      marca: '',
      modelo: '',
      numeroMotor: '',
    });
    expect(Object.keys(errores).sort()).toEqual(['marca', 'modelo', 'numeroMotor']);
  });

  it('deja pasar cuando todos los campos son validos', () => {
    expect(validarCamposTecnicos('GNV_ANUAL', { ...VEHICULO_COMPLETO })).toEqual({});
  });
});

describe('estilo del campo invalido', () => {
  const base = 'w-full p-2 border-2 border-slate-200 rounded-lg';

  it('sustituye el color de borde en vez de acumular otro', () => {
    const conError = claseConError(base, true);
    expect(conError).toContain('border-red-500');
    expect(conError).not.toMatch(/border-slate-/);
  });

  it('deja la clase intacta cuando el campo es valido', () => {
    expect(claseConError(base, false)).toBe(base);
  });
});

describe('regla de anios ya existente', () => {
  it('bloquea cuando el anio modelo es posterior al de fabricacion', () => {
    const errores = validarAniosVehiculo({ anioModelo: '2026', anioFabricacion: '2025' });
    expect(errores.anioModelo).toBe('El Año Modelo no puede ser mayor que el Año de Fabricación.');
  });

  it('permite el mismo anio en modelo y fabricacion', () => {
    expect(validarAniosVehiculo({ anioModelo: '2025', anioFabricacion: '2025' })).toEqual({});
  });

  it('permite un modelo anterior al de fabricacion', () => {
    expect(validarAniosVehiculo({ anioModelo: '2024', anioFabricacion: '2025' })).toEqual({});
  });

  it('no inventa el error si falta alguno de los dos anios', () => {
    expect(validarAniosVehiculo({ anioFabricacion: '2025' })).toEqual({});
    expect(validarAniosVehiculo({ anioModelo: '2025' })).toEqual({});
  });
});

describe('validacion numerica: no basta con que el campo no este vacio', () => {
  it('rechaza texto en un campo entero', () => {
    const errores = validarCamposTecnicos('GNV_ANUAL', { ...VEHICULO_COMPLETO, numeroCilindros: 'cuatro' });
    expect(errores.numeroCilindros).toMatch(/entero/);
  });

  it('rechaza cero y negativos en un campo entero', () => {
    expect(validarCamposTecnicos('GNV_ANUAL', { ...VEHICULO_COMPLETO, numeroCilindros: '0' }).numeroCilindros).toBeTruthy();
    expect(validarCamposTecnicos('GNV_ANUAL', { ...VEHICULO_COMPLETO, numeroEjes: '-2' }).numeroEjes).toBeTruthy();
  });

  it('rechaza decimales donde se espera un entero', () => {
    expect(validarCamposTecnicos('GNV_ANUAL', { ...VEHICULO_COMPLETO, numeroCilindros: '4.5' }).numeroCilindros).toBeTruthy();
  });

  it('acepta enteros positivos reales', () => {
    expect(validarCamposTecnicos('GNV_ANUAL', { ...VEHICULO_COMPLETO, numeroCilindros: '4', numeroEjes: '2' })).toEqual({});
  });

  it('exige numero en los campos decimales', () => {
    expect(validarCamposTecnicos('GNV_ANUAL', { ...VEHICULO_COMPLETO, pesoNeto: 'pesado' }).pesoNeto).toMatch(/decimal/);
  });

  it('acepta decimales positivos', () => {
    expect(validarCamposTecnicos('GNV_ANUAL', { ...VEHICULO_COMPLETO, pesoNeto: '1301.50' })).toEqual({});
  });
});

describe('VIN y serie de chasis son alternativos', () => {
  it('basta con el VIN', () => {
    expect(validarIdentificacionVehiculo({ vin: 'X', serieChasis: '' })).toEqual({});
  });

  it('basta con la serie de chasis', () => {
    expect(validarIdentificacionVehiculo({ vin: '', serieChasis: 'Y' })).toEqual({});
  });

  it('exige alguno de los dos', () => {
    expect(validarIdentificacionVehiculo({ vin: '', serieChasis: '' }).vin).toBeTruthy();
  });
});

describe('GNV exige lo suyo y nada de GLP', () => {
  it('pide taller, vigencia y las 8 verificaciones', () => {
    const errores = validarDatosEspecificos({ tipo: 'GNV_ANUAL', gnv: {}, glp: {}, conformidad: {} });
    expect(errores['gnv.tallerAutorizadoId']).toBeTruthy();
    expect(errores['gnv.fechaVigencia']).toBeTruthy();
    expect(errores['gnv.verificaciones']).toMatch(/8 verificaciones/);
  });

  it('no pide expediente tecnico ni componentes de GLP', () => {
    const errores = validarDatosEspecificos({ tipo: 'GNV_ANUAL', gnv: tallerYVerificaciones(8), glp: {}, conformidad: {} });
    expect(errores['glp.expedienteTecnico']).toBeUndefined();
    expect(errores['glp.componentes']).toBeUndefined();
  });

  it('no exige carga util, que es regla de GLP y conformidad', () => {
    expect(validarCamposTecnicos('GNV_ANUAL', { ...VEHICULO_COMPLETO, cargaUtil: '' }).cargaUtil).toBeUndefined();
  });
});

describe('GLP exige lo suyo y nada de GNV', () => {
  const glpCompleto = {
    ...tallerYVerificaciones(7),
    expedienteTecnico: 'DDDD',
    componentes: COMPONENTES_GLP,
  };

  it('pide taller, vigencia, expediente, componentes y 7 verificaciones', () => {
    const errores = validarDatosEspecificos({ tipo: 'GLP_ANUAL', gnv: {}, glp: {}, conformidad: {} });
    expect(errores['glp.tallerAutorizadoId']).toBeTruthy();
    expect(errores['glp.expedienteTecnico']).toBeTruthy();
    expect(errores['glp.componentes']).toBeTruthy();
    expect(errores['glp.verificaciones']).toMatch(/7 verificaciones/);
  });

  it('exige los datos completos del cilindro', () => {
    const errores = validarDatosEspecificos({
      tipo: 'GLP_ANUAL',
      gnv: {},
      glp: { ...glpCompleto, componentes: [{ componente: 'CILINDRO', marca: 'TIAMET' }, COMPONENTES_GLP[1]] },
      conformidad: {},
    });
    expect(errores['glp.componentes.CILINDRO.modelo']).toBeTruthy();
    expect(errores['glp.componentes.CILINDRO.numeroSerie']).toBeTruthy();
    expect(errores['glp.componentes.CILINDRO.capacidadLitros']).toBeTruthy();
  });

  it('no acepta componentes de GNV como cumplimiento de GLP', () => {
    const errores = validarDatosEspecificos({
      tipo: 'GLP_ANUAL',
      gnv: {},
      glp: { ...glpCompleto, componentes: [{ componente: 'REDUCTOR', marca: 'X' }] },
      conformidad: {},
    });
    expect(errores['glp.componentes']).toBeTruthy();
  });

  it('exige la carga util, que GNV no pide', () => {
    expect(validarCamposTecnicos('GLP_ANUAL', { ...VEHICULO_COMPLETO, cargaUtil: '' }).cargaUtil).toBeTruthy();
  });
});

describe('CONFORMIDAD exige lo suyo y nada de GNV o GLP', () => {
  it('pide tipo, tramite, caracteristica, motivo, descripcion y uso', () => {
    const errores = validarDatosEspecificos({ tipo: 'CONFORMIDAD', gnv: {}, glp: {}, conformidad: {} });
    expect(errores['conformidad.tipoConformidad']).toBeTruthy();
    expect(errores['conformidad.tipoTramite']).toBeTruthy();
    expect(errores['conformidad.motivo']).toBeTruthy();
  });

  it('no pide taller ni verificaciones de taller', () => {
    const errores = validarDatosEspecificos({ tipo: 'CONFORMIDAD', gnv: {}, glp: {}, conformidad: CONFORMIDAD_COMPLETA });
    expect(errores['gnv.verificaciones']).toBeUndefined();
    expect(errores['glp.verificaciones']).toBeUndefined();
  });

  it('exige los campos tecnicos propios de conformidad', () => {
    const errores = validarCamposTecnicos('CONFORMIDAD', {
      ...VEHICULO_COMPLETO,
      clase: '',
      carroceria: '',
      anioModelo: '',
      formulaRodante: '',
      potencia: '',
    });
    expect(Object.keys(errores).sort()).toEqual(['anioModelo', 'carroceria', 'clase', 'formulaRodante', 'potencia']);
  });

  it('acepta un expediente completo de conformidad', () => {
    const errores = validarPasoExpedienteTecnico(escenario('CONFORMIDAD', { conformidad: CONFORMIDAD_COMPLETA }));
    expect(errores).toEqual({});
  });
});

describe('titulares', () => {
  it('exige al menos un titular en GLP', () => {
    const errores = validarPasoExpedienteTecnico(escenario('GLP_ANUAL', {
      titulares: [],
      glp: { ...tallerYVerificaciones(7), expedienteTecnico: 'D', componentes: COMPONENTES_GLP },
    }));
    expect(errores.titulares).toBeTruthy();
  });

  it('no exige titulares en GNV', () => {
    const errores = validarPasoExpedienteTecnico(escenario('GNV_ANUAL', { titulares: [], gnv: tallerYVerificaciones(8) }));
    expect(errores.titulares).toBeUndefined();
  });

  it('marca cada campo del titular por separado', () => {
    const errores = validarPasoExpedienteTecnico(escenario('CONFORMIDAD', {
      titulares: [{ tipoDocumento: '', nroDocumento: '', nombreRazonSocial: '', direccion: '' }],
      conformidad: CONFORMIDAD_COMPLETA,
    }));
    expect(errores['titular.0.tipoDocumento']).toBeTruthy();
    expect(errores['titular.0.nroDocumento']).toBeTruthy();
    expect(errores['titular.0.nombreRazonSocial']).toBeTruthy();
    expect(errores['titular.0.direccion']).toBeTruthy();
  });
});

describe('paso completo de expediente tecnico', () => {
  it('no deja avanzar con un vehiculo incompleto', () => {
    const errores = validarPasoExpedienteTecnico(escenario('GNV_ANUAL', {
      vehiculo: { ...VEHICULO_COMPLETO, marca: '', vin: '', serieChasis: '' },
      gnv: tallerYVerificaciones(8),
    }));
    expect(errores.marca).toBeTruthy();
    expect(errores.vin).toBeTruthy();
  });

  it('no deja avanzar con un borrador reutilizado incompleto', () => {
    // Un vehiculo recuperado de la base puede venir con huecos: se aplica la
    // misma regla que para uno capturado a mano. La categoría vacía se
    // comprueba donde vive, en `caja`.
    const desdeBd = { ...VEHICULO_COMPLETO, version: '' };
    const errores = validarPasoExpedienteTecnico(escenario('GNV_ANUAL', {
      vehiculo: desdeBd,
      caja: { placa: 'ABC123', categoria: '' },
      gnv: tallerYVerificaciones(8),
    }));
    expect(errores.categoria).toBeTruthy();
    expect(errores.version).toBeTruthy();
  });

  it('trata el placeholder de un select como valor no elegido', () => {
    // El valor llega por `caja`; un placeholder como "-- SELECCIONAR --"
    // se persiste como cadena vacía y debe contar como faltante.
    for (const valor of ['', null, undefined, '   ']) {
      const errores = validarPasoExpedienteTecnico(escenario('GNV_ANUAL', {
        caja: { placa: 'ABC123', categoria: valor },
        gnv: tallerYVerificaciones(8),
      }));
      expect(errores.categoria).toBeTruthy();
    }
  });

  it('acepta un expediente completo de GNV', () => {
    expect(validarPasoExpedienteTecnico(escenario('GNV_ANUAL', { gnv: tallerYVerificaciones(8) }))).toEqual({});
  });

  it('acepta un expediente completo de GLP', () => {
    const errores = validarPasoExpedienteTecnico(escenario('GLP_ANUAL', {
      glp: { ...tallerYVerificaciones(7), expedienteTecnico: 'DDDD', componentes: COMPONENTES_GLP },
    }));
    expect(errores).toEqual({});
  });
});

describe('datos iniciales', () => {
  it('exige servicio, placa y modalidad', () => {
    const errores = validarDatosInicialesCampos({ tipoCertificado: 'GNV_ANUAL' });
    expect(Object.keys(errores).sort()).toEqual(['modalidadCertificado', 'placa', 'tarifaCodigo']);
  });

  it('no exige modalidad en conformidad', () => {
    expect(validarDatosInicialesCampos({ tipoCertificado: 'CONFORMIDAD', tarifaCodigo: 'X', placa: 'ABC123' })).toEqual({});
  });
});

describe('paso de pago: se respetan las reglas existentes', () => {
  it('CONTADO exige el total completo', () => {
    const errores = validarPasoPago({ condicionPago: 'CONTADO', pagos: [{ importe: 50 }], precioTotal: 100 });
    expect(errores.pagos).toMatch(/Saldo pendiente/);
  });

  it('CONTADO acepta el pago completo', () => {
    expect(validarPasoPago({ condicionPago: 'CONTADO', pagos: [{ importe: 100 }], precioTotal: 100 })).toEqual({});
  });

  it('CREDITO debe conservar saldo', () => {
    expect(validarPasoPago({ condicionPago: 'CREDITO', pagos: [{ importe: 100 }], precioTotal: 100 }).pagos).toBeTruthy();
  });

  it('CREDITO acepta un pago parcial', () => {
    expect(validarPasoPago({ condicionPago: 'CREDITO', pagos: [{ importe: 40 }], precioTotal: 100 })).toEqual({});
  });
});

describe('datos de facturacion por campo', () => {
  const valido = {
    tipoDocFac: 'BOLETA',
    nroDocFac: '74045612',
    razonSocialFac: 'GRACE',
    direccionFac: 'AV. 123',
    telefonoFac: '987654321',
    emailFac: 'grace@example.com',
  };

  it('acepta los datos completos', () => {
    expect(validarDatosFacturacionCampos(valido)).toEqual({});
  });

  it('marca el campo exacto de cada problema sin tocar los demas', () => {
    const errores = validarDatosFacturacionCampos({ ...valido, razonSocialFac: '', emailFac: 'grace@' });
    expect(errores.razonSocialFac).toBeTruthy();
    expect(errores.emailFac).toBeTruthy();
    expect(errores.telefonoFac).toBeUndefined();
  });
});

describe('asteriscos derivados de la misma regla que valida', () => {
  it('GNV no marca carga util ni clase vehicular', () => {
    const obligatory = camposObligatorios('GNV_ANUAL');
    expect(obligatory).toContain('marca');
    expect(obligatory).not.toContain('cargaUtil');
    expect(obligatory).not.toContain('clase');
  });

  it('GLP si marca carga util', () => {
    expect(camposObligatorios('GLP_ANUAL')).toContain('cargaUtil');
  });

  it('CONFORMIDAD marca lo propio y no marca taller', () => {
    const obligatory = camposObligatorios('CONFORMIDAD');
    expect(obligatory).toContain('formulaRodante');
    expect(obligatory).toContain('anioModelo');
    expect(obligatory).not.toContain('tallerAutorizadoId');
  });
});

describe('autosave permanece flexible', () => {
  it('las reglas viven en funciones puras: no mutan los datos recibidos', () => {
    const vehiculo = { ...VEHICULO_COMPLETO, marca: '' };
    const copia = JSON.stringify(vehiculo);
    validarCamposTecnicos('GNV_ANUAL', vehiculo);
    validarPasoExpedienteTecnico(escenario('GNV_ANUAL', { vehiculo, gnv: tallerYVerificaciones(8) }));
    expect(JSON.stringify(vehiculo)).toBe(copia);
  });

  it('validar no borra ni rellena datos: solo informa', () => {
    const resultado: ErroresCampo = validarCamposTecnicos('GNV_ANUAL', { ...VEHICULO_COMPLETO, marca: '' });
    expect(resultado).toEqual({ marca: 'Complete la marca.' });
  });

  it('corregir un campo elimina solo su error', () => {
    const errores: ErroresCampo = validarCamposTecnicos('GNV_ANUAL', { ...VEHICULO_COMPLETO, marca: '', modelo: '' });
    const { marca, ...resto } = errores;
    expect(marca).toBeTruthy();
    expect(Object.keys(resto)).toEqual(['modelo']);
  });
});
