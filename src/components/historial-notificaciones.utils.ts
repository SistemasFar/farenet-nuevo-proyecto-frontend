export interface NotificacionHistorial {
  id: number;
  evento_clave: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  planta_key: string | null;
  empresa_key: string | null;
  entidad_tipo: string | null;
  entidad_id: number | null;
  destino_navegacion: string | null;
  fecha_creacion: string;
  leida: boolean;
  fecha_lectura: string | null;
  estado_solicitud: string | null;
  solicitud_id?: number | null;
  solicitud_tipo_operacion?: string | null;
  solicitante_username?: string | null;
  solicitante_nombre?: string | null;
  autorizador_username?: string | null;
  autorizador_nombre?: string | null;
  fecha_decision?: string | null;
  sustento_solicitud?: string | null;
  justificacion_decision?: string | null;
  motivo_nota_codigo?: string | null;
  autoaprobacion_excepcional?: boolean | null;
  certificado_numero?: string | null;
  comprobante_numero?: string | null;
  tipo_comprobante?: string | null;
  planta_nombre?: string | null;
}

export const ESTADOS_CON_DECISION = new Set([
  'APROBADA',
  'RECHAZADA',
  'EN_EJECUCION',
  'COMPLETADA',
  'ERROR',
  'REQUIERE_INTERVENCION',
]);

export const nombreUsuarioLegible = (nombre?: string | null, username?: string | null): string => {
  const nombreLimpio = String(nombre || '').trim();
  const usuarioLimpio = String(username || '').trim();
  if (nombreLimpio && usuarioLimpio && nombreLimpio.toLowerCase() !== usuarioLimpio.toLowerCase()) {
    return `${nombreLimpio} (${usuarioLimpio})`;
  }
  return nombreLimpio || usuarioLimpio || '-';
};

export const operacionLegible = (notificacion: NotificacionHistorial): string => {
  const tipo = String(notificacion.solicitud_tipo_operacion || '').trim().toUpperCase();
  if (tipo === 'EMITIR_NOTA_CREDITO') {
    return `Nota de crédito${notificacion.motivo_nota_codigo ? ` — Motivo ${notificacion.motivo_nota_codigo}` : ''}`;
  }
  return tipo ? tipo.replaceAll('_', ' ').toLowerCase().replace(/^./, (letra) => letra.toUpperCase()) : '-';
};

export const etiquetaEstadoNotificacion = (estado?: string | null): string => {
  const normalizado = String(estado || '').trim().toUpperCase();
  const etiquetas: Record<string, string> = {
    PENDIENTE_APROBACION: 'Pendiente de aprobación',
    APROBADA: 'Aprobada',
    RECHAZADA: 'Rechazada',
    CANCELADA: 'Cancelada',
    EN_EJECUCION: 'En ejecución',
    COMPLETADA: 'Completada',
    ERROR: 'Error',
    REQUIERE_INTERVENCION: 'Requiere intervención',
  };
  return etiquetas[normalizado] || normalizado.replaceAll('_', ' ') || '-';
};

export const tituloNotificacionLegible = (notificacion: NotificacionHistorial): string => {
  const estado = String(notificacion.estado_solicitud || '').toUpperCase();
  if (estado === 'RECHAZADA') return 'Solicitud rechazada';
  if (estado === 'APROBADA' || estado === 'EN_EJECUCION' || estado === 'COMPLETADA') {
    return notificacion.solicitud_tipo_operacion === 'EMITIR_NOTA_CREDITO'
      ? 'Solicitud de nota de crédito aprobada'
      : 'Solicitud aprobada';
  }
  if (estado === 'PENDIENTE_APROBACION') return 'Nueva solicitud de autorización';
  return notificacion.titulo;
};

export type PaginaVisible = number | 'ellipsis';

/**
 * Devuelve una paginación numérica compacta. Conserva siempre la primera y
 * última página y abre una ventana alrededor de la página actual.
 */
export const obtenerPaginasVisibles = (paginaActual: number, totalPaginas: number): PaginaVisible[] => {
  const total = Math.max(1, Math.floor(totalPaginas));
  const actual = Math.min(total, Math.max(1, Math.floor(paginaActual)));

  if (total <= 7) {
    return Array.from({ length: total }, (_, indice) => indice + 1);
  }

  const paginas = new Set<number>([1, total]);
  for (let numero = actual - 1; numero <= actual + 1; numero += 1) {
    if (numero > 1 && numero < total) paginas.add(numero);
  }

  const ordenadas = [...paginas].sort((a, b) => a - b);
  const resultado: PaginaVisible[] = [];
  ordenadas.forEach((numero, indice) => {
    const anterior = ordenadas[indice - 1];
    if (anterior && numero - anterior > 1) resultado.push('ellipsis');
    resultado.push(numero);
  });
  return resultado;
};
