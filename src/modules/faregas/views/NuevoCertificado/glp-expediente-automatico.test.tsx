import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VehiculoStep } from './components/NuevoCertificado/VehiculoStep';
import { camposObligatoriosVisibles, validarDatosEspecificos } from './faregas-wizard.validation';

const renderGlp = (
  modalidad: 'ANUAL' | 'INICIAL',
  expedienteTecnico = '',
  numeroCertificadoOficial: string | null = null,
) => renderToStaticMarkup(
  <VehiculoStep
    tipoCertificado="GLP_ANUAL"
    modalidadCertificado={modalidad}
    numeroCertificadoOficial={numeroCertificadoOficial}
    formVehiculo={{}}
    setFormVehiculo={() => undefined}
    formPropietario={{}}
    setFormPropietario={() => undefined}
    formGlp={{ expedienteTecnico, componentes: [], verificaciones: [] }}
    setFormGlp={() => undefined}
    formGnv={{}}
    setFormGnv={() => undefined}
    formConformidad={{}}
    setFormConformidad={() => undefined}
    titulares={[]}
    setTitulares={() => undefined}
    formFacturacion={{} as never}
    setFormFacturacion={() => undefined}
    catalogoVerificaciones={{}}
    maestrosVehiculo={{}}
    categoriaVehicular=""
    categoriasVehiculares={[]}
    onCategoriaVehicularChange={() => undefined}
  />
);

describe('expediente técnico automático de GLP ANUAL', () => {
  it('no muestra un input manual ni lo exige para avanzar', () => {
    const html = renderGlp('ANUAL');
    const errores = validarDatosEspecificos({
      tipo: 'GLP_ANUAL',
      modalidad: 'ANUAL',
      gnv: {},
      glp: {},
      conformidad: {},
    });

    expect(html).not.toContain('name="expedienteTecnico"');
    expect(html).toContain('Se asignará automáticamente al emitir');
    expect(errores['glp.expedienteTecnico']).toBeUndefined();
    expect(camposObligatoriosVisibles('GLP_ANUAL', 'ANUAL')).not.toContain('glp.expedienteTecnico');
  });

  it('muestra el número oficial cuando ya está asignado', () => {
    const html = renderGlp('ANUAL', '', 'DG-41-000151');
    expect(html).toContain('DG-41-000151');
    expect(html).not.toContain('name="expedienteTecnico"');
  });

  it('advierte sobre el valor manual conservado de un borrador histórico', () => {
    const html = renderGlp('ANUAL', 'DG-41-0066495');
    expect(html).toContain('Este borrador conserva el valor anterior DG-41-0066495');
    expect(html).toContain('se reemplazará por el número oficial');
  });

  it('GLP INICIAL no muestra un input manual de expediente y se asigna automáticamente al emitir', () => {
    const html = renderGlp('INICIAL');
    const errores = validarDatosEspecificos({
      tipo: 'GLP_ANUAL',
      modalidad: 'INICIAL',
      gnv: {},
      glp: {},
      conformidad: {},
    });

    expect(html).not.toContain('name="expedienteTecnico"');
    expect(html).toContain('Se asignará automáticamente al emitir');
    expect(errores['glp.expedienteTecnico']).toBeUndefined();
    expect(camposObligatoriosVisibles('GLP_ANUAL', 'INICIAL')).not.toContain('glp.expedienteTecnico');
  });
});
