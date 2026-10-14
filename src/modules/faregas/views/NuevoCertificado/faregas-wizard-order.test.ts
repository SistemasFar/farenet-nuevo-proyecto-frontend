import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { indicePasoVisual, puedeRetrocederWizard } from './faregas-emision';

const fuenteWizard = readFileSync(new URL('./NuevoCertificadoView.tsx', import.meta.url), 'utf8');

describe('orden del wizard de Nuevo Certificado', () => {
  it('traduce las claves persistidas al nuevo orden sin cambiar su semántica', () => {
    expect(indicePasoVisual('DATOS_INICIALES')).toBe(0);
    expect(indicePasoVisual('VEHICULO')).toBe(1);
    expect(indicePasoVisual('PREVISUALIZACION')).toBe(2);
    expect(indicePasoVisual('PAGO')).toBe(3);
    expect(indicePasoVisual('FACTURACION')).toBe(4);
    expect(indicePasoVisual('VERIFICACION_EMISION')).toBe(4);
  });

  it('presenta el stepper en el orden obligatorio', () => {
    const datos = fuenteWizard.indexOf("id: 'datos_iniciales'");
    const vehiculo = fuenteWizard.indexOf("id: 'vehiculo'");
    const previsualizacion = fuenteWizard.indexOf("id: 'previsualizacion'");
    const pago = fuenteWizard.indexOf("id: 'pago'");
    const facturacion = fuenteWizard.indexOf("id: 'facturacion'");
    expect([datos, vehiculo, previsualizacion, pago, facturacion].every(indice => indice >= 0)).toBe(true);
    expect(datos).toBeLessThan(vehiculo);
    expect(vehiculo).toBeLessThan(previsualizacion);
    expect(previsualizacion).toBeLessThan(pago);
    expect(pago).toBeLessThan(facturacion);
  });

  it('persiste el siguiente paso semántico real en cada avance', () => {
    expect(fuenteWizard).toContain("persistirPaso(idBorrador, 'VEHICULO')");
    expect(fuenteWizard).toContain("persistirPaso(certificadoId, 'PREVISUALIZACION')");
    expect(fuenteWizard).toContain("persistirPaso(certificadoId, 'PAGO')");
    expect(fuenteWizard).toContain("persistirPaso(certificadoId, 'FACTURACION')");
  });

  it('mantiene la validación y guardado de pago antes de habilitar Facturación', () => {
    const inicioPago = fuenteWizard.indexOf("STEPS[currentStepIndex].id === 'pago'");
    const finPago = fuenteWizard.indexOf("STEPS[currentStepIndex].id === 'previsualizacion'", inicioPago);
    const ramaPago = fuenteWizard.slice(inicioPago, finPago);
    expect(ramaPago.indexOf('validarPasoPago')).toBeGreaterThanOrEqual(0);
    expect(ramaPago.indexOf('guardarPasoPagos')).toBeGreaterThan(ramaPago.indexOf('validarPasoPago'));
    expect(ramaPago.indexOf("persistirPaso(certificadoId, 'FACTURACION')")).toBeGreaterThan(ramaPago.indexOf('guardarPasoPagos'));
  });

  it('desacopla Vehículo y Previsualización de la orden de pago', () => {
    const inicioVehiculo = fuenteWizard.indexOf("STEPS[currentStepIndex].id === 'vehiculo'");
    const inicioPago = fuenteWizard.indexOf("STEPS[currentStepIndex].id === 'pago'", inicioVehiculo);
    const finPago = fuenteWizard.indexOf("STEPS[currentStepIndex].id === 'previsualizacion'", inicioPago);
    const ramaVehiculo = fuenteWizard.slice(inicioVehiculo, inicioPago);
    const ramaPago = fuenteWizard.slice(inicioPago, finPago);

    expect(ramaVehiculo).not.toContain('guardarFacturacion(');
    expect(ramaVehiculo).toContain("persistirPaso(certificadoId, 'PREVISUALIZACION')");
    expect(ramaPago.indexOf('guardarPasoPagos')).toBeGreaterThanOrEqual(0);
    expect(ramaPago.indexOf('guardarFacturacion(')).toBeGreaterThan(ramaPago.indexOf('guardarPasoPagos'));
    expect(ramaPago.indexOf("persistirPaso(certificadoId, 'FACTURACION')")).toBeGreaterThan(ramaPago.indexOf('guardarFacturacion('));
  });

  it('la navegación hacia atrás recorre Pago, Previsualización, Vehículo y Datos Iniciales', () => {
    expect(indicePasoVisual('PAGO') - 1).toBe(indicePasoVisual('PREVISUALIZACION'));
    expect(indicePasoVisual('PREVISUALIZACION') - 1).toBe(indicePasoVisual('VEHICULO'));
    expect(indicePasoVisual('VEHICULO') - 1).toBe(indicePasoVisual('DATOS_INICIALES'));
    expect(fuenteWizard).toContain('irAtrasOStep(currentStepIndex - 1)');
  });

  it('permite volver desde Facturación a Pago mientras no exista emisión real', () => {
    expect(puedeRetrocederWizard('BORRADOR', null)).toBe(true);
    expect(puedeRetrocederWizard('BORRADOR', { estado: 'BORRADOR' } as any)).toBe(true);
    expect(fuenteWizard).not.toContain("setMinimumEditableStepIndex(indicePaso('FACTURACION'))");
    expect(fuenteWizard).toContain('retrocesoBloqueadoPorEmision');
  });

  it('bloquea el retroceso si el comprobante o certificado ya inició su emisión', () => {
    expect(puedeRetrocederWizard('BORRADOR', { estado: 'ACEPTADO' } as any)).toBe(false);
    expect(puedeRetrocederWizard('BORRADOR', { estado: 'PENDIENTE_SUNAT' } as any)).toBe(false);
    expect(puedeRetrocederWizard('BORRADOR', { estado: 'PENDIENTE' } as any)).toBe(false);
    expect(puedeRetrocederWizard('BORRADOR', { estado: 'ERROR' } as any)).toBe(false);
    expect(puedeRetrocederWizard('EMITIDO', { estado: 'BORRADOR' } as any)).toBe(false);
  });

  it('autosave y carga de maestros usan pasos semánticos y no las posiciones antiguas', () => {
    expect(fuenteWizard).toContain("currentStepIndex !== indicePaso('VEHICULO')");
    expect(fuenteWizard).toContain("currentStepIndex !== indicePaso('PAGO')");
    expect(fuenteWizard).toContain("currentStepIndex === indicePaso('PAGO')");
    expect(fuenteWizard).not.toContain('currentStepIndex !== 2');
    expect(fuenteWizard).not.toContain('currentStepIndex !== 1');
  });
});
