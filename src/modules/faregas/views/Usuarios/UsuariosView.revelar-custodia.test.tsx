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
    consultarCredencialAsignada: vi.fn(),
    revelarCredencialCustodiada: vi.fn(),
    generarCredencialTemporal: vi.fn(),
    descargarInventarioRenovadoBlob: vi.fn(),
  }
}));

const api = vi.mocked(faregasUsuariosApi);
let root: Root;
let host: HTMLDivElement;

const flushPromises = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
};

const mockUsuarios = [
  {
    username: 'jsturt',
    nombres: 'JORDAN FRANCIS',
    apellidos: 'STURT ARCA',
    perfil_id: 'SUPERVISOR',
    estado: true,
    nroDocumento: '72839102',
    tipoDocumentoKey: 'dni',
    sedes: []
  },
  {
    username: 'gibarra',
    nombres: 'GUSTAVO',
    apellidos: 'IBARRA',
    perfil_id: 'ADMINISTRADOR',
    estado: true,
    nroDocumento: '10293847',
    tipoDocumentoKey: 'dni',
    sedes: []
  }
];

describe('Gestión de Credencial Administrada - Flujo Simplificado del Ícono del Ojo', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    sessionStorage.setItem('faregasUser', JSON.stringify({
      username: 'admin',
      permisos: ['MENU_USUARIOS']
    }));

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });

    api.obtenerUsuarios.mockResolvedValue(mockUsuarios);
    api.obtenerPerfiles.mockResolvedValue([
      { clave: 'SUPERVISOR', nombre: 'Supervisor', visible: true, sedes: [] },
      { clave: 'ADMINISTRADOR', nombre: 'Administrador', visible: true, sedes: [] }
    ]);
    api.obtenerPlantas.mockResolvedValue([]);
    api.obtenerPermisos.mockResolvedValue(['MENU_USUARIOS']);
    api.getMaestrosPersona.mockResolvedValue({ tiposDocumentos: [{ key: 'dni', nombre: 'DNI' }], paises: [] });
    api.obtenerPoliticaPassword.mockResolvedValue({ minLongitud: 8, esProduccion: false });

    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => { root.render(<UsuariosView />); });
    await flushPromises();
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    host.remove();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('1. El modal abre con campo enmascarado y botones Copiar / Descargar deshabilitados inicialmente', async () => {
    api.consultarCredencialAsignada.mockResolvedValue({
      username: 'jsturt',
      nombreCompleto: 'JORDAN FRANCIS STURT ARCA',
      perfil: 'SUPERVISOR',
      vigente: true,
      custodiada: true,
      disponible: false,
      puedeRestablecer: true,
      estadoCredencial: 'Vigente bajo custodia',
      fechaAsignacion: '19/11/2026, 17:30:00'
    });

    // Abrir modal de credencial pulsando el botón de la llave de jsturt
    const btnLlave = host.querySelector('[data-testid="btn-credencial-jsturt"]') as HTMLButtonElement;
    expect(btnLlave).not.toBeNull();

    await act(async () => {
      btnLlave.click();
    });
    await flushPromises();

    // Modal abierto
    expect(host.textContent).toContain('Gestión de Credencial Administrada');
    expect(host.textContent).toContain('Contraseña vigente bajo custodia (AES-256-GCM)');

    // Input enmascarado
    const inputPassword = host.querySelector('#input-contrasenha-administrada') as HTMLInputElement;
    expect(inputPassword).not.toBeNull();
    expect(inputPassword.type).toBe('password');
    expect(inputPassword.value).toBe('••••••••••••••••');

    // Botón del ojo visible con ícono Eye
    const btnEye = host.querySelector('[data-testid="btn-toggle-eye"]') as HTMLButtonElement;
    expect(btnEye).not.toBeNull();
    expect(host.querySelector('[data-testid="icon-eye"]')).not.toBeNull();

    // No debe haber formularios ni pestañas de reautenticación
    expect(host.querySelector('#input-password-admin-reautenticacion')).toBeNull();
    expect(host.querySelector('#input-codigo-totp-reautenticacion')).toBeNull();
    expect(host.textContent).not.toContain('Confirmar con contraseña');
    expect(host.textContent).not.toContain('Confirmar con código de autenticación');

    // Botones Copiar y Descargar deshabilitados antes de revelar
    const btnCopiar = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.includes('Copiar'));
    expect(btnCopiar).toBeDefined();
    expect(btnCopiar!.disabled).toBe(true);

    const btnDescargar = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.includes('Descargar comprobante'));
    expect(btnDescargar).toBeDefined();
    expect(btnDescargar!.disabled).toBe(true);
  });

  it('2. Pulsar el ícono del ojo consulta la custodia AES-256-GCM y revela la contraseña en pantalla', async () => {
    api.consultarCredencialAsignada.mockResolvedValue({
      username: 'jsturt',
      nombreCompleto: 'JORDAN FRANCIS STURT ARCA',
      perfil: 'SUPERVISOR',
      vigente: true,
      custodiada: true,
      disponible: false,
      puedeRestablecer: true,
      estadoCredencial: 'Vigente bajo custodia',
      fechaAsignacion: '19/11/2026, 17:30:00'
    });

    api.revelarCredencialCustodiada.mockResolvedValue({
      success: true,
      username: 'jsturt',
      password: 'JsturtCustodiada2026!',
      creadoPor: 'gibarra',
      fechaActualizacion: new Date().toISOString()
    });

    const btnLlave = host.querySelector('[data-testid="btn-credencial-jsturt"]') as HTMLButtonElement;
    await act(async () => { btnLlave.click(); });
    await flushPromises();

    const btnEye = host.querySelector('[data-testid="btn-toggle-eye"]') as HTMLButtonElement;
    expect(btnEye).not.toBeNull();

    // Clic en el ojo para consultar la custodia
    await act(async () => { btnEye.click(); });
    await flushPromises();

    // Se invocó la API de revelación directamente con el usuario destino
    expect(api.revelarCredencialCustodiada).toHaveBeenCalledWith('jsturt');

    // Contraseña revelada en texto claro
    const inputPassword = host.querySelector('#input-contrasenha-administrada') as HTMLInputElement;
    expect(inputPassword.type).toBe('text');
    expect(inputPassword.value).toBe('JsturtCustodiada2026!');

    // El ícono cambió a EyeOff
    expect(host.querySelector('[data-testid="icon-eye-off"]')).not.toBeNull();

    // Botones Copiar y Descargar ahora están habilitados
    const btnCopiar = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.includes('Copiar'));
    expect(btnCopiar!.disabled).toBe(false);

    const btnDescargar = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.includes('Descargar comprobante'));
    expect(btnDescargar!.disabled).toBe(false);
  });

  it('3. Alternar el ícono del ojo oculta y muestra la contraseña sin solicitudes adicionales', async () => {
    api.consultarCredencialAsignada.mockResolvedValue({
      username: 'jsturt',
      nombreCompleto: 'JORDAN FRANCIS STURT ARCA',
      perfil: 'SUPERVISOR',
      vigente: true,
      custodiada: true,
      disponible: false,
      puedeRestablecer: true,
      estadoCredencial: 'Vigente bajo custodia'
    });

    api.revelarCredencialCustodiada.mockResolvedValue({
      success: true,
      username: 'jsturt',
      password: 'JsturtCustodiada2026!',
      creadoPor: 'gibarra'
    });

    const btnLlave = host.querySelector('[data-testid="btn-credencial-jsturt"]') as HTMLButtonElement;
    await act(async () => { btnLlave.click(); });
    await flushPromises();

    const btnEye = host.querySelector('[data-testid="btn-toggle-eye"]') as HTMLButtonElement;

    // 1. Primer clic: revela
    await act(async () => { btnEye.click(); });
    await flushPromises();
    expect(api.revelarCredencialCustodiada).toHaveBeenCalledTimes(1);

    const inputPassword = host.querySelector('#input-contrasenha-administrada') as HTMLInputElement;
    expect(inputPassword.type).toBe('text');
    expect(inputPassword.value).toBe('JsturtCustodiada2026!');

    // 2. Segundo clic: oculta (enmascara) sin llamar a la API
    await act(async () => { btnEye.click(); });
    await flushPromises();
    expect(api.revelarCredencialCustodiada).toHaveBeenCalledTimes(1);
    expect(inputPassword.type).toBe('password');
    expect(inputPassword.value).toBe('••••••••••••••••');
    expect(host.querySelector('[data-testid="icon-eye"]')).not.toBeNull();

    // 3. Tercer clic: vuelve a mostrar sin llamar a la API
    await act(async () => { btnEye.click(); });
    await flushPromises();
    expect(api.revelarCredencialCustodiada).toHaveBeenCalledTimes(1);
    expect(inputPassword.type).toBe('text');
    expect(inputPassword.value).toBe('JsturtCustodiada2026!');
    expect(host.querySelector('[data-testid="icon-eye-off"]')).not.toBeNull();
  });

  it('4. Botón Copiar copia la contraseña al portapapeles una vez revelada', async () => {
    api.consultarCredencialAsignada.mockResolvedValue({
      username: 'jsturt',
      nombreCompleto: 'JORDAN FRANCIS STURT ARCA',
      perfil: 'SUPERVISOR',
      vigente: true,
      custodiada: true,
      disponible: false,
      puedeRestablecer: true,
      estadoCredencial: 'Vigente bajo custodia'
    });

    api.revelarCredencialCustodiada.mockResolvedValue({
      success: true,
      username: 'jsturt',
      password: 'JsturtCustodiada2026!'
    });

    const btnLlave = host.querySelector('[data-testid="btn-credencial-jsturt"]') as HTMLButtonElement;
    await act(async () => { btnLlave.click(); });
    await flushPromises();

    // Revelar
    const btnEye = host.querySelector('[data-testid="btn-toggle-eye"]') as HTMLButtonElement;
    await act(async () => { btnEye.click(); });
    await flushPromises();

    // Copiar
    const btnCopiar = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.includes('Copiar'));
    expect(btnCopiar).toBeDefined();
    await act(async () => { btnCopiar!.click(); });
    await flushPromises();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('JsturtCustodiada2026!');
    expect(btnCopiar!.textContent).toContain('¡Copiada!');
  });

  it('5. Al cerrar el modal se limpia la contraseña de memoria', async () => {
    api.consultarCredencialAsignada.mockResolvedValue({
      username: 'jsturt',
      nombreCompleto: 'JORDAN FRANCIS STURT ARCA',
      perfil: 'SUPERVISOR',
      vigente: true,
      custodiada: true,
      disponible: false,
      puedeRestablecer: true,
      estadoCredencial: 'Vigente bajo custodia'
    });

    api.revelarCredencialCustodiada.mockResolvedValue({
      success: true,
      username: 'jsturt',
      password: 'JsturtCustodiada2026!'
    });

    const btnLlave = host.querySelector('[data-testid="btn-credencial-jsturt"]') as HTMLButtonElement;
    await act(async () => { btnLlave.click(); });
    await flushPromises();

    // Revelar
    const btnEye = host.querySelector('[data-testid="btn-toggle-eye"]') as HTMLButtonElement;
    await act(async () => { btnEye.click(); });
    await flushPromises();

    // Cerrar modal
    const btnCerrar = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Cerrar');
    expect(btnCerrar).toBeDefined();
    await act(async () => { btnCerrar!.click(); });
    await flushPromises();

    expect(host.querySelector('#input-contrasenha-administrada')).toBeNull();

    // Reabrir modal
    await act(async () => { btnLlave.click(); });
    await flushPromises();

    // Nuevamente enmascarada y sin contraseña previa en memoria
    const reloadedInput = host.querySelector('#input-contrasenha-administrada') as HTMLInputElement;
    expect(reloadedInput.type).toBe('password');
    expect(reloadedInput.value).toBe('••••••••••••••••');
  });

  it('6. Error del backend al revelar se muestra claramente en el modal sin exponer datos', async () => {
    api.consultarCredencialAsignada.mockResolvedValue({
      username: 'jsturt',
      nombreCompleto: 'JORDAN FRANCIS STURT ARCA',
      perfil: 'SUPERVISOR',
      vigente: true,
      custodiada: true,
      disponible: false,
      puedeRestablecer: true,
      estadoCredencial: 'Vigente bajo custodia'
    });

    api.revelarCredencialCustodiada.mockRejectedValue(new Error('Límite de consultas excedido por seguridad. Intente más tarde.'));

    const btnLlave = host.querySelector('[data-testid="btn-credencial-jsturt"]') as HTMLButtonElement;
    await act(async () => { btnLlave.click(); });
    await flushPromises();

    const btnEye = host.querySelector('[data-testid="btn-toggle-eye"]') as HTMLButtonElement;
    await act(async () => { btnEye.click(); });
    await flushPromises();

    // Se muestra alerta de error
    expect(host.textContent).toContain('Límite de consultas excedido');

    // La contraseña permanece enmascarada
    const inputPassword = host.querySelector('#input-contrasenha-administrada') as HTMLInputElement;
    expect(inputPassword.type).toBe('password');
    expect(inputPassword.value).toBe('••••••••••••••••');
  });

  it('7. La cuenta protegida gibarra no expone contraseña ni botón del ojo', async () => {
    api.consultarCredencialAsignada.mockResolvedValue({
      username: 'gibarra',
      nombreCompleto: 'GUSTAVO IBARRA',
      perfil: 'ADMINISTRADOR',
      vigente: true,
      custodiada: false,
      disponible: false,
      puedeRestablecer: false,
      estadoCredencial: 'Cuenta protegida'
    });

    const btnLlaveGibarra = host.querySelector('[data-testid="btn-credencial-gibarra"]') as HTMLButtonElement;
    expect(btnLlaveGibarra).not.toBeNull();
    await act(async () => { btnLlaveGibarra.click(); });
    await flushPromises();

    expect(host.textContent).toContain('Cuenta administrativa protegida');
    expect(host.querySelector('#input-contrasenha-administrada')).toBeNull();
    expect(host.querySelector('[data-testid="btn-toggle-eye"]')).toBeNull();
    expect(api.revelarCredencialCustodiada).not.toHaveBeenCalled();
  });
});
