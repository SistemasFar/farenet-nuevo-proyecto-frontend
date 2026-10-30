import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { calcularVigenciaHasta } from './NuevoCertificadoView';

describe('calcularVigenciaHasta — vigencia automática de certificados nuevos', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('certificado GLP nuevo: vigencia = fecha de creación en Perú + 1 año calendario (29/10/2027)', () => {
    vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));
    const resultado = calcularVigenciaHasta();
    expect(resultado).toBe('2027-10-29');
  });

  it('certificado GNV nuevo: misma regla (29/10/2027)', () => {
    vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));
    const resultado = calcularVigenciaHasta();
    expect(resultado).toBe('2027-10-29');
  });

  it('no usa vigencia histórica devuelta por Farenet (31/10/2026)', () => {
    vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));
    const vigenciaHistoricaFarenet = '2026-10-31';
    const resultado = calcularVigenciaHasta();
    expect(resultado).not.toBe(vigenciaHistoricaFarenet);
    expect(resultado).toBe('2027-10-29');
  });

  it('maneja año bisiesto: 29/02/2024 → 28/02/2025 (año no bisiesto)', () => {
    vi.setSystemTime(new Date('2024-02-29T12:00:00Z'));
    const resultado = calcularVigenciaHasta();
    expect(resultado).toBe('2025-02-28');
  });

  it('maneja año bisiesto: 28/02/2024 → 28/02/2025', () => {
    vi.setSystemTime(new Date('2024-02-28T12:00:00Z'));
    const resultado = calcularVigenciaHasta();
    expect(resultado).toBe('2025-02-28');
  });

  it('año bisiesto: 29/02/2020 → 28/02/2021 (año no bisiesto después)', () => {
    vi.setSystemTime(new Date('2020-02-29T12:00:00Z'));
    const resultado = calcularVigenciaHasta();
    expect(resultado).toBe('2021-02-28');
  });
});
