import { describe, expect, it } from 'vitest';
import type { SerieMaestro } from '../services/faregas-series.api';
import { COLUMNAS_SERIES_DMS, mapearSeriesParaExcel } from './faregas-series-exportacion';
import { crearExcelBytes } from './exportar-excel';

describe('exportación del maestro DMS de Series', () => {
  it('conserva exactamente las 14 columnas DMS y su orden', () => {
    expect(COLUMNAS_SERIES_DMS.map((column) => column.header)).toEqual([
      'Nombre', 'Autogenerada', 'Último Número Generado', 'Activo',
      'Tipo de Documento', 'Número', 'Tipo de Documento de Referencia',
      'Código del Local', 'Nombre del Local', 'Teléfono del Local',
      'Correo del Local', 'Dirección Comercial', 'Serie para POS',
      'Serie de Contingencia'
    ]);
  });

  it('exporta E30, ceros a la izquierda, Sí/No y null como celda vacía', () => {
    const row = mapearSeriesParaExcel([{
      id: 1,
      planta_key: '292',
      sede_nombre: 'SANTA ANITA',
      tipo_comprobante: 'FACTURA',
      tipo_documento: '01',
      serie: 'F030',
      numero_dms: 'E30',
      ultimo_numero: 10,
      es_predeterminada: false,
      autogenerada: true,
      contingencia: true,
      activo: true,
      nombre_dms: 'FE',
      codigo_local_dms: '0020',
      nombre_local_dms: 'FAREGAS - SANTA ANITA',
      telefono_local_dms: null,
      correo_local_dms: 'cert_ayllon@faregas.pe',
      direccion_comercial_dms: 'AV. CARRETERA CENTRAL',
      tipo_documento_referencia: null,
      serie_pos: false
    } as SerieMaestro])[0];

    expect(row.numero).toBe('E30');
    expect(row.codigo_local_dms).toBe('0020');
    expect(row.autogenerada).toBe('Sí');
    expect(row.serie_pos).toBe('No');
    expect(row.telefono_local_dms).toBeNull();
  });

  it('genera un styles.xml bien formado y conserva los metadatos DMS en el XLSX', () => {
    const [row] = mapearSeriesParaExcel([{
      id: 1,
      planta_key: '16',
      sede_nombre: 'AREQUIPA',
      tipo_comprobante: 'BOLETA',
      tipo_documento: '03',
      serie: 'B022',
      numero_dms: 'E22',
      ultimo_numero: 52,
      es_predeterminada: false,
      autogenerada: true,
      contingencia: false,
      activo: true,
      nombre_dms: 'BE',
      codigo_local_dms: '0016',
      nombre_local_dms: 'FAREGAS - AREQUIPA',
      telefono_local_dms: '940225290',
      correo_local_dms: 'cert_arequipa@faregas.pe',
      direccion_comercial_dms: 'CENTRO POBLADO SEMIRURAL PACHACUTEC',
      tipo_documento_referencia: null,
      serie_pos: false
    } as SerieMaestro]);
    const contenido = new TextDecoder().decode(
      crearExcelBytes('Series', COLUMNAS_SERIES_DMS, [row])
    );

    expect(contenido).toContain('</fills><borders count="1">');
    expect(contenido).toContain('>0016</t>');
    expect(contenido).toContain('>FAREGAS - AREQUIPA</t>');
    expect(contenido).toContain('>940225290</t>');
    expect(contenido).toContain('>cert_arequipa@faregas.pe</t>');
    expect(contenido).toContain('>CENTRO POBLADO SEMIRURAL PACHACUTEC</t>');
  });
});
