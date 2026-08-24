import { faregasFetchWithStatus as fetchWithToken } from './faregas-http-client';
import type { CatalogoFaregas } from '../types/faregas-api';

export const faregasTarifasApi = {
  obtenerCatalogo: (): Promise<{ success: boolean; catalogo: CatalogoFaregas }> =>
    fetchWithToken('/tarifas')
};
