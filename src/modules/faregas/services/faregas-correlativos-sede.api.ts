import { faregasFetchWithStatus as fetchWithToken } from './faregas-http-client';

/**
 * CORRELATIVOS DE CERTIFICADO POR SEDE.
 *
 * La unidad de asignación es la SEDE y su rango físico. Un rango va de 1 a 50
 * números y sirve para cualquier certificado que esa sede emita: producto, tipo
 * y modalidad no son parte de la clave y no se piden en ninguna llamada.
 *
 * Cuando el rango se agota queda como historial y se asigna uno nuevo a la
 * misma sede. No se amplía ni se reinicia el anterior.
 *
 * No confundir con los correlativos tributarios de facturas y boletas, que viven
 * en otro módulo y aquí no se tocan.
 */

/** Techo de números por rango. Lo fija la regla del inventario. */
export const CANTIDAD_MAXIMA = 50;

export type EstadoRangoSede = 'ACTIVO' | 'AGOTADO' | 'CERRADO';
export type EstadoMostrado = EstadoRangoSede | 'PENDIENTE';

export interface RangoSede {
  id: number;
  planta_key: string;
  planta_nombre: string | null;
  planta_activa: boolean | null;
  rango_inicio: number;
  rango_fin: number;
  numero_actual: number;
  /** cantidad = rango_fin - rango_inicio + 1, calculada en la base. */
  cantidad: number;
  /** disponibles = rango_fin - numero_actual, calculada en la base. */
  disponibles: number;
  usados: number;
  estado: EstadoRangoSede;
  /** Un rango cuya fecha aún no llega se informa como PENDIENTE sin almacenarlo. */
  estadoMostrado: EstadoMostrado;
  vigente: boolean;
  fecha_asignacion: string;
  fecha_cierre: string | null;
  observacion: string | null;
}

export interface ResumenSede {
  planta_key: string;
  planta_nombre: string | null;
  rangos: number;
  activos: number;
  agotados: number;
  cerrados: number;
  numeros_totales: number;
  numeros_libres: number;
}

export interface ProximoNumeroSede {
  disponible: boolean;
  motivo?: string;
  rangoId?: number;
  nro?: number;
  rango_inicio?: number;
  rango_fin?: number;
}

export interface AsignarRangoSede {
  plantaKey: string;
  rangoInicio: number;
  rangoFin: number;
  fechaAsignacion?: string | null;
  observacion?: string | null;
}

export const faregasCorrelativosSedeApi = {
  listar: (plantaKey?: string | null, estado?: EstadoRangoSede | null) => {
    const params = new URLSearchParams();
    if (plantaKey) params.set('plantaKey', plantaKey);
    if (estado) params.set('estado', estado);
    const query = params.toString();
    return fetchWithToken(`/certificados/correlativos-sede${query ? `?${query}` : ''}`);
  },

  resumen: (plantaKey?: string | null) => {
    const params = new URLSearchParams();
    if (plantaKey) params.set('plantaKey', plantaKey);
    const query = params.toString();
    return fetchWithToken(`/certificados/correlativos-sede/resumen${query ? `?${query}` : ''}`);
  },

  auditar: () => fetchWithToken('/certificados/correlativos-sede/auditoria'),

  sugerir: (plantaKey?: string | null) => {
    const params = new URLSearchParams();
    if (plantaKey) params.set('plantaKey', plantaKey);
    const query = params.toString();
    return fetchWithToken(`/certificados/correlativos-sede/sugerencia${query ? `?${query}` : ''}`);
  },

  agregar: (datos: AsignarRangoSede) =>
    fetchWithToken('/certificados/correlativos-sede', { method: 'POST', body: JSON.stringify(datos) }),

  editar: (id: number, datos: {
    rangoInicio?: number;
    rangoFin?: number;
    fechaAsignacion?: string | null;
    observacion?: string | null;
  }) => fetchWithToken(`/certificados/correlativos-sede/${id}`, { method: 'PATCH', body: JSON.stringify(datos) }),

  cerrar: (id: number) => fetchWithToken(`/certificados/correlativos-sede/${id}/cerrar`, { method: 'PATCH' }),
};

export default faregasCorrelativosSedeApi;