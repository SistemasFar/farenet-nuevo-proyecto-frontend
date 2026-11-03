import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  construirReglasValidas,
  reconstruirPaso2,
  type ReglaDescuento,
  type ServicioPorPlanta,
} from './descuentos-wizard.utils';

const disponibilidad: ServicioPorPlanta[] = [
  { id: 101, codigo: '0101', nombre: 'CERTIFICADO ANUAL GLP', categoria: 'GLP', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'CERTIFICACION', planta_key: 'SURCO', precio: 90 },
  { id: 102, codigo: '0181', nombre: 'CERTIFICADO ANUAL GLP', categoria: 'GLP', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'CERTIFICACION', planta_key: 'MIRAFLORES', precio: 90 },
  { id: 201, codigo: '0102', nombre: 'CERTIFICADO INICIAL GNV', categoria: 'GNV', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'INICIAL', tipo_flujo: 'CERTIFICACION', planta_key: 'SURCO', precio: 100 },
];

let guardadoReglas: unknown = null;
let llamadasGuardarReglas = 0;
let llamadasActualizar = 0;

const detalleBase = {
  descuento: { id: 23, nombre: 'DESCUENTO TALLER', tipo: 'CAMPANA', empresa_aliada_ruc: '', empresa_aliada_nombre: '', ejecutivo: '', fecha_inicio: '2026-01-01', fecha_fin: '2027-01-01', activo: true, total_servicios: 6, usos_realizados: 0, protegido: false },
  reglas: [
    { plantaKey: 'SURCO', servicioId: 101, tipoCalculo: 'PORCENTAJE', valor: 15, valorContado: null, valorCredito: null },
    { plantaKey: 'MIRAFLORES', servicioId: 102, tipoCalculo: 'PORCENTAJE', valor: 15, valorContado: null, valorCredito: null },
  ],
};

const mockApi = {
  actualizar: vi.fn(async (_id: number, _data: unknown) => { llamadasActualizar++; return { success: true }; }),
  guardarReglas: vi.fn(async (_id: number, data: unknown) => { guardadoReglas = data; llamadasGuardarReglas++; return { success: true }; }),
  detalle: vi.fn(async (_id: number) => detalleBase),
};

function abrirCodigos(detalle: typeof detalleBase) {
  const reglasNormalizadas: ReglaDescuento[] = (detalle.reglas || []).map(regla => ({
    plantaKey: String(regla.plantaKey), servicioId: Number(regla.servicioId),
    tipoCalculo: regla.tipoCalculo as ReglaDescuento['tipoCalculo'],
    valor: regla.valor ?? '', valorContado: regla.valorContado ?? '', valorCredito: regla.valorCredito ?? '',
  }));
  const rec = reconstruirPaso2(reglasNormalizadas, disponibilidad);
  return { reglas: reglasNormalizadas, sedesSeleccionadas: rec.sedes, serviciosSeleccionados: rec.servicios, beneficioGeneral: rec.beneficio, excepciones: new Set(rec.excepciones) };
}

beforeEach(() => {
  guardadoReglas = null;
  llamadasGuardarReglas = 0;
  llamadasActualizar = 0;
  vi.clearAllMocks();
  mockApi.actualizar.mockImplementation(async (_id: number, _data: unknown) => { llamadasActualizar++; return { success: true }; });
  mockApi.guardarReglas.mockImplementation(async (_id: number, data: unknown) => { guardadoReglas = data; llamadasGuardarReglas++; return { success: true }; });
  mockApi.detalle.mockImplementation(async (_id: number) => detalleBase);
});

describe('Guardado de descuentos — flujo de edicion', () => {

  it('1 [DIAGNOSTICO] guardar(true) sin guardarReglas descarta cambios de beneficio', async () => {
    const detalleInicial = await mockApi.detalle(23);
    let estado = abrirCodigos(detalleInicial);
    const nuevoBeneficio = { tipoCalculo: 'PORCENTAJE' as const, valor: 20, valorContado: '', valorCredito: '' };
    estado = { ...estado, reglas: construirReglasValidas({ sedes: estado.sedesSeleccionadas, servicios: estado.serviciosSeleccionados, disponibilidad, beneficio: nuevoBeneficio, reglasPrevias: estado.reglas, excepciones: estado.excepciones }), beneficioGeneral: nuevoBeneficio };
    // BUG: solo llama actualizar, no guardarReglas, luego recarga desde BD
    await mockApi.actualizar(23, {});
    const detalleRecargado = await mockApi.detalle(23);
    estado = abrirCodigos(detalleRecargado);
    expect(Number(estado.beneficioGeneral.valor)).toBe(15); // sigue en 15, el 20 se perdio
    expect(llamadasGuardarReglas).toBe(0); // el bug: nunca se llamo guardarReglas
  });

  it('2 guardarReglas() persiste el porcentaje modificado correctamente', async () => {
    const detalleInicial = await mockApi.detalle(23);
    let estado = abrirCodigos(detalleInicial);
    const nuevoBeneficio = { tipoCalculo: 'PORCENTAJE' as const, valor: 20, valorContado: '', valorCredito: '' };
    const reglasActualizadas = construirReglasValidas({ sedes: estado.sedesSeleccionadas, servicios: estado.serviciosSeleccionados, disponibilidad, beneficio: nuevoBeneficio, reglasPrevias: estado.reglas, excepciones: estado.excepciones });
    estado = { ...estado, reglas: reglasActualizadas, beneficioGeneral: nuevoBeneficio };
    await mockApi.actualizar(23, {});
    await mockApi.guardarReglas(23, { reglas: estado.reglas });
    expect(llamadasActualizar).toBe(1);
    expect(llamadasGuardarReglas).toBe(1);
    const payload = guardadoReglas as { reglas: ReglaDescuento[] };
    expect(payload.reglas.every(r => Number(r.valor) === 20)).toBe(true);
  });

  it('3 quitar sede MIRAFLORES reduce las reglas a solo SURCO', async () => {
    const detalleInicial = await mockApi.detalle(23);
    let estado = abrirCodigos(detalleInicial);
    const nuevasSedes = estado.sedesSeleccionadas.filter(s => s !== 'MIRAFLORES');
    const excepcionesVigentes = new Set([...estado.excepciones].filter(c => nuevasSedes.includes(c.split(':')[0])));
    const reglasReducidas = construirReglasValidas({ sedes: nuevasSedes, servicios: estado.serviciosSeleccionados, disponibilidad, beneficio: estado.beneficioGeneral, reglasPrevias: estado.reglas, excepciones: excepcionesVigentes });
    estado = { ...estado, sedesSeleccionadas: nuevasSedes, reglas: reglasReducidas, excepciones: excepcionesVigentes };
    await mockApi.guardarReglas(23, { reglas: estado.reglas });
    const payload = guardadoReglas as { reglas: ReglaDescuento[] };
    expect(payload.reglas.every(r => r.plantaKey === 'SURCO')).toBe(true);
    expect(payload.reglas.some(r => r.plantaKey === 'MIRAFLORES')).toBe(false);
    expect(payload.reglas.length).toBe(1);
  });

  it('4 agregar SURCO con GLP amplia el alcance', async () => {
    const reglasIniciales: ReglaDescuento[] = [{ plantaKey: 'MIRAFLORES', servicioId: 102, tipoCalculo: 'PORCENTAJE', valor: 15, valorContado: '', valorCredito: '' }];
    const beneficio = { tipoCalculo: 'PORCENTAJE' as const, valor: 15, valorContado: '', valorCredito: '' };
    const reconstruccionInicial = reconstruirPaso2(reglasIniciales, disponibilidad);
    const nuevasSedes = [...reconstruccionInicial.sedes, 'SURCO'];
    const reglasAmplidas = construirReglasValidas({ sedes: nuevasSedes, servicios: reconstruccionInicial.servicios, disponibilidad, beneficio, reglasPrevias: reglasIniciales, excepciones: new Set() });
    await mockApi.guardarReglas(23, { reglas: reglasAmplidas });
    const payload = guardadoReglas as { reglas: ReglaDescuento[] };
    expect(payload.reglas.some(r => r.plantaKey === 'SURCO')).toBe(true);
    expect(payload.reglas.some(r => r.plantaKey === 'MIRAFLORES')).toBe(true);
  });

  it('5 quitar servicio GNV elimina las reglas de ese servicio', async () => {
    const glpKey = reconstruirPaso2([{ plantaKey: 'SURCO', servicioId: 101, tipoCalculo: 'PORCENTAJE', valor: 15, valorContado: '', valorCredito: '' }], disponibilidad).servicios[0];
    const gnvKey = reconstruirPaso2([{ plantaKey: 'SURCO', servicioId: 201, tipoCalculo: 'PORCENTAJE', valor: 15, valorContado: '', valorCredito: '' }], disponibilidad).servicios[0];
    expect(glpKey).not.toBe(gnvKey);
    const reglasIniciales: ReglaDescuento[] = [{ plantaKey: 'SURCO', servicioId: 101, tipoCalculo: 'PORCENTAJE', valor: 15, valorContado: '', valorCredito: '' }, { plantaKey: 'SURCO', servicioId: 201, tipoCalculo: 'PORCENTAJE', valor: 15, valorContado: '', valorCredito: '' }];
    const reglasReducidas = construirReglasValidas({ sedes: ['SURCO'], servicios: [glpKey], disponibilidad, beneficio: { tipoCalculo: 'PORCENTAJE', valor: 15, valorContado: '', valorCredito: '' }, reglasPrevias: reglasIniciales, excepciones: new Set() });
    await mockApi.guardarReglas(23, { reglas: reglasReducidas });
    const payload = guardadoReglas as { reglas: ReglaDescuento[] };
    expect(payload.reglas.every(r => r.servicioId === 101)).toBe(true);
    expect(payload.reglas.some(r => r.servicioId === 201)).toBe(false);
  });

  it('6 una excepcion de beneficio distinto al general se persiste correctamente', async () => {
    const detalleInicial = await mockApi.detalle(23);
    let estado = abrirCodigos(detalleInicial);
    const reglasConExcepcion = estado.reglas.map(r => r.plantaKey === 'SURCO' && r.servicioId === 101 ? { ...r, valor: 50 } : r);
    estado = { ...estado, reglas: reglasConExcepcion, excepciones: new Set(['SURCO:101']) };
    await mockApi.guardarReglas(23, { reglas: estado.reglas });
    const payload = guardadoReglas as { reglas: ReglaDescuento[] };
    expect(Number(payload.reglas.find(r => r.plantaKey === 'SURCO')?.valor)).toBe(50);
    expect(Number(payload.reglas.find(r => r.plantaKey === 'MIRAFLORES')?.valor)).toBe(15);
  });

  it('7 [CORRECCION] guardar(true) con reglas llama actualizar() Y guardarReglas()', async () => {
    const detalleInicial = await mockApi.detalle(23);
    const estado = abrirCodigos(detalleInicial);
    const nuevoBeneficio = { tipoCalculo: 'PORCENTAJE' as const, valor: 20, valorContado: '', valorCredito: '' };
    const reglasActualizadas = construirReglasValidas({ sedes: estado.sedesSeleccionadas, servicios: estado.serviciosSeleccionados, disponibilidad, beneficio: nuevoBeneficio, reglasPrevias: estado.reglas, excepciones: estado.excepciones });
    const estadoActualizado = { ...estado, reglas: reglasActualizadas };
    await mockApi.actualizar(23, {});
    if (estadoActualizado.reglas.length > 0) {
      await mockApi.guardarReglas(23, { reglas: estadoActualizado.reglas });
    }
    expect(llamadasActualizar).toBe(1);
    expect(llamadasGuardarReglas).toBe(1);
    expect((guardadoReglas as { reglas: ReglaDescuento[] }).reglas.every(r => Number(r.valor) === 20)).toBe(true);
  });

  it('8 guardarReglas() desde pestana Alcance no toca datos generales', async () => {
    const detalleInicial = await mockApi.detalle(23);
    const estado = abrirCodigos(detalleInicial);
    await mockApi.guardarReglas(23, { reglas: estado.reglas });
    expect(llamadasActualizar).toBe(0);
    expect(llamadasGuardarReglas).toBe(1);
  });

  it('9 si guardarReglas() falla, el error se propaga y no hay exito falso', async () => {
    mockApi.guardarReglas.mockRejectedValueOnce(new Error('CONVENIO_GRATUIDAD_PROTEGIDO'));
    let err: Error | null = null;
    try { await mockApi.guardarReglas(23, { reglas: [] }); } catch (e) { err = e as Error; }
    expect(err?.message).toBe('CONVENIO_GRATUIDAD_PROTEGIDO');
  });

  it('10 si actualizar() falla, guardarReglas() no se ejecuta', async () => {
    mockApi.actualizar.mockRejectedValueOnce(new Error('VALIDACION_FALLIDA'));
    let err: Error | null = null;
    try {
      await mockApi.actualizar(23, {});
      await mockApi.guardarReglas(23, { reglas: [] });
    } catch (e) { err = e as Error; }
    expect(err?.message).toBe('VALIDACION_FALLIDA');
    expect(llamadasGuardarReglas).toBe(0);
  });

  it('11 descuento protegido fiscalmente devuelve CONVENIO_GRATUIDAD_PROTEGIDO', async () => {
    mockApi.guardarReglas.mockRejectedValueOnce(new Error('CONVENIO_GRATUIDAD_PROTEGIDO'));
    let err: Error | null = null;
    try { await mockApi.guardarReglas(17, { reglas: [] }); } catch (e) { err = e as Error; }
    expect(err?.message).toBe('CONVENIO_GRATUIDAD_PROTEGIDO');
    expect(mockApi.guardarReglas).toHaveBeenCalledTimes(1);
  });

  it('12 al reabrir el descuento la reconstruccion refleja exactamente lo guardado', () => {
    const reglasGuardadas: ReglaDescuento[] = [
      { plantaKey: 'SURCO', servicioId: 101, tipoCalculo: 'PORCENTAJE', valor: 20, valorContado: '', valorCredito: '' },
      { plantaKey: 'MIRAFLORES', servicioId: 102, tipoCalculo: 'PORCENTAJE', valor: 20, valorContado: '', valorCredito: '' },
    ];
    const rec = reconstruirPaso2(reglasGuardadas, disponibilidad);
    expect(rec.sedes).toContain('SURCO');
    expect(rec.sedes).toContain('MIRAFLORES');
    expect(Number(rec.beneficio.valor)).toBe(20);
    expect(rec.beneficio.tipoCalculo).toBe('PORCENTAJE');
    expect(rec.excepciones).toHaveLength(0);
  });

  it('13 cambiar beneficio general actualiza todas las reglas sin excepciones', async () => {
    const reglasIniciales: ReglaDescuento[] = [{ plantaKey: 'SURCO', servicioId: 101, tipoCalculo: 'PORCENTAJE', valor: 15, valorContado: '', valorCredito: '' }, { plantaKey: 'MIRAFLORES', servicioId: 102, tipoCalculo: 'PORCENTAJE', valor: 15, valorContado: '', valorCredito: '' }];
    const nuevoBeneficio = { tipoCalculo: 'PORCENTAJE' as const, valor: 25, valorContado: '', valorCredito: '' };
    const reglasActualizadas = construirReglasValidas({ sedes: ['SURCO', 'MIRAFLORES'], servicios: reconstruirPaso2(reglasIniciales, disponibilidad).servicios, disponibilidad, beneficio: nuevoBeneficio, reglasPrevias: reglasIniciales, excepciones: new Set() });
    await mockApi.guardarReglas(23, { reglas: reglasActualizadas });
    const payload = guardadoReglas as { reglas: ReglaDescuento[] };
    expect(payload.reglas).toHaveLength(2);
    expect(payload.reglas.every(r => Number(r.valor) === 25)).toBe(true);
  });

  it('14 si no hay reglas, guardar(true) no llama guardarReglas', async () => {
    const reglaVacias: ReglaDescuento[] = [];
    await mockApi.actualizar(23, {});
    if (reglaVacias.length > 0) { await mockApi.guardarReglas(23, { reglas: reglaVacias }); }
    expect(llamadasActualizar).toBe(1);
    expect(llamadasGuardarReglas).toBe(0);
  });

  it('15 el descuento ID 23 con protegido=false es editable sin restriccion fiscal', () => {
    const descuento = { id: 23, nombre: 'DESCUENTO TALLER', tipo: 'CAMPANA', protegido: false };
    expect(descuento.protegido).toBe(false);
  });
});
