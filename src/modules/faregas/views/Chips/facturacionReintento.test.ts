import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  esComprobanteReintentable,
  ESTADOS_REINTENTABLES
} from './facturacionReintento';

/**
 * Reintento de emisión de un comprobante ya reservado (venta de chips).
 *
 * La venta local ya está confirmada cuando la emisión falla, así que el botón
 * de reintento debe poder aparecer y, sobre todo, NO puede llevar a consumir
 * un correlativo nuevo. Esa última condición (exigir serie y número) es la que
 * se prueba de verdad aquí; el resto es cableado de UI.
 */
const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');

const API = leer('..', '..', 'services', 'faregas-chips.api.ts');
const MODAL_VENTA = leer('ModalVentaChips.tsx');
const MODAL_DETALLE = leer('ModalDetalleVentaChips.tsx');
const CHIPS_VIEW = leer('ChipsView.tsx');

const errorConNumero = (extra: Record<string, unknown> = {}) => ({
  estado: 'ERROR',
  serie: 'BBB1',
  numero: 89,
  nroComprobante: 'BBB1-00000089',
  ...extra
});

// ===========================================================================
// 1. Qué estados ofrecen el botón
// ===========================================================================

describe('qué comprobantes se pueden reintentar', () => {
  it('un comprobante en ERROR con serie y número reservados SÍ se reintenta', () => {
    expect(esComprobanteReintentable(errorConNumero())).toBe(true);
  });

  it('también en PENDIENTE, que el backend sujeta a su lock de 2 minutos', () => {
    expect(esComprobanteReintentable(errorConNumero({ estado: 'PENDIENTE' }))).toBe(true);
  });

  it('un comprobante ACEPTADO NO se reintenta', () => {
    // El backend responde `yaAceptada` y no reenvía nada.
    expect(esComprobanteReintentable(errorConNumero({ estado: 'ACEPTADO' }))).toBe(false);
  });

  it('uno PENDIENTE_SUNAT NO se reintenta', () => {
    expect(esComprobanteReintentable(errorConNumero({ estado: 'PENDIENTE_SUNAT' }))).toBe(false);
  });

  it('uno RECHAZADO NO se reintenta', () => {
    // Reenviar a SUNAT el mismo número rechazado reproduce el rechazo; y
    // guardarFacturacionOperacion devuelve temprano, así que tampoco se pueden
    // corregir los datos. Se resuelve por anulación, que es otro flujo.
    expect(esComprobanteReintentable(errorConNumero({ estado: 'RECHAZADO' }))).toBe(false);
  });

  it('uno ANULADO NO se reintenta', () => {
    expect(esComprobanteReintentable(errorConNumero({ estado: 'ANULADO' }))).toBe(false);
  });

  it('uno BORRADOR NO se reintenta: todavía no se intentó emitir', () => {
    expect(esComprobanteReintentable(errorConNumero({ estado: 'BORRADOR' }))).toBe(false);
  });

  it('sin comprobante o sin operación no hay nada que reintentar', () => {
    expect(esComprobanteReintentable(null)).toBe(false);
    expect(esComprobanteReintentable(undefined)).toBe(false);
  });

  it('los estados reintentables son exactamente ERROR y PENDIENTE', () => {
    expect([...ESTADOS_REINTENTABLES].sort()).toEqual(['ERROR', 'PENDIENTE']);
  });
});

// ===========================================================================
// 2. La guarda que impide consumir otro correlativo
// ===========================================================================

describe('el botón nunca puede llevar a reservar otro número', () => {
  it('sin serie no se ofrece: el backend reservaría un correlativo nuevo', () => {
    expect(esComprobanteReintentable(errorConNumero({ serie: null }))).toBe(false);
  });

  it('sin número no se ofrece, por la misma razón', () => {
    expect(esComprobanteReintentable(errorConNumero({ numero: null }))).toBe(false);
  });

  it('con número 0 tampoco: los correlativos empiezan en 1', () => {
    // 0 sería truthy en JS; el chequeo tiene que ser explícito.
    expect(esComprobanteReintentable(errorConNumero({ numero: 0 }))).toBe(false);
  });

  it('con serie vacía tampoco', () => {
    expect(esComprobanteReintentable(errorConNumero({ serie: '' }))).toBe(false);
  });
});

// ===========================================================================
// 3. Se reutiliza el endpoint que ya existía
// ===========================================================================

describe('se reutiliza el endpoint existente', () => {
  it('la API llama a la ruta de reintento de operaciones, sin inventar otra', () => {
    expect(API).toMatch(
      /reintentarFacturacionOperacion: async \(operacionId: number\) => faregasFetch\(\s*`\/operaciones\/\$\{operacionId\}\/facturacion\/reintentar`/
    );
    expect(API).toMatch(/method: 'POST'/);
  });

  it('no se creó ninguna ruta nueva de chips para reintentar', () => {
    expect(API).not.toMatch(/chips\/[a-z-]*reintent/);
  });
});

// ===========================================================================
// 4. Botón en el resultado de la venta
// ===========================================================================

describe('el resultado de la venta ofrece el reintento', () => {
  it('el botón se muestra sólo cuando el comprobante es reintentable', () => {
    expect(MODAL_VENTA).toMatch(
      /esComprobanteReintentable\(resultadoVenta\?\.facturacion\) && \(\s*<button/
    );
  });

  it('el texto refleja si está reintentando', () => {
    expect(MODAL_VENTA).toMatch(/reintentandoFacturacion \? 'REINTENTANDO\.\.\.' : 'REINTENTAR COMPROBANTE'/);
  });

  it('se bloquea durante el request para evitar el doble clic', () => {
    expect(MODAL_VENTA).toMatch(/disabled=\{reintentandoFacturacion\}/);
    expect(MODAL_VENTA).toMatch(/aria-busy=\{reintentandoFacturacion\}/);
  });

  it('el bloqueo se levanta aunque el request falle', () => {
    const handler = MODAL_VENTA.slice(
      MODAL_VENTA.indexOf('const handleReintentarFacturacion'),
      MODAL_VENTA.indexOf('const prevOperacionEstado')
    );
    expect(handler).toMatch(/finally \{\s*setReintentandoFacturacion\(false\);/);
  });
});

// ===========================================================================
// 5. El reintento no vuelve a vender
// ===========================================================================

describe('el reintento no crea otra venta', () => {
  const handler = MODAL_VENTA.slice(
    MODAL_VENTA.indexOf('const handleReintentarFacturacion'),
    MODAL_VENTA.indexOf('const prevOperacionEstado')
  );

  it('llama al reintento con la operación existente, no a la venta directa', () => {
    expect(handler).toMatch(/faregasChipsApi\.reintentarFacturacionOperacion\(operacionId\)/);
    expect(handler).not.toMatch(/ventaDirecta\(/);
  });

  it('no revalida chips ni vuelve a cobrar el pago', () => {
    expect(handler).not.toMatch(/validarVentaDirecta|validarChips|handleValidarChips|handleSubmit/);
    expect(handler).not.toMatch(/pagosAgregados|handleAgregarPago/);
  });

  it('exige que el comprobante sea reintentable antes de hacer nada', () => {
    expect(handler).toMatch(
      /if \(!operacionId \|\| !esComprobanteReintentable\(resultadoVenta\?\.facturacion\)\) return;/
    );
  });

  it('sólo reemplaza el estado de la emisión, no la venta ni el pago', () => {
    expect(handler).toMatch(
      /setResultadoVenta\(prev => \(prev \? \{ \.\.\.prev, facturacion, facturacionEstado: facturacion\.estado \} : prev\)\)/
    );
  });

  it('pide confirmación y avisa de que no habrá venta ni número nuevo', () => {
    expect(handler).toMatch(/Swal\.fire\(\{/);
    expect(handler).toMatch(/No se generará una nueva venta ni un nuevo número/);
    expect(handler).toMatch(/if \(!confirmacion\.isConfirmed\) return;/);
  });
});

// ===========================================================================
// 6. Resultado y nuevo fallo
// ===========================================================================

describe('resultado del reintento', () => {
  const handler = MODAL_VENTA.slice(
    MODAL_VENTA.indexOf('const handleReintentarFacturacion'),
    MODAL_VENTA.indexOf('const prevOperacionEstado')
  );

  it('si vuelve a fallar, muestra el estado real devuelto sin inventar aceptación', () => {
    expect(handler).toMatch(/if \(facturacion\.estado === 'ACEPTADO'\)/);
    expect(handler).toMatch(/\['PENDIENTE', 'PENDIENTE_SUNAT'\]\.includes\(facturacion\.estado\)/);
    expect(handler).toMatch(/facturacion\.sunatDescription/);
    expect(handler).not.toMatch(/estado === 'ACEPTADO'[\s\S]{0,80}sigue en estado/);
  });

  it('muestra el error si la petición falla', () => {
    expect(handler).toMatch(/catch \(e: unknown\) \{\s*setError\(/);
  });
});

// ===========================================================================
// 7. Detalle de venta (Operaciones recientes)
// ===========================================================================

describe('el detalle de venta ofrece el reintento', () => {
  it('el botón aparece en la sección del comprobante', () => {
    expect(MODAL_DETALLE).toMatch(
      /esComprobanteReintentable\(detalle\.facturacion\) && \(\s*<div>/
    );
    expect(MODAL_DETALLE).toMatch(/REINTENTAR COMPROBANTE/);
  });

  it('se bloquea durante el request', () => {
    expect(MODAL_DETALLE).toMatch(/disabled=\{reintentandoFacturacion\}/);
    expect(MODAL_DETALLE).toMatch(/finally \{\s*setReintentandoFacturacion\(false\);/);
  });

  it('refresca el detalle en el mismo modal, sin cerrarlo', () => {
    const handler = MODAL_DETALLE.slice(
      MODAL_DETALLE.indexOf('const handleReintentarFacturacion'));
    expect(handler).toMatch(/await faregasChipsApi\.reintentarFacturacionOperacion\(operacionId\);/);
    expect(handler).toMatch(/await cargar\(\);/);
  });

  it('no reenvía la venta ni toca pagos o inventario', () => {
    const handler = MODAL_DETALLE.slice(
      MODAL_DETALLE.indexOf('const handleReintentarFacturacion'));
    expect(handler).not.toMatch(/ventaDirecta\(|guardarPagos|validarVentaDirecta/);
  });

  it('la tabla de ventas recientes no se llena de botones', () => {
    // El botón vive en el detalle; el listado queda igual.
    expect(CHIPS_VIEW).not.toMatch(/REINTENTAR COMPROBANTE/);
  });
});
