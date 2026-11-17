const MAYUSCULAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MINUSCULAS = 'abcdefghijkmnopqrstuvwxyz';
const NUMEROS = '23456789';
const SIMBOLOS = '!@#$%_-';
const ALFABETO = `${MAYUSCULAS}${MINUSCULAS}${NUMEROS}${SIMBOLOS}`;
export const LONGITUD_CONTRASENA_TEMPORAL = 24;

const indiceSeguro = (longitud: number, cryptoApi: Pick<Crypto, 'getRandomValues'>) => {
  const limite = Math.floor(256 / longitud) * longitud;
  for (;;) {
    const byte = cryptoApi.getRandomValues(new Uint8Array(1))[0];
    if (byte < limite) return byte % longitud;
  }
};

/** Genera una clave temporal en memoria que satisface las clases del login FAREGAS. */
export const generarContrasenaTemporal = (
  cryptoApi: Pick<Crypto, 'getRandomValues'> | undefined = globalThis.crypto,
  username = '',
) => {
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Este navegador no ofrece un generador criptográfico seguro.');
  }

  const usuarioNormalizado = username.trim().toLowerCase();
  for (let intento = 0; intento < 100; intento += 1) {
    const caracteres = [
      MAYUSCULAS[indiceSeguro(MAYUSCULAS.length, cryptoApi)],
      MINUSCULAS[indiceSeguro(MINUSCULAS.length, cryptoApi)],
      NUMEROS[indiceSeguro(NUMEROS.length, cryptoApi)],
      SIMBOLOS[indiceSeguro(SIMBOLOS.length, cryptoApi)],
      ...Array.from({ length: LONGITUD_CONTRASENA_TEMPORAL - 4 }, () => (
        ALFABETO[indiceSeguro(ALFABETO.length, cryptoApi)]
      )),
    ];

    for (let i = caracteres.length - 1; i > 0; i -= 1) {
      const j = indiceSeguro(i + 1, cryptoApi);
      [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
    }

    const resultado = caracteres.join('');
    if (!usuarioNormalizado || !resultado.toLowerCase().includes(usuarioNormalizado)) {
      return resultado;
    }
  }
  throw new Error('No se pudo generar una contraseña temporal que cumpla la política. Intente nuevamente.');
};
