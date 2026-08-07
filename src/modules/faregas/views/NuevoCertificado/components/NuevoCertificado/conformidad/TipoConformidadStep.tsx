import { InputField } from '../SharedForms';

interface TipoConformidadStepProps {
  formData: any;
  setFormData: (data: any) => void;
  onNext: () => void;
}

export function TipoConformidadStep({ formData, setFormData, onNext }: TipoConformidadStepProps) {
  const isFormValid = formData.tipoConformidad && formData.caracteristicasRegistrables;

  const opcionesConformidad = [
    { value: 'MODIFICACION', label: 'Modificación' },
    { value: 'MONTAJE', label: 'Montaje' },
    { value: 'FABRICACION', label: 'Fabricación' }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-black text-[#052a79] uppercase mb-4">Tipo de Conformidad</h3>
      
      <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl mb-6">
        <div className="grid grid-cols-1 gap-6">
          <InputField 
            label="Tipo de Conformidad" 
            name="tipoConformidad" 
            isSelect 
            options={opcionesConformidad} 
            formData={formData} 
            setFormData={setFormData} 
            required 
          />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Características Registrables a Modificar *</label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-[#052a79] min-h-[100px]"
              value={formData.caracteristicasRegistrables || ''}
              onChange={(e) => setFormData({ ...formData, caracteristicasRegistrables: e.target.value })}
              placeholder="Describa las características que se están modificando..."
            />
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
          Siguiente: Características Finales
        </button>
      </div>
    </div>
  );
}
