/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { Tag, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import {
  listarDescuentosDisponibles,
  aplicarDescuentoDirecto,
  quitarDescuentoBorrador,
  obtenerDescuentoBorrador,
  type DescuentoDisponible,
  type ConsultaDescuentoResult
} from '../../../../services/faregas-descuentos.api';
import Swal from 'sweetalert2';

interface SelectorDescuentoProps {
  certificadoId?: number;
  descuentoActual?: ConsultaDescuentoResult | null;
  onDescuentoChange?: (descuento: ConsultaDescuentoResult | null) => void;
}

export function SelectorDescuento({
  certificadoId,
  descuentoActual,
  onDescuentoChange,
}: SelectorDescuentoProps) {
  const [descuentosDisponibles, setDescuentosDisponibles] = useState<DescuentoDisponible[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [modoDescuento, setModoDescuento] = useState<'sin' | 'con'>(
    descuentoActual ? 'con' : 'sin'
  );
  const [descuentoSeleccionadoId, setDescuentoSeleccionadoId] = useState<string>(
    descuentoActual?.descuentoId ? String(descuentoActual.descuentoId) : ''
  );
  const [descuentoAplicado, setDescuentoAplicado] = useState<ConsultaDescuentoResult | null>(
    descuentoActual || null
  );
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const onChangeRef = useRef(onDescuentoChange);
  useEffect(() => {
    onChangeRef.current = onDescuentoChange;
  }, [onDescuentoChange]);

  useEffect(() => {
    if (!certificadoId) return;
    let cancelado = false;
    setCargandoLista(true);
    setErrorCarga(null);

    Promise.all([
      listarDescuentosDisponibles(certificadoId),
      obtenerDescuentoBorrador(certificadoId),
    ])
      .then(([disponibles, guardado]) => {
        if (cancelado) return;
        setDescuentosDisponibles(disponibles);
        if (guardado) {
          setDescuentoAplicado(guardado);
          setDescuentoSeleccionadoId(String(guardado.descuentoId));
          setModoDescuento('con');
          onChangeRef.current?.(guardado);
        } else if (descuentoActual) {
          setDescuentoAplicado(descuentoActual);
          setDescuentoSeleccionadoId(String(descuentoActual.descuentoId));
          setModoDescuento('con');
        }
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        setErrorCarga(err instanceof Error ? err.message : 'No se pudieron cargar los descuentos disponibles.');
      })
      .finally(() => {
        if (!cancelado) setCargandoLista(false);
      });

    return () => {
      cancelado = true;
    };
  }, [certificadoId]);

  const seleccionarSinDescuento = async () => {
    const descuentoAnterior = descuentoAplicado;
    setModoDescuento('sin');
    setDescuentoSeleccionadoId('');

    if (!certificadoId) {
      setDescuentoAplicado(null);
      onChangeRef.current?.(null);
      return;
    }

    setAplicando(true);
    try {
      await quitarDescuentoBorrador(certificadoId);
      setDescuentoAplicado(null);
      onChangeRef.current?.(null);
    } catch (err: unknown) {
      setModoDescuento(descuentoAnterior ? 'con' : 'sin');
      setDescuentoSeleccionadoId(descuentoAnterior ? String(descuentoAnterior.descuentoId) : '');
      Swal.fire('Error', err instanceof Error ? err.message : 'No se pudo retirar el descuento.', 'error');
    } finally {
      setAplicando(false);
    }
  };

  const handleSeleccionarDescuento = async (idStr: string) => {
    if (!certificadoId) return;
    setDescuentoSeleccionadoId(idStr);

    if (!idStr) {
      seleccionarSinDescuento();
      return;
    }

    const descuentoId = Number(idStr);
    setModoDescuento('con');
    setAplicando(true);
    try {
      const resultado = await aplicarDescuentoDirecto(certificadoId, descuentoId);
      setDescuentoAplicado(resultado);
      onChangeRef.current?.(resultado);
      Swal.fire({
        icon: 'success',
        title: 'Descuento Aplicado',
        text: `Se aplicó "${resultado.nombre}" correctamente.`,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo aplicar el descuento seleccionado.';
      Swal.fire('Error', mensaje, 'error');
      setDescuentoSeleccionadoId(descuentoAplicado ? String(descuentoAplicado.descuentoId) : '');
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="space-y-1.5">
        <label htmlFor="selector-descuento-directo" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-[#052a79]" />
          Descuento
        </label>

        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tipoDescuento"
              checked={modoDescuento === 'sin'}
              onChange={() => void seleccionarSinDescuento()}
              className="h-4 w-4 text-[#052a79] focus:ring-[#052a79]"
            />
            <span className="text-sm font-bold text-slate-700">SIN DESCUENTO</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tipoDescuento"
              checked={modoDescuento === 'con'}
              onChange={() => setModoDescuento('con')}
              className="h-4 w-4 text-[#052a79] focus:ring-[#052a79]"
            />
            <span className="text-sm font-bold text-slate-700">CON DESCUENTO</span>
          </label>
        </div>

        {cargandoLista ? (
          <div className="flex items-center gap-2.5 h-[42px] px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-[#052a79]" />
            Cargando descuentos configurados para este servicio...
          </div>
        ) : errorCarga ? (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorCarga}</span>
          </div>
        ) : descuentosDisponibles.length === 0 ? (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs font-medium text-amber-800">
            No existen descuentos vigentes configurados para este servicio en esta sede.
          </div>
        ) : modoDescuento === 'con' ? (
          <div className="relative">
            <select
              id="selector-descuento-directo"
              value={descuentoSeleccionadoId}
              onChange={(e) => void handleSeleccionarDescuento(e.target.value)}
              disabled={aplicando}
              className="h-[44px] w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors focus:border-[#f59e0b] focus:ring-0 disabled:opacity-60 cursor-pointer"
            >
              <option value="">-- Seleccione un descuento de la lista --</option>
              {descuentosDisponibles.map((desc) => (
                <option key={desc.id} value={desc.id}>
                  {desc.nombre} — {desc.beneficio} {desc.empresaAliada ? `(${desc.empresaAliada})` : ''}
                </option>
              ))}
            </select>
            {aplicando && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-[#052a79]" />
              </div>
            )}
          </div>
        ) : null}
      </div>

      {descuentoAplicado && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <h5 className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                  {descuentoAplicado.nombre}
                </h5>
                <p className="text-[11px] font-semibold text-emerald-700">
                  {descuentoAplicado.beneficio || (descuentoAplicado.tipoCalculo === 'PORCENTAJE' ? `${descuentoAplicado.valor}% de descuento` : `Monto fijo -S/ ${descuentoAplicado.importeDescuento.toFixed(2)}`)}
                  {descuentoAplicado.empresaAliada ? ` • ${descuentoAplicado.empresaAliada}` : ''}
                </p>
              </div>
            </div>
            {descuentoAplicado.autorizaGratuidad && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-200/80 px-2 py-0.5 text-[10px] font-black text-emerald-900 uppercase">
                <Sparkles className="h-3 w-3" />
                Operación Gratuita
              </span>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-emerald-200/60 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">Tarifa Original</span>
              <span className="font-bold text-slate-700">S/ {descuentoAplicado.tarifaOriginal.toFixed(2)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-emerald-700 uppercase">Descuento</span>
              <span className="font-black text-emerald-700">- S/ {descuentoAplicado.importeDescuento.toFixed(2)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-slate-800 uppercase">Importe Final</span>
              <span className="font-black text-slate-900 text-sm">S/ {descuentoAplicado.importeFinal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
