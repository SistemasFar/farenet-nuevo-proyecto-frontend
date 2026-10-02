import assert from 'node:assert/strict';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * CONFIGURACIÓN → CORRELATIVOS: INVENTARIO DE RANGOS POR SEDE.
 *
 * El defecto que estos tests fijan: la pantalla modelaba los rangos como una
 * fila por (sede, servicio, tipo, modalidad), con su contador propio. Eso
 * obligaba a que GLP, GNV y conformidad tuvieran secuencias separadas dentro de
 * una misma sede, cuando el dato físico es otro: la SEDE recibe bloques de
 * números y consume el que tenga activo.
 *
 * Consecuencias observables que se comprueban aquí:
 *  - no queda filtro de tipo de certificado ni columna de operación;
 *  - la tabla muestra cantidad y disponibles calculados en la base;
 *  - existe "+ Asignar rango a sede" con Desde/Hasta/Fecha/Observación, y el
 *    formulario no pide producto, operación ni tipo;
 *  - un rango va de 1 a 50 números y la sede tiene uno solo activo;
 *  - un rango con consumo congela su inicio y su final no baja de lo entregado;
 *  - un agotado no se amplía ni se reinicia: se asigna otro;
 *  - los mensajes de interfaz son los acordados.
 *
 * No necesitan base de datos: leen el código.
 */
const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');

const VISTA = leer('Configuracion', 'components', 'TabCorrelativos.tsx');
const API = leer('..', 'services', 'faregas-correlativos-sede.api.ts');
const API_CERTIFICADOS = leer('..', 'services', 'faregas-certificados.api.ts');
const WRAPPER = leer('Configuracion', 'FaregasConfiguracionView.tsx');

/**
 * Para las aserciones negativas importa el CÓDIGO, no la explicación: el
 * archivo documenta por qué ya no hay tipo ni modalidad, y esa frase contiene
 * justamente las palabras que se prohíben en la interfaz.
 */
const codigo = (t: string) => t
  .replace(/\/\/[^\n]*/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\*.*$/gm, '');

const VISTA_CODIGO = codigo(VISTA);
const API_CODIGO = codigo(API);

const MENSAJE_SIN_RANGOS =
  'La sede no tiene correlativos disponibles. Asigne un nuevo rango de hasta 50 números.';

describe('Correlativos: la unidad es la sede, no el producto ni el tipo', () => {
  it('la pantalla sigue siendo la pestaña CORRELATIVOS de Configuración', () => {
    expect(WRAPPER).toMatch(/TabCorrelativos/);
    expect(WRAPPER).toMatch(/label: 'CORRELATIVOS'/);
  });

  it('no pide el tipo de certificado para filtrar', () => {
    expect(VISTA_CODIGO).not.toMatch(/Filtrar Tipo Certificado/);
    expect(VISTA_CODIGO).not.toMatch(/tipoCertificadoClave/);
    expect(VISTA_CODIGO).not.toMatch(/obtenerTipos\(\)/);
    expect(VISTA_CODIGO).toMatch(/estadoFiltro/);
  });

  it('no muestra la columna Operación / Certificado', () => {
    expect(VISTA_CODIGO).not.toMatch(/Operación \/ Certificado/);
    expect(VISTA_CODIGO).not.toMatch(/servicioNombre/);
    expect(VISTA_CODIGO).not.toMatch(/tipoNumeracionNombre/);
    expect(VISTA_CODIGO).not.toMatch(/COMPARTIDO/);
  });

  it('no etiqueta modalidad ni producto', () => {
    expect(VISTA_CODIGO).not.toMatch(/<th[^>]*>[^<]*(modalidad|producto)/i);
    expect(VISTA_CODIGO).not.toMatch(/<label[^>]*>[^<]*(modalidad|producto)/i);
    expect(VISTA_CODIGO).not.toMatch(/<option[^>]*>[^<]*(modalidad|producto)/i);
    expect(VISTA_CODIGO).not.toMatch(/\{[^}]*\bmodalidad\b[^}]*\}/i);
    expect(VISTA_CODIGO).not.toMatch(/\bproductoFacturacion\b/);
  });

  it('el encabezado explica que el rango es de la sede', () => {
    expect(VISTA).toMatch(/Inventario de rangos por sede/);
    expect(VISTA).toMatch(/sin importar el producto, la operación, el tipo ni la\s*\n?\s*modalidad/);
  });
});

describe('Correlativos: la tabla muestra el inventario de la sede', () => {
  it('tiene las columnas acordadas', () => {
    for (const columna of ['Sede', 'Fecha', 'Desde - Hasta', 'Número actual',
      'Cantidad', 'Disponibles', 'Estado', 'Observación', 'Acciones']) {
      expect(VISTA_CODIGO).toContain(columna);
    }
  });

  it('los filtros son Sede y Estado, con sus opciones', () => {
    expect(VISTA_CODIGO).toMatch(/FILTRO_ESTADO/);
    for (const opcion of ['Todos', 'Activo', 'Agotado', 'Cerrado']) {
      expect(VISTA_CODIGO).toContain(`'${opcion}'`);
    }
    // Un rango cuya fecha aún no llega se informa como pendiente, sin inventar
    // un cuarto estado almacenado.
    expect(VISTA_CODIGO).toMatch(/PENDIENTE/);
    expect(VISTA_CODIGO).toMatch(/vigente/);
  });

  it('cantidad = hasta - desde + 1 y el tope es 50', () => {
    expect(VISTA_CODIGO).toMatch(/const cantidad = form\.hasta - form\.desde \+ 1/);
    expect(VISTA_CODIGO).toMatch(/CANTIDAD_MAXIMA/);
    expect(API_CODIGO).toMatch(/export const CANTIDAD_MAXIMA = 50/);
    // El modelo anterior obligaba a 100 números exactos. Ese requisito se fue.
    expect(VISTA_CODIGO).not.toMatch(/TAMANO_RANGO\s*=\s*100/);
  });

  it('cantidad y disponibles llegan calculados desde la base', () => {
    expect(API).toMatch(/cantidad = rango_fin - rango_inicio \+ 1, calculada en la base/);
    expect(API).toMatch(/disponibles = rango_fin - numero_actual, calculada en la base/);
  });
});

describe('Correlativos: asignar un rango a la sede', () => {
  it('existe la acción y no pide producto, operación ni tipo', () => {
    expect(VISTA_CODIGO).toMatch(/Asignar rango a sede/);
    for (const campo of ['Sede', 'Desde', 'Hasta', 'Fecha', 'Observación']) {
      expect(VISTA_CODIGO).toContain(campo);
    }
    expect(VISTA_CODIGO).not.toMatch(/label[^>]*>Tipo de Certificado</);
  });

  it('el cuerpo enviado sólo lleva sede y números', () => {
    expect(API_CODIGO).toMatch(/plantaKey: string/);
    expect(API_CODIGO).toMatch(/rangoInicio: number/);
    expect(API_CODIGO).toMatch(/rangoFin: number/);
    expect(API_CODIGO).not.toMatch(/tipoCertificadoClave|modalidad|producto/i);
  });

  it('el endpoint es el de correlativos por sede', () => {
    expect(API_CODIGO).toMatch(/\/certificados\/correlativos-sede/);
    expect(API_CODIGO).toMatch(/'\/certificados\/correlativos-sede', \{ method: 'POST'/);
  });
});

describe('Correlativos: reglas de edición', () => {
  it('un rango con consumo congela el inicio', () => {
    expect(VISTA_CODIGO).toMatch(/rangoConConsumo/);
    expect(VISTA_CODIGO).toMatch(/disabled=\{rangoConConsumo\}/);
    expect(VISTA_CODIGO).toMatch(/el inicio no puede cambiar/);
    expect(VISTA_CODIGO).toMatch(/el final no puede quedar por debajo de/);
  });

  it('un rango agotado se conserva y se ofrece uno nuevo, no se amplía', () => {
    expect(VISTA_CODIGO).toMatch(/r\.estado === 'AGOTADO' &&/);
    expect(VISTA_CODIGO).toMatch(/Asignar rango/);
    // No existe ninguna acción de ampliar, reiniciar ni recargar.
    expect(VISTA_CODIGO).not.toMatch(/>\s*(Recargar|Reiniciar|Ampliar)\s*</);
    expect(VISTA).toMatch(/Un agotado no se amplía ni se reinicia: asigna un rango nuevo a la sede/);
  });

  it('sólo el rango activo se puede cerrar', () => {
    expect(VISTA_CODIGO).toMatch(/\{r\.estado !== 'CERRADO' && \(/);
    expect(VISTA_CODIGO).toMatch(/\{r\.estado === 'ACTIVO' && \(/);
  });
});

describe('Correlativos: mensajes de interfaz', () => {
  it('avisa con el texto acordado cuando la sede no tiene rango', () => {
    expect(VISTA_CODIGO).toContain(MENSAJE_SIN_RANGOS);
    expect(VISTA_CODIGO).toMatch(/proximo\?\.motivo \|\| SIN_CORRELATIVOS/);
  });

  it('muestra la próxima emisión sin reservarla', () => {
    expect(VISTA_CODIGO).toMatch(/Próxima emisión de la sede seleccionada/);
    expect(VISTA_CODIGO).toMatch(/Esta vista no reserva el número/);
  });

  it('el botón se bloquea si la cantidad no cabe', () => {
    expect(VISTA_CODIGO).toMatch(/disabled=\{modalSaving \|\| !cantidadValida\}/);
  });
});

describe('Correlativos: no se mezcla con la numeración tributaria', () => {
  it('la API nueva no toca series de comprobante ni Nubefact', () => {
    expect(API_CODIGO).not.toMatch(/serie|nubefact|comprobante/i);
  });

  it('las llamadas antiguas siguen existiendo y separadas', () => {
    // El modelo anterior queda como historial y como puente durante el corte
    // técnico de cada sede. No se borra de golpe.
    expect(API_CERTIFICADOS).toMatch(/obtenerCorrelativos/);
    expect(API_CERTIFICADOS).toMatch(/obtenerRangoActivo/);
  });
});