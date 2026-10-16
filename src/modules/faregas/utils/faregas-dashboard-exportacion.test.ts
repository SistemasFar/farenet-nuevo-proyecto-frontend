import { describe, expect, it } from 'vitest';
import type { DashboardExportacionResponse } from '../services/faregas-dashboard.api';
import { construirHojasDashboard } from './faregas-dashboard-exportacion';
import { crearExcelVariasHojasBytes } from './exportar-excel';

const kpi = { actual: 1, anterior: 0, delta: 1, porcentaje: 100, tooltip: '' };

const reporte: DashboardExportacionResponse = {
  metadatos: {
    rango: '2026-10-01 a 2026-10-16',
    fechaGeneracion: '2026-10-16T12:00:00.000Z',
    usuarioExportador: 'SISTEMAS',
    sedesIncluidas: '98'
  },
  hojas: {
    resumen: {
      rango: { desde: '2026-10-01', hasta: '2026-10-16', inicioActual: '', finActual: '' },
      plantasConsultadas: ['98'],
      kpis: {
        ventaOperativaGenerada: kpi, ventaPagada: kpi, ventaBruta: kpi, ventaNeta: kpi,
        totalCobrado: kpi, saldoPendiente: kpi, cantidadOperaciones: kpi, ticketPromedio: kpi,
        certificadosEmitidos: kpi, certificadosPendientes: kpi, certificadosAnulados: kpi, productosVendidos: kpi,
        montoDescontado: kpi, facturasAceptadas: kpi, boletasAceptadas: kpi,
        comprobantesRechazadosOError: kpi
      },
      serieDiaria: [], serieCertificados: [], distribucionCertificados: [], distribucionPagos: [], alertas: []
    },
    sedes: [], certificados: [], ventasProductos: [], comprobantes: [], pagos: [], descuentos: [], usuarios: []
  }
};

describe('exportación del dashboard', () => {
  it('construye las ocho hojas con columnas compatibles con el generador XLSX', () => {
    const hojas = construirHojasDashboard(reporte);
    expect(hojas).toHaveLength(8);
    expect(hojas.map((hoja) => hoja.name)).toEqual([
      'Resumen Ejecutivo', 'Sedes', 'Certificados', 'Ventas por Producto',
      'Comprobantes Fiscales', 'Cobranzas y Pagos', 'Descuentos Aplicados', 'Productividad Usuarios'
    ]);
    expect(hojas.every((hoja) => Array.isArray(hoja.columns) && hoja.columns.length > 0)).toBe(true);
    expect(hojas[0].rows).toHaveLength(20);
    const archivo = crearExcelVariasHojasBytes(hojas);
    expect(archivo.byteLength).toBeGreaterThan(1000);
    expect(Array.from(archivo.slice(0, 2))).toEqual([0x50, 0x4b]);
  });
});
