import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { operacionApi, inspeccionesApi } from '../../services/api';
import { Trash2 } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://127.0.0.1:3000';
import type { InspeccionPanel } from '../../types/operacion';

interface InicioViewProps {
  plantaSeleccionada: string;
  plantaNombre: string;
  onNuevaInspeccion?: (id?: string) => void;
}

interface FiltrosPanel {
  fechaInicio: string;
  fechaFin: string;
  placa: string;
  estado: string;
  numeroInspeccion: string;
  cliente: string;
  lineaKey: string;
}

const obtenerFechaActual = (): string => {
  return new Date().toISOString().split('T')[0];
};

const normalizarTexto = (valor?: string | null): string => {
  if (!valor || valor.trim() === '') return '-';
  return valor.trim();
};

const obtenerClaseBadge = (valor?: string | null, esBorrador?: boolean): string => {
  if (esBorrador) {
    return 'bg-white text-red-800 border-red-800 font-black shadow-sm';
  }

  const estado = normalizarTexto(valor).toUpperCase();

  if (
    estado.includes('FINALIZADO') ||
    estado.includes('APROBADO') ||
    estado.includes('VIGENTE')
  ) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  if (
    estado.includes('ANULADO') ||
    estado.includes('DESAPROBADO') ||
    estado.includes('VENCIDO') ||
    estado.includes('INACTIVO') ||
    estado.includes('BORRADOR')
  ) {
    return 'bg-red-50 text-red-700 border-red-200';
  }

  if (
    estado.includes('PROCESO') ||
    estado.includes('PENDIENTE') ||
    estado.includes('NUEVO')
  ) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return 'bg-slate-50 text-slate-700 border-slate-200';
};

function BadgeEstado({ value, esBorrador }: { value?: string | null, esBorrador?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${obtenerClaseBadge(
        value,
        esBorrador
      )}`}
    >
      {esBorrador ? 'BORRADOR' : normalizarTexto(value)}
    </span>
  );
}

export function InicioView(props: InicioViewProps) {
  const { plantaSeleccionada } = props;
  const [inspecciones, setInspecciones] = useState<InspeccionPanel[]>([]);
  const [lineasDisponibles, setLineasDisponibles] = useState<{ key: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [filtros, setFiltros] = useState<FiltrosPanel>({
    fechaInicio: obtenerFechaActual(),
    fechaFin: obtenerFechaActual(),
    placa: '',
    estado: 'PROCESO',
    numeroInspeccion: '',
    cliente: '',
    lineaKey: 'TODOS'
  });
  const filtrosRef = useRef(filtros);

  useEffect(() => {
    filtrosRef.current = filtros;
  }, [filtros]);
  const puedeConsultar = useMemo(() => {
    return plantaSeleccionada && plantaSeleccionada.trim() !== '';
  }, [plantaSeleccionada]);

  const handleEliminarBorrador = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este borrador? Esta acción no se puede deshacer.')) return;
    try {
      setLoading(true);
      await inspeccionesApi.eliminarBorrador(id);
      cargarInspecciones();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el borrador');
    } finally {
      setLoading(false);
    }
  };

  const cargarInspecciones = async (
    paginaConsulta = page,
    pageSizeConsulta = pageSize
  ) => {
    if (!puedeConsultar) {
      return;
    }

    const filtrosActuales = filtrosRef.current;

    if (filtrosActuales.fechaInicio > filtrosActuales.fechaFin) {
      setError('La fecha desde no puede ser mayor que la fecha hasta.');
      setInspecciones([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await operacionApi.listarInspeccionesAsync(
        plantaSeleccionada,
        {
          fechaInicio: filtrosActuales.fechaInicio,
          fechaFin: filtrosActuales.fechaFin,
          placa: filtrosActuales.placa,
          estado: filtrosActuales.estado,
          numeroInspeccion: filtrosActuales.numeroInspeccion,
          cliente: filtrosActuales.cliente,
          lineaKey: filtrosActuales.lineaKey,
          page: paginaConsulta,
          pageSize: pageSizeConsulta
        }
      );
      setInspecciones(response.data || []);
      setTotal(response.total || 0);
      setPage(response.page || paginaConsulta);
      setPageSize(pageSizeConsulta);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al cargar inspecciones.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFiltros(prev => {
      const nextFiltros = { ...prev, lineaKey: 'TODOS' };
      filtrosRef.current = nextFiltros;
      return nextFiltros;
    });
    cargarInspecciones(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantaSeleccionada]);
  useEffect(() => {
    if (plantaSeleccionada) {
      operacionApi.listarLineasAsync(plantaSeleccionada)
        .then(setLineasDisponibles)
        .catch(console.error);
    }
  }, [plantaSeleccionada]);

  useEffect(() => {
    if (!puedeConsultar) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true
    });

    socket.on('inspeccionActualizada', (payload: any) => {
      if (payload && payload.planta_key === plantaSeleccionada) {
        console.log('🔄 Actualizando inspecciones por WebSocket:', payload);
        cargarInspecciones(page, pageSize);
      }
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeConsultar, plantaSeleccionada, page, pageSize]);

  const handleFiltroChange = (
    field: keyof FiltrosPanel,
    value: string
  ) => {
    setFiltros((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const aplicarFiltros = () => {
    setPage(1);
    cargarInspecciones(1, pageSize);
  };

  const limpiarFiltros = () => {
    const hoy = obtenerFechaActual();

    setFiltros({
      fechaInicio: hoy,
      fechaFin: hoy,
      placa: '',
      estado: '',
      numeroInspeccion: '',
      cliente: '',
      lineaKey: ''
    });

    setPage(1);

    setTimeout(() => {
      cargarInspecciones(1, pageSize);
    }, 0);
  };

  const cambiarPageSize = (nuevoPageSize: number) => {
    setPageSize(nuevoPageSize);
    setPage(1);
    cargarInspecciones(1, nuevoPageSize);
  };

  const irPaginaAnterior = () => {
    if (page <= 1) return;

    const nuevaPagina = page - 1;
    setPage(nuevaPagina);
    cargarInspecciones(nuevaPagina, pageSize);
  };

  const irPaginaSiguiente = () => {
    if (page >= totalPages) return;

    const nuevaPagina = page + 1;
    setPage(nuevaPagina);
    cargarInspecciones(nuevaPagina, pageSize);
  };

  const registroInicio =
    total === 0 ? 0 : (page - 1) * pageSize + 1;

  const registroFin = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">


      <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-100 gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Panel principal de operación ({total})
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Inspecciones registradas por sede activa.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition">
              + Nuevo Duplicado
            </button>
            <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition">
              + Nuevo Servicio
            </button>
            <button 
              type="button"
              onClick={() => props.onNuevaInspeccion?.()}
              className="px-3 py-1.5 bg-[#052a79] text-white rounded text-xs font-semibold hover:bg-blue-900 transition"
            >
              + Nueva Inspección
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Buscar
            </label>

            <input
              type="text"
              value={filtros.cliente}
              onChange={(e) =>
                handleFiltroChange('cliente', e.target.value)
              }
              placeholder="Buscar por placa, DNI, RUC o nombre del cliente"
              className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={aplicarFiltros}
              disabled={loading || !puedeConsultar}
              className="h-[34px] min-w-[140px] rounded bg-[#052a79] px-4 text-xs font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Buscar
            </button>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={limpiarFiltros}
              disabled={loading}
              className="h-[34px] min-w-[90px] rounded bg-slate-100 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase">
              Total registros
            </p>
            <p className="text-xl font-bold text-slate-700">{total}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase">
              Página actual
            </p>
            <p className="text-xl font-bold text-slate-700">
              {page} / {totalPages || 1}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase">
              Mostrando
            </p>
            <p className="text-xl font-bold text-slate-700">
              {registroInicio}-{registroFin}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase">
              Registros por página
            </p>
            <select
              value={pageSize}
              onChange={(e) => cambiarPageSize(Number(e.target.value))}
              disabled={loading}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase">
              Línea
            </p>
            <select
              value={filtros.lineaKey}
              onChange={(e) => handleFiltroChange('lineaKey', e.target.value)}
              disabled={loading}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="TODOS">Todas las líneas</option>
              {lineasDisponibles.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#26b49a] text-white font-semibold">
                <th className="p-3 border-r border-teal-600">
                  N° Inspección
                </th>
                <th className="p-3 border-r border-teal-600">
                  Fecha y hora
                </th>
                <th className="p-3 border-r border-teal-600">
                  Placa
                </th>
                <th className="p-3 border-r border-teal-600">
                  DNI / RUC
                </th>
                <th className="p-3 border-r border-teal-600">
                  Nombres / Razón Social
                </th>
                <th className="p-3 border-r border-teal-600">
                  Concepto vehicular
                </th>
                <th className="p-3 border-r border-teal-600">
                  Línea
                </th>
                <th className="p-3 border-r border-teal-600">
                  Estado actual
                </th>

                <th className="p-3 border-r border-teal-600">
                  Resultado
                </th>
                <th className="p-3 border-r border-teal-600">
                  Estado certificado
                </th>
                <th className="p-3">
                  Acción
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-700">
              {loading && (
                <tr>
                  <td
                    colSpan={12}
                    className="p-6 text-center text-slate-500 font-medium"
                  >
                    Cargando inspecciones...
                  </td>
                </tr>
              )}

              {!loading && inspecciones.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="p-6 text-center text-slate-400"
                  >
                    No hay inspecciones registradas para el día actual.
                  </td>
                </tr>
              )}

              {!loading &&
                inspecciones.map((ins, idx) => {
                  const posicion = Number(ins.posicion ?? 0);
                  const esBorrador = posicion < 3;

                  const claseFila =
                    posicion >= 11
                      ? 'bg-emerald-50 hover:bg-emerald-100'
                      : posicion >= 6
                        ? 'bg-amber-50 hover:bg-amber-100'
                        : esBorrador
                          ? 'bg-slate-100 hover:bg-slate-200' // Plomo muy sutil para borradores
                          : 'bg-red-50 hover:bg-red-100';

                  // Al usar un fondo sutil, el texto ya no debe ser blanco, sino oscuro como el resto
                  const textoClase = esBorrador ? 'text-slate-700' : 'text-slate-700';
                  const labelClase = esBorrador ? 'text-slate-500' : 'text-slate-500';

                  return (
                    <tr
                      key={`${ins.numeroInspeccion}-${idx}`}
                      className={`transition-colors ${claseFila} ${textoClase}`}
                    >
                      <td className={`p-3 font-semibold whitespace-nowrap ${esBorrador ? 'text-slate-800' : 'text-blue-700'}`}>
                        {normalizarTexto(ins.numeroInspeccion)}
                      </td>
                      <td className={`p-3 whitespace-nowrap ${labelClase}`}>
                        {normalizarTexto(ins.fechaHora)}
                      </td>
                      <td className="p-3 font-bold whitespace-nowrap">
                        {normalizarTexto(ins.placa)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {normalizarTexto(ins.clienteDocumento)}
                      </td>
                      <td className="p-3 min-w-[220px]">
                        {normalizarTexto(ins.clienteNombre)}
                      </td>
                      <td className="p-3 min-w-[180px]">
                        {normalizarTexto(ins.conceptoVehicular)}
                      </td>
                      <td className="p-3 font-mono text-center whitespace-nowrap">
                        {normalizarTexto(ins.linea)}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <BadgeEstado value={ins.estadoActual || ins.estado} esBorrador={esBorrador} />
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <BadgeEstado value={ins.resultado} />
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <BadgeEstado value={ins.estadoCertificado} />
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => props.onNuevaInspeccion?.(ins.numeroInspeccion)}
                            className="rounded bg-white/90 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-white shadow-sm transition"
                          >
                            Ver
                          </button>
                          {esBorrador && (
                            <button
                              type="button"
                              onClick={() => handleEliminarBorrador(ins.numeroInspeccion)}
                              title="Eliminar borrador"
                              className="p-1.5 text-slate-500 hover:text-white hover:bg-red-500 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-slate-500">
          <div>
            Mostrando{' '}
            <span className="font-semibold text-slate-700">
              {registroInicio}
            </span>{' '}
            a{' '}
            <span className="font-semibold text-slate-700">
              {registroFin}
            </span>{' '}
            de{' '}
            <span className="font-semibold text-slate-700">
              {total}
            </span>{' '}
            registros.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={irPaginaAnterior}
              disabled={loading || page <= 1}
              className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>

            <span className="text-[11px] font-semibold text-slate-500">
              Página {page} de {totalPages || 1}
            </span>

            <button
              type="button"
              onClick={irPaginaSiguiente}
              disabled={loading || page >= totalPages}
              className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>


      </div>
    </div>
  );
}