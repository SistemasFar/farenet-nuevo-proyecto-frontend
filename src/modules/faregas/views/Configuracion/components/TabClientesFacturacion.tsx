import { useEffect, useState } from 'react';
import { Download, Loader2, Mail, MapPin, Phone, Users } from 'lucide-react';
import Swal from 'sweetalert2';
import {
  faregasClientesApi,
  type ClienteFacturacionListado,
  type FiltrosClientesFacturacion,
} from '../../../services/faregas-clientes.api';
import { exportarExcel } from '../../../utils/exportar-excel';
import { Paginacion } from '../../components/Paginacion';

const fechaLocal = (value: string | null) => value
  ? new Date(value).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
  : 'Sin atenciones';

const textoOGuion = (value: string | null) => value || '—';

export default function TabClientesFacturacion() {
  const [filtros, setFiltros] = useState<FiltrosClientesFacturacion>({ pagina: 1, limite: 20, estado: '' });
  const [clientes, setClientes] = useState<ClienteFacturacionListado[]>([]);
  const [resumen, setResumen] = useState({ items: 0, total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);

  const cargar = async (siguientes: FiltrosClientesFacturacion = filtros) => {
    setLoading(true);
    try {
      const response = await faregasClientesApi.listar(siguientes);
      const data = response.data;
      setClientes(data.clientes);
      setResumen({
        items: data.clientes.length,
        total: Number(data.total || 0),
        page: Number(data.page ?? data.pagina ?? 1),
        limit: Number(data.limit ?? data.limite ?? 20),
        totalPages: Number(data.totalPages || 0),
      });
    } catch (error: unknown) {
      await Swal.fire('Clientes', error instanceof Error ? error.message : 'No se pudo cargar el listado de clientes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // La carga inicial sincroniza este componente con el endpoint externo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar({ pagina: 1, limite: 20, estado: '' });
    // La carga inicial debe ejecutarse una sola vez; los filtros se aplican con
    // Buscar o con la paginación para no consultar por cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buscar = () => {
    const siguientes = { ...filtros, pagina: 1 };
    setFiltros(siguientes);
    void cargar(siguientes);
  };

  const limpiar = () => {
    const siguientes: FiltrosClientesFacturacion = { pagina: 1, limite: filtros.limite ?? 20, estado: '' };
    setFiltros(siguientes);
    void cargar(siguientes);
  };

  const exportarClientes = async () => {
    setExportando(true);
    try {
      const todos: ClienteFacturacionListado[] = [];
      let pagina = 1;
      let totalPaginas = 1;

      do {
        const response = await faregasClientesApi.listar({
          texto: filtros.texto?.trim() || undefined,
          estado: filtros.estado || undefined,
          pagina,
          limite: 100,
        });
        todos.push(...response.data.clientes);
        totalPaginas = Number(response.data.totalPages || 0);
        pagina += 1;
      } while (pagina <= totalPaginas);

      if (todos.length === 0) {
        await Swal.fire('Clientes', 'No hay clientes para exportar con los filtros seleccionados.', 'info');
        return;
      }

      exportarExcel(
        'clientes_faregas',
        'Clientes FAREGAS',
        [
          { key: 'nombre', header: 'CLIENTE / RAZÓN SOCIAL', width: 38 },
          { key: 'tipoDocumento', header: 'TIPO DE DOCUMENTO', width: 20 },
          { key: 'numeroDocumento', header: 'NÚMERO DE DOCUMENTO', width: 22, format: 'text' },
          { key: 'telefono', header: 'TELÉFONO', width: 18, format: 'text' },
          { key: 'correo', header: 'CORREO ELECTRÓNICO', width: 34 },
          { key: 'direccion', header: 'DIRECCIÓN', width: 48 },
          { key: 'estado', header: 'ESTADO', width: 14 },
          { key: 'certificados', header: 'CERTIFICADOS', width: 16 },
          { key: 'comprobantes', header: 'COMPROBANTES', width: 17 },
          { key: 'ultimaSede', header: 'ÚLTIMA SEDE', width: 24 },
          { key: 'ultimaPlaca', header: 'ÚLTIMA PLACA', width: 17 },
          { key: 'ultimaAtencion', header: 'ÚLTIMA ATENCIÓN', width: 22 },
          { key: 'origen', header: 'ORIGEN DEL REGISTRO', width: 25 },
        ],
        todos.map((cliente) => ({
          nombre: cliente.nombreRazonSocial,
          tipoDocumento: cliente.tipoDocumento,
          numeroDocumento: cliente.nroDocumento,
          telefono: cliente.telefono || '',
          correo: cliente.correo || '',
          direccion: cliente.direccion || '',
          estado: cliente.estado ? 'ACTIVO' : 'INACTIVO',
          certificados: cliente.totalCertificados,
          comprobantes: cliente.totalComprobantes,
          ultimaSede: cliente.ultimaPlantaNombre || '',
          ultimaPlaca: cliente.ultimaPlaca || '',
          ultimaAtencion: cliente.ultimaAtencion ? fechaLocal(cliente.ultimaAtencion) : '',
          origen: cliente.origen === 'MAESTRO' ? 'MAESTRO DE CLIENTES' : 'FACTURACIÓN HISTÓRICA',
        }))
      );
    } catch (error: unknown) {
      await Swal.fire('Clientes', error instanceof Error ? error.message : 'No se pudo exportar el directorio de clientes.', 'error');
    } finally {
      setExportando(false);
    }
  };

  const contacto = (cliente: ClienteFacturacionListado) => (
    <div className="space-y-1 text-xs">
      <div className="flex items-center gap-1.5 text-slate-700"><Phone className="h-3.5 w-3.5 text-slate-400" />{textoOGuion(cliente.telefono)}</div>
      <div className="flex items-center gap-1.5 break-all text-slate-700"><Mail className="h-3.5 w-3.5 text-slate-400" />{textoOGuion(cliente.correo)}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 shrink-0" />
            <div><p className="font-black">Directorio de clientes FAREGAS</p><p className="mt-1 text-xs leading-relaxed text-blue-800">Consolida el maestro de clientes con el último contacto registrado en facturación, sin modificar los comprobantes históricos.</p></div>
          </div>
          <button
            type="button"
            onClick={() => void exportarClientes()}
            disabled={loading || exportando || resumen.total === 0}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exportando ? 'EXPORTANDO...' : 'EXPORTAR EXCEL'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_220px_220px]">
        <input
          value={filtros.texto || ''}
          onChange={(event) => setFiltros((prev) => ({ ...prev, texto: event.target.value }))}
          onKeyDown={(event) => { if (event.key === 'Enter') buscar(); }}
          placeholder="Nombre, DNI/RUC/CE, teléfono, correo o dirección"
          className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select
          value={filtros.estado || ''}
          onChange={(event) => setFiltros((prev) => ({ ...prev, estado: event.target.value as FiltrosClientesFacturacion['estado'] }))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={buscar} className="rounded-lg bg-[#052a79] px-3 py-2.5 text-xs font-black text-white">BUSCAR</button>
          <button type="button" onClick={limpiar} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-black text-slate-700">LIMPIAR</button>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {loading && <div className="rounded-xl bg-slate-50 p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#052a79]" /></div>}
        {!loading && clientes.length === 0 && <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No se encontraron clientes.</div>}
        {!loading && clientes.map((cliente) => (
          <article key={`${cliente.tipoDocumento}-${cliente.nroDocumento}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-900">{cliente.nombreRazonSocial}</p><p className="mt-1 text-xs text-slate-500">{cliente.tipoDocumento} {cliente.nroDocumento}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${cliente.estado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{cliente.estado ? 'ACTIVO' : 'INACTIVO'}</span></div>
            <div className="mt-4">{contacto(cliente)}</div>
            <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />{textoOGuion(cliente.direccion)}</div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs"><div><span className="text-slate-400">Certificados</span><p className="font-black text-slate-800">{cliente.totalCertificados}</p></div><div><span className="text-slate-400">Comprobantes</span><p className="font-black text-slate-800">{cliente.totalComprobantes}</p></div><div><span className="text-slate-400">Última sede</span><p className="font-semibold text-slate-700">{textoOGuion(cliente.ultimaPlantaNombre)}</p></div><div><span className="text-slate-400">Última placa</span><p className="font-semibold text-slate-700">{textoOGuion(cliente.ultimaPlaca)}</p></div></div>
            <p className="mt-3 text-[11px] text-slate-400">Última atención: {fechaLocal(cliente.ultimaAtencion)}</p>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs text-slate-600"><tr><th className="p-3">Cliente</th><th className="p-3">Documento</th><th className="p-3">Contacto</th><th className="p-3">Dirección</th><th className="p-3">Actividad</th><th className="p-3">Última atención</th><th className="p-3">Estado</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#052a79]" /></td></tr>}
            {!loading && clientes.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-slate-500">No se encontraron clientes.</td></tr>}
            {!loading && clientes.map((cliente) => (
              <tr key={`${cliente.tipoDocumento}-${cliente.nroDocumento}`} className="border-t border-slate-100 align-top hover:bg-slate-50">
                <td className="max-w-64 p-3"><div className="break-words font-bold text-slate-900">{cliente.nombreRazonSocial}</div>{cliente.origen === 'FACTURACION_HISTORICA' && <div className="mt-1 text-[10px] font-bold text-amber-700">RECUPERADO DE FACTURACIÓN</div>}</td>
                <td className="whitespace-nowrap p-3"><div className="font-semibold">{cliente.tipoDocumento}</div><div className="text-xs text-slate-500">{cliente.nroDocumento}</div></td>
                <td className="min-w-48 p-3">{contacto(cliente)}</td>
                <td className="max-w-72 p-3 text-xs leading-relaxed text-slate-600">{textoOGuion(cliente.direccion)}</td>
                <td className="whitespace-nowrap p-3 text-xs"><div><b>{cliente.totalCertificados}</b> certificado(s)</div><div><b>{cliente.totalComprobantes}</b> comprobante(s)</div><div className="mt-1 text-slate-500">Placa: {textoOGuion(cliente.ultimaPlaca)}</div></td>
                <td className="whitespace-nowrap p-3 text-xs"><div>{fechaLocal(cliente.ultimaAtencion)}</div><div className="mt-1 text-slate-500">{textoOGuion(cliente.ultimaPlantaNombre)}</div></td>
                <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${cliente.estado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{cliente.estado ? 'ACTIVO' : 'INACTIVO'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Paginacion
        resumen={resumen}
        etiqueta="cliente"
        opcionesPageSize={[20, 50, 100]}
        deshabilitado={loading}
        onCambioPagina={(pagina) => {
          const siguientes = { ...filtros, pagina };
          setFiltros(siguientes);
          void cargar(siguientes);
        }}
        onCambioPageSize={(limite) => {
          const siguientes = { ...filtros, pagina: 1, limite };
          setFiltros(siguientes);
          void cargar(siguientes);
        }}
      />
    </div>
  );
}
