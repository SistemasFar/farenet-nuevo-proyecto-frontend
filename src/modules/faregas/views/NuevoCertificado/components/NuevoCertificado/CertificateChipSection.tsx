import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Cpu, Loader2, ScanBarcode } from 'lucide-react';
import { faregasCertificadosApi } from '../../../../services/faregas-certificados.api';

interface ChipSeleccion {
  requiereChip: boolean;
  productoChipId: number | null;
  seleccionado: boolean;
  chip: {
    id: number;
    numeroChip: string;
    estado: 'DISPONIBLE' | 'RESERVADO' | 'VENDIDO' | 'BAJA';
    productoNombre: string;
  } | null;
}

const normalizar = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);

export function CertificateChipSection({ certificadoId }: { certificadoId?: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [seleccion, setSeleccion] = useState<ChipSeleccion | null>(null);
  const [numero, setNumero] = useState('');
  const [loading, setLoading] = useState(Boolean(certificadoId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!certificadoId) return;
    let cancelado = false;
    setLoading(true);
    faregasCertificadosApi.obtenerChipBorrador(certificadoId)
      .then((response) => {
        if (cancelado) return;
        const data = response.data as ChipSeleccion;
        setSeleccion(data);
        setNumero(data.chip?.numeroChip || '');
      })
      .catch((reason: unknown) => !cancelado && setError(reason instanceof Error ? reason.message : 'No se pudo consultar el chip.'))
      .finally(() => !cancelado && setLoading(false));
    return () => { cancelado = true; };
  }, [certificadoId]);

  if (!certificadoId || loading) {
    return certificadoId ? <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Consultando configuración del chip…</div> : null;
  }
  if (error && !seleccion) {
    return <div role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>;
  }
  if (!seleccion?.requiereChip) return null;

  const guardar = async () => {
    const limpio = normalizar(numero);
    if (!limpio) {
      setError('Escanee o escriba el código del chip.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await faregasCertificadosApi.seleccionarChipBorrador(certificadoId, limpio);
      const data = response.data as ChipSeleccion;
      setSeleccion(data);
      setNumero(data.chip?.numeroChip || limpio);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'No se pudo seleccionar el chip.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-5 rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl bg-[#052a79]/10 p-2"><Cpu className="h-5 w-5 text-[#052a79]" /></div>
        <div><h4 className="font-black text-[#052a79]">CHIP</h4><p className="text-xs text-slate-600">Este certificado requiere una unidad física. Escanéela o escríbala; todavía no se descontará del inventario.</p></div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            value={numero}
            onChange={(event) => { setNumero(normalizar(event.target.value)); setError(''); }}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void guardar(); } }}
            disabled={seleccion.chip?.estado === 'VENDIDO'}
            className="h-11 w-full rounded-xl border-2 border-blue-200 bg-white pl-10 pr-3 font-mono font-bold capitalize outline-none focus:border-[#052a79] disabled:bg-slate-100"
            placeholder="ESCANEAR O ESCRIBIR"
            autoComplete="off"
          />
        </div>
        <button type="button" onClick={() => void guardar()} disabled={loading || seleccion.chip?.estado === 'VENDIDO'} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-[#052a79] px-4 py-2 text-xs font-black text-white disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanBarcode className="h-4 w-4" />} VALIDAR
        </button>
      </div>
      {error && <p className="mt-2 flex items-center gap-2 text-xs font-bold text-red-700"><AlertCircle className="h-4 w-4" />{error}</p>}
      {seleccion.chip && !error && <p className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{seleccion.chip.productoNombre}: {seleccion.chip.numeroChip} — {seleccion.chip.estado === 'VENDIDO' ? 'consumido en Facturación' : 'seleccionado; se consumirá al confirmar Facturación'}.</p>}
    </section>
  );
}
