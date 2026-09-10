import { faregasFetch } from './faregas-http-client';

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
  sedes: ProductoInventariableSede[];
  stockTotal: number;
  stockSede: number;
}

export interface CrearProductoInventariablePayload {
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

export const faregasChipsApi = {
  listar: async (filtros: { productoInventariableId?:number; estado?:string; buscar?:string } = {}) => {
    const params=new URLSearchParams();
    if(filtros.productoInventariableId)params.set('productoInventariableId',String(filtros.productoInventariableId));
    if(filtros.estado)params.set('estado',filtros.estado);
    if(filtros.buscar)params.set('buscar',filtros.buscar);
    return faregasFetch(`/chips?${params}`) as Promise<{items:Chip[];total:number}>;
  },
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
  historial: async (id:number) => (await faregasFetch(`/chips/${id}/movimientos`)).movimientos,
  listarProductosInventariables: async () => (await faregasFetch('/chips/productos')).productos as ProductoInventariable[],
  catalogosProductosInventariables: async () => (await faregasFetch('/chips/productos/catalogos')) as {sedes:Array<{key:string;nombre:string}>},
  crearProductoInventariable: async (payload:CrearProductoInventariablePayload) => faregasFetch('/chips/productos',{method:'POST',body:JSON.stringify(payload)}),
  editarProductoInventariable: async (id:number, payload:CrearProductoInventariablePayload) => faregasFetch(`/chips/productos/${id}`,{method:'PUT',body:JSON.stringify(payload)})
};
