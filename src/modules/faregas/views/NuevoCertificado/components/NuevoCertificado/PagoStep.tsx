import React from 'react';
import { CreditCard, PlusCircle, Trash2 } from 'lucide-react';

interface PagoStepProps {
  pagoTab: 'EFECTIVO' | 'TARJETA' | 'BANCO';
  setPagoTab: (tab: 'EFECTIVO' | 'TARJETA' | 'BANCO') => void;
  formPago: any;
  setFormPago: (data: any) => void;
  pagosAgregados: any[];
  handleAgregarPago: () => void;
  eliminarPago: (index: number) => void;
  totalPagar: number;
  maestrosPago?: any;
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
  maestrosPago,
}: PagoStepProps) {

  const pagado = pagosAgregados.reduce((sum, p) => sum + parseFloat(p.importe), 0);
  const pendiente = totalPagar - pagado;
  const cuentasFiltradas = (maestrosPago?.cuentasCorrientes || []).filter((cuenta: any) =>
    !formPago.entidadFinancieraKey || cuenta.entidadfinanciera_key === formPago.entidadFinancieraKey
  );
  const tarjetaSeleccionada = (maestrosPago?.tarjetas || []).find((tarjeta: any) => tarjeta.key === formPago.tarjetaKey);
  const tarjetaSinDigitos = ['CUPONIDAD', 'PAGO WEB', 'YAPE', 'PLIN'].some(tipo =>
    String(tarjetaSeleccionada?.nombre || '').toUpperCase().includes(tipo)
  );

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormPago((prev: any) => ({ ...prev, [e.target.name]: e.target.value.toUpperCase() }));
  };

  const agregarMockPago = () => {
    if (!formPago.importe) return;
    handleAgregarPago();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL IZQUIERDO: INGRESAR PAGO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex border-b border-slate-200 bg-slate-50">
              {['EFECTIVO', 'TARJETA', 'BANCO'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPagoTab(tab as any)}
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

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">MONTO (S/)</label>
                  <input type="number" name="importe" value={formPago.importe || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-lg focus:border-[#f59e0b] focus:ring-0" placeholder="0.00" />
                </div>
                {pagoTab !== 'EFECTIVO' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">N° OPERACIÓN / REFERENCIA</label>
                    <input type="text" name="nroOperacion" value={formPago.nroOperacion || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl uppercase font-bold focus:border-[#f59e0b] focus:ring-0" placeholder="EJ: 123456" />
                  </div>
                )}
              </div>

              {pagoTab === 'TARJETA' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">TIPO DE TARJETA</label>
                    <select name="tarjetaKey" value={formPago.tarjetaKey || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl uppercase font-bold focus:border-[#f59e0b] focus:ring-0">
                      <option value="">-- SELECCIONAR --</option>
                      {(maestrosPago?.tarjetas || []).map((tarjeta: any) => (
                        <option key={tarjeta.key} value={tarjeta.key}>{tarjeta.nombre}</option>
                      ))}
                    </select>
                  </div>
                  {!tarjetaSinDigitos && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">ÚLTIMOS 4 DÍGITOS</label>
                      <input type="text" name="digitosTarjeta" value={formPago.digitosTarjeta || ''} onChange={handleInput} maxLength={4} className="w-full p-3 border-2 border-slate-200 rounded-xl uppercase font-bold focus:border-[#f59e0b] focus:ring-0" placeholder="****" />
                    </div>
                  )}
                </div>
              )}

              {pagoTab === 'BANCO' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">ENTIDAD FINANCIERA</label>
                    <select name="entidadFinancieraKey" value={formPago.entidadFinancieraKey || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl uppercase font-bold focus:border-[#f59e0b] focus:ring-0">
                      <option value="">-- SELECCIONAR --</option>
                      {(maestrosPago?.entidadesFinancieras || []).map((entidad: any) => (
                        <option key={entidad.key} value={entidad.key}>{entidad.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">CUENTA CORRIENTE</label>
                    <select name="cuentaCorrienteKey" value={formPago.cuentaCorrienteKey || ''} onChange={handleInput} className="w-full p-3 border-2 border-slate-200 rounded-xl uppercase font-bold focus:border-[#f59e0b] focus:ring-0">
                      <option value="">-- SELECCIONAR --</option>
                      {cuentasFiltradas.map((cuenta: any) => (
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

          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-slate-700 uppercase mb-4">Pagos Registrados</h4>
            {pagosAgregados.length === 0 ? (
              <p className="text-slate-400 text-sm italic">No hay pagos registrados.</p>
            ) : (
              <div className="space-y-3">
                {pagosAgregados.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-800">{p.tipo} {p.tarjetaKey ? `- ${p.tarjetaKey}` : ''}</p>
                      <p className="text-xs text-slate-500 uppercase">{p.nroOperacion ? `Operación: ${p.nroOperacion}` : 'Sin referencia'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-[#052a79] text-lg">S/ {parseFloat(p.importe).toFixed(2)}</span>
                      <button onClick={() => eliminarPago(idx)} className="text-red-400 hover:text-red-600 transition">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: RESUMEN */}
        <div className="lg:col-span-1">
          <div className="bg-[#f4f9ff] border-2 border-[#052a79]/10 rounded-2xl p-6 sticky top-6">
            <h4 className="font-bold text-[#052a79] mb-6 uppercase tracking-wider">Resumen de Cuenta</h4>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Total a pagar:</span>
                <span className="text-slate-800 font-black text-xl">S/ {totalPagar.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Pagado:</span>
                <span className="text-green-600 font-bold text-lg">S/ {pagado.toFixed(2)}</span>
              </div>
              <div className="h-px bg-slate-200 my-4" />
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-bold uppercase text-sm">Falta Pagar:</span>
                <span className={`font-black text-2xl ${pendiente <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  S/ {Math.max(0, pendiente).toFixed(2)}
                </span>
              </div>
            </div>
            {pendiente > 0 ? (
              <p className="text-xs text-red-500 font-bold text-center mt-6 uppercase">Debe completar el saldo para continuar</p>
            ) : (
              <div className="mt-6 bg-green-100 text-green-700 text-xs font-bold p-3 rounded-lg text-center uppercase border border-green-200">
                Monto Completo
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
