export type TipoCalculo = 'FLAT' | 'MONTO' | 'PORCENTAJE';

export type BeneficioDescuento = {
  tipoCalculo: TipoCalculo;
  valor: number | string;
  valorContado: number | string;
  valorCredito: number | string;
};

export type ReglaDescuento = BeneficioDescuento & {
  plantaKey: string;
  servicioId: number;
};

export type ServicioPorPlanta = {
  id?: number;
  codigo?: string;
  nombre: string;
  categoria?: string;
  tipo_certificado_clave?: string | null;
  modalidad?: string | null;
  tipo_flujo?: string | null;
  planta_key: string;
  precio: number | null;
  tarifa_codigo?: string;
};

export type ServicioLogico = {
  key: string;
  nombre: string;
  categoria?: string;
  referencia: ServicioPorPlanta;
  sedes: Set<string>;
  serviciosPorSede: Map<string, ServicioPorPlanta>;
  precios: number[];
};

export const beneficioInicial = (): BeneficioDescuento => ({
  tipoCalculo: 'MONTO',
  valor: '',
  valorContado: '',
  valorCredito: '',
});

export const claveRegla = (plantaKey: string, servicioId: number) => `${plantaKey}:${servicioId}`;
export const esDisponibilidadValida = (servicio: ServicioPorPlanta) => Number.isFinite(Number(servicio.precio)) && Number(servicio.precio) > 0;

const limpiarNombreServicio = (valor: string) => String(valor || '')
  .replace(/^\s*\d{2,}\s*[-—:]\s*/u, '')
  .replace(/\s+/g, ' ')
  .trim();

const normalizarTextoLogico = (valor: unknown) => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toUpperCase();

export const nombreServicioLogico = (servicio: Pick<ServicioPorPlanta, 'nombre'>) => {
  const nombre = limpiarNombreServicio(servicio.nombre);
  if (!nombre || nombre !== nombre.toUpperCase()) return nombre;
  const legible = `${nombre.charAt(0)}${nombre.slice(1).toLocaleLowerCase('es-PE')}`;
  return legible.replace(/\b(glp|gnv|mtc|itv)\b/gi, sigla => sigla.toUpperCase());
};

export const claveServicioLogico = (servicio: ServicioPorPlanta) => {
  const tipo = normalizarTextoLogico(servicio.tipo_certificado_clave || servicio.categoria);
  const modalidad = normalizarTextoLogico(servicio.modalidad);
  const flujo = normalizarTextoLogico(servicio.tipo_flujo);
  const nombre = normalizarTextoLogico(limpiarNombreServicio(servicio.nombre));
  return [tipo || 'SIN_TIPO', modalidad || 'SIN_MODALIDAD', flujo || 'SIN_FLUJO', nombre].join('::');
};

export const agruparServiciosLogicos = (
  disponibilidad: ServicioPorPlanta[],
  sedes?: Iterable<string>,
): ServicioLogico[] => {
  const sedesSet = sedes ? new Set([...sedes].map(String)) : null;
  const grupos = new Map<string, ServicioLogico>();

  for (const item of disponibilidad) {
    const plantaKey = String(item.planta_key);
    const servicioId = Number(item.id);
    if ((sedesSet && !sedesSet.has(plantaKey)) || !Number.isInteger(servicioId) || !esDisponibilidadValida(item)) continue;
    const key = claveServicioLogico(item);
    const grupo = grupos.get(key) || {
      key,
      nombre: nombreServicioLogico(item),
      categoria: item.categoria,
      referencia: item,
      sedes: new Set<string>(),
      serviciosPorSede: new Map<string, ServicioPorPlanta>(),
      precios: [],
    };
    const existente = grupo.serviciosPorSede.get(plantaKey);
    if (!existente || servicioId < Number(existente.id)) grupo.serviciosPorSede.set(plantaKey, item);
    grupos.set(key, grupo);
  }

  return [...grupos.values()]
    .map(grupo => {
      const servicios = [...grupo.serviciosPorSede.values()];
      return {
        ...grupo,
        sedes: new Set(grupo.serviciosPorSede.keys()),
        precios: servicios.map(item => Number(item.precio)).filter(precio => Number.isFinite(precio) && precio > 0),
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
};

const buscarServicioDeRegla = (
  disponibilidad: ServicioPorPlanta[],
  plantaKey: string,
  servicioId: number,
) => disponibilidad.find(item => String(item.planta_key) === String(plantaKey) && Number(item.id) === Number(servicioId))
  || disponibilidad.find(item => Number(item.id) === Number(servicioId));

export const claveLogicaDeRegla = (
  disponibilidad: ServicioPorPlanta[],
  plantaKey: string,
  servicioId: number,
) => {
  const servicio = buscarServicioDeRegla(disponibilidad, plantaKey, servicioId);
  return servicio ? claveServicioLogico(servicio) : `SERVICIO_ID::${servicioId}`;
};

const valorComparable = (valor: number | string | null | undefined) => {
  if (valor === '' || valor == null) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : valor;
};

export const obtenerBeneficio = (regla: BeneficioDescuento): BeneficioDescuento => ({
  tipoCalculo: regla.tipoCalculo,
  valor: regla.valor ?? '',
  valorContado: regla.valorContado ?? '',
  valorCredito: regla.valorCredito ?? '',
});

export const beneficiosIguales = (a: BeneficioDescuento, b: BeneficioDescuento) => (
  a.tipoCalculo === b.tipoCalculo
  && valorComparable(a.valor) === valorComparable(b.valor)
  && valorComparable(a.valorContado) === valorComparable(b.valorContado)
  && valorComparable(a.valorCredito) === valorComparable(b.valorCredito)
);

export const reconstruirPaso2 = (reglas: ReglaDescuento[], disponibilidad: ServicioPorPlanta[]) => {
  const sedes = [...new Set(reglas.map(regla => String(regla.plantaKey)))];
  const servicios = [...new Set(reglas.map(regla => claveLogicaDeRegla(
    disponibilidad,
    regla.plantaKey,
    regla.servicioId,
  )))];
  const beneficio = reglas.length ? obtenerBeneficio(reglas[0]) : beneficioInicial();
  const excepciones = reglas
    .filter(regla => !beneficiosIguales(regla, beneficio))
    .map(regla => claveRegla(regla.plantaKey, regla.servicioId));

  return {
    sedes,
    servicios,
    beneficio,
    excepciones,
    modoPersonalizado: excepciones.length > 0,
  };
};

type ConstruirReglasParams = {
  sedes: string[];
  servicios: string[];
  disponibilidad: ServicioPorPlanta[];
  beneficio: BeneficioDescuento;
  reglasPrevias?: ReglaDescuento[];
  excepciones?: Iterable<string>;
};

export const construirReglasValidas = ({
  sedes,
  servicios,
  disponibilidad,
  beneficio,
  reglasPrevias = [],
  excepciones = [],
}: ConstruirReglasParams): ReglaDescuento[] => {
  const sedesSet = new Set(sedes.map(String));
  const serviciosSet = new Set(servicios);
  const excepcionesSet = new Set(excepciones);
  const previas = new Map(reglasPrevias.map(regla => [
    `${String(regla.plantaKey)}::${claveLogicaDeRegla(disponibilidad, regla.plantaKey, regla.servicioId)}`,
    regla,
  ]));
  const combinaciones = new Map<string, ReglaDescuento>();

  for (const grupo of agruparServiciosLogicos(disponibilidad, sedesSet)) {
    if (!serviciosSet.has(grupo.key)) continue;
    for (const [plantaKey, itemPredeterminado] of grupo.serviciosPorSede) {
      const previa = previas.get(`${plantaKey}::${grupo.key}`);
      const servicioPrevio = previa && buscarServicioDeRegla(disponibilidad, plantaKey, previa.servicioId);
      const conservaServicioPrevio = servicioPrevio
        && String(servicioPrevio.planta_key) === plantaKey
        && claveServicioLogico(servicioPrevio) === grupo.key
        && esDisponibilidadValida(servicioPrevio);
      const servicioId = conservaServicioPrevio ? previa.servicioId : Number(itemPredeterminado.id);
      if (!Number.isInteger(servicioId)) continue;
      const clave = claveRegla(plantaKey, servicioId);
      const valores = excepcionesSet.has(clave) && previa ? obtenerBeneficio(previa) : beneficio;
      combinaciones.set(clave, { plantaKey, servicioId, ...obtenerBeneficio(valores) });
    }
  }

  return [...combinaciones.values()].sort((a, b) => (
    a.plantaKey.localeCompare(b.plantaKey) || a.servicioId - b.servicioId
  ));
};

export const aplicarBeneficioGeneral = (
  reglas: ReglaDescuento[],
  beneficio: BeneficioDescuento,
  excepciones: Iterable<string>,
) => {
  const excepcionesSet = new Set(excepciones);
  return reglas.map(regla => excepcionesSet.has(claveRegla(regla.plantaKey, regla.servicioId))
    ? regla
    : { ...regla, ...obtenerBeneficio(beneficio) });
};

export const calcularPrecioFinal = (precio: number, beneficio: BeneficioDescuento) => {
  if (!Number.isFinite(precio)) return null;
  if (beneficio.tipoCalculo === 'FLAT') {
    const valor = valorComparable(beneficio.valorContado ?? beneficio.valorCredito);
    return typeof valor === 'number' ? valor : null;
  }
  const valor = valorComparable(beneficio.valor);
  if (typeof valor !== 'number') return null;
  return beneficio.tipoCalculo === 'MONTO'
    ? Math.max(0, precio - valor)
    : Math.max(0, precio * (1 - valor / 100));
};

export const tipoServicio = (servicio: Pick<ServicioPorPlanta, 'categoria' | 'nombre' | 'codigo'>) => {
  const texto = `${servicio.categoria || ''} ${servicio.codigo || ''} ${servicio.nombre}`.toUpperCase();
  if (texto.includes('CONFORMIDAD')) return 'CONFORMIDAD';
  if (texto.includes('GLP')) return 'GLP';
  if (texto.includes('GNV')) return 'GNV';
  return 'OTROS';
};

export type CodigoImportado = { codigo: string; placa: string; maxUsos: number };
export type ErrorImportacion = { fila: number; codigo?: string; motivo: string };

export const generarPreviewLote = (prefijo: string, cantidad: number) => {
  const limpio = prefijo.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^[-_]+|[-_]+$/g, '');
  if (!limpio || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10000) return [];
  const codigo = (indice: number) => `${limpio}-${String(indice).padStart(6, '0')}`;
  return cantidad <= 4
    ? Array.from({ length: cantidad }, (_, indice) => codigo(indice + 1))
    : [codigo(1), codigo(2), codigo(3), '…', codigo(cantidad)];
};

export const construirVigenciaCodigo = (personalizada: boolean, fechaInicio: string, fechaFin: string) => personalizada
  ? { fechaInicio, fechaFin }
  : { fechaInicio: null, fechaFin: null };

export const filasDesdeCsv = (texto: string): unknown[][] => {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = '';
  let entreComillas = false;
  for (let indice = 0; indice < texto.length; indice += 1) {
    const caracter = texto[indice];
    const siguiente = texto[indice + 1];
    if (caracter === '"' && entreComillas && siguiente === '"') { celda += '"'; indice += 1; continue; }
    if (caracter === '"') { entreComillas = !entreComillas; continue; }
    if (caracter === ',' && !entreComillas) { fila.push(celda); celda = ''; continue; }
    if ((caracter === '\n' || caracter === '\r') && !entreComillas) {
      if (caracter === '\r' && siguiente === '\n') indice += 1;
      fila.push(celda); celda = '';
      if (fila.some(valor => valor.trim())) filas.push(fila);
      fila = [];
      continue;
    }
    celda += caracter;
  }
  fila.push(celda);
  if (fila.some(valor => valor.trim())) filas.push(fila);
  return filas;
};

const cabeceraNormalizada = (valor: unknown) => String(valor ?? '').trim().toLowerCase().replace(/\s+/g, '_');

export const analizarFilasImportacion = (filas: unknown[][]) => {
  if (!filas.length) return { items: [] as CodigoImportado[], errores: [{ fila: 1, motivo: 'ARCHIVO_VACIO' }] as ErrorImportacion[] };
  const cabecera = filas[0].map(cabeceraNormalizada);
  const indiceCodigo = cabecera.findIndex(valor => valor === 'codigo' || valor === 'código');
  const indicePlaca = cabecera.indexOf('placa');
  const indiceUsos = cabecera.findIndex(valor => ['max_usos', 'maximo_usos', 'máximo_usos', 'usos'].includes(valor));
  if (indiceCodigo < 0) return { items: [] as CodigoImportado[], errores: [{ fila: 1, motivo: 'COLUMNA_CODIGO_REQUERIDA' }] as ErrorImportacion[] };
  const items: CodigoImportado[] = [];
  const errores: ErrorImportacion[] = [];
  const vistos = new Set<string>();
  filas.slice(1).forEach((fila, indice) => {
    const numeroFila = indice + 2;
    const codigo = String(fila[indiceCodigo] ?? '').trim().toUpperCase();
    const placa = indicePlaca >= 0 ? String(fila[indicePlaca] ?? '').trim().toUpperCase() : '';
    const maxUsos = indiceUsos >= 0 && String(fila[indiceUsos] ?? '').trim() !== '' ? Number(fila[indiceUsos]) : 1;
    if (!codigo) { errores.push({ fila: numeroFila, motivo: 'CODIGO_VACIO' }); return; }
    if (!/^[A-Z0-9_-]{2,80}$/.test(codigo)) { errores.push({ fila: numeroFila, codigo, motivo: 'CODIGO_INVALIDO' }); return; }
    if (vistos.has(codigo)) { errores.push({ fila: numeroFila, codigo, motivo: 'DUPLICADO_ARCHIVO' }); return; }
    if (!Number.isInteger(maxUsos) || maxUsos < 1) { errores.push({ fila: numeroFila, codigo, motivo: 'MAX_USOS_INVALIDO' }); return; }
    const placaNormalizada = placa.replace(/[^A-Z0-9]/g, '');
    if (placa && (placaNormalizada.length < 3 || placaNormalizada.length > 12)) { errores.push({ fila: numeroFila, codigo, motivo: 'PLACA_INVALIDA' }); return; }
    vistos.add(codigo);
    items.push({ codigo, placa: placaNormalizada, maxUsos });
  });
  return { items, errores };
};
