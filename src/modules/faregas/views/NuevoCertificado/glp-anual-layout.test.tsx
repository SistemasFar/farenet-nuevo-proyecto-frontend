import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VehiculoStep } from './components/NuevoCertificado/VehiculoStep';
import { obtenerCamposVehiculoCertificado } from './faregas-certificado-campos';
import { validarDatosEspecificos } from './faregas-wizard.validation';

const formVehiculo = {
  placaNueva: 'ABC123',
  categoria: 'M1',
  marca: 'HYUNDAI',
  modelo: 'SANTA FE',
  version: 'GLS',
  anioFabricacion: '2013',
  vin: 'KMH123456789',
  numeroMotor: 'MOTOR123',
  numeroCilindros: '4',
  cilindrada: '2359',
  numeroEjes: '2',
  numeroRuedas: '4',
  numeroAsientos: '7',
  numeroPasajeros: '6',
  longitud: '4.69',
  ancho: '1.88',
  alto: '1.68',
  pesoNeto: '1900',
  pesoBruto: '2510',
  cargaUtil: '610',
};

const componentes = [
  {
    componente: 'CILINDRO',
    marca: 'MARCA CILINDRO',
    modelo: 'TOROIDAL',
    capacidadLitros: '48',
    mesFabricacion: '7',
    anioFabricacion: '2026',
    numeroSerie: 'SERIE-C',
  },
  {
    componente: 'REGULADOR',
    marca: 'MARCA REGULADOR',
    modelo: 'MODELO REGULADOR',
    numeroSerie: 'SERIE-R',
  },
];

const verificaciones = Array.from({ length: 7 }, (_, indice) => ({
  codigo: String(indice + 1),
  descripcion: `VERIFICACIÓN ${indice + 1}`,
  cumple: true,
  observacion: '',
}));

const renderGlpAnual = () => renderToStaticMarkup(
  <VehiculoStep
    tipoCertificado="GLP_ANUAL"
    modalidadCertificado="ANUAL"
    numeroCertificadoOficial={null}
    formVehiculo={formVehiculo}
    setFormVehiculo={() => undefined}
    formPropietario={{}}
    setFormPropietario={() => undefined}
    formGlp={{ fechaVigencia: '2027-10-13', componentes, verificaciones }}
    setFormGlp={() => undefined}
    formGnv={{}}
    setFormGnv={() => undefined}
    formConformidad={{}}
    setFormConformidad={() => undefined}
    titulares={[{
      _uuid: 'titular-1',
      titularId: 1,
      orden: 1,
      clienteId: 1,
      tipoDocumento: 'DNI',
      nroDocumento: '74045612',
      nombreRazonSocial: 'PROPIETARIO PRINCIPAL',
      direccion: 'AV. PRUEBA 123',
    }]}
    setTitulares={() => undefined}
    formFacturacion={{
      tipoDocFac: 'BOLETA',
      nroDocFac: '74045612',
      razonSocialFac: 'PROPIETARIO PRINCIPAL',
      direccionFac: 'AV. PRUEBA 123',
      emailFac: 'prueba@faregas.pe',
      telefonoFac: '999888777',
      usarTitularPrincipalFac: false,
    }}
    setFormFacturacion={() => undefined}
    catalogoVerificaciones={{}}
    maestrosVehiculo={{}}
    categoriaVehicular="M1"
    categoriasVehiculares={[{ key: 'M1', nombre: 'M1' }]}
    onCategoriaVehicularChange={() => undefined}
  />
);

describe('formulario GLP ANUAL alineado al certificado oficial', () => {
  it('declara los bloques 2–9 a la izquierda y 10–17 a la derecha', () => {
    const campos = obtenerCamposVehiculoCertificado('GLP_ANUAL', 'ANUAL');
    const izquierda = campos.filter((campo) => campo.columnaCertificado === 'izquierda');
    const derecha = campos.filter((campo) => campo.columnaCertificado === 'derecha');

    expect(izquierda.map((campo) => campo.numero)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(derecha.map((campo) => campo.numero)).toEqual([10, 11, 12, 13, 14, 15, 16, 17]);
    expect(derecha.filter((campo) => campo.tipo === 'grupo').map((campo) => campo.campo))
      .toEqual(['numeroCilindros', 'numeroEjes', 'numeroAsientos', 'longitud']);
  });

  it('no activa la numeración de GLP Anual en Conformidad', () => {
    expect(obtenerCamposVehiculoCertificado('CONFORMIDAD')
      .every((campo) => campo.numero === undefined)).toBe(true);
  });

  it('muestra propietario primero y usa la distribución real de dos columnas', () => {
    const html = renderGlpAnual();
    const propietario = html.indexOf('data-propietario-certificado="true"');
    const placa = html.indexOf('data-campo-certificado="placaNueva"');

    expect(html).toContain('A. DATOS DEL CERTIFICADO / VEHÍCULO');
    expect(html).toContain('data-layout-certificado="dos-columnas"');
    expect(propietario).toBeGreaterThan(-1);
    expect(placa).toBeGreaterThan(propietario);
    expect(html).toContain('BI-COMBUSTIBLE GLP');
  });

  it('respeta el orden: Propietario -> Facturación -> Vehículo -> Componentes -> Verificaciones -> Vigencia', () => {
    const html = renderGlpAnual();
    const propietarioIndex = html.indexOf('data-propietario-certificado="true"');
    const facturacionIndex = html.indexOf('data-seccion-glp-anual="facturacion"');
    const vehiculoIndex = html.indexOf('data-layout-certificado="dos-columnas"');
    const componentesIndex = html.indexOf('B. COMPONENTES INSTALADOS GLP');
    const verificacionesIndex = html.indexOf('C. VERIFICACIONES DE SEGURIDAD GLP');
    const vigenciaIndex = html.indexOf('D. VIGENCIA / EXPEDIENTE');

    expect(propietarioIndex).toBeGreaterThan(-1);
    expect(facturacionIndex).toBeGreaterThan(propietarioIndex);
    expect(vehiculoIndex).toBeGreaterThan(facturacionIndex);
    expect(componentesIndex).toBeGreaterThan(vehiculoIndex);
    expect(verificacionesIndex).toBeGreaterThan(componentesIndex);
    expect(vigenciaIndex).toBeGreaterThan(verificacionesIndex);
    expect(html).toContain('>1</td>');
    expect(html).toContain('>Q</td>');
    expect(html).toContain('CAPACIDAD (L)');
    expect(html).toContain('value="48"');
    expect(html).toContain('value="2026"');
    expect(html).toContain('h-9 w-full');
    expect(html).not.toContain('>MES');
    expect(html).not.toContain('Impresión en certificado');
    expect(html).not.toContain('Modelo (ej: Cilíndrico / Toroidal)');
    expect(html).toContain('Se asignará automáticamente al emitir');
    expect(html).not.toContain('name="expedienteTecnico"');
    expect(html).toContain('TIPO DE COMPROBANTE');
    expect(html).toContain('TIPO DE DOCUMENTO');
    expect(html).toContain('CORREO ELECTRÓNICO');
  });

  it('no exige modelo ni mes al cilindro anual, pero sí capacidad, año y series', () => {
    const errores = validarDatosEspecificos({
      tipo: 'GLP_ANUAL',
      modalidad: 'ANUAL',
      gnv: {},
      conformidad: {},
      glp: {
        tallerAutorizadoId: '10',
        fechaVigencia: '2027-10-13',
        componentes: [
          { ...componentes[0], modelo: '', mesFabricacion: '' },
          componentes[1],
        ],
        verificaciones,
      },
    });

    expect(errores['glp.componentes.CILINDRO.modelo']).toBeUndefined();
    expect(errores['glp.componentes.CILINDRO.mesFabricacion']).toBeUndefined();
    expect(errores).toEqual({});
  });
});
