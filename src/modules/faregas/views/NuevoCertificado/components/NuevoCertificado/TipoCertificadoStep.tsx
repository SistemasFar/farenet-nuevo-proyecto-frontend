import type { TipoCertificadoFaregas } from '@/types/faregas';

interface TipoCertificadoStepProps {
  tipoCertificado: TipoCertificadoFaregas;
  setTipoCertificado: (tipo: TipoCertificadoFaregas) => void;
  onNext: () => void;
}

export function TipoCertificadoStep({ tipoCertificado, setTipoCertificado, onNext }: TipoCertificadoStepProps) {
  const options: { value: TipoCertificadoFaregas; label: string; desc: string; icon: string }[] = [
    { value: 'GLP', label: 'Certificado GLP', desc: 'Conversión o Inspección Anual de Gas Licuado de Petróleo', icon: '⛽' },
    { value: 'GNV', label: 'Certificado GNV', desc: 'Conversión o Inspección Anual de Gas Natural Vehicular', icon: '🍃' },
    { value: 'CONFORMIDAD', label: 'Certificado de Conformidad', desc: 'Modificación, Montaje o Fabricación', icon: '🛠️' }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center">
      <h3 className="text-xl font-black text-[#052a79] uppercase mb-2">Seleccione el Tipo de Certificado</h3>
      <p className="text-sm text-slate-500 mb-8">Elija el certificado que desea emitir para iniciar el flujo correspondiente.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTipoCertificado(opt.value)}
            className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all group ${
              tipoCertificado === opt.value
                ? 'border-[#052a79] bg-blue-50 ring-4 ring-blue-100'
                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">{opt.icon}</span>
            <span className="font-bold text-slate-800 text-lg mb-2">{opt.label}</span>
            <span className="text-xs text-slate-500">{opt.desc}</span>
          </button>
        ))}
      </div>

      <div className="mt-10">
        <button
          type="button"
          disabled={!tipoCertificado}
          onClick={onNext}
          className={`px-10 py-4 rounded-xl font-black text-sm transition-all shadow-md
            ${tipoCertificado
              ? 'bg-gold-3d hover:-translate-y-0.5'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }
          `}
        >
          Comenzar Inspección
        </button>
      </div>
    </div>
  );
}
