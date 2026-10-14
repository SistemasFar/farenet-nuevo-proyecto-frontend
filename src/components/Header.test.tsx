// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { UserAvatar } from './Header';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('UserAvatar: Centrado y robustez visual', () => {
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (container) {
      container.remove();
      container = null;
    }
  });

  it('1. Renderiza correctamente con inicial M', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<UserAvatar initial="MQUIJANO" />);
    });

    const badge = container.querySelector('span[aria-label="Inicial del operador: M"]');
    expect(badge).toBeTruthy();
    expect(badge?.className).toContain('inline-flex');
    expect(badge?.className).toContain('items-center');
    expect(badge?.className).toContain('justify-center');
    expect(badge?.className).toContain('h-10');
    expect(badge?.className).toContain('w-10');
    expect(badge?.className).toContain('rounded-full');
    expect(badge?.className).not.toContain('w-[1ch]');

    const inner = badge?.querySelector('span');
    expect(inner?.textContent).toBe('M');
    expect(inner?.className).toContain('leading-none');
    expect(inner?.className).not.toContain('w-[1ch]');
  });

  it('2. Soporta distintas iniciales (A, J, O) sin restricciones de ancho', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    for (const init of ['A', 'J', 'O']) {
      await act(async () => {
        root.render(<UserAvatar initial={init} />);
      });

      const badge = container.querySelector(`span[aria-label="Inicial del operador: ${init}"]`);
      expect(badge).toBeTruthy();
      const inner = badge?.querySelector('span');
      expect(inner?.textContent).toBe(init);
      expect(badge?.className).not.toContain('w-[1ch]');
    }
  });
});
