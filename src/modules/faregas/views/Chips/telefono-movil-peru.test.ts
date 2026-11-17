import { describe, expect, it } from 'vitest';
import { sanitizarTelefonoMovilPeru, telefonoMovilPeruValido } from './telefono-movil-peru';

describe('teléfono opcional de venta de chips', () => {
  it('permite dejarlo vacío y acepta móvil peruano de nueve dígitos', () => {
    expect(telefonoMovilPeruValido('')).toBe(true);
    expect(telefonoMovilPeruValido('987654321')).toBe(true);
  });

  it('limita pegados a nueve dígitos y descarta letras o símbolos', () => {
    expect(sanitizarTelefonoMovilPeru('987654321999')).toBe('987654321');
    expect(sanitizarTelefonoMovilPeru('9a876-54321')).toBe('987654321');
  });

  it('rechaza nueve dígitos que no correspondan a un móvil peruano', () => {
    expect(telefonoMovilPeruValido('123456789')).toBe(false);
    expect(telefonoMovilPeruValido('98765432')).toBe(false);
    expect(telefonoMovilPeruValido('987654321x')).toBe(false);
  });
});
