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
  const [hasAutoFetchedDescuentos, setHasAutoFetchedDescuentos] = useState(false);
  const [reinspeccionMensaje, setReinspeccionMensaje] = useState<string | null>(null);
  const [isReinspeccionAplica, setIsReinspeccionAplica] = useState<boolean>(false);
  const [isReinspeccionGratuita, setIsReinspeccionGratuita] = useState(false);
  const [vehiculoRapidoEncontrado, setVehiculoRapidoEncontrado] = useState(false);
  const [activasReinspecciones, setActivasReinspecciones] = useState<any[]>([]);
  const [isLockedForReinspeccion, setIsLockedForReinspeccion] = useState(false);

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

        // Consultar reinspecciones activas para mostrar notificación
        try {
          const resActivas = await inspeccionesApi.consultarReinspeccionesActivas(formCaja.placa);
          if (resActivas?.data && resActivas.data.length > 0) {
            setActivasReinspecciones(resActivas.data);
            
            // Mostrar Toast "Ojito" inmediatamente al detectar la placa
            let reinsHtml = '<ul style="margin: 8px 0 0 20px; padding: 0; list-style-type: disc; color: #1f2937; line-height: 1.6;">';
            resActivas.data.forEach((act: any) => {
              reinsHtml += `<li style="margin-bottom: 6px;"><strong>${act.concepto_nombre}</strong><br/><span style="font-size: 0.9em; color: #4b5563;">(Quedan ${act.dias_restantes} días, ${act.intentos_restantes} intentos)</span></li>`;
            });
            reinsHtml += '</ul>';
            
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'info',
              html: `<div style="text-align: left; margin-top: 8px; padding-top: 8px;">
                <strong style="color: #b91c1c; font-size: 1.05em;">⚠️ REINSPECCIONES ACTIVAS EN ESTA PLACA:</strong>
                ${reinsHtml}
              </div>`,
              showConfirmButton: false,
              showCloseButton: true,
              timer: 15000,
              timerProgressBar: true
            });
          } else {
            setActivasReinspecciones([]);
          }
        } catch(e) {
          setActivasReinspecciones([]);
        }
      } catch (err) {
        setVehiculoRapidoEncontrado(false);
        setActivasReinspecciones([]);
      }
    } else {
      setVehiculoRapidoEncontrado(false);
      setActivasReinspecciones([]);
    }
  };

  // EFECTO AUTOMÁTICO DE REINSPECCIÓN: Si se llena placa y concepto, verificar si aplica
  React.useEffect(() => {
    const checkAutoReinspeccion = async () => {
      if (formCaja.placa && formCaja.placa.length >= 6 && formCaja.concepto) {
        const planta = plantaSession.obtener();
        if (!planta?.key) return;
        
        try {
          const resReins = await inspeccionesApi.consultarReinspeccion(formCaja.placa, formCaja.concepto, planta.key);
          if (resReins?.data?.aplica) {
            const rData = resReins.data;
            setIsReinspeccionAplica(true);
            setReinspeccionMensaje(rData.mensaje || `¡Aplica a Reinspección! Documento anterior: ${rData.nrodocumentoreinspeccion} (${rData.porcentajedescuento}% dscto)`);
            
            // Extraer tipoPlaca de ui_metadata si existe
            let oldTipoPlaca = formCaja.tipoPlaca;
            if (rData.ui_metadata && rData.ui_metadata.formCaja && rData.ui_metadata.formCaja.tipoPlaca) {
              oldTipoPlaca = rData.ui_metadata.formCaja.tipoPlaca;
            }

            // AUTO-FILL de todos los campos según la reinspección anterior
                          // AUTO-FILL de todos los campos segun la reinspeccion anterior
              setFormCaja((prev: any) => ({
                ...prev,
                nrodocumentoreinspeccion: rData.nrodocumentoreinspeccion,
                tipoAutorizacion: rData.tipoautorizacion_key || prev.tipoAutorizacion,
                tipoCertificado: rData.tipocertificado_key || prev.tipoCertificado,
                tipoInspeccion: rData.tipoinspeccion_key || prev.tipoInspeccion,
                categoria: rData.categoria_key || prev.categoria,
                tipoPlaca: oldTipoPlaca
              }));

              // Y RESTAURAMOS TODOS LOS DATOS DEL VEHICULO Y SOAT (Si existen)
              if (setFormVehiculo) {
                let vehData = {};
                // 1. Cargamos el snapshot anterior si existe
                if (rData.ui_metadata && rData.ui_metadata.formVehiculo) {
                  vehData = { ...rData.ui_metadata.formVehiculo };
                }
                
                // 2. Sobreescribimos con los datos ACTUALES de la BD (si existen) para permitir
                //    que cualquier corrección manual hecha en la BD se refleje en la reinspección
                if (rData.vehiculo_actual) {
                  const v = rData.vehiculo_actual;
                  vehData = {
                    ...vehData,
                    nroMotor: v.nromotor || vehData.nroMotor || '',
                    nroSerie: v.nroserie || vehData.nroSerie || '',
                    categoria: v.categoria_key || vehData.categoria || '',
                    clase: v.vehiculoclase_key || vehData.clase || '',
                    clase_label: v.clase_nombre || vehData.clase_label || '',
                    marca: v.marca_key || vehData.marca || '',
                    marca_label: v.marca_nombre || vehData.marca_label || '',
                    modelo: v.modelo_key || vehData.modelo || '',
                    modelo_label: v.modelo_nombre || vehData.modelo_label || '',
                    color: v.color_key || vehData.color || '',
                    color_label: v.color_nombre || vehData.color_label || '',
                    carroceria: v.carroceria_key || vehData.carroceria || '',
                    carroceria_label: v.carroceria_nombre || vehData.carroceria_label || '',
                    anioFabricacion: v.aniofabricacion || vehData.anioFabricacion || '',
                    combustible: v.combustible_key || vehData.combustible || '',
                    nroCilindros: v.nrocilindros || vehData.nroCilindros || '',
                    kilometraje: v.kilometraje || vehData.kilometraje || '',
                    kilometrajeOriginal: v.kilometraje || vehData.kilometrajeOriginal || 0,
                    nroAsientos: v.nroasientos || vehData.nroAsientos || '',
                    nroPasajeros: v.nropasajeros || vehData.nroPasajeros || '',
                    nroPuertas: v.nropuertas || vehData.nroPuertas || '',
                    nroPisos: v.nropisos || vehData.nroPisos || '',
                    salidasEmergencia: v.nrosalidaemergencia || vehData.salidasEmergencia || '',
                    pesoSeco: v.pesoseco || vehData.pesoSeco || '',
                    cargaUtil: v.cargautil || vehData.cargaUtil || '',
                    pesoBruto: v.pesobruto || vehData.pesoBruto || '',
                    longitud: v.longitud || vehData.longitud || '',
                    ancho: v.ancho || vehData.ancho || '',
                    altura: v.alto || vehData.altura || '',
                    nroEjes: v.nroejes || vehData.nroEjes || '',
                    nroRuedas: v.nroruedas || vehData.nroRuedas || '',
                    marcaCarroceria: v.marcacarroceria || vehData.marcaCarroceria || '',
                    nroSoat: v.nrosoat || vehData.nroSoat || '',
                    tipoPoliza: v.tipopoliza_key || vehData.tipoPoliza || '',
                    aseguradora: v.aseguradora_key || vehData.aseguradora || '',
                    fechaEmisionSoat: v.fechiniciotarjetapropiedad ? v.fechiniciotarjetapropiedad.split('T')[0] : (vehData.fechaEmisionSoat || ''),
                    fechaVencimientoSoat: v.fechfintarjetapropiedad ? v.fechfintarjetapropiedad.split('T')[0] : (vehData.fechaVencimientoSoat || ''),
                    mesesSoat: (v.fechiniciotarjetapropiedad && v.fechfintarjetapropiedad) 
                               ? (((new Date(v.fechfintarjetapropiedad).getFullYear() - new Date(v.fechiniciotarjetapropiedad).getFullYear()) * 12) + (new Date(v.fechfintarjetapropiedad).getMonth() - new Date(v.fechiniciotarjetapropiedad).getMonth()) <= 6 ? '6' : '12')
                               : (vehData.mesesSoat || '12'),
                    tipoDocProp: v.prop_tipodoc || vehData.tipoDocProp || '',
                    nroDocProp: v.prop_nrodoc || vehData.nroDocProp || '',
                    razonSocialProp: v.prop_razon || vehData.razonSocialProp || '',
                    nombresProp: v.prop_nombres || vehData.nombresProp || '',
                    apellidosProp: v.prop_apellidos || vehData.apellidosProp || '',
                    paisProp: v.prop_pais || vehData.paisProp || '',
                    departamentoProp: v.prop_dep || vehData.departamentoProp || '',
                    provinciaProp: v.prop_prov || vehData.provinciaProp || '',
                    distritoProp: v.prop_dist || vehData.distritoProp || '',
                    direccionProp: v.prop_dir || vehData.direccionProp || '',
                    emailProp: v.prop_email || vehData.emailProp || '',
                    telefonoProp: v.prop_tel || vehData.telefonoProp || '',
                  };
                }
                
                if (Object.keys(vehData).length > 0) {
                  setFormVehiculo(vehData);
                }
              }

            // Bloquear los campos
            setIsLockedForReinspeccion(true);

            // Simular cálculo de precios si es 100% gratuita
            if (rData.porcentajedescuento === 100) {
              setDescuento(0); // El descuento se calcula en base al precio original, pero para reinspección lo podemos dejar en 0 o el total.
              setPrecioTotal(0);
              setIsReinspeccionGratuita(true);
              setDocumentoPago(''); 
              setIsConsultado(true); // Pasar directamente a consultado!
            }
            
          } else {
            // Si no aplica reinspección, desbloquear
            setIsLockedForReinspeccion(false);
            setIsReinspeccionAplica(false);
            setReinspeccionMensaje(null);
            setIsReinspeccionGratuita(false);
            setFormCaja((prev: any) => ({ ...prev, nrodocumentoreinspeccion: null }));
          }
        } catch (e) {
          setIsLockedForReinspeccion(false);
        }
      } else {
        setIsLockedForReinspeccion(false);
      }
    };
    
    checkAutoReinspeccion();
  }, [formCaja.placa, formCaja.concepto]);

  const handleConsultar = async () => {
    if (
      formCaja.placa && 
      formCaja.concepto && 
      formCaja.tipoPlaca && 
      formCaja.categoria && 
      formCaja.tipoInspeccion && 
      formCaja.tipoCertificado
    ) {
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
          let vehiculoEncontrado = false;
          if (data.vehiculo && data.mensaje && data.mensaje.includes('encontrado')) {
            vehiculoEncontrado = true;
          }

          const precios = data.precios;
          setPrecioSubtotal(precios.precioBase);
          setDescuento(precios.descuento);
          setPrecioTotal(precios.total);
          setIsReinspeccionGratuita(precios.esReinspeccion || false);

          // REINSPECCIÓN MODAL (Se mantiene como modal central)
          if (data.mensaje && data.mensaje.includes('[Reinspección]')) {
            Swal.fire({
              icon: 'info',
              title: 'REINSPECCIÓN GRATUITA',
              text: data.mensaje,
              confirmButtonText: 'Entendido',
              confirmButtonColor: '#3085d6'
            });
          }

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
              marca_label: data.vehiculo.marca_nombre || '',
              modelo: data.vehiculo.modelo_key || '',
              modelo_label: data.vehiculo.modelo_nombre || '',
              color: data.vehiculo.color_key || '',
              color_label: data.vehiculo.color_nombre || '',
              carroceria: data.vehiculo.carroceria_key || '',
              carroceria_label: data.vehiculo.carroceria_nombre || '',
              anioFabricacion: data.vehiculo.aniofabricacion || '',
              combustible: data.vehiculo.combustible_key || '',
              nroCilindros: data.vehiculo.nrocilindros || '',
              kilometraje: data.vehiculo.kilometraje || '',
              kilometrajeOriginal: data.vehiculo.kilometraje || 0,
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
              fechaEmisionSoat: data.vehiculo.fechiniciotarjetapropiedad ? data.vehiculo.fechiniciotarjetapropiedad.split('T')[0] : '',
              fechaVencimientoSoat: data.vehiculo.fechfintarjetapropiedad ? data.vehiculo.fechfintarjetapropiedad.split('T')[0] : '',
              mesesSoat: data.vehiculo.fechiniciotarjetapropiedad && data.vehiculo.fechfintarjetapropiedad ? 
                (new Date(data.vehiculo.fechfintarjetapropiedad).getFullYear() - new Date(data.vehiculo.fechiniciotarjetapropiedad).getFullYear()) * 12 === 6 ? '6' : '12' : '12',

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
              // Extraer tipoPlaca de ui_metadata si existe
              let oldTipoPlaca = formCaja.tipoPlaca;
              if (rData.ui_metadata && rData.ui_metadata.formCaja && rData.ui_metadata.formCaja.tipoPlaca) {
                oldTipoPlaca = rData.ui_metadata.formCaja.tipoPlaca;
              }

              // AUTO-FILL de todos los campos segun la reinspeccion anterior
              setFormCaja((prev: any) => ({
                ...prev,
                nrodocumentoreinspeccion: rData.nrodocumentoreinspeccion,
                tipoAutorizacion: rData.tipoautorizacion_key || prev.tipoAutorizacion,
                tipoCertificado: rData.tipocertificado_key || prev.tipoCertificado,
                tipoInspeccion: rData.tipoinspeccion_key || prev.tipoInspeccion,
                categoria: rData.categoria_key || prev.categoria,
                tipoPlaca: oldTipoPlaca
              }));

              // Y RESTAURAMOS TODOS LOS DATOS DEL VEHICULO Y SOAT (Si existen)
              if (rData.ui_metadata && rData.ui_metadata.formVehiculo && setFormVehiculo) {
                setFormVehiculo(rData.ui_metadata.formVehiculo);
              }

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

          // ---------------------------------------------
          // AUTO-MOSTRAR DESCUENTOS SI HAY DISPONIBLES
          // ---------------------------------------------
          let hasDescuentos = false;
          if (data.descuentosDisponibles && data.descuentosDisponibles.length > 0) {
            setListaDescuentos(data.descuentosDisponibles);
            setShowDescuentosModal(true);
            hasDescuentos = true;
          }
          // ---------------------------------------------

          // ---------------------------------------------
          // MOSTRAR TOAST COMBINADO PERMANENTE
          // ---------------------------------------------
          let currentActivas = activasReinspecciones;
          try {
            // Asegurarnos de tener la info más reciente (evita race condition si consultó muy rápido)
            const resActivas = await inspeccionesApi.consultarReinspeccionesActivas(formCaja.placa);
            if (resActivas?.data) {
              currentActivas = resActivas.data;
              setActivasReinspecciones(resActivas.data);
            }
          } catch(e) {}

          let toastHtml = '';
          if (vehiculoEncontrado) {
            const isMtc = data.mensaje.includes('MTC');
            const titulo = isMtc ? 'ENCONTRADA EN MTC' : 'PLACA ENCONTRADA';
            const texto = isMtc ? 'DATOS EXTRAÍDOS DEL MTC' : 'REVISITA DE CLIENTE REGISTRADO';
            toastHtml += `<div style="margin-bottom: 8px; text-align: left;"><strong>✅ ${titulo}</strong><br/>${texto}</div>`;
          }
          if (hasDescuentos) {
            toastHtml += `<div style="margin-bottom: 8px; text-align: left;"><strong>🎁 PROMOCIONES ENCONTRADAS</strong><br/>Se encontraron descuentos disponibles.</div>`;
          }
          
          if (toastHtml) {
            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'info',
              html: toastHtml,
              showConfirmButton: false,
              showCloseButton: true,
              timer: undefined // Permanente
            });
          }
          // ---------------------------------------------
          setIsConsultado(true);
        }
      } catch (err: any) {
        Swal.fire({
          icon: 'warning',
          title: 'Aviso',
          text: err.message || 'Error en la consulta',
        });
        setPrecioSubtotal(0);
        setDescuento(0);
        setPrecioTotal(0);
        setIsConsultado(false);
      }
      } else {
        setShowCamposVaciosModal(true);
      }
  };

  React.useEffect(() => {
    if (formCaja.descuentoObj && !hasAutoFetchedDescuentos && formCaja.placa && formCaja.concepto) {
      setHasAutoFetchedDescuentos(true);
      
      const fetchList = async () => {
        try {
          // If a draft is loaded with a discount, fetch its list to display in the modal
          // Determine the search query (documentoDescuento or placa)
          let query = documentoDescuento;
          if (!query) {
             query = formCaja.descuentoObj.documento || formCaja.placa;
             setDocumentoDescuento(query);
          }
          const res = await inspeccionesApi.buscarDescuentos(query, formCaja.concepto);
          if (res.status === 'success' && res.data.length > 0) {
            setListaDescuentos(res.data);
            setShowDescuentosModal(true);
          }
        } catch (err) {
          console.error("Error auto-fetching descuentos para borrador:", err);
        }
      };
      fetchList();
    }
  }, [formCaja.descuentoObj, formCaja.placa, formCaja.concepto, hasAutoFetchedDescuentos, documentoDescuento, setDocumentoDescuento]);

  const handleBuscarDescuentos = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!documentoDescuento || !formCaja.concepto) {
      Swal.fire({
        icon: 'warning',
        title: 'Faltan datos',
        text: 'Debe seleccionar un concepto e ingresar el documento a buscar'
      });
      return;
    }

    // Prevenir búsqueda de placas en esta barra manual
    const esFormatoPlaca = /^([A-Za-z]{2,3}-?\d{3,4}|\d{3,4}-?[A-Za-z]{2,3}|[A-Za-z0-9]{3}-?\d{3})$/.test(documentoDescuento.trim().toUpperCase());
    if (esFormatoPlaca) {
      Swal.fire({
        icon: 'warning',
        title: 'Búsqueda no permitida',
        text: 'Los descuentos vehiculares ya se buscan automáticamente con el botón azul "Consultar". Usa esta barra únicamente para buscar por DNI, RUC o Códigos Promocionales.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    try {
      const res = await inspeccionesApi.buscarDescuentos(documentoDescuento, formCaja.concepto, formCaja.placa, true);
      if (res.status === 'success') {
        const descuentosNuevos = res.data;
        
        if (descuentosNuevos.length > 0) {
          // Filtrar para no agregar duplicados (basado en source_id)
          setListaDescuentos(prevLista => {
            const listaCombinada = [...prevLista];
            descuentosNuevos.forEach((nuevo: any) => {
              if (!listaCombinada.some(item => item.source_id === nuevo.source_id)) {
                listaCombinada.push(nuevo);
              }
            });
            return listaCombinada;
          });
          
          setShowDescuentosModal(true);
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Nuevos descuentos añadidos',
            text: 'Se han sumado a la lista disponible.',
            showConfirmButton: false,
            timer: 3000
          });
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
    const isCuponidad = desc.tipodescuento_key === 'aliestrategica' || (desc.campana || desc.nombre || '').toUpperCase().includes('CUPONIDAD');
    const isCortesia = desc.tipodescuento_key === 'corte' || (desc.campana || desc.nombre || '').toUpperCase().includes('CORTESIA') || (desc.campana || desc.nombre || '').toUpperCase().includes('CORTESÍA');

    let finalPrecioTotal = precioSubtotal;
    let finalDescuento = 0;

    const tipoCobro = desc.tipopagodescuento_key || 'MON'; // Valor por defecto

    if (isCortesia || isCuponidad) {
      finalPrecioTotal = 0;
      finalDescuento = precioSubtotal;
    } else {
      if (tipoCobro === 'FLA') {
        // Flat (Monto fijo a pagar)
        finalPrecioTotal = desc.monto;
        finalDescuento = Math.max(0, precioSubtotal - desc.monto);
      } else if (tipoCobro === 'POR') {
        // Porcentaje a descontar
        finalDescuento = precioSubtotal * (desc.monto / 100);
        finalPrecioTotal = Math.max(0, precioSubtotal - finalDescuento);
      } else {
        // Monto fijo a descontar (MON)
        finalDescuento = desc.monto;
        finalPrecioTotal = Math.max(0, precioSubtotal - finalDescuento);
      }
    }

    // Seguro contra descuentos mayores al precio
    if (finalDescuento > precioSubtotal) {
      finalDescuento = precioSubtotal;
      finalPrecioTotal = 0;
    }

    setDescuento(finalDescuento);
    setPrecioTotal(finalPrecioTotal);
    setFormCaja({ 
      ...formCaja, 
      descuentoObj: { 
        ...desc, 
        monto: finalDescuento, 
        montoBaseOperacion: desc.monto,
        isCuponidad: isCuponidad,
        documentoBusqueda: documentoDescuento 
      } 
    });
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

        const calcTotal = precioSubtotal - descuento;
        const calcBaseImponible = calcTotal / 1.18;
        const calcIgv = calcTotal - calcBaseImponible;

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
                isDisabled={isConsultado || isLockedForReinspeccion}
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
                disabled={isConsultado || isLockedForReinspeccion}
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
                isDisabled={isLockedForReinspeccion}
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
                isDisabled={isConsultado || isLockedForReinspeccion}
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
                isDisabled={isLockedForReinspeccion}
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
                isDisabled={isLockedForReinspeccion}
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
                isDisabled={isConsultado || isLockedForReinspeccion}
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
            setIsLockedForReinspeccion(false);
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
              disabled={formCaja.descuentoObj?.isCuponidad || isLockedForReinspeccion}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!formCaja.descuentoObj?.isCuponidad && !isLockedForReinspeccion) {
                    handleBuscarDescuentos(e);
                  }
                }
              }}
              placeholder={formCaja.descuentoObj?.isCuponidad ? "Cupón ya aplicado" : "Número de documento..."}
              className={`flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none ${formCaja.descuentoObj?.isCuponidad ? 'opacity-60 cursor-not-allowed bg-slate-100' : 'focus:border-amber-500'}`}
            />
            <button 
              type="button" 
              onClick={(e) => handleBuscarDescuentos(e)} 
              disabled={formCaja.descuentoObj?.isCuponidad || isLockedForReinspeccion}
              className={`text-white px-6 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 uppercase ${(formCaja.descuentoObj?.isCuponidad || isLockedForReinspeccion) ? 'bg-slate-400 cursor-not-allowed opacity-80' : 'bg-[#052a79] hover:bg-blue-900'}`}
            >
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
            {listaDescuentos.map((desc: any) => {
              const isApplied = formCaja.descuentoObj?.source_id === desc.source_id && formCaja.descuentoObj?.source_table === desc.source_table;
              return (
                <div key={desc.id || `${desc.source_table}-${desc.source_id}`} className={`flex items-center justify-between p-3 rounded border transition-all group ${isApplied ? 'border-green-500 bg-green-50 shadow-md ring-1 ring-green-400' : 'border-slate-200 bg-white hover:border-amber-400 hover:shadow-sm'}`}>
                  <div className="flex-1 pr-4">
                    <p className={`font-bold text-xs uppercase leading-tight transition-colors ${isApplied ? 'text-green-800' : 'text-[#052a79] group-hover:text-amber-600'}`}>
                      {desc.campana}
                      {isApplied && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-200 text-green-800">ACTIVO</span>}
                    </p>
                  </div>
                  <div className={`flex items-center gap-3 shrink-0 border-l pl-4 ${isApplied ? 'border-green-200' : 'border-slate-100'}`}>
                    {desc.tipodescuento_key !== 'corte' && (
                      <span className="font-black text-red-600 text-sm">- S/ {desc.monto.toFixed(2)}</span>
                    )}
                    <button
                      onClick={() => aplicarDescuento(desc)}
                      disabled={isApplied}
                      className={`font-bold px-4 py-2 rounded text-xs uppercase transition-colors shadow-sm ${isApplied ? 'bg-green-600 text-white cursor-not-allowed opacity-80' : 'bg-amber-400 hover:bg-amber-500 text-amber-950'}`}
                    >
                      {isApplied ? 'Aplicado' : 'Aplicar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isConsultado && !isReinspeccionGratuita && (
        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-[#f4f9ff] border-b border-[#052a79]/10 p-3">
            <h3 className="text-sm font-black text-[#052a79] uppercase tracking-wide">Resumen de Pago</h3>
          </div>
          <div className="p-5 bg-white grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
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
              <label className="text-[10px] font-bold text-slate-500 uppercase">Base Imponible (S/)</label>
              <input type="text" readOnly value={(precioSubtotal > 0 ? (precioSubtotal - descuento) / 1.18 : 0).toFixed(2)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 text-right outline-none" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">IGV 18% (S/)</label>
              <input type="text" readOnly value={(precioSubtotal > 0 ? (precioSubtotal - descuento) - ((precioSubtotal - descuento) / 1.18) : 0).toFixed(2)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 text-right outline-none" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Dscto. (S/)</label>
              <input type="text" readOnly value={descuento.toFixed(2)} className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 text-right outline-none" />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <label className="text-[10px] font-black text-[#052a79] uppercase">Total (S/)</label>
              <input type="text" readOnly value={precioTotal.toFixed(2)} className="w-full rounded-lg border-2 border-[#052a79] bg-[#f4f9ff] px-3 py-2 text-lg font-black text-[#052a79] text-right outline-none shadow-inner" />
            </div>
          </div>

          {formCaja.descuentoObj?.isCuponidad && (
            <div className="bg-amber-50 px-5 py-3 border-t border-amber-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="bg-amber-500 text-white font-black text-[10px] px-2 py-1 rounded-sm uppercase tracking-wider">CUPONIDAD</div>
                <span className="text-amber-900 font-bold text-sm">
                  Código Aplicado: <span className="font-black bg-white px-2 py-0.5 rounded border border-amber-300 ml-1">{formCaja.descuentoObj.documentoBusqueda || formCaja.descuentoObj.uuid}</span>
                </span>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-xs font-bold text-amber-800 uppercase mb-1">Tipo de Descuento:</p>
                
                {(!formCaja.descuentoObj.tipopagodescuento_key || formCaja.descuentoObj.tipopagodescuento_key === 'MON') && (
                  <p className="text-sm font-black text-amber-900">
                    MONTO (S/ -{(formCaja.descuentoObj.montoBaseOperacion || 0).toFixed(2)})
                  </p>
                )}

                {formCaja.descuentoObj.tipopagodescuento_key === 'POR' && (
                  <p className="text-sm font-black text-amber-900">
                    PORCENTAJE (-{formCaja.descuentoObj.montoBaseOperacion || 0}%)
                  </p>
                )}

                {formCaja.descuentoObj.tipopagodescuento_key === 'FLA' && (
                  <div className="flex flex-col items-end gap-1 mt-0.5">
                    <span className="text-sm font-black text-amber-900 bg-white/60 px-2 py-0.5 rounded border border-amber-300">
                      TARIFA PLANA: S/ {(formCaja.descuentoObj.montoBaseOperacion || 0).toFixed(2)}
                    </span>
                    <span className="text-[11px] font-black text-green-700 bg-green-100 px-2 py-1 rounded shadow-sm border border-green-300">
                      ✅ TARIFA YA FUE PAGADA (PAGA: S/ 0.00)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
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
                  setIsLockedForReinspeccion(false);
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
