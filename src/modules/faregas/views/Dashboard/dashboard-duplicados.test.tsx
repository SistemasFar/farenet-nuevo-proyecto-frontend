import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CertificadosTab } from './components/CertificadosTab';
import { DashboardDuplicadosGrafico } from './components/DashboardDuplicadosGrafico';
import { DashboardDuplicados } from './components/DashboardDuplicados';
import { DashboardSedes } from './components/DashboardSedes';
import type {
  DashboardResumenResponse,
  DuplicadoDetalleItem,
  PaginadoResponse,
  SedeDetalleItem
} from '../../services/faregas-dashboard.api';

const kpi = (actual = 0, delta = 0, porcentaje = 0, tooltip = '') => ({
  actual,
  anterior: 0,
  delta,
  porcentaje,
  tooltip
});

const resumenMock: DashboardResumenResponse = {
  rango: {
    desde: '2026-10-01',
    hasta: '2026-10-21',
    inicioActual: '2026-10-01 00:00:00-05',
    finActual: '2026-10-22 00:00:00-05'
  },
  plantasConsultadas: ['98'],
  kpis: {
    ventaOperativaGenerada: kpi(6875),
    ventaPagada: kpi(6875),
    ventaBruta: kpi(6875),
    ventaNeta: kpi(6875),
    totalCobrado: kpi(8195),
    saldoPendiente: kpi(1620),
    cantidadOperaciones: kpi(56),
    ticketPromedio: kpi(122.77),
    ventaOperativaCertificados: kpi(4975),
    ventaBrutaCertificados: kpi(4975),
    ventaNetaCertificados: kpi(4975),
    ticketPromedioCertificados: kpi(113.07),
    certificadosEmitidos: kpi(44),
    certificadosPendientes: kpi(12),
    certificadosAnulados: kpi(2),
    duplicadosEmitidos: kpi(5),
    ventaDuplicados: kpi(250),
    totalCobradoDuplicados: kpi(250),
    saldoPendienteDuplicados: kpi(0),
    ticketPromedioDuplicados: kpi(50),
    productosVendidos: kpi(10),
    montoDescontado: kpi(0),
    facturasAceptadas: kpi(8),
    boletasAceptadas: kpi(48),
    comprobantesRechazadosOError: kpi(0)
  },
  serieDiaria: [],
  serieCertificados: [],
  serieDuplicados: [{ fecha: '2026-10-20', emitidos: 5 }],
  distribucionCertificados: [
    { tipo: 'GLP', cantidad: 30, emitidos: 28, pendientes: 2, anulados: 0, porcentaje: 63.6, totalSoles: 3100 },
    { tipo: 'GNV', cantidad: 16, emitidos: 16, pendientes: 0, anulados: 0, porcentaje: 36.4, totalSoles: 1875 }
  ],
  distribucionDuplicados: [
    { tipo: 'GLP', cantidad: 4, porcentaje: 80 },
    { tipo: 'GNV', cantidad: 1, porcentaje: 20 },
    { tipo: 'CONFORMIDAD', cantidad: 0, porcentaje: 0 },
    { tipo: 'COMPLEMENTARIOS', cantidad: 0, porcentaje: 0 }
  ],
  distribucionPagos: [],
  alertas: []
};

const duplicadosMock: PaginadoResponse<DuplicadoDetalleItem> = {
  items: [
    {
      id: 6,
      certificadoOriginalId: 618,
      operacionId: 483,
      facturacionId: 698,
      plantaKey: '98',
      plantaNombre: 'SURCO',
      placa: 'ABC123',
      tipoCertificadoClave: 'GLP_ANUAL',
      tipoCertificado: 'GLP',
      tipoNombre: 'Certificado Anual GLP',
      modalidad: 'ANUAL',
      numeroCertificadoOriginal: 'DG-41-012493',
      fechaCertificadoOriginal: '2026-10-20',
      fechaEmisionDuplicado: '2026-10-20T17:02:27.282Z',
      numeroDuplicado: 1,
      importe: 50,
      tipoComprobante: 'BOLETA',
      numeroComprobante: 'BBB1-00000191',
      fechaComprobante: '2026-10-20',
      estado: 'DISPONIBLE',
      estadoFacturacion: 'PENDIENTE_SUNAT',
      solicitadoPor: 'gibarra'
    },
    {
      id: 4,
      certificadoOriginalId: 608,
      operacionId: 480,
      facturacionId: 693,
      plantaKey: '98',
      plantaNombre: 'SURCO',
      placa: 'ABC123',
      tipoCertificadoClave: 'GLP_ANUAL',
      tipoCertificado: 'GLP',
      tipoNombre: 'Certificado Anual GLP',
      modalidad: 'ANUAL',
      numeroCertificadoOriginal: 'DG-41-012488',
      fechaCertificadoOriginal: '2026-10-19',
      fechaEmisionDuplicado: '2026-10-20T16:23:36.446Z',
      numeroDuplicado: 2,
      importe: 50,
      tipoComprobante: 'BOLETA',
      numeroComprobante: 'BBB1-00000189',
      fechaComprobante: '2026-10-20',
      estado: 'DISPONIBLE',
      estadoFacturacion: 'PENDIENTE_SUNAT',
      solicitadoPor: 'gibarra'
    }
  ],
  total: 5,
  pagina: 1,
  limite: 20
};

const sedesMock: SedeDetalleItem[] = [
  {
    plantaKey: '98',
    plantaNombre: 'SURCO',
    cantidadOperaciones: 56,
    ventaOperativa: 6875,
    certificadosEmitidos: 44,
    certificadosPendientes: 12,
    duplicadosEmitidos: 5,
    ventaDuplicados: 250,
    totalCobradoDuplicados: 250,
    saldoPendienteDuplicados: 0,
    ticketPromedioDuplicados: 50,
    totalCobrado: 8195,
    saldoPendiente: 1620,
    ticketPromedio: 122.77
  }
];

describe('FAREGAS Dashboard — Duplicados de Certificados', () => {
  it('renderiza cuatro tarjetas de estado incluyendo Cert. Duplicados con su valor real', () => {
    const html = renderToStaticMarkup(
      <CertificadosTab
        resumen={resumenMock}
        certificados={null}
        duplicados={duplicadosMock}
        sedes={sedesMock}
        cargando={false}
        onSeleccionarTipoCertificado={vi.fn()}
        onSeleccionarTipoDuplicado={vi.fn()}
        paginaCertificados={1}
        paginaDuplicados={1}
        onCambiarPaginaCertificados={vi.fn()}
        onCambiarPaginaDuplicados={vi.fn()}
      />
    );

    expect(html).toContain('Cert. Emitidos');
    expect(html).toContain('Cert. Borrador');
    expect(html).toContain('Cert. Anulados');
    expect(html).toContain('Cert. Duplicados');
    expect(html).toContain('Ingresos por duplicados');
    expect(html).toContain('Venta Duplicados');
    expect(html).toContain('Cobrado Duplicados');
    expect(html).toContain('Saldo Duplicados');
    expect(html).toContain('Ticket Prom. Duplicados');
    expect(html).toContain('S/ 250.00');
    expect(html).toContain('S/ 50.00');
  });

  it('renderiza el gráfico interactivo de Duplicados por Tipo de Certificado y el botón Ver todos al seleccionar', () => {
    const htmlSinFiltro = renderToStaticMarkup(
      <DashboardDuplicadosGrafico
        distribucionDuplicados={resumenMock.distribucionDuplicados || []}
        tipoDuplicadoSeleccionado={undefined}
        onSeleccionarTipoDuplicado={vi.fn()}
      />
    );

    expect(htmlSinFiltro).toContain('Duplicados por Tipo de Certificado');
    expect(htmlSinFiltro).toContain('GLP');
    expect(htmlSinFiltro).toContain('4 (80.0%)');
    expect(htmlSinFiltro).toContain('GNV');
    expect(htmlSinFiltro).toContain('1 (20.0%)');
    expect(htmlSinFiltro).not.toContain('Ver todos');

    const htmlConFiltro = renderToStaticMarkup(
      <DashboardDuplicadosGrafico
        distribucionDuplicados={resumenMock.distribucionDuplicados || []}
        tipoDuplicadoSeleccionado="GLP"
        onSeleccionarTipoDuplicado={vi.fn()}
      />
    );

    expect(htmlConFiltro).toContain('Ver todos');
    expect(htmlConFiltro).toContain('filtrados');
  });

  it('renderiza la tabla detallada de Historial de duplicados emitidos con todas las columnas y ordinales', () => {
    const html = renderToStaticMarkup(
      <DashboardDuplicados
        data={duplicadosMock}
        cargando={false}
        pagina={1}
        onCambiarPagina={vi.fn()}
      />
    );

    expect(html).toContain('Historial de duplicados emitidos');
    expect(html).toContain('Fecha Emisión');
    expect(html).toContain('Sede');
    expect(html).toContain('Placa');
    expect(html).toContain('Certificado Original');
    expect(html).toContain('N.º Duplicado');
    expect(html).toContain('Importe Facturado');
    expect(html).toContain('Comprobante');
    expect(html).toContain('Estado');

    // Filas reales
    expect(html).toContain('SURCO');
    expect(html).toContain('ABC123');
    expect(html).toContain('DG-41-012493');
    expect(html).toContain('DG-41-012488');
    expect(html).toContain('Duplicado #1');
    expect(html).toContain('Duplicado #2');
    expect(html).toContain('S/ 50.00');
    expect(html).toContain('BBB1-00000191');
    expect(html).toContain('BBB1-00000189');
    expect(html).toContain('DISPONIBLE');
  });

  it('muestra columnas de duplicados emitidos, venta y cobro en la tabla de Sedes', () => {
    const html = renderToStaticMarkup(
      <DashboardSedes sedes={sedesMock} cargando={false} />
    );

    expect(html).toContain('Dups. Emitidos');
    expect(html).toContain('Venta Dups.');
    expect(html).toContain('Cobrado Dups.');
    expect(html).toContain('SURCO');
    expect(html).toContain('S/ 250.00');
  });
});
