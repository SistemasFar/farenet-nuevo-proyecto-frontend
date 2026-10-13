import { faregasFetchWithStatus as fetchWithToken } from './faregas-http-client';
import type { CrearClienteFaregasRequest } from '../types/faregas-api';

export const faregasClientesApi = {
  autocompletarPersona: (tipoDocumento: string, nroDocumento: string) => 
    fetchWithToken(`/clientes/autocompletar/${tipoDocumento}/${nroDocumento}`),

  consultarDocumento: (tipoDocumento: string, numeroDocumento: string) => {
    const params = new URLSearchParams({ tipoDocumento, numeroDocumento });
    return fetchWithToken(`/clientes/consultar-documento?${params.toString()}`);
  },
    
  crearCliente: (data: CrearClienteFaregasRequest) => fetchWithToken('/clientes', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
