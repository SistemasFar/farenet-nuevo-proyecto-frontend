// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import type { SolicitudOperacion } from '../../services/faregas-solicitudes-operacion.api';
import { SolicitudesOperacionView } from './SolicitudesOperacionView';

const apiMocks = vi.hoisted(() => ({
  listar: vi.fn(),
  obtener: vi.fn(),
  historial: vi.fn(),
  aprobar: vi.fn(),
  rechazar: vi.fn(),
  cancelar: vi.fn(),
  aprobarYEjecutarAnulacionTotal: vi.fn(),
  ejecutarAnulacionTotal: vi.fn(),
  sincronizarAnulacionTotal: vi.fn(),
}));

vi.mock('../../services/faregas-solicitudes-operacion.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/faregas-solicitudes-operacion.api')>();
  return {
    ...actual,
    faregasSolicitudesOperacionApi: {
      ...actual.faregasSolicitudesOperacionApi,
      ...apiMocks,
    },
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const solicitud: SolicitudOperacion = {
  id: 25,
  tipoOperacion: 'ANULAR_AMBOS',
  certificadoId: 701,
  facturacionId: 814,
  empresaKey: 'FAREGAS',
  empresaNombre: 'FAREGAS',
  plantaKey: '98',
  plantaNombre: 'SURCO',
  usuarioSolicitante: 'gibarra',
  motivo: 'Anulación solicitada para prueba',
  observaciones: null,
  estado: 'PENDIENTE_APROBACION',
  usuarioDecision: null,
  fechaSolicitud: '2026-10-29T15:00:00.000Z',
  fechaDecision: null,
  justificacionDecision: null,
  datosOriginalesCertificado: null,
  datosOriginalesComprobante: null,
  datosPropuestos: null,
  fechaEmisionOriginal: '2026-10-29',
  resultadoTecnico: null,
  resultadoFiscal: null,
  version: 1,
  numeroCertificado: 'DG-41-000335',
  tipoCertificado: 'GLP_ANUAL',
  nroComprobante: 'BBB1-000250',
  placa: 'ABC123',
};

const contexto = {
  permisos: [
    'FAREGAS_SOLICITUD_VER',
    'FAREGAS_SOLICITUD_APROBAR',
    'FAREGAS_SOLICITUD_RECHAZAR',
    'FAREGAS_SOLICITUD_ADMINISTRAR',
  ],
  plantaKey: '98',
};

const roots: Root[] = [];
const esperarRender = () => new Promise((resolve) => setTimeout(resolve, 20));

function ContextLayout() {
  return <Outlet context={contexto} />;
}

function RutaActual() {
  const location = useLocation();
  return <span data-testid="ruta-actual">{location.pathname}</span>;
}

async function renderView(initialEntry: string, listadoReal = false) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <RutaActual />
        <Routes>
          <Route element={<ContextLayout />}>
            <Route path="/faregas/solicitudes-operacion/:id" element={<SolicitudesOperacionView />} />
            <Route
              path="/faregas/auditoria/solicitudes"
              element={listadoReal
                ? <SolicitudesOperacionView />
                : <div data-testid="listado-solicitudes">Listado de solicitudes</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    await esperarRender();
  });

  return container;
}

const obtenerDialogo = (container: HTMLElement) => (
  container.querySelector('[role="dialog"]') as HTMLElement | null
);

const obtenerBotonCerrarInferior = (dialogo: HTMLElement) => (
  Array.from(dialogo.querySelectorAll('button'))
    .find((button) => button.textContent?.trim() === 'Cerrar') as HTMLButtonElement | undefined
);

describe('SolicitudesOperacionView — cierre del detalle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem('faregasUser', JSON.stringify({ username: 'jromani' }));
    apiMocks.obtener.mockResolvedValue(solicitud);
    apiMocks.historial.mockResolvedValue([]);
    apiMocks.listar.mockResolvedValue({
      data: [solicitud],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
  });

  afterEach(async () => {
    await act(async () => {
      roots.splice(0).forEach((root) => root.unmount());
    });
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('cierra con la X y elimina :id navegando al listado', async () => {
    const container = await renderView('/faregas/solicitudes-operacion/25');
    const dialogo = obtenerDialogo(container);
    expect(dialogo).not.toBeNull();

    await act(async () => {
      dialogo?.querySelector<HTMLButtonElement>('button[aria-label="Cerrar solicitud"]')?.click();
      await esperarRender();
    });

    expect(obtenerDialogo(container)).toBeNull();
    expect(container.querySelector('[data-testid="ruta-actual"]')?.textContent)
      .toBe('/faregas/auditoria/solicitudes');
    expect(container.querySelector('[data-testid="listado-solicitudes"]')).not.toBeNull();
  });

  it('cierra con el botón inferior sin aprobar ni rechazar', async () => {
    const container = await renderView('/faregas/solicitudes-operacion/25');
    const dialogo = obtenerDialogo(container);
    const cerrar = dialogo ? obtenerBotonCerrarInferior(dialogo) : undefined;
    expect(cerrar).toBeDefined();

    await act(async () => {
      cerrar?.click();
      await esperarRender();
    });

    expect(obtenerDialogo(container)).toBeNull();
    expect(container.querySelector('[data-testid="ruta-actual"]')?.textContent)
      .toBe('/faregas/auditoria/solicitudes');
    expect(apiMocks.aprobar).not.toHaveBeenCalled();
    expect(apiMocks.rechazar).not.toHaveBeenCalled();
    expect(apiMocks.aprobarYEjecutarAnulacionTotal).not.toHaveBeenCalled();
  });

  it('desde el listado cierra sin navegación y no reaparece', async () => {
    const container = await renderView('/faregas/auditoria/solicitudes', true);
    const ver = container.querySelector<HTMLButtonElement>('button[aria-label="Ver solicitud 25"]');
    expect(ver).not.toBeNull();

    await act(async () => {
      ver?.click();
      await esperarRender();
    });
    expect(obtenerDialogo(container)).not.toBeNull();

    const dialogo = obtenerDialogo(container);
    await act(async () => {
      if (dialogo) obtenerBotonCerrarInferior(dialogo)?.click();
      await esperarRender();
      await esperarRender();
    });

    expect(obtenerDialogo(container)).toBeNull();
    expect(container.querySelector('[data-testid="ruta-actual"]')?.textContent)
      .toBe('/faregas/auditoria/solicitudes');
  });
});
