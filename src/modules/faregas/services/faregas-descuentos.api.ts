import { faregasFetch } from './faregas-http-client';

export type TipoCampana = 'CAMPANA' | 'ALIANZA' | 'CONVENIO' | 'PROMOCION';

export interface ConsultaDescuentoResult {
  descuentoId: number;
  descuentoClienteId: number;
  codigo: string;
  nombre: string;
  tipo: TipoCampana;
  empresaAliada?: string;
  tipoCalculo: 'FLAT' | 'MONTO' | 'PORCENTAJE';
  valor: number;
  formaPago: 'CONTADO' | 'CREDITO';
  tarifaOriginal: number;
  importeDescuento: number;
  importeFinal: number;
  fechaFin: string;
  usosDisponibles: number;
}

export interface DescuentoAdmin {
  id: number;
  codigo: string;
  nombre: string;
  tipo: TipoCampana;
  empresa_aliada_ruc?: string;
  empresa_aliada_nombre?: string;
  ejecutivo?: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  total_servicios: number;
  total_codigos: number;
  nombres_codigos?: string;
  usos_realizados: number;
}

export interface DescuentoFormData {
  nombre: string;
  tipo: TipoCampana;
  empresaAliadaRuc?: string;
  empresaAliadaNombre?: string;
  ejecutivo?: string;
  fechaInicio: string;
  fechaFin: string;
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
  return faregasFetch(`/descuentos/borradores/${certificadoId}`);
};

export const autoAplicarDescuentoPlaca = async (certificadoId: number): Promise<ConsultaDescuentoResult | null> => {
  return faregasFetch(`/descuentos/borradores/${certificadoId}/auto-placa`, {
    method: 'POST',
  });
};

export const faregasDescuentosAdminApi = {
  listar: (buscar = '', estado = 'TODOS') => faregasFetch(`/descuentos?${new URLSearchParams({ buscar, estado })}`),
  maestros: () => faregasFetch('/descuentos/maestros'),
  detalle: (id: number) => faregasFetch(`/descuentos/${id}`),
  crear: (data: DescuentoFormData) => faregasFetch('/descuentos', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: DescuentoFormData) => faregasFetch(`/descuentos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cambiarEstado: (id: number, activo: boolean) => faregasFetch(`/descuentos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) }),
  guardarReglas: (id: number, data: Record<string, unknown>) => faregasFetch(`/descuentos/${id}/reglas`, { method: 'PUT', body: JSON.stringify(data) }),
  crearCodigo: (id: number, data: Record<string, unknown>) => faregasFetch(`/descuentos/${id}/codigos`, { method: 'POST', body: JSON.stringify(data) }),
  actualizarCodigo: (id: number, data: Record<string, unknown>) => faregasFetch(`/descuentos/codigos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cambiarEstadoCodigo: (id: number, activo: boolean) => faregasFetch(`/descuentos/codigos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) }),
};
