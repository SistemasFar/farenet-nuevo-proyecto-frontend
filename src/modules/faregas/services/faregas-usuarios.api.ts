import { faregasFetch as fetchWithToken, faregasFetchBlob } from './faregas-http-client';
import type {
  ActualizarPerfilFaregasRequest,
  ActualizarUsuarioFaregasRequest,
  CrearPerfilFaregasRequest,
  CrearUsuarioFaregasRequest,
} from '../types/faregas-api';


export const faregasUsuariosApi = {
  obtenerUsuarios: () => fetchWithToken('/usuarios'),
  obtenerPoliticaPassword: () => fetchWithToken('/usuarios/politica-password'),
  consultarCredencialAsignada: (username: string) => fetchWithToken(`/usuarios/${username}/credencial-asignada`),
  obtenerEstadoMfa: () => fetchWithToken('/usuarios/mfa/estado'),
  iniciarConfiguracionMfa: () => fetchWithToken('/usuarios/mfa/iniciar-configuracion', { method: 'POST' }),
  confirmarConfiguracionMfa: (codigoTotp: string) => fetchWithToken('/usuarios/mfa/confirmar-configuracion', {
    method: 'POST',
    body: JSON.stringify({ codigoTotp })
  }),
  desactivarMfa: (datos: { passwordAdmin?: string; codigoTotp?: string }) => fetchWithToken('/usuarios/mfa/desactivar', {
    method: 'POST',
    body: JSON.stringify(datos)
  }),
  revelarCredencialCustodiada: (username: string, autorizacion?: { passwordAdmin?: string; codigoTotp?: string; codigoRecuperacion?: string } | string) => {
    const body = typeof autorizacion === 'string'
      ? { passwordAdmin: autorizacion }
      : (autorizacion || {});
    return fetchWithToken(`/usuarios/${username}/revelar-credencial`, {
      method: 'POST',
      body: JSON.stringify(body),
      handleUnauthorized: false
    });
  },
  generarCredencialTemporal: (username: string) => fetchWithToken(`/usuarios/${username}/generar-credencial-temporal`, {
    method: 'POST'
  }),
  descargarInventarioRenovadoBlob: () => faregasFetchBlob('/usuarios/inventario-credenciales/descargar'),
  crearUsuario: (data: CrearUsuarioFaregasRequest) => fetchWithToken('/usuarios', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  actualizarUsuario: (username: string, data: ActualizarUsuarioFaregasRequest) => fetchWithToken(`/usuarios/${username}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  cambiarPassword: (username: string, password: string, confirmPassword: string) => fetchWithToken(`/usuarios/${username}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ password, confirmPassword })
  }),
  eliminarUsuario: (username: string) => fetchWithToken(`/usuarios/${username}`, {
    method: 'DELETE'
  }),
  desactivarUsuario: (username: string) => fetchWithToken(`/usuarios/${username}/desactivar`, {
    method: 'POST'
  }),
  activarUsuario: (username: string) => fetchWithToken(`/usuarios/${username}/activar`, {
    method: 'POST'
  }),
  obtenerPerfiles: () => fetchWithToken('/usuarios/perfiles'),
  obtenerUsuariosPorPerfil: (clave: string) => fetchWithToken(`/usuarios/perfiles/${clave}/usuarios`),
  crearPerfil: (data: CrearPerfilFaregasRequest) => fetchWithToken('/usuarios/perfiles', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  actualizarPerfil: (clave: string, data: ActualizarPerfilFaregasRequest) => fetchWithToken(`/usuarios/perfiles/${clave}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  eliminarPerfil: (clave: string, nuevoPerfilClave?: string) => fetchWithToken(`/usuarios/perfiles/${clave}`, {
    method: 'DELETE',
    ...(nuevoPerfilClave ? { body: JSON.stringify({ nuevoPerfilClave }) } : {})
  }),
  obtenerPlantas: () => fetchWithToken('/usuarios/plantas'),
  obtenerPermisos: () => fetchWithToken('/usuarios/permisos'),
  getMaestrosPersona: () => fetchWithToken('/usuarios/maestros/persona'),
  getDepartamentos: (paisKey: string) => fetchWithToken(`/usuarios/maestros/departamentos/${paisKey}`),
  getProvincias: (departamentoKey: string) => fetchWithToken(`/usuarios/maestros/provincias/${departamentoKey}`),
  getDistritos: (provinciaKey: string) => fetchWithToken(`/usuarios/maestros/distritos/${provinciaKey}`)
};
