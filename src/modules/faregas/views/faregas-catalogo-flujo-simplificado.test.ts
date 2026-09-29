/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');
const PRODUCTOS = leer('Configuracion', 'components', 'TabProductos.tsx');
const OPERACION = leer('Configuracion', 'components', 'ServicioModal.tsx');
const FORMATOS = leer('Configuracion', 'components', 'FormatoAsignadorModal.tsx');

const modalProducto = PRODUCTOS.slice(PRODUCTOS.indexOf('{modal &&'));

describe('Nuevo producto fiscal simplificado', () => {
  it('conserva únicamente los campos comerciales solicitados', () => {
    ['Código SKU', 'Categoría', 'Nombre del certificado', 'Precio unitario', 'Es para venta', 'Activo', 'Agregar chip', 'Tipo de chip']
      .forEach((texto) => expect(modalProducto).toContain(texto));
  });

  it('oculta los campos tributarios avanzados y el monto duplicado del chip', () => {
    ['Unidad tributaria', 'Tipo afectación IGV', 'Código producto SUNAT', 'Cuenta por Cobrar', 'Disponible POS', 'Es para compra', 'Tiene ICBPER', 'Monto del chip']
      .forEach((texto) => expect(modalProducto).not.toContain(texto));
  });

  it('los defaults de creación mantienen venta, activo, NIU e IGV 10', () => {
    expect(PRODUCTOS).toMatch(/unidad: 'NIU'/);
    expect(PRODUCTOS).toMatch(/tipo_afectacion_igv: '10'/);
    expect(PRODUCTOS).toMatch(/es_para_venta: true/);
    expect(PRODUCTOS).toMatch(/activo: true/);
  });
});

describe('Configurar operación simplificado', () => {
  it('no muestra orden ni un precio editable por sede', () => {
    expect(OPERACION).not.toContain('Orden en Nuevo Certificado');
    expect(OPERACION).not.toContain('placeholder="Precio"');
  });

  it('guarda la tarifa usando precio_unitario del producto fiscal', () => {
    expect(OPERACION).toMatch(/precio: Number\(producto\?\.precio_unitario\)/);
  });
});

describe('Agregar formato simplificado', () => {
  it('sólo muestra usar formato existente', () => {
    expect(FORMATOS).toContain('Usar formato existente');
    expect(FORMATOS).not.toContain('Crear formato dinámico');
    expect(FORMATOS).not.toContain('Variante de protegido');
  });
});
