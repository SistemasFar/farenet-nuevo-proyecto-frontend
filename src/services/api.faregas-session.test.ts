// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authFaregasApi } from './api';

describe('authFaregasApi.refrescarSesionAsync', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('consulta la sesión vigente con el token FAREGAS', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      user: { username: 'gibarra', perfil_id: 'SISTEMAS', permisos: ['FAREGAS_SOLICITUD_VER'] },
      plantaSeleccionada: { key: '98', nombre: 'SURCO' },
      accessToken: 'token-actualizado'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);

    const resultado = await authFaregasApi.refrescarSesionAsync('token-anterior');

    expect(resultado.user.permisos).toContain('FAREGAS_SOLICITUD_VER');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/faregas/auth/sesion/refrescar');
    expect(options).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer token-anterior' }
    });
  });

  it('no convierte un rechazo de sesión en acceso permitido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: 'Sesión FAREGAS expirada.'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })));

    await expect(authFaregasApi.refrescarSesionAsync('token-vencido'))
      .rejects.toThrow('Sesión expirada o no autenticada. Vuelva a iniciar sesión.');
  });
});
