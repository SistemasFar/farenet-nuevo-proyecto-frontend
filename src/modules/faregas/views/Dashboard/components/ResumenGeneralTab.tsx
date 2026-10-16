import React from 'react';
import type { DashboardResumenResponse, SedeDetalleItem } from '../../../services/faregas-dashboard.api';
import { DashboardAlertas } from './DashboardAlertas';
import { DashboardGraficos } from './DashboardGraficos';
import { DashboardKpis } from './DashboardKpis';
import { DashboardSedes } from './DashboardSedes';

interface ResumenGeneralTabProps {
  resumen: DashboardResumenResponse | null;
  sedes: SedeDetalleItem[];
  cargando: boolean;
}

export const ResumenGeneralTab: React.FC<ResumenGeneralTabProps> = ({ resumen, sedes, cargando }) => (
  <div className="space-y-4">
    <DashboardKpis
      data={resumen}
      cargando={cargando}
      visibles={[
        'cantidadOperaciones',
        'ventaOperativaGenerada',
        'certificadosEmitidos',
        'totalCobrado',
        'saldoPendiente',
        'comprobantesRechazadosOError'
      ]}
      titulo="Panorama del período"
      descripcion="Indicadores esenciales de operación, emisión y cobranza según el alcance seleccionado."
    />
    <DashboardGraficos
      serieDiaria={resumen?.serieDiaria || []}
      distribucionCertificados={[]}
      distribucionPagos={[]}
      productos={[]}
      mostrar={['evolucion']}
    />
    <DashboardSedes sedes={sedes} cargando={cargando} />
    <DashboardAlertas alertas={resumen?.alertas || []} />
  </div>
);
