import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { CombustibleOriginalSelect } from './components/NuevoCertificado/CombustibleOriginalSelect';
import { VehiculoStep } from './components/NuevoCertificado/VehiculoStep';
import { validarFormularioVehiculoVisible } from './faregas-wizard.validation';
import { combustiblesSonEquivalentes } from './gnv-conversion';
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

describe('GLP INICIAL - Selector buscable Combustible Original', () => {
  it('Caso 1 y 2: renderiza selector y excluye estrictamente BI-COMBUSTIBLE GLP y sus variantes', () => {
    const html = renderToStaticMarkup(
      <CombustibleOriginalSelect
        value=""
        onChange={() => undefined}
        combustibles={catalogoSimulado}
      />
    );

    expect(html).toContain('data-campo-combustible-original="true"');
    expect(html).toContain('combustible-original-select');
    expect(html).toContain('Buscar o seleccionar combustible...');

    // BI-COMBUSTIBLE GLP y BI COMBUSTIBLE/GLP están terminantemente excluidos
    expect(html).not.toContain('BI-COMBUSTIBLE GLP');
    expect(html).not.toContain('BI COMBUSTIBLE/GLP');
  });

  it('Caso 2b: el detector de equivalencia reconoce y bloquea todas las formas de BI-COMBUSTIBLE GLP', () => {
    expect(combustiblesSonEquivalentes('BI-COMBUSTIBLE GLP', 'BI-COMBUSTIBLE GLP')).toBe(true);
    expect(combustiblesSonEquivalentes('BI COMBUSTIBLE/GLP', 'BI-COMBUSTIBLE GLP')).toBe(true);
    expect(combustiblesSonEquivalentes('BI - COMBUSTIBLE GLP', 'BI-COMBUSTIBLE GLP')).toBe(true);
    expect(combustiblesSonEquivalentes('BICOMBUSTIBLE GLP', 'BI-COMBUSTIBLE GLP')).toBe(true);

    // No excluye otros combustibles válidos
    expect(combustiblesSonEquivalentes('GASOLINA', 'BI-COMBUSTIBLE GLP')).toBe(false);
    expect(combustiblesSonEquivalentes('DIESEL', 'BI-COMBUSTIBLE GLP')).toBe(false);
    expect(combustiblesSonEquivalentes('BI COMBUSTIBLE/GNV', 'BI-COMBUSTIBLE GLP')).toBe(false);
    expect(combustiblesSonEquivalentes('GAS NATURAL', 'BI-COMBUSTIBLE GLP')).toBe(false);
  });

  it('Caso 3 y 4: maneja valor seleccionado válido (GASOLINA) en input oculto y singleValue', () => {
    const html = renderToStaticMarkup(
      <CombustibleOriginalSelect
        value="GASOLINA"
        onChange={() => undefined}
        combustibles={catalogoSimulado}
      />
    );

    expect(html).toContain('value="GASOLINA"');
    expect(html).toContain('GASOLINA');
    // Sin advertencia ya que existe en catálogo
    expect(html).not.toContain('no figura en el catálogo activo');
  });

  it('Caso 5: conserva borrador existente con combustible válido como "BI COMBUSTIBLE/GNV"', () => {
    const html = renderToStaticMarkup(
      <CombustibleOriginalSelect
        value="BI COMBUSTIBLE/GNV"
        onChange={() => undefined}
        combustibles={catalogoSimulado}
      />
    );

    expect(html).toContain('value="BI COMBUSTIBLE/GNV"');
    expect(html).toContain('BI COMBUSTIBLE/GNV');
    expect(html).not.toContain('no figura en el catálogo activo');
  });

  it('Caso 5b: si existe un valor antiguo no presente en catálogo, lo preserva y muestra aviso informativo', () => {
    const html = renderToStaticMarkup(
      <CombustibleOriginalSelect
        value="KEROSENE MOTOR"
        onChange={() => undefined}
        combustibles={catalogoSimulado}
      />
    );

    expect(html).toContain('value="KEROSENE MOTOR"');
    expect(html).toContain('KEROSENE MOTOR');
    expect(html).toContain('no figura en el catálogo activo');
    expect(html).toContain('Se conserva visualmente');
  });

  it('Caso 6: dejar vacío el combustible es bloqueado por la validación del wizard', () => {
    const errores = validarFormularioVehiculoVisible({
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

    expect(errores.combustible).toBeDefined();
  });

  it('Caso 7: VehiculoStep en GLP INICIAL integra el selector en la columna derecha de datos técnicos', () => {
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
        }}
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
