// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DescuentosView } from './DescuentosView';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type ReglaFila = {
  descuentoId: number;
  plantaKey: string;
  servicioId: number;
  tipoCalculo: string;
  valor: unknown;
  valorContado: unknown;
  valorCredito: unknown;
  activo: boolean;
};

const h = vi.hoisted(() => ({
  payload: null as null | { id: number; data: { reglas: unknown[] } },
  descuentos: [] as Record<string, unknown>[],
  plantas: [] as Record<string, unknown>[],
  servicios: [] as Record<string, unknown>[],
  ejecutivos: [] as Record<string, unknown>[],
  reglas: [] as ReglaFila[],
  protegidos: [] as number[],
}));

vi.mock('../../services/faregas-descuentos.api', () => ({
  faregasDescuentosAdminApi: {
    listar: async () => ({ descuentos: h.descuentos, total: h.descuentos.length }),
    maestros: async () => ({ plantas: h.plantas, serviciosPorPlanta: h.servicios, ejecutivos: h.ejecutivos }),
    detalle: async (id: number) => ({
      descuento: h.descuentos.find((d) => d.id === id),
      reglas: h.reglas
        .filter((r) => r.descuentoId === id && r.activo)
        .map((r) => ({
          plantaKey: r.plantaKey,
          servicioId: r.servicioId,
          tipoCalculo: r.tipoCalculo,
          valor: r.valor,
          valorContado: r.valorContado,
          valorCredito: r.valorCredito,
        })),
    }),
    guardarReglas: async (id: number, data: { reglas: ReglaFila[] }) => {
      if (h.protegidos.includes(id)) {
        const err = new Error('CONVENIO_GRATUIDAD_PROTEGIDO') as Error & { code?: string };
        err.code = 'CONVENIO_GRATUIDAD_PROTEGIDO';
        throw err;
      }
      h.payload = { id, data };
      for (const r of h.reglas) if (r.descuentoId === id) r.activo = false;
      for (const regla of data.reglas) {
        const existente = h.reglas.find(
          (r) => r.descuentoId === id && r.plantaKey === String(regla.plantaKey) && r.servicioId === Number(regla.servicioId),
        );
        if (existente) {
          existente.tipoCalculo = regla.tipoCalculo;
          existente.valor = regla.valor;
          existente.valorContado = regla.valorContado;
          existente.valorCredito = regla.valorCredito;
          existente.activo = true;
        } else {
          h.reglas.push({
            descuentoId: id,
            plantaKey: String(regla.plantaKey),
            servicioId: Number(regla.servicioId),
            tipoCalculo: regla.tipoCalculo,
            valor: regla.valor,
            valorContado: regla.valorContado,
            valorCredito: regla.valorCredito,
            activo: true,
          });
        }
      }
      return { success: true };
    },
    actualizar: async () => ({ success: true }),
    crear: async () => ({ id: 999 }),
    cambiarEstado: async () => ({}),
    eliminar: async () => ({ nombre: 'x', codigosEliminados: 0, configuracionesEliminadas: 0, usosEliminados: 0, serviciosPreservados: 0 }),
    obtenerImpacto: async () => ({ bloqueos: [], descuento: {}, codigos: [], configuraciones: [], usos: [] }),
    listarCodigos: async () => ({ codigos: [], total: 0 }),
  },
}));

const swal = vi.hoisted(() => ({ fire: vi.fn(async () => ({ isConfirmed: true })) }));
vi.mock('sweetalert2', () => ({ default: swal }));

const CATALOGO = [
  { id: 328, codigo: '0438', nombre: 'CERTIFICADO ANUAL DE INSPECCIÓN DE TALLER GNV', categoria: 'GNV', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'CERTIFICACION', planta_key: '13', precio: 100 },
  { id: 329, codigo: '0437', nombre: 'CERTIFICADO ANUAL DE INSPECCIÓN DE TALLER GLP', categoria: 'GLP', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'TALLER_INSPECCION', planta_key: '13', precio: 100 },
  { id: 331, codigo: '0423', nombre: 'CERTIFICADO ANUAL DE INSPECCIÓN DE TALLER GNV', categoria: 'GNV', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'TALLER_INSPECCION', planta_key: '98', precio: 100 },
  { id: 406, codigo: '0422', nombre: 'CERTIFICADO ANUAL DE INSPECCIÓN DE TALLER GLP', categoria: 'GLP', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'TALLER_INSPECCION', planta_key: '98', precio: 100 },
  { id: 414, codigo: '0428', nombre: 'CERTIFICADO ANUAL DE INSPECCIÓN DE TALLER GNV', categoria: 'GNV', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'TALLER_INSPECCION', planta_key: '160', precio: 100 },
  { id: 415, codigo: '0427', nombre: 'CERTIFICADO ANUAL DE INSPECCIÓN DE TALLER GLP', categoria: 'GLP', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'TALLER_INSPECCION', planta_key: '160', precio: 100 },
];

const semillaCampanaEditable = () => {
  h.descuentos = [{
    id: 30, codigo: 'CAMP-30', nombre: 'Campaña Prueba', tipo: 'CAMPANA', activo: true, protegido: false,
    fecha_inicio: '2026-01-01', fecha_fin: '2027-12-31', empresa_aliada_ruc: '', empresa_aliada_nombre: '',
    ejecutivo: '', total_codigos: 0, total_servicios: 6, usos_realizados: 0,
  }];
  h.plantas = [
    { key: '13', nombre: 'Planta 13' },
    { key: '98', nombre: 'Planta 98' },
    { key: '160', nombre: 'Planta 160' },
  ];
  h.servicios = CATALOGO;
  h.ejecutivos = [];
  h.reglas = [['13', 328], ['13', 329], ['98', 331], ['98', 406], ['160', 414], ['160', 415]].map(
    ([plantaKey, servicioId]) => ({
      descuentoId: 30, plantaKey, servicioId, tipoCalculo: 'PORCENTAJE', valor: 15, valorContado: null, valorCredito: null, activo: true,
    }),
  );
  h.protegidos = [];
  h.payload = null;
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

const montar = async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<DescuentosView />);
    await new Promise((r) => setTimeout(r, 0));
  });
};

const botonPorTexto = (texto: string) => [...container!.querySelectorAll('button')]
  .find((b) => (b.textContent || '').trim().includes(texto));

const clic = (el: Element) => act(() => { (el as HTMLElement).click(); });

const abrirCampana = async () => {
  await clic(container!.querySelector('button[title="Editar y gestionar campaña"]')!);
  await flush();
  await clic(botonPorTexto('Alcance y beneficio')!);
  await flush();
};

const inputBeneficio = () => {
  const seccion = [...container!.querySelectorAll('section')]
    .find((s) => (s.textContent || '').includes('BENEFICIO GENERAL'));
  return seccion!.querySelector('input[type="number"]') as HTMLInputElement;
};

const cambiarNumero = (el: HTMLInputElement, valor: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const toggleCheckbox = (el: HTMLInputElement) => {
  act(() => { el.click(); });
};

const checkboxPorEtiqueta = (texto: string) => {
  const etiqueta = [...container!.querySelectorAll('label')]
    .find((l) => (l.textContent || '').includes(texto));
  return etiqueta!.querySelector('input[type="checkbox"]') as HTMLInputElement;
};

const swalTextos = () => swal.fire.mock.calls.map((c) => JSON.stringify(c));

describe('DescuentosView — ciclo real de edición de descuentos', () => {
  beforeEach(() => {
    swal.fire.mockClear();
  });

  afterEach(() => {
    act(() => { root?.unmount(); });
    container?.remove();
    container = null;
    root = null;
  });

  it('1. el payload del PUT refleja el beneficio modificado (15 -> 20), no el anterior', async () => {
    semillaCampanaEditable();
    await montar();
    await abrirCampana();

    const input = inputBeneficio();
    expect(input.value).toBe('15');

    cambiarNumero(input, '20');
    await flush();

    await clic(botonPorTexto('GUARDAR DESCUENTO')!);
    await flush();

    expect(h.payload).not.toBeNull();
    const reglas = h.payload!.data.reglas as ReglaFila[];
    expect(reglas).toHaveLength(6);
    for (const r of reglas) {
      expect(String(r.valor)).toBe('20');
    }
  });

  it('2. al reabrir, el formulario muestra el beneficio guardado (20)', async () => {
    semillaCampanaEditable();
    await montar();
    await abrirCampana();

    cambiarNumero(inputBeneficio(), '20');
    await flush();
    await clic(botonPorTexto('GUARDAR DESCUENTO')!);
    await flush();

    await abrirCampana();
    expect(inputBeneficio().value).toBe('20');
  });

  it('3. quitar una sede reduce las reglas del payload', async () => {
    semillaCampanaEditable();
    await montar();
    await abrirCampana();

    const checkbox98 = checkboxPorEtiqueta('Planta 98');
    expect(checkbox98.checked).toBe(true);
    toggleCheckbox(checkbox98);
    await flush();

    await clic(botonPorTexto('GUARDAR DESCUENTO')!);
    await flush();

    const reglas = h.payload!.data.reglas as ReglaFila[];
    expect(reglas).toHaveLength(4);
    expect(reglas.some((r) => String(r.plantaKey) === '98')).toBe(false);
  });

  it('4. quitar un servicio reduce las reglas del payload', async () => {
    semillaCampanaEditable();
    await montar();
    await abrirCampana();

    toggleCheckbox(checkboxPorEtiqueta('GLP'));
    await flush();

    await clic(botonPorTexto('GUARDAR DESCUENTO')!);
    await flush();

    const reglas = h.payload!.data.reglas as ReglaFila[];
    const ids = reglas.map((r) => Number(r.servicioId)).sort((a, b) => a - b);
    expect(ids).toEqual([328, 331, 414]);
  });

  it('5. editar una excepción conserva su valor personalizado en el payload', async () => {
    semillaCampanaEditable();
    await montar();
    await abrirCampana();

    await clic(botonPorTexto('Personalizar excepciones')!);
    await flush();

    const seccionExcepciones = [...container!.querySelectorAll('section')]
      .find((s) => (s.textContent || '').includes('Personalizar excepciones'));
    const inputs = seccionExcepciones!.querySelectorAll('input[type="number"]');
    cambiarNumero(inputs[0] as HTMLInputElement, '50');
    await flush();

    await clic(botonPorTexto('GUARDAR DESCUENTO')!);
    await flush();

    const reglas = h.payload!.data.reglas as ReglaFila[];
    const primera = reglas.find((r) => String(r.plantaKey) === '13' && Number(r.servicioId) === 328);
    expect(String(primera!.valor)).toBe('50');
    const resto = reglas.filter((r) => !(String(r.plantaKey) === '13' && Number(r.servicioId) === 328));
    expect(resto.every((r) => String(r.valor) === '15')).toBe(true);
  });

  it('6. guardar desde Datos generales conserva el alcance pendiente (editar → guardar → cerrar → reabrir)', async () => {
    semillaCampanaEditable();
    await montar();
    await abrirCampana();

    cambiarNumero(inputBeneficio(), '20');
    await flush();

    await clic(botonPorTexto('Datos generales')!);
    await flush();
    await clic(botonPorTexto('GUARDAR DESCUENTO')!);
    await flush();

    expect(h.payload).not.toBeNull();
    const reglas = h.payload!.data.reglas as ReglaFila[];
    expect(reglas).toHaveLength(6);
    expect(reglas.every((r) => String(r.valor) === '20')).toBe(true);

    await clic(container!.querySelector('button[title="Cerrar"]')!);
    await flush();
    await abrirCampana();
    expect(inputBeneficio().value).toBe('20');
  });

  it('7. un convenio protegido rechaza el guardado y no finge éxito', async () => {
    semillaCampanaEditable();
    h.descuentos[0].id = 23;
    h.descuentos[0].nombre = 'DESCUENTO TALLER';
    h.reglas.forEach((r) => { r.descuentoId = 23; });
    h.protegidos = [23];
    await montar();
    await abrirCampana();

    cambiarNumero(inputBeneficio(), '20');
    await flush();
    await clic(botonPorTexto('GUARDAR DESCUENTO')!);
    await flush();

    expect(h.payload).toBeNull();
    const textos = swalTextos();
    expect(textos.some((t) => t.includes('error'))).toBe(true);
    expect(textos.some((t) => t.includes('Descuento configurado'))).toBe(false);
    const modalAbierto = [...container!.querySelectorAll('section')]
      .some((s) => (s.textContent || '').includes('BENEFICIO GENERAL'));
    expect(modalAbierto).toBe(true);
  });

  it('8. GUARDAR DATOS también persiste el alcance pendiente sin descartarlo', async () => {
    semillaCampanaEditable();
    await montar();
    await abrirCampana();

    cambiarNumero(inputBeneficio(), '20');
    await flush();

    await clic(botonPorTexto('Datos generales')!);
    await flush();
    await clic(botonPorTexto('GUARDAR DATOS')!);
    await flush();

    expect(h.payload).not.toBeNull();
    const reglas = h.payload!.data.reglas as ReglaFila[];
    expect(reglas.every((r) => String(r.valor) === '20')).toBe(true);

    await clic(botonPorTexto('Alcance y beneficio')!);
    await flush();
    expect(inputBeneficio().value).toBe('20');
  });
});
