// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TabCatalogo from './TabCatalogo';

vi.mock('./TabCategorias', () => ({ default: () => <div>ADMINISTRACIÓN DE CATEGORÍAS</div> }));
vi.mock('./TabProductos', () => ({ default: () => <div>PRODUCTOS FISCALES</div> }));
vi.mock('./TabOperacionesWrapper', () => ({ default: () => <div>OPERACIONES Y FORMATOS</div> }));

describe('TabCatalogo', () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(async () => {
    if (root) await act(async () => { root?.unmount(); });
    root = null;
    host?.remove();
    host = null;
  });

  it('deja usar Operación y formatos con CONFIGURACION_SERVICIOS sin exigir CONFIGURACION_CATEGORIAS', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => {
      root?.render(<TabCatalogo
        hasCategorias={false}
        hasServicios
        hasProductos={false}
        hasTarifas={false}
        onGoToTarifas={vi.fn()}
      />);
    });

    expect(host.querySelector('button')?.textContent).toContain('OPERACIÓN Y FORMATOS');
    expect(host.textContent).toContain('OPERACIONES Y FORMATOS');
    expect(host.textContent).not.toContain('ADMINISTRACIÓN DE CATEGORÍAS');
  });
});
