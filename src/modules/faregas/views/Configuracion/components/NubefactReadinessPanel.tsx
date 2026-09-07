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

  return <div className="space-y-5">
    <div className={`rounded-xl border-2 p-5 ${data.estado === 'LISTO' ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {data.estado === 'LISTO' ? <CheckCircle2 className="h-7 w-7 text-green-700" /> : <ShieldCheck className="h-7 w-7 text-amber-700" />}
          <div><h3 className="font-black text-slate-800">Preparación técnica de Nubefact</h3><p className="text-sm text-slate-600">Sede evaluada: <strong>{plantaNombre || plantaKey}</strong>. Diagnóstico de solo lectura; no emite ni reserva correlativos.</p></div>
        </div>
        <button type="button" onClick={() => void cargar()} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-bold"><RefreshCw className="h-4 w-4" />Actualizar</button>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-5">
      <Card label="Tarifas activas" value={data.catalogo.activas} />
      <Card label="Listas para Nubefact" value={data.catalogo.listas} tone="green" />
      <Card label="Sin producto fiscal" value={data.catalogo.sinVincular} tone={data.catalogo.sinVincular ? 'red' : 'green'} />
      <Card label={`Series Nubefact ${data.configuracion.environment}`} value={data.series.nubefactExclusivas} tone={data.series.nubefactExclusivas ? 'green' : 'amber'} />
      <Card label="Series por agotarse" value={data.series.proximasAgotarse} tone={data.series.proximasAgotarse ? 'red' : 'green'} />
    </div>

    <section className="rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h4 className="font-black text-slate-800">Fase 2 · Certificación técnica DEMO</h4>
          <p className="mt-1 text-sm text-slate-500">
            {data.fase2.estado === 'COMPLETADA'
              ? 'Completada con evidencia de comprobante aceptado y archivos tributarios.'
              : data.fase2.estado === 'LISTA_PARA_PRUEBA_DEMO'
                ? 'Las configuraciones previas están completas; falta autorizar la emisión DEMO.'
                : 'Complete las puertas pendientes en el orden mostrado.'}
          </p>
        </div>
        <strong className="text-2xl text-[#052a79]">{data.fase2.progreso}%</strong>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`Avance Fase 2: ${data.fase2.progreso}%`}>
        <div className="h-full rounded-full bg-[#0b5cff] transition-all" style={{ width: `${Math.min(100, Math.max(0, data.fase2.progreso))}%` }} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {data.fase2.pasos.map((paso, index) => {
          const completo = paso.estado === 'COMPLETADO';
          return <article key={paso.codigo} className={`rounded-lg border p-4 ${completo ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="flex gap-3">
              {completo
                ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
                : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />}
              <div>
                <h5 className="font-bold text-slate-800">{index + 1}. {paso.nombre}</h5>
                <p className="mt-1 text-sm text-slate-600">{paso.detalle}</p>
                {paso.siguienteAccion && <p className="mt-2 text-xs font-semibold text-amber-900">Siguiente: {paso.siguienteAccion}</p>}
              </div>
            </div>
          </article>;
        })}
      </div>
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border bg-white p-5">
        <h4 className="mb-4 font-black text-slate-800">Seguros de producción</h4>
        <div className="space-y-2 text-sm">
          {[
            ['Entorno', data.configuracion.environment],
            ['Nubefact habilitado', data.configuracion.enabled ? 'SÍ' : 'NO'],
            ['Producción confirmada', data.configuracion.productionConfirmed ? 'SÍ' : 'NO'],
            ['Migración V2 aplicada', data.configuracion.migracionV2Aplicada ? 'SÍ' : 'NO'],
            ['Estado PENDIENTE_SUNAT disponible', data.esquema.pendienteSunatAplicado ? 'SÍ' : 'NO'],
            ['Motor V2 habilitado', data.configuracion.correlativosV2Enabled ? 'SÍ' : 'NO'],
            ['Reconciliación automática', data.configuracion.cronReconciliationEnabled ? 'SÍ' : 'NO'],
            ['Intervalo de consulta', `${Math.round(data.configuracion.reconciliationRetryMs / 60000)} min`],
            ['Máximo de errores técnicos', String(data.configuracion.maxAttempts)],
            [`Credenciales ${data.credenciales.ambiente}`, `${data.credenciales.configuradas} / ${data.credenciales.total}`],
            ['Series legacy excluidas', String(data.series.legacy)],
            ['Series Nubefact predeterminadas', String(data.series.nubefactPredeterminadas)],
            ['Cobertura factura/boleta por sede', `${data.series.seriesBasicasConfiguradas} / ${data.series.seriesBasicasRequeridas}`],
            ['Series productivas confirmadas', String(data.series.confirmadasProduccion)],
            ['Detracción', data.configuracion.detractionDecision]
          ].map(([label, value]) => <div key={label} className="flex justify-between border-b py-2"><span className="text-slate-500">{label}</span><strong>{value}</strong></div>)}
        </div>
      </section>
      <section className="rounded-xl border bg-white p-5">
        <h4 className="mb-4 font-black text-slate-800">Bloqueos vigentes</h4>
        {data.bloqueos.length === 0 ? <div className="flex items-center gap-2 text-green-700"><CheckCircle2 className="h-5 w-5" />No se detectaron bloqueos.</div> : <ul className="space-y-2">{data.bloqueos.map(item => <li key={item} className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{item}</li>)}</ul>}
      </section>
    </div>
    <section className="rounded-xl border bg-white p-5">
      <h4 className="mb-4 font-black text-slate-800">Monitoreo de comprobantes</h4>
      <div className="grid gap-3 md:grid-cols-5"><Card label="Aceptados" value={data.monitoreo.aceptados} tone="green" /><Card label="Pendientes totales" value={data.monitoreo.pendientes} tone="amber" /><Card label="Pendientes SUNAT" value={data.monitoreo.pendientesSunat} tone="amber" /><Card label="Errores" value={data.monitoreo.errores} tone="red" /><Card label="Rechazados" value={data.monitoreo.rechazados} tone="red" /></div>
    </section>
  </div>;
}
