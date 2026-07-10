import React, { useEffect, useState } from 'react';
import { lineaApi } from '../../../../services/api';
import { ArrowLeft, RefreshCw, AlertCircle, FileCheck, XCircle, Settings, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';

interface SeguimientoLineaProps {
  nroInspeccion: string;
  onBack: () => void;
  onIrConsolidacion: () => void;
}

export function SeguimientoLineaDashboard({ nroInspeccion, onBack, onIrConsolidacion }: SeguimientoLineaProps) {
  const [estado, setEstado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEstado = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await lineaApi.obtenerEstadoLinea(nroInspeccion);
      if (data.ok) {
        setEstado(data);
      } else {
        setError(data.message || 'Error desconocido');
      }
    } catch (e: any) {
      setError(e.message || 'Error al obtener estado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nroInspeccion]);

  const handleIrConsolidacion = () => {
    onIrConsolidacion();
  };

  if (loading && !estado) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium">Cargando estado de línea...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">No se pudo cargar el estado</h3>
        <p className="text-slate-600 mb-6 max-w-md">{error}</p>
        <button onClick={onBack} className="btn-secondary px-4 py-2 bg-slate-200 rounded hover:bg-slate-300 transition-colors">Volver al inicio</button>
      </div>
    );
  }

  if (!estado) return null;

  if (estado.posicionActual < 5) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">Acceso denegado</h3>
        <p className="text-slate-600 mb-6 max-w-md">La inspección aún no ingresó a Línea (Posición {estado.posicionActual}).</p>
        <button onClick={onBack} className="btn-secondary px-4 py-2 bg-slate-200 rounded hover:bg-slate-300 transition-colors">Volver al inicio</button>
      </div>
    );
  }

  const { vehiculo, obligatorias, recibidas, faltantes, noAplicables } = estado;

  return (
    <div className="w-full flex flex-col font-sans h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              Seguimiento de Línea <span className="text-amber-600">#{nroInspeccion}</span>
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Placa: <span className="text-slate-800 uppercase bg-slate-100 px-1.5 py-0.5 rounded border">{vehiculo?.placa || '-'}</span> • 
              Categoría: <span className="text-slate-800">{vehiculo?.categoriaNombre || '-'}</span> • 
              Combustible: <span className="text-slate-800">{vehiculo?.combustibleNombre || '-'}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-4">
            <span className="text-xs font-bold text-slate-400 uppercase">Posición</span>
            <span className="text-lg font-black text-blue-600">{estado.posicionActual}</span>
          </div>
          <div className="flex flex-col items-end mr-4">
            <span className="text-xs font-bold text-slate-400 uppercase">Preliminar</span>
            <span className={`text-lg font-black ${estado.resultadoPreliminar === 'A' ? 'text-green-600' : 'text-red-600'}`}>{estado.resultadoPreliminar}</span>
          </div>
          <button onClick={fetchEstado} disabled={loading} className="p-2 hover:bg-blue-50 text-blue-600 rounded transition-colors flex items-center gap-2 border border-blue-200 bg-white shadow-sm font-medium text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
          <button 
            onClick={handleIrConsolidacion}
            disabled={!estado.puedeConsolidar || estado.posicionActual >= 15}
            className={`px-4 py-2 font-bold rounded shadow-sm transition-all flex items-center gap-2 ${
              estado.puedeConsolidar && estado.posicionActual < 15
                ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer ring-2 ring-green-600/30 ring-offset-1' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {estado.posicionActual >= 15 ? 'Inspección Consolidada' : estado.puedeConsolidar ? 'Ir a Consolidación' : 'Aún no puede consolidar'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Resumen Tarjetas */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{obligatorias?.length || 0}</p>
              <p className="text-xs font-bold text-slate-500 uppercase">Obligatorias</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{recibidas?.length || 0}</p>
              <p className="text-xs font-bold text-slate-500 uppercase">Recibidas</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{faltantes?.length || 0}</p>
              <p className="text-xs font-bold text-slate-500 uppercase">Faltantes</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{noAplicables?.length || 0}</p>
              <p className="text-xs font-bold text-slate-500 uppercase">No Aplicables</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Faltantes */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-amber-50 border-b border-amber-100 p-3 px-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-amber-800 uppercase tracking-tight">Pruebas Faltantes</h3>
            </div>
            <div className="p-0 overflow-auto max-h-[300px]">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 bg-slate-50 sticky top-0 uppercase font-bold border-b">
                  <tr>
                    <th className="px-4 py-2">Prueba</th>
                    <th className="px-4 py-2">Tipo Máquina</th>
                    <th className="px-4 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {faltantes && faltantes.length > 0 ? (
                    faltantes.map((f: any, idx: number) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{f.nombre}</td>
                        <td className="px-4 py-3 font-mono text-xs">{f.tipomaquinaKey}</td>
                        <td className="px-4 py-3">
                          <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Pendiente</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic font-medium">No hay pruebas faltantes</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recibidas */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-green-50 border-b border-green-100 p-3 px-4 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-green-800 uppercase tracking-tight">Pruebas Recibidas</h3>
            </div>
            <div className="p-0 overflow-auto max-h-[300px]">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 bg-slate-50 sticky top-0 uppercase font-bold border-b">
                  <tr>
                    <th className="px-4 py-2">Prueba</th>
                    <th className="px-4 py-2 text-center">Res</th>
                    <th className="px-4 py-2">Fecha Fin</th>
                  </tr>
                </thead>
                <tbody>
                  {recibidas && recibidas.length > 0 ? (
                    recibidas.map((r: any, idx: number) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{r.nombre || r.codigo}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-black px-2 py-0.5 rounded text-[11px] ${r.resultado === 'A' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {r.resultado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">{r.fechafin ? new Date(r.fechafin).toLocaleString() : '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic font-medium">No se han recibido pruebas aún</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* No Aplicables */}
        {noAplicables && noAplicables.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 border-b border-slate-200 p-3 px-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-slate-500" />
              <h3 className="font-bold text-slate-700 uppercase tracking-tight">Pruebas No Aplicables</h3>
            </div>
            <div className="p-0 overflow-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 bg-slate-50 uppercase font-bold border-b">
                  <tr>
                    <th className="px-4 py-2">Prueba</th>
                    <th className="px-4 py-2">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {noAplicables.map((na: any, idx: number) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="px-4 py-3 font-semibold text-slate-800">{na.nombre}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{na.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
