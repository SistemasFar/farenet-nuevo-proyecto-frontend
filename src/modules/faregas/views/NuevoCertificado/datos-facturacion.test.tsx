// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Swal from 'sweetalert2';
import { DatosFacturacion } from './components/NuevoCertificado/DatosFacturacion';
import { validarFormularioVehiculoVisible } from './faregas-wizard.validation';
import { VehiculoStep } from './components/NuevoCertificado/VehiculoStep';
import type { FormFacturacionState } from './NuevoCertificadoView';
import type { TitularState } from './components/NuevoCertificado/TitularesList';
import { faregasClientesApi } from '../../services/faregas-clientes.api';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

const titularesMock: TitularState[] = [{
  _uuid: 'titular-1',
  titularId: 1,
  orden: 1,
  clienteId: 1,
  tipoDocumento: 'DNI',
  nroDocumento: '74045612',
  nombreRazonSocial: 'GRACE IBARRA DUEÑA',
  direccion: 'AV. PRINCIPAL 123',
}];

const baseFacturacion: FormFacturacionState = {
  tipoDocFac: 'BOLETA',
  tipoDocumentoFac: 'DNI',
  nroDocFac: '74045612',
  razonSocialFac: 'GRACE IBARRA DUEÑA',
  nombresFac: '',
  apellidosFac: '',
  paisFac: '',
  departamentoFac: '',
  provinciaFac: '',
  distritoFac: '',
  direccionFac: 'AV. PRINCIPAL 123',
  emailFac: 'grace@gmail.com',
  telefonoFac: '999999999',
  usarTitularPrincipalFac: false,
  condicionPagoFac: 'CONTADO',
  fechaVencimientoFac: '',
  medioPagoFac: '',
  cuotasFac: [],
};

const renderStep = (tipoCertificado: any, modalidadCertificado: string, titulares: TitularState[] = []) =>
  renderToStaticMarkup(
    <VehiculoStep
      tipoCertificado={tipoCertificado}
      modalidadCertificado={modalidadCertificado}
      numeroCertificadoOficial={null}
      formVehiculo={{ placaNueva: 'ABC123', marca: 'TOYOTA', modelo: 'YARIS' }}
      setFormVehiculo={() => undefined}
      formPropietario={{}}
      setFormPropietario={() => undefined}
      formGlp={{ componentes: [], verificaciones: [] }}
      setFormGlp={() => undefined}
      formGnv={{ componentes: [], verificaciones: [] }}
      setFormGnv={() => undefined}
      formConformidad={{}}
      setFormConformidad={() => undefined}
      titulares={titulares}
      setTitulares={() => undefined}
      formFacturacion={baseFacturacion}
      setFormFacturacion={() => undefined}
      categoriaVehicular="M1"
      categoriasVehiculares={[{ key: 'M1', nombre: 'M1' }]}
      onCategoriaVehicularChange={() => undefined}
    />
  );

const contenedores: HTMLDivElement[] = [];

afterEach(() => {
  contenedores.splice(0).forEach((c) => c.remove());
  vi.clearAllMocks();
});

describe('MEJORA GENERAL — DATOS PARA FACTURACIÓN EN TODOS LOS CERTIFICADOS FAREGAS', () => {

  describe('CASO 10 y 11: Posición y no duplicación en todos los certificados', () => {
    it('muestra tipo y número como campos distintos con los códigos reales del catálogo', () => {
      const html = renderToStaticMarkup(
        <DatosFacturacion
          titulares={[]}
          formFacturacion={baseFacturacion}
          setFormFacturacion={() => undefined}
        />
      );

      expect(html).toContain('TIPO DE DOCUMENTO');
      expect(html).toContain('NÚMERO DE DOCUMENTO');
      expect(html).toContain('value="DNI"');
      expect(html).toContain('value="RUC"');
      expect(html).toContain('value="CARNETEXTRANJERIA"');
      expect(html).not.toContain('>DNI / RUC<');
    });

    it('GLP Inicial: Facturación se ubica inmediatamente debajo de Propietario y aparece UNA SOLA VEZ', () => {
      const html = renderStep('GLP_ANUAL', 'INICIAL', titularesMock);
      const propietario = html.indexOf('data-seccion-glp-inicial="propietario"');
      const facturacion = html.indexOf('data-seccion-glp-inicial="facturacion"');
      const vehiculo = html.indexOf('data-layout-certificado="dos-columnas"');

      expect(propietario).toBeGreaterThan(-1);
      expect(facturacion).toBeGreaterThan(propietario);
      expect(vehiculo).toBeGreaterThan(facturacion);

      // Comprobar que aparece EXACTAMENTE UNA VEZ
      const matches = html.match(/data-seccion-glp-inicial="facturacion"/g);
      expect(matches?.length).toBe(1);
      const textMatches = html.match(/Datos para facturación/gi);
      expect(textMatches?.length).toBe(1);
    });

    it('GLP Anual: Facturación se ubica inmediatamente debajo de Propietario y aparece UNA SOLA VEZ', () => {
      const html = renderStep('GLP_ANUAL', 'ANUAL', titularesMock);
      const propietario = html.indexOf('data-seccion-glp-anual="propietario"');
      const facturacion = html.indexOf('data-seccion-glp-anual="facturacion"');
      const vehiculo = html.indexOf('data-layout-certificado="dos-columnas"');

      expect(propietario).toBeGreaterThan(-1);
      expect(facturacion).toBeGreaterThan(propietario);
      expect(vehiculo).toBeGreaterThan(facturacion);

      const matches = html.match(/data-seccion-glp-anual="facturacion"/g);
      expect(matches?.length).toBe(1);
      const textMatches = html.match(/Datos para facturación/gi);
      expect(textMatches?.length).toBe(1);
    });

    it('Conformidad: Facturación se ubica inmediatamente debajo de Propietario y aparece UNA SOLA VEZ', () => {
      const html = renderStep('CONFORMIDAD', '', titularesMock);
      const propietario = html.indexOf('data-seccion-conformidad="propietario"');
      const facturacion = html.indexOf('data-seccion-conformidad="facturacion"');
      const vehiculo = html.indexOf('A. DATOS DEL VEHÍCULO');

      expect(propietario).toBeGreaterThan(-1);
      expect(facturacion).toBeGreaterThan(propietario);
      expect(vehiculo).toBeGreaterThan(facturacion);

      const matches = html.match(/data-seccion-conformidad="facturacion"/g);
      expect(matches?.length).toBe(1);
      const textMatches = html.match(/Datos para facturación/gi);
      expect(textMatches?.length).toBe(1);
    });

    it('GNV Inicial: Facturación se ubica al inicio (sin propietario) y aparece UNA SOLA VEZ', () => {
      const html = renderStep('GNV_ANUAL', 'INICIAL', []);
      const facturacion = html.indexOf('data-seccion-gnv="facturacion"');
      const vehiculo = html.indexOf('A. DATOS DEL VEHÍCULO');

      expect(facturacion).toBeGreaterThan(-1);
      expect(vehiculo).toBeGreaterThan(facturacion);

      const matches = html.match(/data-seccion-gnv="facturacion"/g);
      expect(matches?.length).toBe(1);
      const textMatches = html.match(/Datos para facturación/gi);
      expect(textMatches?.length).toBe(1);
    });

    it('GNV Anual: Facturación se ubica al inicio (sin propietario) y aparece UNA SOLA VEZ', () => {
      const html = renderStep('GNV_ANUAL', 'ANUAL', []);
      const facturacion = html.indexOf('data-seccion-gnv="facturacion"');
      const vehiculo = html.indexOf('A. DATOS DEL VEHÍCULO');

      expect(facturacion).toBeGreaterThan(-1);
      expect(vehiculo).toBeGreaterThan(facturacion);

      const matches = html.match(/data-seccion-gnv="facturacion"/g);
      expect(matches?.length).toBe(1);
      const textMatches = html.match(/Datos para facturación/gi);
      expect(textMatches?.length).toBe(1);
    });
  });

  describe('Lupa de búsqueda: Flujo de consulta Local-First y enriquecimiento', () => {
    it('CASO 1: Cliente local DNI en fg_cliente muestra origen local y llena los datos', async () => {
      vi.spyOn(faregasClientesApi, 'consultarDocumento').mockResolvedValueOnce({
        ok: true,
        encontrado: true,
        origen: 'FAREGAS',
        mensaje: 'Datos recuperados de Faregas.',
        data: {
          documento: '74045612',
          tipoDocumento: 'DNI',
          nombreRazonSocial: 'LOCAL FAREGAS CLIENTE',
          direccion: 'AV. FAREGAS 123',
          correo: 'local@faregas.pe',
          telefono: '988776655',
          clienteExistente: true,
        },
      });

      const contenedor = document.createElement('div');
      document.body.appendChild(contenedor);
      contenedores.push(contenedor);
      const root = createRoot(contenedor);

      let estadoActual = { ...baseFacturacion, nroDocFac: '74045612' };
      const Caso = () => {
        const [facturacion, setFacturacion] = useState(estadoActual);
        estadoActual = facturacion;
        return (
          <DatosFacturacion
            titulares={[]}
            formFacturacion={facturacion}
            setFormFacturacion={setFacturacion}
          />
        );
      };

      await act(async () => root.render(<Caso />));

      const botonLupa = contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]');
      expect(botonLupa).not.toBeNull();

      await act(async () => botonLupa?.click());

      expect(faregasClientesApi.consultarDocumento).toHaveBeenCalledWith('DNI', '74045612');
      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'success',
          title: 'Cliente encontrado',
          text: 'Datos recuperados de Faregas.',
        })
      );
      expect(estadoActual.razonSocialFac).toBe('LOCAL FAREGAS CLIENTE');
      expect(estadoActual.direccionFac).toBe('AV. FAREGAS 123');
      expect(estadoActual.emailFac).toBe('local@faregas.pe');
      expect(estadoActual.telefonoFac).toBe('988776655');

      await act(async () => root.unmount());
    });

    it('CASO 2: Cliente local RUC en fg_cliente retorna origen FAREGAS sin consulta externa', async () => {
      vi.spyOn(faregasClientesApi, 'consultarDocumento').mockResolvedValueOnce({
        ok: true,
        encontrado: true,
        origen: 'FAREGAS',
        mensaje: 'Datos recuperados de Faregas.',
        data: {
          documento: '20123456789',
          tipoDocumento: 'RUC',
          nombreRazonSocial: 'TRANSPORTES LOCALES SAC',
          direccion: 'JR. LOCAL 456',
          correo: 'empresa@local.pe',
          telefono: '014455667',
          clienteExistente: true,
        },
      });

      const contenedor = document.createElement('div');
      document.body.appendChild(contenedor);
      contenedores.push(contenedor);
      const root = createRoot(contenedor);

      let estadoActual = { ...baseFacturacion, tipoDocumentoFac: 'RUC', nroDocFac: '20123456789' };
      const Caso = () => {
        const [facturacion, setFacturacion] = useState(estadoActual);
        estadoActual = facturacion;
        return (
          <DatosFacturacion
            titulares={[]}
            formFacturacion={facturacion}
            setFormFacturacion={setFacturacion}
          />
        );
      };

      await act(async () => root.render(<Caso />));
      const botonLupa = contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]');
      await act(async () => botonLupa?.click());

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'success',
          text: 'Datos recuperados de Faregas.',
        })
      );
      expect(estadoActual.tipoDocFac).toBe('FACTURA');
      expect(estadoActual.razonSocialFac).toBe('TRANSPORTES LOCALES SAC');

      await act(async () => root.unmount());
    });

    it('CASO 3 y 4: RUC / DNI nuevo consulta externa y muestra origen externo', async () => {
      vi.spyOn(faregasClientesApi, 'consultarDocumento').mockResolvedValueOnce({
        ok: true,
        encontrado: true,
        origen: 'SUNAT',
        mensaje: 'Datos obtenidos de consulta externa.',
        data: {
          documento: '20601234567',
          tipoDocumento: 'RUC',
          nombreRazonSocial: 'NUEVA EMPRESA SAC',
          direccion: 'AV. EXTERNA 789',
          correo: null,
          telefono: null,
          clienteExistente: false,
        },
      });

      const contenedor = document.createElement('div');
      document.body.appendChild(contenedor);
      contenedores.push(contenedor);
      const root = createRoot(contenedor);

      let estadoActual = {
        ...baseFacturacion,
        tipoDocumentoFac: 'RUC',
        nroDocFac: '20601234567',
        emailFac: 'previo@correo.com',
        telefonoFac: '911222333',
      };
      const Caso = () => {
        const [facturacion, setFacturacion] = useState(estadoActual);
        estadoActual = facturacion;
        return (
          <DatosFacturacion
            titulares={[]}
            formFacturacion={facturacion}
            setFormFacturacion={setFacturacion}
          />
        );
      };

      await act(async () => root.render(<Caso />));
      const botonLupa = contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]');
      await act(async () => botonLupa?.click());

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'success',
          title: 'Cliente encontrado',
          text: 'Datos obtenidos de consulta RUC.',
        })
      );
      expect(estadoActual.razonSocialFac).toBe('NUEVA EMPRESA SAC');
      expect(estadoActual.direccionFac).toBe('AV. EXTERNA 789');

      // CASO 7: Correo y teléfono PREVIOS NO se borran si la API no los devuelve
      expect(estadoActual.emailFac).toBe('previo@correo.com');
      expect(estadoActual.telefonoFac).toBe('911222333');

      await act(async () => root.unmount());
    });

    it('CASO EXTERNO_NO_CONFIGURADO: Cuando no hay API token configurado muestra mensaje claro de captura manual', async () => {
      vi.spyOn(faregasClientesApi, 'consultarDocumento').mockResolvedValueOnce({
        ok: true,
        encontrado: false,
        origen: 'EXTERNO_NO_CONFIGURADO',
        mensaje: 'La consulta externa de documentos no está configurada.',
        data: null,
      });

      const contenedor = document.createElement('div');
      document.body.appendChild(contenedor);
      contenedores.push(contenedor);
      const root = createRoot(contenedor);

      const Caso = () => {
        const [facturacion, setFacturacion] = useState({ ...baseFacturacion, nroDocFac: '70261331' });
        return (
          <DatosFacturacion
            titulares={[]}
            formFacturacion={facturacion}
            setFormFacturacion={setFacturacion}
          />
        );
      };

      await act(async () => root.render(<Caso />));
      const botonLupa = contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]');
      await act(async () => botonLupa?.click());

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'info',
          title: 'Consulta externa no configurada',
          text: 'Consulta externa no configurada. Puede completar los datos manualmente.',
        })
      );

      await act(async () => root.unmount());
    });

    it('CASO 5: Carné de Extranjería usa fallback manual y nunca se trata como DNI/RUC', async () => {
      vi.spyOn(faregasClientesApi, 'consultarDocumento').mockResolvedValueOnce({
        ok: true,
        encontrado: false,
        origen: 'SIN_PROVEEDOR_PARA_TIPO',
        mensaje: 'No existe consulta externa configurada para este tipo de documento. Complete los datos manualmente.',
        data: null,
      });

      const contenedor = document.createElement('div');
      document.body.appendChild(contenedor);
      contenedores.push(contenedor);
      const root = createRoot(contenedor);
      const Caso = () => {
        const [facturacion, setFacturacion] = useState({
          ...baseFacturacion,
          tipoDocumentoFac: 'CARNETEXTRANJERIA',
          nroDocFac: 'CE123456',
          razonSocialFac: '',
          direccionFac: '',
        });
        return <DatosFacturacion titulares={[]} formFacturacion={facturacion} setFormFacturacion={setFacturacion} />;
      };

      await act(async () => root.render(<Caso />));
      await act(async () => contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]')?.click());

      expect(faregasClientesApi.consultarDocumento).toHaveBeenCalledWith('CARNETEXTRANJERIA', 'CE123456');
      expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Consulta externa no disponible para este tipo',
        text: 'No existe consulta externa configurada para este tipo de documento. Complete los datos manualmente.',
      }));
      expect(contenedor.querySelector<HTMLInputElement>('input[aria-label="Número de documento de facturación"]')?.readOnly).toBe(false);

      await act(async () => root.unmount());
    });

    it('distingue token inválido y timeout, manteniendo habilitada la captura manual', async () => {
      const consultarSpy = vi.spyOn(faregasClientesApi, 'consultarDocumento');
      const casos = [
        {
          origen: 'EXTERNO_NO_AUTORIZADO',
          titulo: 'Consulta externa no autorizada',
          texto: 'No fue posible autenticar la consulta externa. Puede completar los datos manualmente.',
        },
        {
          origen: 'EXTERNO_TIMEOUT',
          titulo: 'Servicio temporalmente no disponible',
          texto: 'El servicio de consulta no está disponible temporalmente. Puede completar los datos manualmente.',
        },
      ];

      for (const caso of casos) {
        consultarSpy.mockResolvedValueOnce({
          ok: true,
          encontrado: false,
          origen: caso.origen,
          mensaje: caso.texto,
          data: null,
        });

        const contenedor = document.createElement('div');
        document.body.appendChild(contenedor);
        contenedores.push(contenedor);
        const root = createRoot(contenedor);
        const Caso = () => {
          const [facturacion, setFacturacion] = useState({
            ...baseFacturacion,
            nroDocFac: '70261331',
          });
          return <DatosFacturacion titulares={[]} formFacturacion={facturacion} setFormFacturacion={setFacturacion} />;
        };

        await act(async () => root.render(<Caso />));
        await act(async () => contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]')?.click());

        expect(Swal.fire).toHaveBeenLastCalledWith(expect.objectContaining({
          title: caso.titulo,
          text: caso.texto,
        }));
        expect(contenedor.querySelector<HTMLInputElement>('input[aria-label="Número de documento de facturación"]')?.readOnly).toBe(false);

        await act(async () => root.unmount());
      }
    });

    it('CASO 8: cambiar DNI a RUC limpia el documento incompatible pero preserva correo y teléfono', async () => {
      const contenedor = document.createElement('div');
      document.body.appendChild(contenedor);
      contenedores.push(contenedor);
      const root = createRoot(contenedor);
      let estadoActual = { ...baseFacturacion };
      const Caso = () => {
        const [facturacion, setFacturacion] = useState(estadoActual);
        estadoActual = facturacion;
        return <DatosFacturacion titulares={[]} formFacturacion={facturacion} setFormFacturacion={setFacturacion} />;
      };

      await act(async () => root.render(<Caso />));
      const selector = contenedor.querySelector<HTMLSelectElement>('select[aria-label="Tipo de documento de facturación"]');
      await act(async () => {
        if (selector) {
          selector.value = 'RUC';
          selector.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      expect(estadoActual.tipoDocumentoFac).toBe('RUC');
      expect(estadoActual.tipoDocFac).toBe('FACTURA');
      expect(estadoActual.nroDocFac).toBe('');
      expect(estadoActual.razonSocialFac).toBe('');
      expect(estadoActual.direccionFac).toBe('');
      expect(estadoActual.emailFac).toBe('grace@gmail.com');
      expect(estadoActual.telefonoFac).toBe('999999999');

      await act(async () => root.unmount());
    });

    it('CASOS 6 y 7: muestra mensajes específicos para DNI y RUC inválidos', async () => {
      const verificar = async (tipoDocumentoFac: string, nroDocFac: string, mensaje: string) => {
        const contenedor = document.createElement('div');
        document.body.appendChild(contenedor);
        contenedores.push(contenedor);
        const root = createRoot(contenedor);
        const Caso = () => {
          const [facturacion, setFacturacion] = useState({ ...baseFacturacion, tipoDocumentoFac, nroDocFac });
          return <DatosFacturacion titulares={[]} formFacturacion={facturacion} setFormFacturacion={setFacturacion} />;
        };
        await act(async () => root.render(<Caso />));
        await act(async () => contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]')?.click());
        expect(Swal.fire).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Documento inválido', text: mensaje }));
        await act(async () => root.unmount());
      };

      await verificar('DNI', '1234567890', 'El DNI debe contener exactamente 8 dígitos.');
      await verificar('RUC', '12345678', 'El RUC debe contener exactamente 11 dígitos.');
    });

    it('CASO 5: No encontrado local ni externo muestra aviso claro y permite digitación manual', async () => {
      vi.spyOn(faregasClientesApi, 'consultarDocumento').mockResolvedValueOnce({
        ok: true,
        encontrado: false,
        origen: 'NO_ENCONTRADO',
        mensaje: 'No se encontraron datos para este documento.',
        data: null,
      });

      const contenedor = document.createElement('div');
      document.body.appendChild(contenedor);
      contenedores.push(contenedor);
      const root = createRoot(contenedor);

      let estadoActual = { ...baseFacturacion, nroDocFac: '99999999' };
      const Caso = () => {
        const [facturacion, setFacturacion] = useState(estadoActual);
        estadoActual = facturacion;
        return (
          <DatosFacturacion
            titulares={[]}
            formFacturacion={facturacion}
            setFormFacturacion={setFacturacion}
          />
        );
      };

      await act(async () => root.render(<Caso />));
      const botonLupa = contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]');
      await act(async () => botonLupa?.click());

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'info',
          title: 'Sin coincidencias',
        })
      );

      await act(async () => root.unmount());
    });

    it('CASO 6: Caída o error del servicio externo permite continuar manualmente sin romper el wizard', async () => {
      vi.spyOn(faregasClientesApi, 'consultarDocumento').mockRejectedValueOnce(new Error('Network error'));

      const contenedor = document.createElement('div');
      document.body.appendChild(contenedor);
      contenedores.push(contenedor);
      const root = createRoot(contenedor);

      const Caso = () => {
        const [facturacion, setFacturacion] = useState({ ...baseFacturacion, nroDocFac: '74045612' });
        return (
          <DatosFacturacion
            titulares={[]}
            formFacturacion={facturacion}
            setFormFacturacion={setFacturacion}
          />
        );
      };

      await act(async () => root.render(<Caso />));
      const botonLupa = contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]');
      await act(async () => botonLupa?.click());

      expect(Swal.fire).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: 'info',
          title: 'Consulta no disponible',
          text: 'No fue posible consultar el documento. Puede completar los datos manualmente.',
        })
      );

      await act(async () => root.unmount());
    });

    it('CASO 8 y 9: Checkbox "FACTURAR AL DUEÑO PRINCIPAL" y facturación a tercero', async () => {
      const contenedor = document.createElement('div');
      document.body.appendChild(contenedor);
      contenedores.push(contenedor);
      const root = createRoot(contenedor);

      let estadoActual = {
        ...baseFacturacion,
        tipoDocumentoFac: 'RUC',
        nroDocFac: '20123456789',
        usarTitularPrincipalFac: false,
      };
      const Caso = () => {
        const [facturacion, setFacturacion] = useState(estadoActual);
        estadoActual = facturacion;
        return (
          <DatosFacturacion
            titulares={titularesMock}
            formFacturacion={facturacion}
            setFormFacturacion={setFacturacion}
          />
        );
      };

      await act(async () => root.render(<Caso />));

      const checkbox = contenedor.querySelector<HTMLInputElement>('input[type="checkbox"]');
      expect(checkbox?.checked).toBe(false);

      await act(async () => checkbox?.click());
      expect(checkbox?.checked).toBe(true);
      expect(estadoActual.tipoDocumentoFac).toBe('DNI');
      expect(estadoActual.nroDocFac).toBe('74045612');

      // Cuando está marcado, tipo y número se sincronizan y son de sólo lectura.
      const inputDoc = contenedor.querySelector<HTMLInputElement>('input[value="74045612"]');
      expect(inputDoc?.readOnly).toBe(true);
      expect(contenedor.querySelector<HTMLSelectElement>('select[aria-label="Tipo de documento de facturación"]')?.disabled).toBe(true);

      const botonLupa = contenedor.querySelector<HTMLButtonElement>('button[aria-label="Buscar cliente"]');
      expect(botonLupa).not.toBeNull();
      expect(botonLupa?.disabled).toBe(false);

      // Al desmarcar (facturar a tercero), el input se vuelve editable
      await act(async () => checkbox?.click());
      expect(checkbox?.checked).toBe(false);

      await act(async () => root.unmount());
    });

  describe('CASOS OBLIGATORIOS AUDITORÍA Y REGRESIÓN (Problemas 1 y 2)', () => {
    it('CASO 1: Seleccionar BOLETA -> Tipo Documento = DNI automáticamente', async () => {
      const contenedor = document.createElement('div');
      document.body.appendChild(contenedor);
      contenedores.push(contenedor);
      const root = createRoot(contenedor);

      let estadoActual = {
        ...baseFacturacion,
        tipoDocFac: 'FACTURA',
        tipoDocumentoFac: 'RUC',
        nroDocFac: '20600444531',
      };
      const Caso = () => {
        const [facturacion, setFacturacion] = useState(estadoActual);
        estadoActual = facturacion;
        return <DatosFacturacion titulares={[]} formFacturacion={facturacion} setFormFacturacion={setFacturacion} />;
      };

      await act(async () => root.render(<Caso />));
      const selectorComprobante = contenedor.querySelector<HTMLSelectElement>('select:not([aria-label])');
      await act(async () => {
        if (selectorComprobante) {
          selectorComprobante.value = 'BOLETA';
          selectorComprobante.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      expect(estadoActual.tipoDocFac).toBe('BOLETA');
      expect(estadoActual.tipoDocumentoFac).toBe('DNI');
      await act(async () => root.unmount());
    });

    it('CASO 2: Seleccionar FACTURA -> Tipo Documento = RUC automáticamente', async () => {
      const contenedor = document.createElement('div');
      document.body.appendChild(contenedor);
      contenedores.push(contenedor);
      const root = createRoot(contenedor);

      let estadoActual = {
        ...baseFacturacion,
        tipoDocFac: 'BOLETA',
        tipoDocumentoFac: 'DNI',
        nroDocFac: '74045612',
      };
      const Caso = () => {
        const [facturacion, setFacturacion] = useState(estadoActual);
        estadoActual = facturacion;
        return <DatosFacturacion titulares={[]} formFacturacion={facturacion} setFormFacturacion={setFacturacion} />;
      };

      await act(async () => root.render(<Caso />));
      const selectorComprobante = contenedor.querySelector<HTMLSelectElement>('select:not([aria-label])');
      await act(async () => {
        if (selectorComprobante) {
          selectorComprobante.value = 'FACTURA';
          selectorComprobante.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      expect(estadoActual.tipoDocFac).toBe('FACTURA');
      expect(estadoActual.tipoDocumentoFac).toBe('RUC');
      await act(async () => root.unmount());
    });

    it('CASO 3: BOLETA con DNI cargado -> cambiar a FACTURA limpia documento incompatible y conserva correo y teléfono', async () => {
      const contenedor = document.createElement('div');
      document.body.appendChild(contenedor);
      contenedores.push(contenedor);
      const root = createRoot(contenedor);

      let estadoActual = {
        ...baseFacturacion,
        tipoDocFac: 'BOLETA',
        tipoDocumentoFac: 'DNI',
        nroDocFac: '74045612',
        razonSocialFac: 'GRACE RODAS',
        direccionFac: 'CALLE AREQUIPA 152',
        emailFac: 'manual@empresa.com',
        telefonoFac: '987654321',
      };
      const Caso = () => {
        const [facturacion, setFacturacion] = useState(estadoActual);
        estadoActual = facturacion;
        return <DatosFacturacion titulares={[]} formFacturacion={facturacion} setFormFacturacion={setFacturacion} />;
      };

      await act(async () => root.render(<Caso />));
      const selectorComprobante = contenedor.querySelector<HTMLSelectElement>('select:not([aria-label])');
      await act(async () => {
        if (selectorComprobante) {
          selectorComprobante.value = 'FACTURA';
          selectorComprobante.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      expect(estadoActual.tipoDocFac).toBe('FACTURA');
      expect(estadoActual.tipoDocumentoFac).toBe('RUC');
      expect(estadoActual.nroDocFac).toBe('');
      expect(estadoActual.razonSocialFac).toBe('');
      expect(estadoActual.direccionFac).toBe('');
      expect(estadoActual.emailFac).toBe('manual@empresa.com');
      expect(estadoActual.telefonoFac).toBe('987654321');
      await act(async () => root.unmount());
    });

    it('CASO 4: FACTURA con RUC válido a tercero y campos visibles completos -> SIGUIENTE PASO permitido', () => {
      const facturacionTercero = {
        tipoDocFac: 'FACTURA',
        tipoDocumentoFac: 'RUC',
        nroDocFac: '20600444531',
        razonSocialFac: 'EMPRESA TERCERO S.A.C.',
        direccionFac: 'CALLE MIGUEL DASSO 180',
        emailFac: 'ssss@gmail.com',
        telefonoFac: '897878887',
        usarTitularPrincipalFac: false,
      };

      const vehiculoCompleto = {
        marca: 'TOYOTA', modelo: 'YARIS', version: 'STD', anioFabricacion: '2020',
        vin: '9BD1234567890', serieChasis: '9BD1234567890', numeroMotor: 'MOT12345',
        numeroCilindros: '4', cilindrada: '1500', combustible: 'GASOLINA',
        numeroEjes: '2', numeroRuedas: '4', numeroAsientos: '5', numeroPasajeros: '4',
        longitud: '4.2', ancho: '1.7', alto: '1.5', pesoNeto: '1100', pesoBruto: '1500', cargaUtil: '400',
        color: 'ROJO',
      };

      const glpCompleto = {
        fechaVigencia: '2027-10-14',
        verificaciones: Array.from({ length: 7 }, (_, i) => ({ codigo: String(i + 1), cumple: true })),
        componentes: [
          { componente: 'CILINDRO', marca: 'FABER', numeroSerie: '12345', capacidadLitros: '60', anioFabricacion: '2020' },
          { componente: 'REGULADOR', marca: 'TOMASETTO', numeroSerie: '67890', modelo: 'AT09' },
        ],
      };

      const errores = validarFormularioVehiculoVisible({
        tipoCertificado: 'GLP_ANUAL',
        modalidad: 'ANUAL',
        caja: { categoria: 'M1', placa: 'ABC123', tarifaCodigo: 'GLP01' },
        vehiculo: vehiculoCompleto,
        titulares: [{ nombreRazonSocial: 'PROPIETARIO REGISTRADO' }],
        glp: glpCompleto,
        gnv: {},
        conformidad: {},
        facturacion: facturacionTercero,
      });

      expect(errores).toEqual({});
    });

    it('CASO 5: Quitar un campo REALMENTE obligatorio visible -> bloquea, marca campo y mensaje coherente', () => {
      const vehiculoIncompleto = {
        marca: '', modelo: 'YARIS', version: 'STD', anioFabricacion: '2020',
        vin: '9BD1234567890', serieChasis: '9BD1234567890', numeroMotor: 'MOT12345',
        numeroCilindros: '4', cilindrada: '1500', combustible: 'GASOLINA',
        numeroEjes: '2', numeroRuedas: '4', numeroAsientos: '5', numeroPasajeros: '4',
        longitud: '4.2', ancho: '1.7', alto: '1.5', pesoNeto: '1100', pesoBruto: '1500', cargaUtil: '400',
      };

      const errores = validarFormularioVehiculoVisible({
        tipoCertificado: 'GLP_ANUAL',
        modalidad: 'ANUAL',
        caja: { categoria: 'M1', placa: 'ABC123', tarifaCodigo: 'GLP01' },
        vehiculo: vehiculoIncompleto,
        titulares: [{ nombreRazonSocial: 'PROPIETARIO REGISTRADO' }],
        glp: {
          fechaVigencia: '2027-10-14',
          verificaciones: Array.from({ length: 7 }, (_, i) => ({ codigo: String(i + 1), cumple: true })),
          componentes: [
            { componente: 'CILINDRO', marca: 'FABER', numeroSerie: '12345', capacidadLitros: '60', anioFabricacion: '2020' },
            { componente: 'REGULADOR', marca: 'TOMASETTO', numeroSerie: '67890', modelo: 'AT09' },
          ],
        },
        gnv: {},
        conformidad: {},
        facturacion: {
          tipoDocFac: 'BOLETA',
          tipoDocumentoFac: 'DNI',
          nroDocFac: '74045612',
          razonSocialFac: 'JUAN PEREZ',
          direccionFac: 'AV PERU 123',
          emailFac: '',
          telefonoFac: '987654321',
          usarTitularPrincipalFac: false,
        },
      });

      expect(errores['marca']).toBe('Este campo es obligatorio.');
      // Correo es opcional: vacío no produce error
      expect(errores['emailFac']).toBeUndefined();

      // Si se ingresa con formato inválido, sí produce error
      const erroresFormatoInvalido = validarFormularioVehiculoVisible({
        tipoCertificado: 'GLP_ANUAL',
        modalidad: 'ANUAL',
        caja: { categoria: 'M1', placa: 'ABC123', tarifaCodigo: 'GLP01' },
        vehiculo: { ...vehiculoIncompleto, marca: 'TOYOTA' },
        titulares: [{ nombreRazonSocial: 'JUAN PEREZ' }],
        glp: {
          fechaVigencia: '2027-10-14',
          verificaciones: Array.from({ length: 7 }, (_, i) => ({ codigo: String(i + 1), cumple: true })),
          componentes: [
            { componente: 'CILINDRO', marca: 'FABER', numeroSerie: '12345', capacidadLitros: '60', anioFabricacion: '2020' },
            { componente: 'REGULADOR', marca: 'TOMASETTO', numeroSerie: '67890', modelo: 'AT09' },
          ],
        },
        gnv: {},
        conformidad: {},
        facturacion: {
          tipoDocFac: 'BOLETA',
          tipoDocumentoFac: 'DNI',
          nroDocFac: '74045612',
          razonSocialFac: 'JUAN PEREZ',
          direccionFac: 'AV PERU 123',
          emailFac: 'correo-sin-arroba',
          telefonoFac: '987654321',
          usarTitularPrincipalFac: false,
        },
      });
      expect(erroresFormatoInvalido['emailFac']).toBe('El correo de facturación no tiene un formato válido.');
    });

    it('CASO 6: Campo oculto/no aplicable vacío (ej. glp.tallerAutorizadoId) -> NO bloquea', () => {
      const glpSinTaller = {
        fechaVigencia: '2027-10-14',
        verificaciones: Array.from({ length: 7 }, (_, i) => ({ codigo: String(i + 1), cumple: true })),
        componentes: [
          { componente: 'CILINDRO', marca: 'FABER', numeroSerie: '12345', capacidadLitros: '60', anioFabricacion: '2020' },
          { componente: 'REGULADOR', marca: 'TOMASETTO', numeroSerie: '67890', modelo: 'AT09' },
        ],
      };

      const errores = validarFormularioVehiculoVisible({
        tipoCertificado: 'GLP_ANUAL',
        modalidad: 'ANUAL',
        caja: { categoria: 'M1', placa: 'ABC123', tarifaCodigo: 'GLP01' },
        vehiculo: {
          marca: 'TOYOTA', modelo: 'YARIS', version: 'STD', anioFabricacion: '2020',
          vin: '9BD1234567890', serieChasis: '9BD1234567890', numeroMotor: 'MOT12345',
          numeroCilindros: '4', cilindrada: '1500', combustible: 'GASOLINA',
          numeroEjes: '2', numeroRuedas: '4', numeroAsientos: '5', numeroPasajeros: '4',
          longitud: '4.2', ancho: '1.7', alto: '1.5', pesoNeto: '1100', pesoBruto: '1500', cargaUtil: '400',
          color: 'ROJO',
        },
        titulares: [{ nombreRazonSocial: 'PROPIETARIO REGISTRADO' }],
        glp: glpSinTaller,
        gnv: {},
        conformidad: {},
        facturacion: {
          tipoDocFac: 'BOLETA',
          tipoDocumentoFac: 'DNI',
          nroDocFac: '74045612',
          razonSocialFac: 'JUAN PEREZ',
          direccionFac: 'AV PERU 123',
          emailFac: 'juan@gmail.com',
          telefonoFac: '987654321',
          usarTitularPrincipalFac: false,
        },
      });

      expect(errores['glp.tallerAutorizadoId']).toBeUndefined();
      expect(errores).toEqual({});
    });
  });

  });
});
