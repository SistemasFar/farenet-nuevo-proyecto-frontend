import { useEffect, useState } from 'react';
import { Search, RotateCcw, Eye, AlertCircle } from 'lucide-react';

import {
  inspeccionesApi,
  plantaSession
} from '../../services/api';

import type {
  InspeccionPanel
} from '../../types/operacion';

const PAGE_SIZES = [5, 10, 20, 25, 50];

const INSPECCIONES_FILTERS_KEY = 'farenet_inspecciones_filters';

const getInitialFilters = () => {
  try {
    const saved = sessionStorage.getItem(INSPECCIONES_FILTERS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    // ignorar error de parseo
  }
  return {
    fechaInicio: '',
    fechaFin: '',
    numeroInspeccion: '',
    placa: '',
    comprobante: '',
    cliente: '',
    estado: '',
    page: 1,
    pageSize: 5
  };
};

interface InspeccionesViewProps {
  onVerInspeccion?: (id: string) => void;
}

export default function InspeccionesView({ onVerInspeccion }: InspeccionesViewProps) {
  const initialFilters = getInitialFilters();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [inspecciones, setInspecciones] = useState<InspeccionPanel[]>([]);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialFilters.page);
  const [pageSize, setPageSize] = useState(initialFilters.pageSize);
  const [totalPages, setTotalPages] = useState(0);

  const [fechaInicio, setFechaInicio] = useState(initialFilters.fechaInicio);
  const [fechaFin, setFechaFin] = useState(initialFilters.fechaFin);
  const [numeroInspeccion, setNumeroInspeccion] = useState(initialFilters.numeroInspeccion);
  const [placa, setPlaca] = useState(initialFilters.placa);
  const [comprobante, setComprobante] = useState(initialFilters.comprobante);
  const [cliente, setCliente] = useState(initialFilters.cliente);
  const [estado, setEstado] = useState(initialFilters.estado);

  useEffect(() => {
    const filtersToSave = {
      fechaInicio,
      fechaFin,
      numeroInspeccion,
      placa,
      comprobante,
      cliente,
      estado,
      page,
      pageSize
    };
    sessionStorage.setItem(INSPECCIONES_FILTERS_KEY, JSON.stringify(filtersToSave));
  }, [fechaInicio, fechaFin, numeroInspeccion, placa, comprobante, cliente, estado, page, pageSize]);

  const cargarInspecciones = async (
    paginaActual = 1,
    registrosPagina = pageSize,
    filtrosLimpiados = false
  ) => {
    try {
      setLoading(true);
      setError('');

      const planta = plantaSession.obtener();

      if (!planta?.key) {
        throw new Error('No existe una sede seleccionada.');
      }

      const response = await inspeccionesApi.buscarInspeccionesAsync(
        planta.key,
        {
          fechaInicio: filtrosLimpiados ? '' : fechaInicio,
          fechaFin: filtrosLimpiados ? '' : fechaFin,
          numeroInspeccion: filtrosLimpiados ? '' : numeroInspeccion,
          placa: filtrosLimpiados ? '' : placa,
          comprobante: filtrosLimpiados ? '' : comprobante,
          cliente: filtrosLimpiados ? '' : cliente,
          estado: filtrosLimpiados ? '' : estado,
          page: paginaActual,
          pageSize: registrosPagina
        }
      );

      setInspecciones(response.data || []);
      setTotal(response.total || 0);
      setPage(response.page || paginaActual);
      setPageSize(response.pageSize || registrosPagina);
      setTotalPages(response.totalPages || 0);
    } catch (err) {
      console.error('Error al buscar inspecciones:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Error al buscar inspecciones registradas.'
      );

      setInspecciones([]);
      setTotal(0);
      setPage(1);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarInspecciones(page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buscar = () => {
    cargarInspecciones(1, pageSize);
  };

  const limpiarFiltros = () => {
    sessionStorage.removeItem(INSPECCIONES_FILTERS_KEY);
    
    setFechaInicio('');
    setFechaFin('');
    setNumeroInspeccion('');
    setPlaca('');
    setComprobante('');
    setCliente('');
    setEstado('');
    setPage(1);

    cargarInspecciones(1, pageSize, true);
  };

  const cambiarPageSize = (nuevoPageSize: number) => {
    setPageSize(nuevoPageSize);
    cargarInspecciones(1, nuevoPageSize);
  };

  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const hasta = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h1 className="text-xl font-bold text-slate-800">
            Buscar inspecciones registradas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta inspecciones en estado CON, ANULADO o RETIRADO.
          </p>
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Desde
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Hasta
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                N° inspección
              </label>
              <input
                value={numeroInspeccion}
                onChange={(e) => setNumeroInspeccion(e.target.value)}
                placeholder="INS-201..."
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Placa
              </label>
              <input
                value={placa}
                onChange={(e) => setPlaca(e.target.value)}
                placeholder="ABC123"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm uppercase outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Comprobante
              </label>
              <input
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                placeholder="BE03..."
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Cliente
              </label>
              <input
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="DNI / RUC"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Todos</option>
                <option value="CON">CON</option>
                <option value="ANULADO">ANULADO</option>
                <option value="RETIRADO">RETIRADO</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={buscar}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>

              <button
                type="button"
                onClick={limpiarFiltros}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" />
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] w-full border-collapse text-sm">
            <thead className="bg-[#0033a0] text-xs uppercase text-white font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">N° Inspección</th>
                <th className="px-4 py-3 text-left">Fecha y hora</th>
                <th className="px-4 py-3 text-left">Placa</th>
                <th className="px-4 py-3 text-left">Comprobante</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Concepto vehicular</th>
                <th className="px-4 py-3 text-left">Línea</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">N° Certificado</th>
                <th className="px-4 py-3 text-left">Resultado</th>
                <th className="px-4 py-3 text-left">Estado cert.</th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                    Cargando inspecciones...
                  </td>
                </tr>
              )}

              {!loading && inspecciones.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                    No existen registros.
                  </td>
                </tr>
              )}

              {!loading && inspecciones.map((item) => (
                <tr key={item.numeroInspeccion} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {item.numeroInspeccion}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.fechaHora}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{item.placa}</td>
                  <td className="px-4 py-3 text-slate-600">{item.comprobante}</td>
                  <td className="px-4 py-3 text-slate-600">{item.clienteNombre || item.clienteDocumento}</td>
                  <td className="px-4 py-3 text-slate-600">{item.conceptoVehicular}</td>
                  <td className="px-4 py-3 text-slate-600">{item.linea}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {item.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.numeroCertificado}</td>
                  <td className="px-4 py-3 text-slate-600">{item.resultado}</td>
                  <td className="px-4 py-3 text-slate-600">{item.estadoCertificado}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      onClick={() => onVerInspeccion && onVerInspeccion(item.numeroInspeccion)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-600">
            Total registros: <b>{total}</b> | Mostrando {desde} - {hasta}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">
              Registros por página:
            </span>

            <select
              value={pageSize}
              onChange={(e) => cambiarPageSize(Number(e.target.value))}
              className="h-9 rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-blue-600"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => cargarInspecciones(page - 1, pageSize)}
              className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>

            <span className="text-sm font-semibold text-slate-700">
              Página {page} de {totalPages || 1}
            </span>

            <button
              type="button"
              disabled={page >= totalPages || loading || totalPages === 0}
              onClick={() => cargarInspecciones(page + 1, pageSize)}
              className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}