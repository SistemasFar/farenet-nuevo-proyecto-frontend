import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

/**
 * Errores de campo del paso actual, indexados por la clave del campo.
 * La clave es la misma que usa el atributo `name` del input, de modo que un
 * error siempre sabe a qué control pertenece sin heurísticas.
 */
export type ErroresCampo = Record<string, string>;

export interface ErrorCampoWizard {
  campo: string;
  etiqueta: string;
  seccion: string;
  mensaje: string;
}

export const ETIQUETAS_CAMPOS_WIZARD: Record<string, { etiqueta: string; seccion: string }> = {
  // Datos Iniciales
  tarifaCodigo: { etiqueta: 'Servicio', seccion: 'Datos Iniciales' },
  servicioCodigo: { etiqueta: 'Servicio', seccion: 'Datos Iniciales' },
  placa: { etiqueta: 'Placa del vehículo', seccion: 'Datos Iniciales' },
  tallerNombre: { etiqueta: 'Nombre del taller', seccion: 'Datos Iniciales' },
  categoria: { etiqueta: 'Categoría vehicular', seccion: 'Datos Iniciales' },
  modalidadCertificado: { etiqueta: 'Modalidad del certificado', seccion: 'Datos Iniciales' },

  // Datos del Vehículo
  marca: { etiqueta: 'Marca', seccion: 'Datos del Vehículo' },
  modelo: { etiqueta: 'Modelo', seccion: 'Datos del Vehículo' },
  version: { etiqueta: 'Versión', seccion: 'Datos del Vehículo' },
  anioFabricacion: { etiqueta: 'Año de fabricación', seccion: 'Datos del Vehículo' },
  vin: { etiqueta: 'VIN / N° de Serie o Chasis', seccion: 'Datos del Vehículo' },
  serieChasis: { etiqueta: 'Serie de chasis', seccion: 'Datos del Vehículo' },
  numeroMotor: { etiqueta: 'Número de motor', seccion: 'Datos del Vehículo' },
  cilindrada: { etiqueta: 'Cilindrada', seccion: 'Datos del Vehículo' },
  numeroCilindros: { etiqueta: 'Número de cilindros', seccion: 'Datos del Vehículo' },
  combustible: { etiqueta: 'Combustible original', seccion: 'Datos del Vehículo' },
  color: { etiqueta: 'Color', seccion: 'Datos del Vehículo' },
  numeroEjes: { etiqueta: 'Número de ejes', seccion: 'Datos del Vehículo' },
  numeroRuedas: { etiqueta: 'Número de ruedas', seccion: 'Datos del Vehículo' },
  numeroAsientos: { etiqueta: 'Número de asientos', seccion: 'Datos del Vehículo' },
  numeroPasajeros: { etiqueta: 'Número de pasajeros', seccion: 'Datos del Vehículo' },
  longitud: { etiqueta: 'Largo', seccion: 'Datos del Vehículo' },
  ancho: { etiqueta: 'Ancho', seccion: 'Datos del Vehículo' },
  alto: { etiqueta: 'Alto', seccion: 'Datos del Vehículo' },
  pesoNeto: { etiqueta: 'Peso neto', seccion: 'Datos del Vehículo' },
  pesoBruto: { etiqueta: 'Peso bruto', seccion: 'Datos del Vehículo' },
  cargaUtil: { etiqueta: 'Carga útil', seccion: 'Datos del Vehículo' },

  // Vigencia y Expediente
  'glp.fechaVigencia': { etiqueta: 'Vigencia hasta', seccion: 'Vigencia y Expediente' },
  'gnv.fechaVigencia': { etiqueta: 'Vigencia hasta', seccion: 'Vigencia' },
  'glp.expedienteTecnico': { etiqueta: 'Expediente técnico', seccion: 'Vigencia y Expediente' },

  // Datos de Conversión / Taller
  'glp.tallerAutorizadoId': { etiqueta: 'Taller autorizado', seccion: 'Datos del Taller' },
  'gnv.tallerAutorizadoId': { etiqueta: 'Taller autorizado', seccion: 'Datos del Taller' },
  'glp.combustiblePosterior': { etiqueta: 'Combustible posterior', seccion: 'Datos de Conversión' },
  'gnv.combustiblePosterior': { etiqueta: 'Combustible posterior', seccion: 'Datos de Conversión' },
  'glp.pesoNetoPosterior': { etiqueta: 'Peso neto posterior', seccion: 'Datos de Conversión' },
  'gnv.pesoNetoPosterior': { etiqueta: 'Peso neto posterior', seccion: 'Datos de Conversión' },
  'glp.cargaUtilPosterior': { etiqueta: 'Carga útil posterior', seccion: 'Datos de Conversión' },

  // Componentes y Verificaciones
  'glp.componentes': { etiqueta: 'Componentes GLP', seccion: 'Componentes' },
  'gnv.componentes': { etiqueta: 'Componentes GNV', seccion: 'Componentes' },
  'gnv.verificaciones': { etiqueta: 'Verificaciones técnicas GNV', seccion: 'Verificaciones Técnicas' },

  // Titulares
  titulares: { etiqueta: 'Titulares del certificado', seccion: 'Titulares' },

  // Datos de Facturación
  tipoDocFac: { etiqueta: 'Tipo de comprobante', seccion: 'Datos para Facturación' },
  tipoDocumentoFac: { etiqueta: 'Tipo de documento del cliente', seccion: 'Datos para Facturación' },
  nroDocFac: { etiqueta: 'Número de documento del cliente', seccion: 'Datos para Facturación' },
  razonSocialFac: { etiqueta: 'Nombre o razón social', seccion: 'Datos para Facturación' },
  direccionFac: { etiqueta: 'Dirección fiscal', seccion: 'Datos para Facturación' },
  telefonoFac: { etiqueta: 'Teléfono de contacto', seccion: 'Datos para Facturación' },
  emailFac: { etiqueta: 'Correo electrónico', seccion: 'Datos para Facturación' },

  // Conformidad
  'conformidad.tipoConformidad': { etiqueta: 'Tipo de conformidad', seccion: 'Datos de Conformidad' },
  'conformidad.caracteristicaRegistrable': { etiqueta: 'Característica registrable', seccion: 'Datos de Conformidad' },
  'conformidad.usoOriginalVehiculo': { etiqueta: 'Uso original del vehículo', seccion: 'Datos de Conformidad' },

  // Pagos
  pagos: { etiqueta: 'Medios de pago', seccion: 'Pago' },
  precioTotal: { etiqueta: 'Importe del pago', seccion: 'Pago' },
  condicionPago: { etiqueta: 'Condición de pago', seccion: 'Pago' },
  fechaInicioCredito: { etiqueta: 'Fecha de inicio del crédito', seccion: 'Pago a Crédito' },
  fechaVencimientoCredito: { etiqueta: 'Fecha de vencimiento del crédito', seccion: 'Pago a Crédito' },
  cuotas: { etiqueta: 'Cuotas del crédito', seccion: 'Pago a Crédito' },
};

export const estructurarErroresPaso = (
  errores: ErroresCampo,
  seccionPorDefecto = 'Datos del Formulario'
): ErrorCampoWizard[] => {
  return Object.entries(errores)
    .filter(([_, mensaje]) => Boolean(mensaje && String(mensaje).trim()))
    .map(([campo, mensaje]) => {
      const info = ETIQUETAS_CAMPOS_WIZARD[campo];
      let etiqueta = info?.etiqueta || campo;
      let seccion = info?.seccion || seccionPorDefecto;

      if (campo.startsWith('titular.')) {
        const partes = campo.split('.');
        const indice = Number(partes[1]) + 1;
        const subcampo = partes[2];
        seccion = 'Titulares';
        etiqueta = `Titular ${indice} (${subcampo === 'nombreRazonSocial' ? 'Nombre o razón social' : subcampo === 'direccion' ? 'Dirección' : subcampo === 'nroDocumento' ? 'N° de documento' : subcampo})`;
      } else if (campo.startsWith('glp.componentes.')) {
        const partes = campo.split('.');
        const nombreComp = partes[2] || '';
        const subcampo = partes[3] || '';
        seccion = 'Componentes GLP';
        etiqueta = `${nombreComp} (${subcampo === 'capacidadLitros' ? 'Capacidad' : subcampo === 'numeroSerie' ? 'N° de serie' : subcampo === 'anioFabricacion' ? 'Año de fabricación' : subcampo})`;
      }

      return { campo, etiqueta, seccion, mensaje };
    });
};

/**
 * Desplaza la pantalla suavemente hacia el campo y le otorga foco.
 * Si el campo está dentro de un elemento plegable (details o aria-expanded="false"),
 * lo abre antes de realizar el desplazamiento.
 */
export const desplazarYEnfocarCampo = (campo?: string) => {
  if (typeof document === 'undefined') return;

  let elem: HTMLElement | null = null;
  if (campo) {
    elem = document.querySelector<HTMLElement>(
      `[data-campo-error="true"][name="${campo}"], [name="${campo}"], #${idMensajeError(campo)}`
    );
  }
  if (!elem) {
    elem = document.querySelector<HTMLElement>('[data-campo-error="true"]');
  }
  if (!elem) return;

  // Si está dentro de una sección plegable (<details> o con aria-expanded="false"), abrirla
  const details = elem.closest('details');
  if (details && !details.open) {
    details.open = true;
  }
  let parent: HTMLElement | null = elem.parentElement;
  while (parent && parent !== document.body) {
    if (parent.getAttribute('aria-expanded') === 'false') {
      parent.setAttribute('aria-expanded', 'true');
    }
    const botonColapso = parent.querySelector<HTMLButtonElement>('[data-toggle-collapse], [aria-expanded="false"]');
    if (botonColapso && botonColapso.getAttribute('aria-expanded') === 'false') {
      botonColapso.click();
    }
    parent = parent.parentElement;
  }

  elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const control = elem.matches('input,select,textarea')
    ? elem
    : elem.querySelector<HTMLElement>('input,select,textarea');
  if (control && typeof control.focus === 'function') {
    try { control.focus({ preventScroll: true }); } catch { control.focus(); }
  }
};

/**
 * Aplica el borde de error reemplazando el color de borde existente en vez de
 * añadir otro. Tailwind no resuelve el conflicto por el orden del atributo
 * class, sino por el orden de sus clases generadas: dos utilidades de borde
 * compiten y gana la que esté después en esa hoja. Sustituir la clase del color
 * es la única forma fiable de ganar sin reconfigurar el orden.
 */
export const claseConError = (claseBase: string, hayError: boolean): string => {
  if (!hayError) return claseBase;
  return `${claseBase.replace(/border-(?:slate|gray|red|green|amber|emerald)-?\d*/g, '').trim()} border-red-500`;
};

export const idMensajeError = (campo: string): string => `error-${campo}`;

/** Borde rojo + aviso para accesibilidad, en un solo punto reutilizable. */
export const estiloErrorCampo = (campo: string, errores: ErroresCampo) => ({
  'aria-invalid': errores[campo] ? true : undefined,
  'aria-describedby': errores[campo] ? idMensajeError(campo) : undefined,
} as const);

type PropsMensajeError = { campo: string; errores: ErroresCampo };

/** Mensaje individual bajo el campo. No renderiza nada si el campo es válido. */
export function MensajeError({ campo, errores }: PropsMensajeError) {
  const mensaje = errores[campo];
  if (!mensaje) return null;
  return (
    <p
      id={idMensajeError(campo)}
      role="alert"
      className="mt-1 text-xs font-semibold text-red-600"
    >
      {mensaje}
    </p>
  );
}

/**
 * Panel de resumen de errores visible al pulsar Siguiente Paso cuando faltan campos.
 */
export function PanelResumenErroresWizard({
  errores,
  onEnfocarCampo,
  onCerrar,
}: {
  errores: ErrorCampoWizard[];
  onEnfocarCampo?: (campo: string) => void;
  onCerrar?: () => void;
}) {
  if (!errores || errores.length === 0) return null;
  const total = errores.length;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 p-4 shadow-sm"
      data-testid="panel-resumen-errores"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-red-100 p-1.5 text-red-600 shrink-0 mt-0.5">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-black text-red-900">
            Falta{total > 1 ? 'n' : ''} {total} dato{total > 1 ? 's' : ''} para continuar
          </h4>
          <p className="mt-0.5 text-xs font-semibold text-red-700">
            No puedes continuar. Corrige los siguientes campos:
          </p>
          <ol className="mt-2.5 list-decimal space-y-1.5 pl-5 text-xs text-slate-800">
            {errores.map((item, index) => (
              <li
                key={item.campo + index}
                onClick={() => onEnfocarCampo?.(item.campo)}
                className="cursor-pointer font-medium hover:text-red-900 hover:underline"
                title="Haga clic para ir a este campo"
              >
                <span className="font-bold text-red-950">{item.etiqueta}:</span>{' '}
                <span className="text-slate-700">{item.mensaje}</span>
              </li>
            ))}
          </ol>
        </div>
        {onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1 text-slate-400 hover:bg-red-100 hover:text-red-700"
            title="Ocultar resumen"
            aria-label="Cerrar resumen de errores"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

type EstadoErrores = {
  errores: ErroresCampo;
  /** Guarda el resultado y devuelve true si hay al menos un error. */
  registrar: (errores: ErroresCampo) => boolean;
  /** Limpia únicamente el error de un campo, al corregirlo. */
  limpiarCampo: (campo: string) => void;
  limpiarTodo: () => void;
  /** Lleva la vista al primer campo marcado y le da foco si es posible. */
  enfocarPrimerError: () => void;
  /** Lleva la vista a un campo específico y le da foco. */
  enfocarCampo: (campo: string) => void;
  total: number;
};

/**
 * Estado de validación de un paso del asistente.
 *
 * Deliberadamente no guarda los datos: sólo recuerda qué campos están mal. El
 * autosave sigue funcionando con datos incompletos (guardar un borrador a medias
 * es válido); lo estricto es únicamente la acción de avanzar.
 */
export const useErroresPaso = (): EstadoErrores => {
  const [errores, setErrores] = useState<ErroresCampo>({});

  const registrar = useCallback((nuevos: ErroresCampo) => {
    setErrores(nuevos);
    return Object.keys(nuevos).length > 0;
  }, []);

  const limpiarCampo = useCallback((campo: string) => {
    setErrores((previos) => {
      if (!previos[campo]) return previos;
      const siguiente = { ...previos };
      delete siguiente[campo];
      return siguiente;
    });
  }, []);

  const limpiarTodo = useCallback(() => setErrores({}), []);

  const enfocarPrimerError = useCallback(() => {
    desplazarYEnfocarCampo();
  }, []);

  const enfocarCampo = useCallback((campo: string) => {
    desplazarYEnfocarCampo(campo);
  }, []);

  return useMemo(
    () => ({
      errores,
      registrar,
      limpiarCampo,
      limpiarTodo,
      enfocarPrimerError,
      enfocarCampo,
      total: Object.keys(errores).length,
    }),
    [errores, registrar, limpiarCampo, limpiarTodo, enfocarPrimerError, enfocarCampo]
  );
};

/** Atributos comunes a cualquier control: borde, foco y accesibilidad. */
export const propsCampo = (campo: string, errores: ErroresCampo, claseBase: string) => ({
  className: claseConError(claseBase, Boolean(errores[campo])),
  'data-campo-error': errores[campo] ? true : undefined,
  ...estiloErrorCampo(campo, errores),
});
