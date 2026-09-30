import { faregasFetch } from './faregas-http-client';
import type { PagoAgregado } from '../views/NuevoCertificado/NuevoCertificadoView';

export type ChipEstado = 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | 'BAJA';
export interface Chip { id:number; numero_chip:string; estado:ChipEstado; planta_actual_key:string; planta_nombre:string; producto_inventariable_id:number; producto_codigo:string; producto_nombre:string; creado_en:string; ultimo_movimiento?:string|null; }
export interface ChipResumen {
  total: number;
  disponibles: number;
  reservados: number;
  vendidos: number;
  baja: number;
  precio: number;
  stockPermitido: boolean;
  ventaHabilitada: boolean;
  mappingFiscalCompleto: boolean;
  productoInventariableId?: number;
  productoCodigo?: string;
  productoNombre?: string;
}

export interface ProductoInventariableSede {
  plantaKey: string;
  plantaNombre: string;
  precio: number | string;
  stockPermitido: boolean;
  ventaHabilitada: boolean;
  productoFacturacionId?: number | null;
  productoFiscalCodigo?: string | null;
  productoFiscalDescripcion?: string | null;
}

export interface ProductoInventariable {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  controlStock: boolean;
  activo: boolean;
  productoFacturacionId?: number | null;
  sedes: ProductoInventariableSede[];
  stockTotal: number;
  stockSede: number;
  disponiblesSede: number;
  reservadosSede: number;
  vendidosSede: number;
  bajasSede: number;
}


export interface VentaDirectaFacturacion {
  id: number;
  certificadoId?: number | null;
  operacionId?: number | null;
  estado: string;
  nroComprobante?: string | null;
  serie?: string | null;
  numero?: number | null;
  sunatDescription?: string | null;
  enlacePdf?: string | null;
  enlaceXml?: string | null;
  enlaceCdr?: string | null;
  mensaje?: string | null;
}

export interface VentaDirectaResponse {
  success: boolean;
  operacionId: number;
  operacionEstado: string;
  facturacion?: VentaDirectaFacturacion | null;
  facturacionEstado?: string;
  message?: string;
}

export interface VentaDirectaPayload {
  tipoComprobante: string;
  tipoDocumentoCliente: string;
  nroDocumento: string;
  nombreRazonSocial: string;
  direccion?: string;
  // `null` cuando el operador no lo completa: el backend lo trata igual que
  // un campo ausente y cae al dato del maestro de clientes si lo hubiera.
  email?: string | null;
  telefono?: string | null;
  condicionPago: string;
  medioPago: string;
  pagosAgregados: PagoAgregado[];
  chips: string[];
}

export interface CrearProductoInventariablePayload {
  productoFacturacionId?: number;
  codigo: string;
  nombre: string;
  tipo: string;
  sedes: Array<{
    plantaKey: string;
    precio: number;
    stockPermitido: boolean;
    ventaHabilitada: boolean;
    productoFacturacionId?: number;
  }>;
}

export interface ChipDisponibilidad {
  id?: number;
  numeroChip: string;
  encontrado: boolean;
  disponible: boolean;
  asignadoAlCertificado: boolean;
  estado?: ChipEstado;
  plantaNombre?: string;
  codigo: 'DISPONIBLE' | 'ASIGNADO_CERTIFICADO' | 'CHIP_NO_ENCONTRADO' | 'CHIP_OTRA_SEDE' | 'CHIP_NO_DISPONIBLE';
}

export interface ValidacionChipVentaDirecta {
  numeroChip: string;
  existe: boolean;
  estado: ChipEstado | null;
  plantaKey: string | null;
  plantaNombre: string | null;
  productoInventariableId: number | null;
  productoCodigo: string | null;
  productoNombre: string | null;
  precio: number | null;
  precioConfigurado: boolean;
  stockPermitido: boolean;
  ventaHabilitada: boolean;
  productoFiscalValido: boolean;
  validoParaVenta: boolean;
  codigo: string | null;
  motivo: string | null;
}

export interface ValidacionVentaDirectaResponse {
  success: boolean;
  items: ValidacionChipVentaDirecta[];
  totalEstimado: number;
  cantidadSolicitados: number;
  cantidadValidos: number;
}

export interface ComprobanteVentaChip {
  id: number;
  estado: string;
  nroComprobante: string | null;
  enlacePdf: string | null;
  enlaceXml: string | null;
  aceptadaSunat: boolean | null;
  entornoFacturador: string | null;
  anulacionEnPlazo: boolean;
  anulacionHastaMs: string | number | null;
  anulacionId: number | null;
  estadoAnulacion: string | null;
}

export interface VentaChipOperacion {
  operacionId: number;
  creadoEn: string;
  tipoDocumentoCliente: string | null;
  documentoCliente: string | null;
  nombreCliente: string | null;
  chips: string[];
  estadoVenta: string;
  importeTotal: number;
  facturacion: ComprobanteVentaChip | null;
}

export interface DetallePagoVentaChip {
  id: number | null;
  estado: string | null;
  tipo: string;
  medioPago: string | null;
  entidadFinanciera: string | null;
  numeroOperacion: string | null;
  fechaDeposito: string | null;
  importe: number;
}

export interface DetalleItemVentaChip {
  id: number;
  tipoItem: string | null;
  codigo: string | null;
  descripcion: string | null;
  unidad: string | null;
  afectacionIgv: string | null;
  codigoSunat: string | null;
  cantidad: number;
  valorUnitario: number;
  precioUnitario: number;
  baseImponible: number;
  igv: number;
  importeTotal: number;
  chip: {
    id: number;
    numero: string;
    estado: string;
    sedeKey: string | null;
    sedeNombre: string | null;
  } | null;
}

export interface DetalleFacturacionVentaChip {
  id: number;
  estado: string;
  tipoComprobante: string | null;
  serie: string | null;
  numero: number | null;
  nroComprobante: string | null;
  sunatResponseCode: string | number | null;
  sunatDescription: string | null;
  mensajeRechazo: string | null;
  enlacePdf: string | null;
  intentos: number;
  fechaUltimoIntento: string | null;
  ultimoIntento: {
    numero: number;
    estado: string;
    httpStatus: number | null;
    error: string | null;
  } | null;
}

export interface DetalleVentaChip {
  operacionId: number;
  plantaKey: string;
  fechaOperacion: string;
  estado: string;
  cliente: {
    tipoDocumento: string | null;
    documento: string | null;
    nombre: string | null;
    direccion: string | null;
  };
  moneda: string | null;
  total: number;
  detalles: DetalleItemVentaChip[];
  ordenPago: {
    id: number;
    estado: string;
    condicionPago: string;
    total: number;
    pagado: number;
    saldoPendiente: number;
  } | null;
  pagos: DetallePagoVentaChip[];
  facturacion: DetalleFacturacionVentaChip | null;
}

export interface FiltrosListadoVentasChips {
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  pageSize?: number;
}

export interface ImpactoTipoChip {
  ambiente: 'DEMO' | 'PRODUCCION';
  limpiezaHabilitada: boolean;
  eliminable: boolean;
  requiereConfirmacion: boolean;
  bloqueos: Array<{ motivo: string; detalle: string }>;
  tipo: { id: number; codigo: string; nombre: string; tipo: string; activo: boolean };
  configuracionesSede: Array<{ id: number; planta_key: string; precio: number | null }>;
  chips: Array<{ id: number; numero_chip: string; planta_actual_key: string; estado: string }>;
  movimientos: Array<{ id: number; chip_id: number; tipo_movimiento: string }>;
  asignacionesCertificado: Array<{ certificado_id: number; chip_id: number }>;
  asignacionesOperacion: Array<{ operacion_detalle_id: number; chip_id: number }>;
  ventas: Array<{ id: number }>;
  productosFiscalesPreservados: Array<{ id: number; codigo_sku: string; descripcion: string }>;
  certificadosPreservados: Array<{ id: number }>;
}

export interface EliminarTipoChipResultado {
  tipoEliminado: number;
  codigo: string;
  nombre: string;
  chipsEliminados: number;
  movimientosEliminados: number;
  asignacionesCertificadoEliminadas: number;
  asignacionesOperacionEliminadas: number;
  configuracionesSedeEliminadas: number;
  certificadosDesvinculados: number;
  productosFiscalesDesvinculados: number;
}

export const faregasChipsApi = {
  listarCatalogoChipsFiscales: async () => {
    const res = await faregasFetch('/chips/catalogo-fiscales') as { chips: { id: number; codigo: string; nombre: string; }[] };
    return res.chips;
  },
  listar: async (filtros: { productoInventariableId?:number; estado?:string; buscar?:string; page?:number; pageSize?:number } = {}) => {
    const params=new URLSearchParams();
    if(filtros.productoInventariableId)params.set('productoInventariableId',String(filtros.productoInventariableId));
    if(filtros.estado)params.set('estado',filtros.estado);
    if(filtros.buscar)params.set('buscar',filtros.buscar);
    if(filtros.page)params.set('page',String(filtros.page));
    if(filtros.pageSize)params.set('pageSize',String(filtros.pageSize));
    return faregasFetch(`/chips?${params}`) as Promise<{
      items: Chip[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>;
  },
  listarVentas: async (filtros: FiltrosListadoVentasChips = {}) => {
    const params = new URLSearchParams();
    if (filtros.fechaDesde) params.set('fechaDesde', filtros.fechaDesde);
    if (filtros.fechaHasta) params.set('fechaHasta', filtros.fechaHasta);
    if (filtros.page) params.set('page', String(filtros.page));
    if (filtros.pageSize) params.set('pageSize', String(filtros.pageSize));
    const query = params.toString();
    return faregasFetch(`/chips/ventas${query ? `?${query}` : ''}`) as Promise<{
      success: boolean;
      items: VentaChipOperacion[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      /** Se conserva por compatibilidad con el consumidor anterior. */
      ventas: VentaChipOperacion[];
    }>;
  },
  obtenerDetalleVenta: async (operacionId: number) => faregasFetch(`/chips/ventas/${operacionId}`) as Promise<{ success: boolean; venta: DetalleVentaChip }>,
  resumen: async (productoInventariableId?:number) => {
    const params=new URLSearchParams();
    if(productoInventariableId)params.set('productoInventariableId',String(productoInventariableId));
    const query=params.toString();
    return (await faregasFetch(`/chips/resumen${query?`?${query}`:''}`)).resumen as ChipResumen;
  },
  consultarDisponibilidad: async (numeroChip:string, certificadoId?:number|null) => {
    const params = new URLSearchParams();
    if(certificadoId)params.set('certificadoId',String(certificadoId));
    const query=params.toString();
    return (await faregasFetch(`/chips/disponibilidad/${encodeURIComponent(numeroChip)}${query?`?${query}`:''}`)).chip as ChipDisponibilidad;
  },
  ingresar: async (productoInventariableId:number,numeros:string[],referencia?:string) => faregasFetch('/chips/ingresos',{method:'POST',body:JSON.stringify({productoInventariableId,numeros,referencia})}),
  transferir: async (productoInventariableId:number,destinoKey:string,numeros:string[],referencia?:string) => faregasFetch('/chips/transferencias',{method:'POST',body:JSON.stringify({productoInventariableId,destinoKey,numeros,referencia})}),
  baja: async (numeroChip:string,referencia:string) => faregasFetch('/chips/bajas',{method:'POST',body:JSON.stringify({numeroChip,referencia})}),
  validarVentaDirecta: async (chips: string[]): Promise<ValidacionVentaDirectaResponse> => faregasFetch('/chips/venta-directa/validar', { method: 'POST', body: JSON.stringify({ chips }) }) as Promise<ValidacionVentaDirectaResponse>,
  ventaDirecta: async (payload: VentaDirectaPayload): Promise<VentaDirectaResponse> => faregasFetch('/chips/venta-directa', { method: 'POST', body: JSON.stringify(payload) }) as Promise<VentaDirectaResponse>,
  /**
   * Reintenta la emisión del comprobante de una operación ya registrada.
   *
   * Reutiliza la ruta que ya existía y que hasta ahora nadie invocaba
   * (POST /operaciones/:operacionId/facturacion/reintentar). No crea venta,
   * ni pago, ni mueve inventario, ni reserva otro correlativo: el backend
   * reutiliza la serie y el número ya guardados en fg_facturacion.
   */
  reintentarFacturacionOperacion: async (operacionId: number) => faregasFetch(
    `/operaciones/${operacionId}/facturacion/reintentar`,
    { method: 'POST' }
  ) as Promise<{ success: boolean; facturacion: VentaDirectaFacturacion }>,
  generarAnulacionOperacion: async (operacionId: number, motivo: string) => faregasFetch(
    `/chips/ventas/${operacionId}/facturacion/anulaciones`,
    { method: 'POST', body: JSON.stringify({ tipoDocumento: 'FACTURACION', motivo }) }
  ) as Promise<{ ok: boolean; data: { id: number; estado: string } }>,
  consultarAnulacionOperacion: async (operacionId: number, anulacionId: number) => faregasFetch(
    `/chips/ventas/${operacionId}/facturacion/anulaciones/${anulacionId}/consultar`,
    { method: 'POST' }
  ) as Promise<{ ok: boolean; data: { id: number; estado: string } }>,
  historial: async (id:number) => (await faregasFetch(`/chips/${id}/movimientos`)).movimientos,
  listarProductosInventariables: async () => (await faregasFetch('/chips/productos')).productos as ProductoInventariable[],
  catalogosProductosInventariables: async () => (await faregasFetch('/chips/productos/catalogos')) as {sedes:Array<{key:string;nombre:string}>},
  crearProductoInventariable: async (payload:CrearProductoInventariablePayload) => faregasFetch('/chips/productos',{method:'POST',body:JSON.stringify(payload)}),
  editarProductoInventariable: async (id:number, payload:CrearProductoInventariablePayload) => faregasFetch(`/chips/productos/${id}`,{method:'PUT',body:JSON.stringify(payload)}),
  obtenerImpactoTipoChip: async (id:number) => (await faregasFetch(`/chips/productos/${id}/impacto`)).impacto as ImpactoTipoChip,
  eliminarTipoChip: async (id:number) => (await faregasFetch(`/chips/productos/${id}`,{method:'DELETE'})).resultado as EliminarTipoChipResultado
};
