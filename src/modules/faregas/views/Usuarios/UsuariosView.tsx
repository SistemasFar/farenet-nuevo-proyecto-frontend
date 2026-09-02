import { useState, useEffect } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { faregasUsuariosApi } from '../../services/faregas-usuarios.api';
import type { MaestroUsuario } from '../../types/faregas-api';

export function UsuariosView() {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'perfiles'>('usuarios');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [plantas, setPlantas] = useState<any[]>([]);
  const [permisos, setPermisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
        user_type: usuario.user_type || 'USER',
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
        user_type: 'USER',
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
        telefono: '',
        personaContacto: ''
      });
    }
    setShowModal(true);
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

    // Validaciones
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    // Validar longitudes
    if (formData.nroDocumento) {
        if (formData.tipoDocumentoKey === '01' && formData.nroDocumento.length !== 8) { // DNI
            setError('El DNI debe tener exactamente 8 dígitos.');
            return;
        }
        if (formData.tipoDocumentoKey === '06' && formData.nroDocumento.length !== 11) { // RUC
            setError('El RUC debe tener exactamente 11 dígitos.');
            return;
        }
    }

    setSaving(true);
    try {
      if (modalMode === 'crear') {
        if (!formData.password) {
          setError('Contraseña requerida');
          setSaving(false);
          return;
        }
        await faregasUsuariosApi.crearUsuario(formData);
      } else {
        await faregasUsuariosApi.actualizarUsuario(selectedUsername, formData);
        if (formData.password) {
          await faregasUsuariosApi.cambiarPassword(formData.username, formData.password);
        }
      }
      setShowModal(false);
      cargarDatos();
    } catch (e: any) {
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

  const togglePermiso = (clave: string) => {
    const current = formData.permisos || [];
    if (current.includes(clave)) {
      setFormData({ ...formData, permisos: current.filter((p: string) => p !== clave) });
    } else {
      setFormData({ ...formData, permisos: [...current, clave] });
    }
  };

  // Filter Data
  const filteredUsuarios = usuarios.filter(u =>
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.perfil_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.nombres || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.apellidos || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.nombreRazonSocial || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.nroDocumento || '').includes(searchQuery)
  );

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
          <div className="flex gap-2 md:col-span-2">
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
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
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
                          {u.tipoDocumentoKey === '06' ? u.nombreRazonSocial : `${u.nombres || ''} ${u.apellidos || ''}`.trim()}
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
                }} className="space-y-6">
                
                {activeTab === 'usuarios' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* COLUMNA IZQUIERDA */}
                        <div className="space-y-6">
                            {/* SECCIÓN CUENTA */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h3 className="font-bold text-slate-700 mb-3 border-b pb-2">Cuenta</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Username <span className="text-red-500">*</span></label>
                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" required
                                            value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} disabled={modalMode === 'editar'} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo de Usuario <span className="text-red-500">*</span></label>
                                        <select className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none bg-white" required
                                            value={formData.user_type} onChange={e => setFormData({ ...formData, user_type: e.target.value })}>
                                            <option value="USER">Normal (USER)</option>
                                            <option value="EJECUTIVO">Comercial (EJECUTIVO)</option>
                                            <option value="FAREGAS">Faregas Histórico</option>
                                            <option value="LOCAL">Local Histórico</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN IDENTIDAD */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h3 className="font-bold text-slate-700 mb-3 border-b pb-2">Identidad</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo de Documento <span className="text-red-500">*</span></label>
                                        <select className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none bg-white" required
                                            value={formData.tipoDocumentoKey} onChange={e => setFormData({ ...formData, tipoDocumentoKey: e.target.value })}>
                                            <option value="">Seleccione...</option>
                                            {tiposDocumento.map(t => <option key={t.key} value={t.key}>{t.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nro Documento <span className="text-red-500">*</span></label>
                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" required
                                            value={formData.nroDocumento} onChange={e => setFormData({ ...formData, nroDocumento: e.target.value })} />
                                    </div>
                                </div>

                                {formData.tipoDocumentoKey !== '06' ? (
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombres <span className="text-red-500">*</span></label>
                                            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" required
                                                value={formData.nombres} onChange={e => setFormData({ ...formData, nombres: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Apellidos <span className="text-red-500">*</span></label>
                                            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" required
                                                value={formData.apellidos} onChange={e => setFormData({ ...formData, apellidos: e.target.value })} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Razón Social <span className="text-red-500">*</span></label>
                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" required
                                            value={formData.nombreRazonSocial} onChange={e => setFormData({ ...formData, nombreRazonSocial: e.target.value })} />
                                    </div>
                                )}
                            </div>

                            {/* SECCIÓN SEGURIDAD */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h3 className="font-bold text-slate-700 mb-3 border-b pb-2">Seguridad</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contraseña {modalMode === 'editar' && '(opcional)'}</label>
                                        <input type="password" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none"
                                            value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Confirmar Contraseña</label>
                                        <input type="password" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none"
                                            value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} />
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
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h3 className="font-bold text-slate-700 mb-3 border-b pb-2">Ubicación y Contacto</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">País <span className="text-red-500">*</span></label>
                                        <select className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none bg-white" required
                                            value={formData.paisKey} onChange={e => handlePaisChange(e.target.value)}>
                                            <option value="">Seleccione...</option>
                                            {paises.map(p => <option key={p.key} value={p.key}>{p.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Departamento <span className="text-red-500">*</span></label>
                                        <select className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none bg-white" required
                                            value={formData.departamentoKey} onChange={e => handleDepartamentoChange(e.target.value)} disabled={!formData.paisKey}>
                                            <option value="">Seleccione...</option>
                                            {departamentos.map(d => <option key={d.key} value={d.key}>{d.nombre}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Provincia <span className="text-red-500">*</span></label>
                                        <select className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none bg-white" required
                                            value={formData.provinciaKey} onChange={e => handleProvinciaChange(e.target.value)} disabled={!formData.departamentoKey}>
                                            <option value="">Seleccione...</option>
                                            {provincias.map(p => <option key={p.key} value={p.key}>{p.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Distrito <span className="text-red-500">*</span></label>
                                        <select className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none bg-white" required
                                            value={formData.distritoKey} onChange={e => setFormData({ ...formData, distritoKey: e.target.value })} disabled={!formData.provinciaKey}>
                                            <option value="">Seleccione...</option>
                                            {distritos.map(d => <option key={d.key} value={d.key}>{d.nombre}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Dirección <span className="text-red-500">*</span></label>
                                    <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" required
                                        value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Teléfono <span className="text-red-500">*</span></label>
                                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" required
                                            value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email</label>
                                        <input type="email" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none"
                                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Persona de Contacto {formData.tipoDocumentoKey === '06' && <span className="text-red-500">*</span>}</label>
                                    <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none"
                                        required={formData.tipoDocumentoKey === '06'}
                                        value={formData.personaContacto} onChange={e => setFormData({ ...formData, personaContacto: e.target.value })} />
                                </div>
                            </div>

                            {/* SECCIÓN PERFIL Y SEDES */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <h3 className="font-bold text-slate-700 mb-3 border-b pb-2">Perfil y Sedes</h3>
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Perfil <span className="text-red-500">*</span></label>
                                    <select className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none bg-white" required
                                        value={formData.perfil_id} onChange={e => handlePerfilUsuarioChange(e.target.value)}>
                                        {perfiles.map(p => <option key={p.clave} value={p.clave}>{p.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    {formData.perfil_id === 'SISTEMAS' ? (
                                    <>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Sedes Asignadas</label>
                                        <div className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded p-3 text-center">
                                        ACCESO A TODAS LAS SEDES
                                        </div>
                                    </>
                                    ) : (
                                    <>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Sedes Disponibles para este Perfil</label>
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
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Clave</label>
                            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" required disabled={modalMode === 'editar'}
                                value={formData.clave || ''} onChange={e => setFormData({ ...formData, clave: e.target.value.toUpperCase() })} />
                            </div>
                            <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre</label>
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
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Sedes Disponibles</label>
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
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Módulos / Menú</label>
                            <div className="grid grid-cols-2 gap-2">
                            {permisos.map(p => {
                                const isSistemas = formData.clave === 'SISTEMAS';
                                const isChecked = isSistemas || (formData.permisos || []).includes(p.clave);
                                
                                return (
                                <label key={p.clave} className={`flex items-center gap-2 text-sm bg-slate-50 p-2 rounded border border-slate-200 ${isSistemas ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}>
                                    <input type="checkbox"
                                    className="h-4 w-4 text-[#052a79]"
                                    checked={isChecked}
                                    onChange={() => !isSistemas && togglePermiso(p.clave)}
                                    disabled={isSistemas}
                                    />
                                    <span className="font-medium text-slate-700">{p.nombre}</span>
                                </label>
                                );
                            })}
                            </div>
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
