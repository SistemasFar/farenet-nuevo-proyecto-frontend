// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TabFacturacion from './TabFacturacion';

vi.mock('./TabSeries', () => ({ default: () => <div>SERIES_AUTORIZADAS</div> }));
vi.mock('./TabDocumentosFacturacion', () => ({ default: () => <div>DOCUMENTOS_AUTORIZADOS</div> }));
vi.mock('./TabClientesFacturacion', () => ({ default: () => <div>CLIENTES_AUTORIZADOS</div> }));

let root: Root;
let host: HTMLDivElement;

const renderWithPermissions = async (permisos: string[]) => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  const router = createMemoryRouter([{
    path: '/',
    element: <Outlet context={{ permisos, plantaKey: '98', plantaNombre: 'SURCO' }} />,
    children: [{ index: true, element: <TabFacturacion plantaKey="98" plantaNombre="SURCO" /> }],
  }], { initialEntries: ['/'] });
  await act(async () => { root.render(<RouterProvider router={router} />); });
};

describe('pestañas de Facturación', () => {
  beforeEach(() => Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }));
  afterEach(async () => {
    if (root) await act(async () => { root.unmount(); });
    host?.remove();
  });

  it('un permiso padre sin submódulos no carga SERIES por defecto', async () => {
    await renderWithPermissions(['MENU_FACTURACION']);

    expect(host.querySelectorAll('button')).toHaveLength(0);
    expect(host.textContent).toContain('no tiene submódulos autorizados');
    expect(host.textContent).not.toContain('SERIES_AUTORIZADAS');
  });

  it('el submódulo Comprobantes muestra solo su pestaña', async () => {
    await renderWithPermissions(['MENU_FACTURACION_COMPROBANTES']);

    expect([...host.querySelectorAll('button')].map(button => button.textContent?.trim())).toEqual(['COMPROBANTES']);
    expect(host.textContent).toContain('DOCUMENTOS_AUTORIZADOS');
    expect(host.textContent).not.toContain('SERIES_AUTORIZADAS');
  });
});
