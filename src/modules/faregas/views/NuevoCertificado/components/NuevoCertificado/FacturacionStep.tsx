import { forwardRef, useCallback, useEffect, useImperativeHandle, useState, type Dispatch, type SetStateAction } from 'react';
import { AlertTriangle, Building2, CheckCircle2, FileText, Loader2, PencilLine, ReceiptText, Send } from 'lucide-react';
import Swal from 'sweetalert2';
import { faregasCertificadosApi } from '../../../../services/faregas-certificados.api';
import type { FacturacionContextoFaregas, FacturacionFaregas, ResumenTributarioFaregas } from '../../../../types/faregas-api';
import type { FormFacturacionState } from '../../NuevoCertificadoView';
import { DocumentosElectronicosPanel } from './DocumentosElectronicosPanel';

const mensajeError = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const detallesError = (error: unknown): string | null => {
  if (!error || typeof error !== 'object' || !('detalles' in error)) return null;
  const detalles = (error as { detalles?: unknown }).detalles;
  return Array.isArray(detalles) ? detalles.map(String).join('\n') : null;
};

const importe = (value: number, moneda = 'PEN') => new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: moneda || 'PEN',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

function ResumenTributario({ resumen }: { resumen: ResumenTributarioFaregas | null }) {
  if (!resumen) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-500">
        Guarde los datos fiscales para generar el resumen tributario que se enviará a Nubefact.
      </div>
    );
  }

  const listo = resumen.estado === 'LISTO';
  const item = resumen.items[0];

  return (
    <section className="overflow-hidden rounded-xl border-2 border-slate-200">
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 ${listo ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <div className="flex items-center gap-2">
          <ReceiptText className={`h-5 w-5 ${listo ? 'text-green-700' : 'text-red-700'}`} />
          <div>
            <h4 className="text-sm font-black capitalize text-slate-800">Resumen tributario antes de emitir</h4>
            <p className="text-xs font-medium text-slate-500">Información calculada por Faregas; no son campos editables.</p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${listo ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
          {listo ? 'LISTO PARA EMITIR' : 'CONFIGURACIÓN INCOMPLETA'}
        </span>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500"><Building2 className="h-4 w-4" /> EMPRESA EMISORA</div>
            <div className="mt-1 font-black text-slate-800">{resumen.emisor.razonSocial || '-'}</div>
            <div className="text-xs font-semibold text-slate-500">RUC {resumen.emisor.ruc || 'NO CONFIGURADO'}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">SEDE</div>
            <div className="mt-1 font-black text-slate-800">{resumen.sede.nombre || '-'}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">ENTORNO / SERIE</div>
            <div className="mt-1 font-black text-slate-800">{resumen.integracion.entorno} · {resumen.comprobante.serie || 'SIN SERIE'}</div>
            <div className="text-xs font-semibold text-slate-500">
              {resumen.comprobante.numeroAsignado ? `N.º ${resumen.comprobante.numero}` : 'Número reservado recién al emitir'}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-black capitalize text-slate-500">
              <tr>
                <th className="p-3">Servicio / código</th>
                <th className="p-3">Unidad</th>
                <th className="p-3 text-right">Cantidad</th>
                <th className="p-3 text-right">Precio</th>
                <th className="p-3 text-right">Descuento</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200 font-semibold text-slate-700">
                <td className="p-3">
                  <div className="font-black text-slate-800">{item?.descripcion || 'SERVICIO SIN CONFIGURAR'}</div>
                  <div className="mt-1 text-[10px] text-slate-500">INTERNO: {item?.codigoInterno || '-'} · SUNAT: {item?.codigoSunat || '-'}</div>
                </td>
                <td className="p-3">{item?.unidad || '-'}</td>
                <td className="p-3 text-right">{item?.cantidad || 0}</td>
                <td className="p-3 text-right">{importe(resumen.totales.precioAntesDescuento, resumen.totales.moneda)}</td>
                <td className="p-3 text-right text-red-600">-{importe(resumen.totales.descuento, resumen.totales.moneda)}</td>
                <td className="p-3 text-right font-black">{importe(resumen.totales.total, resumen.totales.moneda)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
            <div><span className="font-black">Pago:</span> {resumen.pago.condicion} · {resumen.pago.medio || 'SIN MEDIO REGISTRADO'}</div>
            <div className="mt-2"><span className="font-black">Envío:</span> {resumen.cliente.email || 'SIN CORREO'}</div>
          </div>
          <div className="space-y-1 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><span>Base imponible</span><strong>{importe(resumen.totales.baseImponible, resumen.totales.moneda)}</strong></div>
            <div className="flex justify-between"><span>IGV</span><strong>{importe(resumen.totales.igv, resumen.totales.moneda)}</strong></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base"><span className="font-black">TOTAL</span><strong className="text-[#052a79]">{importe(resumen.totales.total, resumen.totales.moneda)}</strong></div>
          </div>
        </div>

        {resumen.errores.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <div className="mb-2 flex items-center gap-2 font-black"><AlertTriangle className="h-4 w-4" /> CORRIJA ANTES DE EMITIR</div>
            <ul className="list-disc space-y-1 pl-5">{resumen.errores.map(error => <li key={error}>{error}</li>)}</ul>
          </div>
        )}
        {resumen.advertencias.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="mb-2 font-black">ADVERTENCIAS</div>
            <ul className="list-disc space-y-1 pl-5">{resumen.advertencias.map(advertencia => <li key={advertencia}>{advertencia}</li>)}</ul>
          </div>
        )}
      </div>
    </section>
  );
}

function ResumenTributarioCompacto({ resumen }: { resumen: ResumenTributarioFaregas | null }) {
  if (!resumen) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-500">
        Guarde los datos fiscales para generar el resumen tributario.
      </div>
    );
  }

  const listo = resumen.estado === 'LISTO';
  const item = resumen.items[0];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${listo ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <div className="flex min-w-0 items-center gap-2">
          <ReceiptText className={`h-4 w-4 flex-shrink-0 ${listo ? 'text-green-700' : 'text-red-700'}`} />
          <div className="min-w-0">
            <h4 className="truncate text-xs font-black text-slate-800">Resumen tributario</h4>
            <p className="text-[10px] font-medium text-slate-500">Antes de emitir</p>
          </div>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${listo ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
          {listo ? 'LISTO PARA EMITIR' : 'CONFIGURACIÓN INCOMPLETA'}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="col-span-2">
            <div className="text-[10px] font-bold text-slate-500">EMPRESA EMISORA</div>
            <div className="mt-0.5 truncate font-black text-slate-800">{resumen.emisor.razonSocial || '-'}</div>
            <div className="text-[10px] font-semibold text-slate-500">RUC {resumen.emisor.ruc || 'NO CONFIGURADO'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500">SEDE</div>
            <div className="mt-0.5 truncate font-black text-slate-800">{resumen.sede.nombre || '-'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500">ENTORNO / SERIE</div>
            <div className="mt-0.5 truncate font-black text-slate-800">{resumen.integracion.entorno} · {resumen.comprobante.serie || 'SIN SERIE'}</div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[560px] text-left text-[10px]">
            <thead className="bg-slate-100 text-[9px] font-black uppercase text-slate-500">
              <tr>
                <th className="p-2">Servicio / código</th>
                <th className="p-2">Unidad</th>
                <th className="p-2 text-right">Cant.</th>
                <th className="p-2 text-right">Precio</th>
                <th className="p-2 text-right">Desc.</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200 font-semibold text-slate-700">
                <td className="p-2">
                  <div className="font-black text-slate-800">{item?.descripcion || 'SERVICIO SIN CONFIGURAR'}</div>
                  <div className="mt-0.5 text-[9px] text-slate-500">{item?.codigoInterno || '-'} · {item?.codigoSunat || '-'}</div>
                </td>
                <td className="p-2">{item?.unidad || '-'}</td>
                <td className="p-2 text-right">{item?.cantidad || 0}</td>
                <td className="p-2 text-right">{importe(resumen.totales.precioAntesDescuento, resumen.totales.moneda)}</td>
                <td className="p-2 text-right text-red-600">-{importe(resumen.totales.descuento, resumen.totales.moneda)}</td>
                <td className="p-2 text-right font-black">{importe(resumen.totales.total, resumen.totales.moneda)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs">
          <div className="flex justify-between gap-2"><span>Base imponible</span><strong>{importe(resumen.totales.baseImponible, resumen.totales.moneda)}</strong></div>
          <div className="flex justify-between gap-2"><span>IGV</span><strong>{importe(resumen.totales.igv, resumen.totales.moneda)}</strong></div>
          <div className="flex justify-between gap-2 border-t border-slate-200 pt-1 text-sm"><span className="font-black">TOTAL</span><strong className="text-[#052a79]">{importe(resumen.totales.total, resumen.totales.moneda)}</strong></div>
        </div>

        {resumen.errores.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[10px] text-red-800">
            <div className="mb-1 flex items-center gap-1 font-black"><AlertTriangle className="h-3.5 w-3.5" /> CORRIJA ANTES DE EMITIR</div>
            <ul className="list-disc space-y-0.5 pl-4">{resumen.errores.map(error => <li key={error}>{error}</li>)}</ul>
          </div>
        )}
        {resumen.advertencias.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[10px] text-amber-800">
            <div className="mb-1 font-black">ADVERTENCIAS</div>
            <ul className="list-disc space-y-0.5 pl-4">{resumen.advertencias.map(advertencia => <li key={advertencia}>{advertencia}</li>)}</ul>
          </div>
        )}
      </div>
    </section>
  );
}

function ClienteComprobanteCompacto({
  formFacturacion,
  bloqueado,
  onEditar,
}: {
  formFacturacion: FormFacturacionState;
  bloqueado: boolean;
  onEditar: () => void;
}) {
  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-blue-100 pb-2">
        <div>
          <h4 className="text-xs font-black text-[#052a79]">Cliente del comprobante</h4>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
            {formFacturacion.usarTitularPrincipalFac ? 'Titular principal del certificado.' : 'Cliente alterno de facturación.'}
          </p>
        </div>
        {!bloqueado && (
          <button type="button" onClick={onEditar} className="flex flex-shrink-0 items-center gap-1 rounded-md border border-[#052a79] bg-white px-2 py-1.5 text-[10px] font-black text-[#052a79] hover:bg-blue-50">
            <PencilLine className="h-3.5 w-3.5" /> EDITAR EN TITULARES
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
        <div><div className="text-[9px] font-bold text-slate-500">COMPROBANTE</div><div className="mt-0.5 font-black text-slate-800">{formFacturacion.tipoDocFac || '-'}</div></div>
        <div><div className="text-[9px] font-bold text-slate-500">DNI / RUC</div><div className="mt-0.5 font-black text-slate-800">{formFacturacion.nroDocFac || '-'}</div></div>
        <div className="col-span-2"><div className="text-[9px] font-bold text-slate-500">NOMBRE / RAZÓN SOCIAL</div><div className="mt-0.5 truncate font-black capitalize text-slate-800">{formFacturacion.razonSocialFac || '-'}</div></div>
        <div className="col-span-2"><div className="text-[9px] font-bold text-slate-500">DIRECCIÓN FISCAL</div><div className="mt-0.5 truncate font-semibold capitalize text-slate-700">{formFacturacion.direccionFac || '-'}</div></div>
        <div><div className="text-[9px] font-bold text-slate-500">CORREO</div><div className="mt-0.5 truncate font-semibold text-slate-700">{formFacturacion.emailFac || 'NO REGISTRADO'}</div></div>
        <div><div className="text-[9px] font-bold text-slate-500">TELÉFONO</div><div className="mt-0.5 truncate font-semibold text-slate-700">{formFacturacion.telefonoFac || 'NO REGISTRADO'}</div></div>
      </div>
    </section>
  );
}

function DetalleCreditoCompacto({
  formFacturacion,
  bloqueado,
  onAgregar,
  onActualizar,
  onEliminar,
  onFechaVencimientoChange,
}: {
  formFacturacion: FormFacturacionState;
  bloqueado: boolean;
  onAgregar: () => void;
  onActualizar: (index: number, campo: 'fechaPago' | 'importe', value: string) => void;
  onEliminar: (index: number) => void;
  onFechaVencimientoChange: (value: string) => void;
}) {
  return (
    <details className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 lg:col-span-2">
      <summary className="cursor-pointer text-xs font-black text-[#052a79]">Detalle de crédito</summary>
      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label className="text-[10px] font-bold text-slate-600">VENCIMIENTO GENERAL<input disabled={bloqueado} type="date" value={formFacturacion.fechaVencimientoFac} onChange={event => onFechaVencimientoChange(event.target.value)} className="mt-1 block rounded-md border border-blue-200 bg-white p-1.5 text-xs" /></label>
          {!bloqueado && <button type="button" onClick={onAgregar} className="rounded-md bg-[#052a79] px-2.5 py-1.5 text-[10px] font-black text-white">+ AGREGAR CUOTA</button>}
        </div>
        {formFacturacion.cuotasFac.length === 0 ? (
          <p className="text-[10px] font-semibold text-blue-800">Agregue cuotas para completar el saldo pendiente.</p>
        ) : formFacturacion.cuotasFac.map((cuota, index) => (
          <div key={cuota.numeroCuota} className="grid grid-cols-[42px_1fr_1fr_auto] items-end gap-2 rounded-lg bg-white p-2">
            <div className="text-[10px] font-black text-slate-500">CUOTA {cuota.numeroCuota}</div>
            <label className="text-[9px] font-bold text-slate-500">FECHA<input disabled={bloqueado} type="date" value={cuota.fechaPago} onChange={event => onActualizar(index, 'fechaPago', event.target.value)} className="mt-0.5 w-full rounded-md border p-1.5 text-[11px]" /></label>
            <label className="text-[9px] font-bold text-slate-500">IMPORTE<input disabled={bloqueado} type="number" min="0.01" step="0.01" value={cuota.importe} onChange={event => onActualizar(index, 'importe', event.target.value)} className="mt-0.5 w-full rounded-md border p-1.5 text-[11px]" /></label>
            {!bloqueado && <button type="button" onClick={() => onEliminar(index)} className="rounded-md border border-red-200 px-2 py-1.5 text-[10px] font-black text-red-600">×</button>}
          </div>
        ))}
      </div>
    </details>
  );
}

interface FacturacionStepProps {
  certificadoId?: number;
  formFacturacion: FormFacturacionState;
  setFormFacturacion: Dispatch<SetStateAction<FormFacturacionState>>;
  facturacion: FacturacionFaregas | null;
  onFacturacionChange: (facturacion: FacturacionFaregas | null) => void;
  medioPago: string;
  onEditarDatosCliente: () => void;
  soloLectura?: boolean;
  variante?: 'estandar' | 'compacta';
  /** Oculta el botón Nubefact cuando la pantalla se combina con Verificación. */
  mostrarBotonEmision?: boolean;
  mostrarEncabezado?: boolean;
}

interface ResultadoPreflightFacturacion {
  estado: 'LISTO' | 'BLOQUEADO';
  bloqueos: number;
  advertencias: number;
  checks: Array<{ codigo: string; estado: 'OK' | 'ADVERTENCIA' | 'BLOQUEO'; mensaje: string }>;
}

export interface FacturacionStepHandle {
  guardar: (notificar?: boolean) => Promise<FacturacionContextoFaregas>;
  validarPreparacion: () => Promise<ResultadoPreflightFacturacion | null>;
  emitir: (opciones?: { confirmar?: boolean; propagarErrores?: boolean; mostrarMensajes?: boolean }) => Promise<FacturacionFaregas | null>;
  estaEnSimulacion: () => boolean;
}

export const FacturacionStep = forwardRef<FacturacionStepHandle, FacturacionStepProps>(function FacturacionStep({
  certificadoId,
  formFacturacion,
  setFormFacturacion,
  facturacion,
  onFacturacionChange,
  medioPago,
  onEditarDatosCliente,
  soloLectura = false,
  variante = 'estandar',
  mostrarBotonEmision = true,
  mostrarEncabezado = true,
}, ref) {
  const [isLoading, setIsLoading] = useState(Boolean(certificadoId));
  const [isSaving, setIsSaving] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [integracion, setIntegracion] = useState<{ enabled: boolean; configured: boolean; simulationEnabled?: boolean; correlativosV2Enabled?: boolean } | null>(null);
  const [resumenTributario, setResumenTributario] = useState<ResumenTributarioFaregas | null>(null);
  const [preflight, setPreflight] = useState<ResultadoPreflightFacturacion | null>(null);
  const [validating, setValidating] = useState(false);
  const bloqueado = soloLectura || facturacion?.estado === 'ACEPTADO' || facturacion?.estado === 'PENDIENTE_SUNAT' || facturacion?.estado === 'PENDIENTE' || facturacion?.estado === 'ERROR';

  const aplicarContexto = useCallback((data: FacturacionContextoFaregas) => {
    setIntegracion(data.integracion || null);
    setResumenTributario(data.resumenTributario || null);
    onFacturacionChange(data.facturacion || null);
  }, [onFacturacionChange]);

  useEffect(() => {
    if (!certificadoId) return;
    faregasCertificadosApi.obtenerFacturacion(certificadoId)
      .then(response => {
        const contexto = response.data as FacturacionContextoFaregas;
        const guardada = contexto.facturacion;
        aplicarContexto(contexto);
        if (guardada) {
          setFormFacturacion(prev => ({
            ...prev,
            tipoDocFac: guardada.tipoComprobante,
            nroDocFac: guardada.nroDocumento,
            razonSocialFac: guardada.nombreRazonSocial,
            direccionFac: guardada.direccion,
            emailFac: guardada.email || '',
            telefonoFac: guardada.telefono || '',
            condicionPagoFac: guardada.condicionPago || 'CONTADO',
            fechaVencimientoFac: String(guardada.fechaVencimiento || '').slice(0, 10),
            medioPagoFac: guardada.medioPago || '',
            cuotasFac: (guardada.cuotas || []).map(cuota => ({
              numeroCuota: cuota.numeroCuota,
              fechaPago: String(cuota.fechaPago || '').slice(0, 10),
              importe: String(cuota.importe),
            })),
          }));
        }
      })
      .catch((error: unknown) => Swal.fire('Facturacion', mensajeError(error, 'No se pudo recuperar la facturacion.'), 'error'))
      .finally(() => setIsLoading(false));
  }, [aplicarContexto, certificadoId, setFormFacturacion]);

  const handleInput = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const normalizado = type === 'email' ? value.trim().toLowerCase() : value.toUpperCase();
    setFormFacturacion(prev => ({ ...prev, [name]: normalizado }));
  };

  const datosRequest = () => {
    return {
      tipoComprobante: formFacturacion.tipoDocFac,
      nroDocumento: formFacturacion.nroDocFac,
      nombreRazonSocial: formFacturacion.razonSocialFac,
      direccion: formFacturacion.direccionFac,
      email: formFacturacion.emailFac || null,
      telefono: formFacturacion.telefonoFac || null,
      condicionPago: formFacturacion.condicionPagoFac,
      fechaVencimiento: formFacturacion.fechaVencimientoFac || null,
      medioPago: medioPago || null,
      cuotas: formFacturacion.condicionPagoFac === 'CREDITO' ? formFacturacion.cuotasFac : [],
    };
  };

  const agregarCuota = () => setFormFacturacion(prev => ({
    ...prev,
    cuotasFac: [...prev.cuotasFac, {
      numeroCuota: prev.cuotasFac.length + 1,
      fechaPago: prev.fechaVencimientoFac,
      importe: '',
    }],
  }));

  const actualizarCuota = (index: number, campo: 'fechaPago' | 'importe', value: string) => {
    setFormFacturacion(prev => ({
      ...prev,
      cuotasFac: prev.cuotasFac.map((cuota, indice) => indice === index ? { ...cuota, [campo]: value } : cuota),
    }));
  };

  const eliminarCuota = (index: number) => setFormFacturacion(prev => ({
    ...prev,
    cuotasFac: prev.cuotasFac.filter((_, indice) => indice !== index)
      .map((cuota, indice) => ({ ...cuota, numeroCuota: indice + 1 })),
  }));

  const guardar = async (notificar = true) => {
    if (!certificadoId) throw new Error('No existe un borrador de certificado.');
    setIsSaving(true);
    try {
      const response = await faregasCertificadosApi.guardarFacturacion(certificadoId, datosRequest());
      const guardada = response.data as FacturacionFaregas;
      onFacturacionChange(guardada);
      const contextoResponse = await faregasCertificadosApi.obtenerFacturacion(certificadoId);
      const contexto = contextoResponse.data as FacturacionContextoFaregas;
      aplicarContexto(contexto);
      if (notificar) await Swal.fire('Guardado', 'Los datos fiscales quedaron guardados.', 'success');
      return contexto;
    } finally {
      setIsSaving(false);
    }
  };

  const validarPreparacion = async () => {
    if (!certificadoId) return null;
    try {
      setValidating(true);
      const response = await faregasCertificadosApi.preflightFacturacion(certificadoId);
      const resultado = response.data as NonNullable<typeof preflight>;
      setPreflight(resultado);
      return resultado;
    } finally { setValidating(false); }
  };

  const emitir = async ({
    confirmar = true,
    propagarErrores = false,
    mostrarMensajes = true,
  }: { confirmar?: boolean; propagarErrores?: boolean; mostrarMensajes?: boolean } = {}) => {
    if (!certificadoId || soloLectura || isLoading || isEmitting) return null;
    if (confirmar) {
      const confirmation = await Swal.fire({
        title: '¿Emitir comprobante electronico?',
        text: integracion?.correlativosV2Enabled
          ? 'Se reservará el siguiente número de la serie tributaria Faregas y se enviará a Nubefact/SUNAT.'
          : 'El motor tributario V2 aún no está activo. La emisión no debería habilitarse en producción.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'EMITIR COMPROBANTE',
        cancelButtonText: 'CANCELAR',
        confirmButtonColor: '#052a79',
      });
      if (!confirmation.isConfirmed) return null;
    }

    setIsEmitting(true);
    try {
      // ERROR/PENDIENTE ya tienen serie reservada y deben reintentarse con el
      // mismo contenido para no generar un comprobante diferente.
      let resumenActual = resumenTributario;
      if (facturacion?.estado !== 'ERROR' && facturacion?.estado !== 'PENDIENTE') {
        const contexto = await guardar(false);
        resumenActual = contexto.resumenTributario;
      }
      if (resumenActual?.estado !== 'LISTO') {
        const errores = resumenActual?.errores?.length
          ? resumenActual.errores.join('\n')
          : 'No se pudo validar el resumen tributario.';
        const error = new Error(errores) as Error & { detalles?: string[] };
        error.detalles = resumenActual?.errores;
        throw error;
      }
      const validacion = await validarPreparacion();
      if (!validacion || validacion.estado !== 'LISTO') {
        const mensajes = validacion?.checks.filter(item => item.estado === 'BLOQUEO').map(item => item.mensaje) || [];
        const error = new Error(mensajes.join('\n') || 'La preparación integral de Nubefact está bloqueada.') as Error & { detalles?: string[] };
        error.detalles = mensajes;
        throw error;
      }
      const response = await faregasCertificadosApi.emitirFacturacion(certificadoId);
      const emitida = response.data as FacturacionFaregas;
      onFacturacionChange(emitida);
      if (mostrarMensajes) {
        if (emitida.estado === 'PENDIENTE_SUNAT') {
          await Swal.fire('Comprobante Generado', `${emitida.nroComprobante} se generó pero está pendiente de aceptación en SUNAT.`, 'info');
        } else {
          await Swal.fire('Comprobante aceptado', `${emitida.nroComprobante} fue aceptado por Nubefact/SUNAT.`, 'success');
        }
      }
      return emitida;
    } catch (error: unknown) {
      if (propagarErrores) throw error;
      const detalle = detallesError(error) || mensajeError(error, 'Revise la configuracion o respuesta de Nubefact.');
      await Swal.fire('No se emitio el comprobante', detalle, 'error');
      return null;
    } finally {
      setIsEmitting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    guardar,
    validarPreparacion,
    emitir,
    estaEnSimulacion: () => Boolean(integracion?.simulationEnabled),
  }));

  if (isLoading) {
    return <div className="flex items-center justify-center gap-3 p-8 font-bold text-slate-600 lg:col-span-2"><Loader2 className="h-5 w-5 animate-spin" /> Cargando facturación...</div>;
  }

  if (variante === 'compacta') {
    return (
      <div className="space-y-3 lg:col-span-1">
        <ClienteComprobanteCompacto
          formFacturacion={formFacturacion}
          bloqueado={bloqueado}
          onEditar={onEditarDatosCliente}
        />
        <ResumenTributarioCompacto resumen={resumenTributario} />
        {formFacturacion.condicionPagoFac === 'CREDITO' && (
          <DetalleCreditoCompacto
            formFacturacion={formFacturacion}
            bloqueado={bloqueado}
            onAgregar={agregarCuota}
            onActualizar={actualizarCuota}
            onEliminar={eliminarCuota}
            onFechaVencimientoChange={value => setFormFacturacion(prev => ({ ...prev, fechaVencimientoFac: value }))}
          />
        )}
        {preflight && preflight.estado !== 'LISTO' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[10px] text-amber-800">
            <div className="font-black">Preparación pendiente: {preflight.bloqueos} bloqueos · {preflight.advertencias} advertencias</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">{preflight.checks.filter(check => check.estado !== 'OK').map(check => <li key={check.codigo}>{check.mensaje}</li>)}</ul>
          </div>
        )}
        {facturacion?.sunatDescription && facturacion.estado !== 'ACEPTADO' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[10px] text-red-700">{facturacion.sunatDescription}</div>
        )}
        {integracion?.simulationEnabled ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[10px] text-blue-800">Modo desarrollo: el comprobante no se enviará a Nubefact/SUNAT.</div>
        ) : integracion && (!integracion.enabled || !integracion.configured) ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[10px] text-amber-800">Nubefact no está listo para emitir. Configure el Backend antes de continuar.</div>
        ) : null}
        {certificadoId && (facturacion?.estado === 'ACEPTADO' || facturacion?.estado === 'PENDIENTE_SUNAT') && (
          <details className="rounded-xl border border-slate-200 bg-white p-3">
            <summary className="cursor-pointer text-xs font-black text-slate-700">Documentos electrónicos relacionados</summary>
            <div className="mt-3">
              <DocumentosElectronicosPanel certificadoId={certificadoId} facturacion={facturacion} integracionDisponible={Boolean(integracion?.enabled && integracion?.configured)} soloLectura={soloLectura} />
            </div>
          </details>
        )}
      </div>
    );
  }

  const estadoColor = facturacion?.estado === 'ACEPTADO'
    ? 'border-green-200 bg-green-50 text-green-700'
    : facturacion?.estado === 'PENDIENTE_SUNAT'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : facturacion?.estado === 'RECHAZADO' || facturacion?.estado === 'ERROR'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {mostrarEncabezado && (
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="rounded-xl bg-[#052a79]/10 p-2.5"><FileText className="h-6 w-6 text-[#052a79]" /></div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Revisión de facturación electrónica</h3>
            <p className="text-sm text-slate-500">Confirme los datos registrados en Titulares y Datos de Facturación antes de emitir.</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-full space-y-6 rounded-2xl border-2 border-slate-200 bg-white p-8">
        {facturacion && (
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${estadoColor}`}>
            <div className="flex items-center gap-2 font-black"><CheckCircle2 className="h-5 w-5" /> ESTADO: {facturacion.estado}</div>
            <div className="font-bold">{facturacion.nroComprobante || 'SIN NUMERO RESERVADO'}</div>
            {facturacion.enlacePdf && <a href={facturacion.enlacePdf} target="_blank" rel="noreferrer" className="underline">VER PDF</a>}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl border-2 border-blue-100 bg-blue-50/50 p-5 md:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-3">
              <div>
                <h4 className="text-sm font-black capitalize text-[#052a79]">Cliente del comprobante</h4>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {formFacturacion.usarTitularPrincipalFac
                    ? 'Se facturará al titular principal del certificado.'
                    : 'Se facturará a una persona o empresa diferente del titular.'}
                </p>
              </div>
              {!bloqueado && (
                <button type="button" onClick={onEditarDatosCliente} className="flex items-center gap-2 rounded-lg border border-[#052a79] bg-white px-3 py-2 text-xs font-black text-[#052a79] hover:bg-blue-50">
                  <PencilLine className="h-4 w-4" /> EDITAR EN TITULARES
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <div className="text-[11px] font-bold text-slate-500">COMPROBANTE</div>
                <div className="mt-1 font-black text-slate-800">{formFacturacion.tipoDocFac || '-'}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500">DNI / RUC</div>
                <div className="mt-1 font-black text-slate-800">{formFacturacion.nroDocFac || '-'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-[11px] font-bold text-slate-500">NOMBRE / RAZÓN SOCIAL</div>
                <div className="mt-1 font-black capitalize text-slate-800">{formFacturacion.razonSocialFac || '-'}</div>
              </div>
              <div className="md:col-span-4">
                <div className="text-[11px] font-bold text-slate-500">DIRECCIÓN FISCAL</div>
                <div className="mt-1 font-bold capitalize text-slate-800">{formFacturacion.direccionFac || '-'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-[11px] font-bold text-slate-500">CORREO</div>
                <div className="mt-1 font-semibold text-slate-700">{formFacturacion.emailFac || 'NO REGISTRADO'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-[11px] font-bold text-slate-500">TELÉFONO</div>
                <div className="mt-1 font-semibold text-slate-700">{formFacturacion.telefonoFac || 'NO REGISTRADO'}</div>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">CONDICIÓN DE PAGO</label>
            <div className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
              <div className="font-bold text-slate-800">
                {formFacturacion.condicionPagoFac === 'CREDITO' ? 'CRÉDITO' : 'CONTADO'}
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Seleccionado automáticamente en el paso Pago.
              </p>
            </div>
          </div>

          {formFacturacion.condicionPagoFac === 'CREDITO' && (
            <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 md:col-span-2">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">VENCIMIENTO GENERAL</label>
                  <input disabled={bloqueado} type="date" name="fechaVencimientoFac" value={formFacturacion.fechaVencimientoFac} onChange={handleInput} className="rounded-lg border border-blue-200 bg-white p-2 font-semibold disabled:bg-slate-100" />
                </div>
                {!bloqueado && <button type="button" onClick={agregarCuota} className="rounded-lg bg-[#052a79] px-4 py-2 text-xs font-black text-white">+ AGREGAR CUOTA</button>}
              </div>
              {formFacturacion.cuotasFac.length === 0 ? (
                <p className="text-sm font-semibold text-blue-800">Agregue una o más cuotas. La suma debe coincidir con el saldo pendiente de la orden.</p>
              ) : formFacturacion.cuotasFac.map((cuota, index) => (
                <div key={cuota.numeroCuota} className="grid grid-cols-[80px_1fr_1fr_auto] items-end gap-2 rounded-lg bg-white p-3">
                  <div><span className="text-xs font-bold text-slate-500">CUOTA</span><div className="p-2 font-black">{cuota.numeroCuota}</div></div>
                  <label className="text-xs font-bold text-slate-500">FECHA<input disabled={bloqueado} type="date" value={cuota.fechaPago} onChange={event => actualizarCuota(index, 'fechaPago', event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm text-slate-800 disabled:bg-slate-100" /></label>
                  <label className="text-xs font-bold text-slate-500">IMPORTE<input disabled={bloqueado} type="number" min="0.01" step="0.01" value={cuota.importe} onChange={event => actualizarCuota(index, 'importe', event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm text-slate-800 disabled:bg-slate-100" /></label>
                  {!bloqueado && <button type="button" onClick={() => eliminarCuota(index)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-600">QUITAR</button>}
                </div>
              ))}
            </div>
          )}
        </div>

        <ResumenTributario resumen={resumenTributario} />

        {preflight && (
          <div className={`rounded-xl border p-4 ${preflight.estado === 'LISTO' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="mb-3 flex items-center justify-between"><strong>Validación integral Nubefact: {preflight.estado}</strong><span className="text-xs font-bold">{preflight.bloqueos} bloqueos · {preflight.advertencias} advertencias</span></div>
            <ul className="space-y-1 text-sm">{preflight.checks.map((item, index) => <li key={`${item.codigo}-${index}`} className={item.estado === 'OK' ? 'text-green-700' : item.estado === 'BLOQUEO' ? 'text-red-700' : 'text-amber-800'}>{item.estado === 'OK' ? '✓' : item.estado === 'BLOQUEO' ? '✕' : '!'} {item.mensaje}</li>)}</ul>
          </div>
        )}

        {integracion?.simulationEnabled ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
            Modo desarrollo activo: los datos se guardan y el certificado puede emitirse, pero el comprobante no se enviará a Nubefact/SUNAT.
          </div>
        ) : integracion && (!integracion.enabled || !integracion.configured) && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Nubefact esta {integracion.enabled ? 'sin URL o token configurados' : 'deshabilitado'}. Los datos pueden guardarse, pero el comprobante no podra emitirse hasta configurar el backend.
          </div>
        )}

        {facturacion?.sunatDescription && facturacion.estado !== 'ACEPTADO' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{facturacion.sunatDescription}</div>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
          <button type="button" disabled={validating || isSaving || isEmitting || bloqueado || !certificadoId} onClick={() => void validarPreparacion()} className="rounded-xl border border-slate-300 px-5 py-3 text-xs font-black text-slate-700 disabled:opacity-50">
            {validating ? 'VALIDANDO...' : 'VALIDAR PREPARACIÓN'}
          </button>
          {!bloqueado && (
            <button type="button" disabled={isSaving || isEmitting} onClick={() => guardar(true)} className="rounded-xl border-2 border-[#052a79] px-5 py-3 text-xs font-black text-[#052a79] disabled:opacity-50">
              {isSaving ? 'GUARDANDO...' : 'GUARDAR DATOS'}
            </button>
          )}
          {mostrarBotonEmision && facturacion?.estado !== 'ACEPTADO' && facturacion?.estado !== 'PENDIENTE_SUNAT' && (
            <button type="button" disabled={isSaving || isEmitting || !integracion?.enabled || !integracion?.configured || resumenTributario?.estado !== 'LISTO'} onClick={() => void emitir()} className="flex items-center gap-2 rounded-xl bg-[#052a79] px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              {isEmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isEmitting
                ? 'EMITIENDO...'
                : resumenTributario?.estado !== 'LISTO'
                  ? 'CONFIGURACIÓN TRIBUTARIA INCOMPLETA'
                  : facturacion?.estado === 'ERROR' || facturacion?.estado === 'PENDIENTE'
                    ? 'REINTENTAR EN NUBEFACT'
                    : 'EMITIR EN NUBEFACT'}
            </button>
          )}
        </div>
      </div>
      {certificadoId && (facturacion?.estado === 'ACEPTADO' || facturacion?.estado === 'PENDIENTE_SUNAT') && (
        <DocumentosElectronicosPanel certificadoId={certificadoId} facturacion={facturacion} integracionDisponible={Boolean(integracion?.enabled && integracion?.configured)} soloLectura={soloLectura} />
      )}
    </div>
  );
});
