import { faregasFetch, faregasFetchWithStatus } from './faregas-http-client';

export interface ConsultaDescuentoResult {
  descuentoId: number;
  descuentoClienteId: number;
  codigo: string;
  nombre: string;
  tipo: 'ALIANZA' | 'CUPON' | 'PLACA';
  empresaAliada?: string;
  tipoCalculo: 'MONTO' | 'PORCENTAJE';
  valor: number;
  tarifaOriginal: number;
  importeDescuento: number;
  importeFinal: number;
  fechaFin: string;
  usosDisponibles: number;
}

export const consultarDescuento = async (codigo: string, certificadoId: number): Promise<ConsultaDescuentoResult> => {
  return faregasFetch('/descuentos/consultar', {
    method: 'POST',
    body: JSON.stringify({ codigo, certificadoId }),
  });
};

export const aplicarDescuentoBorrador = async (certificadoId: number, codigo: string): Promise<ConsultaDescuentoResult> => {
  return faregasFetch(`/descuentos/borradores/${certificadoId}/aplicar`, {
    method: 'PUT',
    body: JSON.stringify({ codigo }),
  });
};

export const quitarDescuentoBorrador = async (certificadoId: number): Promise<void> => {
  return faregasFetch(`/descuentos/borradores/${certificadoId}/aplicar`, {
    method: 'DELETE',
  });
};

export const obtenerDescuentoBorrador = async (certificadoId: number): Promise<ConsultaDescuentoResult | null> => {
  // Manejamos status para el caso 204 (No Content) que indica que no hay reserva
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/faregas/descuentos/borradores/${certificadoId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionStorage.getItem('faregasAccessToken')}`,
    },
  });

  if (response.status === 204) return null;
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al obtener descuento borrador');
  }

  return response.json();
};
