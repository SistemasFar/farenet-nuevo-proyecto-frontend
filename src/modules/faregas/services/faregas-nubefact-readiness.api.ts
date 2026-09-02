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
  series: { activas: number; predeterminadas: number; confirmadasProduccion: number; proximasAgotarse: number };
  facturadores: Array<{ entorno: string; cantidad: number }>;
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

export const faregasNubefactReadinessApi = {
  obtenerPanel: (plantaKey?: string) => {
    const query = plantaKey ? `?planta_key=${encodeURIComponent(plantaKey)}` : '';
    return unwrap<NubefactReadiness>(faregasFetch(`/certificados/facturacion/admin/readiness${query}`));
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
