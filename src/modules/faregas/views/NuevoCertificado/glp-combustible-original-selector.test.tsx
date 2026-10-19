import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CombustibleOriginalSelect } from './components/NuevoCertificado/CombustibleOriginalSelect';
import { VehiculoStep } from './components/NuevoCertificado/VehiculoStep';
import { validarFormularioVehiculoVisible } from './faregas-wizard.validation';
import type { MaestroOption } from '@/types/maestros';

const catalogoSimulado: MaestroOption[] = [
  { key: '1', nombre: 'GASOLINA' },
  { key: '2', nombre: 'DIESEL' },
  { key: '3', nombre: 'GAS NATURAL' },
  { key: '4', nombre: 'GASOHOL' },
  { key: '5', nombre: 'BI-COMBUSTIBLE GLP' },
  { key: '6', nombre: 'BI COMBUSTIBLE/GLP' },
  { key: '7', nombre: 'BI COMBUSTIBLE/GNV' },
  { key: '8', nombre: 'GLP' },
];

describe('GLP INICIAL - Selector de Combustible Original (Exclusivo GASOLINA o DIESEL)', () => {
  it('Requisito 1: exclusivamente en GLP INICIAL muestra solo GASOLINA y DIESEL en las opciones', () => {
    const html = renderToStaticMarkup(
      <CombustibleOriginalSelect
        value=""
        onChange={() => undefined}
        combustibles={catalogoSimulado}
        esGlpInicial={true}
      />
    );

    expect(html).toContain('data-campo-combustible-original="true"');
    expect(html).toContain('combustible-original-select');
    expect(html).toContain('Buscar o seleccionar combustible...');

    // No incluye combustibles no permitidos
    expect(html).not.toContain('BI-COMBUSTIBLE GLP');
    expect(html).not.toContain('BI COMBUSTIBLE/GLP');
    expect(html).not.toContain('BI COMBUSTIBLE/GNV');
    expect(html).not.toContain('GAS NATURAL');
    expect(html).not.toContain('GASOHOL');
  });

  it('Requisito 4 y 6: GASOLINA es un valor válido, se selecciona y se mantiene en el input oculto', () => {
    const html = renderToStaticMarkup(
      <CombustibleOriginalSelect
        value="GASOLINA"
        onChange={() => undefined}
        combustibles={catalogoSimulado}
        esGlpInicial={true}
      />
    );

    expect(html).toContain('value="GASOLINA"');
    expect(html).toContain('GASOLINA');
    expect(html).not.toContain('no es válido para GLP INICIAL');
  });

  it('Requisito 4 y 6: DIESEL es un valor válido, se selecciona y se mantiene en el input oculto', () => {
    const html = renderToStaticMarkup(
      <CombustibleOriginalSelect
        value="DIESEL"
        onChange={() => undefined}
        combustibles={catalogoSimulado}
        esGlpInicial={true}
      />
    );

    expect(html).toContain('value="DIESEL"');
    expect(html).toContain('DIESEL');
    expect(html).not.toContain('no es válido para GLP INICIAL');
  });

  it('Requisito 5: un borrador antiguo con valor inválido (GLP o GNV) no se reemplaza silenciosamente y avisa al operador', () => {
    const htmlGlp = renderToStaticMarkup(
      <CombustibleOriginalSelect
        value="GLP"
        onChange={() => undefined}
        combustibles={catalogoSimulado}
        esGlpInicial={true}
      />
    );

    // Mantiene el valor en el input sin sobreescribirlo silenciosamente
    expect(htmlGlp).toContain('value="GLP"');
    // Muestra aviso funcional de advertencia indicando que debe elegir GASOLINA o DIESEL
    expect(htmlGlp).toContain('no es válido para GLP INICIAL. Debe seleccionar GASOLINA o DIESEL');

    const htmlGnv = renderToStaticMarkup(
      <CombustibleOriginalSelect
        value="BI COMBUSTIBLE/GNV"
        onChange={() => undefined}
        combustibles={catalogoSimulado}
        esGlpInicial={true}
      />
    );

    expect(htmlGnv).toContain('value="BI COMBUSTIBLE/GNV"');
    expect(htmlGnv).toContain('no es válido para GLP INICIAL. Debe seleccionar GASOLINA o DIESEL');
  });

  it('Requisito 3: otros flujos (no GLP INICIAL) conservan su catálogo general', () => {
    const htmlGeneral = renderToStaticMarkup(
      <CombustibleOriginalSelect
        value="GAS NATURAL"
        onChange={() => undefined}
        combustibles={catalogoSimulado}
        esGlpInicial={false}
      />
    );

    expect(htmlGeneral).toContain('value="GAS NATURAL"');
    expect(htmlGeneral).toContain('GAS NATURAL');
    expect(htmlGeneral).not.toContain('no es válido para GLP INICIAL');
  });

  it('Requisito 4: validación frontend para GLP INICIAL exige GASOLINA o DIESEL y rechaza vacíos o inválidos', () => {
    // Caso vacío
    const erroresVacio = validarFormularioVehiculoVisible({
      tipoCertificado: 'GLP_ANUAL',
      modalidad: 'INICIAL',
      caja: { placa: 'ABC-123', categoria: 'M1' } as any,
      vehiculo: {
        marca: 'TOYOTA',
        modelo: 'YARIS',
        anioFabricacion: '2020',
        numeroMotor: '1NZ123',
        numeroCilindros: '4',
        combustible: '', // VACÍO
        numeroEjes: '2',
        numeroRuedas: '4',
        numeroAsientos: '5',
        numeroPasajeros: '4',
        longitud: '4.3',
        ancho: '1.69',
        alto: '1.46',
        pesoNeto: '1301',
        pesoBruto: '1450',
        vin: '12345678901234567',
      } as any,
      titulares: [],
      gnv: {},
      glp: {},
      conformidad: {},
      facturacion: {} as any,
    });
    expect(erroresVacio.combustible).toBeDefined();

    // Caso inválido (GLP o GNV antiguo)
    const erroresInvalido = validarFormularioVehiculoVisible({
      tipoCertificado: 'GLP_ANUAL',
      modalidad: 'INICIAL',
      caja: { placa: 'ABC-123', categoria: 'M1' } as any,
      vehiculo: {
        marca: 'TOYOTA',
        modelo: 'YARIS',
        anioFabricacion: '2020',
        numeroMotor: '1NZ123',
        numeroCilindros: '4',
        combustible: 'GLP', // INVÁLIDO EN GLP INICIAL
        numeroEjes: '2',
        numeroRuedas: '4',
        numeroAsientos: '5',
        numeroPasajeros: '4',
        longitud: '4.3',
        ancho: '1.69',
        alto: '1.46',
        pesoNeto: '1301',
        pesoBruto: '1450',
        vin: '12345678901234567',
      } as any,
      titulares: [],
      gnv: {},
      glp: {},
      conformidad: {},
      facturacion: {} as any,
    });
    expect(erroresInvalido.combustible).toBe('Para GLP INICIAL, el combustible original debe ser GASOLINA o DIESEL.');

    // Caso válido: GASOLINA
    const erroresGasolina = validarFormularioVehiculoVisible({
      tipoCertificado: 'GLP_ANUAL',
      modalidad: 'INICIAL',
      caja: { placa: 'ABC-123', categoria: 'M1' } as any,
      vehiculo: {
        marca: 'TOYOTA',
        modelo: 'YARIS',
        anioFabricacion: '2020',
        numeroMotor: '1NZ123',
        numeroCilindros: '4',
        combustible: 'GASOLINA',
        numeroEjes: '2',
        numeroRuedas: '4',
        numeroAsientos: '5',
        numeroPasajeros: '4',
        longitud: '4.3',
        ancho: '1.69',
        alto: '1.46',
        pesoNeto: '1301',
        pesoBruto: '1450',
        vin: '12345678901234567',
      } as any,
      titulares: [],
      gnv: {},
      glp: {},
      conformidad: {},
      facturacion: {} as any,
    });
    expect(erroresGasolina.combustible).toBeUndefined();

    // Caso válido: DIESEL
    const erroresDiesel = validarFormularioVehiculoVisible({
      tipoCertificado: 'GLP_ANUAL',
      modalidad: 'INICIAL',
      caja: { placa: 'ABC-123', categoria: 'M1' } as any,
      vehiculo: {
        marca: 'TOYOTA',
        modelo: 'YARIS',
        anioFabricacion: '2020',
        numeroMotor: '1NZ123',
        numeroCilindros: '4',
        combustible: 'DIESEL',
        numeroEjes: '2',
        numeroRuedas: '4',
        numeroAsientos: '5',
        numeroPasajeros: '4',
        longitud: '4.3',
        ancho: '1.69',
        alto: '1.46',
        pesoNeto: '1301',
        pesoBruto: '1450',
        vin: '12345678901234567',
      } as any,
      titulares: [],
      gnv: {},
      glp: {},
      conformidad: {},
      facturacion: {} as any,
    });
    expect(erroresDiesel.combustible).toBeUndefined();
  });

  it('Requisito 7: VehiculoStep en GLP INICIAL integra el selector restringido en la columna derecha', () => {
    const html = renderToStaticMarkup(
      <VehiculoStep
        tipoCertificado="GLP_ANUAL"
        modalidadCertificado="INICIAL"
        numeroCertificadoOficial="EXP-2026-001"
        formVehiculo={{
          placaNueva: 'ABC-123',
          marca: 'TOYOTA',
          modelo: 'YARIS',
          version: 'XLI',
          anioFabricacion: '2020',
          vin: '12345678901234567',
          numeroMotor: '1NZ123',
          combustible: 'GASOLINA',
          numeroCilindros: '4',
          cilindrada: '1500',
          numeroEjes: '2',
          numeroRuedas: '4',
          numeroAsientos: '5',
          numeroPasajeros: '4',
          longitud: '4.30',
          ancho: '1.69',
          alto: '1.46',
          pesoNeto: '1301',
          pesoBruto: '1450',
          cargaUtil: '149',
        }}
        setFormVehiculo={() => undefined}
        formPropietario={{}}
        setFormPropietario={() => undefined}
        formGlp={{
          fechaVigencia: '2027-10-13',
          expedienteTecnico: 'EXP-2026-001',
          pesoNetoPosterior: '1301',
          cargaUtilPosterior: '149',
          componentes: [],
          verificaciones: [],
        }}
        setFormGlp={() => undefined}
        formGnv={{}}
        setFormGnv={() => undefined}
        formConformidad={{}}
        setFormConformidad={() => undefined}
        titulares={[]}
        setTitulares={() => undefined}
        formFacturacion={{
          tipoDocFac: 'BOLETA',
          nroDocFac: '74045612',
          razonSocialFac: 'CLIENTE PRUEBA',
          direccionFac: 'AV. PRUEBA 123',
          emailFac: 'cliente@correo.com',
          telefonoFac: '987654321',
          usarTitularPrincipalFac: false,
        } as any}
        setFormFacturacion={() => undefined}
        maestrosVehiculo={{ combustibles: catalogoSimulado }}
        categoriaVehicular="M1"
        categoriasVehiculares={[{ key: 'M1', nombre: 'M1' }]}
        onCategoriaVehicularChange={() => undefined}
      />
    );

    expect(html).toContain('data-campo-combustible-original="true"');
    expect(html).toContain('combustible-original-select');
    expect(html).toContain('11. COMBUSTIBLE ORIGINAL');
    expect(html).toContain('value="GASOLINA"');
  });
});
