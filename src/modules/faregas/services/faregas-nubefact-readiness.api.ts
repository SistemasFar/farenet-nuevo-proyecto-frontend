import { faregasFetch } from './faregas-http-client';

export interface NubefactReadiness {
  estado: 'LISTO' | 'BLOQUEADO';
  bloqueos: string[];
  configuracion: {
    environment: string;
    enabled: boolean;
    productionConfirmed: boolean;
    correlativosV2Enabled: boolean;
    cronReconciliationEnabled: boolean;
    enviarSunat: boolean;
    reconciliationRetryMs: number;
    maxAttempts: number;
    detractionDecision: string;
    migracionV2Aplicada: boolean;
  };
  esquema: {
    seriesV2Aplicada: boolean;
    pendienteSunatAplicado: boolean;
    completo: boolean;
  };
  catalogo: { activas: number; vinculadas: number; sinVincular: number; listas: number; listasProduccion: number };
  series: {
    activas: number;
    predeterminadas: number;
    legacy: number;
    nubefactExclusivas: number;
    nubefactPredeterminadas: number;
    confirmadasProduccion: number;
    proximasAgotarse: number;
    seriesBasicasRequeridas: number;
    seriesBasicasConfiguradas: number;
    seriesBasicasFaltantes: string[];
  };
  facturadores: Array<{ entorno: string; cantidad: number }>;
  credenciales: { ambiente: string; total: number; configuradas: number; faltantes: string[] };
  pruebaDemo: { aceptadas: number; aceptadasConArchivos: number };
  fase2: {
    estado: 'EN_PREPARACION' | 'LISTA_PARA_PRUEBA_DEMO' | 'COMPLETADA';
    progreso: number;
    completados: number;
    total: number;
    pasos: Array<{
      codigo: string;
      nombre: string;
      estado: 'COMPLETADO' | 'PENDIENTE';
      detalle: string;
      siguienteAccion: string | null;
    }>;
  };
  preparacionProduccion: {
    estado: 'EN_PREPARACION' | 'LISTA_PARA_EMISION_CONTROLADA' | 'OPERATIVA';
    progreso: number;
    completados: number;
    total: number;
    requiereDemo: false;
    pasos: Array<{
      codigo: string;
      nombre: string;
      estado: 'COMPLETADO' | 'PENDIENTE';
      detalle: string;
      siguienteAccion: string | null;
    }>;
  };
  ambientes: Record<'demo' | 'produccion', {
    credenciales: { ambiente: string; total: number; configuradas: number; faltantes: string[] };
    series: {
      requeridas: number;
      configuradas: number;
      confirmadas: number;
      faltantes: string[];
      detalle: Array<{
        plantaKey: string;
        empresaKey: string;
        rucEmisor: string;
        tipoComprobante: string;
        configurada: boolean;
        serie: string | null;
        ultimoNumero: number | null;
        siguienteNumero: number | null;
        confirmadaProduccion: boolean;
        numeroInicialConfirmado: number | null;
        fechaCorte: string | null;
      }>;
    };
    pruebas: {
      boletaAceptadaConArchivos: boolean;
      facturaAceptadaConArchivos: boolean;
      detalle: Array<{ tipoComprobante: string; aceptadas: number; aceptadasConArchivos: number }>;
    };
  }>;
  documentos: Array<{ estado: string; cantidad: number }>;
  monitoreo: { pendientes: number; pendientesSunat: number; errores: number; rechazados: number; aceptados: number };
  evaluadoEn: string;
}

export interface CatalogoFiscalFila {
  fila: number;
  plantaKey: string;
  servicioCodigo: string;
  productoSku: string;
  tarifaId: number | null;
  estado: 'VALIDA' | 'SIN_CAMBIOS' | 'INVALIDA';
  errores: string[];
  tarifa: null | {
    id: number;
    plantaKey: string;
    plantaNombre: string;
    servicioCodigo: string;
    servicioNombre: string;
    productoActualId: number | null;
  };
  producto: null | {
    id: number;
    sku: string;
    descripcion: string;
    categoriaDms: string | null;
    unidad: string;
    afectacionIgv: string;
    codigoSunat: string | null;
  };
}

export interface CatalogoFiscalPreview {
  total: number;
  validas: number;
  invalidas: number;
  cambios: number;
  sinCambios: number;
  filas: CatalogoFiscalFila[];
}

export interface CatalogoFiscalImportRow {
  planta_key: string;
  servicio_codigo: string;
  codigo_sku: string;
  tarifa_id?: number | null;
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
  const esquema = isRecord(source.esquema) ? source.esquema : {};
  const credenciales = isRecord(source.credenciales) ? source.credenciales : null;
  const pruebaDemo = isRecord(source.pruebaDemo) ? source.pruebaDemo : {};
  const fase2 = isRecord(source.fase2) ? source.fase2 : null;
  const preparacionProduccion = isRecord(source.preparacionProduccion) ? source.preparacionProduccion : null;
  const ambientes = isRecord(source.ambientes) ? source.ambientes : {};
  const normalizarAmbiente = (value: unknown, ambiente: string): NubefactReadiness['ambientes']['demo'] => {
    const item = isRecord(value) ? value : {};
    const cred = isRecord(item.credenciales) ? item.credenciales : {};
    const seriesAmbiente = isRecord(item.series) ? item.series : {};
    const pruebas = isRecord(item.pruebas) ? item.pruebas : {};
    return {
      credenciales: {
        ambiente,
        total: asNumber(cred.total),
        configuradas: asNumber(cred.configuradas),
        faltantes: Array.isArray(cred.faltantes) ? cred.faltantes.filter((v): v is string => typeof v === 'string') : []
      },
      series: {
        requeridas: asNumber(seriesAmbiente.requeridas),
        configuradas: asNumber(seriesAmbiente.configuradas),
        confirmadas: asNumber(seriesAmbiente.confirmadas),
        faltantes: Array.isArray(seriesAmbiente.faltantes) ? seriesAmbiente.faltantes.filter((v): v is string => typeof v === 'string') : [],
        detalle: Array.isArray(seriesAmbiente.detalle) ? seriesAmbiente.detalle.filter(isRecord).map((serie) => ({
          plantaKey: typeof serie.plantaKey === 'string' ? serie.plantaKey : '',
          empresaKey: typeof serie.empresaKey === 'string' ? serie.empresaKey : '',
          rucEmisor: typeof serie.rucEmisor === 'string' ? serie.rucEmisor : '',
          tipoComprobante: typeof serie.tipoComprobante === 'string' ? serie.tipoComprobante : '',
          configurada: serie.configurada === true,
          serie: typeof serie.serie === 'string' ? serie.serie : null,
          ultimoNumero: serie.ultimoNumero === null ? null : asNumber(serie.ultimoNumero),
          siguienteNumero: serie.siguienteNumero === null ? null : asNumber(serie.siguienteNumero),
          confirmadaProduccion: serie.confirmadaProduccion === true,
          numeroInicialConfirmado: serie.numeroInicialConfirmado === null ? null : asNumber(serie.numeroInicialConfirmado),
          fechaCorte: typeof serie.fechaCorte === 'string' ? serie.fechaCorte : null
        })) : []
      },
      pruebas: {
        boletaAceptadaConArchivos: pruebas.boletaAceptadaConArchivos === true,
        facturaAceptadaConArchivos: pruebas.facturaAceptadaConArchivos === true,
        detalle: Array.isArray(pruebas.detalle) ? pruebas.detalle.filter(isRecord).map((v) => ({
          tipoComprobante: typeof v.tipoComprobante === 'string' ? v.tipoComprobante : '',
          aceptadas: asNumber(v.aceptadas),
          aceptadasConArchivos: asNumber(v.aceptadasConArchivos)
        })) : []
      }
    };
  };
  const monitoreo = isRecord(source.monitoreo) ? source.monitoreo : {};
  const bloqueos = Array.isArray(source.bloqueos)
    ? source.bloqueos.filter((item): item is string => typeof item === 'string')
    : [];
  const respuestaDesactualizada = !credenciales
    || !Object.hasOwn(series, 'nubefactExclusivas')
    || !Object.hasOwn(series, 'nubefactPredeterminadas')
    || !Object.hasOwn(series, 'confirmadasProduccion')
    || !Object.hasOwn(series, 'seriesBasicasFaltantes')
    || !Object.hasOwn(configuracion, 'cronReconciliationEnabled')
    || !Object.hasOwn(configuracion, 'reconciliationRetryMs')
    || !Object.hasOwn(configuracion, 'maxAttempts')
    || !fase2
    || !preparacionProduccion
    || !isRecord(ambientes.demo)
    || !isRecord(ambientes.produccion)
    || !Object.hasOwn(esquema, 'pendienteSunatAplicado');

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
      cronReconciliationEnabled: configuracion.cronReconciliationEnabled === true,
      enviarSunat: configuracion.enviarSunat === true,
      reconciliationRetryMs: asNumber(configuracion.reconciliationRetryMs),
      maxAttempts: asNumber(configuracion.maxAttempts),
      detractionDecision: typeof configuracion.detractionDecision === 'string'
        ? configuracion.detractionDecision
        : 'PENDIENTE',
      migracionV2Aplicada: configuracion.migracionV2Aplicada === true
    },
    esquema: {
      seriesV2Aplicada: esquema.seriesV2Aplicada === true,
      pendienteSunatAplicado: esquema.pendienteSunatAplicado === true,
      completo: esquema.completo === true
    },
    catalogo: {
      activas: asNumber(catalogo.activas),
      vinculadas: asNumber(catalogo.vinculadas),
      sinVincular: asNumber(catalogo.sinVincular),
      listas: asNumber(catalogo.listas),
      listasProduccion: asNumber(catalogo.listasProduccion)
    },
    series: {
      activas: asNumber(series.activas),
      predeterminadas: asNumber(series.predeterminadas),
      legacy: asNumber(series.legacy),
      nubefactExclusivas: asNumber(series.nubefactExclusivas),
      nubefactPredeterminadas: asNumber(series.nubefactPredeterminadas),
      confirmadasProduccion: asNumber(series.confirmadasProduccion),
      proximasAgotarse: asNumber(series.proximasAgotarse),
      seriesBasicasRequeridas: asNumber(series.seriesBasicasRequeridas),
      seriesBasicasConfiguradas: asNumber(series.seriesBasicasConfiguradas),
      seriesBasicasFaltantes: Array.isArray(series.seriesBasicasFaltantes)
        ? series.seriesBasicasFaltantes.filter((item): item is string => typeof item === 'string')
        : []
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
    pruebaDemo: {
      aceptadas: asNumber(pruebaDemo.aceptadas),
      aceptadasConArchivos: asNumber(pruebaDemo.aceptadasConArchivos)
    },
    fase2: {
      estado: fase2?.estado === 'COMPLETADA'
        ? 'COMPLETADA'
        : fase2?.estado === 'LISTA_PARA_PRUEBA_DEMO'
          ? 'LISTA_PARA_PRUEBA_DEMO'
          : 'EN_PREPARACION',
      progreso: asNumber(fase2?.progreso),
      completados: asNumber(fase2?.completados),
      total: asNumber(fase2?.total),
      pasos: fase2 && Array.isArray(fase2.pasos)
        ? fase2.pasos.filter(isRecord).map((item) => ({
          codigo: typeof item.codigo === 'string' ? item.codigo : 'PASO',
          nombre: typeof item.nombre === 'string' ? item.nombre : 'Paso de preparación',
          estado: item.estado === 'COMPLETADO' ? 'COMPLETADO' as const : 'PENDIENTE' as const,
          detalle: typeof item.detalle === 'string' ? item.detalle : '',
          siguienteAccion: typeof item.siguienteAccion === 'string' ? item.siguienteAccion : null
        }))
        : []
    },
    preparacionProduccion: {
      estado: preparacionProduccion?.estado === 'OPERATIVA'
        ? 'OPERATIVA'
        : preparacionProduccion?.estado === 'LISTA_PARA_EMISION_CONTROLADA'
          ? 'LISTA_PARA_EMISION_CONTROLADA'
          : 'EN_PREPARACION',
      progreso: asNumber(preparacionProduccion?.progreso),
      completados: asNumber(preparacionProduccion?.completados),
      total: asNumber(preparacionProduccion?.total),
      requiereDemo: false,
      pasos: preparacionProduccion && Array.isArray(preparacionProduccion.pasos)
        ? preparacionProduccion.pasos.filter(isRecord).map((item) => ({
          codigo: typeof item.codigo === 'string' ? item.codigo : 'PASO_PRODUCCION',
          nombre: typeof item.nombre === 'string' ? item.nombre : 'Paso productivo',
          estado: item.estado === 'COMPLETADO' ? 'COMPLETADO' as const : 'PENDIENTE' as const,
          detalle: typeof item.detalle === 'string' ? item.detalle : '',
          siguienteAccion: typeof item.siguienteAccion === 'string' ? item.siguienteAccion : null
        }))
        : []
    },
    ambientes: {
      demo: normalizarAmbiente(ambientes.demo, 'DEMO'),
      produccion: normalizarAmbiente(ambientes.produccion, 'PRODUCCION')
    },
    documentos: Array.isArray(source.documentos)
      ? source.documentos as NubefactReadiness['documentos']
      : [],
    monitoreo: {
      pendientes: asNumber(monitoreo.pendientes),
      pendientesSunat: asNumber(monitoreo.pendientesSunat),
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
  previsualizarCatalogo: (filas: CatalogoFiscalImportRow[]) =>
    unwrap<CatalogoFiscalPreview>(faregasFetch('/config/tarifas/importar/previsualizar', {
      method: 'POST', body: JSON.stringify({ filas })
    })),
  aplicarCatalogo: (filas: CatalogoFiscalImportRow[]) =>
    unwrap<{ totalProcesadas: number; totalActualizadas: number; totalSinCambios: number }>(faregasFetch('/config/tarifas/importar/aplicar', {
      method: 'POST', body: JSON.stringify({ filas, confirmar: true })
    }))
};
