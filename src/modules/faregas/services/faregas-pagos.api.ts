import type { MaestrosPagoResponse } from '@/types/maestros';
import { faregasFetchWithStatus } from './faregas-http-client';

export const faregasPagosApi = {
  obtenerMaestros: (): Promise<MaestrosPagoResponse> =>
    faregasFetchWithStatus('/pagos/maestros'),
};
