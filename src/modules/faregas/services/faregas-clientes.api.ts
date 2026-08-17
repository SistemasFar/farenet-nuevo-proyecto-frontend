import { faregasFetchWithStatus as fetchWithToken } from './faregas-http-client';
import type { CrearClienteFaregasRequest } from '../types/faregas-api';

export const faregasClientesApi = {
  autocompletarPersona: (tipoDocumento: string, nroDocumento: string) => 
    fetchWithToken(`/clientes/autocompletar/${tipoDocumento}/${nroDocumento}`),
    
  crearCliente: (data: CrearClienteFaregasRequest) => fetchWithToken('/clientes', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
