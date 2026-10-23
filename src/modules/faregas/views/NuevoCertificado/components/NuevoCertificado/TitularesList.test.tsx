// @vitest-environment jsdom

import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import type { FormFacturacionState } from '../../NuevoCertificadoView';
import { TitularesList, type TitularState } from './TitularesList';

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

afterEach(() => {
  contenedores.splice(0).forEach((contenedor) => contenedor.remove());
});

describe('facturación al dueño principal', () => {
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
