import React, { useState, useEffect } from 'react';
import { 
  FileText, CheckCircle2, Lock, AlertTriangle, XCircle, 
  Printer, Ban, Save, FileSignature, Truck, Settings, ShieldAlert,
  Activity
} from 'lucide-react';
import { maestrosApi } from '../../../../services/api';

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

  const { posicionActual, inspeccionestado_key, puedeConsolidar: estPuedeConsol, faltantes, vehiculo, comprobante, modo } = estadoLinea;
  
  // Reglas frontend
  const esHistorico =
    modo === 'HISTORICO_CONSOLIDADO' ||
    modo === 'HISTORICO_ANULADO' ||
    modo === 'HISTORICO_RETIRADO';

  const puedeEditarCamposPreparacion =
    modo === 'LINEA_EN_PROCESO' ||
    modo === 'LISTA_PARA_CONSOLIDAR';

  const puedeConsolidar = modo === 'LISTA_PARA_CONSOLIDAR' && estadoLinea.puedeConsolidar;
  const puedeCambiarObservacion = modo === 'HISTORICO_CONSOLIDADO';

  // Navigation enabled except for anu/ret
  const allowNavegacion = modo !== 'HISTORICO_ANULADO' && modo !== 'HISTORICO_RETIRADO'; 

  const [loading, setLoading] = useState(mode === 'final');
  const [ingenieros, setIngenieros] = useState<any[]>([]);
  const [consolidando, setConsolidando] = useState(false);
  const [resultadoOperacion, setResultadoOperacion] = useState<any>(null);
  
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

    if (mode === 'final' && plantaKey) {
      cargarIngenieros(plantaKey);
    }
  }, [mode, estadoLinea?.planta?.key, estadoLinea?.lineaInfo?.plantaKey]);

  const cargarIngenieros = async (plantaKey: string) => {
    try {
      const ingRes = await maestrosApi.obtenerIngenierosAsync(plantaKey);
      if (ingRes.ok) {
        setIngenieros([
          ...ingRes.ingenieros,
          { id: 'incorporacion', username: 'INCORPORACION', nombreCompleto: 'INCORPORACIÓN' }
        ]);
      }
    } catch (e) {
      console.error('Error cargando ingenieros:', e);
    }
  };

  const handleConsolidar = async () => {
    if (!formConsolidacion.ingenieroCertificadorUsername) {
      alert('Debe seleccionar un ingeniero certificador.');
      return;
    }

    if (!window.confirm('¿Confirmas consolidar esta inspección?\\nEsta operación no se puede deshacer.')) return;

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
    // Si la data del servidor dice Aprobado (A) o Desaprobado (D)
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
          
          {/* Col 1: Vehículo y Cliente */}
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
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button 
                  className={`${btnLegacyClass} ${btnDisabled}`}
                  disabled={true}
                  title="Funcionalidad pendiente de migración"
                >
                  Modificar Propietario
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase mb-3 tracking-wider">Personas</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Cliente Recibo</span>
                  <span className="font-bold text-slate-800 text-right">{estadoLinea.clienteRecibo?.nombre || 'Desconocido'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Propietario Certificado</span>
                  <span className="font-bold text-slate-800 text-right">
                    {estadoLinea.propietarioCertificado ? estadoLinea.propietarioCertificado.nombre : 'No registrado'}
                  </span>
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
                  onChange={e => onChangeFormConsolidacion({ ...formConsolidacion, ingenieroCertificadorUsername: e.target.value })}
                >
                  <option value="">-- Seleccione Ingeniero --</option>
                  {ingenieros.map(ing => (
                    <option key={ing.id} value={ing.username}>{ing.nombreCompleto}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Observación</label>
                <textarea 
                  rows={2}
                  className={`w-full border rounded p-2 text-sm ${!puedeEditarCamposPreparacion ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-300'}`}
                  disabled={!puedeEditarCamposPreparacion || consolidando}
                  value={formConsolidacion.observacion}
                  onChange={e => onChangeFormConsolidacion({ ...formConsolidacion, observacion: e.target.value })}
                  placeholder="Opcional..."
                />
              </div>
            </div>

            {/* BOTONES PRINCIPALES DE ACCIÓN */}
            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Bloque Izquierdo */}
              <div className="flex flex-col gap-2">
                <button 
                  className={`${btnLegacyClass} ${puedeConsolidar ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' : btnDisabled}`}
                  disabled={!puedeConsolidar || consolidando}
                  onClick={handleConsolidar}
                >
                  <Save className="w-4 h-4" />
                  {consolidando ? 'Guardando...' : 'Consolidar / Guardar'}
                </button>
                
                <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                  <Ban className="w-4 h-4" /> Anular Inspección
                </button>

                <button className={`${btnLegacyClass} ${modo === 'HISTORICO_CONSOLIDADO' ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 cursor-not-allowed opacity-80' : btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                  <Printer className="w-4 h-4" /> Reimprimir Certificado
                </button>
              </div>

              {/* Bloque Central */}
              <div className="flex flex-col gap-2">
                <button className={`${btnLegacyClass} ${modo === 'HISTORICO_CONSOLIDADO' ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 cursor-not-allowed opacity-80' : btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                  <FileText className="w-4 h-4" /> Visualizar
                </button>
                
                <button className={`${btnLegacyClass} ${modo === 'HISTORICO_CONSOLIDADO' ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 cursor-not-allowed opacity-80' : btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                  <FileText className="w-4 h-4" /> Visualizar Informe
                </button>

                <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                  <FileText className="w-4 h-4" /> Visualizar Recibo
                </button>
              </div>

              {/* Bloque Derecho */}
              <div className="flex flex-col gap-2">
                <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                  <AlertTriangle className="w-4 h-4" /> Error Impresión
                </button>
                
                <button 
                  className={`${btnLegacyClass} ${puedeCambiarObservacion ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600' : btnDisabled}`} 
                  disabled={!puedeCambiarObservacion} 
                  title={puedeCambiarObservacion ? "Cambiar Observación" : "Funcionalidad solo en Histórico"}
                  onClick={handleCambiarObservacion}
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
              <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                <Truck className="w-4 h-4" /> Registro Vehículo MTC
              </button>
              <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                <Activity className="w-4 h-4" /> Registro Resultados
              </button>
              <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                <FileText className="w-4 h-4" /> Registro Póliza MTC
              </button>
              <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                <Settings className="w-4 h-4" /> Cambiar Línea
              </button>
              <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                <Settings className="w-4 h-4" /> Cambio Motor
              </button>
              <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                <FileSignature className="w-4 h-4" /> Cambiar Firma
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
