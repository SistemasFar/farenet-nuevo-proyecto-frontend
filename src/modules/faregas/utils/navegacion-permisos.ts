import { tieneAccesoDashboard } from '../views/Dashboard/dashboard-config';
import { puedeAbrirChipsFaregas } from './chips-permisos';
import { puedeAbrirFacturacionFaregas } from './facturacion-permisos';
import {
  puedeAbrirConfiguracionFaregas,
  resolverPermisosConfiguracionFaregas,
} from './configuracion-permisos';

/**
 * Resuelve la primera ruta autorizada para un usuario en FAREGAS según
 * los permisos efectivos configurados en su perfil.
 *
 * Orden de evaluación prioritario (según especificación y visibilidad en Sidebar):
 * 1. Inicio (si tiene MENU_INICIO)
 * 2. Dashboard (si tiene MENU_DASHBOARD)
 * 3. Inventario / Chips (si tiene submódulos de chips autorizados)
 *    - Inventario -> /faregas/chips?tab=inventario
 *    - Tipos de Producto -> /faregas/chips?tab=productos
 *    - Ventas -> /faregas/chips?tab=ventas
 * 4. Facturación (si tiene submódulos de facturación autorizados)
 *    - Series -> /faregas/facturacion?tab=series
 *    - Comprobantes -> /faregas/facturacion?tab=documentos
 *    - Clientes -> /faregas/facturacion?tab=clientes
 * 5. Configuración (si tiene submódulos de configuración autorizados)
 *    - Primer submódulo activo (sedes, catalogo, tarifas, correlativos, empresas)
 * 6. Descuentos (si tiene MENU_DESCUENTOS)
 * 7. Usuarios (si tiene MENU_USUARIOS)
 * 8. Auditoría (si tiene MENU_AUDITORIA)
 *
 * Si el usuario no tiene ningún módulo autorizado, retorna `null`.
 */
export function resolverRutaInicialFaregas(permisos: readonly string[] = []): string | null {
  const lista = Array.isArray(permisos) ? permisos : [];

  // 1. Inicio
  if (lista.includes('MENU_INICIO')) {
    return '/faregas/inicio';
  }

  // 2. Dashboard
  if (tieneAccesoDashboard(lista as string[])) {
    return '/faregas/dashboard';
  }

  // 3. Inventario / Chips
  if (puedeAbrirChipsFaregas(lista)) {
    if (lista.includes('MENU_CHIPS_INVENTARIO')) {
      return '/faregas/chips?tab=inventario';
    }
    if (lista.includes('MENU_CHIPS_TIPOS')) {
      return '/faregas/chips?tab=productos';
    }
    if (lista.includes('MENU_CHIPS_VENTAS')) {
      return '/faregas/chips?tab=ventas';
    }
    return '/faregas/chips';
  }

  // 4. Facturación
  if (puedeAbrirFacturacionFaregas(lista)) {
    if (lista.includes('MENU_FACTURACION_SERIES')) {
      return '/faregas/facturacion?tab=series';
    }
    if (lista.includes('MENU_FACTURACION_COMPROBANTES')) {
      return '/faregas/facturacion?tab=documentos';
    }
    if (lista.includes('MENU_FACTURACION_CLIENTES')) {
      return '/faregas/facturacion?tab=clientes';
    }
    return '/faregas/facturacion';
  }

  // 5. Configuración
  if (puedeAbrirConfiguracionFaregas(lista)) {
    const { tabs } = resolverPermisosConfiguracionFaregas(lista);
    const primerTab = tabs[0]?.id;
    if (primerTab) {
      return `/faregas/configuracion?tab=${primerTab.toLowerCase()}`;
    }
    return '/faregas/configuracion';
  }

  // 6. Descuentos
  if (lista.includes('MENU_DESCUENTOS')) {
    return '/faregas/descuentos';
  }

  // 7. Usuarios
  if (lista.includes('MENU_USUARIOS')) {
    return '/faregas/usuarios';
  }

  // 8. Auditoría
  if (lista.includes('MENU_AUDITORIA')) {
    return '/faregas/auditoria';
  }

  return null;
}

/**
 * Comprueba si una ruta específica de FAREGAS está autorizada para un conjunto de permisos.
 */
export function tieneAccesoRutaFaregas(pathname: string, permisos: readonly string[] = []): boolean {
  const lista = Array.isArray(permisos) ? permisos : [];
  const normalizado = pathname.replace(/\/+$/, '') || '/';

  // Si es la raíz de faregas, depende de si tiene al menos un módulo inicial
  if (normalizado === '/faregas') {
    return resolverRutaInicialFaregas(lista) !== null;
  }

  // Ruta de selección de planta siempre permitida dentro del flujo de autenticación
  if (normalizado === '/faregas/seleccionar-planta') {
    return true;
  }

  // Inicio y asistentes de certificado
  if (
    normalizado === '/faregas/inicio' ||
    normalizado === '/faregas/certificados/nuevo' ||
    /^\/faregas\/certificados\/[^/]+\/(continuar|rectificar)$/.test(normalizado)
  ) {
    return lista.includes('MENU_INICIO');
  }

  // Dashboard
  if (normalizado === '/faregas/dashboard') {
    return tieneAccesoDashboard(lista as string[]);
  }

  // Reportes financieros (Dashboard + exportar)
  if (normalizado === '/faregas/reportes-financieros') {
    return tieneAccesoDashboard(lista as string[]) && lista.includes('DASHBOARD_EXPORTAR');
  }

  // Chips / Inventario
  if (normalizado === '/faregas/chips') {
    return puedeAbrirChipsFaregas(lista);
  }

  // Facturación
  if (normalizado === '/faregas/facturacion') {
    return puedeAbrirFacturacionFaregas(lista);
  }

  // Configuración
  if (normalizado === '/faregas/configuracion') {
    return puedeAbrirConfiguracionFaregas(lista);
  }

  // Descuentos
  if (normalizado === '/faregas/descuentos') {
    return lista.includes('MENU_DESCUENTOS');
  }

  // Usuarios
  if (normalizado === '/faregas/usuarios') {
    return lista.includes('MENU_USUARIOS');
  }

  // Auditoría
  if (normalizado === '/faregas/auditoria') {
    return lista.includes('MENU_AUDITORIA');
  }

  // Auditoría de solicitudes
  if (normalizado === '/faregas/auditoria/solicitudes') {
    return lista.includes('FAREGAS_SOLICITUD_VER') || lista.includes('FAREGAS_SOLICITUD_ADMINISTRAR');
  }

  // Solicitudes de operación
  if (/^\/faregas\/solicitudes-operacion\/[^/]+$/.test(normalizado)) {
    return (
      lista.includes('FAREGAS_SOLICITUD_VER') ||
      lista.includes('FAREGAS_SOLICITUD_APROBAR') ||
      lista.includes('FAREGAS_SOLICITUD_RECHAZAR') ||
      lista.includes('FAREGAS_SOLICITUD_ADMINISTRAR')
    );
  }

  return false;
}

/**
 * Determina el botón y destino adecuado para ForbiddenView según los permisos del usuario.
 */
export function resolverAccionForbidden(permisos: readonly string[] = []): {
  ruta: string | null;
  label: string;
} {
  const ruta = resolverRutaInicialFaregas(permisos);
  if (!ruta) {
    return { ruta: null, label: 'Cerrar sesión' };
  }
  if (ruta.startsWith('/faregas/inicio')) {
    return { ruta, label: 'Volver al Inicio' };
  }
  if (ruta.startsWith('/faregas/dashboard')) {
    return { ruta, label: 'Ir al Dashboard' };
  }
  return { ruta, label: 'Ir a mi módulo' };
}

