export type TipoCalculo = 'FLAT' | 'MONTO' | 'PORCENTAJE';

export type BeneficioDescuento = {
  tipoCalculo: TipoCalculo;
  valor: number | string | null;
  valorContado: number | string | null;
  valorCredito: number | string | null;
};

export type ReglaDescuento = BeneficioDescuento & {
  plantaKey: string;
  servicioId: number;
};

export type ServicioPorPlanta = {
  id?: number;
  codigo?: string;
  nombre: string;
  familia?: string | null;
  categoria?: string;
  categoria_codigo?: string | null;
  tipo_certificado_clave?: string | null;
  modalidad?: string | null;
  tipo_flujo?: string | null;
  formato_codigo_canonico?: string | null;
  planta_key: string;
  sede_nombre?: string | null;
  precio: number | null;
  tarifa_codigo?: string;
  producto_facturacion_id?: number | null;
  producto_sku?: string | null;
  producto_descripcion?: string | null;
  tarifaDisponible?: boolean;
  productoDisponible?: boolean;
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

export const tieneMaximoDosDecimales = (valor: number | string | null | undefined) => {
  if (valor === null || valor === undefined || valor === '') return true;
  if (typeof valor === 'string') return /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(valor.trim());
  return Number.isFinite(valor) && /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(String(valor));
};

const centavos = (valor: number | string | null | undefined): bigint | null => {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor ?? '').trim();
  if (!/^[+-]?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(texto)) return null;
  const negativo = texto.startsWith('-');
  const sinSigno = texto.replace(/^[+-]/, '');
  const [entero = '0', decimal = ''] = sinSigno.split('.');
  const magnitud = BigInt(entero || '0') * 100n + BigInt(decimal.padEnd(2, '0') || '0');
  return negativo ? -magnitud : magnitud;
};
const aSoles = (valorCentavos: bigint) => Number(valorCentavos) / 100;
const redondearPorcentaje = (precioCentavos: bigint, porcentajeCentavos: bigint) =>
  (precioCentavos * porcentajeCentavos + 5000n) / 10000n;

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
  const tipo = normalizarTextoLogico(servicio.tipo_certificado_clave);
  const modalidad = normalizarTextoLogico(servicio.modalidad);
  const flujo = normalizarTextoLogico(servicio.tipo_flujo);
  const familia = normalizarTextoLogico(servicio.familia);
  const formato = normalizarTextoLogico(servicio.formato_codigo_canonico);
  if (tipo && flujo && familia && formato) {
    return ['CONCEPTO', tipo, modalidad || 'SIN_MODALIDAD', flujo, familia, formato].join('::');
  }
  // Si el catálogo no tiene completa la identidad canónica, el ID global del
  // servicio es la única equivalencia segura; el nombre/SKU no se usa como llave.
  const servicioId = Number(servicio.id);
  return Number.isInteger(servicioId) && servicioId > 0
    ? `SERVICIO_ID::${servicioId}`
    : `SERVICIO_SIN_IDENTIDAD::${String(servicio.codigo || '').trim().toUpperCase()}`;
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
    if ((sedesSet && !sedesSet.has(plantaKey)) || !Number.isInteger(servicioId)) continue;
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
    if (!existente
      || (esDisponibilidadValida(item) && !esDisponibilidadValida(existente))
      || (esDisponibilidadValida(item) === esDisponibilidadValida(existente) && servicioId < Number(existente.id))) {
      grupo.serviciosPorSede.set(plantaKey, item);
    }
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

export const precioMinimoCombinacionesSeleccionadas = (
  disponibilidad: ServicioPorPlanta[],
  sedes: Iterable<string>,
  servicios: Iterable<string>,
) => {
  const serviciosSeleccionados = new Set(servicios);
  const precios = agruparServiciosLogicos(disponibilidad, sedes)
    .filter(grupo => serviciosSeleccionados.has(grupo.key))
    .flatMap(grupo => [...grupo.serviciosPorSede.values()])
    .filter(esDisponibilidadValida)
    .map(servicio => Number(servicio.precio));
  return precios.length ? Math.min(...precios) : null;
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

  // Determinar el beneficio general de forma determinista: el beneficio que aparece
  // con mayor frecuencia entre todas las reglas. Si hay empate, el primero en orden
  // de aparición estable (ordenado por plantaKey y servicioId). Esto evita que una
  // excepción (ej. 100%) se convierta erróneamente en beneficio general por aparecer
  // primero en el array devuelto por el backend.
  let beneficio = beneficioInicial();
  if (reglas.length > 0) {
    const conteo = new Map<string, { beneficio: BeneficioDescuento; cantidad: number }>();
    for (const regla of reglas) {
      const clave = `${regla.tipoCalculo}|${regla.valor}|${regla.valorContado}|${regla.valorCredito}`;
      const existente = conteo.get(clave);
      if (existente) {
        existente.cantidad += 1;
      } else {
        conteo.set(clave, { beneficio: obtenerBeneficio(regla), cantidad: 1 });
      }
    }
    let maxCantidad = 0;
    for (const { beneficio: b, cantidad } of conteo.values()) {
      if (cantidad > maxCantidad) {
        maxCantidad = cantidad;
        beneficio = b;
      }
    }
    // Empate: elegir por orden de aparición (primer bloque con maxCantidad)
    if (maxCantidad > 0) {
      const ordenadas = [...conteo.entries()].sort((a, b) => b[1].cantidad - a[1].cantidad);
      beneficio = ordenadas[0][1].beneficio;
    }
  }

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
      if (!esDisponibilidadValida(itemPredeterminado)) continue;
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
  const precioCentavos = centavos(precio);
  if (precioCentavos == null) return null;
  if (beneficio.tipoCalculo === 'FLAT') {
    const valor = valorComparable(beneficio.valorContado ?? beneficio.valorCredito);
    if (typeof valor !== 'number' || !tieneMaximoDosDecimales(valor)) return null;
    const valorCentavos = centavos(valor);
    return valorCentavos == null ? null : aSoles(valorCentavos);
  }
  const valor = valorComparable(beneficio.valor);
  if (typeof valor !== 'number' || !tieneMaximoDosDecimales(valor)) return null;
  const valorCentavos = centavos(valor);
  if (valorCentavos == null) return null;
  const descuentoCentavos = beneficio.tipoCalculo === 'MONTO'
    ? valorCentavos
    : redondearPorcentaje(precioCentavos, valorCentavos);
  return aSoles(precioCentavos > descuentoCentavos ? precioCentavos - descuentoCentavos : 0n);
};

export type ErrorReglaPrecio = {
  plantaKey: string;
  servicioId: number;
  sede: string;
  tipoCalculo: TipoCalculo;
  precioVenta: number | null;
  valorSolicitado: number | null;
  valorIngresado: string | null;
  motivo: string;
};

const evaluarReglaFrenteAPrecio = (precio: number, regla: BeneficioDescuento) => {
  const valorIngresado = regla.tipoCalculo === 'FLAT' ? regla.valorContado : regla.valor;
  const valor = Number(valorIngresado);
  const precioCentavos = centavos(precio);
  const valorCentavos = centavos(valorIngresado);
  if (!tieneMaximoDosDecimales(valorIngresado)) {
    return { valida: false, motivo: 'Use como máximo dos decimales; el valor no se redondeará automáticamente.' };
  }
  if (!Number.isFinite(precio) || precioCentavos == null || precioCentavos <= 0n || !Number.isFinite(valor) || valorCentavos == null || valorCentavos <= 0n) {
    return { valida: false, motivo: 'El precio vigente o el valor del descuento no es válido.' };
  }
  let descuentoCentavos: bigint;
  if (regla.tipoCalculo === 'FLAT') {
    const descuento = precioCentavos - valorCentavos;
    if (valorCentavos <= 0n || descuento <= 0n) {
      return { valida: false, motivo: 'El precio final debe ser positivo y menor que el precio de venta.' };
    }
    descuentoCentavos = descuento;
  } else if (regla.tipoCalculo === 'MONTO') {
    descuentoCentavos = valorCentavos;
    if (descuentoCentavos >= precioCentavos) {
      return { valida: false, motivo: 'El descuento debe ser menor que el precio de venta.' };
    }
  } else if (regla.tipoCalculo === 'PORCENTAJE') {
    if (valor >= 100) return { valida: false, motivo: 'El descuento comercial debe ser menor al 100 %.' };
    descuentoCentavos = redondearPorcentaje(precioCentavos, valorCentavos);
  } else {
    return { valida: false, motivo: 'El tipo de cálculo no es válido.' };
  }
  if (descuentoCentavos <= 0n || precioCentavos - descuentoCentavos <= 0n) {
    return { valida: false, motivo: 'El descuento dejaría el importe final en cero o negativo.' };
  }
  return { valida: true, motivo: '' };
};

export const validarReglasContraPrecios = (
  reglas: ReglaDescuento[],
  disponibilidad: ServicioPorPlanta[],
  plantas: Array<{ key?: string; nombre: string }> = [],
): ErrorReglaPrecio[] => {
  const plantasPorKey = new Map(plantas.map(planta => [String(planta.key), planta.nombre]));
  const errores: ErrorReglaPrecio[] = [];
  for (const regla of reglas) {
    const servicio = disponibilidad.find(item => String(item.planta_key) === String(regla.plantaKey)
      && Number(item.id) === Number(regla.servicioId));
    const precio = servicio && esDisponibilidadValida(servicio) ? Number(servicio.precio) : null;
    const valores = regla.tipoCalculo === 'FLAT'
      ? [regla.valorContado, regla.valorCredito].filter(valor => valor !== '' && valor != null)
      : [regla.valor];
    for (const valorRegla of valores) {
      if (valorRegla === '' || valorRegla == null) continue;
      const reglaActual = regla.tipoCalculo === 'FLAT'
        ? { ...regla, valorContado: valorRegla }
        : { ...regla, valor: valorRegla };
      const evaluacion = precio == null
        ? { valida: false, motivo: 'No existe una tarifa activa con precio de venta válido.' }
        : evaluarReglaFrenteAPrecio(precio, reglaActual);
      if (!evaluacion.valida) {
        errores.push({
          plantaKey: String(regla.plantaKey),
          servicioId: Number(regla.servicioId),
          sede: plantasPorKey.get(String(regla.plantaKey)) || servicio?.sede_nombre || String(regla.plantaKey),
          tipoCalculo: regla.tipoCalculo,
          precioVenta: precio,
          valorSolicitado: Number.isFinite(Number(valorRegla)) ? Number(valorRegla) : null,
          valorIngresado: valorRegla == null ? null : String(valorRegla),
          motivo: evaluacion.motivo,
        });
      }
    }
  }
  return errores;
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
