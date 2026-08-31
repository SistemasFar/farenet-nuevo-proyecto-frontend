type NullableText = string | null;
type NullableNumberInput = number | string | null;

export interface CrearClienteFaregasRequest {
  tipoDocumento: string;
  nroDocumento: string;
  nombreRazonSocial: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
}

export interface FaregasSede {
  key: string;
  nombre: string;
  direccion: string;
  telefono: string;
  correo?: string;
  empresa_key: string;
  empresa_nombre?: string;
  activo: boolean;
  total_tarifas?: number;
}

export interface FaregasSerie {
  id: number;
  planta_key: string;
  sede_nombre?: string;
  tipo_comprobante: string;
  serie: string;
  ultimo_numero: number;
  es_predeterminada: boolean;
  autogenerada: boolean;
  contingencia: boolean;
  activo: boolean;
  tipo_documento_referencia?: string;
  serie_pos?: boolean;
  fuente_correlativo?: 'COMPARTIDO_FARENET' | 'FAREGAS';
}

export interface CrearBorradorFaregasRequest {
  tipoCertificadoClave: string;
  clienteId?: string;
  observaciones?: string;
  tarifaCodigo?: string;
  placa?: NullableText;
  categoria?: NullableText;
}

export type PasoBorradorFaregas = 'DATOS_INICIALES' | 'PAGO' | 'VEHICULO' | 'FACTURACION' | 'PREVISUALIZACION' | 'VERIFICACION_EMISION';

export interface ActualizarBorradorFaregasRequest {
  clienteId?: string;
  observaciones?: string;
  tarifaCodigo?: string;
}

export interface PagoFaregasRequest {
  tipo: 'EFECTIVO' | 'TARJETA' | 'BANCO';
  importe: number | string;
  tarjetaKey?: NullableText;
  nroOperacion?: NullableText;
  digitosTarjeta?: NullableText;
  cuentaCorrienteKey?: NullableText;
  entidadFinancieraKey?: NullableText;
  fechaDeposito?: NullableText;
}

export interface GuardarPagosFaregasRequest {
  importeTotal: number | string;
  pagos: PagoFaregasRequest[];
}

export interface GuardarFacturacionFaregasRequest {
  tipoComprobante: 'BOLETA' | 'FACTURA' | string;
  nroDocumento: string;
  nombreRazonSocial: string;
  direccion: string;
  email?: NullableText;
  telefono?: NullableText;
  condicionPago?: 'CONTADO' | 'CREDITO';
  fechaVencimiento?: NullableText;
  medioPago?: NullableText;
  cuotas?: Array<{
    numeroCuota: number;
    fechaPago: string;
    importe: number | string;
  }>;
}

export interface CuotaFacturacionFaregas {
  id: number;
  numeroCuota: number;
  fechaPago: string;
  importe: number;
  estado: 'PENDIENTE' | 'PAGADA' | 'ANULADA';
}

export interface FacturacionFaregas {
  id: number;
  certificadoId: number;
  tipoComprobante: 'BOLETA' | 'FACTURA';
  tipoDocumentoCliente: 'DNI' | 'RUC';
  nroDocumento: string;
  nombreRazonSocial: string;
  direccion: string;
  email: NullableText;
  telefono: NullableText;
  condicionPago: 'CONTADO' | 'CREDITO';
  fechaVencimiento: NullableText;
  medioPago: NullableText;
  cuotas: CuotaFacturacionFaregas[];
  baseImponible: number;
  igv: number;
  importeTotal: number;
  estado: 'BORRADOR' | 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'ERROR' | 'ANULADO';
  nroComprobante: NullableText;
  aceptadaSunat: boolean | null;
  sunatDescription: NullableText;
  enlacePdf: NullableText;
  enlaceXml: NullableText;
  enlaceCdr: NullableText;
  intentos: number;
}

export interface NotaElectronicaFaregas {
  id: number;
  tipo: 'CREDITO' | 'DEBITO';
  facturacionId: number;
  motivoCodigo: string;
  sustento: string;
  nroComprobante: NullableText;
  importeTotal: number;
  estado: 'BORRADOR' | 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'ERROR' | 'ANULADO';
  enlacePdf: NullableText;
}

export interface AnulacionElectronicaFaregas {
  id: number;
  tipoDocumento: 'FACTURACION' | 'CREDITO' | 'DEBITO';
  documentoId: number;
  motivo: string;
  estado: 'BORRADOR' | 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'ERROR';
  ticketSunat: NullableText;
  sunatDescription: NullableText;
}

export interface VehiculoBorradorFaregasRequest {
  placa?: NullableText;
  categoria?: NullableText;
  clase?: NullableText;
  marca?: NullableText;
  modelo?: NullableText;
  version?: NullableText;
  anioFabricacion?: NullableNumberInput;
  anioModelo?: NullableNumberInput;
  vin?: NullableText;
  serieChasis?: NullableText;
  numeroMotor?: NullableText;
  combustible?: NullableText;
  color?: NullableText;
  carroceria?: NullableText;
  numeroCilindros?: NullableNumberInput;
  cilindrada?: NullableNumberInput;
  numeroEjes?: NullableNumberInput;
  numeroRuedas?: NullableNumberInput;
  numeroAsientos?: NullableNumberInput;
  numeroPasajeros?: NullableNumberInput;
  longitud?: NullableNumberInput;
  ancho?: NullableNumberInput;
  alto?: NullableNumberInput;
  pesoNeto?: NullableNumberInput;
  pesoBruto?: NullableNumberInput;
  cargaUtil?: NullableNumberInput;
  potencia?: NullableNumberInput;
  formulaRodante?: NullableText;
}

export interface CrearTitularFaregasRequest {
  clienteId?: string | number | null;
  orden: number;
  tipoDocumento?: NullableText;
  nroDocumento?: NullableText;
  nombreRazonSocial: string;
  direccion?: NullableText;
}

export type ActualizarTitularFaregasRequest = Partial<CrearTitularFaregasRequest>;

export interface VerificacionFaregasRequest {
  codigo: string;
  orden: number;
  descripcion?: NullableText;
  cumple: boolean | null;
  observacion?: NullableText;
}

export interface GuardarGnvFaregasRequest {
  tallerAutorizadoId?: number | string | null;
  vigenciaHasta?: NullableText;
  modalidad?: NullableText;
  numeroChip?: NullableText;
}

export interface GuardarVerificacionesFaregasRequest {
  verificaciones: VerificacionFaregasRequest[];
}

export interface ComponenteGlpFaregasRequest {
  orden: number;
  componente: string;
  marca?: NullableText;
  modelo?: NullableText;
  capacidadLitros?: NullableNumberInput;
  mesFabricacion?: NullableNumberInput;
  anioFabricacion?: NullableNumberInput;
  numeroSerie?: NullableText;
}

export interface GuardarGlpFaregasRequest {
  tallerAutorizadoId?: number | string | null;
  expedienteTecnico?: NullableText;
  vigenciaHasta?: NullableText;
  modalidad?: NullableText;
  combustiblePosterior?: NullableText;
  pesoNetoPosterior?: NullableNumberInput;
  cargaUtilPosterior?: NullableNumberInput;
}

export interface GuardarComponentesGlpFaregasRequest {
  componentes: ComponenteGlpFaregasRequest[];
}

export interface GuardarConformidadFaregasRequest {
  tipoConformidad?: 'MODIFICACION' | 'MONTAJE' | 'FABRICACION' | null;
  tipoTramite?: NullableText;
  caracteristicaRegistrable?: NullableText;
  motivo?: NullableText;
  descripcion?: NullableText;
  usoOriginalVehiculo?: NullableText;
  marcaModificacion?: boolean;
  marcaMontaje?: boolean;
  marcaFabricacion?: boolean;
}

interface UsuarioFaregasBaseRequest {
  username: string;
  perfil_id: string | null;
  estado: boolean | 'true' | 'false';
  sedes: string[];
}

export interface CrearUsuarioFaregasRequest extends UsuarioFaregasBaseRequest {
  password: string;
}

export type ActualizarUsuarioFaregasRequest = UsuarioFaregasBaseRequest;

interface PerfilFaregasBaseRequest {
  nombre: string;
  visible: boolean | 'true' | 'false';
  sedes: string[];
  permisos: string[];
}

export interface CrearPerfilFaregasRequest extends PerfilFaregasBaseRequest {
  clave: string;
}

export type ActualizarPerfilFaregasRequest = PerfilFaregasBaseRequest;

export type ModalidadServicioFaregas = 'INICIAL' | 'ANUAL' | null;

export interface TarifaCatalogoFaregas {
  id: number;
  codigo: string;
  precio: number;
}

export interface ServicioCatalogoFaregas {
  id: number;
  codigo: string;
  nombre: string;
  orden: number;
  tipo_flujo: 'CERTIFICACION';
  requiere_certificado: boolean;
  requiere_vehiculo: boolean;
  tipo_certificado_clave: string;
  modalidad: ModalidadServicioFaregas;
  tarifa: TarifaCatalogoFaregas;
}

export interface CategoriaCatalogoFaregas {
  codigo: string;
  nombre: string;
  orden: number;
  servicios: ServicioCatalogoFaregas[];
}

export interface CatalogoFaregas {
  sede: {
    key: string;
    nombre: string;
  };
  categorias: CategoriaCatalogoFaregas[];
}
