import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Download, Edit, Eye, EyeOff, FileSpreadsheet, Key, Loader2, Lock, ShieldAlert, ShieldCheck, Trash2, X } from 'lucide-react';
import { faregasUsuariosApi } from '../../services/faregas-usuarios.api';
import type { MaestroUsuario } from '../../types/faregas-api';
import {
  esPermisoSensible,
  filtrarPermisosDelCatalogo,
  filtrarPermisosVigentes,
} from './permisosSensibles';
import {
  perfilTieneAccesoGlobalSedes,
} from './acceso-global-sedes';
import {
  descargarExcelUsuariosFaregas,
} from './usuarios-exportacion';

import {
  atributosDocumento,
  EMAIL_MAXIMO,
  esRuc,
  evaluarPasswordSegura,
  normalizarSoloDigitos,
  normalizarTelefono,
  primerCampoConError,
  tieneErrores,
  REGLAS_DOCUMENTO,
  TELEFONO_MAXIMO,
  validarDireccion,
  validarDocumento,
  validarEmail,
  validarFormularioUsuario,
  validarNombre,
  validarTelefono,
  validarUsername,
  type CampoUsuario,
  type ErroresUsuario,
} from './usuariosValidacion';

interface PermisoPerfil {
  clave: string;
  nombre: string;
  modulo?: string;
}

export function UsuariosView() {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'perfiles'>('usuarios');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [plantas, setPlantas] = useState<any[]>([]);
  const [permisos, setPermisos] = useState<PermisoPerfil[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Errores por campo. Cada input inválido se marca en rojo y muestra su mensaje
  // debajo; el error global queda para los fallos que no son de un campo (409,
  // 500, o el rechazo del backend).
  const [erroresCampo, setErroresCampo] = useState<ErroresUsuario>({});
  const refsCampos = useRef<Partial<Record<CampoUsuario, HTMLElement | null>>>({});

  // Marca un campo al vuelo. `soloSiHayError` evita ensuciar el formulario antes
  // de que el operador haya tocado el campo.
  const registrarError = (campo: CampoUsuario, valor: string | null, soloSiHayError = true) => {
    setErroresCampo((actual) => {
      const siguiente = { ...actual };
      if (valor) siguiente[campo] = valor;
      else delete siguiente[campo];
      if (!soloSiHayError) return siguiente;
      return siguiente;
    });
  };

  const registrarRef = (campo: CampoUsuario) => (elemento: HTMLElement | null) => {
    refsCampos.current[campo] = elemento;
  };

  /** Clases del input: sólo cambia el borde cuando el campo tiene error. */
  const claseInput = (campo: CampoUsuario) =>
    `w-full border rounded p-2 text-sm focus:outline-none ${erroresCampo[campo]
      ? 'border-red-400 focus:border-red-500 bg-red-50/40'
      : 'border-slate-300 focus:border-[#052a79]'
    }`;

  const mensajeCampo = (campo: CampoUsuario) =>
    erroresCampo[campo] ? (
      <p className="mt-1 text-[11px] font-semibold text-red-600">{erroresCampo[campo]}</p>
    ) : null;
  const [saving, setSaving] = useState(false);
  const [crearNuevaPassword, setCrearNuevaPassword] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);
  const [politicaPassword, setPoliticaPassword] = useState<{ minLongitud: number; esProduccion?: boolean; exigirComplejidad?: boolean } | null>(null);
  const [advertenciaPassword, setAdvertenciaPassword] = useState<string | null>(null);
  const [credencialNueva, setCredencialNueva] = useState<{
    username: string;
    password: string;
    accion: 'creada' | 'actualizada';
  } | null>(null);
  const [credencialCopiada, setCredencialCopiada] = useState(false);

  const [descargandoInventario, setDescargandoInventario] = useState(false);
  const [modalCredencialConsultada, setModalCredencialConsultada] = useState<{
    cargando: boolean;
    datos?: any;
    error?: string;
  } | null>(null);
  const [mostrarPasswordConsultada, setMostrarPasswordConsultada] = useState(false);
  const [credencialConsultadaCopiada, setCredencialConsultadaCopiada] = useState(false);
  const [generandoTemporal, setGenerandoTemporal] = useState(false);
  const [revelandoCredencial, setRevelandoCredencial] = useState(false);
  const [errorRevelacion, setErrorRevelacion] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const cerrarModalCredencial = () => {
    setModalCredencialConsultada(null);
    setMostrarPasswordConsultada(false);
    setCredencialConsultadaCopiada(false);
    setErrorRevelacion(null);
    setRevelandoCredencial(false);
  };

  // Filtro de estado del listado de usuarios. Por defecto sólo los activos: los
  // inactivos se conservan (su auditoría es real) pero no se ven en el día a día.
  type EstadoUsuario = 'ACTIVOS' | 'INACTIVOS' | 'TODOS';
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoUsuario>('ACTIVOS');

  // Maestros
  const [tiposDocumento, setTiposDocumento] = useState<MaestroUsuario[]>([]);
  const [paises, setPaises] = useState<MaestroUsuario[]>([]);
  const [departamentos, setDepartamentos] = useState<MaestroUsuario[]>([]);
  const [provincias, setProvincias] = useState<MaestroUsuario[]>([]);
  const [distritos, setDistritos] = useState<MaestroUsuario[]>([]);

  // Search and Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'crear' | 'editar'>('crear');
  const [formData, setFormData] = useState<any>({});
  const [selectedUsername, setSelectedUsername] = useState('');
  const [bajaPerfil, setBajaPerfil] = useState<{ clave: string; usuarios: any[] } | null>(null);
  const [reemplazoPerfil, setReemplazoPerfil] = useState('');
  const [errorBajaPerfil, setErrorBajaPerfil] = useState('');
  const [procesandoBaja, setProcesandoBaja] = useState(false);

  const abrirBajaPerfil = async (clave: string) => {
    try {
      const resultado = await faregasUsuariosApi.obtenerUsuariosPorPerfil(clave);
      setBajaPerfil({ clave, usuarios: resultado.usuarios });
      setReemplazoPerfil('');
      setErrorBajaPerfil('');
    } catch (e: any) { alert(e.message || 'No se pudieron consultar los usuarios del perfil'); }
  };

  const confirmarBajaPerfil = async () => {
    if (!bajaPerfil || (bajaPerfil.usuarios.length > 0 && !reemplazoPerfil)) return;
    setProcesandoBaja(true);
    setErrorBajaPerfil('');
    try {
      await faregasUsuariosApi.eliminarPerfil(bajaPerfil.clave, reemplazoPerfil || undefined);
      setBajaPerfil(null);
      await cargarDatos();
    } catch (e: any) {
      setErrorBajaPerfil(e.message || 'No se pudo eliminar el perfil');
      // Actualiza la lista si otro administrador cambió las asignaciones.
      try {
        const actual = await faregasUsuariosApi.obtenerUsuariosPorPerfil(bajaPerfil.clave);
        setBajaPerfil({ clave: bajaPerfil.clave, usuarios: actual.usuarios });
      } catch { /* El error original permanece visible. */ }
    } finally { setProcesandoBaja(false); }
  };
  const [detalleSedes, setDetalleSedes] = useState<{
    usuario: string;
    sedes: Array<{ key: string; nombre: string }>;
  } | null>(null);

  const usuarioSesion = (() => {
    try { return JSON.parse(sessionStorage.getItem('faregasUser') || '{}'); }
    catch { return {}; }
  })();
  const currentUsername = usuarioSesion.username;
  const puedeGestionarCredenciales = Array.isArray(usuarioSesion.permisos)
    && usuarioSesion.permisos.includes('MENU_USUARIOS');

  const descargarInventarioCredenciales = async () => {
    try {
      setDescargandoInventario(true);
      const blob = await faregasUsuariosApi.descargarInventarioRenovadoBlob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'faregas_credenciales_renovadas.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || 'No se pudo descargar el inventario de credenciales.');
    } finally {
      setDescargandoInventario(false);
    }
  };

  const consultarCredencialUsuario = async (username: string) => {
    setModalCredencialConsultada({ cargando: true });
    setMostrarPasswordConsultada(false);
    setCredencialConsultadaCopiada(false);
    setErrorRevelacion(null);
    setRevelandoCredencial(false);
    try {
      const resp = await faregasUsuariosApi.consultarCredencialAsignada(username);
      setModalCredencialConsultada({ cargando: false, datos: resp });
    } catch (e: any) {
      setModalCredencialConsultada({ cargando: false, error: e.message || 'Error al consultar la credencial.' });
    }
  };

  const handleToggleEyeRevelar = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const targetUsername = modalCredencialConsultada?.datos?.username;
    if (!targetUsername) return;

    // Si la contraseña ya fue revelada, alternar visibilidad sin solicitudes adicionales
    if (modalCredencialConsultada.datos.password) {
      setMostrarPasswordConsultada((prev) => !prev);
      return;
    }

    // Consultar la credencial en custodia bajo la sesión administrativa autorizada
    setRevelandoCredencial(true);
    setErrorRevelacion(null);
    try {
      const resp = await faregasUsuariosApi.revelarCredencialCustodiada(targetUsername);
      const revealedPassword = resp?.password ?? resp?.data?.password;
      if (!revealedPassword) {
        throw new Error('No se recibió la contraseña custodiada desde el servidor.');
      }
      setModalCredencialConsultada((prev) => prev ? ({
        ...prev,
        datos: {
          ...prev.datos,
          password: revealedPassword,
          disponible: true,
          fechaAsignacion: (resp.fechaActualizacion || resp.data?.fechaActualizacion)
            ? new Date(resp.fechaActualizacion || resp.data?.fechaActualizacion).toLocaleString('es-PE', { timeZone: 'America/Lima' })
            : prev.datos?.fechaAsignacion
        }
      }) : null);
      setMostrarPasswordConsultada(true);
    } catch (err: any) {
      const msg = err.detalles?.message || err.message || 'Error al consultar la contraseña custodiada.';
      setErrorRevelacion(msg);
    } finally {
      setRevelandoCredencial(false);
    }
  };

  const handleGenerarCredencialTemporal = async (username: string) => {
    if (!window.confirm(`Se generará una nueva contraseña temporal para ${username}. La contraseña anterior dejará de funcionar y se revocarán sus sesiones activas. ¿Desea continuar?`)) {
      return;
    }
    setGenerandoTemporal(true);
    setError('');
    try {
      const resp = await faregasUsuariosApi.generarCredencialTemporal(username);
      setModalCredencialConsultada({
        cargando: false,
        datos: {
          username: resp.username,
          password: resp.password,
          nombreCompleto: resp.nombreCompleto || modalCredencialConsultada?.datos?.nombreCompleto,
          perfil: resp.perfil || modalCredencialConsultada?.datos?.perfil,
          sede: resp.sede || modalCredencialConsultada?.datos?.sede,
          vigente: true,
          disponible: true,
          puedeRestablecer: true,
          fechaAsignacion: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
          mensaje: 'Nueva contraseña temporal generada correctamente para entrega.'
        }
      });
      setMostrarPasswordConsultada(true);
      await cargarDatos();
    } catch (e: any) {
      alert(e.message || 'Error al generar la contraseña temporal.');
    } finally {
      setGenerandoTemporal(false);
    }
  };

  const copiarCredencialNueva = async () => {
    if (!credencialNueva?.password) return;
    try {
      await navigator.clipboard.writeText(credencialNueva.password);
      setCredencialCopiada(true);
      setTimeout(() => setCredencialCopiada(false), 2000);
    } catch {
      // Ignorar fallo de portapapeles
    }
  };

  const descargarComprobanteEntrega = (datos: {
    username: string;
    password?: string;
    nombreCompleto?: string;
    perfil?: string;
    sede?: string;
    accion?: string;
  }) => {
    const ahora = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
    const separador = '='.repeat(64);
    const linea = '-'.repeat(64);
    const contenido = `${separador}
FAREGAS — COMPROBANTE DE ENTREGA DE CREDENCIAL INDIVIDUAL
${separador}

ATENCIÓN: DOCUMENTO CONFIDENCIAL DE USO EXCLUSIVO PARA EL TITULAR

DATOS DEL USUARIO:
${linea}
Usuario / Login       : ${datos.username}
Nombre completo       : ${datos.nombreCompleto || '-'}
Perfil asignado       : ${datos.perfil || '-'}
Sede(s) autorizada(s) : ${datos.sede || 'Según perfil'}

CREDENCIAL ASIGNADA:
${linea}
Contraseña            : ${datos.password || '(No disponible)'}

DETALLES DE LA EMISIÓN:
${linea}
Operación             : ${datos.accion ? datos.accion.toUpperCase() : 'ASIGNACIÓN DE CREDENCIAL'}
Fecha y hora (PE)     : ${ahora}
Responsable emisión   : ${currentUsername || 'ADMINISTRADOR'}

NORMAS DE SEGURIDAD:
${linea}
1. Esta credencial es personal e intransferible. No la comparta con terceros.
2. Ingrese a FAREGAS con su usuario y esta contraseña temporal.
3. Se recomienda modificar su contraseña en el primer inicio de sesión.
4. Por razones de seguridad, elimine o resguarde este archivo tras su uso.

${separador}
SISTEMA DE GESTIÓN FAREGAS — CONTROL ADMINISTRATIVO DE ACCESOS
${separador}
`;
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `COMPROBANTE_CREDENCIAL_${datos.username}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const cargarDatos = async () => {
    setLoading(true);
    setError('');
    try {
      const [resUsuarios, resPerfiles, resPlantas, resPermisos, resMaestros] = await Promise.all([
        faregasUsuariosApi.obtenerUsuarios(),
        faregasUsuariosApi.obtenerPerfiles(),
        faregasUsuariosApi.obtenerPlantas(),
        faregasUsuariosApi.obtenerPermisos(),
        faregasUsuariosApi.getMaestrosPersona()
      ]);
      setUsuarios(resUsuarios);
      setPerfiles(resPerfiles);
      setPlantas(resPlantas);
      setPermisos(resPermisos);
      setTiposDocumento(resMaestros.tiposDocumentos);
      setPaises(resMaestros.paises);
      faregasUsuariosApi.obtenerPoliticaPassword?.().then((pol: any) => setPoliticaPassword(pol)).catch(() => null);
    } catch (e: any) {
      setError(e.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleOpenUsuario = async (usuario?: any, iniciarConNuevaPassword = false) => {
    setError('');
    setAdvertenciaPassword(null);
    if (usuario) {
      setModalMode('editar');
      setCrearNuevaPassword(iniciarConNuevaPassword);
      setMostrarPassword(false);
      setMostrarConfirmPassword(false);
      setSelectedUsername(usuario.username);

      // Cargar jerarquía geográfica si la tiene
      if (usuario.paisKey) {
        const deps = await faregasUsuariosApi.getDepartamentos(usuario.paisKey);
        setDepartamentos(deps);
        if (usuario.departamentoKey) {
          const provs = await faregasUsuariosApi.getProvincias(usuario.departamentoKey);
          setProvincias(provs);
          if (usuario.provinciaKey) {
            const dists = await faregasUsuariosApi.getDistritos(usuario.provinciaKey);
            setDistritos(dists);
          }
        }
      }

      setFormData({
        username: usuario.username,
        perfil_id: usuario.perfil_id,
        estado: usuario.estado,
        user_type: usuario.user_type,
        sedes: usuario.sedes ? usuario.sedes.map((s: any) => s.key) : [],
        password: '',
        confirmPassword: '',
        tipoDocumentoKey: usuario.tipoDocumentoKey || '',
        nroDocumento: usuario.nroDocumento || '',
        nombres: usuario.nombres || '',
        apellidos: usuario.apellidos || '',
        nombreRazonSocial: usuario.nombreRazonSocial || '',
        paisKey: usuario.paisKey || '',
        departamentoKey: usuario.departamentoKey || '',
        provinciaKey: usuario.provinciaKey || '',
        distritoKey: usuario.distritoKey || '',
        direccion: usuario.direccion || '',
        email: usuario.email || '',
        telefono: usuario.telefono || '',
        // Se conserva solo para no borrar el dato histórico al editar.
        personaContacto: usuario.personaContacto || ''
      });
    } else {
      setModalMode('crear');
      setCrearNuevaPassword(false);
      setMostrarPassword(false);
      setMostrarConfirmPassword(false);
      setDepartamentos([]);
      setProvincias([]);
      setDistritos([]);
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        perfil_id: perfiles.length > 0 ? perfiles[0].clave : '',
        sedes: [],
        estado: true,
        tipoDocumentoKey: '',
        nroDocumento: '',
        nombres: '',
        apellidos: '',
        nombreRazonSocial: '',
        paisKey: '',
        departamentoKey: '',
        provinciaKey: '',
        distritoKey: '',
        direccion: '',
        email: '',
        telefono: ''
      });
    }
    setShowModal(true);
    // Cada apertura de modal arranca sin errores marcados.
    setError('');
    setErroresCampo({});
  };

  const handlePaisChange = async (paisKey: string) => {
    setFormData({ ...formData, paisKey, departamentoKey: '', provinciaKey: '', distritoKey: '' });
    setDepartamentos([]);
    setProvincias([]);
    setDistritos([]);
    if (paisKey) {
      const deps = await faregasUsuariosApi.getDepartamentos(paisKey);
      setDepartamentos(deps);
    }
  };

  const handleDepartamentoChange = async (departamentoKey: string) => {
    setFormData({ ...formData, departamentoKey, provinciaKey: '', distritoKey: '' });
    setProvincias([]);
    setDistritos([]);
    if (departamentoKey) {
      const provs = await faregasUsuariosApi.getProvincias(departamentoKey);
      setProvincias(provs);
    }
  };

  const handleProvinciaChange = async (provinciaKey: string) => {
    setFormData({ ...formData, provinciaKey, distritoKey: '' });
    setDistritos([]);
    if (provinciaKey) {
      const dists = await faregasUsuariosApi.getDistritos(provinciaKey);
      setDistritos(dists);
    }
  };

  const handlePerfilUsuarioChange = (newPerfilId: string) => {
    const perfilObj = perfiles.find(p => p.clave === newPerfilId);
    const allowedSedes = perfilObj?.sedes || [];
    const currentSedes = formData.sedes || [];
    const validSedes = currentSedes.filter((s: string) => allowedSedes.includes(s));
    setFormData({ ...formData, perfil_id: newPerfilId, sedes: validSedes });
  };

  const handleDeleteUsuario = async (username: string) => {
    if (!confirm(`¿Eliminar la cuenta ${username} de FAREGAS? Si conserva historial, podrás desactivarla.`)) return;
    try {
      const resultado = await faregasUsuariosApi.eliminarUsuario(username);
      alert(resultado.mensaje || 'Usuario eliminado');
      await cargarDatos();
    } catch (e: any) {
      if (e.codigo === 'USUARIO_CON_HISTORIAL') {
        if (confirm(`${e.message} Se conservará el historial. ¿Deseas desactivar esta cuenta y revocar sus sesiones?`)) {
          try {
            const resultado = await faregasUsuariosApi.desactivarUsuario(username);
            alert(resultado.mensaje || 'Usuario desactivado');
            await cargarDatos();
          } catch (error: any) { alert(error.message || 'No se pudo desactivar'); }
        }
      } else alert(e.message || 'Error al eliminar usuario');
    }
  };

  const handleSaveUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Se valida el formulario COMPLETO antes de tocar la red. Si algo falla no
    // se hace request: no tiene sentido mandar datos que ya sabemos inválidos.
    const errores = validarFormularioUsuario({
      ...formData,
      minPasswordLength: politicaPassword?.minLongitud,
      esProduccion: politicaPassword?.esProduccion,
    }, modalMode === 'crear' ? 'crear' : 'editar');
    setErroresCampo(errores);
    if (tieneErrores(errores)) {
      // Se lleva al operador al primer campo inválido de arriba hacia abajo.
      const primero = primerCampoConError(errores);
      const mensaje = (primero && errores[primero]) || 'Por favor complete todos los campos obligatorios antes de guardar.';
      setError(mensaje);
      const elemento = primero ? refsCampos.current[primero] : null;
      if (elemento) {
        elemento.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        (elemento as HTMLElement & { focus?: () => void }).focus?.();
      }
      return;
    }
    if (modalMode === 'crear' && !formData.password) {
      const mensaje = 'La contraseña es obligatoria.';
      setErroresCampo((actuales) => ({ ...actuales, password: mensaje }));
      setError(mensaje);
      refsCampos.current.password?.focus();
      return;
    }
    if (modalMode === 'editar' && formData.password && !window.confirm(
      `La contraseña actual de ${formData.username} dejará de funcionar y se revocarán sus sesiones activas. La nueva contraseña quedará disponible una sola vez para descargar. ¿Confirmar?`
    )) return;

    setSaving(true);
    try {
      const payloadUsuario = { ...formData };
      const passwordEntregable = formData.password;
      const entregarCredencial = Boolean(formData.password);
      if (modalMode === 'crear') {
        // El backend aplica el valor canónico USER cuando no se envía user_type.
        delete payloadUsuario.user_type;
        await faregasUsuariosApi.crearUsuario(payloadUsuario);
      } else {
        // En edición se conserva el tipo original internamente; solo se oculta el selector.
        // La actualización de datos, sedes y contraseña se procesa atómicamente en el backend.
        await faregasUsuariosApi.actualizarUsuario(selectedUsername, payloadUsuario);
      }
      if (entregarCredencial && passwordEntregable) {
        setCredencialNueva({
          username: payloadUsuario.username,
          password: passwordEntregable,
          accion: modalMode === 'crear' ? 'creada' : 'actualizada'
        });
      }
      setShowModal(false);
      setFormData((actual: Record<string, unknown>) => ({ ...actual, password: '', confirmPassword: '' }));
      await cargarDatos();
      setMensajeExito(`Usuario ${payloadUsuario.username} guardado correctamente.`);
      setTimeout(() => setMensajeExito(null), 5000);
    } catch (e: any) {
      // El backend devuelve 400 con el detalle campo a campo; se marca igual que
      // la validación local para que el mensaje no se pierda.
      const delBackend = e.errores || e.response?.data?.errores;
      if (delBackend && typeof delBackend === 'object') setErroresCampo(delBackend);
      setError(e.response?.data?.message || e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleSede = (key: string) => {
    const current = formData.sedes || [];
    if (current.includes(key)) {
      setFormData({ ...formData, sedes: current.filter((s: string) => s !== key) });
    } else {
      setFormData({ ...formData, sedes: [...current, key] });
    }
  };

  // Submódulos de los módulos que los tienen. Se muestran indentados bajo su
  // padre y comparten su ciclo de vida: sin el permiso padre no tienen sentido,
  // así que desmarcar el padre se los lleva a todos y quedan deshabilitados.
  const SUBMODULOS_CHIPS = [
    'MENU_CHIPS_INVENTARIO',
    'MENU_CHIPS_TIPOS',
    'MENU_CHIPS_VENTAS'
  ] as const;
  const PERMISO_CHIPS = 'MENU_CHIPS';
  const NOMBRES_MENU_INVENTARIO: Record<string, string> = {
    MENU_CHIPS: 'Inventario',
    MENU_CHIPS_INVENTARIO: 'Inventario',
    MENU_CHIPS_TIPOS: 'Tipos de producto',
    MENU_CHIPS_VENTAS: 'Ventas'
  };

  const SUBMODULOS_FACTURACION = [
    'MENU_FACTURACION_SERIES',
    'MENU_FACTURACION_COMPROBANTES',
    'MENU_FACTURACION_CLIENTES'
  ] as const;
  const PERMISO_FACTURACION = 'MENU_FACTURACION';

  const SUBMODULOS_CONFIGURACION = [
    'MENU_CONFIGURACION_SEDES',
    'MENU_CONFIGURACION_CATALOGO',
    'MENU_CONFIGURACION_TARIFAS',
    'MENU_CONFIGURACION_CORRELATIVOS',
    'MENU_CONFIGURACION_EMPRESAS'
  ] as const;
  const PERMISO_CONFIGURACION = 'MENU_CONFIGURACION';

  const SUBMODULOS_INICIO = [
    'FAREGAS_SOLICITUD_CREAR',
    'FAREGAS_SOLICITUD_VER',
    'FAREGAS_SOLICITUD_APROBAR',
    'FAREGAS_SOLICITUD_AUTOAPROBAR',
    'FAREGAS_SOLICITUD_AUTOEJECUTAR',
    'FAREGAS_SOLICITUD_RECHAZAR',
    'FAREGAS_SOLICITUD_ADMINISTRAR',
    'FAREGAS_CERTIFICADO_ANULAR_EJECUTAR',
    'FAREGAS_CERTIFICADO_RECTIFICAR_EJECUTAR',
    'FAREGAS_NOTA_CREDITO',
    'FAREGAS_NOTA_CREDITO_APROBAR',
    'FAREGAS_NOTA_CREDITO_AUTOAPROBAR',
    'FAREGAS_ANULAR_COMPROBANTE'
  ] as const;
  const PERMISO_INICIO = 'MENU_INICIO';
  const NOMBRES_PERMISOS_INICIO: Record<string, string> = {
    FAREGAS_SOLICITUD_CREAR: 'Solicitar anulación total',
    FAREGAS_SOLICITUD_VER: 'Consultar solicitudes de anulación',
    FAREGAS_SOLICITUD_APROBAR: 'Aprobar solicitudes',
    FAREGAS_SOLICITUD_AUTOAPROBAR: 'Autoaprobar solicitud propia (excepcional)',
    FAREGAS_SOLICITUD_AUTOEJECUTAR: 'Autoejecutar solicitud propia (excepcional)',
    FAREGAS_SOLICITUD_RECHAZAR: 'Rechazar solicitudes',
    FAREGAS_SOLICITUD_ADMINISTRAR: 'Administrar solicitudes',
    FAREGAS_CERTIFICADO_ANULAR_EJECUTAR: 'Ejecutar anulación autorizada',
    FAREGAS_CERTIFICADO_RECTIFICAR_EJECUTAR: 'Rectificar certificado directamente',
    FAREGAS_NOTA_CREDITO: 'Emitir nota de crédito',
    FAREGAS_NOTA_CREDITO_APROBAR: 'Aprobar y rechazar notas de crédito',
    FAREGAS_NOTA_CREDITO_AUTOAPROBAR: 'Autoaprobar nota de crédito propia (excepcional)',
    FAREGAS_ANULAR_COMPROBANTE: 'Anular comprobante electrónico'
  };

  const SUBMODULOS_DASHBOARD = [
    'DASHBOARD_GLOBAL',
    'DASHBOARD_EXPORTAR',
    'DASHBOARD_SEDE'
  ] as const;
  const PERMISO_DASHBOARD = 'MENU_DASHBOARD';
  const NOMBRES_PERMISOS_DASHBOARD: Record<string, string> = {
    DASHBOARD_GLOBAL: 'Dashboard Global Multi-Sede',
    DASHBOARD_EXPORTAR: 'Exportar Métricas del Dashboard',
    DASHBOARD_SEDE: 'Dashboard de Sede Operativa'
  };

  const MODULOS_CON_SUBMODULOS = [
    { padre: PERMISO_INICIO, hijos: SUBMODULOS_INICIO as readonly string[] },
    { padre: PERMISO_DASHBOARD, hijos: SUBMODULOS_DASHBOARD as readonly string[] },
    { padre: PERMISO_CHIPS, hijos: SUBMODULOS_CHIPS as readonly string[] },
    { padre: PERMISO_FACTURACION, hijos: SUBMODULOS_FACTURACION as readonly string[] },
    { padre: PERMISO_CONFIGURACION, hijos: SUBMODULOS_CONFIGURACION as readonly string[] }
  ];

  const togglePermiso = (clave: string) => {
    const current = formData.permisos || [];
    const modulo = MODULOS_CON_SUBMODULOS.find((m) => m.padre === clave);

    // Desmarcar un módulo padre desmarca también sus submódulos, incluidos los
    // sensibles: el editor siempre refleja exactamente lo que se guardará.
    if (modulo && current.includes(clave)) {
      setFormData({
        ...formData,
        permisos: current.filter((p: string) =>
          p !== clave && !modulo.hijos.includes(p)
        )
      });
      return;
    }

    // Marcar el padre habilita sus submódulos sin marcar ninguno: se deja que
    // el administrador elija cuáles.
    if (modulo) {
      setFormData({ ...formData, permisos: [...current, clave] });
      return;
    }

    if (current.includes(clave)) {
      setFormData({ ...formData, permisos: current.filter((p: string) => p !== clave) });
    } else {
      const padre = MODULOS_CON_SUBMODULOS.find((m) => m.hijos.includes(clave))?.padre;
      const nextPermisos = padre && !current.includes(padre)
        ? [...current, padre, clave]
        : [...current, clave];
      setFormData({ ...formData, permisos: nextPermisos });
    }
  };

  // Filter Data
  //
  // `estadoFiltro` separa activos de inactivos. Por defecto se ve sólo la gente
  // que puede operar: los usuarios desactivados —porque se limpiaron sus datos
  // de prueba pero su auditoría se conserva— siguen existiendo y se pueden
  // consultar, pero no ensucian el listado diario.
  const query = (searchQuery || '').trim().toLowerCase();

  const usuarioCoincideBusqueda = (u: any) => {
    if (!query) return true;
    return (
      (u.username || '').toLowerCase().includes(query) ||
      (u.perfil_id || '').toLowerCase().includes(query) ||
      (u.nombres || '').toLowerCase().includes(query) ||
      (u.apellidos || '').toLowerCase().includes(query) ||
      (u.nombreRazonSocial || '').toLowerCase().includes(query) ||
      (u.nroDocumento || '').toLowerCase().includes(query)
    );
  };

  const filteredUsuarios = usuarios.filter(u => {
    const coincide = usuarioCoincideBusqueda(u);
    if (!coincide) return false;

    // Si no hay término de búsqueda activo, aplicar el filtro de estado estricto:
    if (!query) {
      if (estadoFiltro === 'ACTIVOS' && u.estado === false) return false;
      if (estadoFiltro === 'INACTIVOS' && u.estado !== false) return false;
      return true;
    }

    // Cuando hay un término de búsqueda explícito:
    // - Si el filtro es 'INACTIVOS', sólo mostrar inactivos que coincidan.
    // - Si el filtro es 'ACTIVOS' o 'TODOS', no ocultar coincidencias explícitas de usuarios inactivos.
    if (estadoFiltro === 'INACTIVOS' && u.estado !== false) return false;
    return true;
  });

  const filteredPerfiles = perfiles.filter(p =>
    p.clave.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeData = activeTab === 'usuarios' ? filteredUsuarios : filteredPerfiles;
  const totalRegistros = activeData.length;
  const totalPages = Math.ceil(totalRegistros / limit) || 1;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedData = activeData.slice((page - 1) * limit, page * limit);

  const mostrandoInicio = totalRegistros === 0 ? 0 : (page - 1) * limit + 1;
  const mostrandoFin = Math.min(page * limit, totalRegistros);

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Administración de Usuarios Faregas</h1>
          <p className="text-sm text-gray-500">
            Administración de cuentas, perfiles y asignaciones de planta.
          </p>
        </div>
        <div className="flex gap-2 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => { setActiveTab('usuarios'); setPage(1); setSearchQuery(''); }}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'usuarios' ? 'bg-[#052A79] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Usuarios
          </button>
          <button
            onClick={() => { setActiveTab('perfiles'); setPage(1); setSearchQuery(''); }}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'perfiles' ? 'bg-[#052A79] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Perfiles
          </button>
        </div>
      </div>

      {error && !showModal && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl shadow-sm border border-red-200">
          {error}
        </div>
      )}

      {mensajeExito && !showModal && (
        <div role="status" className="bg-emerald-50 text-emerald-800 p-4 rounded-xl shadow-sm border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span className="font-medium text-sm">{mensajeExito}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            type="text"
            placeholder={activeTab === 'usuarios' ? "Buscar por usuario, nombre o documento..." : "Buscar por clave o nombre..."}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#052A79] md:col-span-2"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
          <div className="flex gap-2 md:col-span-1">
            <select
              value={estadoFiltro}
              disabled={activeTab !== 'usuarios'}
              title={activeTab !== 'usuarios' ? 'El filtro de estado sólo aplica al listado de usuarios' : undefined}
              onChange={(e) => { setEstadoFiltro(e.target.value as EstadoUsuario); setPage(1); }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#052A79] disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="ACTIVOS">Sólo activos</option>
              <option value="INACTIVOS">Sólo inactivos</option>
              <option value="TODOS">Todos</option>
            </select>
          </div>
          <div className="flex gap-2 md:col-span-1">
            <button className="rounded-lg bg-[#052A79] px-6 py-2 text-sm font-semibold text-white">
              Buscar
            </button>
            <button
              onClick={() => { setSearchQuery(''); setPage(1); }}
              className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'usuarios' && query && estadoFiltro === 'ACTIVOS' && filteredUsuarios.some(u => u.estado === false) && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>
              La búsqueda incluye coincidencias con usuarios en estado <strong>Inactivo</strong>. Puede editarlos para reactivarlos o filtrar por <strong>Sólo inactivos</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEstadoFiltro('INACTIVOS')}
            className="ml-3 shrink-0 rounded bg-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-300 transition-colors"
          >
            Ver en Inactivos
          </button>
        </div>
      )}

      {/* Table Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <span className="font-semibold text-gray-700">
            {activeTab === 'usuarios' ? 'Usuarios registrados' : 'Perfiles registrados'}
          </span>
          {activeTab === 'usuarios' ? (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => descargarExcelUsuariosFaregas(filteredUsuarios, perfiles, {
                  estado: estadoFiltro,
                  busqueda: searchQuery,
                })}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-[#052A79] bg-white px-4 py-2 text-sm font-semibold text-[#052A79] hover:bg-blue-50/50 disabled:opacity-50"
              >
                <Download size={16} /> EXPORTAR EXCEL
              </button>
              {puedeGestionarCredenciales && (
                <button
                  type="button"
                  onClick={descargarInventarioCredenciales}
                  disabled={descargandoInventario || loading}
                  title="Descargar el inventario XLSX de credenciales renovadas"
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                >
                  <FileSpreadsheet size={16} /> {descargandoInventario ? 'DESCARGANDO...' : 'INVENTARIO DE CREDENCIALES'}
                </button>
              )}
              <button onClick={() => handleOpenUsuario()} className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white">
                + Crear Usuario
              </button>
              <p className="basis-full text-right text-xs text-slate-500" role="note">
                EXPORTAR EXCEL contiene únicamente datos administrativos; nunca incluye contraseñas ni hashes.
              </p>
            </div>
          ) : (
            <button onClick={() => {
              setModalMode('crear');
              setFormData({ clave: '', nombre: '', visible: true, sedes: [], permisos: [] });
              setShowModal(true);
            }} className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white">
              + Crear Perfil
            </button>
          )}
        </div>

        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-32 text-gray-500 text-sm">Cargando...</div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs capitalize text-gray-500">
                {activeTab === 'usuarios' ? (
                  <tr>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3 min-w-[200px]">Nombre/Razón Social</th>
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Perfil</th>
                    <th className="px-4 py-3">Sedes</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Acción</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-3">Clave</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Visible</th>
                    <th className="px-4 py-3">Usuarios Asignados</th>
                    <th className="px-4 py-3">Acción</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-gray-500">No hay registros para mostrar.</td>
                  </tr>
                ) : activeTab === 'usuarios' ? (
                  paginatedData.map((u: any) => (
                    <tr key={u.username} className={`hover:bg-gray-50 ${!u.estado ? 'bg-amber-50/20' : ''}`}>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <span>{u.username}</span>
                          {!u.estado && (
                            <span className="inline-flex items-center rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                              Inactivo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {esRuc(u.tipoDocumentoKey) ? u.nombreRazonSocial : `${u.nombres || ''} ${u.apellidos || ''}`.trim()}
                      </td>
                      <td className="px-4 py-3">{u.nroDocumento || '-'}</td>
                      <td className="px-4 py-3">{u.user_type}</td>
                      <td className="px-4 py-3">{u.perfil_id}</td>
                      <td className="px-4 py-3">
                        {perfilTieneAccesoGlobalSedes(perfiles, u.perfil_id) ? (
                          <span className="text-xs font-semibold text-gray-500">Todas</span>
                        ) : (
                          <div
                            className="flex max-w-[260px] items-center gap-1 whitespace-nowrap"
                            title={(u.sedes || []).map((s: any) => s.nombre).join(', ')}
                          >
                            {u.sedes?.slice(0, 2).map((s: any) => (
                              <span key={s.key} className="max-w-[110px] truncate rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600">
                                {s.nombre}
                              </span>
                            ))}
                            {u.sedes?.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setDetalleSedes({ usuario: u.username, sedes: u.sedes.slice(2) })}
                                className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-[#052A79] hover:bg-blue-100"
                                title={`Ver ${u.sedes.length - 2} sedes adicionales`}
                              >
                                +{u.sedes.length - 2} más
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.estado ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                            Activo
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        {puedeGestionarCredenciales && (
                          <button
                            type="button"
                            data-testid={`btn-credencial-${u.username}`}
                            onClick={() => consultarCredencialUsuario(u.username)}
                            title="Consultar / entregar credencial administrada"
                            className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-base text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            <Key size={18} />
                          </button>
                        )}
                        <button onClick={() => handleOpenUsuario(u)} title="Editar" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-base text-[#052A79] hover:bg-blue-100 transition-colors">
                          <Edit size={18} />
                        </button>
                        {u.username !== currentUsername && (
                          <button onClick={() => handleDeleteUsuario(u.username)} title="Eliminar" className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-base text-[#052A79] hover:bg-red-100 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  paginatedData.map((p: any) => (
                    <tr key={p.clave} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{p.clave}</td>
                      <td className="px-4 py-3">{p.nombre}</td>
                      <td className="px-4 py-3">
                        {p.visible ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">Sí</span>
                        ) : (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">{p.num_usuarios}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <button onClick={() => {
                          setModalMode('editar');
                          setFormData({
                            clave: p.clave,
                            nombre: p.nombre,
                            visible: p.visible,
                            sedes: p.sedes || [],
                            permisos: filtrarPermisosVigentes(p.permisos || [])
                          });
                          setShowModal(true);
                        }} title="Editar" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-base text-[#052A79] hover:bg-blue-100 transition-colors">
                          <Edit size={18} />
                        </button>
                        {p.clave !== 'SISTEMAS' && (
                          <button onClick={() => abrirBajaPerfil(p.clave)} title="Eliminar" className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-base text-[#052A79] hover:bg-red-100 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
          <span>Mostrando {mostrandoInicio} a {mostrandoFin} de {totalRegistros} registros.</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="rounded-lg border border-gray-300 px-3 py-1 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >Anterior</button>
            <span className="font-medium text-gray-600">Página {page} de {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-gray-300 px-3 py-1 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >Siguiente</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {detalleSedes && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detalle-sedes-titulo"
          onClick={() => setDetalleSedes(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="detalle-sedes-titulo" className="text-sm font-bold text-[#052A79]">Sedes adicionales</h2>
                <p className="mt-0.5 text-xs text-slate-500">Usuario: {detalleSedes.usuario}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetalleSedes(null)}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50"
                aria-label="Cerrar detalle de sedes"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 flex max-h-52 flex-wrap gap-1.5 overflow-y-auto">
              {detalleSedes.sedes.map((sede) => (
                <span key={sede.key} className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-700">
                  {sede.nombre}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalCredencialConsultada && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-credencial-consultada"
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Key className="text-[#052A79]" size={20} />
                <h2 id="titulo-credencial-consultada" className="text-lg font-bold text-[#052A79]">
                  Gestión de Credencial Administrada
                </h2>
              </div>
              <button
                type="button"
                onClick={cerrarModalCredencial}
                aria-label="Cerrar modal de credencial"
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalCredencialConsultada.cargando ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Consultando inventario de credenciales y verificando vigencia con la base de datos...
              </div>
            ) : modalCredencialConsultada.error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {modalCredencialConsultada.error}
              </div>
            ) : modalCredencialConsultada.datos ? (
              <div className="mt-4 space-y-4">
                {modalCredencialConsultada.datos.username === 'gibarra' ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    <p className="font-bold">Cuenta administrativa protegida</p>
                    <p className="mt-1">
                      El usuario <strong>gibarra</strong> fue expresamente excluido de la renovación masiva.
                      Su contraseña, permisos y sesiones no fueron alterados.
                    </p>
                  </div>
                ) : (modalCredencialConsultada.datos.custodiada || modalCredencialConsultada.datos.password) ? (
                  <>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start gap-2">
                      {modalCredencialConsultada.datos.password ? (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold">
                          {modalCredencialConsultada.datos.password
                            ? (modalCredencialConsultada.datos.custodiada ? 'Credencial vigente bajo custodia (revelada)' : 'Credencial vigente lista para entrega')
                            : 'Contraseña vigente bajo custodia (AES-256-GCM)'}
                        </p>
                        <p className="mt-0.5">
                          {modalCredencialConsultada.datos.password
                            ? 'La contraseña coincide con el hash actual de PostgreSQL. Puede ser entregada al usuario.'
                            : 'La credencial administrada está enmascarada por seguridad. Presione el ícono del ojo para revelar.'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-500 font-medium">Usuario:</span>{' '}
                        <span className="font-bold text-slate-800">{modalCredencialConsultada.datos.username}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Perfil:</span>{' '}
                        <span className="font-bold text-slate-800">{modalCredencialConsultada.datos.perfil || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 font-medium">Nombre:</span>{' '}
                        <span className="font-semibold text-slate-800">{modalCredencialConsultada.datos.nombreCompleto || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Estado:</span>{' '}
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          {modalCredencialConsultada.datos.custodiada ? 'Vigente bajo custodia' : (modalCredencialConsultada.datos.estadoCredencial || 'Vigente')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Última modificación:</span>{' '}
                        <span className="text-slate-700">{modalCredencialConsultada.datos.fechaAsignacion || modalCredencialConsultada.datos.fechaUltimoRestablecimiento || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 font-medium">Responsable:</span>{' '}
                        <span className="font-semibold text-slate-800">{modalCredencialConsultada.datos.responsableRestablecimiento || 'gibarra'}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="input-contrasenha-administrada" className="block text-xs font-bold text-slate-600">
                          Contraseña administrada
                        </label>
                        {!modalCredencialConsultada.datos.password && (
                          <span className="text-[11px] text-blue-700 font-medium flex items-center gap-1">
                            <Lock size={12} /> Clic en el ojo para revelar
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            id="input-contrasenha-administrada"
                            readOnly
                            type={(modalCredencialConsultada.datos.password && mostrarPasswordConsultada) ? 'text' : 'password'}
                            value={(modalCredencialConsultada.datos.password && mostrarPasswordConsultada) ? modalCredencialConsultada.datos.password : '••••••••••••••••'}
                            aria-label="Contraseña administrada asignada"
                            className="w-full rounded border border-slate-300 p-2 pr-10 font-mono text-sm bg-slate-50 cursor-pointer"
                            onClick={handleToggleEyeRevelar}
                            onFocus={(event) => {
                              if (modalCredencialConsultada.datos?.password && mostrarPasswordConsultada) {
                                event.currentTarget.select();
                              }
                            }}
                          />
                          <button
                            type="button"
                            data-testid="btn-toggle-eye"
                            disabled={revelandoCredencial}
                            aria-label={modalCredencialConsultada.datos.password && mostrarPasswordConsultada ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            onClick={handleToggleEyeRevelar}
                            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-[#052A79] z-10 cursor-pointer focus:outline-none disabled:opacity-50"
                            title={!modalCredencialConsultada.datos.password ? 'Presione para consultar la contraseña custodiada' : (mostrarPasswordConsultada ? 'Ocultar' : 'Mostrar')}
                          >
                            {revelandoCredencial ? (
                              <Loader2 size={17} className="animate-spin text-[#052A79]" />
                            ) : modalCredencialConsultada.datos.password && mostrarPasswordConsultada ? (
                              <EyeOff size={17} data-testid="icon-eye-off" />
                            ) : (
                              <Eye size={17} data-testid="icon-eye" />
                            )}
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={!modalCredencialConsultada.datos?.password}
                          onClick={async () => {
                            if (!modalCredencialConsultada.datos?.password) return;
                            await navigator.clipboard.writeText(modalCredencialConsultada.datos.password);
                            setCredencialConsultadaCopiada(true);
                            setTimeout(() => setCredencialConsultadaCopiada(false), 2000);
                          }}
                          className={!modalCredencialConsultada.datos?.password
                            ? 'inline-flex items-center gap-2 rounded bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-400 cursor-not-allowed'
                            : 'inline-flex items-center gap-2 rounded bg-[#052A79] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 cursor-pointer shadow-sm'}
                          title={!modalCredencialConsultada.datos.password ? 'Debe revelar la contraseña con el ícono del ojo para habilitar Copiar' : 'Copiar'}
                        >
                          <Copy size={16} /> {credencialConsultadaCopiada ? '¡Copiada!' : 'Copiar'}
                        </button>
                        <button
                          type="button"
                          disabled={!modalCredencialConsultada.datos?.password}
                          onClick={() => {
                            if (!modalCredencialConsultada.datos?.password) return;
                            descargarComprobanteEntrega({
                              username: modalCredencialConsultada.datos.username,
                              password: modalCredencialConsultada.datos.password,
                              nombreCompleto: modalCredencialConsultada.datos.nombreCompleto,
                              perfil: modalCredencialConsultada.datos.perfil,
                              sede: modalCredencialConsultada.datos.sede,
                              accion: 'Entrega de credencial administrada'
                            });
                          }}
                          className={!modalCredencialConsultada.datos?.password
                            ? 'inline-flex items-center gap-2 rounded border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400 cursor-not-allowed'
                            : 'inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm'}
                          title={!modalCredencialConsultada.datos.password ? 'Debe revelar la contraseña con el ícono del ojo para descargar el comprobante' : 'Descargar comprobante'}
                        >
                          <Download size={16} /> Descargar comprobante (.txt)
                        </button>
                      </div>
                    </div>

                    {errorRevelacion && (
                      <div role="alert" className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
                        <AlertTriangle size={15} className="shrink-0 text-red-600" />
                        <span className="font-semibold">{errorRevelacion}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const uObj = usuarios.find(u => u.username?.toLowerCase() === modalCredencialConsultada.datos?.username?.toLowerCase());
                          cerrarModalCredencial();
                          if (uObj) {
                            handleOpenUsuario(uObj, true);
                          }
                        }}
                        className="text-slate-600 hover:text-[#052A79] underline font-medium cursor-pointer"
                      >
                        Editar manualmente...
                      </button>
                      <button
                        type="button"
                        disabled={generandoTemporal}
                        onClick={() => handleGenerarCredencialTemporal(modalCredencialConsultada.datos.username)}
                        className="inline-flex items-center gap-1.5 text-slate-600 hover:text-[#052A79] font-medium"
                      >
                        <Key size={13} /> {generandoTemporal ? 'Generando...' : 'Generar nueva clave temporal...'}
                      </button>
                    </div>
                  </>
                ) : modalCredencialConsultada.datos.vigente ? (
                  <div className="rounded-lg border border-emerald-200 bg-slate-50 p-4 text-sm text-slate-800 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <span>{modalCredencialConsultada.datos.estadoCredencial || 'Contraseña activa / Vigente'}</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      La cuenta cuenta con una contraseña activa y vigente en el sistema de autenticación de PostgreSQL.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-500 font-medium">Usuario:</span>{' '}
                        <span className="font-bold text-slate-800">{modalCredencialConsultada.datos.username}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Perfil:</span>{' '}
                        <span className="font-bold text-slate-800">{modalCredencialConsultada.datos.perfil || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 font-medium">Nombre:</span>{' '}
                        <span className="font-semibold text-slate-800">{modalCredencialConsultada.datos.nombreCompleto || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Última modificación:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {modalCredencialConsultada.datos.fechaUltimoRestablecimiento || 'No registrada'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Responsable:</span>{' '}
                        <span className="font-semibold text-slate-800">
                          {modalCredencialConsultada.datos.responsableRestablecimiento || 'gibarra'}
                        </span>
                      </div>
                    </div>
                    <div className="rounded border border-blue-100 bg-blue-50/80 p-2.5 text-xs text-blue-900">
                      <p className="font-semibold text-blue-950">Protección criptográfica</p>
                      <p className="mt-0.5 text-[11px] text-blue-800">
                        Esta cuenta no registra una credencial previa en el almacén de custodia cifrada. Por motivos de seguridad se resguarda en PostgreSQL mediante hash unidireccional (bcrypt). Si requiere entregar una nueva clave al usuario, genere una contraseña temporal con 1 clic.
                      </p>
                    </div>

                    {modalCredencialConsultada.datos.puedeRestablecer && (
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const uObj = usuarios.find(u => u.username?.toLowerCase() === modalCredencialConsultada.datos?.username?.toLowerCase());
                            cerrarModalCredencial();
                            if (uObj) {
                              handleOpenUsuario(uObj, true);
                            }
                          }}
                          className="text-xs text-slate-600 hover:text-[#052A79] underline font-medium cursor-pointer"
                        >
                          Editar manualmente...
                        </button>
                        <button
                          type="button"
                          disabled={generandoTemporal}
                          onClick={() => handleGenerarCredencialTemporal(modalCredencialConsultada.datos.username)}
                          className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-sm disabled:opacity-50"
                        >
                          <Key size={14} /> {generandoTemporal ? 'Generando contraseña...' : `Generar nueva contraseña temporal`}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-red-800">
                      <AlertTriangle size={18} />
                      <span>Cuenta o contraseña inactiva</span>
                    </div>
                    <p className="text-xs">
                      {modalCredencialConsultada.datos.motivo || 'La cuenta se encuentra inactiva o no registra contraseña configurada.'}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={cerrarModalCredencial}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {bajaPerfil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-baja-perfil" className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
            <h2 id="titulo-baja-perfil" className="text-lg font-bold">Eliminar perfil {bajaPerfil.clave}</h2>
            <p className="mt-3 text-sm">{bajaPerfil.usuarios.length} usuario(s) vinculado(s).</p>
            {bajaPerfil.usuarios.length > 0 && <>
              <ul className="my-3 max-h-48 overflow-auto text-sm">
                {bajaPerfil.usuarios.map(u => <li key={u.username}>{u.username} — {[u.nombres, u.apellidos].filter(Boolean).join(' ') || 'Sin nombre registrado'}{u.estado ? '' : ' (inactivo)'}</li>)}
              </ul>
              <label htmlFor="perfil-reemplazo" className="text-sm font-semibold">Perfil de reemplazo</label>
              <select id="perfil-reemplazo" value={reemplazoPerfil} onChange={e => setReemplazoPerfil(e.target.value)} disabled={procesandoBaja} className="mt-1 w-full rounded border p-2">
                <option value="">Selecciona un perfil</option>
                {perfiles.filter(p => p.clave !== bajaPerfil.clave).map(p => <option key={p.clave} value={p.clave}>{p.nombre} ({p.clave})</option>)}
              </select>
              <p className="mt-2 text-sm text-gray-600">Los usuarios recibirán los permisos del perfil elegido y deberán iniciar sesión nuevamente. El reemplazo debe permitir sus sedes actuales.</p>
            </>}
            <p className="mt-3 text-sm">Se eliminarán las asignaciones de permisos y sedes del perfil. Los permisos y las sedes se conservan.</p>
            {errorBajaPerfil && <p role="alert" className="mt-3 text-sm text-red-700">{errorBajaPerfil}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button disabled={procesandoBaja} onClick={() => setBajaPerfil(null)} className="rounded border px-4 py-2">Cancelar</button>
              <button disabled={procesandoBaja || (bajaPerfil.usuarios.length > 0 && !reemplazoPerfil)} onClick={confirmarBajaPerfil} className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50">{procesandoBaja ? 'Procesando…' : bajaPerfil.usuarios.length ? 'Reasignar y eliminar' : 'Eliminar perfil'}</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#052a79]">
                {activeTab === 'usuarios'
                  ? (modalMode === 'crear' ? 'Crear Usuario' : 'Editar Usuario')
                  : (modalMode === 'crear' ? 'Crear Perfil' : 'Editar Perfil')
                }
              </h2>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {error && (
                <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg shadow-sm border border-red-200 text-sm space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <div>{error}</div>
                  </div>
                  {(error.toLowerCase().includes('inactivo') || error.toLowerCase().includes('inactivos')) && (
                    <div className="pt-2 border-t border-red-200 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const usernameABuscar = formData.username;
                          setShowModal(false);
                          setEstadoFiltro('INACTIVOS');
                          setSearchQuery(usernameABuscar);
                        }}
                        className="rounded bg-[#052A79] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-900 transition-colors"
                      >
                        Ir a filtro Inactivos y localizar cuenta
                      </button>
                    </div>
                  )}
                </div>
              )}
              <form id="main-form" noValidate onSubmit={activeTab === 'usuarios' ? handleSaveUsuario : async (e) => {
                e.preventDefault();
                try {
                  setSaving(true);
                  const payload = {
                    ...formData,
                    permisos: filtrarPermisosDelCatalogo(formData.permisos || [], permisos)
                  };
                  if (modalMode === 'crear') {
                    await faregasUsuariosApi.crearPerfil(payload);
                  } else {
                    await faregasUsuariosApi.actualizarPerfil(payload.clave, payload);
                  }
                  localStorage.setItem('faregas_permisos_updated_at', String(Date.now()));
                  window.dispatchEvent(new CustomEvent('faregasPermisosActualizados'));
                  setShowModal(false);
                  await cargarDatos();
                  setMensajeExito(`Perfil ${payload.nombre || payload.clave} guardado correctamente.`);
                  setTimeout(() => setMensajeExito(null), 5000);
                } catch (err: any) {
                  const mensajes: Record<string, string> = {
                    PERFILES_NO_AUTORIZADO:
                      'No tienes autorización para administrar perfiles.',
                    PERMISOS_NO_DISPONIBLES:
                      'No se pudo guardar el perfil porque uno o más permisos no están registrados o no están activos.',
                    PERMISOS_SENSIBLES_NO_DISPONIBLES:
                      'No se pudo guardar el perfil porque uno o más permisos sensibles no están registrados o no están activos.',
                    PERMISOS_SENSIBLES_INVALIDOS:
                      'No se pudo guardar el perfil porque la lista de permisos sensibles contiene claves inválidas.',
                    PERMISOS_NO_GESTIONABLES:
                      'No se pudo guardar el perfil porque uno o más permisos no se administran desde este editor.'
                  };
                  const clavesInvalidas = Array.isArray(err?.detalles?.claves)
                    ? err.detalles.claves.filter((clave: unknown): clave is string => typeof clave === 'string')
                    : [];
                  const detalleClaves = clavesInvalidas.length > 0
                    ? ` Permisos afectados: ${clavesInvalidas.join(', ')}.`
                    : '';
                  setError(`${mensajes[err?.codigo] || err.message || 'Error al guardar perfil'}${detalleClaves}`);
                } finally {
                  setSaving(false);
                }
              }} className="faregas-user-form space-y-6">

                {activeTab === 'usuarios' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* COLUMNA IZQUIERDA */}
                    <div className="space-y-6">
                      {/* SECCIÓN CUENTA */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-3 border-b pb-2">Cuenta</h3>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Username <span className="text-red-500">*</span></label>
                            <input type="text" ref={registrarRef('username')} className={claseInput('username')}
                              aria-invalid={erroresCampo.username ? true : undefined}
                              value={formData.username}
                              onChange={e => {
                                const valor = e.target.value.trim();
                                setFormData({ ...formData, username: valor });
                                if (valor) registrarError('username', validarUsername(valor), false);
                              }}
                              onBlur={e => registrarError('username', validarUsername(e.target.value.trim()))}
                              disabled={modalMode === 'editar'} />
                            {mensajeCampo('username')}
                          </div>
                        </div>
                      </div>

                      {/* SECCIÓN IDENTIDAD */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-3 border-b pb-2">Identidad</h3>
                        <p className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                          FAREGAS guarda este perfil en su propio almacenamiento. Hasta aplicar la migración de perfiles, las altas independientes y los cambios personales estarán temporalmente bloqueados; no se modificará el padrón de FARENET.
                        </p>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Tipo de Documento <span className="text-red-500">*</span></label>
                            <select ref={registrarRef('tipoDocumentoKey')} className={`${claseInput('tipoDocumentoKey')} bg-white`}
                              aria-invalid={erroresCampo.tipoDocumentoKey ? true : undefined}
                              value={formData.tipoDocumentoKey}
                              onChange={e => {
                                // Al cambiar de tipo, el documento ya escrito puede
                                // dejar de ser valido: se revalida en el momento.
                                const tipoDocumentoKey = e.target.value;
                                setFormData({ ...formData, tipoDocumentoKey });
                                setErroresCampo((actual) => {
                                  const siguiente = { ...actual };
                                  const errorDoc = validarDocumento(tipoDocumentoKey, formData.nroDocumento);
                                  if (errorDoc) siguiente.nroDocumento = errorDoc;
                                  else delete siguiente.nroDocumento;
                                  return siguiente;
                                });
                              }}>
                              <option value="">Seleccione...</option>
                              {tiposDocumento.map(t => <option key={t.key} value={t.key}>{t.nombre}</option>)}
                            </select>
                            {mensajeCampo('tipoDocumentoKey')}
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Nro Documento <span className="text-red-500">*</span></label>
                            <input type="text" ref={registrarRef('nroDocumento')} className={claseInput('nroDocumento')}
                              inputMode={atributosDocumento(formData.tipoDocumentoKey).inputMode}
                              maxLength={atributosDocumento(formData.tipoDocumentoKey).maxLength}
                              aria-invalid={erroresCampo.nroDocumento ? true : undefined}
                              value={formData.nroDocumento}
                              onChange={e => {
                                // En DNI y RUC se deja solo lo digitado: no
                                // tiene sentido que el campo acepte letras.
                                const numerico = REGLAS_DOCUMENTO[String(formData.tipoDocumentoKey || '').toLowerCase()]?.soloDigitos;
                                const valor = numerico ? normalizarSoloDigitos(e.target.value) : e.target.value;
                                setFormData({ ...formData, nroDocumento: valor });
                                if (valor) registrarError('nroDocumento', validarDocumento(formData.tipoDocumentoKey, valor), false);
                              }}
                              onBlur={e => registrarError('nroDocumento', validarDocumento(formData.tipoDocumentoKey, e.target.value))} />
                            {mensajeCampo('nroDocumento')}
                          </div>
                        </div>

                        {!esRuc(formData.tipoDocumentoKey) ? (
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Nombres <span className="text-red-500">*</span></label>
                              <input type="text" ref={registrarRef('nombres')} className={claseInput('nombres')}
                                aria-invalid={erroresCampo.nombres ? true : undefined}
                                value={formData.nombres}
                                onChange={e => setFormData({ ...formData, nombres: e.target.value })}
                                onBlur={e => registrarError('nombres', validarNombre(e.target.value, 'nombre'))} />
                              {mensajeCampo('nombres')}
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Apellidos <span className="text-red-500">*</span></label>
                              <input type="text" ref={registrarRef('apellidos')} className={claseInput('apellidos')}
                                aria-invalid={erroresCampo.apellidos ? true : undefined}
                                value={formData.apellidos}
                                onChange={e => setFormData({ ...formData, apellidos: e.target.value })}
                                onBlur={e => registrarError('apellidos', validarNombre(e.target.value, 'apellido'))} />
                              {mensajeCampo('apellidos')}
                            </div>
                          </div>
                        ) : (
                          <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Razón Social <span className="text-red-500">*</span></label>
                            <input type="text" ref={registrarRef('nombreRazonSocial')} className={claseInput('nombreRazonSocial')}
                              aria-invalid={erroresCampo.nombreRazonSocial ? true : undefined}
                              value={formData.nombreRazonSocial}
                              onChange={e => setFormData({ ...formData, nombreRazonSocial: e.target.value })} />
                            {mensajeCampo('nombreRazonSocial')}
                          </div>
                        )}
                      </div>

                      {/* SECCIÓN SEGURIDAD */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-3 border-b pb-2">Seguridad</h3>
                        {modalMode === 'editar' && (
                          <div className="mb-4">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-[#052a79]"
                                checked={crearNuevaPassword}
                                onChange={(e) => {
                                  const check = e.target.checked;
                                  setCrearNuevaPassword(check);
                                  setFormData({
                                    ...formData,
                                    requierePassword: check,
                                    password: '',
                                    confirmPassword: ''
                                  });
                                }}
                              />
                              <span>Crear nueva contraseña</span>
                            </label>
                          </div>
                        )}

                        {(modalMode === 'crear' || crearNuevaPassword) && (
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 capitalize mb-1">
                                Contraseña {modalMode === 'crear' && <span className="text-red-500">*</span>}
                              </label>
                              <div className="relative">
                                <input
                                  type={mostrarPassword ? 'text' : 'password'}
                                  ref={registrarRef('password')}
                                  className={`${claseInput('password')} pr-10`}
                                  aria-invalid={erroresCampo.password ? true : undefined}
                                  autoComplete="new-password"
                                  value={formData.password}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setFormData({ ...formData, password: val });
                                    if (val) {
                                      const evalRes = evaluarPasswordSegura(val, formData.username, {
                                        minLongitud: politicaPassword?.minLongitud,
                                        esProduccion: politicaPassword?.esProduccion,
                                        esAdmin: formData.perfil_id === 'ADMINISTRADOR',
                                      });
                                      setAdvertenciaPassword(evalRes.advertencia);
                                    } else {
                                      setAdvertenciaPassword(null);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                  onClick={() => setMostrarPassword((v) => !v)}
                                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-[#052A79]"
                                >
                                  {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                              {advertenciaPassword && !erroresCampo.password && (
                                <div className="mt-1 flex items-center gap-1.5 rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 border border-amber-200">
                                  <ShieldAlert size={14} className="text-amber-600 shrink-0" />
                                  <span>{advertenciaPassword}</span>
                                </div>
                              )}
                              {mensajeCampo('password')}
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 capitalize mb-1">
                                Confirmar Contraseña {modalMode === 'crear' && <span className="text-red-500">*</span>}
                              </label>
                              <div className="relative">
                                <input
                                  type={mostrarConfirmPassword ? 'text' : 'password'}
                                  ref={registrarRef('confirmPassword')}
                                  className={`${claseInput('confirmPassword')} pr-10`}
                                  aria-invalid={erroresCampo.confirmPassword ? true : undefined}
                                  autoComplete="new-password"
                                  value={formData.confirmPassword}
                                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                />
                                <button
                                  type="button"
                                  aria-label={mostrarConfirmPassword ? 'Ocultar confirmar contraseña' : 'Mostrar confirmar contraseña'}
                                  onClick={() => setMostrarConfirmPassword((v) => !v)}
                                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-[#052A79]"
                                >
                                  {mostrarConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                              {mensajeCampo('confirmPassword')}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="estadoCheck" className="h-4 w-4 text-[#052a79]"
                            disabled={modalMode === 'editar' && formData.username === currentUsername}
                            checked={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.checked })} />
                          <label htmlFor="estadoCheck" className={`text-sm font-semibold ${modalMode === 'editar' && formData.username === currentUsername ? 'text-slate-400' : 'text-slate-700'}`}>Usuario Activo</label>
                        </div>
                      </div>
                    </div>

                    {/* COLUMNA DERECHA */}
                    <div className="space-y-6">
                      {/* SECCIÓN UBICACIÓN Y CONTACTO */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-3 border-b pb-2">Ubicación y Contacto</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 capitalize mb-1">País <span className="text-red-500">*</span></label>
                            <select className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none bg-white" required
                              value={formData.paisKey} onChange={e => handlePaisChange(e.target.value)}>
                              <option value="">Seleccione...</option>
                              {paises.map(p => <option key={p.key} value={p.key}>{p.nombre}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Departamento <span className="text-red-500">*</span></label>
                            <select className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none bg-white" required
                              value={formData.departamentoKey} onChange={e => handleDepartamentoChange(e.target.value)} disabled={!formData.paisKey}>
                              <option value="">Seleccione...</option>
                              {departamentos.map(d => <option key={d.key} value={d.key}>{d.nombre}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Provincia <span className="text-red-500">*</span></label>
                            <select className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none bg-white" required
                              value={formData.provinciaKey} onChange={e => handleProvinciaChange(e.target.value)} disabled={!formData.departamentoKey}>
                              <option value="">Seleccione...</option>
                              {provincias.map(p => <option key={p.key} value={p.key}>{p.nombre}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Distrito <span className="text-red-500">*</span></label>
                            <select className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none bg-white" required
                              value={formData.distritoKey} onChange={e => setFormData({ ...formData, distritoKey: e.target.value })} disabled={!formData.provinciaKey}>
                              <option value="">Seleccione...</option>
                              {distritos.map(d => <option key={d.key} value={d.key}>{d.nombre}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Dirección <span className="text-red-500">*</span></label>
                          <input type="text" ref={registrarRef('direccion')} className={claseInput('direccion')}
                            aria-invalid={erroresCampo.direccion ? true : undefined}
                            value={formData.direccion}
                            onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                            onBlur={e => registrarError('direccion', validarDireccion(e.target.value))} />
                          {mensajeCampo('direccion')}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Teléfono <span className="text-red-500">*</span></label>
                            <input type="tel" ref={registrarRef('telefono')} className={claseInput('telefono')}
                              inputMode="numeric"
                              maxLength={TELEFONO_MAXIMO}
                              aria-invalid={erroresCampo.telefono ? true : undefined}
                              value={formData.telefono}
                              onChange={e => {
                                // Solo digitos y como maximo 9: no se pueden
                                // escribir letras, espacios ni signos, ni un
                                // digito de mas.
                                const valor = normalizarTelefono(e.target.value);
                                setFormData({ ...formData, telefono: valor });
                                if (valor) registrarError('telefono', validarTelefono(valor), false);
                              }}
                              onBlur={e => registrarError('telefono', validarTelefono(e.target.value))} />
                            {mensajeCampo('telefono')}
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Email</label>
                            <input type="email" ref={registrarRef('email')} className={claseInput('email')}
                              maxLength={EMAIL_MAXIMO}
                              aria-invalid={erroresCampo.email ? true : undefined}
                              value={formData.email}
                              onChange={e => setFormData({ ...formData, email: e.target.value })}
                              onBlur={e => registrarError('email', validarEmail(e.target.value))} />
                            {mensajeCampo('email')}
                          </div>
                        </div>
                      </div>

                      {/* SECCIÓN PERFIL Y SEDES */}
                      <div className="bg-white p-4 rounded-lg border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-3 border-b pb-2">Perfil y Sedes</h3>
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Perfil <span className="text-red-500">*</span></label>
                          <select className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none bg-white" required
                            value={formData.perfil_id} onChange={e => handlePerfilUsuarioChange(e.target.value)}>
                            {perfiles.map(p => <option key={p.clave} value={p.clave}>{p.nombre}</option>)}
                          </select>
                        </div>
                        <div>
                          {perfilTieneAccesoGlobalSedes(perfiles, formData.perfil_id) ? (
                            <>
                              <label className="block text-xs font-bold text-slate-600 capitalize mb-2">Sedes Asignadas</label>
                              <div className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded p-3 text-center">
                                ACCESO A TODAS LAS SEDES
                              </div>
                            </>
                          ) : (
                            <>
                              <label className="block text-xs font-bold text-slate-600 capitalize mb-2">Sedes Disponibles para este Perfil</label>
                              <div className="mb-2">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                  <input type="checkbox"
                                    className="h-4 w-4 text-[#052a79]"
                                    checked={(formData.sedes || []).length === (perfiles.find(p => p.clave === formData.perfil_id)?.sedes || []).length && (formData.sedes || []).length > 0}
                                    onChange={(e) => {
                                      const allowedSedes = perfiles.find(p => p.clave === formData.perfil_id)?.sedes || [];
                                      setFormData({ ...formData, sedes: e.target.checked ? allowedSedes : [] });
                                    }}
                                  />
                                  <span className="font-bold text-[#052a79]">Seleccionar todas</span>
                                </label>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                                {plantas.filter(p => (perfiles.find(pf => pf.clave === formData.perfil_id)?.sedes || []).includes(p.key)).map(p => (
                                  <label key={p.key} className={`flex items-center gap-2 text-sm bg-white p-2 rounded border border-slate-200 ${!p.activo ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}>
                                    <input type="checkbox"
                                      className="h-4 w-4 text-[#052A79]"
                                      checked={(formData.sedes || []).includes(p.key)}
                                      onChange={() => toggleSede(p.key)}
                                      disabled={!p.activo}
                                    />
                                    <span className="font-medium text-slate-700 truncate">
                                      {p.nombre} {!p.activo && <span className="text-[10px] text-red-500 font-bold ml-1">(Inactiva)</span>}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // PERFIL FORM
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Clave</label>
                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" required disabled={modalMode === 'editar'}
                          value={formData.clave || ''} onChange={e => setFormData({ ...formData, clave: e.target.value.toUpperCase() })} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Nombre</label>
                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" required
                          value={formData.nombre || ''} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="visibleCheck" className="h-4 w-4 text-[#052a79]"
                        checked={formData.visible} onChange={e => setFormData({ ...formData, visible: e.target.checked })} />
                      <label htmlFor="visibleCheck" className="text-sm font-semibold text-slate-700">Perfil Visible</label>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <label className="block text-xs font-bold text-slate-600 capitalize mb-2">Sedes Disponibles</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {plantas.map(p => {
                          const isSistemas = formData.clave === 'SISTEMAS';
                          const isChecked = isSistemas || (formData.sedes || []).includes(p.key);
                          const isDisabled = isSistemas || !p.activo;

                          return (
                            <label key={p.key} className={`flex items-center gap-2 text-sm bg-slate-50 p-2 rounded border border-slate-200 ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}>
                              <input type="checkbox"
                                className="h-4 w-4 text-[#052A79]"
                                checked={isChecked}
                                onChange={() => !isSistemas && toggleSede(p.key)}
                                disabled={isDisabled}
                              />
                              <span className="font-medium text-slate-700 truncate">
                                {p.nombre} {!p.activo && <span className="text-[10px] text-red-500 font-bold ml-1">(Inactiva)</span>}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <label className="block text-xs font-bold text-slate-600 capitalize mb-2">Módulos / Menú</label>
                      {(() => {
                        const marcados = formData.permisos || [];
                        const esSubmodulo = (clave: string) =>
                          MODULOS_CON_SUBMODULOS.some((m) => m.hijos.includes(clave));
                        // Los submódulos no se listan sueltos: se anidan bajo su padre.
                        const lista = permisos.filter((p) => !esSubmodulo(p.clave));
                        const otros = lista.filter((p) =>
                          !MODULOS_CON_SUBMODULOS.some((m) => m.padre === p.clave));

                        const casilla = (p: PermisoPerfil, hijo: boolean, padreActivo: boolean) => {
                          const permisoSensible = esPermisoSensible(p.clave);
                          const activo = marcados.includes(p.clave);
                          // Un submódulo sólo se bloquea para marcarlo si su
                          // módulo padre no está activo. Si ya estaba marcado,
                          // se permite desmarcarlo para poder revocar cualquier
                          // permiso, incluidos los sensibles.
                          const bloqueado = hijo && !padreActivo && !activo;
                          const clavePadre = MODULOS_CON_SUBMODULOS.find(
                            (o) => o.hijos.includes(p.clave))?.padre;
                          const etiquetaPadre = clavePadre === PERMISO_FACTURACION
                            ? 'Facturación'
                            : clavePadre === PERMISO_CONFIGURACION
                              ? 'Configuración'
                              : clavePadre === PERMISO_INICIO
                                ? 'Inicio'
                                : clavePadre === PERMISO_DASHBOARD
                                  ? 'Dashboard'
                                  : 'Inventario';
                          return (
                            <label key={p.clave}
                              className={`flex items-center gap-2 text-sm p-2 rounded border ${permisoSensible ? 'border-red-200 bg-red-50/60' : hijo ? 'border-slate-200 bg-white' : 'bg-slate-50 border-slate-200'} ${bloqueado ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}
                              title={bloqueado ? `Active primero ${etiquetaPadre}` : undefined}>
                              <input type="checkbox"
                                className="h-4 w-4 text-[#052a79]"
                                checked={activo}
                                onChange={() => !bloqueado && togglePermiso(p.clave)}
                                disabled={bloqueado}
                              />
                              <span className={`font-medium ${hijo ? 'text-slate-600 text-xs' : 'text-slate-700'}`}>
                                {NOMBRES_PERMISOS_INICIO[p.clave] || NOMBRES_MENU_INVENTARIO[p.clave] || NOMBRES_PERMISOS_DASHBOARD[p.clave] || p.nombre}
                              </span>
                              {permisoSensible && <span className="ml-auto rounded-full border border-red-200 bg-white px-2 py-0.5 text-[10px] font-bold text-red-700">Sensible</span>}
                            </label>
                          );
                        };

                        // Cada módulo con submódulos sale de la grilla y ocupa su
                        // propio bloque de ancho completo, para que sus hijos
                        // queden debajo y no se mezclen con otros módulos.
                        const bloqueModulo = (modulo: { padre: string; hijos: readonly string[] }) => {
                          const padre = lista.find((p) => p.clave === modulo.padre);
                          const hijos = modulo.hijos
                            .map((clave) => permisos.find((p) => p.clave === clave))
                            .filter((p): p is PermisoPerfil => Boolean(p));
                          if (!padre && modulo.padre !== PERMISO_INICIO) return null;
                          const padreActivo = padre ? marcados.includes(modulo.padre) : true;
                          return (
                            <div key={modulo.padre} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              {padre ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {casilla(padre, false, padreActivo)}
                                </div>
                              ) : <p className="text-sm font-bold text-slate-700">Inicio</p>}
                              {/* La línea vertical es la guía visual de la
                                                jerarquía: los hijos cuelgan del padre. */}
                              <div className="mt-2 ml-3 space-y-1.5 border-l-2 border-slate-300 pl-3">
                                {hijos.map((h) => casilla(h, true, padreActivo))}
                              </div>
                            </div>
                          );
                        };

                        return (
                          <div className="space-y-3">
                            <p className="rounded border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">Todos los usuarios activos pueden consultar el Dashboard de su sede y solicitar notas de crédito sobre operaciones autorizadas. Aprobar, emitir, exportar y consultar alcance global requieren sus permisos específicos.</p>
                            {MODULOS_CON_SUBMODULOS.map(bloqueModulo)}
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {otros.map((p) => casilla(p, false, true))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 rounded-b-xl">
              <button type="button" onClick={() => {
                setShowModal(false);
                setFormData((actual: Record<string, unknown>) => ({ ...actual, password: '', confirmPassword: '' }));
              }} className="px-6 py-2 border border-slate-300 bg-white rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition-colors" disabled={saving}>Cancelar</button>
              <button type="submit" form="main-form" className="px-6 py-2 bg-[#052a79] text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors shadow-sm disabled:opacity-50" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {credencialNueva && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-credencial-nueva"
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
          >
            <h2 id="titulo-credencial-nueva" className="text-lg font-bold text-[#052A79]">
              Contraseña {credencialNueva.accion}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Esta es la única oportunidad para copiar la nueva contraseña de <strong>{credencialNueva.username}</strong>.
              Al cerrar esta confirmación, FAREGAS la eliminará de la pantalla y conservará únicamente su hash seguro.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-600 mb-1">Nueva contraseña</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    readOnly
                    type={mostrarPassword ? 'text' : 'password'}
                    value={credencialNueva.password}
                    aria-label="Contraseña nueva para copiar"
                    className="w-full rounded border border-slate-300 p-2 pr-10 font-mono text-sm"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button
                    type="button"
                    aria-label={mostrarPassword ? 'Ocultar contraseña nueva' : 'Mostrar contraseña nueva'}
                    onClick={() => setMostrarPassword((valor) => !valor)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-[#052A79]"
                  >
                    {mostrarPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={copiarCredencialNueva}
                  className="inline-flex items-center gap-2 rounded bg-[#052A79] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
                >
                  <Copy size={16} /> {credencialCopiada ? 'Copiada' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const uObj = usuarios.find(u => u.username?.toLowerCase() === credencialNueva.username?.toLowerCase());
                    const nomComp = uObj ? ([uObj.nombres, uObj.apellidos].filter(Boolean).join(' ') || uObj.nombreRazonSocial || '') : '';
                    const perfNom = perfiles.find(p => p.clave === uObj?.perfil_id)?.nombre || uObj?.perfil_id || '';
                    const sedesNom = uObj?.sedes ? uObj.sedes.map((s: any) => s.nombre || s.key).join(', ') : '';
                    descargarComprobanteEntrega({
                      username: credencialNueva.username,
                      password: credencialNueva.password,
                      nombreCompleto: nomComp,
                      perfil: perfNom,
                      sede: sedesNom,
                      accion: credencialNueva.accion === 'creada' ? 'Creación de cuenta' : 'Restablecimiento de contraseña'
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download size={16} /> Descargar comprobante (.txt)
                </button>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setCredencialNueva(null);
                  setCredencialCopiada(false);
                  setMostrarPassword(false);
                }}
                className="rounded border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700"
              >
                Cerrar y olvidar contraseña
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}