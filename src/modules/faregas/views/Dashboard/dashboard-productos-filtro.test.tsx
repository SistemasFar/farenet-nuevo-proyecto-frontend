import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DashboardResumenResponse } from '../../services/faregas-dashboard.api';
import { VentasProductosTab } from './components/VentasProductosTab';

const kpi = { actual: 10, anterior: 8, delta: 2, porcentaje: 25, tooltip: '' };

const resumen: DashboardResumenResponse = {
  rango: { desde: '2026-10-01', hasta: '2026-10-16', inicioActual: '', finActual: '' },
  plantasConsultadas: ['98'],
  kpis: {
    ventaOperativaGenerada: kpi,
    ventaPagada: kpi,
    ventaBruta: kpi,
    ventaNeta: kpi,
    totalCobrado: kpi,
    saldoPendiente: kpi,
    cantidadOperaciones: kpi,
    ticketPromedio: kpi,
    ventaOperativaCertificados: kpi,
    ventaBrutaCertificados: kpi,
    ventaNetaCertificados: kpi,
    ticketPromedioCertificados: kpi,
    certificadosEmitidos: kpi,
    certificadosPendientes: kpi,
    certificadosAnulados: kpi,
    productosVendidos: kpi,
    montoDescontado: kpi,
    facturasAceptadas: kpi,
    boletasAceptadas: kpi,
    comprobantesRechazadosOError: kpi
  },
  serieDiaria: [{ fecha: '2026-10-16', venta: 180, operaciones: 1 }],
  serieCertificados: [],
  distribucionCertificados: [],
  distribucionProductos: [
    { id: 25, sku: 'CHIP-SURCO', descripcion: 'CHIP + PORTA CHIP', unidad: 'NIU', unidadesVendidas: 6, totalSoles: 1080, operaciones: 6, precioPromedio: 180 },
    { id: 2335, sku: 'CHIP-COLINA', descripcion: 'CHIP + PORTA CHIP', unidad: 'NIU', unidadesVendidas: 1, totalSoles: 180, operaciones: 1, precioPromedio: 180 }
  ],
  distribucionPagos: []
};

describe('Dashboard FAREGAS — Filtro de Productos Vendidos', () => {
  it('renderiza el componente de Productos Vendidos sin botón Ver todos cuando no hay filtro', () => {
    const html = renderToStaticMarkup(
      <VentasProductosTab
        resumen={resumen}
        ventas={null}
        sedes={[]}
        usuarios={[]}
        cargando={false}
      />
    );

    expect(html).toContain('Productos Vendidos');
    expect(html).toContain('data-producto-id="25"');
    expect(html).toContain('data-producto-id="2335"');
    expect(html).not.toContain('Ver todos');
  });

  it('muestra botón Ver todos y resalta el producto seleccionado cuando productoIdSeleccionado está activo', () => {
    const html = renderToStaticMarkup(
      <VentasProductosTab
        resumen={resumen}
        ventas={null}
        sedes={[]}
        usuarios={[]}
        cargando={false}
        productoIdSeleccionado={25}
        onSeleccionarProducto={() => undefined}
      />
    );

    expect(html).toContain('Ver todos');
    expect(html).toContain('data-producto-id="25"');
    expect(html).toContain('border-blue-500 bg-blue-50 ring-1 ring-blue-200');
    expect(html).toContain('data-producto-id="2335"');
  });

  it('permite alternar la selección y distingue productos con mismo nombre y diferente ID', () => {
    const html = renderToStaticMarkup(
      <VentasProductosTab
        resumen={resumen}
        ventas={null}
        sedes={[]}
        usuarios={[]}
        cargando={false}
        productoIdSeleccionado={2335}
        onSeleccionarProducto={() => undefined}
      />
    );

    expect(html).toContain('data-producto-id="2335"');
    expect(html).toContain('border-blue-500 bg-blue-50 ring-1 ring-blue-200');
  });
});
