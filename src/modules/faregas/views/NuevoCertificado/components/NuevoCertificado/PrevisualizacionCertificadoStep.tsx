import { useEffect, useState } from 'react';
import { AlertCircle, Eye, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { faregasCertificadosApi } from '../../../../services/faregas-certificados.api';

interface PrevisualizacionCertificadoStepProps {
  certificadoId?: number;
}

const obtenerMensajeError = (errorCapturado: unknown) => {
  const message = errorCapturado instanceof Error ? errorCapturado.message : '';
  return message === 'FORMATO_PREVIEW_PENDIENTE' || message.includes('pendiente')
    ? 'El formato oficial de previsualización para esta modalidad aún está pendiente.'
    : message || 'No se pudo obtener la previsualización.';
};

export function PrevisualizacionCertificadoStep({ certificadoId }: PrevisualizacionCertificadoStepProps) {
  const [isLoading, setIsLoading] = useState(Boolean(certificadoId));
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [error, setError] = useState('');

  const cargarPrevisualizacion = async () => {
    if (!certificadoId || isLoading) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await faregasCertificadosApi.obtenerPrevisualizacion(certificadoId);
      setPreviewHtml(response?.data?.html || null);
    } catch (errorCapturado: unknown) {
      const rawMessage = errorCapturado instanceof Error ? errorCapturado.message : '';
      const message = obtenerMensajeError(errorCapturado);
      setError(message);
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
    void faregasCertificadosApi.obtenerPrevisualizacion(certificadoId)
      .then((response) => {
        if (!vigente) return;
        setPreviewHtml(response?.data?.html || null);
        setError('');
      })
      .catch((errorCapturado: unknown) => {
        if (!vigente) return;
        setError(obtenerMensajeError(errorCapturado));
      })
      .finally(() => {
        if (vigente) setIsLoading(false);
      });

    return () => {
      vigente = false;
    };
  }, [certificadoId]);

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
          <div className="rounded-xl bg-amber-100 p-2.5">
            <Eye className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Previsualización del Certificado</h3>
            <p className="text-sm text-slate-500">Revise el certificado completo antes de pasar a verificación y emisión.</p>
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
            <h3 className="text-sm font-bold uppercase tracking-wider">Previsualización de Certificado (Borrador)</h3>
          </div>
          <div className="flex-1 overflow-hidden bg-slate-100 p-4">
            <iframe
              srcDoc={previewHtml}
              className="h-[72vh] w-full rounded-xl border border-slate-300 bg-white shadow-inner"
              title="Previsualización de Certificado FAREGAS"
            />
          </div>
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              ⚠️ Documento sin validez legal. El número definitivo se asigna únicamente al emitir.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
