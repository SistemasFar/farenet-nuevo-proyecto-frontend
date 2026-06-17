
import Select from 'react-select';
import { XCircle } from 'lucide-react';

interface PagoStepProps {
  precioTotal: number;
  montoPendiente: number;
  pagoTab: 'EFECTIVO' | 'TARJETA' | 'BANCO';
  setPagoTab: (tab: 'EFECTIVO' | 'TARJETA' | 'BANCO') => void;
  formPago: any;
  setFormPago: (data: any) => void;
  maestrosPago: any;
  customSelectStyles: any;
  handleAgregarPago: () => void;
  pagosAgregados: any[];
  eliminarPago: (index: number) => void;
}

export function PagoStep({
  precioTotal,
  montoPendiente,
  pagoTab,
  setPagoTab,
  formPago,
  setFormPago,
  maestrosPago,
  customSelectStyles,
  handleAgregarPago,
  pagosAgregados,
  eliminarPago
}: PagoStepProps) {
  return (
    <div className="space-y-6">
      {/* Cabecera de Totales */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-[#f4f9ff] border-2 border-[#052a79] rounded-2xl p-6 text-center shadow-sm">
          <h3 className="text-sm font-black text-[#052a79] uppercase tracking-wider mb-2">Monto Total a Pagar</h3>
          <p className="text-4xl font-black text-[#052a79]">S/ {precioTotal.toFixed(2)}</p>
        </div>
        <div className={`border-2 rounded-2xl p-6 text-center shadow-sm transition-colors ${montoPendiente > 0 ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'}`}>
          <h3 className={`text-sm font-black uppercase tracking-wider mb-2 ${montoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>Monto Pendiente</h3>
          <p className={`text-4xl font-black ${montoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>S/ {montoPendiente.toFixed(2)}</p>
        </div>
      </div>

      {/* Pestañas de Método de Pago */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
        {(['EFECTIVO', 'TARJETA', 'BANCO'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setPagoTab(tab)}
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${pagoTab === tab ? 'bg-white text-[#052a79] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Formulario de Pago */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
        <h3 className="text-sm font-black text-slate-800 uppercase mb-4">Detalles del Pago: {pagoTab}</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {pagoTab === 'TARJETA' && (
            <>
              <div className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo Tarjeta</label>
                <Select
                  options={maestrosPago?.tarjetas?.map((t: any) => ({ value: t.key, label: t.nombre })) || []}
                  value={maestrosPago?.tarjetas?.map((t: any) => ({ value: t.key, label: t.nombre })).find((o: any) => o.value === formPago.tarjetaKey) || null}
                  onChange={(o) => setFormPago({ ...formPago, tarjetaKey: o?.value || '' })}
                  placeholder="Seleccione..."
                  styles={customSelectStyles}
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nro. Operación</label>
                <input type="text" value={formPago.nroOperacion} onChange={(e) => setFormPago({ ...formPago, nroOperacion: e.target.value.replace(/[^0-9]/g, '') })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500" />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Últimos 4 Dígitos</label>
                <input
                  type="text"
                  maxLength={4}
                  value={formPago.digitosTarjeta}
                  onChange={(e) => setFormPago({ ...formPago, digitosTarjeta: e.target.value.replace(/\D/g, '') })}
                  disabled={(() => {
                    const selected = maestrosPago?.tarjetas?.find((t: any) => t.key === formPago.tarjetaKey);
                    if (!selected) return false;
                    const name = selected.nombre.toUpperCase();
                    return name.includes('YAPE') || name.includes('PLIN') || name.includes('CUPONIDAD');
                  })()}
                  className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none ${(() => {
                      const selected = maestrosPago?.tarjetas?.find((t: any) => t.key === formPago.tarjetaKey);
                      if (!selected) return 'focus:border-amber-500';
                      const name = selected.nombre.toUpperCase();
                      return (name.includes('YAPE') || name.includes('PLIN') || name.includes('CUPONIDAD'))
                        ? 'bg-slate-100 cursor-not-allowed opacity-60'
                        : 'focus:border-amber-500'
                    })()
                    }`}
                  placeholder={
                    (() => {
                      const selected = maestrosPago?.tarjetas?.find((t: any) => t.key === formPago.tarjetaKey);
                      if (!selected) return '';
                      const name = selected.nombre.toUpperCase();
                      return (name.includes('YAPE') || name.includes('PLIN') || name.includes('CUPONIDAD'))
                        ? 'N/A'
                        : ''
                    })()
                  }
                />
              </div>
            </>
          )}

          {pagoTab === 'BANCO' && (
            <>
              <div className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Banco (*)</label>
                <Select
                  options={maestrosPago?.entidadesFinancieras?.map((t: any) => ({ value: t.key, label: t.nombre })) || []}
                  value={maestrosPago?.entidadesFinancieras?.map((t: any) => ({ value: t.key, label: t.nombre })).find((o: any) => o.value === formPago.entidadFinancieraKey) || null}
                  onChange={(o) => setFormPago({ ...formPago, entidadFinancieraKey: o?.value || '', cuentaCorrienteKey: '' })}
                  placeholder="Seleccione..."
                  styles={customSelectStyles}
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Cuenta Corriente (*)</label>
                <Select
                  options={maestrosPago?.cuentasCorrientes?.filter((c: any) => c.entidadfinanciera_key === formPago.entidadFinancieraKey).map((t: any) => ({ value: t.key, label: t.nombre })) || []}
                  value={maestrosPago?.cuentasCorrientes?.map((t: any) => ({ value: t.key, label: t.nombre })).find((o: any) => o.value === formPago.cuentaCorrienteKey) || null}
                  onChange={(o) => setFormPago({ ...formPago, cuentaCorrienteKey: o?.value || '' })}
                  placeholder={formPago.entidadFinancieraKey ? "Seleccione cuenta..." : "Elija banco primero"}
                  isDisabled={!formPago.entidadFinancieraKey}
                  styles={customSelectStyles}
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nro. Operación (*)</label>
                <input
                  type="text"
                  maxLength={20}
                  value={formPago.nroOperacion}
                  onChange={(e) => setFormPago({ ...formPago, nroOperacion: e.target.value.replace(/[^0-9]/g, '') })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500"
                />
                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Ingrese el N° indicado en el voucher.</p>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha Depósito (*)</label>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={formPago.fechaDeposito}
                  onChange={(e) => setFormPago({ ...formPago, fechaDeposito: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500"
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5 md:col-span-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Importe (S/) (*)</label>
            <input
              type="text"
              value={formPago.importe}
              onChange={(e) => {
                let val = e.target.value.replace(/[^0-9.]/g, '');
                const parts = val.split('.');
                if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                setFormPago({ ...formPago, importe: val });
              }}
              className="w-full rounded-lg border border-amber-400 bg-amber-50 focus:ring-2 focus:ring-amber-200 px-3 py-2 text-lg font-black text-slate-700 outline-none"
            />
            {pagoTab === 'BANCO' && <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Monto depositado según voucher.</p>}
          </div>

          <div className="md:col-span-1 pt-[21px]">
            <button
              onClick={handleAgregarPago}
              disabled={montoPendiente <= 0}
              className="w-full px-4 py-2.5 rounded-lg font-black text-white bg-[#052a79] hover:bg-blue-900 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed uppercase text-sm h-[42px]"
            >
              AGREGAR
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Pagos Agregados */}
      {pagosAgregados.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-[#f4f9ff] text-[#052a79] text-xs uppercase font-black">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Detalle</th>
                <th className="px-4 py-3 text-right">Importe</th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {pagosAgregados.map((pago, idx) => (
                <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold">{pago.tipo}</td>
                  <td className="px-4 py-3 text-xs">
                    {pago.tipo === 'TARJETA' && `Operación: ${pago.nroOperacion} | Tarjeta: ****${pago.digitosTarjeta}`}
                    {pago.tipo === 'BANCO' && `Operación: ${pago.nroOperacion} | Fecha: ${pago.fechaDeposito}`}
                    {pago.tipo === 'EFECTIVO' && '-'}
                  </td>
                  <td className="px-4 py-3 font-black text-right">S/ {parseFloat(pago.importe).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => eliminarPago(idx)} className="text-red-500 hover:text-red-700">
                      <XCircle className="w-5 h-5 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
