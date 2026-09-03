import { faregasFetch } from './faregas-http-client';

export interface NubefactReadiness {
  estado: 'LISTO' | 'BLOQUEADO';
  bloqueos: string[];
  configuracion: {
    environment: string;
    enabled: boolean;
    productionConfirmed: boolean;
    correlativosV2Enabled: boolean;
    detractionDecision: string;
    migracionV2Aplicada: boolean;
  };
  catalogo: { activas: number; vinculadas: number; sinVincular: number; listas: number };
  series: {
    activas: number;
    predeterminadas: number;
    legacy: number;
    nubefactExclusivas: number;
    nubefactPredeterminadas: number;
    confirmadasProduccion: number;
    proximasAgotarse: number;
  };
  facturadores: Array<{ entorno: string; cantidad: number }>;
  credenciales: { ambiente: string; total: number; configuradas: number; faltantes: string[] };
  documentos: Array<{ estado: string; cantidad: number }>;
  monitoreo: { pendientes: number; errores: number; rechazados: number; aceptados: number };
  evaluadoEn: string;
}

export interface CatalogoFiscalFila {
  fila: number;
  tarifaId: number;
  productoSku: string;
  estado: 'VALIDA' | 'INVALIDA';
  errores: string[];
  tarifa: null | {
    id: number;
    plantaKey: string;
    servicioCodigo: string;
    servicioNombre: string;
    productoActualId: number | null;
  };
  producto: null | {
    id: number;
    sku: string;
    descripcion: string;
    unidad: string;
    afectacionIgv: string;
    codigoSunat: string | null;
  };
}

export interface CatalogoFiscalPreview {
  total: number;
  validas: number;
  invalidas: number;
  filas: CatalogoFiscalFila[];
}

const unwrap = async <T>(request: Promise<unknown>): Promise<T> => {
  const response = await request as { data: T };
  return response.data;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Tolera temporalmente respuestas de una instancia backend anterior.
 * Así, una API desactualizada se informa como bloqueo y nunca derriba toda la vista.
 */
export const normalizarNubefactReadiness = (payload: unknown): NubefactReadiness => {
  const source = isRecord(payload) ? payload : {};
  const configuracion = isRecord(source.configuracion) ? source.configuracion : {};
  const catalogo = isRecord(source.catalogo) ? source.catalogo : {};
  const series = isRecord(source.series) ? source.series : {};
  const credenciales = isRecord(source.credenciales) ? source.credenciales : null;
  const monitoreo = isRecord(source.monitoreo) ? source.monitoreo : {};
  const bloqueos = Array.isArray(source.bloqueos)
    ? source.bloqueos.filter((item): item is string => typeof item === 'string')
    : [];
  const respuestaDesactualizada = !credenciales
    || !Object.hasOwn(series, 'nubefactExclusivas')
    || !Object.hasOwn(series, 'nubefactPredeterminadas')
    || !Object.hasOwn(series, 'confirmadasProduccion');

  if (respuestaDesactualizada) {
    bloqueos.push('El backend en ejecución devolvió una respuesta de preparación desactualizada. Reinícielo para cargar la versión actual.');
  }

  const environment = typeof configuracion.environment === 'string'
    ? configuracion.environment
    : 'NO DEFINIDO';

  return {
    estado: source.estado === 'LISTO' && !respuestaDesactualizada ? 'LISTO' : 'BLOQUEADO',
    bloqueos: [...new Set(bloqueos)],
    configuracion: {
      environment,
      enabled: configuracion.enabled === true,
      productionConfirmed: configuracion.productionConfirmed === true,
      correlativosV2Enabled: configuracion.correlativosV2Enabled === true,
      detractionDecision: typeof configuracion.detractionDecision === 'string'
        ? configuracion.detractionDecision
        : 'PENDIENTE',
      migracionV2Aplicada: configuracion.migracionV2Aplicada === true
    },
    catalogo: {
      activas: asNumber(catalogo.activas),
      vinculadas: asNumber(catalogo.vinculadas),
      sinVincular: asNumber(catalogo.sinVincular),
      listas: asNumber(catalogo.listas)
    },
    series: {
      activas: asNumber(series.activas),
      predeterminadas: asNumber(series.predeterminadas),
      legacy: asNumber(series.legacy),
      nubefactExclusivas: asNumber(series.nubefactExclusivas),
      nubefactPredeterminadas: asNumber(series.nubefactPredeterminadas),
      confirmadasProduccion: asNumber(series.confirmadasProduccion),
      proximasAgotarse: asNumber(series.proximasAgotarse)
    },
    facturadores: Array.isArray(source.facturadores)
      ? source.facturadores as NubefactReadiness['facturadores']
      : [],
    credenciales: {
      ambiente: credenciales && typeof credenciales.ambiente === 'string'
        ? credenciales.ambiente
        : environment,
      total: asNumber(credenciales?.total),
      configuradas: asNumber(credenciales?.configuradas),
      faltantes: credenciales && Array.isArray(credenciales.faltantes)
        ? credenciales.faltantes.filter((item): item is string => typeof item === 'string')
        : []
    },
    documentos: Array.isArray(source.documentos)
      ? source.documentos as NubefactReadiness['documentos']
      : [],
    monitoreo: {
      pendientes: asNumber(monitoreo.pendientes),
      errores: asNumber(monitoreo.errores),
      rechazados: asNumber(monitoreo.rechazados),
      aceptados: asNumber(monitoreo.aceptados)
    },
    evaluadoEn: typeof source.evaluadoEn === 'string' ? source.evaluadoEn : ''
  };
};

export const faregasNubefactReadinessApi = {
  obtenerPanel: async (plantaKey?: string) => {
    const query = plantaKey ? `?planta_key=${encodeURIComponent(plantaKey)}` : '';
    const response = await unwrap<unknown>(faregasFetch(`/certificados/facturacion/admin/readiness${query}`));
    return normalizarNubefactReadiness(response);
  },
  previsualizarCatalogo: (filas: Array<{ tarifa_id: number; producto_sku: string }>) =>
    unwrap<CatalogoFiscalPreview>(faregasFetch('/config/tarifas/importar/previsualizar', {
      method: 'POST', body: JSON.stringify({ filas })
    })),
  aplicarCatalogo: (filas: Array<{ tarifa_id: number; producto_sku: string }>) =>
    unwrap<{ totalActualizadas: number }>(faregasFetch('/config/tarifas/importar/aplicar', {
      method: 'POST', body: JSON.stringify({ filas, confirmar: true })
    }))
};
