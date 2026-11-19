import type { DashboardTabId } from './hooks/useFaregasDashboardData';

export const DASHBOARD_TAB_CONFIG: ReadonlyArray<{ id: DashboardTabId; label: string; descripcion: string }> = [
  { id: 'resumen', label: 'Resumen General', descripcion: 'Panorama ejecutivo' },
  { id: 'ventas', label: 'Ventas y Productos', descripcion: 'Importes, unidades y productividad' },
  { id: 'certificados', label: 'Certificados', descripcion: 'Tipos, estados y evolución' },
  { id: 'cobranza', label: 'Cobranza y Facturación', descripcion: 'Pagos, saldos y comprobantes' }
];

export function resolverPermisosDashboard(permisos: string[] = [], _perfilId?: string | null) {
  void _perfilId;
  const tieneAcceso = tieneAccesoDashboard(permisos);
  return {
    puedeVerGlobal: tieneAcceso && (permisos || []).includes('DASHBOARD_GLOBAL'),
    puedeExportar: tieneAcceso && (permisos || []).includes('DASHBOARD_EXPORTAR')
  };
}

export const tieneAccesoDashboard = (permisos: string[] = []): boolean => (
  (permisos || []).includes('MENU_DASHBOARD')
);
