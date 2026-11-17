import { describe, expect, it } from 'vitest';
import { crearExcelVariasHojasBytes } from '../../utils/exportar-excel';
import {
  construirHojaCredencialesTemporales,
  construirHojaUsuariosFaregas,
  type CredencialTemporalParaExportar,
  type PerfilParaExportar,
  type UsuarioParaExportar,
} from './usuarios-exportacion';
import { generarContrasenaTemporal, LONGITUD_CONTRASENA_TEMPORAL } from './contrasena-temporal';

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
};

describe('exportación de usuarios FAREGAS', () => {
  it('conserva la fila 9 y las diez columnas del formato y deja vacía la clave histórica', () => {
    const sheet = construirHojaUsuariosFaregas([usuario], perfiles, { estado: 'ACTIVOS', busqueda: 'wilber' });
    const files = unzipStored(crearExcelVariasHojasBytes([sheet]));
    const xml = files.get('xl/worksheets/sheet1.xml') || '';
    for (const header of [
      'N.º', 'Nombre completo', 'Username', 'Correo electrónico', 'Perfil FAREGAS',
      'Sede', 'Contraseña temporal', 'Estado', 'Resultado', 'Observaciones',
    ]) expect(xml).toContain(header);
    expect(xml).toContain('<row r="9">');
    expect(xml).toContain('<c r="G10" t="inlineStr"><is><t xml:space="preserve"></t></is></c>');
    expect(xml).toContain('WILBER DONAYRE');
    expect(xml).toContain('wdonayre@example.pe');
    expect(xml).toContain('SURCO');
    expect(xml).not.toContain('contrasenha');
  });

  it('incluye una clave solo en la hoja transitoria de altas o restablecimientos recientes', () => {
    const password = generarContrasenaTemporal();
    const credential: CredencialTemporalParaExportar = {
      ...usuario,
      password,
      resultado: 'Creado',
    };
    const sheet = construirHojaCredencialesTemporales([credential], perfiles);
    const files = unzipStored(crearExcelVariasHojasBytes([sheet]));
    const xml = files.get('xl/worksheets/sheet1.xml') || '';
    expect(xml).toContain(password);
    expect(xml).toContain('Creado');
    expect(xml).toContain('Confidencial');
    expect(construirHojaUsuariosFaregas([usuario], perfiles).rows[0].password).toBe('');
  });

  it('genera un XLSX válido con encabezados cuando los filtros no devuelven usuarios', () => {
    const files = unzipStored(crearExcelVariasHojasBytes([
      construirHojaUsuariosFaregas([], perfiles, { estado: 'INACTIVOS', busqueda: 'sin resultados' }),
    ]));
    const xml = files.get('xl/worksheets/sheet1.xml') || '';
    expect(xml).toContain('<row r="9">');
    expect(xml).toContain('Nombre completo');
    expect(xml).toContain('Contraseña temporal');
    expect(xml).toContain('<autoFilter ref="A9:J9"/>');
  });

  it('genera claves temporales aleatorias de 24 caracteres que cumplen la política de inicio de sesión', () => {
    const password = generarContrasenaTemporal(globalThis.crypto, 'mquijano');
    expect(password).toHaveLength(LONGITUD_CONTRASENA_TEMPORAL);
    expect(password.length).toBeGreaterThanOrEqual(24);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[!@#$%_\-]/);
    expect(password.toLowerCase()).not.toContain('mquijano');
    expect(generarContrasenaTemporal()).not.toBe(password);
    expect(() => generarContrasenaTemporal(undefined)).not.toThrow();
    expect(() => generarContrasenaTemporal({ getRandomValues: undefined } as unknown as Crypto)).toThrow(/generador criptográfico seguro/);
  });
});
