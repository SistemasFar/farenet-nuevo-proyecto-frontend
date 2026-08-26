/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { Tag, CheckCircle2, XCircle, Loader2, User, Search } from 'lucide-react';
import { consultarDescuento, aplicarDescuentoBorrador, quitarDescuentoBorrador, obtenerDescuentoBorrador, autoAplicarDescuentoPlaca } from '../../../../services/faregas-descuentos.api';
import type { ConsultaDescuentoResult } from '../../../../services/faregas-descuentos.api';
import Swal from 'sweetalert2';

interface ConsultaDescuentoProps {
  certificadoId?: number;
  disabled?: boolean;
  onDescuentoChange: (descuento: ConsultaDescuentoResult | null) => void;
}

export function ConsultaDescuento({ certificadoId, disabled, onDescuentoChange }: ConsultaDescuentoProps) {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultadoConsulta, setResultadoConsulta] = useState<ConsultaDescuentoResult | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [aplicado, setAplicado] = useState(false);
  const onChangeRef = useRef(onDescuentoChange);
  useEffect(() => { onChangeRef.current = onDescuentoChange; }, [onDescuentoChange]);
  
  // Si el componente está montado y tenemos un certificadoId, verificar si ya hay un borrador
  useEffect(() => {
    if (!certificadoId) return;
    let cancelado = false;
    
    setLoading(true);
    obtenerDescuentoBorrador(certificadoId)
      .then(async (descuento) => {
        if (cancelado) return;
        if (descuento) {
          setResultadoConsulta(descuento);
          setCodigo(descuento.codigo);
          setAplicado(true);
          onChangeRef.current(descuento);
        } else {
          try {
            const auto = await autoAplicarDescuentoPlaca(certificadoId);
            if (cancelado) return;
            if (auto) {
              setResultadoConsulta(auto);
              setCodigo(auto.codigo);
              setAplicado(true);
              onChangeRef.current(auto);
              Swal.fire({
                icon: 'success',
                title: 'Descuento Automático',
                text: `Se auto-aplicó el código ${auto.codigo} por coincidencia de placa.`,
                timer: 3000,
                showConfirmButton: false
              });
            }
          } catch (e) {
            console.error("Error al auto-aplicar descuento por placa", e);
          }
        }
      })
      .catch(err => console.error("Error al obtener borrador de descuento", err))
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
      
    return () => { cancelado = true; };
  }, [certificadoId]);

  const handleConsultar = async () => {
    if (!codigo.trim()) return;
    if (!certificadoId) {
      Swal.fire('Atención', 'Debe seleccionar un servicio y completar los datos iniciales primero.', 'info');
      return;
    }
    
    setLoading(true);
    setErrorMensaje(null);
    setResultadoConsulta(null);
    
    try {
      const res = await consultarDescuento(codigo.trim().toUpperCase(), certificadoId);
      setResultadoConsulta(res);
      setAplicado(false);
      // No lo aplicamos todavía en DB, solo mostramos el resultado
    } catch (error: unknown) {
      setErrorMensaje(error instanceof Error ? error.message : 'Error al consultar el descuento');
    } finally {
      setLoading(false);
    }
  };

  const handleAplicar = async () => {
    if (!resultadoConsulta || !certificadoId) return;
    
    setLoading(true);
    try {
      const res = await aplicarDescuentoBorrador(certificadoId, resultadoConsulta.codigo);
      setResultadoConsulta(res);
      setAplicado(true);
      onChangeRef.current(res);
      Swal.fire({
        icon: 'success',
        title: 'Descuento Aplicado',
        text: 'El descuento ha sido reservado para esta orden.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo aplicar el descuento';
      Swal.fire('Error', mensaje, 'error');
      setErrorMensaje(mensaje);
    } finally {
      setLoading(false);
    }
  };

  const handleQuitar = async () => {
    if (!certificadoId) return;
    
    setLoading(true);
    try {
      await quitarDescuentoBorrador(certificadoId);
      setResultadoConsulta(null);
      setAplicado(false);
      setCodigo('');
      onChangeRef.current(null);
    } catch (error: unknown) {
      Swal.fire('Error', error instanceof Error ? error.message : 'No se pudo quitar el descuento', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mt-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#052a79]/10 text-[#052a79]">
          <Tag className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">Descuentos y Convenios</h4>
          <p className="text-xs font-semibold text-slate-500">Consulta uno de los códigos vinculados en Administración de Descuentos</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            className="h-[42px] w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 font-bold uppercase text-slate-800 transition-colors focus:border-[#f59e0b] focus:bg-white focus:ring-0 placeholder:normal-case placeholder:font-medium disabled:opacity-50"
            placeholder="Ingresa el código de descuento..."
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            disabled={disabled || loading || aplicado}
          />
        </div>
        <button
          type="button"
          onClick={handleConsultar}
          disabled={disabled || loading || !codigo.trim() || aplicado}
          className="h-[42px] min-w-[140px] rounded-xl bg-[#052a79] px-6 font-bold text-white transition-all hover:bg-[#041c53] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-[#052a79]/20"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span>CONSULTAR</span>
        </button>
      </div>

      {errorMensaje && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 flex items-start gap-3 mt-4 animate-in fade-in">
          <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
          <div className="text-sm font-semibold">{errorMensaje}</div>
        </div>
      )}

      {resultadoConsulta && !errorMensaje && (
        <div className="rounded-xl border-2 border-[#052a79]/20 bg-blue-50/50 p-5 mt-4 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          {/* Decorative background element */}
          <div className="absolute -right-10 -top-10 text-[#052a79]/5 transform rotate-12">
            <Tag className="h-40 w-40" />
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#052a79]/10 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-[#052a79] mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {resultadoConsulta.tipo} VÁLIDO
                </span>
                <h5 className="text-lg font-black text-slate-800">{resultadoConsulta.nombre}</h5>
                {resultadoConsulta.empresaAliada && (
                  <p className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> {resultadoConsulta.empresaAliada}
                  </p>
                )}
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nuevo Total a Pagar</span>
                <span className="text-3xl font-black text-[#052a79]">S/ {resultadoConsulta.importeFinal.toFixed(2)}</span>
                <span className="text-xs font-semibold text-emerald-600 line-through decoration-red-500/50 ml-1">
                  Antes S/ {resultadoConsulta.tarifaOriginal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#052a79]/10 pt-4 mt-2">
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Descuento</span>
                  <span className="text-sm font-black text-emerald-600">- S/ {resultadoConsulta.importeDescuento.toFixed(2)}</span>
                </div>
                {resultadoConsulta.usosDisponibles < 100 && (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Usos Restantes</span>
                    <span className="text-sm font-bold text-slate-700">{resultadoConsulta.usosDisponibles}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                {aplicado ? <button type="button" onClick={handleQuitar} disabled={loading} className="rounded-lg px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">QUITAR</button>
                  : <button type="button" onClick={handleAplicar} disabled={loading} className="rounded-lg bg-[#052a79] px-6 py-2 text-xs font-black text-white hover:bg-[#041c53] shadow-md transition-colors">APLICAR</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
