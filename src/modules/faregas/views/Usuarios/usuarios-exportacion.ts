import {
  exportarExcelVariasHojas,
  type ExcelSheetDefinition,
} from '../../utils/exportar-excel';
import { perfilTieneAccesoGlobalSedes } from './acceso-global-sedes';

export interface UsuarioParaExportar {
  username: string;
  perfil_id?: string | null;
  estado?: boolean;
  tipoDocumentoKey?: string | null;
  nroDocumento?: string | null;
  persona_nrodocumentoidentidad?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  nombreRazonSocial?: string | null;
  email?: string | null;
  sedes?: Array<{ key?: string; nombre?: string }>;
  fechaUltimoRestablecimiento?: string | null;
  responsableRestablecimiento?: string | null;
  estadoCredencial?: string | null;
  cambiadaPosteriormente?: boolean | null;
  necesitaRestablecimiento?: boolean | null;
  observacionesCredencial?: string | null;
}

export interface PerfilParaExportar {
  clave: string;
  nombre?: string;
  permisos?: string[];
}

export const COLUMNAS_USUARIOS_FAREGAS = [
  { key: 'numero', header: 'N.º', width: 8 },
  { key: 'nombre', header: 'Nombre completo', width: 32 },
  { key: 'username', header: 'Username', width: 20 },
  { key: 'documento', header: 'Documento', width: 18 },
  { key: 'email', header: 'Correo electrónico', width: 30 },
  { key: 'perfil', header: 'Perfil FAREGAS', width: 20 },
  { key: 'sede', header: 'Sede', width: 48 },
  { key: 'estado', header: 'Estado', width: 14 },
  { key: 'fechaRestablecimiento', header: 'Fecha último restablecimiento', width: 28 },
  { key: 'responsableRestablecimiento', header: 'Responsable último cambio', width: 24 },
  { key: 'estadoCredencial', header: 'Estado credencial administrada', width: 30 },
  { key: 'cambiadaPosteriormente', header: 'Contraseña cambiada posteriormente', width: 32 },
  { key: 'necesitaRestablecimiento', header: 'Necesidad de nuevo restablecimiento', width: 26 },
  { key: 'resultado', header: 'Resultado', width: 18 },
  { key: 'observaciones', header: 'Observaciones', width: 48 },
] as const;

const nombreCompleto = (usuario: UsuarioParaExportar) =>
  usuario.tipoDocumentoKey?.toLowerCase() === 'ruc'
    ? usuario.nombreRazonSocial || ''
    : [usuario.nombres, usuario.apellidos].filter(Boolean).join(' ').trim();

const nombreSedes = (
  usuario: UsuarioParaExportar,
  perfiles: PerfilParaExportar[],
) => {
  if (perfilTieneAccesoGlobalSedes(perfiles, usuario.perfil_id)) return 'Todas';
  const asignadas = (usuario.sedes || [])
    .map((sede) => sede.nombre?.trim())
    .filter((nombre): nombre is string => Boolean(nombre));
  return asignadas.length ? asignadas.join(', ') : 'Sin sede asignada';
};

const nombrePerfil = (usuario: UsuarioParaExportar, perfiles: PerfilParaExportar[]) => {
  const perfil = perfiles.find((item) => item.clave === usuario.perfil_id);
  return perfil?.nombre || usuario.perfil_id || '';
};

const metadatos = (cantidad: number, filtros?: {
  estado?: string;
  busqueda?: string;
}): Array<[string, string | number]> => [
  ['Fecha de exportación (America/Lima)', new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })],
  ['Registros exportados', cantidad],
  ['Filtro de estado', filtros?.estado || 'ACTIVOS'],
  ['Búsqueda', filtros?.busqueda?.trim() || 'Todos'],
];

export const construirHojaUsuariosFaregas = (
  usuarios: UsuarioParaExportar[],
  perfiles: PerfilParaExportar[],
  filtros: { estado?: string; busqueda?: string } = {},
): ExcelSheetDefinition => ({
  name: 'Usuarios FAREGAS',
  title: 'Usuarios FAREGAS',
  metadata: metadatos(usuarios.length, filtros),
  note: 'Exportación administrativa. Por seguridad no contiene contraseñas ni hashes.',
  headerRow: 9,
  columns: [...COLUMNAS_USUARIOS_FAREGAS],
  rows: usuarios.map((usuario, index) => {
    const doc = usuario.nroDocumento || usuario.persona_nrodocumentoidentidad || '';
    const tipoDoc = usuario.tipoDocumentoKey ? `${usuario.tipoDocumentoKey.toUpperCase()} ` : '';
    const docDisplay = doc ? (tipoDoc ? `${tipoDoc}${doc}` : doc) : '-';

    return {
      numero: index + 1,
      nombre: nombreCompleto(usuario),
      username: usuario.username,
      documento: docDisplay,
      email: usuario.email || '',
      perfil: nombrePerfil(usuario, perfiles),
      sede: nombreSedes(usuario, perfiles),
      estado: usuario.estado ? 'Activo' : 'Inactivo',
      fechaRestablecimiento: usuario.fechaUltimoRestablecimiento || '-',
      responsableRestablecimiento: usuario.responsableRestablecimiento || '-',
      estadoCredencial: usuario.estadoCredencial || (usuario.username === 'gibarra' ? 'Protegida (Excluida)' : 'No registrado'),
      cambiadaPosteriormente: usuario.cambiadaPosteriormente === true ? 'Sí' : 'No',
      necesitaRestablecimiento: usuario.necesitaRestablecimiento === true ? 'Sí' : 'No',
      resultado: 'Existente',
      observaciones: usuario.observacionesCredencial || '',
    };
  }),
});

export const descargarExcelUsuariosFaregas = (
  usuarios: UsuarioParaExportar[],
  perfiles: PerfilParaExportar[],
  filtros: { estado?: string; busqueda?: string } = {},
) => exportarExcelVariasHojas('USUARIOS_FAREGAS', [
  construirHojaUsuariosFaregas(usuarios, perfiles, filtros),
]);
