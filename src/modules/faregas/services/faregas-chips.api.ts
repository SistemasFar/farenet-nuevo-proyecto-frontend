import { faregasFetch } from './faregas-http-client';

export type ChipEstado = 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | 'BAJA';
export interface Chip { id:number; numero_chip:string; estado:ChipEstado; planta_actual_key:string; planta_nombre:string; creado_en:string; ultimo_movimiento?:string|null; }
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
  listar: async (filtros: { estado?:string; buscar?:string } = {}) => {
    const params=new URLSearchParams();
    if(filtros.estado)params.set('estado',filtros.estado);
    if(filtros.buscar)params.set('buscar',filtros.buscar);
    return faregasFetch(`/chips?${params}`) as Promise<{items:Chip[];total:number}>;
  },
  resumen: async () => (await faregasFetch('/chips/resumen')).resumen as ChipResumen,
  consultarDisponibilidad: async (numeroChip:string, certificadoId?:number|null) => {
    const params = new URLSearchParams();
    if(certificadoId)params.set('certificadoId',String(certificadoId));
    const query=params.toString();
    return (await faregasFetch(`/chips/disponibilidad/${encodeURIComponent(numeroChip)}${query?`?${query}`:''}`)).chip as ChipDisponibilidad;
  },
  ingresar: async (numeros:string[],referencia?:string) => faregasFetch('/chips/ingresos',{method:'POST',body:JSON.stringify({numeros,referencia})}),
  transferir: async (destinoKey:string,numeros:string[],referencia?:string) => faregasFetch('/chips/transferencias',{method:'POST',body:JSON.stringify({destinoKey,numeros,referencia})}),
  baja: async (numeroChip:string,referencia:string) => faregasFetch('/chips/bajas',{method:'POST',body:JSON.stringify({numeroChip,referencia})}),
  historial: async (id:number) => (await faregasFetch(`/chips/${id}/movimientos`)).movimientos
};
