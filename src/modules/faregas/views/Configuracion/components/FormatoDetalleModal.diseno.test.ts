import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fuente = readFileSync(new URL('./FormatoDetalleModal.tsx', import.meta.url), 'utf8');

describe('acceso al diseñador existente', () => {
  it('elimina el acceso superior de certificado protegido', () => {
    expect(fuente).not.toContain('Editar certificado protegido');
    expect(fuente).not.toContain('PlantillaSistemaEditor');
  });

  it('mantiene Ver diseño para HTML_DINAMICO y lo ofrece a GLP_INICIAL SISTEMA', () => {
    expect(fuente).toContain("version.motor === 'HTML_DINAMICO'");
    expect(fuente).toContain("formato.codigo === 'GLP_INICIAL' && version.motor === 'SISTEMA'");
    expect(fuente).toContain('Ver diseño');
    expect(fuente).toContain('FormatoHtmlVariablesEditor');
  });

  it('abre la versión SISTEMA solamente con el render real y en solo lectura', () => {
    expect(fuente).toContain('previsualizarDisenoSistema');
    expect(fuente).toContain('editorSistemaSoloLectura');
    expect(fuente).toContain('no contiene HTML editable');
  });
});
