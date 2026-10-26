import { describe, expect, it } from 'vitest';
import { construirPropuestaRectificacion } from './rectificacion-propuesta';

const base = (tipoCertificado: string, extra: Partial<Parameters<typeof construirPropuestaRectificacion>[0]> = {}) => ({
  tipoCertificado,
  formCaja: {
    placa: 'ABC123',
    categoria: 'M1',
    modalidadCertificado: 'ANUAL'
  },
  formVehiculo: {
    placaNueva: 'TEC999',
    clase: 'CAMIONETA',
    marca: 'TOYOTA',
    modelo: 'HILUX',
    vin: 'VIN-001',
    serieChasis: 'CHASIS-001',
    numeroMotor: 'MOTOR-001'
  },
  titulares: [{
    orden: 1,
    tipoDocumento: 'DNI',
    nroDocumento: '12345678',
    nombreRazonSocial: 'JUAN PEREZ',
    direccion: 'AV. UNO 123'
  }],
  formGnv: {},
  formGlp: {},
  formConformidad: {},
  formatoValores: {},
  esTallerInspeccion: false,
  ...extra
} as Parameters<typeof construirPropuestaRectificacion>[0]);

describe('propuesta de rectificación', () => {
  it('prioriza la placa de caja y conserva los datos técnicos y del titular', () => {
    const propuesta = construirPropuestaRectificacion(base('GLP_ANUAL'));

    expect(propuesta.placa).toBe('ABC123');
    expect(propuesta.marca).toBe('TOYOTA');
    expect(propuesta.modelo).toBe('HILUX');
    expect(propuesta.vin).toBe('VIN-001');
    expect(propuesta.serie_chasis).toBe('CHASIS-001');
    expect(propuesta.numero_motor).toBe('MOTOR-001');
    expect(propuesta.nombre_razon_social).toBe('JUAN PEREZ');
    expect(propuesta.nro_documento).toBe('12345678');
    expect(propuesta.direccion).toBe('AV. UNO 123');
  });

  it('agrega sólo los campos específicos GNV y sus colecciones', () => {
    const propuesta = construirPropuestaRectificacion(base('GNV_ANUAL', {
      formGnv: {
        fechaVigencia: '2027-04-09',
        numeroChip: 'CHIP-01',
        observaciones: 'CORRECCIÓN DE CHIP',
        combustiblePosterior: 'BI - COMBUSTIBLE GNV',
        pesoNetoPosterior: '1200',
        componentes: [{ componente: 'CILINDRO', marca: 'FABER' }],
        verificaciones: [{ codigo: '01', descripcion: 'VERIFICACIÓN', cumple: true }]
      }
    }));

    expect(propuesta.vigencia_hasta).toBe('2027-04-09');
    expect(propuesta.numero_chip).toBe('CHIP-01');
    expect(propuesta.observaciones).toBe('CORRECCIÓN DE CHIP');
    expect(propuesta.componentes).toHaveLength(1);
    expect(propuesta.verificaciones).toHaveLength(1);
    expect(propuesta.expediente_tecnico).toBeUndefined();
  });

  it('incluye datos dinámicos de taller sin campos fiscales ni identificadores', () => {
    const propuesta = construirPropuestaRectificacion(base('INSPECCION_TALLER', {
      esTallerInspeccion: true,
      formatoValores: { 'vehiculo.placa': 'ABC123', 'inspeccion.frenos': 'CONFORME' }
    }));
    const claves = Object.keys(propuesta);

    expect(propuesta.datosFormato).toEqual({
      'vehiculo.placa': 'ABC123',
      'inspeccion.frenos': 'CONFORME'
    });
    for (const prohibido of [
      'numero_certificado', 'fecha_emision', 'facturacion_id', 'comprobante_id',
      'pago_id', 'correlativo', 'precio', 'importe', 'igv', 'moneda', 'estado'
    ]) {
      expect(claves).not.toContain(prohibido);
    }
  });
});
