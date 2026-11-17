const TELEFONO_MOVIL_PERU = /^9\d{8}$/;

export const sanitizarTelefonoMovilPeru = (valor: string) =>
  valor.replace(/\D/g, '').slice(0, 9);

export const telefonoMovilPeruValido = (valor: string) =>
  valor === '' || TELEFONO_MOVIL_PERU.test(valor);
