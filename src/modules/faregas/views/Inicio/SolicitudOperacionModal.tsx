import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardX, Loader2, PlayCircle, RefreshCw, ShieldAlert, X } from 'lucide-react';
import Swal from 'sweetalert2';
import {
  faregasSolicitudesOperacionApi,
  etiquetaEstadoFiscal,
  etiquetaEstadoSolicitudDetallado,
  etiquetaEstadoTecnico,
  etiquetaOperacionFiscal,
  etiquetaResultadoFiscal,
  etiquetaTipoSolicitud,
  type ContextoSolicitudOperacion,
  type ResultadoAprobarYEjecutar,
  type SolicitudOperacion,
} from '../../services/faregas-solicitudes-operacion.api';

interface Props {
  certificadoId: number | null;
  abierto: boolean;
  onCerrar: () => void;
  onCreada?: (solicitud: SolicitudOperacion) => void;
  solicitudId?: number | null;
  tipoSolicitudInicial?: 'ANULAR_AMBOS' | 'EMITIR_NOTA_CREDITO';
  motivoNotaCredito?: '01' | '02' | '03' | null;
  motivoNotaCreditoItemIndice?: number | null;
  motivoNotaCreditoDescripcion?: string;
}

const crearIdempotencia = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (letra) => {
      const numero = Math.floor(Math.random() * 16);
      const valor = letra === 'x' ? numero : ((numero & 0x3) | 0x8);
      return valor.toString(16);
    })
);

const claseEstadoSolicitudDetalle = (estado: SolicitudOperacion['estado']) => (
  estado === 'APROBADA'
    ? 'border-blue-200 bg-blue-50 text-blue-800'
    : estado === 'RECHAZADA' || estado === 'ERROR'
      ? 'border-red-200 bg-red-50 text-red-700'
      : estado === 'CANCELADA'
        ? 'border-slate-200 bg-slate-100 text-slate-600'
        : estado === 'COMPLETADA'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-800'
);

const mostrar = (valor: unknown) => {
  if (valor === undefined || valor === null || String(valor).trim() === '') return '-';
  return String(valor);
};

export function SolicitudOperacionModal({
  certificadoId,
  abierto,
  onCerrar,
  onCreada,
  solicitudId,
  tipoSolicitudInicial = 'ANULAR_AMBOS',
  motivoNotaCredito = null,
  motivoNotaCreditoItemIndice = null,
  motivoNotaCreditoDescripcion = '',
}: Props) {
  const [contexto, setContexto] = useState<ContextoSolicitudOperacion | null>(null);
  const [solicitud, setSolicitud] = useState<SolicitudOperacion | null>(null);
  const [motivo, setMotivo] = useState('');
  const [idempotencia, setIdempotencia] = useState(crearIdempotencia);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<SolicitudOperacion | null>(null);
  const [procesando, setProcesando] = useState(false);
  const esSolicitudNotaCreditoInicial = tipoSolicitudInicial === 'EMITIR_NOTA_CREDITO';
  const esSolicitudNotaCredito = esSolicitudNotaCreditoInicial
    || solicitud?.tipoOperacion === 'EMITIR_NOTA_CREDITO';

  useEffect(() => {
    if (!abierto) {
      setContexto(null);
      setSolicitud(null);
      setMotivo('');
      setResultado(null);
      setError('');
      setIdempotencia(crearIdempotencia());
      setCargando(false);
      return;
    }
    if (solicitudId) {
      setContexto(null);
      setSolicitud(null);
      setResultado(null);
      setError('');
      setCargando(true);
      faregasSolicitudesOperacionApi.obtener(solicitudId)
        .then(setSolicitud)
        .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la solicitud.'))
        .finally(() => setCargando(false));
      return;
    }
    if (!certificadoId) return;
    setSolicitud(null);
    setResultado(null);
    setError('');
    setIdempotencia(crearIdempotencia());
    setMotivo(esSolicitudNotaCreditoInicial && motivoNotaCredito
      ? `${motivoNotaCredito} - Solicitud de autorización para emitir nota de crédito`
      : '');
    setCargando(true);
    faregasSolicitudesOperacionApi.contexto(certificadoId)
      .then(setContexto)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el certificado.'))
      .finally(() => setCargando(false));
  }, [abierto, certificadoId, solicitudId, esSolicitudNotaCreditoInicial, motivoNotaCredito]);

  if (!abierto) return null;

  const detalle = solicitud?.detalle;
  const ejecucion = detalle?.ejecucion;
  const estadoFiscal = detalle?.estadoFiscalActual;
  const resolucionFiscal = detalle?.resolucionFiscal;
  const puedeEjecutar = ejecucion?.puedeEjecutar === true;
  const esAutoejecucion = ejecucion?.esAutoejecucion === true;
  const puedeAprobar = detalle?.puedeAprobarYEjecutar === true;
  const esAutoaprobacion = detalle?.esAutoaprobacion === true;
  const esPendienteAnulacion = solicitud?.tipoOperacion === 'ANULAR_AMBOS' && solicitud?.estado === 'PENDIENTE_APROBACION';
  const ultimaAnulacion = estadoFiscal?.anulaciones?.[0];
  const ultimaNota = estadoFiscal?.notasCredito?.[0];
  const bloqueoAnulacionContexto = Boolean(contexto && (
    contexto.puedeSolicitarAnulacionTotal === false
    || contexto.certificado.anulacionImporteCero === true
    || contexto.certificado.anulacionImporteNoDeterminable === true
  ));
  const mensajeBloqueoAnulacion = contexto?.motivoBloqueoAnulacion
    || (contexto?.certificado.anulacionImporteCero === true
      ? 'Este certificado tiene un importe final de S/ 0.00 y no admite anulación.'
      : 'No se pudo determinar el importe final del certificado; la anulación está bloqueada hasta regularizar el importe.');

  const sincronizarEstadoFiscal = async () => {
    if (!solicitud?.certificadoId || solicitud.tipoOperacion !== 'ANULAR_AMBOS') return;
    setProcesando(true);
    try {
      await faregasSolicitudesOperacionApi.sincronizarAnulacionTotal(solicitud.id, solicitud.version);
      const actualizada = await faregasSolicitudesOperacionApi.obtener(solicitud.id);
      setSolicitud(actualizada);
      onCreada?.(actualizada);
      await Swal.fire('Estado de la baja actualizado', 'Se consultó la misma operación fiscal, sin generar una baja duplicada.', 'success');
    } catch (err) {
      await Swal.fire('No se pudo sincronizar', err instanceof Error ? err.message : 'Intente nuevamente.', 'error');
    } finally {
      setProcesando(false);
    }
  };

  const aprobarYEjecutarAnulacion = async () => {
    if (!solicitud || procesando) return;
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: esAutoaprobacion ? '¿Autoaprobar y ejecutar anulación total?' : '¿Aprobar y ejecutar anulación total?',
      html: `<div style="text-align:left;font-size:13px;line-height:1.55">
        <p>Esta acción <strong>registrará la aprobación</strong> y <strong>ejecutará inmediatamente</strong> la anulación total, sin requerir un segundo paso.</p>
        <p>Se consultará <strong>NubeFact</strong> para determinar el mecanismo fiscal aplicable. La anulación técnica del certificado seguirá su procedimiento independiente.</p>
        ${esAutoaprobacion ? '<p><strong>Autoaprobación y autoejecución excepcionales:</strong> usted es el solicitante; la operación quedará auditada con la justificación registrada.</p>' : ''}
      </div>`,
      input: esAutoaprobacion ? 'textarea' : undefined,
      inputLabel: esAutoaprobacion ? 'Justificación obligatoria de la autoejecución' : undefined,
      inputPlaceholder: esAutoaprobacion ? 'Sustento de la excepción autorizada' : undefined,
      inputValidator: esAutoaprobacion
        ? (valor: string) => (!String(valor || '').trim() ? 'La autoejecución exige una justificación.' : undefined)
        : undefined,
      showCancelButton: true,
      confirmButtonText: esAutoaprobacion ? 'Sí, autoaprobar y ejecutar' : 'Sí, aprobar y ejecutar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#047857',
    });
    if (!confirmacion.isConfirmed) return;
    setProcesando(true);
    try {
      const resultado: ResultadoAprobarYEjecutar = await faregasSolicitudesOperacionApi.aprobarYEjecutarAnulacionTotal(
        solicitud.id,
        {
          version: solicitud.version,
          justificacion: String(confirmacion.value || '').trim() || undefined,
          ...(esAutoaprobacion ? { confirmarAutoaprobacion: true, confirmarAutoejecucion: true } : {}),
        }
      );
      const actualizada = await faregasSolicitudesOperacionApi.obtener(solicitud.id);
      setSolicitud(actualizada);
      onCreada?.(actualizada);
      if (resultado.ejecucionFallida) {
        await Swal.fire({
          icon: 'info',
          title: 'Aprobación registrada — ejecución pendiente',
          html: `<div style="text-align:left;font-size:13px;line-height:1.6">
            <p>La solicitud quedó <strong>aprobada</strong>, pero la ejecución no pudo completarse en este intento.</p>
            ${resultado.codigoError ? `<p><strong>Código:</strong> ${String(resultado.codigoError)}</p>` : ''}
            <p>La operación quedó registrada para recuperación controlada. Puede reintentar la ejecución desde este detalle o desde la vista de solicitudes.</p>
          </div>`,
        });
        return;
      }
      if (!resultado.ejecucionIniciada) {
        await Swal.fire('Aprobación registrada', 'La solicitud fue aprobada, pero la ejecución no se inició. Revise el detalle para continuar.', 'info');
        return;
      }
      const fiscal = resultado.resultadoFiscal as Record<string, unknown> | null;
      const tecnico = resultado.resultadoTecnico as Record<string, unknown> | null;
      await Swal.fire({
        icon: resultado.completada ? 'success' : 'info',
        title: resultado.completada ? 'Anulación total completada' : 'Aprobación y ejecución registradas',
        html: `<div style="text-align:left;font-size:13px;line-height:1.6">
          <p><strong>Fiscal:</strong> ${String(fiscal?.estado || 'Sin resultado')}${fiscal?.tipoOperacion ? ` · ${String(fiscal.tipoOperacion)}` : ''}</p>
          <p><strong>Técnico:</strong> ${String(tecnico?.estado || 'Sin resultado')}</p>
          ${resultado.requiereIntervencion ? '<p>La solicitud requiere intervención para completar el procedimiento fiscal o técnico pendiente. No se declaró una anulación que NubeFact/SUNAT no haya confirmado.</p>' : ''}
        </div>`,
      });
    } catch (err) {
      await Swal.fire('No se pudo procesar', err instanceof Error ? err.message : 'Intente nuevamente.', 'error');
    } finally {
      setProcesando(false);
    }
  };

  const ejecutarAnulacion = async () => {
    if (!solicitud) return;
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: esAutoejecucion ? 'Autoejecución excepcional' : '¿Ejecutar anulación total?',
      html: `<div style="text-align:left;font-size:13px;line-height:1.5">
        <p>Se consultará <strong>NubeFact DEMO</strong> para confirmar el estado fiscal y se aplicará la operación que determine el resolvedor: <strong>${etiquetaOperacionFiscal(resolucionFiscal?.operacion)}</strong>.</p>
        <p>${resolucionFiscal?.resultado === 'PENDIENTE_VERIFICACION'
          ? 'El estado aún no permite decidir con evidencia suficiente. No se enviará una baja ni una nota ficticia; primero se verificará el CDR o el resumen diario.'
          : 'Solo se enviará una operación si el comprobante es elegible. La solicitud no se declarará anulada con un HTTP 200 ni con un ticket pendiente.'}</p>
        ${esAutoejecucion ? '<p><strong>Autoejecución excepcional:</strong> usted es el solicitante y la operación quedará registrada de forma inmutable en auditoría.</p>' : ''}
      </div>`,
      input: 'textarea',
      inputLabel: esAutoejecucion ? 'Justificación obligatoria de la autoejecución' : 'Justificación (opcional)',
      inputPlaceholder: 'Sustento de la ejecución fiscal',
      inputValidator: esAutoejecucion
        ? (valor: string) => (!String(valor || '').trim() ? 'La autoejecución exige una justificación.' : undefined)
        : undefined,
      showCancelButton: true,
      confirmButtonText: esAutoejecucion ? 'Sí, autoejecutar' : 'Ejecutar en NubeFact',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#b45309',
    });
    if (!confirmacion.isConfirmed) return;
    if (esAutoejecucion) {
      const doble = await Swal.fire({
        icon: 'warning',
        title: 'Confirmar autoejecución excepcional',
        text: 'Confirmo que soy el solicitante, que cuento con el permiso FAREGAS_SOLICITUD_AUTOEJECUTAR y que autorizo ejecutar mi propia solicitud con la justificación registrada.',
        showCancelButton: true,
        confirmButtonText: 'Sí, confirmar autoejecución',
        cancelButtonText: 'Volver',
        confirmButtonColor: '#b45309',
      });
      if (!doble.isConfirmed) return;
    }

    setProcesando(true);
    try {
      const resultadoEjecucion = await faregasSolicitudesOperacionApi.ejecutarAnulacionTotal(solicitud.id, {
        version: solicitud.version,
        justificacion: String(confirmacion.value || '').trim() || undefined,
        ...(esAutoejecucion ? { confirmarAutoejecucion: true } : {}),
      });
      const actualizada = await faregasSolicitudesOperacionApi.obtener(solicitud.id);
      setSolicitud(actualizada);
      onCreada?.(actualizada);
      const fiscal = resultadoEjecucion.resultadoFiscal;
      const tecnico = resultadoEjecucion.resultadoTecnico;
      await Swal.fire({
        icon: resultadoEjecucion.completada ? 'success' : 'info',
        title: resultadoEjecucion.completada ? 'Anulación total completada' : 'Ejecución registrada',
        html: `<div style="text-align:left;font-size:13px;line-height:1.6">
          <p><strong>Fiscal:</strong> ${String(fiscal?.estado || 'Sin resultado')}${fiscal?.tipoOperacion ? ` · ${String(fiscal.tipoOperacion)}` : ''}</p>
          <p><strong>Resolución:</strong> ${etiquetaResultadoFiscal(String((fiscal?.resolucionFiscal as Record<string, unknown> | undefined)?.resultado || ''))} · ${etiquetaOperacionFiscal(String(fiscal?.tipoOperacion || (fiscal?.resolucionFiscal as Record<string, unknown> | undefined)?.operacion || ''))}</p>
          ${fiscal?.ticketSunat ? `<p><strong>Ticket NubeFact:</strong> ${String(fiscal.ticketSunat)}</p>` : ''}
          <p><strong>Técnico:</strong> ${etiquetaEstadoTecnico(String(tecnico?.estado || ''))}</p>
          ${resultadoEjecucion.requiereIntervencion ? '<p>La solicitud requiere intervención. No se declaró una anulación fiscal que NubeFact/SUNAT no haya confirmado.</p>' : ''}
        </div>`,
      });
    } catch (err) {
      await Swal.fire('No se pudo ejecutar', err instanceof Error ? err.message : 'Intente nuevamente.', 'error');
    } finally {
      setProcesando(false);
    }
  };

  const enviar = async () => {
    if (!esSolicitudNotaCredito && bloqueoAnulacionContexto) {
      setError(mensajeBloqueoAnulacion);
      return;
    }
    if (!certificadoId || !motivo.trim()) {
      setError('Ingrese el motivo obligatorio de la anulación total.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const respuesta = await faregasSolicitudesOperacionApi.crear({
        certificadoId,
        tipoOperacion: esSolicitudNotaCredito ? 'EMITIR_NOTA_CREDITO' : 'ANULAR_AMBOS',
        motivo: motivo.trim(),
        datosPropuestos: esSolicitudNotaCredito && motivoNotaCredito
          ? {
              motivoCodigo: motivoNotaCredito,
              ...(motivoNotaCredito === '03' ? {
                itemIndice: motivoNotaCreditoItemIndice,
                descripcionCorregida: motivoNotaCreditoDescripcion,
              } : {}),
            }
          : undefined,
        idempotenciaClave: idempotencia,
      });
      setResultado(respuesta.data);
      onCreada?.(respuesta.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la solicitud.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3" role="dialog" aria-modal="true" aria-labelledby="solicitud-anulacion-total-titulo">
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between bg-[#052A79] px-5 py-4 text-white">
          <div>
            <h2 id="solicitud-anulacion-total-titulo" className="text-lg font-bold">{solicitud
              ? 'Detalle de la solicitud'
              : esSolicitudNotaCredito
                ? 'Solicitar autorización para nota de crédito'
                : 'Solicitar anulación total'}</h2>
            <p className="text-xs text-blue-100">{solicitud
              ? 'Detalle, aprobación y trazabilidad de la solicitud administrativa.'
              : esSolicitudNotaCredito
                ? 'La aprobación autoriza la emisión desde FAREGAS; no anula el certificado ni envía una baja.'
                : 'Registra la solicitud; no se anulará ni modificará ningún documento hasta su aprobación y ejecución.'}</p>
          </div>
          <button type="button" onClick={onCerrar} className="rounded p-1 hover:bg-white/10" aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="space-y-4 p-5">
          {cargando && <div className="flex items-center justify-center gap-2 py-12 text-slate-600"><Loader2 className="animate-spin" /> Cargando documentos asociados...</div>}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

          {resultado && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
              <div className="font-bold">Solicitud #{resultado.id} registrada</div>
              <p className="text-sm">Quedó en estado <strong>PENDIENTE DE APROBACIÓN</strong>. No se anuló ni modificó ningún documento.</p>
              <button type="button" onClick={onCerrar} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Cerrar</button>
            </div>
          )}

          {!cargando && solicitud && !resultado && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-2">
                <div><span className="block text-xs font-semibold text-slate-500">SOLICITANTE</span><strong>{solicitud.usuarioSolicitante}</strong></div>
                <div><span className="block text-xs font-semibold text-slate-500">SEDE</span>{solicitud.plantaNombre || solicitud.plantaKey}</div>
                <div><span className="block text-xs font-semibold text-slate-500">CERTIFICADO</span>{solicitud.numeroCertificado || '-'}</div>
                <div><span className="block text-xs font-semibold text-slate-500">COMPROBANTE</span>{solicitud.nroComprobante || 'No aplica'}</div>
                <div><span className="block text-xs font-semibold text-slate-500">OPERACIÓN</span>{etiquetaTipoSolicitud(solicitud.tipoOperacion)}</div>
                <div><span className="block text-xs font-semibold text-slate-500">FECHA SOLICITUD</span>{new Date(solicitud.fechaSolicitud).toLocaleString('es-PE')}</div>
                <div><span className="block text-xs font-semibold text-slate-500">ESTADO</span><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${claseEstadoSolicitudDetalle(solicitud.estado)}`}>{etiquetaEstadoSolicitudDetallado(solicitud)}</span></div>
                <div><span className="block text-xs font-semibold text-slate-500">IMPORTE FINAL</span>{solicitud.importeFinal === null || solicitud.importeFinal === undefined ? '-' : `${solicitud.monedaImporteFinal || 'PEN'} ${Number(solicitud.importeFinal).toFixed(2)}`}</div>
              </div>

              {detalle?.bloqueoImporte && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                  <strong>Anulación bloqueada:</strong> {detalle.bloqueoImporte.motivo}
                </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <h4 className="mb-2 text-xs font-bold uppercase text-slate-600">Estado de ejecución</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  <div><span className="block text-xs font-semibold text-slate-500">COMPROBANTE</span>{estadoFiscal?.comprobante || solicitud.nroComprobante || '-'}</div>
                  <div><span className="block text-xs font-semibold text-slate-500">TIPO DE COMPROBANTE</span>{estadoFiscal?.tipoComprobante || '-'}</div>
                  <div><span className="block text-xs font-semibold text-slate-500">ESTADO FISCAL</span>{etiquetaEstadoFiscal(estadoFiscal?.estado)}{estadoFiscal?.pendienteSunat ? ' · PENDIENTE_SUNAT' : ''}</div>
                  <div><span className="block text-xs font-semibold text-slate-500">ACEPTADA SUNAT</span>{estadoFiscal?.aceptadaSunat === true ? 'SÍ' : estadoFiscal?.aceptadaSunat === false ? 'NO' : 'PENDIENTE / SIN CONFIRMAR'}</div>
                  <div><span className="block text-xs font-semibold text-slate-500">RESOLUCIÓN FISCAL</span>{etiquetaResultadoFiscal(resolucionFiscal?.resultado)}</div>
                  <div><span className="block text-xs font-semibold text-slate-500">OPERACIÓN APLICABLE</span>{etiquetaOperacionFiscal(resolucionFiscal?.operacion)}</div>
                  <div><span className="block text-xs font-semibold text-slate-500">PLAZO FISCAL DE BAJA</span>{resolucionFiscal?.plazo?.fechaBase ? `${resolucionFiscal.plazo.dias} días · vence ${new Date(resolucionFiscal.plazo.venceEn || resolucionFiscal.plazo.fechaBase).toLocaleDateString('es-PE')}` : 'Sin evidencia suficiente'}</div>
                  <div><span className="block text-xs font-semibold text-slate-500">TICKET / RESULTADO</span>{ultimaAnulacion?.ticketSunat || ultimaNota?.nroComprobante || 'Sin operación enviada'}</div>
                  <div><span className="block text-xs font-semibold text-slate-500">EJECUTOR</span>{solicitud.usuarioEjecucion || 'Sin ejecutar'}</div>
                  <div><span className="block text-xs font-semibold text-slate-500">ESTADO TÉCNICO</span>{etiquetaEstadoTecnico(String((detalle?.estadoTecnico as Record<string, unknown> | null)?.estado || ''))}</div>
                </div>
                {solicitud.estado === 'APROBADA' && !solicitud.usuarioEjecucion && (
                  <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-amber-900">
                    {esSolicitudNotaCredito
                      ? <>La nota está autorizada. FAREGAS la procesará mediante la cola fiscal automática y mostrará aquí el resultado o la causa de bloqueo; no debe volver al formulario para emitirla.</>
                      : <>La solicitud está aprobada pero <strong>aún no se ejecutó</strong>. No se ha enviado ninguna baja ni nota a NubeFact. Puede reintentar la ejecución con el botón inferior.</>}
                  </p>
                )}
                {resolucionFiscal?.resultado === 'PENDIENTE_VERIFICACION' && (
                  <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-amber-900">
                    <strong>Verificación pendiente:</strong> {resolucionFiscal.motivo}
                    {resolucionFiscal.siguientePaso ? ` Siguiente paso: ${resolucionFiscal.siguientePaso}.` : ''}
                  </p>
                )}
                {resolucionFiscal?.resultado === 'BAJA_ELEGIBLE' && (
                  <p className="mt-2 rounded border border-blue-200 bg-blue-50 p-2 text-blue-900">
                    <strong>Comunicación de baja elegible:</strong> {resolucionFiscal.motivo}
                    {' '}La ventana operativa para solicitar la anulación desde FAREGAS sigue siendo de 24 horas.
                  </p>
                )}
                {resolucionFiscal?.resultado === 'NOTA_CREDITO_ELEGIBLE' && (
                  <p className="mt-2 rounded border border-indigo-200 bg-indigo-50 p-2 text-indigo-900">
                    <strong>Nota de crédito total elegible:</strong> {resolucionFiscal.motivo}
                  </p>
                )}
                {resolucionFiscal?.resultado === 'NO_ELEGIBLE' && (
                  <p className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-red-800">
                    <strong>No elegible:</strong> {resolucionFiscal.motivo}
                  </p>
                )}
                {resolucionFiscal?.resultado === 'YA_ANULADO' && (
                  <p className="mt-2 rounded border border-emerald-200 bg-emerald-50 p-2 text-emerald-800">
                    <strong>Ya anulado:</strong> {resolucionFiscal.motivo}
                  </p>
                )}
                {ejecucion?.motivoBloqueo && (
                  <p className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-red-800">
                    <strong>Bloqueo:</strong> {ejecucion.motivoBloqueo}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <h4 className="text-xs font-bold text-slate-500">MOTIVO</h4>
                <p className="mt-1 text-sm text-slate-800">{solicitud.motivo}</p>
                {solicitud.justificacionDecision && (
                  <p className="mt-2 text-sm text-slate-600">Decisión de {solicitud.usuarioDecision}: {solicitud.justificacionDecision}</p>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <button type="button" onClick={onCerrar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cerrar</button>
                {esPendienteAnulacion && puedeAprobar && (
                  <button type="button" id="btn-modal-aprobar-y-ejecutar-anulacion-total" disabled={procesando} onClick={() => void aprobarYEjecutarAnulacion()} className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${esAutoaprobacion ? 'bg-amber-700' : 'bg-emerald-700'}`}>
                    {procesando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {esAutoaprobacion ? 'Autoaprobar y ejecutar anulación total' : 'Aprobar y ejecutar anulación total'}
                  </button>
                )}
                {solicitud.certificadoId && ['EN_EJECUCION', 'REQUIERE_INTERVENCION', 'ERROR'].includes(solicitud.estado) && (
                  <button type="button" disabled={procesando} onClick={() => void sincronizarEstadoFiscal()} className="flex items-center gap-1 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-800 disabled:opacity-50">
                    {procesando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Sincronizar estado fiscal
                  </button>
                )}
                {puedeEjecutar && (
                  <button type="button" disabled={procesando} onClick={() => void ejecutarAnulacion()} className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${esAutoejecucion ? 'bg-amber-700' : 'bg-[#052A79]'}`}>
                    {esAutoejecucion ? <ShieldAlert size={16} /> : <PlayCircle size={16} />}
                    {esAutoejecucion
                      ? 'Autoejecutar (excepcional)'
                      : ['REQUIERE_INTERVENCION', 'ERROR'].includes(solicitud.estado)
                        ? 'Reintentar ejecución'
                        : 'Ejecutar anulación total'}
                  </button>
                )}
              </div>
            </div>
          )}

          {!cargando && contexto && !resultado && !solicitud && (
            <>
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-2">
                <div><span className="block text-xs font-semibold text-slate-500">NÚMERO DG</span><strong>{mostrar(contexto.certificado.numero)}</strong></div>
                <div><span className="block text-xs font-semibold text-slate-500">FECHA DE EMISIÓN</span>{mostrar(contexto.certificado.fechaEmision)}</div>
                <div><span className="block text-xs font-semibold text-slate-500">TIPO DE CERTIFICADO</span>{mostrar(contexto.certificado.tipo)}</div>
                <div><span className="block text-xs font-semibold text-slate-500">PLACA</span>{mostrar(contexto.certificado.placa)}</div>
                <div><span className="block text-xs font-semibold text-slate-500">EMPRESA</span>{mostrar(contexto.empresa.nombre)}</div>
                <div><span className="block text-xs font-semibold text-slate-500">SEDE</span>{mostrar(contexto.planta.nombre)}</div>
                <div><span className="block text-xs font-semibold text-slate-500">IMPORTE FINAL</span>{contexto.certificado.importeFinal === null || contexto.certificado.importeFinal === undefined ? '-' : `${contexto.certificado.monedaImporteFinal || 'PEN'} ${Number(contexto.certificado.importeFinal).toFixed(2)}`}</div>
              </div>

              {!esSolicitudNotaCredito && bloqueoAnulacionContexto && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-900">
                  <div className="flex gap-2">
                    <AlertTriangle size={18} className="shrink-0 text-red-700" />
                    <span>{mensajeBloqueoAnulacion}</span>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <h3 className="mb-3 text-sm font-bold text-blue-950">Comprobante electrónico asociado</h3>
                {contexto.comprobante ? (
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div><span className="block text-xs font-semibold text-slate-500">TIPO</span>{mostrar(contexto.comprobante.tipo)}</div>
                    <div><span className="block text-xs font-semibold text-slate-500">SERIE Y NÚMERO</span>{mostrar(contexto.comprobante.numero || [contexto.comprobante.serie, contexto.comprobante.correlativo].filter(Boolean).join('-'))}</div>
                    <div><span className="block text-xs font-semibold text-slate-500">FECHA FISCAL</span>{mostrar(contexto.comprobante.fechaEmision)}</div>
                    <div><span className="block text-xs font-semibold text-slate-500">IMPORTE</span>{contexto.comprobante.importeTotal === null ? '-' : `${contexto.comprobante.moneda || 'PEN'} ${contexto.comprobante.importeTotal.toFixed(2)}`}</div>
                    <div className="md:col-span-2"><span className="block text-xs font-semibold text-slate-500">ESTADO FISCAL</span>{mostrar(contexto.comprobante.aceptadaSunat === true ? 'ACEPTADO SUNAT' : contexto.comprobante.estado)}</div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-700">No existe un comprobante electrónico asociado.</p>
                )}
              </div>

              {contexto.comprobanteRestriccion && !contexto.comprobanteRestriccion.disponible && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <strong>Situación fiscal pendiente:</strong> {contexto.comprobanteRestriccion.motivo} La solicitud registrará esta condición y no la presentará como una anulación fiscal aceptada.
                </div>
              )}

              <div className={`rounded-lg border p-3 text-sm ${esSolicitudNotaCredito ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
                <div className="flex gap-2">
                  <AlertTriangle size={18} className={`shrink-0 ${esSolicitudNotaCredito ? 'text-blue-700' : 'text-red-700'}`} />
                  <span>{esSolicitudNotaCredito
                     ? <>Se solicitará autorización para el motivo SUNAT <strong>{motivoNotaCredito}</strong>. Una vez aprobada, FAREGAS creará el trabajo fiscal y lo procesará automáticamente; no deberá pulsar Emitir nuevamente.</>
                    : <>Esta solicitud comprende el <strong>certificado y el comprobante electrónico asociado</strong>. La aprobación no anula documentos; la ejecución fiscal se realiza desde este detalle con confirmación y conserva las protecciones técnicas vigentes.</>}</span>
                </div>
              </div>

              <label className="block text-sm font-semibold text-slate-700">
                {esSolicitudNotaCredito ? 'Sustento de la solicitud *' : 'Motivo de la anulación total *'}
                <textarea
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  maxLength={500}
                  rows={4}
                  disabled={!esSolicitudNotaCredito && bloqueoAnulacionContexto}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder={esSolicitudNotaCredito
                    ? 'Explique por qué debe emitirse la nota de crédito'
                    : 'Explique por qué deben anularse el certificado y el comprobante asociado'}
                />
              </label>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={onCerrar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
                <button
                  type="button"
                  disabled={guardando || !motivo.trim() || (!esSolicitudNotaCredito && bloqueoAnulacionContexto)}
                  onClick={() => void enviar()}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${esSolicitudNotaCredito ? 'bg-[#052A79] hover:bg-blue-900' : 'bg-red-700 hover:bg-red-800'}`}
                >
                  {guardando ? <Loader2 size={16} className="animate-spin" /> : <ClipboardX size={16} />} Enviar solicitud
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
