import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Botón "Eliminar" en el listado de formatos ("Agregar formato" >
 * "Usar formato existente").
 *
 * Antes sólo había "Asignar": un formato no protegido que quedaba mal no tenía
 * forma de eliminarse desde aquí. Ahora:
 *   - los protegidos muestran sólo "Asignar" (y el backend también los rechaza);
 *   - los no protegidos muestran "Asignar" + "Eliminar", este último con
 *     estilo secundario/peligroso, confirmación previa y refresco del listado.
 *
 * La seguridad NO está aquí: `DELETE /formatos/:id` valida en el backend.
 */
const leer = (...partes: string[]) => readFileSync(resolve(__dirname, ...partes), 'utf8');

const MODAL = leer('Configuracion', 'components', 'FormatoAsignadorModal.tsx');
const API = leer('..', 'services', 'faregas-formatos.api.ts');

const codigo = (t: string) =>
  t.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('el botón Eliminar sólo aparece en formatos no protegidos', () => {
  it('el botón está condicionado a !es_protegido', () => {
    expect(codigo(MODAL)).toMatch(/\{!formato\.es_protegido && \([\s\S]{0,400}?Eliminar[\s\S]{0,80}?\)\}/);
  });

  it('un formato protegido conserva la insignia y no ofrece eliminar', () => {
    expect(MODAL).toMatch(/formato\.es_protegido && <span className="rounded-full bg-orange-100[^"]*">PROTEGIDO/);
  });

  it('el botón es claramente secundario y peligroso', () => {
    // Se aísla el botón Eliminar por su texto y se mira su estilo: rojo, con
    // texto pequeño, y sin ocupar el ancho como el botón principal.
    const ini = MODAL.indexOf('onClick={() => void eliminarFormato(formato)}');
    expect(ini).toBeGreaterThan(-1);
    const ventana = MODAL.slice(Math.max(0, ini - 200), ini + 320);
    expect(ventana).toMatch(/border-red-200/);
    expect(ventana).toMatch(/text-red-600/);
    expect(ventana).toMatch(/text-xs/);
    expect(ventana).not.toMatch(/flex-1/);
  });
});

describe('eliminar pide confirmación y muestra nombre y código', () => {
  it('la confirmación incluye el nombre y el código del formato', () => {
    const ventana = MODAL.slice(
      MODAL.indexOf('window.confirm('),
      MODAL.indexOf('if (!confirmado) return;')
    );
    expect(ventana).toContain('formato.nombre');
    expect(ventana).toContain('C\u00F3digo: ');
    expect(ventana).toContain('formato.codigo');
  });

  it('advierte de que sólo se elimina si no está en uso', () => {
    expect(MODAL).toContain('eliminar\u00E1 el formato si no est\u00E1 siendo utilizado');
  });

  it('si se cancela, no se llama al backend', () => {
    const fn = /const eliminarFormato = async \(formato: Formato\) => \{[\s\S]*?\n  \};/.exec(codigo(MODAL));
    expect(fn).not.toBeNull();
    expect(fn![0]).toMatch(/if \(!confirmado\) return;/);
  });
});

describe('después de eliminar se refresca el listado', () => {
  it('vuelve a pedir los formatos y actualiza el estado', () => {
    const fn = /const eliminarFormato = async \(formato: Formato\) => \{[\s\S]*?\n  \};/.exec(codigo(MODAL));
    expect(fn![0]).toMatch(/await faregasFormatosApi\.eliminarFormato\(formato\.id\)/);
    expect(fn![0]).toMatch(/await cargarFormatos\(\)/);
  });

  it('el borrado es sólo de la lista: no recarga la página', () => {
    const fn = /const eliminarFormato = async \(formato: Formato\) => \{[\s\S]*?\n  \};/.exec(codigo(MODAL));
    expect(fn![0]).not.toMatch(/location\.reload|window\.location/);
    // Y el aviso de éxito se muestra en el propio modal.
    expect(fn![0]).toMatch(/setAviso\('Formato eliminado correctamente\.'\)/);
  });

  it('cargarFormatos reutiliza el mismo filtrado de activos', () => {
    const fn = /const cargarFormatos = async \(\) => \{[\s\S]*?\n  \};/.exec(codigo(MODAL));
    expect(fn).not.toBeNull();
    expect(fn![0]).toMatch(/listarFormatos\(\)/);
    expect(fn![0]).toMatch(/formato\.activo/);
  });

  it('el error del backend se muestra en el modal, no se traga', () => {
    const fn = /const eliminarFormato = async \(formato: Formato\) => \{[\s\S]*?\n  \};/.exec(codigo(MODAL));
    expect(fn![0]).toMatch(/catch \(cause\)/);
    expect(fn![0]).toMatch(/setError\(mensajeError\(cause\)\)/);
    // El mensaje del backend puede traer saltos de línea (lista de operaciones).
    expect(MODAL).toMatch(/whitespace-pre-line/);
  });

  it('hay un aviso de éxito visible en el modal', () => {
    expect(MODAL).toMatch(/aviso && <div className="mb-4 rounded-lg border border-emerald-200/);
  });
});

describe('el modal sólo permite usar un formato existente', () => {
  it('mantiene Asignar y oculta creación y variantes', () => {
    expect(MODAL).toMatch(/>\s*Asignar\s*</);
    expect(MODAL).not.toMatch(/Crear formato dinámico/);
    expect(MODAL).not.toMatch(/Variante de protegido/);
    expect(MODAL).not.toMatch(/Crear variante/);
  });

  it('sólo asigna el formato seleccionado', () => {
    expect(codigo(MODAL)).not.toMatch(/crearFormato\(/);
    expect(codigo(MODAL)).not.toMatch(/crearVarianteFormato\(/);
    expect(codigo(MODAL)).toMatch(/asignarFormato\(servicio\.id, formato\.id\)/);
  });

  it('el filtro por texto y la insignia PROTEGIDO siguen', () => {
    expect(MODAL).toMatch(/Buscar por c\u00F3digo o nombre/);
    expect(MODAL).toMatch(/PROTEGIDO/);
  });
});

describe('la API expone el borrado', () => {
  it('llama a DELETE /formatos/:id', () => {
    const fn = /eliminarFormato: async \(id: number\)[\s\S]*?\n  \},/.exec(API);
    expect(fn).not.toBeNull();
    expect(fn![0]).toMatch(/method: 'DELETE'/);
    expect(fn![0]).toMatch(/`\/formatos\/\$\{id\}`/);
  });

  it('no se toca cambiarEstado ni el resto de la API de formatos', () => {
    expect(API).toMatch(/cambiarEstado: async \(id: number\): Promise<Formato>/);
    expect(API).toMatch(/listarVersiones: async \(formatoId: number\)/);
  });
});
