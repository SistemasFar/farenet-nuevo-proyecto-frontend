import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  faregasNubefactReadinessApi,
  type NubefactReadiness
} from '../../../services/faregas-nubefact-readiness.api';

const Card = ({ label, value, tone = 'slate' }: { label: string; value: number | string; tone?: 'slate' | 'green' | 'amber' | 'red' }) => {
  const colors = {
    slate: 'border-slate-200 bg-white text-slate-800',
    green: 'border-green-200 bg-green-50 text-green-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-800'
  };
  return <div className={`rounded-xl border p-4 ${colors[tone]}`}><div className="text-xs font-bold uppercase opacity-70">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>;
};

type Checklist = {
  progreso: number;
  pasos: Array<{
    codigo: string;
    nombre: string;
    estado: 'COMPLETADO' | 'PENDIENTE';
    detalle: string;
    siguienteAccion: string | null;
  }>;
};

const ChecklistSection = ({ title, description, checklist, accent = 'blue' }: {
  title: string;
  description: string;
  checklist: Checklist;
  accent?: 'blue' | 'green';
}) => <section className="rounded-xl border bg-white p-5">
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div><h4 className="font-black text-slate-800">{title}</h4><p className="mt-1 text-sm text-slate-500">{description}</p></div>
    <strong className={`text-2xl ${accent === 'green' ? 'text-green-700' : 'text-[#052a79]'}`}>{checklist.progreso}%</strong>
  </div>
  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`Avance ${title}: ${checklist.progreso}%`}>
    <div className={`h-full rounded-full transition-all ${accent === 'green' ? 'bg-green-600' : 'bg-[#0b5cff]'}`} style={{ width: `${Math.min(100, Math.max(0, checklist.progreso))}%` }} />
  </div>
  <div className="mt-4 grid gap-3 lg:grid-cols-2">
    {checklist.pasos.map((paso, index) => {
      const completo = paso.estado === 'COMPLETADO';
      return <article key={paso.codigo} className={`rounded-lg border p-4 ${completo ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex gap-3">
          {completo ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />}
          <div><h5 className="font-bold text-slate-800">{index + 1}. {paso.nombre}</h5><p className="mt-1 text-sm text-slate-600">{paso.detalle}</p>{paso.siguienteAccion && <p className="mt-2 text-xs font-semibold text-amber-900">Siguiente: {paso.siguienteAccion}</p>}</div>
        </div>
      </article>;
    })}
  </div>
</section>;

export default function NubefactReadinessPanel({ plantaKey, plantaNombre }: { plantaKey: string; plantaNombre: string }) {
  const [data, setData] = useState<NubefactReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setLoading(true); setError('');
      setData(await faregasNubefactReadinessApi.obtenerPanel(plantaKey));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo evaluar Nubefact.');
    } finally { setLoading(false); }
  }, [plantaKey]);

  useEffect(() => {
    let cancelado = false;
    void faregasNubefactReadinessApi.obtenerPanel(plantaKey)
      .then((result) => { if (!cancelado) setData(result); })
      .catch((err) => { if (!cancelado) setError(err instanceof Error ? err.message : 'No se pudo evaluar Nubefact.'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [plantaKey]);

  if (loading) return <div className="flex items-center justify-center gap-2 rounded-xl border p-12 font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Evaluando preparación...</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>;
  if (!data) return null;

  const produccion = data.preparacionProduccion;
  const ambienteProduccion = data.ambientes.produccion;
  const alcanceProduccion = ambienteProduccion.series.detalle[0];
  const serieFactura = ambienteProduccion.series.detalle.find(item => item.tipoComprobante === 'FACTURA');
  const serieBoleta = ambienteProduccion.series.detalle.find(item => item.tipoComprobante === 'BOLETA');
  const listaParaEmision = produccion.estado === 'LISTA_PARA_EMISION_CONTROLADA' || produccion.estado === 'OPERATIVA';
  const bloqueosProduccion = produccion.pasos.filter(paso => paso.estado === 'PENDIENTE');

  return <div className="space-y-5">
    <div className={`rounded-xl border-2 p-5 ${listaParaEmision ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {listaParaEmision ? <CheckCircle2 className="h-7 w-7 text-green-700" /> : <ShieldCheck className="h-7 w-7 text-amber-700" />}
          <div><h3 className="font-black text-slate-800">Preparación Nubefact PRODUCCIÓN</h3><p className="text-sm text-slate-600">Sede evaluada: <strong>{plantaNombre || plantaKey}</strong>. Diagnóstico de solo lectura; no emite ni reserva correlativos. DEMO se informa por separado y no bloquea producción.</p></div>
        </div>
        <button type="button" onClick={() => void cargar()} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-bold"><RefreshCw className="h-4 w-4" />Actualizar</button>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-5">
      <Card label="Tarifas activas" value={data.catalogo.activas} />
      <Card label="Catálogo productivo real" value={data.catalogo.listasProduccion} tone={data.catalogo.listasProduccion === data.catalogo.activas && data.catalogo.activas > 0 ? 'green' : 'red'} />
      <Card label="Credenciales producción" value={`${ambienteProduccion.credenciales.configuradas}/${ambienteProduccion.credenciales.total}`} tone={ambienteProduccion.credenciales.configuradas === ambienteProduccion.credenciales.total && ambienteProduccion.credenciales.total > 0 ? 'green' : 'red'} />
      <Card label="Series producción" value={`${ambienteProduccion.series.configuradas}/${ambienteProduccion.series.requeridas}`} tone={ambienteProduccion.series.configuradas === ambienteProduccion.series.requeridas && ambienteProduccion.series.requeridas > 0 ? 'green' : 'red'} />
      <Card label="Correlativos confirmados" value={`${ambienteProduccion.series.confirmadas}/${ambienteProduccion.series.requeridas}`} tone={ambienteProduccion.series.confirmadas === ambienteProduccion.series.requeridas && ambienteProduccion.series.requeridas > 0 ? 'green' : 'red'} />
    </div>

    <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <h4 className="font-black text-slate-800">Alcance productivo verificado</h4>
      <p className="mt-1 text-sm text-slate-600">La resolución se realiza por sede → empresa → RUC → ambiente → serie. El token nunca se muestra en esta pantalla.</p>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-6">
        {[
          ['Sede', `${plantaNombre || plantaKey} (${plantaKey})`],
          ['Empresa', alcanceProduccion?.empresaKey || 'NO RESUELTA'],
          ['RUC emisor', alcanceProduccion?.rucEmisor || 'NO RESUELTO'],
          ['Entorno', 'PRODUCCION'],
          ['Serie factura', serieFactura?.serie || 'NO CONFIGURADA'],
          ['Serie boleta', serieBoleta?.serie || 'NO CONFIGURADA']
        ].map(([label, value]) => <div key={label} className="rounded-lg bg-white p-3"><span className="block text-xs font-bold uppercase text-slate-500">{label}</span><strong className="mt-1 block text-slate-800">{value}</strong></div>)}
      </div>
    </section>

    <ChecklistSection title="Fase Producción · Preflight y evidencia real" description={produccion.estado === 'OPERATIVA' ? 'Boleta y factura productivas aceptadas con sus archivos.' : produccion.estado === 'LISTA_PARA_EMISION_CONTROLADA' ? 'Preflight completo; corresponde solicitar autorización antes de una única emisión real.' : 'Complete únicamente los prerrequisitos productivos pendientes. DEMO no forma parte de estas puertas.'} checklist={produccion} accent="green" />

    <ChecklistSection title="Ambiente alternativo · Certificación técnica DEMO" description="Referencia de pruebas no productivas. Su porcentaje no habilita ni bloquea PRODUCCIÓN." checklist={data.fase2} />

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border bg-white p-5">
        <h4 className="mb-4 font-black text-slate-800">Seguros de producción</h4>
        <div className="space-y-2 text-sm">
          {[
            ['Ambiente efectivo', data.configuracion.environment],
            ['Nubefact habilitado', data.configuracion.enabled ? 'SÍ' : 'NO'],
            ['Producción confirmada', data.configuracion.productionConfirmed ? 'SÍ' : 'NO'],
            ['Migración V2 aplicada', data.configuracion.migracionV2Aplicada ? 'SÍ' : 'NO'],
            ['Estado PENDIENTE_SUNAT disponible', data.esquema.pendienteSunatAplicado ? 'SÍ' : 'NO'],
            ['Motor V2 habilitado', data.configuracion.correlativosV2Enabled ? 'SÍ' : 'NO'],
            ['Reconciliación automática', data.configuracion.cronReconciliationEnabled ? 'SÍ' : 'NO'],
            ['Envío SUNAT', data.configuracion.enviarSunat ? 'SÍ' : 'NO'],
            ['Intervalo de consulta', `${Math.round(data.configuracion.reconciliationRetryMs / 60000)} min`],
            ['Máximo de errores técnicos', String(data.configuracion.maxAttempts)],
            ['Credenciales PRODUCCIÓN', `${ambienteProduccion.credenciales.configuradas} / ${ambienteProduccion.credenciales.total}`],
            ['Series legacy excluidas', String(data.series.legacy)],
            ['Cobertura factura/boleta PRODUCCIÓN', `${ambienteProduccion.series.configuradas} / ${ambienteProduccion.series.requeridas}`],
            ['Correlativos productivos confirmados', `${ambienteProduccion.series.confirmadas} / ${ambienteProduccion.series.requeridas}`],
            ['Detracción', data.configuracion.detractionDecision]
          ].map(([label, value]) => <div key={label} className="flex justify-between border-b py-2"><span className="text-slate-500">{label}</span><strong>{value}</strong></div>)}
        </div>
      </section>
      <section className="rounded-xl border bg-white p-5">
        <h4 className="mb-4 font-black text-slate-800">Bloqueos productivos</h4>
        {bloqueosProduccion.length === 0 ? <div className="flex items-center gap-2 text-green-700"><CheckCircle2 className="h-5 w-5" />No se detectaron bloqueos productivos.</div> : <ul className="space-y-2">{bloqueosProduccion.map(item => <li key={item.codigo} className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>{item.nombre}:</strong> {item.siguienteAccion || item.detalle}</span></li>)}</ul>}
      </section>
    </div>
    <section className="rounded-xl border bg-white p-5">
      <h4 className="mb-4 font-black text-slate-800">Monitoreo de comprobantes</h4>
      <div className="grid gap-3 md:grid-cols-5"><Card label="Aceptados" value={data.monitoreo.aceptados} tone="green" /><Card label="Pendientes totales" value={data.monitoreo.pendientes} tone="amber" /><Card label="Pendientes SUNAT" value={data.monitoreo.pendientesSunat} tone="amber" /><Card label="Errores" value={data.monitoreo.errores} tone="red" /><Card label="Rechazados" value={data.monitoreo.rechazados} tone="red" /></div>
    </section>
  </div>;
}
