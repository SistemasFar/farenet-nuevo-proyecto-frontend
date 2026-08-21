import { faregasFetchWithStatus as fetchWithToken } from './faregas-http-client';
import type { TarifaFaregas } from '../types/faregas-api';

export const faregasTarifasApi = {
  obtenerTarifas: (): Promise<{ success: boolean, tarifas: TarifaFaregas[] }> => 
    fetchWithToken('/tarifas')
};
