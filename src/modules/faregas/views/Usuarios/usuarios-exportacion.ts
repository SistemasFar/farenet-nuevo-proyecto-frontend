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
  nombres?: string | null;
  apellidos?: string | null;
  nombreRazonSocial?: string | null;
  email?: string | null;
  sedes?: Array<{ key?: string; nombre?: string }>;
}

export interface CredencialTemporalParaExportar extends UsuarioParaExportar {
  password: string;
  resultado: 'Creado' | 'Restablecida';
  observaciones?: string;
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
  { key: 'email', header: 'Correo electrónico', width: 30 },
  { key: 'perfil', header: 'Perfil FAREGAS', width: 20 },
  { key: 'sede', header: 'Sede', width: 48 },
  { key: 'password', header: 'Contraseña temporal', width: 28 },
  { key: 'estado', header: 'Estado', width: 14 },
  { key: 'resultado', header: 'Resultado', width: 18 },
  { key: 'observaciones', header: 'Observaciones', width: 42 },
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

const metadatos = (tipo: 'normal' | 'credenciales', cantidad: number, filtros?: {
  estado?: string;
  busqueda?: string;
}): Array<[string, string | number]> => [
  ['Fecha de exportación (America/Lima)', new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })],
  ['Registros exportados', cantidad],
  ...(tipo === 'normal'
    ? [
        ['Filtro de estado', filtros?.estado || 'ACTIVOS'] as [string, string],
        ['Búsqueda', filtros?.busqueda?.trim() || 'Todos'] as [string, string],
      ]
    : [['Tipo de entrega', 'Credenciales temporales de esta sesión'] as [string, string]]),
];

export const construirHojaUsuariosFaregas = (
  usuarios: UsuarioParaExportar[],
  perfiles: PerfilParaExportar[],
  filtros: { estado?: string; busqueda?: string } = {},
): ExcelSheetDefinition => ({
  name: 'Usuarios FAREGAS',
  title: 'Usuarios FAREGAS',
  metadata: metadatos('normal', usuarios.length, filtros),
  note: 'Exportación administrativa. La contraseña temporal queda vacía para todos los usuarios existentes.',
  headerRow: 9,
  columns: [...COLUMNAS_USUARIOS_FAREGAS],
  rows: usuarios.map((usuario, index) => ({
    numero: index + 1,
    nombre: nombreCompleto(usuario),
    username: usuario.username,
    email: usuario.email || '',
    perfil: nombrePerfil(usuario, perfiles),
    sede: nombreSedes(usuario, perfiles),
    password: '',
    estado: usuario.estado ? 'Activo' : 'Inactivo',
    resultado: 'Existente',
    observaciones: '',
  })),
});

export const construirHojaCredencialesTemporales = (
  credenciales: CredencialTemporalParaExportar[],
  perfiles: PerfilParaExportar[],
): ExcelSheetDefinition => ({
  name: 'Usuarios FAREGAS',
  title: 'Usuarios FAREGAS',
  metadata: metadatos('credenciales', credenciales.length),
  note: 'Confidencial: guarde este archivo en una ubicación protegida y elimínelo después de entregar las credenciales.',
  headerRow: 9,
  columns: [...COLUMNAS_USUARIOS_FAREGAS],
  rows: credenciales.map((credencial, index) => ({
    numero: index + 1,
    nombre: nombreCompleto(credencial),
    username: credencial.username,
    email: credencial.email || '',
    perfil: nombrePerfil(credencial, perfiles),
    sede: nombreSedes(credencial, perfiles),
    password: credencial.password,
    estado: credencial.estado ? 'Activo' : 'Inactivo',
    resultado: credencial.resultado,
    observaciones: credencial.observaciones || '',
  })),
});

export const descargarExcelUsuariosFaregas = (
  usuarios: UsuarioParaExportar[],
  perfiles: PerfilParaExportar[],
  filtros: { estado?: string; busqueda?: string } = {},
) => exportarExcelVariasHojas('USUARIOS_FAREGAS', [
  construirHojaUsuariosFaregas(usuarios, perfiles, filtros),
]);

export const descargarExcelCredencialesTemporales = (
  credenciales: CredencialTemporalParaExportar[],
  perfiles: PerfilParaExportar[],
) => exportarExcelVariasHojas('CREDENCIALES_TEMPORALES_FAREGAS', [
  construirHojaCredencialesTemporales(credenciales, perfiles),
]);
