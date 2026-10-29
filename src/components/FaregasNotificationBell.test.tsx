// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { FaregasNotificationBell } from './FaregasNotificationBell';
import Swal from 'sweetalert2';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUser = { username: 'jromani', perfilId: 'PERFIL_OPERADOR' };

const mockFetchResponse = (data: unknown, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 500,
    json: async () => data,
  } as Response);

const renderBell = (user = mockUser) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    <BrowserRouter>
      <FaregasNotificationBell user={user} plantaSeleccionada="SURCO" />
    </BrowserRouter>
  );
  return { container, root };
};

const esperar = (ms = 200) => new Promise((r) => setTimeout(r, ms));

describe('FaregasNotificationBell', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(Swal, 'fire').mockResolvedValue({} as any);
    sessionStorage.setItem('faregasAccessToken', 'test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.removeItem('faregasAccessToken');
    document.body.innerHTML = '';
  });

  it('1. renderiza el icono de campana sin fallar', async () => {
    const { container } = renderBell();
    await act(async () => {
      await esperar(250);
    });
    const campana = container.querySelector('button[aria-label*="Notificaciones"]');
    expect(campana).toBeTruthy();
    const icono = campana?.querySelector('svg');
    expect(icono).toBeTruthy();
  });

  it('2. muestra "No tienes notificaciones" cuando la lista está vacía', async () => {
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ ok: true, data: [] }));
    const { container } = renderBell();
    await act(async () => {
      await esperar(250);
    });
    const campana = container.querySelector('button[aria-label*="Notificaciones"]')!;
    campana.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await act(async () => {});
    const texto = container.textContent || '';
    expect(texto).toContain('No tienes notificaciones');
  });

  it('3. abre el panel al hacer clic en la campana', async () => {
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ ok: true, data: [] }));
    const { container } = renderBell();
    await act(async () => {
      await esperar(250);
    });
    const campana = container.querySelector('button[aria-label*="Notificaciones"]')!;
    campana.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await act(async () => {});
    expect(container.querySelector('h3')).not.toBeNull();
    expect(container.textContent).toContain('Notificaciones');
  });

  it('4. no bloquea el Header si la API falla', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Error de red'));
    const { container } = renderBell();
    await act(async () => {
      await esperar(250);
    });
    const campana = container.querySelector('button[aria-label*="Notificaciones"]');
    expect(campana).toBeTruthy();
  });

  it('5. renderiza notificaciones con destino nulo sin fallar', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockFetchResponse({
        ok: true,
        data: [
          {
            id: 2,
            evento_clave: 'EVT_2',
            tipo: 'SOLICITUD_PENDIENTE_APROBACION',
            titulo: 'Solicitud sin destino',
            mensaje: 'Mensaje',
            planta_key: 'SURCO',
            empresa_key: 'EMP001',
            entidad_tipo: 'SOLICITUD_OPERACION',
            entidad_id: 2,
            destino_navegacion: null,
            fecha_creacion: new Date().toISOString(),
            leida: false,
            fecha_lectura: null,
          },
        ],
      })
    );
    const { container } = renderBell();
    await act(async () => {
      await esperar(250);
    });
    const campana = container.querySelector('button[aria-label*="Notificaciones"]')!;
    campana.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await act(async () => {});
    expect(container.querySelector('h3')).toBeTruthy();
  });

  it('6. muestra punto rojo cuando hay notificaciones sin leer', async () => {
    vi.mocked(fetch).mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/sin-leer')) {
        return Promise.resolve(mockFetchResponse({ ok: true, count: 1 }));
      }
      return Promise.resolve(
        mockFetchResponse({
          ok: true,
          data: [
            {
              id: 1,
              evento_clave: 'EVT_1',
              tipo: 'SOLICITUD_PENDIENTE_APROBACION',
              titulo: 'Nueva solicitud',
              mensaje: 'Pendiente de aprobación',
              planta_key: 'SURCO',
              empresa_key: 'EMP001',
              entidad_tipo: 'SOLICITUD_OPERACION',
              entidad_id: 1,
              destino_navegacion: '/faregas/solicitudes-operacion/1',
              fecha_creacion: new Date().toISOString(),
              leida: false,
              fecha_lectura: null,
            },
          ],
        })
      );
    });
    const { container } = renderBell();
    await act(async () => {
      await esperar(250);
    });
    const punto = container.querySelector('span[class*="bg-red-500"]');
    expect(punto).toBeTruthy();
  });
});
