import { useState, useEffect } from 'react';
import { faregasUsuariosApi } from '../../services/faregas-usuarios.api';

export function UsuariosView() {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'perfiles'>('usuarios');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [plantas, setPlantas] = useState<any[]>([]);
  const [permisos, setPermisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search and Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

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
      const [resUsuarios, resPerfiles, resPlantas, resPermisos] = await Promise.all([
        faregasUsuariosApi.obtenerUsuarios(),
        faregasUsuariosApi.obtenerPerfiles(),
        faregasUsuariosApi.obtenerPlantas(),
        faregasUsuariosApi.obtenerPermisos()
      ]);
      setUsuarios(resUsuarios);
      setPerfiles(resPerfiles);
      setPlantas(resPlantas);
      setPermisos(resPermisos);
    } catch (e: any) {
      setError(e.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleOpenUsuario = (usuario?: any) => {
    if (usuario) {
      setModalMode('editar');
      setSelectedUsername(usuario.username);
      setFormData({
        username: usuario.username,
        perfil_id: usuario.perfil_id,
        estado: usuario.estado,
        sedes: usuario.sedes ? usuario.sedes.map((s:any) => s.key) : [],
        password: '',
        confirmPassword: ''
      });
    } else {
      setModalMode('crear');
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        perfil_id: perfiles.length > 0 ? perfiles[0].clave : '',
        sedes: [],
        estado: true
      });
    }
    setShowModal(true);
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
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    try {
      if (modalMode === 'crear') {
        if (!formData.password) {
          setError('Contraseña requerida');
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
      setError(e.message || 'Error al guardar');
    }
  };

  const toggleSede = (key: string) => {
    const current = formData.sedes || [];
    if (current.includes(key)) {
      setFormData({ ...formData, sedes: current.filter((s:string) => s !== key) });
    } else {
      setFormData({ ...formData, sedes: [...current, key] });
    }
  };

  const togglePermiso = (clave: string) => {
    const current = formData.permisos || [];
    if (current.includes(clave)) {
      setFormData({ ...formData, permisos: current.filter((p:string) => p !== clave) });
    } else {
      setFormData({ ...formData, permisos: [...current, clave] });
    }
  };

  // Filter Data
  const filteredUsuarios = usuarios.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.perfil_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPerfiles = perfiles.filter(p => 
    p.clave.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeData = activeTab === 'usuarios' ? filteredUsuarios : filteredPerfiles;
  const totalRegistros = activeData.length;
  const totalPages = Math.ceil(totalRegistros / limit) || 1;
  
  // Ensure page is within bounds after filtering
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedData = activeData.slice((page - 1) * limit, page * limit);
  const mostrandoInicio = totalRegistros === 0 ? 0 : (page - 1) * limit + 1;
  const mostrandoFin = Math.min(page * limit, totalRegistros);

  return (
    <div className="flex flex-col h-full gap-4 w-full pb-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-xl font-bold text-[#052a79]">Administración de Usuarios FAREGAS</h1>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => { setActiveTab('usuarios'); setPage(1); setSearchQuery(''); }}
            className={`px-4 py-1.5 rounded-md font-semibold text-xs uppercase tracking-wider transition-colors ${activeTab === 'usuarios' ? 'bg-white shadow-sm text-blue-800' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            USUARIOS
          </button>
          <button
            onClick={() => { setActiveTab('perfiles'); setPage(1); setSearchQuery(''); }}
            className={`px-4 py-1.5 rounded-md font-semibold text-xs uppercase tracking-wider transition-colors ${activeTab === 'perfiles' ? 'bg-white shadow-sm text-blue-800' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            PERFILES
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl shadow-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200">
        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Buscar</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder={activeTab === 'usuarios' ? "Buscar por usuario o perfil..." : "Buscar por clave o nombre..."} 
            className="flex-1 border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-[#052a79]"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
          <button className="bg-[#052a79] text-white px-8 py-2 rounded font-semibold text-sm hover:bg-blue-900 transition-colors shadow-sm">
            Buscar
          </button>
          <button 
            onClick={() => { setSearchQuery(''); setPage(1); }} 
            className="bg-slate-100 text-slate-600 px-8 py-2 rounded font-semibold text-sm border border-slate-200 hover:bg-slate-200 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Total Registros</span>
          <span className="text-xl font-bold text-slate-800">{totalRegistros}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Página Actual</span>
          <span className="text-xl font-bold text-slate-800">{page} / {totalPages}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Mostrando</span>
          <span className="text-xl font-bold text-slate-800">{mostrandoInicio}-{mostrandoFin}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Registros por página</span>
          <select 
            className="border border-slate-300 rounded p-1 text-sm focus:outline-none font-semibold text-slate-700 bg-white"
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex justify-end">
        {activeTab === 'usuarios' && (
            <button onClick={() => handleOpenUsuario()} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-semibold hover:bg-blue-700 shadow-sm">
              + Crear Usuario
            </button>
        )}
        {activeTab === 'perfiles' && (
            <button onClick={() => {
                setModalMode('crear');
                setFormData({ clave: '', nombre: '', visible: true, sedes: [], permisos: [] });
                setShowModal(true);
            }} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-semibold hover:bg-blue-700 shadow-sm">
              + Crear Perfil
            </button>
        )}
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">

        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-32 text-slate-500">Cargando...</div>
          ) : (
            <table className="w-full text-left min-w-[800px] border-collapse">
              <thead className="bg-[#003399] text-white font-bold text-[10px] uppercase tracking-wider">
                {activeTab === 'usuarios' ? (
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap rounded-tl-xl">Usuario</th>
                    <th className="px-4 py-3 whitespace-nowrap">Perfil</th>
                    <th className="px-4 py-3 whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3">Sedes</th>
                    <th className="px-4 py-3 whitespace-nowrap rounded-tr-xl">Acción</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap rounded-tl-xl">Clave</th>
                    <th className="px-4 py-3 whitespace-nowrap">Nombre</th>
                    <th className="px-4 py-3 whitespace-nowrap">Visible</th>
                    <th className="px-4 py-3 whitespace-nowrap">Usuarios Asignados</th>
                    <th className="px-4 py-3 whitespace-nowrap rounded-tr-xl">Acción</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">No hay registros para mostrar.</td>
                  </tr>
                ) : activeTab === 'usuarios' ? (
                  paginatedData.map((u: any) => (
                    <tr key={u.username} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{u.username}</td>
                      <td className="px-4 py-3">{u.perfil_id}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.estado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.estado ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.perfil_id === 'SISTEMAS' ? (
                          <span className="text-[10px] font-bold text-slate-500">TODAS LAS SEDES</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.sedes?.map((s:any) => (
                              <span key={s.key} className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-600">{s.nombre}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 flex gap-4">
                        <button onClick={() => handleOpenUsuario(u)} className="text-[#052a79] font-bold hover:underline">
                          Editar
                        </button>
                        {u.username !== currentUsername && (
                          <button onClick={() => handleDeleteUsuario(u.username)} className="text-red-600 font-bold hover:underline">
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  paginatedData.map((p: any) => (
                    <tr key={p.clave} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.clave}</td>
                      <td className="px-4 py-3">{p.nombre}</td>
                      <td className="px-4 py-3">{p.visible ? 'Sí' : 'No'}</td>
                      <td className="px-4 py-3">{p.num_usuarios}</td>
                      <td className="px-4 py-3 flex gap-4">
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
                        }} className="text-[#052a79] font-bold hover:underline">
                          Editar
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
                          }} className="text-red-600 font-bold hover:underline">
                            Eliminar
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
        <div className="bg-white p-3 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
          <span>Mostrando {mostrandoInicio} a {mostrandoFin} de {totalRegistros} registros.</span>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 border border-slate-200 rounded font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="font-medium text-slate-600">Página {page} de {totalPages}</span>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border border-slate-200 rounded font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modals remain the same... */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
            <h2 className="text-xl font-bold mb-4 text-[#052a79]">
              {activeTab === 'usuarios' 
                ? (modalMode === 'crear' ? 'Crear Usuario' : 'Editar Usuario')
                : (modalMode === 'crear' ? 'Crear Perfil' : 'Editar Perfil')
              }
            </h2>
            <form onSubmit={activeTab === 'usuarios' ? handleSaveUsuario : async (e) => {
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
            }} className="space-y-4">
              {activeTab === 'usuarios' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Username</label>
                  <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" required
                    value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={modalMode === 'editar'} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Perfil</label>
                  <select className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none bg-white" required
                    value={formData.perfil_id} onChange={e => handlePerfilUsuarioChange(e.target.value)}>
                    {perfiles.map(p => <option key={p.clave} value={p.clave}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nueva Contraseña {modalMode==='editar' && '(opcional)'}</label>
                  <input type="password" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" 
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Confirmar Contraseña</label>
                  <input type="password" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" 
                    value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="estadoCheck" className="h-4 w-4 text-[#052a79]"
                  disabled={modalMode === 'editar' && formData.username === currentUsername}
                  checked={formData.estado} onChange={e => setFormData({...formData, estado: e.target.checked})} />
                <label htmlFor="estadoCheck" className={`text-sm font-semibold ${modalMode === 'editar' && formData.username === currentUsername ? 'text-slate-400' : 'text-slate-700'}`}>Usuario Activo</label>
              </div>

              <div className="border-t pt-4">
                {formData.perfil_id === 'SISTEMAS' ? (
                  <>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Sedes Disponibles</label>
                    <div className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded p-3">
                        TODAS LAS SEDES
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {plantas.filter(p => (perfiles.find(pf => pf.clave === formData.perfil_id)?.sedes || []).includes(p.key)).map(p => (
                        <label key={p.key} className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-100">
                          <input type="checkbox" 
                            className="h-4 w-4 text-[#052a79]"
                            checked={(formData.sedes || []).includes(p.key)}
                            onChange={() => toggleSede(p.key)}
                          />
                          <span className="font-medium text-slate-700">{p.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
              </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Clave</label>
                      <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" required disabled={modalMode === 'editar'}
                        value={formData.clave || ''} onChange={e => setFormData({...formData, clave: e.target.value.toUpperCase()})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre</label>
                      <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm focus:border-[#052a79] focus:outline-none" required
                        value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="visibleCheck" className="h-4 w-4 text-[#052a79]"
                      checked={formData.visible} onChange={e => setFormData({...formData, visible: e.target.checked})} />
                    <label htmlFor="visibleCheck" className="text-sm font-semibold text-slate-700">Perfil Visible</label>
                  </div>
                  
                  <div className="border-t pt-4 mt-4">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Sedes Disponibles</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {plantas.map(p => (
                        <label key={p.key} className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-100">
                          <input type="checkbox" 
                            className="h-4 w-4 text-[#052a79]"
                            checked={(formData.sedes || []).includes(p.key)}
                            onChange={() => toggleSede(p.key)}
                          />
                          <span className="font-medium text-slate-700">{p.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Módulos / Menú</label>
                    <div className="grid grid-cols-2 gap-2">
                      {permisos.map(p => (
                        <label key={p.clave} className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-100">
                          <input type="checkbox" 
                            className="h-4 w-4 text-[#052a79]"
                            checked={(formData.permisos || []).includes(p.clave)}
                            onChange={() => togglePermiso(p.clave)}
                          />
                          <span className="font-medium text-slate-700">{p.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 border border-slate-300 rounded font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-[#052a79] text-white rounded font-semibold hover:bg-blue-900 transition-colors shadow-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
