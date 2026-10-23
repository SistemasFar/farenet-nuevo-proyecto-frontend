import { describe, it, expect } from 'vitest';
import {
  obtenerCamposVehiculoCertificado,
  camposVehiculoEditables,
  normalizarCombustibleGnvAnual,
} from './faregas-certificado-campos';
import {
  camposObligatoriosVisibles,
  validarFormularioVehiculoVisible,
  validarExpedienteTecnico,
  validarCaracteresTecnicosConformidad,
  CAMPOS_VISIBLES_CONFORMIDAD,
  CAMPOS_VISIBLES_FACTURACION,
} from './faregas-wizard.validation';

describe('Campos vehiculares por template real y agrupaciones visuales', () => {
  it('GLP Inicial: 16 items vehiculares (items 2 a 17), orden exacto y 4 grupos con separador "/"', () => {
    const campos = obtenerCamposVehiculoCertificado('GLP_ANUAL', 'INICIAL');
    expect(campos).toHaveLength(16);

    // Items 2 a 9
    expect(campos[0]).toMatchObject({ campo: 'placaNueva', etiqueta: 'PLACA DE RODAJE', numero: 2, automatico: true });
    expect(campos[1]).toMatchObject({ campo: 'categoria', etiqueta: 'CATEGORÍA', numero: 3 });
    expect(campos[2]).toMatchObject({ campo: 'marca', etiqueta: 'MARCA', numero: 4 });
    expect(campos[3]).toMatchObject({ campo: 'modelo', etiqueta: 'MODELO', numero: 5 });
    expect(campos[4]).toMatchObject({ campo: 'version', etiqueta: 'VERSIÓN', numero: 6 });
    expect(campos[5]).toMatchObject({ campo: 'anioFabricacion', etiqueta: 'AÑO DE FABRICACIÓN', numero: 7 });
    expect(campos[6]).toMatchObject({ campo: 'vin', etiqueta: 'VIN / N° DE SERIE', numero: 8, grupo: 'vin-serie' });
    expect(campos[7]).toMatchObject({ campo: 'numeroMotor', etiqueta: 'N° DE MOTOR', numero: 9 });

    // Item 10: N° Cilindros / Cilindrada
    expect(campos[8]).toMatchObject({
      tipo: 'grupo',
      numero: 10,
      etiqueta: 'N° CILINDROS / CILINDRADA (CM³)',
      separador: '/',
      campos: [
        { campo: 'numeroCilindros', placeholder: 'N° Cilindros' },
        { campo: 'cilindrada', placeholder: 'Cilindrada' }
      ]
    });

    // Item 11: Combustible original
    expect(campos[9]).toMatchObject({ campo: 'combustible', etiqueta: 'COMBUSTIBLE ORIGINAL', numero: 11 });

    // Item 12: N° ejes / N° ruedas
    expect(campos[10]).toMatchObject({
      tipo: 'grupo',
      numero: 12,
      etiqueta: 'N° EJES / N° RUEDAS',
      separador: '/',
      campos: [
        { campo: 'numeroEjes', placeholder: 'N° Ejes' },
        { campo: 'numeroRuedas', placeholder: 'N° Ruedas' }
      ]
    });

    // Item 13: N° Asientos / Pasajeros
    expect(campos[11]).toMatchObject({
      tipo: 'grupo',
      numero: 13,
      etiqueta: 'N° ASIENTOS / PASAJEROS',
      separador: '/',
      campos: [
        { campo: 'numeroAsientos', placeholder: 'N° Asientos' },
        { campo: 'numeroPasajeros', placeholder: 'Pasajeros' }
      ]
    });

    // Item 14: Largo / Ancho / Alto (m)
    expect(campos[12]).toMatchObject({
      tipo: 'grupo',
      numero: 14,
      etiqueta: 'LARGO / ANCHO / ALTO (M)',
      separador: '/',
      campos: [
        { campo: 'longitud', placeholder: 'Largo' },
        { campo: 'ancho', placeholder: 'Ancho' },
        { campo: 'alto', placeholder: 'Alto' }
      ]
    });

    // Items 15 a 17
    expect(campos[13]).toMatchObject({ campo: 'pesoNeto', etiqueta: 'PESO NETO (KG)', numero: 15 });
    expect(campos[14]).toMatchObject({ campo: 'pesoBruto', etiqueta: 'PESO BRUTO VEHICULAR (KG)', numero: 16 });
    expect(campos[15]).toMatchObject({ campo: 'cargaUtil', etiqueta: 'CARGA ÚTIL (KG)', numero: 17 });

    // Campos aplanados para edición y validación
    const editables = camposVehiculoEditables('GLP_ANUAL', 'INICIAL');
    expect(editables).toEqual([
      'categoria', 'marca', 'modelo', 'version', 'anioFabricacion', 'vin', 'numeroMotor',
      'numeroCilindros', 'cilindrada',
      'combustible',
      'numeroEjes', 'numeroRuedas',
      'numeroAsientos', 'numeroPasajeros',
      'longitud', 'ancho', 'alto',
      'pesoNeto', 'pesoBruto', 'cargaUtil'
    ]);
  });

  it('GLP Anual: orden exacto 2 a 17, combustible automático readonly y agrupaciones con "/"', () => {
    const campos = obtenerCamposVehiculoCertificado('GLP_ANUAL', 'ANUAL');
    expect(campos).toHaveLength(16);

    // Item 10: N° Cilindros / Cilindrada
    expect(campos[8]).toMatchObject({
      tipo: 'grupo',
      numero: 10,
      separador: '/',
      campos: [{ campo: 'numeroCilindros' }, { campo: 'cilindrada' }]
    });

    // Item 11: Combustible GLP Anual automático
    const combField = campos[9];
    expect(combField).toMatchObject({
      campo: 'combustible',
      etiqueta: 'COMBUSTIBLE',
      numero: 11
    });

    // Item 12: N° ejes / N° ruedas
    expect(campos[10]).toMatchObject({
      tipo: 'grupo',
      numero: 12,
      separador: '/',
      campos: [{ campo: 'numeroEjes' }, { campo: 'numeroRuedas' }]
    });

    // Item 13: N° Asientos / Pasajeros
    expect(campos[11]).toMatchObject({
      tipo: 'grupo',
      numero: 13,
      separador: '/',
      campos: [{ campo: 'numeroAsientos' }, { campo: 'numeroPasajeros' }]
    });

    // Item 14: Largo / Ancho / Alto
    expect(campos[12]).toMatchObject({
      tipo: 'grupo',
      numero: 14,
      separador: '/',
      campos: [{ campo: 'longitud' }, { campo: 'ancho' }, { campo: 'alto' }]
    });

    // Combustible y placa automáticos no están en editables
    const editables = camposVehiculoEditables('GLP_ANUAL', 'ANUAL');
    expect(editables).not.toContain('placaNueva');
    expect(editables).not.toContain('combustibleGlpAnual');
    expect(editables).toContain('numeroCilindros');
    expect(editables).toContain('cilindrada');
    expect(editables).toContain('numeroEjes');
    expect(editables).toContain('numeroRuedas');
    expect(editables).toContain('numeroAsientos');
    expect(editables).toContain('numeroPasajeros');
    expect(editables).toContain('longitud');
    expect(editables).toContain('ancho');
    expect(editables).toContain('alto');
  });

  it('GNV (Inicial y Anual): 16 datos numerados 1 a 16 con agrupaciones exactas del template', () => {
    const campos = obtenerCamposVehiculoCertificado('GNV_ANUAL', 'ANUAL');
    expect(campos).toHaveLength(16);

    // Item 1 Placa
    expect(campos[0]).toMatchObject({ campo: 'placaNueva', numero: 1, automatico: true });

    // Item 9 Cilindros / Cilindrada
    expect(campos[8]).toMatchObject({
      tipo: 'grupo',
      numero: 9,
      etiqueta: 'N° CILINDROS / CILINDRADA (CM³)',
      separador: '/',
      campos: [{ campo: 'numeroCilindros' }, { campo: 'cilindrada' }]
    });

    // Item 10: el combustible anual se elige y se guarda, no es sólo texto visual.
    expect(campos[9]).toMatchObject({
      campo: 'combustible',
      numero: 10,
      opciones: [
        { valor: 'BI-COMBUSTIBLE GNV', etiqueta: 'BI-COMBUSTIBLE GNV' },
        { valor: 'GNV', etiqueta: 'GNV' },
      ],
    });
    expect(campos[9].automatico).not.toBe(true);

    // Item 11 Ejes / Ruedas
    expect(campos[10]).toMatchObject({
      tipo: 'grupo',
      numero: 11,
      etiqueta: 'N° EJES / N° RUEDAS',
      separador: '/',
      campos: [
        { campo: 'numeroEjes', formato: 'dos-digitos' },
        { campo: 'numeroRuedas', formato: 'dos-digitos' },
      ]
    });

    // Item 12 Asientos / Pasajeros
    expect(campos[11]).toMatchObject({
      tipo: 'grupo',
      numero: 12,
      etiqueta: 'N° ASIENTOS / PASAJEROS',
      separador: '/',
      campos: [
        { campo: 'numeroAsientos', formato: 'dos-digitos' },
        { campo: 'numeroPasajeros', formato: 'dos-digitos' },
      ]
    });

    // Item 13 Largo / Ancho / Alto
    expect(campos[12]).toMatchObject({
      tipo: 'grupo',
      numero: 13,
      etiqueta: 'LARGO / ANCHO / ALTO (M)',
      separador: '/',
      campos: [{ campo: 'longitud' }, { campo: 'ancho' }, { campo: 'alto' }]
    });

    // Items 14, 15, 16
    expect(campos[13]).toMatchObject({ campo: 'color', numero: 14 });
    expect(campos[14]).toMatchObject({ campo: 'pesoNeto', numero: 15 });
    expect(campos[15]).toMatchObject({ campo: 'pesoBruto', numero: 16 });

    // Carga útil no existe en el certificado GNV
    const camposNombres = campos.map(c => c.campo);
    expect(camposNombres).not.toContain('cargaUtil');
  });

  it('GNV Anual: conserva GNV o BI-COMBUSTIBLE GNV y reemplaza combustibles heredados', () => {
    expect(normalizarCombustibleGnvAnual('GNV')).toBe('GNV');
    expect(normalizarCombustibleGnvAnual('BI COMBUSTIBLE GNV')).toBe('BI-COMBUSTIBLE GNV');
    expect(normalizarCombustibleGnvAnual('BI - COMBUSTIBLE GNV')).toBe('BI-COMBUSTIBLE GNV');
    expect(normalizarCombustibleGnvAnual('DIESEL')).toBe('BI-COMBUSTIBLE GNV');
  });

  it('Conformidad: formato versión 2 vigente con agrupaciones Asientos/Pasajeros y Cilindrada/Cilindros', () => {
    const campos = obtenerCamposVehiculoCertificado('CONFORMIDAD');
    
    const grupoAsientos = campos.find(c => c.etiqueta === 'ASIENTOS / PASAJEROS');
    expect(grupoAsientos).toBeDefined();
    expect(grupoAsientos?.tipo).toBe('grupo');
    expect(grupoAsientos?.campos?.map(s => s.campo)).toEqual(['numeroAsientos', 'numeroPasajeros']);

    const grupoCilindrada = campos.find(c => c.etiqueta === 'CILINDRADA (CC) / CILINDROS');
    expect(grupoCilindrada).toBeDefined();
    expect(grupoCilindrada?.tipo).toBe('grupo');
    expect(grupoCilindrada?.campos?.map(s => s.campo)).toEqual(['cilindrada', 'numeroCilindros']);

    const editables = camposVehiculoEditables('CONFORMIDAD');
    expect(editables).toContain('numeroAsientos');
    expect(editables).toContain('numeroPasajeros');
    expect(editables).toContain('cilindrada');
    expect(editables).toContain('numeroCilindros');
  });
});

describe('Validacion frontend de campos visibles y obligatorios', () => {
  const facturacionValida = {
    tipoDocFac: 'BOLETA', tipoDocumentoFac: 'DNI', nroDocFac: '12345678', razonSocialFac: 'CLIENTE PRUEBA',
    direccionFac: 'CALLE 123', telefonoFac: '999888777', emailFac: 'test@example.com'
  };

  const vehiculoBase = {
    marca: 'TOYOTA', modelo: 'YARIS', version: 'STD', anioFabricacion: '2020',
    vin: '9BD1234567890', numeroMotor: 'MOT12345', numeroCilindros: '4', cilindrada: '1500',
    combustible: 'GASOLINA', numeroEjes: '2', numeroRuedas: '4', numeroAsientos: '5', numeroPasajeros: '4',
    longitud: '4.2', ancho: '1.7', alto: '1.5', pesoNeto: '1100', pesoBruto: '1500', cargaUtil: '400',
    color: 'ROJO'
  };

  it('Conformidad: no exige tipoTramite, motivo ni descripcion; sí exige tipoConformidad, caracteristicaRegistrable y usoOriginal', () => {
    expect(CAMPOS_VISIBLES_CONFORMIDAD).toEqual([
      'conformidad.caracteristicaRegistrable',
      'conformidad.usoOriginalVehiculo'
    ]);

    const obligatorios = camposObligatoriosVisibles('CONFORMIDAD');
    expect(obligatorios).not.toContain('conformidad.tipoConformidad');
    expect(obligatorios).toContain('conformidad.caracteristicaRegistrable');
    expect(obligatorios).toContain('conformidad.usoOriginalVehiculo');
    expect(obligatorios).not.toContain('conformidad.tipoTramite');
    expect(obligatorios).not.toContain('conformidad.motivo');
    expect(obligatorios).not.toContain('conformidad.descripcion');

    const errores = validarFormularioVehiculoVisible({
      tipoCertificado: 'CONFORMIDAD',
      caja: { categoria: 'M1' },
      vehiculo: {
        ...vehiculoBase,
        clase: 'M1', carroceria: 'SEDAN', anioModelo: '2020', serieChasis: '3BJ123',
        potencia: '100', formulaRodante: '4x2'
      },
      titulares: [{ nombreRazonSocial: 'JUAN PEREZ', direccion: '' }],
      gnv: {},
      glp: {},
      conformidad: {},
      facturacion: facturacionValida,
    });

    expect(errores['conformidad.tipoConformidad']).toBeUndefined();
    expect(errores['conformidad.caracteristicaRegistrable']).toBeDefined();
    expect(errores['titular.0.direccion']).toBeUndefined();
    expect(obligatorios).not.toContain('conformidad.tipoTramite');

    const erroresUsoHistorico = validarFormularioVehiculoVisible({
      tipoCertificado: 'CONFORMIDAD',
      caja: { categoria: 'M1' },
      vehiculo: {
        ...vehiculoBase,
        clase: 'M1', carroceria: 'SEDAN', anioModelo: '2020', serieChasis: '3BJ123',
        potencia: '100', formulaRodante: '4x2'
      },
      titulares: [{ nombreRazonSocial: 'JUAN PEREZ', direccion: '' }],
      gnv: {},
      glp: {},
      conformidad: {
        tipoConformidad: 'MODIFICACION',
        caracteristicaRegistrable: 'CAMBIO DE MOTOR',
        usoOriginalVehiculo: 'MIXTO',
      },
      facturacion: facturacionValida,
    });
    expect(erroresUsoHistorico['conformidad.usoOriginalVehiculo']).toContain('PERSONAS o MERCANCÍAS');
  });

  it('Conformidad acepta los caracteres técnicos solicitados sin afectar GLP/GNV', () => {
    expect(validarCaracteresTecnicosConformidad('CONFORMIDAD', {
      modelo: 'ACCENT-GL',
      version: 'GL-1.6/AT',
      numeroMotor: 'ABC-123/456',
      potencia: '75 kW @ 4500 RPM',
      cilindrada: '0.8',
      vin: 'KMHCT41BAGU99****',
    })).toEqual({});

    expect(validarCaracteresTecnicosConformidad('CONFORMIDAD', {
      modelo: 'GL/SPORT',
      version: 'GL-1.6/AT',
      numeroMotor: 'ABC/123456',
      potencia: '75/4500',
      cilindrada: '0',
      vin: '****',
    })).toEqual({});

    expect(validarCaracteresTecnicosConformidad('CONFORMIDAD', {
      modelo: 'MODELO_OK',
      version: 'STD',
      numeroMotor: 'MOTOR 123',
      potencia: '75#4500',
      cilindrada: '796/04',
      vin: 'VIN CON ESPACIO',
    })).toMatchObject({
      modelo: expect.any(String),
      numeroMotor: expect.any(String),
      potencia: expect.any(String),
      cilindrada: expect.any(String),
      vin: expect.any(String),
    });

    expect(validarCaracteresTecnicosConformidad('GLP_ANUAL', {
      modelo: 'MODELO_OK',
    })).toEqual({});
  });

  it('GNV Inicial: no exige verificaciones anuales, exige componentes y conversion', () => {
    const obligatorios = camposObligatoriosVisibles('GNV_ANUAL', 'INICIAL');
    expect(obligatorios).not.toContain('gnv.fechaVigencia');
    expect(obligatorios).toContain('gnv.combustiblePosterior');
    expect(obligatorios).toContain('gnv.pesoNetoPosterior');
    expect(obligatorios).not.toContain('gnv.verificaciones');

    const erroresExp = validarExpedienteTecnico({
      tipoCertificado: 'GNV_ANUAL',
      modalidad: 'INICIAL',
      caja: { placa: 'ABC123', categoria: 'M1' },
      vehiculo: vehiculoBase,
      titulares: [],
      gnv: { fechaVigencia: '2027-10-12', verificaciones: [] },
      glp: {},
      conformidad: {},
    });

    expect(erroresExp).not.toContain('Las 8 verificaciones GNV deben estar evaluadas como CUMPLE.');
  });

  it('GNV Anual: exige fecha de vigencia y verificaciones anuales', () => {
    const obligatorios = camposObligatoriosVisibles('GNV_ANUAL', 'ANUAL');
    expect(obligatorios).toContain('gnv.fechaVigencia');
    expect(obligatorios).not.toContain('gnv.combustiblePosterior');
    expect(obligatorios).not.toContain('gnv.pesoNetoPosterior');

    const erroresExp = validarExpedienteTecnico({
      tipoCertificado: 'GNV_ANUAL',
      modalidad: 'ANUAL',
      caja: { placa: 'ABC123', categoria: 'M1' },
      vehiculo: vehiculoBase,
      titulares: [],
      gnv: { fechaVigencia: '2027-10-12', verificaciones: [] },
      glp: {},
      conformidad: {},
    });

    expect(erroresExp).toContain('Las 8 verificaciones GNV deben estar evaluadas como CUMPLE.');
  });

  it('GLP Anual: no exige combustible manual y valida subcampos agrupados individualmente', () => {
    const camposEditables = camposVehiculoEditables('GLP_ANUAL', 'ANUAL');
    expect(camposEditables).not.toContain('combustibleGlpAnual');

    // Comprobamos que si falta un subcampo agrupado (ej. cilindrada), la validación lo detecta por separado
    const vehiculoIncompleto = { ...vehiculoBase, cilindrada: '' };
    const errores = validarFormularioVehiculoVisible({
      tipoCertificado: 'GLP_ANUAL',
      modalidad: 'ANUAL',
      caja: { categoria: 'M1' },
      vehiculo: vehiculoIncompleto,
      titulares: [{ nombreRazonSocial: 'PROPIETARIO GLP' }],
      glp: {
        fechaVigencia: '2027-10-12',
        verificaciones: Array.from({ length: 7 }, (_, i) => ({ codigo: String(i + 1), cumple: true })),
        componentes: [
          { componente: 'CILINDRO', marca: 'M1', modelo: 'MOD1', numeroSerie: 'S1', capacidadLitros: '48', mesFabricacion: '05', anioFabricacion: '2023' },
          { componente: 'REGULADOR', marca: 'M2', modelo: 'MOD2', numeroSerie: 'S2' },
        ],
      },
      gnv: {},
      conformidad: {},
      facturacion: facturacionValida,
    });

    expect(errores['cilindrada']).toBeDefined();
    expect(errores['numeroCilindros']).toBeUndefined();
  });

  it('Facturación permanece en todos los certificados', () => {
    expect(CAMPOS_VISIBLES_FACTURACION).toEqual([
      'tipoDocFac', 'tipoDocumentoFac', 'nroDocFac', 'razonSocialFac', 'telefonoFac'
    ]);
  });

  it('VIN / N° de Serie unificado: satisface validación con vin o serieChasis', () => {
    const gnvValido = {
      fechaVigencia: '2027-10-12',
      verificaciones: [
        { codigo: 'a', cumple: true }, { codigo: 'b', cumple: true },
        { codigo: 'c', cumple: true }, { codigo: 'd', cumple: true },
        { codigo: 'e', cumple: true }, { codigo: 'f', cumple: true },
        { codigo: 'g', cumple: true }, { codigo: 'h', cumple: true },
      ]
    };

    const errores = validarFormularioVehiculoVisible({
      tipoCertificado: 'GNV_ANUAL',
      modalidad: 'ANUAL',
      caja: { categoria: 'M1' },
      vehiculo: vehiculoBase,
      titulares: [],
      gnv: gnvValido,
      glp: {},
      conformidad: {},
      facturacion: facturacionValida,
    });

    expect(errores).toEqual({});
  });
});
