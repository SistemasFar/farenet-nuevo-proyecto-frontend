/**
 * Resultado de la emisión de "Venta directa de chips".
 *
 * El bloque de resultado se renderizaba dentro de la columna "2. Chips a
 * vender", en la parte superior del modal, mientras que el botón que lo produce
 * ("Confirmar Venta y Emitir") está en el pie. Tras emitir, el usuario pulsaba
 * abajo y el bloque aparecía muy arriba, fuera de la zona visible: no veía
 * nada cambiar.
 *
 * Estos tests fijan la posición en el DOM y el comportamiento de scroll.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');
const MODAL = leer('Chips', 'ModalVentaChips.tsx');

// Elimina comentarios de línea y de bloque, para que la documentación que
// explica el cambio no se confunda con el código que se está comprobando.
const codigo = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/** Posición de un marcador en el archivo. */
const pos = (marca: string) => {
  const i = MODAL.indexOf(marca);
  expect(i, `no se encontró "${marca}"`).toBeGreaterThan(-1);
  return i;
};

describe('el resultado se ubica al final del flujo, no arriba', () => {
  it('aparece después del botón que lo produce', () => {
    const boton = pos('Confirmar Venta y Emitir');
    const resultado = pos('RESULTADO DE LA EMISIÓN');
    expect(resultado).toBeGreaterThan(boton);
  });

  it('aparece después de la sección de Pago', () => {
    const pago = pos('<PagoStep');
    const resultado = pos('RESULTADO DE LA EMISIÓN');
    expect(resultado).toBeGreaterThan(pago);
  });

  it('aparece después de la barra de acciones que lo contiene', () => {
    // La barra de acciones cierra antes del bloque de resultado.
    const barra = pos('Confirmar Venta y Emitir');
    const finBarra = MODAL.indexOf('</div>', MODAL.indexOf('</button>', barra));
    const resultado = pos('RESULTADO DE LA EMISIÓN');
    expect(resultado).toBeGreaterThan(finBarra);
  });

  it('ya NO está dentro de la columna "2. Chips a vender"', () => {
    // La causa del problema: el bloque estaba entre el h3 de "Chips a vender"
    // y el cierre de esa columna del grid.
    const columna = MODAL.indexOf('2. Chips a vender');
    const finColumna = MODAL.indexOf('Consultar el histórico', columna) === -1
      ? MODAL.indexOf('</div>\n        </div>', columna)
      : MODAL.indexOf('Consultar el histórico', columna);
    const resultado = pos('RESULTADO DE LA EMISIÓN');
    expect(resultado).toBeGreaterThan(finColumna);
  });

  it('el orden resultante es facturación -> chips -> pago -> resultado', () => {
    const orden = [
      MODAL.indexOf('1. Datos de Facturación'),
      MODAL.indexOf('2. Chips a vender'),
      MODAL.indexOf('<PagoStep'),
      MODAL.indexOf('Confirmar Venta y Emitir'),
      MODAL.indexOf('RESULTADO DE LA EMISIÓN')
    ];
    orden.forEach((i) => expect(i).toBeGreaterThan(-1));
    const ordenado = [...orden].sort((a, b) => a - b);
    expect(orden).toEqual(ordenado);
  });
});

describe('el scroll acerca el resultado sin forzar el salto arriba', () => {
  it('usa un ref sobre el bloque de resultado', () => {
    expect(MODAL).toMatch(/const resultadoRef = useRef<HTMLDivElement \| null>\(null\);/);
    expect(MODAL).toMatch(/ref=\{resultadoRef\}/);
  });

  it('desplaza con block: nearest al aparecer el resultado', () => {
    expect(MODAL).toMatch(/resultadoRef\.current\?\.scrollIntoView\(\{ block: 'nearest', behavior: 'smooth' \}\);/);
  });

  it('sólo reacciona cuando HAY resultado', () => {
    const bloque = /useEffect\(\(\) => \{\s*if \(!resultadoVenta\) return;[\s\S]*?\}, \[resultadoVenta\]\);/
      .exec(codigo(MODAL));
    expect(bloque).not.toBeNull();
  });

  it('NO usa window.scrollTo ni scroll hacia arriba', () => {
    expect(codigo(MODAL)).not.toMatch(/window\.scrollTo|scrollTo\(0,\s*0\)/);
    expect(codigo(MODAL)).not.toMatch(/scrollIntoView\(\{\s*block:\s*'start'/);
    expect(codigo(MODAL)).not.toMatch(/scrollTop\s*=\s*0/);
  });
});

describe('todo lo que el bloque hacía sigue intacto', () => {
  it('sigue mostrando el número de comprobante', () => {
    expect(MODAL).toMatch(/resultadoVenta\.facturacion\?\.nroComprobante/);
  });

  it('sigue mostrando el estado PENDIENTE_SUNAT y el número de operación', () => {
    expect(MODAL).toMatch(/Operación #\{resultadoVenta\.operacionId\} · Estado: \{resultadoVenta\.facturacionEstado\}/);
    // El texto del encabezado se decide igual que antes.
    expect(MODAL).toMatch(/facturacionEstado === 'ACEPTADO' \? 'COMPROBANTE EMITIDO CORRECTAMENTE' : 'RESULTADO DE LA EMISIÓN'/);
  });

  it('sigue habiendo VER COMPROBANTE', () => {
    expect(MODAL).toMatch(/href=\{resultadoVenta\.facturacion\.enlacePdf\}/);
    expect(MODAL).toMatch(/VER COMPROBANTE/);
  });

  it('sigue habiendo CERRAR', () => {
    const bloque = MODAL.slice(pos('RESULTADO DE LA EMISIÓN'));
    expect(bloque).toMatch(/onClick=\{onClose\}[^>]*>CERRAR</);
  });

  it('sigue habiendo reintento del comprobante', () => {
    const bloque = MODAL.slice(pos('RESULTADO DE LA EMISIÓN'));
    expect(bloque).toMatch(/esComprobanteReintentable\(resultadoVenta\?\.facturacion\)/);
    expect(bloque).toMatch(/void handleReintentarFacturacion\(\)/);
    expect(bloque).toMatch(/REINTENTAR COMPROBANTE/);
  });

  it('sigue pintando el color según ACEPTADO o pendiente', () => {
    // El className del bloque está justo antes de su contenido.
    const bloque = MODAL.slice(pos('ref={resultadoRef}'));
    expect(bloque).toMatch(/border-emerald-200 bg-emerald-50/);
    expect(bloque).toMatch(/border-amber-200 bg-amber-50/);
  });

  it('los mensajes de emisión siguen mostrándose', () => {
    expect(codigo(MODAL)).toMatch(/\{mensaje && <p className="rounded border border-amber-200/);
    expect(codigo(MODAL)).toMatch(/setMensaje\('El comprobante fue registrado y está pendiente de SUNAT\.'\)/);
    expect(codigo(MODAL)).toMatch(/setError\(response\.message \|\| 'La venta fue registrada, pero el comprobante no pudo emitirse\.'\)/);
  });

  it('los errores de validación y de pago siguen mostrándose', () => {
    expect(codigo(MODAL)).toMatch(/\{error && <p className="rounded border border-red-200/);
    expect(codigo(MODAL)).toMatch(/\{errorValidacion && <p/);
    expect(codigo(MODAL)).toMatch(/\{errorPago && <p/);
  });

  it('no se tocó la lógica de emisión ni las llamadas al backend', () => {
    // Ni una sola llamada a la API cambia: sólo se movió el bloque.
    expect(codigo(MODAL)).toMatch(/faregasChipsApi\.validarVentaDirecta\(parsed\.validos\)/);
    expect(codigo(MODAL)).toMatch(/faregasChipsApi\.ventaDirecta\(\{/);
    expect(codigo(MODAL)).toMatch(/faregasChipsApi\.reintentarFacturacionOperacion\(operacionId\)/);
    assertSinCambioEnEmision();
  });
});

/**
 * Guarda las llamadas a la API tal como están: si alguien "arregla" el scroll
 * tocando la emisión, esta lista deja de coincidir.
 */
function assertSinCambioEnEmision() {
  const llamadas = [...codigo(MODAL).matchAll(/faregasChipsApi\.(\w+)\(/g)].map((m) => m[1]);
  expect(llamadas).toEqual(['validarVentaDirecta', 'ventaDirecta', 'reintentarFacturacionOperacion']);
}

describe('el modal sigue siendo un solo bloque coherente', () => {
  it('el resultado es el último hijo de la tarjeta del modal', () => {
    // A partir del contenido del botón CERRAR, lo que queda es el cierre de
    // los contenedores y el del propio return del componente. Se quitan
    // cierres, paréntesis y llaves: si queda algo, es contenido de más.
    const cola = MODAL.slice(pos('CERRAR</button>') + 'CERRAR</button>'.length)
      // Cierres de contenedores.
      .replace(/<\/div>/g, '')
      // Cierre del ternario que envuelve el bloque de resultado: )}.
      .replace(/\)\}/g, '')
      // Cierre del return del componente: );
      .replace(/\);/g, '')
      // Cierre de la función.
      .replace(/\}\s*$/, '')
      .trim();
    expect(cola, `quedó contenido tras el bloque de resultado: ${JSON.stringify(cola)}`)
      .toBe('');
  });

  it('las esquinas redondeadas pasan del botón al bloque de resultado', () => {
    // Con resultado presente, la barra de acciones ya no cierra el modal.
    expect(codigo(MODAL)).toMatch(/\$\{resultadoVenta \? '' : 'rounded-b-2xl'\}/);
    expect(MODAL).toMatch(/rounded-b-2xl border p-4 sm:mx-5/);
  });

  it('el resultado se anuncia a lectores de pantalla', () => {
    expect(MODAL).toMatch(/aria-live="polite"/);
  });
});
