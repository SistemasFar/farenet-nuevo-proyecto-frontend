import { describe, expect, it } from 'vitest';
import {
  configuracionVariante,
  formatoCompatibleConServicio,
  opcionesVariantesPorCategoria,
  presentacionRelacionFormato,
  varianteDesdeServicio
} from './servicio-certificado-variantes';

describe('variantes de certificado en Configurar operación', () => {
  it('reabre un flujo Taller GLP como Taller y no como certificado vehicular', () => {
    expect(varianteDesdeServicio({
      tipo_flujo: 'TALLER_INSPECCION',
      tipo_certificado_clave: 'GLP_ANUAL',
      modalidad: 'ANUAL'
    })).toBe('TALLER_GLP_ANUAL');
  });

  it('reabre un flujo Taller GNV Inicial conservando su modalidad', () => {
    expect(varianteDesdeServicio({
      tipo_flujo: 'TALLER_INSPECCION',
      tipo_certificado_clave: 'GNV_ANUAL',
      modalidad: 'INICIAL'
    })).toBe('TALLER_GNV_INICIAL');
  });

  it('guarda la variante Taller con el flujo específico', () => {
    expect(configuracionVariante('TALLER_GLP_INICIAL')).toEqual({
      tipo_flujo: 'TALLER_INSPECCION',
      tipo_certificado_clave: 'GLP_ANUAL',
      modalidad: 'INICIAL'
    });
  });

  it('muestra el catálogo completo aunque el modal se abra desde GLP', () => {
    const opciones = opcionesVariantesPorCategoria('GLP').map(({ value }) => value);
    expect(opciones).toEqual([
      'GNV_INICIAL',
      'GNV_ANUAL',
      'GLP_INICIAL',
      'GLP_ANUAL',
      'CONFORMIDAD',
      'TALLER_GNV_INICIAL',
      'TALLER_GNV_ANUAL',
      'TALLER_GLP_INICIAL',
      'TALLER_GLP_ANUAL'
    ]);
  });

  it('Taller GLP Inicial sólo acepta su variante con raíz GLP_INICIAL', () => {
    const servicio = {
      tipo_flujo: 'TALLER_INSPECCION' as const,
      tipo_certificado_clave: 'GLP_ANUAL',
      modalidad: 'INICIAL' as const
    };
    expect(formatoCompatibleConServicio(servicio, {
      codigo: 'TALLER_GLP_INICIAL_FORMATO',
      formato_padre_codigo: 'GLP_INICIAL'
    })).toBe(true);
    expect(formatoCompatibleConServicio(servicio, {
      codigo: 'TALLER_GLP_ANUAL_FORMATO',
      formato_padre_codigo: 'GLP_ANUAL'
    })).toBe(false);
    expect(formatoCompatibleConServicio(servicio, { codigo: 'GLP_INICIAL' })).toBe(false);
  });

  it('un certificado vehicular no ofrece formatos de Taller', () => {
    expect(formatoCompatibleConServicio({
      tipo_flujo: 'CERTIFICACION',
      tipo_certificado_clave: 'GNV_ANUAL',
      modalidad: 'ANUAL'
    }, {
      codigo: 'TALLER_GNV_ANUAL_FORMATO',
      formato_padre_codigo: 'GNV_ANUAL'
    })).toBe(false);
  });

  it('presenta Taller GLP Anual como formato de Taller y no como base GLP común', () => {
    expect(presentacionRelacionFormato({
      codigo: 'TALLER_GLP_ANUAL_FORMATO',
      nombre: 'Inspección de Taller GLP Anual',
      formato_padre_codigo: 'GLP_ANUAL',
      formato_padre_nombre: 'Certificado GLP Anual'
    })).toEqual({
      etiqueta: 'Formato de Taller',
      valor: 'Inspección de Taller GLP Anual',
      accion: 'Cambiar formato de Taller'
    });
  });
});
