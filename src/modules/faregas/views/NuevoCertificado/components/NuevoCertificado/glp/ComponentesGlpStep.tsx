import { InputField } from '../SharedForms';

interface ComponentesGlpStepProps {
  formData: any;
  setFormData: (data: any) => void;
  onNext: () => void;
}

export function ComponentesGlpStep({ formData, setFormData, onNext }: ComponentesGlpStepProps) {
  const isFormValid = formData.cilindroMarca && formData.cilindroNroSerie && formData.reguladorMarca;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-black text-[#052a79] uppercase mb-4">Componentes Instalados (GLP)</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
          <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Cilindro</h4>
          <div className="space-y-4">
            <InputField label="Marca" name="cilindroMarca" formData={formData} setFormData={setFormData} required />
            <InputField label="Nro Serie" name="cilindroNroSerie" formData={formData} setFormData={setFormData} required />
            <InputField label="Capacidad (Lts)" name="cilindroCapacidad" type="number" formData={formData} setFormData={setFormData} />
            <InputField label="Fecha Fabricación" name="cilindroFechaFab" type="month" formData={formData} setFormData={setFormData} />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
          <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Regulador / Evaporador</h4>
          <div className="space-y-4">
            <InputField label="Marca" name="reguladorMarca" formData={formData} setFormData={setFormData} required />
            <InputField label="Nro Serie" name="reguladorNroSerie" formData={formData} setFormData={setFormData} />
            <InputField label="Modelo" name="reguladorModelo" formData={formData} setFormData={setFormData} />
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
          Siguiente Paso
        </button>
      </div>
    </div>
  );
}
