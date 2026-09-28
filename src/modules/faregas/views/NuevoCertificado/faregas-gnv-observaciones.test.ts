import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VISTA = readFileSync(
  resolve(__dirname, 'NuevoCertificadoView.tsx'),
  'utf8'
);

/**
 * El campo "OBSERVACIONES GNV" del formulario.
 *
 * Antes el dato se escribía en pantalla pero no se guardaba: el payload de
 * guardarGnv no lo incluía y la hidratación del borrador tampoco lo leía, así
 * que la previsualización recibía el campo vacío. Estos tests fijan las dos
 * puntas de la cadena para que no vuelva a romperse.
 */
describe('campo OBSERVACIONES GNV: envío al backend', () => {
  it('guardarPasoVehiculo incluye observaciones en el payload de guardarGnv', () => {
    const bloque = VISTA.slice(
      VISTA.indexOf('const guardarPasoVehiculo'),
      VISTA.indexOf('} else if (formCaja.tipoCertificado === \'GLP_ANUAL\')')
    );
    expect(bloque).toContain('faregasCertificadosApi.guardarGnv(');
    expect(bloque).toMatch(/observaciones:\s*formGnv\.observaciones/);
  });

  it('el valor viaja como texto y no se transforma en el envío', () => {
    // El recorte y el trim los hace el backend, que es la autoridad del dato.
    const bloque = VISTA.slice(
      VISTA.indexOf('const guardarPasoVehiculo'),
      VISTA.indexOf("} else if (formCaja.tipoCertificado === 'GLP_ANUAL')")
    );
    const linea = bloque.split('\n').find((l) => l.includes('observaciones:'));
    expect(linea).toMatch(/observaciones:\s*formGnv\.observaciones\s*\|\|\s*null/);
    expect(linea).not.toMatch(/toUpperCase|toLowerCase|slice\(/);
  });
});

describe('campo OBSERVACIONES GNV: hidratación del borrador', () => {
  it('al abrir un borrador, el valor persistido se carga en el estado', () => {
    const bloque = VISTA.slice(
      VISTA.indexOf("if (res.data.tipo?.clave === 'GNV_ANUAL')"),
      VISTA.indexOf("} else if (res.data.tipo?.clave === 'GLP_ANUAL')")
    );
    expect(bloque).toMatch(/observaciones:\s*gnv\.observaciones\s*\|\|\s*''/);
  });

  it('la rehidratación por autosave no borra lo ya escrito', () => {
    const bloque = VISTA.slice(
      VISTA.indexOf('if (response.data.gnvFaregas)'),
      VISTA.indexOf('if (response.data.conformidadFaregas)')
    );
    const linea = bloque.split('\n').find((l) => l.includes('observaciones:'));
    expect(linea).toBeTruthy();
    // Si el backend devuelve NULL se conserva lo que el operador escribió.
    expect(linea).toMatch(/prev\.observaciones/);
  });
});

describe('el campo sigue siendo opcional', () => {
  it('no aparece en los conjuntos de campos obligatorios del wizard', () => {
    const validacion = readFileSync(
      resolve(__dirname, 'faregas-wizard.validation.ts'),
      'utf8'
    );
    const conjuntos = validacion
      .slice(validacion.indexOf('CAMPOS_VISIBLES_COMUNES'))
      .match(/CAMPOS_VISIBLES_\w+\s*=\s*\[[^\]]*\]/g)
      ?.join('') ?? '';
    expect(conjuntos).not.toContain('gnv.observaciones');
  });

  it('la etiqueta del formulario lo declara opcional', () => {
    const vehiculo = readFileSync(
      resolve(__dirname, 'components', 'NuevoCertificado', 'VehiculoStep.tsx'),
      'utf8'
    );
    expect(vehiculo).toContain('OBSERVACIONES GNV (Opcional)');
  });
});
