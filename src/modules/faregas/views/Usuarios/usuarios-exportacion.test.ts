import { describe, expect, it } from 'vitest';
import { crearExcelVariasHojasBytes } from '../../utils/exportar-excel';
import {
  construirHojaUsuariosFaregas,
  type PerfilParaExportar,
  type UsuarioParaExportar,
} from './usuarios-exportacion';

function unzipStored(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = new Map<string, string>();
  let offset = 0;
  while (offset + 30 < bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameSize = view.getUint16(offset + 26, true);
    const extraSize = view.getUint16(offset + 28, true);
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameSize));
    const start = offset + 30 + nameSize + extraSize;
    entries.set(name, decoder.decode(bytes.subarray(start, start + size)));
    offset = start + size;
  }
  expect(view.getUint32(offset, true)).toBe(0x02014b50);
  expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
  return entries;
}

const perfiles: PerfilParaExportar[] = [{ clave: 'CONTADOR', nombre: 'CONTADOR' }];
const usuario: UsuarioParaExportar = {
  username: 'wdonayre',
  nombres: 'WILBER',
  apellidos: 'DONAYRE',
  email: 'wdonayre@example.pe',
  perfil_id: 'CONTADOR',
  estado: true,
  sedes: [{ key: 'surco', nombre: 'SURCO' }],
  fechaUltimoRestablecimiento: '19/11/2026, 11:14:04',
  estadoCredencial: 'Vigente (Administrada)',
  cambiadaPosteriormente: false,
  necesitaRestablecimiento: false,
  observacionesCredencial: 'Credencial administrada vigente asignada en la última renovación.',
};

describe('exportación de usuarios FAREGAS', () => {
  it('conserva la fila 9 y retira por completo la columna de contraseñas', () => {
    const sheet = construirHojaUsuariosFaregas([usuario], perfiles, { estado: 'ACTIVOS', busqueda: 'wilber' });
    const files = unzipStored(crearExcelVariasHojasBytes([sheet]));
    const xml = files.get('xl/worksheets/sheet1.xml') || '';
    for (const header of [
      'N.º', 'Nombre completo', 'Username', 'Documento', 'Correo electrónico', 'Perfil FAREGAS',
      'Sede', 'Estado', 'Fecha último restablecimiento', 'Responsable último cambio', 'Estado credencial administrada',
      'Contraseña cambiada posteriormente', 'Necesidad de nuevo restablecimiento', 'Resultado', 'Observaciones',
    ]) expect(xml).toContain(header);
    expect(xml).toContain('<row r="9">');
    expect(xml).toContain('WILBER DONAYRE');
    expect(xml).toContain('wdonayre@example.pe');
    expect(xml).toContain('SURCO');
    expect(xml).toContain('Vigente (Administrada)');
    // No existe columna exclusiva para entregar contraseñas en claro ni hashes
    expect(xml).not.toContain('<is><t xml:space="preserve">Contraseña</t></is>');
    expect(xml).not.toContain('password');
    expect(xml).not.toContain('contrasenha');
  });

  it('genera un XLSX válido con encabezados cuando los filtros no devuelven usuarios', () => {
    const files = unzipStored(crearExcelVariasHojasBytes([
      construirHojaUsuariosFaregas([], perfiles, { estado: 'INACTIVOS', busqueda: 'sin resultados' }),
    ]));
    const xml = files.get('xl/worksheets/sheet1.xml') || '';
    expect(xml).toContain('<row r="9">');
    expect(xml).toContain('Nombre completo');
    expect(xml).not.toContain('<is><t xml:space="preserve">Contraseña</t></is>');
    expect(xml).toContain('<autoFilter ref="A9:O9"/>');
  });
});
