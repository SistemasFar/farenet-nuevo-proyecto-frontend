import type { DashboardTabId } from './hooks/useFaregasDashboardData';

export const DASHBOARD_TAB_CONFIG: ReadonlyArray<{ id: DashboardTabId; label: string; descripcion: string }> = [
  { id: 'resumen', label: 'Resumen General', descripcion: 'Panorama ejecutivo' },
  { id: 'ventas', label: 'Ventas y Productos', descripcion: 'Importes, unidades y productividad' },
  { id: 'certificados', label: 'Certificados', descripcion: 'Tipos, estados y evolución' },
  { id: 'cobranza', label: 'Cobranza y Facturación', descripcion: 'Pagos, saldos y comprobantes' }
];

export function resolverPermisosDashboard(permisos: string[] = [], perfilId?: string | null) {
  const p = String(perfilId || '').trim().toUpperCase();
  const esSistemas = p === 'SISTEMAS' || p === 'AMINISTRADOR' || p === 'ADMINISTRADOR';
  const esSupervisor = p === 'SUPERVISOR';
  return {
    puedeVerGlobal: (permisos || []).includes('DASHBOARD_GLOBAL') || esSistemas || esSupervisor,
    puedeExportar: (permisos || []).includes('DASHBOARD_EXPORTAR') || esSistemas || esSupervisor
  };
}
