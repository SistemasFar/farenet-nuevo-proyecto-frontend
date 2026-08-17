import { CheckCircle } from 'lucide-react';
import type { TipoCertificadoFaregas } from '../../../../types/faregas';

interface EmisionStepProps {
  tipoCertificado: TipoCertificadoFaregas;
  placa: string;
}

export function EmisionStep({ tipoCertificado, placa }: EmisionStepProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-10 shadow-sm text-center">
      <div className="flex justify-center mb-6">
        <div className="bg-green-100 p-4 rounded-full">
          <CheckCircle className="text-green-600" size={64} />
        </div>
      </div>
      
      <h3 className="text-2xl font-black text-[#052a79] uppercase mb-2">¡Emisión Completada!</h3>
      <p className="text-sm text-slate-500 mb-8">El certificado {tipoCertificado} para la placa {placa} ha sido generado exitosamente.</p>
      
      <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Correlativo Generado</p>
        <p className="text-3xl font-mono text-slate-800 tracking-wider">CERT-{tipoCertificado}-0001</p>
        <p className="text-[10px] text-amber-600 mt-2 font-semibold">TODO BACKEND FAREGAS: Generar correlativo real</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button
          type="button"
          className="px-6 py-3 rounded-xl font-black text-sm text-white bg-[#052a79] hover:bg-blue-800 transition shadow-md flex items-center justify-center gap-2"
        >
          🖨️ Imprimir Certificado
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
        >
          Nueva Inspección
        </button>
      </div>
    </div>
  );
}
