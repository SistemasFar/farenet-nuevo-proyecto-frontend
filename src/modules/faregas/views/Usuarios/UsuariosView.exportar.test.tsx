// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsuariosView } from './UsuariosView';
import { faregasUsuariosApi } from '../../services/faregas-usuarios.api';
import { exportarExcelVariasHojas } from '../../utils/exportar-excel';

vi.mock('../../services/faregas-usuarios.api', () => ({ faregasUsuariosApi: {
  obtenerUsuarios: vi.fn(), obtenerPerfiles: vi.fn(), obtenerPlantas: vi.fn(), obtenerPermisos: vi.fn(),
  getMaestrosPersona: vi.fn(), obtenerUsuariosPorPerfil: vi.fn(), eliminarPerfil: vi.fn(),
  eliminarUsuario: vi.fn(), desactivarUsuario: vi.fn(), activarUsuario: vi.fn(),
  crearUsuario: vi.fn(), actualizarUsuario: vi.fn(), cambiarPassword: vi.fn(),
  restablecerCredencialesTemporales: vi.fn(),
} }));
vi.mock('../../utils/exportar-excel', () => ({ exportarExcelVariasHojas: vi.fn() }));

const api = vi.mocked(faregasUsuariosApi);
const exportar = vi.mocked(exportarExcelVariasHojas);
let root: Root;
let host: HTMLDivElement;
const click = async (element: Element) => { await act(async () => { (element as HTMLElement).click(); }); };

describe('exportación desde Administración de Usuarios', () => {
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
    api.restablecerCredencialesTemporales.mockImplementation(async (credenciales) => ({
      success: true,
      resultados: credenciales.map(({ username }) => ({ username, sesionesRevocadas: 1 })),
    }));
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    await act(async () => { root.render(<UsuariosView />); });
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    host.remove();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('exporta todos los usuarios que cumplen los filtros activos, no solo la página visible', async () => {
    const button = [...host.querySelectorAll('button')].find((item) => item.textContent?.includes('EXPORTAR EXCEL'))!;
    await click(button);
    expect(exportar).toHaveBeenCalledTimes(1);
    const [nombre, hojas] = exportar.mock.calls[0];
    expect(nombre).toBe('USUARIOS_FAREGAS');
    expect(hojas[0].rows).toHaveLength(11);
    expect(hojas[0].rows[0]).toMatchObject({ username: 'wilber', password: '', estado: 'Activo' });
    expect(api.restablecerCredencialesTemporales).not.toHaveBeenCalled();
  });

  it('permite a un CONTADOR autorizado restablecer solo las cuentas activas seleccionadas y exporta las claves establecidas', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    const primera = host.querySelector<HTMLInputElement>('input[aria-label="Seleccionar usuario wilber"]')!;
    const segunda = host.querySelector<HTMLInputElement>('input[aria-label="Seleccionar usuario contador1"]')!;
    await click(primera);
    await click(segunda);
    const generar = [...host.querySelectorAll('button')].find((item) => item.textContent?.includes('GENERAR NUEVAS CREDENCIALES'))!;
    await click(generar);
    await vi.waitFor(() => expect(api.restablecerCredencialesTemporales).toHaveBeenCalledTimes(1));

    const [enviadas] = api.restablecerCredencialesTemporales.mock.calls[0];
    expect(enviadas.map((item) => item.username)).toEqual(['wilber', 'contador1']);
    expect(enviadas.every((item) => item.password.length >= 24)).toBe(true);
    expect(new Set(enviadas.map((item) => item.password)).size).toBe(2);
    expect(host.textContent).toContain('Descargue ahora el Excel confidencial');

    const descargar = [...host.querySelectorAll('button')].find((item) => item.textContent?.includes('Credenciales temporales (2)'))!;
    await click(descargar);
    const [nombre, hojas] = exportar.mock.calls[0];
    expect(nombre).toBe('CREDENCIALES_TEMPORALES_FAREGAS');
    expect(hojas[0].rows).toHaveLength(2);
    expect(hojas[0].rows.map((row) => row.password)).toEqual(enviadas.map((item) => item.password));
    expect(hojas[0].rows.every((row) => row.resultado === 'Restablecida')).toBe(true);
  });

  it('respeta la cancelación y no crea una hoja de credenciales cuando el backend rechaza el lote', async () => {
    const primera = host.querySelector<HTMLInputElement>('input[aria-label="Seleccionar usuario wilber"]')!;
    await click(primera);
    vi.stubGlobal('confirm', vi.fn(() => false));
    const generar = [...host.querySelectorAll('button')].find((item) => item.textContent?.includes('GENERAR NUEVAS CREDENCIALES'))!;
    await click(generar);
    expect(api.restablecerCredencialesTemporales).not.toHaveBeenCalled();

    vi.stubGlobal('confirm', vi.fn(() => true));
    api.restablecerCredencialesTemporales.mockRejectedValueOnce(Object.assign(new Error('La cuenta ya no está activa.'), { status: 409 }));
    await click(generar);
    await vi.waitFor(() => expect(host.textContent).toContain('La cuenta ya no está activa.'));
    expect(api.restablecerCredencialesTemporales).toHaveBeenCalledTimes(1);
    expect(host.textContent).not.toContain('Credenciales temporales (1)');
    expect(exportar).not.toHaveBeenCalled();
  });

  it('no ofrece la acción de restablecimiento si la sesión no tiene MENU_USUARIOS', async () => {
    await act(async () => { root.unmount(); });
    sessionStorage.setItem('faregasUser', JSON.stringify({ username: 'solo_lectura', permisos: [] }));
    host.innerHTML = '';
    root = createRoot(host);
    await act(async () => { root.render(<UsuariosView />); });
    expect([...host.querySelectorAll('button')].some((item) => (
      item.textContent?.includes('GENERAR NUEVAS CREDENCIALES')
    ))).toBe(false);
  });

  it('prepara una contraseña temporal segura al abrir un alta, sin guardar credenciales aún', async () => {
    const crear = [...host.querySelectorAll('button')].find((item) => item.textContent?.includes('Crear Usuario'))!;
    await click(crear);
    const password = host.querySelector<HTMLInputElement>('input[type="password"]')!;
    expect(password.value).toHaveLength(24);
    expect(host.textContent).toContain('disponible una sola vez');
    expect(api.crearUsuario).not.toHaveBeenCalled();
    const cancelar = [...host.querySelectorAll('button')].find((item) => item.textContent?.trim() === 'Cancelar')!;
    await click(cancelar);
    expect(api.crearUsuario).not.toHaveBeenCalled();
  });
});
