import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VehiculoStep } from './components/NuevoCertificado/VehiculoStep';
import { obtenerCamposVehiculoCertificado } from './faregas-certificado-campos';
import { validarDatosEspecificos } from './faregas-wizard.validation';

const formVehiculo = {
  placaNueva: 'ABC123',
  categoria: 'M1',
  marca: 'NISSAN',
  modelo: 'SENTRA',
  version: 'ADVANCE',
  anioFabricacion: '2018',
  vin: '3N1123456789',
  numeroMotor: 'MR20-123456',
  numeroCilindros: '4',
  cilindrada: '1997',
  combustible: 'GASOLINA',
  numeroEjes: '2',
  numeroRuedas: '4',
  numeroAsientos: '5',
  numeroPasajeros: '4',
  longitud: '4.63',
  ancho: '1.76',
  alto: '1.50',
  pesoNeto: '1280',
  pesoBruto: '1690',
  cargaUtil: '410',
};

const componentes = [
  {
    componente: 'CILINDRO',
    marca: 'CILINDROS DEL SUR',
    modelo: '',
    capacidadLitros: '48',
    mesFabricacion: '',
    anioFabricacion: '2025',
    numeroSerie: 'CIL-9988',
  },
  {
    componente: 'REGULADOR',
    marca: 'REGULADORES SAC',
    modelo: 'TOMAS-AT09',
    numeroSerie: 'REG-1122',
  },
];

const verificaciones = Array.from({ length: 7 }, (_, indice) => ({
  codigo: String(indice + 1),
  descripcion: `VERIFICACIÓN ${indice + 1}`,
  cumple: true,
  observacion: '',
}));

const renderGlpInicial = () => renderToStaticMarkup(
  <VehiculoStep
    tipoCertificado="GLP_ANUAL"
    modalidadCertificado="INICIAL"
    numeroCertificadoOficial="EXP-2026-001"
    formVehiculo={formVehiculo}
    setFormVehiculo={() => undefined}
    formPropietario={{}}
    setFormPropietario={() => undefined}
    formGlp={{
      fechaVigencia: '2027-10-13',
      expedienteTecnico: 'EXP-2026-001',
      pesoNetoPosterior: '1330',
      cargaUtilPosterior: '360',
      componentes,
      verificaciones,
    }}
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
      nombreRazonSocial: 'JUAN PEREZ DUEÑO',
      direccion: 'AV. COLONIAL 100',
    }]}
    setTitulares={() => undefined}
    formFacturacion={{
      tipoDocFac: 'BOLETA',
      nroDocFac: '74045612',
      razonSocialFac: 'JUAN PEREZ DUEÑO',
      direccionFac: 'AV. COLONIAL 100',
      emailFac: 'jperez@correo.com',
      telefonoFac: '987654321',
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

describe('formulario GLP INICIAL alineado al certificado real', () => {
  it('organiza los campos del vehículo en dos columnas siguiendo el certificado (2-9 izq, 10-17 der)', () => {
    const campos = obtenerCamposVehiculoCertificado('GLP_ANUAL', 'INICIAL');
    const izquierda = campos.filter((c) => c.columnaCertificado === 'izquierda');
    const derecha = campos.filter((c) => c.columnaCertificado === 'derecha');

    expect(izquierda.map((c) => c.numero)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(derecha.map((c) => c.numero)).toEqual([10, 11, 12, 13, 14, 15, 16, 17]);
    expect(derecha[1].campo).toBe('combustible');
    expect(derecha[1].etiqueta).toBe('COMBUSTIBLE ORIGINAL');
  });

  it('respeta el orden físico estricto de las secciones: Propietario -> Vehículo -> Componentes -> Conversión -> Verificaciones -> Vigencia/Expediente -> Facturación', () => {
    const html = renderGlpInicial();

    const propietarioIndex = html.indexOf('data-seccion-glp-inicial="propietario"');
    const vehiculoIndex = html.indexOf('data-layout-certificado="dos-columnas"');
    const componentesIndex = html.indexOf('data-seccion-glp-inicial="componentes"');
    const conversionIndex = html.indexOf('data-seccion-glp-inicial="conversion"');
    const verificacionesIndex = html.indexOf('data-seccion-glp-inicial="verificaciones"');
    const vigenciaExpedienteIndex = html.indexOf('data-seccion-glp-inicial="vigencia-expediente"');
    const facturacionIndex = html.indexOf('data-seccion-glp-inicial="facturacion"');

    expect(propietarioIndex).toBeGreaterThan(-1);
    expect(vehiculoIndex).toBeGreaterThan(propietarioIndex);
    expect(componentesIndex).toBeGreaterThan(vehiculoIndex);
    expect(conversionIndex).toBeGreaterThan(componentesIndex);
    expect(verificacionesIndex).toBeGreaterThan(conversionIndex);
    expect(vigenciaExpedienteIndex).toBeGreaterThan(verificacionesIndex);
    expect(facturacionIndex).toBeGreaterThan(vigenciaExpedienteIndex);

    // Los encabezados coinciden
    expect(html).toContain('A. DATOS DEL CERTIFICADO / VEHÍCULO');
    expect(html).toContain('B. COMPONENTES INSTALADOS GLP');
    expect(html).toContain('C. CAMBIO REALIZADO EN LA CONVERSIÓN GLP');
    expect(html).toContain('D. VERIFICACIONES DE SEGURIDAD GLP');
    expect(html).toContain('E. VIGENCIA / EXPEDIENTE');
    expect(html).toContain('F. DATOS PARA FACTURACIÓN');
  });

  it('componentes están antes de conversión y la fila del cilindro es compacta (sin Mes ni Modelo redundante)', () => {
    const html = renderGlpInicial();

    const componentesPos = html.indexOf('B. COMPONENTES INSTALADOS GLP');
    const conversionPos = html.indexOf('C. CAMBIO REALIZADO EN LA CONVERSIÓN GLP');
    expect(componentesPos).toBeLessThan(conversionPos);

    // Cilindro compacto
    expect(html).toContain('CAPACIDAD (L)');
    expect(html).toContain('value="48"');
    expect(html).toContain('value="2025"');
    expect(html).not.toContain('>MES');
    expect(html).not.toContain('Modelo (ej: Cilíndrico / Toroidal)');
    expect(html).not.toContain('Impresión en certificado');

    // Regulador compacto
    expect(html).toContain('placeholder="Modelo del regulador"');
    expect(html).toContain('value="TOMAS-AT09"');
    expect(html).toContain('value="REG-1122"');
  });

  it('conversión no vuelve a pedir ni repetir los datos originales y muestra sólo las 3 filas del certificado', () => {
    const html = renderGlpInicial();

    // No existen columnas de comparación antes/después
    expect(html).not.toContain('ANTES DE LA CONVERSIÓN');
    expect(html).not.toContain('DESPUÉS DE LA CONVERSIÓN');

    // La sección de conversión existe y tiene estructura N° | CARACTERÍSTICA | VALOR
    const conversionSection = html.slice(
      html.indexOf('data-seccion-glp-inicial="conversion"'),
      html.indexOf('data-seccion-glp-inicial="verificaciones"')
    );

    // No repite los valores originales del vehículo dentro de la sección de conversión
    expect(conversionSection).not.toContain('GASOLINA');
    expect(conversionSection).not.toContain('1280');
    expect(conversionSection).not.toContain('410');

    // Muestra las 3 filas exactas del certificado
    expect(conversionSection).toContain('Combustible');
    expect(conversionSection).toContain('BI-COMBUSTIBLE GLP');
    expect(conversionSection).toContain('Peso neto (Kg.)');
    expect(conversionSection).toContain('name="pesoNetoPosterior"');
    expect(conversionSection).toContain('Carga útil (Kg.)');
    expect(conversionSection).toContain('name="cargaUtilPosterior"');

    // En el documento global los datos del vehículo se mantienen en la sección 2-17
    expect(html).toContain('GASOLINA');
    expect(html).toContain('1280');
  });

  it('facturación aparece UNA SOLA VEZ al final del formulario', () => {
    const html = renderGlpInicial();

    const matchesHeader = (html.match(/DATOS PARA FACTURACIÓN/g) || []).length;
    expect(matchesHeader).toBe(1);

    const matchesComprobante = (html.match(/TIPO DE COMPROBANTE/g) || []).length;
    expect(matchesComprobante).toBe(1);

    const matchesEmail = (html.match(/CORREO ELECTRÓNICO/g) || []).length;
    expect(matchesEmail).toBe(1);
  });

  it('validación GLP Inicial no exige modelo ni mes en cilindro, pero sí capacidad, año, series y expediente', () => {
    const errores = validarDatosEspecificos({
      tipo: 'GLP_ANUAL',
      modalidad: 'INICIAL',
      gnv: {},
      conformidad: {},
      glp: {
        tallerAutorizadoId: '10',
        fechaVigencia: '2027-10-13',
        expedienteTecnico: 'EXP-123',
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
