import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * El modal "Configurar operación" ya no elige la plantilla del certificado.
 *
 * La plantilla se configura después, en el flujo de formatos, porque todos los
 * formatos reales terminan siendo HTML (el Word se convierte a HTML). Estos
 * tests comprueban las tres reglas que sostienen esa decisión:
 *
 *   - el campo no se muestra;
 *   - el modal no lo exige para guardar;
 *   - el modal no lo envía, para que el backend conserve el que ya hubiera.
 *
 * No necesitan base de datos y fallan en cuanto el campo vuelve.
 */
const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');

const MODAL = leer('Configuracion', 'components', 'ServicioModal.tsx');
const PANTALLA = leer('Configuracion', 'components', 'TabCertificadosBase.tsx');

const codigo = (t: string) =>
  t.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('el campo "Formato de impresión" ya no está en el modal', () => {
  it('no hay ninguna etiqueta ni select de formato de impresión', () => {
    expect(MODAL).not.toMatch(/Formato de impresi\u00F3n/);
    expect(codigo(MODAL)).not.toMatch(/Formato de impresi\u00F3n/);
  });

  it('el modal ya no mantiene el estado del formato', () => {
    const fuente = codigo(MODAL);
    expect(fuente).not.toMatch(/formatoId/);
    expect(fuente).not.toMatch(/setFormatoId/);
    // La palabra "formatos" sí aparece en el texto que explica que la
    // plantilla se configura después; lo que no debe existir es el estado.
    expect(fuente).not.toMatch(/useState<Formato\[\]>/);
    expect(fuente).not.toMatch(/setFormatos/);
  });

  it('el modal ya no pide el catálogo de formatos', () => {
    const fuente = codigo(MODAL);
    expect(fuente).not.toMatch(/listarFormatos/);
    expect(fuente).not.toMatch(/faregasFormatosApi/);
  });

  it('el subtítulo ya no promete configurar el formato aquí', () => {
    expect(MODAL).toMatch(/Define el comportamiento y las sedes/);
    expect(MODAL).not.toMatch(/Define el comportamiento, el formato y las sedes/);
  });
});

describe('guardar la operación ya no exige plantilla', () => {
  it('no hay validación que pida el formato', () => {
    expect(codigo(MODAL)).not.toMatch(/if \(generaCertificado && !formatoId\)/);
    expect(MODAL).not.toMatch(/Selecciona el formato real/);
  });

  it('el payload NO incluye formato_id', () => {
    const fuente = codigo(MODAL);
    const ini = fuente.indexOf('const payload');
    const fin = fuente.indexOf('};', ini);
    const payload = fuente.slice(ini, fin === -1 ? undefined : fin);
    expect(payload).not.toMatch(/formato_id/);
  });

  it('explica que la plantilla se asigna después', () => {
    expect(MODAL).toMatch(/La plantilla del certificado se asigna despu\u00E9s, en el flujo de formatos/);
  });
});

describe('las secciones del modal son las pedidas', () => {
  it('1. Identidad de la operación: código técnico y nombre', () => {
    expect(MODAL).toMatch(/1\. Identidad de la operaci\u00F3n/);
    expect(MODAL).toMatch(/C\u00F3digo t\u00E9cnico/);
    expect(MODAL).toMatch(/>Nombre<input required/);
  });

  it('2. Certificado: genera certificado, tipo y vehículo, sin orden visible', () => {
    expect(MODAL).toMatch(/2\. Certificado/);
    expect(MODAL).toMatch(/Genera certificado/);
    expect(MODAL).toMatch(/Tipo de certificado/);
    expect(MODAL).toMatch(/Requiere veh\u00EDculo en planta/);
    expect(MODAL).not.toMatch(/Orden en Nuevo Certificado/);
  });

  it('3. Sedes usa el precio unitario del producto sin pedir otro precio', () => {
    expect(MODAL).toMatch(/3\. Sedes y producto fiscal/);
    expect(MODAL).toMatch(/producto\?\.precio_unitario/);
    expect(MODAL).not.toMatch(/placeholder="Precio"/);
  });
});

describe('el flujo de plantillas sigue disponible fuera del modal', () => {
  it('la pantalla ofrece agregar y editar formato por operación', () => {
    const fuente = codigo(PANTALLA);
    // Quitar el campo del modal NO elimina la forma de configurar la plantilla.
    expect(fuente).toMatch(/setAsignarFormatoServicio\(servicio\)/);
    expect(fuente).toMatch(/setEditarFormato\(\{ id: servicio\.formato_id as number, servicio \}\)/);
    expect(fuente).toMatch(/Agregar formato/);
    expect(fuente).toMatch(/Editar formato/);
  });

  it('sigue mostrando el formato actual de la operación', () => {
    expect(PANTALLA).toMatch(/Formato: \{nombreFormato\(servicio\)\}/);
  });
});
