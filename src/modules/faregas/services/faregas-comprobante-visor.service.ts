import Swal from 'sweetalert2';
import { faregasFetchBlob } from './faregas-http-client';

export interface AbrirPdfNubefactOptions {
  /**
   * Ventana previamente abierta de forma sincrona en el click del usuario
   * para evitar que el navegador la bloquee por popup blocker tras una operacion asincrona.
   */
  ventanaPrevia?: Window | null;
}

export function mostrarCargaComprobanteNubefact(ventana: Window | null): void {
  if (!ventana || ventana.closed) return;

  try {
    ventana.document.open();
    ventana.document.write(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Generando comprobante</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #f4f7fb;
      color: #0f2f68;
      font-family: Arial, Helvetica, sans-serif;
    }
    .panel {
      width: min(560px, calc(100% - 32px));
      padding: 42px 32px;
      border: 1px solid #dbe5f2;
      border-radius: 20px;
      background: #fff;
      text-align: center;
      box-shadow: 0 18px 50px rgba(5, 42, 121, .14);
    }
    .pista {
      position: relative;
      height: 70px;
      margin: 8px auto 24px;
      overflow: hidden;
      border-bottom: 4px solid #f59e0b;
    }
    .carrito {
      position: absolute;
      bottom: 7px;
      left: -58px;
      animation: recorrer 2.2s ease-in-out infinite;
    }
    .carrito svg { display: block; width: 64px; height: 42px; }
    @keyframes recorrer {
      0% { left: -58px; transform: scaleX(1); }
      48% { left: calc(100% - 48px); transform: scaleX(1); }
      52% { left: calc(100% - 48px); transform: scaleX(-1); }
      96%, 100% { left: -58px; transform: scaleX(-1); }
    }
    h1 { margin: 0 0 12px; font-size: 24px; }
    p { margin: 0; color: #52637a; font-size: 16px; line-height: 1.55; }
    strong { display: block; margin-top: 8px; color: #b45309; }
  </style>
</head>
<body>
  <main class="panel" role="status" aria-live="polite">
    <div class="pista" aria-hidden="true">
      <div class="carrito">
        <svg viewBox="0 0 80 48" xmlns="http://www.w3.org/2000/svg">
          <path fill="#0b57d0" d="M12 24h7l8-13h25l11 13h5c5 0 9 4 9 9v5H3v-5c0-5 4-9 9-9Z"/>
          <path fill="#b9dcff" d="M30 15h10v9H24l6-9Zm14 0h6l8 9H44v-9Z"/>
          <circle cx="20" cy="38" r="7" fill="#17365d"/><circle cx="60" cy="38" r="7" fill="#17365d"/>
          <circle cx="20" cy="38" r="3" fill="#dbeafe"/><circle cx="60" cy="38" r="3" fill="#dbeafe"/>
        </svg>
      </div>
    </div>
    <h1>Generando comprobante</h1>
    <p>NubeFact está preparando el documento electrónico.</p>
    <strong>No cierre esta página.</strong>
  </main>
</body>
</html>`);
    ventana.document.close();
  } catch {
    // La emisión debe continuar aunque el navegador no permita personalizar la pestaña previa.
  }
}

export function descargarBlobComoArchivo(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = filename;
  enlace.style.display = 'none';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function descargarPdfNubefact(certificadoId: number): Promise<boolean> {
  try {
    const blob = await faregasFetchBlob(`/certificados/borradores/${certificadoId}/facturacion/pdf-nubefact`);
    descargarBlobComoArchivo(blob, `COMPROBANTE-NUBEFACT-${certificadoId}.pdf`);
    return true;
  } catch (error) {
    await Swal.fire(
      'No se pudo descargar',
      error instanceof Error ? error.message : 'No se pudo descargar el PDF de NubeFact.',
      'error',
    );
    return false;
  }
}

export async function descargarCertificadoFaregas(certificadoId: number): Promise<boolean> {
  try {
    const blob = await faregasFetchBlob(`/certificados/borradores/${certificadoId}/certificado/pdf`);
    descargarBlobComoArchivo(blob, `CERTIFICADO-FAREGAS-${certificadoId}.pdf`);
    return true;
  } catch (error) {
    await Swal.fire(
      'No se pudo descargar',
      error instanceof Error ? error.message : 'No se pudo generar el PDF del certificado.',
      'error',
    );
    return false;
  }
}

/** Abre exclusivamente el PDF oficial proporcionado por NubeFact. */
export async function abrirPdfNubefact(
  certificadoId: number,
  options: AbrirPdfNubefactOptions = {},
): Promise<boolean> {
  const ventana = options.ventanaPrevia !== undefined
    ? options.ventanaPrevia
    : (typeof window !== 'undefined' && typeof window.open === 'function' ? window.open('', '_blank') : null);
  if (ventana) ventana.opener = null;

  try {
    const blob = await faregasFetchBlob(`/certificados/borradores/${certificadoId}/facturacion/pdf-nubefact`);
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
  } catch (error) {
    ventana?.close();
    await Swal.fire(
      'No se pudo abrir',
      error instanceof Error ? error.message : 'El PDF oficial de NubeFact no está disponible.',
      'error',
    );
    return false;
  }
}
