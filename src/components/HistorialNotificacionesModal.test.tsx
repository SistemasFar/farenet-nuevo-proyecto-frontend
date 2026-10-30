import { describe, expect, it } from 'vitest';
import {
  nombreUsuarioLegible,
  operacionLegible,
  etiquetaEstadoNotificacion,
  obtenerPaginasVisibles,
  tituloNotificacionLegible,
  type NotificacionHistorial,
} from './historial-notificaciones.utils';

describe('HistorialNotificacionesModal enriquecido', () => {
  it('muestra nombre completo y conserva el username real', () => {
    expect(nombreUsuarioLegible('Grace Ibarra', 'gibarra')).toBe('Grace Ibarra (gibarra)');
    expect(nombreUsuarioLegible(null, 'gibarra')).toBe('gibarra');
  });

  it('identifica la operación y el motivo SUNAT de la nota', () => {
    expect(operacionLegible({
      solicitud_tipo_operacion: 'EMITIR_NOTA_CREDITO',
      motivo_nota_codigo: '02',
    } as NotificacionHistorial)).toBe('Nota de crédito — Motivo 02');
  });

  it('distingue estado, aprobación y rechazo con etiquetas claras', () => {
    expect(etiquetaEstadoNotificacion('PENDIENTE_APROBACION')).toBe('Pendiente de aprobación');
    expect(tituloNotificacionLegible({ estado_solicitud: 'RECHAZADA' } as NotificacionHistorial))
      .toBe('Solicitud rechazada');
    expect(tituloNotificacionLegible({
      estado_solicitud: 'APROBADA',
      solicitud_tipo_operacion: 'EMITIR_NOTA_CREDITO',
    } as NotificacionHistorial)).toBe('Solicitud de nota de crédito aprobada');
  });

  it('muestra páginas numeradas y compacta historiales extensos', () => {
    expect(obtenerPaginasVisibles(2, 3)).toEqual([1, 2, 3]);
    expect(obtenerPaginasVisibles(6, 12)).toEqual([1, 'ellipsis', 5, 6, 7, 'ellipsis', 12]);
    expect(obtenerPaginasVisibles(1, 1)).toEqual([1]);
  });

});
