// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsuariosView } from './UsuariosView';
import { faregasUsuariosApi } from '../../services/faregas-usuarios.api';

vi.mock('../../services/faregas-usuarios.api', () => ({ faregasUsuariosApi: {
  obtenerUsuarios: vi.fn(), obtenerPerfiles: vi.fn(), obtenerPlantas: vi.fn(), obtenerPermisos: vi.fn(),
  getMaestrosPersona: vi.fn(), obtenerUsuariosPorPerfil: vi.fn(), eliminarPerfil: vi.fn(),
  eliminarUsuario: vi.fn(), desactivarUsuario: vi.fn(), activarUsuario: vi.fn(),
  crearUsuario: vi.fn(), actualizarUsuario: vi.fn(), cambiarPassword: vi.fn(),
  consultarCredencialAsignada: vi.fn(), descargarInventarioRenovadoBlob: vi.fn(),
} }));

const api = vi.mocked(faregasUsuariosApi);
let root: Root;
let host: HTMLDivElement;
const click = async (element: Element) => { await act(async () => { (element as HTMLElement).click(); }); };

describe('Administración de Usuarios', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    sessionStorage.setItem('faregasUser', JSON.stringify({ username: 'admin', perfil_id: 'CONTADOR', permisos: ['MENU_USUARIOS'] }));
    api.obtenerUsuarios.mockResolvedValue([
      ...Array.from({ length: 11 }, (_, index) => ({
        username: index === 0 ? 'wilber' : `contador${index}`,
        nombres: index === 0 ? 'WILBER' : 'USUARIO',
        apellidos: index === 0 ? 'DONAYRE' : `CONTADOR ${index}`,
        perfil_id: 'CONTADOR',
        estado: true,
        sedes: [{ key: 'surco', nombre: 'SURCO' }],
      })),
      { username: 'inactivo', nombres: 'USUARIO', apellidos: 'INACTIVO', perfil_id: 'CONTADOR', estado: false, sedes: [] },
    ]);
    api.obtenerPerfiles.mockResolvedValue([{ clave: 'CONTADOR', nombre: 'CONTADOR', permisos: [] }]);
    api.obtenerPlantas.mockResolvedValue([]);
    api.obtenerPermisos.mockResolvedValue([]);
    api.getMaestrosPersona.mockResolvedValue({ tiposDocumentos: [], paises: [] });
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    await act(async () => { root.render(<UsuariosView />); });
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    host.remove();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('omite la exportación de usuarios del listado', () => {
    expect(host.textContent).not.toContain('EXPORTAR EXCEL');
  });

  it('elimina la generación masiva y sus casillas de selección exclusivas', () => {
    expect(host.textContent).not.toContain('GENERAR NUEVAS CREDENCIALES');
    expect(host.querySelector('input[aria-label^="Seleccionar usuario"]')).toBeNull();
  });

  it('abre el alta con contraseña manual vacía y permite mostrarla u ocultarla', async () => {
    const crear = [...host.querySelectorAll('button')].find((item) => item.textContent?.includes('Crear Usuario'))!;
    await click(crear);
    const password = host.querySelector<HTMLInputElement>('input[autocomplete="new-password"]')!;
    expect(password.value).toBe('');
    expect(password.type).toBe('password');
    await click(host.querySelector('button[aria-label="Mostrar contraseña"]')!);
    expect(password.type).toBe('text');
    await click(host.querySelector('button[aria-label="Ocultar contraseña"]')!);
    expect(password.type).toBe('password');
    expect(host.textContent).not.toContain('Generar contraseña temporal');
    expect(api.crearUsuario).not.toHaveBeenCalled();
  });

  it('en edición muestra los campos solo al seleccionar Crear nueva contraseña', async () => {
    await click(host.querySelector('button[title="Editar"]')!);
    expect(host.textContent).toContain('Crear nueva contraseña');
    expect(host.querySelector('input[autocomplete="new-password"]')).toBeNull();
    const opcion = [...host.querySelectorAll('label')].find((item) => item.textContent?.includes('Crear nueva contraseña'))!
      .querySelector('input')!;
    await click(opcion);
    expect(host.querySelectorAll('input[autocomplete="new-password"]')).toHaveLength(2);
    expect(api.cambiarPassword).not.toHaveBeenCalled();
  });
});
