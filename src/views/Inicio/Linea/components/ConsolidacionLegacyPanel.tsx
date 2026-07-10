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

  const puedeConsolidar =
    modo === 'LISTA_PARA_CONSOLIDAR' &&
    estadoLinea.puedeConsolidar === true &&
    estadoLinea.faltantes?.length === 0 &&
    estadoLinea.inspeccionestado_key !== 'CON';

  // Navigation enabled except for anu/ret
  const allowNavegacion = modo !== 'HISTORICO_ANULADO' && modo !== 'HISTORICO_RETIRADO'; 

  const [loading, setLoading] = useState(mode === 'final');
  const [dataConsolidacion, setDataConsolidacion] = useState<any>(null);
  const [ingenieros, setIngenieros] = useState<any[]>([]);
  const [consolidando, setConsolidando] = useState(false);
  const [resultadoOperacion, setResultadoOperacion] = useState<any>(null);

  useEffect(() => {
    if (mode === 'final') {
      fetchDatos();
    }
  }, [mode, nroInspeccion]);

  const fetchDatos = async () => {
    setLoading(true);
    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
      const res = await fetch(`${BASE_URL}/linea/consolidacion/${nroInspeccion}`);
      if (res.ok) {
        const json = await res.json();
        setDataConsolidacion(json);
        
        // Cargar ingenieros
        const parts = nroInspeccion.split('-');
        const plantaKey = parts.length >= 2 ? parts[1] : '';
        if (plantaKey) {
          try {
            const ingRes = await maestrosApi.obtenerIngenierosAsync(plantaKey);
            if (ingRes.ok) {
              setIngenieros(ingRes.ingenieros);
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
      const response = await fetch(`${BASE_URL}/linea/consolidacion/${nroInspeccion}/guardar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingenieroCertificadorUsername: formConsolidacion.ingenieroCertificadorUsername,
          usuarioConsolidadorUsername: 'admin', // Provisional
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
    const sug = dataConsolidacion?.resumen?.resultadoSugerido;
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
  
  const canConsolidar = mode === 'final' && readyToConsolidate && !isConsolidada && inspeccionestado_key !== 'ANU';

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans animate-fade-in-up">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        
        {/* BANNER DE ESTADO */}
        <div className={`border p-3 rounded-lg flex items-center ${bannerClass}`}>
          {bannerIcon}
          <span className="font-bold text-sm uppercase tracking-tight">{bannerText}</span>
        </div>

        {/* ALERTA DE EXITO (POST CONSOLIDACION) */}
        {resultadoOperacion && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm">
            <h4 className="text-green-800 font-bold uppercase text-sm">Consolidación Exitosa</h4>
            <p className="text-green-700 text-xs mt-1">
              Certificado: {resultadoOperacion.nrodocumentocertificado || 'N/A'} | 
              Informe: {resultadoOperacion.nrodocumentoinforme || 'N/A'}
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
                  className={`text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 ${
                    (modo === 'HISTORICO_ANULADO' || modo === 'HISTORICO_RETIRADO') ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                  disabled={modo === 'HISTORICO_ANULADO' || modo === 'HISTORICO_RETIRADO'}
                  title="Funcionalidad pendiente de migración"
                >
                  Modificar Propietario
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase mb-3 tracking-wider">Comprobante</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Concepto</span>
                  <span className="font-bold text-slate-800">{comprobante?.concepto || 'No disponible'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500 font-medium">Monto</span>
                  <span className="font-bold text-slate-800">S/ {comprobante?.importetotal || comprobante?.total || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Col 2 y 3: Formulario Consolidación */}
          <div className="lg:col-span-2 bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-wider">Parámetros de Certificación</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo Inspección</label>
                <select disabled className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50">
                  <option>REGULAR</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo Certificado</label>
                <select disabled className="w-full border border-slate-300 rounded p-2 text-sm bg-slate-50">
                  <option>CERTIFICADO NORMAL</option>
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
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
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

              <button className={`${btnLegacyClass} ${modo === 'HISTORICO_CONSOLIDADO' ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 cursor-pointer opacity-100' : btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                <Printer className="w-4 h-4" /> Reimprimir Certificado
              </button>
              
              <button className={`${btnLegacyClass} ${modo === 'HISTORICO_CONSOLIDADO' ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 cursor-pointer opacity-100' : btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                <FileText className="w-4 h-4" /> Visualizar
              </button>
              
              <button className={`${btnLegacyClass} ${modo === 'HISTORICO_CONSOLIDADO' ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 cursor-pointer opacity-100' : btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                <FileText className="w-4 h-4" /> Visualizar Informe
              </button>

              {/* Botones legacy adicionales solicitados */}
              <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                <FileText className="w-4 h-4" /> Visualizar Recibo
              </button>
              
              <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                <AlertTriangle className="w-4 h-4" /> Error Impresión
              </button>

              <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
                <Activity className="w-4 h-4" /> Registro Resultados
              </button>
            </div>
          </div>
        </div>

        {/* BLOQUE SOPORTE MTC / LOCAL */}
        <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase mb-3 tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Acciones de Soporte y Excepciones
          </h3>
          <div className="flex flex-wrap gap-2">
            <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
              <ShieldAlert className="w-4 h-4" /> Cambiar Observación
            </button>
            <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
              <Truck className="w-4 h-4" /> Registro Vehículo MTC
            </button>
            <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
              <FileSignature className="w-4 h-4" /> Cambiar Firma
            </button>
            <button className={`${btnLegacyClass} ${btnDisabled}`} disabled={true} title="Funcionalidad pendiente de migración">
              <Settings className="w-4 h-4" /> Cambio Motor / Línea
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
