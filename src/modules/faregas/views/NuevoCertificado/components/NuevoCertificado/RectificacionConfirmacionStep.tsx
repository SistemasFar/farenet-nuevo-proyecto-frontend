import { AlertTriangle, Clock3, FileWarning, ShieldAlert } from 'lucide-react';
import type {
  ContextoRectificacion,
  PrevisualizacionRectificacion
} from '../../../../services/faregas-rectificaciones.api';

interface RectificacionConfirmacionStepProps {
  contexto: ContextoRectificacion | null;
  preview: PrevisualizacionRectificacion | null;
  motivo: string;
  setMotivo: (valor: string) => void;
  observaciones: string;
  setObservaciones: (valor: string) => void;
}

const formatearValor = (valor: unknown) => {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
};

export function RectificacionConfirmacionStep({
  contexto,
  preview,
  motivo,
  setMotivo,
  observaciones,
  setObservaciones
}: RectificacionConfirmacionStepProps) {
  const diferencias = preview?.diferencias || [];
  const advertencias = preview?.advertencias || [];

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5">
        <FileWarning className="mt-1 h-7 w-7 flex-shrink-0 text-red-600" />
        <div>
          <h3 className="text-xl font-black text-red-900">Confirmar rectificación del certificado</h3>
          <p className="mt-1 text-sm font-semibold text-red-800">
            Se conservarán el número DG <strong>{contexto?.certificado.numeroCertificado || '—'}</strong>, la fecha de emisión
            <strong> {contexto?.certificado.fechaEmision || '—'}</strong>, el tipo de certificado y el comprobante electrónico asociado.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Flujo</p>
            <p className="mt-1 text-sm font-bold text-emerald-700">Aplicación directa</p>
            <p className="mt-1 text-xs text-slate-500">Se guardará y emitirá el PDF corregido al confirmar.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Efecto fiscal</p>
          <p className="mt-1 text-sm font-bold text-emerald-700">Ninguno</p>
          <p className="mt-1 text-xs text-slate-500">No genera comprobantes, notas, pagos ni consumo de correlativos.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Versiones</p>
          <p className="mt-1 text-sm font-bold text-slate-800">Historial inmutable</p>
          <p className="mt-1 text-xs text-slate-500">El PDF anterior se conserva y se genera un PDF corregido.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h4 className="text-sm font-black uppercase tracking-wider text-slate-700">Cambios detectados</h4>
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
            {diferencias.length} campo{diferencias.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 text-[10px] uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-2">Campo</th>
                <th className="px-4 py-2">Valor original</th>
                <th className="px-4 py-2">Valor propuesto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {diferencias.map((diferencia, indice) => (
                <tr key={`${diferencia.campo}-${indice}`}>
                  <td className="px-4 py-2 font-bold text-slate-700">{diferencia.campo}</td>
                  <td className="max-w-[220px] break-words px-4 py-2 text-slate-500">{formatearValor(diferencia.valorOriginal)}</td>
                  <td className="max-w-[220px] break-words px-4 py-2 font-semibold text-red-700">{formatearValor(diferencia.valorPropuesto)}</td>
                </tr>
              ))}
              {diferencias.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center font-semibold text-slate-400">
                    No se detectaron cambios. Edite algún dato técnico antes de continuar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {advertencias.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-black text-amber-900">Información oficial externa</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-amber-800">
                {advertencias.map((advertencia) => <li key={advertencia}>{advertencia}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs font-semibold text-blue-900">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-700" />
          <p>
            El comprobante electrónico permanece intacto. La fecha real
            de rectificación se registra sólo en el historial de auditoría.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-600">Motivo de la rectificación *</span>
          <textarea
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Describa el error detectado y la fuente de la corrección."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#052a79] focus:ring-2 focus:ring-blue-100"
          />
          <span className="mt-1 block text-right text-[10px] font-bold text-slate-400">{motivo.length}/500</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-600">Observaciones internas</span>
          <textarea
            value={observaciones}
            onChange={(evento) => setObservaciones(evento.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Referencia del expediente, sustento o comentario interno."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#052a79] focus:ring-2 focus:ring-blue-100"
          />
          <span className="mt-1 block text-right text-[10px] font-bold text-slate-400">{observaciones.length}/2000</span>
        </label>
      </div>

      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Clock3 className="h-4 w-4" /> Los cambios se aplicarán al confirmar y quedarán registrados con usuario, fecha, motivo y versión.
      </div>
    </div>
  );
}
