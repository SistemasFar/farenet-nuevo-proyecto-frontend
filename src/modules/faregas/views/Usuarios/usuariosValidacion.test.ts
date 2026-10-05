import { describe, expect, it } from 'vitest';
import {
  EMAIL_MAXIMO,
  REGLAS_DOCUMENTO,
  TELEFONO_MAXIMO,
  atributosDocumento,
  esRuc,
  normalizarSoloDigitos,
  normalizarTelefono,
  primerCampoConError,
  tieneErrores,
  validarDocumento,
  validarFormularioUsuario,
  validarNombre,
  validarUsername,
  type DatosUsuarioForm,
} from './usuariosValidacion';

/**
 * VALIDACIÓN DEL FORMULARIO DE USUARIOS.
 *
 * El defecto que estos tests fijan: la validación de documento comparaba contra
 * `'01'` (DNI) y `'06'` (RUC), pero el catálogo real de
 * `tipodocumentoidentidad` usa claves de texto —`dni`, `ruc`, `pasaporte`,
 * `carnetextranjeria`, `sindni`—. La condición nunca era verdadera, así que un
 * DNI de 12 dígitos pasaba sin error. Estos casos usan las claves reales.
 *
 * El backend tiene su espejo en
 * `modules/faregas/tests/faregas-usuarios-validacion.test.js` con los mismos
 * casos: las dos capas no pueden divergir.
 */

const BASE: DatosUsuarioForm = {
  username: 'jperez',
  tipoDocumentoKey: 'dni',
  nroDocumento: '74045612',
  nombres: 'José Luis',
  apellidos: 'Muñoz',
  password: 'Secreto123',
  confirmPassword: 'Secreto123',
  paisKey: 'PE',
  departamentoKey: '15',
  provinciaKey: '1501',
  distritoKey: '150101',
  direccion: 'Av. Javier Prado N° 123',
  telefono: '971653847',
  email: 'jperez@farenet.pe',
};

const crear = (cambios: Partial<DatosUsuarioForm> = {}): DatosUsuarioForm => ({ ...BASE, ...cambios });

describe('DNI: exactamente 8 dígitos', () => {
  it('acepta 74045612', () => {
    expect(validarDocumento('dni', '74045612')).toBeNull();
    expect(validarFormularioUsuario(crear(), 'crear')).toEqual({});
  });

  it('rechaza 7404561 (7 dígitos)', () => {
    expect(validarDocumento('dni', '7404561')).toBe('El DNI debe contener exactamente 8 dígitos.');
    expect(validarFormularioUsuario(crear({ nroDocumento: '7404561' }), 'crear').nroDocumento)
      .toBe('El DNI debe contener exactamente 8 dígitos.');
  });

  it('rechaza 740456123 (9 dígitos)', () => {
    expect(validarDocumento('dni', '740456123')).toBe('El DNI debe contener exactamente 8 dígitos.');
  });

  it('rechaza 434344344344 (12 dígitos, el caso reportado)', () => {
    expect(validarDocumento('dni', '434344344344')).toBe('El DNI debe contener exactamente 8 dígitos.');
  });

  it('rechaza ABC45612', () => {
    expect(validarDocumento('dni', 'ABC45612')).toBe('El DNI debe contener solamente dígitos.');
  });

  it('rechaza 74 045612 con espacio', () => {
    expect(validarDocumento('dni', '74 045612')).toBe('El DNI debe contener solamente dígitos.');
  });

  it('el input deja sólo dígitos y no deja pasar de 8', () => {
    expect(REGLAS_DOCUMENTO.dni).toMatchObject({ inputMode: 'numeric', maxLength: 8 });
    expect(atributosDocumento('dni')).toEqual({ inputMode: 'numeric', maxLength: 8, pattern: '^[0-9]+$' });
    expect(normalizarSoloDigitos('740a45 612')).toBe('74045612');
  });
});

describe('RUC: exactamente 11 dígitos', () => {
  it('acepta 11 dígitos', () => {
    expect(validarDocumento('ruc', '20600444531')).toBeNull();
    expect(atributosDocumento('ruc')).toMatchObject({ inputMode: 'numeric', maxLength: 11 });
  });

  it('rechaza longitudes distintas de 11', () => {
    expect(validarDocumento('ruc', '2060044453')).toBe('El RUC debe contener exactamente 11 dígitos.');
    expect(validarDocumento('ruc', '206004445311')).toBe('El RUC debe contener exactamente 11 dígitos.');
  });

  it('con RUC se pide razón social en vez de nombres', () => {
    const formulario = crear({ tipoDocumentoKey: 'ruc', nroDocumento: '20600444531', nombreRazonSocial: 'FAREGAS SAC' });
    expect(esRuc('ruc')).toBe(true);
    expect(validarFormularioUsuario(formulario, 'crear')).toEqual({});
    // Sin razón social, y con nombres de persona, el RUC no pasa.
    const sinRazon = crear({ tipoDocumentoKey: 'ruc', nroDocumento: '20600444531' });
    expect(validarFormularioUsuario(sinRazon, 'crear').nombreRazonSocial).toBe('La razón social es obligatoria.');
  });
});

describe('los otros tipos NO reciben la regla del DNI', () => {
  it('pasaporte, CE y SIN DNI no tienen longitud fija', () => {
    // El modelo no la define, así que no se inventa: cualquier largo pasa
    // mientras que sea texto y quepa en la columna.
    for (const tipo of ['pasaporte', 'carnetextranjeria', 'sindni']) {
      expect(REGLAS_DOCUMENTO[tipo].longitud).toBeNull();
      expect(validarDocumento(tipo, 'AB1234')).toBeNull();
      expect(validarDocumento(tipo, 'X1')).toBeNull();
    }
  });

  it('el input de esos tipos admite texto y el ancho de la columna', () => {
    for (const tipo of ['pasaporte', 'carnetextranjeria', 'sindni']) {
      expect(atributosDocumento(tipo)).toMatchObject({ inputMode: 'text', maxLength: 20 });
    }
  });

  it('con documento personal se piden nombres y apellidos', () => {
    expect(esRuc('pasaporte')).toBe(false);
    expect(validarFormularioUsuario(crear(), 'crear')).toEqual({});
  });
});

describe('nombres y apellidos', () => {
  it('acepta "José Luis"', () => {
    expect(validarNombre('José Luis', 'nombre')).toBeNull();
  });

  it('acepta "García-López"', () => {
    expect(validarNombre('García-López', 'apellido')).toBeNull();
  });

  it('acepta O\'Connor y De la Cruz', () => {
    expect(validarNombre("O'Connor", 'apellido')).toBeNull();
    expect(validarNombre('De la Cruz', 'apellido')).toBeNull();
  });

  it('rechaza 12345', () => {
    expect(validarNombre('12345', 'nombre')).toContain('sólo admite letras');
  });

  it('rechaza @@@', () => {
    expect(validarNombre('@@@', 'nombre')).toContain('sólo admite letras');
  });

  it('rechaza fff123', () => {
    expect(validarFormularioUsuario(crear({ nombres: 'fff123' }), 'crear').nombres).toContain('sólo admite letras');
  });

  it('rechaza "   " porque es sólo espacios', () => {
    expect(validarNombre('   ', 'nombre')).toBe('El nombre es obligatorio.');
    expect(validarFormularioUsuario(crear({ nombres: '   ' }), 'crear').nombres).toBe('El nombre es obligatorio.');
  });

  it('hace trim: "  Bruno  " se acepta', () => {
    expect(validarNombre('  Bruno  ', 'nombre')).toBeNull();
  });
});

describe('username', () => {
  it('rechaza vacío y sólo espacios', () => {
    expect(validarUsername('')).toBe('El username es obligatorio.');
    expect(validarUsername('   ')).toBe('El username es obligatorio.');
  });

  it('conserva la regla de caracteres que ya tenía', () => {
    expect(validarUsername('jperez')).toBeNull();
    expect(validarUsername('jperez.01')).toBeNull();
    expect(validarUsername('jperez ramirez')).toContain('admite letras');
    expect(validarUsername('ab')).toBe('El username debe tener al menos 3 caracteres.');
  });

  it('hace trim', () => {
    expect(validarUsername('  jperez  ')).toBeNull();
  });
});

describe('email: formato obligatorio cuando tiene contenido', () => {
  it('acepta los tres casos válidos', () => {
    for (const email of ['grace@gmail.com', 'usuario@empresa.com.pe', 'sistemas.faregas@empresa.pe']) {
      expect(validarFormularioUsuario(crear({ email }), 'crear').email).toBeUndefined();
    }
  });

  it('rechaza los cinco casos inválidos', () => {
    for (const email of ['grace', 'grace@gmail', '@gmail.com', 'grace@', 'grace gmail.com']) {
      expect(validarFormularioUsuario(crear({ email }), 'crear').email)
        .toBe('Ingresa un correo electrónico válido.');
    }
  });

  it('aplica trim antes de validar', () => {
    expect(validarFormularioUsuario(crear({ email: '  grace@gmail.com  ' }), 'crear').email).toBeUndefined();
    expect(validarFormularioUsuario(crear({ email: '   ' }), 'crear').email).toBeUndefined();
  });

  it('sigue siendo opcional: vacío es válido', () => {
    expect(validarFormularioUsuario(crear({ email: '' }), 'crear').email).toBeUndefined();
  });

  it('el input no deja escribir más de 120 caracteres', () => {
    expect(EMAIL_MAXIMO).toBe(120);
  });
});

describe('teléfono: exactamente 9 dígitos', () => {
  it('999999999 es válido', () => {
    expect(validarFormularioUsuario(crear({ telefono: '999999999' }), 'crear').telefono).toBeUndefined();
  });

  it('99999999 (8 dígitos) es inválido', () => {
    expect(validarFormularioUsuario(crear({ telefono: '99999999' }), 'crear').telefono)
      .toBe('El teléfono debe contener exactamente 9 dígitos.');
  });

  it('9999999999 no se puede escribir completo: el input corta a 9', () => {
    expect(normalizarTelefono('9999999999')).toBe('999999999');
    expect(normalizarTelefono('77777777777777777777')).toBe('777777777');
    expect(TELEFONO_MAXIMO).toBe(9);
    // Y si aun así llegara por API, se rechaza.
    expect(validarFormularioUsuario(crear({ telefono: '9999999999' }), 'crear').telefono)
      .toBe('El teléfono debe contener exactamente 9 dígitos.');
  });

  it('99999ABC9: el input conserva sólo los dígitos', () => {
    // '99999ABC9' -> se caen A, B y C -> quedan los seis dígitos '999999'.
    expect(normalizarTelefono('99999ABC9')).toBe('999999');
    expect(normalizarTelefono('99999abc9')).toBe('999999');
    // Y el backend rechaza el payload tal como llega.
    expect(validarFormularioUsuario(crear({ telefono: '99999ABC9' }), 'crear').telefono)
      .toBe('El teléfono debe contener exactamente 9 dígitos.');
  });

  it('no admite letras, espacios ni signos', () => {
    for (const telefono of ['971 653 847', '+51971653847', '01-3456789', 'abcdefghi']) {
      expect(validarFormularioUsuario(crear({ telefono }), 'crear').telefono)
        .toBe('El teléfono debe contener exactamente 9 dígitos.');
    }
  });

  it('vacío da su propio mensaje, no el de longitud', () => {
    expect(validarFormularioUsuario(crear({ telefono: '' }), 'crear').telefono)
      .toBe('El teléfono es obligatorio.');
  });
});

describe('dirección', () => {
  it('acepta direcciones reales sin regex absurda', () => {
    for (const direccion of ['Av. Javier Prado N° 123', 'Mz. A Lt. 4', 'Jr. Los Próceres 450']) {
      expect(validarFormularioUsuario(crear({ direccion }), 'crear').direccion).toBeUndefined();
    }
  });

  it('rechaza vacío y sólo espacios', () => {
    expect(validarFormularioUsuario(crear({ direccion: '' }), 'crear').direccion).toBe('La dirección es obligatoria.');
    expect(validarFormularioUsuario(crear({ direccion: '     ' }), 'crear').direccion).toBe('La dirección es obligatoria.');
  });
});

describe('ubicación', () => {
  it('exige los cuatro niveles', () => {
    for (const campo of ['paisKey', 'departamentoKey', 'provinciaKey', 'distritoKey']) {
      const errores = validarFormularioUsuario(crear({ [campo]: '' }), 'crear');
      expect(errores[campo as keyof typeof errores]).toBeTruthy();
    }
  });
});

describe('contraseña', () => {
  it('al crear es obligatoria', () => {
    expect(validarFormularioUsuario(crear({ password: '', confirmPassword: '' }), 'crear').password)
      .toBe('La contraseña es obligatoria.');
  });

  it('al crear, confirmación distinta es inválido', () => {
    const errores = validarFormularioUsuario(
      crear({ password: 'Secreto123', confirmPassword: 'Otra123' }), 'crear');
    expect(errores.confirmPassword).toBe('Las contraseñas no coinciden.');
  });

  it('al editar, vacía significa "no cambiar"', () => {
    const errores = validarFormularioUsuario(crear({ password: '', confirmPassword: '' }), 'editar');
    expect(errores.password).toBeUndefined();
    expect(errores.confirmPassword).toBeUndefined();
  });

  it('al editar, si se escribe, las dos deben coincidir', () => {
    expect(validarFormularioUsuario(crear({ password: 'Nueva123', confirmPassword: 'Otra' }), 'editar').confirmPassword)
      .toBe('Las contraseñas no coinciden.');
  });

  it('no inventa una política de longitud que el sistema no tiene', () => {
    // El login sólo compara bcrypt: no hay mínimo ni complejidad que respetar.
    expect(validarFormularioUsuario(crear({ password: 'a', confirmPassword: 'a' }), 'crear')).toEqual({});
  });
});

describe('el guardado y el foco al primer error', () => {
  it('el foco va al campo más arriba de la pantalla', () => {
    const errores = validarFormularioUsuario(crear({ nroDocumento: '1', direccion: '' }), 'crear');
    // nroDocumento está antes que direccion en el formulario.
    expect(primerCampoConError(errores)).toBe('nroDocumento');
  });

  it('el foco respeta el orden username -> documento -> ubicacion', () => {
    expect(primerCampoConError(validarFormularioUsuario(crear({ username: '' }), 'crear'))).toBe('username');
    expect(primerCampoConError(validarFormularioUsuario(crear({ tipoDocumentoKey: '' }), 'crear')))
      .toBe('tipoDocumentoKey');
  });

  it('tieneErrores distingue un formulario enviable', () => {
    expect(tieneErrores(validarFormularioUsuario(crear(), 'crear'))).toBe(false);
    expect(tieneErrores(validarFormularioUsuario(crear({ nroDocumento: '434344344344' }), 'crear'))).toBe(true);
  });
});