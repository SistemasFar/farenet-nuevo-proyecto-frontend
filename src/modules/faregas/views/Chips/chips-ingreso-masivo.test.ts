import { describe, expect, it } from 'vitest';
import { extraerCodigosDeHoja, generarCodigosPorRango, parseChipScan } from './chips-ingreso-masivo';

describe('ingreso masivo de chips', () => {
  it('extrae la columna de códigos de un Excel con cabecera', () => {
    expect(extraerCodigosDeHoja([
      ['Descripción', 'Código del chip', 'Cantidad'],
      ['Kit 1', 'chip001', 1],
      ['Kit 2', 'CHIP002', 1]
    ])).toEqual(['CHIP001', 'CHIP002']);
  });

  it('usa la primera columna cuando la hoja no tiene cabecera', () => {
    expect(extraerCodigosDeHoja([['chip010'], ['chip011']])).toEqual(['CHIP010', 'CHIP011']);
  });

  it('genera un rango consecutivo respetando los ceros', () => {
    expect(generarCodigosPorRango({ prefijo: 'CHIP', desde: 1, hasta: 3, digitos: 3 }))
      .toEqual(['CHIP001', 'CHIP002', 'CHIP003']);
  });

  it('rechaza rangos invertidos o mayores a 1000 unidades', () => {
    expect(() => generarCodigosPorRango({ prefijo: 'CHIP', desde: 5, hasta: 1, digitos: 3 })).toThrow();
    expect(() => generarCodigosPorRango({ prefijo: 'CHIP', desde: 1, hasta: 1001, digitos: 4 })).toThrow(/1000/);
  });

  it('mantiene la validación de lecturas duplicadas e inválidas', () => {
    expect(parseChipScan('chip001\nCHIP001\nCODIGO CON ESPACIO')).toEqual({
      validos: ['CHIP001'],
      duplicados: ['CHIP001'],
      errores: ['CODIGO CON ESPACIO']
    });
  });
});
