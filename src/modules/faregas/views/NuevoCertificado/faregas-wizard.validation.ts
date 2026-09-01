import type { TipoCertificadoFaregas } from '../../types/faregas';

type DatosAsistente = {
  tipoCertificado: TipoCertificadoFaregas;
  modalidad?: string;
  caja: Record<string, any>;
  vehiculo: Record<string, any>;
  titulares: Array<Record<string, any>>;
  gnv: Record<string, any>;
  glp: Record<string, any>;
  conformidad: Record<string, any>;
};

const vacio = (valor: unknown) => valor === null || valor === undefined || String(valor).trim() === '';

const agregarFaltantes = (
  errores: string[],
  datos: Record<string, any>,
  campos: Array<[string, string]>
) => {
  for (const [campo, etiqueta] of campos) {
    if (vacio(datos[campo])) errores.push(`Complete ${etiqueta}.`);
  }
};

export const validarDatosIniciales = (caja: Record<string, any>) => {
  const errores: string[] = [];
  agregarFaltantes(errores, caja, [
    ['tarifaCodigo', 'el servicio'],
    ['placa', 'la placa'],
    ['categoria', 'la categoría vehicular'],
  ]);
  if (caja.tipoCertificado !== 'CONFORMIDAD' && vacio(caja.modalidadCertificado)) {
    errores.push('Seleccione si el certificado es inicial o anual.');
  }
  return errores;
};

export const validarDatosFacturacionBasica = (facturacion: Record<string, any>) => {
  const errores: string[] = [];
  const tipoComprobante = String(facturacion.tipoDocFac || '').trim().toUpperCase();
  const documento = String(facturacion.nroDocFac || '').replace(/\D/g, '');
  const email = String(facturacion.emailFac || '').trim();

  if (!['BOLETA', 'FACTURA'].includes(tipoComprobante)) {
    errores.push('Seleccione el tipo de comprobante en Titulares y Datos de Facturación.');
  }
  if (![8, 11].includes(documento.length)) {
    errores.push('Complete un DNI de 8 dígitos o un RUC de 11 dígitos para facturación.');
  }
  if (tipoComprobante === 'FACTURA' && documento.length !== 11) {
    errores.push('La factura requiere un RUC de 11 dígitos.');
  }
  if (vacio(facturacion.razonSocialFac)) errores.push('Complete el nombre o razón social de facturación.');
  if (vacio(facturacion.direccionFac)) errores.push('Complete la dirección fiscal.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errores.push('El correo de facturación no tiene un formato válido.');
  }
  return errores;
};

export const validarExpedienteTecnico = ({
  tipoCertificado,
  modalidad,
  caja,
  vehiculo,
  titulares,
  gnv,
  glp,
  conformidad,
}: DatosAsistente) => {
  const errores: string[] = [];
  const base: Array<[string, string]> = [
    ['marca', 'la marca'], ['modelo', 'el modelo'], ['anioFabricacion', 'el año de fabricación'],
    ['numeroMotor', 'el número de motor'], ['numeroCilindros', 'el número de cilindros'],
    ['combustible', 'el combustible'], ['numeroEjes', 'el número de ejes'],
    ['numeroRuedas', 'el número de ruedas'], ['numeroAsientos', 'el número de asientos'],
    ['numeroPasajeros', 'el número de pasajeros'], ['longitud', 'el largo'],
    ['ancho', 'el ancho'], ['alto', 'el alto'], ['pesoNeto', 'el peso neto'],
    ['pesoBruto', 'el peso bruto'],
  ];

  if (vacio(caja.placa)) errores.push('Complete la placa.');
  if (vacio(caja.categoria)) errores.push('Complete la categoría vehicular.');
  if (vacio(vehiculo.vin) && vacio(vehiculo.serieChasis)) errores.push('Complete el VIN o la serie de chasis.');
  agregarFaltantes(errores, vehiculo, base);

  if (tipoCertificado === 'GNV_ANUAL' || tipoCertificado === 'GLP_ANUAL' || tipoCertificado === 'CONFORMIDAD') {
    agregarFaltantes(errores, vehiculo, [['version', 'la versión'], ['cilindrada', 'la cilindrada']]);
  }

  if (tipoCertificado === 'GNV_ANUAL') {
    agregarFaltantes(errores, vehiculo, [['color', 'el color']]);
    agregarFaltantes(errores, gnv, [['tallerAutorizadoId', 'el taller autorizado'], ['fechaVigencia', 'la vigencia GNV']]);
    if (modalidad === 'INICIAL' && vacio(gnv.numeroChip)) errores.push('Complete el número de chip GNV.');
    const verificaciones = gnv.verificaciones || [];
    if (verificaciones.length !== 8 || verificaciones.some((item: any) => item.cumple !== true)) {
      errores.push('Las 8 verificaciones GNV deben estar evaluadas como CUMPLE.');
    }
  }

  if (tipoCertificado === 'GLP_ANUAL') {
    agregarFaltantes(errores, vehiculo, [['cargaUtil', 'la carga útil']]);
    agregarFaltantes(errores, glp, [
      ['tallerAutorizadoId', 'el taller autorizado'],
      ['fechaVigencia', 'la vigencia GLP'],
      ['expedienteTecnico', 'el número de expediente técnico'],
    ]);
    const componentes = glp.componentes || [];
    for (const tipo of ['CILINDRO', 'REGULADOR']) {
      const componente = componentes.find((item: any) => item.componente === tipo);
      if (!componente) {
        errores.push(`Registre el componente ${tipo}.`);
        continue;
      }
      agregarFaltantes(errores, componente, [['marca', `la marca del ${tipo}`], ['modelo', `el modelo del ${tipo}`]]);
      if (tipo === 'CILINDRO') {
        agregarFaltantes(errores, componente, [
          ['capacidadLitros', 'la capacidad del cilindro'], ['mesFabricacion', 'el mes de fabricación del cilindro'],
          ['anioFabricacion', 'el año de fabricación del cilindro'], ['numeroSerie', 'la serie del cilindro'],
        ]);
      }
    }
    const verificaciones = glp.verificaciones || [];
    if (verificaciones.length !== 7 || verificaciones.some((item: any) => item.cumple !== true)) {
      errores.push('Las 7 verificaciones GLP deben estar evaluadas como CUMPLE.');
    }
  }

  if (tipoCertificado === 'GLP_ANUAL' || tipoCertificado === 'CONFORMIDAD') {
    if (titulares.length === 0) errores.push('Registre al menos un titular del certificado.');
    titulares.forEach((titular, index) => {
      agregarFaltantes(errores, titular, [
        ['tipoDocumento', `el tipo de documento del titular ${index + 1}`],
        ['nroDocumento', `el documento del titular ${index + 1}`],
        ['nombreRazonSocial', `el nombre del titular ${index + 1}`],
      ]);
      if (tipoCertificado === 'CONFORMIDAD' && vacio(titular.direccion)) {
        errores.push(`Complete la dirección del titular ${index + 1}.`);
      }
    });
  }

  if (tipoCertificado === 'CONFORMIDAD') {
    agregarFaltantes(errores, vehiculo, [
      ['clase', 'la clase vehicular'], ['carroceria', 'la carrocería'], ['color', 'el color'],
      ['cargaUtil', 'la carga útil'], ['anioModelo', 'el año modelo'],
      ['formulaRodante', 'la fórmula rodante'], ['potencia', 'la potencia'],
    ]);
    agregarFaltantes(errores, conformidad, [
      ['tipoConformidad', 'el tipo de conformidad'], ['tipoTramite', 'el tipo de trámite'],
      ['caracteristicaRegistrable', 'la característica registrable'], ['motivo', 'el motivo'],
      ['descripcion', 'la descripción'], ['usoOriginalVehiculo', 'el uso original del vehículo'],
    ]);
  }

  return [...new Set(errores)];
};
