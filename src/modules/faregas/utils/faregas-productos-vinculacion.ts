import type {
  SedeTarifaAsignada,
  ServicioConfiguracionFaregas
} from '../services/faregas-config.api';

export interface VinculacionOperativa {
  servicios: string[];
  sedesActivas: string[];
}

type IdRelacion = number | string;

const normalizarId = (id: IdRelacion | null | undefined): number | null => {
  if (id === null || id === undefined || id === '') return null;
  const valor = Number(id);
  return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
};

/**
 * Agrupa por `fg_tarifa.producto_facturacion_id`. No usa SKU, descripción,
 * categoría ni `categoria_dms`: esas propiedades no identifican la relación.
 */
export const construirVinculacionesOperativas = (
  servicios: ServicioConfiguracionFaregas[],
  sedesPorServicio: Record<number, SedeTarifaAsignada[]>
): Map<number, VinculacionOperativa> => {
  const mapa = new Map<number, { servicios: Set<string>; sedesActivas: Set<string> }>();

  for (const servicio of servicios) {
    const servicioId = normalizarId(servicio.id);
    if (servicioId === null) continue;

    for (const tarifa of sedesPorServicio[servicioId] || []) {
      const productoId = normalizarId(tarifa.producto_facturacion_id);
      if (productoId === null) continue;

      const vinculacion = mapa.get(productoId) || {
        servicios: new Set<string>(),
        sedesActivas: new Set<string>()
      };
      vinculacion.servicios.add(servicio.nombre);
      if (tarifa.activo) vinculacion.sedesActivas.add(tarifa.nombre);
      mapa.set(productoId, vinculacion);
    }
  }

  return new Map([...mapa.entries()].map(([productoId, vinculacion]) => [
    productoId,
    {
      servicios: [...vinculacion.servicios].sort(),
      sedesActivas: [...vinculacion.sedesActivas].sort()
    }
  ]));
};

export const obtenerVinculacionProducto = (
  vinculaciones: Map<number, VinculacionOperativa>,
  productoId: IdRelacion
): VinculacionOperativa | undefined => {
  const id = normalizarId(productoId);
  return id === null ? undefined : vinculaciones.get(id);
};

export const combinarVinculacionProducto = (
  vinculacion: VinculacionOperativa | undefined,
  sedesCatalogo: string[] = [],
  usosCatalogo: string[] = []
): VinculacionOperativa => ({
  sedesActivas: [...new Set([...(vinculacion?.sedesActivas || []), ...sedesCatalogo])].sort(),
  servicios: [...new Set([...(vinculacion?.servicios || []), ...usosCatalogo])].sort()
});
