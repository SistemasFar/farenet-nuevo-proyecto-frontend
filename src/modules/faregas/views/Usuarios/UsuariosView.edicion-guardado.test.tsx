// @vitest-environment jsdom
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
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
    actualizarUsuario: vi.fn(),
    crearUsuario: vi.fn(),
    actualizarPerfil: vi.fn(),
    crearPerfil: vi.fn(),
    getDepartamentos: vi.fn().mockResolvedValue([]),
    getProvincias: vi.fn().mockResolvedValue([]),
    getDistritos: vi.fn().mockResolvedValue([])
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
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  });
};

const mockUsuarios = [
  {
    username: 'wdonayre',
    nombres: 'WILBER ALEXIS',
    apellidos: 'DONAYRE PISCONTE',
    perfil_id: 'CONTADOR',
    estado: true,
    nroDocumento: '41716773',
    tipoDocumentoKey: 'dni',
    direccion: 'AV SURCO 123',
    telefono: '922214287',
    email: 'wdonayre@faregas.pe',
    paisKey: '1',
    departamentoKey: '15',
    provinciaKey: '121',
    distritoKey: '23',
    sedes: [{ key: '201', nombre: 'INDEPENDENCIA' }, { key: '150', nombre: 'FAUCETT' }]
  }
];

const mockPerfiles = [
  {
    clave: 'CONTADOR',
    nombre: 'CONTADOR',
    visible: true,
    num_usuarios: 1,
    sedes: ['201', '150', '160'],
    permisos: ['MENU_USUARIOS', 'MENU_DASHBOARD']
  }
];

const mockPlantas = [
  { key: '201', nombre: 'INDEPENDENCIA', activo: true },
  { key: '150', nombre: 'FAUCETT', activo: true },
  { key: '160', nombre: 'SURQUILLO', activo: true }
];

describe('Edición y guardado de usuarios y perfiles FAREGAS', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStorage.setItem('faregasUsername', 'admin');
    api.obtenerUsuarios.mockResolvedValue(mockUsuarios);
    api.obtenerPerfiles.mockResolvedValue(mockPerfiles);
    api.obtenerPlantas.mockResolvedValue(mockPlantas);
    api.obtenerPermisos.mockResolvedValue([
      { clave: 'MENU_USUARIOS', nombre: 'Usuarios' },
      { clave: 'MENU_DASHBOARD', nombre: 'Dashboard' }
    ]);
    api.getMaestrosPersona.mockResolvedValue({
      tiposDocumentos: [{ key: 'dni', nombre: 'DNI' }],
      paises: [{ key: '1', nombre: 'PERU' }]
    });
    api.obtenerPoliticaPassword.mockResolvedValue({
      minLongitud: 4,
      esProduccion: false
    });

    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(<UsuariosView />);
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    host.remove();
    sessionStorage.clear();
  });

  it('al pulsar editar usuario, carga los datos en el modal correctamente', async () => {
    const editBtn = host.querySelector('button[title="Editar"]') as HTMLButtonElement;
    expect(editBtn).not.toBeNull();

    await act(async () => {
      editBtn.click();
    });

    const modalTitle = Array.from(host.querySelectorAll('h2')).find(h => h.textContent === 'Editar Usuario');
    expect(modalTitle).toBeDefined();

    const usernameInput = host.querySelector('input[value="wdonayre"]') as HTMLInputElement;
    expect(usernameInput).not.toBeNull();
    expect(usernameInput.disabled).toBe(true);

    const nombresInput = host.querySelector('input[value="WILBER ALEXIS"]') as HTMLInputElement;
    expect(nombresInput).not.toBeNull();
  });

  it('si falla la validación local, muestra banner de error sin cerrar el modal', async () => {
    const editBtn = host.querySelector('button[title="Editar"]') as HTMLButtonElement;
    await act(async () => {
      editBtn.click();
    });

    // Vaciar el teléfono para que falle la validación
    const telInput = host.querySelector('input[type="tel"]') as HTMLInputElement;
    await setInputValue(telInput, '');

    const saveBtn = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Guardar') as HTMLButtonElement;
    await act(async () => {
      saveBtn.click();
    });

    // El modal debe permanecer abierto
    const modalTitle = Array.from(host.querySelectorAll('h2')).find(h => h.textContent === 'Editar Usuario');
    expect(modalTitle).toBeDefined();

    // Debe mostrar banner de error
    const alert = host.querySelector('div[class*="bg-red-50"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('El teléfono es obligatorio');

    // No debe haber llamado a la API
    expect(api.actualizarUsuario).not.toHaveBeenCalled();
  });

  it('guarda exitosamente los cambios, cierra el modal y muestra banner de éxito', async () => {
    api.actualizarUsuario.mockResolvedValue({ username: 'wdonayre' });

    const editBtn = host.querySelector('button[title="Editar"]') as HTMLButtonElement;
    await act(async () => {
      editBtn.click();
    });

    const saveBtn = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Guardar') as HTMLButtonElement;
    await act(async () => {
      saveBtn.click();
    });

    expect(api.actualizarUsuario).toHaveBeenCalledWith('wdonayre', expect.objectContaining({
      username: 'wdonayre',
      nombres: 'WILBER ALEXIS',
      apellidos: 'DONAYRE PISCONTE',
      perfil_id: 'CONTADOR'
    }));

    // Se debe recargar los datos
    expect(api.obtenerUsuarios).toHaveBeenCalledTimes(2);

    // Modal cerrado y mensaje de éxito visible
    const statusBanner = host.querySelector('[role="status"]');
    expect(statusBanner).not.toBeNull();
    expect(statusBanner?.textContent).toContain('Usuario wdonayre guardado correctamente');
  });

  it('si el backend responde error 400 con errores por campo, los resalta y mantiene el modal abierto', async () => {
    const errorBackend = new Error('Datos inválidos') as any;
    errorBackend.status = 400;
    errorBackend.errores = { direccion: 'La dirección debe tener al menos 5 caracteres.' };
    errorBackend.response = { status: 400, data: { message: 'Datos inválidos', errores: errorBackend.errores } };
    api.actualizarUsuario.mockRejectedValue(errorBackend);

    const editBtn = host.querySelector('button[title="Editar"]') as HTMLButtonElement;
    await act(async () => {
      editBtn.click();
    });

    const saveBtn = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Guardar') as HTMLButtonElement;
    await act(async () => {
      saveBtn.click();
    });

    // Modal debe seguir abierto
    const modalTitle = Array.from(host.querySelectorAll('h2')).find(h => h.textContent === 'Editar Usuario');
    expect(modalTitle).toBeDefined();

    // Error banner visible
    expect(host.querySelector('div[class*="bg-red-50"]')?.textContent).toContain('Datos inválidos');
  });
});
