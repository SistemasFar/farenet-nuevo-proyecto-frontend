export interface ItemSimulacionNotaCredito {
  id: number;
  numeroCertificado?: string | null;
  facturacionId?: number | null;
}

export interface ConfiguracionSimulacionNotaCredito {
  habilitada: boolean;
  modoDesarrollo: boolean;
}

export const FECHA_SIMULADA_NOTA_CREDITO_DG_41_000444 = '2026-11-12';

const CONFIGURACION_SIMULACION_NOTA_CREDITO: ConfiguracionSimulacionNotaCredito = {
  habilitada: import.meta.env.VITE_FAREGAS_SIMULAR_NC_DG_41_000444 === 'true',
  modoDesarrollo: import.meta.env.DEV,
};

export const esSimulacionNotaCreditoDG41000444 = (
  item: ItemSimulacionNotaCredito,
  configuracion: ConfiguracionSimulacionNotaCredito = CONFIGURACION_SIMULACION_NOTA_CREDITO,
): boolean => (
  configuracion.modoDesarrollo
  && configuracion.habilitada
  && Number(item.id) === 808
  && String(item.numeroCertificado || '').trim().toUpperCase() === 'DG-41-000444'
  && Number(item.facturacionId) === 1132
);

export const resolverFechaEvaluacionNotaCreditoPanel = (
  item: ItemSimulacionNotaCredito,
  hoyLima: string,
  configuracion: ConfiguracionSimulacionNotaCredito = CONFIGURACION_SIMULACION_NOTA_CREDITO,
): string => (
  esSimulacionNotaCreditoDG41000444(item, configuracion)
    && hoyLima < FECHA_SIMULADA_NOTA_CREDITO_DG_41_000444
    ? FECHA_SIMULADA_NOTA_CREDITO_DG_41_000444
    : hoyLima
);

export const usaFechaSimuladaNotaCreditoDG41000444 = (
  item: ItemSimulacionNotaCredito,
  hoyLima: string,
  configuracion: ConfiguracionSimulacionNotaCredito = CONFIGURACION_SIMULACION_NOTA_CREDITO,
): boolean => (
  esSimulacionNotaCreditoDG41000444(item, configuracion)
  && hoyLima < FECHA_SIMULADA_NOTA_CREDITO_DG_41_000444
);
