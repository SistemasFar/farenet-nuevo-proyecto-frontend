import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');
const configuracion = leer('Configuracion', 'FaregasConfiguracionView.tsx');
const catalogo = leer('Configuracion', 'components', 'TabCatalogo.tsx');
const sedes = leer('Configuracion', 'TabSedes.tsx');
const series = leer('Configuracion', 'components', 'TabSeries.tsx');
const facturacion = leer('Configuracion', 'components', 'TabFacturacion.tsx');
const tipos = leer('Configuracion', 'components', 'TabCategorias.tsx');

describe('Configuración: nomenclatura alineada con DMS sin cambiar el modelo', () => {
  it('presenta Sedes como equivalencia visual de Categorías DMS', () => {
    expect(configuracion).toContain("label: 'SEDES / CATEGORÍAS DMS'");
    expect(sedes).toContain('Administración de Sedes / Categorías DMS');
    expect(configuracion).toContain("id: 'SEDES'");
    expect(configuracion).toContain("tabVisible === 'SEDES'");
  });

  it('retira Series de Configuración sin tocar el permiso que la controla', () => {
    // Series es un módulo tributario: vive en Facturación electrónica, no en
    // Configuración. Se retira SÓLO la pestaña visual de Configuración.
    expect(configuracion).not.toContain("label: 'SERIES'");
    expect(configuracion).not.toContain("tabVisible === 'SERIES'");
    expect(configuracion).not.toContain('TabSeries');
    // El permiso CONFIGURACION_SERIES se conserva: sigue controlando CORRELATIVOS
    // en Configuración y el módulo de series dentro de Facturación.
    expect(configuracion).toContain('CONFIGURACION_SERIES');
  });

  it('Facturación electrónica muestra UNA sola pantalla de series', () => {
    expect(facturacion).toContain("pestana('SERIES', 'SERIES')");
    expect(facturacion).toContain('<TabSeries />');
    // NO hay barra interna de subpestañas: series es un módulo, no dos.
    expect(facturacion).not.toContain('SERIES NUBEFACT');
    expect(facturacion).not.toContain('MAESTRO DMS');
    expect(facturacion).not.toContain('TabSeriesMaestro');
    expect(facturacion).not.toContain('vistaSeries');
  });

  it('la tabla única reúne Nubefact y DMS con su columna de origen', () => {
    // Una sola tabla, alimentada por el listado del maestro.
    expect(series).toContain('listarMaestro');
    expect(series).toContain('Origen');
    expect(series).toContain('Origen / Ambiente');
    // Las cuatro clasificaciones visibles.
    ['NUBEFACT/DEMO', 'NUBEFACT/PRODUCCION', 'DMS/LEGACY', 'LEGACY/FARENET'].forEach((origen) => {
      expect(series).toContain(origen);
    });
    // Filtros: origen, sede, ambiente, tipo, estado, búsqueda, POS, contingencia.
    expect(series).toContain('setOrigen');
    expect(series).toContain('setSede');
    expect(series).toContain('setAmbiente');
    expect(series).toContain('soloPos');
    expect(series).toContain('soloContingencia');
    // Se muestran las series con su valor real, no sustituidas por la de
    // seriedocumentobase: eso era lo que generaba los duplicados falsos.
    expect(series).not.toContain('serie_operativa');
  });

  it('las acciones dependen del origen de la fila', () => {
    // Editar configuración de Nubefact: sólo filas NUBEFACT.
    expect(series).toContain("serie.proveedor_emision === 'NUBEFACT'");
    expect(series).toContain('EDITAR_NUBEFACT');
    // Detalle del maestro DMS: sólo filas DMS.
    expect(series).toContain('DETALLE_DMS');
    // Confirmar producción: sólo NUBEFACT en el ambiente PRODUCTIVO. Una
    // serie DMS nunca puede llegar a esa acción.
    expect(series).toContain("serie.entorno_emision === 'PRODUCCION'");
  });

  it('el módulo Series no se confunde con Correlativos de certificados', () => {
    expect(configuracion).toContain("label: 'CORRELATIVOS'");
    expect(series).toContain('series DMS y las internas LEGACY son inventario documental');
  });

  it('exporta el Excel DMS desde la pantalla única, con el filtro completo', () => {
    expect(series).toContain('EXPORTAR EXCEL DMS');
    expect(series).toContain('exportarSeriesMaestro');
    // Exporta el resultado del filtro, no las filas visibles.
    expect(series).toContain('const completo = await faregasSeriesApi.listarMaestro(filtros)');
    // El botón de alta crea exclusivamente series NUBEFACT.
    expect(series).toContain('+ NUEVA SERIE NUBEFACT');
  });

  it('permite consultar las series internas no registradas en DMS aparte', () => {
    expect(series).toContain('solo_dms: !incluirInternas');
    expect(series).toContain('Incluir series internas no registradas en DMS');
  });

  it('presenta las categorías funcionales como Tipos de Certificado', () => {
    expect(catalogo).toContain("label: 'TIPOS DE CERTIFICADO'");
    expect(catalogo).toContain("id: 'CATEGORIAS'");
    expect(catalogo).toContain("activeTab === 'CATEGORIAS'");
    expect(tipos).toContain('Administración de Tipos de Certificado');
    expect(tipos).toContain('+ Nuevo Tipo de Certificado');
  });

  it('conserva Productos Fiscales, Tarifas por Sede y Operación y Formatos', () => {
    expect(catalogo).toContain("label: 'PRODUCTOS FISCALES'");
    expect(catalogo).toContain("label: 'OPERACIÓN Y FORMATOS'");
    expect(configuracion).toContain("label: 'TARIFAS POR SEDE'");
  });
});
