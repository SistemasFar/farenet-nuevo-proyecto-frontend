import { useEffect, useState } from 'react';
import { faregasSolicitudesOperacionApi, type ContextoSolicitudOperacion } from '../../services/faregas-solicitudes-operacion.api';

// getRandomValues funciona también en los accesos HTTP de la red local.
const crearIdempotencia = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

// Formulario exclusivo de solicitud: nunca llama endpoints de emisión o aprobación.
export function SolicitudNotaCreditoModal({ certificadoId, onCerrar, onCreada }: {
  certificadoId: number; onCerrar: () => void; onCreada: () => void;
}) {
  const [contexto, setContexto] = useState<ContextoSolicitudOperacion | null>(null);
  const [codigo, setCodigo] = useState('01');
  const [motivo, setMotivo] = useState('');
  const [linea, setLinea] = useState(1);
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [registrada, setRegistrada] = useState<number | null>(null);
  const [idempotencia] = useState(crearIdempotencia);
  useEffect(() => {
    let vigente = true;
    faregasSolicitudesOperacionApi.contextoNotaCredito(certificadoId)
      .then(data => { if (vigente) setContexto(data); })
      .catch(e => { if (vigente) setError(e.message || 'No se pudo consultar el comprobante.'); });
    return () => { vigente = false; };
  }, [certificadoId]);
  const enviar = async () => {
    if (!contexto || guardando || !motivo.trim()) return;
    setGuardando(true); setError('');
    try {
      const res = await faregasSolicitudesOperacionApi.crear({
        certificadoId, tipoOperacion: 'EMITIR_NOTA_CREDITO', motivo: motivo.trim(), idempotenciaClave: idempotencia,
        datosPropuestos: { motivoCodigo: codigo, ...(codigo === '03' ? { itemIndice: linea - 1, descripcionCorregida: descripcion.trim() } : {}) }
      });
      setRegistrada(res.data.id); onCreada();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo registrar la solicitud.'); }
    finally { setGuardando(false); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="titulo-solicitud-nota" className="w-full max-w-xl space-y-4 rounded-xl bg-white p-6 shadow-xl">
      <h2 id="titulo-solicitud-nota" className="text-lg font-bold">Solicitar nota de crédito</h2>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {registrada ? <p role="status">Solicitud #{registrada} pendiente de aprobación. No se emitió ningún documento ni se modificó el comprobante original.</p> : <>
        <p className="text-sm">Esta acción registra una solicitud pendiente. La aprobación y la emisión requieren sus autorizaciones específicas.</p>
        {!contexto ? <p>Cargando comprobante…</p> : <p className="text-sm">Comprobante: {contexto.comprobante?.numero || 'Sin número'} · Sede: {contexto.planta.nombre}</p>}
        <label className="block text-sm">Motivo SUNAT
          <select value={codigo} onChange={e => setCodigo(e.target.value)} disabled={guardando} className="mt-1 w-full rounded border p-2">
            <option value="01">01 · Anulación de la operación</option>
            <option value="02">02 · Error en el RUC</option>
            <option value="03">03 · Corrección de descripción</option>
          </select>
        </label>
        {codigo === '03' && <>
          <label className="block text-sm">Número de línea del comprobante
            <input type="number" min={1} value={linea} onChange={e => setLinea(Number(e.target.value))} className="mt-1 w-full rounded border p-2" />
          </label>
          <label className="block text-sm">Descripción corregida
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} className="mt-1 w-full rounded border p-2" />
          </label>
        </>}
        <label className="block text-sm">Sustento de la solicitud
          <textarea maxLength={500} value={motivo} onChange={e => setMotivo(e.target.value)} disabled={guardando} className="mt-1 w-full rounded border p-2" />
        </label>
      </>}
      <div className="flex justify-end gap-3">
        <button type="button" disabled={guardando} onClick={onCerrar} className="rounded border px-4 py-2">Cerrar</button>
        {!registrada && <button type="button" disabled={!contexto || guardando || !motivo.trim() || (codigo === '03' && (!Number.isInteger(linea) || linea < 1 || descripcion.trim().length < 5))} onClick={() => void enviar()} className="rounded bg-blue-800 px-4 py-2 text-white disabled:opacity-50">{guardando ? 'Registrando…' : 'Registrar solicitud pendiente'}</button>}
      </div>
    </section>
  </div>;
}
