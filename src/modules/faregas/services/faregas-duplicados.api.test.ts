// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { faregasDuplicadosApi, type ProcesarDuplicadoRequest } from './faregas-duplicados.api';

describe('faregasDuplicadosApi', () => {
  beforeEach(() => sessionStorage.setItem('faregasAccessToken', 'token-duplicados'));
  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('busca por placa y mantiene el filtro TODOS en la ruta protegida', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await faregasDuplicadosApi.buscar('ABC123', 'TODOS');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/faregas/duplicados/buscar?placa=ABC123&tipo=TODOS'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-duplicados' }) }),
    );
  });

  it('procesa exclusivamente el pago fijo al contado mediante la solicitud aislada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      data: { id: 9, precio: 50, estado: 'DISPONIBLE' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const payload: ProcesarDuplicadoRequest = {
      pagos: [{ tipo: 'EFECTIVO', importe: 50 }],
      facturacion: {
        tipoComprobante: 'BOLETA', tipoDocumentoCliente: 'DNI', nroDocumento: '74045612',
        nombreRazonSocial: 'GRACE', direccion: 'LIMA', email: null, telefono: null,
        condicionPago: 'CONTADO', cuotas: [], medioPago: 'EFECTIVO',
      },
    };

    await faregasDuplicadosApi.procesar(9, payload);

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it('obtiene la vista autenticada del certificado original sin marca de agua', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      data: { html: '<html><body>Certificado DG-41-012488</body></html>', numeroCertificado: 'DG-41-012488' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const vista = await faregasDuplicadosApi.obtenerVista(9);

    expect(vista.html).toContain('Certificado DG-41-012488');
    expect(vista.html).not.toContain('data-faregas-duplicado');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/faregas/duplicados/9/vista'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-duplicados' }) }),
    );
  });

  it('consulta el historial protegido de duplicados emitidos', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await faregasDuplicadosApi.listarHistorial({ desde: '2026-10-01', hasta: '2026-10-20', pagina: 2 });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/faregas/duplicados/historial?desde=2026-10-01&hasta=2026-10-20&pagina=2'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-duplicados' }) }),
    );
  });

  it('propaga el error de negocio cuando el certificado dejó de estar disponible', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      codigo: 'CERTIFICADO_NO_DISPONIBLE_PARA_DUPLICADO',
      message: 'El certificado tiene una anulación activa o confirmada y no está disponible para duplicado.',
    }), { status: 409, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(faregasDuplicadosApi.crear(608)).rejects.toMatchObject({
      codigo: 'CERTIFICADO_NO_DISPONIBLE_PARA_DUPLICADO',
      message: 'El certificado tiene una anulación activa o confirmada y no está disponible para duplicado.',
    });
  });
});
