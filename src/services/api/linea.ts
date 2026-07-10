const BASE_URL = 'http://127.0.0.1:3000/api/linea';

export const lineaApi = {
  getInspeccion: async (nroInspeccion: string) => {
    const response = await fetch(`${BASE_URL}/${nroInspeccion}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Error fetching inspeccion');
    return response.json();
  },
  
  guardarPaso: async (nroInspeccion: string, paso: number, data: any) => {
    const response = await fetch(`${BASE_URL}/${nroInspeccion}/paso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paso, data })
    });
    if (!response.ok) throw new Error('Error saving paso');
    return response.json();
  },

  consolidarInspeccion: async (nroInspeccion: string, payload: any) => {
    const response = await fetch(`${BASE_URL}/${nroInspeccion}/consolidar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Error consolidando inspeccion');
    return response.json();
  },

  obtenerConsolidacionLectura: async (nroInspeccion: string) => {
    const response = await fetch(`${BASE_URL}/consolidacion/${nroInspeccion}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error fetching consolidacion');
    }
    return response.json();
  }
};
