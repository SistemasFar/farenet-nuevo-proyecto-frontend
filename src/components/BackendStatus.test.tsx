// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackendStatus } from './BackendStatus';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('BackendStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('cierra el detalle al hacer clic fuera del indicador', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<BackendStatus />);
    });

    const boton = container.querySelector('button[title="Estado del backend"]')!;
    await act(async () => {
      boton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toContain('Backend Farenet');

    await act(async () => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(container.textContent).not.toContain('Backend Farenet');

    await act(async () => {
      root.unmount();
    });
  });
});
