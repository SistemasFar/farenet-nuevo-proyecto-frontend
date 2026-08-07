import { InputField } from '../SharedForms';

interface InspeccionGnvStepProps {
  formData: any;
  setFormData: (data: any) => void;
  onNext: () => void;
}

export function InspeccionGnvStep({ formData, setFormData, onNext }: InspeccionGnvStepProps) {
  const isFormValid = formData.tallerConversion && formData.cilindroNroSerie && formData.kitNroSerie;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-black text-[#052a79] uppercase mb-4">Inspección GNV</h3>
      
      <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField label="Taller de Conversión" name="tallerConversion" formData={formData} setFormData={setFormData} required />
          <InputField label="Fecha Instalación" name="fechaInstalacion" type="date" formData={formData} setFormData={setFormData} />
          
          <div className="col-span-full border-t border-slate-200 pt-4 mt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Datos del Cilindro</h4>
          </div>
          <InputField label="Marca de Cilindro" name="cilindroMarca" formData={formData} setFormData={setFormData} />
          <InputField label="Nro Serie Cilindro" name="cilindroNroSerie" formData={formData} setFormData={setFormData} required />
          <InputField label="Capacidad (Lts)" name="cilindroCapacidad" type="number" formData={formData} setFormData={setFormData} />
          
          <div className="col-span-full border-t border-slate-200 pt-4 mt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Datos del Kit</h4>
          </div>
          <InputField label="Marca Kit GNV" name="kitMarca" formData={formData} setFormData={setFormData} />
          <InputField label="Nro Serie Kit" name="kitNroSerie" formData={formData} setFormData={setFormData} required />
          
          <div className="col-span-full border-t border-slate-200 pt-4 mt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Verificaciones Físicas</h4>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-blue-600"
                  checked={formData.tuberiaVentilacion || false}
                  onChange={(e) => setFormData({ ...formData, tuberiaVentilacion: e.target.checked })}
                />
                Tubería de ventilación conforme
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded text-blue-600"
                  checked={formData.fugas || false}
                  onChange={(e) => setFormData({ ...formData, fugas: e.target.checked })}
                />
                No presenta fugas
              </label>
            </div>
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
