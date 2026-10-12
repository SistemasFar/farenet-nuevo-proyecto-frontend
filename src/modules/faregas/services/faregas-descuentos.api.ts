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
  usos_realizados: number;
}

export interface CodigoDescuentoAdmin {
  id: number;
  codigo: string;
  placa?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  max_usos: number;
  usos_realizados: number;
  activo: boolean;
}

export interface ResultadoCodigosMasivos {
  solicitados: number;
  creados: number;
  validos: number;
  duplicados: number;
  rechazados: number;
  errores: Array<{ fila: number; codigo?: string; motivo: string }>;
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

export interface ImpactoDescuento {
  ambiente: 'DEMO' | 'PRODUCCION';
  limpiezaHabilitada: boolean;
  eliminable: boolean;
  requiereConfirmacion: boolean;
  bloqueos: Array<{ motivo: string; detalle: string }>;
  descuento: { id: number; codigo: string; nombre: string; tipo: string; activo: boolean; planta_key: string | null; empresa_aliada_nombre: string | null };
  codigos: Array<{ id: number; codigo: string; max_usos: number; usos_realizados: number; planta_key: string | null }>;
  configuraciones: Array<{ id: number; servicio_id: number | null; planta_key: string | null; tipo_calculo: string | null; servicio_codigo?: string | null }>;
  usos: Array<{ id: number; certificado_id: number | null; facturacion_id: number | null; orden_pago_id: number | null; estado: string | null }>;
  serviciosPreservados: Array<{ id: number; codigo: string; nombre: string }>;
  certificadosPreservados: number[];
}

export interface EliminarDescuentoResultado {
  id: number;
  codigo: string;
  nombre: string;
  descuentoEliminado: number;
  codigosEliminados: number;
  configuracionesEliminadas: number;
  usosEliminados: number;
  serviciosPreservados: number;
}

export const faregasDescuentosAdminApi = {
  listar: (buscar = '', estado = 'TODOS') => faregasFetch(`/descuentos?${new URLSearchParams({ buscar, estado })}`),
  maestros: () => faregasFetch('/descuentos/maestros'),
  detalle: (id: number) => faregasFetch(`/descuentos/${id}`),
  crear: (data: DescuentoFormData) => faregasFetch('/descuentos', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id: number, data: DescuentoFormData) => faregasFetch(`/descuentos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cambiarEstado: (id: number, activo: boolean) => faregasFetch(`/descuentos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) }),
  guardarReglas: (id: number, data: Record<string, unknown>) => faregasFetch(`/descuentos/${id}/reglas`, { method: 'PUT', body: JSON.stringify(data) }),
  listarCodigos: (id: number, filtros: { search?: string; estado?: string; limit?: number; offset?: number } = {}) => {
    const params = new URLSearchParams();
    if (filtros.search) params.set('search', filtros.search);
    if (filtros.estado) params.set('estado', filtros.estado);
    params.set('limit', String(filtros.limit || 20));
    params.set('offset', String(filtros.offset || 0));
    return faregasFetch(`/descuentos/${id}/codigos?${params}`) as Promise<{ items: CodigoDescuentoAdmin[]; total: number; limit: number; offset: number }>;
  },
  crearCodigo: (id: number, data: Record<string, unknown>) => faregasFetch(`/descuentos/${id}/codigos`, { method: 'POST', body: JSON.stringify(data) }),
  generarLote: (id: number, data: Record<string, unknown>) => faregasFetch(`/descuentos/${id}/codigos/lote`, { method: 'POST', body: JSON.stringify(data) }) as Promise<ResultadoCodigosMasivos>,
  importarCodigos: (id: number, data: Record<string, unknown>) => faregasFetch(`/descuentos/${id}/codigos/importar`, { method: 'POST', body: JSON.stringify(data) }) as Promise<ResultadoCodigosMasivos>,
  actualizarCodigo: (id: number, data: Record<string, unknown>) => faregasFetch(`/descuentos/codigos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cambiarEstadoCodigo: (id: number, activo: boolean) => faregasFetch(`/descuentos/codigos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) }),
  obtenerImpacto: async (id: number) => (await faregasFetch(`/descuentos/${id}/impacto`)).impacto as ImpactoDescuento,
  eliminar: async (id: number) => (await faregasFetch(`/descuentos/${id}`, { method: 'DELETE' })).resultado as EliminarDescuentoResultado,
};
