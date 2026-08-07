
interface CaracteristicasFinalesStepProps {
  formData: any;
  setFormData: (data: any) => void;
  onNext: () => void;
}

export function CaracteristicasFinalesStep({ formData, setFormData, onNext }: CaracteristicasFinalesStepProps) {
  const isFormValid = formData.caracteristicasFinales && formData.caracteristicasFinales.length > 5;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-black text-[#052a79] uppercase mb-4">Características Finales del Vehículo</h3>
      
      <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl mb-6">
        <div className="flex flex-col gap-1.5 mb-6">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Descripción de Características Finales *</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-[#052a79] min-h-[150px]"
            value={formData.caracteristicasFinales || ''}
            onChange={(e) => setFormData({ ...formData, caracteristicasFinales: e.target.value })}
            placeholder="Describa cómo quedará el vehículo finalmente..."
          />
        </div>

        <div className="border-t border-slate-200 pt-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer font-bold">
            <input 
              type="checkbox" 
              className="w-5 h-5 rounded text-blue-600"
              checked={formData.rectificacion || false}
              onChange={(e) => setFormData({ ...formData, rectificacion: e.target.checked })}
            />
            Requiere Rectificación
          </label>
          <p className="text-xs text-slate-500 mt-1 ml-7">Marque esta casilla si la modificación requiere un proceso de rectificación adicional.</p>
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
