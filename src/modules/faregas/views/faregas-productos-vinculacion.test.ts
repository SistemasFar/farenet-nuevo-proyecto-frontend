import { describe, expect, it } from 'vitest';
import type {
  SedeTarifaAsignada,
  ServicioConfiguracionFaregas
} from '../services/faregas-config.api';
import {
  construirVinculacionesOperativas,
  obtenerVinculacionProducto
} from '../utils/faregas-productos-vinculacion';

const servicio375 = {
  id: 375,
  codigo: '0390',
  nombre: 'CERTIFICADO DE CONFORMIDAD DE CAMBIO DE MOTOR'
} as ServicioConfiguracionFaregas;

const relacion253: SedeTarifaAsignada = {
  key: '160',
  nombre: 'SURQUILLO',
  tarifa_id: 253,
  precio: 84.75,
  producto_facturacion_id: 273,
  activo: true
};

describe('vinculación Producto Fiscal → operación → sede por ID', () => {
  it('resuelve exactamente 273 / 0390 → servicio 375 → SURQUILLO', () => {
    const mapa = construirVinculacionesOperativas(
      [servicio375],
      { 375: [relacion253] }
    );

    // PostgreSQL bigint llegaba como "273" mientras la relación JSON llegaba
    // como 273. La búsqueda debe seguir funcionando en ese borde real.
    expect(obtenerVinculacionProducto(mapa, '273')).toEqual({
      servicios: ['CERTIFICADO DE CONFORMIDAD DE CAMBIO DE MOTOR'],
      sedesActivas: ['SURQUILLO']
    });
  });

  it('ignora categoria_dms y deduplica sedes y servicios reales', () => {
    const producto = { id: '273', categoria_dms: 'SERVICIOS - PLANTA ATE' };
    const mapa = construirVinculacionesOperativas(
      [servicio375],
      { 375: [relacion253, { ...relacion253, tarifa_id: 999 }] }
    );

    expect(producto.categoria_dms).toContain('ATE');
    expect(obtenerVinculacionProducto(mapa, producto.id)).toEqual({
      servicios: ['CERTIFICADO DE CONFORMIDAD DE CAMBIO DE MOTOR'],
      sedesActivas: ['SURQUILLO']
    });
  });

  it('mantiene SIN VINCULAR cuando no existe ninguna fila fg_tarifa', () => {
    const mapa = construirVinculacionesOperativas([servicio375], {});
    expect(obtenerVinculacionProducto(mapa, 999)).toBeUndefined();
  });
});
