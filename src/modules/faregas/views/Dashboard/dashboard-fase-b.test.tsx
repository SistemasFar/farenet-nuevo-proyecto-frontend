import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DashboardResumenResponse, PaginadoResponse, ProductoDetalleItem } from '../../services/faregas-dashboard.api';
import { VentasProductosTab } from './components/VentasProductosTab';
import { ResumenGeneralTab } from './components/ResumenGeneralTab';
import { CertificadosTab } from './components/CertificadosTab';
import { DASHBOARD_TAB_CONFIG, resolverPermisosDashboard } from './dashboard-config';

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
  serieDiaria: [{ fecha: '2026-10-16', venta: 10, operaciones: 1 }],
  serieCertificados: [{ fecha: '2026-10-16', total: 3, emitidos: 1, borradores: 1, anulados: 1 }],
  distribucionCertificados: [
    { tipo: 'GLP', cantidad: 10, emitidos: 6, pendientes: 3, anulados: 1, porcentaje: 100, totalSoles: 900 },
    { tipo: 'GNV', cantidad: 0, emitidos: 0, pendientes: 0, anulados: 0, porcentaje: 0, totalSoles: 0 },
    { tipo: 'CONFORMIDAD', cantidad: 0, emitidos: 0, pendientes: 0, anulados: 0, porcentaje: 0, totalSoles: 0 },
    { tipo: 'COMPLEMENTARIOS', cantidad: 0, emitidos: 0, pendientes: 0, anulados: 0, porcentaje: 0, totalSoles: 0 }
  ],
  distribucionPagos: [],
  alertas: [{ tipo: 'SALDO_PENDIENTE', mensaje: 'Saldo por revisar', ordenId: 7, plantaKey: '98', saldo: 15 }]
};

describe('Dashboard FAREGAS — Fase B', () => {
  it('expone exactamente las cuatro pestañas autorizadas', () => {
    expect(DASHBOARD_TAB_CONFIG.map((tab) => tab.label)).toEqual([
      'Resumen General',
      'Ventas y Productos',
      'Certificados',
      'Cobranza y Facturación'
    ]);
  });

  it('mantiene separados los productos que comparten descripción pero tienen distinta clave', () => {
    const productos: PaginadoResponse<ProductoDetalleItem> = {
      items: [
        { sku: '25', descripcion: 'CHIP + PORTA CHIP', unidad: 'NIU', unidadesVendidas: 18, totalSoles: 180, operaciones: 18, precioPromedio: 10 },
        { sku: '2335', descripcion: 'CHIP + PORTA CHIP', unidad: 'NIU', unidadesVendidas: 1, totalSoles: 10, operaciones: 1, precioPromedio: 10 }
      ],
      total: 2,
      pagina: 1,
      limite: 5000
    };
    const html = renderToStaticMarkup(
      <VentasProductosTab resumen={resumen} ventas={productos} sedes={[]} usuarios={[]} cargando={false} />
    );

    expect(html).toContain('data-producto-sku="25"');
    expect(html).toContain('data-producto-sku="2335"');
    expect(html.match(/CHIP \+ PORTA CHIP/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('muestra fórmulas comprensibles y usa alertas del contrato real del backend', () => {
    const html = renderToStaticMarkup(<ResumenGeneralTab resumen={resumen} sedes={[]} cargando={false} />);
    expect(html).toContain('Suma del importe total de esas operaciones.');
    expect(html).toContain('Auditoría analítica (1)');
    expect(html).toContain('Saldo por revisar');
  });

  it('consume el porcentaje calculado y los tres estados de certificados', () => {
    const html = renderToStaticMarkup(
      <CertificadosTab
        resumen={resumen}
        certificados={null}
        sedes={[]}
        cargando={false}
        pagina={1}
        onCambiarPagina={() => undefined}
        onSeleccionarTipoCertificado={() => undefined}
      />
    );
    expect(html).toContain('GLP');
    expect(html).toContain('GNV');
    expect(html).toContain('CONFORMIDAD');
    expect(html).toContain('COMPLEMENTARIOS');
    expect(html).toContain('Tipos de Certificado Vendidos');
    expect(html).toContain('6 (100.0%)');
    expect(html).toContain('Borradores:');
    expect(html).toContain('Anulados:');
    expect(html).toContain('Evolución de Certificados');
    expect(html).toContain('Ventas de certificados');
    expect(html).toContain('Venta Operativa Cert.');
    expect(html).toContain('Venta Bruta Cert.');
    expect(html).toContain('Venta Neta Cert.');
    expect(html).toContain('no incluyen chips, papeles ni otros productos');
    expect(html).toContain('Selecciona un tipo para actualizar los indicadores');
    expect(html).toContain('data-tipo-certificado="GLP"');
  });

  it('incluye explicaciones de Venta Bruta y Venta Neta visibles al pasar el mouse', () => {
    const html = renderToStaticMarkup(
      <VentasProductosTab resumen={resumen} ventas={null} sedes={[]} usuarios={[]} cargando={false} />
    );
    expect(html).toContain('Es el valor de las ventas antes de descontar los beneficios comerciales');
    expect(html).toContain('Es la venta final después de considerar las notas de crédito y débito aceptadas');
    expect(html).toContain('group-hover/kpi:visible');
  });

  it('resalta el tipo de certificado seleccionado y permite volver a todos', () => {
    const html = renderToStaticMarkup(
      <CertificadosTab
        resumen={resumen}
        certificados={null}
        sedes={[]}
        cargando={false}
        tipoCertificadoSeleccionado="GLP"
        pagina={1}
        onCambiarPagina={() => undefined}
        onSeleccionarTipoCertificado={() => undefined}
      />
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Ver todos');
    expect(html).toContain('filtrados');
  });

  it('respeta permisos de alcance global y exportación', () => {
    expect(resolverPermisosDashboard([], 'OPERADOR')).toEqual({ puedeVerGlobal: false, puedeExportar: false });
    expect(resolverPermisosDashboard(['DASHBOARD_GLOBAL'], 'OPERADOR')).toEqual({ puedeVerGlobal: true, puedeExportar: false });
    expect(resolverPermisosDashboard(['DASHBOARD_EXPORTAR'], 'OPERADOR')).toEqual({ puedeVerGlobal: false, puedeExportar: true });
    expect(resolverPermisosDashboard([], 'SISTEMAS')).toEqual({ puedeVerGlobal: true, puedeExportar: true });
  });
});
