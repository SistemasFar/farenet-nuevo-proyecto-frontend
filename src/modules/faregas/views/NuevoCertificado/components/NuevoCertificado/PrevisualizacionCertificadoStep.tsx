import { useEffect, useState } from 'react';
import { AlertCircle, Eye, Loader2, PencilLine } from 'lucide-react';
import Swal from 'sweetalert2';
import { faregasCertificadosApi } from '../../../../services/faregas-certificados.api';
import {
  faregasRectificacionesApi,
  type DatosPropuestosRectificacion,
  type PrevisualizacionRectificacion
} from '../../../../services/faregas-rectificaciones.api';

interface PrevisualizacionCertificadoStepProps {
  certificadoId?: number;
  datosPropuestos?: DatosPropuestosRectificacion | null;
  modoRectificacion?: boolean;
  onPreviewResult?: (resultado: PrevisualizacionRectificacion | null) => void;
}

const obtenerMensajeError = (errorCapturado: unknown) => {
  const message = errorCapturado instanceof Error ? errorCapturado.message : '';
  return message === 'FORMATO_PREVIEW_PENDIENTE' || message.includes('pendiente')
    ? 'El formato oficial de previsualización para esta modalidad aún está pendiente.'
    : message || 'No se pudo obtener la previsualización.';
};

export function PrevisualizacionCertificadoStep({
  certificadoId,
  datosPropuestos,
  modoRectificacion = false,
  onPreviewResult
}: PrevisualizacionCertificadoStepProps) {
  const [isLoading, setIsLoading] = useState(Boolean(certificadoId));
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<PrevisualizacionRectificacion | null>(null);
  const datosSerializados = datosPropuestos ? JSON.stringify(datosPropuestos) : '';

  const cargarPrevisualizacion = async () => {
    if (!certificadoId) return;
    setIsLoading(true);
    setError('');
    try {
      const response = datosPropuestos
        ? await faregasRectificacionesApi.previsualizar(certificadoId, datosPropuestos)
        : await faregasCertificadosApi.obtenerPrevisualizacion(certificadoId);
      const data = response?.data || null;
      setPreviewHtml(data?.html || null);
      setResultado(data);
      onPreviewResult?.(data);
    } catch (errorCapturado: unknown) {
      const rawMessage = errorCapturado instanceof Error ? errorCapturado.message : '';
      const message = obtenerMensajeError(errorCapturado);
      setError(message);
      setResultado(null);
      onPreviewResult?.(null);
      if (rawMessage === 'FORMATO_PREVIEW_PENDIENTE' || rawMessage.includes('pendiente')) {
        Swal.fire({
          title: 'Formato Pendiente',
          text: message,
          icon: 'info',
          confirmButtonColor: '#052a79',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!certificadoId) return;

    let vigente = true;
    // La carga inicial ya nace activa. En recargas posteriores se difiere la
    // transición para no encadenar una actualización síncrona dentro del
    // efecto y para que una respuesta obsoleta no cambie el estado visible.
    queueMicrotask(() => {
      if (vigente) setIsLoading(true);
    });
    const solicitud = datosPropuestos
      ? faregasRectificacionesApi.previsualizar(certificadoId, datosPropuestos)
      : faregasCertificadosApi.obtenerPrevisualizacion(certificadoId);

    void solicitud
      .then((response) => {
        if (!vigente) return;
        const data = response?.data || null;
        setPreviewHtml(data?.html || null);
        setResultado(data);
        setError('');
        onPreviewResult?.(data);
      })
      .catch((errorCapturado: unknown) => {
        if (!vigente) return;
        setError(obtenerMensajeError(errorCapturado));
        setResultado(null);
        onPreviewResult?.(null);
      })
      .finally(() => {
        if (vigente) setIsLoading(false);
      });

    return () => {
      vigente = false;
    };
    // El payload se compara serializado para no repetir la llamada cuando el
    // objeto se reconstruye con los mismos valores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificadoId, datosSerializados, modoRectificacion]);

  if (!certificadoId) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center font-bold text-red-500">
        No se ha detectado el ID del borrador.
      </div>
    );
  }

  return (
    <div className="animate-in space-y-4 fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2.5 ${modoRectificacion ? 'bg-red-100' : 'bg-amber-100'}`}>
            {modoRectificacion
              ? <PencilLine className="h-6 w-6 text-red-600" />
              : <Eye className="h-6 w-6 text-amber-600" />}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              {modoRectificacion ? 'Previsualización de la Rectificación' : 'Previsualización del Certificado'}
            </h3>
            <p className="text-sm text-slate-500">
              {modoRectificacion
                ? 'Revise la versión corregida. Conserva el número DG y la fecha de emisión originales.'
                : 'Revise el certificado completo antes de continuar con la facturación y emisión.'}
            </p>
          </div>
        </div>
        {error && (
          <button
            type="button"
            onClick={cargarPrevisualizacion}
            className="rounded-lg bg-[#052a79] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900"
          >
            Reintentar
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3 font-semibold text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-[#052a79]" />
            Cargando previsualización...
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {!isLoading && previewHtml && (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center gap-2 bg-slate-900 px-6 py-4 text-white">
            <Eye className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-bold capitalize tracking-wider">
              {modoRectificacion ? 'Versión rectificada (previsualización)' : 'Previsualización de Certificado'}
            </h3>
            {modoRectificacion && resultado?.numeroCertificado && (
              <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                {resultado.numeroCertificado}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-hidden bg-slate-100 p-4">
            <iframe
              srcDoc={previewHtml}
              className="h-[72vh] w-full rounded-xl border border-slate-300 bg-white shadow-inner"
              title="Previsualización de Certificado FAREGAS"
            />
          </div>
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            {modoRectificacion ? (
              <div className="space-y-2">
                <span className="inline-block rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800">
                  Esta vista previa no emite comprobantes ni modifica la fecha original. El cambio se aplicará sólo después de la aprobación y ejecución.
                </span>
                {resultado?.advertencias?.length ? (
                  <ul className="list-disc space-y-1 pl-5 text-xs font-semibold text-amber-800">
                    {resultado.advertencias.map((advertencia) => (
                      <li key={advertencia}>{advertencia}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                Documento de trabajo. El número definitivo se asigna únicamente al emitir.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
