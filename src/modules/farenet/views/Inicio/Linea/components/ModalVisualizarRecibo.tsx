import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { lineaApi } from '@/services/api';

interface ModalVisualizarReciboProps {
  nroInspeccion: string;
  onClose: () => void;
}

export default function ModalVisualizarRecibo({ nroInspeccion, onClose }: ModalVisualizarReciboProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recibo, setRecibo] = useState<any>(null);

  useEffect(() => {
    const fetchRecibo = async () => {
      try {
        setLoading(true);
        const data = await lineaApi.obtenerRecibo(nroInspeccion);
        if (data.ok) {
          setRecibo(data.recibo);
        } else {
          setError(data.message || 'Error al obtener el recibo');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error al obtener el recibo');
      } finally {
        setLoading(false);
      }
    };
    fetchRecibo();
  }, [nroInspeccion]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Visualizar Recibo</h2>
              <p className="text-xs font-medium text-slate-500">
                Inspección {nroInspeccion}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Cargando datos del recibo...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100 text-center">
              {error}
            </div>
          ) : recibo ? (
            <div className="space-y-6">
              
              {/* Header Card */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Nro. Comprobante</div>
                  <div className="text-xl font-black text-indigo-900">{recibo.nroComprobante}</div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fecha Emisión</div>
                  <div className="text-sm font-bold text-slate-700">
                    {new Date(recibo.fecha).toLocaleString('es-PE')}
                  </div>
                </div>
              </div>

              {/* Grid 2 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Datos del Cliente</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-slate-500 mb-0.5">DNI / RUC</div>
                      <div className="text-sm font-bold text-slate-800">{recibo.cliente.nroDocumento}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-0.5">Nombre / Razón Social</div>
                      <div className="text-sm font-bold text-slate-800">{recibo.cliente.nombre}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalle del Servicio</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-slate-500 mb-0.5">Concepto</div>
                      <div className="text-sm font-bold text-slate-800 truncate" title={recibo.concepto}>{recibo.concepto}</div>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <div className="text-xs text-slate-500 mb-0.5">Placa</div>
                        <div className="text-sm font-bold text-slate-800">{recibo.vehiculo.placa || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-0.5">Planta</div>
                        <div className="text-sm font-bold text-slate-800">{recibo.planta || '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Total Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center">
                <div className="text-sm font-bold text-slate-500 uppercase">Importe Total</div>
                <div className="text-2xl font-black text-slate-800">
                  S/ {Number(recibo.importeTotal).toFixed(2)}
                </div>
              </div>

              {/* Pagos */}
              {recibo.pagos && recibo.pagos.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Registro de Pagos</h4>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Forma Pago</th>
                          <th className="px-4 py-3 font-semibold">Operación</th>
                          <th className="px-4 py-3 font-semibold text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recibo.pagos.map((pago: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-700">
                              {pago.tipocontado_key || pago.tarjeta_key || 'Efectivo'}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs">
                              {pago.nrooperaciontarjeta || pago.nrooperacionbanco || '-'}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800 text-right">
                              S/ {Number(pago.importe).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          ) : null}
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 text-white text-sm font-bold uppercase rounded-lg shadow-sm hover:bg-slate-900 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
