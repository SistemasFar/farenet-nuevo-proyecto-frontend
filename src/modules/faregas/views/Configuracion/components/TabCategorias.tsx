import { Edit, Power, PowerOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  faregasConfigApi,
  type CategoriaServicio
} from '../../../services/faregas-config.api';
import { exportarExcel } from '../../../utils/exportar-excel';

const categoriaVacia = (): Partial<CategoriaServicio> => ({
  codigo: '',
  nombre: '',
  descripcion: '',
  orden: 0,
  activo: true
});

export default function TabCategorias() {
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [actual, setActual] = useState<Partial<CategoriaServicio>>(categoriaVacia());
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      setError('');
      setCategorias(await faregasConfigApi.obtenerCategorias());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void cargar(); }, []);

  const filtradas = useMemo(() => categorias.filter((categoria) => {
    const texto = search.trim().toLowerCase();
    const coincideTexto = !texto
      || categoria.codigo.toLowerCase().includes(texto)
      || categoria.nombre.toLowerCase().includes(texto)
      || (categoria.descripcion || '').toLowerCase().includes(texto);
    const coincideEstado = !estado || (estado === '1' ? categoria.activo : !categoria.activo);
    return coincideTexto && coincideEstado;
  }), [categorias, search, estado]);

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      if (mode === 'CREATE') await faregasConfigApi.crearCategoria(actual);
      else if (actual.id) await faregasConfigApi.editarCategoria(actual.id, actual);
      setShowModal(false);
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar categoría');
    } finally {
      setSaving(false);
    }
  };

  const cambiarEstado = async (categoria: CategoriaServicio) => {
    if (!confirm(`¿Seguro que deseas ${categoria.activo ? 'desactivar' : 'activar'} esta categoría?`)) return;
    try {
      await faregasConfigApi.cambiarEstadoCategoria(categoria.id, !categoria.activo);
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar el estado');
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 md:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por código, nombre o descripción..."
          className="flex-1 rounded-lg border border-slate-300 p-2 text-sm focus:border-[#052A79] focus:outline-none"
        />
        <select
          value={estado}
          onChange={(event) => setEstado(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm focus:border-[#052A79] focus:outline-none md:w-48"
        >
          <option value="">Estado: Todos</option>
          <option value="1">Activas</option>
          <option value="0">Inactivas</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
          <span className="font-semibold text-gray-700">Administración de Categorías</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || filtradas.length === 0}
              onClick={() => exportarExcel('faregas_categorias', 'Categorías', [
                { key: 'codigo', header: 'CÓDIGO', width: 24 },
                { key: 'nombre', header: 'NOMBRE', width: 28 },
                { key: 'descripcion', header: 'DESCRIPCIÓN', width: 60 },
                { key: 'orden', header: 'ORDEN', width: 12 },
                { key: 'estado', header: 'ESTADO', width: 14 }
              ], filtradas.map((categoria) => ({
                codigo: categoria.codigo,
                nombre: categoria.nombre,
                descripcion: categoria.descripcion || '',
                orden: categoria.orden,
                estado: categoria.activo ? 'ACTIVA' : 'INACTIVA'
              })))}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ↓ Exportar Excel
            </button>
            <button
              onClick={() => { setMode('CREATE'); setActual(categoriaVacia()); setShowModal(true); }}
              className="rounded-lg bg-[#052A79] px-4 py-2 text-sm font-semibold text-white"
            >
              + Nueva Categoría
            </button>
          </div>
        </div>

        {loading ? <div className="py-10 text-center">Cargando categorías...</div>
          : error ? <div className="py-10 text-center text-red-500">{error}</div>
          : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-white text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3 text-center">Orden</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtradas.map((categoria) => (
                    <tr key={categoria.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold text-gray-700">{categoria.codigo}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{categoria.nombre}</td>
                      <td className="px-4 py-3 text-gray-600">{categoria.descripcion || '-'}</td>
                      <td className="px-4 py-3 text-center">{categoria.orden}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${categoria.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {categoria.activo ? 'ACTIVA' : 'INACTIVA'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => { setMode('EDIT'); setActual(categoria); setShowModal(true); }}
                            title="Editar" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[#052A79] hover:bg-blue-100 transition-colors"><Edit size={18} /></button>
                          <button onClick={() => void cambiarEstado(categoria)} title={categoria.activo ? "Desactivar" : "Activar"} className={categoria.activo ? "rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[#052A79] hover:bg-red-100 transition-colors" : "rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-[#052A79] hover:bg-green-100 transition-colors"}>{categoria.activo ? <PowerOff size={18} /> : <Power size={18} />}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtradas.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-gray-500">No hay categorías que coincidan con los filtros.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-[#052A79]">{mode === 'CREATE' ? 'Nueva Categoría' : 'Editar Categoría'}</h3>
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Código</label>
                <input required maxLength={50} disabled={mode === 'EDIT'} value={actual.codigo || ''}
                  onChange={(event) => setActual({ ...actual, codigo: event.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full rounded-lg border p-2 uppercase disabled:bg-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Nombre</label>
                <input required maxLength={100} value={actual.nombre || ''}
                  onChange={(event) => setActual({ ...actual, nombre: event.target.value })}
                  className="w-full rounded-lg border p-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Descripción</label>
                <textarea rows={3} value={actual.descripcion || ''}
                  onChange={(event) => setActual({ ...actual, descripcion: event.target.value })}
                  className="w-full rounded-lg border p-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Orden</label>
                <input type="number" required value={actual.orden ?? 0}
                  onChange={(event) => setActual({ ...actual, orden: Number(event.target.value) })}
                  className="w-full rounded-lg border p-2" />
              </div>
              <div className="flex justify-end gap-3 border-t pt-4">
                <button type="button" disabled={saving} onClick={() => setShowModal(false)} className="rounded px-5 py-2 font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded bg-[#052A79] px-5 py-2 font-bold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
