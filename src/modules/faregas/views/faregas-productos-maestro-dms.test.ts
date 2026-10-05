import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const leer = (...partes: string[]) => fs.readFileSync(path.join(__dirname, ...partes), 'utf8');
const VISTA = leer('Configuracion', 'components', 'TabProductos.tsx');
const API = leer('..', 'services', 'faregas-productos.api.ts');
const VINCULACION = leer('..', 'utils', 'faregas-productos-vinculacion.ts');

describe('Productos fiscales alineados al maestro DMS', () => {
  it('muestra una tabla agrupada y las sedes funcionales vinculadas', () => {
    expect(VISTA).toContain('Sedes vinculadas');
    expect(VISTA).not.toContain('Sede / Categoría DMS');
    expect(VISTA).toContain('Datos fiscales');
    expect(VISTA).toContain('Datos comerciales');
    expect(VISTA).toContain('Flags');
    expect(VISTA).toContain('Uso operativo');
    expect(VISTA).not.toContain('>Sedes activas<');
  });

  it('deriva las sedes desde las relaciones de tarifas y no edita categoria_dms', () => {
    expect(VISTA).toContain('sedesPorServicio');
    expect(VINCULACION).toContain('tarifa.producto_facturacion_id');
    expect(VINCULACION).not.toMatch(/categoria_dms\s*[=.]/);
    expect(VISTA).not.toMatch(/setActual\([^\n]+categoria_dms/);
    expect(VISTA).not.toContain('sede_id');
  });

  it('restaura en Nuevo/Editar todos los campos comerciales y fiscales', () => {
    for (const etiqueta of [
      'Unidad',
      'Cuenta por cobrar',
      'Código clasificación SUNAT',
      'Tipo de afectación IGV',
      'Código afectación ISC',
      '% ISC',
      'Precio unitario',
      'Precio de venta unitario',
      'Valor referencial unitario',
      'Disponible en POS',
      'Es para venta',
      'Es para compra',
      'Tiene ICBPER',
      'URL de imagen'
    ]) expect(VISTA).toContain(etiqueta);
  });

  it('el contrato API incluye sólo los campos nuevos faltantes', () => {
    expect(API).toContain('codigo_barras?: string | null');
    expect(API).toContain('codigo_afectacion_isc?: string | null');
    expect(API).toContain('imagen_url?: string | null');
    expect(API).not.toContain('sede_id');
    expect(API).not.toContain('precio_venta_unitario');
  });

  it('mantiene SKU distintos como filas identificadas por id', () => {
    expect(VISTA).toContain('<tr key={producto.id}');
    expect(VISTA).toContain('{producto.codigo_sku}');
  });
});
