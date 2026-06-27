import React, { useState } from 'react';
import Select from 'react-select';
import { Search, XCircle, Frown, HelpCircle } from 'lucide-react';
import { plantaSession, maestrosApi, inspeccionesApi } from '../../../../../services/api';
import Swal from 'sweetalert2';
//hola
interface CajaStepProps {
  maestros: any;
  formCaja: any;
  setFormCaja: (data: any) => void;
  handleCajaChange: (e: any) => void;
  handleSelectChange: (name: string, option: any) => void;
  setFormVehiculo?: (data: any) => void;
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
  setFormVehiculo,
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
  const [listaDescuentos, setListaDescuentos] = useState<any[]>([]);
  const [showDescuentosModal, setShowDescuentosModal] = useState(false);
  const [reinspeccionMensaje, setReinspeccionMensaje] = useState<string | null>(null);
  const [isReinspeccionAplica, setIsReinspeccionAplica] = useState<boolean>(false);
  const [isReinspeccionGratuita, setIsReinspeccionGratuita] = useState(false);
  const [vehiculoRapidoEncontrado, setVehiculoRapidoEncontrado] = useState(false);

  const handlePlacaBlur = async () => {
    if (formCaja.placa && formCaja.placa.length >= 6) {
      try {
        const res = await inspeccionesApi.consultarVehiculoRapido(formCaja.placa);
        if (res?.data) {
          const veh = res.data;
          setFormCaja((prev: any) => ({
            ...prev,
            categoria: veh.categoria_key || prev.categoria,
            tipoPlaca: veh.tipoplaca_key || prev.tipoPlaca
          }));
          setVehiculoRapidoEncontrado(true);
        } else {
          setVehiculoRapidoEncontrado(false);
        }
      } catch (err) {
        setVehiculoRapidoEncontrado(false);
      }
    } else {
      setVehiculoRapidoEncontrado(false);
    }
  };

  const handleConsultar = async () => {
    if (formCaja.placa && formCaja.concepto) {
      try {
        const planta = plantaSession.obtener();
        if (!planta?.key) {
          alert('Por favor seleccione una planta en el inicio.');
          return;
        }
        const res = await inspeccionesApi.consultarVehiculoYCaja({
          placa: formCaja.placa,
          concepto: formCaja.concepto,
          categoria: formCaja.categoria,
          tipoInspeccion: formCaja.tipoInspeccion,
          tipoCertificado: formCaja.tipoCertificado,
          tipoAutorizacion: formCaja.tipoAutorizacion,
          plantaKey: planta.key,
          documentoDescuento
        });

        if (res.status === 'success') {
          const data = res.data;
          if (data.vehiculo && data.mensaje && data.mensaje.includes('encontrado')) {
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: 'PLACA ENCONTRADA',
              text: 'REVISITA DE CLIENTE REGISTRADO',
              showConfirmButton: false,
              timer: 3000,
              customClass: {
                popup: 'bg-green-50'
              }
            });
          }

          const precios = data.precios;
          setPrecioSubtotal(precios.precioBase);
          setDescuento(precios.descuento);
          setPrecioTotal(precios.total);

          if (data.vehiculo?.tipoDocumentoSugerido) {
            setDocumentoPago(data.vehiculo.tipoDocumentoSugerido);
          }

          if (data.vehiculo && setFormVehiculo) {
            setFormVehiculo((prev: any) => ({
              ...prev,
              nroMotor: data.vehiculo.nromotor || '',
              nroSerie: data.vehiculo.nroserie || '',
              categoria: data.vehiculo.categoria_key || '',
              categoriaExtra: data.vehiculo.categoriaextra || '',
              clase: data.vehiculo.vehiculoclase_key || '',
              marca: data.vehiculo.marca_key || '',
              modelo: data.vehiculo.modelo_key || '',
              color: data.vehiculo.color_key || '',
              carroceria: data.vehiculo.carroceria_key || '',
              anioFabricacion: data.vehiculo.aniofabricacion || '',
              combustible: data.vehiculo.combustible_key || '',
              nroCilindros: data.vehiculo.nrocilindros || '',
              kilometraje: data.vehiculo.kilometraje || '',
              nroAsientos: data.vehiculo.nroasientos || '',
              nroPasajeros: data.vehiculo.nropasajeros || '',
              nroPuertas: data.vehiculo.nropuertas || '',
              nroPisos: data.vehiculo.nropisos || '',
              salidasEmergencia: data.vehiculo.nrosalidaemergencia || '',
              pesoSeco: data.vehiculo.pesoseco || '',
              cargaUtil: data.vehiculo.cargautil || '',
              pesoBruto: data.vehiculo.pesobruto || '',
              longitud: data.vehiculo.longitud || '',
              ancho: data.vehiculo.ancho || '',
              altura: data.vehiculo.alto || '',
              nroEjes: data.vehiculo.nroejes || '',
              nroRuedas: data.vehiculo.nroruedas || '',
              marcaCarroceria: data.vehiculo.marcacarroceria || '',
              nroSoat: data.vehiculo.nrosoat || '',
              tipoPoliza: data.vehiculo.tipopoliza_key || '',
              aseguradora: data.vehiculo.aseguradora_key || '',
              inicioSoat: data.vehiculo.fechiniciotarjetapropiedad ? data.vehiculo.fechiniciotarjetapropiedad.split('T')[0] : '',
              finSoat: data.vehiculo.fechfintarjetapropiedad ? data.vehiculo.fechfintarjetapropiedad.split('T')[0] : '',

              // Propietario
              nroDocProp: data.vehiculo.prop_nrodoc || '',
              tipoDocProp: data.vehiculo.prop_tipodoc || '',
              razonSocialProp: data.vehiculo.prop_razon || '',
              nombresProp: data.vehiculo.prop_nombres || '',
              apellidosProp: data.vehiculo.prop_apellidos || '',
              paisProp: data.vehiculo.prop_pais || '114', // Default Peru
              departamentoProp: data.vehiculo.prop_dep || '',
              provinciaProp: data.vehiculo.prop_prov || '',
              distritoProp: data.vehiculo.prop_dist || '',
              direccionProp: data.vehiculo.prop_dir || '',
              emailProp: data.vehiculo.prop_email || '',
              telefonoProp: data.vehiculo.prop_tel || '',
            }));
          }

          // Reiniciar posibles descuentos manuales aplicados
          setDocumentoDescuento('');

          // ---------------------------------------------
          // LÓGICA DE REINSPECCIÓN
          // ---------------------------------------------
          try {
            const resReins = await inspeccionesApi.consultarReinspeccion(formCaja.placa, formCaja.concepto, planta.key);
            if (resReins?.data?.aplica) {
              const rData = resReins.data;
              setIsReinspeccionAplica(true);
              setReinspeccionMensaje(rData.mensaje || `¡Aplica a Reinspección! Documento anterior: ${rData.nrodocumentoreinspeccion} (${rData.porcentajedescuento}% dscto)`);
              setFormCaja((prev: any) => ({
                ...prev,
                nrodocumentoreinspeccion: rData.nrodocumentoreinspeccion,
                concepto: rData.conceptoinspeccion_key || prev.concepto,
                tipoAutorizacion: rData.tipoautorizacion_key || prev.tipoAutorizacion,
                tipoCertificado: rData.tipocertificado_key || prev.tipoCertificado,
                tipoInspeccion: rData.tipoinspeccion_key || prev.tipoInspeccion
              }));

              if (rData.porcentajedescuento === 100) {
                setDescuento(precios.precioBase);
                setPrecioTotal(0);
                setIsReinspeccionGratuita(true);
                setDocumentoPago(''); // No se necesita boleta/factura si es gratis
              } else {
                const descCalc = precios.precioBase * (rData.porcentajedescuento / 100);
                setDescuento(descCalc);
                setPrecioTotal(precios.precioBase - descCalc);
                setIsReinspeccionGratuita(false);
              }
            } else if (resReins?.data?.mensaje) {
              setIsReinspeccionAplica(false);
              setReinspeccionMensaje(resReins.data.mensaje);
              setIsReinspeccionGratuita(false);
              setFormCaja((prev: any) => ({ ...prev, nrodocumentoreinspeccion: null }));
            } else {
              setIsReinspeccionAplica(false);
              setReinspeccionMensaje(null);
              setIsReinspeccionGratuita(false);
              setFormCaja((prev: any) => ({ ...prev, nrodocumentoreinspeccion: null }));
            }
          } catch (e) {
            console.error("Error al consultar reinspeccion", e);
            setIsReinspeccionAplica(false);
            setReinspeccionMensaje(null);
            setIsReinspeccionGratuita(false);
            setFormCaja((prev: any) => ({ ...prev, nrodocumentoreinspeccion: null }));
          }
          // ---------------------------------------------

        }
      } catch (err: any) {
        console.error('Error calculando precio:', err);
        Swal.fire({
          icon: 'warning',
          title: 'Aviso',
          text: err.message === "PLACA DUPLICADA EN SISTEMA" ? "Esta placa ya pasó inspección hoy con el mismo concepto en esta planta. PLACA DUPLICADA EN SISTEMA." : (err.message || 'Error en la consulta')
        });
        setPrecioSubtotal(0);
        setDescuento(0);
        setPrecioTotal(0);
      } finally {
        setIsConsultado(true);
      }
    } else {
      if (!formCaja.placa || !formCaja.concepto) {
        alert('Para consultar, ingrese la Placa y seleccione un Concepto.');
      } else {
        setShowCamposVaciosModal(true);
      }
    }
  };

  const handleBuscarDescuentos = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!documentoDescuento || !formCaja.concepto) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Ingrese documento y seleccione concepto'
      });
      return;
    }
    try {
      const res = await inspeccionesApi.buscarDescuentos(documentoDescuento, formCaja.concepto);
      if (res.status === 'success') {
        const descuentos = res.data;
        if (descuentos.length > 0) {
          setListaDescuentos(descuentos);
          setShowDescuentosModal(true);
        } else {
          Swal.fire({
            icon: 'info',
            iconHtml: '😢',
            title: '¡Ups!',
            text: 'No se encontraron promociones para este RUC/DNI',
            customClass: {
              icon: 'border-none text-4xl text-blue-500'
            }
          });
        }
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || "Error al buscar descuentos"
      });
    }
  };

  const aplicarDescuento = (desc: any) => {
    setDescuento(desc.monto);
    setPrecioTotal(precioSubtotal - desc.monto);
    setFormCaja({ ...formCaja, descuentoObj: desc });
    setShowDescuentosModal(false);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-[#052a79] uppercase border-b border-amber-200/60 pb-2">
        Datos de Caja
      </h3>

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
                isDisabled={isConsultado}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Placa *</label>
              <input
                type="text"
                name="placa"
                value={formCaja.placa}
                onChange={handleCajaChange}
                onBlur={handlePlacaBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handlePlacaBlur();
                  }
                }}
                placeholder="Ej: ABC-123"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 outline-none transition uppercase"
                maxLength={getPlacaMaxLength()}
                disabled={isConsultado}
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
                isDisabled={isConsultado}
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
          onClick={handleConsultar}
          className="flex items-center gap-2 rounded-lg bg-[#052a79] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-900 border border-[#052a79] transition uppercase tracking-wide"
        >
          <Search className="w-4 h-4" />
          Consultar
        </button>

        <button
          type="button"
          onClick={() => {
            setFormCaja({
              tipoPlaca: '', placa: '', concepto: '', categoria: '', tipoInspeccion: '', tipoCertificado: '', tipoAutorizacion: '', nrodocumentoreinspeccion: null
            });
            setIsConsultado(false);
            setDocumentoDescuento('');
            setReinspeccionMensaje(null);
            setIsReinspeccionGratuita(false);
          }}
          className="flex items-center gap-2 rounded-lg bg-white border border-red-200 text-red-600 px-6 py-2.5 text-xs font-bold hover:bg-red-50 shadow-sm transition uppercase tracking-wide"
        >
          <XCircle className="w-4 h-4" />
          Anular
        </button>
      </div>

      {reinspeccionMensaje && (
        <div className={`mt-4 p-4 rounded-lg border-2 shadow-md flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${isReinspeccionAplica ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-400'}`}>
          <div className={`p-2 rounded-full ${isReinspeccionAplica ? 'bg-green-100' : 'bg-red-100'}`}>
            <Search className={`w-5 h-5 ${isReinspeccionAplica ? 'text-green-700' : 'text-red-600'}`} />
          </div>
          <div>
            <h4 className={`font-black uppercase text-sm ${isReinspeccionAplica ? 'text-green-800' : 'text-red-800'}`}>
              {isReinspeccionAplica ? 'Inspección Vinculada' : 'Aviso de Reinspección'}
            </h4>
            <p className={`font-bold text-xs ${isReinspeccionAplica ? 'text-green-700' : 'text-red-700'}`}>
              {reinspeccionMensaje}
            </p>
          </div>
        </div>
      )}

      {isConsultado && !isReinspeccionGratuita && (
        <div className="mt-4 p-4 rounded-lg bg-[#f2cc11] border-2 border-[#e0bc0d] shadow-md">
          <div className="flex items-center gap-3 mb-3">
            <h4 className="text-[#052a79] font-black uppercase text-sm drop-shadow-sm">
              Buscar descuentos por: Código / DNI / RUC / Placa
            </h4>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={documentoDescuento}
              onChange={(e) => setDocumentoDescuento(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleBuscarDescuentos(e);
                }
              }}
              placeholder="Número de documento..."
              className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-amber-500 outline-none"
            />
            <button type="button" onClick={(e) => handleBuscarDescuentos(e)} className="bg-[#052a79] text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-blue-900 transition flex items-center gap-2 uppercase">
              <Search className="w-3 h-3" /> Buscar
            </button>
          </div>
        </div>
      )}

      {showDescuentosModal && (
        <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 shadow-inner">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
            <h3 className="text-[#052a79] font-bold text-sm uppercase flex items-center gap-2">
              <Search className="w-4 h-4" /> Promociones Disponibles
            </h3>
            <button onClick={() => setShowDescuentosModal(false)} className="text-slate-400 hover:text-red-500 transition-colors" title="Cerrar">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-slate-600 mb-3 font-medium">
            Seleccione el descuento a aplicar para el documento <span className="font-bold text-slate-900 bg-amber-100 px-1.5 py-0.5 rounded">{documentoDescuento}</span>:
          </p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {listaDescuentos.map((desc: any) => (
              <div key={desc.id} className="flex items-center justify-between p-3 rounded border border-slate-200 bg-white hover:border-amber-400 hover:shadow-sm transition-all group">
                <div className="flex-1 pr-4">
                  <p className="font-bold text-[#052a79] text-xs uppercase leading-tight group-hover:text-amber-600 transition-colors">{desc.campana}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 border-l border-slate-100 pl-4">
                  <span className="font-black text-red-600 text-sm">- S/ {desc.monto.toFixed(2)}</span>
                  <button
                    onClick={() => aplicarDescuento(desc)}
                    className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold px-4 py-2 rounded text-xs uppercase transition-colors shadow-sm"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isConsultado && !isReinspeccionGratuita && (
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

      {isConsultado && isReinspeccionGratuita && (
        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-green-50 p-5 text-center">
            <h3 className="text-lg font-black text-green-700 uppercase">Reinspección 100% Gratuita</h3>
            <p className="text-green-600 text-sm font-bold mt-1">El monto a pagar es S/ 0.00. Puede continuar al siguiente paso sin requerir pago ni comprobante.</p>
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
                    tipoPlaca: '', placa: '', concepto: '', categoria: '', tipoInspeccion: '', tipoCertificado: '', tipoAutorizacion: '', nrodocumentoreinspeccion: null
                  });
                  setIsConsultado(false);
                  setPrecioSubtotal(0);
                  setDescuento(0);
                  setPrecioTotal(0);
                  setDocumentoPago('');
                  setShowAnularModal(false);
                  setReinspeccionMensaje(null);
                  setIsReinspeccionGratuita(false);
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
