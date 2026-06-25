
import Select from 'react-select';
import { Search, XCircle, Frown, HelpCircle } from 'lucide-react';
import { plantaSession, maestrosApi } from '../../../../../services/api';

interface CajaStepProps {
  maestros: any;
  formCaja: any;
  setFormCaja: (data: any) => void;
  handleCajaChange: (e: any) => void;
  handleSelectChange: (name: string, option: any) => void;
  validarCaja: () => boolean;
  irSiguientePaso: () => void;
  isConsultado: boolean;
  setIsConsultado: (val: boolean) => void;
  showAnularModal: boolean;
  setShowAnularModal: (val: boolean) => void;
  showCamposVaciosModal: boolean;
  setShowCamposVaciosModal: (val: boolean) => void;
  documentoDescuento: string;
  setDocumentoDescuento: (val: string) => void;
  precioSubtotal: number;
  setPrecioSubtotal: (val: number) => void;
  descuento: number;
  setDescuento: (val: number) => void;
  precioTotal: number;
  setPrecioTotal: (val: number) => void;
  documentoPago: string;
  setDocumentoPago: (val: string) => void;
  customSelectStyles: any;
}

export function CajaStep({
  maestros,
  formCaja,
  setFormCaja,
  handleCajaChange,
  handleSelectChange,
  validarCaja,
  irSiguientePaso,
  isConsultado,
  setIsConsultado,
  showAnularModal,
  setShowAnularModal,
  showCamposVaciosModal,
  setShowCamposVaciosModal,
  documentoDescuento,
  setDocumentoDescuento,
  precioSubtotal,
  setPrecioSubtotal,
  descuento,
  setDescuento,
  precioTotal,
  setPrecioTotal,
  documentoPago,
  setDocumentoPago,
  customSelectStyles
}: CajaStepProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-[#052a79] uppercase border-b border-amber-200/60 pb-2">
        Datos de Caja
      </h3>

      {/* Funciones de validacion dinamica */}
      {(() => {
        const getPlacaMaxLength = () => {
          if (!maestros?.tiposPlaca || !formCaja.tipoPlaca) return 17;
          const selectedTipo = maestros.tiposPlaca.find((tp: any) => tp.id?.toString() === formCaja.tipoPlaca?.toString());
          if (!selectedTipo) return 17;
          const nombre = selectedTipo.nombre?.toUpperCase() || '';
          if (nombre.includes('DIPLOMATIC') || nombre.includes('DIPLOMÁTIC')) return 6;
          if (nombre.includes('INCORPORACI')) return 17;
          if (nombre.includes('RUTINARI')) return 6;
          if (nombre.includes('EXTRANJER')) return 7;
          return 17; // default max
        };

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase">Tipo de Placa *</label>
          <Select
            options={maestros?.tiposPlaca.map((tp: any) => ({ value: tp.id, label: tp.nombre })) || []}
            value={maestros?.tiposPlaca.map((tp: any) => ({ value: tp.id, label: tp.nombre })).find((o: any) => o.value?.toString() === formCaja.tipoPlaca?.toString()) || null}
            onChange={(o) => handleSelectChange('tipoPlaca', o)}
            placeholder="Seleccione..."
            isClearable
            styles={customSelectStyles}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase">Placa *</label>
          <input
            type="text"
            name="placa"
            value={formCaja.placa}
            onChange={handleCajaChange}
            placeholder="Ej: ABC-123"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 outline-none transition uppercase"
            maxLength={getPlacaMaxLength()}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase">Concepto *</label>
          <Select
            options={maestros?.conceptos.map((c: any) => ({ value: c.key, label: c.abreviatura || c.nombre })) || []}
            value={maestros?.conceptos.map((c: any) => ({ value: c.key, label: c.abreviatura || c.nombre })).find((o: any) => o.value?.toString() === formCaja.concepto?.toString()) || null}
            onChange={(o) => handleSelectChange('concepto', o)}
            placeholder="Seleccione..."
            isClearable
            styles={customSelectStyles}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase">Categoría *</label>
          <Select
            options={maestros?.categorias.map((c: any) => ({ value: c.key, label: c.nombre })) || []}
            value={maestros?.categorias.map((c: any) => ({ value: c.key, label: c.nombre })).find((o: any) => o.value?.toString() === formCaja.categoria?.toString()) || null}
            onChange={(o) => handleSelectChange('categoria', o)}
            placeholder="Seleccione..."
            isClearable
            styles={customSelectStyles}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase">Tipo de Inspección *</label>
          <Select
            options={maestros?.tiposInspeccion.map((ti: any) => ({ value: ti.key, label: ti.nombre })) || []}
            value={maestros?.tiposInspeccion.map((ti: any) => ({ value: ti.key, label: ti.nombre })).find((o: any) => o.value?.toString() === formCaja.tipoInspeccion?.toString()) || null}
            onChange={(o) => handleSelectChange('tipoInspeccion', o)}
            placeholder="Seleccione..."
            isClearable
            styles={customSelectStyles}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase">Tipo Certificado *</label>
          <Select
            options={maestros?.tiposCertificado.map((tc: any) => ({ value: tc.key, label: tc.abreviacion || tc.nombre })) || []}
            value={maestros?.tiposCertificado.map((tc: any) => ({ value: tc.key, label: tc.abreviacion || tc.nombre })).find((o: any) => o.value?.toString() === formCaja.tipoCertificado?.toString()) || null}
            onChange={(o) => handleSelectChange('tipoCertificado', o)}
            placeholder="Seleccione..."
            isClearable
            styles={customSelectStyles}
          />
        </div>

        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-bold text-slate-600 uppercase">Tipo Autorización</label>
          <Select
            options={[
              { value: '', label: 'NINGUNO / EN BLANCO' },
              ...(maestros?.tiposAutorizacion.map((ta: any) => ({ value: ta.key, label: ta.nombre })) || [])
            ]}
            value={maestros?.tiposAutorizacion.map((ta: any) => ({ value: ta.key, label: ta.nombre })).find((o: any) => o.value?.toString() === formCaja.tipoAutorizacion?.toString()) || null}
            onChange={(o) => setFormCaja({ ...formCaja, tipoAutorizacion: o?.value || '' })}
            placeholder="Seleccione..."
            isClearable
            styles={customSelectStyles}
            menuPlacement="top"
            menuPortalTarget={document.body}
          />
        </div>

      </div>
        );
      })()}

      <div className="flex items-center gap-4 pt-4 border-t border-slate-100 mt-6">
        <button
          type="button"
          onClick={async () => {
            if (validarCaja()) {
              try {
                const planta = plantaSession.obtener();
                if (!planta?.key) {
                  alert('Por favor seleccione una planta en el inicio.');
                  return;
                }
                const res = await maestrosApi.obtenerPrecioConceptoAsync(planta.key, formCaja.concepto);
                const precio = res?.data?.precio || 0;
                if (precio === 0) {
                  alert(`El sistema calculó 0.00. Esto sucede porque no hay un precio registrado en la tabla "conceptoinspecciondetalle" para la combinación de la Planta actual (${planta.key}) y el Concepto elegido (${formCaja.concepto}).`);
                }
                setPrecioSubtotal(precio);
                setPrecioTotal(precio - descuento);
              } catch (err) {
                console.error('Error calculando precio:', err);
                setPrecioSubtotal(0);
                setPrecioTotal(0);
              } finally {
                setIsConsultado(true);
              }
            } else {
              setShowCamposVaciosModal(true);
            }
          }}
          className="flex items-center gap-2 rounded-lg bg-[#052a79] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-900 border border-[#052a79] transition uppercase tracking-wide"
        >
          <Search className="w-4 h-4" />
          Consultar
        </button>

        <button
          type="button"
          onClick={() => {
            setFormCaja({
              tipoPlaca: '', placa: '', concepto: '', categoria: '', tipoInspeccion: '', tipoCertificado: '', tipoAutorizacion: ''
            });
            setIsConsultado(false);
            setDocumentoDescuento('');
          }}
          className="flex items-center gap-2 rounded-lg bg-white border border-red-200 text-red-600 px-6 py-2.5 text-xs font-bold hover:bg-red-50 shadow-sm transition uppercase tracking-wide"
        >
          <XCircle className="w-4 h-4" />
          Anular
        </button>
      </div>

      {isConsultado && (
        <div className="mt-4 p-4 rounded-lg bg-[#f2cc11] border-2 border-[#e0bc0d] shadow-md">
          <div className="flex items-center gap-3 mb-3">
            <h4 className="text-[#052a79] font-black uppercase text-sm drop-shadow-sm">
              Buscar descuentos por: Código / DNI / RUC / Placa
            </h4>
            <span className="text-red-600 font-black text-xs uppercase animate-pulse drop-shadow-sm bg-white/50 px-2 py-0.5 rounded">
              POR HACER
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={documentoDescuento}
              onChange={(e) => setDocumentoDescuento(e.target.value)}
              placeholder="Número de documento..."
              className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 outline-none"
            />
            <button type="button" className="bg-[#052a79] text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-blue-900 transition flex items-center gap-2 uppercase">
              <Search className="w-3 h-3" /> Buscar
            </button>
          </div>
        </div>
      )}

      {isConsultado && (
        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-[#f4f9ff] border-b border-[#052a79]/10 p-3">
            <h3 className="text-sm font-black text-[#052a79] uppercase tracking-wide">Resumen de Pago</h3>
          </div>
          <div className="p-5 bg-white grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Documento</label>
              <Select
                options={maestros?.tiposDocumento?.map((td: any) => ({ value: td.key, label: td.nombre })) || []}
                value={maestros?.tiposDocumento?.map((td: any) => ({ value: td.key, label: td.nombre })).find((o: any) => o.value === documentoPago) || null}
                onChange={(o) => setDocumentoPago(o?.value || '')}
                placeholder="Seleccione..."
                styles={customSelectStyles}
                isClearable
                menuPlacement="top"
                menuPortalTarget={document.body}
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Subtotal (S/)</label>
              <input type="text" readOnly value={precioSubtotal.toFixed(2)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 text-right outline-none" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Descuento (S/)</label>
              <input type="text" readOnly value={descuento.toFixed(2)} className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 text-right outline-none" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <label className="text-[10px] font-black text-[#052a79] uppercase">Total (S/)</label>
              <input type="text" readOnly value={precioTotal.toFixed(2)} className="w-full rounded-lg border-2 border-[#052a79] bg-[#f4f9ff] px-3 py-2 text-lg font-black text-[#052a79] text-right outline-none shadow-inner" />
            </div>
          </div>
        </div>
      )}

      {isConsultado && (
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => setShowAnularModal(true)}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
          >
            ANULAR
          </button>
          <button
            type="button"
            onClick={irSiguientePaso}
            className="px-8 py-2.5 rounded-xl font-black text-[#052a79] bg-[#f2cc11] hover:bg-[#e0b90c] transition-all shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
          >
            SIGUIENTE
          </button>
        </div>
      )}

      {showAnularModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-blue-100">
              <Frown className="w-10 h-10 text-[#052a79]" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">¿Estás seguro?</h3>
            <p className="text-slate-500 mb-8 text-sm leading-relaxed">
              Estás a punto de anular esta inspección y se borrarán todos los datos que ingresaste.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowAnularModal(false)}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setFormCaja({
                    tipoPlaca: '', placa: '', concepto: '', categoria: '', tipoInspeccion: '', tipoCertificado: '', tipoAutorizacion: ''
                  });
                  setIsConsultado(false);
                  setPrecioSubtotal(0);
                  setDescuento(0);
                  setPrecioTotal(0);
                  setDocumentoPago('');
                  setShowAnularModal(false);
                }}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-md shadow-red-200 transition-colors"
              >
                Sí, anular
              </button>
            </div>
          </div>
        </div>
      )}

      {showCamposVaciosModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-amber-100">
              <HelpCircle className="w-10 h-10 drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" style={{ stroke: "url(#gold-gradient)", strokeWidth: 1.8 }} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">¡Un momento!</h3>
            <p className="text-slate-500 mb-8 text-sm leading-relaxed">
              Te falta llenar todos los campos. Por favor, completa el formulario antes de consultar.
            </p>
            <button
              onClick={() => setShowCamposVaciosModal(false)}
              className="w-full px-4 py-3 rounded-xl font-bold text-white bg-gold-3d transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
