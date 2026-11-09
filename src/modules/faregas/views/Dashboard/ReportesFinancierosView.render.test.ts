import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('ReportesFinancierosView sin referencias rotas', () => {
  const src = fs.readFileSync(path.resolve(__dirname, 'ReportesFinancierosView.tsx'), 'utf8');
  it('tipoExportacion está declarado', () => {
    expect(src).toContain('useState<');
    expect(src.match(/tipoExportacion/g)?.length).toBeGreaterThan(1);
  });
  it('no referencia funciones eliminadas', () => {
    expect(src).not.toContain('descargarConsolidado');
    expect(src).not.toContain('descargarVentaMensual');
    expect(src).not.toContain('descargarRegistroTributario');
    expect(src).not.toContain('exportarReporteVentaMensual');
    expect(src).not.toContain('exportarRegistroVentasTributario');
    expect(src).not.toContain('obtenerRegistroVentasTributario');
  });
  it('selector con 3 reportes', () => {
    expect(src).toContain("id: 'documentos'");
    expect(src).toContain("id: 'resumen'");
    expect(src).toContain("id: 'dashboard'");
    expect(src).not.toContain("id: 'tributario'");
    expect(src).not.toContain("id: 'venta-mensual'");
    expect(src).not.toContain("id: 'consolidado'");
  });
});
