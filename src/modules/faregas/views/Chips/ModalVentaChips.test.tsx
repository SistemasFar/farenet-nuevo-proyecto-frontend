// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  listarProductosVendibles: vi.fn(),
  validarVentaDirecta: vi.fn(),
  obtenerMaestros: vi.fn(),
}));

vi.mock('../../services/faregas-chips.api', () => ({
  faregasChipsApi: {
    listarProductosVendibles: api.listarProductosVendibles,
    validarVentaDirecta: api.validarVentaDirecta,
  },
}));
vi.mock('../../services/faregas-pagos.api', () => ({ faregasPagosApi: { obtenerMaestros: api.obtenerMaestros } }));
vi.mock('../../services/faregas-clientes.api', () => ({ faregasClientesApi: { autocompletarPersona: vi.fn() } }));
vi.mock('./ChipScannerInput', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react');
  return { ChipScannerInput: () => ReactModule.createElement('textarea', { 'data-testid': 'chip-scanner' }) };
});
vi.mock('../NuevoCertificado/components/NuevoCertificado/PagoStep', () => ({ PagoStep: () => null }));
vi.mock('../components/GestorCuotasCredito', () => ({ GestorCuotasCredito: () => null }));
vi.mock('sweetalert2', () => ({ default: { fire: vi.fn() } }));

import { ModalVentaChips } from './ModalVentaChips';

const productos = [
  {
    id: 1, codigo: 'CHIP', nombre: 'Chip + Porta Chip', tipo: 'CHIP_SERIALIZADO', controlStock: true, activo: true,
    sedes: [{ plantaKey: '98', plantaNombre: 'SURCO', precio: 180, precioVenta: 180, stockPermitido: true, ventaHabilitada: true }],
    stockTotal: 10, stockSede: 10, disponiblesSede: 10, reservadosSede: 0, vendidosSede: 0, bajasSede: 0,
  },
  ...[
    ['HOJA_GNV', 'Hojas GNV'],
    ['HOJA_GLP', 'Hojas GLP'],
    ['HOJA_CONFORMIDAD', 'Hojas Conformidad'],
  ].map(([codigo, nombre], index) => ({
    id: index + 2, codigo, nombre, tipo: 'CANTIDAD', controlStock: true, activo: true,
    sedes: [{ plantaKey: '98', plantaNombre: 'SURCO', precio: 12.6, precioVenta: 12.6, stockPermitido: true, ventaHabilitada: true }],
    stockTotal: 250, stockSede: 250, disponiblesSede: 250, reservadosSede: 0, vendidosSede: 0, bajasSede: 0,
  })),
];

describe('ModalVentaChips — venta serializada y por cantidad', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    api.listarProductosVendibles.mockResolvedValue(productos);
    api.obtenerMaestros.mockResolvedValue({ data: { politicaSpot: { umbralComercial: 700 } } });
    api.validarVentaDirecta.mockImplementation(async (payload) => {
      const cantidad = payload.cantidad;
      const disponible = 250;
      const valido = cantidad <= disponible;
      return {
        success: true,
        modo: 'CANTIDAD',
        items: [{
          numeroChip: null,
          existe: true,
          estado: valido ? 'DISPONIBLE' : null,
          plantaKey: '98',
          plantaNombre: 'SURCO',
          productoInventariableId: payload.productoInventariableId,
          productoFacturacionId: 227,
          productoNombre: 'Hojas GLP',
          cantidad,
          disponible,
          precio: 12.6,
          spotSujeto: false,
          spotCodigo: null,
          spotPorcentaje: null,
          validoParaVenta: valido,
          motivo: valido ? null : 'Stock insuficiente.',
        }],
        totalEstimado: Math.round(cantidad * 12.6 * 100) / 100,
        cantidadSolicitados: cantidad,
        cantidadValidos: valido ? cantidad : 0,
      };
    });
    await act(async () => {
      root.render(<ModalVentaChips onClose={vi.fn()} onVentaExitosa={vi.fn()} />);
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  const cargarProductos = async () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const seleccionar = async (id: number) => {
    const select = Array.from(container.querySelectorAll('select')).find((item) =>
      Array.from(item.options).some((option) => option.value === String(id))
    ) as HTMLSelectElement;
    await act(async () => {
      select.selectedIndex = Array.from(select.options).findIndex((option) => option.value === String(id));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(select.value).toBe(String(id));
  };

  it('muestra los cuatro productos existentes; chips conserva escaneo y hojas usa cantidad', async () => {
    await cargarProductos();
    const optionTexts = Array.from(container.querySelectorAll('select option')).map((option) => option.textContent || '');
    expect(optionTexts.join(' ')).toContain('Chip + Porta Chip');
    expect(optionTexts.join(' ')).toContain('Hojas GNV');
    expect(optionTexts.join(' ')).toContain('Hojas GLP');
    expect(optionTexts.join(' ')).toContain('Hojas Conformidad');
    expect(container.querySelector('[data-testid="chip-scanner"]')).not.toBeNull();

    await seleccionar(2);
    expect(container.querySelector('[data-testid="chip-scanner"]')).toBeNull();
    expect(container.querySelector('input[type="number"]')).not.toBeNull();
    expect(container.textContent).toContain('Disponible en esta sede');
    expect(container.textContent).toContain('250 unidades');
    expect(container.textContent).toContain('Precio unitario vigente');
    expect(container.textContent).toContain('S/ 12.60');
  });

  it('muestra el total estimado de 1 y 100 unidades y valida contra el stock', async () => {
    await cargarProductos();
    await seleccionar(2);
    const cantidad = container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(container.textContent).toContain('S/ 12.60');

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(cantidad, '100');
      cantidad.dispatchEvent(new Event('input', { bubbles: true }));
      cantidad.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.textContent).toContain('S/ 1260.00');

    const validar = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('VALIDAR STOCK')) as HTMLButtonElement;
    await act(async () => { validar.click(); await Promise.resolve(); });
    expect(api.validarVentaDirecta).toHaveBeenCalledWith({ productoInventariableId: 2, cantidad: 100 });
    expect(container.textContent).toContain('100');
  });

  it('la respuesta de stock insuficiente mantiene bloqueada la venta', async () => {
    await cargarProductos();
    await seleccionar(2);
    const cantidad = container.querySelector('input[type="number"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(cantidad, '251');
      cantidad.dispatchEvent(new Event('input', { bubbles: true }));
      cantidad.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const validar = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('VALIDAR STOCK')) as HTMLButtonElement;
    await act(async () => { validar.click(); await Promise.resolve(); });
    expect(container.textContent).toContain('Stock insuficiente.');
    expect(Array.from(container.querySelectorAll('button')).some((button) => button.textContent?.includes('Confirmar Venta y Emitir') && !button.hasAttribute('disabled'))).toBe(false);
  });
});
