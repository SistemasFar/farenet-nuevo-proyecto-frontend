import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Unificación del maestro de clientes FAREGAS: Venta Directa de Chips ahora
 * consulta el mismo maestro que Nuevo Certificado, y el certificado queda
 * enlazado a su titular principal.
 *
 * La auditoría encontró que el modal no tenía lupa, no importaba la API de
 * clientes, y perdía el correo y el teléfono en dos capas. Estos tests fijan
 * que la reutilización usa el endpoint genérico existente y que no se
 * sobreescribe lo que el operador ya escribió.
 */
const leer = (...partes: string[]) =>
  readFileSync(resolve(__dirname, '..', ...partes), 'utf8');

const MODAL = leer('views', 'Chips', 'ModalVentaChips.tsx');
const API_CHIPS = leer('services', 'faregas-chips.api.ts');
const API_CLIENTES = leer('services', 'faregas-clientes.api.ts');
const VISTA = leer('views', 'NuevoCertificado', 'NuevoCertificadoView.tsx');

const bloqueLupa = () => {
  const inicio = MODAL.indexOf('const buscarCliente = async');
  return MODAL.slice(inicio, MODAL.indexOf('const handleScanChange', inicio));
};

const bloqueSubmit = () => {
  const inicio = MODAL.indexOf('faregasChipsApi.ventaDirecta({');
  return MODAL.slice(inicio, MODAL.indexOf('});', inicio));
};

// ===========================================================================
// 1. La lupa reutiliza el endpoint genérico de clientes
// ===========================================================================

describe('venta de chips: lupa de cliente', () => {
  it('importa la API de clientes que ya usa Nuevo Certificado', () => {
    expect(MODAL).toMatch(/import \{ faregasClientesApi \} from '\.\.\/\.\.\/services\/faregas-clientes\.api'/);
  });

  it('llama al endpoint genérico autocompletarPersona', () => {
    expect(bloqueLupa()).toMatch(
      /faregasClientesApi\.autocompletarPersona\(\s*tipoDocumentoCliente,\s*documento\s*\)/
    );
  });

  it('usa el documento normalizado a sólo dígitos', () => {
    expect(bloqueLupa()).toMatch(/nroDocumento\.replace\(\/\\D\/g, ''\)/);
  });

  it('valida el documento antes de consultar', () => {
    expect(bloqueLupa()).toMatch(/errorDocumentoFiscal\(/);
    expect(bloqueLupa()).toMatch(/setError\(/);
  });

  it('el botón de lupa está junto al campo Nro Documento', () => {
    const indiceDocumento = MODAL.indexOf('value={nroDocumento}');
    const indiceBoton = MODAL.indexOf('onClick={() => void buscarCliente()}');
    expect(indiceDocumento).toBeGreaterThan(-1);
    expect(indiceBoton).toBeGreaterThan(-1);
    // El botón se pinta dentro del mismo label, no en otra sección.
    expect(indiceBoton - indiceDocumento).toBeLessThan(1200);
  });

  it('mantiene el estilo visual del sistema y bloquea la doble búsqueda', () => {
    expect(MODAL).toMatch(/bg-slate-200 px-3 transition-colors hover:bg-slate-300/);
    expect(MODAL).toMatch(/disabled=\{buscandoCliente \|\| ventaRegistrada\}/);
    expect(MODAL).toMatch(/aria-busy=\{buscandoCliente\}/);
  });

  it('no se creó un endpoint propio de chips', () => {
    expect(API_CHIPS).not.toMatch(/buscar-cliente/);
    // El maestro sigue teniendo su única superficie de lectura.
    expect(API_CLIENTES).toMatch(/\/clientes\/autocompletar\//);
    expect(API_CLIENTES).not.toMatch(/chips/);
  });
});

// ===========================================================================
// 2. La lupa rellena sin pisar lo que el operador ya escribió
// ===========================================================================

describe('venta de chips: la lupa no pisa datos existentes', () => {
  it('rellena nombre, dirección, correo y teléfono', () => {
    const lupa = bloqueLupa();
    expect(lupa).toMatch(/setNombreRazonSocial\(/);
    expect(lupa).toMatch(/setDireccion\(/);
    expect(lupa).toMatch(/setEmail\(/);
    expect(lupa).toMatch(/setTelefono\(/);
  });

  it('usa el valor actual como respaldo si la respuesta viene vacía', () => {
    const lupa = bloqueLupa();
    expect(lupa).toMatch(/setDireccion\(prev => persona\.direccion \|\| prev\)/);
    expect(lupa).toMatch(/setEmail\(prev => normalizarEmail\([^)]*\) \|\| prev\)/);
    expect(lupa).toMatch(/setTelefono\(prev => \([^)]*\)\.trim\(\) \|\| prev\)/);
  });

  it('lee las propiedades reales de la respuesta, sin inventar nombres', () => {
    const lupa = bloqueLupa();
    // El service devuelve nombreRazonSocial / direccion / correo|telefono.
    expect(lupa).toMatch(/persona\.nombreRazonSocial \|\| persona\.nombrerazonsocial/);
    expect(lupa).toMatch(/persona\.correo \|\| persona\.email/);
  });

  it('un 404 no bloquea el formulario: avisa y permite escribir a mano', () => {
    const lupa = bloqueLupa();
    expect(lupa).toMatch(/catch \{/);
    expect(lupa).toMatch(/Puede completar los datos manualmente/);
    // El error del servidor no se propaga como bloqueo.
    expect(MODAL).not.toMatch(/setError\('No se encontró un cliente/);
  });
});

// ===========================================================================
// 3. Correo y teléfono: ya no se pierden
// ===========================================================================

describe('venta de chips: correo y teléfono', () => {
  it('el formulario expone ambos campos', () => {
    expect(MODAL).toMatch(/const \[email, setEmail\] = useState\(''\)/);
    expect(MODAL).toMatch(/const \[telefono, setTelefono\] = useState\(''\)/);
    expect(MODAL).toMatch(/value=\{email\}/);
    expect(MODAL).toMatch(/value=\{telefono\}/);
  });

  it('el submit los envía en el payload', () => {
    const payload = bloqueSubmit();
    expect(payload).toMatch(/email: normalizarEmail\(email\) \|\| null/);
    expect(payload).toMatch(/telefono: telefono\.trim\(\) \|\| null/);
  });

  it('el contrato de VentaDirectaPayload ya los declara', () => {
    expect(API_CHIPS).toMatch(/email\?: string \| null;/);
    expect(API_CHIPS).toMatch(/telefono\?: string \| null;/);
  });

  it('el submit no eliminó ningún campo previo', () => {
    const payload = bloqueSubmit();
    [
      'tipoComprobante',
      'tipoDocumentoCliente',
      'nroDocumento',
      'nombreRazonSocial',
      'direccion',
      'condicionPago',
      'medioPago',
      'pagosAgregados',
      'chips'
    ].forEach((campo) => {
      // Acepta tanto propiedad explícita (`campo:`) como forma abreviada
      // (`campo,`), que es como viaja la mayoría del payload.
      expect(payload).toMatch(new RegExp(`\\b${campo}\\s*[,:]`));
    });
  });

  it('replica las reglas del backend en vez de inventar otras', () => {
    // faregas-facturacion.rules.js: correo con este regex, teléfono hasta 30.
    expect(MODAL).toMatch(/const LIMITE_TELEFONO = 30;/);
    expect(MODAL).toMatch(/const REGLA_EMAIL = \/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$\/;/);
    expect(MODAL).toMatch(/const normalizarEmail = \(valor: string\) => valor\.trim\(\)\.toLowerCase\(\);/);
    // El correo no tiene límite de longitud en el backend, así que el input no
    // inventa uno: sólo el teléfono lleva maxLength.
    const bloqueEmail = MODAL.slice(MODAL.indexOf('Correo'), MODAL.indexOf('Teléfono'));
    expect(bloqueEmail).not.toMatch(/maxLength/);
  });

  it('siguen siendo opcionales: agregar el campo no bloquea ventas previas', () => {
    // No se exigieron: el botón de confirmar no depende de email/telefono.
    expect(MODAL).toMatch(/!errorContactoActual/);
    expect(MODAL).not.toMatch(/!email\.trim\(\)\s*&&/);
    expect(MODAL).not.toMatch(/!telefono\.trim\(\)\s*&&/);
  });
});

// ===========================================================================
// 4. El certificado se enlaza a su titular principal
// ===========================================================================

describe('nuevo certificado: enlace con el maestro', () => {
  const bloqueTitulares = () => {
    const inicio = VISTA.indexOf('const guardarTitularesBorrador = async');
    return VISTA.slice(inicio, VISTA.indexOf('const guardarExpedienteTecnico', inicio));
  };

  it('sube el cliente del titular principal al certificado', () => {
    expect(bloqueTitulares()).toMatch(
      /faregasCertificadosApi\.actualizarBorrador\(idBorrador, \{\s*clienteId: principal\.clienteId/
    );
  });

  it('el principal se toma del menor `orden`, la misma regla del wizard', () => {
    expect(bloqueTitulares()).toMatch(
      /\[\.\.\.guardados\]\.sort\(\(a, b\) => a\.orden - b\.orden\)\[0\]/
    );
  });

  it('sólo enlaza cuando el principal ya tiene cliente_id', () => {
    expect(bloqueTitulares()).toMatch(/if \(principal\?\.clienteId\)/);
  });

  it('los titulares siguen guardando su propio cliente_id (snapshot)', () => {
    // La escritura por titular no se toca: cada dueño conserva su enlace.
    expect(bloqueTitulares()).toMatch(/clienteId,\s*\n\s*orden:/);
    expect(bloqueTitulares()).toMatch(/const clienteId = await asegurarClienteFaregas\(titular\);/);
  });
});
