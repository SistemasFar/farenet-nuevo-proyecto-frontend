// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsuariosView } from './UsuariosView';
import { faregasUsuariosApi } from '../../services/faregas-usuarios.api';

vi.mock('../../services/faregas-usuarios.api', () => ({ faregasUsuariosApi: {
  obtenerUsuarios: vi.fn(), obtenerPerfiles: vi.fn(), obtenerPlantas: vi.fn(), obtenerPermisos: vi.fn(),
  getMaestrosPersona: vi.fn(), obtenerUsuariosPorPerfil: vi.fn(), eliminarPerfil: vi.fn(),
  eliminarUsuario: vi.fn(), desactivarUsuario: vi.fn(),
} }));

const api = vi.mocked(faregasUsuariosApi);
let root: Root;
let host: HTMLDivElement;
const button = (text: string) => [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === text)!;
const click = async (element: Element) => { await act(async () => { (element as HTMLElement).click(); }); };

describe('eliminación administrativa', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    sessionStorage.setItem('faregasUser', JSON.stringify({ username: 'admin' }));
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    api.obtenerUsuarios.mockResolvedValue([{ username: 'mquijano', nombres: 'MIGUEL', apellidos: 'QUIJANO', perfil_id: 'SUPERVISOR', estado: true, sedes: [] }]);
    api.obtenerPerfiles.mockResolvedValue([
      { clave: 'SUPERVISOR', nombre: 'Supervisor', num_usuarios: 1, visible: true },
      { clave: 'OPERADOR', nombre: 'Operador', num_usuarios: 0, visible: true },
    ]);
    api.obtenerPlantas.mockResolvedValue([]);
    api.obtenerPermisos.mockResolvedValue([]);
    api.getMaestrosPersona.mockResolvedValue({ tiposDocumentos: [], paises: [] });
    api.obtenerUsuariosPorPerfil.mockResolvedValue({ usuarios: [{ username: 'mquijano', nombres: 'MIGUEL', apellidos: 'QUIJANO', estado: true }] });
    api.eliminarPerfil.mockResolvedValue({});
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    await act(async () => { root.render(<UsuariosView />); });
  });
  afterEach(async () => {
    await act(async () => { root.unmount(); }); host.remove(); vi.restoreAllMocks(); sessionStorage.clear();
  });
  const abrirSupervisor = async () => {
    await click(button('Perfiles'));
    const row = [...host.querySelectorAll('tr')].find(r => r.textContent?.includes('SUPERVISOR'))!;
    await click(row.querySelector('button[title="Eliminar"]')!);
  };
  it('muestra usuarios y exige elegir el reemplazo, sin asignación predeterminada', async () => {
    await abrirSupervisor();
    const dialog = host.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('mquijano — MIGUEL QUIJANO');
    expect((dialog.querySelector('select') as HTMLSelectElement).value).toBe('');
    expect(button('Reasignar y eliminar').disabled).toBe(true);
    expect(api.eliminarPerfil).not.toHaveBeenCalled();
    const select = dialog.querySelector('select') as HTMLSelectElement;
    await act(async () => { select.value = 'OPERADOR'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    await click(button('Reasignar y eliminar'));
    expect(api.eliminarPerfil).toHaveBeenCalledWith('SUPERVISOR', 'OPERADOR');
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });
  it('conserva el diálogo y muestra el rechazo de sedes', async () => {
    api.eliminarPerfil.mockRejectedValueOnce(new Error('El reemplazo no permite todas las sedes asignadas.'));
    await abrirSupervisor();
    const select = host.querySelector('[role="dialog"] select') as HTMLSelectElement;
    await act(async () => { select.value = 'OPERADOR'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    await click(button('Reasignar y eliminar'));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('sedes asignadas');
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  });
  it('permite cancelar sin reasignar', async () => {
    await abrirSupervisor(); await click(button('Cancelar'));
    expect(api.eliminarPerfil).not.toHaveBeenCalled();
  });
  it('no desactiva por historial si el administrador cancela', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true).mockReturnValueOnce(false);
    api.eliminarUsuario.mockRejectedValueOnce(Object.assign(new Error('Conserva auditoría'), { codigo: 'USUARIO_CON_HISTORIAL' }));
    await click(host.querySelector('button[title="Eliminar"]')!);
    expect(api.desactivarUsuario).not.toHaveBeenCalled();
  });
  it('desactiva sólo después de la selección explícita', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.eliminarUsuario.mockRejectedValueOnce(Object.assign(new Error('Conserva auditoría'), { codigo: 'USUARIO_CON_HISTORIAL' }));
    api.desactivarUsuario.mockResolvedValue({ mensaje: 'Usuario desactivado' });
    await click(host.querySelector('button[title="Eliminar"]')!);
    expect(api.desactivarUsuario).toHaveBeenCalledWith('mquijano');
  });
});
