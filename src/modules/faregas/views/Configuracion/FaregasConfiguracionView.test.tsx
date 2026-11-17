// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FaregasConfiguracionView } from './FaregasConfiguracionView';

vi.mock('./TabSedes', () => ({ default: () => <div>CONTENIDO SEDES</div> }));
vi.mock('./components/TabCatalogo', () => ({
  default: ({ hasProductos, hasServicios, hasCategorias }: { hasProductos: boolean; hasServicios: boolean; hasCategorias: boolean }) => (
    <div>CATÁLOGO {hasProductos ? 'PRODUCTOS' : ''} {hasServicios ? 'SERVICIOS' : ''} {hasCategorias ? 'CATEGORÍAS' : ''}</div>
  ),
}));
vi.mock('./components/TabTarifas', () => ({ default: () => <div>CONTENIDO TARIFAS</div> }));
vi.mock('./components/TabEmpresas', () => ({ default: () => <div>CONTENIDO EMPRESAS</div> }));
vi.mock('./components/TabCorrelativos', () => ({ default: () => <div>CONTENIDO CORRELATIVOS</div> }));

let root: Root;
let host: HTMLDivElement;

const renderWithPermissions = async (permisos: string[]) => {
  sessionStorage.setItem('faregasUser', JSON.stringify({ permisos }));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root.render(<FaregasConfiguracionView />); });
};

const labels = () => [...host.querySelectorAll('button')].map((button) => button.textContent?.trim());

describe('FaregasConfiguracionView', () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    sessionStorage.clear();
  });

  afterEach(async () => {
    if (root) await act(async () => { root.unmount(); });
    host?.remove();
    sessionStorage.clear();
  });

  it('OPERADOR entra sin MENU_CONFIGURACION y ve únicamente Productos fiscales', async () => {
    await renderWithPermissions(['CONFIGURACION_PRODUCTOS']);

    expect(labels()).toEqual(['CATÁLOGO']);
    expect(host.textContent).toContain('CATÁLOGO PRODUCTOS');
    expect(host.textContent).not.toContain('CONTENIDO SEDES');
    expect(host.textContent).not.toContain('Tu perfil no tiene submódulos');
  });

  it('un permiso de contenedor sin submódulos recibe una explicación clara', async () => {
    await renderWithPermissions(['MENU_CONFIGURACION']);

    expect(labels()).toEqual([]);
    expect(host.textContent).toContain('Tu perfil no tiene submódulos de Configuración autorizados');
  });

  it('el submódulo Correlativos basta sin el permiso general de Configuración', async () => {
    await renderWithPermissions(['MENU_CONFIGURACION_CORRELATIVOS']);

    expect(labels()).toEqual(['CORRELATIVOS']);
    expect(host.textContent).toContain('CONTENIDO CORRELATIVOS');
  });

  it('muestra Correlativos a CONTADOR cuando tiene MENU_FACTURACION_SERIES, permiso aceptado por la API', async () => {
    await renderWithPermissions(['MENU_CONFIGURACION', 'MENU_FACTURACION_SERIES']);

    expect(labels()).toEqual(['CORRELATIVOS']);
    expect(host.textContent).toContain('CONTENIDO CORRELATIVOS');
  });

  it('muestra todas las secciones de SISTEMAS que tienen permiso operativo', async () => {
    await renderWithPermissions([
      'MENU_CONFIGURACION',
      'CONFIGURACION_CATEGORIAS',
      'CONFIGURACION_EMPRESAS',
      'CONFIGURACION_PRODUCTOS',
      'CONFIGURACION_SEDES',
      'CONFIGURACION_SERIES',
      'CONFIGURACION_SERVICIOS',
      'CONFIGURACION_TARIFAS',
    ]);

    expect(labels()).toEqual(['SEDES / CATEGORÍAS DMS', 'CATÁLOGO', 'TARIFAS', 'CORRELATIVOS', 'EMPRESAS']);
  });

  it('Sedes no abre la pestaña Empresas', async () => {
    await renderWithPermissions(['MENU_CONFIGURACION_SEDES']);

    expect(labels()).toEqual(['SEDES / CATEGORÍAS DMS']);
    expect(host.textContent).not.toContain('CONTENIDO EMPRESAS');
  });
});
