import { useState, useEffect, useRef } from 'react';
import { 
  Save, AlertTriangle, Ban, FileText, Printer, ShieldAlert, CheckCircle2, Truck, Activity, FileSignature, Settings, Lock, XCircle
} from 'lucide-react';
import ModalVisualizarRecibo from './ModalVisualizarRecibo';
import { ModalModificarPropietario } from './ModalModificarPropietario';
import { ModalPolizaMtc } from './ModalPolizaMtc';
import { ModalCambiarLinea } from './ModalCambiarLinea';
import { ModalCambioMotor } from './ModalCambioMotor';
import { ModalCambiarFirma } from './ModalCambiarFirma';
import { maestrosApi, lineaApi } from '../../../../services/api';

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

  const [ingenieros, setIngenieros] = useState<any[]>([]);
  const [consolidando, setConsolidando] = useState(false);
  const [resultadoOperacion, setResultadoOperacion] = useState<any>(null);
  
  const [modalReciboOpen, setModalReciboOpen] = useState(false);
  const [modalPropietarioOpen, setModalPropietarioOpen] = useState(false);
  const [modalPolizaOpen, setModalPolizaOpen] = useState(false);
  const [modalLineaOpen, setModalLineaOpen] = useState(false);
  const [modalMotorOpen, setModalMotorOpen] = useState(false);
  const [modalFirmaOpen, setModalFirmaOpen] = useState(false);
  
  // Usuario y Perfil
  const [usuarioActual, setUsuarioActual] = useState<any>(null);
  const [isSistemas, setIsSistemas] = useState(false);

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
    
    const obsActual = estadoLinea.certificacion?.observacion || '';
    const nuevaObs = window.prompt(`Cambiar observación para ${nroInspeccion}\nObservación actual:`, obsActual);
    
    if (nuevaObs === null) return; // cancelado
    if (nuevaObs.length > 1000) {
      alert('La observación no puede superar los 1000 caracteres');
      return;
    }

    if (!window.confirm('¿Está seguro de guardar la nueva observación?')) return;

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
        if (onRefresh) onRefresh();
      } else {
        alert(data.message || 'Error al actualizar observación');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al actualizar observación');
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

  const handleAnular = async () => {
    const motivo = window.prompt('¿Está seguro de anular esta inspección?\n\nIngrese un motivo (opcional):');
    if (motivo === null) return;

    setConsolidando(true);
    try {
      const { lineaApi } = await import('../../../../services/api');
      const res = await lineaApi.anularInspeccion(nroInspeccion, motivo);
      if (res.ok || res.status === 'success') {
        alert('Inspección anulada correctamente.');
        if (onRefresh) onRefresh();
      } else {
        alert(res.message || 'Error al anular inspección.');
      }
    } catch (e: any) {
      alert(`Error al anular: ${e.message}`);
    } finally {
      setConsolidando(false);
    }
  };

  const handleFocusObservacion = () => {
    const el = document.getElementById('observacionTextarea');
    if (el) el.focus();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans animate-fade-in-up">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        
        {/* BANNER DE ESTADO */}
        <div className={`border p-3 rounded-lg flex items-center ${bannerClass}`}>
          {bannerIcon}
          <span className="font-bold text-sm uppercase tracking-tight">{bannerText}</span>
        </div>

        {/* INFO CERTIFICADO/INFORME PARA HISTÓRICOS O POST CONSOLIDACIÓN */}
        {resultadoOperacion ? (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm">
            <h4 className="text-green-800 font-bold uppercase text-sm">Consolidación Exitosa</h4>
            <p className="text-green-700 text-xs mt-1">
              Certificado: {resultadoOperacion.nrodocumentocertificado || 'N/A'} | 
              Informe: {resultadoOperacion.nrodocumentoinforme || 'N/A'}
            </p>
          </div>
        ) : modo === 'HISTORICO_CONSOLIDADO' && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded shadow-sm">
            <h4 className="text-blue-800 font-bold uppercase text-sm">Documentos Generados</h4>
            <p className="text-blue-700 text-xs mt-1">
              Certificado: {estadoLinea.inspeccion?.nrodocumentocertificado || estadoLinea.certificado?.nrodocumentocertificado || 'N/A'} | 
              Informe: {estadoLinea.inspeccion?.nrodocumentoinforme || estadoLinea.informe?.nrodocumentoinforme || 'N/A'}
            </p>
          </div>
        )}

        {/* BLOQUE PRINCIPAL: DATOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase mb-3 tracking-wider">Vehículo</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Placa</span>
                  <span className="font-bold text-slate-800">{vehiculo?.placa || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Categoría</span>
                  <span className="font-bold text-slate-800">{vehiculo?.categoria || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Marca / Modelo</span>
                  <span className="font-bold text-slate-800">{vehiculo?.marca || 'No disponible'} / {vehiculo?.modelo || 'No disponible'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase mb-3 tracking-wider">Personas</h3>
              <div className="space-y-4 text-sm">
                
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Cliente (Recibo)</h4>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="font-semibold text-slate-800">DNI / RUC</span>
                    <span className="font-semibold text-slate-800 text-right">Nombres / Razón Social</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">{estadoLinea.clienteRecibo?.nrodocumento || '-'}</span>
                    <span className="text-slate-600 text-right">{getNombreORazonSocial(estadoLinea.clienteRecibo)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Propietario (Certificado)</h4>
                    <button 
                      className={`px-3 py-1 text-xs font-bold uppercase rounded border shadow-sm transition-opacity ${puedeEditarCamposPreparacion && !estadoLinea.fechconsolidado ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed opacity-70'}`}
                      disabled={!(puedeEditarCamposPreparacion && !estadoLinea.fechconsolidado)}
                      title={!(puedeEditarCamposPreparacion && !estadoLinea.fechconsolidado) ? "Solo se puede modificar propietario antes de consolidar." : ""}
                      onClick={() => setModalPropietarioOpen(true)}
                    >
                      Modificar
                    </button>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="font-semibold text-slate-800">DNI / RUC</span>
                    <span className="font-semibold text-slate-800 text-right">Nombres / Razón Social</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-600">{estadoLinea.propietarioCertificado?.nrodocumento || '-'}</span>
                    <span className="text-slate-600 text-right">{getNombreORazonSocial(estadoLinea.propietarioCertificado)}</span>
                  </div>
                </div>

              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase mb-3 tracking-wider">Comprobante y Ubicación</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Concepto</span>
                  <span className="font-bold text-slate-800 text-right">{comprobante?.concepto || 'No disponible'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Monto</span>
                  <span className="font-bold text-slate-800">S/ {comprobante?.importetotal || comprobante?.total || '0.00'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Línea</span>
                  <span className="font-bold text-slate-800 text-right">
                    {estadoLinea.lineaInfo?.nombre || estadoLinea.lineaInfo?.key || 'No definido'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Planta</span>
                  <span className="font-bold text-slate-800 text-right">
                    {estadoLinea.planta ? `${estadoLinea.planta.key} - ${estadoLinea.planta.nombre || ''}` : 'No definido'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 2 y 3: Formulario Consolidación */}
          <div className="lg:col-span-2 bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Parámetros de Certificación</h3>
              {usuarioActual && (
                <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  Usuario que certifica: <span className="font-bold text-slate-800">{usuarioActual.nombreCompleto || usuarioActual.username || usuarioActual.usuario || 'Desconocido'}</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo Inspección</label>
                <select disabled className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50">
                  <option>{estadoLinea.certificacion?.tipoInspeccion || 'No definido'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo Certificado</label>
                <select disabled className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50">
                  <option>{estadoLinea.certificacion?.tipoCertificado || 'No definido'}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo Autorización</label>
                <select disabled className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50">
                  <option>{estadoLinea.certificacion?.tipoAutorizacion || 'No definido'}</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Ingeniero Certificador
                </label>
                <select 
                  className={`w-full border rounded p-2 text-sm ${!puedeEditarCamposPreparacion ? 'bg-slate-50 border-slate-300' : 'bg-white border-blue-400 focus:ring-2 focus:ring-blue-200'}`}
                  disabled={!puedeEditarCamposPreparacion || consolidando}
                  value={formConsolidacion.ingenieroCertificadorUsername}
                  onChange={e => {
                    const newForm = { ...formConsolidacion, ingenieroCertificadorUsername: e.target.value };
                    onChangeFormConsolidacion(newForm);
                    handleAutoSaveDatos(newForm);
                  }}
                >
                  <option value="">-- Seleccione Ingeniero --</option>
                  {ingenieros.map(ing => {
                    let nombreVisible =
                      ing.nombreCompleto ||
                      ing.nombresApellidos ||
                      ing.nombre ||
                      ing.username ||
                      ing.usuario ||
                      'Ingeniero sin nombre';
                    if (String(nombreVisible).toUpperCase().includes('INCORPORACION')) {
                      nombreVisible = 'INCORPORACIÓN';
                    }
                    const value = ing.username || ing.usuario || ing.id;
                    return (
                      <option key={ing.id || value} value={value}>{nombreVisible}</option>
                    );
                  })}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Observación</label>
                <textarea 
                  id="observacionTextarea"
                  rows={2}
                  className={`w-full border rounded p-2 text-sm ${!puedeEditarCamposPreparacion ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-300'}`}
                  disabled={!puedeEditarCamposPreparacion || consolidando}
                  value={formConsolidacion.observacion}
                  onChange={e => onChangeFormConsolidacion({ ...formConsolidacion, observacion: e.target.value })}
                  onBlur={e => handleAutoSaveDatos({ ...formConsolidacion, observacion: e.target.value })}
                  placeholder="Opcional..."
                />
              </div>
            </div>

            {/* BOTONES PRINCIPALES DE ACCIÓN */}
            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="flex flex-col gap-2">
                <button 
                  className={`${btnLegacyClass} ${puedeConsolidar ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' : btnDisabled}`}
                  disabled={!puedeConsolidar || consolidando}
                  onClick={handleConsolidar}
                >
                  <Save className="w-4 h-4" />
                  {consolidando ? 'Guardando...' : 'Consolidar / Guardar'}
                </button>
                
                <button className={`${btnLegacyClass} ${puedeEditarCamposPreparacion ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' : btnDisabled}`} disabled={!puedeEditarCamposPreparacion || consolidando} title={puedeEditarCamposPreparacion ? "Anular Inspección" : "Inspección no anulable en este estado"} onClick={handleAnular}>
                  <Ban className="w-4 h-4" /> Anular Inspección
                </button>

                <button className={`${btnLegacyClass} ${modo === 'HISTORICO_CONSOLIDADO' ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 cursor-not-allowed opacity-80' : btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                  <Printer className="w-4 h-4" /> Reimprimir Certificado
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <button className={`${btnLegacyClass} ${modo === 'HISTORICO_CONSOLIDADO' ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 cursor-not-allowed opacity-80' : btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                  <FileText className="w-4 h-4" /> Visualizar
                </button>
                
                <button className={`${btnLegacyClass} ${modo === 'HISTORICO_CONSOLIDADO' ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 cursor-not-allowed opacity-80' : btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                  <FileText className="w-4 h-4" /> Visualizar Informe
                </button>

                <button className={`${btnLegacyClass} ${puedeEditarCamposPreparacion ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700' : btnDisabled}`} disabled={!puedeEditarCamposPreparacion} title={puedeEditarCamposPreparacion ? "Visualizar Recibo" : "Funcionalidad pendiente de migración"} onClick={() => setModalReciboOpen(true)}>
                  <FileText className="w-4 h-4" /> Visualizar Recibo
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                  <AlertTriangle className="w-4 h-4" /> Error Impresión
                </button>
                
                <button 
                  className={`${btnLegacyClass} ${puedeCambiarObservacion || puedeEditarCamposPreparacion ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600' : btnDisabled}`} 
                  disabled={!puedeCambiarObservacion && !puedeEditarCamposPreparacion} 
                  title={puedeCambiarObservacion || puedeEditarCamposPreparacion ? "Cambiar Observación" : "Funcionalidad solo en Histórico"}
                  onClick={puedeCambiarObservacion ? handleCambiarObservacion : handleFocusObservacion}
                >
                  <ShieldAlert className="w-4 h-4" /> Cambiar Observación
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* BLOQUE SOPORTE MTC / LOCAL */}
        {isSistemas && (
          <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase mb-3 tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Acciones de Soporte y Excepciones (Solo Sistemas)
            </h3>
            <div className="flex flex-wrap gap-2">
              <button className={`${btnLegacyClass} bg-slate-700 text-white border-slate-800 hover:bg-slate-800`} onClick={() => handlePendienteMigracion('Sistemas: Registro Vehículo MTC')}>
                <Truck className="w-4 h-4" /> Registro Vehículo MTC
              </button>
              <button className={`${btnLegacyClass} bg-slate-700 text-white border-slate-800 hover:bg-slate-800`} onClick={() => handlePendienteMigracion('Sistemas: Registro Resultados')}>
                <Activity className="w-4 h-4" /> Registro Resultados
              </button>
              <button className={`${btnLegacyClass} bg-slate-700 text-white border-slate-800 hover:bg-slate-800`} onClick={() => setModalPolizaOpen(true)}>
                <FileText className="w-4 h-4" /> Registro Póliza MTC
              </button>
              <button className={`${btnLegacyClass} bg-slate-700 text-white border-slate-800 hover:bg-slate-800`} onClick={() => setModalLineaOpen(true)}>
                <Settings className="w-4 h-4" /> Cambiar Línea
              </button>
              <button className={`${btnLegacyClass} bg-slate-700 text-white border-slate-800 hover:bg-slate-800`} onClick={() => setModalMotorOpen(true)}>
                <Settings className="w-4 h-4" /> Cambio Motor
              </button>
              <button className={`${btnLegacyClass} bg-slate-700 text-white border-slate-800 hover:bg-slate-800`} onClick={() => setModalFirmaOpen(true)}>
                <FileSignature className="w-4 h-4" /> Cambiar Firma
              </button>
            </div>
          </div>
        )}
      </div>
      
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
    </div>
  );
}
