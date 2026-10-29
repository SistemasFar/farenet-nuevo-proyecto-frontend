import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, FileMinus2, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { faregasCertificadosApi } from '../../services/faregas-certificados.api';
import type { ContextoNotaCreditoFaregas, NotaElectronicaFaregas } from '../../types/faregas-api';

type MotivoNota = '01' | '02' | '03';

export interface FormularioNotaCredito {
  motivoCodigo: MotivoNota;
  sustento: string;
  solicitudId: number | null;
  itemIndice: number | null;
  descripcionCorregida: string;
}

export interface SolicitudEmisionNotaCredito {
  tipo: 'CREDITO';
  motivoCodigo: MotivoNota;
  sustento: string;
  solicitudId?: number;
  itemIndice?: number;
  descripcionCorregida?: string;
}

export const motivoRequiereSolicitud = (codigo: MotivoNota) => codigo === '01' || codigo === '02';

export const construirSolicitudNotaCredito = (
  formulario: FormularioNotaCredito,
): SolicitudEmisionNotaCredito => {
  const requiereSolicitud = motivoRequiereSolicitud(formulario.motivoCodigo);
  const descripcion = formulario.descripcionCorregida.trim();
  return {
    tipo: 'CREDITO',
    motivoCodigo: formulario.motivoCodigo,
    sustento: formulario.motivoCodigo === '03' ? descripcion : formulario.sustento,
    solicitudId: requiereSolicitud ? formulario.solicitudId || undefined : undefined,
    itemIndice: formulario.motivoCodigo === '03' ? formulario.itemIndice ?? undefined : undefined,
    descripcionCorregida: formulario.motivoCodigo === '03' ? descripcion : undefined,
  };
};

interface Props {
  abierto: boolean;
  certificadoId: number | null;
  permitirMotivosAnulacion?: boolean;
  motivoBloqueoAnulacion?: string;
  onCerrar: () => void;
  onProcesada?: () => void | Promise<void>;
}

const moneda = (valor: number, codigo = 'PEN') => new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: /^[A-Z]{3}$/.test(codigo) ? codigo : 'PEN',
  minimumFractionDigits: 2,
}).format(Number(valor || 0));

const fecha = (valor?: string | null) => {
  if (!valor) return '—';
  const date = new Date(valor);
  return Number.isNaN(date.getTime()) ? valor : date.toLocaleString('es-PE');
};

const mensajeError = (error: unknown) => error instanceof Error
  ? error.message
  : 'No se pudo completar la operación.';

export function NotaCreditoModal({
  abierto,
  certificadoId,
  permitirMotivosAnulacion = true,
  motivoBloqueoAnulacion,
  onCerrar,
  onProcesada,
}: Props) {
  const [contexto, setContexto] = useState<ContextoNotaCreditoFaregas | null>(null);
  const [notas, setNotas] = useState<NotaElectronicaFaregas[]>([]);
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [consultandoId, setConsultandoId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [motivoCodigo, setMotivoCodigo] = useState<MotivoNota>('03');
  const [solicitudId, setSolicitudId] = useState<number | null>(null);
  const [itemIndice, setItemIndice] = useState<number | null>(null);
  const [descripcionCorregida, setDescripcionCorregida] = useState('');
  const [sustento, setSustento] = useState('');

  const cargar = useCallback(async () => {
    if (!certificadoId) return;
    setCargando(true);
    setError('');
    try {
      const [contextoResponse, documentosResponse] = await Promise.all([
        faregasCertificadosApi.obtenerContextoNotaCredito(certificadoId),
        faregasCertificadosApi.obtenerDocumentosElectronicos(certificadoId),
      ]);
      const nuevoContexto = contextoResponse.data;
      const notasCredito = ((documentosResponse.data?.notas || []) as NotaElectronicaFaregas[])
        .filter((nota) => nota.tipo === 'CREDITO');
      const autorizacion = nuevoContexto.autorizaciones.find((item) => item.ejecutablePorUsuario);
      const motivoInicial: MotivoNota = permitirMotivosAnulacion && autorizacion ? '01' : '03';
      setContexto(nuevoContexto);
      setNotas(notasCredito);
      setMotivoCodigo(motivoInicial);
      setSolicitudId(motivoInicial === '03' ? null : autorizacion?.id || null);
      setItemIndice(nuevoContexto.items.length === 1 ? nuevoContexto.items[0].indice : null);
      setDescripcionCorregida('');
      setSustento(motivoInicial === '03' ? '' : autorizacion?.motivo || '');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, [certificadoId, permitirMotivosAnulacion]);

  useEffect(() => {
    if (!abierto) return;
    void cargar();
  }, [abierto, cargar]);

  useEffect(() => {
    if (!abierto) return;
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !procesando) onCerrar();
    };
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [abierto, onCerrar, procesando]);

  const autorizacionesEjecutables = useMemo(
    () => contexto?.autorizaciones.filter((item) => item.ejecutablePorUsuario) || [],
    [contexto],
  );
  const motivoSeleccionado = contexto?.motivos.find((motivo) => motivo.codigo === motivoCodigo);
  const solicitudSeleccionada = contexto?.autorizaciones.find((item) => item.id === solicitudId) || null;
  const requiereSolicitud = motivoRequiereSolicitud(motivoCodigo);
  const puedeEmitir = Boolean(
    contexto
    && !procesando
    && (!requiereSolicitud || (permitirMotivosAnulacion && solicitudSeleccionada?.ejecutablePorUsuario))
    && (motivoCodigo !== '03' || (itemIndice !== null && descripcionCorregida.trim().length >= 5)),
  );

  const seleccionarMotivo = (codigo: MotivoNota) => {
    setMotivoCodigo(codigo);
    if (codigo === '03') {
      setSolicitudId(null);
      setSustento('');
      return;
    }
    const autorizacion = autorizacionesEjecutables[0];
    setSolicitudId(autorizacion?.id || null);
    setSustento(autorizacion?.motivo || '');
  };

  const seleccionarSolicitud = (id: number | null) => {
    const seleccionada = contexto?.autorizaciones.find((item) => item.id === id);
    setSolicitudId(id);
    setSustento(seleccionada?.motivo || '');
  };

  const emitir = async () => {
    if (!certificadoId || !contexto || !puedeEmitir) return;
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Emitir la nota de crédito?',
      text: `${motivoCodigo} — ${motivoSeleccionado?.descripcion || ''}. El documento se enviará a NubeFact y puede quedar pendiente de confirmación SUNAT.`,
      showCancelButton: true,
      confirmButtonText: 'EMITIR AHORA',
      cancelButtonText: 'REVISAR',
      confirmButtonColor: '#052A79',
    });
    if (!confirmacion.isConfirmed) return;

    setProcesando(true);
    setError('');
    try {
      const response = await faregasCertificadosApi.emitirNotaElectronica(certificadoId, construirSolicitudNotaCredito({
        motivoCodigo,
        sustento,
        solicitudId,
        itemIndice,
        descripcionCorregida,
      }));
      const resultado = response.data as NotaElectronicaFaregas & { idempotente?: boolean };
      await cargar();
      await onProcesada?.();
      await Swal.fire({
        icon: resultado.estado === 'ACEPTADO' ? 'success' : 'info',
        title: resultado.idempotente ? 'Nota ya registrada' : 'Nota procesada',
        text: `${resultado.nroComprobante || 'Serie y correlativo reservados'} · Estado: ${resultado.estado}.`,
        confirmButtonColor: '#052A79',
      });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setProcesando(false);
    }
  };

  const consultarNota = async (nota: NotaElectronicaFaregas) => {
    if (!certificadoId || consultandoId !== null) return;
    setConsultandoId(nota.id);
    setError('');
    try {
      await faregasCertificadosApi.consultarNotaElectronica(certificadoId, nota.tipo, nota.id);
      await cargar();
      await onProcesada?.();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setConsultandoId(null);
    }
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-3 md:p-6" role="dialog" aria-modal="true" aria-labelledby="nota-credito-titulo">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 bg-[#052A79] px-5 py-4 text-white">
          <div className="flex gap-3">
            <span className="rounded-xl bg-white/15 p-2"><FileMinus2 className="h-5 w-5" /></span>
            <div>
              <h2 id="nota-credito-titulo" className="font-black">Nueva nota de crédito electrónica</h2>
              <p className="text-xs text-blue-100">Datos fiscales obtenidos del comprobante original.</p>
            </div>
          </div>
          <button type="button" aria-label="Cerrar" disabled={procesando} onClick={onCerrar} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </header>

        <div className="overflow-y-auto p-4 md:p-6">
          {cargando && !contexto ? <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-600"><Loader2 className="h-6 w-6 animate-spin text-[#052A79]" /> Cargando comprobante original…</div> : null}
          {error && <div className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"><AlertTriangle className="h-5 w-5 shrink-0" /> {error}</div>}

          {contexto && <div className="space-y-5">
            <section className="rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-xs font-bold text-slate-500">COMPROBANTE ORIGINAL</p>
                  <p className="font-black text-slate-900">{contexto.comprobante.tipo} {contexto.comprobante.nroComprobante}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {contexto.comprobante.enlaces.pdf && <a href={contexto.comprobante.enlaces.pdf} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border bg-white px-3 py-2 font-bold text-blue-700">PDF <ExternalLink className="h-3 w-3" /></a>}
                  {contexto.comprobante.enlaces.xml && <a href={contexto.comprobante.enlaces.xml} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border bg-white px-3 py-2 font-bold text-blue-700">XML <ExternalLink className="h-3 w-3" /></a>}
                  {contexto.comprobante.enlaces.cdr && <a href={contexto.comprobante.enlaces.cdr} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border bg-white px-3 py-2 font-bold text-blue-700">CDR <ExternalLink className="h-3 w-3" /></a>}
                </div>
              </div>
              <div className="grid gap-3 p-4 text-sm md:grid-cols-4">
                <div><p className="text-xs font-bold text-slate-500">FECHA DE EMISIÓN</p><p>{contexto.comprobante.fechaEmision}</p></div>
                <div><p className="text-xs font-bold text-slate-500">MONEDA</p><p>{contexto.comprobante.moneda}</p></div>
                <div className="md:col-span-2"><p className="text-xs font-bold text-slate-500">CLIENTE</p><p className="font-bold">{contexto.comprobante.cliente.nombreRazonSocial}</p><p className="text-slate-500">{contexto.comprobante.cliente.tipoDocumento}: {contexto.comprobante.cliente.numeroDocumento}</p></div>
              </div>
              <div className="overflow-x-auto border-t">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">CÓDIGO</th><th className="p-3">DESCRIPCIÓN ORIGINAL</th><th className="p-3 text-right">CANT.</th><th className="p-3">UM</th><th className="p-3 text-right">V. UNIT.</th><th className="p-3 text-right">DSCTO.</th><th className="p-3 text-right">IGV</th><th className="p-3 text-right">TOTAL</th></tr></thead>
                  <tbody>{contexto.items.map((item) => <tr key={item.indice} className="border-t"><td className="p-3">{item.codigo || '—'}</td><td className="p-3 font-semibold">{item.descripcion}</td><td className="p-3 text-right">{item.cantidad}</td><td className="p-3">{item.unidad}</td><td className="p-3 text-right">{moneda(item.valorUnitario, contexto.comprobante.moneda)}</td><td className="p-3 text-right">{moneda(item.descuento, contexto.comprobante.moneda)}</td><td className="p-3 text-right">{moneda(item.igv, contexto.comprobante.moneda)}</td><td className="p-3 text-right font-bold">{moneda(item.total, contexto.comprobante.moneda)}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="grid gap-2 border-t bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <div><p className="text-xs text-slate-500">DESCUENTO</p><p className="font-bold">{moneda(contexto.comprobante.totales.descuento, contexto.comprobante.moneda)}</p></div>
                <div><p className="text-xs text-slate-500">BASE GRAVADA</p><p className="font-bold">{moneda(contexto.comprobante.totales.gravada, contexto.comprobante.moneda)}</p></div>
                <div><p className="text-xs text-slate-500">INAFECTA / EXONERADA</p><p className="font-bold">{moneda(contexto.comprobante.totales.inafecta + contexto.comprobante.totales.exonerada, contexto.comprobante.moneda)}</p></div>
                <div><p className="text-xs text-slate-500">IGV</p><p className="font-bold">{moneda(contexto.comprobante.totales.igv, contexto.comprobante.moneda)}</p></div>
                <div><p className="text-xs text-slate-500">TOTAL</p><p className="text-lg font-black text-[#052A79]">{moneda(contexto.comprobante.totales.total, contexto.comprobante.moneda)}</p></div>
              </div>
            </section>

            <section className="grid gap-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4 md:grid-cols-2">
              <label className="text-xs font-black text-slate-700">MOTIVO SUNAT
                <select value={motivoCodigo} onChange={(event) => seleccionarMotivo(event.target.value as MotivoNota)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm">
                  {contexto.motivos.filter((motivo) => permitirMotivosAnulacion || motivo.codigo === '03').map((motivo) => <option key={motivo.codigo} value={motivo.codigo}>{motivo.codigo} — {motivo.descripcion}</option>)}
                </select>
              </label>

              {requiereSolicitud ? <label className="text-xs font-black text-slate-700">SOLICITUD ADMINISTRATIVA APROBADA
                <select value={solicitudId || ''} onChange={(event) => seleccionarSolicitud(event.target.value ? Number(event.target.value) : null)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm">
                  <option value="">Seleccione una autorización</option>
                  {autorizacionesEjecutables.map((item) => <option key={item.id} value={item.id}>Solicitud #{item.id} · {item.estado}</option>)}
                </select>
              </label> : <label className="text-xs font-black text-slate-700">LÍNEA A CORREGIR
                <select value={itemIndice ?? ''} onChange={(event) => setItemIndice(event.target.value === '' ? null : Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm">
                  <option value="">Seleccione una línea</option>
                  {contexto.items.map((item) => <option key={item.indice} value={item.indice}>{item.codigo || item.indice + 1} — {item.descripcion}</option>)}
                </select>
              </label>}

              {requiereSolicitud ? <div className="md:col-span-2">
                {!permitirMotivosAnulacion && <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-800">{motivoBloqueoAnulacion || 'Este trámite no permite una nota por anulación.'}</p>}
                {solicitudSeleccionada ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm"><p className="flex items-center gap-2 font-black text-emerald-800"><ShieldCheck className="h-4 w-4" /> Solicitud #{solicitudSeleccionada.id} aprobada</p><p className="mt-1 text-emerald-900">{solicitudSeleccionada.motivo}</p><p className="mt-1 text-xs text-emerald-700">Solicitó: {solicitudSeleccionada.usuarioSolicitante} · Aprobó: {solicitudSeleccionada.usuarioDecision || '—'}</p></div> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">No existe una solicitud aprobada y ejecutable para este comprobante.</div>}
              </div> : <>
                <div className="md:col-span-2 rounded-lg border bg-white p-3 text-sm"><p className="text-xs font-bold text-slate-500">DESCRIPCIÓN ORIGINAL</p><p>{contexto.items.find((item) => item.indice === itemIndice)?.descripcion || 'Seleccione una línea.'}</p></div>
                <label className="text-xs font-black text-slate-700 md:col-span-2">NUEVA DESCRIPCIÓN
                  <textarea value={descripcionCorregida} onChange={(event) => setDescripcionCorregida(event.target.value)} maxLength={250} rows={3} placeholder="Escriba la descripción correcta que aparecerá en la nota" className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal" />
                  <span className="mt-1 block text-right font-normal text-slate-500">{descripcionCorregida.length}/250</span>
                </label>
              </>}
            </section>

            <section className="rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b px-4 py-3"><div><h3 className="font-black text-slate-800">Historial de notas</h3><p className="text-xs text-slate-500">Consultar no vuelve a emitir el documento.</p></div><button type="button" disabled={cargando} onClick={() => void cargar()} className="rounded-lg border p-2 text-blue-700 disabled:opacity-40" title="Actualizar"><RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} /></button></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">NOTA</th><th className="p-3">MOTIVO</th><th className="p-3">ESTADO</th><th className="p-3">DOCUMENTOS</th><th className="p-3">ACCIÓN</th></tr></thead><tbody>
                {notas.map((nota) => <tr key={nota.id} className="border-t"><td className="p-3 font-bold">{nota.nroComprobante || `Reserva #${nota.id}`}<p className="mt-1 font-normal text-slate-500">{fecha(nota.fechaEmision)} · {nota.usuarioEmisor || '—'}</p></td><td className="p-3">{nota.motivoCodigo} · {nota.sustento}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1 font-bold">{nota.estado}</span>{nota.sunatDescription && <p className="mt-1 max-w-xs text-slate-500">{nota.sunatDescription}</p>}</td><td className="p-3"><div className="flex gap-2">{nota.enlacePdf && <a href={nota.enlacePdf} target="_blank" rel="noreferrer" className="font-bold text-blue-700">PDF</a>}{nota.enlaceXml && <a href={nota.enlaceXml} target="_blank" rel="noreferrer" className="font-bold text-blue-700">XML</a>}{nota.enlaceCdr && <a href={nota.enlaceCdr} target="_blank" rel="noreferrer" className="font-bold text-blue-700">CDR</a>}</div></td><td className="p-3">{['PENDIENTE', 'ERROR'].includes(nota.estado) && <button type="button" disabled={consultandoId !== null} onClick={() => void consultarNota(nota)} className="flex items-center gap-1 font-bold text-blue-700 disabled:opacity-40">{consultandoId === nota.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Consultar</button>}</td></tr>)}
                {notas.length === 0 && <tr><td colSpan={5} className="p-5 text-center text-slate-500">No hay notas de crédito registradas.</td></tr>}
              </tbody></table></div>
            </section>
          </div>}
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t bg-slate-50 px-5 py-4">
          <button type="button" disabled={procesando} onClick={onCerrar} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Cerrar</button>
          <button type="button" disabled={!puedeEmitir} onClick={() => void emitir()} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">{procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileMinus2 className="h-4 w-4" />} {procesando ? 'EMITIENDO…' : 'EMITIR NOTA DE CRÉDITO'}</button>
        </footer>
      </div>
    </div>
  );
}
