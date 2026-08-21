import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { operacionApi } from '@/services/api';
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://127.0.0.1:3000';

import { useNavigate, useOutletContext } from 'react-router-dom';
import type { MainLayoutContext } from '../Dashboard/MainLayout';

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

const obtenerClaseBadge = (valor?: string | null): string => {

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
    estado.includes('INACTIVO')
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

function BadgeEstado({ value }: { value?: string | null }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${obtenerClaseBadge(
        value
      )}`}
    >
      {normalizarTexto(value)}
    </span>
  );
}

export function InicioView() {
  const navigate = useNavigate();
  const { plantaKey: plantaSeleccionada } = useOutletContext<MainLayoutContext>();
  const [borradores, setBorradores] = useState<any[]>([]);
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



  const cargarInspecciones = async (
    _paginaConsulta = page,
    pageSizeConsulta = pageSize,
    _autoAdjust = true
  ) => {
    if (!puedeConsultar) {
      return;
    }

    const filtrosActuales = filtrosRef.current;

    if (filtrosActuales.fechaInicio > filtrosActuales.fechaFin) {
      setError('La fecha desde no puede ser mayor que la fecha hasta.');
      setBorradores([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // FAREGAS: No cargamos borradores de Farenet.
      // Se mostrará la tabla vacía hasta que se conecte el nuevo API de Faregas.
      setBorradores([]);
      setTotal(0);
      setPage(1);
      setPageSize(pageSizeConsulta);
      setTotalPages(1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al cargar borradores.'
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
        console.log('🔄 Actualizando borradores por WebSocket:', payload);
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
    cargarInspecciones(1, nuevoPageSize, false);
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
              Borradores registrados por sede activa.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/faregas/certificados/nuevo')}
              className="px-3 py-1.5 bg-[#052a79] text-white rounded text-xs font-semibold hover:bg-blue-900 transition"
            >
              + Nuevo Certificado
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

        <div className="mt-6 overflow-hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1400px] w-full border-collapse text-sm">
            <thead className="bg-[#0033a0] text-xs uppercase text-white font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">
                  N° Inspección
                </th>
                <th className="px-4 py-3 text-left">
                  Fecha y hora
                </th>
                <th className="px-4 py-3 text-left">
                  Placa
                </th>
                <th className="px-4 py-3 text-left">
                  DNI / RUC
                </th>
                <th className="px-4 py-3 text-left">
                  Nombres / Razón Social
                </th>
                <th className="px-4 py-3 text-left">
                  Concepto vehicular
                </th>
                <th className="px-4 py-3 text-left">
                  Línea
                </th>
                <th className="px-4 py-3 text-left">
                  Estado actual
                </th>
                <th className="px-4 py-3 text-left">
                  Resultado
                </th>
                <th className="px-4 py-3 text-left">
                  Estado certificado
                </th>
                <th className="px-4 py-3 text-center">
                  Acción
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-8 text-center text-slate-500 font-medium"
                  >
                    Cargando borradores...
                  </td>
                </tr>
              )}

              {!loading && borradores.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    No hay borradores registradas para el día actual.
                  </td>
                </tr>
              )}

              {!loading &&
                borradores.map((ins, idx) => {
                  const posicion = Number(ins.posicion || 0);
                  const etapa = ins.etapa || ins.estadoActual || 'SIN ESTADO';
                  const puedeContinuar = ins.puedeContinuarFlujo1 === true;
                  const debeAbrirFlujo2 = ins.debeAbrirFlujo2 === true;
                  // const puedeAnular = ins.puedeAnular === true;
                  
                  let claseFila = 'hover:bg-slate-50';
                  let etapaBadgeClase = 'bg-slate-100 text-slate-700 border-slate-200';

                  if (ins.colorGrupo === 'GRIS') {
                    claseFila = 'bg-slate-50 hover:bg-slate-100';
                    etapaBadgeClase = 'bg-slate-200 text-slate-800 border-slate-300';
                  } else if (ins.colorGrupo === 'ROJO') {
                    claseFila = 'bg-red-50 hover:bg-red-100';
                    etapaBadgeClase = 'bg-red-200 text-red-800 border-red-300';
                  } else if (ins.colorGrupo === 'AMARILLO') {
                    claseFila = 'bg-yellow-50 hover:bg-yellow-100';
                    etapaBadgeClase = 'bg-yellow-200 text-yellow-800 border-yellow-300';
                  } else if (ins.colorGrupo === 'VERDE') {
                    claseFila = 'bg-emerald-50 hover:bg-emerald-100';
                    etapaBadgeClase = 'bg-emerald-200 text-emerald-800 border-emerald-300';
                  }
                  
                  if (ins.estado === 'ANULADO') {
                    claseFila = 'bg-slate-100/50 opacity-60';
                  }

                  const textoClase = 'text-slate-700';
                  const labelClase = 'text-slate-500';

                  return (
                    <tr
                      key={`${ins.numeroInspeccion}-${idx}`}
                      className={`transition-colors ${claseFila} ${textoClase}`}
                    >
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap text-blue-700`}>
                        {normalizarTexto(ins.numeroInspeccion)}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap ${labelClase}`}>
                        {normalizarTexto(ins.fechaHora)}
                      </td>
                      <td className="px-4 py-3 font-bold whitespace-nowrap">
                        {normalizarTexto(ins.placa)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {normalizarTexto(ins.clienteDocumento)}
                      </td>
                      <td className="px-4 py-3 min-w-[220px]">
                        {normalizarTexto(ins.clienteNombre)}
                      </td>
                      <td className="px-4 py-3 min-w-[180px]">
                        {normalizarTexto(ins.conceptoVehicular)}
                      </td>
                      <td className="px-4 py-3 font-mono text-left whitespace-nowrap">
                        {normalizarTexto(ins.linea)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${etapaBadgeClase}`}>
                          {posicion}: {etapa}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <BadgeEstado value={ins.resultado} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <BadgeEstado value={ins.estadoCertificado} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center align-middle">
                        <div className="flex items-center justify-center gap-2 h-full">
                          {puedeContinuar && !debeAbrirFlujo2 ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/borradores/${ins.numeroInspeccion}/continuar`)}
                              className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              Continuar
                            </button>
                          ) : null}



                          {(!puedeContinuar || debeAbrirFlujo2) ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/linea/${ins.numeroInspeccion}`)}
                              className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              Ver
                            </button>
                          ) : null}
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
