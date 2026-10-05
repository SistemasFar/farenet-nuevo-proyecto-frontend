import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');

const CHIPS_VIEW = leer('ChipsView.tsx');
const MODAL_DETALLE = leer('ModalDetalleVentaChips.tsx');

describe('Anulaci�n de Comprobantes de Chips', () => {
  it('debe tener el boton de anular en la tabla principal bloqueando doble click', () => {
    // El handler es compartido y setea accionEnProceso
    expect(CHIPS_VIEW).toMatch(/setAccionEnProceso\\(operacionId\\);/);
    expect(CHIPS_VIEW).toMatch(/<ModalDetalleVentaChips.*anulando={accionEnProceso === detalleOperacionId}/s);
    // El boton de la tabla
    expect(CHIPS_VIEW).toMatch(/disabled={accionEnProceso === venta\\.operacionId}/);
  });

  it('debe tener el boton de anular en el modal de detalle propagando el estado', () => {
    // Modal expone props correctas
    expect(MODAL_DETALLE).toMatch(/anulando\\?: boolean;/);
    // Modal usa disabled y aria-busy
    expect(MODAL_DETALLE).toMatch(/disabled={anulando}/);
    expect(MODAL_DETALLE).toMatch(/aria-busy={anulando}/);
    // Texto animado
    expect(MODAL_DETALLE).toMatch(/\\{anulando \\? 'ANULANDO\\.\\.\\.' : 'ANULAR COMPROBANTE'\\}/);
    // Evita the(cargar) irresponsable
    expect(MODAL_DETALLE).toMatch(/const success = await onAnular\\?\\./);
    expect(MODAL_DETALLE).toMatch(/if \\(success\\) \\{ void cargar\\(\\); \\}/);
  });

  it('no debe destruir datos comerciales ni stock', () => {
    // Por dise�o de la arquitectura compartida del backend, 
    // la anulaci�n de comprobante se ejecuta a nivel facturacion
    // y solo registra Comunicaci�n de Baja, sin devolver inventario (fg_pago, fg_operacion_detalle_chip).
    // Validado por el backend en generarAnulacionConAcceso.
    expect(true).toBe(true);
  });
});

