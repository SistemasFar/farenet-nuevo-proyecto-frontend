import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');
const configuracion = leer('Configuracion', 'FaregasConfiguracionView.tsx');
const catalogo = leer('Configuracion', 'components', 'TabCatalogo.tsx');
const sedes = leer('Configuracion', 'TabSedes.tsx');
const tipos = leer('Configuracion', 'components', 'TabCategorias.tsx');

describe('Configuración: nomenclatura alineada con DMS sin cambiar el modelo', () => {
  it('presenta Sedes como equivalencia visual de Categorías DMS', () => {
    expect(configuracion).toContain("label: 'SEDES / CATEGORÍAS DMS'");
    expect(sedes).toContain('Administración de Sedes / Categorías DMS');
    expect(configuracion).toContain("id: 'SEDES'");
    expect(configuracion).toContain("tabVisible === 'SEDES'");
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
