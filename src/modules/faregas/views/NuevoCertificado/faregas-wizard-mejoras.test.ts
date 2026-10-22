import { describe, it, expect } from 'vitest';
import {
  validarDatosFacturacionCampos,
  validarDatosInicialesCampos,
  validarDatosEspecificos,
  validarFormularioVehiculoVisible,
  obtenerFechaHoyPeru,
  CAMPOS_VISIBLES_FACTURACION,
} from './faregas-wizard.validation';
import {
  estructurarErroresPaso,
  ETIQUETAS_CAMPOS_WIZARD,
} from './faregas-wizard-errores';

describe('FAREGAS — MEJORAS WIZARD NUEVO CERTIFICADO', () => {
  describe('Identificación estructurada de inspecciones de taller', () => {
    it('solicita nombre del taller y no placa cuando el flujo es TALLER_INSPECCION', () => {
      const errores = validarDatosInicialesCampos({
        tarifaCodigo: 'SURCO-0422',
        tipo_flujo: 'TALLER_INSPECCION',
        tipoCertificado: 'GLP_ANUAL',
        modalidadCertificado: 'ANUAL',
        tallerNombre: '',
        placa: '',
      });
      expect(errores.tallerNombre).toBeDefined();
      expect(errores.placa).toBeUndefined();
    });

    it('mantiene la placa obligatoria para una certificación vehicular normal', () => {
      const errores = validarDatosInicialesCampos({
        tarifaCodigo: 'SURCO-0122',
        tipo_flujo: 'CERTIFICACION',
        tipoCertificado: 'GLP_ANUAL',
        modalidadCertificado: 'ANUAL',
        tallerNombre: '',
        placa: '',
      });
      expect(errores.placa).toBeDefined();
      expect(errores.tallerNombre).toBeUndefined();
    });
  });

  describe('CAMBIO 1: Correo electrónico opcional', () => {
    const facturacionBase = {
      tipoDocFac: 'BOLETA',
      tipoDocumentoFac: 'DNI',
      nroDocFac: '74045612',
      razonSocialFac: 'JUAN PEREZ',
      direccionFac: 'AV. PRINCIPAL 123',
      telefonoFac: '987654321',
    };

    it('1. Correo vacío es permitido sin errores', () => {
      const errores = validarDatosFacturacionCampos({
        ...facturacionBase,
        emailFac: '',
      });
      expect(errores.emailFac).toBeUndefined();
    });

    it('2. Correo ausente/undefined/null es permitido', () => {
      const erroresUndefined = validarDatosFacturacionCampos({
        ...facturacionBase,
        emailFac: undefined,
      });
      expect(erroresUndefined.emailFac).toBeUndefined();

      const erroresNull = validarDatosFacturacionCampos({
        ...facturacionBase,
        emailFac: null,
      });
      expect(erroresNull.emailFac).toBeUndefined();
    });

    it('3. Correo válido es permitido', () => {
      const errores = validarDatosFacturacionCampos({
        ...facturacionBase,
        emailFac: 'cliente@faregas.pe',
      });
      expect(errores.emailFac).toBeUndefined();
    });

    it('4. Correo con formato inválido muestra error claro', () => {
      const erroresSinArroba = validarDatosFacturacionCampos({
        ...facturacionBase,
        emailFac: 'cliente-sin-arroba',
      });
      expect(erroresSinArroba.emailFac).toBe('El correo de facturación no tiene un formato válido.');

      const erroresSinDominio = validarDatosFacturacionCampos({
        ...facturacionBase,
        emailFac: 'cliente@dominio',
      });
      expect(erroresSinDominio.emailFac).toBe('El correo de facturación no tiene un formato válido.');
    });

    it('5. CAMPOS_VISIBLES_FACTURACION no incluye emailFac como obligatorio', () => {
      expect(CAMPOS_VISIBLES_FACTURACION).not.toContain('emailFac');
    });

    it('6. Factura con RUC sin correo es permitida', () => {
      const errores = validarDatosFacturacionCampos({
        tipoDocFac: 'FACTURA',
        tipoDocumentoFac: 'RUC',
        nroDocFac: '20600444531',
        razonSocialFac: 'EMPRESA PERU S.A.C.',
        direccionFac: 'CALLE FISCAL 456',
        telefonoFac: '014445555',
        emailFac: '',
      });
      expect(errores.emailFac).toBeUndefined();
      expect(errores.nroDocFac).toBeUndefined();
    });
  });

  describe('CAMBIO 2: Validación de fecha de vigencia (America/Lima)', () => {
    const hoy = obtenerFechaHoyPeru();

    // Calcular ayer y mañana en formato YYYY-MM-DD
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - 1);
    const ayer = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dateObj);

    const dateManana = new Date();
    dateManana.setDate(dateManana.getDate() + 1);
    const manana = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dateManana);

    it('7. GLP Anual: vigencia anterior a hoy es rechazada', () => {
      const errores = validarDatosEspecificos({
        tipo: 'GLP_ANUAL',
        modalidad: 'ANUAL',
        glp: {
          fechaVigencia: ayer,
          componentes: [
            { componente: 'CILINDRO', marca: 'FABER', numeroSerie: '123', capacidadLitros: '60', anioFabricacion: '2020' },
            { componente: 'REGULADOR', marca: 'TOMASETTO', numeroSerie: '456', modelo: 'AT09' },
          ],
          verificaciones: Array.from({ length: 7 }, (_, i) => ({ codigo: String(i + 1), cumple: true })),
        },
        gnv: {},
        conformidad: {},
      });
      expect(errores['glp.fechaVigencia']).toBe('La fecha de vigencia no puede ser anterior a la fecha actual.');
    });

    it('8. GLP Anual: vigencia igual a hoy es permitida', () => {
      const errores = validarDatosEspecificos({
        tipo: 'GLP_ANUAL',
        modalidad: 'ANUAL',
        glp: {
          fechaVigencia: hoy,
          componentes: [
            { componente: 'CILINDRO', marca: 'FABER', numeroSerie: '123', capacidadLitros: '60', anioFabricacion: '2020' },
            { componente: 'REGULADOR', marca: 'TOMASETTO', numeroSerie: '456', modelo: 'AT09' },
          ],
          verificaciones: Array.from({ length: 7 }, (_, i) => ({ codigo: String(i + 1), cumple: true })),
        },
        gnv: {},
        conformidad: {},
      });
      expect(errores['glp.fechaVigencia']).toBeUndefined();
    });

    it('9. GLP Anual: vigencia posterior a hoy es permitida', () => {
      const errores = validarDatosEspecificos({
        tipo: 'GLP_ANUAL',
        modalidad: 'ANUAL',
        glp: {
          fechaVigencia: manana,
          componentes: [
            { componente: 'CILINDRO', marca: 'FABER', numeroSerie: '123', capacidadLitros: '60', anioFabricacion: '2020' },
            { componente: 'REGULADOR', marca: 'TOMASETTO', numeroSerie: '456', modelo: 'AT09' },
          ],
          verificaciones: Array.from({ length: 7 }, (_, i) => ({ codigo: String(i + 1), cumple: true })),
        },
        gnv: {},
        conformidad: {},
      });
      expect(errores['glp.fechaVigencia']).toBeUndefined();
    });

    it('10. GNV Anual: vigencia anterior a hoy es rechazada', () => {
      const errores = validarDatosEspecificos({
        tipo: 'GNV_ANUAL',
        modalidad: 'ANUAL',
        gnv: {
          fechaVigencia: ayer,
          verificaciones: Array.from({ length: 8 }, (_, i) => ({ codigo: String.fromCharCode(97 + i), cumple: true })),
        },
        glp: {},
        conformidad: {},
      });
      expect(errores['gnv.fechaVigencia']).toBe('La fecha de vigencia no puede ser anterior a la fecha actual.');
    });

    it('11. GNV Anual: vigencia igual o posterior a hoy es permitida', () => {
      const erroresHoy = validarDatosEspecificos({
        tipo: 'GNV_ANUAL',
        modalidad: 'ANUAL',
        gnv: {
          fechaVigencia: hoy,
          verificaciones: Array.from({ length: 8 }, (_, i) => ({ codigo: String.fromCharCode(97 + i), cumple: true })),
        },
        glp: {},
        conformidad: {},
      });
      expect(erroresHoy['gnv.fechaVigencia']).toBeUndefined();

      const erroresManana = validarDatosEspecificos({
        tipo: 'GNV_ANUAL',
        modalidad: 'ANUAL',
        gnv: {
          fechaVigencia: manana,
          verificaciones: Array.from({ length: 8 }, (_, i) => ({ codigo: String.fromCharCode(97 + i), cumple: true })),
        },
        glp: {},
        conformidad: {},
      });
      expect(erroresManana['gnv.fechaVigencia']).toBeUndefined();
    });
  });

  describe('CAMBIO 3: Indicar campos faltantes e interfaz estructurada', () => {
    it('12. estructurarErroresPaso mapea campos a etiquetas legibles y secciones', () => {
      const erroresEntrada = {
        nroDocFac: 'El DNI debe contener 8 dígitos.',
        'glp.fechaVigencia': 'La fecha de vigencia no puede ser anterior a la fecha actual.',
        vin: 'Este campo es obligatorio.',
      };

      const lista = estructurarErroresPaso(erroresEntrada);
      expect(lista).toHaveLength(3);

      const errorDoc = lista.find(e => e.campo === 'nroDocFac');
      expect(errorDoc).toBeDefined();
      expect(errorDoc?.etiqueta).toBe('Número de documento del cliente');
      expect(errorDoc?.seccion).toBe('Datos para Facturación');
      expect(errorDoc?.mensaje).toBe('El DNI debe contener 8 dígitos.');

      const errorVigencia = lista.find(e => e.campo === 'glp.fechaVigencia');
      expect(errorVigencia).toBeDefined();
      expect(errorVigencia?.etiqueta).toBe('Vigencia hasta');
      expect(errorVigencia?.seccion).toBe('Vigencia y Expediente');

      const errorVin = lista.find(e => e.campo === 'vin');
      expect(errorVin).toBeDefined();
      expect(errorVin?.etiqueta).toBe('VIN / N° de Serie o Chasis');
    });

    it('13. estructurarErroresPaso maneja titulares dinámicos', () => {
      const erroresEntrada = {
        'titular.0.nombreRazonSocial': 'Complete el nombre del titular 1.',
        'titular.1.direccion': 'Complete la dirección del titular 2.',
      };

      const lista = estructurarErroresPaso(erroresEntrada);
      expect(lista).toHaveLength(2);
      expect(lista[0].etiqueta).toContain('Titular 1');
      expect(lista[0].seccion).toBe('Titulares');
      expect(lista[1].etiqueta).toContain('Titular 2');
      expect(lista[1].seccion).toBe('Titulares');
    });

    it('14. Correo electrónico nunca figura como faltante si está vacío', () => {
      const erroresEntrada = {
        nroDocFac: 'Complete el número de documento.',
        telefonoFac: 'Complete el teléfono.',
      };
      const lista = estructurarErroresPaso(erroresEntrada);
      const tieneEmail = lista.some(e => e.campo === 'emailFac');
      expect(tieneEmail).toBe(false);
    });

    it('15. Correo con formato inválido sí figura en la lista estructurada', () => {
      const erroresEntrada = {
        emailFac: 'El correo de facturación no tiene un formato válido.',
      };
      const lista = estructurarErroresPaso(erroresEntrada);
      expect(lista).toHaveLength(1);
      expect(lista[0].campo).toBe('emailFac');
      expect(lista[0].etiqueta).toBe('Correo electrónico');
      expect(lista[0].mensaje).toBe('El correo de facturación no tiene un formato válido.');
    });
  });
});
