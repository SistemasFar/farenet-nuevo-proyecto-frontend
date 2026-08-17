import { faregasFetch as fetchWithToken } from './faregas-http-client';
import type {
  ActualizarPerfilFaregasRequest,
  ActualizarUsuarioFaregasRequest,
  CrearPerfilFaregasRequest,
  CrearUsuarioFaregasRequest,
} from '../types/faregas-api';

export const faregasUsuariosApi = {
  obtenerUsuarios: () => fetchWithToken('/usuarios'),
  crearUsuario: (data: CrearUsuarioFaregasRequest) => fetchWithToken('/usuarios', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  actualizarUsuario: (username: string, data: ActualizarUsuarioFaregasRequest) => fetchWithToken(`/usuarios/${username}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  cambiarPassword: (username: string, password: string) => fetchWithToken(`/usuarios/${username}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ password })
  }),
  eliminarUsuario: (username: string) => fetchWithToken(`/usuarios/${username}`, {
    method: 'DELETE'
  }),
  obtenerPerfiles: () => fetchWithToken('/usuarios/perfiles'),
  crearPerfil: (data: CrearPerfilFaregasRequest) => fetchWithToken('/usuarios/perfiles', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  actualizarPerfil: (clave: string, data: ActualizarPerfilFaregasRequest) => fetchWithToken(`/usuarios/perfiles/${clave}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  eliminarPerfil: (clave: string) => fetchWithToken(`/usuarios/perfiles/${clave}`, {
    method: 'DELETE'
  }),
  obtenerPlantas: () => fetchWithToken('/usuarios/plantas'),
  obtenerPermisos: () => fetchWithToken('/usuarios/permisos')
};
