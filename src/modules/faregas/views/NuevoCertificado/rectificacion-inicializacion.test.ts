import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { obtenerPasoWizard, validarCargaRectificacion } from './rectificacion-inicializacion';

const fuenteWizard = readFileSync(new URL('./NuevoCertificadoView.tsx', import.meta.url), 'utf8');
const fuenteApiRectificacion = readFileSync(new URL('../../services/faregas-rectificaciones.api.ts', import.meta.url), 'utf8');

const certificadoValido = (tipo: string) => ({
  estado: 'EMITIDO',
  tipo: { clave: tipo },
  servicio: {
    codigo: tipo === 'CONFORMIDAD' ? '0391' : tipo === 'GNV_ANUAL' ? '0121' : '0122',
    nombre: `SERVICIO ${tipo}`,
    tipoFlujo: 'CERTIFICACION'
  },
  vehiculo: { placa: 'ABC123', categoria: 'M1' }
});

describe('inicialización del modo rectificación', () => {
  it.each(['GLP_ANUAL', 'GNV_ANUAL', 'CONFORMIDAD'])(
    'acepta un certificado emitido %s con servicio y datos originales',
    (tipo) => {
      expect(validarCargaRectificacion(certificadoValido(tipo))).toBeNull();
    }
  );

  it('tolera que el catálogo visual todavía no esté cargado porque usa el servicio persistido', () => {
    const datos = certificadoValido('GLP_ANUAL');

    expect(validarCargaRectificacion(datos)).toBeNull();
  });

  it('informa específicamente un servicio persistido incompleto', () => {
    expect(validarCargaRectificacion({
      ...certificadoValido('GLP_ANUAL'),
      servicio: null
    })).toContain('servicio operativo completo');
  });

  it('informa específicamente cuando faltan los datos originales del vehículo', () => {
    expect(validarCargaRectificacion({
      ...certificadoValido('GNV_ANUAL'),
      vehiculo: null
    })).toContain('registro original del vehículo');
  });

  it('acepta una inspección de taller sin registro vehicular', () => {
    expect(validarCargaRectificacion({
      estado: 'EMITIDO',
      tipo: { clave: 'GLP_ANUAL' },
      servicio: { codigo: '0422', nombre: 'INSPECCIÓN DE TALLER GLP', tipoFlujo: 'TALLER_INSPECCION' },
      vehiculo: null
    })).toBeNull();
  });

  it('no intenta leer id cuando el índice anterior queda fuera del wizard de rectificación', () => {
    const pasosRectificacion = [
      { id: 'datos_iniciales' },
      { id: 'vehiculo' },
      { id: 'previsualizacion' },
      { id: 'rectificacion' }
    ];

    expect(obtenerPasoWizard(pasosRectificacion, 4)).toBeNull();
    expect(obtenerPasoWizard(pasosRectificacion, 0)?.id).toBe('datos_iniciales');
  });

  it('reinicia la instancia del wizard cuando cambia la ruta entre consulta y rectificación', () => {
    expect(fuenteWizard).toContain('<NuevoCertificadoWizard key={location.pathname} />');
  });

  it('espera la carga del certificado y del contexto antes de renderizar sus pasos', () => {
    expect(fuenteWizard).toContain('loadingRegistro || loadingContextoRectificacion');
    expect(fuenteWizard).toContain('const pasoActual = obtenerPasoWizard(STEPS, currentStepIndex)');
    expect(fuenteWizard).not.toContain("{STEPS[currentStepIndex].id === 'rectificacion'");
  });

  it('confirma directamente sin crear una solicitud pendiente ni pasar por pago o facturación', () => {
    expect(fuenteWizard).toContain('faregasRectificacionesApi.ejecutarDirecta');
    expect(fuenteWizard).toContain('GUARDAR RECTIFICACIÓN Y EMITIR CERTIFICADO');
    expect(fuenteWizard).not.toContain('enviarSolicitudRectificacion');
    expect(fuenteApiRectificacion).toContain('/rectificacion/directa');
    expect(fuenteWizard).toContain("{ id: 'rectificacion', label: 'Confirmar Rectificación'");
  });
});
