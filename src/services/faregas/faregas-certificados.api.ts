const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const fetchWithToken = async (endpoint: string, options: RequestInit = {}) => {
  const token = sessionStorage.getItem('faregasAccessToken');
  
  if (!token) {
    throw new Error('No hay sesión activa en FAREGAS');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(`${API_URL}/faregas${endpoint}`, {
    ...options,
    headers,
  });

  // Specifically handle 404 to allow checking for it without throwing an uncatchable generic error
  if (!response.ok) {
    let message = 'Error en la petición';
    try {
      const errorData = await response.json();
      message = errorData.message || message;
    } catch (e) {
      // Ignorar error de parseo si no es JSON
    }
    const error: any = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

export const faregasCertificadosApi = {
  obtenerTipos: () => fetchWithToken('/certificados/tipos'),
  obtenerVehiculo: (placa: string) => fetchWithToken(`/clientes/vehiculo/${placa}`),
  obtenerBorradores: (page = 1, pageSize = 10) => fetchWithToken(`/certificados/borradores?page=${page}&pageSize=${pageSize}`),
  crearBorrador: (data: { tipoCertificadoClave: string, clienteId?: string, observaciones?: string }) => fetchWithToken('/certificados/borradores', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  actualizarBorrador: (id: number, data: { clienteId?: string, observaciones?: string }) => fetchWithToken(`/certificados/borradores/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  guardarVehiculoBorrador: (id: number, data: any) => fetchWithToken(`/certificados/borradores/${id}/vehiculo`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  crearTitular: (id: number, data: any) => fetchWithToken(`/certificados/borradores/${id}/titulares`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  actualizarTitular: (id: number, titularId: number, data: any) => fetchWithToken(`/certificados/borradores/${id}/titulares/${titularId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  eliminarTitular: (id: number, titularId: number) => fetchWithToken(`/certificados/borradores/${id}/titulares/${titularId}`, {
    method: 'DELETE'
  }),
  obtenerCatalogoVerificaciones: () => fetchWithToken('/certificados/catalogos/verificaciones'),
  obtenerTalleres: () => fetchWithToken('/certificados/talleres'),
  guardarGnv: (id: number, data: any) => fetchWithToken(`/certificados/borradores/${id}/gnv`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  guardarVerificacionesGnv: (id: number, data: { verificaciones: any[] }) => fetchWithToken(`/certificados/borradores/${id}/gnv/verificaciones`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  guardarGlp: (id: number, data: any) => fetchWithToken(`/certificados/borradores/${id}/glp`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  guardarComponentesGlp: (id: number, data: { componentes: any[] }) => fetchWithToken(`/certificados/borradores/${id}/glp/componentes`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  guardarVerificacionesGlp: (id: number, data: { verificaciones: any[] }) => fetchWithToken(`/certificados/borradores/${id}/glp/verificaciones`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  guardarConformidad: (id: number, data: any) => fetchWithToken(`/certificados/borradores/${id}/conformidad`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  obtenerBorradorCompleto: (id: number) => fetchWithToken(`/certificados/borradores/${id}`),
  obtenerGnv: (id: number) => fetchWithToken(`/certificados/borradores/${id}/gnv`),
  obtenerGlp: (id: number) => fetchWithToken(`/certificados/borradores/${id}/glp`),
  obtenerConformidad: (id: number) => fetchWithToken(`/certificados/borradores/${id}/conformidad`),
  validarEmision: (id: number) => fetchWithToken(`/certificados/borradores/${id}/validar-emision`),
  emitirCertificado: (id: number) => fetchWithToken(`/certificados/borradores/${id}/emitir`, { method: 'POST' })
};
