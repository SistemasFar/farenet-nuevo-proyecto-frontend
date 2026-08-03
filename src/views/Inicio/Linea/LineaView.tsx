import  { useState, useEffect } from 'react';
import { ConsolidacionLegacyPanel } from './components/ConsolidacionLegacyPanel';
import { LineaStep } from './components/LineaStep';
import { PreVisualizacionStep } from './components/PreVisualizacionStep';
import Swal from 'sweetalert2';
import { lineaApi } from '../../../services/api';
import { CheckCircle2, ClipboardCheck, Activity, Eye, FileCheck, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const STEPS = [
  { id: 'consolidacion_inicial', label: 'Consolidación', icon: ClipboardCheck },
  { id: 'linea', label: 'Línea', icon: Activity },
  { id: 'pre_visualizacion', label: 'Pre Visualización', icon: Eye },
  { id: 'consolidacion_final', label: 'Consolidación', icon: FileCheck }
];

// import { SeguimientoLineaDashboard } from './components/SeguimientoLineaDashboard';

export function LineaView() {
  const navigate = useNavigate();
  const { nroInspeccion } = useParams<{ nroInspeccion: string }>();
  const [currentStep, setCurrentStep] = useState(0);
  const [estadoLinea, setEstadoLinea] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formConsolidacion, setFormConsolidacion] = useState({
    ingenieroCertificadorUsername: '',
    observacion: '',
  });

  useEffect(() => {
    if (estadoLinea) {
      setFormConsolidacion(prev => ({
        ...prev,
        ingenieroCertificadorUsername: estadoLinea.certificacion?.ingenieroCertificadorUsername || prev.ingenieroCertificadorUsername,
        observacion: estadoLinea.certificacion?.observacion || prev.observacion,
      }));
    }
  }, [estadoLinea]);

  const fetchEstadoLinea = async () => {
    if (!nroInspeccion) return;
    setLoading(true);
    setError(null);
    try {
      const data = await lineaApi.obtenerWizardModel(nroInspeccion);
      if (data.ok) {
        if (data.vehiculo) {
          data.vehiculo.marca = data.vehiculo.marca || data.vehiculo.marcavehiculo_key;
          data.vehiculo.modelo = data.vehiculo.modelo || data.vehiculo.modelovehiculo_key;
          data.vehiculo.categoria = data.vehiculo.categoria || data.vehiculo.categoriavehiculo_key;
          data.vehiculo.combustible = data.vehiculo.combustible || data.vehiculo.combustible_key;
        }

        // Mapeo linea
        data.linea = data.linea || {};
        data.linea.obligatorias = data.obligatorias || [];
        data.linea.recibidas = data.recibidas || [];
        data.linea.faltantes = data.faltantes || [];
        data.linea.noAplicables = data.noAplicables || [];

        // Mapeo botones y permisos visuales
        data.botones = {
          puedeConsolidar: data.modo === 'LISTA_PARA_CONSOLIDAR' && data.puedeConsolidar,
          puedeEditarCampos: data.modo === 'LINEA_EN_PROCESO' || data.modo === 'LISTA_PARA_CONSOLIDAR',
          soloLectura: data.modo.startsWith('HISTORICO_')
        };

        setEstadoLinea(data);
      } else {
        setError(data.message || 'Error desconocido');
      }
    } catch (err: any) {
      setError(err.message || "Error al obtener estado");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!nroInspeccion) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se ha provisto un número de inspección válido.',
        confirmButtonColor: '#3085d6'
      }).then(() => {
        navigate('/inicio');
      });
      return;
    }
    fetchEstadoLinea();
  }, [nroInspeccion]);

  const handleSiguiente = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleAnterior = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigate('/inicio');
    }
  };

  if (!nroInspeccion) return null;

  return (
    <div className="w-full min-h-[calc(100vh-10rem)] bg-white rounded-2xl shadow-xl border-t-[4px] border-solid border-t-[#f59e0b] overflow-hidden flex flex-col font-sans" style={{ borderImage: "linear-gradient(to right, #fde047 0%, #f59e0b 50%, #b45309 100%) 1" }}>
      <div className="bg-[#f4f9ff] border-b border-[#052a79]/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate('/inicio')}
            className="p-1.5 text-slate-400 hover:text-[#052a79] hover:bg-slate-100 rounded-full transition"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            Línea de Inspección
          </h2>
          <p className="text-sm text-slate-500 font-medium ml-4 border-l border-slate-300 pl-4">
            Inspección Nro: <span className="text-amber-600 font-bold">{nroInspeccion}</span>
          </p>
        </div>

        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-200 -z-10 -translate-y-1/2">
            <div
              className="h-full bg-gold-3d transition-all duration-500"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            ></div>
          </div>

          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div 
                key={step.id} 
                className="flex flex-col items-center gap-2 bg-[#f4f9ff] px-2 cursor-pointer group"
                onClick={() => setCurrentStep(index)}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? 
'bg-[#052a79] text-white shadow-md ring-4 ring-blue-100 group-hover:bg-[#041d54]' :
                    isCompleted ? 'bg-gold-3d shadow-sm border-none text-white group-hover:bg-amber-600' :
                      'bg-white text-slate-400 border-2 border-slate-200 group-hover:border-[#052a79] group-hover:text-[#052a79]'
                    }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider mt-1 transition-colors ${isActive ? 'text-[#052a79]' : 
isCompleted ? 'text-gold-3d drop-shadow-sm' : 'text-slate-400 group-hover:text-[#052a79]'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 relative z-0 flex flex-col">
        <div className="flex-1 w-full h-full animate-fade-in-up">
          {loading && <div className="p-8 text-center text-slate-500">Cargando inspección...</div>}
          
          {error && (
            <div className="p-8 text-center text-red-500">
              <h3 className="font-bold text-lg mb-2">No se pudo cargar el estado</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && estadoLinea && (
            <>
              {currentStep === 0 && (
                <ConsolidacionLegacyPanel
                  mode="resumen"
                  nroInspeccion={nroInspeccion}
                  estadoLinea={estadoLinea}
                  onRefresh={fetchEstadoLinea}
                  formConsolidacion={formConsolidacion}
                  onChangeFormConsolidacion={setFormConsolidacion}
                />
              )}
              {currentStep === 1 && (
                <LineaStep
                  nroInspeccion={nroInspeccion}
                  estadoLinea={estadoLinea}
                  onRefresh={fetchEstadoLinea}
                />
              )}
              {currentStep === 2 && (
                <PreVisualizacionStep
                  nroInspeccion={nroInspeccion}
                  estadoLinea={estadoLinea}
                />
              )}
              {currentStep === 3 && (
                <ConsolidacionLegacyPanel
                  mode="final"
                  nroInspeccion={nroInspeccion}
                  estadoLinea={estadoLinea}
                  onRefresh={fetchEstadoLinea}
                  formConsolidacion={formConsolidacion}
                  onChangeFormConsolidacion={setFormConsolidacion}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* FOOTER WIZARD GLOBAL */}
      <div className="bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-10">
        <div className="flex justify-between items-center max-w-5xl mx-auto">
          <button
            onClick={() => navigate('/inicio')}
            className="px-6 py-2 border-2 border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-100 uppercase text-sm transition-colors"
          >
            Cancelar / Volver
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={handleAnterior}
              disabled={currentStep === 0}
              className={`px-6 py-2 font-bold rounded-lg uppercase text-sm transition-colors ${currentStep === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'border-2 border-[#052a79] text-[#052a79] hover:bg-blue-50'}`}
            >
              Anterior
            </button>
            <button
              onClick={handleSiguiente}
              disabled={currentStep === STEPS.length - 1}
              className={`px-8 py-2 font-bold rounded-lg uppercase text-sm transition-colors ${currentStep === STEPS.length - 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#052a79] text-white hover:bg-[#041d54]'}`}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
