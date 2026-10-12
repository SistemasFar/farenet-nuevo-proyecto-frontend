import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  analizarFilasImportacion,
  agruparServiciosLogicos,
  beneficioInicial,
  calcularPrecioFinal,
  claveServicioLogico,
  construirReglasValidas,
  construirVigenciaCodigo,
  filasDesdeCsv,
  generarPreviewLote,
  reconstruirPaso2,
  type ReglaDescuento,
  type ServicioPorPlanta,
} from './descuentos-wizard.utils';

const beneficio = { ...beneficioInicial(), tipoCalculo: 'MONTO' as const, valor: 20 };
const disponibilidad: ServicioPorPlanta[] = [
  { id: 101, codigo: '0101', nombre: 'CERTIFICADO ANUAL GLP', categoria: 'GLP', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'CERTIFICACION', planta_key: 'A', precio: 80 },
  { id: 102, codigo: '0181', nombre: 'CERTIFICADO ANUAL GLP', categoria: 'GLP', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'CERTIFICACION', planta_key: 'B', precio: 80 },
  { id: 103, codigo: '0041', nombre: 'CERTIFICADO ANUAL GLP', categoria: 'GLP', tipo_certificado_clave: 'GLP_ANUAL', modalidad: 'ANUAL', tipo_flujo: 'CERTIFICACION', planta_key: 'C', precio: 80 },
  { id: 201, codigo: '0102', nombre: 'CERTIFICADO INICIAL GNV', categoria: 'GNV', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'INICIAL', tipo_flujo: 'CERTIFICACION', planta_key: 'A', precio: 100 },
  { id: 203, codigo: '0042', nombre: 'CERTIFICADO INICIAL GNV', categoria: 'GNV', tipo_certificado_clave: 'GNV_ANUAL', modalidad: 'INICIAL', tipo_flujo: 'CERTIFICACION', planta_key: 'C', precio: 100 },
];
const anualGlp = claveServicioLogico(disponibilidad[0]);
const inicialGnv = claveServicioLogico(disponibilidad[3]);
const conformidadTecnicos = Array.from({ length: 14 }, (_, indice): ServicioPorPlanta => ({
  id: 300 + indice,
  codigo: String(46 + indice).padStart(4, '0'),
  nombre: 'CERTIFICADO DE CONFORMIDAD DE CAMBIO DE MOTOR',
  categoria: 'Conformidad',
  tipo_certificado_clave: 'CONFORMIDAD',
  modalidad: 'UNICA',
  tipo_flujo: 'CERTIFICACION',
  planta_key: `P${indice + 1}`,
  precio: 100,
}));
const conformidadCambioMotor = claveServicioLogico(conformidadTecnicos[0]);

describe('wizard administrativo de descuentos', () => {
  it('expande 3 sedes por un servicio a 3 reglas', () => {
    const reglas = construirReglasValidas({ sedes: ['A', 'B', 'C'], servicios: [anualGlp], disponibilidad, beneficio });
    expect(reglas.map(regla => regla.servicioId)).toEqual([101, 102, 103]);
  });

  it('crea sólo 2 reglas cuando el servicio existe en 2 sedes', () => {
    expect(construirReglasValidas({ sedes: ['A', 'B', 'C'], servicios: [inicialGnv], disponibilidad, beneficio })).toHaveLength(2);
  });

  it('cuenta combinaciones reales para dos servicios', () => {
    expect(construirReglasValidas({ sedes: ['A', 'B', 'C'], servicios: [anualGlp, inicialGnv], disponibilidad, beneficio })).toHaveLength(5);
  });

  it('calcula MONTO 20 sobre P. venta 80 como 60', () => {
    expect(calcularPrecioFinal(80, beneficio)).toBe(60);
  });

  it('preserva una excepción SURCO de 25', () => {
    const previas = construirReglasValidas({ sedes: ['A', 'B'], servicios: [anualGlp], disponibilidad, beneficio });
    previas[0].valor = 25;
    const reglas = construirReglasValidas({ sedes: ['A', 'B'], servicios: [anualGlp], disponibilidad, beneficio, reglasPrevias: previas, excepciones: ['A:101'] });
    expect(reglas.map(regla => regla.valor)).toEqual([25, 20]);
  });

  it('reconstruye campaña homogénea en modo simple', () => {
    const reglas = construirReglasValidas({ sedes: ['A', 'B'], servicios: [anualGlp], disponibilidad, beneficio });
    expect(reconstruirPaso2(reglas, disponibilidad)).toMatchObject({ modoPersonalizado: false, sedes: ['A', 'B'], servicios: [anualGlp] });
  });

  it('reconstruye campaña heterogénea sin perder reglas', () => {
    const reglas: ReglaDescuento[] = [
      { plantaKey: 'A', servicioId: 101, ...beneficio },
      { plantaKey: 'B', servicioId: 102, ...beneficio, valor: 25 },
    ];
    const reconstruida = reconstruirPaso2(reglas, disponibilidad);
    expect(reconstruida.modoPersonalizado).toBe(true);
    expect(reconstruida.servicios).toEqual([anualGlp]);
    expect(reconstruida.excepciones).toEqual(['B:102']);
    expect(reglas[1].valor).toBe(25);
  });

  it('consolida 14 ids técnicos equivalentes en un solo servicio lógico', () => {
    const grupos = agruparServiciosLogicos(conformidadTecnicos);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].sedes.size).toBe(14);
    expect(grupos[0].nombre).toBe('Certificado de conformidad de cambio de motor');
  });

  it('resuelve los 14 servicio_id técnicos reales al seleccionar el grupo lógico', () => {
    const sedes = conformidadTecnicos.map(item => item.planta_key);
    const reglas = construirReglasValidas({ sedes, servicios: [conformidadCambioMotor], disponibilidad: conformidadTecnicos, beneficio });
    expect(reglas).toHaveLength(14);
    expect(reglas.map(regla => regla.servicioId).sort((a, b) => a - b)).toEqual(conformidadTecnicos.map(item => Number(item.id)));
  });

  it('genera 8 reglas cuando el servicio lógico existe sólo en 8 de 14 sedes', () => {
    const sedes = conformidadTecnicos.map(item => item.planta_key);
    const disponibilidadParcial = conformidadTecnicos.slice(0, 8);
    const grupos = agruparServiciosLogicos(disponibilidadParcial, sedes);
    const reglas = construirReglasValidas({ sedes, servicios: [conformidadCambioMotor], disponibilidad: disponibilidadParcial, beneficio });
    expect(grupos[0].sedes.size).toBe(8);
    expect(reglas).toHaveLength(8);
  });

  it('resume precios distintos sin duplicar el grupo lógico', () => {
    const conRango = disponibilidad.map((item, indice) => ({ ...item, precio: item.tipo_certificado_clave === 'GLP_ANUAL' ? 80 + indice * 10 : item.precio }));
    const grupo = agruparServiciosLogicos(conRango).find(item => item.key === anualGlp);
    expect(grupo?.precios).toEqual([80, 90, 100]);
    expect(Math.min(...(grupo?.precios || []))).toBe(80);
    expect(Math.max(...(grupo?.precios || []))).toBe(100);
  });

  it('hereda vigencia enviando NULL/NULL por defecto', () => {
    expect(construirVigenciaCodigo(false, '2026-10-12', '2026-11-12')).toEqual({ fechaInicio: null, fechaFin: null });
  });

  it('conserva ambas fechas cuando se personaliza vigencia', () => {
    expect(construirVigenciaCodigo(true, '2026-10-12', '2026-11-12')).toEqual({ fechaInicio: '2026-10-12', fechaFin: '2026-11-12' });
  });

  it('genera preview determinista de lote', () => {
    expect(generarPreviewLote('empresa', 5000)).toEqual(['EMPRESA-000001', 'EMPRESA-000002', 'EMPRESA-000003', '…', 'EMPRESA-005000']);
  });

  it('importa CSV y detecta duplicados dentro del archivo', () => {
    const filas = filasDesdeCsv('codigo,placa,max_usos\nUNO,ABC123,1\nUNO,ABC123,1\nDOS,,2');
    const resultado = analizarFilasImportacion(filas);
    expect(resultado.items.map(item => item.codigo)).toEqual(['UNO', 'DOS']);
    expect(resultado.errores[0].motivo).toBe('DUPLICADO_ARCHIVO');
  });

  it('el Paso 2 usa un listado consolidado y no mapea paneles por sede', () => {
    const fuente = readFileSync(new URL('./components/DescuentoAlcanceStep.tsx', import.meta.url), 'utf8');
    expect(fuente).toContain('Listado consolidado');
    expect(fuente).not.toContain('sedesSeleccionadas.map');
    expect(fuente).not.toContain("item.codigo ? `${item.codigo} — `");
  });

  it('el listado solicita 20 códigos al servidor', () => {
    const fuente = readFileSync(new URL('./components/CodigosListadoModal.tsx', import.meta.url), 'utf8');
    expect(fuente).toContain('const limite = 20');
    expect(fuente).toContain('listarCodigos');
  });

  it('la búsqueda de códigos está conectada al endpoint server-side', () => {
    const fuente = readFileSync(new URL('../../services/faregas-descuentos.api.ts', import.meta.url), 'utf8');
    expect(fuente).toContain("params.set('search', filtros.search)");
    expect(fuente).toContain('/codigos?${params}');
  });

  it('la tabla principal ya no renderiza códigos individuales', () => {
    const fuente = readFileSync(new URL('./DescuentosView.tsx', import.meta.url), 'utf8');
    expect(fuente).not.toContain('nombres_codigos');
    expect(fuente).toContain('Ver códigos');
  });

  it('unifica editar y gestionar en un solo botón de lápiz', () => {
    const fuente = readFileSync(new URL('./DescuentosView.tsx', import.meta.url), 'utf8');
    expect(fuente.match(/title="Editar y gestionar campaña"/g)).toHaveLength(1);
    expect(fuente).toContain("abrirCodigos(d.id, 'DATOS')");
    expect(fuente).not.toContain('title="Configurar"');
    expect(fuente).not.toContain('<Settings');
  });

  it('el modal de gestión permite navegar por los tres pasos', () => {
    const fuente = readFileSync(new URL('./DescuentosView.tsx', import.meta.url), 'utf8');
    expect(fuente).toContain("codigoTab === 'DATOS'");
    expect(fuente).toContain("codigoTab === 'CONFIGURAR'");
    expect(fuente).toContain("codigoTab === 'LISTADO'");
    expect(fuente).toContain('DatosGeneralesCampos');
    expect(fuente).toContain("listarCodigos(id, { limit: 1, offset: 0 })");
  });

  it('cerrar el wizard sólo descarta estado local y no guarda', () => {
    const fuente = readFileSync(new URL('./DescuentosView.tsx', import.meta.url), 'utf8');
    expect(fuente).toContain('setDetalle(null); setEditando(null);');
    expect(fuente).toContain('onClick={() => void guardar(false)}');
  });
});
