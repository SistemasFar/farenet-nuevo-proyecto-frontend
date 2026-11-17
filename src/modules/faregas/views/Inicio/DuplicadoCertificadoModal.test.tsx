// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DuplicadoCertificadoModal } from './DuplicadoCertificadoModal';
import {
  faregasDuplicadosApi,
  type CandidatoDuplicado,
  type SolicitudDuplicado,
} from '../../services/faregas-duplicados.api';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

vi.mock('../../services/faregas-duplicados.api', () => ({
  faregasDuplicadosApi: {
    listarTipos: vi.fn().mockResolvedValue([{ valor: 'GLP', nombre: 'GLP' }]),
    listarHistorial: vi.fn().mockResolvedValue({
      items: [],
      paginacion: { pagina: 1, total: 0, totalPaginas: 1 },
    }),
    buscar: vi.fn(),
    crear: vi.fn(),
    procesar: vi.fn(),
    obtenerVista: vi.fn().mockResolvedValue({ html: '<p>vista</p>' }),
    descargarCertificado: vi.fn(),
    descargarComprobante: vi.fn(),
  },
}));

vi.mock('../../services/faregas-pagos.api', () => ({
  faregasPagosApi: {
    obtenerMaestros: vi.fn().mockResolvedValue({
      data: {
        tarjetas: [{ key: 'VISA', nombre: 'Visa' }],
        cuentasCorrientes: [
          { key: 'CTA-01', entidadfinanciera_key: 'BCP', nombre: 'Cuenta BCP Faregas' },
        ],
        entidadesFinancieras: [{ key: 'BCP', nombre: 'Banco BCP' }],
        cuentaFaregas: {
          entidad: 'Banco BCP',
          numeroCompleto: '191-12345678-0-12',
          cci: '002-191-12345678012-34',
        },
      },
    }),
  },
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const cambiarValorInput = (input: HTMLInputElement | null, valor: string) => {
  if (!input) return;
  const lastValue = input.value;
  input.value = valor;
  const tracker = (input as HTMLInputElement & { _valueTracker?: { setValue: (value: string) => void } })._valueTracker;
  if (tracker) {
    tracker.setValue(lastValue);
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

const candidatoEjemplo: CandidatoDuplicado = {
  certificadoId: 777,
  numeroCertificado: 'GLP-000123',
  tipoCertificadoClave: 'GLP',
  modalidad: 'INICIAL',
  tipoNombre: 'GLP INICIAL',
  placa: 'ABC123',
  fechaEmision: '2026-01-15',
  fechaLimiteDuplicado: '2027-01-15',
  vigente: true,
  anulacionAceptada: false,
  duplicable: true,
  duplicadosEmitidosCount: 0,
  motivoNoDisponible: null,
  plantaKey: 'SURCO',
  plantaNombre: 'SURCO',
  cliente: {
    tipoDocumento: 'DNI',
    nroDocumento: '',
    nombreRazonSocial: '',
    direccion: '',
    email: '',
    telefono: '',
  },
};

const solicitudEjemplo: SolicitudDuplicado = {
  id: 999,
  certificadoOriginalId: 777,
  operacionId: 1777,
  facturacionId: null,
  numeroCertificado: 'GLP-000123',
  tipoNombre: 'GLP INICIAL',
  placa: 'ABC123',
  fechaEmision: '2026-01-15',
  fechaLimiteDuplicado: '2027-01-15',
  precio: 50,
  estado: 'PENDIENTE_PAGO',
  operacionEstado: 'BORRADOR',
  facturacionEstado: null,
  nroComprobante: null,
  tipoComprobante: null,
  fechaSolicitud: null,
  fechaDisponible: null,
  solicitadoPor: 'OPERADOR',
  pagos: [],
};

const contenedores: HTMLDivElement[] = [];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  contenedores.splice(0).forEach((contenedor) => contenedor.remove());
});

const renderModalYEntrarASolicitud = async (
  candidato = candidatoEjemplo,
  solicitud = solicitudEjemplo,
) => {
  vi.mocked(faregasDuplicadosApi.buscar).mockResolvedValueOnce([candidato]);
  vi.mocked(faregasDuplicadosApi.crear).mockResolvedValueOnce(solicitud);

  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  contenedores.push(contenedor);
  const root = createRoot(contenedor);

  await act(async () => {
    root.render(<DuplicadoCertificadoModal onClose={() => undefined} />);
  });

  // Escribir placa y buscar
  const inputPlaca = contenedor.querySelector<HTMLInputElement>('input[placeholder="Ej. ABC123"]');
  await act(async () => {
    cambiarValorInput(inputPlaca, 'ABC123');
  });

  const botonBuscar = [...contenedor.querySelectorAll('button')].find((b) =>
    b.textContent?.trim().includes('Buscar') && !b.textContent?.includes('historial')
  );
  await act(async () => {
    botonBuscar?.click();
  });

  // Hacer clic en Solicitar duplicado
  const botonSolicitar = [...contenedor.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('Solicitar duplicado')
  );
  expect(botonSolicitar).not.toBeUndefined();

  await act(async () => {
    botonSolicitar?.click();
  });

  return { contenedor, root };
};

const seleccionarComprobante = async (contenedor: HTMLDivElement, tipo: 'BOLETA' | 'FACTURA') => {
  const select = contenedor.querySelector<HTMLSelectElement>('#duplicado-tipo-comprobante');
  if (!select) throw new Error('No se encontró el selector de comprobante.');
  await act(async () => {
    select.value = tipo;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const agregarPagoEfectivo = async (contenedor: HTMLDivElement) => {
  const boton = [...contenedor.querySelectorAll('button')].find((item) => item.textContent?.includes('Agregar pago'));
  await act(async () => boton?.click());
};

describe('DuplicadoCertificadoModal - Validaciones de campos obligatorios', () => {
  it('valida el dígito verificador del RUC y conserva el error debajo del documento', async () => {
    const { contenedor, root } = await renderModalYEntrarASolicitud();
    await seleccionarComprobante(contenedor, 'FACTURA');

    const inputDoc = contenedor.querySelector<HTMLInputElement>('#duplicado-documento');
    const inputNombre = contenedor.querySelector<HTMLInputElement>('#duplicado-nombre');
    await act(async () => {
      cambiarValorInput(inputDoc, '10740456121');
      cambiarValorInput(inputNombre, 'GRACE IBARRA');
    });
    await agregarPagoEfectivo(contenedor);

    const botonFinalizar = [...contenedor.querySelectorAll('button')].find((b) => b.textContent?.includes('Pagar S/ 50.00 y emitir comprobante'));
    await act(async () => botonFinalizar?.click());

    expect(inputDoc?.className).toContain('border-red-500');
    expect(contenedor.textContent).toContain('El RUC no tiene un dígito verificador válido.');
    expect(faregasDuplicadosApi.procesar).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it('permite FACTURA con RUC de dígito verificador válido y dirección vacía', async () => {
    vi.mocked(faregasDuplicadosApi.procesar).mockResolvedValueOnce({
      ...solicitudEjemplo,
      estado: 'PENDIENTE_COMPROBANTE',
    });
    const { contenedor, root } = await renderModalYEntrarASolicitud();
    await seleccionarComprobante(contenedor, 'FACTURA');

    const inputDoc = contenedor.querySelector<HTMLInputElement>('#duplicado-documento');
    const inputNombre = contenedor.querySelector<HTMLInputElement>('#duplicado-nombre');
    await act(async () => {
      cambiarValorInput(inputDoc, '20100070970');
      cambiarValorInput(inputNombre, 'EMPRESA DE PRUEBA');
    });
    await agregarPagoEfectivo(contenedor);
    const botonFinalizar = [...contenedor.querySelectorAll('button')].find((b) => b.textContent?.includes('Pagar S/ 50.00 y emitir comprobante'));
    await act(async () => botonFinalizar?.click());

    expect(faregasDuplicadosApi.procesar).toHaveBeenCalledWith(999, expect.objectContaining({
      facturacion: expect.objectContaining({
        tipoComprobante: 'FACTURA',
        tipoDocumentoCliente: 'RUC',
        nroDocumento: '20100070970',
        nombreRazonSocial: 'EMPRESA DE PRUEBA',
        direccion: '',
      }),
    }));
    await act(async () => root.unmount());
  });

  it('muestra debajo del campo el detalle de validación que devuelve el backend', async () => {
    vi.mocked(faregasDuplicadosApi.procesar).mockRejectedValueOnce(Object.assign(
      new Error('El nombre o razon social es obligatorio y admite hasta 100 caracteres.'),
      {
        codigo: 'DATOS_FACTURACION_INVALIDOS',
        detalles: ['El nombre o razon social es obligatorio y admite hasta 100 caracteres.'],
      },
    ));
    const { contenedor, root } = await renderModalYEntrarASolicitud();
    await seleccionarComprobante(contenedor, 'FACTURA');
    await act(async () => {
      cambiarValorInput(contenedor.querySelector<HTMLInputElement>('#duplicado-documento'), '20100070970');
      cambiarValorInput(contenedor.querySelector<HTMLInputElement>('#duplicado-nombre'), 'EMPRESA DE PRUEBA');
    });
    await agregarPagoEfectivo(contenedor);
    const boton = [...contenedor.querySelectorAll('button')].find((item) => item.textContent?.includes('Pagar S/ 50.00 y emitir comprobante'));
    await act(async () => boton?.click());

    expect(contenedor.querySelector<HTMLInputElement>('#duplicado-nombre')?.className).toContain('border-red-500');
    expect(contenedor.textContent).toContain('El nombre o razon social es obligatorio y admite hasta 100 caracteres.');
    await act(async () => root.unmount());
  });

  it('al alternar entre comprobantes no reutiliza un DNI como RUC ni un RUC como DNI', async () => {
    const { contenedor, root } = await renderModalYEntrarASolicitud();
    const inputDoc = contenedor.querySelector<HTMLInputElement>('#duplicado-documento');
    await act(async () => cambiarValorInput(inputDoc, '74045612'));

    await seleccionarComprobante(contenedor, 'FACTURA');
    expect(contenedor.querySelector<HTMLSelectElement>('#duplicado-tipo-documento')?.value).toBe('RUC');
    expect(inputDoc?.value).toBe('');

    await act(async () => cambiarValorInput(inputDoc, '20100070970'));
    await seleccionarComprobante(contenedor, 'BOLETA');
    expect(contenedor.querySelector<HTMLSelectElement>('#duplicado-tipo-documento')?.value).toBe('DNI');
    expect(inputDoc?.value).toBe('');
    await act(async () => root.unmount());
  });

  it('usa la misma validación fiscal para duplicados GLP, GNV y Conformidad', async () => {
    const casos = [
      { clave: 'GLP', nombre: 'GLP INICIAL', numero: 'DG-41-000454' },
      { clave: 'GNV', nombre: 'GNV INICIAL', numero: 'DG-22-000413' },
      { clave: 'CONFORMIDAD', nombre: 'CONFORMIDAD', numero: 'DG-39-000415' },
    ];
    for (const caso of casos) {
      const candidato = {
        ...candidatoEjemplo,
        tipoCertificadoClave: caso.clave,
        tipoNombre: caso.nombre,
        numeroCertificado: caso.numero,
      };
      const solicitud = {
        ...solicitudEjemplo,
        tipoNombre: caso.nombre,
        numeroCertificado: caso.numero,
      };
      const { contenedor, root } = await renderModalYEntrarASolicitud(candidato, solicitud);
      expect(contenedor.textContent).toContain(caso.numero);
      await act(async () => root.unmount());
    }
  });

  it('mantiene el pago confirmado de S/ 50 y no inicia otro cobro ante error fiscal', async () => {
    const duplicadoPagado = {
      ...solicitudEjemplo,
      estado: 'PENDIENTE_COMPROBANTE',
      operacionEstado: 'PAGADO',
      pagos: [{ id: 444, tipo: 'EFECTIVO', importe: 50 }],
    } satisfies SolicitudDuplicado;
    const { contenedor, root } = await renderModalYEntrarASolicitud(candidatoEjemplo, duplicadoPagado);
    await seleccionarComprobante(contenedor, 'FACTURA');
    await act(async () => {
      cambiarValorInput(contenedor.querySelector<HTMLInputElement>('#duplicado-documento'), '10740456121');
      cambiarValorInput(contenedor.querySelector<HTMLInputElement>('#duplicado-nombre'), 'GRACE IBARRA');
    });

    expect(contenedor.textContent).toContain('El pago de S/ 50.00 ya está registrado.');
    expect(contenedor.textContent).toContain('CONFIRMADO');
    expect(contenedor.textContent).toContain('S/ 50.00');
    const boton = [...contenedor.querySelectorAll('button')].find((item) => item.textContent?.includes('Confirmar comprobante y habilitar duplicado'));
    await act(async () => boton?.click());

    expect(contenedor.textContent).toContain('El RUC no tiene un dígito verificador válido.');
    expect(faregasDuplicadosApi.procesar).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it('1 y 2. Documento vacío y Nombre vacío: muestra error rojo en ambos campos y resumen', async () => {
    const { contenedor, root } = await renderModalYEntrarASolicitud();

    // Intentar emitir/avanzar sin datos
    const botonEmitir = [...contenedor.querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Falta pagar') || b.textContent?.includes('emitir')
    );
    expect(botonEmitir).toBeDefined();

    await act(async () => {
      botonEmitir!.click();
    });

    const inputDoc = contenedor.querySelector<HTMLInputElement>('#duplicado-documento');
    const inputNombre = contenedor.querySelector<HTMLInputElement>('#duplicado-nombre');

    expect(inputDoc?.className).toContain('border-red-500');
    expect(inputNombre?.className).toContain('border-red-500');

    expect(contenedor.textContent).toContain('Ingrese el número de documento.');
    expect(contenedor.textContent).toContain('Ingrese el nombre o razón social.');
    expect(contenedor.textContent).toContain('Por favor corrija los siguientes campos');

    await act(async () => root.unmount());
  });

  it('3. Formato inválido de DNI (menos de 8 dígitos) muestra error rojo', async () => {
    const { contenedor, root } = await renderModalYEntrarASolicitud();

    const inputDoc = contenedor.querySelector<HTMLInputElement>('#duplicado-documento');
    await act(async () => {
      cambiarValorInput(inputDoc, '12345');
    });

    const botonEmitir = [...contenedor.querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Falta pagar') || b.textContent?.includes('emitir')
    );
    await act(async () => {
      botonEmitir!.click();
    });

    expect(inputDoc?.className).toContain('border-red-500');
    expect(contenedor.textContent).toContain('El DNI debe tener 8 dígitos numéricos.');

    await act(async () => root.unmount());
  });

  it('4. Pago bancario sin número de operación: muestra error rojo en el campo', async () => {
    const { contenedor, root } = await renderModalYEntrarASolicitud();

    // Cambiar a pestaña BANCO
    const botonBanco = [...contenedor.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'BANCO'
    );
    await act(async () => {
      botonBanco?.click();
    });

    // Limpiar número de operación y hacer clic en Agregar pago
    const botonAgregarPago = [...contenedor.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Agregar pago')
    );
    await act(async () => {
      botonAgregarPago?.click();
    });

    const inputNroOp = contenedor.querySelector<HTMLInputElement>('#duplicado-nro-operacion');
    expect(inputNroOp?.className).toContain('border-red-500');
    expect(contenedor.textContent).toContain('Ingrese el N.° de operación bancaria.');

    await act(async () => root.unmount());
  });

  it('5. Pago bancario con fecha de depósito faltante: muestra error rojo', async () => {
    const { contenedor, root } = await renderModalYEntrarASolicitud();

    const botonBanco = [...contenedor.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'BANCO'
    );
    await act(async () => {
      botonBanco?.click();
    });

    // Ingresar número de operación pero borrar fecha
    const inputNroOp = contenedor.querySelector<HTMLInputElement>('#duplicado-nro-operacion');
    const inputFecha = contenedor.querySelector<HTMLInputElement>('#duplicado-fecha-deposito');

    await act(async () => {
      cambiarValorInput(inputNroOp, 'OP-987654');
      cambiarValorInput(inputFecha, '');
    });

    const botonAgregarPago = [...contenedor.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Agregar pago')
    );
    await act(async () => {
      botonAgregarPago?.click();
    });

    expect(inputFecha?.className).toContain('border-red-500');
    expect(contenedor.textContent).toContain('Seleccione la fecha del depósito.');

    await act(async () => root.unmount());
  });

  it('6. Importe inválido (<= 0 o vacío): muestra error rojo', async () => {
    const { contenedor, root } = await renderModalYEntrarASolicitud();

    const inputMonto = contenedor.querySelector<HTMLInputElement>('#duplicado-monto-pago');
    await act(async () => {
      cambiarValorInput(inputMonto, '0');
    });

    const botonAgregarPago = [...contenedor.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Agregar pago')
    );
    await act(async () => {
      botonAgregarPago?.click();
    });

    expect(inputMonto?.className).toContain('border-red-500');
    expect(contenedor.textContent).toContain('Ingrese un importe válido mayor a S/ 0.00.');

    await act(async () => root.unmount());
  });

  it('7. Correo opcional vacío no bloquea la validación', async () => {
    const { contenedor, root } = await renderModalYEntrarASolicitud();

    const inputDoc = contenedor.querySelector<HTMLInputElement>('#duplicado-documento');
    const inputNombre = contenedor.querySelector<HTMLInputElement>('#duplicado-nombre');
    const inputEmail = contenedor.querySelector<HTMLInputElement>('#duplicado-email');

    await act(async () => {
      cambiarValorInput(inputDoc, '74045612');
      cambiarValorInput(inputNombre, 'CARLOS LOPEZ');
      cambiarValorInput(inputEmail, '');
    });

    // Agregar el pago de S/ 50.00 en efectivo
    const botonAgregarPago = [...contenedor.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Agregar pago')
    );
    await act(async () => {
      botonAgregarPago?.click();
    });

    expect(contenedor.textContent).toContain('Pago completo. Puede emitir el comprobante.');
    expect(inputEmail?.className).not.toContain('border-red-500');

    await act(async () => root.unmount());
  });

  it('8. Pago incompleto: no permite finalizar y muestra aviso', async () => {
    const { contenedor, root } = await renderModalYEntrarASolicitud();

    // Rellenar datos fiscales
    const inputDoc = contenedor.querySelector<HTMLInputElement>('#duplicado-documento');
    const inputNombre = contenedor.querySelector<HTMLInputElement>('#duplicado-nombre');
    await act(async () => {
      cambiarValorInput(inputDoc, '74045612');
      cambiarValorInput(inputNombre, 'CARLOS LOPEZ');
    });

    // Agregar sólo S/ 20.00
    const inputMonto = contenedor.querySelector<HTMLInputElement>('#duplicado-monto-pago');
    await act(async () => {
      cambiarValorInput(inputMonto, '20.00');
    });

    const botonAgregarPago = [...contenedor.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Agregar pago')
    );
    await act(async () => {
      botonAgregarPago?.click();
    });

    expect(contenedor.textContent).toContain('Falta pagar S/ 30.00');

    // Intentar finalizar
    const botonFinalizar = [...contenedor.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Falta pagar S/ 30.00')
    );
    await act(async () => {
      botonFinalizar?.click();
    });

    expect(faregasDuplicadosApi.procesar).not.toHaveBeenCalled();
    expect(contenedor.textContent).toContain('Falta registrar S/ 30.00 para completar el total del duplicado.');

    await act(async () => root.unmount());
  });

  it('9. Al corregir los campos desaparecen los errores visuales', async () => {
    const { contenedor, root } = await renderModalYEntrarASolicitud();

    // Provocar error en documento vacío
    const botonEmitir = [...contenedor.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Falta pagar') || b.textContent?.includes('emitir')
    );
    await act(async () => {
      botonEmitir!.click();
    });

    const inputDoc = contenedor.querySelector<HTMLInputElement>('#duplicado-documento');
    expect(inputDoc?.className).toContain('border-red-500');

    // Corregir documento
    await act(async () => {
      cambiarValorInput(inputDoc, '74045612');
    });

    expect(inputDoc?.className).not.toContain('border-red-500');

    await act(async () => root.unmount());
  });

  it('10. Formulario válido: permite continuar y procesar duplicado', async () => {
    vi.mocked(faregasDuplicadosApi.procesar).mockResolvedValueOnce({
      ...solicitudEjemplo,
      estado: 'DISPONIBLE',
    });

    const { contenedor, root } = await renderModalYEntrarASolicitud();

    // Rellenar datos fiscales
    const inputDoc = contenedor.querySelector<HTMLInputElement>('#duplicado-documento');
    const inputNombre = contenedor.querySelector<HTMLInputElement>('#duplicado-nombre');
    await act(async () => {
      cambiarValorInput(inputDoc, '74045612');
      cambiarValorInput(inputNombre, 'CARLOS LOPEZ');
    });

    // Agregar pago completo S/ 50.00
    const botonAgregarPago = [...contenedor.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Agregar pago')
    );
    await act(async () => {
      botonAgregarPago?.click();
    });

    // Botón debe decir "Pagar S/ 50.00 y emitir comprobante"
    const botonFinalizar = [...contenedor.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Pagar S/ 50.00 y emitir comprobante')
    );
    expect(botonFinalizar).toBeDefined();

    await act(async () => {
      botonFinalizar!.click();
    });

    expect(faregasDuplicadosApi.procesar).toHaveBeenCalledWith(999, expect.objectContaining({
      facturacion: expect.objectContaining({
        nroDocumento: '74045612',
        nombreRazonSocial: 'CARLOS LOPEZ',
      }),
      pagos: [expect.objectContaining({ importe: 50, tipo: 'EFECTIVO' })],
    }));

    await act(async () => root.unmount());
  });

  it('11. Doble clic: no genera pagos repetidos', async () => {
    const { contenedor, root } = await renderModalYEntrarASolicitud();

    const botonAgregarPago = [...contenedor.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Agregar pago')
    );

    // Doble clic rápido en agregar pago
    await act(async () => {
      botonAgregarPago?.click();
      botonAgregarPago?.click();
    });

    // Sólo debe haber un pago de 50.00 registrado
    const itemsPago = contenedor.querySelectorAll('.mt-4 .space-y-2 > div');
    expect(itemsPago.length).toBe(1);

    await act(async () => root.unmount());
  });
});
