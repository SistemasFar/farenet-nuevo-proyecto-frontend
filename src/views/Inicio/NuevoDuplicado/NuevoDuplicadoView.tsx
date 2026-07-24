import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Save, UserCog, ShieldCheck } from 'lucide-react';
import Select from 'react-select';
import Swal from 'sweetalert2';
import { maestrosApi, plantaSession, inspeccionesApi } from '../../../services/api';

const customSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    borderRadius: '0.5rem',
    borderColor: state.isFocused ? '#f59e0b' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(253, 230, 138, 0.5)' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#f59e0b' : '#cbd5e1' },
    minHeight: '38px',
    fontSize: '0.75rem',
    fontWeight: '600'
  }),
  option: (base: any) => ({ ...base, fontSize: '0.75rem' }),
  menu: (base: any) => ({ ...base, zIndex: 50 }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 })
};

interface NuevoDuplicadoViewProps {
  onVolver?: () => void;
  plantaSeleccionada?: string;
}

export function NuevoDuplicadoView({ onVolver, plantaSeleccionada }: NuevoDuplicadoViewProps) {
  const [loading, setLoading] = useState(true);
  const [maestros, setMaestros] = useState<any>(null);
  
  const [form, setForm] = useState({
    placa: '',
    concepto: '',
    tipoContado: '',
    tipoDocumento: '',
    motivoDuplicado: ''
  });

  const [precios, setPrecios] = useState({
    subtotal: 0,
    descuento: 0,
    baseImponible: 0,
    igv: 0,
    total: 0
  });

  useEffect(() => {
    const fetchMaestros = async () => {
      try {
        const planta = plantaSession.obtener();
        if (planta?.key) {
          const res = await maestrosApi.obtenerMaestrosCaja(planta.key);
          if (res.status === 'success') {
            setMaestros(res.data);
          }
        }
      } catch (err) {
        console.error("Error cargando maestros:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMaestros();
  }, []);

  const motivos = [
    { value: 'PERDIDA', label: 'PÉRDIDA' },
    { value: 'ROBO', label: 'ROBO' },
    { value: 'DETERIORO', label: 'DETERIORO' }
  ];

  const handleGuardar = async () => {
    if (!form.placa || !form.concepto || !form.tipoContado || !form.tipoDocumento) {
      return Swal.fire('Atención', 'Complete los campos obligatorios (*)', 'warning');
    }

    try {
      setLoading(true);
      const payload = {
        placa: form.placa,
        concepto: form.concepto,
        tipoContado: form.tipoContado,
        tipoDocumento: form.tipoDocumento,
        motivoDuplicado: form.motivoDuplicado,
        plantaKey: plantaSeleccionada,
        precios
      };
      
      const res = await inspeccionesApi.guardarDuplicado(payload);
      if (res.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Duplicado Guardado',
          text: `Se generó el comprobante ${res.data.nroComprobante}`
        });
        if (onVolver) onVolver();
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Error al guardar duplicado', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => `S/. ${val.toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onVolver}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-black text-[#052a79] uppercase tracking-wide">DUPLICADO CERTIFICADO</h2>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Formularios */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1.5 lg:col-span-4">
              <label className="text-xs font-bold text-slate-600 uppercase">* PLACA - MOTOR</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.placa}
                  onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
                  placeholder="Ej: ABC-123"
                  className="w-full lg:w-1/4 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 outline-none transition uppercase"
                  maxLength={10}
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-[#052a79] text-white rounded-lg text-xs font-bold transition flex items-center gap-2 uppercase hover:bg-blue-900"
                  onClick={async () => {
                    if (!form.placa || form.placa.length < 6) return Swal.fire('Error', 'Ingrese una placa válida', 'error');
                    Swal.fire({ title: 'Buscando', text: 'Buscando inspección aprobada...', allowOutsideClick: false });
                    Swal.showLoading();
                    try {
                      const res = await inspeccionesApi.buscarInfoDuplicado(form.placa, plantaSeleccionada);
                      setForm({ ...form, concepto: res.data.conceptoinspeccion_key });
                      Swal.fire({
                        icon: 'success',
                        title: 'Inspección encontrada',
                        text: 'El concepto original ha sido cargado. Por favor, complete el resto de los campos.',
                        timer: 2000,
                        showConfirmButton: false
                      });
                    } catch (e: any) {
                      Swal.fire('Error', e.message, 'error');
                    }
                  }}
                >
                  <Search className="w-3 h-3" /> Buscar
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">* CONCEPTO</label>
              <Select
                options={maestros?.conceptos?.map((c: any) => ({ value: c.key, label: c.abreviatura || c.nombre })) || []}
                value={maestros?.conceptos?.map((c: any) => ({ value: c.key, label: c.abreviatura || c.nombre })).find((o: any) => String(o.value) === String(form.concepto)) || null}
                onChange={(o: any) => setForm({ ...form, concepto: o?.value || '' })}
                placeholder="Seleccione..."
                isClearable
                styles={customSelectStyles}
                menuPortalTarget={document.body}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">* TIPO DE CONTADO</label>
              <Select
                options={maestros?.pagos?.map((c: any) => ({ value: c.key, label: c.nombre })) || []}
                value={maestros?.pagos?.map((c: any) => ({ value: c.key, label: c.nombre })).find((o: any) => String(o.value) === String(form.tipoContado)) || null}
                onChange={(o: any) => setForm({ ...form, tipoContado: o?.value || '' })}
                placeholder="Seleccione..."
                isClearable
                styles={customSelectStyles}
                menuPortalTarget={document.body}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">* TIPO DOCUMENTO</label>
              <Select
                options={maestros?.documentos?.map((c: any) => ({ value: c.key, label: c.nombre })) || []}
                value={maestros?.documentos?.map((c: any) => ({ value: c.key, label: c.nombre })).find((o: any) => String(o.value) === String(form.tipoDocumento)) || null}
                onChange={(o: any) => setForm({ ...form, tipoDocumento: o?.value || '' })}
                placeholder="Seleccione..."
                isClearable
                styles={customSelectStyles}
                menuPortalTarget={document.body}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">MOTIVO DUPLICADO</label>
              <Select
                options={motivos}
                value={motivos.find((o: any) => o.value === form.motivoDuplicado) || null}
                onChange={(o: any) => setForm({ ...form, motivoDuplicado: o?.value || '' })}
                placeholder="Seleccione..."
                isClearable
                styles={customSelectStyles}
                menuPortalTarget={document.body}
              />
            </div>
          </div>
        </div>

        {/* Resumen de Precios */}
        <div className="bg-slate-50 p-6 border-t border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SUBTOTAL</span>
              <span className="text-lg font-black text-[#052a79]">{formatCurrency(precios.subtotal)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">DESCUENTO</span>
              <span className="text-lg font-black text-[#052a79]">{formatCurrency(precios.descuento)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">BASE IMPONIBLE</span>
              <span className="text-lg font-black text-[#052a79]">{formatCurrency(precios.baseImponible)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">IGV 18%</span>
              <span className="text-lg font-black text-[#052a79]">{formatCurrency(precios.igv)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">TOTAL</span>
              <span className="text-lg font-black text-amber-500">{formatCurrency(precios.total)}</span>
            </div>
          </div>
        </div>

        {/* Botonera */}
        <div className="p-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row gap-3">
          <button 
            type="button" 
            className="flex-1 py-3 bg-slate-400 hover:bg-slate-500 text-white rounded-lg font-bold text-sm uppercase transition flex items-center justify-center gap-2"
          >
            <UserCog className="w-4 h-4" /> Cambiar cliente
          </button>
          
          <button 
            type="button" 
            className="flex-1 py-3 bg-slate-400 hover:bg-slate-500 text-white rounded-lg font-bold text-sm uppercase transition flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" /> Actualizar Poliza
          </button>

          <button 
            type="button" 
            onClick={handleGuardar}
            className="flex-1 py-3 bg-[#052a79] hover:bg-blue-900 text-white rounded-lg font-bold text-sm uppercase transition flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Guardar
          </button>
        </div>

      </div>
    </div>
  );
}
