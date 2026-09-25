import Swal from 'sweetalert2';
import { Edit, Power, PowerOff, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  faregasConfigApi,
  type CategoriaServicio,
  type ImpactoCategoria
} from '../../../services/faregas-config.api';
import { exportarExcel } from '../../../utils/exportar-excel';

const categoriaVacia = (): Partial<CategoriaServicio> => ({
  codigo: '',
  nombre: '',
  descripcion: '',
  orden: 0,
  activo: true
});

const escaparHtml = (value: string) => value.replace(/[&<>'"]/g, (caracter) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[caracter] || caracter));

const listaImpacto = (items: string[], vacio: string) => items.length > 0
  ? `<ul class="text-left text-xs leading-5">${items.map((item) => `<li>• ${escaparHtml(item)}</li>`).join('')}</ul>`
  : `<p class="text-left text-xs text-slate-500">${escaparHtml(vacio)}</p>`;

const tieneFacturaProtegida = (impacto: ImpactoCategoria) => impacto.facturacionesProtegidas.length > 0;

// El veredicto de bloqueo lo decide el backend (integrations.config). El
// frontend sólo lo refleja: nunca habilita ni deshabilita la limpieza.
const bloqueosImpacto = (impacto: ImpactoCategoria) => {
  const bloqueos: string[] = [];
  if (impacto.operacionesBloqueadas.length > 0) {
    bloqueos.push('Hay operaciones de prueba que comparten servicios o productos fiscales con otras categorías.');
  }
  if (impacto.facturacionesBloqueantes.length > 0) {
    bloqueos.push(
      impacto.ambiente === 'PRODUCCION'
        ? 'El ambiente es PRODUCCION: los comprobantes fiscales reales no se pueden eliminar.'
        : 'Existen comprobantes marcados como PRODUCCION que no se pueden eliminar.'
    );
  }
  return bloqueos;
};

const limpiaPruebaEnUI = (impacto: ImpactoCategoria) => (
  bloqueosImpacto(impacto).length === 0 && tieneFacturaProtegida(impacto)
);

const renderImpactoCategoria = (impacto: ImpactoCategoria) => {
  const servicios = impacto.servicios.map((servicio) => `#${servicio.id} · ${servicio.codigo} — ${servicio.nombre}${servicio.activo ? '' : ' (inactivo)'}`);
  const tarifas = impacto.tarifas.map((tarifa) => `#${tarifa.id} · ${tarifa.codigo} · sede ${tarifa.planta_key}`);
  const reglas = impacto.reglasConfiguracion.map((regla) => `#${regla.id} · servicio ${regla.servicio_id} · sede ${regla.planta_key} · ${regla.tipo_calculo}`);
  const formatos = impacto.formatos.map((formato) => `#${formato.id} · ${formato.codigo} — ${formato.nombre} · ${formato.servicios_que_lo_usan} servicio(s) lo usan · se conserva`);
  const operaciones = impacto.operaciones.map((operacion) => `#${operacion.id} · ${operacion.estado || 'sin estado'} · ${operacion.total_detalles} detalle(s)`);
  const certificados = impacto.certificados.map((certificado) => `#${certificado.id} · ${certificado.numero_certificado || 'sin número'} · ${certificado.estado || 'sin estado'} · ${impacto.certificadosAEliminar.includes(certificado.id) ? 'se elimina' : 'se conserva'}`);
  const bloqueadas = impacto.operacionesBloqueadas.map((operacion) => `#${operacion.operacion_id} · ${operacion.motivo === 'SERVICIO_DE_OTRA_CATEGORIA' ? 'contiene servicios de otra categoría' : 'contiene productos fiscales compartidos'}`);
  const productos = impacto.productos.map((producto) => `#${producto.id} · ${producto.codigo_sku} — ${producto.descripcion}`);
  const facturas = impacto.facturaciones.map((factura) => `#${factura.id} · ${factura.nro_comprobante || 'sin comprobante'} · ${factura.estado || 'sin estado'} · ${factura.entorno_facturador || 'sin entorno'}`);
  const ordenes = impacto.ordenesPago.map((orden) => `#${orden.id} · ${orden.estado || 'sin estado'}`);
  const pagos = impacto.pagos.map((pago) => `#${pago.id}`);
  const bloqueos = bloqueosImpacto(impacto);
  const bloqueado = bloqueos.length > 0;
  const limpiaPrueba = !bloqueado && tieneFacturaProtegida(impacto);

  return `<div class="space-y-3 text-left">
    ${limpiaPrueba
      ? `<p class="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">ELIMINAR DATOS DE PRUEBA (ambiente ${escaparHtml(impacto.ambiente)})<br/>Esta categoría contiene ${impacto.servicios.length} servicio(s), ${impacto.reglasConfiguracion.length} regla(s), ${impacto.tarifas.length} tarifa(s), ${impacto.operaciones.length} operación(es), ${impacto.certificados.length} certificado(s), ${impacto.facturaciones.length} facturación(es), ${impacto.intentosFacturacion.length} intento(s), ${impacto.ordenesPago.length} orden(es) de pago y ${impacto.pagos.length} pago(s).</p>`
      : impacto.requiereConfirmacion
      ? '<p class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">Esta categoría tiene servicios vinculados y será eliminada junto con sus tarifas, reglas por sede, mappings e historial de prueba. Los productos fiscales se conservarán.</p>'
      : '<p class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">La categoría se eliminará. Los productos fiscales vinculados sólo perderán su clasificación.</p>'}
    ${limpiaPrueba
      ? '<p class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">También se eliminarán esos registros LOCALES de prueba. Los correlativos de certificado y las series NO retrocederán. No se llamará a Nubefact ni a SUNAT. Esta acción no se puede deshacer.</p>'
      : ''}
    ${bloqueado
      ? `<p class="rounded-lg border border-red-300 bg-red-100 p-3 text-xs font-bold text-red-900">No se puede eliminar: ${escaparHtml(bloqueos.join(' '))} No se eliminó nada. Operaciones en conflicto: ${escaparHtml(bloqueadas.join(', ') || 'ver facturaciones')}</p>`
      : ''}
    <div><p class="mb-1 text-sm font-bold">Servicios (${servicios.length})</p>${listaImpacto(servicios, 'Sin servicios.')}</div>
    <div><p class="mb-1 text-sm font-bold">Reglas comerciales por sede (${reglas.length})</p>${listaImpacto(reglas, 'Sin reglas dependientes.')}</div>
    <div><p class="mb-1 text-sm font-bold">Tarifas y mappings por sede (${tarifas.length})</p>${listaImpacto(tarifas, 'Sin tarifas.')}</div>
    <div><p class="mb-1 text-sm font-bold">Formatos (${formatos.length}, se conservan)</p>${listaImpacto(formatos, 'Sin formatos vinculados.')}</div>
    <div><p class="mb-1 text-sm font-bold">Operaciones de prueba (${operaciones.length})</p>${listaImpacto(operaciones, 'Sin operaciones históricas.')}</div>
    <div><p class="mb-1 text-sm font-bold">Certificados (${certificados.length})</p>${listaImpacto(certificados, 'Sin certificados.')}</div>
    <div><p class="mb-1 text-sm font-bold">Facturaciones (${facturas.length})</p>${listaImpacto(facturas, 'Sin facturaciones.')}</div>
    <div><p class="mb-1 text-sm font-bold">Intentos de facturación (${impacto.intentosFacturacion.length})</p>${listaImpacto(impacto.intentosFacturacion.map((intento) => `#${intento.id} · comprobante ${intento.facturacion_id} · intento ${intento.numero_intento} · ${intento.estado || 'sin estado'}`), 'Sin intentos registrados.')}</div>
    <div><p class="mb-1 text-sm font-bold">Órdenes de pago (${ordenes.length})</p>${listaImpacto(ordenes, 'Sin órdenes de pago.')}</div>
    <div><p class="mb-1 text-sm font-bold">Pagos (${pagos.length})</p>${listaImpacto(pagos, 'Sin pagos.')}</div>
    <div><p class="mb-1 text-sm font-bold">Productos que se conservarán (${productos.length})</p>${listaImpacto(productos, 'Sin productos vinculados.')}</div>
    <p class="text-xs text-slate-500">No se modificarán correlativos, series fiscales ni Nubefact.</p>
  </div>`;
};

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
  const [eliminando, setEliminando] = useState<number | null>(null);

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

  const eliminarCategoria = async (categoria: CategoriaServicio) => {
    setEliminando(categoria.id);
    try {
      const impacto = await faregasConfigApi.obtenerImpactoCategoria(categoria.id);
      const bloqueos = bloqueosImpacto(impacto);
      const confirmacion = await Swal.fire({
        title: bloqueos.length > 0
          ? 'ELIMINACIÓN BLOQUEADA'
          : limpiaPruebaEnUI(impacto)
            ? 'ELIMINAR DATOS DE PRUEBA'
            : impacto.requiereConfirmacion ? 'ELIMINAR CATEGORÍA' : 'Eliminar categoría',
        html: renderImpactoCategoria(impacto),
        icon: bloqueos.length > 0 ? 'error' : limpiaPruebaEnUI(impacto) ? 'warning' : impacto.requiereConfirmacion ? 'warning' : 'question',
        showCancelButton: bloqueos.length === 0,
        showConfirmButton: true,
        confirmButtonText: bloqueos.length > 0
          ? 'ENTENDIDO'
          : limpiaPruebaEnUI(impacto)
            ? 'ELIMINAR TODO'
            : impacto.requiereConfirmacion ? 'ELIMINAR TODO' : 'ELIMINAR',
        cancelButtonText: 'CANCELAR',
        confirmButtonColor: bloqueos.length > 0 ? '#64748b' : '#dc2626',
        cancelButtonColor: '#64748b',
        reverseButtons: true,
        focusCancel: true,
        width: '46rem'
      });
      if (bloqueos.length > 0) return;
      if (!confirmacion.isConfirmed) return;

      const resultado = await faregasConfigApi.eliminarCategoria(categoria.id, {
        confirmarTodo: impacto.requiereConfirmacion
      });
      await cargar();
      window.dispatchEvent(new CustomEvent('faregas-categoria-eliminada', {
        detail: { productosDesvinculados: resultado.productosDesvinculados }
      }));
      const partes = [`La categoría "${categoria.nombre}" fue eliminada.`];
      if (resultado.serviciosEliminados > 0) {
        partes.push(`${resultado.serviciosEliminados} servicio(s), ${resultado.tarifasEliminadas} tarifa(s), ${resultado.reglasEliminadas} regla(s), ${resultado.operacionesEliminadas} operación(es) y ${resultado.certificadosEliminados} certificado(s) de prueba se eliminaron.`);
      }
      if (resultado.comprobantesLocalesEliminados > 0) {
        partes.push(`${resultado.comprobantesLocalesEliminados} comprobante(s) fiscal(es) local(es) de prueba se eliminaron. No se llamó a Nubefact ni a SUNAT y los correlativos no retroceden.`);
      }
      if (resultado.productosDesvinculados > 0) {
        partes.push(`${resultado.productosDesvinculados} producto(s) fiscales se conservaron y quedaron SIN CATEGORÍA.`);
      }
      await Swal.fire({
        title: 'Categoría eliminada',
        text: partes.join(' '),
        icon: 'success',
        confirmButtonText: 'OK'
      });
    } catch (err) {
      await Swal.fire({
        title: 'No se pudo eliminar',
        text: err instanceof Error ? err.message : 'No se eliminó nada.',
        icon: 'error',
        confirmButtonText: 'CERRAR'
      });
    } finally {
      setEliminando(null);
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
                <thead className="border-b border-gray-200 bg-white text-xs capitalize text-gray-500">
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
                           <button onClick={() => void eliminarCategoria(categoria)} disabled={eliminando === categoria.id} title="Eliminar" className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-red-600 transition-colors hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"><Trash2 size={18} /></button>
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
                  className="w-full rounded-lg border p-2 capitalize disabled:bg-slate-100" />
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
