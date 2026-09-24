
import { forwardRef, useState, useEffect, useImperativeHandle, useRef, type RefObject } from 'react';
import { CheckCircle2, AlertCircle, Loader2, XCircle, FileCheck2, Printer, RefreshCw, Eye } from 'lucide-react';
import type { TipoCertificadoFaregas } from '../../../../types/faregas';
import { faregasCertificadosApi } from '../../../../services/faregas-certificados.api';
import { ejecutarEmisionCertificado, esComprobanteOperable, type ResultadoEmisionCertificado } from '../../faregas-emision';
import Swal from 'sweetalert2';
import type { FacturacionFaregas } from '../../../../types/faregas-api';

const mensajePrevisualizacion = (error: unknown): string => {
  const mensaje = error instanceof Error ? error.message : '';
  return mensaje === 'FORMATO_PREVIEW_PENDIENTE' || mensaje.includes('pendiente')
    ? 'El formato oficial de previsualización para esta modalidad aún está pendiente.'
    : mensaje || 'No se pudo cargar el certificado.';
};

interface VerificacionStepProps {
  certificadoId?: number;
  certificadoEstado?: string;
  soloLectura?: boolean;
  onEmisionExitosa?: () => void;
  tipoCertificado: TipoCertificadoFaregas;
  formCaja: any;
  formVehiculo: any;
  formPropietario: any;
  formGlp: any;
  formGnv: any;
  formConformidad: any;
  pagosAgregados: any[];
  formFacturacion: any;
  facturacion: FacturacionFaregas | null;
  resultadoEmision?: ResultadoEmisionCertificado | null;
  variante?: 'estandar' | 'compacta';
  mostrarAcciones?: boolean;
  mostrarEncabezado?: boolean;
}

interface ValidacionEmisionResult {
  valido: boolean;
  errores: any[];
  modoFacturacion?: 'NUBEFACT' | 'SIMULACION';
}

export interface VerificacionStepHandle {
  validar: () => Promise<ValidacionEmisionResult | null>;
  cargarDocumento: () => Promise<void>;
}

function PreviewCertificadoCompacto({
  html,
  loading,
  error,
  frameRef,
  onPrint,
  mostrarImprimir,
  emitted,
}: {
  html: string | null;
  loading: boolean;
  error: string;
  frameRef: RefObject<HTMLIFrameElement | null>;
  onPrint: () => void;
  mostrarImprimir: boolean;
  emitted: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#052a79] px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-amber-300" />
          <div>
            <h3 className="text-xs font-black">{emitted ? 'Documento definitivo' : 'Previsualización del certificado'}</h3>
            <p className="text-[10px] text-blue-100">{emitted ? 'Certificado emitido y listo para imprimir.' : 'El número definitivo se asigna únicamente al emitir.'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!emitted && <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-800">PENDIENTE DE EMISIÓN</span>}
          {mostrarImprimir && (
            <button type="button" onClick={onPrint} disabled={!html || loading} className="inline-flex items-center gap-1.5 rounded-md bg-amber-400 px-2.5 py-1.5 text-[10px] font-black text-slate-900 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50">
              <Printer className="h-3.5 w-3.5" /> IMPRIMIR CERTIFICADO
            </button>
          )}
        </div>
      </div>
      {loading && <div className="flex min-h-[260px] items-center justify-center gap-2 bg-slate-100 text-xs font-semibold text-slate-600"><Loader2 className="h-5 w-5 animate-spin text-[#052a79]" /> Cargando documento...</div>}
      {!loading && error && <div className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">No se pudo cargar el documento: {error}</div>}
      {!loading && html && <div className="bg-slate-100 p-3"><iframe ref={frameRef} srcDoc={html} title={emitted ? 'Certificado FAREGAS emitido' : 'Previsualización del certificado FAREGAS'} className="h-[44vh] min-h-[320px] w-full rounded-lg border border-slate-300 bg-white shadow-inner" /></div>}
      {!loading && !html && !error && <div className="p-6 text-center text-xs font-semibold text-slate-600">No hay un documento disponible por ahora.</div>}
      {!emitted && !loading && html && <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold text-amber-800">PREVISUALIZACIÓN · PENDIENTE DE EMISIÓN</div>}
    </section>
  );
}

export const VerificacionStep = forwardRef<VerificacionStepHandle, VerificacionStepProps>(function VerificacionStep({
  certificadoId,
  certificadoEstado,
  soloLectura = false,
  onEmisionExitosa,
  tipoCertificado,
  formCaja,
  formVehiculo,
  formPropietario,
  formGlp,
  formGnv,
  formConformidad,
  pagosAgregados,
  formFacturacion,
  facturacion,
  resultadoEmision = null,
  variante = 'estandar',
  mostrarAcciones = true,
  mostrarEncabezado = true,
}, ref) {

  const totalPagado = pagosAgregados.reduce((sum, p) => sum + parseFloat(p.importe), 0);

  const [isValidating, setIsValidating] = useState(false);
  const [validacionResult, setValidacionResult] = useState<ValidacionEmisionResult | null>(null);
  const [isEmitting, setIsEmitting] = useState(false);
  const [emisionResult, setEmisionResult] = useState<{ numero_certificado: string; fecha_emision: string; estado: string } | null>(null);
  const [certificadoHtml, setCertificadoHtml] = useState<string | null>(null);
  const [isLoadingCertificado, setIsLoadingCertificado] = useState(certificadoEstado === 'EMITIDO');
  const [certificadoError, setCertificadoError] = useState('');
  const certificadoFrameRef = useRef<HTMLIFrameElement>(null);
  const resultadoVisible = emisionResult || resultadoEmision;
  const facturacionSimulada = validacionResult?.modoFacturacion === 'SIMULACION';
  const facturacionOperable = esComprobanteOperable(facturacion, validacionResult?.modoFacturacion);

  const cargarCertificadoFinal = async () => {
    if (!certificadoId) return;
    setIsLoadingCertificado(true);
    setCertificadoError('');
    try {
      const response = await faregasCertificadosApi.obtenerPrevisualizacion(certificadoId);
      const html = response?.data?.html || null;
      if (!html) throw new Error('CERTIFICADO_SIN_CONTENIDO');
      setCertificadoHtml(html);
    } catch (error: unknown) {
      setCertificadoError(mensajePrevisualizacion(error));
    } finally {
      setIsLoadingCertificado(false);
    }
  };

  const imprimirCertificado = () => {
    const ventana = certificadoFrameRef.current?.contentWindow;
    if (!ventana) {
      void Swal.fire('Impresión', 'El certificado todavía no está listo para imprimir.', 'info');
      return;
    }
    ventana.focus();
    ventana.print();
  };

  const validar = async (): Promise<ValidacionEmisionResult | null> => {
    if (!certificadoId) return null;
    setIsValidating(true);
    try {
      const response = await faregasCertificadosApi.validarEmision(certificadoId);
      const resultado = response.data as ValidacionEmisionResult;
      setValidacionResult(resultado);
      return resultado;
    } catch (e: any) {
      console.error(e);
      Swal.fire('Error', 'No se pudo validar el certificado: ' + e.message, 'error');
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  useImperativeHandle(ref, () => ({
    validar,
    cargarDocumento: cargarCertificadoFinal,
  }));

  useEffect(() => {
    if (certificadoId && certificadoEstado === 'EMITIDO') {
      let vigente = true;

      void Promise.resolve().then(async () => {
        if (!vigente) return;
        setIsLoadingCertificado(true);
        setCertificadoError('');
        try {
          try {
            const borradorResponse = await faregasCertificadosApi.obtenerBorradorCompleto(certificadoId);
            const borrador = borradorResponse?.data;
            if (borrador?.estado === 'EMITIDO' && (borrador.numeroCertificado || borrador.numero_certificado)) {
              if (vigente) {
                const numero = borrador.numeroCertificado || borrador.numero_certificado;
                setEmisionResult(prev => prev?.numero_certificado === numero
                  ? prev
                  : {
                    numero_certificado: numero,
                    fecha_emision: borrador.fechaEmision || borrador.fecha_emision || new Date().toISOString(),
                    estado: 'EMITIDO',
                  });
              }
            }
          } catch {
            // La previsualización sigue siendo recuperable aunque falle el metadato.
          }
          const response = await faregasCertificadosApi.obtenerPrevisualizacion(certificadoId);
          const html = response?.data?.html || null;
          if (!html) throw new Error('CERTIFICADO_SIN_CONTENIDO');
          if (vigente) setCertificadoHtml(html);
        } catch (error: unknown) {
          if (vigente) {
            setCertificadoError(mensajePrevisualizacion(error));
          }
        } finally {
          if (vigente) setIsLoadingCertificado(false);
        }
      });

      return () => {
        vigente = false;
      };
    }
    if (certificadoId && !emisionResult) {
      void Promise.resolve().then(() => cargarCertificadoFinal());
      void Promise.resolve().then(() => validar());
    }
    // `validar` se ejecuta sólo cuando cambia el certificado o su estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificadoId, certificadoEstado, emisionResult]);

  const handleEmitir = () => {
    if (soloLectura || !certificadoId || !validacionResult?.valido || isEmitting) return;

    Swal.fire({
      title: '¿Confirmas la emisión del certificado?',
      text: facturacionSimulada
        ? 'Modo desarrollo: se asignará el correlativo definitivo, pero el comprobante no se enviará a Nubefact/SUNAT.'
        : 'Esta acción asignará el número correlativo definitivo y no debe ejecutarse por error.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'EMITIR',
      cancelButtonText: 'CANCELAR'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsEmitting(true);
        try {
          const response = await ejecutarEmisionCertificado(certificadoId);
          setEmisionResult({
            numero_certificado: response.numero_certificado,
            fecha_emision: response.fecha_emision || new Date().toISOString(),
            estado: response.estado || 'EMITIDO'
          });
          await cargarCertificadoFinal();
          Swal.fire(
            '¡Éxito!',
            facturacionSimulada
              ? 'Certificado emitido en modo desarrollo. El comprobante no fue enviado a Nubefact/SUNAT.'
              : 'Certificado emitido correctamente',
            'success'
          );
          if (onEmisionExitosa) onEmisionExitosa();
        } catch (e: any) {
          console.error(e);
          let msg = 'Ocurrió un error inesperado.';
          if (e.message === 'NO_VALIDO_PARA_EMISION') {
            msg = 'El borrador ya no es válido para emisión. Los datos podrían haber cambiado.';
            validar();
          } else if (e.message === 'NO_EXISTE_RANGO_ACTIVO') {
            msg = 'No existe un rango disponible para esta operación. Configura un rango en Configuración -> Correlativos.';
          } else if (e.message === 'RANGO_AGOTADO') {
            msg = 'El rango de correlativos asignado se encuentra agotado.';
          } else if (e.message === 'ESTADO_INVALIDO' || e.message === 'CERTIFICADO_NOT_FOUND') {
            msg = 'El certificado ya no se encuentra en estado BORRADOR o no existe.';
          } else if (e.status === 403) {
            msg = 'Acceso denegado a esta sede/certificado.';
          }
          Swal.fire('Error de Emisión', msg, 'error');
        } finally {
          setIsEmitting(false);
        }
      }
    });
  };

  if (!certificadoId) {
    return (
      <div className="p-8 text-center text-red-500 font-bold bg-red-50 rounded-xl border border-red-200">
        Error: No se ha detectado el ID del borrador. No se puede validar la emisión.
      </div>
    );
  }

  // Agrupar errores por sección
  const erroresPorSeccion = validacionResult?.errores.reduce((acc: any, err: any) => {
    const sec = err.seccion || 'general';
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(err);
    return acc;
  }, {});

  if (variante === 'compacta') {
    const erroresCompactos = (validacionResult?.errores || [])
      .map((error: any) => String(error?.mensaje || ''))
      .filter(Boolean);
    const estadoTexto = isValidating
      ? 'Validando la información del certificado...'
      : !validacionResult
        ? 'La validación del certificado aún no está disponible.'
        : !validacionResult.valido
          ? 'No se puede emitir: complete los datos pendientes.'
          : !facturacionOperable
            ? 'Facturación pendiente: el comprobante todavía no es operable.'
            : facturacionSimulada
              ? 'Listo para emitir en modo desarrollo.'
              : 'Listo para emitir comprobante y certificado.';
    const estadoClase = isValidating || !validacionResult
      ? 'border-blue-200 bg-blue-50 text-blue-800'
      : !validacionResult.valido || !facturacionOperable
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-green-200 bg-green-50 text-green-800';

    return (
      <div className="space-y-3 lg:col-span-1">
        {(resultadoVisible || certificadoEstado === 'EMITIDO') && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-green-800">
            <div className="flex items-center gap-2 text-xs font-black"><CheckCircle2 className="h-4 w-4" /> CERTIFICADO EMITIDO</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div><div className="text-[9px] font-bold text-green-700">NÚMERO</div><div className="mt-0.5 font-black text-[#052a79]">{resultadoVisible?.numero_certificado || 'CERTIFICADO EMITIDO'}</div></div>
              <div><div className="text-[9px] font-bold text-green-700">COMPROBANTE</div><div className="mt-0.5 truncate font-black text-slate-800">{facturacion?.nroComprobante || '-'}</div></div>
              <div><div className="text-[9px] font-bold text-green-700">ESTADO SUNAT</div><div className="mt-0.5 font-black text-slate-800">{facturacion?.estado || '-'}</div></div>
              <div><div className="text-[9px] font-bold text-green-700">FECHA</div><div className="mt-0.5 font-semibold text-slate-700">{resultadoVisible?.fecha_emision ? new Date(resultadoVisible.fecha_emision).toLocaleDateString() : '—'}</div></div>
            </div>
          </div>
        )}
        <div className={`rounded-xl border p-3 ${estadoClase}`}>
          <div className="flex items-start gap-2">
            {isValidating || !validacionResult ? <Loader2 className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin" /> : !validacionResult.valido || !facturacionOperable ? <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />}
            <div className="min-w-0">
              <div className="text-xs font-black">Estado de preparación</div>
              <p className="mt-0.5 text-[11px] font-semibold">{estadoTexto}</p>
              {erroresCompactos.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[10px]">
                  {erroresCompactos.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
                </ul>
              )}
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h4 className="text-xs font-black text-slate-800">Resumen del certificado</h4>
            {!resultadoVisible && <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-800">PENDIENTE DE EMISIÓN</span>}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] sm:grid-cols-3">
            <div><div className="text-[9px] font-bold text-slate-500">TIPO</div><div className="mt-0.5 font-black text-slate-800">{tipoCertificado || '-'}</div></div>
            <div><div className="text-[9px] font-bold text-slate-500">PLACA</div><div className="mt-0.5 font-black text-[#052a79]">{formCaja.placa || '-'}</div></div>
            <div><div className="text-[9px] font-bold text-slate-500">CATEGORÍA</div><div className="mt-0.5 font-black text-slate-800">{formCaja.categoria || '-'}</div></div>
            <div><div className="text-[9px] font-bold text-slate-500">MARCA</div><div className="mt-0.5 truncate font-semibold text-slate-700">{formVehiculo.marca || '-'}</div></div>
            <div><div className="text-[9px] font-bold text-slate-500">MODELO</div><div className="mt-0.5 truncate font-semibold text-slate-700">{formVehiculo.modelo || '-'}</div></div>
            <div><div className="text-[9px] font-bold text-slate-500">AÑO</div><div className="mt-0.5 font-semibold text-slate-700">{formVehiculo.anioModelo || formVehiculo.anioFabricacion || '-'}</div></div>
            <div><div className="text-[9px] font-bold text-slate-500">N° MOTOR</div><div className="mt-0.5 truncate font-semibold text-slate-700">{formVehiculo.numeroMotor || '-'}</div></div>
            <div className="col-span-2"><div className="text-[9px] font-bold text-slate-500">N° SERIE / VIN</div><div className="mt-0.5 truncate font-semibold text-slate-700">{formVehiculo.vin || formVehiculo.serieChasis || formVehiculo.nroSerie || '-'}</div></div>
            <div><div className="text-[9px] font-bold text-slate-500">COMBUSTIBLE</div><div className="mt-0.5 truncate font-semibold text-slate-700">{formVehiculo.combustible || '-'}</div></div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 border-b border-slate-100 pb-2"><h4 className="text-xs font-black text-slate-800">Facturación</h4></div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
            <div><div className="text-[9px] font-bold text-slate-500">ESTADO SUNAT</div><div className="mt-0.5 font-black text-slate-800">{facturacionSimulada ? 'SIMULACIÓN' : facturacion?.estado || '-'}</div></div>
            <div><div className="text-[9px] font-bold text-slate-500">COMPROBANTE</div><div className="mt-0.5 truncate font-black text-slate-800">{facturacion?.nroComprobante || formFacturacion.tipoDocFac || '-'}</div></div>
            <div><div className="text-[9px] font-bold text-slate-500">DNI / RUC</div><div className="mt-0.5 font-semibold text-slate-700">{formFacturacion.nroDocFac || '-'}</div></div>
            <div className="col-span-2"><div className="text-[9px] font-bold text-slate-500">CLIENTE</div><div className="mt-0.5 truncate font-semibold text-slate-700">{formFacturacion.razonSocialFac || '-'}</div></div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-xs font-black text-slate-800">Pago registrado</h4>
            <span className="text-sm font-black text-[#052a79]">S/ {totalPagado.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-slate-500">Condición</span>
            <span className="font-black text-slate-800">{formFacturacion.condicionPagoFac === 'CREDITO' ? 'CRÉDITO' : 'CONTADO'}</span>
          </div>
          {pagosAgregados.length > 0 && <div className="mt-1 truncate text-[10px] font-semibold text-slate-500">{pagosAgregados.map(pago => `${pago.tipo} S/ ${parseFloat(pago.importe || '0').toFixed(2)}`).join(' · ')}</div>}
          {pagosAgregados.length === 0 && <div className="mt-1 text-[10px] font-semibold text-amber-700">Sin pagos registrados.</div>}
        </section>

        <PreviewCertificadoCompacto
          html={certificadoHtml}
          loading={isLoadingCertificado}
          error={certificadoError}
          frameRef={certificadoFrameRef}
          onPrint={imprimirCertificado}
          mostrarImprimir={Boolean(resultadoVisible || certificadoEstado === 'EMITIDO')}
          emitted={Boolean(resultadoVisible || certificadoEstado === 'EMITIDO')}
        />
      </div>
    );
  }

  if (resultadoVisible || certificadoEstado === 'EMITIDO') {
    return (
      <div className="space-y-6 animate-in zoom-in duration-500">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-10 text-center shadow-lg">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
            <FileCheck2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black text-green-800 capitalize tracking-tight mb-2">
            Certificado Emitido
          </h2>
          <p className="text-green-600 font-medium mb-8">
            La emisión se completó de manera exitosa y el correlativo fue asignado.
          </p>

          <div className="bg-white rounded-xl border border-green-100 p-6 inline-block min-w-[300px] shadow-sm">
            <div className="space-y-4 text-left">
              <div>
                <div className="text-xs font-bold text-slate-400 capitalize tracking-wider mb-1">Número de Certificado</div>
                <div className="text-2xl font-black text-[#052a79]">{resultadoVisible?.numero_certificado || 'CERTIFICADO EMITIDO'}</div>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div>
                  <div className="text-xs font-bold text-slate-400 capitalize tracking-wider mb-1">Estado</div>
                  <div className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded inline-block">{resultadoVisible?.estado || 'EMITIDO'}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 capitalize tracking-wider mb-1">Fecha Emisión</div>
                  <div className="text-sm font-bold text-slate-700">{resultadoVisible?.fecha_emision ? new Date(resultadoVisible.fecha_emision).toLocaleDateString() : '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex flex-col gap-3 bg-[#052a79] px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-black">Certificado de inspección emitido</h3>
              <p className="text-xs text-blue-100">Documento final listo para imprimir.</p>
            </div>
            <div className="flex gap-2">
              {!soloLectura && (
                <button
                  type="button"
                  onClick={() => void cargarCertificadoFinal()}
                  disabled={isLoadingCertificado}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingCertificado ? 'animate-spin' : ''}`} /> Actualizar
                </button>
              )}
              <button
                type="button"
                onClick={imprimirCertificado}
                disabled={!certificadoHtml || isLoadingCertificado}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-xs font-black text-slate-900 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer className="h-4 w-4" /> Imprimir certificado
              </button>
            </div>
          </div>

          {isLoadingCertificado && (
            <div className="flex min-h-[50vh] items-center justify-center gap-3 bg-slate-100 font-semibold text-slate-600">
              <Loader2 className="h-6 w-6 animate-spin text-[#052a79]" /> Cargando certificado final...
            </div>
          )}
          {!isLoadingCertificado && certificadoError && (
            <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              No se pudo cargar el certificado: {certificadoError}
            </div>
          )}
          {!isLoadingCertificado && certificadoHtml && (
            <div className="bg-slate-100 p-4">
              <iframe
                ref={certificadoFrameRef}
                srcDoc={certificadoHtml}
                title="Certificado de inspección emitido"
                className="h-[75vh] w-full rounded-xl border border-slate-300 bg-white shadow-inner"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {facturacionSimulada ? (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl shadow-sm mb-6 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-blue-800">Facturación simulada — modo desarrollo</h4>
            <p className="text-sm text-blue-700">Puedes emitir el certificado para realizar pruebas. El comprobante no será enviado ni marcado como aceptado por Nubefact/SUNAT.</p>
          </div>
        </div>
      ) : !facturacionOperable && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm mb-6 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-amber-800">Facturación pendiente o no aceptada</h4>
            <p className="text-sm text-amber-700">Puedes revisar la previsualización del certificado, pero no podrás emitirlo hasta completar la facturación en SUNAT.</p>
          </div>
        </div>
      )}

      {/* HEADER DINÁMICO */}
      {mostrarEncabezado && (
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2.5 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Verificación y Emisión</h3>
              <p className="text-sm text-slate-500">
                Revise que todos los datos sean correctos antes de emitir.
              </p>
            </div>
          </div>

          {mostrarAcciones && !soloLectura && (
            <div className="flex items-center gap-3">
              {isValidating ? (
                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 font-medium">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Validando información del certificado...
                </div>
              ) : validacionResult?.valido ? (
                <button
                  onClick={handleEmitir}
                  disabled={isEmitting}
                  className={`${isEmitting ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg'} text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 capitalize tracking-wide`}
                >
                  {isEmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  {isEmitting ? 'EMITIENDO...' : 'EMITIR CERTIFICADO'}
                </button>
              ) : (
                <button
                  onClick={() => void validar()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 text-sm"
                >
                  <AlertCircle className="w-4 h-4" /> Volver a Validar
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ERRORES DE VALIDACIÓN */}
      {!isValidating && validacionResult && !validacionResult.valido && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <XCircle className="w-6 h-6 text-red-500 mt-0.5" />
            <div>
              <h4 className="text-lg font-bold text-red-800">Borrador Incompleto</h4>
              <p className="text-sm text-red-600">El certificado tiene datos faltantes o incorrectos y no puede emitirse.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {Object.keys(erroresPorSeccion).map(sec => (
              <div key={sec} className="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                <h5 className="font-bold text-red-700 capitalize tracking-wide text-xs mb-3 border-b border-red-50 pb-2">{sec}</h5>
                <ul className="space-y-2">
                  {erroresPorSeccion[sec].map((err: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></span>
                      <span>{err.mensaje}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ESTADO LISTO */}
      {!isValidating && validacionResult?.valido && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3 text-green-700">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-green-500" />
          <span className="font-bold">
            {facturacionSimulada
              ? 'CERTIFICADO LISTO PARA EMITIR EN MODO DESARROLLO. La facturación no se enviará a SUNAT.'
              : 'CERTIFICADO LISTO PARA EMITIR. Todo está en orden.'}
          </span>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#052a79] px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-300" />
            <div>
              <h3 className="text-sm font-black">Previsualización del Certificado</h3>
              <p className="text-xs text-blue-100">El número definitivo se asigna únicamente al emitir.</p>
            </div>
          </div>
          {!resultadoVisible && certificadoEstado !== 'EMITIDO' && (
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800">
              PENDIENTE DE EMISIÓN
            </span>
          )}
        </div>
        {isLoadingCertificado && (
          <div className="flex min-h-[36vh] items-center justify-center gap-3 bg-slate-100 font-semibold text-slate-600">
            <Loader2 className="h-6 w-6 animate-spin text-[#052a79]" /> Cargando previsualización...
          </div>
        )}
        {!isLoadingCertificado && certificadoError && (
          <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            No se pudo cargar la previsualización: {certificadoError}
          </div>
        )}
        {!isLoadingCertificado && certificadoHtml && (
          <div className="bg-slate-100 p-4">
            <iframe
              ref={certificadoFrameRef}
              srcDoc={certificadoHtml}
              title="Previsualización del certificado FAREGAS"
              className="h-[60vh] w-full rounded-xl border border-slate-300 bg-white shadow-inner"
            />
          </div>
        )}
        {!isLoadingCertificado && !certificadoHtml && !certificadoError && (
          <div className="p-8 text-center text-sm font-semibold text-slate-600">
            No hay una previsualización disponible por ahora.
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80 pointer-events-none">
        
        {/* RESUMEN GENERAL Y VEHÍCULO */}
        <div className="space-y-6">
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-slate-700 capitalize tracking-wider mb-4 pb-2 border-b">1. Resumen General</h4>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div className="text-slate-500 font-semibold">Tipo:</div>
              <div className="font-bold text-slate-800 capitalize">{tipoCertificado}</div>
              {tipoCertificado !== 'CONFORMIDAD' && (
                <>
                  <div className="text-slate-500 font-semibold">Modalidad:</div>
                  <div className="font-bold text-slate-800 capitalize">{formGlp.modalidad || formGnv.modalidad || formCaja.modalidadCertificado || '-'}</div>
                </>
              )}
              <div className="text-slate-500 font-semibold">Placa:</div>
              <div className="font-bold text-[#052a79] text-lg capitalize">{formCaja.placa}</div>
              <div className="text-slate-500 font-semibold">Categoría:</div>
              <div className="font-bold text-slate-800 capitalize">{formCaja.categoria}</div>
              <div className="text-slate-500 font-semibold">Estado:</div>
              <div className="font-bold text-slate-500 capitalize bg-slate-100 px-2 py-0.5 rounded inline-block w-max">BORRADOR</div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-slate-700 capitalize tracking-wider mb-4 pb-2 border-b">2. Datos Básicos del Vehículo</h4>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div className="text-slate-500 font-semibold">Marca:</div>
              <div className="font-bold text-slate-800 capitalize">{formVehiculo.marca || '-'}</div>
              <div className="text-slate-500 font-semibold">Modelo:</div>
              <div className="font-bold text-slate-800 capitalize">{formVehiculo.modelo || '-'}</div>
              <div className="text-slate-500 font-semibold">VIN:</div>
              <div className="font-bold text-slate-800 capitalize">{formVehiculo.vin || formVehiculo.serieChasis || '-'}</div>
              <div className="text-slate-500 font-semibold">N° Motor:</div>
              <div className="font-bold text-slate-800 capitalize">{formVehiculo.numeroMotor || '-'}</div>
              <div className="text-slate-500 font-semibold">Combustible:</div>
              <div className="font-bold text-slate-800 capitalize">{formVehiculo.combustible || '-'}</div>
            </div>
          </div>

          {/* DATOS ESPECÍFICOS SEGÚN TIPO */}
          <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-[#052a79] capitalize tracking-wider mb-4 pb-2 border-b border-blue-200">
              3. Especificaciones {tipoCertificado}
            </h4>
            
            {tipoCertificado === 'GLP_ANUAL' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-slate-500 font-semibold">Propietario:</div>
                  <div className="font-bold text-slate-800 capitalize">{formPropietario.nombre || '-'}</div>
                  <div className="text-slate-500 font-semibold">Vigencia Hasta:</div>
                  <div className="font-bold text-slate-800 capitalize">{formGlp.fechaVigencia || '-'}</div>
                </div>
                <div className="text-xs bg-white p-3 rounded border border-blue-100">
                  <div className="font-bold text-slate-700 mb-1">Componentes:</div>
                  {(formGlp.componentes || []).map((componente: any) => (
                    <div key={componente.componente} className="text-slate-600">
                      {componente.componente}: {componente.marca || '-'} | MODELO: {componente.modelo || '-'} | SERIE: {componente.numeroSerie || '-'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tipoCertificado === 'GNV_ANUAL' && (
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="text-slate-500 font-semibold">Vigencia Hasta:</div>
                <div className="font-bold text-slate-800 capitalize">{formGnv.fechaVigencia || '-'}</div>
                <div className="text-slate-500 font-semibold">Observaciones:</div>
                <div className="font-bold text-slate-800 capitalize">{formGnv.observaciones || 'NINGUNA'}</div>
              </div>
            )}

            {tipoCertificado === 'CONFORMIDAD' && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-y-3">
                  <div className="text-slate-500 font-semibold">Razón Social:</div>
                  <div className="font-bold text-slate-800 capitalize">{formConformidad.razonSocial || '-'}</div>
                  <div className="text-slate-500 font-semibold">Tipo:</div>
                  <div className="font-bold text-slate-800 capitalize">{formConformidad.tipoConformidad || '-'}</div>
                </div>
                <div className="text-xs bg-white p-3 rounded border border-blue-100">
                  <div className="font-bold text-slate-700 mb-1">Motivo:</div>
                  <div className="text-slate-600 capitalize">{formConformidad.motivo || '-'}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FACTURACIÓN Y PAGOS */}
        <div className="space-y-6">
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-slate-700 capitalize tracking-wider mb-4 pb-2 border-b">4. Facturación</h4>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div className="text-slate-500 font-semibold">Comprobante:</div>
              <div className="font-bold text-slate-800 capitalize">{facturacion?.nroComprobante || formFacturacion.tipoDocFac || '-'}</div>
              <div className="text-slate-500 font-semibold">Estado SUNAT:</div>
              <div className={`font-bold capitalize ${facturacionSimulada ? 'text-blue-700' : 'text-green-700'}`}>
                {facturacionSimulada ? 'NO ENVIADO (SIMULACIÓN)' : facturacion?.estado || '-'}
              </div>
              <div className="text-slate-500 font-semibold">DNI/RUC:</div>
              <div className="font-bold text-slate-800 capitalize">{formFacturacion.nroDocFac || '-'}</div>
              <div className="text-slate-500 font-semibold">Cliente:</div>
              <div className="font-bold text-slate-800 capitalize col-span-2">{formFacturacion.razonSocialFac || '-'}</div>
              <div className="text-slate-500 font-semibold">Dirección:</div>
              <div className="font-bold text-slate-800 capitalize col-span-2">{formFacturacion.direccionFac || '-'}</div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-slate-700 capitalize tracking-wider mb-4 pb-2 border-b">5. Pago Registrado</h4>
            {pagosAgregados.length === 0 ? (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-bold">Aviso: No hay pagos registrados.</span>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="space-y-2">
                  {pagosAgregados.map((p, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                      <span className="font-semibold text-slate-600">{p.tipo} {p.tarjetaKey}</span>
                      <span className="font-bold text-slate-800">S/ {parseFloat(p.importe).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-bold text-slate-700 capitalize">Total Pagado:</span>
                  <span className="font-black text-[#052a79] text-lg">S/ {totalPagado.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
});
