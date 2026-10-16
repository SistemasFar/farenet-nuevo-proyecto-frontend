import { describe, it, expect } from 'vitest';
import {
  obtenerDiasEnMes,
  validarRangoFechasDashboard,
  obtenerRangoRapido
} from '../../utils/faregas-dashboard-fechas';

describe('Validación de límite de un mes en Dashboard FAREGAS', () => {
  it('días de mes calcula correctamente años bisiestos y regulares', () => {
    expect(obtenerDiasEnMes(2026, 2)).toBe(28);
    expect(obtenerDiasEnMes(2028, 2)).toBe(29);
    expect(obtenerDiasEnMes(2026, 9)).toBe(30);
    expect(obtenerDiasEnMes(2026, 10)).toBe(31);
  });

  describe('Ejemplos válidos requeridos por la especificación', () => {
    it('01/09/2026 al 30/09/2026 (mes completo de 30 días)', () => {
      const res = validarRangoFechasDashboard('2026-09-01', '2026-09-30');
      expect(res.valido).toBe(true);
      expect(res.fechaMaximaPermitida).toBe('2026-09-30');
    });

    it('01/10/2026 al 31/10/2026 (mes completo de 31 días)', () => {
      const res = validarRangoFechasDashboard('2026-10-01', '2026-10-31');
      expect(res.valido).toBe(true);
      expect(res.fechaMaximaPermitida).toBe('2026-10-31');
    });

    it('17/09/2026 al 16/10/2026 (intervalo continuo de exactamente un mes)', () => {
      const res = validarRangoFechasDashboard('2026-09-17', '2026-10-16');
      expect(res.valido).toBe(true);
      expect(res.fechaMaximaPermitida).toBe('2026-10-16');
    });

    it('01/02/2026 al 28/02/2026 (febrero no bisiesto)', () => {
      const res = validarRangoFechasDashboard('2026-02-01', '2026-02-28');
      expect(res.valido).toBe(true);
      expect(res.fechaMaximaPermitida).toBe('2026-02-28');
    });

    it('01/02/2028 al 29/02/2028 (febrero bisiesto)', () => {
      const res = validarRangoFechasDashboard('2028-02-01', '2028-02-29');
      expect(res.valido).toBe(true);
      expect(res.fechaMaximaPermitida).toBe('2028-02-29');
    });
  });

  describe('Ejemplos inválidos requeridos por la especificación', () => {
    it('01/09/2026 al 01/10/2026 supera el mes permitido', () => {
      const res = validarRangoFechasDashboard('2026-09-01', '2026-10-01');
      expect(res.valido).toBe(false);
      expect(res.codigo).toBe('RANGO_FECHAS_EXCEDIDO');
      expect(res.mensaje).toBe('El período máximo permitido es de un mes. Selecciona un rango de fechas más corto.');
    });

    it('01/09/2026 al 16/10/2026 supera el mes permitido', () => {
      const res = validarRangoFechasDashboard('2026-09-01', '2026-10-16');
      expect(res.valido).toBe(false);
      expect(res.codigo).toBe('RANGO_FECHAS_EXCEDIDO');
    });

    it('01/01/2026 al 31/12/2026 año completo supera el mes permitido', () => {
      const res = validarRangoFechasDashboard('2026-01-01', '2026-12-31');
      expect(res.valido).toBe(false);
      expect(res.codigo).toBe('RANGO_FECHAS_EXCEDIDO');
    });

    it('Fecha final anterior a inicial (2026-10-16 al 2026-09-17) es inválida', () => {
      const res = validarRangoFechasDashboard('2026-10-16', '2026-09-17');
      expect(res.valido).toBe(false);
      expect(res.codigo).toBe('RANGO_FECHAS_INVALIDO');
      expect(res.mensaje).toBe('La fecha final no puede ser anterior a la fecha inicial.');
    });
  });

  describe('Verificaciones de Sección 6: Filtros rápidos y bordes', () => {
    const hoyRef = '2026-10-16';

    it('Hoy genera un rango válido de 1 día', () => {
      const { desde, hasta } = obtenerRangoRapido('HOY', hoyRef);
      expect(desde).toBe('2026-10-16');
      expect(hasta).toBe('2026-10-16');
      expect(validarRangoFechasDashboard(desde, hasta).valido).toBe(true);
    });

    it('Ayer genera un rango válido de 1 día', () => {
      const { desde, hasta } = obtenerRangoRapido('AYER', hoyRef);
      expect(desde).toBe('2026-10-15');
      expect(hasta).toBe('2026-10-15');
      expect(validarRangoFechasDashboard(desde, hasta).valido).toBe(true);
    });

    it('Últimos 7 días genera un rango válido de 7 días', () => {
      const { desde, hasta } = obtenerRangoRapido('7D', hoyRef);
      expect(desde).toBe('2026-10-10');
      expect(hasta).toBe('2026-10-16');
      expect(validarRangoFechasDashboard(desde, hasta).valido).toBe(true);
    });

    it('Últimos 30 días genera un rango seguro que no supera el mes máximo', () => {
      const { desde, hasta } = obtenerRangoRapido('30D', hoyRef);
      expect(desde).toBe('2026-09-17');
      expect(hasta).toBe('2026-10-16');
      expect(validarRangoFechasDashboard(desde, hasta).valido).toBe(true);
    });

    it('Mes actual genera desde el primer día del mes hasta hoy', () => {
      const { desde, hasta } = obtenerRangoRapido('MES_ACTUAL', hoyRef);
      expect(desde).toBe('2026-10-01');
      expect(hasta).toBe('2026-10-16');
      expect(validarRangoFechasDashboard(desde, hasta).valido).toBe(true);
    });

    it('Mes anterior genera el mes calendario anterior completo', () => {
      const { desde, hasta } = obtenerRangoRapido('MES_ANTERIOR', hoyRef);
      expect(desde).toBe('2026-09-01');
      expect(hasta).toBe('2026-09-30');
      expect(validarRangoFechasDashboard(desde, hasta).valido).toBe(true);
    });

    it('Rango que atraviesa fin de año', () => {
      const resValido = validarRangoFechasDashboard('2026-12-15', '2027-01-14');
      expect(resValido.valido).toBe(true);
      expect(resValido.fechaMaximaPermitida).toBe('2027-01-14');

      const resInvalido = validarRangoFechasDashboard('2026-12-15', '2027-01-15');
      expect(resInvalido.valido).toBe(false);
      expect(resInvalido.codigo).toBe('RANGO_FECHAS_EXCEDIDO');
    });

    it('30D en fecha que cruza febrero no excede el límite permitido', () => {
      const { desde, hasta } = obtenerRangoRapido('30D', '2026-03-01');
      const res = validarRangoFechasDashboard(desde, hasta);
      expect(res.valido).toBe(true);
    });
  });
});
