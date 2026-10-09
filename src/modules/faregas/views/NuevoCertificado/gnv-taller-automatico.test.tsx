import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VehiculoStep } from './components/NuevoCertificado/VehiculoStep';
import { alternarIncumplimientoGnv, marcarTodasVerificacionesGnvComoCumple } from './gnv-verificaciones';
import { validarDatosEspecificos, validarFormularioVehiculoVisible } from './faregas-wizard.validation';
import { combustiblesGnvSonEquivalentes, combustiblesSonEquivalentes, pesosGnvSonIguales } from './gnv-conversion';

const renderGnv = (
  modalidad: 'INICIAL' | 'ANUAL',
  formVehiculo: Record<string, unknown> = {},
  formGnv: Record<string, unknown> = {}
) => renderToStaticMarkup(
  <VehiculoStep
    tipoCertificado="GNV_ANUAL"
    modalidadCertificado={modalidad}
    formVehiculo={formVehiculo}
    setFormVehiculo={() => undefined}
    formPropietario={{}}
    setFormPropietario={() => undefined}
    formGlp={{}}
    setFormGlp={() => undefined}
    formGnv={{
      fechaVigencia: '',
      verificaciones: Array.from({ length: 8 }, (_, indice) => ({
        codigo: String.fromCharCode(97 + indice),
        descripcion: `Punto ${indice + 1}`,
        cumple: null,
        observacion: ''
      })),
      ...formGnv
    }}
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

describe('taller GNV automático por sede', () => {
  it.each(['INICIAL', 'ANUAL'] as const)('GNV %s no muestra selector ni mensaje de taller autorizado', (modalidad) => {
    const html = renderGnv(modalidad);
    expect(html).not.toContain('TALLER AUTORIZADO');
    expect(html).not.toContain('tallerAutorizadoId');
    expect(html).toContain('VIGENCIA HASTA');
    expect(html.match(/MARCAR LOS 8 COMO CUMPLE/g)).toHaveLength(1);
    expect(html).not.toContain('gnv-verif-');
  });

  it.each(['INICIAL', 'ANUAL'] as const)('GNV %s no depende de una selección manual para validar', () => {
    const errores = validarDatosEspecificos({
      tipo: 'GNV_ANUAL',
      gnv: {
        fechaVigencia: '2027-10-06',
        verificaciones: Array.from({ length: 8 }, (_, indice) => ({ codigo: String(indice), cumple: true }))
      },
      glp: {},
      conformidad: {}
    });
    expect(errores['gnv.tallerAutorizadoId']).toBeUndefined();
    expect(Object.keys(errores)).toHaveLength(0);
  });

  it('las validaciones de GLP y Conformidad permanecen activas', () => {
    const erroresGlp = validarDatosEspecificos({ tipo: 'GLP_ANUAL', gnv: {}, glp: {}, conformidad: {} });
    const erroresConformidad = validarDatosEspecificos({ tipo: 'CONFORMIDAD', gnv: {}, glp: {}, conformidad: {} });
    expect(erroresGlp['glp.fechaVigencia']).toBeDefined();
    expect(erroresGlp['glp.expedienteTecnico']).toBeDefined();
    expect(erroresConformidad['conformidad.tipoConformidad']).toBeDefined();
  });

  it('una sola acción marca los ocho puntos como cumple', () => {
    const pendientes = Array.from({ length: 8 }, (_, indice) => ({ codigo: String(indice), cumple: null, observacion: 'PENDIENTE' }));
    const resultado = marcarTodasVerificacionesGnvComoCumple(pendientes);
    expect(resultado).toHaveLength(8);
    expect(resultado.every((item) => item.cumple === true && item.observacion === '')).toBe(true);
  });

  it('al reportar una excepción sólo ese punto queda como no cumple', () => {
    const pendientes = Array.from({ length: 8 }, (_, indice) => ({ codigo: String(indice), cumple: null, observacion: '' }));
    const resultado = alternarIncumplimientoGnv(pendientes, 3);
    expect(resultado[3].cumple).toBe(false);
    expect(resultado.filter((item) => item.cumple === true)).toHaveLength(7);
    expect(alternarIncumplimientoGnv(resultado, 3).every((item) => item.cumple === true)).toBe(true);
  });

  it('reconoce como iguales combustibles escritos con separadores distintos', () => {
    expect(combustiblesGnvSonEquivalentes('BI COMBUSTIBLE/GNV', 'BI - COMBUSTIBLE GNV')).toBe(true);
    expect(combustiblesGnvSonEquivalentes('GASOLINA', 'BI - COMBUSTIBLE GNV')).toBe(false);
  });

  it('reconoce como equivalentes las variantes escritas de BI-COMBUSTIBLE GLP', () => {
    expect(combustiblesSonEquivalentes('BI COMBUSTIBLE/GLP', 'BI-COMBUSTIBLE GLP')).toBe(true);
    expect(combustiblesSonEquivalentes('GASOLINA', 'BI-COMBUSTIBLE GLP')).toBe(false);
  });

  it('reconoce el mismo peso aunque tenga distinta cantidad de decimales', () => {
    expect(pesosGnvSonIguales('1301.000', '1301')).toBe(true);
    expect(pesosGnvSonIguales('1301', '1450')).toBe(false);
  });

  it('muestra la conversión como Antes y Después con una alerta inmediata', () => {
    const html = renderGnv(
      'INICIAL',
      { combustible: 'BI COMBUSTIBLE/GNV', pesoNeto: '1301.000' },
      { combustiblePosterior: 'BI - COMBUSTIBLE GNV', pesoNetoPosterior: '1301' }
    );
    expect(html).toContain('1. ANTES DE LA CONVERSIÓN');
    expect(html).toContain('2. DESPUÉS DE LA CONVERSIÓN');
    expect(html).toContain('El resultado no puede ser el mismo combustible original.');
    expect(html).toContain('El nuevo peso no puede ser igual al peso original.');
  });

  it('bloquea el avance cuando la conversión GNV no cambia combustible o peso', () => {
    const errores = validarFormularioVehiculoVisible({
      tipoCertificado: 'GNV_ANUAL',
      modalidad: 'INICIAL',
      caja: { categoria: 'M1' },
      vehiculo: { combustible: 'BI COMBUSTIBLE/GNV', pesoNeto: '1301.000' },
      titulares: [],
      gnv: {
        fechaVigencia: '2027-10-06',
        combustiblePosterior: 'BI - COMBUSTIBLE GNV',
        pesoNetoPosterior: '1301'
      },
      glp: {},
      conformidad: {},
      facturacion: {}
    });
    expect(errores['gnv.combustiblePosterior']).toContain('diferente');
    expect(errores['gnv.pesoNetoPosterior']).toContain('diferente');
  });

  it('bloquea GLP inicial cuando el combustible original ya es BI-COMBUSTIBLE GLP', () => {
    const errores = validarFormularioVehiculoVisible({
      tipoCertificado: 'GLP_ANUAL',
      modalidad: 'INICIAL',
      caja: {},
      vehiculo: { combustible: 'BI COMBUSTIBLE/GLP' },
      titulares: [],
      gnv: {},
      glp: {},
      conformidad: {},
      facturacion: {}
    });

    expect(errores.combustible).toContain('diferente');
  });

  it('GLP inicial acepta un combustible original distinto al resultado', () => {
    const errores = validarFormularioVehiculoVisible({
      tipoCertificado: 'GLP_ANUAL',
      modalidad: 'INICIAL',
      caja: {},
      vehiculo: { combustible: 'GASOLINA' },
      titulares: [],
      gnv: {},
      glp: {},
      conformidad: {},
      facturacion: {}
    });

    expect(errores.combustible).toBeUndefined();
  });

  it('bloquea GLP si cualquier dato visible del cilindro o regulador está incompleto', () => {
    const errores = validarFormularioVehiculoVisible({
      tipoCertificado: 'GLP_ANUAL',
      modalidad: 'ANUAL',
      caja: {},
      vehiculo: {},
      titulares: [],
      gnv: {},
      glp: {
        tallerAutorizadoId: '12',
        fechaVigencia: '2027-10-09',
        expedienteTecnico: 'EXP-1',
        verificaciones: Array.from({ length: 7 }, (_, indice) => ({ codigo: String(indice), cumple: true })),
        componentes: [
          { componente: 'CILINDRO', marca: 'FABRICANTE', modelo: '', capacidadLitros: '111', mesFabricacion: '12', anioFabricacion: '2025', numeroSerie: 'SER-1' },
          { componente: 'REGULADOR', marca: 'FABRICANTE', modelo: 'REG-1', numeroSerie: '' },
        ],
      },
      conformidad: {},
      facturacion: {},
    });

    expect(errores['glp.componentes.CILINDRO.modelo']).toBeDefined();
    expect(errores['glp.componentes.REGULADOR.numeroSerie']).toBeDefined();
  });

  it('bloquea GNV inicial si falta cualquier dato de los componentes instalados', () => {
    const errores = validarFormularioVehiculoVisible({
      tipoCertificado: 'GNV_ANUAL',
      modalidad: 'INICIAL',
      caja: {},
      vehiculo: { combustible: 'GASOLINA', pesoNeto: '1301' },
      titulares: [],
      gnv: {
        fechaVigencia: '2027-10-09',
        combustiblePosterior: 'BI - COMBUSTIBLE GNV',
        pesoNetoPosterior: '1450',
        verificaciones: Array.from({ length: 8 }, (_, indice) => ({ codigo: String(indice), cumple: true })),
        componentes: [
          { componente: 'REDUCTOR', marca: '', numeroSerie: 'RED-1', capacidadLitros: 'NO APLICA', mesFabricacion: '10', anioFabricacion: '2025' },
          { componente: 'CILINDRO', marca: 'FABRICANTE', numeroSerie: 'CIL-1', capacidadLitros: '80', mesFabricacion: '', anioFabricacion: '' },
        ],
      },
      glp: {},
      conformidad: {},
      facturacion: {},
    });

    expect(errores['gnv.componentes.REDUCTOR.marca']).toBeDefined();
    expect(errores['gnv.componentes.CILINDRO.fechaFabricacion']).toBeDefined();
  });
});
