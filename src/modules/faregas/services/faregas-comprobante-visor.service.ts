import Swal from 'sweetalert2';
import { faregasFetchBlob } from './faregas-http-client';
import { faregasCertificadosApi } from './faregas-certificados.api';
import type { FacturacionFaregas } from '../types/faregas-api';

export interface AbrirComprobanteFaregasOptions {
  /**
   * Ventana previamente abierta de forma sincrona en el click del usuario
   * para evitar que el navegador la bloquee por popup blocker tras una operacion asincrona.
   */
  ventanaPrevia?: Window | null;
  /** Datos de facturación ya cargados en memoria si se conocen. */
  facturacion?: FacturacionFaregas | null;
  /** Callback tras regenerar exitosamente la representación. */
  onRegenerado?: () => void | Promise<void>;
}

/**
 * Abre la representación impresa personalizada FAREGAS desde el endpoint
 * /certificados/borradores/:id/facturacion/pdf.
 *
 * Sigue la regla de prioridad estricta:
 * - PRIORIDAD 1: Representación FAREGAS.
 * - PRIORIDAD 2: PDF NubeFact sólo como respaldo explícito, NUNCA como sustituto silencioso.
 *
 * Si la representación FAREGAS no está disponible, informa al usuario y ofrece
 * regenerarla sin abrir silenciosamente NubeFact.
 */
export async function abrirComprobanteFaregas(
  certificadoId: number,
  options: AbrirComprobanteFaregasOptions = {},
): Promise<boolean> {
  const ventana = options.ventanaPrevia !== undefined
    ? options.ventanaPrevia
    : (typeof window !== 'undefined' && typeof window.open === 'function' ? window.open('', '_blank') : null);
  if (ventana) ventana.opener = null;

  try {
    const blob = await faregasFetchBlob(`/certificados/borradores/${certificadoId}/facturacion/pdf`);
    const url = URL.createObjectURL(blob);
    if (ventana && !ventana.closed) {
      ventana.location.href = url;
    } else if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.target = '_blank';
      enlace.rel = 'noopener noreferrer';
      enlace.click();
    }
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignorar error al revocar
      }
    }, 60_000);
    return true;
  } catch {
    ventana?.close();

    let facturacion = options.facturacion;
    if (!facturacion) {
      try {
        const resp = await faregasCertificadosApi.obtenerFacturacion(certificadoId);
        facturacion = resp?.data?.facturacion || null;
      } catch {
        // Ignorar error al consultar facturacion
      }
    }

    const resultado = await Swal.fire({
      icon: 'warning',
      title: 'Representación FAREGAS no disponible',
      text: 'El comprobante fue emitido correctamente, pero la representación FAREGAS todavía no está disponible.',
      showCancelButton: Boolean(facturacion?.enlacePdf),
      showDenyButton: true,
      confirmButtonText: 'REGENERAR REPRESENTACIÓN',
      confirmButtonColor: '#052A79',
      denyButtonText: 'CERRAR',
      cancelButtonText: 'VER PDF NUBEFACT',
    });

    if (resultado?.isConfirmed) {
      try {
        Swal.fire({
          title: 'Regenerando representación...',
          text: 'Por favor espere mientras se genera el PDF de FAREGAS.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });
        await faregasCertificadosApi.regenerarPdfFaregas(certificadoId);
        if (options.onRegenerado) {
          await options.onRegenerado();
        }
        Swal.close();
        return await abrirComprobanteFaregas(certificadoId, {
          onRegenerado: options.onRegenerado,
        });
      } catch (errReg) {
        await Swal.fire(
          'Error al regenerar',
          errReg instanceof Error ? errReg.message : 'No se pudo regenerar la representación impresa.',
          'error',
        );
        return false;
      }
    } else if (resultado?.dismiss === Swal.DismissReason.cancel && facturacion?.enlacePdf) {
      // Respaldo explícito: sólo se abre si el usuario eligió explícitamente "VER PDF NUBEFACT"
      if (typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open(facturacion.enlacePdf, '_blank', 'noopener,noreferrer');
      }
      return true;
    }

    return false;
  }
}
