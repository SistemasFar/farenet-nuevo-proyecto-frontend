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
  }
};
