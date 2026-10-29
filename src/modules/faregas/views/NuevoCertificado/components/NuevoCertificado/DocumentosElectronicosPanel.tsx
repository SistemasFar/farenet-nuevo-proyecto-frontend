import { useCallback, useEffect, useState } from 'react';
import { FileMinus2, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import Swal from 'sweetalert2';
import { faregasCertificadosApi } from '../../../../services/faregas-certificados.api';
import { permisosSession } from '@/services/api';
import type { AnulacionElectronicaFaregas, FacturacionFaregas, NotaElectronicaFaregas } from '../../../../types/faregas-api';
import { NotaCreditoModal } from '../../../Inicio/NotaCreditoModal';

interface Props {
  certificadoId: number;
  facturacion: FacturacionFaregas;
  integracionDisponible: boolean;
  soloLectura?: boolean;
}

const mensajeError = (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error inesperado.';

export function DocumentosElectronicosPanel({ certificadoId, facturacion, integracionDisponible, soloLectura = false }: Props) {
  const [notas, setNotas] = useState<NotaElectronicaFaregas[]>([]);
  const [anulaciones, setAnulaciones] = useState<AnulacionElectronicaFaregas[]>([]);
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [ahoraMs, setAhoraMs] = useState(Date.now);
  const [mostrarNota, setMostrarNota] = useState(false);
  const permisos = permisosSession.obtener();
  const tienePermisoNC = permisos.includes('FAREGAS_NOTA_CREDITO');
  const tienePermisoAnular = permisos.includes('FAREGAS_ANULAR_COMPROBANTE');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const response = await faregasCertificadosApi.obtenerDocumentosElectronicos(certificadoId);
      setNotas(response.data?.notas || []);
      setAnulaciones(response.data?.anulaciones || []);
      setAhoraMs(Date.now());
    } catch (error: unknown) {
      await Swal.fire('Documentos electrónicos', mensajeError(error) || 'No se pudo cargar el historial.', 'error');
    } finally { setCargando(false); }
  }, [certificadoId]);

  useEffect(() => {
    const tarea = window.setTimeout(() => { void cargar(); }, 0);
    return () => window.clearTimeout(tarea);
  }, [cargar]);

  useEffect(() => {
    const siguienteVencimiento = [facturacion, ...notas]
      .map((item) => Number(item.anulacionHastaMs))
      .filter((valor) => Number.isFinite(valor) && valor > ahoraMs)
      .sort((a, b) => a - b)[0];
    if (!siguienteVencimiento) return;
    const timer = window.setTimeout(() => setAhoraMs(Date.now()), Math.max(0, siguienteVencimiento - Date.now() + 1));
    return () => window.clearTimeout(timer);
  }, [facturacion, notas, ahoraMs]);

  const consultarComprobante = async () => {
    setProcesando(true);
    try {
      const response = await faregasCertificadosApi.consultarFacturacionElectronica(certificadoId);
      await Swal.fire('Consulta completada', `Estado informado: ${response.data?.estado || 'SIN DATO'}`, 'info');
    } catch (error: unknown) { await Swal.fire('No se pudo consultar', mensajeError(error), 'error'); }
    finally { setProcesando(false); }
  };

  const anular = async (tipoDocumento: 'FACTURACION' | 'CREDITO' | 'DEBITO', documentoId?: number) => {
    const confirmacion = await Swal.fire({
      title: '¿Desea solicitar la anulación del comprobante electrónico?',
      text: 'Esta operación afecta al comprobante fiscal. No anula automáticamente el certificado técnico ni devuelve los pagos registrados.',
      input: 'text', inputLabel: 'Motivo', inputPlaceholder: 'Motivo de la anulación',
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

  const consultarNota = async (item: NotaElectronicaFaregas) => {
    setProcesando(true);
    try {
      await faregasCertificadosApi.consultarNotaElectronica(certificadoId, item.tipo, item.id);
      await cargar();
    } catch (error: unknown) { await Swal.fire('No se pudo consultar', mensajeError(error), 'error'); }
    finally { setProcesando(false); }
  };

  return (
    <section className="mx-auto max-w-4xl space-y-4 rounded-2xl border-2 border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h4 className="font-black text-slate-800">Documentos relacionados</h4><p className="text-sm text-slate-500">Consultas, notas de crédito/débito y anulaciones.</p></div>
        <div className="flex gap-2">
          <button type="button" disabled={soloLectura || procesando || !integracionDisponible} onClick={consultarComprobante} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black disabled:opacity-40"><RefreshCw className="h-4 w-4" /> CONSULTAR</button>
          <button type="button" title={!tienePermisoNC ? 'No tienes permiso para emitir Notas de Crédito' : facturacion.estado === 'ACEPTADO' ? 'Crear una nota vinculada al comprobante aceptado' : 'La nota requiere un comprobante aceptado por SUNAT'} disabled={soloLectura || procesando || !integracionDisponible || facturacion.estado !== 'ACEPTADO' || !tienePermisoNC} onClick={() => setMostrarNota(true)} className="flex items-center gap-2 rounded-lg bg-[#052a79] px-3 py-2 text-xs font-black text-white disabled:bg-slate-300"><FileMinus2 className="h-4 w-4" /> NUEVA NOTA</button>
          <button type="button" title={!tienePermisoAnular ? 'No tiene autorización para anular comprobantes electrónicos' : facturacion.anulacionEnPlazo && Number(facturacion.anulacionHastaMs) > ahoraMs ? 'Anular comprobante electrónico' : 'Plazo vencido: use una nota de crédito'} disabled={soloLectura || procesando || !integracionDisponible || !tienePermisoAnular || facturacion.estado !== 'ACEPTADO' || facturacion.anulacionEnPlazo !== true || Number(facturacion.anulacionHastaMs) <= ahoraMs} onClick={() => anular('FACTURACION')} className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-600 disabled:opacity-40"><RotateCcw className="h-4 w-4" /> ANULAR COMPROBANTE</button>
        </div>
      </div>

      {cargando ? <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div> : <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">DOCUMENTO</th><th className="p-3">MOTIVO</th><th className="p-3">IMPORTE</th><th className="p-3">ESTADO</th><th className="p-3">ACCIONES</th></tr></thead><tbody>
          {notas.map(item => <tr key={`${item.tipo}-${item.id}`} className="border-t"><td className="p-3 font-bold">NOTA DE {item.tipo} · {item.nroComprobante}</td><td className="p-3">{item.sustento}</td><td className="p-3">S/ {item.importeTotal.toFixed(2)}</td><td className="p-3 font-bold">{item.estado}</td><td className="p-3"><div className="flex flex-wrap gap-2">{item.enlacePdf && <a href={item.enlacePdf} target="_blank" rel="noreferrer" className="text-blue-700 underline">PDF</a>}{item.enlaceXml && <a href={item.enlaceXml} target="_blank" rel="noreferrer" className="text-blue-700 underline">XML</a>}{item.enlaceCdr && <a href={item.enlaceCdr} target="_blank" rel="noreferrer" className="text-blue-700 underline">CDR</a>}{!soloLectura && ['PENDIENTE', 'ERROR'].includes(item.estado) && <button type="button" disabled={procesando} onClick={() => void consultarNota(item)} className="text-blue-700 underline disabled:opacity-40">Consultar</button>}{!soloLectura && tienePermisoAnular && item.estado === 'ACEPTADO' && item.anulacionEnPlazo === true && Number(item.anulacionHastaMs) > ahoraMs && <button type="button" onClick={() => anular(item.tipo, item.id)} className="text-red-600 underline">Anular comprobante</button>}</div></td></tr>)}
          {anulaciones.map(item => <tr key={`A-${item.id}`} className="border-t bg-amber-50"><td className="p-3 font-bold">ANULACIÓN · {item.tipoDocumento}</td><td className="p-3">{item.motivo}</td><td className="p-3">—</td><td className="p-3 font-bold">{item.estado}</td><td className="p-3">{!soloLectura && item.estado === 'PENDIENTE' && <button type="button" onClick={() => consultarAnulacion(item.id)} className="text-blue-700 underline">Consultar</button>}</td></tr>)}
          {notas.length === 0 && anulaciones.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Todavía no hay notas ni anulaciones.</td></tr>}
        </tbody></table>
      </div>}
      <NotaCreditoModal
        abierto={!soloLectura && mostrarNota}
        certificadoId={mostrarNota ? certificadoId : null}
        onCerrar={() => setMostrarNota(false)}
        onProcesada={cargar}
      />
    </section>
  );
}
