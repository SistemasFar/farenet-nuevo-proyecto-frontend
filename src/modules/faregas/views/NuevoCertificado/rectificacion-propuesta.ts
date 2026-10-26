import type { DatosPropuestosRectificacion } from '../../services/faregas-rectificaciones.api';

type CualquierObjeto = Record<string, unknown>;

interface ConstruirPropuestaRectificacionParams {
  tipoCertificado: string;
  formCaja: CualquierObjeto;
  formVehiculo: CualquierObjeto;
  titulares: CualquierObjeto[];
  formGnv: CualquierObjeto;
  formGlp: CualquierObjeto;
  formConformidad: CualquierObjeto;
  formatoValores?: Record<string, string> | null;
  esTallerInspeccion?: boolean;
}

const textoONull = (valor: unknown) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio ? limpio : null;
};

const numeroONull = (valor: unknown) => {
  const limpio = textoONull(valor);
  if (!limpio) return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : limpio;
};

const mapComponenteGnv = (componente: CualquierObjeto, indice: number) => ({
  orden: componente.orden || indice + 1,
  componente: textoONull(componente.componente),
  marca: textoONull(componente.marca),
  modelo: textoONull(componente.modelo),
  capacidad_litros: textoONull(componente.capacidadLitros),
  mes_fabricacion: numeroONull(componente.mesFabricacion),
  anio_fabricacion: numeroONull(componente.anioFabricacion),
  numero_serie: textoONull(componente.numeroSerie)
});

const mapComponenteGlp = (componente: CualquierObjeto, indice: number) => ({
  orden: componente.orden || indice + 1,
  componente: textoONull(componente.componente),
  marca: textoONull(componente.marca),
  modelo: textoONull(componente.modelo),
  capacidad_litros: numeroONull(componente.capacidadLitros),
  mes_fabricacion: numeroONull(componente.mesFabricacion),
  anio_fabricacion: numeroONull(componente.anioFabricacion),
  numero_serie: textoONull(componente.numeroSerie)
});

const mapVerificacion = (verificacion: CualquierObjeto, indice: number) => ({
  codigo: textoONull(verificacion.codigo),
  orden: verificacion.orden || indice + 1,
  descripcion: textoONull(verificacion.descripcion),
  cumple: verificacion.cumple === null || verificacion.cumple === undefined
    ? null
    : Boolean(verificacion.cumple),
  observacion: textoONull(verificacion.observacion)
});

/**
 * Construye el payload técnico que se enviará al backend. No incluye datos
 * fiscales, pagos, importes, número DG, fecha de emisión ni identificadores de
 * empresa/sede: esos campos están protegidos y el servidor los rechaza.
 */
export const construirPropuestaRectificacion = ({
  tipoCertificado,
  formCaja,
  formVehiculo,
  titulares,
  formGnv,
  formGlp,
  formConformidad,
  formatoValores,
  esTallerInspeccion
}: ConstruirPropuestaRectificacionParams): DatosPropuestosRectificacion => {
  const datos: DatosPropuestosRectificacion = {
    placa: textoONull(formCaja.placa || formVehiculo.placaNueva),
    categoria: textoONull(formCaja.categoria),
    clase: textoONull(formVehiculo.clase),
    marca: textoONull(formVehiculo.marca),
    modelo: textoONull(formVehiculo.modelo),
    version: textoONull(formVehiculo.version),
    anio_fabricacion: textoONull(formVehiculo.anioFabricacion),
    anio_modelo: textoONull(formVehiculo.anioModelo),
    vin: textoONull(formVehiculo.vin),
    serie_chasis: textoONull(formVehiculo.serieChasis),
    numero_motor: textoONull(formVehiculo.numeroMotor),
    combustible: textoONull(formVehiculo.combustible),
    color: textoONull(formVehiculo.color),
    carroceria: textoONull(formVehiculo.carroceria),
    numero_cilindros: textoONull(formVehiculo.numeroCilindros),
    cilindrada: textoONull(formVehiculo.cilindrada),
    numero_ejes: textoONull(formVehiculo.numeroEjes),
    numero_ruedas: textoONull(formVehiculo.numeroRuedas),
    numero_asientos: textoONull(formVehiculo.numeroAsientos),
    numero_pasajeros: textoONull(formVehiculo.numeroPasajeros),
    longitud: textoONull(formVehiculo.longitud),
    ancho: textoONull(formVehiculo.ancho),
    alto: textoONull(formVehiculo.alto),
    peso_neto: textoONull(formVehiculo.pesoNeto),
    peso_bruto: textoONull(formVehiculo.pesoBruto),
    carga_util: textoONull(formVehiculo.cargaUtil),
    potencia: textoONull(formVehiculo.potencia),
    formula_rodante: textoONull(formVehiculo.formulaRodante)
  };

  const titular = [...titulares].sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0))[0];
  if (titular) {
    datos.nombre_razon_social = textoONull(titular.nombreRazonSocial);
    datos.tipo_documento = textoONull(titular.tipoDocumento);
    datos.nro_documento = textoONull(titular.nroDocumento);
    datos.direccion = textoONull(titular.direccion);
  }

  if (tipoCertificado === 'GNV_ANUAL') {
    datos.vigencia_hasta = textoONull(formGnv.fechaVigencia || formGnv.vigencia_hasta);
    datos.modalidad = textoONull(formCaja.modalidadCertificado || formGnv.modalidad);
    datos.numero_chip = textoONull(formGnv.numeroChip || formGnv.numero_chip);
    datos.observaciones = textoONull(formGnv.observaciones);
    datos.combustible_posterior = textoONull(formGnv.combustiblePosterior);
    datos.peso_neto_posterior = textoONull(formGnv.pesoNetoPosterior);
    if (Array.isArray(formGnv.componentes)) {
      datos.componentes = formGnv.componentes.map(mapComponenteGnv);
    }
    if (Array.isArray(formGnv.verificaciones)) {
      datos.verificaciones = formGnv.verificaciones.map(mapVerificacion);
    }
  } else if (tipoCertificado === 'GLP_ANUAL') {
    datos.vigencia_hasta = textoONull(formGlp.fechaVigencia || formGlp.vigencia_hasta);
    datos.expediente_tecnico = textoONull(formGlp.expedienteTecnico);
    datos.modalidad = textoONull(formCaja.modalidadCertificado || formGlp.modalidad);
    datos.combustible_posterior = textoONull(formGlp.combustiblePosterior);
    datos.peso_neto_posterior = textoONull(formGlp.pesoNetoPosterior);
    datos.carga_util_posterior = textoONull(formGlp.cargaUtilPosterior);
    if (Array.isArray(formGlp.componentes)) {
      datos.componentes = formGlp.componentes.map(mapComponenteGlp);
    }
    if (Array.isArray(formGlp.verificaciones)) {
      datos.verificaciones = formGlp.verificaciones.map(mapVerificacion);
    }
  } else if (tipoCertificado === 'CONFORMIDAD') {
    datos.tipo_conformidad = textoONull(formConformidad.tipoConformidad);
    datos.tipo_tramite = textoONull(formConformidad.tipoTramite);
    datos.caracteristica_registrable = textoONull(formConformidad.caracteristicaRegistrable);
    datos.motivo = textoONull(formConformidad.motivo);
    datos.descripcion = textoONull(formConformidad.descripcion);
    datos.uso_original_vehiculo = textoONull(formConformidad.usoOriginalVehiculo);
  }

  if (esTallerInspeccion && formatoValores && Object.keys(formatoValores).length > 0) {
    datos.datosFormato = { ...formatoValores };
  }

  return datos;
};
