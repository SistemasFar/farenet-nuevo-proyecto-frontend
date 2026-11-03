import { describe, expect, it } from 'vitest';
import {
  reconstruirPaso2,
  construirReglasValidas,
  aplicarBeneficioGeneral,
  obtenerBeneficio,
  claveServicioLogico,
  type ReglaDescuento,
  type ServicioPorPlanta,
} from './descuentos-wizard.utils';

// Simulate descuento 23's services (from PostgreSQL query)
const disponibilidad: ServicioPorPlanta[] = [
  { id: 328, codigo: '0438', nombre: 'CERTIFICADO ANUAL DE INSPECCIÓN DE TALLER GNV', categoria: 'GNV', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'CERTIFICACION', planta_key: '13', precio: 100 },
  { id: 329, codigo: '0437', nombre: 'CERTIFICADO ANUAL DE INSPECCIÓN DE TALLER GLP', categoria: 'GLP', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'TALLER_INSPECCION', planta_key: '13', precio: 100 },
  { id: 331, codigo: '0423', nombre: 'CERTIFICADO ANUAL DE INSPECCIÓN DE TALLER GNV', categoria: 'GNV', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'TALLER_INSPECCION', planta_key: '98', precio: 100 },
  { id: 406, codigo: '0422', nombre: 'CERTIFICADO ANUAL DE INSPECCIÓN DE TALLER GLP', categoria: 'GLP', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'TALLER_INSPECCION', planta_key: '98', precio: 100 },
  { id: 414, codigo: '0428', nombre: 'CERTIFICADO ANUAL DE INSPECCIÓN DE TALLER GNV', categoria: 'GNV', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'TALLER_INSPECCION', planta_key: '160', precio: 100 },
  { id: 415, codigo: '0427', nombre: 'CERTIFICADO ANUAL DE INSPECCIÓN DE TALLER GLP', categoria: 'GLP', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'TALLER_INSPECCION', planta_key: '160', precio: 100 },
];

// Simulate backend response (from obtenerDetalleAdministracion)
const reglasBackend: ReglaDescuento[] = [
  { plantaKey: '13', servicioId: 328, tipoCalculo: 'PORCENTAJE', valor: '100.00', valorContado: null, valorCredito: null },
  { plantaKey: '13', servicioId: 329, tipoCalculo: 'PORCENTAJE', valor: '100.00', valorContado: null, valorCredito: null },
  { plantaKey: '98', servicioId: 331, tipoCalculo: 'PORCENTAJE', valor: '100.00', valorContado: null, valorCredito: null },
  { plantaKey: '98', servicioId: 406, tipoCalculo: 'PORCENTAJE', valor: '100.00', valorContado: null, valorCredito: null },
  { plantaKey: '160', servicioId: 414, tipoCalculo: 'PORCENTAJE', valor: '100.00', valorContado: null, valorCredito: null },
  { plantaKey: '160', servicioId: 415, tipoCalculo: 'PORCENTAJE', valor: '100.00', valorContado: null, valorCredito: null },
];

describe('descuento 23 - ciclo completo', () => {
  it('reconstruye correctamente las 6 reglas', () => {
    const reglasNormalizadas = reglasBackend.map(r => ({
      plantaKey: String(r.plantaKey), servicioId: Number(r.servicioId), tipoCalculo: r.tipoCalculo,
      valor: r.valor ?? '', valorContado: r.valorContado ?? '', valorCredito: r.valorCredito ?? '',
    }));
    const reconstruccion = reconstruirPaso2(reglasNormalizadas, disponibilidad);
    console.log('SEDES:', JSON.stringify(reconstruccion.sedes));
    console.log('SERVICIOS:', JSON.stringify(reconstruccion.servicios));
    console.log('BENEFICIO:', JSON.stringify(reconstruccion.beneficio));
    console.log('EXCEPCIONES:', JSON.stringify(reconstruccion.excepciones));
    console.log('MODO PERSONALIZADO:', reconstruccion.modoPersonalizado);
    
    expect(reconstruccion.sedes).toEqual(['13', '98', '160']);
    expect(reconstruccion.servicios).toHaveLength(6);
    expect(reconstruccion.beneficio.tipoCalculo).toBe('PORCENTAJE');
    expect(reconstruccion.beneficio.valor).toBe('100.00');
    expect(reconstruccion.excepciones).toHaveLength(0);
    expect(reconstruccion.modoPersonalizado).toBe(false);
  });

  it('cambia beneficio a 20% y construye payload correcto', () => {
    const reglasNormalizadas = reglasBackend.map(r => ({
      plantaKey: String(r.plantaKey), servicioId: Number(r.servicioId), tipoCalculo: r.tipoCalculo,
      valor: r.valor ?? '', valorContado: r.valorContado ?? '', valorCredito: r.valorCredito ?? '',
    }));
    const reconstruccion = reconstruirPaso2(reglasNormalizadas, disponibilidad);
    
    // Simulate user changing benefit to 20%
    const beneficioGeneral = { tipoCalculo: 'PORCENTAJE' as const, valor: '20', valorContado: '', valorCredito: '' };
    const reglasEditadas = aplicarBeneficioGeneral(reglasNormalizadas, beneficioGeneral, reconstruccion.excepciones);
    
    console.log('REGLAS EDITADAS:', JSON.stringify(reglasEditadas.map(r => ({ pk: r.plantaKey, sid: r.servicioId, tc: r.tipoCalculo, v: r.valor }))));
    
    // Build payload (same as guardarReglas)
    const payload = { reglas: reglasEditadas };
    console.log('PAYLOAD:', JSON.stringify(payload));
    
    expect(reglasEditadas).toHaveLength(6);
    expect(reglasEditadas.every(r => r.valor === '20')).toBe(true);
    expect(payload.reglas).toHaveLength(6);
  });

  it('simula reapertura con reglas guardadas a 20%', () => {
    // Simulate backend response after save (all rules at 20%)
    const reglasGuardadas: ReglaDescuento[] = [
      { plantaKey: '13', servicioId: 328, tipoCalculo: 'PORCENTAJE', valor: '20.00', valorContado: null, valorCredito: null },
      { plantaKey: '13', servicioId: 329, tipoCalculo: 'PORCENTAJE', valor: '20.00', valorContado: null, valorCredito: null },
      { plantaKey: '98', servicioId: 331, tipoCalculo: 'PORCENTAJE', valor: '20.00', valorContado: null, valorCredito: null },
      { plantaKey: '98', servicioId: 406, tipoCalculo: 'PORCENTAJE', valor: '20.00', valorContado: null, valorCredito: null },
      { plantaKey: '160', servicioId: 414, tipoCalculo: 'PORCENTAJE', valor: '20.00', valorContado: null, valorCredito: null },
      { plantaKey: '160', servicioId: 415, tipoCalculo: 'PORCENTAJE', valor: '20.00', valorContado: null, valorCredito: null },
    ];

    const reglasNormalizadas = reglasGuardadas.map(r => ({
      plantaKey: String(r.plantaKey), servicioId: Number(r.servicioId), tipoCalculo: r.tipoCalculo,
      valor: r.valor ?? '', valorContado: r.valorContado ?? '', valorCredito: r.valorCredito ?? '',
    }));
    const reconstruccion = reconstruirPaso2(reglasNormalizadas, disponibilidad);
    
    console.log('RECONSTRUIDO DESPUES DE GUARDAR:');
    console.log('SEDES:', JSON.stringify(reconstruccion.sedes));
    console.log('SERVICIOS:', JSON.stringify(reconstruccion.servicios));
    console.log('BENEFICIO:', JSON.stringify(reconstruccion.beneficio));
    console.log('EXCEPCIONES:', JSON.stringify(reconstruccion.excepciones));
    
    expect(reconstruccion.beneficio.tipoCalculo).toBe('PORCENTAJE');
    expect(reconstruccion.beneficio.valor).toBe('20.00');
    expect(reconstruccion.excepciones).toHaveLength(0);
    expect(reconstruccion.modoPersonalizado).toBe(false);
  });

  it('simula quitar una sede y verificar reconstruccion', () => {
    // Remove planta 98
    const reglasSinPlanta98: ReglaDescuento[] = [
      { plantaKey: '13', servicioId: 328, tipoCalculo: 'PORCENTAJE', valor: '100.00', valorContado: null, valorCredito: null },
      { plantaKey: '13', servicioId: 329, tipoCalculo: 'PORCENTAJE', valor: '100.00', valorContado: null, valorCredito: null },
      { plantaKey: '160', servicioId: 414, tipoCalculo: 'PORCENTAJE', valor: '100.00', valorContado: null, valorCredito: null },
      { plantaKey: '160', servicioId: 415, tipoCalculo: 'PORCENTAJE', valor: '100.00', valorContado: null, valorCredito: null },
    ];

    const reglasNormalizadas = reglasSinPlanta98.map(r => ({
      plantaKey: String(r.plantaKey), servicioId: Number(r.servicioId), tipoCalculo: r.tipoCalculo,
      valor: r.valor ?? '', valorContado: r.valorContado ?? '', valorCredito: r.valorCredito ?? '',
    }));
    const reconstruccion = reconstruirPaso2(reglasNormalizadas, disponibilidad);
    
    console.log('DESPUES DE QUITAR PLANTA 98:');
    console.log('SEDES:', JSON.stringify(reconstruccion.sedes));
    console.log('SERVICIOS:', JSON.stringify(reconstruccion.servicios));
    
    expect(reconstruccion.sedes).toEqual(['13', '160']);
    expect(reconstruccion.sedes).not.toContain('98');
  });
});
