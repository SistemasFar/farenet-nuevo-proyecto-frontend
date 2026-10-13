type DatosTipoCertificadoPanel = {
  tipoCertificadoClave?: string | null;
  modalidad?: string | null;
  conceptoVehicular?: string | null;
};

const capitalizar = (valor: string) => valor.charAt(0) + valor.slice(1).toLowerCase();

/**
 * Denominación operativa del certificado en el panel. La familia sale del
 * tipo real y la variante del servicio; no depende del id del registro.
 */
export const nombreTipoCertificadoPanel = ({
  tipoCertificadoClave,
  modalidad,
  conceptoVehicular,
}: DatosTipoCertificadoPanel): string => {
  const tipo = String(tipoCertificadoClave || '').trim().toUpperCase();
  const variante = String(modalidad || '').trim().toUpperCase();
  const familia = tipo.startsWith('GNV') ? 'GNV' : tipo.startsWith('GLP') ? 'GLP' : '';

  if (familia && ['INICIAL', 'ANUAL'].includes(variante)) {
    return `Certificado ${capitalizar(variante)} ${familia}`;
  }

  const nombreReal = String(conceptoVehicular || '').trim();
  if (nombreReal) return nombreReal;
  if (tipo === 'CONFORMIDAD') return 'Conformidad';
  return '-';
};
