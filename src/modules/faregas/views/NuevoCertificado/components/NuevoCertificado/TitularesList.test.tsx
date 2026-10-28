// @vitest-environment jsdom

import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormFacturacionState } from '../../NuevoCertificadoView';
import { TitularesList, type TitularState } from './TitularesList';
import { faregasClientesApi } from '../../../../services/faregas-clientes.api';
import Swal from 'sweetalert2';

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

vi.mock('../../../../services/faregas-clientes.api', () => ({
  faregasClientesApi: {
    autocompletarPersona: vi.fn(),
  },
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const titular: TitularState = {
  _uuid: 'principal-1',
  titularId: 1,
  orden: 1,
  clienteId: 1,
  tipoDocumento: 'DNI',
  nroDocumento: '74045612',
  nombreRazonSocial: 'GRACE IBARRA',
  direccion: 'CALLE AREQUIPA 152',
};

const facturacionInicial: FormFacturacionState = {
  tipoDocFac: 'BOLETA',
  nroDocFac: '74045612',
  razonSocialFac: 'GRACE IBARRA',
  nombresFac: '',
  apellidosFac: '',
  paisFac: '',
  departamentoFac: '',
  provinciaFac: '',
  distritoFac: '',
  direccionFac: 'CALLE AREQUIPA 152',
  emailFac: 'grace@gmail.com',
  telefonoFac: '912344423',
  usarTitularPrincipalFac: false,
  condicionPagoFac: 'CONTADO',
  fechaVencimientoFac: '',
  medioPagoFac: '',
  cuotasFac: [],
};

const contenedores: HTMLDivElement[] = [];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  contenedores.splice(0).forEach((contenedor) => contenedor.remove());
});

describe('TitularesList - funcionalidad original', () => {
  it('permite al titular elegir DNI o RUC y adapta la longitud del documento', async () => {
    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    contenedores.push(contenedor);
    const root = createRoot(contenedor);

    const Caso = () => {
      const [titulares, setTitulares] = useState<TitularState[]>([titular]);
      const [formFacturacion, setFormFacturacion] = useState(facturacionInicial);
      return (
        <TitularesList
          titulares={titulares}
          setTitulares={setTitulares}
          formFacturacion={formFacturacion}
          setFormFacturacion={setFormFacturacion}
          mostrarFacturacion={false}
        />
      );
    };

    await act(async () => root.render(<Caso />));
    const selector = contenedor.querySelector<HTMLSelectElement>('select');
    expect([...selector!.options].map(option => option.value)).toEqual(['DNI', 'RUC']);
    expect(contenedor.querySelector<HTMLInputElement>('input[inputmode="numeric"]')?.maxLength).toBe(8);

    await act(async () => {
      selector!.value = 'RUC';
      selector!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const documento = contenedor.querySelector<HTMLInputElement>('input[inputmode="numeric"]');
    expect(documento?.maxLength).toBe(11);
    expect(documento?.value).toBe('');
    await act(async () => root.unmount());
  });

  it('ubica el selector en el dueño principal y sincroniza sus datos al marcarlo', async () => {
    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    contenedores.push(contenedor);
    const root = createRoot(contenedor);

    const Caso = () => {
      const [formFacturacion, setFormFacturacion] = useState(facturacionInicial);
      return (
        <TitularesList
          titulares={[titular]}
          setTitulares={() => undefined}
          formFacturacion={formFacturacion}
          setFormFacturacion={setFormFacturacion}
          mostrarTitulares={true}
          mostrarFacturacion={true}
        />
      );
    };

    await act(async () => root.render(<Caso />));
    const tarjetaDueno = [...contenedor.querySelectorAll('div')]
      .find((elemento) => elemento.querySelector('h5')?.textContent?.includes('DUEÑO 1'));
    const checkbox = tarjetaDueno?.querySelector<HTMLInputElement>('input[type="checkbox"]') || null;
    expect(checkbox).not.toBeNull();
    expect(checkbox?.checked).toBe(false);
    expect(contenedor.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);

    await act(async () => checkbox?.click());

    expect(checkbox?.checked).toBe(true);
    expect(contenedor.querySelector<HTMLInputElement>('input[aria-label="Número de documento de facturación"]')?.readOnly).toBe(true);
    await act(async () => root.unmount());
  });
});

describe('TitularesList - Búsqueda de propietarios con lupa', () => {
  it('1. DNI existente: autocompleta los datos correspondientes', async () => {
    vi.mocked(faregasClientesApi.autocompletarPersona).mockResolvedValueOnce({
      ok: true,
      data: {
        origen: 'FAREGAS',
        id: 99,
        clienteExistente: true,
        tipoDocumento: 'DNI',
        nroDocumento: '74045612',
        nombreRazonSocial: 'JUAN PEREZ FLORES',
        direccion: 'AV. AREQUIPA 500',
      },
    } as any);

    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    contenedores.push(contenedor);
    const root = createRoot(contenedor);

    let estadoTitulares: TitularState[] = [];
    const Caso = () => {
      const [titulares, setTitulares] = useState<TitularState[]>([
        { ...titular, nombreRazonSocial: '', direccion: '' },
      ]);
      estadoTitulares = titulares;
      const [formFacturacion, setFormFacturacion] = useState(facturacionInicial);
      return (
        <TitularesList
          titulares={titulares}
          setTitulares={setTitulares}
          formFacturacion={formFacturacion}
          setFormFacturacion={setFormFacturacion}
          mostrarFacturacion={false}
          mostrarDireccionTitular={true}
        />
      );
    };

    await act(async () => root.render(<Caso />));
    const botonLupa = contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]');
    expect(botonLupa).not.toBeNull();

    await act(async () => {
      botonLupa!.click();
    });

    expect(faregasClientesApi.autocompletarPersona).toHaveBeenCalledWith('DNI', '74045612');
    expect(estadoTitulares[0].nombreRazonSocial).toBe('JUAN PEREZ FLORES');
    expect(estadoTitulares[0].direccion).toBe('AV. AREQUIPA 500');
    expect(estadoTitulares[0].clienteId).toBe(99);
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'success' }));

    await act(async () => root.unmount());
  });

  it('2. RUC existente: autocompleta los datos correspondientes', async () => {
    vi.mocked(faregasClientesApi.autocompletarPersona).mockResolvedValueOnce({
      ok: true,
      data: {
        origen: 'FARENET',
        clienteExistente: false,
        tipoDocumento: 'RUC',
        nroDocumento: '20601234567',
        nombreRazonSocial: 'EMPRESA DE TRANSPORTE SAC',
        direccion: 'AV. INDUSTRIAL 123',
      },
    } as any);

    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    contenedores.push(contenedor);
    const root = createRoot(contenedor);

    let estadoTitulares: TitularState[] = [];
    const Caso = () => {
      const [titulares, setTitulares] = useState<TitularState[]>([
        {
          _uuid: 'ruc-1',
          titularId: null,
          orden: 1,
          clienteId: null,
          tipoDocumento: 'RUC',
          nroDocumento: '20601234567',
          nombreRazonSocial: '',
          direccion: '',
        },
      ]);
      estadoTitulares = titulares;
      const [formFacturacion, setFormFacturacion] = useState(facturacionInicial);
      return (
        <TitularesList
          titulares={titulares}
          setTitulares={setTitulares}
          formFacturacion={formFacturacion}
          setFormFacturacion={setFormFacturacion}
          mostrarFacturacion={false}
          mostrarDireccionTitular={true}
        />
      );
    };

    await act(async () => root.render(<Caso />));
    const botonLupa = contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]');

    await act(async () => {
      botonLupa!.click();
    });

    expect(faregasClientesApi.autocompletarPersona).toHaveBeenCalledWith('RUC', '20601234567');
    expect(estadoTitulares[0].nombreRazonSocial).toBe('EMPRESA DE TRANSPORTE SAC');
    expect(estadoTitulares[0].direccion).toBe('AV. INDUSTRIAL 123');
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'success' }));

    await act(async () => root.unmount());
  });

  it('3. Documento inexistente: permite ingreso manual y no borra datos', async () => {
    const error404: any = new Error('Persona no encontrada.');
    error404.status = 404;
    vi.mocked(faregasClientesApi.autocompletarPersona).mockRejectedValueOnce(error404);

    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    contenedores.push(contenedor);
    const root = createRoot(contenedor);

    let estadoTitulares: TitularState[] = [];
    const Caso = () => {
      const [titulares, setTitulares] = useState<TitularState[]>([
        { ...titular, nombreRazonSocial: 'NOMBRE PREVIO', direccion: 'DIR PREVIA' },
      ]);
      estadoTitulares = titulares;
      const [formFacturacion, setFormFacturacion] = useState(facturacionInicial);
      return (
        <TitularesList
          titulares={titulares}
          setTitulares={setTitulares}
          formFacturacion={formFacturacion}
          setFormFacturacion={setFormFacturacion}
          mostrarFacturacion={false}
        />
      );
    };

    await act(async () => root.render(<Caso />));
    const botonLupa = contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]');

    await act(async () => {
      botonLupa!.click();
    });

    expect(estadoTitulares[0].nombreRazonSocial).toBe('NOMBRE PREVIO');
    expect(estadoTitulares[0].direccion).toBe('DIR PREVIA');
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'info' }));

    await act(async () => root.unmount());
  });

  it('4. Documento vacío o incompleto: muestra aviso sin consultar API', async () => {
    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    contenedores.push(contenedor);
    const root = createRoot(contenedor);

    const Caso = () => {
      const [titulares, setTitulares] = useState<TitularState[]>([
        { ...titular, nroDocumento: '' },
      ]);
      const [formFacturacion, setFormFacturacion] = useState(facturacionInicial);
      return (
        <TitularesList
          titulares={titulares}
          setTitulares={setTitulares}
          formFacturacion={formFacturacion}
          setFormFacturacion={setFormFacturacion}
          mostrarFacturacion={false}
        />
      );
    };

    await act(async () => root.render(<Caso />));
    const botonLupa = contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]');

    await act(async () => {
      botonLupa!.click();
    });

    expect(faregasClientesApi.autocompletarPersona).not.toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'warning', title: 'Documento requerido' }));

    await act(async () => root.unmount());
  });

  it('5. Error de red: conserva los datos existentes', async () => {
    vi.mocked(faregasClientesApi.autocompletarPersona).mockRejectedValueOnce(new Error('Network error'));

    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    contenedores.push(contenedor);
    const root = createRoot(contenedor);

    let estadoTitulares: TitularState[] = [];
    const Caso = () => {
      const [titulares, setTitulares] = useState<TitularState[]>([
        { ...titular, nombreRazonSocial: 'DATO CONSERVADO' },
      ]);
      estadoTitulares = titulares;
      const [formFacturacion, setFormFacturacion] = useState(facturacionInicial);
      return (
        <TitularesList
          titulares={titulares}
          setTitulares={setTitulares}
          formFacturacion={formFacturacion}
          setFormFacturacion={setFormFacturacion}
          mostrarFacturacion={false}
        />
      );
    };

    await act(async () => root.render(<Caso />));
    const botonLupa = contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]');

    await act(async () => {
      botonLupa!.click();
    });

    expect(estadoTitulares[0].nombreRazonSocial).toBe('DATO CONSERVADO');
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'warning', title: 'Consulta no disponible' }));

    await act(async () => root.unmount());
  });

  it('6. Cambio de documento durante la consulta: descarta respuesta antigua', async () => {
    let resolverConsulta: (valor: any) => void = () => undefined;
    const promesaConsulta = new Promise((resolve) => {
      resolverConsulta = resolve;
    });
    vi.mocked(faregasClientesApi.autocompletarPersona).mockReturnValueOnce(promesaConsulta as any);

    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    contenedores.push(contenedor);
    const root = createRoot(contenedor);

    let estadoTitulares: TitularState[] = [];
    const Caso = () => {
      const [titulares, setTitulares] = useState<TitularState[]>([
        { ...titular, nroDocumento: '74045612', nombreRazonSocial: 'ORIGINAL' },
      ]);
      estadoTitulares = titulares;
      const [formFacturacion, setFormFacturacion] = useState(facturacionInicial);
      return (
        <TitularesList
          titulares={titulares}
          setTitulares={setTitulares}
          formFacturacion={formFacturacion}
          setFormFacturacion={setFormFacturacion}
          mostrarFacturacion={false}
        />
      );
    };

    await act(async () => root.render(<Caso />));
    const botonLupa = contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]');

    // Click en la lupa para iniciar consulta de 74045612
    await act(async () => {
      botonLupa!.click();
    });

    // Mientras espera respuesta, el usuario cambia el input de documento a 12345678
    const inputDoc = contenedor.querySelector<HTMLInputElement>('input[inputmode="numeric"]');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(inputDoc, '12345678');
      inputDoc!.dispatchEvent(new Event('change', { bubbles: true }));
      inputDoc!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Ahora la respuesta remota de 74045612 finalmente se resuelve
    await act(async () => {
      resolverConsulta({
        ok: true,
        data: {
          origen: 'FAREGAS',
          nombreRazonSocial: 'RESPUESTA DESFASADA',
        },
      });
    });

    // No debe sobreescribir el nombre con la respuesta vieja
    expect(estadoTitulares[0].nombreRazonSocial).not.toBe('RESPUESTA DESFASADA');

    await act(async () => root.unmount());
  });

  it('7. Dos propietarios: consultar uno no modifica el otro', async () => {
    vi.mocked(faregasClientesApi.autocompletarPersona).mockResolvedValueOnce({
      ok: true,
      data: {
        origen: 'FAREGAS',
        id: 10,
        nombreRazonSocial: 'DUENO 1 NUEVO',
        direccion: 'DIR 1',
      },
    } as any);

    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    contenedores.push(contenedor);
    const root = createRoot(contenedor);

    let estadoTitulares: TitularState[] = [];
    const Caso = () => {
      const [titulares, setTitulares] = useState<TitularState[]>([
        { ...titular, _uuid: 'd1', nroDocumento: '74045612', nombreRazonSocial: 'D1 ANTERIOR' },
        { ...titular, _uuid: 'd2', orden: 2, nroDocumento: '87654321', nombreRazonSocial: 'D2 INTACTO' },
      ]);
      estadoTitulares = titulares;
      const [formFacturacion, setFormFacturacion] = useState(facturacionInicial);
      return (
        <TitularesList
          titulares={titulares}
          setTitulares={setTitulares}
          formFacturacion={formFacturacion}
          setFormFacturacion={setFormFacturacion}
          mostrarFacturacion={false}
        />
      );
    };

    await act(async () => root.render(<Caso />));
    const botonesLupa = contenedor.querySelectorAll<HTMLButtonElement>('button[aria-label^="Buscar cliente"]');
    expect(botonesLupa.length).toBe(2);

    // Clic en la lupa del primer dueño
    await act(async () => {
      botonesLupa[0].click();
    });

    expect(estadoTitulares[0].nombreRazonSocial).toBe('DUENO 1 NUEVO');
    expect(estadoTitulares[1].nombreRazonSocial).toBe('D2 INTACTO');

    await act(async () => root.unmount());
  });
});
