import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  tieneCertificadoDefinitivo,
  certificadoEmitidoVisible,
  puedeCrearSolicitudAnulacion,
  esSolicitudActivaAnulacion,
  esSolicitudCompletadaAnulacion,
  etiquetaSolicitudAnulacion,
  puedeSolicitarAnulacionCertificado,
  puedeCrearNotaCreditoPanel,
  type BorradorPanel,
} from './InicioView';

describe('InicioView - tieneCertificadoDefinitivo y visualización del número DG', () => {
  it('1. Retorna true cuando el certificado está EMITIDO y tiene un número DG válido', () => {
    const item: BorradorPanel = {
      id: 10,
      estado: 'EMITIDO',
      numeroCertificado: 'DG-41-000308',
    };
    expect(tieneCertificadoDefinitivo(item)).toBe(true);
  });

  it('2. Retorna true cuando el certificado está ANULADO y tiene un número DG válido', () => {
    const item: BorradorPanel = {
      id: 11,
      estado: 'ANULADO',
      numeroCertificado: 'DG-41-000308',
    };
    expect(tieneCertificadoDefinitivo(item)).toBe(true);
  });

  it('3. Retorna false cuando el certificado está en BORRADOR aunque tenga número preliminar', () => {
    const item: BorradorPanel = {
      id: 12,
      estado: 'BORRADOR',
      numeroCertificado: 'DG-41-000309',
    };
    expect(tieneCertificadoDefinitivo(item)).toBe(false);
  });

  it('4. Retorna false si no tiene número DG o es vacío/espacios', () => {
    expect(tieneCertificadoDefinitivo({ id: 13, estado: 'EMITIDO', numeroCertificado: null })).toBe(false);
    expect(tieneCertificadoDefinitivo({ id: 14, estado: 'EMITIDO', numeroCertificado: '' })).toBe(false);
    expect(tieneCertificadoDefinitivo({ id: 15, estado: 'EMITIDO', numeroCertificado: '   ' })).toBe(false);
    expect(tieneCertificadoDefinitivo({ id: 16, estado: 'ANULADO', numeroCertificado: null })).toBe(false);
  });

  it('5. No confunde el estado técnico con el estado fiscal', () => {
    // Caso: Comprobante ACEPTADO en SUNAT pero certificado aún en BORRADOR (no definitivo)
    const borradorConFactura: BorradorPanel = {
      id: 17,
      estado: 'BORRADOR',
      estadoFacturacion: 'ACEPTADO',
      aceptadaSunat: true,
      nroComprobante: 'B001-000001',
      numeroCertificado: 'DG-41-000310',
    };
    expect(tieneCertificadoDefinitivo(borradorConFactura)).toBe(false);

    // Caso: Certificado ANULADO técnicamente pero comprobante aún ACEPTADO fiscalmente
    const anuladoTecnicoFacturaActiva: BorradorPanel = {
      id: 18,
      estado: 'ANULADO',
      estadoFacturacion: 'ACEPTADO',
      aceptadaSunat: true,
      numeroCertificado: 'DG-41-000311',
    };
    expect(tieneCertificadoDefinitivo(anuladoTecnicoFacturaActiva)).toBe(true);

    // Caso: Certificado EMITIDO técnicamente pero comprobante pendiente de SUNAT
    const emitidoTecnicoFacturaPendiente: BorradorPanel = {
      id: 19,
      estado: 'EMITIDO',
      estadoFacturacion: 'PENDIENTE_SUNAT',
      numeroCertificado: 'DG-41-000312',
    };
    expect(tieneCertificadoDefinitivo(emitidoTecnicoFacturaPendiente)).toBe(true);
  });

  it('6. certificadoEmitidoVisible aplica estrictamente a EMITIDO para creación de solicitudes', () => {
    // Un certificado ANULADO no califica para certificadoEmitidoVisible (no puede solicitar nueva anulación)
    expect(certificadoEmitidoVisible({ id: 20, estado: 'ANULADO', numeroCertificado: 'DG-41-000308' })).toBe(false);
    expect(certificadoEmitidoVisible({ id: 21, estado: 'EMITIDO', numeroCertificado: 'DG-41-000308' })).toBe(true);
    expect(certificadoEmitidoVisible({ id: 22, estado: 'BORRADOR', numeroCertificado: 'DG-41-000308' })).toBe(false);
  });

  it('7. Regresión estática: verifica que InicioView.tsx define y utiliza tieneCertificadoDefinitivo correctamente', () => {
    const inicioViewCode = fs.readFileSync(path.resolve(__dirname, 'InicioView.tsx'), 'utf8');

    // Debe contener la declaración explícita de la función
    expect(inicioViewCode).toContain('const tieneCertificadoDefinitivo = (item: BorradorPanel)');

    // No debe haber llamadas a funciones desconocidas
    expect(inicioViewCode).not.toContain('tieneCertificadoDefinitivo is not defined');

    // Comprobar que en la vista de escritorio y móvil se invoca la función definida
    expect(inicioViewCode).toContain('tieneCertificadoDefinitivo(ins)');
  });

  it('8. Fase 4A unifica la acción administrativa sin retirar comprobante ni nota de crédito', () => {
    const inicioViewCode = fs.readFileSync(path.resolve(__dirname, 'InicioView.tsx'), 'utf8');
    const modalCode = fs.readFileSync(path.resolve(__dirname, 'SolicitudOperacionModal.tsx'), 'utf8');

    expect(inicioViewCode).not.toContain('const anularComprobante = async');
    expect(inicioViewCode).not.toContain('onClick={() => void anularComprobante(ins.id)}');
    expect(inicioViewCode).not.toContain('ClipboardSignature');
    expect(inicioViewCode).toContain('void verComprobante(ins.id)');
    expect(inicioViewCode).toContain('void crearNotaCredito(ins.id)');
    expect(inicioViewCode).toContain('<ClipboardX size={16} />');
    expect(inicioViewCode.match(/Solicitar anulación total — requiere autorización de Sistemas/g)?.length).toBe(2);

    expect(modalCode).toContain('Solicitar anulación total');
    expect(modalCode).toContain("tipoOperacion: 'ANULAR_AMBOS'");
    expect(modalCode).toContain('Enviar solicitud');
    expect(modalCode).not.toContain('RECTIFICAR_');
    expect(modalCode).not.toContain('ANULAR_CERTIFICADO');
    expect(modalCode).not.toContain('ANULAR_COMPROBANTE');
  });

  it('9. Fase 4C muestra la solicitud por permiso efectivo, sin depender del perfil', () => {
    expect(puedeCrearSolicitudAnulacion(['MENU_INICIO', 'FAREGAS_SOLICITUD_CREAR'])).toBe(true);
    expect(puedeCrearSolicitudAnulacion(['FAREGAS_SOLICITUD_CREAR', 'FAREGAS_SOLICITUD_APROBAR'])).toBe(true);
    expect(puedeCrearSolicitudAnulacion(['MENU_INICIO', 'FAREGAS_SOLICITUD_VER'])).toBe(false);
  });

  it('10. Fase 4C concentra el acceso en Inicio y agrupa permisos bajo Inicio', () => {
    const inicioViewCode = fs.readFileSync(path.resolve(__dirname, 'InicioView.tsx'), 'utf8');
    const auditoriaCode = fs.readFileSync(path.resolve(__dirname, '../Auditoria/AuditoriaView.tsx'), 'utf8');
    const usuariosCode = fs.readFileSync(path.resolve(__dirname, '../Usuarios/UsuariosView.tsx'), 'utf8');

    expect(inicioViewCode).toContain('Solicitudes de anulación');
    expect(inicioViewCode).toContain("navigate('/faregas/auditoria/solicitudes')");
    expect(inicioViewCode).not.toContain('Mis solicitudes');
    expect(auditoriaCode).not.toContain('Solicitudes de Anulación y Rectificación');
    expect(auditoriaCode).not.toContain('to="/faregas/auditoria/solicitudes"');
    expect(usuariosCode).toContain("const PERMISO_INICIO = 'MENU_INICIO'");
    expect(usuariosCode).toContain('SUBMODULOS_INICIO');
    expect(usuariosCode).not.toContain('Autorizaciones sensibles');
  });

  it('11. Bloque A: estados de solicitud administrativa y etiquetas del panel', () => {
    expect(esSolicitudActivaAnulacion('PENDIENTE_APROBACION')).toBe(true);
    expect(esSolicitudActivaAnulacion('APROBADA')).toBe(true);
    expect(esSolicitudActivaAnulacion('EN_EJECUCION')).toBe(true);
    expect(esSolicitudActivaAnulacion('REQUIERE_INTERVENCION')).toBe(true);
    expect(esSolicitudActivaAnulacion('COMPLETADA')).toBe(false);
    expect(esSolicitudActivaAnulacion('RECHAZADA')).toBe(false);
    expect(esSolicitudActivaAnulacion(null)).toBe(false);
    expect(esSolicitudCompletadaAnulacion('COMPLETADA')).toBe(true);
    expect(esSolicitudCompletadaAnulacion('PENDIENTE_APROBACION')).toBe(false);

    expect(etiquetaSolicitudAnulacion('PENDIENTE_APROBACION')).toBe('Pendiente de aprobación');
    expect(etiquetaSolicitudAnulacion('APROBADA')).toBe('Anulación autorizada');
    expect(etiquetaSolicitudAnulacion('EN_EJECUCION')).toBe('Procesando anulación');
    expect(etiquetaSolicitudAnulacion('REQUIERE_INTERVENCION')).toBe('Requiere intervención');
    expect(etiquetaSolicitudAnulacion('COMPLETADA')).toBe('Anulado');
  });

  it('12. Bloque A: el botón de anulación solo aparece sin solicitud activa ni completada', () => {
    const permisos = ['FAREGAS_SOLICITUD_CREAR'];

    expect(puedeSolicitarAnulacionCertificado({ id: 1, estado: 'EMITIDO', numeroCertificado: 'DG-41-0001', anulacionEnPlazo: true } as BorradorPanel, permisos)).toBe(true);
    expect(puedeSolicitarAnulacionCertificado({ id: 1, estado: 'EMITIDO', numeroCertificado: 'DG-41-0001', anulacionEnPlazo: false } as BorradorPanel, permisos)).toBe(false);
    expect(puedeSolicitarAnulacionCertificado({ id: 1, estado: 'EMITIDO', numeroCertificado: 'DG-41-0001', anulacionEnPlazo: true, solicitudOperacionEstado: 'PENDIENTE_APROBACION' } as BorradorPanel, permisos)).toBe(false);
    expect(puedeSolicitarAnulacionCertificado({ id: 1, estado: 'EMITIDO', numeroCertificado: 'DG-41-0001', anulacionEnPlazo: true, solicitudOperacionEstado: 'APROBADA' } as BorradorPanel, permisos)).toBe(false);
    expect(puedeSolicitarAnulacionCertificado({ id: 1, estado: 'EMITIDO', numeroCertificado: 'DG-41-0001', anulacionEnPlazo: true, solicitudOperacionEstado: 'EN_EJECUCION' } as BorradorPanel, permisos)).toBe(false);
    expect(puedeSolicitarAnulacionCertificado({ id: 1, estado: 'EMITIDO', numeroCertificado: 'DG-41-0001', anulacionEnPlazo: true, solicitudOperacionEstado: 'REQUIERE_INTERVENCION' } as BorradorPanel, permisos)).toBe(false);
    expect(puedeSolicitarAnulacionCertificado({ id: 1, estado: 'EMITIDO', numeroCertificado: 'DG-41-0001', anulacionEnPlazo: true, solicitudOperacionEstado: 'COMPLETADA' } as BorradorPanel, permisos)).toBe(false);
    // Una solicitud rechazada o cancelada permite reabrir la solicitud nueva.
    expect(puedeSolicitarAnulacionCertificado({ id: 1, estado: 'EMITIDO', numeroCertificado: 'DG-41-0001', anulacionEnPlazo: true, solicitudOperacionEstado: 'RECHAZADA' } as BorradorPanel, permisos)).toBe(true);
  });

  it('13. Bloque A: notas de crédito congeladas durante una solicitud activa o completada', () => {
    const permisos = ['FAREGAS_NOTA_CREDITO'];

    expect(puedeCrearNotaCreditoPanel({ id: 1, estado: 'EMITIDO', estadoFacturacion: 'ACEPTADO', aceptadaSunat: true, anulacionEnPlazo: false } as BorradorPanel, permisos)).toBe(true);
    expect(puedeCrearNotaCreditoPanel({ id: 1, estado: 'EMITIDO', estadoFacturacion: 'ACEPTADO', aceptadaSunat: true, anulacionEnPlazo: true } as BorradorPanel, permisos)).toBe(false);
    expect(puedeCrearNotaCreditoPanel({ id: 1, estado: 'EMITIDO', estadoFacturacion: 'ACEPTADO', aceptadaSunat: true, anulacionEnPlazo: false, solicitudOperacionEstado: 'PENDIENTE_APROBACION' } as BorradorPanel, permisos)).toBe(false);
    expect(puedeCrearNotaCreditoPanel({ id: 1, estado: 'EMITIDO', estadoFacturacion: 'ACEPTADO', aceptadaSunat: true, anulacionEnPlazo: false, solicitudOperacionEstado: 'COMPLETADA' } as BorradorPanel, permisos)).toBe(false);
  });

  it('14. Bloque A: el indicador abre la solicitud existente y no el formulario de creación', () => {
    const modalCode = fs.readFileSync(path.resolve(__dirname, 'SolicitudOperacionModal.tsx'), 'utf8');
    expect(modalCode).toContain('faregasSolicitudesOperacionApi.obtener(solicitudId)');
    expect(modalCode).toContain('Detalle de la solicitud de anulación');
  });
});
