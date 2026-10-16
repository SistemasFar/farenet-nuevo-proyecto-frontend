import React, { useState } from 'react';
import { CreditCard, PlusCircle, Trash2, AlertCircle, ShieldAlert } from 'lucide-react';
import type { MaestrosPagoResponse } from '@/types/maestros';
import type { FormPagoState, PagoAgregado } from '../../NuevoCertificadoView';
import type { ResumenComercialFaregas } from '../../../../types/faregas-api';
import { MensajeError, type ErroresCampo } from '../../faregas-wizard-errores';
import { GestorCuotasCredito, type CuotaCreditoItem } from '../../../components/GestorCuotasCredito';

type TipoPago = PagoAgregado['tipo'];

interface PagoStepProps {
  pagoTab: 'EFECTIVO' | 'TARJETA' | 'BANCO';
  setPagoTab: (tab: TipoPago) => void;
  formPago: FormPagoState;
  setFormPago: React.Dispatch<React.SetStateAction<FormPagoState>>;
  pagosAgregados: PagoAgregado[];
  handleAgregarPago: () => void;
  eliminarPago: (index: number) => void;
  totalPagar: number;
  tarifaOriginal?: number;
  descuento?: number;
  labelTarifaOriginal?: string;
  resumenComercial?: ResumenComercialFaregas | null;
  maestrosPago?: MaestrosPagoResponse['data'] | null;
  tipoComprobante: string;
  condicionPago: 'CONTADO' | 'CREDITO';
  onCondicionPagoChange: (condicion: 'CONTADO' | 'CREDITO') => void;
  fechaInicioCredito: string;
  fechaVencimientoCredito: string;
  cuotasCredito?: CuotaCreditoItem[];
  onCuotasCreditoChange?: (cuotas: CuotaCreditoItem[]) => void;
  onFechaInicioCreditoChange: (fecha: string) => void;
  onFechaVencimientoCreditoChange: (fecha: string) => void;
  compact?: boolean;
  erroresCampo?: ErroresCampo;
  onCorregirCampo?: (campo: string) => void;
}

export function PagoStep({
  pagoTab,
  setPagoTab,
  formPago,
  setFormPago,
  pagosAgregados,
  handleAgregarPago,
  eliminarPago,
  totalPagar,
  tarifaOriginal = totalPagar,
  descuento = 0,
  resumenComercial,
  maestrosPago,
  tipoComprobante,
  labelTarifaOriginal = "Certificado:",
  condicionPago,
  onCondicionPagoChange,
  fechaInicioCredito,
  fechaVencimientoCredito,
  cuotasCredito = [],
  onCuotasCreditoChange,
  onFechaInicioCreditoChange,
  onFechaVencimientoCreditoChange,
  compact = false,
  erroresCampo = {},
  onCorregirCampo,
}: PagoStepProps) {

  const [avisoPagoConfirmado, setAvisoPagoConfirmado] = useState<string>('');
  const pagado = pagosAgregados.reduce((sum, p) => sum + parseFloat(p.importe), 0);
  const pendiente = totalPagar - pagado;
  const cuentasFiltradas = (maestrosPago?.cuentasCorrientes || []).filter((cuenta) =>
    !formPago.entidadFinancieraKey || cuenta.entidadfinanciera_key === formPago.entidadFinancieraKey
  );
  const tarjetaSeleccionada = (maestrosPago?.tarjetas || []).find((tarjeta) => tarjeta.key === formPago.tarjetaKey);
  const nombreTarjetaSeleccionada = String(tarjetaSeleccionada?.nombre || '').toUpperCase();
  const esMedioAlternativo = ['YAPE', 'PLIN', 'CUPONIDAD'].some((nombre) => nombreTarjetaSeleccionada.includes(nombre));
  const esBoleta = String(tipoComprobante || '').toUpperCase() === 'BOLETA';
  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormPago((prev) => ({
      ...prev,
      [e.target.name]: e.target.value.toUpperCase(),
      ...(e.target.name === 'tarjetaKey' ? { modalidadTarjeta: '' } : {}),
    }));
  };

  const agregarMockPago = () => {
    if (!formPago.importe) return;
    handleAgregarPago();
  };

  return (
    <div className={`${compact ? 'space-y-4' : 'space-y-8'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <div className={`flex items-center gap-3 border-b border-slate-200 ${compact ? 'pb-3' : 'pb-4'}`}>
        <div className="bg-[#052a79]/10 p-2.5 rounded-xl">
          <CreditCard className="w-6 h-6 text-[#052a79]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Pago</h3>
          <p className="text-sm text-slate-500">
            Registre uno o varios medios de pago. La información se guarda en el borrador Faregas.
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-3 ${compact ? 'gap-5' : 'gap-8'}`}>
        
        {/* PANEL IZQUIERDO: INGRESAR PAGO */}
        <div className={`lg:col-span-2 ${compact ? 'space-y-4' : 'space-y-6'}`}>
          <div className={`rounded-2xl border-2 border-slate-200 bg-white ${compact ? 'p-4' : 'p-5'}`}>
            <label className="mb-2 block text-xs font-bold text-slate-500">CONDICIÓN DE PAGO</label>
            <select
              value={condicionPago}
              disabled={esBoleta}
              onChange={(event) => onCondicionPagoChange(event.target.value as 'CONTADO' | 'CREDITO')}
              className="w-full rounded-xl border-2 border-slate-200 p-3 font-bold text-[#052a79] disabled:bg-slate-100 disabled:text-slate-600"
            >
              <option value="CONTADO">CONTADO — debe completar el pago</option>
              {!esBoleta && <option value="CREDITO">CRÉDITO — el saldo se distribuirá en cuotas</option>}
            </select>
            {esBoleta && <p className="mt-2 text-xs font-semibold text-slate-500">La boleta sólo admite condición de pago CONTADO.</p>}
            
            {condicionPago === 'CREDITO' && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3 space-y-3">
                <p className="text-xs font-black tracking-wide text-[#052a79]">PERÍODO DEL CRÉDITO</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div data-campo-error={erroresCampo.fechaInicioCredito ? true : undefined}>
                    <label className="mb-1 block text-xs font-bold text-slate-600">FECHA DE INICIO *</label>
                    <input
                      type="date"
                      value={fechaInicioCredito}
                      onChange={(event) => onFechaInicioCreditoChange(event.target.value)}
                      className={`w-full rounded-lg border-2 p-2.5 font-semibold ${erroresCampo.fechaInicioCredito ? 'border-red-500' : 'border-slate-200'}`}
                    />
                    <MensajeError campo="fechaInicioCredito" errores={erroresCampo} />
                  </div>
                  <div data-campo-error={erroresCampo.fechaVencimientoCredito ? true : undefined}>
                    <label className="mb-1 block text-xs font-bold text-slate-600">FECHA DE VENCIMIENTO *</label>
                    <input
                      type="date"
                      min={fechaInicioCredito || undefined}
                      value={fechaVencimientoCredito}
                      onChange={(event) => onFechaVencimientoCreditoChange(event.target.value)}
                      className={`w-full rounded-lg border-2 p-2.5 font-semibold ${erroresCampo.fechaVencimientoCredito ? 'border-red-500' : 'border-slate-200'}`}
                    />
                    <MensajeError campo="fechaVencimientoCredito" errores={erroresCampo} />
                  </div>
                </div>

                {pendiente <= 0 ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs font-semibold text-amber-900 shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-amber-800 mb-1">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Pago Completo Confirmado</span>
                    </div>
                    <p>
                      Esta operación registra pagos confirmados por el 100% del importe (S/ {totalPagar.toFixed(2)}). No existe saldo pendiente para financiar al crédito.
                    </p>
                    <p className="mt-1 text-slate-600">
                      Para emitir a crédito, la operación debe conservar un saldo pendiente por financiar. Si se completó el pago, la condición debe ser <strong>CONTADO</strong>.
                    </p>
                  </div>
                ) : (
                  <div data-campo-error={erroresCampo.cuotas ? true : undefined}>
                    <GestorCuotasCredito
                      saldoAFinanciar={pendiente}
                      fechaInicioCredito={fechaInicioCredito}
                      fechaVencimientoCredito={fechaVencimientoCredito}
                      cuotas={cuotasCredito}
                      onChangeCuotas={(nuevas) => onCuotasCreditoChange?.(nuevas)}
                      compact={compact}
                      error={erroresCampo.cuotas}
                    />
                    <MensajeError campo="cuotas" errores={erroresCampo} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50">
              {['EFECTIVO', 'TARJETA', 'BANCO'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPagoTab(tab as TipoPago)}
                  className={`flex-1 py-4 font-bold text-sm tracking-wider transition-colors ${
                    pagoTab === tab
                      ? 'bg-white text-[#052a79] border-b-2 border-b-[#f59e0b]'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className={`${compact ? 'space-y-4 p-4' : 'space-y-6 p-6'}`}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">MONTO (S/)</label>
                  <input type="number" name="importe" value={formPago.importe || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-lg focus:border-[#f59e0b] focus:ring-0" placeholder="0.00" />
                </div>
                {pagoTab !== 'EFECTIVO' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">N° OPERACIÓN / REFERENCIA</label>
                    <input type="text" name="nroOperacion" value={formPago.nroOperacion || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl capitalize font-bold focus:border-[#f59e0b] focus:ring-0" placeholder="EJ: 123456" />
                  </div>
                )}
              </div>

              {pagoTab === 'TARJETA' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">MARCA / MEDIO</label>
                    <select name="tarjetaKey" value={formPago.tarjetaKey || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl capitalize font-bold focus:border-[#f59e0b] focus:ring-0">
                      <option value="">-- SELECCIONAR --</option>
                      {(maestrosPago?.tarjetas || []).map((tarjeta) => (
                        <option key={tarjeta.key} value={tarjeta.key}>{tarjeta.nombre}</option>
                      ))}
                    </select>
                  </div>
                  {tarjetaSeleccionada && !esMedioAlternativo && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">MODALIDAD DE TARJETA</label>
                      <select name="modalidadTarjeta" value={formPago.modalidadTarjeta || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-[#f59e0b] focus:ring-0">
                        <option value="">-- SELECCIONAR --</option>
                        <option value="DEBITO">DÉBITO</option>
                        <option value="CREDITO">CRÉDITO</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {pagoTab === 'BANCO' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">ENTIDAD FINANCIERA</label>
                    <select name="entidadFinancieraKey" value={formPago.entidadFinancieraKey || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl capitalize font-bold focus:border-[#f59e0b] focus:ring-0">
                      <option value="">-- SELECCIONAR --</option>
                      {(maestrosPago?.entidadesFinancieras || []).map((entidad) => (
                        <option key={entidad.key} value={entidad.key}>{entidad.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">CUENTA CORRIENTE</label>
                    <select name="cuentaCorrienteKey" value={formPago.cuentaCorrienteKey || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl capitalize font-bold focus:border-[#f59e0b] focus:ring-0">
                      <option value="">-- SELECCIONAR --</option>
                      {cuentasFiltradas.map((cuenta) => (
                        <option key={cuenta.key} value={cuenta.key}>{cuenta.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">FECHA DEPÓSITO</label>
                    <input type="date" name="fechaDeposito" max={new Date().toISOString().slice(0, 10)} value={formPago.fechaDeposito || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold focus:border-[#f59e0b] focus:ring-0" />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={agregarMockPago}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#052a79] text-white rounded-xl font-bold hover:bg-[#041e56] transition"
              >
                <PlusCircle className="w-5 h-5" /> AGREGAR PAGO
              </button>
            </div>
          </div>

          <div
            className={`rounded-2xl border-2 bg-white ${erroresCampo.pagos ? 'border-red-500' : 'border-slate-200'} ${compact ? 'p-4' : 'p-6'}`}
            data-campo-error={erroresCampo.pagos ? true : undefined}
          >
            <h4 className={`text-sm font-bold text-slate-700 capitalize ${compact ? 'mb-2' : 'mb-4'}`}>Pagos Registrados</h4>
            
            {avisoPagoConfirmado && (
              <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-amber-800">Operación protegida</p>
                  <p>{avisoPagoConfirmado}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAvisoPagoConfirmado('')}
                  className="text-amber-700 hover:text-amber-900 font-bold ml-1"
                >
                  ✕
                </button>
              </div>
            )}

            {pagosAgregados.length === 0 ? (
              <p className="text-slate-400 text-sm italic">No hay pagos registrados.</p>
            ) : (
              <div className="space-y-3">
                {pagosAgregados.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800">{p.tipo} {p.tarjetaKey ? `- ${p.tarjetaKey}` : ''} {p.modalidadTarjeta ? `(${p.modalidadTarjeta === 'DEBITO' ? 'DÉBITO' : 'CRÉDITO'})` : ''}</p>
                        {p.id && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            CONFIRMADO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 capitalize">{p.nroOperacion ? `Operación: ${p.nroOperacion}` : 'Sin referencia'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-[#052a79] text-lg">S/ {parseFloat(p.importe).toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (p.id) {
                            setAvisoPagoConfirmado('Este pago está confirmado en caja y no puede eliminarse desde el borrador. Requiere el proceso de anulación o ajuste autorizado por caja.');
                            return;
                          }
                          setAvisoPagoConfirmado('');
                          onCorregirCampo?.('pagos');
                          eliminarPago(idx);
                        }}
                        className={`transition ${
                          p.id
                            ? 'text-slate-300 hover:text-amber-600 cursor-pointer'
                            : 'text-red-400 hover:text-red-600'
                        }`}
                        title={p.id ? 'Pago confirmado en caja (protegido)' : 'Eliminar pago'}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <MensajeError campo="pagos" errores={erroresCampo} />
          </div>
        </div>

        {/* PANEL DERECHO: RESUMEN */}
        <div className="lg:col-span-1">
          <div className={`sticky top-6 rounded-2xl border-2 border-[#052a79]/10 bg-[#f4f9ff] ${compact ? 'p-4' : 'p-6'}`}>
            <h4 className={`font-bold text-[#052a79] capitalize tracking-wider ${compact ? 'mb-4' : 'mb-6'}`}>Resumen de Cuenta</h4>
            
            <div className={compact ? 'space-y-3' : 'space-y-4'}>
              <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold">{labelTarifaOriginal}</span><span className="font-bold text-slate-700">S/ {tarifaOriginal.toFixed(2)}</span></div>
              {descuento > 0 && <div className="flex justify-between items-center"><span className="text-emerald-700 font-semibold">Descuento certificado:</span><span className="font-black text-emerald-700">- S/ {descuento.toFixed(2)}</span></div>}
              {resumenComercial?.requiereChip && (
                <div className="flex justify-between items-center"><span className="text-slate-500 font-semibold">Chip y porta chip:</span><span className="font-bold text-slate-700">S/ {resumenComercial.precioChip.toFixed(2)}</span></div>
              )}
              {resumenComercial?.requiereChip && <div className="h-px bg-slate-200" />}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Total a pagar:</span>
                <span className="text-slate-800 font-black text-xl">S/ {totalPagar.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Pagado:</span>
                <span className="text-green-600 font-bold text-lg">S/ {pagado.toFixed(2)}</span>
              </div>
              <div className={`h-px bg-slate-200 ${compact ? 'my-3' : 'my-4'}`} />
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-bold capitalize text-sm">Falta Pagar:</span>
                <span className={`font-black text-2xl ${pendiente <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  S/ {Math.max(0, pendiente).toFixed(2)}
                </span>
              </div>
            </div>
            {pendiente > 0 ? (
              <p className={`text-xs font-bold text-center capitalize ${compact ? 'mt-4' : 'mt-6'} ${condicionPago === 'CREDITO' ? 'text-blue-600' : 'text-red-500'}`}>
                {condicionPago === 'CREDITO'
                  ? 'El saldo pendiente se registrará en cuotas'
                  : 'Debe completar el saldo para continuar'}
              </p>
            ) : (
              <div className={`${compact ? 'mt-4' : 'mt-6'} rounded-lg border border-green-200 bg-green-100 p-3 text-center text-xs font-bold capitalize text-green-700`}>
                Monto Completo
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
