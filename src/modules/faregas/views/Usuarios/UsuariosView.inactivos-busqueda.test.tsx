// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsuariosView } from './UsuariosView';
import { faregasUsuariosApi } from '../../services/faregas-usuarios.api';

vi.mock('../../services/faregas-usuarios.api', () => ({
  faregasUsuariosApi: {
    obtenerUsuarios: vi.fn(),
    obtenerPerfiles: vi.fn(),
    obtenerPlantas: vi.fn(),
    obtenerPermisos: vi.fn(),
    getMaestrosPersona: vi.fn(),
    obtenerPoliticaPassword: vi.fn(),
  }
}));

const api = vi.mocked(faregasUsuariosApi);
let root: Root;
let host: HTMLDivElement;

const setInputValue = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const mockUsuarios = [
  {
    username: 'admin',
    nombres: 'ADMINISTRADOR',
    apellidos: 'SISTEMA',
    perfil_id: 'ADMINISTRADOR',
    estado: true,
    nroDocumento: '10203040',
    tipoDocumentoKey: 'dni',
    sedes: []
  },
  {
    username: 'wdonayre',
    nombres: 'WILBER ALEXIS',
    apellidos: 'DONAYRE PISCONTE',
    perfil_id: 'CONTADOR',
    estado: false, // INACTIVO
    nroDocumento: '41716773',
    tipoDocumentoKey: 'dni',
    sedes: []
  }
];

describe('búsqueda y filtros de usuarios activos e inactivos', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    sessionStorage.setItem('faregasUser', JSON.stringify({ username: 'admin' }));
    
    api.obtenerUsuarios.mockResolvedValue(mockUsuarios);
    api.obtenerPerfiles.mockResolvedValue([
      { clave: 'ADMINISTRADOR', nombre: 'Administrador', visible: true, sedes: [] },
      { clave: 'CONTADOR', nombre: 'Contador', visible: true, sedes: [] }
    ]);
    api.obtenerPlantas.mockResolvedValue([]);
    api.obtenerPermisos.mockResolvedValue([]);
    api.getMaestrosPersona.mockResolvedValue({ tiposDocumentos: [{ key: 'dni', nombre: 'DNI' }], paises: [] });
    api.obtenerPoliticaPassword.mockResolvedValue({ minLongitud: 4, esProduccion: false });

    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => { root.render(<UsuariosView />); });
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    host.remove();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('por defecto (Sólo activos) sin búsqueda muestra usuarios activos y oculta inactivos', () => {
    const tbody = host.querySelector('tbody')?.textContent || '';
    expect(tbody).toContain('admin');
    expect(tbody).not.toContain('wdonayre');
  });

  it('al cambiar el selector a Sólo inactivos muestra wdonayre y oculta usuarios activos', async () => {
    const select = host.querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe('ACTIVOS');

    await act(async () => {
      select.value = 'INACTIVOS';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const tbody = host.querySelector('tbody')?.textContent || '';
    expect(tbody).toContain('wdonayre');
    expect(tbody).not.toContain('admin');
    expect(tbody).toContain('Inactivo');
  });

  it('al cambiar el selector a Todos muestra tanto admin como wdonayre', async () => {
    const select = host.querySelector('select') as HTMLSelectElement;

    await act(async () => {
      select.value = 'TODOS';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const tbody = host.querySelector('tbody')?.textContent || '';
    expect(tbody).toContain('admin');
    expect(tbody).toContain('wdonayre');
  });

  it('no oculta a wdonayre si se busca explícitamente cuando el filtro está en Sólo activos', async () => {
    const input = host.querySelector('input[placeholder*="Buscar por usuario"]') as HTMLInputElement;
    expect(input).not.toBeNull();

    await setInputValue(input, 'wdonayre');

    const tbody = host.querySelector('tbody')?.textContent || '';
    expect(tbody).toContain('wdonayre');
    expect(tbody).toContain('Inactivo');

    // Muestra el banner informativo con el botón
    const text = host.textContent || '';
    expect(text).toContain('La búsqueda incluye coincidencias con usuarios en estado Inactivo');
    expect(text).toContain('Ver en Inactivos');
  });

  it('el botón Ver en Inactivos del banner informativo cambia el filtro a INACTIVOS', async () => {
    const input = host.querySelector('input[placeholder*="Buscar por usuario"]') as HTMLInputElement;

    await setInputValue(input, '41716773');

    const btnVerInactivos = [...host.querySelectorAll('button')].find(b => b.textContent?.includes('Ver en Inactivos'));
    expect(btnVerInactivos).not.toBeUndefined();

    await act(async () => {
      btnVerInactivos?.click();
    });

    const select = host.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('INACTIVOS');
  });
});
