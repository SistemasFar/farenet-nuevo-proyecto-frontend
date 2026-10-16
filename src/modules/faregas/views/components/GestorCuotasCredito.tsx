import React from 'react';
import { Calendar, AlertCircle, CheckCircle2, PlusCircle, Trash2 } from 'lucide-react';

export interface CuotaCreditoItem {
  numeroCuota: number;
  fechaPago: string;
  importe: string | number;
}

export interface GestorCuotasCreditoProps {
  saldoAFinanciar: number;
  fechaInicioCredito: string;
  fechaVencimientoCredito: string;
  cuotas: CuotaCreditoItem[];
  onChangeCuotas: (cuotas: CuotaCreditoItem[]) => void;
  maxCuotas?: number;
  compact?: boolean;
  disabled?: boolean;
  error?: string;
}

const redondear = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

export function generarFechasDistribuidas(
  fechaInicio: string,
  fechaVencimiento: string,
  n: number
): string[] {
  if (!fechaVencimiento) return Array(n).fill('');
  if (n <= 1 || !fechaInicio || fechaVencimiento <= fechaInicio) {
    return Array(n).fill(fechaVencimiento);
  }
  const [y1, m1, d1] = fechaInicio.split('-').map(Number);
  const [y2, m2, d2] = fechaVencimiento.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  const diffDays = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return Array(n).fill(fechaVencimiento);

  const fechas: string[] = [];
  const stepDays = diffDays / n;
  for (let i = 1; i < n; i++) {
    const targetTime = t1 + Math.round(stepDays * i) * (1000 * 60 * 60 * 24);
    const dateObj = new Date(targetTime);
    const y = dateObj.getUTCFullYear();
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getUTCDate()).padStart(2, '0');
    fechas.push(`${y}-${m}-${d}`);
  }
  fechas.push(fechaVencimiento);
  return fechas;
}

export function distribuirCuotasAutomaticas(
  saldoAFinanciar: number,
  n: 1 | 2 | 3,
  fechaInicio: string,
  fechaVencimiento: string
): CuotaCreditoItem[] {
  const saldo = Math.max(0, redondear(saldoAFinanciar));
  if (saldo <= 0) return [];

  const saldoCentavos = Math.round(saldo * 100);
  const baseCentavos = Math.floor(saldoCentavos / n);
  const fechas = generarFechasDistribuidas(fechaInicio, fechaVencimiento, n);

  const cuotas: CuotaCreditoItem[] = [];
  for (let i = 0; i < n; i++) {
    const esUltima = i === n - 1;
    const centavosCuota = esUltima
      ? saldoCentavos - baseCentavos * (n - 1)
      : baseCentavos;
    cuotas.push({
      numeroCuota: i + 1,
      fechaPago: fechas[i] || fechaVencimiento || '',
      importe: (centavosCuota / 100).toFixed(2),
    });
  }
  return cuotas;
}

export function GestorCuotasCredito({
  saldoAFinanciar,
  fechaInicioCredito,
  fechaVencimientoCredito,
  cuotas,
  onChangeCuotas,
  maxCuotas = 3,
  compact = false,
  disabled = false,
  error,
}: GestorCuotasCreditoProps) {
  const saldo = Math.max(0, redondear(saldoAFinanciar));
  const totalCuotas = redondear(
    cuotas.reduce((sum, c) => sum + Number(c.importe || 0), 0)
  );
  const diferencia = redondear(totalCuotas - saldo);
  const cuotasCuadran = Math.abs(diferencia) <= 0.009;

  const handleSeleccionarCantidadCuotas = (cantidad: 1 | 2 | 3) => {
    if (disabled || saldo <= 0) return;
    const nuevas = distribuirCuotasAutomaticas(
      saldo,
      cantidad,
      fechaInicioCredito,
      fechaVencimientoCredito
    );
    onChangeCuotas(nuevas);
  };

  const handleAgregarCuota = () => {
    if (disabled || cuotas.length >= maxCuotas || saldo <= 0) return;
    const siguienteNum = cuotas.length + 1;
    const nuevas = distribuirCuotasAutomaticas(
      saldo,
      siguienteNum as 1 | 2 | 3,
      fechaInicioCredito,
      fechaVencimientoCredito
    );
    onChangeCuotas(nuevas);
  };

  const handleEliminarCuota = (index: number) => {
    if (disabled || cuotas.length <= 1) return;
    const filtradas = cuotas.filter((_, i) => i !== index);
    const reenumeradas = filtradas.map((c, i) => ({
      ...c,
      numeroCuota: i + 1,
    }));
    onChangeCuotas(reenumeradas);
  };

  const handleActualizarCuota = (
    index: number,
    campo: 'fechaPago' | 'importe',
    valor: string
  ) => {
    if (disabled) return;
    const actualizadas = cuotas.map((c, i) => {
      if (i !== index) return c;
      return { ...c, [campo]: valor };
    });
    onChangeCuotas(actualizadas);
  };

  if (saldo <= 0) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-amber-800 mb-1">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span>Sin Saldo por Financiar</span>
        </div>
        <p>
          No existe saldo pendiente para distribuir en cuotas. Para emitir a crédito, la operación debe conservar un saldo a financiar. Si se completó el pago, seleccione la condición <strong>CONTADO</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-blue-200 bg-blue-50/70 ${compact ? 'p-3 space-y-3' : 'p-4 space-y-4'}`}>
      {/* Cabecera y Selector Rápido */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#052A79]" />
            <h4 className="text-xs font-black uppercase tracking-wider text-[#052A79]">
              PLAN DE CUOTAS — Programación de Cuotas al Crédito (Máx. {maxCuotas})
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Seleccione de 1 a {maxCuotas} cuotas o edite los vencimientos e importes individuales.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase text-slate-500 mr-1 hidden sm:inline">
            Distribución:
          </span>
          {([1, 2, 3] as const).map((num) => {
            const activo = cuotas.length === num;
            return (
              <button
                key={num}
                type="button"
                disabled={disabled}
                onClick={() => handleSeleccionarCantidadCuotas(num)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  activo
                    ? 'bg-[#052A79] text-white shadow-sm ring-2 ring-[#052A79]/30'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-[#052A79]'
                } disabled:opacity-50`}
              >
                {num} {num === 1 ? 'Cuota' : 'Cuotas'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Cuotas Editables */}
      <div className="space-y-2">
        {cuotas.map((cuota, idx) => (
          <div
            key={cuota.numeroCuota || idx}
            className="grid grid-cols-[56px_1fr_1fr_auto] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-blue-300"
          >
            <div className="text-center font-mono text-xs font-black text-[#052A79] bg-blue-50 py-1.5 rounded">
              N° {String(cuota.numeroCuota).padStart(3, '0')}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500">
                FECHA VENCIMIENTO *
              </label>
              <input
                type="date"
                disabled={disabled}
                min={fechaInicioCredito || undefined}
                max={fechaVencimientoCredito || undefined}
                value={cuota.fechaPago}
                onChange={(e) => handleActualizarCuota(idx, 'fechaPago', e.target.value)}
                className="mt-0.5 w-full rounded border border-slate-300 p-1.5 text-xs font-semibold focus:border-[#052A79] focus:ring-1 focus:ring-[#052A79] disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500">
                IMPORTE (S/) *
              </label>
              <input
                type="number"
                disabled={disabled}
                step="0.01"
                min="0.01"
                value={cuota.importe}
                onChange={(e) => handleActualizarCuota(idx, 'importe', e.target.value)}
                placeholder="0.00"
                className="mt-0.5 w-full rounded border border-slate-300 p-1.5 text-xs font-bold text-slate-800 focus:border-[#052A79] focus:ring-1 focus:ring-[#052A79] disabled:bg-slate-100"
              />
            </div>

            <div className="flex items-end justify-center pt-3.5">
              {cuotas.length > 1 ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleEliminarCuota(idx)}
                  title="Eliminar cuota"
                  className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-7" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Botón de Agregar Cuota si no alcanza el máximo */}
      {cuotas.length < maxCuotas && (
        <button
          type="button"
          disabled={disabled}
          onClick={handleAgregarCuota}
          className="flex items-center justify-center gap-1.5 w-full py-2 bg-white hover:bg-blue-50 border border-dashed border-[#052A79]/40 rounded-lg text-xs font-bold text-[#052A79] transition disabled:opacity-50"
        >
          <PlusCircle className="w-4 h-4" />
          AGREGAR CUOTA ({cuotas.length + 1} de {maxCuotas})
        </button>
      )}

      {/* Resumen de Cuadre y Totales */}
      <div className="rounded-lg bg-white p-3 border border-blue-100 text-xs font-bold space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-slate-500">Saldo a financiar: </span>
            <span className="text-slate-900 font-extrabold text-sm">
              S/ {saldo.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Total programado en cuotas: </span>
            <span
              className={`font-mono text-sm ${
                cuotasCuadran ? 'text-emerald-700 font-extrabold' : 'text-amber-700 font-extrabold'
              }`}
            >
              S/ {totalCuotas.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Badge de Estado del Cuadre */}
        {cuotasCuadran ? (
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md text-[11px] font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Las cuotas cuadran exactamente con el saldo financiado (S/ {saldo.toFixed(2)})</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md text-[11px] font-bold border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              {diferencia > 0
                ? `Las cuotas exceden el saldo por S/ ${diferencia.toFixed(2)}`
                : `Falta distribuir S/ ${Math.abs(diferencia).toFixed(2)} para completar el saldo`}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs font-semibold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
