import { useState, useEffect, useRef } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { faregasUsuariosApi } from '../../services/faregas-usuarios.api';
import type { MaestroUsuario } from '../../types/faregas-api';

import {
  atributosDocumento,
  EMAIL_MAXIMO,
  esRuc,
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

export function UsuariosView() {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'perfiles'>('usuarios');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [plantas, setPlantas] = useState<any[]>([]);
  const [permisos, setPermisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Errores por campo. Cada input inválido se marca en rojo y muestra su mensaje
  // debajo; el error global queda para los fallos que no son de un campo (409,
  // 500, o el rechazo del backend).
  const [erroresCampo, setErroresCampo] = useState<ErroresUsuario>({});
  const refsCampos = useRef<Partial<Record<CampoUsuario, HTMLElement | null>>>({});

  // Marca un campo al vuelo. `soloSiHayError` evita ensuciar el formulario antes
  // de que el operador haya tocado el campo.
  const registrarError = (campo: CampoUsuario, valor: string, soloSiHayError = true) => {
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
    `w-full border rounded p-2 text-sm focus:outline-none ${
      erroresCampo[campo]
        ? 'border-red-400 focus:border-red-500 bg-red-50/40'
        : 'border-slate-300 focus:border-[#052a79]'
    }`;

  const mensajeCampo = (campo: CampoUsuario) =>
    erroresCampo[campo] ? (
      <p className="mt-1 text-[11px] font-semibold text-red-600">{erroresCampo[campo]}</p>
    ) : null;
  const [saving, setSaving] = useState(false);

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

  const currentUsername = JSON.parse(sessionStorage.getItem('faregasUser') || '{}').username;

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
    } catch (e: any) {
      setError(e.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleOpenUsuario = async (usuario?: any) => {
    setError('');
    if (usuario) {
      setModalMode('editar');
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
    if (newPerfilId === 'SISTEMAS') {
      setFormData({ ...formData, perfil_id: newPerfilId, sedes: [] });
    } else {
      const perfilObj = perfiles.find(p => p.clave === newPerfilId);
      const allowedSedes = perfilObj?.sedes || [];
      const currentSedes = formData.sedes || [];
      const validSedes = currentSedes.filter((s: string) => allowedSedes.includes(s));
      setFormData({ ...formData, perfil_id: newPerfilId, sedes: validSedes });
    }
  };

  const handleDeleteUsuario = async (username: string) => {
    if (confirm(`¿Deseas eliminar el usuario ${username}? Esta acción eliminará el usuario de FAREGAS.`)) {
      try {
        await faregasUsuariosApi.eliminarUsuario(username);
        cargarDatos();
      } catch (e: any) {
        alert(e.message || 'Error al eliminar usuario');
      }
    }
  };

  const handleSaveUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Se valida el formulario COMPLETO antes de tocar la red. Si algo falla no
    // se hace request: no tiene sentido mandar datos que ya sabemos inválidos.
    const errores = validarFormularioUsuario(formData, modalMode === 'crear' ? 'crear' : 'editar');
    setErroresCampo(errores);
    if (tieneErrores(errores)) {
      // Se lleva al operador al primer campo inválido de arriba hacia abajo.
      const primero = primerCampoConError(errores);
      const elemento = primero ? refsCampos.current[primero] : null;
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (elemento as HTMLElement & { focus?: () => void }).focus?.();
      }
      return;
    }

    setSaving(true);
    try {
      const payloadUsuario = { ...formData };
      if (modalMode === 'crear') {
        // El backend aplica el valor canónico USER cuando no se envía user_type.
        delete payloadUsuario.user_type;
        await faregasUsuariosApi.crearUsuario(payloadUsuario);
      } else {
        // En edición se conserva el tipo original internamente; solo se oculta el selector.
        await faregasUsuariosApi.actualizarUsuario(selectedUsername, payloadUsuario);
        // Contraseña vacía significa "no cambiar": es el comportamiento previo.
        if (formData.password) {
          await faregasUsuariosApi.cambiarPassword(formData.username, formData.password);
        }
      }
      setShowModal(false);
      cargarDatos();
    } catch (e: any) {
      // El backend devuelve 400 con el detalle campo a campo; se marca igual que
      // la validación local para que el mensaje no se pierda.
      const delBackend = e.response?.data?.errores;
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
    'MENU_FACTURACION_PREPARACION',
    'MENU_FACTURACION_SERIES',
    'MENU_FACTURACION_COMPROBANTES'
  ] as const;
  const PERMISO_FACTURACION = 'MENU_FACTURACION';

  const SUBMODULOS_CONFIGURACION = [
    'MENU_CONFIGURACION_SEDES',
    'MENU_CONFIGURACION_CATALOGO',
    'MENU_CONFIGURACION_CORRELATIVOS',
    'MENU_CONFIGURACION_EMPRESAS'
  ] as const;
  const PERMISO_CONFIGURACION = 'MENU_CONFIGURACION';

  const MODULOS_CON_SUBMODULOS = [
    { padre: PERMISO_CHIPS, hijos: SUBMODULOS_CHIPS as readonly string[] },
    { padre: PERMISO_FACTURACION, hijos: SUBMODULOS_FACTURACION as readonly string[] },
    { padre: PERMISO_CONFIGURACION, hijos: SUBMODULOS_CONFIGURACION as readonly string[] }
  ];

  const togglePermiso = (clave: string) => {
    const current = formData.permisos || [];
    const modulo = MODULOS_CON_SUBMODULOS.find((m) => m.padre === clave);

    // Desmarcar un módulo padre se lleva por delante sus submódulos.
    if (modulo && current.includes(clave)) {
      setFormData({
        ...formData,
        permisos: current.filter((p: string) => p !== clave && !modulo.hijos.includes(p))
      });
      return;
    }

    // Marcar el padre habilita sus submódulos sin marcar ninguno: se deja que
    // el administrador elija cuáles, y editar el perfil sin tocar nada más no
    // le quita acceso a lo que ya tenía.
    if (modulo) {
      setFormData({ ...formData, permisos: [...current, clave] });
      return;
    }

    if (current.includes(clave)) {
      setFormData({ ...formData, permisos: current.filter((p: string) => p !== clave) });
    } else {
      setFormData({ ...formData, permisos: [...current, clave] });
    }
  };

  // Filter Data
  //
  // `estadoFiltro` separa activos de inactivos. Por defecto se ve sólo la gente
  // que puede operar: los usuarios desactivados —porque se limpiaron sus datos
  // de prueba pero su auditoría se conserva— siguen existiendo y se pueden
  // consultar, pero no ensucian el listado diario.
  const filteredUsuarios = usuarios.filter(u => {
    if (estadoFiltro === 'ACTIVOS' && u.estado === false) return false;
    if (estadoFiltro === 'INACTIVOS' && u.estado !== false) return false;
    return (
      (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.perfil_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.nombres || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.apellidos || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.nombreRazonSocial || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.nroDocumento || '').includes(searchQuery)
    );
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

      {/* Table Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <span className="font-semibold text-gray-700">
            {activeTab === 'usuarios' ? 'Usuarios registrados' : 'Perfiles registrados'}
          </span>
          {activeTab === 'usuarios' ? (
            <button onClick={() => handleOpenUsuario()} className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white">
              + Crear Usuario
            </button>
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
                    <tr key={u.username} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{u.username}</td>
                      <td className="px-4 py-3">
                          {esRuc(u.tipoDocumentoKey) ? u.nombreRazonSocial : `${u.nombres || ''} ${u.apellidos || ''}`.trim()}
                      </td>
                      <td className="px-4 py-3">{u.nroDocumento || '-'}</td>
                      <td className="px-4 py-3">{u.user_type}</td>
                      <td className="px-4 py-3">{u.perfil_id}</td>
                      <td className="px-4 py-3">
                        {u.perfil_id === 'SISTEMAS' ? (
                          <span className="text-xs font-semibold text-gray-500">Todas</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {u.sedes?.map((s: any) => (
                              <span key={s.key} className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 text-[10px] text-gray-600">{s.nombre}</span>
                            ))}
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
                            permisos: p.permisos || []
                          });
                          setShowModal(true);
                        }} title="Editar" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-base text-[#052A79] hover:bg-blue-100 transition-colors">
                          <Edit size={18} />
                        </button>
                        {p.clave !== 'SISTEMAS' && (
                          <button onClick={async () => {
                            if (confirm(`¿Eliminar perfil ${p.clave}?`)) {
                              try {
                                await faregasUsuariosApi.eliminarPerfil(p.clave);
                                cargarDatos();
                              } catch (e: any) {
                                alert(e.message || 'Error al eliminar');
                              }
                            }
                          }} title="Eliminar" className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-base text-[#052A79] hover:bg-red-100 transition-colors">
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
                    <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg shadow-sm border border-red-200 text-sm">
                    {error}
                    </div>
                )}
                <form id="main-form" onSubmit={activeTab === 'usuarios' ? handleSaveUsuario : async (e) => {
                e.preventDefault();
                try {
                    if (modalMode === 'crear') {
                    await faregasUsuariosApi.crearPerfil(formData);
                    } else {
                    await faregasUsuariosApi.actualizarPerfil(formData.clave, formData);
                    }
                    setShowModal(false);
                    cargarDatos();
                } catch (err: any) {
                    setError(err.message || 'Error al guardar perfil');
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
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Contraseña {modalMode === 'editar' && '(opcional)'}</label>
                                        <input type="password" ref={registrarRef('password')} className={claseInput('password')}
                                            aria-invalid={erroresCampo.password ? true : undefined}
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value, confirmPassword: e.target.value })} />
                                        {mensajeCampo('password')}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 capitalize mb-1">Confirmar Contraseña</label>
                                        <input type="password" ref={registrarRef('confirmPassword')} className={claseInput('confirmPassword')}
                                            aria-invalid={erroresCampo.confirmPassword ? true : undefined}
                                            value={formData.confirmPassword}
                                            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} />
                                        {mensajeCampo('confirmPassword')}
                                    </div>
                                </div>
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
                                    {formData.perfil_id === 'SISTEMAS' ? (
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
                                const isSistemas = formData.clave === 'SISTEMAS';
                                const marcados = formData.permisos || [];
                                const esSubmodulo = (clave: string) =>
                                    MODULOS_CON_SUBMODULOS.some((m) => m.hijos.includes(clave));
                                // Los submódulos no se listan sueltos: se anidan bajo su padre.
                                const lista = permisos.filter((p: any) => !esSubmodulo(p.clave));
                                const otros = lista.filter((p: any) =>
                                    !MODULOS_CON_SUBMODULOS.some((m) => m.padre === p.clave) && p.clave !== 'MENU_CONFIGURACION_TARIFAS');

                                const casilla = (p: any, hijo: boolean, padreActivo: boolean) => {
                                    const activo = isSistemas || marcados.includes(p.clave);
                                    const bloqueado = isSistemas || (hijo && !padreActivo);
                                    const clavePadre = MODULOS_CON_SUBMODULOS.find(
                                        (o) => o.hijos.includes(p.clave))?.padre;
                                    const etiquetaPadre = clavePadre === PERMISO_FACTURACION
                                        ? 'Facturación'
                                        : clavePadre === PERMISO_CONFIGURACION
                                            ? 'Configuración'
                                            : 'Inventario';
                                    return (
                                        <label key={p.clave}
                                            className={`flex items-center gap-2 text-sm p-2 rounded border ${hijo ? 'border-slate-200 bg-white' : 'bg-slate-50 border-slate-200'} ${bloqueado ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}
                                            title={hijo && !padreActivo && !isSistemas ? `Active primero ${etiquetaPadre}` : undefined}>
                                            <input type="checkbox"
                                                className="h-4 w-4 text-[#052a79]"
                                                checked={activo}
                                                onChange={() => !bloqueado && togglePermiso(p.clave)}
                                                disabled={bloqueado}
                                            />
                                            <span className={`font-medium ${hijo ? 'text-slate-600 text-xs' : 'text-slate-700'}`}>
                                                {NOMBRES_MENU_INVENTARIO[p.clave] || p.nombre}
                                            </span>
                                        </label>
                                    );
                                };

                                // Cada módulo con submódulos sale de la grilla y ocupa su
                                // propio bloque de ancho completo, para que sus hijos
                                // queden debajo y no se mezclen con otros módulos.
                                const bloqueModulo = (modulo: { padre: string; hijos: readonly string[] }) => {
                                    const padre = lista.find((p: any) => p.clave === modulo.padre);
                                    if (!padre) return null;
                                    const hijos = permisos.filter((p: any) => modulo.hijos.includes(p.clave));
                                    const padreActivo = isSistemas || marcados.includes(modulo.padre);
                                    return (
                                        <div key={modulo.padre} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {casilla(padre, false, padreActivo)}
                                            </div>
                                            {/* La línea vertical es la guía visual de la
                                                jerarquía: los hijos cuelgan del padre. */}
                                            <div className="mt-2 ml-3 space-y-1.5 border-l-2 border-slate-300 pl-3">
                                                {hijos.map((h: any) => casilla(h, true, padreActivo))}
                                            </div>
                                        </div>
                                    );
                                };

                                return (
                                    <div className="space-y-3">
                                        {MODULOS_CON_SUBMODULOS.map(bloqueModulo)}
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            {otros.map((p: any) => casilla(p, false, true))}
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
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 border border-slate-300 bg-white rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition-colors" disabled={saving}>Cancelar</button>
                <button type="submit" form="main-form" className="px-6 py-2 bg-[#052a79] text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors shadow-sm disabled:opacity-50" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
