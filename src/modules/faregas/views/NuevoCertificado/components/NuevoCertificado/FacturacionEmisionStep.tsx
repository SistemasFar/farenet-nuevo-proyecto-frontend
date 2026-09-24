/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { AlertCircle, CheckCircle2, FileCheck2, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import type { TipoCertificadoFaregas } from '../../../../types/faregas';
import type { FacturacionFaregas } from '../../../../types/faregas-api';
import { faregasCertificadosApi } from '../../../../services/faregas-certificados.api';
import type { PagoAgregado, FormFacturacionState } from '../../NuevoCertificadoView';
import {
  ejecutarEmisionCertificado,
  ejecutarEmisionCombinada,
  esComprobanteYaEmitido,
  type ResultadoEmisionCertificado,
  type ValidacionEmisionOperacion,
} from '../../faregas-emision';
import {
  FacturacionStep,
  type FacturacionStepHandle,
} from './FacturacionStep';
import {
  VerificacionStep,
  type VerificacionStepHandle,
} from './VerificacionStep';

interface FacturacionEmisionStepProps {
  certificadoId?: number;
  certificadoEstado?: string;
  soloLectura?: boolean;
  onEmisionExitosa?: () => void;
  onAtras?: () => void;
  tipoCertificado: TipoCertificadoFaregas;
  formCaja: any;
  formVehiculo: any;
  formPropietario: any;
  formGlp: any;
  formGnv: any;
  formConformidad: any;
  pagosAgregados: PagoAgregado[];
  formFacturacion: FormFacturacionState;
  setFormFacturacion: Dispatch<SetStateAction<FormFacturacionState>>;
  facturacion: FacturacionFaregas | null;
  onFacturacionChange: (facturacion: FacturacionFaregas | null) => void;
  medioPago: string;
  onEditarDatosCliente: () => void;
}

const mensajeError = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const detalleError = (error: unknown): string | null => {
  if (!error || typeof error !== 'object' || !('detalles' in error)) return null;
  const detalles = (error as { detalles?: unknown }).detalles;
  return Array.isArray(detalles) ? detalles.map(String).join('\n') : null;
};

export function FacturacionEmisionStep({
  certificadoId,
  certificadoEstado,
  soloLectura = false,
  onEmisionExitosa,
  onAtras,
  tipoCertificado,
  formCaja,
  formVehiculo,
  formPropietario,
  formGlp,
  formGnv,
  formConformidad,
  pagosAgregados,
  formFacturacion,
  setFormFacturacion,
  facturacion,
  onFacturacionChange,
  medioPago,
  onEditarDatosCliente,
}: FacturacionEmisionStepProps) {
  const facturacionStepRef = useRef<FacturacionStepHandle>(null);
  const verificacionStepRef = useRef<VerificacionStepHandle>(null);
  const emisionLockRef = useRef(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [errorEmision, setErrorEmision] = useState('');
  const [resultadoEmision, setResultadoEmision] = useState<ResultadoEmisionCertificado | null>(null);

  const certificadoEmitido = certificadoEstado === 'EMITIDO' || Boolean(resultadoEmision);

  const handleEmitirTodo = async () => {
    if (!certificadoId || soloLectura || certificadoEmitido || emisionLockRef.current) return;

    emisionLockRef.current = true;
    setIsEmitting(true);
    setErrorEmision('');

    try {
      const confirmacion = await Swal.fire({
        title: '¿Emitir comprobante y certificado?',
        text: esComprobanteYaEmitido(facturacion)
          ? 'El comprobante ya fue emitido. Sólo se validará y emitirá el certificado, asignando su correlativo definitivo.'
          : 'La operación enviará el comprobante a Nubefact y, sólo si queda operativo, emitirá el certificado con su número definitivo.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'EMITIR AHORA',
        cancelButtonText: 'CANCELAR',
        confirmButtonColor: '#052a79',
      });
      if (!confirmacion.isConfirmed) return;

      const resultado = await ejecutarEmisionCombinada(certificadoId, facturacion, {
        emitirComprobante: async () => {
          if (!facturacionStepRef.current) {
            throw new Error('No se pudo preparar la facturación.');
          }
          if (facturacion?.estado === 'RECHAZADO') {
            throw new Error('NUBEFACT_RECHAZADO: el comprobante fue rechazado y requiere revisión operativa.');
          }
          if (facturacion?.estado === 'ANULADO') {
            throw new Error('El comprobante está anulado y no puede utilizarse para emitir un certificado.');
          }
          if (facturacionStepRef.current.estaEnSimulacion()) {
            const contexto = await facturacionStepRef.current.guardar(false);
            return contexto.facturacion;
          }
          return facturacionStepRef.current.emitir({
            confirmar: false,
            propagarErrores: true,
            mostrarMensajes: false,
          });
        },
        validarCertificado: async (): Promise<ValidacionEmisionOperacion | null> => {
          if (!verificacionStepRef.current) {
            throw new Error('No se pudo validar el certificado.');
          }
          return verificacionStepRef.current.validar();
        },
        emitirCertificado: (id) => ejecutarEmisionCertificado(id),
        marcarPasoVerificacion: async () => {
          await faregasCertificadosApi.actualizarPasoBorrador(certificadoId, 'VERIFICACION_EMISION');
        },
      });

      onFacturacionChange(resultado.facturacion);
      let numeroCertificado = resultado.certificado.numero_certificado;
      let fechaEmision = resultado.certificado.fecha_emision || new Date().toISOString();
      try {
        const borradorResponse = await faregasCertificadosApi.obtenerBorradorCompleto(certificadoId);
        const borradorEmitido = borradorResponse?.data;
        if (borradorEmitido?.estado === 'EMITIDO') {
          numeroCertificado = borradorEmitido.numeroCertificado || borradorEmitido.numero_certificado || numeroCertificado;
          fechaEmision = borradorEmitido.fechaEmision || borradorEmitido.fecha_emision || fechaEmision;
        }
      } catch {
        // La respuesta de emisión ya es suficiente para mostrar el resultado.
      }
      setResultadoEmision({
        numero_certificado: numeroCertificado,
        fecha_emision: fechaEmision,
        estado: resultado.certificado.estado || 'EMITIDO',
      });
      // La respuesta definitiva se vuelve a obtener después de emitir; no se
      // reutiliza el HTML de borrador que contenía PENDIENTE DE EMISIÓN.
      await verificacionStepRef.current?.cargarDocumento();
      onEmisionExitosa?.();
      setErrorEmision('');

      await Swal.fire(
        'Emisión completada',
        `El comprobante ${resultado.facturacion.nroComprobante || 'generado'} y el certificado fueron emitidos correctamente.`,
        'success',
      );
    } catch (error: unknown) {
      const errorMessage = mensajeError(error, '');
      // Si el servidor confirmó la emisión pero se perdió la respuesta, se
      // reconcilia el estado existente en vez de asignar otro correlativo o
      // volver a enviar el comprobante.
      if (certificadoId && errorMessage === 'ESTADO_INVALIDO') {
        try {
          const borradorResponse = await faregasCertificadosApi.obtenerBorradorCompleto(certificadoId);
          const borrador = borradorResponse?.data;
          if (borrador?.estado === 'EMITIDO' && (borrador.numeroCertificado || borrador.numero_certificado)) {
            setResultadoEmision({
              numero_certificado: borrador.numeroCertificado || borrador.numero_certificado,
              fecha_emision: borrador.fechaEmision || borrador.fecha_emision || new Date().toISOString(),
              estado: 'EMITIDO',
            });
            await verificacionStepRef.current?.cargarDocumento();
            onEmisionExitosa?.();
            await Swal.fire('La emisión ya estaba completada', 'Se recuperó el certificado emitido sin duplicar la operación.', 'info');
            return;
          }
        } catch {
          // Si no se puede reconciliar, se conserva el error original.
        }
      }

      const comprobanteYaEmitido = Boolean(
        error && typeof error === 'object' && 'comprobanteEmitido' in error
          && (error as { comprobanteEmitido?: boolean }).comprobanteEmitido,
      );
      const detalle = detalleError(error) || mensajeError(error, 'Ocurrió un error durante la emisión.');
      const mensaje = comprobanteYaEmitido
        ? `El comprobante fue emitido correctamente, pero no se pudo completar la emisión del certificado. ${detalle}`
        : `No se pudo emitir el comprobante y el certificado. ${detalle}`;

      setErrorEmision(mensaje);
      await Swal.fire('No se completó la emisión', mensaje, 'error');
    } finally {
      emisionLockRef.current = false;
      setIsEmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px]">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-[#052a79]" />
          <span className="font-black text-slate-700">ESTADO: {facturacion?.estado || certificadoEstado || 'BORRADOR'}</span>
        </div>
        <span className="font-black text-slate-600">{facturacion?.nroComprobante || 'SIN NÚMERO RESERVADO'}</span>
      </div>

      {errorEmision && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{errorEmision}</span>
        </div>
      )}

      <fieldset disabled={isEmitting} className="m-0 min-w-0 w-full border-0 p-0">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <FacturacionStep
            ref={facturacionStepRef}
            certificadoId={certificadoId}
            formFacturacion={formFacturacion}
            setFormFacturacion={setFormFacturacion}
            facturacion={facturacion}
            onFacturacionChange={onFacturacionChange}
            medioPago={medioPago}
            onEditarDatosCliente={onEditarDatosCliente}
            soloLectura={soloLectura}
            variante="compacta"
            mostrarBotonEmision={false}
            mostrarEncabezado={false}
          />

          <VerificacionStep
            ref={verificacionStepRef}
            certificadoId={certificadoId}
            certificadoEstado={certificadoEstado}
            soloLectura={soloLectura}
            tipoCertificado={tipoCertificado}
            formCaja={formCaja}
            formVehiculo={formVehiculo}
            formPropietario={formPropietario}
            formGlp={formGlp}
            formGnv={formGnv}
            formConformidad={formConformidad}
            pagosAgregados={pagosAgregados}
            formFacturacion={formFacturacion}
            facturacion={facturacion}
            resultadoEmision={resultadoEmision}
            variante="compacta"
            mostrarAcciones={false}
            mostrarEncabezado={false}
          />
        </div>
      </fieldset>

      {!soloLectura && !certificadoEmitido && (
        <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          {onAtras ? (
            <button type="button" onClick={onAtras} disabled={isEmitting} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto">ATRÁS</button>
          ) : <span className="hidden sm:block" />}
          <button
            type="button"
            onClick={() => void handleEmitirTodo()}
            disabled={isEmitting || !certificadoId}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#052a79] px-5 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-[#041d59] disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
          >
            {isEmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isEmitting ? 'EMITIENDO...' : 'EMITIR COMPROBANTE Y CERTIFICADO'}
          </button>
        </div>
      )}
    </div>
  );
}
