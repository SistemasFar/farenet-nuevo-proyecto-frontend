import React from 'react';
import type {
  CertificadoDetalleItem,
  DashboardResumenResponse,
  PaginadoResponse,
  SedeDetalleItem
} from '../../../services/faregas-dashboard.api';
import { DashboardCertificados } from './DashboardCertificados';
import { DashboardCertificadosEvolucion } from './DashboardCertificadosEvolucion';
import { DashboardGraficos } from './DashboardGraficos';
import { DashboardKpis } from './DashboardKpis';
import { DashboardSedes } from './DashboardSedes';

interface CertificadosTabProps {
  resumen: DashboardResumenResponse | null;
  certificados: PaginadoResponse<CertificadoDetalleItem> | null;
  sedes: SedeDetalleItem[];
  cargando: boolean;
  tipoCertificadoSeleccionado?: string;
  onSeleccionarTipoCertificado: (tipo?: string) => void;
  pagina: number;
  onCambiarPagina: (pagina: number) => void;
}

export const CertificadosTab: React.FC<CertificadosTabProps> = ({
  resumen,
  certificados,
  sedes,
  cargando,
  tipoCertificadoSeleccionado,
  onSeleccionarTipoCertificado,
  pagina,
  onCambiarPagina
}) => (
  <div className="space-y-4">
    <DashboardKpis
      data={resumen}
      cargando={cargando}
      visibles={[
        'ventaOperativaCertificados',
        'ventaBrutaCertificados',
        'ventaNetaCertificados',
        'ticketPromedioCertificados'
      ]}
      titulo="Ventas de certificados"
      descripcion="Importes calculados solo con líneas de certificados facturadas; no incluyen chips, papeles ni otros productos de almacén. Pasa el cursor sobre una tarjeta para ver su fórmula."
    />
    <DashboardKpis
      data={resumen}
      cargando={cargando}
      visibles={['certificadosEmitidos', 'certificadosPendientes', 'certificadosAnulados']}
      titulo="Estado de certificados"
      descripcion="Emisiones, borradores y anulaciones de los tipos realmente registrados."
    />
    <DashboardGraficos
      serieDiaria={[]}
      distribucionCertificados={resumen?.distribucionCertificados || []}
      distribucionPagos={[]}
      productos={[]}
      mostrar={['certificados']}
      tipoCertificadoSeleccionado={tipoCertificadoSeleccionado}
      onSeleccionarTipoCertificado={onSeleccionarTipoCertificado}
    />
    <DashboardCertificadosEvolucion serie={resumen?.serieCertificados || []} />
    <DashboardCertificados
      data={certificados}
      cargando={cargando}
      pagina={pagina}
      onCambiarPagina={onCambiarPagina}
    />
    <DashboardSedes sedes={sedes} cargando={cargando} />
  </div>
);
