import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VISTA = readFileSync(resolve(__dirname, 'NuevoCertificadoView.tsx'), 'utf8');
const VEHICULO = readFileSync(
  resolve(__dirname, 'components', 'NuevoCertificado', 'VehiculoStep.tsx'),
  'utf8'
);

const bloqueGuardarGnv = () => {
  const inicio = VISTA.indexOf('faregasCertificadosApi.guardarGnv(');
  const fin = VISTA.indexOf('});', inicio);
  return VISTA.slice(inicio, fin);
};

/**
 * "CARACTERÍSTICAS DE CONVERSIÓN GNV" (sólo modalidad INICIAL).
 *
 * El formulario pintaba la tabla antes/después y la plantilla del certificado
 * leía las columnas correctas, pero el valor nunca llegaba al backend porque
 * faltaban en el payload: el peso salía "-" y el combustible caía en el valor
 * por defecto de la plantilla.
 */
describe('características después de la conversión: envío al backend', () => {
  it('el payload incluye el combustible y el peso posteriores', () => {
    const bloque = bloqueGuardarGnv();
    expect(bloque).toMatch(/combustiblePosterior:\s*formGnv\.combustiblePosterior/);
    expect(bloque).toMatch(/pesoNetoPosterior:\s*formGnv\.pesoNetoPosterior/);
  });

  it('sólo se envían en modalidad INICIAL, que es donde existe la tabla', () => {
    const bloque = bloqueGuardarGnv();
    expect(bloque).toMatch(/formCaja\.modalidadCertificado === 'INICIAL'\s*\?/);
  });

  it('no se envían en ANUAL, para no borrar a NULL lo ya escrito', () => {
    const bloque = bloqueGuardarGnv();
    // El objeto se construye con un condicional y un objeto vacío en ANUAL.
    expect(bloque).toMatch(/\}\s*:\s*\{\s*\}/);
  });
});

describe('características después de la conversión: hidratación del borrador', () => {
  it('al abrir el borrador, el valor persistido vuelve al formulario', () => {
    const bloque = VISTA.slice(
      VISTA.indexOf("if (res.data.tipo?.clave === 'GNV_ANUAL')"),
      VISTA.indexOf("} else if (res.data.tipo?.clave === 'GLP_ANUAL')")
    );
    expect(bloque).toMatch(/combustiblePosterior:\s*gnv\.combustible_posterior/);
    expect(bloque).toMatch(/pesoNetoPosterior:\s*gnv\.peso_neto_posterior/);
  });

  it('la rehidratación no borra lo escrito si el servidor devuelve NULL', () => {
    const bloque = VISTA.slice(
      VISTA.indexOf('if (response.data.gnvFaregas)'),
      VISTA.indexOf('if (response.data.conformidadFaregas)')
    );
    const lineaCombustible = bloque.split('\n').find((l) => l.includes('combustiblePosterior:'));
    const lineaPeso = bloque.split('\n').find((l) => l.includes('pesoNetoPosterior:'));
    expect(lineaCombustible).toMatch(/prev\.combustiblePosterior/);
    expect(lineaPeso).toMatch(/prev\.pesoNetoPosterior/);
  });
});

describe('el formulario conserva los dos conceptos separados', () => {
  it('el peso ORIGINAL se muestra en solo lectura desde el vehículo', () => {
    // La columna ANTES no es editable: se toma del snapshot del vehículo.
    const antes = VEHICULO.slice(VEHICULO.indexOf('PESO NETO (Kg.)'));
    expect(antes).toMatch(/value=\{formVehiculo\.pesoNeto \|\| ''\} readOnly/);
  });

  it('el peso DESPUÉS es un control propio que escribe en formGnv', () => {
    const despues = VEHICULO.slice(VEHICULO.indexOf('PESO NETO (Kg.)'));
    expect(despues).toMatch(/name="pesoNetoPosterior"/);
    expect(despues).toMatch(/value=\{formGnv\.pesoNetoPosterior \|\| ''\}/);
    expect(despues).toMatch(/onChange=\{handleGnv\}/);
  });

  it('el combustible DESPUÉS escribe en formGnv, no en el vehículo', () => {
    expect(VEHICULO).toMatch(/name="combustiblePosterior"/);
    expect(VEHICULO).toMatch(/value=\{formGnv\.combustiblePosterior \|\| ''\}/);
  });

  it('la tabla de conversión sólo se pinta en modalidad INICIAL', () => {
    const indice = VEHICULO.indexOf('CARACTERÍSTICAS DE CONVERSIÓN GNV');
    const previo = VEHICULO.lastIndexOf("modalidadCertificado === 'INICIAL'", indice);
    expect(previo).toBeGreaterThan(-1);
    expect(indice - previo).toBeLessThan(200);
  });
});
