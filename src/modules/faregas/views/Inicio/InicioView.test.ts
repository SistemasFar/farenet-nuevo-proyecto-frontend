import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

// Preservar el comportamiento original de la regla de 24 horas en las pruebas:
// VITE_NOTA_CREDITO_SIN_PLAZO_24H no está definido (o es false) por defecto.
try {
  import.meta.env.VITE_NOTA_CREDITO_SIN_PLAZO_24H = undefined;
} catch (_e) {
  // import.meta.env puede ser de solo lectura en algunos entornos de prueba
}

import {
  tieneCertificadoDefinitivo,
  certificadoEmitidoVisible,
  puedeCrearSolicitudAnulacion,
  esSolicitudActivaAnulacion,
  esSolicitudCompletadaAnulacion,
  etiquetaSolicitudAnulacion,
  etiquetaSolicitudOperacionPanel,
  puedeSolicitarAnulacionCertificado,
  puedeCrearNotaCreditoPanel,
  motivoNotaCreditoNoDisponible,
  certificadoImporteFinalCero,
  certificadoAnulacionBloqueadaPorImporte,
  mensajeBloqueoAnulacionCertificado,
  type BorradorPanel,
} from './InicioView';
import { esSimulacionNotaCreditoDG41000444, resolverFechaEvaluacionNotaCreditoPanel, usaFechaSimuladaNotaCreditoDG41000444 } from './nota-credito-simulacion';
import { esMotivoAnulacionNotaCredito } from '../../utils/documentos-electronicos';
import { fechaFiscalEsAnteriorALima, fechaFiscalEsHoyLima } from '../../utils/fecha-fiscal-dia';

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
    expect(inicioViewCode).toContain('crearNotaCredito(');
    expect(inicioViewCode).toContain('mensajeBloqueoAnulacionCertificado(ins)');
    expect(inicioViewCode).toContain('<ClipboardX size={16} />');
    expect(inicioViewCode.match(/Solicitar anulación total — requiere autorización de un usuario con permiso para aprobar/g)?.length).toBe(2);

    expect(modalCode).toContain('Solicitar anulación total');
    expect(modalCode).toContain("tipoOperacion: esSolicitudNotaCredito ? 'EMITIR_NOTA_CREDITO' : 'ANULAR_AMBOS'");
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
    expect(etiquetaSolicitudAnulacion('APROBADA')).toBe('Aprobada — pendiente de ejecución');
    expect(etiquetaSolicitudAnulacion('EN_EJECUCION')).toBe('Baja fiscal pendiente de confirmación');
    expect(etiquetaSolicitudAnulacion('REQUIERE_INTERVENCION')).toBe('Requiere intervención');
    expect(etiquetaSolicitudAnulacion('COMPLETADA')).toBe('Anulado');
  });

  it('11b. Inicio muestra el estado real del trabajo automático de nota de crédito', () => {
    const base = {
      id: 710,
      solicitudOperacionTipo: 'EMITIR_NOTA_CREDITO',
      solicitudOperacionEstado: 'APROBADA',
    } as BorradorPanel;
    expect(etiquetaSolicitudOperacionPanel({
      ...base,
      solicitudOperacionResultadoFiscal: { estado: 'AUTORIZADA_EN_COLA' },
    })).toBe('Nota autorizada — en cola');
    expect(etiquetaSolicitudOperacionPanel({
      ...base,
      solicitudOperacionResultadoFiscal: { estado: 'ESPERANDO_COMPROBANTE' },
    })).toBe('Nota autorizada — esperando confirmación del comprobante');
    expect(etiquetaSolicitudOperacionPanel({
      ...base,
      solicitudOperacionResultadoFiscal: { estado: 'BLOQUEADA' },
    })).toBe('Emisión de nota bloqueada');
    expect(etiquetaSolicitudOperacionPanel({
      ...base,
      solicitudOperacionResultadoFiscal: { estado: 'RESULTADO_INCIERTO' },
    })).toBe('Resultado de nota incierto — pendiente de consulta');
  });

  it('12. Bloque A: el botón de anulación solo aparece sin solicitud activa ni completada', () => {
    const permisos = ['FAREGAS_SOLICITUD_CREAR'];
    const base: BorradorPanel = {
      id: 1, estado: 'EMITIDO', numeroCertificado: 'DG-41-0001', facturacionId: 44,
      fechaDocumentoFiscal: '2026-11-06', estadoFacturacion: 'ACEPTADO', aceptadaSunat: true,
    };

    expect(puedeSolicitarAnulacionCertificado(base, permisos, '2026-11-06')).toBe(true);
    expect(puedeSolicitarAnulacionCertificado({ ...base, fechaDocumentoFiscal: '2026-11-05' }, permisos, '2026-11-06')).toBe(false);
    expect(puedeSolicitarAnulacionCertificado({ ...base, solicitudOperacionEstado: 'PENDIENTE_APROBACION' }, permisos, '2026-11-06')).toBe(false);
    expect(puedeSolicitarAnulacionCertificado({ ...base, solicitudOperacionEstado: 'APROBADA' }, permisos, '2026-11-06')).toBe(false);
    expect(puedeSolicitarAnulacionCertificado({ ...base, solicitudOperacionEstado: 'EN_EJECUCION' }, permisos, '2026-11-06')).toBe(false);
    expect(puedeSolicitarAnulacionCertificado({ ...base, solicitudOperacionEstado: 'REQUIERE_INTERVENCION' }, permisos, '2026-11-06')).toBe(false);
    expect(puedeSolicitarAnulacionCertificado({ ...base, solicitudOperacionEstado: 'COMPLETADA' }, permisos, '2026-11-06')).toBe(false);
    // Una solicitud rechazada o cancelada permite reabrir la solicitud nueva.
    expect(puedeSolicitarAnulacionCertificado({ ...base, solicitudOperacionEstado: 'RECHAZADA' }, permisos, '2026-11-06')).toBe(true);
  });

  it('13. Bloque A: notas de crédito congeladas durante una solicitud activa o completada', () => {
    const permisos = ['FAREGAS_NOTA_CREDITO'];
    const base: BorradorPanel = {
      id: 1, estado: 'EMITIDO', facturacionId: 2, fechaDocumentoFiscal: '2026-11-05',
      estadoFacturacion: 'ACEPTADO', aceptadaSunat: true,
    };

    expect(puedeCrearNotaCreditoPanel(base, permisos, '2026-11-06')).toBe(true);
    expect(puedeCrearNotaCreditoPanel({ ...base, fechaDocumentoFiscal: '2026-11-06' }, permisos, '2026-11-06')).toBe(false);
    expect(puedeCrearNotaCreditoPanel({ ...base, solicitudOperacionEstado: 'PENDIENTE_APROBACION' }, permisos, '2026-11-06')).toBe(false);
    expect(puedeCrearNotaCreditoPanel({ ...base, solicitudOperacionEstado: 'COMPLETADA' }, permisos, '2026-11-06')).toBe(false);
    expect(puedeCrearNotaCreditoPanel({ ...base, notaCreditoId: 8, estadoNotaCredito: 'ACEPTADA' }, permisos, '2026-11-06')).toBe(false);
  });

  it('18. Alterna según fecha fiscal y no habilita notas para estados fiscales no operables', () => {
    const permisosAnular = ['FAREGAS_SOLICITUD_CREAR'];
    const permisosNota = ['FAREGAS_NOTA_CREDITO'];
    const base: BorradorPanel = {
      id: 1, facturacionId: 55, estado: 'EMITIDO', numeroCertificado: 'DG-41-1',
      fechaDocumentoFiscal: '2026-11-06', estadoFacturacion: 'ACEPTADO', aceptadaSunat: true,
    };
    expect(puedeSolicitarAnulacionCertificado(base, permisosAnular, '2026-11-06')).toBe(true);
    expect(puedeCrearNotaCreditoPanel(base, permisosNota, '2026-11-06')).toBe(false);
    expect(puedeSolicitarAnulacionCertificado(base, permisosAnular, '2026-11-07')).toBe(false);
    expect(puedeCrearNotaCreditoPanel({ ...base, fechaDocumentoFiscal: '2026-11-05' }, permisosNota, '2026-11-06')).toBe(true);
    expect(puedeCrearNotaCreditoPanel({ ...base, fechaDocumentoFiscal: '2026-11-01' }, permisosNota, '2026-11-06')).toBe(true);

    const demoPendiente: BorradorPanel = {
      ...base, fechaDocumentoFiscal: '2026-11-05', estadoFacturacion: 'PENDIENTE_SUNAT', aceptadaSunat: null,
      entornoFacturador: 'DEMO', facturacionProveedor: 'NUBEFACT', facturacionSerie: 'BBB1',
      facturacionNumero: 282, nroComprobante: 'BBB1-00000282', enlacePdf: 'pdf', enlaceXml: 'xml',
    };
    expect(puedeCrearNotaCreditoPanel(demoPendiente, permisosNota, '2026-11-06')).toBe(true);
    const pendienteProduccion = { ...demoPendiente, entornoFacturador: 'PRODUCCION' };
    expect(puedeCrearNotaCreditoPanel(pendienteProduccion, permisosNota, '2026-11-06')).toBe(false);
    expect(motivoNotaCreditoNoDisponible(pendienteProduccion, permisosNota, '2026-11-06')).toContain('pendiente de aceptación SUNAT');
    expect(puedeCrearNotaCreditoPanel({ ...base, estadoFacturacion: 'RECHAZADO', aceptadaSunat: false, fechaDocumentoFiscal: '2026-11-05' }, permisosNota, '2026-11-06')).toBe(false);
    expect(motivoNotaCreditoNoDisponible({ ...base, estadoFacturacion: 'RECHAZADO', aceptadaSunat: false, fechaDocumentoFiscal: '2026-11-05' }, permisosNota, '2026-11-06')).toContain('rechazado');
    expect(puedeCrearNotaCreditoPanel({ ...base, estadoFacturacion: 'ANULADO', fechaDocumentoFiscal: '2026-11-05' }, permisosNota, '2026-11-06')).toBe(false);
    expect(puedeSolicitarAnulacionCertificado({ ...base, fechaDocumentoFiscal: null }, permisosAnular, '2026-11-06')).toBe(false);
    expect(motivoNotaCreditoNoDisponible({ ...base, fechaDocumentoFiscal: null }, permisosNota, '2026-11-06')).toContain('fecha fiscal verificable');
    expect(puedeCrearNotaCreditoPanel({ ...base, fechaDocumentoFiscal: '2026-11-05' }, [], '2026-11-06')).toBe(false);
    expect(motivoNotaCreditoNoDisponible({ ...base, fechaDocumentoFiscal: '2026-11-05' }, [], '2026-11-06')).toBe(null);
    expect(puedeCrearNotaCreditoPanel({ ...base, fechaDocumentoFiscal: '2026-11-05', notaCreditoId: 3, estadoNotaCredito: 'PENDIENTE' }, permisosNota, '2026-11-06')).toBe(false);
    expect(motivoNotaCreditoNoDisponible({ ...base, fechaDocumentoFiscal: '2026-11-05', notaCreditoId: 3, estadoNotaCredito: 'PENDIENTE' }, permisosNota, '2026-11-06')).toContain('Ya existe una nota');
  });

  it('19. Normaliza la fecha DATE serializada por PostgreSQL como ISO en la zona de Lima', () => {
    const serializada = '2026-11-05T05:00:00.000Z';
    expect(fechaFiscalEsAnteriorALima(serializada, '2026-11-06')).toBe(true);
    expect(fechaFiscalEsHoyLima(serializada, '2026-11-05')).toBe(true);
    expect(fechaFiscalEsHoyLima(null, '2026-11-05')).toBe(false);
  });

  it('14. Bloque A: el indicador abre la solicitud existente y no el formulario de creación', () => {
    const modalCode = fs.readFileSync(path.resolve(__dirname, 'SolicitudOperacionModal.tsx'), 'utf8');
    expect(modalCode).toContain('faregasSolicitudesOperacionApi.obtener(solicitudId)');
    expect(modalCode).toContain('Detalle de la solicitud');
  });

  it('15. El detalle del Panel permite ejecutar/autoejecutar y advierte el estado PENDIENTE_SUNAT', () => {
    const modalCode = fs.readFileSync(path.resolve(__dirname, 'SolicitudOperacionModal.tsx'), 'utf8');
    expect(modalCode).toContain('ejecutarAnulacionTotal');
    expect(modalCode).toContain('Autoejecutar (excepcional)');
    expect(modalCode).toContain('sincronizarEstadoFiscal');
    expect(modalCode).toContain('PENDIENTE_SUNAT');
    expect(modalCode).toContain('aún no se ejecutó');
  });

  it('16. El importe final cero o no determinable bloquea la anulación y la nota de anulación', () => {
    expect(certificadoImporteFinalCero({ importeFinal: 0 } as BorradorPanel)).toBe(true);
    expect(certificadoImporteFinalCero({ importeFinal: '0.00' } as BorradorPanel)).toBe(true);
    expect(certificadoImporteFinalCero({ importeFinal: 80 } as BorradorPanel)).toBe(false);
    expect(certificadoImporteFinalCero({ importeFinal: null } as BorradorPanel)).toBe(false);
    expect(certificadoAnulacionBloqueadaPorImporte({
      importeFinal: null,
      anulacionImporteNoDeterminable: true,
    } as BorradorPanel)).toBe(true);
    expect(mensajeBloqueoAnulacionCertificado({ anulacionImporteNoDeterminable: true } as BorradorPanel))
      .toContain('No se pudo determinar el importe final');
    expect(mensajeBloqueoAnulacionCertificado({} as BorradorPanel))
      .toContain('S/ 0.00');

    const permisos = ['FAREGAS_SOLICITUD_CREAR'];
    expect(puedeSolicitarAnulacionCertificado({
      id: 1,
      estado: 'EMITIDO',
      numeroCertificado: 'DG-41-0001',
      anulacionEnPlazo: true,
      importeFinal: 0,
    } as BorradorPanel, permisos)).toBe(false);
    expect(puedeSolicitarAnulacionCertificado({
      id: 1,
      estado: 'EMITIDO',
      numeroCertificado: 'DG-41-0001',
      anulacionEnPlazo: true,
      importeFinal: null,
      anulacionImporteNoDeterminable: true,
    } as BorradorPanel, permisos)).toBe(false);

    expect(esMotivoAnulacionNotaCredito('01')).toBe(true);
    expect(esMotivoAnulacionNotaCredito('02')).toBe(true);
    expect(esMotivoAnulacionNotaCredito('03')).toBe(false);

    const inicioViewCode = fs.readFileSync(path.resolve(__dirname, 'InicioView.tsx'), 'utf8');
    const modalCode = fs.readFileSync(path.resolve(__dirname, 'SolicitudOperacionModal.tsx'), 'utf8');
    expect(inicioViewCode).toContain('certificadoAnulacionBloqueadaPorImporte');
    expect(inicioViewCode).toContain('Anulación no disponible');
    expect(modalCode).toContain('Anulación bloqueada');
  });

  it('17. muestra la descarga naranja solo cuando la nota tiene PDF persistido', () => {
    const inicioViewCode = fs.readFileSync(path.resolve(__dirname, 'InicioView.tsx'), 'utf8');
    expect(inicioViewCode).toContain('notaCreditoPdfDisponible');
    expect(inicioViewCode).toContain('abrirPdfNotaCreditoNubefact');
    expect(inicioViewCode).toContain('Ver / Descargar nota de crédito');
    expect(inicioViewCode).toContain('border-orange-300 bg-orange-50');
    expect(inicioViewCode).toContain('puedeVerNotaCredito && ins.notaCreditoId');
  });
});

describe('InicioView - simulación temporal y aislada de Nota de Crédito', () => {
  const objetivo: BorradorPanel = {
    id: 808,
    numeroCertificado: 'DG-41-000444',
    facturacionId: 1132,
    estado: 'EMITIDO',
    fechaDocumentoFiscal: '2026-11-11',
    estadoFacturacion: 'PENDIENTE_SUNAT',
    aceptadaSunat: null,
    entornoFacturador: 'DEMO',
    facturacionProveedor: 'NUBEFACT',
    facturacionSerie: 'BBB1',
    facturacionNumero: 320,
    nroComprobante: 'BBB1-00000320',
    enlacePdf: 'pdf-demo',
    enlaceXml: 'xml-demo',
  };
  const activaDesarrollo = { habilitada: true, modoDesarrollo: true };

  it('habilita visualmente solo el certificado objetivo usando la fecha simulada', () => {
    const fecha = resolverFechaEvaluacionNotaCreditoPanel(objetivo, '2026-11-11', activaDesarrollo);
    expect(fecha).toBe('2026-11-12');
    expect(usaFechaSimuladaNotaCreditoDG41000444(objetivo, '2026-11-11', activaDesarrollo)).toBe(true);
    expect(puedeCrearNotaCreditoPanel(objetivo, ['FAREGAS_NOTA_CREDITO'], fecha)).toBe(true);

    const otro = { ...objetivo, id: 809, numeroCertificado: 'DG-41-000445', facturacionId: 1133 };
    expect(resolverFechaEvaluacionNotaCreditoPanel(otro, '2026-11-11', activaDesarrollo)).toBe('2026-11-11');
    expect(puedeCrearNotaCreditoPanel(otro, ['FAREGAS_NOTA_CREDITO'], '2026-11-11')).toBe(false);
    expect(resolverFechaEvaluacionNotaCreditoPanel(objetivo, '2026-11-12', activaDesarrollo)).toBe('2026-11-12');
    expect(usaFechaSimuladaNotaCreditoDG41000444(objetivo, '2026-11-12', activaDesarrollo)).toBe(false);
  });

  it('permanece desactivada por defecto, en producción y para usuarios sin permiso', () => {
    expect(esSimulacionNotaCreditoDG41000444(objetivo, { habilitada: false, modoDesarrollo: true })).toBe(false);
    expect(esSimulacionNotaCreditoDG41000444(objetivo, { habilitada: true, modoDesarrollo: false })).toBe(false);
    const fecha = resolverFechaEvaluacionNotaCreditoPanel(objetivo, '2026-11-11', activaDesarrollo);
    expect(puedeCrearNotaCreditoPanel(objetivo, [], fecha)).toBe(false);
  });
});
