import { useCallback, useEffect, useState } from 'react';
import { FileMinus2, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import Swal from 'sweetalert2';
import { faregasCertificadosApi } from '../../../../services/faregas-certificados.api';
import type { AnulacionElectronicaFaregas, FacturacionFaregas, NotaElectronicaFaregas } from '../../../../types/faregas-api';

interface Props {
  certificadoId: number;
  facturacion: FacturacionFaregas;
  integracionDisponible: boolean;
}

const mensajeError = (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error inesperado.';

export function DocumentosElectronicosPanel({ certificadoId, facturacion, integracionDisponible }: Props) {
  const [notas, setNotas] = useState<NotaElectronicaFaregas[]>([]);
  const [anulaciones, setAnulaciones] = useState<AnulacionElectronicaFaregas[]>([]);
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mostrarNota, setMostrarNota] = useState(false);
  const [nota, setNota] = useState({ tipo: 'CREDITO' as 'CREDITO' | 'DEBITO', motivoCodigo: '1', sustento: '', importeTotal: String(facturacion.importeTotal) });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const response = await faregasCertificadosApi.obtenerDocumentosElectronicos(certificadoId);
      setNotas(response.data?.notas || []);
      setAnulaciones(response.data?.anulaciones || []);
    } catch (error: unknown) {
      await Swal.fire('Documentos electrónicos', mensajeError(error) || 'No se pudo cargar el historial.', 'error');
    } finally { setCargando(false); }
  }, [certificadoId]);

  useEffect(() => {
    const tarea = window.setTimeout(() => { void cargar(); }, 0);
    return () => window.clearTimeout(tarea);
  }, [cargar]);

  const consultarComprobante = async () => {
    setProcesando(true);
    try {
      const response = await faregasCertificadosApi.consultarFacturacionElectronica(certificadoId);
      await Swal.fire('Consulta completada', `Estado informado: ${response.data?.estado || 'SIN DATO'}`, 'info');
    } catch (error: unknown) { await Swal.fire('No se pudo consultar', mensajeError(error), 'error'); }
    finally { setProcesando(false); }
  };

  const emitirNota = async () => {
    const total = Number(nota.importeTotal);
    if (!Number.isFinite(total) || total <= 0) return void Swal.fire('Importe inválido', 'Ingrese un importe mayor a cero.', 'warning');
    setProcesando(true);
    try {
      const base = Math.round((total / 1.18) * 100) / 100;
      const igv = Math.round((total - base) * 100) / 100;
      await faregasCertificadosApi.emitirNotaElectronica(certificadoId, { ...nota, baseImponible: base, igv, importeTotal: total });
      setMostrarNota(false);
      await cargar();
      await Swal.fire('Nota procesada', 'Revise su estado en el historial.', 'success');
    } catch (error: unknown) { await Swal.fire('No se emitió la nota', mensajeError(error), 'error'); }
    finally { setProcesando(false); }
  };

  const anular = async (tipoDocumento: 'FACTURACION' | 'CREDITO' | 'DEBITO', documentoId?: number) => {
    const confirmacion = await Swal.fire({
      title: 'Solicitar anulación', input: 'text', inputLabel: 'Motivo', inputPlaceholder: 'Motivo de la anulación',
      showCancelButton: true, confirmButtonText: 'ENVIAR', cancelButtonText: 'CANCELAR',
      inputValidator: value => !value.trim() ? 'El motivo es obligatorio.' : value.length > 100 ? 'Máximo 100 caracteres.' : undefined,
    });
    if (!confirmacion.isConfirmed) return;
    setProcesando(true);
    try {
      await faregasCertificadosApi.generarAnulacionElectronica(certificadoId, { tipoDocumento, documentoId, motivo: confirmacion.value });
      await cargar();
      await Swal.fire('Solicitud enviada', 'La baja puede quedar pendiente; use Consultar hasta obtener la respuesta final.', 'info');
    } catch (error: unknown) { await Swal.fire('No se pudo anular', mensajeError(error), 'error'); }
    finally { setProcesando(false); }
  };

  const consultarAnulacion = async (id: number) => {
    setProcesando(true);
    try { await faregasCertificadosApi.consultarAnulacionElectronica(certificadoId, id); await cargar(); }
    catch (error: unknown) { await Swal.fire('No se pudo consultar', mensajeError(error), 'error'); }
    finally { setProcesando(false); }
  };

  return (
    <section className="mx-auto max-w-4xl space-y-4 rounded-2xl border-2 border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h4 className="font-black text-slate-800">Documentos relacionados</h4><p className="text-sm text-slate-500">Consultas, notas de crédito/débito y anulaciones.</p></div>
        <div className="flex gap-2">
          <button type="button" disabled={procesando || !integracionDisponible} onClick={consultarComprobante} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black disabled:opacity-40"><RefreshCw className="h-4 w-4" /> CONSULTAR</button>
          <button type="button" disabled={procesando || !integracionDisponible} onClick={() => setMostrarNota(!mostrarNota)} className="flex items-center gap-2 rounded-lg bg-[#052a79] px-3 py-2 text-xs font-black text-white disabled:bg-slate-300"><FileMinus2 className="h-4 w-4" /> NUEVA NOTA</button>
          <button type="button" disabled={procesando || !integracionDisponible || facturacion.estado !== 'ACEPTADO'} onClick={() => anular('FACTURACION')} className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-600 disabled:opacity-40"><RotateCcw className="h-4 w-4" /> ANULAR</button>
        </div>
      </div>

      {mostrarNota && <div className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:grid-cols-4">
        <label className="text-xs font-bold">TIPO<select value={nota.tipo} onChange={e => setNota(prev => ({ ...prev, tipo: e.target.value as 'CREDITO' | 'DEBITO' }))} className="mt-1 w-full rounded-lg border bg-white p-2"><option value="CREDITO">CRÉDITO</option><option value="DEBITO">DÉBITO</option></select></label>
        <label className="text-xs font-bold">MOTIVO CÓDIGO<input value={nota.motivoCodigo} onChange={e => setNota(prev => ({ ...prev, motivoCodigo: e.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label>
        <label className="text-xs font-bold">IMPORTE TOTAL<input type="number" step="0.01" value={nota.importeTotal} onChange={e => setNota(prev => ({ ...prev, importeTotal: e.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label>
        <label className="text-xs font-bold md:col-span-4">SUSTENTO<input value={nota.sustento} maxLength={250} onChange={e => setNota(prev => ({ ...prev, sustento: e.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label>
        <button type="button" disabled={procesando} onClick={emitirNota} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-black text-white md:col-start-4">EMITIR NOTA</button>
      </div>}

      {cargando ? <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div> : <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">DOCUMENTO</th><th className="p-3">MOTIVO</th><th className="p-3">IMPORTE</th><th className="p-3">ESTADO</th><th className="p-3">ACCIONES</th></tr></thead><tbody>
          {notas.map(item => <tr key={`${item.tipo}-${item.id}`} className="border-t"><td className="p-3 font-bold">NOTA DE {item.tipo} · {item.nroComprobante}</td><td className="p-3">{item.sustento}</td><td className="p-3">S/ {item.importeTotal.toFixed(2)}</td><td className="p-3 font-bold">{item.estado}</td><td className="p-3"><div className="flex gap-2">{item.enlacePdf && <a href={item.enlacePdf} target="_blank" rel="noreferrer" className="text-blue-700 underline">PDF</a>}{item.estado === 'ACEPTADO' && <button type="button" onClick={() => anular(item.tipo, item.id)} className="text-red-600 underline">Anular</button>}</div></td></tr>)}
          {anulaciones.map(item => <tr key={`A-${item.id}`} className="border-t bg-amber-50"><td className="p-3 font-bold">ANULACIÓN · {item.tipoDocumento}</td><td className="p-3">{item.motivo}</td><td className="p-3">—</td><td className="p-3 font-bold">{item.estado}</td><td className="p-3">{item.estado === 'PENDIENTE' && <button type="button" onClick={() => consultarAnulacion(item.id)} className="text-blue-700 underline">Consultar</button>}</td></tr>)}
          {notas.length === 0 && anulaciones.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Todavía no hay notas ni anulaciones.</td></tr>}
        </tbody></table>
      </div>}
    </section>
  );
}
