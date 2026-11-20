// @vitest-environment jsdom
import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FacturacionEmisionStep } from './FacturacionEmisionStep';

const mock = vi.hoisted(() => ({
  emitir: vi.fn(), contexto: vi.fn(), solo: vi.fn(), normal: vi.fn(),
  descargar: vi.fn(), factura: vi.fn(), borrador: vi.fn(),
  validar: vi.fn(), previsualizar: vi.fn(), confirmar: vi.fn(),
}));

vi.mock('sweetalert2', () => ({ default: { fire: mock.confirmar } }));
vi.mock('../../../../services/faregas-certificados.api', async (original) => ({
  ...await original<typeof import('../../../../services/faregas-certificados.api')>(),
  faregasCertificadosApi: {
    obtenerContingencia: mock.contexto, emitirSoloCertificado: mock.solo,
    obtenerFacturacion: mock.factura, obtenerBorradorCompleto: mock.borrador,
    actualizarPasoBorrador: vi.fn(), emitirCertificado: mock.normal
  },
}));
vi.mock('../../../../services/faregas-comprobante-visor.service', () => ({
  abrirPdfNubefact: vi.fn(), mostrarCargaComprobanteNubefact: vi.fn(), descargarCertificadoFaregas: mock.descargar
}));
vi.mock('./FacturacionStep', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  return {
    FacturacionStep: forwardRef(function FacturacionFake(_, ref) {
      useImperativeHandle(ref, () => ({ emitir: mock.emitir, estaEnSimulacion: () => false }));
      return null;
    })
  };
});
vi.mock('./VerificacionStep', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  return {
    VerificacionStep: forwardRef(function VerificacionFake(_, ref) {
      useImperativeHandle(ref, () => ({ validar: mock.validar, cargarDocumento: mock.previsualizar }));
      return <div data-testid="previsualizacion">Previsualización</div>;
    })
  };
});

let host: HTMLDivElement;
let root: Root;
let props: ComponentProps<typeof FacturacionEmisionStep>;
const button = (label: string) => [...host.querySelectorAll('button')].find(item => item.textContent?.includes(label));
const click = async (label: string) => {
  const elem = button(label);
  expect(elem).toBeDefined();
  await act(async () => { elem!.click(); });
};
const prepararFallo = (permiteSoloCertificado: boolean, categoria: string) => {
  const diagnostico = { proveedor: 'NubeFact', categoria, descripcion: 'Detalle seguro del proveedor',
    codigoProveedor: '503', recuperable: permiteSoloCertificado, ausenciaConfirmada: permiteSoloCertificado,
    seguimiento: 'FG-INTENTO-9' };
  mock.emitir.mockRejectedValue(Object.assign(new Error('Mensaje genérico'), { detalles: { contingencia: diagnostico } }));
  mock.contexto.mockResolvedValue({ data: { habilitada: true, permiteSoloCertificado, diagnostico } });
};

beforeEach(async () => {
  vi.resetAllMocks();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.spyOn(window, 'open').mockReturnValue(null);
  mock.confirmar.mockResolvedValue({ isConfirmed: true });
  mock.validar.mockResolvedValue({ valido: true });
  mock.previsualizar.mockResolvedValue(undefined);
  mock.contexto.mockResolvedValue({ data: { habilitada: false, permiteSoloCertificado: false } });
  mock.factura.mockResolvedValue(null);
  mock.borrador.mockResolvedValue(null);
  props = {
    certificadoId: 9, tipoCertificado: 'GLP_ANUAL',
    formCaja: {}, formVehiculo: {}, formPropietario: {}, formGlp: {}, formGnv: {}, formConformidad: {},
    pagosAgregados: [], facturacion: null, formFacturacion: {}, medioPago: 'CONTADO',
    setFormFacturacion: vi.fn(), onFacturacionChange: vi.fn(), onEditarDatosCliente: vi.fn()
  } as unknown as ComponentProps<typeof FacturacionEmisionStep>;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root.render(<FacturacionEmisionStep {...props} />); });
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  host.remove();
  vi.restoreAllMocks();
});

it('muestra el diagnóstico y emite solo el certificado con confirmación y PDF técnico', async () => {
  prepararFallo(true, 'PROVEEDOR_NO_DISPONIBLE');
  mock.solo.mockResolvedValue({ data: { numero_certificado: 'DG-41-000001', estado: 'EMITIDO', estadoRegularizacion: 'PENDIENTE' } });
  await click('EMITIR COMPROBANTE Y CERTIFICADO');
  expect(host.textContent).toContain('FG-INTENTO-9');
  mock.contexto.mockResolvedValue({ data: { habilitada: true, permiteSoloCertificado: false, estadoRegularizacion: 'PENDIENTE' } });
  await click('EMITIR SOLO CERTIFICADO');
  expect(mock.solo).toHaveBeenCalledExactlyOnceWith(9);
  expect(mock.descargar).toHaveBeenCalledExactlyOnceWith(9);
  expect(mock.emitir).toHaveBeenCalledTimes(1);
  expect(mock.normal).not.toHaveBeenCalled();
  expect(host.textContent).toContain('pendiente de regularización');
});

it('oculta emitir solo cuando el backend clasifica un rechazo de validación', async () => {
  prepararFallo(false, 'VALIDACION_RECHAZADA');
  await click('EMITIR COMPROBANTE Y CERTIFICADO');
  expect(host.textContent).toContain('VALIDACION_RECHAZADA');
  expect(button('EMITIR SOLO CERTIFICADO')).toBeUndefined();
  expect(mock.solo).not.toHaveBeenCalled();
});

it('ofrece emitir solo cuando el backend confirma la elegibilidad por cupo agotado', async () => {
  const descripcion = 'La cuenta DEMO de NubeFact alcanzó el límite de 50 comprobantes.';
  mock.emitir.mockRejectedValue(Object.assign(new Error('Rechazado'), { detalles: { contingencia: {
    proveedor: 'NubeFact', categoria: 'LIMITE_DEMO_AGOTADO', descripcion, recuperable: false, ausenciaConfirmada: true,
  } } }));
  mock.contexto.mockResolvedValue({ data: { habilitada: true, permiteSoloCertificado: true } });
  await click('EMITIR COMPROBANTE Y CERTIFICADO');
  const alerta = host.querySelector('[role="alert"]');
  const vistaPrevia = host.querySelector('[data-testid="previsualizacion"]');
  expect(alerta?.textContent).toContain(descripcion);
  expect((vistaPrevia?.compareDocumentPosition(alerta!) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(document.activeElement).toBe(alerta);
  expect(alerta?.contains(button('EMITIR SOLO CERTIFICADO')!)).toBe(true);
});

it('permite reintentar la emisión y muestra el diagnóstico si el proveedor rechaza por cupo agotado', async () => {
  const descripcion = 'La cuenta DEMO de NubeFact alcanzó el límite de 50 comprobantes.';
  mock.emitir.mockRejectedValue(Object.assign(new Error(descripcion), {
    detalles: { contingencia: { proveedor: 'NubeFact', categoria: 'LIMITE_DEMO_AGOTADO', descripcion, recuperable: false } }
  }));
  const facturacion = { estado: 'RECHAZADO', motivoLimiteDemo: descripcion } as ComponentProps<typeof FacturacionEmisionStep>['facturacion'];
  await act(async () => { root.render(<FacturacionEmisionStep {...props} facturacion={facturacion} />); });
  await click('EMITIR COMPROBANTE Y CERTIFICADO');
  expect(mock.emitir).toHaveBeenCalledTimes(1);
  expect(host.textContent).toContain('50 comprobantes');
  expect(button('EMITIR SOLO CERTIFICADO')).toBeUndefined();
  expect(button('EMITIR COMPROBANTE Y CERTIFICADO')).toBeDefined();
});

it('muestra por qué el cupo agotado no habilita emisión si no se confirmó la ausencia', async () => {
  prepararFallo(false, 'LIMITE_DEMO_AGOTADO');
  mock.contexto.mockResolvedValue({ data: { habilitada: true, permiteSoloCertificado: false, motivo: 'RESULTADO_REMOTO_NO_RESUELTO' } });
  await click('EMITIR COMPROBANTE Y CERTIFICADO');
  expect(host.textContent).toContain('Todavía se debe verificar si el comprobante fue generado.');
  expect(button('EMITIR SOLO CERTIFICADO')).toBeUndefined();
});
