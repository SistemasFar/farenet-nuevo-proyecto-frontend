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
  it('mantiene marcado el checkbox cuando la lista de dueños se muestra en otra sección', async () => {
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
          mostrarTitulares={false}
          mostrarFacturacion={true}
        />
      );
    };

    await act(async () => root.render(<Caso />));
    const checkbox = contenedor.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox).not.toBeNull();
    expect(checkbox?.checked).toBe(false);

    await act(async () => checkbox?.click());

    expect(checkbox?.checked).toBe(true);
    expect(contenedor.querySelector<HTMLInputElement>('input[value="74045612"]')?.readOnly).toBe(true);
    await act(async () => root.unmount());
  });
});
