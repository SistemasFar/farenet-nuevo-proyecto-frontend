import { InputField } from '../SharedForms';

interface DatosGlpStepProps {
  formData: any;
  setFormData: (data: any) => void;
  onNext: () => void;
}

export function DatosGlpStep({ formData, setFormData, onNext }: DatosGlpStepProps) {
  const isFormValid = formData.tallerConversion && formData.fechaConversion;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-black text-[#052a79] uppercase mb-4">Datos de Conversión GLP</h3>
      
      <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField label="Taller de Conversión" name="tallerConversion" formData={formData} setFormData={setFormData} required />
          <InputField label="Fecha de Conversión" name="fechaConversion" type="date" formData={formData} setFormData={setFormData} required />
          <div className="col-span-full">
            <InputField label="Observaciones (Opcional)" name="observaciones" formData={formData} setFormData={setFormData} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-slate-200">
        <button
          type="button"
          disabled={!isFormValid}
          onClick={onNext}
          className={`px-8 py-3 rounded-xl font-black text-sm transition-all shadow-md
            ${isFormValid ? 'bg-[#052a79] text-white hover:bg-blue-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}
          `}
        >
          Siguiente: Componentes GLP
        </button>
      </div>
    </div>
  );
}
