import { faregasFetch as fetchWithToken } from './faregas-http-client';

export interface AuditoriaAccesoFiltro {
  username?: string;
  evento?: string;
  exitoso?: string;
  fechaInicio?: string;
  fechaFin?: string;
  categoria?: string;
  placa?: string;
  certificadoId?: string;
  plantaKey?: string;
  buscar?: string;
  modulo?: string;
}

export interface AuditoriaAccesoFaregas {
  id: string;
  username: string | null;
  perfil: string | null;
  evento: string;
  exitoso: boolean;
  mensaje: string | null;
  planta_key: string | null;
  ip_direccion: string | null;
  user_agent: string | null;
  fecha_evento: string;
  categoria: string;
  entidad: string | null;
  entidad_id: string | null;
  certificado_id: string | null;
  numero_certificado: string | null;
  placa: string | null;
  tipo_certificado: string | null;
  paso: string | null;
  datos: Record<string, unknown> | null;
}

export const faregasAuditoriaApi = {
  listarAccesos: async (filtros: AuditoriaAccesoFiltro = {}): Promise<AuditoriaAccesoFaregas[]> => {
    const params = new URLSearchParams();
    if (filtros.username?.trim()) params.append('username', filtros.username.trim());
    if (filtros.evento?.trim()) params.append('evento', filtros.evento.trim());
    if (filtros.exitoso === 'true' || filtros.exitoso === 'false') params.append('exitoso', filtros.exitoso);
    if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
    if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
    if (filtros.categoria?.trim()) params.append('categoria', filtros.categoria.trim());
    if (filtros.placa?.trim()) params.append('placa', filtros.placa.trim());
    if (filtros.certificadoId?.trim()) params.append('certificadoId', filtros.certificadoId.trim());
    if (filtros.plantaKey?.trim()) params.append('plantaKey', filtros.plantaKey.trim());
    if (filtros.buscar?.trim()) params.append('buscar', filtros.buscar.trim());
    if (filtros.modulo?.trim()) params.append('modulo', filtros.modulo.trim());

    const queryString = params.toString();
    const endpoint = queryString ? `/auditoria/accesos?${queryString}` : '/auditoria/accesos';
    
    const response = await fetchWithToken(endpoint, { method: 'GET' });
    return response.data || [];
  }
};
