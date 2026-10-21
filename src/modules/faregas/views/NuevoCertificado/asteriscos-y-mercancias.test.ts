import { describe, it, expect } from 'vitest';
import {
  formatAlfanumericoConEspacios,
  formatVIN,
  formatAlfanumerico,
  formatFormulaRodante,
  formatEntero,
  formatDecimal,
  formatAnio
} from '../../utils/vehiculo-formatters';
import {
  normalizarEnteroCertificado,
  formatearConteoDosDigitos
} from './faregas-formulario-operativo';
import {
  validarCamposTecnicos,
  validarCaracteresTecnicosConformidad,
  validarAniosVehiculo,
  validarDatosEspecificos,
  esAsteriscos
} from './faregas-wizard.validation';

describe('Asteriscos (*****) y Uso Original (MERCANCÍAS)', () => {
  describe('1. Formateadores y reglas operativas', () => {
    it('formatAlfanumericoConEspacios preserva MERCANCÍAS con tilde', () => {
      expect(formatAlfanumericoConEspacios('MERCANCÍAS')).toBe('MERCANCÍAS');
      expect(formatAlfanumericoConEspacios('PERSONAS')).toBe('PERSONAS');
    });

    it('formatAlfanumericoConEspacios preserva asteriscos', () => {
      expect(formatAlfanumericoConEspacios('*****')).toBe('*****');
    });

    it('formatVIN preserva asteriscos', () => {
      expect(formatVIN('*****')).toBe('*****');
      expect(formatVIN('HZ1110WKR295C0031')).toBe('HZ1110WKR295C0031');
    });

    it('formatAlfanumerico preserva asteriscos', () => {
      expect(formatAlfanumerico('*****')).toBe('*****');
    });

    it('formatFormulaRodante preserva asteriscos', () => {
      expect(formatFormulaRodante('*****')).toBe('*****');
      expect(formatFormulaRodante('4X4')).toBe('4X4');
    });

    it('formatEntero preserva asteriscos', () => {
      expect(formatEntero('*****', 4)).toBe('*****');
    });

    it('formatDecimal preserva asteriscos', () => {
      expect(formatDecimal('*****', 2, 2)).toBe('*****');
    });

    it('formatAnio preserva asteriscos', () => {
      expect(formatAnio('*****')).toBe('*****');
    });

    it('normalizarEnteroCertificado preserva asteriscos', () => {
      expect(normalizarEnteroCertificado('*****', 4)).toBe('*****');
      expect(normalizarEnteroCertificado('***', 4)).toBe('***');
    });

    it('formatearConteoDosDigitos preserva asteriscos sin agregar ceros', () => {
      expect(formatearConteoDosDigitos('*****')).toBe('*****');
      expect(formatearConteoDosDigitos('2')).toBe('02');
    });
  });

  describe('2. Validaciones con asteriscos en campos técnicos', () => {
    it('esAsteriscos detecta cadenas de asteriscos válidas', () => {
      expect(esAsteriscos('*****')).toBe(true);
      expect(esAsteriscos('***')).toBe(true);
      expect(esAsteriscos('*')).toBe(true);
      expect(esAsteriscos('')).toBe(false);
      expect(esAsteriscos('123')).toBe(false);
    });

    it('validarCamposTecnicos acepta asteriscos en cilindros, ejes, ruedas, asientos, pasajeros, pesos, dimensiones', () => {
      const vehiculoConAsteriscos = {
        marca: 'TOYOTA',
        modelo: 'COROLLA',
        anioFabricacion: '*****',
        numeroMotor: '*****',
        combustible: 'GNV',
        numeroCilindros: '*****',
        numeroEjes: '*****',
        numeroRuedas: '*****',
        numeroAsientos: '*****',
        numeroPasajeros: '*****',
        longitud: '*****',
        ancho: '*****',
        alto: '*****',
        pesoNeto: '*****',
        pesoBruto: '*****',
        version: '*****',
        cilindrada: '*****',
        color: '*****',
        cargaUtil: '*****',
        clase: 'SEDAN',
        carroceria: 'SEDAN',
        anioModelo: '*****',
        formulaRodante: '*****',
        potencia: '*****',
        categoria: 'M1',
      };

      const errores = validarCamposTecnicos('CONFORMIDAD', vehiculoConAsteriscos);
      expect(Object.keys(errores)).toHaveLength(0);
    });

    it('validarAniosVehiculo no arroja error si algún año es asteriscos', () => {
      expect(validarAniosVehiculo({ anioModelo: '*****', anioFabricacion: '2020' })).toEqual({});
      expect(validarAniosVehiculo({ anioModelo: '2020', anioFabricacion: '*****' })).toEqual({});
      expect(validarAniosVehiculo({ anioModelo: '*****', anioFabricacion: '*****' })).toEqual({});
    });

    it('validarCaracteresTecnicosConformidad acepta asteriscos en modelo, motor, potencia, cilindrada y vin', () => {
      const vehiculo = {
        modelo: '*****',
        version: '*****',
        numeroMotor: '*****',
        potencia: '*****',
        cilindrada: '*****',
        vin: '*****'
      };
      const errores = validarCaracteresTecnicosConformidad('CONFORMIDAD', vehiculo);
      expect(Object.keys(errores)).toHaveLength(0);
    });
  });

  describe('3. Validación de Conformidad con MERCANCÍAS', () => {
    it('Acepta MERCANCÍAS con tilde como uso original válido', () => {
      const errores = validarDatosEspecificos({
        tipo: 'CONFORMIDAD',
        conformidad: {
          caracteristicaRegistrable: 'CAMBIO DE MOTOR',
          usoOriginalVehiculo: 'MERCANCÍAS'
        }
      });
      expect(errores['conformidad.usoOriginalVehiculo']).toBeUndefined();
    });

    it('Acepta MERCANCIAS sin tilde y lo normaliza sin error', () => {
      const errores = validarDatosEspecificos({
        tipo: 'CONFORMIDAD',
        conformidad: {
          caracteristicaRegistrable: 'CAMBIO DE MOTOR',
          usoOriginalVehiculo: 'MERCANCIAS'
        }
      });
      expect(errores['conformidad.usoOriginalVehiculo']).toBeUndefined();
    });

    it('Acepta PERSONAS como uso original válido', () => {
      const errores = validarDatosEspecificos({
        tipo: 'CONFORMIDAD',
        conformidad: {
          caracteristicaRegistrable: 'CAMBIO DE MOTOR',
          usoOriginalVehiculo: 'PERSONAS'
        }
      });
      expect(errores['conformidad.usoOriginalVehiculo']).toBeUndefined();
    });

    it('Rechaza valores históricos no permitidos como MIXTO', () => {
      const errores = validarDatosEspecificos({
        tipo: 'CONFORMIDAD',
        conformidad: {
          caracteristicaRegistrable: 'CAMBIO DE MOTOR',
          usoOriginalVehiculo: 'MIXTO'
        }
      });
      expect(errores['conformidad.usoOriginalVehiculo']).toContain('Seleccione PERSONAS o MERCANCÍAS');
    });
  });
});
