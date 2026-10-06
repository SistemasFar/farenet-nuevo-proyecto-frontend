export type TipoComprobanteFaregas =
  | 'FACTURA'
  | 'BOLETA'
  | 'NOTA_CREDITO_FACTURA'
  | 'NOTA_CREDITO_BOLETA'
  | 'NOTA_DEBITO_FACTURA'
  | 'NOTA_DEBITO_BOLETA';

export interface SerieSede {
  key: string;
  nombre: string;
  direccion?: string | null;
  activo: boolean;
  /** Todas las series activas de la sede, de cualquier proveedor. */
  series_activas: number;
  /** Series NUBEFACT activas del ambiente DEMO. */
  nubefact_demo?: number;
  /** Series NUBEFACT activas del ambiente PRODUCCIÓN. */
  nubefact_produccion?: number;
}

export interface SerieComprobante {
  id: number;
  planta_key: string;
  sede_nombre: string;
  tipo_comprobante: TipoComprobanteFaregas;
  serie: string;
  ultimo_numero: number;
  es_predeterminada: boolean;
  autogenerada: boolean;
  contingencia: boolean;
  activo: boolean;
  tipo_documento_referencia?: string | null;
  serie_pos?: boolean;
  fuente_correlativo?: 'COMPARTIDO_FARENET' | 'FAREGAS' | 'NUBEFACT_EXCLUSIVA';
  proveedor_emision?: 'LEGACY' | 'NUBEFACT';
  entorno_emision?: 'DEMO' | 'PRODUCCION';
  migracion_nubefact_aplicada?: boolean;
  confirmada_produccion?: boolean;
  numero_inicial_confirmado?: number | null;
  sistema_origen?: string | null;
  fecha_corte?: string | null;
}

export interface ListadoSeriesComprobante {
  series: SerieComprobante[];
  migracionNubefactAplicada: boolean;
}

/**
 * Fila del MAESTRO de series: la pantalla ÚNICA de series dentro de Facturación.
 *
 * Comparte la tabla `fg_serie_comprobante` con el motor de emisión, pero se lee
 * sin la sustitución de `seriedocumentobase`: `serie` y `ultimo_numero` son los
 * valores reales de la fila. Eso es lo que evita que varias filas LEGACY
 * distintas se pinten con la misma serie (FE02, BE02, BC02...).
 *
 * `origen` clasifica la fila y decide qué acciones se ofrecen:
 *   NUBEFACT/DEMO | NUBEFACT/PRODUCCION | DMS/LEGACY | LEGACY/FARENET
 */
export type OrigenSerie = 'NUBEFACT/DEMO' | 'NUBEFACT/PRODUCCION' | 'DMS/LEGACY' | 'LEGACY/FARENET';

export interface SerieMaestro extends SerieComprobante {
  empresa_nombre?: string | null;
  /** Código SUNAT del documento: 01, 03, 07 u 08. */
  tipo_documento?: '01' | '03' | '07' | '08' | null;
  /** Número tal como lo representa DMS (E30/C30/D30). */
  numero_dms: string;
  nombre_dms: string | null;
  codigo_local_dms?: string | null;
  nombre_local_dms?: string | null;
  telefono_local_dms?: string | null;
  correo_local_dms?: string | null;
  direccion_comercial_dms?: string | null;
  /** Clasificación de la fila, resuelta en el backend. */
  origen: OrigenSerie;
  es_nubefact: boolean;
  es_dms: boolean;
}

export interface ListadoMaestroSeries {
  series: SerieMaestro[];
  /** ¿Se puede crear series Nubefact? Lo habilita la migración tributaria. */
  migracionNubefactAplicada: boolean;
}

export type FiltrosMaestroSeries = {
  planta_key?: string;
  tipo?: TipoComprobanteFaregas;
  activo?: boolean;
  buscar?: string;
  solo_dms?: boolean;
  /** 'NUBEFACT' o 'LEGACY'. Sin valor, ambos conjuntos. */
  proveedor?: 'NUBEFACT' | 'LEGACY';
  /** 'DEMO' o 'PRODUCCION'. Sólo aplica a las series NUBEFACT. */
  entorno?: 'DEMO' | 'PRODUCCION';
};

const request = async (path: string, options: RequestInit = {}) => {
  const token = sessionStorage.getItem('faregasAccessToken')?.trim();
  const response = await fetch(`${BASE_URL}/faregas/config${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Error al administrar series.');
  return data;
};

/**
 * PATCH de una serie del maestro. Una propiedad ausente conserva su valor;
 * una propiedad presente con `null` representa una celda vacía. `ultimo_numero`
 * se aplica como MAX(actual, recibido), por lo que
 * la numeración nunca retrocede.
 */
export type CambiosSerieMaestro = Partial<Pick<
  SerieComprobante,
  'es_predeterminada' | 'autogenerada' | 'contingencia' | 'serie_pos' | 'ultimo_numero'
>> & {
  tipo_documento_referencia?: string | null;
  nombre_dms?: string | null;
  codigo_local_dms?: string | null;
  nombre_local_dms?: string | null;
  telefono_local_dms?: string | null;
  correo_local_dms?: string | null;
  direccion_comercial_dms?: string | null;
};

export const faregasSeriesApi = {
  listarSedes: async (): Promise<SerieSede[]> => (await request('/series/sedes')).sedes || [],
  /**
   * Maestro completo. La sede es un filtro opcional: sin ella, todas.
   *
   * La respuesta incluye `migracionNubefactAplicada` para que la pantalla no
   * necesite una segunda consulta sólo para saber si puede crear series
   * Nubefact: es el mismo dato que ya devolvía `/series`.
   */
  listarMaestro: async (filtros: FiltrosMaestroSeries = {}): Promise<ListadoMaestroSeries> => {
    const params = new URLSearchParams();
    if (filtros.planta_key) params.set('planta_key', filtros.planta_key);
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    if (filtros.activo !== undefined) params.set('activo', String(filtros.activo));
    if (filtros.buscar?.trim()) params.set('buscar', filtros.buscar.trim());
    if (filtros.solo_dms !== undefined) params.set('solo_dms', String(filtros.solo_dms));
    if (filtros.proveedor) params.set('proveedor', filtros.proveedor);
    if (filtros.entorno) params.set('entorno', filtros.entorno);
    const query = params.toString();
    const data = await request(`/series/maestro${query ? `?${query}` : ''}`);
    return {
      series: data.series || [],
      migracionNubefactAplicada: Boolean(data.migracionNubefactAplicada)
    };
  },
  /**
   * Series operativas de una sede. `proveedor` y `entorno` se envían al
   * backend: la vista de series NUBEFACT pide `NUBEFACT` + ambiente, y así no
   * recibe filas LEGACY que el backend sustituiría por la serie de
   * `seriedocumentobase` (origen de los duplicados visuales BE02/FE02/...).
   */
  listar: async (
    plantaKey: string,
    filtros: { tipo?: TipoComprobanteFaregas; activo?: boolean; buscar?: string; proveedor?: 'LEGACY' | 'NUBEFACT'; entorno?: 'DEMO' | 'PRODUCCION' } = {}
  ): Promise<ListadoSeriesComprobante> => {
    const params = new URLSearchParams({ planta_key: plantaKey });
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    if (filtros.activo !== undefined) params.set('activo', String(filtros.activo));
    if (filtros.buscar?.trim()) params.set('buscar', filtros.buscar.trim());
    if (filtros.proveedor) params.set('proveedor', filtros.proveedor);
    if (filtros.entorno) params.set('entorno', filtros.entorno);
    const data = await request(`/series?${params.toString()}`);
    return {
      series: data.series || [],
      migracionNubefactAplicada: Boolean(data.migracionNubefactAplicada)
    };
  },
  crear: async (body: Omit<SerieComprobante, 'id' | 'sede_nombre'>) => {
    await request('/series', { method: 'POST', body: JSON.stringify(body) });
  },
  editar: async (id: number, body: Partial<Pick<SerieComprobante, 'es_predeterminada' | 'autogenerada' | 'contingencia' | 'serie_pos' | 'ultimo_numero'>> & { tipo_documento_referencia?: string | null }) => {
    await request(`/series/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  },
  editarMaestro: async (id: number, body: CambiosSerieMaestro) => {
    await request(`/series/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  },
  cambiarEstado: async (id: number, activo: boolean) => {
    await request(`/series/${id}/estado`, { method: 'PUT', body: JSON.stringify({ activo }) });
  },
  confirmarProduccion: async (id: number, body: {
    confirmada: boolean;
    numero_inicial_confirmado: number;
    sistema_origen: string;
    fecha_corte: string | null;
  }) => {
    await request(`/series/${id}/confirmacion-produccion`, { method: 'PUT', body: JSON.stringify(body) });
  }
};
