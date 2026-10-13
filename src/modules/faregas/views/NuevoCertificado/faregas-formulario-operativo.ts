import type React from 'react';

const SELECTOR_CONTROLES = [
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"])',
  'select',
  'textarea',
].join(',');

const TECLAS_PROHIBIDAS_ENTERO = new Set(['.', ',', '-', '+', 'e', 'E', ' ']);

export const CAMPOS_ENTEROS_CERTIFICADO = new Set([
  'anioFabricacion',
  'anioModelo',
  'numeroCilindros',
  'cilindrada',
  'numeroEjes',
  'numeroRuedas',
  'numeroAsientos',
  'numeroPasajeros',
  'pesoNeto',
  'pesoBruto',
  'cargaUtil',
  'pesoNetoPosterior',
  'cargaUtilPosterior',
  'capacidadLitros',
  'anioFabricacionComponente',
]);

export const esCampoEnteroCertificado = (campo: string): boolean =>
  CAMPOS_ENTEROS_CERTIFICADO.has(campo);

/**
 * Conserva exclusivamente el tramo entero inicial. Así un pegado como
 * "111.00" queda en "111" y nunca se transforma silenciosamente en "11100".
 */
export const normalizarEnteroCertificado = (valor: string, maximoDigitos = 8): string => {
  const coincidencia = String(valor ?? '').match(/^\d+/);
  return (coincidencia?.[0] || '').slice(0, maximoDigitos);
};

const esControlEditable = (elemento: Element): elemento is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement => {
  if (!(elemento instanceof HTMLInputElement || elemento instanceof HTMLSelectElement || elemento instanceof HTMLTextAreaElement)) {
    return false;
  }
  if (elemento.disabled) return false;
  if (elemento instanceof HTMLInputElement && elemento.readOnly) return false;
  if (elemento instanceof HTMLTextAreaElement && elemento.readOnly) return false;
  return true;
};

const permiteMoverHorizontal = (
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  direccion: 'izquierda' | 'derecha',
): boolean => {
  if (control instanceof HTMLSelectElement) return true;
  if (control instanceof HTMLInputElement && !['text', 'search', 'tel', 'email', 'url', 'password'].includes(control.type)) {
    return true;
  }

  try {
    const inicio = control.selectionStart;
    const fin = control.selectionEnd;
    if (inicio == null || fin == null) return true;
    if (inicio !== fin) return false;
    return direccion === 'izquierda' ? inicio === 0 : fin === control.value.length;
  } catch {
    return true;
  }
};

const centro = (rect: DOMRect) => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

const buscarControlDireccional = (
  controles: Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  actual: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  direccion: 'izquierda' | 'derecha' | 'arriba' | 'abajo',
) => {
  const origenRect = actual.getBoundingClientRect();
  const origen = centro(origenRect);
  const candidatos = controles
    .filter((control) => control !== actual)
    .map((control) => {
      const destinoRect = control.getBoundingClientRect();
      const destino = centro(destinoRect);
      return { control, dx: destino.x - origen.x, dy: destino.y - origen.y };
    })
    .filter(({ dx, dy }) => {
      if (direccion === 'derecha') return dx > 2;
      if (direccion === 'izquierda') return dx < -2;
      if (direccion === 'abajo') return dy > 2;
      return dy < -2;
    })
    .sort((a, b) => {
      const puntaje = (item: { dx: number; dy: number }) => {
        const principal = direccion === 'izquierda' || direccion === 'derecha'
          ? Math.abs(item.dx)
          : Math.abs(item.dy);
        const secundario = direccion === 'izquierda' || direccion === 'derecha'
          ? Math.abs(item.dy)
          : Math.abs(item.dx);
        return principal + secundario * 3;
      };
      return puntaje(a) - puntaje(b);
    });

  if (candidatos[0]) return candidatos[0].control;

  // Fallback útil en pruebas, navegadores sin geometría y formularios lineales.
  const indice = controles.indexOf(actual);
  const haciaAdelante = direccion === 'derecha' || direccion === 'abajo';
  return controles[indice + (haciaAdelante ? 1 : -1)];
};

const enfocar = (control?: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
  if (!control) return false;
  control.focus();
  if (control instanceof HTMLInputElement && ['text', 'search', 'tel'].includes(control.type)) {
    const posicion = control.value.length;
    control.setSelectionRange(posicion, posicion);
  }
  return true;
};

/** Navegación tipo ficha técnica, compartida por todos los pasos del wizard. */
export const manejarNavegacionFormulario = (event: React.KeyboardEvent<HTMLElement>) => {
  const objetivo = event.target;
  if (!(objetivo instanceof Element) || !esControlEditable(objetivo)) return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;

  if (objetivo.dataset.tipoDato === 'entero' && TECLAS_PROHIBIDAS_ENTERO.has(event.key)) {
    event.preventDefault();
    return;
  }

  const esEnter = event.key === 'Enter';
  const esFlecha = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key);
  if (!esEnter && !esFlecha) return;
  if (objetivo instanceof HTMLTextAreaElement && esEnter) return;

  const contenedor = event.currentTarget;
  const controles = Array.from(contenedor.querySelectorAll(SELECTOR_CONTROLES)).filter(esControlEditable);
  const indice = controles.indexOf(objetivo);
  if (indice < 0) return;

  let siguiente: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | undefined;
  if (esEnter) {
    siguiente = controles[indice + (event.shiftKey ? -1 : 1)];
  } else {
    const direccion = event.key === 'ArrowLeft'
      ? 'izquierda'
      : event.key === 'ArrowRight'
        ? 'derecha'
        : event.key === 'ArrowUp'
          ? 'arriba'
          : 'abajo';
    if ((direccion === 'izquierda' || direccion === 'derecha') && !permiteMoverHorizontal(objetivo, direccion)) {
      return;
    }
    siguiente = buscarControlDireccional(controles, objetivo, direccion);
  }

  if (enfocar(siguiente)) event.preventDefault();
};

