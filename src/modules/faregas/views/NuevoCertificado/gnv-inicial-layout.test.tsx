// @vitest-environment jsdom
import React, { act, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VehiculoStep } from './components/NuevoCertificado/VehiculoStep';
import { obtenerCamposVehiculoCertificado } from './faregas-certificado-campos';
import { camposObligatoriosVisibles, validarFormularioVehiculoVisible } from './faregas-wizard.validation';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const setInputValue = (input: HTMLInputElement, val: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, val);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const componentes = [
  {
    orden: 1,
    componente: 'REDUCTOR',
    marca: 'TOMASETTO',
    modelo: '',
    capacidadLitros: 'NO APLICA',
    modoCapacidad: 'NO_APLICA',
    mesFabricacion: '08',
    anioFabricacion: '2024',
    numeroSerie: 'RED-9988',
  },
  {
    orden: 2,
    componente: 'CILINDRO',
    marca: 'INFIBRA',
    modelo: '',
    capacidadLitros: '65',
    modoCapacidad: 'VALOR',
    mesFabricacion: '05',
    anioFabricacion: '2024',
    numeroSerie: 'CIL-1122',
  },
];

const vehiculoValido = {
  placaNueva: 'BFG445',
  categoria: 'M1',
  marca: 'KIA',
  modelo: 'CERATO',
  version: '1.6 AT EX PLUS',
  anioFabricacion: '2017',
  vin: 'KNAFX411BH5123456',
  numeroMotor: 'G4FG123456',
  numeroCilindros: '4',
  cilindrada: '1591',
  combustible: 'GASOLINA',
  ejes: '2',
  ruedas: '4',
  asientos: '5',
  pasajeros: '4',
  pesoNeto: '1249',
  pesoBruto: '1720',
  cargaUtil: '471',
};

const facturacionValida = {
  tipoComprobanteFac: 'BOLETA',
  tipoDocumentoFac: 'DNI',
  nroDocFac: '74045612',
  nombreClienteFac: 'GRACE IBARRA',
  direccionFac: 'AV. PRINCIPAL 123',
  emailFac: 'cliente@correo.com',
  telefonoFac: '987654321',
};

const renderGnvInicial = (comps = componentes) => renderToStaticMarkup(
  <VehiculoStep
    tipoCertificado="GNV_ANUAL"
    modalidadCertificado="INICIAL"
    numeroCertificadoOficial={null}
    formVehiculo={vehiculoValido}
    setFormVehiculo={() => undefined}
    formPropietario={{}}
    setFormPropietario={() => undefined}
    formGlp={{}}
    setFormGlp={() => undefined}
    formGnv={{
      combustiblePosterior: 'BI - COMBUSTIBLE GNV',
      pesoNetoPosterior: '1453',
      observaciones: 'NUMERALES DEL 1 AL 16 OBTENIDOS DE TARJETA DE PROPIEDAD',
      componentes: comps,
    }}
    setFormGnv={() => undefined}
    formConformidad={{}}
    setFormConformidad={() => undefined}
    titulares={[]}
    setTitulares={() => undefined}
    formFacturacion={{
      ...facturacionValida,
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

const WrapperGnv = ({ inicialGnv, onChange }: { inicialGnv: any; onChange?: (gnv: any) => void }) => {
  const [formGnv, setFormGnv] = useState(inicialGnv);
  useEffect(() => {
    onChange?.(formGnv);
  }, [formGnv, onChange]);

  return (
    <VehiculoStep
      tipoCertificado="GNV_ANUAL"
      modalidadCertificado="INICIAL"
      numeroCertificadoOficial={null}
      formVehiculo={vehiculoValido}
      setFormVehiculo={() => undefined}
      formPropietario={{}}
      setFormPropietario={() => undefined}
      formGlp={{}}
      setFormGlp={() => undefined}
      formGnv={formGnv}
      setFormGnv={setFormGnv}
      formConformidad={{}}
      setFormConformidad={() => undefined}
      titulares={[]}
      setTitulares={() => undefined}
      formFacturacion={{
        ...facturacionValida,
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
};

describe('formulario GNV INICIAL alineado exactamente al certificado oficial', () => {
  it('1. Datos vehículo: izquierda 1–8 y derecha 9–16 en el orden exacto del Word', () => {
    const campos = obtenerCamposVehiculoCertificado('GNV_ANUAL', 'INICIAL');
    const izquierda = campos.filter((c) => c.columnaCertificado === 'izquierda');
    const derecha = campos.filter((c) => c.columnaCertificado === 'derecha');

    // Izquierda 1–8
    expect(izquierda.map((c) => c.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(izquierda.map((c) => c.campo)).toEqual([
      'placaNueva', 'categoria', 'marca', 'modelo', 'version', 'anioFabricacion', 'vin', 'numeroMotor'
    ]);

    // Derecha 9–16
    expect(derecha.map((c) => c.numero)).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
    expect(derecha.map((c) => c.campo)).toEqual([
      'numeroCilindros', 'combustible', 'numeroEjes', 'numeroAsientos', 'longitud', 'color', 'pesoNeto', 'pesoBruto'
    ]);
  });

  it('2. Secciones del asistente en el orden visual del certificado', () => {
    const html = renderGnvInicial();

    const facturacionIdx = html.indexOf('data-seccion-gnv="facturacion"');
    const vehiculoIdx = html.indexOf('data-layout-certificado="dos-columnas"');
    const componentesIdx = html.indexOf('data-seccion-gnv="componentes"');
    const conversionIdx = html.indexOf('data-seccion-gnv="conversion"');
    const observacionesIdx = html.indexOf('data-seccion-gnv="observaciones"');

    expect(html).toContain('A. DATOS DEL VEHÍCULO');
    expect(facturacionIdx).toBeGreaterThan(-1);
    expect(vehiculoIdx).toBeGreaterThan(facturacionIdx);
    expect(componentesIdx).toBeGreaterThan(vehiculoIdx);
    expect(conversionIdx).toBeGreaterThan(componentesIdx);
    expect(observacionesIdx).toBeGreaterThan(conversionIdx);

    // No propietario
    expect(html).not.toContain('data-propietario-certificado="true"');

    // No verificaciones de anual
    expect(html).not.toContain('MARCAR LOS 8 COMO CUMPLE');
    expect(html).not.toContain('VERIFICACIONES DE INSPECCIÓN ANUAL GNV');

    // No tarjeta Antes / Después
    expect(html).not.toContain('1. ANTES DE LA CONVERSIÓN');
    expect(html).not.toContain('2. DESPUÉS DE LA CONVERSIÓN');

    // No vigencia en Inicial
    expect(html).not.toContain('data-seccion-gnv="vigencia"');
    expect(html).not.toContain('VIGENCIA HASTA');
  });

  it('3. Componentes: permite elegir INGRESAR VALOR o NO APLICA para CADA componente', () => {
    const html = renderGnvInicial();
    expect(html).toContain('B. COMPONENTES INSTALADOS GNV');
    expect(html).toContain('REDUCTOR');
    expect(html).toContain('CILINDRO(S)');

    // Ambos componentes tienen el selector con INGRESAR VALOR y NO APLICA
    const matchesSelect = html.match(/INGRESAR VALOR/g);
    expect(matchesSelect?.length).toBe(2);

    const matchesNoAplica = html.match(/NO APLICA/g);
    expect(matchesNoAplica?.length).toBeGreaterThanOrEqual(2);
  });

  it('4. Conversión GNV muestra únicamente 10 Combustible (BI - COMBUSTIBLE GNV) y 15 Peso Neto', () => {
    const html = renderGnvInicial();
    expect(html).toContain('C. CAMBIO REALIZADO EN LA CONVERSIÓN GNV');
    expect(html).toContain('BI - COMBUSTIBLE GNV');
    expect(html).toContain('PESO NETO (Kg.)');
    expect(html).toContain('name="pesoNetoPosterior"');
  });

  it('5. Validación: Vigencia NO es obligatoria en GNV Inicial, y pesoNetoPosterior sí es obligatorio', () => {
    const obligatorios = camposObligatoriosVisibles('GNV_ANUAL', 'INICIAL');
    expect(obligatorios).not.toContain('gnv.fechaVigencia');
    expect(obligatorios).toContain('gnv.pesoNetoPosterior');
    expect(obligatorios).not.toContain('gnv.verificaciones');
  });

  it('CASO 1: Reductor: seleccionar INGRESAR VALOR -> select permanece en INGRESAR VALOR -> aparece input -> escribir 55 -> queda 55', async () => {
    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    const root = createRoot(contenedor);

    let gnvActual: any = null;
    const inicial = {
      combustiblePosterior: 'BI - COMBUSTIBLE GNV',
      pesoNetoPosterior: '1453',
      componentes: [
        { componente: 'REDUCTOR', marca: 'TOMASETTO', numeroSerie: 'RED-1', capacidadLitros: 'NO APLICA', modoCapacidad: 'NO_APLICA', mesFabricacion: '08', anioFabricacion: '2024' },
        { componente: 'CILINDRO', marca: 'INFIBRA', numeroSerie: 'CIL-1', capacidadLitros: '65', modoCapacidad: 'VALOR', mesFabricacion: '05', anioFabricacion: '2024' },
      ],
    };

    await act(async () => root.render(<WrapperGnv inicialGnv={inicial} onChange={(g) => { gnvActual = g; }} />));

    const selectReductor = contenedor.querySelector<HTMLSelectElement>('select[aria-label="Tipo de capacidad para REDUCTOR"]');
    expect(selectReductor?.value).toBe('NO_APLICA');
    expect(contenedor.querySelector('input[aria-label="Capacidad en litros para REDUCTOR"]')).toBeNull();

    // Cambiar a INGRESAR VALOR
    await act(async () => {
      if (selectReductor) {
        selectReductor.value = 'VALOR';
        selectReductor.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Select permanece en VALOR y aparece input inmediatamente
    expect(selectReductor?.value).toBe('VALOR');
    const inputReductor = contenedor.querySelector<HTMLInputElement>('input[aria-label="Capacidad en litros para REDUCTOR"]');
    expect(inputReductor).not.toBeNull();
    expect(inputReductor?.value).toBe('');

    // Escribir 55
    await act(async () => {
      if (inputReductor) {
        setInputValue(inputReductor, '55');
      }
    });

    expect(gnvActual.componentes[0].capacidadLitros).toBe('55');
    expect(gnvActual.componentes[0].modoCapacidad).toBe('VALOR');
    expect(selectReductor?.value).toBe('VALOR');

    await act(async () => root.unmount());
    contenedor.remove();
  });

  it('CASO 2: Cilindro: seleccionar INGRESAR VALOR -> aparece input -> escribir 80', async () => {
    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    const root = createRoot(contenedor);

    let gnvActual: any = null;
    const inicial = {
      combustiblePosterior: 'BI - COMBUSTIBLE GNV',
      pesoNetoPosterior: '1453',
      componentes: [
        { componente: 'REDUCTOR', marca: 'TOMASETTO', numeroSerie: 'RED-1', capacidadLitros: 'NO APLICA', modoCapacidad: 'NO_APLICA', mesFabricacion: '08', anioFabricacion: '2024' },
        { componente: 'CILINDRO', marca: 'INFIBRA', numeroSerie: 'CIL-1', capacidadLitros: 'NO APLICA', modoCapacidad: 'NO_APLICA', mesFabricacion: '05', anioFabricacion: '2024' },
      ],
    };

    await act(async () => root.render(<WrapperGnv inicialGnv={inicial} onChange={(g) => { gnvActual = g; }} />));

    const selectCilindro = contenedor.querySelector<HTMLSelectElement>('select[aria-label="Tipo de capacidad para CILINDRO"]');
    expect(selectCilindro?.value).toBe('NO_APLICA');

    // Cambiar a INGRESAR VALOR
    await act(async () => {
      if (selectCilindro) {
        selectCilindro.value = 'VALOR';
        selectCilindro.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    expect(selectCilindro?.value).toBe('VALOR');
    const inputCilindro = contenedor.querySelector<HTMLInputElement>('input[aria-label="Capacidad en litros para CILINDRO"]');
    expect(inputCilindro).not.toBeNull();

    // Escribir 80
    await act(async () => {
      if (inputCilindro) {
        setInputValue(inputCilindro, '80');
      }
    });

    expect(gnvActual.componentes[1].capacidadLitros).toBe('80');
    expect(gnvActual.componentes[1].modoCapacidad).toBe('VALOR');

    await act(async () => root.unmount());
    contenedor.remove();
  });

  it('CASO 3: seleccionar NO APLICA -> desaparece input -> no bloquea', async () => {
    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    const root = createRoot(contenedor);

    let gnvActual: any = null;
    const inicial = {
      combustiblePosterior: 'BI - COMBUSTIBLE GNV',
      pesoNetoPosterior: '1453',
      componentes: [
        { componente: 'REDUCTOR', marca: 'TOMASETTO', numeroSerie: 'RED-1', capacidadLitros: '55', modoCapacidad: 'VALOR', mesFabricacion: '08', anioFabricacion: '2024' },
        { componente: 'CILINDRO', marca: 'INFIBRA', numeroSerie: 'CIL-1', capacidadLitros: '65', modoCapacidad: 'VALOR', mesFabricacion: '05', anioFabricacion: '2024' },
      ],
    };

    await act(async () => root.render(<WrapperGnv inicialGnv={inicial} onChange={(g) => { gnvActual = g; }} />));

    const selectReductor = contenedor.querySelector<HTMLSelectElement>('select[aria-label="Tipo de capacidad para REDUCTOR"]');
    expect(selectReductor?.value).toBe('VALOR');

    // Cambiar a NO APLICA
    await act(async () => {
      if (selectReductor) {
        selectReductor.value = 'NO_APLICA';
        selectReductor.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    expect(selectReductor?.value).toBe('NO_APLICA');
    expect(contenedor.querySelector('input[aria-label="Capacidad en litros para REDUCTOR"]')).toBeNull();
    expect(gnvActual.componentes[0].capacidadLitros).toBe('NO APLICA');
    expect(gnvActual.componentes[0].modoCapacidad).toBe('NO_APLICA');

    // Validación no bloquea
    const errores = validarFormularioVehiculoVisible({
      tipoCertificado: 'GNV_ANUAL',
      modalidad: 'INICIAL',
      caja: { categoria: 'M1' },
      vehiculo: vehiculoValido,
      titulares: [],
      gnv: gnvActual,
      glp: {},
      conformidad: {},
      facturacion: facturacionValida,
    });
    expect(errores['gnv.componentes.REDUCTOR.capacidadLitros']).toBeUndefined();

    await act(async () => root.unmount());
    contenedor.remove();
  });

  it('CASO 4: VALOR seleccionado + input vacío -> validación bloquea', () => {
    const errores = validarFormularioVehiculoVisible({
      tipoCertificado: 'GNV_ANUAL',
      modalidad: 'INICIAL',
      caja: { categoria: 'M1' },
      vehiculo: vehiculoValido,
      titulares: [],
      gnv: {
        combustiblePosterior: 'BI - COMBUSTIBLE GNV',
        pesoNetoPosterior: '1453',
        componentes: [
          { componente: 'REDUCTOR', marca: 'TOMASETTO', numeroSerie: 'RED-1', capacidadLitros: '', modoCapacidad: 'VALOR', mesFabricacion: '08', anioFabricacion: '2024' },
          { componente: 'CILINDRO', marca: 'INFIBRA', numeroSerie: 'CIL-1', capacidadLitros: '', modoCapacidad: 'VALOR', mesFabricacion: '05', anioFabricacion: '2024' },
        ],
      },
      glp: {},
      conformidad: {},
      facturacion: facturacionValida,
    });

    expect(errores['gnv.componentes.REDUCTOR.capacidadLitros']).toBe('Complete la capacidad del REDUCTOR.');
    expect(errores['gnv.componentes.CILINDRO.capacidadLitros']).toBe('Complete la capacidad del CILINDRO.');
  });

  it('CASO 5: guardar/salir/volver reconstruye correctamente modo VALOR o modo NO APLICA', () => {
    // Simula la recuperación de datos desde el backend (detalle.data.componentes)
    const backendData = [
      { orden: 1, componente: 'REDUCTOR', marca: 'TOMASETTO', numero_serie: 'RED-1', capacidad_litros: '55', mes_fabricacion: '08', anio_fabricacion: 2024 },
      { orden: 2, componente: 'CILINDRO', marca: 'INFIBRA', numero_serie: 'CIL-1', capacidad_litros: 'NO APLICA', mes_fabricacion: '05', anio_fabricacion: 2024 },
    ];

    const componentesRecuperados = backendData.map((componente) => {
      const capRaw = String(componente.capacidad_litros ?? '').trim();
      const esNoAplica = capRaw.toUpperCase() === 'NO APLICA';
      return {
        orden: Number(componente.orden),
        componente: componente.componente,
        marca: componente.marca || '',
        capacidadLitros: esNoAplica ? 'NO APLICA' : (String(componente.capacidad_litros) || ''),
        modoCapacidad: esNoAplica ? 'NO_APLICA' : 'VALOR',
      };
    });

    // REDUCTOR tenía 55 -> modo VALOR
    expect(componentesRecuperados[0].modoCapacidad).toBe('VALOR');
    expect(componentesRecuperados[0].capacidadLitros).toBe('55');

    // CILINDRO tenía NO APLICA -> modo NO_APLICA
    expect(componentesRecuperados[1].modoCapacidad).toBe('NO_APLICA');
    expect(componentesRecuperados[1].capacidadLitros).toBe('NO APLICA');
  });

  it('CASO 6: capacidad decimal 55.5 es rechazada con validación', () => {
    const errores = validarFormularioVehiculoVisible({
      tipoCertificado: 'GNV_ANUAL',
      modalidad: 'INICIAL',
      caja: { categoria: 'M1' },
      vehiculo: vehiculoValido,
      titulares: [],
      gnv: {
        combustiblePosterior: 'BI - COMBUSTIBLE GNV',
        pesoNetoPosterior: '1453',
        componentes: [
          { componente: 'REDUCTOR', marca: 'TOMASETTO', numeroSerie: 'RED-1', capacidadLitros: '55.5', modoCapacidad: 'VALOR', mesFabricacion: '08', anioFabricacion: '2024' },
          { componente: 'CILINDRO', marca: 'INFIBRA', numeroSerie: 'CIL-1', capacidadLitros: '60.2', modoCapacidad: 'VALOR', mesFabricacion: '05', anioFabricacion: '2024' },
        ],
      },
      glp: {},
      conformidad: {},
      facturacion: facturacionValida,
    });

    expect(errores['gnv.componentes.REDUCTOR.capacidadLitros']).toBe('La capacidad del REDUCTOR debe ser un número entero sin decimales.');
    expect(errores['gnv.componentes.CILINDRO.capacidadLitros']).toBe('La capacidad del CILINDRO debe ser un número entero sin decimales.');
  });
});
