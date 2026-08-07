import { useState, useEffect } from 'react';
import { 
  Save, AlertTriangle, Ban, FileText, Printer, ShieldAlert, CheckCircle2, Truck, Activity, FileSignature, Settings, Lock, XCircle
} from 'lucide-react';
import ModalVisualizarRecibo from './ModalVisualizarRecibo';
import { ModalModificarPropietario } from './ModalModificarPropietario';
import { ModalAnularInspeccion } from './ModalAnularInspeccion';
import ModalErrorImpresion from './ModalErrorImpresion';
import { ModalPolizaMtc } from './ModalPolizaMtc';
import { ModalCambiarLinea } from './ModalCambiarLinea';
import { ModalCambioMotor } from './ModalCambioMotor';
import { ModalCambiarFirma } from './ModalCambiarFirma';
import { ModalCambiarObservacion } from './ModalCambiarObservacion';
import { ModalRegistroResultados } from './ModalRegistroResultados';
import { maestrosApi, lineaApi } from '@/services/api';

interface ConsolidacionLegacyPanelProps {
  mode: 'resumen' | 'final';
  nroInspeccion: string;
  estadoLinea: any;
  onRefresh?: () => void;
  formConsolidacion: any;
  onChangeFormConsolidacion: (val: any) => void;
}

export function ConsolidacionLegacyPanel({ 
  mode, 
  nroInspeccion, 
  estadoLinea,
  onRefresh,
  formConsolidacion,
  onChangeFormConsolidacion
}: ConsolidacionLegacyPanelProps) {

  const { vehiculo, comprobante, modo } = estadoLinea;
  
  const getNombreORazonSocial = (persona: any) => {
  
  console.log(bannerClass, bannerIcon, btnLegacyClass, btnDisabled, Save, FileText, Printer, ShieldAlert, Truck, Activity, FileSignature, Settings);
  return (

      persona?.nombrerazonsocial?.trim() ||
      persona?.razonSocial?.trim() ||
      persona?.nombre?.trim() ||
      `${persona?.nombres || ''} ${persona?.apellidos || ''}`.trim() ||
      '-'
    );
  };
  const puedeEditarCamposPreparacion =
    modo === 'LINEA_EN_PROCESO' ||
    modo === 'LISTA_PARA_CONSOLIDAR';

  const puedeConsolidar = modo === 'LISTA_PARA_CONSOLIDAR' && estadoLinea.puedeConsolidar;
  const puedeCambiarObservacion = modo === 'HISTORICO_CONSOLIDADO';
  const isAnulada = estadoLinea?.inspeccionestado === 'ANU';
  const puedeAnular = !isAnulada;
  const isConsolidada = modo === 'HISTORICO_CONSOLIDADO';

  const [ingenieros, setIngenieros] = useState<any[]>([]);
  const [consolidando, setConsolidando] = useState(false);
  const [resultadoOperacion, setResultadoOperacion] = useState<any>(null);
  
  const [modalReciboOpen, setModalReciboOpen] = useState(false);
  const [modalPropietarioOpen, setModalPropietarioOpen] = useState(false);
  const [modalPolizaOpen, setModalPolizaOpen] = useState(false);
  const [modalLineaOpen, setModalLineaOpen] = useState(false);
  const [modalMotorOpen, setModalMotorOpen] = useState(false);
  const [modalFirmaOpen, setModalFirmaOpen] = useState(false);
  const [modalAnularInspeccionOpen, setModalAnularInspeccionOpen] = useState(false);
  const [modalErrorImpresionOpen, setModalErrorImpresionOpen] = useState(false);
  const [modalRegistroResultadosOpen, setModalRegistroResultadosOpen] = useState(false);
  const [modalObservacionOpen, setModalObservacionOpen] = useState(false);
  
  // Usuario y Perfil
  const [usuarioActual, setUsuarioActual] = useState<any>(null);
  const [isSistemas, setIsSistemas] = useState(false);

  const handleRegistroResultadosSubmit = async (placaNueva: string, nroInspeccionNueva: string) => {
    try {
      setConsolidando(true);
      await lineaApi.traspasarResultados(nroInspeccion, nroInspeccionNueva, placaNueva);
      if (onRefresh) onRefresh();
      setModalRegistroResultadosOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error al traspasar resultados');
      throw err;
    } finally {
      setConsolidando(false);
    }
  };

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUsuarioActual(parsed);

        const perfil = String(
          parsed.perfilId ||
          parsed.perfil ||
          parsed.perfilUsuario ||
          parsed.userType ||
          ''
        ).toLowerCase();
        
        const username = String(parsed.username || parsed.usuario || '').toLowerCase();
        
        const esSist = (
          perfil.includes('sistema') ||
          perfil.includes('admin') ||
          perfil.includes('desarrollador') ||
          username.includes('sistemas')
        );
        setIsSistemas(esSist);
      }
    } catch (e) {
      console.error('Error parseando user session', e);
    }
  }, []);

  useEffect(() => {
    const plantaKey = 
      estadoLinea?.planta?.key || 
      estadoLinea?.lineaInfo?.plantaKey || 
      '';

    if (plantaKey) {
      cargarIngenieros(plantaKey);
    } else {
      setIngenieros([{ id: 'incorporacion', username: 'INCORPORACION', nombreCompleto: 'INCORPORACIÓN' }]);
    }
  }, [mode, estadoLinea?.planta?.key, estadoLinea?.lineaInfo?.plantaKey]);

  const cargarIngenieros = async (plantaKey: string) => {
    try {
      const ingRes = await maestrosApi.obtenerIngenierosAsync(plantaKey);
      if (ingRes.ok && ingRes.ingenieros) {
        const tieneInc = ingRes.ingenieros.some((i: any) => 
          (i.username && String(i.username).toUpperCase().includes('INCORPORACION')) ||
          (i.nombreCompleto && String(i.nombreCompleto).toUpperCase().includes('INCORPORACION'))
        );
        const lista = [...ingRes.ingenieros];
        if (!tieneInc) {
          lista.push({ id: 'incorporacion', username: 'INCORPORACION', nombreCompleto: 'INCORPORACIÓN' });
        }
        setIngenieros(lista);
      } else {
        setIngenieros([{ id: 'incorporacion', username: 'INCORPORACION', nombreCompleto: 'INCORPORACIÓN' }]);
      }
    } catch (e) {
      console.error('Error cargando ingenieros:', e);
      setIngenieros([{ id: 'incorporacion', username: 'INCORPORACION', nombreCompleto: 'INCORPORACIÓN' }]);
    }
  };

  const handleVisualizarInforme = async () => {
    setConsolidando(true);
    let nuevaVentana: Window | null = null;
    
    try {
      nuevaVentana = window.open('about:blank', '_blank');
      if (!nuevaVentana) {
        alert('Por favor, permite las ventanas emergentes (popups) para este sitio.');
        setConsolidando(false);
        return;
      }
      nuevaVentana.opener = null;

      const res = await lineaApi.obtenerInformeVisualizacion(nroInspeccion);
      
      if (res.ok && res.html) {
        const parser = new DOMParser();
        const documento = parser.parseFromString(res.html, 'text/html');
        let base = documento.querySelector('base');
        
        if (!base) {
          base = documento.createElement('base');
          documento.head.prepend(base);
        }
        
        base.href = `${window.location.origin}/`;
        
        const htmlFinal = '<!DOCTYPE html>\n' + documento.documentElement.outerHTML;
        const blob = new Blob([htmlFinal], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        
        nuevaVentana.location.replace(blobUrl);
      } else {
        nuevaVentana.close();
        alert(res.message || 'Error al generar la previsualización del informe');
      }
    } catch (error: any) {
      console.error(error);
      if (nuevaVentana) nuevaVentana.close();
      alert(error.message || 'Error de conexión al intentar previsualizar el informe');
    } finally {
      setConsolidando(false);
    }
  };

  const handleAutoSaveDatos = async (nuevosDatos: any) => {
    try {
      await lineaApi.guardarDatosConsolidacion(nroInspeccion, nuevosDatos);
    } catch (err) {
      console.error('Error al autoguardar datos', err);
    }
  };

  const handleConsolidar = async () => {
    if (!formConsolidacion.ingenieroCertificadorUsername) {
      alert('Debe seleccionar un ingeniero certificador.');
      return;
    }

    if (!window.confirm('¿Confirmas consolidar esta inspección?\nEsta operación no se puede deshacer.')) return;

    setConsolidando(true);
    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
      
      const token = sessionStorage.getItem('accessToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${BASE_URL}/linea/consolidacion/${nroInspeccion}/guardar`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ingenieroCertificadorUsername: formConsolidacion.ingenieroCertificadorUsername,
          observacion: formConsolidacion.observacion || undefined
        })
      });

      const json = await response.json();
      if (response.ok && json.ok) {
        setResultadoOperacion(json);
        if (onRefresh) onRefresh();
      } else {
        alert(`Error al consolidar: ${json.message || 'Desconocido'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setConsolidando(false);
    }
  };

  const handleCambiarObservacion = async () => {
    if (!puedeCambiarObservacion) return;
    setModalObservacionOpen(true);
  };

  const guardarNuevaObservacion = async (nuevaObs: string) => {
    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
      const token = sessionStorage.getItem('accessToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${BASE_URL}/linea/consolidacion/${nroInspeccion}/observacion`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ observacion: nuevaObs })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Observación actualizada correctamente');
        if(onRefresh) onRefresh();
      } else {
        alert(data.message || 'Error al actualizar observación');
      }
    } catch (e: any) {
      alert(`Error de red: ${e.message}`);
    }
  };

  // ─── DETERMINAR ESTADO VISUAL ─────────────────────────────────────────────
  
  let bannerClass = "bg-slate-100 border-slate-300 text-slate-700";
  let bannerText = "Modo Resumen";
  let bannerIcon = <FileText className="w-5 h-5 mr-2" />;

  if (modo === 'LINEA_EN_PROCESO') {
    bannerClass = "bg-amber-100 border-amber-300 text-amber-800";
    bannerText = "Aún no se puede certificar porque faltan pruebas";
    bannerIcon = <AlertTriangle className="w-5 h-5 mr-2" />;
  } else if (modo === 'LISTA_PARA_CONSOLIDAR') {
    bannerClass = "bg-green-100 border-green-300 text-green-800";
    bannerText = "Inspección lista para consolidar. Proceda con la firma del ingeniero.";
    bannerIcon = <CheckCircle2 className="w-5 h-5 mr-2" />;
  } else if (modo === 'HISTORICO_CONSOLIDADO') {
    bannerClass = "bg-blue-100 border-blue-300 text-blue-800";
    bannerText = "La inspección se encuentra en estado solo lectura (consolidada).";
    bannerIcon = <Lock className="w-5 h-5 mr-2" />;
  } else if (modo === 'HISTORICO_ANULADO') {
    bannerClass = "bg-red-100 border-red-300 text-red-800";
    bannerText = "La inspección ha sido anulada.";
    bannerIcon = <XCircle className="w-5 h-5 mr-2" />;
  } else if (modo === 'HISTORICO_RETIRADO') {
    bannerClass = "bg-slate-200 border-slate-400 text-slate-800";
    bannerText = "La inspección se encuentra retirada.";
    bannerIcon = <Ban className="w-5 h-5 mr-2" />;
  } else if (mode === 'final' && puedeConsolidar) {
    const sug = estadoLinea?.resumen?.resultadoSugerido;
    if (sug === 'D') {
      bannerClass = "bg-red-100 border-red-300 text-red-800";
      bannerText = "La inspección ha sido Desaprobada";
      bannerIcon = <XCircle className="w-5 h-5 mr-2" />;
    } else {
      bannerClass = "bg-green-100 border-green-300 text-green-800";
      bannerText = "La inspección ha sido Aprobada (Listo para consolidar)";
      bannerIcon = <CheckCircle2 className="w-5 h-5 mr-2" />;
    }
  }

  // ─── BOTONES LEGACY (Mock) ────────────────────────────────────────────────
  const btnLegacyClass = "px-3 py-2 text-xs font-bold uppercase rounded border shadow-sm flex items-center justify-center gap-1 transition-opacity";
  const btnDisabled = "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed opacity-70";

  const handleFocusObservacion = () => {
    const el = document.getElementById('observacionTextarea');
    if (el) el.focus();
  };

  const handleVisualizar = async () => {
    setConsolidando(true);
    let nuevaVentana: Window | null = null;
    
    try {
      // 1. Abrimos pestaña inmediatamente para evitar bloqueo de popups
      nuevaVentana = window.open('about:blank', '_blank');
      if (!nuevaVentana) {
        alert('Por favor, permite las ventanas emergentes (popups) para este sitio.');
        setConsolidando(false);
        return;
      }
      nuevaVentana.opener = null;

      // 2. Ejecutar la llamada
      const res = await lineaApi.obtenerCertificadoOficial(nroInspeccion);
      
      if (res.ok && res.html) {
        const parser = new DOMParser();
        const documento = parser.parseFromString(res.html, 'text/html');
        let base = documento.querySelector('base');
        
        if (!base) {
          base = documento.createElement('base');
          documento.head.prepend(base);
        }
        base.href = `${window.location.origin}/`;

        const htmlFinal = '<!DOCTYPE html>\n' + documento.documentElement.outerHTML;
        const blob = new Blob([htmlFinal], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        
        nuevaVentana.location.replace(blobUrl);
      } else {
        if (nuevaVentana) nuevaVentana.close();
        alert(res.message || 'Error al obtener la visualización oficial del certificado.');
      }
    } catch (e: any) {
      if (nuevaVentana) nuevaVentana.close();
      alert(`Error al visualizar: ${e.message}`);
    } finally {
      setConsolidando(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans animate-fade-in-up">
      <div className="flex-1 overflow-y-auto p-4 md:px-12 w-full">
        
        <h2 className="text-[#204080] text-xl md:text-2xl font-bold mb-8">Resumen de la Inspección</h2>

        <div className="flex flex-col lg:flex-row justify-between items-start mb-8 text-xs md:text-sm gap-8">
          <div className="space-y-6 w-full lg:w-1/3">
            <div>
              <div className="text-[10px] text-slate-500 mb-1 uppercase font-semibold">VEHICULO</div>
              <div className="font-bold text-slate-800">{vehiculo?.placa || ''} - {vehiculo?.marca || ''} - {vehiculo?.modelo || ''}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1 uppercase font-semibold">CONCEPTO</div>
              <div className="font-bold text-slate-800">{comprobante?.concepto || ''}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1 uppercase font-semibold">TOTAL PAGADO</div>
              <div className="font-bold text-slate-800">S/. {comprobante?.importetotal || comprobante?.total || '0.00'}</div>
            </div>
          </div>

          <div className="w-full lg:w-2/3 flex flex-col gap-8">
            <div>
               <div className="text-center text-xs font-bold text-slate-700 mb-3">Cliente (Recibo)</div>
               <div className="flex text-[11px] md:text-xs border-t border-slate-200 pt-3">
                  <div className="w-1/3 text-center">
                    <div className="text-[10px] text-slate-500 mb-1 font-semibold">DNI / RUC</div>
                    <div className="font-bold text-[#204080]">{estadoLinea.clienteRecibo?.nrodocumento || '-'}</div>
                  </div>
                  <div className="w-2/3 text-center">
                    <div className="text-[10px] text-slate-500 mb-1 font-semibold">NOMBRES / RAZÓN SOCIAL</div>
                    <div className="font-bold text-[#204080]">{getNombreORazonSocial(estadoLinea.clienteRecibo)}</div>
                  </div>
               </div>
            </div>
            <div>
               <div className="text-center text-xs font-bold text-slate-700 mb-3 flex items-center justify-center gap-4">
                  Propietario (Certificado)
                  <button 
                    className="bg-[#103070] hover:bg-[#204080] disabled:bg-slate-400 disabled:cursor-not-allowed disabled:opacity-70 text-white px-6 py-1.5 rounded-sm text-xs font-semibold shadow-sm transition-colors" 
                    onClick={() => setModalPropietarioOpen(true)}
                    disabled={!(puedeEditarCamposPreparacion && !estadoLinea.fechconsolidado)}
                  >
                    Modificar
                  </button>
               </div>
               <div className="flex text-[11px] md:text-xs border-t border-slate-200 pt-3">
                  <div className="w-1/3 text-center">
                    <div className="text-[10px] text-slate-500 mb-1 font-semibold">DNI / RUC</div>
                    <div className="font-bold text-[#204080]">{estadoLinea.propietarioCertificado?.nrodocumento || '-'}</div>
                  </div>
                  <div className="w-2/3 text-center">
                    <div className="text-[10px] text-slate-500 mb-1 font-semibold">NOMBRES / RAZÓN SOCIAL</div>
                    <div className="font-bold text-[#204080]">{getNombreORazonSocial(estadoLinea.propietarioCertificado)}</div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* YELLOW BANNER */}
        <div className="bg-[#fcf5b4] text-[#85712c] font-semibold text-center py-2 mb-8 text-xs md:text-sm rounded shadow-sm border border-[#e8df82]">
          {bannerText}
        </div>

        {/* WHITE BORDERED BLOCK */}
        <div className="border border-slate-200 bg-white mb-8 shadow-sm">
           <div className="flex flex-col md:flex-row border-b border-slate-200">
             <div className="w-full md:w-1/4 p-3 flex items-center text-[10px] md:text-xs font-bold text-[#204080] uppercase">* TIPO INSPECCIÓN:</div>
             <div className="w-full md:w-3/4 p-2">
               <select disabled className="w-full border border-slate-200 p-2 text-xs bg-slate-50 text-slate-500 outline-none">
                 <option>{estadoLinea.certificacion?.tipoInspeccion || 'ORDINARIA - COMPLEMENTARIA'}</option>
               </select>
             </div>
           </div>
           
           <div className="flex flex-col md:flex-row border-b border-slate-200">
             <div className="w-full md:w-1/4 p-3 flex items-center text-[10px] md:text-xs font-bold text-[#204080] uppercase">* TIPO CERTIFICADO:</div>
             <div className="w-full md:w-3/4 p-2">
               <select disabled className="w-full border border-slate-200 p-2 text-xs bg-slate-50 text-slate-500 outline-none">
                 <option>{estadoLinea.certificacion?.tipoCertificado || 'TRANSPORTE PUBLICO DE PERSONAS EN TAXI'}</option>
               </select>
             </div>
           </div>
           
           <div className="flex flex-col md:flex-row border-b border-slate-200">
             <div className="w-full md:w-1/4 p-3 flex items-center text-[10px] md:text-xs font-bold text-[#204080] uppercase">* TIPO AUTORIZACIÓN:</div>
             <div className="w-full md:w-3/4 p-2">
               <select disabled className="w-full border border-slate-200 p-2 text-xs bg-slate-50 text-slate-500 outline-none">
                 <option>{estadoLinea.certificacion?.tipoAutorizacion || 'TAXI INDEPENDIENTE'}</option>
               </select>
             </div>
           </div>
           
           <div className="flex flex-col md:flex-row border-b border-slate-200 bg-slate-50">
             <div className="w-full md:w-1/4 p-3 flex items-center text-[10px] md:text-xs font-bold text-[#204080] uppercase">* INGENIERO CERTIFICADOR:</div>
             <div className="w-full md:w-3/4 p-2">
               <select 
                  className="w-full border border-slate-300 p-2 text-xs bg-white focus:border-[#204080] outline-none"
                  disabled={!puedeEditarCamposPreparacion || consolidando}
                  value={formConsolidacion.ingenieroCertificadorUsername}
                  onChange={e => {
                    const newForm = { ...formConsolidacion, ingenieroCertificadorUsername: e.target.value };
                    onChangeFormConsolidacion(newForm);
                    handleAutoSaveDatos(newForm);
                  }}
               >
                  <option value=""></option>
                  {ingenieros.map(ing => {
                    let nombreVisible =
                      ing.nombreCompleto || ing.nombresApellidos || ing.nombre || ing.username || ing.usuario || 'Ingeniero sin nombre';
                    if (String(nombreVisible).toUpperCase().includes('INCORPORACION')) nombreVisible = 'INCORPORACIÓN';
                    const value = ing.username || ing.usuario || ing.id;
                    return <option key={ing.id || value} value={value}>{nombreVisible}</option>;
                  })}
               </select>
             </div>
           </div>
           
           <div className="flex flex-col md:flex-row border-b border-slate-200">
             <div className="w-full md:w-1/4 p-3 flex items-center text-[10px] md:text-xs font-bold text-[#204080] uppercase">OBSERVACION:</div>
             <div className="w-full md:w-3/4 p-2">
               <input 
                  id="observacionTextarea"
                  type="text"
                  className="w-full border border-slate-200 p-2 text-xs bg-white outline-none focus:border-[#204080]"
                  disabled={!puedeEditarCamposPreparacion || consolidando}
                  value={formConsolidacion.observacion}
                  onChange={e => onChangeFormConsolidacion({ ...formConsolidacion, observacion: e.target.value })}
                  onBlur={e => handleAutoSaveDatos({ ...formConsolidacion, observacion: e.target.value })}
               />
             </div>
           </div>
           
           <div className="flex flex-col md:flex-row border-b border-slate-200 bg-slate-50/50">
             <div className="w-full md:w-1/4 p-3 flex items-center text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">USUARIO CERTIFICA:</div>
             <div className="w-full md:w-3/4 p-3 text-[10px] md:text-xs font-black text-[#204080] uppercase tracking-wider">
               {usuarioActual?.nombreCompleto || usuarioActual?.username || usuarioActual?.usuario || ''}
             </div>
           </div>
           
           {/* GAS BLOCK (Oculto a petición)
           <div className="p-4 flex flex-col md:flex-row gap-4 md:gap-6 md:items-end bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 w-full md:w-1/4 pl-2">
                 <input type="checkbox" className="w-4 h-4 border-slate-300 rounded text-[#204080] focus:ring-[#204080]" />
                 <label className="text-[11px] font-bold text-slate-700">Sin Certificado de Gas</label>
              </div>
              <div className="w-full md:w-1/4">
                <label className="block text-[10px] font-bold text-slate-700 mb-1.5">* COD. CERTIFICADO GAS</label>
                <input type="text" className="w-full border border-slate-200 p-2.5 text-xs bg-white" placeholder="Ej: 52-65-0060934" />
              </div>
              <div className="w-full md:w-1/4">
                <label className="block text-[10px] font-bold text-slate-700 mb-1.5">* EMP. CERTIFICADORA GAS</label>
                <select className="w-full border border-slate-200 p-2.5 text-xs bg-white">
                  <option>MOTOR GAS COMPANY S.A</option>
                </select>
              </div>
              <div className="w-full md:w-1/4">
                <label className="block text-[10px] font-bold text-slate-700 mb-1.5">* FECHA VENC. CERT. GAS</label>
                <input type="text" className="w-full border border-slate-200 p-2.5 text-xs bg-white" placeholder="05/12/2026" />
              </div>
           </div>
           */}
        </div>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 mb-10 px-0 md:px-4">
           <div className="flex flex-col gap-2.5">
              <button 
                className={`${puedeConsolidar ? 'bg-[#7a9cc6] hover:bg-[#6080b0] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'} text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-sm transition-colors`}
                disabled={!puedeConsolidar || consolidando}
                onClick={handleConsolidar}
              >
                {consolidando ? 'Guardando...' : 'Consolidar'}
              </button>
              <button 
                className={`${puedeAnular ? 'bg-[#103070] hover:bg-[#0c2455] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'} text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-sm transition-colors`}
                disabled={!puedeAnular || consolidando} 
                onClick={() => setModalAnularInspeccionOpen(true)}
              >
                Anular Inspección
              </button>
              <button className="bg-[#103070] hover:bg-[#0c2455] text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-sm transition-colors cursor-not-allowed opacity-80" disabled>Reimprimir Certificado</button>
           </div>
           
           <div className="flex flex-col gap-2.5">
              <button 
                className={`${(modo === 'HISTORICO_CONSOLIDADO' && (resultadoOperacion?.nrodocumentocertificado || estadoLinea.inspeccion?.nrodocumentocertificado || estadoLinea.certificado?.nrodocumentocertificado)) ? 'bg-[#103070] hover:bg-[#0c2455] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'} text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-sm transition-colors`}
                disabled={!(modo === 'HISTORICO_CONSOLIDADO' && (resultadoOperacion?.nrodocumentocertificado || estadoLinea.inspeccion?.nrodocumentocertificado || estadoLinea.certificado?.nrodocumentocertificado)) || consolidando} 
                onClick={handleVisualizar}
              >
                Visualizar
              </button>
              <button 
                className={`${modo === 'HISTORICO_CONSOLIDADO' ? 'bg-[#103070] hover:bg-[#0c2455] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'} text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-sm transition-colors`}
                disabled={modo !== 'HISTORICO_CONSOLIDADO' || consolidando} 
                onClick={handleVisualizarInforme}
              >
                Visualizar Informe
              </button>
              <button 
                className={`${puedeEditarCamposPreparacion ? 'bg-[#103070] hover:bg-[#0c2455] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'} text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-sm transition-colors`}
                disabled={!puedeEditarCamposPreparacion} 
                onClick={() => setModalReciboOpen(true)}
              >
                Visualizar Recibo
              </button>
           </div>
           
           <div className="flex flex-col gap-2.5">
              <button 
                className={`${puedeCambiarObservacion ? 'bg-[#103070] hover:bg-[#0c2455] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'} text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-sm transition-colors`}
                disabled={!puedeCambiarObservacion} 
                onClick={() => setModalErrorImpresionOpen(true)}
              >
                Error Impresion
              </button>
              <button 
                className={`${puedeCambiarObservacion || puedeEditarCamposPreparacion ? 'bg-[#103070] hover:bg-[#0c2455] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'} text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-sm transition-colors`}
                disabled={!puedeCambiarObservacion && !puedeEditarCamposPreparacion} 
                onClick={puedeCambiarObservacion ? handleCambiarObservacion : handleFocusObservacion}
              >
                Cambiar Observacion
              </button>
           </div>
        </div>

        {/* SOPORTE */}
        {isSistemas && (
          <div className="mt-8 mb-4">
             <h3 className="text-[#204080] text-lg font-bold mb-4 px-2">Soporte</h3>
             <div className="border-t border-slate-300 pt-6 flex flex-col md:flex-row gap-6 px-0 md:px-4">
                <div className="flex flex-col gap-2.5 w-full md:w-1/3">
                   <button 
                     className={`${isConsolidada ? 'bg-[#103070] hover:bg-[#0c2455] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'} text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-sm transition-colors`}
                     onClick={() => isConsolidada && console.log('Pendiente de migración')}
                     disabled={!isConsolidada}
                   >
                     Registro Vehiculo MTC
                   </button>
                   <button 
                     className={`${isAnulada ? 'bg-[#103070] hover:bg-[#0c2455] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'} text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-sm transition-colors`}
                     onClick={() => isAnulada && setModalRegistroResultadosOpen(true)}
                     disabled={!isAnulada}
                   >
                     Registro Resultados
                   </button>
                </div>
                <div className="flex flex-col gap-2.5 w-full md:w-1/3">
                   <button 
                     className={`${isConsolidada ? 'bg-[#103070] hover:bg-[#0c2455] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'} text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-sm transition-colors`}
                     onClick={() => isConsolidada && setModalPolizaOpen(true)}
                     disabled={!isConsolidada}
                   >
                     Registro Póliza MTC
                   </button>
                   <button 
                     className={`${puedeEditarCamposPreparacion ? 'bg-[#103070] hover:bg-[#0c2455] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'} text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-sm transition-colors`}
                     onClick={() => puedeEditarCamposPreparacion && setModalLineaOpen(true)}
                     disabled={!puedeEditarCamposPreparacion}
                   >
                     Cambiar Linea
                   </button>
                </div>
                <div className="flex flex-col gap-2.5 w-full md:w-1/3">
                   <button 
                     className={`${puedeEditarCamposPreparacion ? 'bg-[#103070] hover:bg-[#0c2455] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'} text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-sm transition-colors`}
                     onClick={() => puedeEditarCamposPreparacion && setModalMotorOpen(true)}
                     disabled={!puedeEditarCamposPreparacion}
                   >
                     Cambio Motor
                   </button>
                   <button 
                     className={`${puedeEditarCamposPreparacion ? 'bg-[#103070] hover:bg-[#0c2455] cursor-pointer' : 'bg-slate-300 cursor-not-allowed'} text-white py-2.5 text-xs font-bold uppercase rounded-sm shadow-sm transition-colors`}
                     onClick={() => puedeEditarCamposPreparacion && setModalFirmaOpen(true)}
                     disabled={!puedeEditarCamposPreparacion}
                   >
                     Cambiar firma
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>
      
      {modalAnularInspeccionOpen && (

        <ModalAnularInspeccion
          nroInspeccion={nroInspeccion}
          onClose={() => setModalAnularInspeccionOpen(false)}
          onSuccess={() => {
            setModalAnularInspeccionOpen(false);
            if (onRefresh) onRefresh();
          }}
        />
      )}
      
      {modalErrorImpresionOpen && (
        <ModalErrorImpresion
          nroInspeccion={nroInspeccion}
          onClose={() => setModalErrorImpresionOpen(false)}
          onSuccess={() => {
            setModalErrorImpresionOpen(false);
            if (onRefresh) onRefresh();
          }}
        />
      )}

      <ModalRegistroResultados
        isOpen={modalRegistroResultadosOpen}
        onClose={() => setModalRegistroResultadosOpen(false)}
        nroInspeccion={nroInspeccion}
        placaAnulada={estadoLinea?.placamotor || 'DESCONOCIDA'}
        onSubmit={handleRegistroResultadosSubmit}
      />

      {modalReciboOpen && (
        <ModalVisualizarRecibo
          nroInspeccion={nroInspeccion}
          onClose={() => setModalReciboOpen(false)}
        />
      )}
      
      {modalPropietarioOpen && (
        <ModalModificarPropietario
          isOpen={modalPropietarioOpen}
          nroInspeccion={nroInspeccion}
          onClose={() => setModalPropietarioOpen(false)}
          onSaved={() => {
            setModalPropietarioOpen(false);
            if (onRefresh) onRefresh();
          }}
          datosIniciales={{
            nombres: estadoLinea.propietarioCertificado?.nombre?.split(' ')[0] || '',
            apellidos: estadoLinea.propietarioCertificado?.nombre?.split(' ').slice(1).join(' ') || '',
            nroDocumento: estadoLinea.propietarioCertificado?.nrodocumento || ''
          }}
        />
      )}

      {modalPolizaOpen && (
        <ModalPolizaMtc
          nroInspeccion={nroInspeccion}
          onClose={() => setModalPolizaOpen(false)}
          onRefresh={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {modalLineaOpen && (
        <ModalCambiarLinea
          nroInspeccion={nroInspeccion}
          plantaKey={estadoLinea?.planta?.key || estadoLinea?.lineaInfo?.plantaKey || ''}
          lineaActual={estadoLinea.lineaInfo?.nombre || estadoLinea.lineaInfo?.key || ''}
          onClose={() => setModalLineaOpen(false)}
          onRefresh={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {modalMotorOpen && (
        <ModalCambioMotor
          nroInspeccion={nroInspeccion}
          motorActual={vehiculo?.nromotor || estadoLinea.vehiculo_nromotor || ''}
          onClose={() => setModalMotorOpen(false)}
          onRefresh={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {modalFirmaOpen && (
        <ModalCambiarFirma
          nroInspeccion={nroInspeccion}
          ingenieros={ingenieros}
          ingenieroActual={estadoLinea.usuarioingcertificador_username || formConsolidacion.ingenieroCertificadorUsername || ''}
          onClose={() => setModalFirmaOpen(false)}
          onRefresh={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
      
      <ModalCambiarObservacion 
        isOpen={modalObservacionOpen}
        onClose={() => setModalObservacionOpen(false)}
        nroInspeccion={nroInspeccion}
        observacionActual={estadoLinea.certificacion?.observacion || ''}
        onSave={guardarNuevaObservacion}
      />
    </div>
  );
}
