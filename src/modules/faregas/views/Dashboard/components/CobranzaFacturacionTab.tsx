import React from 'react';
import type {
  ComprobanteDetalleItem,
  DashboardResumenResponse,
  DescuentoDetalleItem,
  PagoDetalleItem,
  PaginadoResponse
} from '../../../services/faregas-dashboard.api';
import { DashboardDescuentos } from './DashboardDescuentos';
import { DashboardFacturacion } from './DashboardFacturacion';
import { DashboardGraficos } from './DashboardGraficos';
import { DashboardKpis } from './DashboardKpis';
import { DashboardPagos } from './DashboardPagos';

interface CobranzaFacturacionTabProps {
  resumen: DashboardResumenResponse | null;
  comprobantes: PaginadoResponse<ComprobanteDetalleItem> | null;
  pagos: PaginadoResponse<PagoDetalleItem> | null;
  descuentos: PaginadoResponse<DescuentoDetalleItem> | null;
  cargando: boolean;
  paginaComprobantes: number;
  paginaPagos: number;
  onCambiarPaginaComprobantes: (pagina: number) => void;
  onCambiarPaginaPagos: (pagina: number) => void;
}

export const CobranzaFacturacionTab: React.FC<CobranzaFacturacionTabProps> = ({
  resumen,
  comprobantes,
  pagos,
  descuentos,
  cargando,
  paginaComprobantes,
  paginaPagos,
  onCambiarPaginaComprobantes,
  onCambiarPaginaPagos
}) => (
  <div className="space-y-4">
    <DashboardKpis
      data={resumen}
      cargando={cargando}
      visibles={[
        'ventaPagada',
        'totalCobrado',
        'saldoPendiente',
        'facturasAceptadas',
        'boletasAceptadas',
        'comprobantesRechazadosOError',
        'montoDescontado'
      ]}
      titulo="Cobranza y facturación"
      descripcion="Pagos registrados, saldos vigentes y situación de los comprobantes del período."
    />
    <DashboardGraficos
      serieDiaria={[]}
      distribucionCertificados={[]}
      distribucionPagos={resumen?.distribucionPagos || []}
      productos={[]}
      mostrar={['pagos']}
    />
    <DashboardFacturacion
      data={comprobantes}
      cargando={cargando}
      pagina={paginaComprobantes}
      onCambiarPagina={onCambiarPaginaComprobantes}
    />
    <DashboardPagos
      data={pagos}
      cargando={cargando}
      pagina={paginaPagos}
      onCambiarPagina={onCambiarPaginaPagos}
    />
    <DashboardDescuentos data={descuentos} cargando={cargando} />
  </div>
);
