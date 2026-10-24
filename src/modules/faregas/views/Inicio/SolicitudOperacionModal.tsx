import { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardX, Loader2, X } from 'lucide-react';
import {
  faregasSolicitudesOperacionApi,
  etiquetaEstadoSolicitud,
  etiquetaTipoSolicitud,
  type ContextoSolicitudOperacion,
  type SolicitudOperacion,
} from '../../services/faregas-solicitudes-operacion.api';

interface Props {
  certificadoId: number | null;
  abierto: boolean;
  onCerrar: () => void;
  onCreada?: (solicitud: SolicitudOperacion) => void;
  solicitudId?: number | null;
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

export function SolicitudOperacionModal({ certificadoId, abierto, onCerrar, onCreada, solicitudId }: Props) {
  const [contexto, setContexto] = useState<ContextoSolicitudOperacion | null>(null);
  const [solicitud, setSolicitud] = useState<SolicitudOperacion | null>(null);
  const [motivo, setMotivo] = useState('');
  const [idempotencia, setIdempotencia] = useState(crearIdempotencia);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<SolicitudOperacion | null>(null);

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
    setCargando(true);
    faregasSolicitudesOperacionApi.contexto(certificadoId)
      .then(setContexto)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el certificado.'))
      .finally(() => setCargando(false));
  }, [abierto, certificadoId, solicitudId]);

  if (!abierto) return null;

  const enviar = async () => {
    if (!certificadoId || !motivo.trim()) {
      setError('Ingrese el motivo obligatorio de la anulación total.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const respuesta = await faregasSolicitudesOperacionApi.crear({
        certificadoId,
        tipoOperacion: 'ANULAR_AMBOS',
        motivo: motivo.trim(),
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
            <h2 id="solicitud-anulacion-total-titulo" className="text-lg font-bold">{solicitud ? 'Detalle de la solicitud de anulación' : 'Solicitar anulación total'}</h2>
            <p className="text-xs text-blue-100">Requiere revisión y autorización de un usuario SISTEMAS distinto del solicitante.</p>
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
                <div><span className="block text-xs font-semibold text-slate-500">ESTADO</span><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${claseEstadoSolicitudDetalle(solicitud.estado)}`}>{etiquetaEstadoSolicitud(solicitud.estado)}</span></div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <h4 className="text-xs font-bold text-slate-500">MOTIVO</h4>
                <p className="mt-1 text-sm text-slate-800">{solicitud.motivo}</p>
                {solicitud.justificacionDecision && (
                  <p className="mt-2 text-sm text-slate-600">Decisión de {solicitud.usuarioDecision}: {solicitud.justificacionDecision}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={onCerrar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cerrar</button>
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
              </div>

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

              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                <div className="flex gap-2">
                  <AlertTriangle size={18} className="shrink-0 text-red-700" />
                  <span>Esta solicitud comprende el <strong>certificado y el comprobante electrónico asociado</strong>. La aprobación no anula documentos; la ejecución coordinada corresponde a una etapa posterior y conserva las protecciones técnicas vigentes.</span>
                </div>
              </div>

              <label className="block text-sm font-semibold text-slate-700">
                Motivo de la anulación total *
                <textarea
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  maxLength={500}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                  placeholder="Explique por qué deben anularse el certificado y el comprobante asociado"
                />
              </label>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={onCerrar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancelar</button>
                <button
                  type="button"
                  disabled={guardando || !motivo.trim()}
                  onClick={() => void enviar()}
                  className="flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
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
